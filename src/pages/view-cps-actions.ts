import type { TenantClient } from '@/lib/tenantClient'
import { resolvePrefix, type DocumentPrefixes } from '@/domain/prefixConstants'
import { mapCpsToQuotation, type CpsConversionOptions } from '@/domain/cps/conversion'
import type { Cps } from '@/domain/cps/types'
import {
  CPS_AUDIT_SOURCE,
  buildCpsAuditMeta,
  recordCpsAuditEvent,
  type CpsAuditMeta,
} from '@/domain/cps/audit'
import { persistFeedbackAuthority } from '@/domain/cps/lineageStore'

// Audit is evidence, not a control path. An audit write must never fail the
// user action, so failures are logged and swallowed here.
async function safeRecordCpsAudit(
  tenantClient: TenantClient,
  input: { recordId: string; entityLabel?: string | null; meta: CpsAuditMeta },
) {
  try {
    await recordCpsAuditEvent(tenantClient, input)
  } catch (auditError) {
    console.error('CPS audit failed:', auditError)
  }
}

export async function archiveCpsRecord(id: string, tenantClient: TenantClient, entityLabel?: string | null) {
  const { error } = await tenantClient.from('cps_sheets').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error

  await safeRecordCpsAudit(tenantClient, {
    recordId: id,
    entityLabel,
    meta: buildCpsAuditMeta({
      event: 'ARCHIVED',
      rootId: id,
      sourceContext: CPS_AUDIT_SOURCE.view,
      summary: 'Archived CPS',
    }),
  })
}

export async function deleteCpsRecord(id: string, tenantClient: TenantClient, entityLabel?: string | null) {
  const { error: itemError } = await tenantClient.from('cps_rows').delete().eq('cps_sheet_id', id)
  if (itemError) throw itemError

  // Record before the parent row is removed so the label is still meaningful.
  await safeRecordCpsAudit(tenantClient, {
    recordId: id,
    entityLabel,
    meta: buildCpsAuditMeta({
      event: 'DELETED',
      rootId: id,
      sourceContext: CPS_AUDIT_SOURCE.view,
      summary: 'Deleted CPS',
    }),
  })

  const { error } = await tenantClient.from('cps_sheets').delete().eq('id', id)
  if (error) throw error
}

export async function updateCpsStatus(
  id: string,
  status: string,
  tenantClient: TenantClient,
  previousStatus?: string | null,
  entityLabel?: string | null,
) {
  const { error } = await tenantClient.from('cps_sheets').update({ status }).eq('id', id)
  if (error) throw error

  const hasStatusChange = String(previousStatus ?? '').trim() !== '' && String(previousStatus) !== String(status)
  await safeRecordCpsAudit(tenantClient, {
    recordId: id,
    entityLabel,
    meta: buildCpsAuditMeta({
      event: 'STATUS_CHANGED',
      rootId: id,
      sourceContext: CPS_AUDIT_SOURCE.view,
      changes: hasStatusChange
        ? [
            {
              rowId: null,
              rowLabel: null,
              scope: 'document',
              field: 'status',
              label: 'Status',
              old: previousStatus,
              new: status,
              kind: 'default',
            },
          ]
        : [],
      summary: `Status changed to ${status}`,
    }),
  })
}

export async function duplicateCpsRecord(id: string, tenantClient: TenantClient) {
  const { data: original, error: fetchError } = await tenantClient.from('cps_sheets').select('*').eq('id', id).single()
  if (fetchError || !original) throw new Error(fetchError?.message || 'Cost & Pricing Sheet not found')

  const { id: _id, created_at: _ca, updated_at: _ua, cps_number: _wn, ...rest } = original

  // Find next number under the tenant's configured prefix family.
  const { data: settingsRow } = await tenantClient.from('settings').select('document_prefixes').limit(1).single()
  const cpsPrefix = resolvePrefix((settingsRow as any)?.document_prefixes, 'cps_sheets')
  const cpsFamily = `${cpsPrefix}-`
  const { data: all } = await tenantClient.from('cps_sheets').select('cps_number').order('created_at', { ascending: false })
  const { getNextCpsNumber } = await import('@/domain/cps/normalize')
  const { fetchAutoCursor, advanceAutoCursor } = await import('@/domain/documentNumbering')
  const { parseTrailingSequence } = await import('@/domain/prefixConstants')
  const nextNumber = getNextCpsNumber(
    (all || []) as Array<{ cps_number: string }>,
    cpsPrefix,
    await fetchAutoCursor(tenantClient, cpsFamily),
  )

  const { data: created, error: insertError } = await tenantClient.from('cps_sheets').insert([{
    ...rest,
    cps_number: nextNumber,
    status: 'open',
    issue_date: new Date().toISOString().split('T')[0],
  }]).select().single()

  if (insertError) throw insertError
  const duplicatedSeq = parseTrailingSequence((created as { cps_number?: string | null })?.cps_number)
  if (duplicatedSeq !== null) await advanceAutoCursor(tenantClient, cpsFamily, duplicatedSeq)

  // Record both directions so each document shows its duplicate relationship.
  const duplicated = created as { id: string; cps_number: string }
  const sourceNumber = String((original as { cps_number?: string | null }).cps_number || '')

  await safeRecordCpsAudit(tenantClient, {
    recordId: duplicated.id,
    entityLabel: duplicated.cps_number,
    meta: buildCpsAuditMeta({
      event: 'DUPLICATED',
      rootId: duplicated.id,
      sourceContext: CPS_AUDIT_SOURCE.view,
      related: { type: 'cps', id: id, number: sourceNumber },
      summary: `Created from ${sourceNumber}`,
    }),
  })

  await safeRecordCpsAudit(tenantClient, {
    recordId: id,
    entityLabel: sourceNumber,
    meta: buildCpsAuditMeta({
      event: 'DUPLICATED',
      rootId: id,
      sourceContext: CPS_AUDIT_SOURCE.view,
      related: { type: 'cps', id: duplicated.id, number: duplicated.cps_number },
      summary: `Duplicated to ${duplicated.cps_number}`,
    }),
  })

  return created
}

