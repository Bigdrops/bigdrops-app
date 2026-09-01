import {
  Lock,
  Zap,
  Link,
  Copy,
  Download,
  Archive,
  Trash2,
} from 'lucide-react'
import DocumentMoreSheet from '../shared/DocumentMoreSheet'

interface RfqMoreSheetProps {
  open: boolean
  onClose: () => void
  onMarkAsClosed: () => void
  onConvertToQuotation: () => void
  onLinkProject: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
  onExportCsv: () => void
  onArchive: () => void
  onDelete: () => void
}

export default function RfqMoreSheet({
  open,
  onClose,
  onMarkAsClosed,
  onConvertToQuotation,
  onLinkProject,
  onDuplicate,
  onCopyNumber,
  onExportCsv,
  onArchive,
  onDelete,
}: RfqMoreSheetProps) {
  const sections = [
    {
      title: 'Lifecycle',
      items: [
        {
          id: 'mark-closed',
          label: 'Mark as Closed / Cancelled',
          description: 'Close this RFQ so no further responses are expected',
          icon: <Lock size={18} />,
          onClick: onMarkAsClosed,
        },
        {
          id: 'generate-quotation',
          label: 'Generate Quotation',
          description: 'Create a quote supplying these requested items',
          icon: <Zap size={18} />,
          onClick: onConvertToQuotation,
        },
      ],
    },
    {
      title: 'Common Actions',
      items: [
        {
          id: 'link-project',
          label: 'Link to Project',
          description: 'Associate this request with a project',
          icon: <Link size={18} />,
          onClick: onLinkProject,
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          description: 'Create a copy of this request',
          icon: <Copy size={18} />,
          onClick: onDuplicate,
        },
        {
          id: 'copy-number',
          label: 'Copy RFQ Number',
          description: 'Copy the document reference number',
          icon: <Copy size={18} />,
          onClick: onCopyNumber,
        },
        {
          id: 'export-csv',
          label: 'Export as CSV',
          description: 'Download requested items as spreadsheet',
          icon: <Download size={18} />,
          onClick: onExportCsv,
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          id: 'archive',
          label: 'Archive RFQ',
          description: 'Remove from active lists, keep on record',
          icon: <Archive size={18} />,
          onClick: onArchive,
        },
        {
          id: 'delete',
          label: 'Delete RFQ',
          description: 'Permanently remove this request',
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
      title="RFQ Actions"
      sections={sections}
    />
  )
}
