import {
  Activity,
  CheckCircle,
  RotateCcw,
  Link,
  Copy,
  Download,
  Archive,
  Trash2,
} from 'lucide-react'
import DocumentMoreSheet from '../shared/DocumentMoreSheet'

interface CsrMoreSheetProps {
  open: boolean
  onClose: () => void
  onMarkInProgress: () => void
  onMarkAsCompleted: () => void
  onReopenRecord: () => void
  onLinkProject: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
  onExport: () => void
  onArchive: () => void
  onDelete: () => void
}

export default function CsrMoreSheet({
  open,
  onClose,
  onMarkInProgress,
  onMarkAsCompleted,
  onReopenRecord,
  onLinkProject,
  onDuplicate,
  onCopyNumber,
  onExport,
  onArchive,
  onDelete,
}: CsrMoreSheetProps) {
  const sections = [
    {
      title: 'Lifecycle',
      items: [
        {
          id: 'mark-in-progress',
          label: 'Mark as In Progress',
          description: 'Update status to indicate work has started',
          icon: <Activity size={18} />,
          onClick: onMarkInProgress,
        },
        {
          id: 'mark-completed',
          label: 'Mark as Completed',
          description: 'Close the service record',
          icon: <CheckCircle size={18} />,
          onClick: onMarkAsCompleted,
        },
        {
          id: 'reopen',
          label: 'Reopen Record',
          description: 'Reopen record for further investigation',
          icon: <RotateCcw size={18} />,
          onClick: onReopenRecord,
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
          label: 'Copy CSR Number',

          icon: <Copy size={18} />,
          onClick: onCopyNumber,
        },
        {
          id: 'export',
          label: 'Export Document',

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
          label: 'Archive Record',
          description: 'Remove from active lists, keep on record',
          icon: <Archive size={18} />,
          onClick: onArchive,
        },
        {
          id: 'delete',
          label: 'Delete Record',
          description: 'Permanently remove this CSR',
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
      title="CSR Actions"
      sections={sections}
    />
  )
}
