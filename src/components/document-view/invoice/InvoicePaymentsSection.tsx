import styles from './InvoicePaymentsSection.module.css'

interface PaymentEntry {
  method: string
  reference: string
  amount: string
  date: string
  kind?: 'payment' | 'wht' | 'voided'
  tag?: string
}

interface InvoicePaymentsSectionProps {
  paidValue: string
  whtAppliedValue: string
  balanceValue: string
  paidPercent: number
  entries: PaymentEntry[]
  onVoidPayment: () => void
}

export default function InvoicePaymentsSection({
  paidValue,
  whtAppliedValue,
  balanceValue,
  paidPercent,
  entries,
  onVoidPayment,
}: InvoicePaymentsSectionProps) {
  const clampedPercent = Math.max(0, Math.min(100, paidPercent))

  return (
    <div className={styles.card}>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCell}>
          <div className={styles.summaryLabel}>Cash Received</div>
          <div className={`${styles.summaryValue} ${styles.green}`}>{paidValue}</div>
        </div>
        <div className={styles.summaryCell}>
          <div className={styles.summaryLabel}>WHT Applied</div>
          <div className={styles.summaryValue}>{whtAppliedValue}</div>
        </div>
      </div>

      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${clampedPercent}%` }}
          />
        </div>
        <div className={styles.progressMeta}>
          <span>{clampedPercent}% settled</span>
          <span>{balanceValue} remaining</span>
        </div>
      </div>

      <div>
        {entries.map((entry) => (
          <PaymentHistoryItem key={entry.reference} entry={entry} onClick={onVoidPayment} />
        ))}
      </div>
    </div>
  )
}

function PaymentHistoryItem({ entry, onClick }: { entry: PaymentEntry, onClick: () => void }) {
  const iconClassName =
    entry.kind === 'wht'
      ? `${styles.icon} ${styles.iconWht}`
      : entry.kind === 'voided'
        ? `${styles.icon} ${styles.iconVoided}`
        : styles.icon

  const amountClassName =
    entry.kind === 'voided'
      ? `${styles.amount} ${styles.amountVoided}`
      : styles.amount

  return (
    <div className={styles.historyItem} onClick={onClick}>
      <div className={iconClassName}>
        {entry.kind === 'wht' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.method}>{entry.method}</div>
        <div className={styles.reference}>{entry.reference}</div>
        {entry.tag ? <div className={styles.tag}>{entry.tag}</div> : null}
      </div>

      <div className={styles.right}>
        <div className={amountClassName}>{entry.amount}</div>
        <div className={styles.date}>{entry.date}</div>
      </div>
    </div>
  )
}
