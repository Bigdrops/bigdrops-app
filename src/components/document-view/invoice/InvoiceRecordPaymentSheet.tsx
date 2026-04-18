import styles from './InvoicePresentation.module.css'

interface InvoiceRecordPaymentSheetProps {
  open: boolean
  onClose: () => void
  onSave: () => void
}

export default function InvoiceRecordPaymentSheet({
  open,
  onClose,
  onSave,
}: InvoiceRecordPaymentSheetProps) {
  if (!open) return null

  return (
    <>
      <div className={`${styles.overlay} ${styles.open}`} onClick={onClose} />
      <div className={`${styles.sheet} ${styles.open}`}>
        <div className={styles['sheet-handle']} />
        <div className={styles['sheet-title']}>Record Payment</div>
        <div className={styles['sheet-sub']}>Balance due: ₦2,720,000</div>
        <div className={styles['sheet-body']}>
          <div className={styles['form-group']}>
            <label className={styles['form-label']}>Amount</label>
            <input className={styles['form-input']} type="text" placeholder="₦0.00" defaultValue="₦2,720,000" />
          </div>
          <div className={styles['form-group']}>
            <label className={styles['form-label']}>WHT Amount (if applicable)</label>
            <input className={styles['form-input']} type="text" placeholder="₦0.00" />
          </div>
          <div className={styles['form-row']}>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>Date</label>
              <input className={styles['form-input']} type="date" defaultValue="2025-04-17" />
            </div>
            <div className={styles['form-group']}>
              <label className={styles['form-label']}>Method</label>
              <select className={styles['form-select']}>
                <option>Bank Transfer</option>
                <option>Cheque</option>
                <option>Cash</option>
                <option>WHT Credit</option>
              </select>
            </div>
          </div>
          <div className={styles['form-group']}>
            <label className={styles['form-label']}>Reference / Transaction ID</label>
            <input className={styles['form-input']} type="text" placeholder="e.g. ZEN/2025/..." />
          </div>
          <div className={styles['form-group']}>
            <label className={styles['form-label']}>WHT Certificate Ref (optional)</label>
            <input className={styles['form-input']} type="text" placeholder="e.g. WHT/LAS/2025/..." />
          </div>
          <div className={styles['form-group']}>
            <label className={styles['form-label']}>Bank Account</label>
            <select className={styles['form-select']}>
              <option>Zenith Bank — 2109384756 (Default)</option>
              <option>First Bank — 3047291836</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 12 }}>
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
              Save Payment
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
