import { DocumentPrimaryActionRow, DocumentPrimaryButton } from '../shared/DocumentActionButtons'

interface CsrPrimaryActionsProps {
  onComplete: () => void
  onEdit: () => void
  onDownload?: () => void
  downloading?: boolean
}

export default function CsrPrimaryActions({
  onComplete,
  onEdit,
  onDownload,
  downloading,
}: CsrPrimaryActionsProps) {
  return (
    <DocumentPrimaryActionRow>
      <DocumentPrimaryButton variant="amber" onClick={onComplete}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Mark as Completed
      </DocumentPrimaryButton>
      <DocumentPrimaryButton variant="outline" onClick={onEdit}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit
      </DocumentPrimaryButton>
      {onDownload ? (
        <DocumentPrimaryButton variant="outline" onClick={onDownload}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </DocumentPrimaryButton>
      ) : null}
    </DocumentPrimaryActionRow>
  )
}
