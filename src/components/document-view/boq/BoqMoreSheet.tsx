import type { ReactNode } from 'react'

import DocumentSheet from '../shared/DocumentSheet'

interface BoqMoreSheetProps {
  open: boolean
  onClose: () => void
  onMarkAsIssued: () => void
  onGenerateQuotation: () => void
  onCreateRevision: () => void
  onLinkProject: () => void
  onAttachDocument: () => void
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
  onAttachDocument,
  onCopyNumber,
  onExport,
  onArchive,
  onDelete,
}: BoqMoreSheetProps) {
  const SectionLabel = ({ children }: { children: ReactNode }) => (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#9c9589',
        padding: '16px 8px 8px',
      }}
    >
      {children}
    </div>
  )

  const Divider = () => (
    <div style={{ height: 1, background: '#ede9e1', margin: '8px 0' }} />
  )

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
      onClick={() => {
        onClick()
        onClose()
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 8px',
        border: 'none',
        background: 'none',
        width: '100%',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: danger ? '#fce7f3' : '#f4f2ee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: danger ? '#be185d' : '#57534a',
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: danger ? '#be185d' : '#1a1814' }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: danger ? 'rgba(190,24,93,0.6)' : '#9c9589', marginTop: 2 }}>
          {desc}
        </div>
      </div>
    </button>
  )

  return (
    <DocumentSheet open={open} onClose={onClose} title="More Actions">
      <SectionLabel>Lifecycle</SectionLabel>
      <Action
        label="Mark as Issued / Shared"
        desc="Lock this BOQ and mark it as officially distributed"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        }
        onClick={onMarkAsIssued}
      />
      <Action
        label="Create Revision"
        desc="Duplicate this BOQ as a new revision version"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        }
        onClick={onCreateRevision}
      />
      <Action
        label="Generate Quotation"
        desc="Create a quote supplying these billed items"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        }
        onClick={onGenerateQuotation}
      />

      <Divider />
      <SectionLabel>Links & Attachments</SectionLabel>
      <Action
        label="Link to Project"
        desc="Associate this BOQ with a project/site"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        }
        onClick={onLinkProject}
      />
      <Action
        label="Attach / Link Document"
        desc="Upload master drawings or specifications"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        }
        onClick={onAttachDocument}
      />

      <Divider />
      <SectionLabel>Document</SectionLabel>
      <Action
        label="Copy BOQ Number"
        desc="Copy the document reference number"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        }
        onClick={onCopyNumber}
      />
      <Action
        label="Export as Spreadsheet"
        desc="Download billed items as editable Excel/CSV"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        }
        onClick={onExport}
      />

      <Divider />
      <SectionLabel>Danger</SectionLabel>
      <Action
        label="Archive BOQ"
        desc="Remove from active lists, keep on record"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        }
        onClick={onArchive}
      />
      <Action
        danger
        label="Delete BOQ"
        desc="Permanently remove this bill"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        }
        onClick={onDelete}
      />
    </DocumentSheet>
  )
}
