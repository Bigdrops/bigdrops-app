import { ReactNode } from 'react'
import { ChevronLeft, Share2, MoreHorizontal, Download } from 'lucide-react'
import styles from './DocumentTopNav.module.css'

interface DocumentTopNavProps {
  title: string
  subtitle?: string
  onBack: () => void
  backLabel?: string
  onShare?: () => void
  onCustomize?: () => void
  onMore?: () => void
  onDownload?: () => void
  customizeIcon?: ReactNode
}

export default function DocumentTopNav({
  title,
  subtitle,
  onBack,
  onShare,
  onCustomize,
  onMore,
  onDownload,
  customizeIcon,
}: DocumentTopNavProps) {
  return (
    <nav className={styles.nav}>
      <button
        type="button"
        onClick={onBack}
        className={styles.backButton}
        aria-label="Go back"
      >
        <ChevronLeft size={20} strokeWidth={2.4} />
      </button>

      <div className={styles.center}>
        <div className={styles.title}>{title}</div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>

      <div className={styles.actions}>
        {onShare && (
          <button
            type="button"
            className={styles.iconBtn}
            title="Share"
            onClick={onShare}
            aria-label="Share"
          >
            <Share2 size={17} strokeWidth={2.4} />
          </button>
        )}
        {onCustomize && (
          <button
            type="button"
            className={styles.iconBtn}
            title="Customize PDF"
            onClick={onCustomize}
            aria-label="Customize PDF template, fonts and colors"
          >
            {customizeIcon || (
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            )}
          </button>
        )}
        {onMore && (
          <button
            type="button"
            className={styles.iconBtn}
            title="More actions"
            onClick={onMore}
            aria-label="More actions"
          >
            <MoreHorizontal size={17} strokeWidth={2.4} />
          </button>
        )}
        {onDownload && (
          <button
            type="button"
            className={styles.iconBtn}
            title="Download"
            onClick={onDownload}
            aria-label="Download"
          >
            <Download size={17} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </nav>
  )
}
