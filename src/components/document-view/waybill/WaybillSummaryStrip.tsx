import styles from './WaybillSummaryStrip.module.css'
import type { WaybillMetric } from './waybillViewMockData'

interface WaybillSummaryStripProps {
  items: WaybillMetric[]
}

export default function WaybillSummaryStrip({ items }: WaybillSummaryStripProps) {
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
