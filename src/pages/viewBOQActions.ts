import { supabase } from '@/supabase'

export async function archiveBOQRecord(id: string) {
  const { error } = await supabase.from('boq').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteBOQRecord(id: string) {
  const { error } = await supabase.from('boq').delete().eq('id', id)
  if (error) throw error
}

export async function updateBOQStatus(id: string, status: string) {
  const { error } = await supabase.from('boq').update({ status }).eq('id', id)
  if (error) throw error
}

export async function duplicateBOQRecord(id: string) {
  const { data: original, error: fetchError } = await supabase.from('boq').select('*').eq('id', id).single()
  if (fetchError || !original) throw new Error(fetchError?.message || 'BOQ not found')

  const { id: _id, created_at: _ca, updated_at: _ua, boq_number: _wn, ...rest } = original
  
  // Find next number
  const { data: all } = await supabase.from('boq').select('boq_number').like('boq_number', 'BOQ-%').order('created_at', { ascending: false })
  let nextNum = 1
  if (all && all.length > 0) {
    const nums = all
      .map((entry: any) => parseInt(String(entry.boq_number || '').replace('BOQ-', ''), 10))
      .filter((value: number) => !Number.isNaN(value))
    nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1
  }

  const { data: created, error: insertError } = await supabase.from('boq').insert([{
    ...rest,
    boq_number: `BOQ-${String(nextNum).padStart(4, '0')}`,
    status: 'draft',
    date: new Date().toISOString().split('T')[0],
  }]).select().single()

  if (insertError) throw insertError
  return created
}

export async function convertBOQToQuotation({
  boq,
  items,
}: {
  boq: any
  items: any[]
}) {
  const [{ data: quotationRows }] = await Promise.all([
    supabase.from('quotations').select('quotation_number'),
  ])
  
  const { getNextQuotationNumber } = await import('@/domain/quotation')
  const { buildTrailLink, withSourceTrail, toQuotationItemRow } = await import('@/domain/documentConversion')
  
  const nextQuotationNumber = getNextQuotationNumber((quotationRows || []) as Array<{ quotation_number?: string | null }>)
  
  const payload = {
    quotation_number: nextQuotationNumber,
    po_number: boq.po_number || null,
    quotation_title: boq.title || 'Quotation from BOQ',
    client_id: null,
    client_name: boq.vendor_name || boq.client_name || '',
    issue_date: new Date().toISOString().split('T')[0],
    status: 'draft',
    subtotal: 0,
    total: 0,
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

  const { data: createdQuotation, error } = await supabase.from('quotations').insert([payload]).select().single()
  if (error || !createdQuotation) throw new Error(error?.message || 'Failed to create quotation')

  const itemRows = items
    .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
    .map((item, index) => toQuotationItemRow({
      ...item,
      unit_price: item.sp || item.unit_price || 0,
      amount: (item.quantity || 0) * (item.sp || item.unit_price || 0),
    } as any, String(createdQuotation.id), index))

  if (itemRows.length > 0) {
    const { error: itemError } = await supabase.from('quotation_items').insert(itemRows)
    if (itemError) throw itemError
  }

  return createdQuotation
}
