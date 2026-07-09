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
import { recordPaymentRecorded, recordPaymentVoided, recordReceiptVoided } from "@/lib/audit"
import { insertReceipt, fetchReceiptByPaymentId, voidReceipt } from "@/domain/receipt/receiptRepository"
import { autoCreateWhtReceiptDraft } from "@/modules/compliance/services/complianceService"
import { supabase } from "@/supabase"
import type { PaymentAttachment } from "@/lib/attachmentTypes"
import { getNextReceiptNumber } from "@/domain/receipt/receiptNumber"
import type { DocumentPrefixes } from '@/domain/prefixConstants'

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

    // Auto-create payment acknowledgement receipt with snapshot
    try {
      const [invoiceResult, clientResult, companyResult, bankResult, signatoryResult] = await Promise.all([
        supabase.from('invoices').select('invoice_number, total, subtotal, vat, wht, discount, notes, terms, po_number, project_id').eq('id', input.invoiceId).single(),
        supabase.from('clients').select('id, name, address, city, state, phone, email').eq('id', (await supabase.from('invoices').select('client_id').eq('id', input.invoiceId).single()).data?.client_id ?? '').single(),
        supabase.from('settings').select('company_name, company_address, company_email, company_phone, company_logo_url').limit(1).single(),
        payload.bank_account_id ? supabase.from('bank_accounts').select('bank_name, account_number, account_name').eq('id', payload.bank_account_id).single() : Promise.resolve({ data: null }),
        supabase.from('signatories').select('name, role, signature_url').limit(1).single(),
      ])

      if (invoiceResult.data && clientResult.data) {
        const { buildReceiptSnapshot } = await import('@/domain/receipt/snapshotBuilder')
        const snapshot = buildReceiptSnapshot({
          payment: {
            amount: payload.amount,
            date: input.date,
            method: input.method,
            reference: input.reference || null,
            notes: input.notes || null,
            cash_amount: payload.cash_amount,
            wht_amount: payload.wht_amount,
            currency_code: 'NGN',
            wht_rate: payload.wht_rate ?? null,
            wht_type: payload.wht_type ?? null,
            bank_account_id: payload.bank_account_id,
          },
          invoice: invoiceResult.data,
          client: clientResult.data,
          project: null,
          company: (companyResult.data ?? {}) as { company_name: string | null; company_address: string | null; company_email: string | null; company_phone: string | null; company_logo_url: string | null },
          bank: bankResult.data,
          signatory: signatoryResult.data,
        })

        const { withUniqueRetry } = await import('@/lib/withUniqueRetry')
        const { data: settings } = await supabase.from('settings').select('document_prefixes').limit(1).single()

        const receiptPayload = {
          ...snapshot,
          receipt_number: '',
          payment_id: paymentRow.id,
          invoice_id: input.invoiceId,
        }

        const { data: receiptRow, error: receiptError } = await withUniqueRetry(
          async (candidateNumber: string) => {
            receiptPayload.receipt_number = candidateNumber
            return supabase.from('receipts').insert([receiptPayload]).select().single()
          },
          async () => {
            const { data: rows } = await supabase.from('receipts').select('receipt_number')
            return getNextReceiptNumber(rows || [], (settings?.document_prefixes as DocumentPrefixes | null) ?? null)
          },
        )

        if (!receiptError && receiptRow) {
          const { recordReceiptGenerated } = await import('@/lib/audit')
          await recordReceiptGenerated(
            receiptRow.id,
            receiptRow.receipt_number,
            paymentRow.id,
            input.invoiceId,
            payload.amount,
            input.method,
          )
        }
      }
    } catch (receiptErr) {
      console.error('Auto receipt creation failed:', receiptErr)
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

    try {
      const receipt = await fetchReceiptByPaymentId(input.paymentId)
      if (receipt) {
        await voidReceipt(receipt.id, input.reason || null)
        await recordReceiptVoided(receipt.id, receipt.receipt_number, input.reason || null, input.paymentId)
      }
    } catch (receiptVoidErr) {
      console.error('Receipt void failed:', receiptVoidErr)
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to void payment"
    return { success: false, error: message }
  }
}