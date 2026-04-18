import { ReactNode, useEffect, useState } from 'react'
import styles from './DocumentMoreSheet.module.css'

export type DocumentMoreSheetItem = {
  id: string
  icon: ReactNode
  label: string
  description?: string
  onClick?: () => void
  destructive?: boolean
  disabled?: boolean
}

export type DocumentMoreSheetSection = {
  title: string
  items: DocumentMoreSheetItem[]
}

interface DocumentMoreSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  sections: DocumentMoreSheetSection[]
}

export default function DocumentMoreSheet({
  open,
  onClose,
  title = 'More Actions',
  sections = [],
}: DocumentMoreSheetProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Handle animation timing
  useEffect(() => {
    if (open) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  if (!open && !isVisible) return null

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.open : ''}`}
        onClick={onClose}
      />
      <div className={`${styles.sheet} ${open ? styles.open : ''}`}>
        <div className={styles.handle} />
        <div className={styles.title}>{title}</div>

        {(sections || []).map((section, sIdx) => (
          <div key={sIdx} className={styles.section}>
            <div className={styles.sectionHeader}>{section.title}</div>
            <div className={styles.grid}>
              {(section.items || []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  className={`${styles.action} ${item.destructive ? styles.destructive : ''}`}
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick()
                    }
                    onClose()
                  }}
                >
                  <div className={styles.iconWrapper}>{item.icon}</div>
                  <div className={styles.body}>
                    <div className={styles.label}>{item.label}</div>
                    {item.description && (
                      <div className={styles.description}>{item.description}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {sIdx < sections.length - 1 && <div className={styles.divider} />}
          </div>
        ))}
      </div>
    </>
  )
}
