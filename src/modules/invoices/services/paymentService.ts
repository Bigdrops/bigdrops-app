import type { PaymentInput, PaymentMethod, PaymentRecordResult } from "../types/paymentTypes"
import {
  insertPayment,
  fetchPaymentsForInvoice,
  fetchInvoiceFinancials,
  updateInvoiceStatus,
  fetchBankAccounts,
  voidPayment as repositoryVoidPayment,
  syncInvoiceStatusFromFinancials as repositorySyncStatus,
} from "../repositories/paymentRepository"

interface SettlementSummary {
  cashReceived: number
  whtDeducted: number
  settlementTotal: number
  remainingBalance: number
}

interface PaymentRecordInput {
  invoiceId: string
  settlement: SettlementSummary
  date: string
  method: PaymentMethod
  reference?: string
  notes?: string
  bankAccountId?: string | null
}

function normalizeAmount(value: number | null | undefined): number {
  const numericValue = Number(value ?? 0)
  return Number.isFinite(numericValue) ? numericValue : 0
}

export function normalizePaymentInput(
  input: PaymentRecordInput
): PaymentInput {
  return {
    invoice_id: input.invoiceId,
    cash_amount: normalizeAmount(input.settlement.cashReceived),
    wht_amount: normalizeAmount(input.settlement.whtDeducted),
    amount: normalizeAmount(input.settlement.settlementTotal),
    date: input.date,
    method: input.method,
    reference: input.reference,
    notes: input.notes,
    bank_account_id: input.bankAccountId,
  }
}

export async function recordInvoicePayment(
  input: PaymentRecordInput
): Promise<PaymentRecordResult> {
  try {
    const payload = normalizePaymentInput(input)
    const paymentRow = await insertPayment(payload)

    const financialsRow = await fetchInvoiceFinancials(input.invoiceId)
    const newStatus = financialsRow?.computed_status || "unpaid"

    await updateInvoiceStatus(input.invoiceId, newStatus)

    return {
      success: true,
      paymentId: paymentRow.id,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record payment"
    return {
      success: false,
      error: message,
    }
  }
}

export async function calculatePreviousSettled(invoiceId: string): Promise<number> {
  const payments = await fetchPaymentsForInvoice(invoiceId)
  return payments.reduce(
    (sum, row) => sum + normalizeAmount(row.cash_amount) + normalizeAmount(row.wht_amount),
    0
  )
}

export async function loadBankAccountsList() {
  return fetchBankAccounts()
}

export async function refreshInvoicePaymentState(invoiceId: string): Promise<string> {
  const financials = await fetchInvoiceFinancials(invoiceId)
  return financials?.computed_status || "unpaid"
}

export interface VoidPaymentInput {
  paymentId: string
  invoiceId: string
  reason: string
}

export async function voidInvoicePayment(input: VoidPaymentInput): Promise<{ success: boolean; error?: string }> {
  try {
    await repositoryVoidPayment(input.paymentId)
    await repositorySyncStatus(input.invoiceId)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to void payment"
    return { success: false, error: message }
  }
}