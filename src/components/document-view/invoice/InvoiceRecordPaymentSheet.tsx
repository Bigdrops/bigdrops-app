import { useState, useEffect, useCallback } from 'react'
import { Loader2, Banknote, Calendar } from 'lucide-react'
import DocumentSheet from '../shared/DocumentSheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import styles from './InvoiceRecordPaymentSheet.module.css'
import { formatNaira } from '@/lib/formatters/money'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { NumericInput } from '@/components/ui/numeric-input'
import { feedback } from '@/lib/feedback'
import {
  getPaymentEntrySummary,
  validatePaymentEntry,
} from '@/components/invoice/paymentEntryHelpers'
import { loadBankAccountsList, calculatePreviousSettled, recordInvoicePayment } from '@/modules/invoices/services/paymentService'
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

export default function InvoiceRecordPaymentSheet({
  open,
  onClose,
  onSaved,
  invoice,
}: InvoiceRecordPaymentSheetProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [previousSettled, setPreviousSettled] = useState(0)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedBankId, setSelectedBankId] = useState('')
  const [loadingData, setLoadingData] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const invoiceHasWht = Number(invoice?.wht || 0) > 0

  useEffect(() => {
    if (!open || !invoice?.id) return

    let cancelled = false
    const loadData = async () => {
      setLoadingData(true)
      const [previousSettledValue, bankAccountsData] = await Promise.all([
        calculatePreviousSettled(invoice.id),
        loadBankAccountsList(),
      ])

      if (cancelled) return

      setPreviousSettled(previousSettledValue)
      const banks = bankAccountsData as BankAccount[]
      setBankAccounts(banks)
      setSelectedBankId(banks[0]?.id || '')
      setLoadingData(false)
    }

    setForm(DEFAULT_FORM())
    setError('')
    setSubmitAttempted(false)
    void loadData()

    return () => {
      cancelled = true
    }
  }, [open, invoice?.id])

  const currentBalance = Math.max(0, Number(invoice?.total || 0) - previousSettled)
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

  const applyMax = useCallback(() => {
    setForm((current) => ({ ...current, cashReceived: Math.round(currentBalance * 100) / 100 }))
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
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to record payment')
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(getUserFacingMutationMessage(err, { action: 'record' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DocumentSheet
      open={open}
      onClose={onClose}
      title="Record Payment"
      subtitle={`Payment for ${invoice.invoice_number}`}
    >
      <div className={styles.container}>
        {loadingData ? (
          <div className={styles.loadingArea}>
            <Loader2 className="animate-spin" size={24} />
            <span>Loading balance...</span>
          </div>
        ) : (
          <div className={styles.formContent}>
            <div className={styles.scrollRegion}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Balance Due</span>
                  <span className={styles.summaryValue}>{formatNaira(currentBalance)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Client</span>
                  <span className={styles.summaryValueSub}>{invoice.client_name || 'N/A'}</span>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.formLabel}>Cash Received (₦)</label>
                <NumericInput
                  min={0}
                  className={`${styles.formInput} ${amountFieldHasError ? styles.formInputError : ''}`}
                  value={form.cashReceived}
                  onChange={(val) => setField('cashReceived', val)}
                  placeholder="Enter amount"
                />
                <button type="button" className={styles.payFullPill} onClick={applyMax}>
                  Pay Full Balance ({formatNaira(currentBalance)})
                </button>
                {submitAttempted && validation.cashError ? (
                  <div className={styles.fieldError}>{validation.cashError}</div>
                ) : null}
                {amountError ? (
                  <div className={styles.inlineErrorBox}>{amountError}</div>
                ) : null}
              </div>

              <div className={styles.grid2}>
                <div className={styles.fieldGroup}>
                  <label className={styles.formLabel}>Date</label>
                  <div className={styles.inputIconWrap}>
                    <Calendar size={14} className={styles.innerIcon} />
                    <input
                      type="date"
                      className={`${styles.formInput} ${styles.hasIcon}`}
                      value={form.date}
                      onChange={(e) => setField('date', e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.formLabel}>Mode</label>
                  <Select value={form.method} onValueChange={(value) => setField('method', value as PaymentMethod)}>
                    <SelectTrigger className={styles.formSelect}>
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

              {form.method === 'Transfer' && bankAccounts.length > 0 && (
                <div className={styles.fieldGroup}>
                  <label className={styles.formLabel}>Destination Account</label>
                  <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                    <SelectTrigger className={styles.formSelect}>
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
              )}

              <div className={styles.fieldGroup}>
                <label className={styles.formLabel}>Reference</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={form.reference}
                  onChange={(e) => setField('reference', e.target.value)}
                  placeholder="Transaction ID / Ref"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.formLabel}>Notes</label>
                <textarea
                  className={styles.formTextarea}
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder="Internal notes..."
                />
              </div>

              <div className={styles.settlementCard}>
                <div className={styles.settleRow}>
                  <span>Cash Received</span>
                  <span className={styles.settleAmount}>{formatNaira(settlementSummary.cashReceived)}</span>
                </div>
                <div className={styles.settleRow}>
                  <span>Remaining Balance</span>
                  <span
                    className={settlementSummary.remainingBalance > 0 ? styles.settleRem : styles.settlePaid}
                  >
                    {formatNaira(settlementSummary.remainingBalance)}
                  </span>
                </div>
              </div>

              {invoiceHasWht ? (
                <div className={styles.helperText}>
                  💡 <strong>WHT Tracking Enabled:</strong>{' '}
                  This invoice contains configured WHT. Verify and track the tax credit receipt within the Compliance Hub once this settlement is completed.
                </div>
              ) : null}
            </div>

            <div className={styles.dockedFooter}>
              {error ? <div className={styles.errorBanner}>{error}</div> : null}
              <div className={styles.footerActions}>
                <button type="button" className={styles.btnCancel} onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.btnSave}
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Banknote size={18} />}
                  {saving ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DocumentSheet>
  )
}
