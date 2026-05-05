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
  amount: number | null
  date: string
  method: PaymentMethod
  reference: string
  notes: string
  type: PaymentType
}

const DEFAULT_FORM = (): FormState => ({
  amount: null,
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
    void loadData()

    return () => {
      cancelled = true
    }
  }, [open, invoice?.id])

  const currentBalance = Math.max(0, Number(invoice?.total || 0) - previousSettled)
  const amountPaid = form.type === 'full' ? currentBalance : Number(form.amount || 0)
  const remainingBalance = Math.max(0, currentBalance - amountPaid)
  const amountExceedsBalance = form.type === 'partial' && amountPaid > currentBalance + 0.01
  const amountError = amountExceedsBalance ? 'Amount cannot exceed balance' : ''

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const showValidationError = useCallback((message: string) => {
    setError(message)
    feedback.error(message)
  }, [])

  const handleSave = async () => {
    setError('')
    if (!form.date) return setError('Payment date is required')
    if (amountPaid <= 0) return setError('Amount must be greater than 0')
    if (amountPaid > currentBalance + 0.01) return showValidationError('Amount cannot exceed balance')

    setSaving(true)
    try {
      const { data: previousInvoice } = await supabase.from('invoices').select('*').eq('id', invoice.id).single()

      const payload = {
        invoice_id: invoice.id,
        cash_amount: amountPaid,
        wht_amount: 0,
        amount: amountPaid,
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
                  onClick={() => setField('type', 'full')}
                >
                  Full Payment
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${form.type === 'partial' ? styles.active : ''}`}
                  onClick={() => setField('type', 'partial')}
                >
                  Partial
                </button>
              </div>
            </div>

            {form.type === 'partial' && (
              <div className={styles.fieldGroup}>
                <label className={styles.formLabel}>Amount (₦)</label>
                <NumericInput
                  className={`${styles.formInput} ${amountError ? styles.formInputError : ''}`}
                  value={form.amount}
                  onChange={(val) => setField('amount', val)}
                  placeholder="0.00"
                />
                {amountError ? <div className={styles.fieldError}>{amountError}</div> : null}
              </div>
            )}

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
                  <span>Amount to Record</span>
                  <span className={styles.settleAmount}>{formatNaira(amountPaid)}</span>
                </div>
                <div className={styles.settleRow}>
                  <span>New Balance</span>
                  <span className={remainingBalance > 0 ? styles.settleRem : styles.settlePaid}>
                    {formatNaira(remainingBalance)}
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
