import styles from './QuotationActionButtons.module.css'

interface QuotationPrimaryActionsProps {
  onConvert: () => void
  onEdit: () => void
}

export default function QuotationPrimaryActions({
  onConvert,
  onEdit,
}: QuotationPrimaryActionsProps) {
  return (
    <div className={styles.row}>
      <button type="button" className={`${styles.button} ${styles.amber}`} onClick={onConvert}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        Convert to Invoice
      </button>
      <button type="button" className={`${styles.button} ${styles.outline}`} onClick={onEdit}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit Quotation
      </button>
    </div>
  )
}
