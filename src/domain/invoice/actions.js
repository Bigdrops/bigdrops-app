export function getInvoiceDetailActionDefs({
  invoiceNumber,
  projectActionLabel,
  projectActionSubtitle,
  hasProject,
  documentActionLabel,
  documentActionSubtitle,
  hasLinkedDocuments,
  canRecordPayment,
  reverting,
  showMarkSent,
  isStandalone,
}) {
  const actions = [
    {
      key: 'project',
      label: projectActionLabel,
      subtitle: projectActionSubtitle,
      iconKey: hasProject ? 'projectView' : 'projectLink',
      visible: true,
    },
    {
      key: 'documents',
      label: documentActionLabel,
      subtitle: documentActionSubtitle,
      iconKey: hasLinkedDocuments ? 'documentsView' : 'documentsLink',
      visible: true,
    },
    {
      key: 'payment',
      label: 'Record Payment',
      subtitle: 'Log cash or WHT received',
      iconKey: 'payment',
      visible: canRecordPayment,
    },
    {
      key: 'export',
      label: 'Export CSV',
      subtitle: 'Download a spreadsheet copy',
      iconKey: 'export',
      visible: true,
    },
    {
      key: 'copy-number',
      label: 'Copy Invoice Number',
      subtitle: invoiceNumber || 'Copy the current document number',
      iconKey: 'copy',
      visible: true,
    },
    {
      key: 'advance',
      label: 'Advance Invoice',
      subtitle: 'Create a child advance invoice from this source',
      iconKey: 'payment',
      visible: isStandalone,
    },
    {
      key: 'clone',
      label: 'Clone Invoice',
      subtitle: 'Duplicate this invoice as a new draft',
      iconKey: 'clone',
      visible: true,
    },
    {
      key: 'revert',
      label: reverting ? 'Reverting to Quotation...' : 'Revert to Quotation',
      subtitle: 'Delete this invoice and restore it as a quotation',
      iconKey: 'convert',
      disabled: reverting,
      visible: true,
    },
    {
      key: 'generate-csr',
      label: 'Generate CSR',
      subtitle: 'Create a service report from this invoice',
      iconKey: 'export',
      visible: true,
    },
    {
      key: 'generate-waybill',
      label: 'Generate Waybill',
      subtitle: 'Create a delivery waybill from this invoice',
      iconKey: 'export',
      visible: true,
    },
    {
      key: 'mark-sent',
      label: 'Mark as Sent',
      subtitle: 'Move this invoice to sent',
      iconKey: 'convert',
      visible: showMarkSent,
    },
    {
      key: 'archive',
      label: 'Archive Invoice',
      subtitle: 'Move this invoice to archives',
      iconKey: 'archive',
      visible: true,
    },
    {
      key: 'delete',
      label: 'Delete Invoice',
      subtitle: 'Permanently remove this invoice',
      iconKey: 'delete',
      danger: true,
      visible: true,
    },
  ]

  return actions.filter((action) => action.visible)
}

export function getInvoiceListActionDefs({
  projectActionLabel,
  hasProject,
  documentActionLabel,
  hasLinkedDocuments,
  isPaid,
  isStandalone,
  showMarkSent,
}) {
  const actions = [
    { key: 'view', label: 'View', iconKey: 'eye', visible: true },
    { key: 'edit', label: 'Edit', iconKey: 'pencil', visible: true },
    {
      key: 'project',
      label: projectActionLabel,
      iconKey: hasProject ? 'folderOpen' : 'folderPlus',
      closeOnClick: hasProject,
      visible: true,
    },
    {
      key: 'documents',
      label: documentActionLabel,
      iconKey: hasLinkedDocuments ? 'workflow' : 'gitBranchPlus',
      closeOnClick: false,
      visible: true,
    },
    { key: 'payment', label: 'Payment', iconKey: 'dollarSign', visible: !isPaid },
    { key: 'clone', label: 'Clone', iconKey: 'copy', visible: true },
    { key: 'advance', label: 'Advance Invoice', iconKey: 'dollarSign', visible: isStandalone },
    { key: 'quote', label: 'To Quote', iconKey: 'fileOutput', visible: true },
    { key: 'csr', label: 'Gen. CSR', iconKey: 'wrench', visible: true },
    { key: 'waybill', label: 'Waybill', iconKey: 'truck', visible: true },
    { key: 'mark-sent', label: 'Mark Sent', iconKey: 'send', visible: showMarkSent },
    { key: 'archive', label: 'Archive', iconKey: 'archive', closeOnClick: false, visible: true },
  ]

  return actions.filter((action) => action.visible)
}

export function getInvoiceListDeleteActionDef() {
  return {
    key: 'delete',
    label: 'Delete Invoice',
    iconKey: 'trash',
    closeOnClick: false,
  }
}
