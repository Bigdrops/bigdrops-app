import type { ReactNode } from 'react'

import DocumentSection from '../shared/DocumentSection'
import type { BaseDocument } from '../types/documentView'
import WaybillSummaryStrip from './WaybillSummaryStrip'
import WaybillPrimaryActions from './WaybillPrimaryActions'
import styles from './WaybillViewPage.module.css'
import type { WaybillMetric } from '@/components/waybill/waybillUtils'

interface WaybillViewPageProps {
  document: BaseDocument
  metrics: WaybillMetric[]
  preview: ReactNode
  activityHistory?: ReactNode
  onMarkAsDelivered: () => void
  onEdit: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
}

export default function WaybillViewPage({
  document: _document,
  metrics,
  preview,
  activityHistory,
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
      </div>

      <DocumentSection title="Dispatch manifest">
        {preview}
      </DocumentSection>

      {activityHistory}
    </div>
  )
}
