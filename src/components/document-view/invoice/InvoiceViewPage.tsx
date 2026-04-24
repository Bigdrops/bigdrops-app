import { Plus, Receipt, Paperclip, Edit3, Download } from 'lucide-react'
import type { ReactNode } from 'react'
import InvoiceAdvanceInvoicesSection from './InvoiceAdvanceInvoicesSection'
import DocumentRelatedDocsSection from '../shared/DocumentRelatedDocsSection'
import styles from './InvoicePresentation.module.css'

interface SupportingSectionProps {
  title: string
  action?: {
    label: string
    onClick: () => void
  }
  children: ReactNode
}

function SupportingSection({ title, action, children }: SupportingSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles['section-hd']}>
        <div className={styles['section-label']}>{title}</div>
        {action && (
          <button type="button" className={styles['section-link']} onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

interface InvoiceViewPageProps {
  documentPreview: ReactNode
  previewControls?: ReactNode
  paymentSummary: Array<{ label: string; value: string; tone?: 'green' | 'amber' }>
  paymentProgressLabel: string
  paymentProgressWidth: string
  paymentHistory: Array<{
    id: string
    amountLabel: string
    dateLabel: string
    methodLabel: string
    referenceLabel: string
    kind: 'cash' | 'wht'
  }>
  advanceInvoices: Array<{
    id: string
    title: string
    subtitle: string
    amountLabel: string
    onOpen?: () => void
  }>
  relatedDocuments: Array<{
    id: string
    title: string
    subtitle: string
    kind: 'quotation' | 'csr' | 'project' | 'document'
    onClick?: () => void
  }>
  attachments: Array<{
    id: string
    label: string
  }>
  onRecordPayment: () => void
  onEdit: () => void
  onDownload: () => void
  canRecordPayment: boolean
}

export default function InvoiceViewPage({
  documentPreview,
  previewControls,
  paymentSummary,
  paymentProgressLabel,
  paymentProgressWidth,
  paymentHistory,
  advanceInvoices,
  relatedDocuments,
  attachments,
  onRecordPayment,
  onEdit,
  onDownload,
  canRecordPayment
}: InvoiceViewPageProps) {
  const gPaymentSummary = Array.isArray(paymentSummary) ? paymentSummary : []
  const gPaymentHistory = Array.isArray(paymentHistory) ? paymentHistory : []
  const gAdvanceInvoices = Array.isArray(advanceInvoices) ? advanceInvoices : []
  const gRelatedDocuments = Array.isArray(relatedDocuments) ? relatedDocuments : []
  const gAttachments = Array.isArray(attachments) ? attachments : []

  return (
    <div className={styles.stack}>
      <div className={styles['action-row']}>
        <button type="button" className={`${styles.btn} ${styles['btn-amber']}`} onClick={onRecordPayment} disabled={!canRecordPayment}>
          <Plus size={18} strokeWidth={2.5} />
          <span>Record Payment</span>
        </button>
        <button type="button" className={`${styles.btn} ${styles['btn-outline']}`} onClick={onEdit}>
          <Edit3 size={17} strokeWidth={2} />
          <span>Edit</span>
        </button>
        <button type="button" className={`${styles.btn} ${styles['btn-outline']} ${styles['icon-only']}`} onClick={onDownload} title="Download PDF">
          <Download size={18} strokeWidth={2} />
        </button>
      </div>

      <div className={styles.documentBody}>
        {documentPreview}
      </div>

      {previewControls ? (
        <div className={styles.previewControls}>
          {previewControls}
        </div>
      ) : null}

      <div className={styles.supportingArea}>
        {gPaymentSummary.length > 0 && (
          <SupportingSection
            title="Payments"
            action={canRecordPayment ? { label: '+ Record', onClick: onRecordPayment } : undefined}
          >
            <div className={styles['payment-card']}>
              <div className={styles['payment-summary-grid']}>
                {gPaymentSummary.map((cell) => (
                  <div key={cell.label} className={styles['pay-sum-cell']}>
                    <div className={styles['pay-sum-lbl']}>{cell.label}</div>
                    <div className={`${styles['pay-sum-val']} ${cell.tone ? styles[cell.tone] : ''}`}>
                      {cell.value}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles['progress-wrap']}>
                <div className={styles['progress-bar']}>
                  <div className={styles['progress-fill']} style={{ width: paymentProgressWidth }} />
                </div>
                <div className={styles['progress-meta']}>{paymentProgressLabel}</div>
              </div>
              <div className={styles['payment-hist']}>
                {gPaymentHistory.map((item) => (
                  <div key={item.id} className={styles['pay-hist-item']}>
                    <div className={`${styles['pay-hist-icon']} ${item.kind === 'wht' ? styles.wht : ''}`}>
                      <Receipt size={16} />
                    </div>
                    <div className={styles['pay-hist-body']}>
                      <div className={styles['pay-hist-method']}>{item.methodLabel}</div>
                      <div className={styles['pay-hist-ref']}>{item.referenceLabel || 'No reference'}</div>
                    </div>
                    <div className={styles['pay-hist-right']}>
                      <div className={styles['pay-hist-amount']}>{item.amountLabel}</div>
                      <div className={styles['pay-hist-date']}>{item.dateLabel}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SupportingSection>
        )}

        <InvoiceAdvanceInvoicesSection items={gAdvanceInvoices} />

        <DocumentRelatedDocsSection items={relatedDocuments} />

        {gAttachments.length > 0 && (
          <SupportingSection title="Attachments">
            <div className={styles['attachments-scroller']}>
              {gAttachments.map((file) => (
                <div key={file.id} className={styles['attach-chip']}>
                  <Paperclip size={14} />
                  <span>{file.label}</span>
                </div>
              ))}
            </div>
          </SupportingSection>
        )}
      </div>
    </div>
  )
}
