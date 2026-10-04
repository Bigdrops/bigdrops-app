import type { TenantClient } from '@/lib/tenantClient'
import { resolvePrefix, type DocumentPrefixes } from '@/domain/prefixConstants'
import { mapCpsToQuotation } from '@/domain/cps/conversion'
import type { Cps } from '@/domain/cps/types'

export async function archiveCpsRecord(id: string, tenantClient: TenantClient) {
  const { error } = await tenantClient.from('cps_sheets').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteCpsRecord(id: string, tenantClient: TenantClient) {
  const { error: itemError } = await tenantClient.from('cps_rows').delete().eq('cps_sheet_id', id)
  if (itemError) throw itemError
  const { error } = await tenantClient.from('cps_sheets').delete().eq('id', id)
  if (error) throw error
}

export async function updateCpsStatus(id: string, status: string, tenantClient: TenantClient) {
  const { error } = await tenantClient.from('cps_sheets').update({ status }).eq('id', id)
  if (error) throw error
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
  return created
}

export async function convertCpsToQuotation({
  cps,
  prefixes,
  tenantClient,
}: {
  cps: Cps
  prefixes?: DocumentPrefixes | null
  tenantClient: TenantClient
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

  const { payload, items } = mapCpsToQuotation(cps, nextQuotationNumber)

  const { data: createdQuotation, error } = await tenantClient.from('quotations').insert([payload]).select().single()
  if (error || !createdQuotation) throw new Error(error?.message || 'Failed to create quotation')

  // Converted documents consume automatic numbers: advance the cursor.
  const convertedSeq = parseTrailingSequence((createdQuotation as { quotation_number?: string | null })?.quotation_number)
  if (convertedSeq !== null) await advanceAutoCursor(tenantClient, quotationFamily, convertedSeq)

  const itemRows = items.map((item, index) => ({ ...item, quotation_id: createdQuotation.id, sort_order: index }))

  if (itemRows.length > 0) {
    const { error: itemError } = await tenantClient.from('quotation_items').insert(itemRows)
    if (itemError) {
      // Compensate: never leave an orphan parent behind a failed row write.
      await tenantClient.from('quotations').delete().eq('id', createdQuotation.id)
      throw itemError
    }
  }

  return createdQuotation
}
