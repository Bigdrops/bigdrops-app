import { ReactNode } from 'react'
import DocumentSheet from './DocumentSheet'
import styles from './DocumentMoreSheet.module.css'

export type DocumentMoreSheetItem = {
  id: string
  icon: ReactNode
  label: string
  description?: string
  onClick?: () => void
  destructive?: boolean
  disabled?: boolean
  closeOnClick?: boolean
  selected?: boolean
  statusLabel?: string
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
  return (
    <DocumentSheet open={open} onClose={onClose} title={title} subtitle="Quick document actions and destructive controls.">
      <div className={styles.sections}>
        {(sections || []).map((section, sIdx) => (
          <div key={sIdx} className={styles.section}>
            <div className={styles.sectionHeader}>{section.title}</div>
            <div className={styles.grid}>
              {(section.items || []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  className={`${styles.action} ${item.destructive ? styles.destructive : ''} ${item.selected ? styles.selected : ''}`}
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick()
                    }
                    if (item.closeOnClick !== false) {
                      onClose()
                    }
                  }}
                >
                  <div className={styles.iconWrapper}>{item.icon}</div>
                  <div className={styles.body}>
                    <div className={styles.label}>{item.label}</div>
                    {item.description && (
                      <div className={styles.description}>{item.description}</div>
                    )}
                  </div>
                  {item.statusLabel ? (
                    <div className={`${styles.statusPill} ${item.selected ? styles.statusPillActive : ''}`}>
                      {item.statusLabel}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
            {sIdx < sections.length - 1 && <div className={styles.divider} />}
          </div>
        ))}
      </div>
    </DocumentSheet>
  )
}
