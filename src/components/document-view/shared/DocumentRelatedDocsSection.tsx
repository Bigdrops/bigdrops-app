import { FileText, ExternalLink, Link as LinkIcon } from 'lucide-react'
import styles from './DocumentRelatedDocsSection.module.css'

export type RelatedDocumentKind = 'quotation' | 'csr' | 'project' | 'document' | 'waybill'

export interface RelatedDocumentItem {
  id: string
  title: string
  subtitle: string
  kind: RelatedDocumentKind
  onClick?: () => void
}

interface DocumentRelatedDocsSectionProps {
  items: RelatedDocumentItem[]
  title?: string
}

/**
 * A standard section for displaying documents linked to the current one.
 * Intended for use in detail views (Invoice, CSR, Waybill, etc.)
 */
export default function DocumentRelatedDocsSection({
  items,
  title = 'Linked Documents',
}: DocumentRelatedDocsSectionProps) {
  if (!items || items.length === 0) return null

  return (
    <section className={styles.section}>
      <div className={styles['section-hd']}>
        <div className={styles['section-label']}>{title}</div>
      </div>
      <div className={styles['section-card']}>
        <div className={styles['linked-list']}>
          {items.map((doc) => (
            <div key={doc.id} className={styles['linked-item']} onClick={doc.onClick}>
              <div className={`${styles['linked-icon']} ${styles[doc.kind] || ''}`}>
                {doc.kind === 'quotation' ? (
                  <FileText size={16} />
                ) : (
                  <LinkIcon size={16} />
                )}
              </div>
              <div className={styles['linked-body']}>
                <div className={styles['linked-title']}>{doc.title}</div>
                <div className={styles['linked-sub']}>{doc.subtitle}</div>
              </div>
              <ExternalLink size={14} className={styles['linked-chev']} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
