import {
  ClipboardCheck,
  FileSignature,
  FileText,
  FolderKanban,
  Receipt,
  Truck,
} from 'lucide-react'

export const QUICK_TILE_STORAGE_KEY = 'quick_tiles'
export const QUICK_TILE_COUNT = 4

export const QUICK_TILE_REGISTRY = {
  invoices: {
    id: 'invoices',
    label: 'Invoices',
    path: '/invoices',
    icon: Receipt,
    description: 'Open invoice records and billing activity',
    tileHint: 'Open module',
    tint: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-600',
  },
  quotations: {
    id: 'quotations',
    label: 'Quotations',
    path: '/quotations',
    icon: FileSignature,
    description: 'Review quotations and proposal drafts',
    tileHint: 'Open module',
    tint: 'bg-violet-50 border-violet-200',
    iconBg: 'bg-violet-600',
  },
  csr: {
    id: 'csr',
    label: 'CSR',
    path: '/csr',
    icon: ClipboardCheck,
    description: 'Open customer service reports',
    tileHint: 'Open module',
    tint: 'bg-orange-50 border-orange-200',
    iconBg: 'bg-orange-600',
  },
  projects: {
    id: 'projects',
    label: 'Projects',
    path: '/projects',
    icon: FolderKanban,
    description: 'Open project workspaces and updates',
    tileHint: 'Open module',
    tint: 'bg-emerald-50 border-emerald-200',
    iconBg: 'bg-emerald-600',
  },
  new_invoice: {
    id: 'new_invoice',
    label: 'New Invoice',
    path: '/invoices/new',
    icon: FileText,
    description: 'Create and send a sales invoice',
    tileHint: 'Tap to start',
    tint: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-600',
  },
  new_quotation: {
    id: 'new_quotation',
    label: 'New Quotation',
    path: '/quotations/new',
    icon: FileSignature,
    description: 'Build a quotation for a client',
    tileHint: 'Tap to start',
    tint: 'bg-violet-50 border-violet-200',
    iconBg: 'bg-violet-600',
  },
  new_csr: {
    id: 'new_csr',
    label: 'New CSR',
    path: '/csr/new',
    icon: ClipboardCheck,
    description: 'Log a customer service report',
    tileHint: 'Tap to start',
    tint: 'bg-orange-50 border-orange-200',
    iconBg: 'bg-orange-600',
  },
  new_project: {
    id: 'new_project',
    label: 'New Project',
    path: '/projects/new',
    icon: FolderKanban,
    description: 'Start a new project workspace',
    tileHint: 'Tap to start',
    tint: 'bg-emerald-50 border-emerald-200',
    iconBg: 'bg-emerald-600',
  },
  waybills: {
    id: 'waybills',
    label: 'Waybills',
    path: '/waybills',
    icon: Truck,
    description: 'Track dispatches and delivery records',
    tileHint: 'Open module',
    tint: 'bg-slate-50 border-slate-200',
    iconBg: 'bg-slate-700',
  },
  new_waybill: {
    id: 'new_waybill',
    label: 'New Waybill',
    path: '/waybills/new',
    icon: Truck,
    description: 'Create a dispatch or delivery waybill',
    tileHint: 'Tap to start',
    tint: 'bg-slate-50 border-slate-200',
    iconBg: 'bg-slate-700',
  },
}

export const ALL_QUICK_TILE_IDS = Object.keys(QUICK_TILE_REGISTRY)
export const DEFAULT_QUICK_TILES = ['invoices', 'quotations', 'csr', 'projects']

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
  const nextTiles = [...sanitized]

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
    return normalizeQuickTiles(parsedTiles)
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
