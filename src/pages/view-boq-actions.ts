import type { TenantClient } from '@/lib/tenantClient'
import { resolvePrefix, type DocumentPrefixes } from '@/domain/prefixConstants'

export async function archiveBOQRecord(id: string, tenantClient: TenantClient) {
  const { error } = await tenantClient.from('boqs').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteBOQRecord(id: string, tenantClient: TenantClient) {
  const { error: itemError } = await tenantClient.from('boq_rows').delete().eq('boq_id', id)
  if (itemError) throw itemError
  const { error } = await tenantClient.from('boqs').delete().eq('id', id)
  if (error) throw error
}

export async function updateBOQStatus(id: string, status: string, tenantClient: TenantClient) {
  const { error } = await tenantClient.from('boqs').update({ status }).eq('id', id)
  if (error) throw error
}

export async function duplicateBOQRecord(id: string, tenantClient: TenantClient) {
  const { data: original, error: fetchError } = await tenantClient.from('boqs').select('*').eq('id', id).single()
  if (fetchError || !original) throw new Error(fetchError?.message || 'BOQ not found')

  const { id: _id, created_at: _ca, updated_at: _ua, boq_number: _wn, ...rest } = original

  // Find next number under the tenant's configured prefix family.
  const { data: settingsRow } = await tenantClient.from('settings').select('document_prefixes').limit(1).single()
  const boqPrefix = resolvePrefix((settingsRow as any)?.document_prefixes, 'boq')
  const boqFamily = `${boqPrefix}-`
  const { data: all } = await tenantClient.from('boqs').select('boq_number').order('created_at', { ascending: false })
  const { getNextBoqNumber } = await import('@/domain/boq/normalize')
  const { fetchAutoCursor, advanceAutoCursor } = await import('@/domain/documentNumbering')
  const { parseTrailingSequence } = await import('@/domain/prefixConstants')
  const nextNumber = getNextBoqNumber(
    (all || []) as Array<{ boq_number: string }>,
    boqPrefix,
    await fetchAutoCursor(tenantClient, boqFamily),
  )

  const { data: created, error: insertError } = await tenantClient.from('boqs').insert([{
    ...rest,
    boq_number: nextNumber,
    status: 'open',
    issue_date: new Date().toISOString().split('T')[0],
  }]).select().single()

  if (insertError) throw insertError
  const duplicatedSeq = parseTrailingSequence((created as { boq_number?: string | null })?.boq_number)
  if (duplicatedSeq !== null) await advanceAutoCursor(tenantClient, boqFamily, duplicatedSeq)
  return created
}

export async function convertBOQToQuotation({
  boq,
  items,
  prefixes,
  tenantClient,
}: {
  boq: any
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
    po_number: boq.po_number || null,
    quotation_title: boq.title || 'Quotation from BOQ',
    client_id: null,
    client_name: boq.vendor_name || boq.client_name || '',
    issue_date: new Date().toISOString().split('T')[0],
    status: 'open',
    subtotal: 0,
    total: 0,
    source_boq_id: boq.id,
    custom_fields: JSON.stringify(
      withSourceTrail(
        {},
        buildTrailLink({
          id: boq.id,
          type: 'quotation',
          number: boq.boq_number,
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
      unit_price: item.sp || item.unit_price || 0,
      amount: (item.quantity || 0) * (item.sp || item.unit_price || 0),
    } as any, String(createdQuotation.id), index))

  if (itemRows.length > 0) {
    const { error: itemError } = await tenantClient.from('quotation_items').insert(itemRows)
    if (itemError) throw itemError
  }

  return createdQuotation
}
