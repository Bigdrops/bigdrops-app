import type { ReactNode } from 'react'

import {
  Banknote,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Download,
  FileBadge2,
  FileText,
  Paperclip,
  Pencil,
} from 'lucide-react'

import styles from './InvoicePresentation.module.css'

type PaymentHistoryItem = {
  id: string
  amountLabel: string
  dateLabel: string
  methodLabel: string
  referenceLabel?: string
  kind?: 'cash' | 'wht'
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

type AdvanceInvoiceItem = {
  id: string
  title: string
  subtitle: string
  amountLabel: string
}

interface InvoiceViewPageProps {
  documentPreview: ReactNode
  paymentSummary: Array<{ label: string; value: string; tone?: 'default' | 'green' | 'amber' }>
  paymentProgressLabel: string
  paymentProgressWidth: string
  paymentHistory: PaymentHistoryItem[]
  advanceInvoices: AdvanceInvoiceItem[]
  relatedDocuments: LinkedDocumentItem[]
  attachments: AttachmentItem[]
  onRecordPayment: () => void
  onEdit: () => void
  onDownload: () => void
  canRecordPayment?: boolean
}

export default function InvoiceViewPage({
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
  onDownload,
  canRecordPayment = true,
}: InvoiceViewPageProps) {
  const progressParts = paymentProgressLabel.split(' · ').filter(Boolean)

  return (
    <>
      <div className={`${styles['action-row']} ${styles['fade-up']}`}>
        <button className={`${styles.btn} ${styles['btn-outline']}`} onClick={onEdit} type="button">
          <Pencil size={15} strokeWidth={2} />
          Edit
        </button>
        <button
          className={`${styles.btn} ${styles['btn-amber']}`}
          onClick={onRecordPayment}
          type="button"
          disabled={!canRecordPayment}
        >
          <Banknote size={15} strokeWidth={2.4} />
          {canRecordPayment ? 'Record Payment' : 'Settled'}
        </button>
        <button className={`${styles.btn} ${styles['btn-outline']}`} onClick={onDownload} type="button">
          <Download size={15} strokeWidth={2.2} />
          Download
        </button>
      </div>

      <section className={`${styles.section} ${styles['fade-up']}`}>
        <div className={styles['section-hd']}>
          <div>
            <div className={styles['section-label']}>Invoice Body</div>
            <div className={styles['section-title']}>The document remains the main event</div>
          </div>
        </div>

        <div className={styles['document-stage']}>
          <div className={styles['document-stage-header']}>
            <div>
              <div className={styles['document-stage-title']}>Invoice Reader</div>
              <div className={styles['document-stage-sub']}>
                Clean, print-minded presentation with the invoice content centered above all supporting detail.
              </div>
            </div>
          </div>

          <div className={styles['document-stage-body']}>{documentPreview}</div>
        </div>
      </section>

      <section className={`${styles.section} ${styles['fade-up']}`}>
        <div className={styles['section-hd']}>
          <div>
            <div className={styles['section-label']}>Supporting Details</div>
            <div className={styles['section-title']}>Commercial context stays below the document</div>
          </div>
        </div>

        <div className={styles['support-card']}>
          <div className={styles['support-header']}>
            <div>
              <div className={styles['support-title']}>Payment Summary</div>
              <div className={styles['support-subtitle']}>A quieter overview of what has been settled and what remains.</div>
            </div>
            <button className={styles['section-link']} onClick={onRecordPayment} type="button" disabled={!canRecordPayment}>
              {canRecordPayment ? 'Record payment' : 'Fully settled'}
            </button>
          </div>

          <div className={styles['payment-summary-grid']}>
            {paymentSummary.map((item) => (
              <div key={item.label} className={styles['pay-sum-cell']}>
                <div className={styles['pay-sum-lbl']}>{item.label}</div>
                <div
                  className={[
                    styles['pay-sum-val'],
                    item.tone === 'green' ? styles.green : '',
                    item.tone === 'amber' ? styles.amber : '',
                  ].join(' ')}
                >
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
              {progressParts.map((text) => (
                <span key={text}>{text}</span>
              ))}
            </div>
          </div>

          <div className={styles['payment-hist']}>
            {paymentHistory.length > 0 ? (
              paymentHistory.map((payment) => (
                <div key={payment.id} className={styles['pay-hist-item']}>
                  <div className={`${styles['pay-hist-icon']} ${payment.kind === 'wht' ? styles.wht : ''}`}>
                    {payment.kind === 'wht' ? (
                      <FileBadge2 size={14} strokeWidth={2.4} />
                    ) : (
                      <CheckCircle2 size={14} strokeWidth={2.4} />
                    )}
                  </div>
                  <div className={styles['pay-hist-body']}>
                    <div className={styles['pay-hist-method']}>{payment.methodLabel}</div>
                    {payment.referenceLabel ? <div className={styles['pay-hist-ref']}>{payment.referenceLabel}</div> : null}
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

        <div className={styles['support-grid']}>
          <SupportCard
            title="Related Documents"
            subtitle="Source records, downstream documents, and linked project context."
            body={
              relatedDocuments.length > 0 ? (
                <div className={styles['linked-list']}>
                  {relatedDocuments.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={styles['linked-item']}
                      onClick={item.onClick}
                      disabled={!item.onClick}
                    >
                      <div className={`${styles['linked-icon']} ${iconToneClass(item.kind)}`}>{iconForKind(item.kind)}</div>
                      <div className={styles['linked-body']}>
                        <div className={styles['linked-title']}>{item.title}</div>
                        <div className={styles['linked-sub']}>{item.subtitle}</div>
                      </div>
                      <div className={styles['linked-chev']}>
                        <ChevronRight size={14} strokeWidth={2} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState text="No linked documents yet." />
              )
            }
          />

          <SupportCard
            title="Attachments"
            subtitle="Reference files and external materials attached to this invoice."
            body={
              attachments.length > 0 ? (
                <div className={styles['attachments-list']}>
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className={styles['attach-chip']}>
                      {attachment.label.toLowerCase().endsWith('.pdf') ? (
                        <FileText size={12} strokeWidth={2} />
                      ) : (
                        <Paperclip size={12} strokeWidth={2} />
                      )}
                      {attachment.label}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="No attachments linked." />
              )
            }
          />

          {advanceInvoices.length > 0 ? (
            <SupportCard
              title="Advance Invoice Info"
              subtitle="Advance-specific context stays visible without competing with the main document."
              body={
                <div className={styles['advance-list']}>
                  {advanceInvoices.map((advance) => (
                    <div key={advance.id} className={styles['advance-item']}>
                      <div className={styles['advance-item-left']}>
                        <div className={styles['advance-item-label']}>{advance.title}</div>
                        <div className={styles['advance-item-sub']}>{advance.subtitle}</div>
                      </div>
                      <div className={styles['advance-item-amount']}>{advance.amountLabel}</div>
                    </div>
                  ))}
                </div>
              }
            />
          ) : null}
        </div>
      </section>
    </>
  )
}

function SupportCard({
  title,
  subtitle,
  body,
}: {
  title: string
  subtitle: string
  body: ReactNode
}) {
  return (
    <div className={styles['support-card']}>
      <div className={styles['support-header']}>
        <div>
          <div className={styles['support-title']}>{title}</div>
          <div className={styles['support-subtitle']}>{subtitle}</div>
        </div>
      </div>
      {body}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className={styles['support-empty']}>{text}</div>
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
