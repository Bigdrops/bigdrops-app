import type { ReactNode } from 'react'

import DocumentSection from '../shared/DocumentSection'
import type { BaseDocument } from '../types/documentView'
import BoqSummaryStrip from './BoqSummaryStrip'
import BoqPrimaryActions from './BoqPrimaryActions'
import styles from './BoqViewPage.module.css'
import type { BoqMetric } from './boqViewMockData'

interface BoqViewPageProps {
  document: BaseDocument
  metrics: BoqMetric[]
  amountInWords?: string
  preview: ReactNode
  onGenerateQuotation: () => void
  onEdit: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
}

export default function BoqViewPage({
  document: _document,
  metrics,
  amountInWords,
  preview,
  onGenerateQuotation,
  onEdit,
  onDuplicate,
  onCopyNumber,
}: BoqViewPageProps) {
  return (
    <div className={styles.stack}>
      <BoqSummaryStrip items={metrics} />

      {amountInWords ? (
        <div className="text-[11px] font-medium italic leading-relaxed text-muted-foreground text-right px-1">{amountInWords}</div>
      ) : null}

      <div className={styles.actionStack}>
        <BoqPrimaryActions onConvert={onGenerateQuotation} onEdit={onEdit} />
      </div>

      <DocumentSection title="Bill of Quantities">
        {preview}
      </DocumentSection>
    </div>
  )
}
