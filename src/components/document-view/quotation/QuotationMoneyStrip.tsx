import styles from './QuotationMoneyStrip.module.css'

interface MoneyStripItem {
  label: string
  value: string
  tone?: 'default' | 'amber' | 'green'
  hint?: string
}

interface QuotationMoneyStripProps {
  items: MoneyStripItem[]
}

export default function QuotationMoneyStrip({ items }: QuotationMoneyStripProps) {
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