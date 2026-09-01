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
  const lifecycleSections = sections.filter(
    (s) => s.title === 'Lifecycle' || s.title === 'Payments & Advances',
  )
  const commonSections = sections.filter(
    (s) =>
      s.title !== 'Lifecycle' &&
      s.title !== 'Payments & Advances' &&
      s.title !== 'Danger Zone' &&
      s.title !== 'Danger',
  )
  const dangerSections = sections.filter(
    (s) => s.title === 'Danger Zone' || s.title === 'Danger',
  )

  return (
    <DocumentSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Quick document actions and destructive controls."
    >
      {/* Lifecycle / primary actions — prominent cards */}
      {lifecycleSections.map((section, sIdx) => (
        <div key={`lc-${sIdx}`} className={styles.lifecycleSection}>
          <div className={styles.sectionLabel}>{section.title}</div>
          <div className={styles.lifecycleGrid}>
            {section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                className={`${styles.lifecycleAction} ${item.selected ? styles.lifecycleSelected : ''} ${item.disabled ? styles.lifecycleDisabled : ''}`}
                onClick={() => {
                  item.onClick?.()
                  if (item.closeOnClick !== false) onClose()
                }}
              >
                <div className={styles.lifecycleIcon}>{item.icon}</div>
                <div className={styles.lifecycleBody}>
                  <div className={styles.lifecycleLabel}>{item.label}</div>
                  {item.description && (
                    <div className={styles.lifecycleDesc}>
                      {item.description}
                    </div>
                  )}
                </div>
                {item.statusLabel && (
                  <div
                    className={`${styles.statusPill} ${item.selected ? styles.statusPillActive : ''}`}
                  >
                    {item.statusLabel}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Common / utility actions — compact list */}
      {commonSections.map((section, sIdx) => (
        <div key={`cm-${sIdx}`} className={styles.commonSection}>
          <div className={styles.sectionLabel}>{section.title}</div>
          <div className={styles.commonList}>
            {section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                className={`${styles.commonAction} ${item.selected ? styles.commonSelected : ''} ${item.disabled ? styles.commonDisabled : ''}`}
                onClick={() => {
                  item.onClick?.()
                  if (item.closeOnClick !== false) onClose()
                }}
              >
                <div className={styles.commonIcon}>{item.icon}</div>
                <div className={styles.commonLabel}>{item.label}</div>
                {item.statusLabel && (
                  <div
                    className={`${styles.statusPill} ${item.selected ? styles.statusPillActive : ''}`}
                  >
                    {item.statusLabel}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Danger zone — isolated, visually distinct */}
      {dangerSections.map((section, sIdx) => (
        <div key={`dz-${sIdx}`} className={styles.dangerSection}>
          <div className={styles.dangerZoneLabel}>{section.title}</div>
          <div className={styles.dangerList}>
            {section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                className={`${styles.dangerAction} ${item.destructive ? styles.destructiveAction : ''} ${item.disabled ? styles.dangerDisabled : ''}`}
                onClick={() => {
                  item.onClick?.()
                  if (item.closeOnClick !== false) onClose()
                }}
              >
                <div
                  className={`${styles.dangerIcon} ${item.destructive ? styles.dangerIconDestructive : ''}`}
                >
                  {item.icon}
                </div>
                <div className={styles.dangerBody}>
                  <div
                    className={`${styles.dangerItemLabel} ${item.destructive ? styles.destructiveLabel : ''}`}
                  >
                    {item.label}
                  </div>
                  {item.description && (
                    <div className={styles.dangerDesc}>{item.description}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </DocumentSheet>
  )
}
