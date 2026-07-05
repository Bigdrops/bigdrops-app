import { supabase } from '@/supabase'
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

export async function createWhtReceipt(input: CreateWhtReceiptInput): Promise<WhtReceipt> {
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
  } as Partial<WhtReceipt>)
}

export async function updateWhtReceipt(receiptId: string, updates: UpdateWhtReceiptInput): Promise<WhtReceipt> {
  return repo.updateWhtReceipt(receiptId, { ...updates, updated_at: now() } as Partial<WhtReceipt>)
}

export async function submitCertificate(input: SubmitCertificateInput): Promise<WhtReceipt> {
  return createWhtReceipt({
    payment_id: input.payment_id,
    invoice_id: input.invoice_id,
    client_name: input.client_name,
    wht_amount: input.wht_amount,
    receipt_number: input.receipt_number,
    receipt_status: input.receipt_status,
    received_at: input.received_at,
    receipt_file_url: input.receipt_file_url,
  })
}

export async function markReceiptVerified(receiptId: string): Promise<WhtReceipt> {
  return updateWhtReceipt(receiptId, { receipt_status: 'verified' })
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

export async function fetchWhtReceipts(): Promise<WhtReceipt[]> {
  return repo.fetchWhtReceipts()
}

export async function autoCreateWhtReceiptDraft(params: {
  paymentId: string
  invoiceId: string
  whtAmount: number
  whtRate: number | null
  whtType: string | null
}): Promise<void> {
  const { data: existing } = await supabase
    .from('wht_receipts')
    .select('id')
    .eq('payment_id', params.paymentId)
    .maybeSingle()

  if (existing) return

  const { data: invoice } = await supabase
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
  } as Partial<WhtReceipt>)
}

export async function insertInlineWhtReceipt(record: Partial<WhtReceipt>): Promise<WhtReceipt> {
  return repo.insertWhtReceipt({ ...record, created_at: now(), updated_at: now() } as Partial<WhtReceipt>)
}

export async function updateInlineWhtReceipt(id: string, updates: Partial<WhtReceipt>): Promise<WhtReceipt> {
  return repo.updateWhtReceipt(id, { ...updates, updated_at: now() } as Partial<WhtReceipt>)
}

export async function fetchTaxInputEntries(): Promise<TaxInputEntry[]> {
  return repo.fetchTaxInputEntries()
}

export async function insertTaxInputEntry(record: Partial<TaxInputEntry>): Promise<void> {
  return repo.insertTaxInputEntry({ ...record, created_at: now(), updated_at: now() } as Partial<TaxInputEntry>)
}

export async function updateTaxInputEntry(id: string, updates: Partial<TaxInputEntry>): Promise<void> {
  return repo.updateTaxInputEntry(id, { ...updates, updated_at: now() } as Partial<TaxInputEntry>)
}

export async function deleteTaxInputEntry(id: string): Promise<void> {
  return repo.deleteTaxInputEntry(id)
}

export async function fetchTaxFilings(): Promise<TaxFiling[]> {
  return repo.fetchTaxFilings()
}

export async function insertTaxFiling(record: Partial<TaxFiling>): Promise<void> {
  return repo.insertTaxFiling({ ...record, created_at: now(), updated_at: now() } as Partial<TaxFiling>)
}

export async function updateTaxFiling(id: string, updates: Partial<TaxFiling>): Promise<void> {
  return repo.updateTaxFiling(id, { ...updates, updated_at: now() } as Partial<TaxFiling>)
}

export async function deleteTaxFiling(id: string): Promise<void> {
  return repo.deleteTaxFiling(id)
}

export async function fetchTaxReminders(): Promise<TaxReminder[]> {
  return repo.fetchTaxReminders()
}

export async function insertTaxReminder(record: Partial<TaxReminder>): Promise<void> {
  return repo.insertTaxReminder({ ...record, created_at: now(), updated_at: now() } as Partial<TaxReminder>)
}

export async function updateTaxReminder(id: string, updates: Partial<TaxReminder>): Promise<void> {
  return repo.updateTaxReminder(id, { ...updates, updated_at: now() } as Partial<TaxReminder>)
}

export async function deleteTaxReminder(id: string): Promise<void> {
  return repo.deleteTaxReminder(id)
}

export async function fetchTaxSettings(): Promise<TaxSettings | null> {
  return repo.fetchTaxSettings()
}

export async function upsertTaxSettings(record: Partial<TaxSettings>): Promise<void> {
  return repo.upsertTaxSettings({ ...record, updated_at: now() } as Partial<TaxSettings>)
}

export async function importRecord(
  type: string,
  record: Record<string, unknown>,
): Promise<void> {
  const timestamp = now()
  const table = type === 'vat_input' ? 'tax_input_entries'
    : type === 'tax_filing' ? 'tax_filings'
    : type === 'wht_receipt' ? 'wht_receipts'
    : null
  if (!table) throw new Error(`Unknown import type: ${type}`)
  const { error } = await supabase.from(table).insert([{ ...record, created_at: timestamp, updated_at: timestamp }])
  if (error) throw error
}
