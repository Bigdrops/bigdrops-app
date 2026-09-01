import {
  RotateCcw,
  Truck,
  Banknote,
  Zap,
  Link,
  Copy,
  DownloadCloud,
  Archive,
  Trash2,
  Merge,
} from 'lucide-react'
import DocumentMoreSheet from '../shared/DocumentMoreSheet'

interface InvoiceMoreSheetProps {
  open: boolean
  onClose: () => void
  onRevert: () => void
  onGenerateWaybill: () => void
  onRecordPayment: () => void
  onAdvanceInvoice: () => void
  onLinkProject: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
  onExportCsv: () => void
  mergeQtyUnit: boolean
  onToggleMergeQtyUnit: () => void
  onArchive: () => void
  onDelete: () => void
}

export default function InvoiceMoreSheet({
  open,
  onClose,
  onRevert,
  onGenerateWaybill,
  onRecordPayment,
  onAdvanceInvoice,
  onLinkProject,
  onDuplicate,
  onCopyNumber,
  onExportCsv,
  mergeQtyUnit,
  onToggleMergeQtyUnit,
  onArchive,
  onDelete,
}: InvoiceMoreSheetProps) {
  const sections = [
    {
      title: 'Lifecycle',
      items: [
        {
          id: 'revert',
          label: 'Revert to Quotation',
          description: 'Convert this invoice back to an open quotation',
          icon: <RotateCcw size={18} />,
          onClick: onRevert,
        },
        {
          id: 'waybill',
          label: 'Generate Waybill',
          description: 'Create a delivery waybill linked to this invoice',
          icon: <Truck size={18} />,
          onClick: onGenerateWaybill,
        },
      ],
    },
    {
      title: 'Payments & Advances',
      items: [
        {
          id: 'record-payment',
          label: 'Record Payment',
          description: 'Add a new payment against this invoice',
          icon: <Banknote size={18} />,
          onClick: onRecordPayment,
        },
        {
          id: 'advance',
          label: 'Advance Invoice',
          description: 'Create an advance invoice',
          icon: <Zap size={18} />,
          onClick: onAdvanceInvoice,
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
          label: 'Copy Invoice Number',

          icon: <Copy size={18} />,
          onClick: onCopyNumber,
        },
        {
          id: 'export-csv',
          label: 'Export as CSV',

          icon: <DownloadCloud size={18} />,
          onClick: onExportCsv,
        },
        {
          id: 'qty-unit-merge',
          label: 'Qty + Unit merge',
          description: mergeQtyUnit ? 'Currently on for exports and print views' : 'Currently off for exports and print views',
          icon: <Merge size={18} />,
          selected: mergeQtyUnit,
          statusLabel: mergeQtyUnit ? 'On' : 'Off',
          closeOnClick: false,
          onClick: onToggleMergeQtyUnit,
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          id: 'archive',
          label: 'Archive Invoice',
          description: 'Remove from active lists, keep on record',
          icon: <Archive size={18} />,
          onClick: onArchive,
        },
        {
          id: 'delete',
          label: 'Delete Invoice',
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
      title="Invoice Actions"
      sections={sections}
    />
  )
}
