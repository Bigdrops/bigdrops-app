import type { ReactNode } from 'react'

import {
  Banknote,
  Pencil,
  Download,
  ChevronRight,
  FileText,
  Briefcase,
  CheckCircle2,
  FileBadge2,
  Paperclip,
  XCircle,
} from 'lucide-react'

import styles from './InvoicePresentation.module.css'
import type { InvoiceMetric } from './invoiceViewMockData'

type PaymentHistoryItem = {
  id: string
  amountLabel: string
  dateLabel: string
  methodLabel: string
  referenceLabel?: string
  kind?: 'cash' | 'wht'
}

type AdvanceInvoiceItem = {
  id: string
  title: string
  subtitle: string
  amountLabel: string
}

type LinkedDocumentItem = {
  id: string
  title: string
  subtitle: string
  kind?: 'quotation' | 'csr' | 'project' | 'document'
  onClick?: () => void
}

type AttachmentItem = {
  id: string
  label: string
}

interface InvoiceViewPageProps {
  metrics: InvoiceMetric[]
  documentPreview: ReactNode
  paymentSummary: Array<{ label: string; value: string; tone?: 'default' | 'green' }>
  paymentProgressLabel: string
  paymentProgressWidth: string
  paymentHistory: PaymentHistoryItem[]
  advanceInvoices: AdvanceInvoiceItem[]
  relatedDocuments: LinkedDocumentItem[]
  attachments: AttachmentItem[]
  onRecordPayment: () => void
  onEdit: () => void
  onAdvanceDownload: (advanceId?: string) => void
  onAdvanceEdit: (advanceId?: string) => void
  onAdvanceRemove: (advanceId?: string) => void
  onVoidPayment: (paymentId?: string) => void
}

