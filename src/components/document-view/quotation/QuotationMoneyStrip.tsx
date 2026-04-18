import styles from './quotationMoneyStrip.module.css'
import type { quotationMetric } from './quotationViewMockData'

interface quotationMoneyStripProps {
  items: quotationMetric[]
}

export default function quotationMoneyStrip({ items }: quotationMoneyStripProps) {
  return (
    <div className={styles.strip}>
      {items.map((item) => (
        <div key={item.label} className={styles.cell}>
          <div className={styles.label}>{item.label}</div>
          <div
            className={[
              styles.value,
              item.tone === 'amber' ? styles.amber : '',
              item.tone === 'green' ? styles.green : '',
            ].join(' ')}
          >
            {item.value}
          </div>
          {item.hint ? <div className={styles.hint}>{item.hint}</div> : null}
        </div>
      ))}
    </div>
  )
}
