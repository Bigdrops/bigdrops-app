import type { TenantClient } from "@/lib/tenantClient"
import type { InvoicePayment, InvoiceFinancialsRow, BankAccountSummary, PaymentInput } from "../types/paymentTypes"

export async function fetchInvoiceIdForPayment(paymentId: string, client: TenantClient): Promise<string | null> {
  const { data, error } = await client
    .from("payments")
    .select("invoice_id")
    .eq("id", paymentId)
    .single()

  if (error || !data) return null
  return data.invoice_id
}

export async function insertPayment(payload: PaymentInput, client: TenantClient): Promise<InvoicePayment> {
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

  const { data, error } = await client
    .from("payments")
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as InvoicePayment
}

export async function fetchPaymentsForInvoice(invoiceId: string, client: TenantClient): Promise<InvoicePayment[]> {
  const { data, error } = await client
    .from("payments")
    .select("cash_amount,wht_amount")
    .eq("invoice_id", invoiceId)
    .is("voided_at", null)

  if (error) {
    throw error
  }

  return (data || []) as InvoicePayment[]
}

export async function fetchInvoiceFinancials(invoiceId: string, client: TenantClient): Promise<InvoiceFinancialsRow | null> {
  const { data, error } = await client
    .from("invoice_financials_v")
    .select("computed_status, persisted_status")
    .eq("id", invoiceId)
    .single()

  if (error) {
    throw error
  }

  return data as InvoiceFinancialsRow | null
}

export async function updateInvoiceStatus(invoiceId: string, status: string, client: TenantClient): Promise<void> {
  const { error } = await client
    .from("invoices")
    .update({ status })
    .eq("id", invoiceId)

  if (error) {
    throw error
  }
}

export async function fetchBankAccounts(client: TenantClient): Promise<BankAccountSummary[]> {
  const { data, error } = await client
    .from("bank_accounts")
    .select("*")
    .order("is_default", { ascending: false })

  if (error) {
    throw error
  }

  return (data || []) as BankAccountSummary[]
}

export async function voidPayment(paymentId: string, reason: string | undefined, client: TenantClient): Promise<InvoicePayment | null> {
  const { data, error } = await client
    .from("payments")
    .update({
      voided_at: new Date().toISOString(),
      void_reason: reason ?? null,
    })
    .eq("id", paymentId)
    .is("voided_at", null)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as InvoicePayment | null
}

export async function fetchPaymentById(paymentId: string, client: TenantClient): Promise<InvoicePayment | null> {
  const { data, error } = await client
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single()

  if (error || !data) return null
  return data as InvoicePayment
}

export async function updatePaymentAttachments(paymentId: string, attachments: unknown[], client: TenantClient): Promise<void> {
  const { error } = await client
    .from("payments")
    .update({ attachments: JSON.stringify(attachments) })
    .eq("id", paymentId)

  if (error) throw error
}

export async function syncInvoiceStatusFromFinancials(invoiceId: string, client: TenantClient): Promise<string> {
  const { data, error } = await client
    .from("invoice_financials_v")
    .select("computed_status, persisted_status")
    .eq("id", invoiceId)
    .single()

  if (error) {
    throw error
  }

  // Phase 3 (financial computation): write the PERSISTED-safe status
  // (paid | partially_paid | unpaid) — never the presentation-only
  // partial/overdue values, which the invoices.status CHECK rejects.
  const safeStatus = data?.persisted_status || data?.computed_status || "unpaid"

  if (safeStatus) {
    const { error: updateError } = await client
      .from("invoices")
      .update({ status: safeStatus })
      .eq("id", invoiceId)

    if (updateError) {
      throw updateError
    }
  }

  return safeStatus
}
