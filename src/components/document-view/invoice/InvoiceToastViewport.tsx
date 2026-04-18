import styles from './InvoicePresentation.module.css'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

export interface ToastMessage {
  id: string
  title: string
  description?: string
  tone?: 'info' | 'success' | 'danger' | 'warning'
}

interface InvoiceToastViewportProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export default function InvoiceToastViewport({ toasts, onDismiss }: InvoiceToastViewportProps) {
  if (!toasts.length) return null

  return (
    <div className={styles['toast-area']}>
      {toasts.map((toast) => {
        let Icon = Info
        let toneClass = ''
        if (toast.tone === 'success') {
          Icon = CheckCircle2
          toneClass = styles.success || ''
        } else if (toast.tone === 'destructive') {
          Icon = AlertCircle
          toneClass = styles.danger || ''
        }

        return (
          <div key={toast.id} className={`${styles.toast} ${toneClass}`} onClick={() => onDismiss(toast.id)}>
            <div className={styles['toast-icon']}>
              <Icon size={16} strokeWidth={2.5} />
            </div>
            <div>
              <div className={styles['toast-title']}>{toast.title}</div>
              {toast.description ? <div className={styles['toast-desc']}>{toast.description}</div> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
