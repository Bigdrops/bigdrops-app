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

/**
 * Shared More Actions renderer for all BIGDROPS document View pages.
 *
 * All actions use one consistent divider-separated list row.
 * Sections are grouped by compact labels and subtle spacing.
 * Danger actions are differentiated by color, not by component structure.
 */
export default function DocumentMoreSheet({
  open,
  onClose,
  title = 'More Actions',
  sections = [],
}: DocumentMoreSheetProps) {
  return (
    <DocumentSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Quick document actions and destructive controls."
    >
      {sections.map((section, sIdx) => {
        const isDanger =
          section.title === 'Danger Zone' || section.title === 'Danger'

        return (
          <div key={sIdx} className={styles.section}>
            <div
              className={`${styles.sectionLabel} ${isDanger ? styles.sectionLabelDanger : ''}`}
            >
              {section.title}
            </div>
            <div className={styles.list}>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  className={[
                    styles.action,
                    item.selected ? styles.actionSelected : '',
                    item.destructive ? styles.actionDestructive : '',
                    item.disabled ? styles.actionDisabled : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    item.onClick?.()
                    if (item.closeOnClick !== false) onClose()
                  }}
                >
                  <span
                    className={[
                      styles.icon,
                      item.destructive ? styles.iconDestructive : '',
                      item.selected ? styles.iconSelected : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {item.icon}
                  </span>
                  <span className={styles.body}>
                    <span
                      className={[
                        styles.label,
                        item.destructive ? styles.labelDestructive : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {item.label}
                    </span>
                    {item.description ? (
                      <span className={styles.desc}>{item.description}</span>
                    ) : null}
                  </span>
                  {item.statusLabel ? (
                    <span
                      className={`${styles.pill} ${item.selected ? styles.pillActive : ''}`}
                    >
                      {item.statusLabel}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </DocumentSheet>
  )
}
