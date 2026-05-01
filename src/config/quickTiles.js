import { Icons } from '@/lib/iconRegistry'

export const QUICK_TILE_STORAGE_KEY = 'quick_tiles'
export const QUICK_TILE_COUNT = 4

export const QUICK_TILE_REGISTRY = {
  invoices: {
    id: 'invoices',
    label: 'Invoices',
    path: '/invoices',
    icon: Icons.invoice,
    description: 'Open invoice records and billing activity',
    tileHint: 'Open module',
    tint: 'bg-[hsl(var(--bd-status-success-bg))] border-[hsl(var(--bd-status-success-border))]',
    iconBg: 'bg-[hsl(var(--bd-status-success-text))] text-[hsl(var(--bd-status-success-bg))] dark:text-white',
  },
  quotations: {
    id: 'quotations',
    label: 'Quotations',
    path: '/quotations',
    icon: Icons.quotation,
    description: 'Review quotations and proposal drafts',
    tileHint: 'Open module',
    tint: 'bg-[hsl(var(--bd-status-info-bg))] border-[hsl(var(--bd-status-info-border))]',
    iconBg: 'bg-[hsl(var(--bd-status-info-text))] text-[hsl(var(--bd-status-info-bg))] dark:text-white',
  },
  csr: {
    id: 'csr',
    label: 'CSR',
    path: '/csr',
    icon: Icons.csr,
    description: 'Open customer service reports',
    tileHint: 'Open module',
    tint: 'bg-[hsl(var(--bd-status-warning-bg))] border-[hsl(var(--bd-status-warning-border))]',
    iconBg: 'bg-[hsl(var(--bd-status-warning-text))] text-[hsl(var(--bd-status-warning-bg))] dark:text-slate-950',
  },
  projects: {
    id: 'projects',
    label: 'Projects',
    path: '/projects',
    icon: Icons.projects,
    description: 'Open project workspaces and updates',
    tileHint: 'Open module',
    tint: 'bg-[hsl(var(--bd-status-info-bg))] border-[hsl(var(--bd-status-info-border))]',
    iconBg: 'bg-[hsl(var(--bd-status-info-text))] text-[hsl(var(--bd-status-info-bg))] dark:text-white',
  },
  new_invoice: {
    id: 'new_invoice',
    label: 'New Invoice',
    path: '/invoices/new',
    icon: Icons.invoice,
    description: 'Create and send a sales invoice',
    tileHint: 'Tap to start',
    tint: 'bg-[hsl(var(--bd-status-success-bg))] border-[hsl(var(--bd-status-success-border))]',
    iconBg: 'bg-[hsl(var(--bd-status-success-text))] text-[hsl(var(--bd-status-success-bg))] dark:text-white',
  },
  new_quotation: {
    id: 'new_quotation',
    label: 'New Quotation',
    path: '/quotations/new',
    icon: Icons.quotation,
    description: 'Build a quotation for a client',
    tileHint: 'Tap to start',
    tint: 'bg-[hsl(var(--bd-status-info-bg))] border-[hsl(var(--bd-status-info-border))]',
    iconBg: 'bg-[hsl(var(--bd-status-info-text))] text-[hsl(var(--bd-status-info-bg))] dark:text-white',
  },
  new_csr: {
    id: 'new_csr',
    label: 'New CSR',
    path: '/csr/new',
    icon: Icons.csr,
    description: 'Log a customer service report',
    tileHint: 'Tap to start',
    tint: 'bg-[hsl(var(--bd-status-warning-bg))] border-[hsl(var(--bd-status-warning-border))]',
    iconBg: 'bg-[hsl(var(--bd-status-warning-text))] text-[hsl(var(--bd-status-warning-bg))] dark:text-slate-950',
  },
  new_project: {
    id: 'new_project',
    label: 'New Project',
    path: '/projects/new',
    icon: Icons.projects,
    description: 'Start a new project workspace',
    tileHint: 'Tap to start',
    tint: 'bg-[hsl(var(--bd-status-info-bg))] border-[hsl(var(--bd-status-info-border))]',
    iconBg: 'bg-[hsl(var(--bd-status-info-text))] text-[hsl(var(--bd-status-info-bg))] dark:text-white',
  },
  new_rfq: {
    id: 'new_rfq',
    label: 'New RFQ',
    path: '/rfqs/new',
    icon: Icons.rfq,
    description: 'Create a request for quotation',
    tileHint: 'Tap to start',
    tint: 'bg-[hsl(var(--bd-status-danger-bg))] border-[hsl(var(--bd-status-danger-border))]',
    iconBg: 'bg-[hsl(var(--bd-status-danger-text))] text-[hsl(var(--bd-status-danger-bg))] dark:text-white',
  },
  waybills: {
    id: 'waybills',
    label: 'Waybills',
    path: '/waybills',
    icon: Icons.waybill,
    description: 'Track dispatches and delivery records',
    tileHint: 'Open module',
    tint: 'bg-[hsl(var(--bd-status-info-bg))] border-[hsl(var(--bd-status-info-border))]',
    iconBg: 'bg-[hsl(var(--bd-status-info-text))] text-[hsl(var(--bd-status-info-bg))] dark:text-white',
  },
  new_waybill: {
    id: 'new_waybill',
    label: 'New Waybill',
    path: '/waybills/new',
    icon: Icons.waybill,
    description: 'Create a dispatch or delivery waybill',
    tileHint: 'Tap to start',
    tint: 'bg-[hsl(var(--bd-status-info-bg))] border-[hsl(var(--bd-status-info-border))]',
    iconBg: 'bg-[hsl(var(--bd-status-info-text))] text-[hsl(var(--bd-status-info-bg))] dark:text-white',
  },
}

