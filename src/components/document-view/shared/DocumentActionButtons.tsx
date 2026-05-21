import type { ReactNode } from 'react'

import styles from './DocumentActionButtons.module.css'

export function DocumentPrimaryActionRow({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>
}

export function DocumentPrimaryButton({
  children,
  onClick,
  variant = 'outline',
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'amber' | 'outline'
  disabled?: boolean
}) {
  return (
    <button type="button" className={`${styles.button} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
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
