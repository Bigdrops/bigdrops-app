import type { ReactNode } from 'react'

import DocumentSection from '../shared/DocumentSection'
import type { BaseDocument } from '../types/documentView'
import CsrSummaryStrip from './CsrSummaryStrip'
import CsrPrimaryActions from './CsrPrimaryActions'
import styles from './CsrViewPage.module.css'
import type { CsrMetric } from './csrViewMockData'

interface CsrViewPageProps {
  document: BaseDocument
  metrics: CsrMetric[]
  documentPreview?: ReactNode
  preview?: ReactNode // deprecated, use documentPreview
  onComplete: () => void
  onEdit: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
}

export default function CsrViewPage({
  document: _document,
  metrics,
  documentPreview,
  preview,
  onComplete,
  onEdit,
  onDuplicate,
  onCopyNumber,
}: CsrViewPageProps) {
  const previewContent = documentPreview || preview

  return (
    <div className={styles.stack}>
      <CsrSummaryStrip items={metrics} />

      <div className={styles.actionStack}>
        <CsrPrimaryActions onComplete={onComplete} onEdit={onEdit} />
      </div>

      <DocumentSection title="Service report content">
        {previewContent}
      </DocumentSection>
    </div>
  )
}
