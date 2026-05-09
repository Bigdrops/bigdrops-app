import { Download, Edit3 } from 'lucide-react'
import styles from '../invoice/InvoicePresentation.module.css'

interface QuotationPrimaryActionsProps {
  onConvert: () => void
  onEdit: () => void
  onDownload: () => void
}

export default function QuotationPrimaryActions({
  onConvert,
  onEdit,
  onDownload,
}: QuotationPrimaryActionsProps) {
  return (
    <div className={styles['action-row']}>
      <button type="button" className={`${styles.btn} ${styles['btn-primary']}`} onClick={onConvert}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span>Convert to Invoice</span>
      </button>
      <button type="button" className={`${styles.btn} ${styles['btn-outline']}`} onClick={onEdit}>
        <Edit3 size={17} strokeWidth={2} />
        <span>Edit</span>
      </button>
      <button
        type="button"
        className={styles['btn-pill']}
        onClick={onDownload}
        title="Download PDF"
        aria-label="Download PDF"
      >
        <Download size={18} strokeWidth={2} />
      </button>
    </div>
  )
}
