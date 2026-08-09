import type { TenantClient } from '@/lib/tenantClient'
import type { ReceiptRow } from './types'

export type CreateReceiptInput = Omit<ReceiptRow, 'id' | 'status' | 'voided_at' | 'void_reason' | 'created_by' | 'created_at'>

// Phase 3: receipts are part of the invoice aggregate — all reads/writes
// target the tenant schema via the caller-supplied TenantClient.

export async function insertReceipt(input: CreateReceiptInput, client: TenantClient): Promise<ReceiptRow> {
  const { data, error } = await client
    .from('receipts')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as ReceiptRow
}

export async function fetchReceiptByPaymentId(paymentId: string, client: TenantClient): Promise<ReceiptRow | null> {
  const { data, error } = await client
    .from('receipts')
    .select('*')
    .eq('payment_id', paymentId)
    .maybeSingle()

  if (error) throw error
  return data as ReceiptRow | null
}

export async function fetchReceiptsForInvoice(invoiceId: string, client: TenantClient): Promise<ReceiptRow[]> {
  const { data, error } = await client
    .from('receipts')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as ReceiptRow[]
}

export async function fetchAllReceipts(client: TenantClient): Promise<ReceiptRow[]> {
  const { data, error } = await client
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as ReceiptRow[]
}

export async function fetchReceiptById(id: string, client: TenantClient): Promise<ReceiptRow | null> {
  const { data, error } = await client
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
  client: TenantClient,
): Promise<void> {
  const { error } = await client
    .from('receipts')
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      void_reason: voidReason,
    })
    .eq('id', receiptId)

  if (error) throw error
}
