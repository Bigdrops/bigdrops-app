import type { ReactNode } from 'react'

import styles from './DocumentSection.module.css'

interface DocumentSectionProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export default function DocumentSection({
  title,
  description,
  action,
  children,
}: DocumentSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        {action}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  )
}
