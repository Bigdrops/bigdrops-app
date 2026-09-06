import { useState, useEffect, useCallback } from 'react'
import { Loader2, Banknote, Check, CircleCheck, Paperclip, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PaymentAttachmentUploader } from '@/components/ui/PaymentAttachmentUploader'
import type { PaymentAttachment } from '@/lib/attachmentTypes'
import DocumentSheet from '../shared/DocumentSheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatNaira } from '@/lib/formatters/money'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
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
  const [attachOpen, setAttachOpen] = useState(false)

  useEffect(() => {
    if (!open || !invoice?.id) return

    setForm(DEFAULT_FORM())
    setError('')
    setSubmitAttempted(false)
    setAttachments([])
    setUploadResults(null)
    setPaymentRecorded(false)
    setAttachOpen(false)

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

  const handleCashChange = useCallback((val: number | null) => {
    setField('cashReceived', val)
  }, [])

  const applyPct = useCallback((pct: number) => {
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

  const cashAmount = form.cashReceived ?? 0
  const remaining = Math.max(0, currentBalance - cashAmount)
  const progressPct = currentBalance > 0
    ? Math.min(100, Math.round((cashAmount / currentBalance) * 100))
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
          {/* Amount — chromeless block matching the reference composition.
              Balance row, hero input, chips, settlement strip, progress. */}
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between text-xs text-bd-text-muted">
              <span>Balance due</span>
              <span className="font-mono font-bold text-bd-text">{formatNaira(currentBalance)}</span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-semibold text-bd-text-muted/50 pointer-events-none">
                ₦
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={form.cashReceived != null ? form.cashReceived.toLocaleString('en-NG') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '')
                  const num = raw ? Number(raw) : null
                  handleCashChange(num)
                }}
                placeholder="0"
                aria-label="Payment amount"
                className={`h-[52px] w-full rounded-xl border-[1.5px] bg-bd-surface text-center text-[26px] font-bold font-mono text-bd-text outline-none transition-all
                  ${amountFieldHasError
                    ? 'border-bd-status-danger-border ring-2 ring-bd-status-danger-border/20'
                    : 'border-bd-border focus:border-bd-focus-ring focus:ring-2 focus:ring-bd-focus-ring/10'
                  }`}
              />
            </div>

            {/* Quick picks */}
            <div className="flex gap-1.5">
              {QUICK_PCTS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyPct(pct)}
                  className={`h-9 flex-1 rounded-[10px] border text-[13px] font-semibold transition-all active:scale-[0.95]
                    ${form.cashReceived != null && form.cashReceived === Math.round(currentBalance * pct / 100)
                      ? 'border-bd-focus-ring/25 bg-bd-focus-ring/8 text-bd-focus-ring'
                      : 'border-bd-border bg-bd-surface text-bd-text-soft'
                    }`}
                >
                  {pct === 100 ? 'Full' : `${pct}%`}
                </button>
              ))}
            </div>

            {/* Settlement inline */}
            <div className="flex items-center justify-center gap-4 h-10 rounded-xl bg-bd-surface-muted/50 px-4 text-[13px]">
              <span className="text-bd-text-soft">
                Paid <span className="font-mono font-semibold text-bd-text">{formatNaira(cashAmount)}</span>
              </span>
              <span className="w-[3px] h-[3px] rounded-full bg-bd-text-muted/40" />
              <span className="text-bd-text-soft">
                Left{' '}
                <span className={`font-mono font-semibold ${remaining === 0 ? 'text-bd-status-success-text' : 'text-bd-text'}`}>
                  {formatNaira(remaining)}
                </span>
              </span>
            </div>
            <div className="h-[3px] rounded-full bg-bd-border/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-bd-status-success-text/80 transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Details grid — no card wrapper */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-bd-text-muted/60">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setField('date', e.target.value)}
                className="h-9 w-full rounded-lg border border-bd-border bg-bd-surface px-2.5 text-xs outline-none focus:border-bd-focus-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-bd-text-muted/60">Method</label>
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

            {form.method === 'Transfer' && bankAccounts.length > 0 ? (
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-bd-text-muted/60">Destination Account</label>
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

            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-bd-text-muted/60">Reference</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setField('reference', e.target.value)}
                placeholder="Transaction ID"
                className="h-9 w-full rounded-lg border border-bd-border bg-bd-surface px-2.5 text-xs outline-none focus:border-bd-focus-ring"
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-bd-text-muted/60">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Optional"
                className="h-11 w-full resize-none rounded-lg border border-bd-border bg-bd-surface px-2.5 py-2 text-xs outline-none focus:border-bd-focus-ring"
              />
            </div>
          </div>

          {/* Attach receipt — chromeless trigger row + inline expander.
              Only expanding grows the sheet. */}
          <div>
            <button
              type="button"
              onClick={() => setAttachOpen((current) => !current)}
              aria-expanded={attachOpen}
              className="flex h-10 w-full items-center gap-2 px-1 text-[13px] font-semibold text-bd-text transition-transform active:scale-[0.99]"
            >
              <Paperclip size={16} className="shrink-0 text-bd-text-muted" />
              <span className="flex-1 text-left">
                Attach receipt
                {attachments.length > 0 ? (
                  <span className="ml-1.5 rounded-full bg-bd-surface-muted px-1.5 py-0.5 text-[11px] font-bold text-bd-text-soft">
                    {attachments.length}
                  </span>
                ) : null}
              </span>
              <ChevronDown
                size={16}
                className={cn('shrink-0 text-bd-text-muted transition-transform', attachOpen && 'rotate-180')}
              />
            </button>
            {attachOpen ? (
              <div className="pt-1">
                <PaymentAttachmentUploader
                  files={attachments}
                  onFilesChanged={setAttachments}
                  hideHeading
                />
              </div>
            ) : null}
          </div>
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

          {/* Error */}
          {error ? (
            <div className="bg-bd-status-danger-bg border border-bd-status-danger-border text-bd-status-danger-text px-3 py-2 rounded-lg text-xs font-medium">
              {error}
            </div>
          ) : null}

          {/* Success flash */}
          {paymentRecorded && !uploadResults ? (
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-bd-status-success-text">
              <Check size={14} />
              Payment recorded
            </div>
          ) : null}

          {/* Action area — single compact row at HIG minimum height */}
          <div className="flex gap-2 border-t border-bd-border/60 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-11 rounded-2xl text-[15px] text-bd-text-soft font-semibold transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || paymentRecorded}
              className={`flex-[1.7] h-11 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                ${paymentRecorded
                  ? 'bg-bd-status-success-text text-white shadow-[0_4px_16px_rgba(52,199,89,0.25)]'
                  : 'bg-bd-button-primary-bg text-bd-button-primary-text shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                }`}
            >
              {saving ? (
                <><Loader2 className="animate-spin" size={18} /> Recording...</>
              ) : paymentRecorded ? (
                <><Check size={18} /> Done</>
              ) : (
                <><Banknote size={18} /> Record Payment</>
              )}
            </button>
          </div>
        </div>
      )}
    </DocumentSheet>
  )
}