export default function InvoiceViewPage({
  metrics,
  documentPreview,
  paymentSummary,
  paymentProgressLabel,
  paymentProgressWidth,
  paymentHistory,
  advanceInvoices,
  relatedDocuments,
  attachments,
  onRecordPayment,
  onEdit,
  onAdvanceDownload,
  onAdvanceEdit,
  onAdvanceRemove,
  onVoidPayment,
}: InvoiceViewPageProps) {
  return (
    <>
      <div className={`${styles['action-row']} ${styles['fade-up']}`}>
        <button className={`${styles.btn} ${styles['btn-amber']}`} onClick={onRecordPayment}>
          <Banknote size={15} strokeWidth={2.5} />
          Record Payment
        </button>
        <button className={`${styles.btn} ${styles['btn-outline']}`} onClick={onEdit}>
          <Pencil size={15} strokeWidth={2} />
          Edit
        </button>
      </div>

      <div className={`${styles.section} ${styles['fade-up']}`}>
        <div className={styles['section-hd']}>
          <div className={styles['section-label']}>Invoice Document</div>
        </div>
        {documentPreview}
      </div>

      <div className={`${styles.section} ${styles['fade-up']}`}>
        <div className={styles['section-hd']}>
          <div className={styles['section-label']}>Payments</div>
          <button className={styles['section-link']} onClick={onRecordPayment}>
            + Record
          </button>
        </div>
        <div className={styles['payment-card']}>
          <div className={styles['payment-summary-grid']}>
            {paymentSummary.map((item) => (
              <div key={item.label} className={styles['pay-sum-cell']}>
                <div className={styles['pay-sum-lbl']}>{item.label}</div>
                <div className={`${styles['pay-sum-val']} ${item.tone === 'green' ? styles.green : ''}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          <div className={styles['progress-wrap']}>
            <div className={styles['progress-bar']}>
              <div className={styles['progress-fill']} style={{ width: paymentProgressWidth }} />
            </div>
            <div className={styles['progress-meta']}>
              {paymentProgressLabel.split(' · ').map((text) => (
                <span key={text}>{text}</span>
              ))}
            </div>
          </div>
          <div className={styles['payment-hist']}>
            {paymentHistory.length > 0 ? (
              paymentHistory.map((payment) => (
                <div key={payment.id} className={styles['pay-hist-item']} onClick={() => onVoidPayment(payment.id)}>
                  <div className={`${styles['pay-hist-icon']} ${payment.kind === 'wht' ? styles.wht : ''}`}>
                    {payment.kind === 'wht' ? (
                      <FileBadge2 size={14} strokeWidth={2.5} />
                    ) : (
                      <CheckCircle2 size={14} strokeWidth={2.5} />
                    )}
                  </div>
                  <div className={styles['pay-hist-body']}>
                    <div className={styles['pay-hist-method']}>{payment.methodLabel}</div>
                    {payment.referenceLabel ? (
                      <div className={styles['pay-hist-ref']}>{payment.referenceLabel}</div>
                    ) : null}
                  </div>
                  <div className={styles['pay-hist-right']}>
                    <div className={styles['pay-hist-amount']}>{payment.amountLabel}</div>
                    <div className={styles['pay-hist-date']}>{payment.dateLabel}</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text="No payments recorded yet." />
            )}
          </div>
        </div>
      </div>

      <div className={`${styles.section} ${styles['fade-up']}`}>
        <div className={styles['section-hd']}>
          <div className={styles['section-label']}>Advance Invoices</div>
          <button className={styles['section-link']} onClick={() => onAdvanceEdit()}>
            + Add
          </button>
        </div>
        <div className={styles['advance-card']}>
          <div className={styles['advance-card-body']}>
            {advanceInvoices.length > 0 ? (
              advanceInvoices.map((advance) => (
                <div key={advance.id} className={styles['advance-item']}>
                  <div className={styles['advance-item-left']}>
                    <div className={styles['advance-item-label']}>{advance.title}</div>
                    <div className={styles['advance-item-sub']}>{advance.subtitle}</div>
                  </div>
                  <div className={styles['advance-item-amount']}>{advance.amountLabel}</div>
                  <div className={styles['advance-item-actions']}>
                    <button className={styles['mini-btn']} title="Download" onClick={() => onAdvanceDownload(advance.id)}>
                      <Download size={13} strokeWidth={2.5} />
                    </button>
                    <button className={styles['mini-btn']} title="Edit" onClick={() => onAdvanceEdit(advance.id)}>
                      <Pencil size={13} strokeWidth={2.5} />
                    </button>
                    <button
                      className={`${styles['mini-btn']} ${styles.danger}`}
                      title="Remove"
                      onClick={() => onAdvanceRemove(advance.id)}
                    >
                      <XCircle size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text="No advance invoices linked yet." />
            )}
          </div>
        </div>
      </div>

      <div className={`${styles.section} ${styles['fade-up']}`}>
        <div className={styles['section-hd']}>
          <div className={styles['section-label']}>Related Documents</div>
        </div>
        <div className={styles['linked-list']}>
          {relatedDocuments.length > 0 ? (
            relatedDocuments.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles['linked-item']}
                onClick={item.onClick}
                disabled={!item.onClick}
              >
                <div className={`${styles['linked-icon']} ${iconToneClass(item.kind)}`}>
                  {iconForKind(item.kind)}
                </div>
                <div className={styles['linked-body']}>
                  <div className={styles['linked-title']}>{item.title}</div>
                  <div className={styles['linked-sub']}>{item.subtitle}</div>
                </div>
                <div className={styles['linked-chev']}>
                  <ChevronRight size={14} strokeWidth={2} />
                </div>
              </button>
            ))
          ) : (
            <EmptyState text="No linked documents yet." />
          )}
        </div>
      </div>

      <div className={`${styles.section} ${styles['fade-up']}`}>
        <div className={styles['section-hd']}>
          <div className={styles['section-label']}>Attachments</div>
        </div>
        <div className={styles['attachments-scroller']}>
          {attachments.length > 0 ? (
            attachments.map((attachment) => (
              <div key={attachment.id} className={styles['attach-chip']}>
                {attachment.label.toLowerCase().endsWith('.pdf') ? (
                  <FileText size={12} strokeWidth={2} />
                ) : (
                  <Paperclip size={12} strokeWidth={2} />
                )}
                {attachment.label}
              </div>
            ))
          ) : (
            <EmptyState text="No attachments linked." />
          )}
        </div>
      </div>
      <div style={{ height: 32 }} />
    </>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className={styles['doc-footer-text']}>{text}</div>
}

function iconToneClass(kind: LinkedDocumentItem['kind']) {
  if (kind === 'quotation') return styles.quote
  if (kind === 'csr') return styles.csr
  if (kind === 'project') return styles.project
  return styles.quote
}

function iconForKind(kind: LinkedDocumentItem['kind']) {
  if (kind === 'csr') return <CheckCircle2 size={15} strokeWidth={2} />
  if (kind === 'project') return <Briefcase size={15} strokeWidth={2} />
  return <FileText size={15} strokeWidth={2} />
}
