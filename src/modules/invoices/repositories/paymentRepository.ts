import { supabase } from "@/supabase"
import type { InvoicePayment, InvoiceFinancialsRow, BankAccountSummary, PaymentInput } from "../types/paymentTypes"

export async function fetchInvoiceIdForPayment(paymentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("payments")
    .select("invoice_id")
    .eq("id", paymentId)
    .single()

  if (error || !data) return null
  return data.invoice_id
}

export async function fetchInvoiceWhtConfig(invoiceId: string): Promise<{ wht_rate: number | null; wht_type: string | null } | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("wht_rate, wht_type")
    .eq("id", invoiceId)
    .single()

  if (error || !data) return null
  return data as { wht_rate: number | null; wht_type: string | null }
}

export async function insertPayment(payload: PaymentInput): Promise<InvoicePayment> {
  const insertPayload = {
    invoice_id: payload.invoice_id,
    cash_amount: payload.cash_amount,
    wht_amount: payload.wht_amount,
    amount: payload.amount,
    date: payload.date,
    method: payload.method,
    reference: payload.reference || null,
    notes: payload.notes || null,
    source: "live",
    bank_account_id: payload.bank_account_id || null,
    wht_rate: payload.wht_rate ?? null,
    wht_type: payload.wht_type ?? null,
  }

  const { data, error } = await supabase
    .from("payments")
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as InvoicePayment
}

export async function fetchPaymentsForInvoice(invoiceId: string): Promise<InvoicePayment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("cash_amount,wht_amount")
    .eq("invoice_id", invoiceId)
    .is("voided_at", null)

  if (error) {
    throw error
  }

  return (data || []) as InvoicePayment[]
}

export async function fetchInvoiceFinancials(invoiceId: string): Promise<InvoiceFinancialsRow | null> {
  const { data, error } = await supabase
    .from("invoice_financials_v")
    .select("computed_status")
    .eq("id", invoiceId)
    .single()

  if (error) {
    throw error
  }

  return data as InvoiceFinancialsRow | null
}

export async function updateInvoiceStatus(invoiceId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", invoiceId)

  if (error) {
    throw error
  }
}

export async function fetchBankAccounts(): Promise<BankAccountSummary[]> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .order("is_default", { ascending: false })

  if (error) {
    throw error
  }

  return (data || []) as BankAccountSummary[]
}

export async function voidPayment(paymentId: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .update({
      voided_at: new Date().toISOString(),
      void_reason: reason ?? null,
    })
    .eq("id", paymentId)
    .is("voided_at", null)

  if (error) {
    throw error
  }
}

export async function fetchPaymentById(paymentId: string): Promise<{ cash_amount: number; wht_amount: number; invoice_id: string } | null> {
  const { data, error } = await supabase
    .from("payments")
    .select("cash_amount, wht_amount, invoice_id")
    .eq("id", paymentId)
    .single()

  if (error || !data) return null
  return data
}

export async function syncInvoiceStatusFromFinancials(invoiceId: string): Promise<string> {
  const { data, error } = await supabase
    .from("invoice_financials_v")
    .select("computed_status")
    .eq("id", invoiceId)
    .single()

  if (error) {
    throw error
  }

  if (data?.computed_status) {
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: data.computed_status })
      .eq("id", invoiceId)

    if (updateError) {
      throw updateError
    }
  }

  return data?.computed_status || "unpaid"
}