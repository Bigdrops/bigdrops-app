import { useState } from 'react'
import styles from './InvoicePresentation.module.css'

interface InvoiceAdvanceSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  totalAmount: number
  onClose: () => void
  onSave: () => void
}

export default function InvoiceAdvanceSheet({
  open,
  mode,
  totalAmount,
  onClose,
  onSave, // Keep using onSave instead of directly mutating state to respect the previous logic mock
}: InvoiceAdvanceSheetProps) {
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage')
  const [percentage, setPercentage] = useState(30)
  const [fixedAmount, setFixedAmount] = useState(800000)

  if (!open) return null

  const computedAmount = type === 'percentage' ? (totalAmount * percentage) / 100 : fixedAmount
  const desc = type === 'percentage' ? `${percentage}% of ₦4,720,000` : 'Fixed amount'

  return (
    <>
      <div className={`${styles.overlay} ${styles.open}`} onClick={onClose} />
      <div className={`${styles.sheet} ${styles.open}`}>
        <div className={styles['sheet-handle']} />
        <div className={styles['sheet-title']}>
          {mode === 'edit' ? 'Edit Advance Invoice' : 'Create Advance Invoice'}
        </div>
        <div className={styles['sheet-sub']}>
          Based on SASINV-B047 · Total: ₦4,720,000
        </div>
        <div className={styles['sheet-body']}>
          <div className={styles['form-group']}>
            <label className={styles['form-label']}>Invoice Label</label>
            <input className={styles['form-input']} type="text" placeholder="e.g. Mobilisation Advance" />
          </div>
          <div className={styles['form-group']}>
            <label className={styles['form-label']}>Amount Type</label>
            <div className={styles['advance-type-grid']}>
              <div
                className={`${styles['advance-type-opt']} ${type === 'percentage' ? styles.active : ''}`}
                onClick={() => setType('percentage')}
              >
                <div className={styles['advance-type-opt-label']}>Percentage</div>
                <div className={styles['advance-type-opt-sub']}>% of total</div>
              </div>
              <div
                className={`${styles['advance-type-opt']} ${type === 'fixed' ? styles.active : ''}`}
                onClick={() => setType('fixed')}
              >
                <div className={styles['advance-type-opt-label']}>Fixed Amount</div>
                <div className={styles['advance-type-opt-sub']}>Exact ₦ value</div>
              </div>
            </div>
          </div>
          {type === 'percentage' && (
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>Percentage (%)</label>
              <input
                className={styles['form-input']}
                type="number"
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
              />
            </div>
          )}
          {type === 'fixed' && (
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>Fixed Amount (₦)</label>
              <input
                className={styles['form-input']}
                type="number"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(Number(e.target.value))}
              />
            </div>
          )}
          <div
            className={styles['form-group']}
            style={{
              background: 'var(--primary-bg)',
              border: '1px solid var(--primary-border)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--primary)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Computed Amount
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--primary)',
              }}
            >
              ₦{computedAmount.toLocaleString('en-NG')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
              {desc}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 12, marginTop: 4 }}>
            <button
              type="button"
              className={`${styles.btn} ${styles['btn-outline']}`}
              style={{ flex: 1, height: 42, justifyContent: 'center', fontSize: 14 }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles['btn-amber']}`}
              style={{ flex: 2, height: 42, justifyContent: 'center', fontSize: 14 }}
              onClick={() => {
                onSave()
                onClose()
              }}
            >
              {mode === 'edit' ? 'Save Changes' : 'Generate Invoice'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
