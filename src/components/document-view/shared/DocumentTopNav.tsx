import { ReactNode } from 'react'
import { ChevronLeft, MoreHorizontal, Share2, SlidersHorizontal } from 'lucide-react'
import styles from './DocumentTopNav.module.css'

interface DocumentTopNavProps {
  title: string
  subtitle?: string
  onBack: () => void
  backLabel?: string
  onShare?: () => void
  onCustomize?: () => void
  onMore?: () => void
  customizeIcon?: ReactNode
}

export default function DocumentTopNav({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  onShare,
  onCustomize,
  onMore,
  customizeIcon,
}: DocumentTopNavProps) {
  return (
    <nav className={styles.nav}>
      <button type="button" onClick={onBack} className={styles.backButton}>
        <ChevronLeft size={18} strokeWidth={2.4} />
        <span>{backLabel}</span>
      </button>

      <div className={styles.center}>
        <div className={styles.title}>{title}</div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>

      <div className={styles.actions}>
        {onShare && (
          <button type="button" className={styles.iconBtn} title="Share" onClick={onShare}>
            <Share2 size={17} strokeWidth={2.4} />
          </button>
        )}
        {onCustomize && (
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.primary}`}
            title="Customize"
            onClick={onCustomize}
          >
            {customizeIcon || <SlidersHorizontal size={17} strokeWidth={2.4} />}
          </button>
        )}
        {onMore && (
          <button type="button" className={styles.iconBtn} title="More actions" onClick={onMore}>
            <MoreHorizontal size={17} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </nav>
  )
}
