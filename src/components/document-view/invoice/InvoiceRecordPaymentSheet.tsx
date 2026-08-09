import { useState, useEffect, useCallback } from 'react'
import { Loader2, Banknote, Calendar, Check, CircleCheck } from 'lucide-react'
import { PaymentAttachmentUploader } from '@/components/ui/PaymentAttachmentUploader'
import type { PaymentAttachment } from '@/lib/attachmentTypes'
import DocumentSheet from '../shared/DocumentSheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatNaira } from '@/lib/formatters/money'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { NumericInput } from '@/components/ui/numeric-input'
import { feedback } from '@/lib/feedback'
import {
  getPaymentEntrySummary,
  validatePaymentEntry,
} from '@/components/invoice/paymentEntryHelpers'
import { loadPaymentSheetData, recordInvoicePayment } from '@/modules/invoices/services/paymentService'
import { useEntity } from '@/lib/tenant/contexts'
import type { BankAccountSummary } from '@/modules/invoices/types/paymentTypes'
import type { PaymentMethod } from '@/modules/invoices/types/paymentTypes'

interface InvoiceSummary {
  id: string
  invoice_number: string
  client_name?: string
  total: number
  wht?: number | string | null
}

type BankAccount = BankAccountSummary

interface InvoiceRecordPaymentSheetProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  invoice: InvoiceSummary
}

interface FormState {
  cashReceived: number | null
  date: string
  method: PaymentMethod
  reference: string
  notes: string
}

const DEFAULT_FORM = (): FormState => ({
  cashReceived: null,
  date: new Date().toISOString().split('T')[0] || '',
  method: 'Transfer',
  reference: '',
  notes: '',
})

const QUICK_PCTS = [25, 50, 75, 100]

