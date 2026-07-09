import { supabase } from '@/supabase'
import type { ReceiptRow } from './types'

export type CreateReceiptInput = Omit<ReceiptRow, 'id' | 'status' | 'voided_at' | 'void_reason' | 'created_by' | 'created_at'>

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

export async function fetchAllReceipts(): Promise<ReceiptRow[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as ReceiptRow[]
}

export async function fetchReceiptById(id: string): Promise<ReceiptRow | null> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as ReceiptRow | null
}

export async function voidReceipt(
  receiptId: string,
  voidReason: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('receipts')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      void_reason: voidReason,
    })
    .eq('id', receiptId)

  if (error) throw error
}
