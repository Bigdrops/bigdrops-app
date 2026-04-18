import DocumentSection from '../shared/DocumentSection'
import type { BaseDocument } from '../types/documentView'
import QuotationDocumentPreview from './QuotationDocumentPreview'
import QuotationMoneyStrip from './QuotationMoneyStrip'
import QuotationPrimaryActions from './QuotationPrimaryActions'
import QuotationSecondaryActions from './QuotationSecondaryActions'
import styles from './QuotationViewPage.module.css'
import type { QuotationMetric } from './quotationViewMockData'

interface QuotationViewPageProps {
  document: BaseDocument
  metrics: QuotationMetric[]
  onConvert: () => void
  onEdit: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
}

export default function QuotationViewPage({
  document: _document,
  metrics,
  onConvert,
  onEdit,
  onDuplicate,
  onCopyNumber,
}: QuotationViewPageProps) {
  return (
    <div className={styles.stack}>
      <QuotationMoneyStrip items={metrics} />

      <div className={styles.actionStack}>
        <QuotationPrimaryActions onConvert={onConvert} onEdit={onEdit} />
      </div>

      <DocumentSection title="Quotation Document">
        <QuotationDocumentPreview />
      </DocumentSection>
    </div>
  )
}