export default function InvoiceRecordPaymentSheet({
  open,
  onClose,
  onSaved,
  invoice,
}: InvoiceRecordPaymentSheetProps) {
  const { tenantClient } = useEntity()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [currentBalance, setCurrentBalance] = useState(0)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedBankId, setSelectedBankId] = useState('')
  const [loadingData, setLoadingData] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadResults, setUploadResults] = useState<PaymentAttachment[] | null>(null)
  const [paymentRecorded, setPaymentRecorded] = useState(false)
  const [pctInput, setPctInput] = useState('')

  const invoiceHasWht = Number(invoice?.wht || 0) > 0

  useEffect(() => {
    if (!open || !invoice?.id) return

    let cancelled = false
    const loadData = async () => {
      setLoadingData(true)
      const result = await loadPaymentSheetData(invoice.id, invoice.total, tenantClient)

      if (cancelled) return

      setCurrentBalance(result.currentBalance)
      const banks = result.bankAccounts
      setBankAccounts(banks)
      setSelectedBankId(banks[0]?.id || '')
      setLoadingData(false)
    }

    setForm(DEFAULT_FORM())
    setPctInput('')
    setError('')
    setSubmitAttempted(false)
    setAttachments([])
    setUploadResults(null)
    setPaymentRecorded(false)
    void loadData()

    return () => {
      cancelled = true
    }
  }, [open, invoice?.id])

  const settlementSummary = getPaymentEntrySummary({
    balanceDue: currentBalance,
    cashReceived: form.cashReceived,
  })
  const validation = validatePaymentEntry({
    balanceDue: currentBalance,
    cashReceived: form.cashReceived,
  })
  const amountError = submitAttempted ? validation.message : ''
  const amountFieldHasError = submitAttempted && Boolean(amountError || validation.cashError)

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const syncPctFromCash = useCallback((cash: number | null) => {
    if (cash && currentBalance > 0) {
      const pct = Math.min(100, Math.max(0, Math.round((cash / currentBalance) * 10000) / 100))
      setPctInput(pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2))
    } else {
      setPctInput('')
    }
  }, [currentBalance])

  const handleCashChange = useCallback((val: number | null) => {
    setField('cashReceived', val)
    syncPctFromCash(val)
  }, [syncPctFromCash])

  const handlePctEdit = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '') {
      setPctInput('')
      return
    }
    if (!/^\d*\.?\d{0,2}$/.test(raw)) return
    setPctInput(raw)
    const val = parseFloat(raw)
    if (!isNaN(val) && currentBalance > 0) {
      const clamped = Math.min(100, Math.max(0, val))
      const cash = Math.round(currentBalance * clamped / 100 * 100) / 100
      setField('cashReceived', cash)
    }
  }, [currentBalance])

  const applyPct = useCallback((pct: number) => {
    const display = pct % 1 === 0 ? String(pct) : pct.toFixed(2)
    setPctInput(display)
    const cash = Math.round(currentBalance * pct / 100 * 100) / 100
    setField('cashReceived', cash || null)
  }, [currentBalance])

  const showValidationError = useCallback((message: string) => {
    setError(message)
    feedback.error(message)
  }, [])

  const handleSave = async () => {
    setError('')
    setSubmitAttempted(true)
    if (!form.date) return showValidationError('Payment date is required')
    if (!validation.isValid) return showValidationError(validation.message)

    setSaving(true)
    try {
      const result = await recordInvoicePayment({
        invoiceId: invoice.id,
        settlement: {
          cashReceived: settlementSummary.cashReceived,
          whtDeducted: 0,
          settlementTotal: settlementSummary.settlementTotal,
          remainingBalance: settlementSummary.remainingBalance,
        },
        date: form.date,
        method: form.method as PaymentMethod,
        reference: form.reference,
        notes: form.notes,
        bankAccountId: form.method === 'Transfer' && selectedBankId ? selectedBankId : null,
        attachments: attachments.length > 0 ? attachments : undefined,
        invoiceNumber: invoice.invoice_number,
        clientName: invoice.client_name,
      }, tenantClient)

      if (!result.success) {
        throw new Error(result.error || 'Failed to record payment')
      }

      setPaymentRecorded(true)

      if (result.uploadResults) {
        setUploadResults(result.uploadResults)
        setSaving(false)
      } else {
        onSaved()
        onClose()
      }
    } catch (err) {
      setError(getUserFacingMutationMessage(err, { action: 'record' }))
      setSaving(false)
    }
  }

  const progressPct = currentBalance > 0
    ? Math.min(100, Math.round(((currentBalance - settlementSummary.remainingBalance) / currentBalance) * 100))
    : 0

  return (
    <DocumentSheet
      open={open}
      onClose={onClose}
      title="Record Payment"
      subtitle={`Payment for ${invoice.invoice_number}`}
    >
      {loadingData ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-bd-text-muted text-sm">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading balance...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4 min-h-0">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-bd-surface-muted rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-bd-text-muted/70">Balance Due</span>
                <span className="font-mono text-xl font-bold text-bd-text">{formatNaira(currentBalance)}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-bd-text-muted/70">Cash Amount (₦)</label>
                <NumericInput
                  min={0}
                  value={form.cashReceived}
                  onChange={handleCashChange}
                  placeholder="Enter amount"
                  className={`h-10 rounded-xl border ${amountFieldHasError ? 'border-bd-status-danger-border ring-2 ring-bd-status-danger-border/20' : 'border-bd-border'} bg-bd-surface text-sm`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-bd-text-muted/70">Percentage</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pctInput}
                    onChange={handlePctEdit}
                    placeholder="0"
                    className="h-10 w-full rounded-xl border border-bd-border bg-bd-surface px-3 pr-8 text-sm text-bd-text outline-none transition-all focus:border-bd-focus-ring focus:ring-2 focus:ring-bd-focus-ring/10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-bd-text-muted">%</span>
                </div>
              </div>

              <div className="flex gap-1.5 pt-1">
                {QUICK_PCTS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyPct(pct)}
                    className="flex-1 h-9 rounded-xl border border-bd-border bg-bd-surface text-xs font-bold text-bd-text-soft transition-all hover:bg-bd-surface-muted hover:text-bd-text active:scale-[0.97]"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {submitAttempted && validation.cashError ? (
                <div className="text-xs font-semibold text-bd-status-danger-text">{validation.cashError}</div>
              ) : null}
              {amountError ? (
                <div className="bg-bd-status-danger-bg border border-bd-status-danger-border text-bd-status-danger-text px-3 py-2 rounded-xl text-xs font-semibold">{amountError}</div>
              ) : null}
            </div>

            <div className="bg-bd-surface-muted rounded-2xl p-4 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-widest text-bd-text-muted/70">Settlement Preview</div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-bd-text-muted">Cash Received</span>
                <span className="font-mono font-bold text-bd-text">{formatNaira(settlementSummary.cashReceived)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-bd-text-muted">WHT Deducted</span>
                <span className="font-mono font-bold text-bd-text-muted">₦0.00</span>
              </div>

              <div className="border-t border-bd-border/50 pt-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-bd-text">Net Settlement</span>
                <span className="font-mono font-bold text-bd-text">{formatNaira(settlementSummary.cashReceived)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-bd-text-muted">Remaining Balance</span>
                <span className={`font-mono font-bold ${settlementSummary.remainingBalance > 0 ? 'text-bd-status-danger-text' : 'text-bd-status-success-text'}`}>
                  {formatNaira(settlementSummary.remainingBalance)}
                </span>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-xs text-bd-text-muted">
                  <span>Settlement Progress</span>
                  <span className="font-semibold">{progressPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-bd-border/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-bd-status-success-text to-emerald-400 transition-all duration-200"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {invoiceHasWht ? (
                <div className="text-[11px] leading-relaxed text-bd-text-muted pt-1 border-t border-bd-border/40">
                  <strong>WHT Enabled:</strong> Verify tax credit receipt in Compliance Hub after settlement.
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-bd-surface-muted rounded-2xl p-4 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-widest text-bd-text-muted/70">Transaction Details</div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-bd-text-muted/70">Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bd-text-muted pointer-events-none" />
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setField('date', e.target.value)}
                    className="h-10 w-full rounded-xl border border-bd-border bg-bd-surface pl-9 pr-3 text-sm text-bd-text outline-none transition-all focus:border-bd-focus-ring focus:ring-2 focus:ring-bd-focus-ring/10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-bd-text-muted/70">Mode</label>
                <Select value={form.method} onValueChange={(value) => setField('method', value as PaymentMethod)}>
                  <SelectTrigger className="h-10 rounded-xl border-bd-border bg-bd-surface text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transfer">Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="POS">POS</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-bd-text-muted/70">Reference</label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => setField('reference', e.target.value)}
                  placeholder="Transaction ID / Ref"
                  className="h-10 w-full rounded-xl border border-bd-border bg-bd-surface px-3 text-sm text-bd-text outline-none transition-all focus:border-bd-focus-ring focus:ring-2 focus:ring-bd-focus-ring/10"
                />
              </div>

              {form.method === 'Transfer' && bankAccounts.length > 0 ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-bd-text-muted/70">Destination Account</label>
                  <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                    <SelectTrigger className="h-10 rounded-xl border-bd-border bg-bd-surface text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.bank_name} — {b.account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-bd-text-muted/70">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Internal notes..."
                className="h-16 w-full resize-none rounded-xl border border-bd-border bg-bd-surface px-3 py-2.5 text-sm text-bd-text outline-none transition-all focus:border-bd-focus-ring focus:ring-2 focus:ring-bd-focus-ring/10"
              />
            </div>
          </div>

          <div className="bg-bd-surface-muted rounded-2xl p-4 space-y-3">
            <PaymentAttachmentUploader
              files={attachments}
              onFilesChanged={setAttachments}
            />
            {uploadResults ? (
              <div className="space-y-1.5">
                {uploadResults.map((r) => {
                  const failed = r.uploadStatus === "uploaded" ? "Uploaded" : `Failed: ${r.error || ""}`
                  return (
                    <div key={r.id} className={`flex items-center gap-2 text-xs ${r.uploadStatus === "uploaded" ? "text-bd-status-success-text" : "text-bd-status-danger-text"}`}>
                      <Check size={12} className="shrink-0" />
                      <span className="font-semibold">{r.fileName}</span>
                      <span className="text-bd-text-muted">—</span>
                      <span>{failed}</span>
                    </div>
                  )
                })}
                {uploadResults.some(r => r.uploadStatus !== "uploaded") ? (
                  <div className="mt-1 bg-bd-status-danger-bg border border-bd-status-danger-border rounded-xl px-3 py-2 text-[11px] text-bd-status-danger-text">
                    {uploadResults.filter(r => r.uploadStatus !== "uploaded").map(r => r.error).join("; ")}
                  </div>
                ) : null}
                <div className="pt-1 text-xs text-bd-text-muted border-t border-bd-border/40">
                  Payment recorded. You can close this sheet.
                </div>
              </div>
            ) : paymentRecorded ? (
              <div className="flex items-center gap-2 text-xs text-bd-status-success-text">
                <CircleCheck size={14} />
                Payment recorded successfully
              </div>
            ) : null}
          </div>

          <div className="flex-shrink-0 space-y-3 pt-2 border-t border-bd-border/60">
            {error ? (
              <div className="bg-bd-status-danger-bg border border-bd-status-danger-border text-bd-status-danger-text px-4 py-2.5 rounded-xl text-sm font-medium">
                {error}
              </div>
            ) : null}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 h-12 rounded-2xl border border-bd-border bg-bd-surface-muted text-sm font-bold text-bd-text-soft transition-all hover:bg-bd-surface hover:text-bd-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || paymentRecorded}
                className="flex-[2] h-12 rounded-2xl bg-bd-button-primary-bg text-sm font-bold text-bd-button-primary-text flex items-center justify-center gap-2 transition-all hover:bg-bd-button-primary-hover-bg disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-bd-button-primary-bg/20"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : paymentRecorded ? <Check size={18} /> : <Banknote size={18} />}
                {saving ? 'Recording payment...' : paymentRecorded ? 'Done' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DocumentSheet>
  )
}
