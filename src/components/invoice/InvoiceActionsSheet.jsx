import { DocumentActionSheet } from '@/components/document/DocumentViewShell'

export default function InvoiceActionsSheet({
  open,
  onOpenChange,
  invoiceNumber,
  actions,
}) {
  return (
    <DocumentActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Invoice Actions"
      subtitle={invoiceNumber}
      actions={actions}
    />
  )
}
