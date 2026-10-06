import type { TenantClient } from '@/lib/tenantClient'
import { getNextQuotationNumber } from '@/domain/quotation'
import { parseDocumentCustomFields, toQuotationItemRow } from '@/domain/documentConversion'
import { buildInvoiceTrailLink, withInvoiceSourceTrail } from '../domain/invoiceConversionTrail'
import { resolvePrefix, type DocumentPrefixes } from '@/domain/prefixConstants'
import { advanceAutoCursor, fetchAutoCursor } from '@/domain/documentNumbering'
import { parseTrailingSequence } from '@/domain/prefixConstants'
import {
  authorityTransitionSummary,
  normalizeChainId,
  normalizeLineageId,
} from '@/domain/cps/lineage'
import { persistChainAuthority } from '@/domain/cps/lineageStore'

export interface RevertToQuotationInput {
  invoice: any
  items: any[]
  customFields: any
  prefixes?: DocumentPrefixes | null
}

export async function revertInvoiceToQuotationService(
  {
    invoice,
    items,
    customFields,
    prefixes,
  }: RevertToQuotationInput,
  tenantClient: TenantClient,
  entityId?: string | null,
) {
  // Phase 3: quotation and invoice reads route through the tenant schema.
  // Phase 2.5: the invoice's conversion lineage is read BEFORE the revert
  // removes it, so the reverted quotation keeps the same CPS ancestry and the
  // same conversion chain instead of becoming a lineage reset.
  const [{ data: quotationRows }, { data: latestInvoice }] = await Promise.all([
    tenantClient.from('quotations').select('quotation_number'),
    tenantClient
      .from('invoices')
      .select('custom_fields, invoice_number, source_quotation_id, conversion_chain_id')
      .eq('id', invoice.id)
      .single(),
  ])

  const sourceQuotationId = normalizeLineageId(
    (latestInvoice as { source_quotation_id?: string | null } | null)?.source_quotation_id,
  )
  const chainId = normalizeChainId(
    (latestInvoice as { conversion_chain_id?: string | null } | null)?.conversion_chain_id,
  )

  // CPS document identity comes from the chain owner — an explicit stored
  // link, never a guess from numbers or timestamps.
  let sourceCpsId: string | null = null
  if (sourceQuotationId) {
    const { data: chainOwner } = await tenantClient
      .from('quotations')
      .select('source_cps_id')
      .eq('id', sourceQuotationId)
      .limit(1)
    sourceCpsId = normalizeLineageId(
      (chainOwner as Array<{ source_cps_id?: string | null }> | null)?.[0]?.source_cps_id,
    )
  }

  const prefix = resolvePrefix(prefixes, 'quotation')
  const quotationFamily = `${prefix}-`
  const nextQuotationNumber = getNextQuotationNumber(
    (quotationRows || []) as Array<{ quotation_number?: string | null }>,
    prefix,
    await fetchAutoCursor(tenantClient, quotationFamily),
  )
  const sourceInvoiceFields = parseDocumentCustomFields(latestInvoice?.custom_fields || customFields)
  
  const quotationPayload = {
    quotation_number: nextQuotationNumber,
    po_number: invoice.po_number || null,
    quotation_title: invoice.invoice_title || null,
    client_id: invoice.client_id || null,
    client_name: invoice.client_name || '',
    project_id: invoice.project_id || null,
    issue_date: invoice.issue_date || new Date().toISOString().split('T')[0],
    valid_until: invoice.due_date || null,
    status: 'open',
    notes: invoice.notes || '',
    terms: invoice.terms || '',
    workmanship: Number(invoice.workmanship || 0),
    transportation: Number(invoice.transportation || 0),
    shipping: Number(invoice.shipping || 0),
    discount: Number(invoice.discount || 0),
    vat: Number(invoice.vat || 0),
    wht: Number(invoice.wht || 0),
    subtotal: Number(invoice.subtotal || 0),
    install_rate_total: Number(invoice.install_rate_total || 0),
    total: Number(invoice.total || 0),
    amount_in_words: invoice.amount_in_words || '',
    // Phase 2.5: a revert is not a lineage reset. The reverted quotation keeps
    // the CPS document identity and the conversion chain it descends from.
    source_cps_id: sourceCpsId,
    conversion_chain_id: chainId,
    custom_fields: JSON.stringify(
      withInvoiceSourceTrail(
        {
          ...sourceInvoiceFields,
          quotationTitle: invoice.invoice_title || '',
          clientName: invoice.client_name || '',
          notesHtml: invoice.notes || '',
          termsHtml: invoice.terms || '',
        },
        buildInvoiceTrailLink({
          id: invoice.id,
          type: 'invoice',
          number: invoice.invoice_number,
          project_id: invoice.project_id || null,
          po_number: invoice.po_number || null,
        }),
      ),
    ),
  }

  const itemRows = items
    .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
    .map((item, index) => {
      const row = toQuotationItemRow(item, '' as any, index) as Record<string, unknown>
      // CPS row ancestry survives the revert. The two source_quotation_*
      // columns describe an INVOICE row's quotation ancestry, which is not
      // meaningful on quotation_items, so they are normalised to null here.
      row.source_quotation_id = null
      row.source_quotation_item_id = null
      return row
    })

  const { data: createdQuotation, error } = await tenantClient.rpc('revert_invoice_to_quotation_transaction', {
    p_invoice_id: invoice.id,
    p_quotation_payload: quotationPayload,
    p_quotation_items_payload: itemRows,
    p_entity_id: entityId ?? null,
  })

  if (error || !createdQuotation) {
    throw new Error(error?.message || 'Failed to revert invoice')
  }

  // Converted documents consume automatic numbers: advance the cursor.
  const revertedSeq = parseTrailingSequence(
    (createdQuotation as { quotation_number?: string | null })?.quotation_number,
  )
  if (revertedSeq !== null) await advanceAutoCursor(tenantClient, quotationFamily, revertedSeq)

  await handAuthorityBackToRevertedQuotation({
    tenantClient,
    revertedQuotation: createdQuotation as { id?: string | null; quotation_number?: string | null },
    authorityRowId: sourceQuotationId,
    chainId,
    sourceCpsId,
    invoiceNumber: String(
      (latestInvoice as { invoice_number?: string | null } | null)?.invoice_number || invoice.invoice_number || '',
    ),
  })

  return createdQuotation
}

