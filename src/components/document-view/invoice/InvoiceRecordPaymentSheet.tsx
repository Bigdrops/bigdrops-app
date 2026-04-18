import DocumentSheet from '../shared/DocumentSheet'
import styles from './InvoiceRecordPaymentSheet.module.css'

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
  return (
    <DocumentSheet
      open={open}
      onClose={onClose}
      title="Record Payment"
      subtitle="Balance due: ₦2,720,000"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className={styles.formLabel}>Amount</label>
          <input className={styles.formInput} type="text" placeholder="₦0.00" defaultValue="₦2,720,000" />
        </div>
        <div>
          <label className={styles.formLabel}>WHT Amount (if applicable)</label>
          <input className={styles.formInput} type="text" placeholder="₦0.00" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className={styles.formLabel}>Date</label>
            <input className={styles.formInput} type="date" defaultValue="2025-04-17" />
          </div>
          <div>
            <label className={styles.formLabel}>Method</label>
            <select className={styles.formSelect}>
              <option>Bank Transfer</option>
              <option>Cheque</option>
              <option>Cash</option>
              <option>WHT Credit</option>
            </select>
          </div>
        </div>
        <div>
          <label className={styles.formLabel}>Reference / Transaction ID</label>
          <input className={styles.formInput} type="text" placeholder="e.g. ZEN/2025/..." />
        </div>
        <div>
          <label className={styles.formLabel}>WHT Certificate Ref (optional)</label>
          <input className={styles.formInput} type="text" placeholder="e.g. WHT/LAS/2025/..." />
        </div>
        <div>
          <label className={styles.formLabel}>Bank Account</label>
          <select className={styles.formSelect}>
            <option>Zenith Bank — 2109384756 (Default)</option>
            <option>First Bank — 3047291836</option>
          </select>
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
            onClick={() => {
              onSave()
              onClose()
            }}
          >
            Save Payment
          </button>
        </div>
      </div>
    </DocumentSheet>
  )
}
