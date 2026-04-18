import type { ReactNode } from 'react'

import DocumentSection from '../shared/DocumentSection'
import type { BaseDocument } from '../types/documentView'
import RfqMoneyStrip from './RfqMoneyStrip'
import RfqPrimaryActions from './RfqPrimaryActions'
import styles from './RfqViewPage.module.css'
import type { RfqMetric } from './rfqViewMockData'

interface RfqViewPageProps {
  document: BaseDocument
  metrics: RfqMetric[]
  preview: ReactNode
  onConvert: () => void
  onEdit: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
}

export default function RfqViewPage({
  document: _document,
  metrics,
  preview,
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
        {preview}
      </DocumentSection>
    </div>
  )
}
