import { DocumentPrimaryActionRow, DocumentPrimaryButton } from '../shared/DocumentActionButtons'

interface WaybillPrimaryActionsProps {
  onMarkAsDelivered: () => void
  onEdit: () => void
}

export default function WaybillPrimaryActions({
  onMarkAsDelivered,
  onEdit,
}: WaybillPrimaryActionsProps) {
  return (
    <DocumentPrimaryActionRow>
      <DocumentPrimaryButton variant="amber" onClick={onMarkAsDelivered}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        Confirm Delivery
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
