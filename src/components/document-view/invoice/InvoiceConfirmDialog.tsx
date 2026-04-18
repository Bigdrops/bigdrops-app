import type { ReactNode } from 'react'
import styles from './InvoicePresentation.module.css'
import { AlertCircle, Trash2, Archive, RotateCcw } from 'lucide-react'

interface InvoiceConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function InvoiceConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: InvoiceConfirmDialogProps) {
  if (!open) return null

  // We map the titles back to appropriate icons matching the fidelity intent
  let Icon = AlertCircle
  if (destructive && title.includes('Delete')) Icon = Trash2
  else if (destructive) Icon = AlertCircle
  else if (title.includes('Archive')) Icon = Archive
  else if (title.includes('Revert')) Icon = RotateCcw

  return (
    <div className={styles['modal-backdrop']} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles['modal-header']}>
          <div className={`${styles['modal-icon-wrap']} ${destructive ? styles.danger : ''}`}>
            <Icon size={22} strokeWidth={2.5} />
          </div>
          <div className={styles['modal-title']}>{title}</div>
        </div>
        <div className={styles['modal-desc']}>{description}</div>
        <div className={styles['modal-actions']}>
          <button type="button" className={`${styles.btn} ${styles['btn-outline']}`} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${destructive ? styles['btn-danger'] : styles['btn-amber']}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
