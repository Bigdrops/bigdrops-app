import * as React from 'react'
import { DocumentActionSheet } from '@/components/document/DocumentViewShell'

interface ActionItem {
  key: string
  label: string
  icon: React.ElementType
  onClick: () => void
  tone?: string
}

interface InvoiceActionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceNumber: string | undefined
  actions: ActionItem[]
}

export default function InvoiceActionsSheet({
  open,
  onOpenChange,
  invoiceNumber,
  actions,
}: InvoiceActionsSheetProps) {
  return (
    <DocumentActionSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Invoice Actions"
      subtitle={invoiceNumber}
      actions={actions as any}
    />
  )
}