/**
 * Phase 2.5 authority rule for a revert.
 *
 * The Invoice is gone, so it can no longer be the active commercial document
 * for the chain. Authority returns to the Quotation stage within the SAME
 * chain, pointing at the newly created reverted quotation. The authority row
 * is the chain's existing owner (the Invoice's `source_quotation_id`), so the
 * chain keeps exactly one authority row. Nothing is inferred from timestamps.
 */
async function handAuthorityBackToRevertedQuotation({
  tenantClient,
  revertedQuotation,
  authorityRowId,
  chainId,
  sourceCpsId,
  invoiceNumber,
}: {
  tenantClient: TenantClient
  revertedQuotation: { id?: string | null; quotation_number?: string | null }
  authorityRowId: string | null
  chainId: string | null
  sourceCpsId: string | null
  invoiceNumber: string
}) {
  const revertedId = normalizeLineageId(revertedQuotation?.id)
  if (!revertedId) return

  // A revert of a non-CPS invoice has no chain to hand back to.
  if (!authorityRowId && !sourceCpsId) return

  const authority = await persistChainAuthority(tenantClient, {
    chainId,
    quotationId: revertedId,
    authorityRowId,
    stage: 'quotation',
    documentId: revertedId,
  })

  if (!authority.ok) {
    console.error('CPS authority revert handoff failed:', authority.error)
  }

  if (!sourceCpsId) return

  try {
    const { data: cpsRow } = await tenantClient
      .from('cps_sheets')
      .select('cps_number')
      .eq('id', sourceCpsId)
      .single()
    const cpsNumber = String((cpsRow as { cps_number?: string | null } | null)?.cps_number || '')

    const { CPS_AUDIT_SOURCE, buildCpsAuditMeta, recordCpsAuditEvent } = await import('@/domain/cps/audit')

    const transition = authorityTransitionSummary(invoiceNumber || 'Invoice', revertedQuotation?.quotation_number)
    await recordCpsAuditEvent(tenantClient, {
      recordId: sourceCpsId,
      entityLabel: cpsNumber || null,
      meta: buildCpsAuditMeta({
        event: 'REVERTED_TO_QUOTATION',
        rootId: sourceCpsId,
        chainId,
        sourceContext: CPS_AUDIT_SOURCE.view,
        related: {
          type: 'quotation',
          id: revertedId,
          number: String(revertedQuotation?.quotation_number || ''),
        },
        summary: 'Invoice reverted to Quotation',
        detail: authority.ok
          ? `${transition} Feedback authority returned to the Quotation stage.`
          : `${transition} (authority write failed: ${authority.error})`,
        actorType: authority.ok ? 'user' : 'system',
      }),
    })
  } catch (auditError) {
    console.error('CPS revert audit failed:', auditError)
  }
}
