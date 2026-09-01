import {
  Send,
  RefreshCw,
  Zap,
  Link,
  Copy,
  Download,
  Archive,
  Trash2,
} from 'lucide-react'
import DocumentMoreSheet from '../shared/DocumentMoreSheet'

interface BoqMoreSheetProps {
  open: boolean
  onClose: () => void
  onMarkAsIssued: () => void
  onGenerateQuotation: () => void
  onCreateRevision: () => void
  onLinkProject: () => void
  onDuplicate: () => void
  onCopyNumber: () => void
  onExport: () => void
  onArchive: () => void
  onDelete: () => void
}

export default function BoqMoreSheet({
  open,
  onClose,
  onMarkAsIssued,
  onGenerateQuotation,
  onCreateRevision,
  onLinkProject,
  onDuplicate,
  onCopyNumber,
  onExport,
  onArchive,
  onDelete,
}: BoqMoreSheetProps) {
  const sections = [
    {
      title: 'Lifecycle',
      items: [
        {
          id: 'mark-issued',
          label: 'Mark as Issued / Shared',
          description: 'Lock this BOQ and mark it as officially distributed',
          icon: <Send size={18} />,
          onClick: onMarkAsIssued,
        },
        {
          id: 'create-revision',
          label: 'Create Revision',
          description: 'Duplicate this BOQ as a new revision version',
          icon: <RefreshCw size={18} />,
          onClick: onCreateRevision,
        },
        {
          id: 'generate-quotation',
          label: 'Generate Quotation',
          description: 'Create a quote supplying these billed items',
          icon: <Zap size={18} />,
          onClick: onGenerateQuotation,
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
          label: 'Copy BOQ Number',

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
          label: 'Archive BOQ',
          description: 'Remove from active lists, keep on record',
          icon: <Archive size={18} />,
          onClick: onArchive,
        },
        {
          id: 'delete',
          label: 'Delete BOQ',
          description: 'Permanently remove this bill',
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
      title="BOQ Actions"
      sections={sections}
    />
  )
}
