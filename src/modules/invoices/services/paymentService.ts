import type { PaymentInput, PaymentMethod, PaymentRecordResult, BankAccountSummary } from "../types/paymentTypes"
import type { PaymentAttachment } from "@/lib/attachmentTypes"
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
import { autoCreateWhtReceiptDraft } from "@/modules/compliance/services/complianceService"
import { editCaption } from "./telegramService"
import { supabase } from "@/supabase"

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

async function fetchBankAccountName(bankAccountId: string): Promise<string | null> {
  const { data } = await supabase
    .from('bank_accounts')
    .select('bank_name, account_number')
    .eq('id', bankAccountId)
    .single()
  if (!data) return null
  const parts = [data.bank_name, data.account_number].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
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
      const bankAccountName = input.bankAccountId
        ? await fetchBankAccountName(input.bankAccountId)
        : null
      await recordPaymentRecorded(input.invoiceId, payload.amount, payload.notes || null, {
        payment_mode: input.method,
        account_paid_to: bankAccountName,
        running_balance_after: Math.max(0, input.settlement.remainingBalance),
        wht_amount: payload.wht_amount > 0 ? payload.wht_amount : null,
      })
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }

    if (payload.wht_amount > 0) {
      autoCreateWhtReceiptDraft({
        paymentId: paymentRow.id,
        invoiceId: input.invoiceId,
        whtAmount: payload.wht_amount,
        whtRate: payload.wht_rate ?? null,
        whtType: payload.wht_type ?? null,
      }).catch((err) => {
        console.error('Auto WHT receipt draft failed:', err)
      })
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

async function editVoidCaptions(attachments: PaymentAttachment[]): Promise<void> {
  const chatId = import.meta.env.VITE_TELEGRAM_GROUP_CHAT_ID
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN
  if (!chatId || !botToken) return

  const VOID_PREFIX = "\u{1F6AB} VOIDED — This payment has been voided.\n\n"

  for (const att of attachments) {
    if (att.provider !== "telegram" || !att.providerMetadata?.messageId) continue
    await editCaption({
      chatId,
      messageId: att.providerMetadata.messageId,
      threadId: att.providerMetadata.threadId,
      caption: VOID_PREFIX,
      botToken,
    })
  }
}

export async function voidInvoicePayment(input: VoidPaymentInput): Promise<{ success: boolean; error?: string }> {
  try {
    const payment = await fetchPaymentById(input.paymentId)
    const amount = payment ? payment.cash_amount + payment.wht_amount : 0

    const voided = await repositoryVoidPayment(input.paymentId, input.reason)
    await repositorySyncStatus(input.invoiceId)

    try {
      await recordPaymentVoided(input.paymentId, input.invoiceId, amount, input.reason || null)
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }

    if (voided?.attachments?.length) {
      await editVoidCaptions(voided.attachments as PaymentAttachment[])
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to void payment"
    return { success: false, error: message }
  }
}