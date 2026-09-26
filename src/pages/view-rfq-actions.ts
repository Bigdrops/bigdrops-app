import type { TenantClient } from '@/lib/tenantClient'
import { resolvePrefix, type DocumentPrefixes } from '@/domain/prefixConstants'

export async function archiveRFQRecord(id: string, tenantClient: TenantClient) {
  const { error } = await tenantClient.from('rfqs').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteRFQRecord(id: string, tenantClient: TenantClient) {
  const { error: itemError } = await tenantClient.from('rfq_items').delete().eq('rfq_id', id)
  if (itemError) throw itemError
  const { error } = await tenantClient.from('rfqs').delete().eq('id', id)
  if (error) throw error
}

export async function updateRFQStatus(id: string, status: string, tenantClient: TenantClient) {
  const { error } = await tenantClient.from('rfqs').update({ status }).eq('id', id)
  if (error) throw error
}

export async function duplicateRFQRecord(id: string, tenantClient: TenantClient) {
  const { data: original, error: fetchError } = await tenantClient.from('rfqs').select('*').eq('id', id).single()
  if (fetchError || !original) throw new Error(fetchError?.message || 'RFQ not found')

  const { id: _id, created_at: _ca, updated_at: _ua, rfq_number: _wn, ...rest } = original

  // Find next number under the tenant's configured prefix family.
  const { data: settingsRow } = await tenantClient.from('settings').select('document_prefixes').limit(1).single()
  const rfqPrefix = resolvePrefix((settingsRow as any)?.document_prefixes, 'rfq')
  const rfqFamily = `${rfqPrefix}-`
  const { data: all } = await tenantClient.from('rfqs').select('rfq_number').order('created_at', { ascending: false })
  const { getNextRfqNumber } = await import('@/domain/rfq/normalize')
  const { fetchAutoCursor, advanceAutoCursor } = await import('@/domain/documentNumbering')
  const { parseTrailingSequence } = await import('@/domain/prefixConstants')
  const nextNumber = getNextRfqNumber(
    (all || []) as Array<{ rfq_number: string }>,
    rfqPrefix,
    await fetchAutoCursor(tenantClient, rfqFamily),
  )

  const { data: created, error: insertError } = await tenantClient.from('rfqs').insert([{
    ...rest,
    rfq_number: nextNumber,
    status: 'open',
    issue_date: new Date().toISOString().split('T')[0],
  }]).select().single()

  if (insertError) throw insertError
  const duplicatedSeq = parseTrailingSequence((created as { rfq_number?: string | null })?.rfq_number)
  if (duplicatedSeq !== null) await advanceAutoCursor(tenantClient, rfqFamily, duplicatedSeq)
  return created
}

export async function convertRFQToQuotation({
  rfq,
  items,
  prefixes,
  tenantClient,
}: {
  rfq: any
  items: any[]
  prefixes?: DocumentPrefixes | null
  tenantClient: TenantClient
}) {
  const [{ data: quotationRows }] = await Promise.all([
    tenantClient.from('quotations').select('quotation_number'),
  ])

  const { getNextQuotationNumber } = await import('@/domain/quotation')
  const { buildTrailLink, withSourceTrail, toQuotationItemRow } = await import('@/domain/documentConversion')
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
  
  const payload = {
    quotation_number: nextQuotationNumber,
    po_number: rfq.po_number || null,
    quotation_title: rfq.title || 'Quotation from RFQ',
    client_id: null, // Vendor RFQs usually don't have a client link directly
    client_name: rfq.vendor_name || '',
    issue_date: new Date().toISOString().split('T')[0],
    status: 'open',
    subtotal: 0,
    total: 0,
    custom_fields: JSON.stringify(
      withSourceTrail(
        {},
        buildTrailLink({
          id: rfq.id,
          type: 'quotation', // We'll treat RFQ as a quotation source for now
          number: rfq.rfq_number,
        })
      )
    ),
  }

  const { data: createdQuotation, error } = await tenantClient.from('quotations').insert([payload]).select().single()
  if (error || !createdQuotation) throw new Error(error?.message || 'Failed to create quotation')

  // Converted documents consume automatic numbers: advance the cursor.
  const convertedSeq = parseTrailingSequence((createdQuotation as { quotation_number?: string | null })?.quotation_number)
  if (convertedSeq !== null) await advanceAutoCursor(tenantClient, quotationFamily, convertedSeq)

  const itemRows = items
    .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
    .map((item, index) => toQuotationItemRow({
      ...item,
      unit_price: 0, // Reset price on transfer
      amount: 0,
    } as any, String(createdQuotation.id), index))

  if (itemRows.length > 0) {
    const { error: itemError } = await tenantClient.from('quotation_items').insert(itemRows)
    if (itemError) throw itemError
  }

  return createdQuotation
}
