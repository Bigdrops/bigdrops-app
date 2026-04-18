import styles from './CsrSummaryStrip.module.css'
import type { CsrMetric } from './csrViewMockData'

interface CsrSummaryStripProps {
  items: CsrMetric[]
}

export default function CsrSummaryStrip({ items }: CsrSummaryStripProps) {
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
              item.tone === 'purple' ? styles.purple : '',
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
