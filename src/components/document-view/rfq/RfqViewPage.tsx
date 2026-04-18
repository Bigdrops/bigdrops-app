import DocumentSection from '../shared/DocumentSection'
import type { BaseDocument } from '../types/documentView'
import RfqDocumentPreview from './RfqDocumentPreview'
import RfqMoneyStrip from './RfqMoneyStrip'
import RfqPrimaryActions from './RfqPrimaryActions'
import RfqSecondaryActions from './RfqSecondaryActions'
import styles from './RfqViewPage.module.css'
import type { RfqMetric } from './rfqViewMockData'

interface RfqViewPageProps {
  document: BaseDocument
  metrics: RfqMetric[]
  onConvert: () => void
  onEdit: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
}

export default function RfqViewPage({
  document: _document,
  metrics,
  onConvert,
  onEdit,
  onDuplicate,
  onCopyNumber,
}: RfqViewPageProps) {
  return (
    <div className={styles.stack}>
      <RfqMoneyStrip items={metrics} />

      <div className={styles.actionStack}>
        <RfqPrimaryActions onConvert={onConvert} onEdit={onEdit} />
      </div>

      <DocumentSection title="Request specification">
        <RfqDocumentPreview />
      </DocumentSection>
    </div>
  )
}
