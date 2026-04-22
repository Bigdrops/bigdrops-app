import type { ReactNode } from 'react'

import type { DocumentStatus } from '../types/documentView'
import styles from './DocumentHero.module.css'

interface DocumentHeroProps {
  eyebrow?: ReactNode
  title: string
  subtitle?: string
  status?: DocumentStatus
  meta?: ReactNode
}

const statusClassNameMap: Record<string, string> = {
  partially_paid: styles.partial,
  paid: styles.paid,
  unpaid: styles.unpaid,
  open: styles.draft,
  converted: styles.paid,
}

export default function DocumentHero({
  eyebrow,
  title,
  subtitle,
  status,
  meta,
}: DocumentHeroProps) {
  const statusClassName = status
    ? statusClassNameMap[status] ?? styles.default
    : styles.default

  return (
    <section className={styles.hero}>
      <div className={styles.top}>
        <div className={styles.content}>
          {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          {meta ? <div className={styles.meta}>{meta}</div> : null}
        </div>
        {status ? (
          <span className={`${styles.statusPill} ${statusClassName}`}>
            <span className={styles.statusDot} />
            {status}
          </span>
        ) : null}
      </div>
    </section>
  )
}