export const ALL_QUICK_TILE_IDS = Object.keys(QUICK_TILE_REGISTRY)
export const DEFAULT_QUICK_TILES = ['invoices', 'quotations', 'csr', 'projects']
export const DEFAULT_CREATE_ACTION_TILES = [
  'new_invoice',
  'new_project',
  'new_rfq',
  'new_quotation',
  'new_csr',
  'new_waybill',
]

const LEGACY_ACTION_DEFAULTS = ['new_invoice', 'new_quotation', 'new_csr', 'new_project']

export function sanitizeQuickTileIds(tileIds) {
  if (!Array.isArray(tileIds)) return []

  const seen = new Set()
  return tileIds.filter((tileId) => {
    if (!QUICK_TILE_REGISTRY[tileId] || seen.has(tileId)) return false
    seen.add(tileId)
    return true
  })
}

function normalizeQuickTiles(tileIds) {
  const sanitized = sanitizeQuickTileIds(tileIds)
  const nextTiles = sanitized.filter((tileId) => !tileId.startsWith('new_'))

  for (const tileId of DEFAULT_QUICK_TILES) {
    if (nextTiles.length >= QUICK_TILE_COUNT) break
    if (!nextTiles.includes(tileId)) {
      nextTiles.push(tileId)
    }
  }

  return nextTiles.slice(0, QUICK_TILE_COUNT)
}

export function loadStoredQuickTiles() {
  try {
    const savedTiles = localStorage.getItem(QUICK_TILE_STORAGE_KEY)
    if (!savedTiles) return [...DEFAULT_QUICK_TILES]

    const parsedTiles = JSON.parse(savedTiles)
    if (!Array.isArray(parsedTiles)) return [...DEFAULT_QUICK_TILES]

    const isLegacyDefault = LEGACY_ACTION_DEFAULTS.every((tileId, index) => parsedTiles[index] === tileId)
    if (isLegacyDefault) return [...DEFAULT_QUICK_TILES]

    const normalized = normalizeQuickTiles(parsedTiles)

    const hadCreateActionTile = parsedTiles.some(
      (tileId) => typeof tileId === 'string' && tileId.startsWith('new_')
    )

    if (hadCreateActionTile) {
      try {
        localStorage.setItem(QUICK_TILE_STORAGE_KEY, JSON.stringify(normalized))
      } catch {
        // ignore localStorage write failures
      }
    }

    return normalized
  } catch {
    return [...DEFAULT_QUICK_TILES]
  }
}

export function saveStoredQuickTiles(tileIds) {
  const nextTiles = normalizeQuickTiles(tileIds)
  localStorage.setItem(QUICK_TILE_STORAGE_KEY, JSON.stringify(nextTiles))
  return nextTiles
}

export function getQuickTiles(tileIds = DEFAULT_QUICK_TILES) {
  return normalizeQuickTiles(tileIds).map((tileId) => QUICK_TILE_REGISTRY[tileId])
}

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
