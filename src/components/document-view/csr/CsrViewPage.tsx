import type { ReactNode } from 'react'

import DocumentSection from '../shared/DocumentSection'
import type { BaseDocument } from '../types/documentView'
import CsrSummaryStrip from './CsrSummaryStrip'
import styles from './CsrViewPage.module.css'
import type { CsrMetric } from './csrViewMockData'

interface CsrViewPageProps {
  document: BaseDocument
  metrics: CsrMetric[]
  documentPreview?: ReactNode
  preview?: ReactNode // deprecated, use documentPreview
  activityHistory?: ReactNode
  onDuplicate: () => void
  onCopyNumber: () => void
}

export default function CsrViewPage({
  document: _document,
  metrics,
  documentPreview,
  preview,
  activityHistory,
  onDuplicate: _onDuplicate,
  onCopyNumber: _onCopyNumber,
}: CsrViewPageProps) {
  const previewContent = documentPreview || preview

  return (
    <div className={styles.stack}>
      <CsrSummaryStrip items={metrics} />

      <DocumentSection title="Service report content">
        {previewContent}
      </DocumentSection>

      {activityHistory}
    </div>
  )
}
