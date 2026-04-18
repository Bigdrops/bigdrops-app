import { useState, useEffect } from 'react'

import DocumentSheet from '../shared/DocumentSheet'
import styles from './InvoiceRecordPaymentSheet.module.css'
import advanceStyles from './InvoiceAdvanceSheet.module.css'

export interface AdvanceInvoiceDraft {
  label: string
  type: 'percentage' | 'fixed'
  value: number
}

interface InvoiceAdvanceSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initialData?: AdvanceInvoiceDraft
  totalAmount: number
  onClose: () => void
  onSave: (data: AdvanceInvoiceDraft) => void
}

export default function InvoiceAdvanceSheet({
  open,
  mode,
  initialData,
  totalAmount,
  onClose,
  onSave,
}: InvoiceAdvanceSheetProps) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage')
  const [percentage, setPercentage] = useState(30)
  const [fixedAmount, setFixedAmount] = useState(0)

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        setLabel(initialData.label)
        setType(initialData.type)
        if (initialData.type === 'percentage') {
          setPercentage(initialData.value)
        } else {
          setFixedAmount(initialData.value)
        }
      } else {
        setLabel('')
        setType('percentage')
        setPercentage(30)
        setFixedAmount(Math.round(totalAmount * 0.3))
      }
    }
  }, [open, mode, initialData, totalAmount])

  const computedAmount = type === 'percentage' ? (totalAmount * percentage) / 100 : fixedAmount
  const formattedAmount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(computedAmount)
  const formattedTotal = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(totalAmount)

  const handleSave = () => {
    onSave({
      label,
      type,
      value: type === 'percentage' ? percentage : fixedAmount,
    })
    onClose()
  }

  return (
    <DocumentSheet
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Create Advance Invoice' : 'Edit Advance Invoice'}
      subtitle={`Based on SASINV-B047 · Total: ${formattedTotal}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className={styles.formLabel}>Invoice Label</label>
          <input
            className={styles.formInput}
            type="text"
            placeholder="e.g. Mobilisation Advance"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div>
          <label className={styles.formLabel}>Amount Type</label>
          <div className={advanceStyles.typeGrid}>
            <button
              type="button"
              className={`${advanceStyles.typeOpt} ${type === 'percentage' ? advanceStyles.active : ''}`}
              onClick={() => setType('percentage')}
            >
              <div className={advanceStyles.typeOptLabel}>Percentage</div>
              <div className={advanceStyles.typeOptSub}>% of total</div>
            </button>
            <button
              type="button"
              className={`${advanceStyles.typeOpt} ${type === 'fixed' ? advanceStyles.active : ''}`}
              onClick={() => setType('fixed')}
            >
              <div className={advanceStyles.typeOptLabel}>Fixed Amount</div>
              <div className={advanceStyles.typeOptSub}>Exact ₦ value</div>
            </button>
          </div>
        </div>

        {type === 'percentage' ? (
          <div>
            <label className={styles.formLabel}>Percentage (%)</label>
            <input
              className={styles.formInput}
              type="number"
              placeholder="e.g. 30"
              value={percentage}
              onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)}
            />
          </div>
        ) : (
          <div>
            <label className={styles.formLabel}>Fixed Amount (₦)</label>
            <input
              className={styles.formInput}
              type="number"
              placeholder="e.g. 800000"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
        )}

        <div className={advanceStyles.computedBox}>
          <div className={advanceStyles.computedLabel}>Computed Amount</div>
          <div className={advanceStyles.computedValue}>{formattedAmount}</div>
          <div className={advanceStyles.computedDesc}>
            {type === 'percentage' ? `${percentage}% of ${formattedTotal}` : `Fixed override out of ${formattedTotal}`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          <button
            type="button"
            className={styles.btnOutline}
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnAmber}
            style={{ flex: 2 }}
            onClick={handleSave}
          >
            {mode === 'create' ? 'Generate Invoice' : 'Save Changes'}
          </button>
        </div>
      </div>
    </DocumentSheet>
  )
}
