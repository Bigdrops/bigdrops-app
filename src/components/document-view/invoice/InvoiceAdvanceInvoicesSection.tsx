import styles from './InvoiceAdvanceInvoicesSection.module.css'
import { invoiceAdvanceItems } from './invoiceViewMockData'

interface InvoiceAdvanceInvoicesSectionProps {
  onDownload: () => void
  onEdit: () => void
  onRemove: () => void
}

export default function InvoiceAdvanceInvoicesSection({
  onDownload,
  onEdit,
  onRemove,
}: InvoiceAdvanceInvoicesSectionProps) {
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Advance Invoices — SASINV-B047</div>
          <div className={styles.subtitle}>₦4,720,000 contract · 2 advance invoices generated</div>
        </div>
      </div>

      <div className={styles.body}>
        {invoiceAdvanceItems.map((item) => (
          <div key={item.label} className={styles.item}>
            <div className={styles.itemLeft}>
              <div className={styles.label}>{item.label}</div>
              <div className={styles.sub}>{item.subtitle}</div>
            </div>
            <div className={styles.amount}>{item.amount}</div>
            <div className={styles.actions}>
              <button type="button" className={styles.miniButton} onClick={onDownload}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button type="button" className={styles.miniButton} onClick={onEdit}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.miniButton} ${styles.danger}`}
                onClick={onRemove}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
