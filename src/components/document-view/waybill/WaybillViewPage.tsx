import DocumentSection from '../shared/DocumentSection'
import type { BaseDocument } from '../types/documentView'
import WaybillDocumentPreview from './WaybillDocumentPreview'
import WaybillSummaryStrip from './WaybillSummaryStrip'
import WaybillPrimaryActions from './WaybillPrimaryActions'
import WaybillSecondaryActions from './WaybillSecondaryActions'
import styles from './WaybillViewPage.module.css'
import type { WaybillMetric } from './waybillViewMockData'

interface WaybillViewPageProps {
  document: BaseDocument
  metrics: WaybillMetric[]
  onMarkAsDelivered: () => void
  onEdit: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
}

export default function WaybillViewPage({
  document: _document,
  metrics,
  onMarkAsDelivered,
  onEdit,
  onDuplicate,
  onCopyNumber,
}: WaybillViewPageProps) {
  return (
    <div className={styles.stack}>
      <WaybillSummaryStrip items={metrics} />

      <div className={styles.actionStack}>
        <WaybillPrimaryActions onMarkAsDelivered={onMarkAsDelivered} onEdit={onEdit} />
        <WaybillSecondaryActions
          onDuplicate={onDuplicate}
          onCopyNumber={onCopyNumber}
        />
      </div>

      <DocumentSection title="Dispatch manifest">
        <WaybillDocumentPreview />
      </DocumentSection>
    </div>
  )
}
