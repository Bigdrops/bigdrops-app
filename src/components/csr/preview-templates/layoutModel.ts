export interface TemplateMaterialPolicy {
  maxMaterialHeight: number
  preferredRowHeight: number
  maxColumns: number
  supportsCompact: boolean
}

export const MATERIAL_LAYOUT_POLICIES: Record<string, TemplateMaterialPolicy> = {
  minimal:  { maxMaterialHeight: 160, preferredRowHeight: 16, maxColumns: 4, supportsCompact: true },
  zinc:     { maxMaterialHeight: 140, preferredRowHeight: 16, maxColumns: 4, supportsCompact: true },
  industry: { maxMaterialHeight: 100, preferredRowHeight: 14, maxColumns: 3, supportsCompact: true },
  sentinel: { maxMaterialHeight: 160, preferredRowHeight: 16, maxColumns: 3, supportsCompact: false },
  nexus:    { maxMaterialHeight: 160, preferredRowHeight: 14, maxColumns: 3, supportsCompact: false },
}

const DEFAULT_POLICY: TemplateMaterialPolicy = { maxMaterialHeight: 120, preferredRowHeight: 16, maxColumns: 3, supportsCompact: false }

export const safeText = (value: any) => String(value ?? '').trim()

export function formatCommaMaterialsText(rows: any[]) {
  return rows
    .map((row: any) => {
      const qtyUnit = [safeText(row?.quantity), safeText(row?.unit)].filter(Boolean).join(' ')
      return `${safeText(row?.item)}${qtyUnit ? ` ×${qtyUnit}` : ''}`
    })
    .filter(Boolean)
    .join('  │  ')
}

export function resolveMaterialColumnBlocks(itemCount: number, templateId = '') {
  const policy = MATERIAL_LAYOUT_POLICIES[templateId] || DEFAULT_POLICY
  const rowHeight = policy.supportsCompact
    ? Math.max(12, policy.preferredRowHeight - 2)
    : policy.preferredRowHeight
  const maxRowsPerColumn = Math.floor(policy.maxMaterialHeight / rowHeight)
  const maxTotalItems = maxRowsPerColumn * policy.maxColumns
  if (itemCount > maxTotalItems) return 0
  const blocks = Math.ceil(itemCount / maxRowsPerColumn)
  return Math.min(blocks, policy.maxColumns)
}

export function resolveZincLifecycleStages(status: any) {
  const normalized = safeText(status).toLowerCase()
  const activeLabel = (() => {
    if (normalized === 'complete') return 'Handover'
    if (normalized === 'working solution provided' || normalized === 'under observation') return 'Observation'
    if (normalized === 'pending for spares') return 'Repair'
    if (normalized === 'incomplete') return 'Diagnostic'
    return 'Arrival'
  })()

  return ['Arrival', 'Diagnostic', 'Repair', 'Observation', 'Handover'].map((label) => ({
    label,
    active: label === activeLabel,
  }))
}
