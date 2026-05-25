export const MATERIALS_MAX_ROWS_PER_COLUMN: Record<string, number> = {
  signalbands: 5,
  zinc: 6,
  crimson: 6,
  pulseframe: 10,
}

export const safeText = (value: any) => String(value ?? '').trim()

export function formatCommaMaterialsText(rows: any[]) {
  return rows
    .map((row: any) => {
      const qtyUnit = [safeText(row?.quantity), safeText(row?.unit)].filter(Boolean).join(' ')
      return `${safeText(row?.item)}${qtyUnit ? ` ${qtyUnit}` : ''}`
    })
    .filter(Boolean)
    .join('  │  ')
}

export function resolveMaterialColumnBlocks(itemCount: number, templateId = '') {
  const maxRowsPerColumn = MATERIALS_MAX_ROWS_PER_COLUMN[templateId] || 6
  const blocks = Math.ceil(itemCount / maxRowsPerColumn)
  return blocks > 3 ? 0 : Math.max(blocks, 1)
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
