import { supabase } from '@/supabase'
import type { TenantClient } from '@/lib/tenantClient'
import type { WhtReceipt, TaxInputEntry, TaxFiling, TaxReminder, TaxSettings, WhtReceiptStatus } from '@/domain/compliance/types'
import * as repo from '../repositories/complianceRepository'

const now = () => new Date().toISOString()

export interface CreateWhtReceiptInput {
  payment_id: string
  invoice_id: string | null
  client_name: string | null
  wht_amount: number | null
  receipt_number: string | null
  receipt_status: WhtReceiptStatus
  received_at: string | null
  receipt_file_url: string | null
}

export interface UpdateWhtReceiptInput {
  receipt_number?: string | null
  receipt_status?: WhtReceiptStatus
  received_at?: string | null
  receipt_file_url?: string | null
  notes?: string | null
}

export interface SubmitCertificateInput {
  payment_id: string
  invoice_id: string | null
  client_name: string | null
  wht_amount: number | null
  receipt_number: string
  receipt_file_url: string | null
  receipt_status: WhtReceiptStatus
  received_at: string
}

export async function createWhtReceipt(input: CreateWhtReceiptInput, tenantClient: TenantClient): Promise<WhtReceipt> {
  const timestamp = now()
  return repo.insertWhtReceipt({
    payment_id: input.payment_id,
    invoice_id: input.invoice_id,
    client_name: input.client_name,
    wht_amount: input.wht_amount,
    receipt_number: input.receipt_number,
    receipt_status: input.receipt_status,
    received_at: input.received_at,
    receipt_file_url: input.receipt_file_url,
    created_at: timestamp,
    updated_at: timestamp,
  } as Partial<WhtReceipt>, tenantClient)
}

export async function updateWhtReceipt(receiptId: string, updates: UpdateWhtReceiptInput, tenantClient: TenantClient): Promise<WhtReceipt> {
  return repo.updateWhtReceipt(receiptId, { ...updates, updated_at: now() } as Partial<WhtReceipt>, tenantClient)
}

export async function submitCertificate(input: SubmitCertificateInput, tenantClient: TenantClient): Promise<WhtReceipt> {
  return createWhtReceipt({
    payment_id: input.payment_id,
    invoice_id: input.invoice_id,
    client_name: input.client_name,
    wht_amount: input.wht_amount,
    receipt_number: input.receipt_number,
    receipt_status: input.receipt_status,
    received_at: input.received_at,
    receipt_file_url: input.receipt_file_url,
  }, tenantClient)
}

export async function markReceiptVerified(receiptId: string, tenantClient: TenantClient): Promise<WhtReceipt> {
  return updateWhtReceipt(receiptId, { receipt_status: 'verified' }, tenantClient)
}

