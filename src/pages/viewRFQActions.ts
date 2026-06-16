import { supabase } from '@/supabase'
import { resolvePrefix, type DocumentPrefixes } from '@/domain/prefixConstants'

export async function archiveRFQRecord(id: string) {
  const { error } = await supabase.from('rfqs').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteRFQRecord(id: string) {
  const { error: itemError } = await supabase.from('rfq_items').delete().eq('rfq_id', id)
  if (itemError) throw itemError
  const { error } = await supabase.from('rfqs').delete().eq('id', id)
  if (error) throw error
}

export async function updateRFQStatus(id: string, status: string) {
  const { error } = await supabase.from('rfqs').update({ status }).eq('id', id)
  if (error) throw error
}

export async function duplicateRFQRecord(id: string) {
  const { data: original, error: fetchError } = await supabase.from('rfqs').select('*').eq('id', id).single()
  if (fetchError || !original) throw new Error(fetchError?.message || 'RFQ not found')

  const { id: _id, created_at: _ca, updated_at: _ua, rfq_number: _wn, ...rest } = original
  
  // Find next number
  const { data: all } = await supabase.from('rfqs').select('rfq_number').like('rfq_number', 'RFQ-%').order('created_at', { ascending: false })
  let nextNum = 1
  if (all && all.length > 0) {
    const nums = all
      .map((entry: any) => parseInt(String(entry.rfq_number || '').replace('RFQ-', ''), 10))
      .filter((value: number) => !Number.isNaN(value))
    nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1
  }

  const { data: created, error: insertError } = await supabase.from('rfqs').insert([{
    ...rest,
    rfq_number: `RFQ-${String(nextNum).padStart(4, '0')}`,
    status: 'open',
    issue_date: new Date().toISOString().split('T')[0],
  }]).select().single()

  if (insertError) throw insertError
  return created
}

export async function convertRFQToQuotation({
  rfq,
  items,
  prefixes,
}: {
  rfq: any
  items: any[]
  prefixes?: DocumentPrefixes | null
}) {
  const [{ data: quotationRows }] = await Promise.all([
    supabase.from('quotations').select('quotation_number'),
  ])
  
  const { getNextQuotationNumber } = await import('@/domain/quotation')
  const { buildTrailLink, withSourceTrail, toQuotationItemRow } = await import('@/domain/documentConversion')
  
  const nextQuotationNumber = getNextQuotationNumber(
    (quotationRows || []) as Array<{ quotation_number?: string | null }>,
    resolvePrefix(prefixes, 'quotation'),
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

  const { data: createdQuotation, error } = await supabase.from('quotations').insert([payload]).select().single()
  if (error || !createdQuotation) throw new Error(error?.message || 'Failed to create quotation')

  const itemRows = items
    .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
    .map((item, index) => toQuotationItemRow({
      ...item,
      unit_price: 0, // Reset price on transfer
      amount: 0,
    } as any, String(createdQuotation.id), index))

  if (itemRows.length > 0) {
    const { error: itemError } = await supabase.from('quotation_items').insert(itemRows)
    if (itemError) throw itemError
  }

  return createdQuotation
}
