import {
  Send,
  CheckCircle2,
  XCircle,
  Zap,
  Link,
  Copy,
  DownloadCloud,
  Archive,
  Trash2,
} from 'lucide-react'
import DocumentMoreSheet from '../shared/DocumentMoreSheet'

interface QuotationMoreSheetProps {
  open: boolean
  onClose: () => void
  onMarkAsSent: () => void
  onMarkAsAccepted: () => void
  onMarkAsRejected: () => void
  onConvertToInvoice: () => void
  onLinkProject: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
  onExportCsv: () => void
  onArchive: () => void
  onDelete: () => void
}

export default function QuotationMoreSheet({
  open,
  onClose,
  onMarkAsSent,
  onMarkAsAccepted,
  onMarkAsRejected,
  onConvertToInvoice,
  onLinkProject,
  onDuplicate,
  onCopyNumber,
  onExportCsv,
  onArchive,
  onDelete,
}: QuotationMoreSheetProps) {
  const sections = [
    {
      title: 'Lifecycle',
      items: [
        {
          id: 'mark-sent',
          label: 'Mark as Sent',
          description: 'Log that this quotation was delivered to client',
          icon: <Send size={18} />,
          onClick: onMarkAsSent,
        },
        {
          id: 'mark-accepted',
          label: 'Mark as Accepted',
          description: 'Client has approved this quotation',
          icon: <CheckCircle2 size={18} />,
          onClick: onMarkAsAccepted,
        },
        {
          id: 'mark-rejected',
          label: 'Mark as Rejected',
          description: 'Client has declined this quotation',
          icon: <XCircle size={18} />,
          onClick: onMarkAsRejected,
        },
        {
          id: 'convert-invoice',
          label: 'Convert to Invoice',
          description: 'Generate a billing invoice from this data',
          icon: <Zap size={18} />,
          onClick: onConvertToInvoice,
        },
      ],
    },
    {
      title: 'Common Actions',
      items: [
        {
          id: 'link-project',
          label: 'Link to Project',
          description: 'Associate this quotation with a project',
          icon: <Link size={18} />,
          onClick: onLinkProject,
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          description: 'Create a copy of this quotation',
          icon: <Copy size={18} />,
          onClick: onDuplicate,
        },
        {
          id: 'copy-number',
          label: 'Copy Quotation Number',
          description: 'Copy the document reference number',
          icon: <Copy size={18} />,
          onClick: onCopyNumber,
        },
        {
          id: 'export-csv',
          label: 'Export as CSV',
          description: 'Download line items as spreadsheet',
          icon: <DownloadCloud size={18} />,
          onClick: onExportCsv,
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          id: 'archive',
          label: 'Archive Quotation',
          description: 'Remove from active lists, keep on record',
          icon: <Archive size={18} />,
          onClick: onArchive,
        },
        {
          id: 'delete',
          label: 'Delete Quotation',
          description: 'Permanently remove this document',
          icon: <Trash2 size={18} />,
          destructive: true,
          onClick: onDelete,
        },
      ],
    },
  ]

  return (
    <DocumentMoreSheet
      open={open}
      onClose={onClose}
      title="Quotation Actions"
      sections={sections}
    />
  )
}

