import type { ReactNode } from 'react'

import styles from './DocumentActionButtons.module.css'

export function DocumentPrimaryActionRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>
}

export function DocumentPrimaryButton({
  children,
  onClick,
  variant = 'outline',
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'amber' | 'outline'
}) {
  return (
    <button type="button" className={`${styles.button} ${styles[variant]}`} onClick={onClick}>
      {children}
    </button>
  )
}

export function DocumentSecondaryActionRow({ children }: { children: ReactNode }) {
  return <div className={styles.chips}>{children}</div>
}

export function DocumentSecondaryChip({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button type="button" className={styles.chip} onClick={onClick}>
      {children}
    </button>
  )
}
