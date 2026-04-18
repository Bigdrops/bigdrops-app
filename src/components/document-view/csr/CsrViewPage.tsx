import DocumentSection from '../shared/DocumentSection'
import type { BaseDocument } from '../types/documentView'
import CsrDocumentPreview from './CsrDocumentPreview'
import CsrSummaryStrip from './CsrSummaryStrip'
import CsrPrimaryActions from './CsrPrimaryActions'
import CsrSecondaryActions from './CsrSecondaryActions'
import styles from './CsrViewPage.module.css'
import type { CsrMetric } from './csrViewMockData'

interface CsrViewPageProps {
  document: BaseDocument
  metrics: CsrMetric[]
  onComplete: () => void
  onEdit: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
}

export default function CsrViewPage({
  document: _document,
  metrics,
  onComplete,
  onEdit,
  onDuplicate,
  onCopyNumber,
}: CsrViewPageProps) {
  return (
    <div className={styles.stack}>
      <CsrSummaryStrip items={metrics} />

      <div className={styles.actionStack}>
        <CsrPrimaryActions onComplete={onComplete} onEdit={onEdit} />
      </div>

      <DocumentSection title="Service report content">
        <CsrDocumentPreview />
      </DocumentSection>
    </div>
  )
}
