import {
  ClipboardCheck,
  FileSignature,
  FileText,
  FolderKanban,
} from 'lucide-react'

export const QUICK_TILE_STORAGE_KEY = 'quick_tiles'

export const QUICK_TILE_REGISTRY = {
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
}

export const ALL_QUICK_TILE_IDS = Object.keys(QUICK_TILE_REGISTRY)

export const DEFAULT_QUICK_TILES = ['new_invoice', 'new_quotation', 'new_csr', 'new_project']

export function sanitizeQuickTileIds(tileIds) {
  if (!Array.isArray(tileIds)) return []

  const seen = new Set()
  return tileIds.filter((tileId) => {
    if (!QUICK_TILE_REGISTRY[tileId] || seen.has(tileId)) return false
    seen.add(tileId)
    return true
  })
}

export function loadStoredQuickTiles() {
  try {
    const savedTiles = localStorage.getItem(QUICK_TILE_STORAGE_KEY)
    if (!savedTiles) return [...DEFAULT_QUICK_TILES]
    const parsedTiles = JSON.parse(savedTiles)
    if (!Array.isArray(parsedTiles)) return [...DEFAULT_QUICK_TILES]
    const sanitizedTiles = sanitizeQuickTileIds(parsedTiles)
    if (sanitizedTiles.length === 0 && parsedTiles.length > 0) {
      return [...DEFAULT_QUICK_TILES]
    }
    return sanitizedTiles
  } catch {
    return [...DEFAULT_QUICK_TILES]
  }
}

export function saveStoredQuickTiles(tileIds) {
  const nextTiles = sanitizeQuickTileIds(tileIds)
  localStorage.setItem(QUICK_TILE_STORAGE_KEY, JSON.stringify(nextTiles))
  return nextTiles
}

export function getQuickTiles(tileIds = DEFAULT_QUICK_TILES) {
  return sanitizeQuickTileIds(tileIds).map((tileId) => QUICK_TILE_REGISTRY[tileId])
}
