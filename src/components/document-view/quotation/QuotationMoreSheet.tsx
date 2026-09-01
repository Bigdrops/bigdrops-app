import {
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
          id: 'convert-invoice',
          label: 'Convert to Invoice',

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

          icon: <Link size={18} />,
          onClick: onLinkProject,
        },
        {
          id: 'duplicate',
          label: 'Duplicate',

          icon: <Copy size={18} />,
          onClick: onDuplicate,
        },
        {
          id: 'copy-number',
          label: 'Copy Quotation Number',

          icon: <Copy size={18} />,
          onClick: onCopyNumber,
        },
        {
          id: 'export-csv',
          label: 'Export as CSV',

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