export async function uploadReceiptFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `wht-receipts/cert_${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('compliance').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('compliance').getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('Failed to get public URL for uploaded file')
  return data.publicUrl
}

export async function fetchWhtReceipts(tenantClient: TenantClient): Promise<WhtReceipt[]> {
  return repo.fetchWhtReceipts(tenantClient)
}

export async function autoCreateWhtReceiptDraft(params: {
  paymentId: string
  invoiceId: string
  whtAmount: number
  whtRate: number | null
  whtType: string | null
}, tenantClient: TenantClient): Promise<void> {
  const { data: existing } = await tenantClient
    .from('wht_receipts')
    .select('id')
    .eq('payment_id', params.paymentId)
    .maybeSingle()

  if (existing) return

  const { data: invoice } = await tenantClient
    .from('invoices')
    .select('client_name')
    .eq('id', params.invoiceId)
    .maybeSingle()

  const timestamp = now()

  await repo.insertWhtReceipt({
    payment_id: params.paymentId,
    invoice_id: params.invoiceId,
    client_name: invoice?.client_name ?? null,
    wht_amount: params.whtAmount,
    wht_rate: params.whtRate,
    receipt_status: 'pending',
    created_at: timestamp,
    updated_at: timestamp,
  } as Partial<WhtReceipt>, tenantClient)
}

export async function insertInlineWhtReceipt(record: Partial<WhtReceipt>, tenantClient: TenantClient): Promise<WhtReceipt> {
  return repo.insertWhtReceipt({ ...record, created_at: now(), updated_at: now() } as Partial<WhtReceipt>, tenantClient)
}

export async function updateInlineWhtReceipt(id: string, updates: Partial<WhtReceipt>, tenantClient: TenantClient): Promise<WhtReceipt> {
  return repo.updateWhtReceipt(id, { ...updates, updated_at: now() } as Partial<WhtReceipt>, tenantClient)
}

export async function fetchTaxInputEntries(tenantClient: TenantClient): Promise<TaxInputEntry[]> {
  return repo.fetchTaxInputEntries(tenantClient)
}

export async function insertTaxInputEntry(record: Partial<TaxInputEntry>, tenantClient: TenantClient): Promise<void> {
  return repo.insertTaxInputEntry({ ...record, created_at: now(), updated_at: now() } as Partial<TaxInputEntry>, tenantClient)
}

export async function updateTaxInputEntry(id: string, updates: Partial<TaxInputEntry>, tenantClient: TenantClient): Promise<void> {
  return repo.updateTaxInputEntry(id, { ...updates, updated_at: now() } as Partial<TaxInputEntry>, tenantClient)
}

export async function deleteTaxInputEntry(id: string, tenantClient: TenantClient): Promise<void> {
  return repo.deleteTaxInputEntry(id, tenantClient)
}

export async function fetchTaxFilings(tenantClient: TenantClient): Promise<TaxFiling[]> {
  return repo.fetchTaxFilings(tenantClient)
}

export async function insertTaxFiling(record: Partial<TaxFiling>, tenantClient: TenantClient): Promise<void> {
  return repo.insertTaxFiling({ ...record, created_at: now(), updated_at: now() } as Partial<TaxFiling>, tenantClient)
}

export async function updateTaxFiling(id: string, updates: Partial<TaxFiling>, tenantClient: TenantClient): Promise<void> {
  return repo.updateTaxFiling(id, { ...updates, updated_at: now() } as Partial<TaxFiling>, tenantClient)
}

export async function deleteTaxFiling(id: string, tenantClient: TenantClient): Promise<void> {
  return repo.deleteTaxFiling(id, tenantClient)
}

export async function fetchTaxReminders(tenantClient: TenantClient): Promise<TaxReminder[]> {
  return repo.fetchTaxReminders(tenantClient)
}

export async function insertTaxReminder(record: Partial<TaxReminder>, tenantClient: TenantClient): Promise<void> {
  return repo.insertTaxReminder({ ...record, created_at: now(), updated_at: now() } as Partial<TaxReminder>, tenantClient)
}

export async function updateTaxReminder(id: string, updates: Partial<TaxReminder>, tenantClient: TenantClient): Promise<void> {
  return repo.updateTaxReminder(id, { ...updates, updated_at: now() } as Partial<TaxReminder>, tenantClient)
}

export async function deleteTaxReminder(id: string, tenantClient: TenantClient): Promise<void> {
  return repo.deleteTaxReminder(id, tenantClient)
}

export async function fetchTaxSettings(tenantClient: TenantClient): Promise<TaxSettings | null> {
  return repo.fetchTaxSettings(tenantClient)
}

export async function upsertTaxSettings(record: Partial<TaxSettings>, tenantClient: TenantClient): Promise<void> {
  return repo.upsertTaxSettings({ ...record, updated_at: now() } as Partial<TaxSettings>, tenantClient)
}

export async function importRecord(
  type: string,
  record: Record<string, unknown>,
  tenantClient: TenantClient,
): Promise<void> {
  const timestamp = now()
  const table = type === 'vat_input' ? 'tax_input_entries'
    : type === 'tax_filing' ? 'tax_filings'
    : type === 'wht_receipt' ? 'wht_receipts'
    : null
  if (!table) throw new Error(`Unknown import type: ${type}`)
  const { error } = await tenantClient.from(table).insert([{ ...record, created_at: timestamp, updated_at: timestamp }])
  if (error) throw error
}
