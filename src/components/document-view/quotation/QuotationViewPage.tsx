import type { ReactNode } from 'react'

import DocumentSection from '../shared/DocumentSection'
import type { BaseDocument } from '../types/documentView'
import QuotationPrimaryActions from './QuotationPrimaryActions'
import styles from './QuotationViewPage.module.css'

interface QuotationViewPageProps {
  document: BaseDocument
  documentPreview?: ReactNode
  preview?: ReactNode // deprecated, use documentPreview
  onConvert: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDownload: () => void
  onCopyNumber: () => void
}

export default function QuotationViewPage({
  document: _document,
  documentPreview,
  preview,
  onConvert,
  onEdit,
  onDuplicate: _onDuplicate,
  onDownload,
  onCopyNumber: _onCopyNumber,
}: QuotationViewPageProps) {
  const previewContent = documentPreview || preview

  return (
    <div className={styles.stack}>
      <div className={styles.actionStack}>
        <QuotationPrimaryActions onConvert={onConvert} onEdit={onEdit} onDownload={onDownload} />
      </div>

      <DocumentSection title="Quotation Document">
        {previewContent}
      </DocumentSection>
    </div>
  )
}
