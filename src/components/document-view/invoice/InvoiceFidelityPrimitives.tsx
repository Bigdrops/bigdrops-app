import type { ReactNode } from 'react'
import { Download } from 'lucide-react'

import styles from './InvoicePresentation.module.css'

type InvoicePageShellProps = {
  children: ReactNode
  overlay?: ReactNode
  topNav?: ReactNode
  floating?: ReactNode
}

export type InvoiceHeroMetric = {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'positive' | 'warning'
}

type InvoiceHeroMetaItem = {
  label: string
  value: string
}

type InvoiceHeroProps = {
  eyebrow: string
  number: string
  title: string
  clientName: string
  status: string
  metrics: InvoiceHeroMetric[]
  meta: InvoiceHeroMetaItem[]
}

export function InvoicePageShell({ children, overlay, topNav, floating }: InvoicePageShellProps) {
  return (
    <div className={styles.invoiceScope}>
      {topNav}
      <main className={styles.page}>
        <div className={styles.contentWrap}>
          {children}
        </div>
      </main>
      {floating}
      {overlay}
    </div>
  )
}

export function InvoiceFloatingDownloadButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button type="button" className={styles['fab-download']} onClick={onClick} disabled={disabled}>
      <Download size={17} strokeWidth={2.4} />
      {disabled ? 'Preparing...' : 'Download PDF'}
    </button>
  )
}

export function InvoiceHero({ eyebrow, number, title, clientName, status, metrics, meta }: InvoiceHeroProps) {
  const statusKey = String(status || 'draft').toLowerCase()
  const guardedMetrics = Array.isArray(metrics) ? metrics : []
  const guardedMeta = Array.isArray(meta) ? meta : []

  return (
    <section className={styles.hero}>
      <div className={styles['hero-top']}>
        <div className={styles['hero-left']}>
          <div className={styles['doc-label']}>{eyebrow || 'Invoice'}</div>
          <div className={styles['invoice-num']}>{number || '—'}</div>
          <div className={styles['invoice-sub']}>{clientName || 'Unassigned Client'}</div>
          {title && title.toUpperCase() !== 'INVOICE' && (
             <div className={styles['thread-tag']}>{title}</div>
          )}
        </div>

        <div className={`${styles['status-pill']} ${styles[statusKey] || styles.draft}`}>
          <div className={styles['status-dot']} />
          {status || 'Draft'}
        </div>
      </div>

      <div className={styles['money-strip']}>
        {guardedMetrics.map((metric) => (
          <div key={metric.label} className={styles['money-cell']}>
            <div className={styles['money-lbl']}>{metric.label}</div>
            <div
              className={[
                styles['money-val'],
                metric.tone === 'positive' ? styles.green : '',
                metric.tone === 'warning' ? styles.amber : '',
              ].join(' ')}
            >
              {metric.value || '—'}
            </div>
            {metric.hint ? <div className={styles['money-hint']}>{metric.hint}</div> : null}
          </div>
        ))}
      </div>
    </section>
  )
}

