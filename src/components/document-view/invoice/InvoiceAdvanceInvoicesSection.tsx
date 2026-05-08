import { ExternalLink } from 'lucide-react'

import styles from './InvoicePresentation.module.css'

interface InvoiceAdvanceInvoicesSectionProps {
  items: Array<{
    id: string
    title: string
    subtitle: string
    amountLabel: string
    onOpen?: () => void
  }>
}

export default function InvoiceAdvanceInvoicesSection({
  items,
}: InvoiceAdvanceInvoicesSectionProps) {
  if (!items.length) return null

  return (
    <section className={styles.section}>
      <div className={styles['section-hd']}>
        <div className={styles['section-label']}>Advance Invoices</div>
      </div>
      <div className={styles['section-card']}>
        <div className={styles['advance-list']}>
          {items.map((adv) => (
            <div key={adv.id} className={styles['advance-item-row']} onClick={adv.onOpen}>
              <div className={styles['advance-body']}>
                <div className={styles['advance-title']}>{adv.title}</div>
                <div className={styles['advance-sub']}>{adv.subtitle}</div>
              </div>
              <div className={styles['advance-right']}>
                <div className={styles['advance-amount']}>{adv.amountLabel}</div>
                <ExternalLink size={14} className={styles['advance-chev']} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
