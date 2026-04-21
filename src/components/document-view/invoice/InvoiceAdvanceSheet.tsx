import React, { useState } from 'react'
import { Zap, Loader2, Save, Percent } from 'lucide-react'
import { supabase } from '@/supabase'
import DocumentSheet from '../shared/DocumentSheet'
import styles from './InvoiceRecordPaymentSheet.module.css' // Reusing styles for consistency
import { formatNaira } from '@/lib/formatters/money'

interface InvoiceAdvanceSheetProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  invoice: any
}

export default function InvoiceAdvanceSheet({
  open,
  onClose,
  onSaved,
  invoice,
}: InvoiceAdvanceSheetProps) {
  const initialAdvanceData = typeof invoice?.custom_fields === 'string' 
    ? JSON.parse(invoice.custom_fields || '{}')?.advance_invoice 
    : invoice?.custom_fields?.advance_invoice

  const [isAdvance, setIsAdvance] = useState(Boolean(initialAdvanceData?.enabled))
  const [percentage, setPercentage] = useState(String(initialAdvanceData?.value || '0'))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const currentCustomFields = typeof invoice?.custom_fields === 'string'
        ? JSON.parse(invoice.custom_fields || '{}')
        : (invoice?.custom_fields || {})

      const nextCustomFields = {
        ...currentCustomFields,
        advance_invoice: {
          ...(currentCustomFields.advance_invoice || {}),
          enabled: isAdvance,
          mode: 'percent',
          value: Number(percentage) || 0,
        }
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          custom_fields: nextCustomFields
        })
        .eq('id', invoice.id)

      if (updateError) throw updateError

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update advance settings')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <DocumentSheet
      open={open}
      onClose={onClose}
      title="Advance Invoice Settings"
      subtitle={`Configure advance payment for ${invoice.invoice_number}`}
    >
      <div className={styles.container}>
        <div className={styles.formContent}>
          <div className={styles.fieldGroup}>
            <label className={styles.formLabel}>Status</label>
            <div className={styles.typeToggle}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${!isAdvance ? styles.active : ''}`}
                onClick={() => setIsAdvance(false)}
              >
                Standard Invoice
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${isAdvance ? styles.active : ''}`}
                onClick={() => setIsAdvance(true)}
              >
                Advance Invoice
              </button>
            </div>
          </div>

          {isAdvance && (
            <div className={styles.fieldGroup}>
              <label className={styles.formLabel}>Advance Percentage (%)</label>
              <div className={styles.inputIconWrap}>
                <Percent size={14} className={styles.innerIcon} />
                <input
                  type="number"
                  className={`${styles.formInput} ${styles.hasIcon}`}
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder="e.g. 50"
                  min="0"
                  max="100"
                />
              </div>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                This specifies how much of the total is requested as an advance.
              </p>
            </div>
          )}

          <div className={styles.summaryCard} style={{ background: '#f0f9ff' }}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel} style={{ color: '#0369a1' }}>Calculated Advance</span>
              <span className={styles.summaryValue} style={{ color: '#0c4a6e' }}>
                {formatNaira((Number(invoice.total || 0) * (Number(percentage) || 0)) / 100)}
              </span>
            </div>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.footerActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.btnSave}
              style={{ background: '#0369a1' }}
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </DocumentSheet>
  )
}
