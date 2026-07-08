import { supabase } from '@/supabase'
import type { ReceiptRow } from './types'

export interface CreateReceiptInput {
  receipt_number: string
  payment_id: string
  invoice_id: string
  client_id: string
  client_name: string
  amount: number
  currency_code: string
  payment_date: string
  payment_method: string | null
  payment_ref: string | null
  notes: string | null
}

export async function insertReceipt(input: CreateReceiptInput): Promise<ReceiptRow> {
  const { data, error } = await supabase
    .from('receipts')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as ReceiptRow
}

export async function fetchReceiptByPaymentId(paymentId: string): Promise<ReceiptRow | null> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('payment_id', paymentId)
    .maybeSingle()

  if (error) throw error
  return data as ReceiptRow | null
}

export async function fetchReceiptsForInvoice(invoiceId: string): Promise<ReceiptRow[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as ReceiptRow[]
}

export async function updateReceiptNotes(
  receiptId: string,
  notes: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('receipts')
    .update({ notes })
    .eq('id', receiptId)

  if (error) throw error
}
