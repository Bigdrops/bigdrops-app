export type QuotationListActionDef = {
  key: string
  label: string
  iconKey: string
  closeOnClick?: boolean
  visible: boolean
}

/**
 * Quotation list three-dot sheet actions, in grid order.
 *
 * Grid contract (six tiles, two rows):
 *   Row 1: Convert to Invoice | Edit | Link to Project
 *   Row 2: Link Documents     | Clone | Archive
 *
 * Delete Quotation stays a separate destructive action owned by the sheet.
 * Mirrors `getInvoiceListActionDefs`; the component maps iconKey → icon and
 * key → handler so no conversion or navigation logic lives here.
 */
export function getQuotationListActionDefs({
  projectActionLabel,
  hasProject,
  documentActionLabel,
  hasLinkedDocuments,
}: {
  projectActionLabel: string
  hasProject: boolean
  documentActionLabel: string
  hasLinkedDocuments: boolean
}): QuotationListActionDef[] {
  const actions: QuotationListActionDef[] = [
    // closeOnClick:false keeps the selected quotation alive so the shared
    // confirmation dialog can show its loading state, matching Archive.
    { key: 'convert', label: 'Convert to Invoice', iconKey: 'convert', closeOnClick: false, visible: true },
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
    { key: 'clone', label: 'Clone', iconKey: 'copy', visible: true },
    { key: 'archive', label: 'Archive', iconKey: 'archive', closeOnClick: false, visible: true },
  ]

  return actions.filter((action) => action.visible)
}
