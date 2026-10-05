export type CpsPdfTemplateId = 'schedule' | 'compact' | 'ledger' | 'industry'
export type CpsPdfOrientation = 'portrait' | 'landscape'

export interface CpsPdfTemplateMeta {
  id: CpsPdfTemplateId
  label: string
  description: string
}

export const CPS_PDF_TEMPLATES: CpsPdfTemplateMeta[] = [
  { id: 'schedule', label: 'Schedule', description: 'Full detail with photos, spec, and make.' },
  { id: 'compact', label: 'Compact', description: 'Condensed rows, no photos, tighter fit.' },
  { id: 'ledger', label: 'Ledger', description: 'Portrait cost-sheet presentation with grouped walls.' },
  { id: 'industry', label: 'Industry', description: 'Industry-family presentation of the same cost schedule.' },
]

export interface CpsPdfDisplayPreferences {
  templateId: CpsPdfTemplateId
  orientation: CpsPdfOrientation
}

const STORAGE_KEY = 'cps_pdf_display_prefs'

const DEFAULTS: CpsPdfDisplayPreferences = {
  templateId: 'schedule',
  orientation: 'portrait',
}

function isTemplateId(value: unknown): value is CpsPdfTemplateId {
  return value === 'schedule' || value === 'compact' || value === 'ledger' || value === 'industry'
}

function isOrientation(value: unknown): value is CpsPdfOrientation {
  return value === 'portrait' || value === 'landscape'
}

export function readCpsPdfDisplayPreferences(): CpsPdfDisplayPreferences {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<CpsPdfDisplayPreferences>
    return {
      templateId: isTemplateId(parsed.templateId) ? parsed.templateId : DEFAULTS.templateId,
      orientation: isOrientation(parsed.orientation) ? parsed.orientation : DEFAULTS.orientation,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeCpsPdfDisplayPreferences(prefs: CpsPdfDisplayPreferences): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      templateId: isTemplateId(prefs.templateId) ? prefs.templateId : DEFAULTS.templateId,
      orientation: isOrientation(prefs.orientation) ? prefs.orientation : DEFAULTS.orientation,
    }),
  )
}
