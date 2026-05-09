import type { ReactNode } from 'react'
import styles from './DocumentPreviewShell.module.css'

interface DocumentPreviewShellProps {
  children: ReactNode
}

export default function DocumentPreviewShell({ children }: DocumentPreviewShellProps) {
  return (
    <article className={styles.document}>
      {children}
    </article>
  )
}
