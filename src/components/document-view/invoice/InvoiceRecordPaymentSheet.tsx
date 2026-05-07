import { useState, useEffect, useCallback } from 'react'
import { Loader2, Banknote, Calendar } from 'lucide-react'
import { supabase } from '@/supabase'
import DocumentSheet from '../shared/DocumentSheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import styles from './InvoiceRecordPaymentSheet.module.css'
import { formatNaira } from '@/lib/formatters/money'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { NumericInput } from '@/components/ui/numeric-input'
import { feedback } from '@/lib/feedback'
import {
  buildFullPaymentPreset,
  getPaymentEntrySummary,
  validatePaymentEntry,
} from '@/components/invoice/paymentEntryHelpers'

interface InvoiceSummary {
  id: string
  invoice_number: string
  client_name?: string
  total: number
}

interface BankAccount {
  id: string
  bank_name?: string | null
  account_number?: string | null
  is_default?: boolean | null
}

interface InvoiceRecordPaymentSheetProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  invoice: InvoiceSummary
}

type PaymentMethod = 'Transfer' | 'Cash' | 'POS' | 'Cheque' | 'Other'
type PaymentType = 'full' | 'partial'

interface FormState {
  cashReceived: number | null
  whtDeducted: number | null
  date: string
  method: PaymentMethod
  reference: string
  notes: string
  type: PaymentType
}

