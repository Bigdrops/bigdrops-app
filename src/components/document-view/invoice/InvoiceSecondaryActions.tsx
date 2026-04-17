import styles from './InvoiceActionButtons.module.css'

interface InvoiceSecondaryActionsProps {
  onDuplicate: () => void
  onCopyNumber: () => void
}

export default function InvoiceSecondaryActions({
  onDuplicate,
  onCopyNumber,
}: InvoiceSecondaryActionsProps) {
  return (
    <div className={styles.chips}>
      <button type="button" className={styles.chip} onClick={onDuplicate}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        Duplicate
      </button>
      <button type="button" className={styles.chip} onClick={onCopyNumber}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        Copy No.
      </button>
    </div>
  )
}
