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
import { autoCreateWhtReceiptDraft } from "@/modules/compliance/services/complianceService"
import { supabase } from "@/supabase"
import type { PaymentAttachment } from "@/lib/attachmentTypes"

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
  attachments?: File[]
  invoiceNumber?: string
  clientName?: string
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

    let uploadResults: PaymentAttachment[] = []

    if (input.attachments?.length) {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (token) {
        for (const file of input.attachments) {
          try {
            const fd = new FormData()
            fd.append("file", file)
            fd.append("paymentId", paymentRow.id)
            fd.append("invoiceNumber", input.invoiceNumber || "")
            fd.append("clientName", input.clientName || "")
            fd.append("amount", String(payload.amount))
            fd.append("method", input.method)
            fd.append("paymentDate", input.date)

            const res = await fetch("/api/upload-payment-attachment", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: fd,
            })

            if (res.ok) {
              const data = await res.json()
              if (data.attachment) uploadResults.push(data.attachment)
            } else {
              const rawText = await res.text().catch(() => "Could not read response")
              let errBody: { error?: string; stage?: string; message?: string } = {}
              try { errBody = JSON.parse(rawText) } catch { errBody = { error: rawText.slice(0, 200) } }
              const stageInfo = errBody.stage ? `[${errBody.stage}] ` : ""
              const msg = errBody.message || errBody.error || "Upload failed"
              console.error(`[UPLOAD] ${stageInfo}${msg} (HTTP ${res.status})`)
              uploadResults.push({
                id: crypto.randomUUID(),
                provider: "telegram",
                fileName: file.name,
                mimeType: file.type || "application/octet-stream",
                sizeBytes: file.size,
                uploadedAt: new Date().toISOString(),
                uploadStatus: "failed",
                error: `${stageInfo}${msg}`,
              })
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Network error"
            console.error(`[UPLOAD] Network error for ${file.name}:`, msg)
            uploadResults.push({
              id: crypto.randomUUID(),
              provider: "telegram",
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              sizeBytes: file.size,
              uploadedAt: new Date().toISOString(),
              uploadStatus: "failed",
              error: msg,
            })
          }
        }
      }
    }

    return {
      success: true,
      paymentId: paymentRow.id,
      uploadResults: uploadResults.length > 0 ? uploadResults : undefined,
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

async function editVoidCaptions(paymentId: string): Promise<void> {
  const token = (await supabase.auth.getSession()).data.session?.access_token
  if (!token) return

  try {
    await fetch("/api/edit-payment-caption", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paymentId }),
    })
  } catch (err) {
    console.error("Failed to void Telegram captions:", err)
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
      await editVoidCaptions(voided.id)
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to void payment"
    return { success: false, error: message }
  }
}