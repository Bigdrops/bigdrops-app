import { supabase } from "@/supabase"
import { getNextQuotationNumber } from "@/domain/quotation"

export async function loadQuotations() {
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function loadQuotationById(id: string) {
  const { data, error } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function loadQuotationNumbers() {
  const { data, error } = await supabase
    .from("quotations")
    .select("quotation_number")

  if (error) throw error
  return data || []
}

export async function loadQuotationItems(quotationId: string) {
  const { data, error } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("quotation_id", quotationId)

  if (error) throw error
  return data || []
}

export async function archiveQuotation(id: string) {
  const { error } = await supabase.from('quotations').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteQuotation(id: string) {
  const { error: itemError } = await supabase.from('quotation_items').delete().eq('quotation_id', id)
  if (itemError) throw itemError

  const { error } = await supabase.from('quotations').delete().eq('id', id)
  if (error) throw error
}

export async function cloneQuotation(id: string) {
  const quotationRow = await loadQuotationById(id)
  if (!quotationRow) throw new Error('Quotation not found')

  const quotationRows = await loadQuotationNumbers()

  let safeProjectId = quotationRow.project_id || null
  if (safeProjectId) {
    const { validateProjectAssignment } = await import('@/domain/projects')
    const { project, error: projectError } = await validateProjectAssignment(supabase as any, {
      projectId: safeProjectId,
      documentClientId: quotationRow.client_id,
      documentClientName: quotationRow.client_name,
    })
    if (projectError || !project) safeProjectId = null
  }

  const payload = {
    ...quotationRow,
    project_id: safeProjectId,
    quotation_number: getNextQuotationNumber((quotationRows || []) as Array<{ quotation_number?: string | null }>),
    status: 'open',
    issue_date: new Date().toISOString().split('T')[0],
    archived_at: null,
  } as Record<string, unknown>
  delete payload.id
  delete payload.created_at
  delete payload.updated_at

  const { data: createdQuotation, error: createError } = await supabase.from('quotations').insert([payload]).select().single()
  if (createError || !createdQuotation) {
    throw new Error(createError?.message || 'Unable to create clone')
  }

  const itemRows = await loadQuotationItems(id)
  if (itemRows?.length) {
    const nextItems = itemRows.map(({ id: _id, created_at: _createdAt, updated_at: _updatedAt, ...item }) => ({
      ...item,
      quotation_id: createdQuotation.id,
    }))
    const { error: itemError } = await supabase.from('quotation_items').insert(nextItems)
    if (itemError) {
      await supabase.from('quotations').delete().eq('id', createdQuotation.id)
      throw itemError
    }
  }

  return createdQuotation
}
