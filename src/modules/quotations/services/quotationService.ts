import { getNextQuotationNumber } from "@/domain/quotation"
import { resolvePrefix, type DocumentPrefixes } from '@/domain/prefixConstants'
import type { TenantClient } from '@/lib/tenantClient'

export async function loadQuotations(tenantClient: TenantClient) {
  const { data, error } = await tenantClient
    .from("quotations")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function loadQuotationById(id: string, tenantClient: TenantClient) {
  const { data, error } = await tenantClient
    .from("quotations")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function loadQuotationNumbers(tenantClient: TenantClient) {
  const { data, error } = await tenantClient
    .from("quotations")
    .select("quotation_number")

  if (error) throw error
  return data || []
}

export async function loadQuotationItems(quotationId: string, tenantClient: TenantClient) {
  const { data, error } = await tenantClient
    .from("quotation_items")
    .select("*")
    .eq("quotation_id", quotationId)

  if (error) throw error
  return data || []
}

export async function archiveQuotation(id: string, tenantClient: TenantClient) {
  const { error } = await tenantClient.from('quotations').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteQuotation(id: string, tenantClient: TenantClient) {
  const { error: itemError } = await tenantClient.from('quotation_items').delete().eq('quotation_id', id)
  if (itemError) throw itemError

  const { error } = await tenantClient.from('quotations').delete().eq('id', id)
  if (error) throw error
}

export async function cloneQuotation(id: string, tenantClient: TenantClient, prefixes?: DocumentPrefixes | null) {
  const quotationRow = await loadQuotationById(id, tenantClient)
  if (!quotationRow) throw new Error('Quotation not found')

  const quotationRows = await loadQuotationNumbers(tenantClient)

  let safeProjectId = quotationRow.project_id || null
  if (safeProjectId) {
    const { validateProjectAssignment } = await import('@/domain/projects')
    const { project, error: projectError } = await validateProjectAssignment(tenantClient as any, {
      projectId: safeProjectId,
      documentClientId: quotationRow.client_id,
      documentClientName: quotationRow.client_name,
    })
    if (projectError || !project) safeProjectId = null
  }

  const prefix = resolvePrefix(prefixes, 'quotation')
  const payload = {
    ...quotationRow,
    project_id: safeProjectId,
    quotation_number: getNextQuotationNumber((quotationRows || []) as Array<{ quotation_number?: string | null }>, prefix),
    status: 'open',
    issue_date: new Date().toISOString().split('T')[0],
    archived_at: null,
  } as Record<string, unknown>
  delete payload.id
  delete payload.created_at
  delete payload.updated_at

  const { data: createdQuotation, error: createError } = await tenantClient.from('quotations').insert([payload]).select().single()
  if (createError || !createdQuotation) {
    throw new Error(createError?.message || 'Unable to create clone')
  }

  const itemRows = await loadQuotationItems(id, tenantClient)
  if (itemRows?.length) {
    const nextItems = itemRows.map(({ id: _id, created_at: _createdAt, updated_at: _updatedAt, ...item }) => ({
      ...item,
      quotation_id: createdQuotation.id,
    }))
    const { error: itemError } = await tenantClient.from('quotation_items').insert(nextItems)
    if (itemError) {
      await tenantClient.from('quotations').delete().eq('id', createdQuotation.id)
      throw itemError
    }
  }

  return createdQuotation
}
