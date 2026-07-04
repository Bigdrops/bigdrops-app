import type { PaymentInput, PaymentMethod, PaymentRecordResult, BankAccountSummary } from "../types/paymentTypes"
import {
  insertPayment,
  fetchPaymentsForInvoice,
  fetchInvoiceFinancials,
  updateInvoiceStatus,
  fetchBankAccounts,
  voidPayment as repositoryVoidPayment,
  syncInvoiceStatusFromFinancials as repositorySyncStatus,
  fetchPaymentById,
  fetchInvoiceWhtConfig,
} from "../repositories/paymentRepository"
import { recordPaymentRecorded, recordPaymentVoided } from "@/lib/audit"

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

    const whtConfig = await fetchInvoiceWhtConfig(input.invoiceId)
    if (whtConfig) {
      payload.wht_rate = whtConfig.wht_rate
      payload.wht_type = whtConfig.wht_type
    }

    const paymentRow = await insertPayment(payload)

    const financialsRow = await fetchInvoiceFinancials(input.invoiceId)
    const newStatus = financialsRow?.computed_status || "unpaid"

    await updateInvoiceStatus(input.invoiceId, newStatus)

    try {
      await recordPaymentRecorded(input.invoiceId, payload.amount, payload.notes || null)
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }

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

export interface PaymentSheetLoadResult {
  currentBalance: number
  bankAccounts: BankAccountSummary[]
}

export async function loadPaymentSheetData(
  invoiceId: string,
  invoiceTotal: number
): Promise<PaymentSheetLoadResult> {
  const [previousSettled, bankAccounts] = await Promise.all([
    calculatePreviousSettled(invoiceId),
    loadBankAccountsList(),
  ])
  return {
    currentBalance: Math.max(0, invoiceTotal - previousSettled),
    bankAccounts,
  }
}

export interface VoidPaymentInput {
  paymentId: string
  invoiceId: string
  reason: string
}

export async function voidInvoicePayment(input: VoidPaymentInput): Promise<{ success: boolean; error?: string }> {
  try {
    const payment = await fetchPaymentById(input.paymentId)
    const amount = payment ? payment.cash_amount + payment.wht_amount : 0

    await repositoryVoidPayment(input.paymentId, input.reason)
    await repositorySyncStatus(input.invoiceId)

    try {
      await recordPaymentVoided(input.paymentId, input.invoiceId, amount, input.reason || null)
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to void payment"
    return { success: false, error: message }
  }
}