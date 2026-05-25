import { supabase } from '@/supabase'
import type { WhtReceipt, WhtReceiptStatus } from '@/domain/compliance/types'

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
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('wht_receipts')
    .insert([{
      payment_id: input.payment_id,
      invoice_id: input.invoice_id,
      client_name: input.client_name,
      wht_amount: input.wht_amount,
      receipt_number: input.receipt_number,
      receipt_status: input.receipt_status,
      received_at: input.received_at,
      receipt_file_url: input.receipt_file_url,
      created_at: now,
      updated_at: now,
    }])
    .select()
    .single()

  if (error) throw error
  return data as WhtReceipt
}

export async function updateWhtReceipt(
  receiptId: string,
  updates: UpdateWhtReceiptInput,
): Promise<WhtReceipt> {
  const { data, error } = await supabase
    .from('wht_receipts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', receiptId)
    .select()
    .single()

  if (error) throw error
  return data as WhtReceipt
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
  return updateWhtReceipt(receiptId, {
    receipt_status: 'verified',
  })
}

export async function uploadReceiptFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `wht-receipts/cert_${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('compliance')
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage
    .from('compliance')
    .getPublicUrl(path)

  if (!data?.publicUrl) {
    throw new Error('Failed to get public URL for uploaded file')
  }

  return data.publicUrl
}
