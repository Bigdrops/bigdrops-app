import styles from './RfqMoneyStrip.module.css'
import type { RfqMetric } from './rfqViewMockData'

interface RfqMoneyStripProps {
  items: RfqMetric[]
}

export default function RfqMoneyStrip({ items }: RfqMoneyStripProps) {
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
              item.tone === 'red' ? styles.red : '',
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
