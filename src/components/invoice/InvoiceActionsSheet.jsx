import { DocumentActionSheet } from '@/components/document/DocumentViewShell'

export default function InvoiceActionsSheet({
  open,
  onOpenChange,
  invoiceNumber,
  projectActionLabel,
  projectActionSubtitle,
  onProjectAction,
  documentActionLabel,
  documentActionSubtitle,
  onLinkedDocumentsAction,
  showRecordPayment,
  onRecordPayment,
  onExportCsv,
  onCopyInvoiceNumber,
  onCloneInvoice,
  onRevertToQuotation,
  reverting,
  onGenerateCsr,
  onGenerateWaybill,
  showMarkSent,
  onMarkSent,
  onArchiveInvoice,
  onDeleteInvoice,
  hasProject,
  hasLinkedDocuments,
}) {
  const actions = [
    {
      label: projectActionLabel,
      subtitle: projectActionSubtitle,
      onClick: onProjectAction,
      iconKey: hasProject ? 'projectView' : 'projectLink',
    },
    {
      label: documentActionLabel,
      subtitle: documentActionSubtitle,
      onClick: onLinkedDocumentsAction,
      iconKey: hasLinkedDocuments ? 'documentsView' : 'documentsLink',
    },
    ...(showRecordPayment
      ? [{
          label: 'Record Payment',
          subtitle: 'Log cash or WHT received',
          onClick: onRecordPayment,
          iconKey: 'payment',
        }]
      : []),
    { label: 'Export CSV', subtitle: 'Download a spreadsheet copy', onClick: onExportCsv, iconKey: 'export' },
    { label: 'Copy Invoice Number', subtitle: invoiceNumber || 'Copy the current document number', onClick: onCopyInvoiceNumber, iconKey: 'copy' },
    { label: 'Clone Invoice', subtitle: 'Duplicate this invoice as a new draft', onClick: onCloneInvoice, iconKey: 'clone' },
    { label: reverting ? 'Reverting to Quotation...' : 'Revert to Quotation', subtitle: 'Delete this invoice and restore it as a quotation', onClick: onRevertToQuotation, disabled: reverting, iconKey: 'convert' },
    { label: 'Generate CSR', subtitle: 'Create a service report from this invoice', onClick: onGenerateCsr, iconKey: 'export' },
    { label: 'Generate Waybill', subtitle: 'Create a delivery waybill from this invoice', onClick: onGenerateWaybill, iconKey: 'export' },
    ...(showMarkSent
      ? [{ label: 'Mark as Sent', subtitle: 'Move this invoice to sent', onClick: onMarkSent, iconKey: 'convert' }]
      : []),
    { label: 'Archive Invoice', subtitle: 'Move this invoice to archives', onClick: onArchiveInvoice, iconKey: 'archive' },
    { label: 'Delete Invoice', subtitle: 'Permanently remove this invoice', onClick: onDeleteInvoice, danger: true, iconKey: 'delete' },
  ]

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
