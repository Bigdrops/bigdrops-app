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
  const { tenantClient, entity } = useEntity()
  const entityId = entity?.id ?? null

  // Form state — reset immediately when sheet opens (before animation).
  // The loading spinner gates user interaction until data is ready.
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

  // Reset form state immediately when sheet opens.
  // No artificial delay — the loading spinner provides the visual buffer.
  useEffect(() => {
    if (!open || !invoice?.id) return

    setForm(DEFAULT_FORM())
    setPctInput('')
    setError('')
    setSubmitAttempted(false)
    setAttachments([])
    setUploadResults(null)
    setPaymentRecorded(false)

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
    void loadData()
    return () => { cancelled = true }
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
        entityId,
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
        <div className="flex flex-col gap-3 min-h-0">
          {/* Amount Section (highest priority) */}
          <div className="rounded-xl border border-bd-border bg-bd-surface p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-bd-text-muted/70">Balance Due</span>
              <span className="font-mono text-lg font-bold text-bd-text">{formatNaira(currentBalance)}</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-bd-text-muted/70">Cash Amount (N)</label>
              <NumericInput
                min={0}
                value={form.cashReceived}
                onChange={handleCashChange}
                placeholder="Enter amount"
                className={`h-11 rounded-lg border text-base font-semibold ${amountFieldHasError ? 'border-bd-status-danger-border ring-2 ring-bd-status-danger-border/20' : 'border-bd-border'} bg-bd-surface px-3`}
              />
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                inputMode="decimal"
                value={pctInput}
                onChange={handlePctEdit}
                placeholder="%"
                className="h-9 w-16 rounded-lg border border-bd-border bg-bd-surface px-2 text-xs text-center font-semibold outline-none focus:border-bd-focus-ring"
              />
              {QUICK_PCTS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyPct(pct)}
                  className="flex-1 h-9 rounded-lg border border-bd-border bg-bd-surface text-xs font-bold text-bd-text-soft transition-all active:scale-[0.97]"
                >
                  {pct}%
                </button>
              ))}
            </div>

            {submitAttempted && validation.cashError ? (
              <div className="text-xs font-semibold text-bd-status-danger-text">{validation.cashError}</div>
            ) : null}
            {amountError ? (
              <div className="bg-bd-status-danger-bg border border-bd-status-danger-border text-bd-status-danger-text px-2.5 py-1.5 rounded-lg text-xs font-semibold">{amountError}</div>
            ) : null}
          </div>

          {/* Settlement Preview (compact) */}
          <div className="rounded-xl border border-bd-border/50 bg-bd-surface-muted/50 px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-bd-text-muted">Settlement</span>
              <span className="font-mono font-bold text-bd-text">{formatNaira(settlementSummary.cashReceived)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-bd-text-muted">Remaining</span>
              <span className={`font-mono font-bold ${settlementSummary.remainingBalance > 0 ? 'text-bd-status-danger-text' : 'text-bd-status-success-text'}`}>
                {formatNaira(settlementSummary.remainingBalance)}
              </span>
            </div>
            <div className="h-1 rounded-full bg-bd-border/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-bd-status-success-text/80 transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Transaction Details (compact grid) */}
          <div className="rounded-xl border border-bd-border bg-bd-surface p-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-bd-text-muted/70">Date</label>
                <div className="relative">
                  <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-bd-text-muted pointer-events-none" />
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setField('date', e.target.value)}
                    className="h-9 w-full rounded-lg border border-bd-border bg-bd-surface pl-8 pr-2 text-xs outline-none focus:border-bd-focus-ring"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-bd-text-muted/70">Mode</label>
                <Select value={form.method} onValueChange={(value) => setField('method', value as PaymentMethod)}>
                  <SelectTrigger className="h-9 rounded-lg border-bd-border bg-bd-surface text-xs">
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
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-bd-text-muted/70">Reference</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setField('reference', e.target.value)}
                placeholder="Transaction ID / Ref"
                className="h-9 w-full rounded-lg border border-bd-border bg-bd-surface px-2.5 text-xs outline-none focus:border-bd-focus-ring"
              />
            </div>

            {form.method === 'Transfer' && bankAccounts.length > 0 ? (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-bd-text-muted/70">Destination Account</label>
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger className="h-9 rounded-lg border-bd-border bg-bd-surface text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.bank_name} - {b.account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-bd-text-muted/70">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                className="w-full resize-none rounded-lg border border-bd-border bg-bd-surface px-2.5 py-2 text-xs outline-none focus:border-bd-focus-ring"
              />
            </div>
          </div>

          {/* Attachments (compact) */}
          <div className="rounded-xl border border-bd-border bg-bd-surface p-3 space-y-2">
            <PaymentAttachmentUploader
              files={attachments}
              onFilesChanged={setAttachments}
            />
            {uploadResults ? (
              <div className="space-y-1">
                {uploadResults.map((r) => {
                  const status = r.uploadStatus === 'uploaded' ? 'Uploaded' : `Failed: ${r.error || ''}`
                  return (
                    <div key={r.id} className={`flex items-center gap-1.5 text-[11px] ${r.uploadStatus === 'uploaded' ? 'text-bd-status-success-text' : 'text-bd-status-danger-text'}`}>
                      <Check size={10} className="shrink-0" />
                      <span className="font-semibold">{r.fileName}</span>
                      <span className="text-bd-text-muted">-</span>
                      <span>{status}</span>
                    </div>
                  )
                })}
                <div className="text-[11px] text-bd-text-muted border-t border-bd-border/40 pt-1.5">
                  Payment recorded. You can close this sheet.
                </div>
              </div>
            ) : paymentRecorded ? (
              <div className="flex items-center gap-1.5 text-[11px] text-bd-status-success-text">
                <CircleCheck size={12} />
                Payment recorded successfully
              </div>
            ) : null}
          </div>

          {/* Submit Actions */}
          <div className="flex-shrink-0 space-y-2 pt-1 border-t border-bd-border/60">
            {error ? (
              <div className="bg-bd-status-danger-bg border border-bd-status-danger-border text-bd-status-danger-text px-3 py-2 rounded-lg text-xs font-medium">
                {error}
              </div>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 h-11 rounded-xl border border-bd-border bg-bd-surface-muted text-xs font-bold text-bd-text-soft transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || paymentRecorded}
                className="flex-[2] h-11 rounded-xl bg-bd-button-primary-bg text-xs font-bold text-bd-button-primary-text flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : paymentRecorded ? <Check size={16} /> : <Banknote size={16} />}
                {saving ? 'Recording...' : paymentRecorded ? 'Done' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DocumentSheet>
  )
}
