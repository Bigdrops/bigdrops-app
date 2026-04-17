import DocumentSection from '../shared/DocumentSection'
import type { BaseDocument } from '../types/documentView'
import InvoiceAdvanceInvoicesSection from './InvoiceAdvanceInvoicesSection'
import InvoiceDocumentPreview from './InvoiceDocumentPreview'
import InvoiceMoneyStrip from './InvoiceMoneyStrip'
import InvoicePrimaryActions from './InvoicePrimaryActions'
import InvoiceSecondaryActions from './InvoiceSecondaryActions'
import InvoicePaymentsSection from './InvoicePaymentsSection'
import styles from './InvoiceViewPage.module.css'
import type { InvoiceMetric } from './invoiceViewMockData'

interface InvoiceViewPageProps {
  document: BaseDocument
  metrics: InvoiceMetric[]
  onRecordPayment: () => void
  onEdit: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
  onAdvanceDownload: () => void
  onAdvanceEdit: () => void
  onAdvanceRemove: () => void
}

export default function InvoiceViewPage({
  document: _document,
  metrics,
  onRecordPayment,
  onEdit,
  onDuplicate,
  onCopyNumber,
  onAdvanceDownload,
  onAdvanceEdit,
  onAdvanceRemove,
}: InvoiceViewPageProps) {
  return (
    <div className={styles.stack}>
      <InvoiceMoneyStrip items={metrics} />

      <div className={styles.actionStack}>
        <InvoicePrimaryActions onRecordPayment={onRecordPayment} onEdit={onEdit} />
        <InvoiceSecondaryActions
          onDuplicate={onDuplicate}
          onCopyNumber={onCopyNumber}
        />
      </div>

      <DocumentSection title="Invoice Document">
        <InvoiceDocumentPreview />
      </DocumentSection>

      <DocumentSection
        title="Payments"
        action={
          <button type="button" className={styles.sectionLink} onClick={onRecordPayment}>
            + Record
          </button>
        }
      >
        <InvoicePaymentsSection
          paidValue={metrics[1]?.value ?? ''}
          balanceValue={metrics[2]?.value ?? ''}
        />
      </DocumentSection>

      <DocumentSection
        title="Advance Invoices"
        action={
          <button type="button" className={styles.sectionLink} onClick={onAdvanceEdit}>
            + Add
          </button>
        }
      >
        <InvoiceAdvanceInvoicesSection
          onDownload={onAdvanceDownload}
          onEdit={onAdvanceEdit}
          onRemove={onAdvanceRemove}
        />
      </DocumentSection>
    </div>
  )
}
