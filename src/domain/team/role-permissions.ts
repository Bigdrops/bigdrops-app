export type PermissionPair = { resource: string; action: string }

// Keep aligned with _perm_pair_is_canonical() in the M8 migration.
export const ROLE_ACTIONS = ['view', 'create', 'edit', 'delete'] as const
export const ROLE_RESOURCES = [
  ['*', 'All company resources'],
  ['project', 'Projects'], ['project_document', 'Project documents'],
  ['invoice', 'Invoices'], ['quotation', 'Quotations'], ['client', 'Clients'],
  ['rfq', 'RFQs'], ['boq', 'BOQs'], ['waybill', 'Waybills'], ['csr', 'CSR'],
  ['item', 'Items'], ['payment', 'Payments'], ['receipt', 'Receipts'],
  ['letter', 'Letters'], ['setting', 'Company settings'], ['signatory', 'Signatories'],
  ['bank_account', 'Bank accounts'], ['tax_setting', 'Tax settings'],
  ['account', 'Accounts'], ['period', 'Periods'], ['journal', 'Journals'],
  ['source_transaction', 'Source transactions'], ['audit', 'Audit'], ['device', 'Devices'],
] as const

export function permissionCovers(row: PermissionPair, pair: PermissionPair): boolean {
  return (row.resource === '*' || row.resource === pair.resource) &&
    (row.action === '*' || row.action === pair.action)
}

export function categoryState(items: PermissionPair[], resource: string): 'None' | 'Partial' | 'All' {
  const count = ROLE_ACTIONS.filter(action => items.some(p => p.resource === resource && p.action === action)).length
  return count === 0 ? 'None' : count === ROLE_ACTIONS.length ? 'All' : 'Partial'
}

export function markCategory(
  items: PermissionPair[], resource: string, includeDelete: boolean,
  canGrant: (pair: PermissionPair) => boolean,
): PermissionPair[] {
  const next = items.filter(p => p.resource !== resource || !canGrant(p))
  for (const action of ROLE_ACTIONS) {
    const pair = { resource, action }
    if ((includeDelete || action !== 'delete') && canGrant(pair)) next.push(pair)
  }
  return next
}

export function removedPermissions(before: PermissionPair[], after: PermissionPair[]): PermissionPair[] {
  return before.filter(pair => !after.some(row => permissionCovers(row, pair)))
}
