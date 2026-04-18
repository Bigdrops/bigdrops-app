import { DocumentPrimaryActionRow, DocumentPrimaryButton } from '../shared/DocumentActionButtons'

interface InvoicePrimaryActionsProps {
  onRecordPayment: () => void
  onEdit: () => void
}

export default function InvoicePrimaryActions({
  onRecordPayment,
  onEdit,
}: InvoicePrimaryActionsProps) {
  return (
    <DocumentPrimaryActionRow>
      <DocumentPrimaryButton variant="amber" onClick={onRecordPayment}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        Record Payment
      </DocumentPrimaryButton>
      <DocumentPrimaryButton variant="outline" onClick={onEdit}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit
      </DocumentPrimaryButton>
    </DocumentPrimaryActionRow>
  )
}