export async function convertCpsToQuotation({
  cps,
  prefixes,
  tenantClient,
  options,
}: {
  cps: Cps
  prefixes?: DocumentPrefixes | null
  tenantClient: TenantClient
  options?: CpsConversionOptions
}) {
  const [{ data: quotationRows }] = await Promise.all([
    tenantClient.from('quotations').select('quotation_number'),
  ])

  const { getNextQuotationNumber } = await import('@/domain/quotation')
  const { fetchAutoCursor, advanceAutoCursor } = await import('@/domain/documentNumbering')
  const { parseTrailingSequence } = await import('@/domain/prefixConstants')

  const quotationPrefix = resolvePrefix(prefixes, 'quotation')
  const quotationFamily = `${quotationPrefix}-`
  const cursor = await fetchAutoCursor(tenantClient, quotationFamily)
  const nextQuotationNumber = getNextQuotationNumber(
    (quotationRows || []) as Array<{ quotation_number?: string | null }>,
    quotationPrefix,
    cursor,
  )

  const { payload, items, lineage } = mapCpsToQuotation(cps, nextQuotationNumber, options)

  const { data: createdQuotation, error } = await tenantClient.from('quotations').insert([payload]).select().single()
  if (error || !createdQuotation) throw new Error(error?.message || 'Failed to create quotation')

  // Converted documents consume automatic numbers: advance the cursor.
  const convertedSeq = parseTrailingSequence((createdQuotation as { quotation_number?: string | null })?.quotation_number)
  if (convertedSeq !== null) await advanceAutoCursor(tenantClient, quotationFamily, convertedSeq)

  // Lineage is written with the same insert that creates the rows, so a
  // converted quotation is never persisted with partially unlineaged items.
  const itemRows = items.map((item, index) => ({ ...item, quotation_id: createdQuotation.id, sort_order: index }))

  if (itemRows.length > 0) {
    const { error: itemError } = await tenantClient.from('quotation_items').insert(itemRows)
    if (itemError) {
      // Compensate: never leave an orphan parent behind a failed row write.
      await tenantClient.from('quotations').delete().eq('id', createdQuotation.id)
      throw itemError
    }
  }

  const quotation = createdQuotation as { id: string; quotation_number: string }

  // Stamp which document currently owns downstream feedback authority. The
  // stage was seeded at insert time, so authority stays determinate even if
  // this follow-up write fails.
  const authority = await persistFeedbackAuthority(tenantClient, quotation.id, 'quotation', quotation.id)
  if (!authority.ok) {
    console.error('CPS feedback authority seed failed:', authority.error)
  }

  await safeRecordCpsAudit(tenantClient, {
    recordId: cps.id,
    entityLabel: cps.cps_number,
    meta: buildCpsAuditMeta({
      event: 'CONVERTED_TO_QUOTATION',
      rootId: cps.id,
      sourceContext: CPS_AUDIT_SOURCE.view,
      related: { type: 'quotation', id: quotation.id, number: quotation.quotation_number },
      summary: `Converted to ${quotation.quotation_number}`,
      detail: lineage.summary,
    }),
  })

  // A converted row that could not carry its origin is a real anomaly: record
  // it instead of silently accepting an unlineaged document.
  if (lineage.unlineagedRowLabels.length > 0) {
    await safeRecordCpsAudit(tenantClient, {
      recordId: cps.id,
      entityLabel: cps.cps_number,
      meta: buildCpsAuditMeta({
        event: 'LINEAGE_WARNING',
        rootId: cps.id,
        sourceContext: CPS_AUDIT_SOURCE.view,
        related: { type: 'quotation', id: quotation.id, number: quotation.quotation_number },
        summary: lineage.unlineagedSummary || 'Lineage unavailable',
        detail: lineage.unlineagedRowLabels.join(', '),
        actorType: 'system',
      }),
    })
  }

  return createdQuotation
}
