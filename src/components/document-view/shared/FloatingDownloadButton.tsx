import { Download } from 'lucide-react'

import FloatingDocumentButton from './FloatingDocumentButton'
import styles from './FloatingDownloadButton.module.css'

interface FloatingDownloadButtonProps {
  label?: string
  onClick?: () => void
  disabled?: boolean
}

export default function FloatingDownloadButton({
  label = 'Download PDF',
  onClick,
  disabled = false,
}: FloatingDownloadButtonProps) {
  const accessibleLabel = 'Download PDF'

  // DIAGNOSTIC LOGGING
  const handleClick = () => {
    const el = document.querySelector(`.${styles.button}`) as HTMLElement | null
    if (el) {
      console.group('🔍 FAB Download clicked')
      console.log('Classes:', el.className)
      console.log('Computed bg:', getComputedStyle(el).backgroundColor)
      console.log('--bd-brand:', getComputedStyle(el).getPropertyValue('--bd-brand'))
      console.log('--bd-fab-bg:', getComputedStyle(el).getPropertyValue('--bd-fab-bg'))
      console.log('data-theme:', document.documentElement.getAttribute('data-theme'))
      console.groupEnd()
    }
    onClick?.()
  }

  return (
    <FloatingDocumentButton
      disabled={disabled}
      onClick={handleClick}
      className={`${styles.button} ${disabled ? styles.disabled : ''}`.trim()}
      label={accessibleLabel}
      icon={
        <>
          <Download size={16} strokeWidth={2.2} />
          <span className={styles.srOnly}>{label}</span>
        </>
      }
    />
  )
}
