import {
  Truck,
  CheckCircle,
  RotateCcw,
  Link,
  Copy,
  Download,
  Archive,
  Trash2,
} from 'lucide-react'
import DocumentMoreSheet from '../shared/DocumentMoreSheet'

interface WaybillMoreSheetProps {
  open: boolean
  onClose: () => void
  onMarkAsDispatched: () => void
  onMarkAsDelivered: () => void
  onMarkAsReturned: () => void
  onLinkProject: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
  onExport: () => void
  onArchive: () => void
  onDelete: () => void
}

export default function WaybillMoreSheet({
  open,
  onClose,
  onMarkAsDispatched,
  onMarkAsDelivered,
  onMarkAsReturned,
  onLinkProject,
  onDuplicate,
  onCopyNumber,
  onExport,
  onArchive,
  onDelete,
}: WaybillMoreSheetProps) {
  const sections = [
    {
      title: 'Lifecycle',
      items: [
        {
          id: 'mark-dispatched',
          label: 'Mark as Dispatched',
          description: 'Update status to indicate en route',
          icon: <Truck size={18} />,
          onClick: onMarkAsDispatched,
        },
        {
          id: 'confirm-delivery',
          label: 'Confirm Delivery',
          description: 'Log this waybill as successfully completed',
          icon: <CheckCircle size={18} />,
          onClick: onMarkAsDelivered,
        },
        {
          id: 'mark-returned',
          label: 'Mark as Returned',
          description: 'Fail the delivery or mark as rejected',
          icon: <RotateCcw size={18} />,
          onClick: onMarkAsReturned,
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
          label: 'Copy Waybill Number',

          icon: <Copy size={18} />,
          onClick: onCopyNumber,
        },
        {
          id: 'export',
          label: 'Export as Spreadsheet',

          icon: <Download size={18} />,
          onClick: onExport,
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          id: 'archive',
          label: 'Archive Waybill',
          description: 'Remove from active lists, keep on record',
          icon: <Archive size={18} />,
          onClick: onArchive,
        },
        {
          id: 'delete',
          label: 'Delete Waybill',
          description: 'Permanently remove this record',
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
      title="Waybill Actions"
      sections={sections}
    />
  )
}
