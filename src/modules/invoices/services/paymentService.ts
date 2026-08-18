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
} from "../repositories/paymentRepository"
import { recordPaymentRecorded, recordPaymentVoided, recordReceiptVoided } from "@/lib/audit"
import { insertReceipt, fetchReceiptByPaymentId, voidReceipt } from "@/domain/receipt/receiptRepository"
import { autoCreateWhtReceiptDraft } from "@/modules/compliance/services/complianceService"
import { supabase } from "@/supabase"
import type { TenantClient } from "@/lib/tenantClient"
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
  entityId?: string | null
}

function normalizeAmount(value: number | null | undefined): number {
  const numericValue = Number(value ?? 0)
  return Number.isFinite(numericValue) ? numericValue : 0
}

async function fetchBankAccountName(bankAccountId: string, tenantClient: TenantClient): Promise<string | null> {
  const { data } = await tenantClient
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
  input: PaymentRecordInput,
  tenantClient: TenantClient
): Promise<PaymentRecordResult> {
  try {
    const payload = normalizePaymentInput(input)

    // ── ENTITY-AWARE PATH: atomic RPC ───────────────────────────────────
    // When entityId is available, the RPC handles payment insert + invoice
    // status sync atomically. Client-side operations (audit, WHT draft,
    // receipt, attachments) run afterward — they are idempotent and non-fatal.
    if (input.entityId) {
      const rpcPayload = {
        invoice_id: payload.invoice_id,
        amount: payload.amount,
        date: payload.date,
        method: payload.method,
        reference: payload.reference || null,
        notes: payload.notes || null,
        cash_amount: payload.cash_amount,
        wht_amount: payload.wht_amount,
        currency_code: 'NGN',
        wht_rate: payload.wht_rate ?? null,
        wht_type: payload.wht_type ?? null,
        bank_account_id: payload.bank_account_id || null,
        source: 'live',
      }

      const { data: rpcResult, error: rpcError } = await tenantClient.rpc(
        'record_payment_transaction',
        { p_entity_id: input.entityId, p_payment_payload: rpcPayload },
      )

      if (rpcError) throw rpcError

      const paymentId = (rpcResult as { id?: string })?.id
      if (!paymentId) throw new Error('RPC returned no payment id')

      // ── Client-side: audit trail (fire-and-forget) ────────────────────
      try {
        const bankAccountName = input.bankAccountId
          ? await fetchBankAccountName(input.bankAccountId, tenantClient)
          : null
        await recordPaymentRecorded(tenantClient, input.invoiceId, payload.amount, payload.notes || null, {
          payment_mode: input.method,
          account_paid_to: bankAccountName,
          running_balance_after: Math.max(0, input.settlement.remainingBalance),
          wht_amount: payload.wht_amount > 0 ? payload.wht_amount : null,
        })
      } catch (auditErr) {
        console.error('Audit trail failed:', auditErr)
      }

      // ── Client-side: WHT receipt draft (fire-and-forget) ──────────────
      if (payload.wht_amount > 0) {
        autoCreateWhtReceiptDraft({
          paymentId,
          invoiceId: input.invoiceId,
          whtAmount: payload.wht_amount,
          whtRate: payload.wht_rate ?? null,
          whtType: payload.wht_type ?? null,
        }, tenantClient).catch((err) => {
          console.error('Auto WHT receipt draft failed:', err)
        })
      }

      // ── Client-side: payment acknowledgement receipt ───────────────────
      try {
        const [invoiceResult, clientResult, companyResult, bankResult, signatoryResult] = await Promise.all([
          tenantClient.from('invoices').select('invoice_number, total, subtotal, vat, wht, discount, notes, terms, po_number, project_id').eq('id', input.invoiceId).single(),
          tenantClient.from('clients').select('id, name, address, city, state, phone, email').eq('id', (await tenantClient.from('invoices').select('client_id').eq('id', input.invoiceId).single()).data?.client_id ?? '').single(),
          tenantClient.from('settings').select('company_name, company_address, company_email, company_phone, company_logo_url').limit(1).single(),
          payload.bank_account_id ? tenantClient.from('bank_accounts').select('bank_name, account_number, account_name').eq('id', payload.bank_account_id).single() : Promise.resolve({ data: null }),
          tenantClient.from('signatories').select('name, role, signature_url').limit(1).single(),
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
          const { data: settings } = await tenantClient.from('settings').select('document_prefixes').limit(1).single()

          const receiptPayload = {
            ...snapshot,
            receipt_number: '',
            payment_id: paymentId,
            invoice_id: input.invoiceId,
          }

          const { data: receiptRow, error: receiptError } = await withUniqueRetry(
            async (candidateNumber: string) => {
              receiptPayload.receipt_number = candidateNumber
              return tenantClient.from('receipts').insert([receiptPayload]).select().single()
            },
            async () => {
              const { data: rows } = await tenantClient.from('receipts').select('receipt_number')
              return getNextReceiptNumber(rows || [], (settings?.document_prefixes as DocumentPrefixes | null) ?? null)
            },
          )

          if (receiptError) {
            console.error('Receipt creation failed:', receiptError)
          } else if (receiptRow) {
            const { recordReceiptGenerated } = await import('@/lib/audit')
            await recordReceiptGenerated(
              tenantClient,
              receiptRow.id,
              receiptRow.receipt_number,
              paymentId,
              input.invoiceId,
              payload.amount,
              input.method,
            )
          }
        }
      } catch (receiptErr) {
        console.error('Auto receipt creation failed:', receiptErr)
      }

      // ── Client-side: attachment uploads ────────────────────────────────
      let uploadResults: PaymentAttachment[] = []

      if (input.attachments?.length) {
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token

        if (token) {
          for (const file of input.attachments) {
            try {
              const fd = new FormData()
              fd.append("file", file)
              fd.append("paymentId", paymentId)
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
        paymentId,
        uploadResults: uploadResults.length > 0 ? uploadResults : undefined,
      }
    }

    // ── LEGACY FALLBACK PATH (no entityId) ──────────────────────────────
    // Multi-step: insert → fetch status → update invoice → audit → WHT → receipt → attachments.
    // Preserved for pages not yet wired to entity context.
    const paymentRow = await insertPayment(payload, tenantClient)

    const financialsRow = await fetchInvoiceFinancials(input.invoiceId, tenantClient)
    const newStatus = financialsRow?.persisted_status || financialsRow?.computed_status || "unpaid"

    await updateInvoiceStatus(input.invoiceId, newStatus, tenantClient)

    try {
      const bankAccountName = input.bankAccountId
        ? await fetchBankAccountName(input.bankAccountId, tenantClient)
        : null
      await recordPaymentRecorded(tenantClient, input.invoiceId, payload.amount, payload.notes || null, {
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
      }, tenantClient).catch((err) => {
        console.error('Auto WHT receipt draft failed:', err)
      })
    }

    // Auto-create payment acknowledgement receipt with snapshot
    try {
      const [invoiceResult, clientResult, companyResult, bankResult, signatoryResult] = await Promise.all([
        tenantClient.from('invoices').select('invoice_number, total, subtotal, vat, wht, discount, notes, terms, po_number, project_id').eq('id', input.invoiceId).single(),
        tenantClient.from('clients').select('id, name, address, city, state, phone, email').eq('id', (await tenantClient.from('invoices').select('client_id').eq('id', input.invoiceId).single()).data?.client_id ?? '').single(),
        tenantClient.from('settings').select('company_name, company_address, company_email, company_phone, company_logo_url').limit(1).single(),
        payload.bank_account_id ? tenantClient.from('bank_accounts').select('bank_name, account_number, account_name').eq('id', payload.bank_account_id).single() : Promise.resolve({ data: null }),
        tenantClient.from('signatories').select('name, role, signature_url').limit(1).single(),
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
        const { data: settings } = await tenantClient.from('settings').select('document_prefixes').limit(1).single()

        const receiptPayload = {
          ...snapshot,
          receipt_number: '',
          payment_id: paymentRow.id,
          invoice_id: input.invoiceId,
        }

        const { data: receiptRow, error: receiptError } = await withUniqueRetry(
          async (candidateNumber: string) => {
            receiptPayload.receipt_number = candidateNumber
            return tenantClient.from('receipts').insert([receiptPayload]).select().single()
          },
          async () => {
            const { data: rows } = await tenantClient.from('receipts').select('receipt_number')
            return getNextReceiptNumber(rows || [], (settings?.document_prefixes as DocumentPrefixes | null) ?? null)
          },
        )

        if (receiptError) {
          console.error('Receipt creation failed:', receiptError)
        } else if (receiptRow) {
          const { recordReceiptGenerated } = await import('@/lib/audit')
          await recordReceiptGenerated(
            tenantClient,
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

export async function calculatePreviousSettled(invoiceId: string, tenantClient: TenantClient): Promise<number> {
  const payments = await fetchPaymentsForInvoice(invoiceId, tenantClient)
  return payments.reduce(
    (sum, row) => sum + normalizeAmount(row.cash_amount) + normalizeAmount(row.wht_amount),
    0
  )
}

export async function loadBankAccountsList(tenantClient: TenantClient) {
  return fetchBankAccounts(tenantClient)
}

export interface PaymentSheetLoadResult {
  currentBalance: number
  bankAccounts: BankAccountSummary[]
}

export async function loadPaymentSheetData(
  invoiceId: string,
  invoiceTotal: number,
  tenantClient: TenantClient
): Promise<PaymentSheetLoadResult> {
  const [previousSettled, bankAccounts] = await Promise.all([
    calculatePreviousSettled(invoiceId, tenantClient),
    loadBankAccountsList(tenantClient),
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

export async function voidInvoicePayment(input: VoidPaymentInput, tenantClient: TenantClient): Promise<{ success: boolean; error?: string }> {
  try {
    const payment = await fetchPaymentById(input.paymentId, tenantClient)
    const amount = payment ? payment.cash_amount + payment.wht_amount : 0

    const voided = await repositoryVoidPayment(input.paymentId, input.reason, tenantClient)
    await repositorySyncStatus(input.invoiceId, tenantClient)

    try {
      await recordPaymentVoided(tenantClient, input.paymentId, input.invoiceId, amount, input.reason || null)
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }

    if (voided?.attachments?.length) {
      await editVoidCaptions(voided.id)
    }

    try {
      const receipt = await fetchReceiptByPaymentId(input.paymentId, tenantClient)
      if (receipt) {
        await voidReceipt(receipt.id, input.reason || null, tenantClient)
        await recordReceiptVoided(tenantClient, receipt.id, receipt.receipt_number, input.reason || null, input.paymentId)
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