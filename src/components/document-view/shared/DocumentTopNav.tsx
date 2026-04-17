import type { ReactNode } from 'react'

import styles from './DocumentTopNav.module.css'

interface DocumentTopNavProps {
  title: string
  subtitle?: string
  onBack?: () => void
  backLabel?: string
  actions?: ReactNode
}

export default function DocumentTopNav({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  actions,
}: DocumentTopNavProps) {
  return (
    <header className={styles.nav}>
      {onBack ? (
        <button type="button" onClick={onBack} className={styles.backButton}>
          <span aria-hidden="true">←</span>
          <span>{backLabel}</span>
        </button>
      ) : (
        <div />
      )}

      <div className={styles.center}>
        <div className={styles.title}>{title}</div>
        {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
      </div>

      <div className={styles.actions}>{actions}</div>
    </header>
  )
}