const DEFAULT_FORM = (): FormState => ({
  cashReceived: null,
  whtDeducted: 0,
  date: new Date().toISOString().split('T')[0] || '',
  method: 'Transfer',
  reference: '',
  notes: '',
  type: 'full',
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

  useEffect(() => {
    if (!open || !invoice?.id) return

    let cancelled = false
    const loadData = async () => {
      setLoadingData(true)
      const [{ data: paymentData, error: paymentError }, { data: bankData, error: bankError }] = await Promise.all([
        supabase
          .from('payments')
          .select('cash_amount,wht_amount')
          .eq('invoice_id', invoice.id)
          .is('voided_at', null),
        supabase
          .from('bank_accounts')
          .select('*')
          .order('is_default', { ascending: false }),
      ])

      if (cancelled) return

      if (paymentError) {
        setError(paymentError.message)
      } else {
        const total = (paymentData || []).reduce(
          (sum, row) => sum + Number(row.cash_amount || 0) + Number(row.wht_amount || 0),
          0
        )
        setPreviousSettled(total)
      }

      if (bankError) {
        setError((curr) => curr || bankError.message)
      } else {
        const banks = (bankData || []) as BankAccount[]
        setBankAccounts(banks)
        setSelectedBankId(banks[0]?.id || '')
      }
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
    whtDeducted: form.whtDeducted,
  })
  const validation = validatePaymentEntry({
    balanceDue: currentBalance,
    cashReceived: form.cashReceived,
    whtDeducted: form.whtDeducted,
  })
  const amountError = submitAttempted ? validation.message : ''
  const amountFieldHasError = submitAttempted && Boolean(amountError || validation.cashError || validation.whtError)

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!open || loadingData) return
    setForm((current) => {
      if (current.type !== 'full') return current
      if (current.cashReceived !== null) return current
      return {
        ...current,
        ...buildFullPaymentPreset(currentBalance, current.whtDeducted || 0),
      }
    })
  }, [currentBalance, loadingData, open])

  const applyFullPaymentPreset = useCallback(() => {
    setForm((current) => ({
      ...current,
      type: 'full',
      ...buildFullPaymentPreset(currentBalance, current.whtDeducted || 0),
    }))
  }, [currentBalance])

  const applyPartialPaymentPreset = useCallback(() => {
    setForm((current) => ({
      ...current,
      type: 'partial',
      cashReceived: current.cashReceived ?? null,
      whtDeducted: current.whtDeducted ?? 0,
    }))
  }, [])

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
      const { data: previousInvoice } = await supabase.from('invoices').select('*').eq('id', invoice.id).single()

      const payload = {
        invoice_id: invoice.id,
        cash_amount: settlementSummary.cashReceived,
        wht_amount: settlementSummary.whtDeducted,
        amount: settlementSummary.settlementTotal,
        date: form.date,
        method: form.method,
        reference: form.reference || null,
        notes: form.notes || null,
        source: 'live',
        bank_account_id: form.method === 'Transfer' && selectedBankId ? selectedBankId : null,
      }

      const { data: paymentRow, error: insertError } = await supabase.from('payments').insert(payload).select().single()
      if (insertError) throw insertError

      // Audit Trail
      try {
        const { recordPaymentRecorded, recordAuditLog, INVOICE_TRACKED_FIELDS } = await import('@/lib/audit')
        if (paymentRow) {
          await recordPaymentRecorded(invoice.id, paymentRow.amount, form.notes.trim() || null)
        }
        const { data: updatedInvoice } = await supabase.from('invoices').select('*').eq('id', invoice.id).single()
        await recordAuditLog({
          entityType: 'invoice',
          recordId: invoice.id,
          entityLabel: updatedInvoice?.invoice_number || invoice.invoice_number,
          action: 'UPDATE',
          oldData: previousInvoice,
          newData: updatedInvoice,
          trackedFields: INVOICE_TRACKED_FIELDS,
          reason: form.notes.trim() || null,
        })
      } catch (auditErr) {
        console.error('Audit trail failed:', auditErr)
      }

      // Refresh status via financials view if needed, but for now we'll just signal refresh
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
              <label className={styles.formLabel}>Payment Type</label>
              <div className={styles.typeToggle}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${form.type === 'full' ? styles.active : ''}`}
                  onClick={applyFullPaymentPreset}
                >
                  Full Payment
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${form.type === 'partial' ? styles.active : ''}`}
                  onClick={applyPartialPaymentPreset}
                >
                  Partial
                </button>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.amountHeader}>
                <label className={styles.formLabel}>Settlement Details</label>
                <button type="button" className={styles.inlineAction} onClick={applyFullPaymentPreset}>
                  Use balance as cash
                </button>
              </div>
              <div className={styles.helperText}>
                Settlement = Cash received + WHT deducted.
                {form.type === 'full' ? ' Full payment should match the remaining balance.' : ''}
              </div>
              <div className={styles.amountGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.formLabel}>Cash Received (₦)</label>
                  <NumericInput
                    min={0}
                    className={`${styles.formInput} ${amountFieldHasError ? styles.formInputError : ''}`}
                    value={form.cashReceived}
                    onChange={(val) => setField('cashReceived', val)}
                    placeholder="0.00"
                  />
                  {submitAttempted && validation.cashError ? (
                    <div className={styles.fieldError}>{validation.cashError}</div>
                  ) : null}
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.formLabel}>WHT Deducted (₦)</label>
                  <NumericInput
                    min={0}
                    className={`${styles.formInput} ${amountFieldHasError ? styles.formInputError : ''}`}
                    value={form.whtDeducted}
                    onChange={(val) => setField('whtDeducted', val)}
                    placeholder="0.00"
                  />
                  {submitAttempted && validation.whtError ? (
                    <div className={styles.fieldError}>{validation.whtError}</div>
                  ) : null}
                </div>
              </div>
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

            <div className={styles.footerPanel}>
              <div className={styles.settlementCard}>
                <div className={styles.settleRow}>
                  <span>Cash Received</span>
                  <span className={styles.settleAmount}>{formatNaira(settlementSummary.cashReceived)}</span>
                </div>
                <div className={styles.settleRow}>
                  <span>WHT Deducted</span>
                  <span className={styles.settleAmount}>{formatNaira(settlementSummary.whtDeducted)}</span>
                </div>
                <div className={styles.settleRow}>
                  <span>Total Settlement</span>
                  <span className={styles.settleAmount}>{formatNaira(settlementSummary.settlementTotal)}</span>
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
