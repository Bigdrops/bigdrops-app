import { Icons } from '@/lib/iconRegistry'

export const QUICK_TILE_REGISTRY = {
  invoices: {
    id: 'invoices',
    label: 'Invoices',
    path: '/invoices',
    icon: Icons.invoice,
    description: 'Open invoice records and billing activity',
    tileHint: 'Open module',
    tint: 'bg-bd-status-success-bg border-bd-status-success-border',
    iconBg: 'bg-bd-status-success-text text-white',
  },
  quotations: {
    id: 'quotations',
    label: 'Quotations',
    path: '/quotations',
    icon: Icons.quotation,
    description: 'Review quotations and proposal drafts',
    tileHint: 'Open module',
    tint: 'bg-bd-status-info-bg border-bd-status-info-border',
    iconBg: 'bg-bd-status-info-text text-white',
  },
  csr: {
    id: 'csr',
    label: 'CSR',
    path: '/csr',
    icon: Icons.csr,
    description: 'Open customer service reports',
    tileHint: 'Open module',
    tint: 'bg-bd-status-warning-bg border-bd-status-warning-border',
    iconBg: 'bg-bd-status-warning-text text-white dark:text-slate-950',
  },
  projects: {
    id: 'projects',
    label: 'Projects',
    path: '/projects',
    icon: Icons.projects,
    description: 'Open project workspaces and updates',
    tileHint: 'Open module',
    tint: 'bg-bd-status-info-bg border-bd-status-info-border',
    iconBg: 'bg-bd-status-info-text text-white',
  },
  new_invoice: {
    id: 'new_invoice',
    label: 'New Invoice',
    path: '/invoices/new',
    icon: Icons.invoice,
    description: 'Create and send a sales invoice',
    tileHint: 'Tap to start',
    tint: 'bg-bd-status-success-bg border-bd-status-success-border',
    iconBg: 'bg-bd-status-success-text text-white',
  },
  new_quotation: {
    id: 'new_quotation',
    label: 'New Quotation',
    path: '/quotations/new',
    icon: Icons.quotation,
    description: 'Build a quotation for a client',
    tileHint: 'Tap to start',
    tint: 'bg-bd-status-info-bg border-bd-status-info-border',
    iconBg: 'bg-bd-status-info-text text-white',
  },
  new_csr: {
    id: 'new_csr',
    label: 'New CSR',
    path: '/csr/new',
    icon: Icons.csr,
    description: 'Log a customer service report',
    tileHint: 'Tap to start',
    tint: 'bg-bd-status-warning-bg border-bd-status-warning-border',
    iconBg: 'bg-bd-status-warning-text text-white dark:text-slate-950',
  },
  new_project: {
    id: 'new_project',
    label: 'New Project',
    path: '/projects/new',
    icon: Icons.projects,
    description: 'Start a new project workspace',
    tileHint: 'Tap to start',
    tint: 'bg-bd-status-info-bg border-bd-status-info-border',
    iconBg: 'bg-bd-status-info-text text-white',
  },
  new_rfq: {
    id: 'new_rfq',
    label: 'New RFQ',
    path: '/rfqs/new',
    icon: Icons.rfq,
    description: 'Create a request for quotation',
    tileHint: 'Tap to start',
    tint: 'bg-bd-status-danger-bg border-bd-status-danger-border',
    iconBg: 'bg-bd-status-danger-text text-white',
  },
  waybills: {
    id: 'waybills',
    label: 'Waybills',
    path: '/waybills',
    icon: Icons.waybill,
    description: 'Track dispatches and delivery records',
    tileHint: 'Open module',
    tint: 'bg-bd-status-info-bg border-bd-status-info-border',
    iconBg: 'bg-bd-status-info-text text-white',
  },
  new_waybill: {
    id: 'new_waybill',
    label: 'New Waybill',
    path: '/waybills/new',
    icon: Icons.waybill,
    description: 'Create a dispatch or delivery waybill',
    tileHint: 'Tap to start',
    tint: 'bg-bd-status-info-bg border-bd-status-info-border',
    iconBg: 'bg-bd-status-info-text text-white',
  },
  letters: {
    id: 'letters',
    label: 'Letters',
    path: '/letters',
    icon: Icons.letter,
    description: 'Official correspondence and notices',
    tileHint: 'Open module',
    tint: 'bg-violet-50 border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/30',
    iconBg: 'bg-violet-700 text-white dark:bg-violet-500 dark:text-white',
  },
  new_letter: {
    id: 'new_letter',
    label: 'New Letter',
    path: '/letters/new',
    icon: Icons.letter,
    description: 'Draft an official letter',
    tileHint: 'Tap to start',
    tint: 'bg-violet-50 border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/30',
    iconBg: 'bg-violet-700 text-white dark:bg-violet-500 dark:text-white',
  },
}

export const DEFAULT_CREATE_ACTION_TILES = [
  'new_invoice',
  'new_project',
  'new_rfq',
  'new_quotation',
  'new_csr',
  'new_waybill',
  'new_letter',
]

export function sanitizeQuickTileIds(tileIds) {
  if (!Array.isArray(tileIds)) return []

  const seen = new Set()
  return tileIds.filter((tileId) => {
    if (!QUICK_TILE_REGISTRY[tileId] || seen.has(tileId)) return false
    seen.add(tileId)
    return true
  })
}

// Feeds the FAB / Quick Create popup on the dashboard. The dashboard Quick
// Actions tile grid has been retired; create actions remain in active use.
export function getCreateActions(tileIds = DEFAULT_CREATE_ACTION_TILES) {
  return sanitizeQuickTileIds(tileIds)
    .filter((tileId) => tileId.startsWith('new_'))
    .map((tileId) => QUICK_TILE_REGISTRY[tileId])
    .filter((tile) => {
      if (!tile) return false
      const id = String(tile.id || '').toLowerCase()
      const path = String(tile.path || '').toLowerCase()
      return !id.includes('client') && !path.startsWith('/clients')
    })
}
