import type { ReactNode } from 'react'
import styles from './InvoicePresentation.module.css'
import {
  Send,
  RotateCcw,
  Truck,
  Banknote,
  Zap,
  Link,
  Paperclip,
  Copy,
  DownloadCloud,
  Archive,
  Trash2,
} from 'lucide-react'

interface InvoiceMoreSheetProps {
  open: boolean
  onClose: () => void
  onMarkAsSent: () => void
  onRevert: () => void
  onGenerateWaybill: () => void
  onRecordPayment: () => void
  onAdvanceInvoice: () => void
  onLinkProject: () => void
  onAttachDocument: () => void
  onCopyNumber: () => void
  onExportCsv: () => void
  onArchive: () => void
  onDelete: () => void
}

export default function InvoiceMoreSheet({
  open,
  onClose,
  onMarkAsSent,
  onRevert,
  onGenerateWaybill,
  onRecordPayment,
  onAdvanceInvoice,
  onLinkProject,
  onAttachDocument,
  onCopyNumber,
  onExportCsv,
  onArchive,
  onDelete,
}: InvoiceMoreSheetProps) {
  if (!open) return null

  const SectionLabel = ({ children }: { children: ReactNode }) => (
    <div className={styles['sheet-section-lbl']}>{children}</div>
  )

  const Divider = () => <div className={styles['sheet-divider']} />

  const Action = ({
    icon,
    label,
    desc,
    danger,
    onClick,
  }: {
    icon: ReactNode
    label: string
    desc: string
    danger?: boolean
    onClick: () => void
  }) => (
    <button
      type="button"
      className={`${styles['sheet-action']} ${danger ? styles.danger : ''}`}
      onClick={() => {
        onClick()
        onClose()
      }}
    >
      <div className={styles['sa-icon']}>{icon}</div>
      <div className={styles['sa-body']}>
        <div className={styles['sa-lbl']}>{label}</div>
        <div className={styles['sa-desc']}>{desc}</div>
      </div>
    </button>
  )

  return (
    <>
      <div className={`${styles.overlay} ${styles.open}`} onClick={onClose} />
      <div className={`${styles.sheet} ${styles.open}`}>
        <div className={styles['sheet-handle']} />
        <div className={styles['sheet-title']}>More Actions</div>

        <SectionLabel>Lifecycle</SectionLabel>
        <Action
          label="Mark as Sent"
          desc="Log that this invoice was delivered to client"
          icon={<Send size={16} strokeWidth={2} />}
          onClick={onMarkAsSent}
        />
        <Action
          label="Revert to Quotation"
          desc="Convert this invoice back to a draft quotation"
          icon={<RotateCcw size={16} strokeWidth={2} />}
          onClick={onRevert}
        />
        <Action
          label="Generate Waybill"
          desc="Create a delivery waybill linked to this invoice"
          icon={<Truck size={16} strokeWidth={2} />}
          onClick={onGenerateWaybill}
        />

        <Divider />
        <SectionLabel>Payments & Advances</SectionLabel>
        <Action
          label="Record Payment"
          desc="Add a new payment against this invoice"
          icon={<Banknote size={16} strokeWidth={2} />}
          onClick={onRecordPayment}
        />
        <Action
          label="Advance Invoice"
          desc="Create a partial/advance invoice"
          icon={<Zap size={16} strokeWidth={2} />}
          onClick={onAdvanceInvoice}
        />

        <Divider />
        <SectionLabel>Links & Attachments</SectionLabel>
        <Action
          label="Link to Project"
          desc="Associate this invoice with a project"
          icon={<Link size={16} strokeWidth={2} />}
          onClick={onLinkProject}
        />
        <Action
          label="Attach / Link Document"
          desc="Upload or link a document to this invoice"
          icon={<Paperclip size={16} strokeWidth={2} />}
          onClick={onAttachDocument}
        />

        <Divider />
        <SectionLabel>Document</SectionLabel>
        <Action
          label="Copy Invoice Number"
          desc="Copy the document reference number"
          icon={<Copy size={16} strokeWidth={2} />}
          onClick={onCopyNumber}
        />
        <Action
          label="Export as CSV"
          desc="Download line items as spreadsheet"
          icon={<DownloadCloud size={16} strokeWidth={2} />}
          onClick={onExportCsv}
        />

        <Divider />
        <SectionLabel>Danger</SectionLabel>
        <Action
          label="Archive Invoice"
          desc="Remove from active lists, keep on record"
          icon={<Archive size={16} strokeWidth={2} />}
          onClick={onArchive}
        />
        <Action
          danger
          label="Delete Invoice"
          desc="Permanently remove this document"
          icon={<Trash2 size={16} strokeWidth={2} />}
          onClick={onDelete}
        />
      </div>
    </>
  )
}
