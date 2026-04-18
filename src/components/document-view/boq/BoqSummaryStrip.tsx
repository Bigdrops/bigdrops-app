import styles from './BoqSummaryStrip.module.css'
import type { BoqMetric } from './boqViewMockData'

interface BoqSummaryStripProps {
  items: BoqMetric[]
}

export default function BoqSummaryStrip({ items }: BoqSummaryStripProps) {
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
              item.tone === 'blue' ? styles.blue : '',
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
