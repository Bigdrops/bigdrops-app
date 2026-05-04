import type { ReactNode } from 'react'

import DocumentSection from '../shared/DocumentSection'
import type { BaseDocument } from '../types/documentView'
import QuotationMoneyStrip from './QuotationMoneyStrip'
import QuotationPrimaryActions from './QuotationPrimaryActions'
import styles from './QuotationViewPage.module.css'
import type { QuotationMetric } from './quotationViewMockData'

interface QuotationViewPageProps {
  document: BaseDocument
  metrics: QuotationMetric[]
  documentPreview?: ReactNode
  preview?: ReactNode // deprecated, use documentPreview
  onConvert: () => void
  onEdit: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
}

export default function QuotationViewPage({
  document: _document,
  metrics,
  documentPreview,
  preview,
  onConvert,
  onEdit,
  onDuplicate,
  onCopyNumber,
}: QuotationViewPageProps) {
  const previewContent = documentPreview || preview

  return (
    <div className={styles.stack}>
      <QuotationMoneyStrip items={metrics} />

      <div className={styles.actionStack}>
        <QuotationPrimaryActions onConvert={onConvert} onEdit={onEdit} onDuplicate={onDuplicate} />
      </div>

      <DocumentSection title="Quotation Document">
        {previewContent}
      </DocumentSection>
    </div>
  )
}
