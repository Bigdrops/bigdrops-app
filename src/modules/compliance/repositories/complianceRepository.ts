import type { TenantClient } from '@/lib/tenantClient'
import type { WhtReceipt, TaxInputEntry, TaxFiling, TaxReminder, TaxSettings } from '@/domain/compliance/types'

export async function fetchWhtReceipts(client: TenantClient): Promise<WhtReceipt[]> {
  const { data, error } = await client.from('wht_receipts').select('*')
  if (error) throw error
  return (data || []) as WhtReceipt[]
}

export async function insertWhtReceipt(record: Partial<WhtReceipt>, client: TenantClient): Promise<WhtReceipt> {
  const { data, error } = await client.from('wht_receipts').insert([record]).select().single()
  if (error) throw error
  return data as WhtReceipt
}

export async function updateWhtReceipt(id: string, updates: Partial<WhtReceipt>, client: TenantClient): Promise<WhtReceipt> {
  const { data, error } = await client.from('wht_receipts').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as WhtReceipt
}

export async function deleteWhtReceipt(id: string, client: TenantClient): Promise<void> {
  const { error } = await client.from('wht_receipts').delete().eq('id', id)
  if (error) throw error
}

export async function fetchTaxInputEntries(client: TenantClient): Promise<TaxInputEntry[]> {
  const { data, error } = await client.from('tax_input_entries').select('*').order('date', { ascending: false })
  if (error) throw error
  return (data || []) as TaxInputEntry[]
}

export async function insertTaxInputEntry(record: Partial<TaxInputEntry>, client: TenantClient): Promise<void> {
  const { error } = await client.from('tax_input_entries').insert([record])
  if (error) throw error
}

export async function updateTaxInputEntry(id: string, updates: Partial<TaxInputEntry>, client: TenantClient): Promise<void> {
  const { error } = await client.from('tax_input_entries').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteTaxInputEntry(id: string, client: TenantClient): Promise<void> {
  const { error } = await client.from('tax_input_entries').delete().eq('id', id)
  if (error) throw error
}

export async function fetchTaxFilings(client: TenantClient): Promise<TaxFiling[]> {
  const { data, error } = await client.from('tax_filings').select('*').order('period_start', { ascending: false })
  if (error) throw error
  return (data || []) as TaxFiling[]
}

export async function insertTaxFiling(record: Partial<TaxFiling>, client: TenantClient): Promise<void> {
  const { error } = await client.from('tax_filings').insert([record])
  if (error) throw error
}

export async function updateTaxFiling(id: string, updates: Partial<TaxFiling>, client: TenantClient): Promise<void> {
  const { error } = await client.from('tax_filings').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteTaxFiling(id: string, client: TenantClient): Promise<void> {
  const { error } = await client.from('tax_filings').delete().eq('id', id)
  if (error) throw error
}

export async function fetchTaxReminders(client: TenantClient): Promise<TaxReminder[]> {
  const { data, error } = await client.from('tax_reminders').select('*').order('due_date', { ascending: true })
  if (error) throw error
  return (data || []) as TaxReminder[]
}

export async function insertTaxReminder(record: Partial<TaxReminder>, client: TenantClient): Promise<void> {
  const { error } = await client.from('tax_reminders').insert([record])
  if (error) throw error
}

export async function updateTaxReminder(id: string, updates: Partial<TaxReminder>, client: TenantClient): Promise<void> {
  const { error } = await client.from('tax_reminders').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteTaxReminder(id: string, client: TenantClient): Promise<void> {
  const { error } = await client.from('tax_reminders').delete().eq('id', id)
  if (error) throw error
}

export async function fetchTaxSettings(client: TenantClient): Promise<TaxSettings | null> {
  const { data, error } = await client.from('tax_settings').select('*').eq('settings_id', 1).single()
  if (error && error.code !== 'PGRST116') throw error
  return data as TaxSettings | null
}

export async function upsertTaxSettings(record: Partial<TaxSettings>, client: TenantClient): Promise<void> {
  const { error } = await client.from('tax_settings').upsert(record, { onConflict: 'settings_id' })
  if (error) throw error
}