import { Download } from 'lucide-react'

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
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${styles.button} ${disabled ? styles.disabled : ''}`.trim()}
    >
      <Download size={16} strokeWidth={2.2} />
      {label}
    </button>
  )
}
