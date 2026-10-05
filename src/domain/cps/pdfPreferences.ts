export type CpsPdfTemplateId = 'ledger' | 'industry'

/** Retired ids. Persisted prefs may still carry these; they fall back to ledger. */
export type RetiredCpsPdfTemplateId = 'schedule' | 'compact'
export type CpsPdfOrientation = 'portrait' | 'landscape'

export interface CpsPdfTemplateMeta {
  id: CpsPdfTemplateId
  label: string
  description: string
}

export const CPS_PDF_TEMPLATES: CpsPdfTemplateMeta[] = [
  { id: 'ledger', label: 'Ledger', description: 'Portrait cost-sheet presentation with grouped walls.' },
  { id: 'industry', label: 'Industry', description: 'Industry-family presentation of the same cost schedule.' },
]

export interface CpsPdfDisplayPreferences {
  templateId: CpsPdfTemplateId
  orientation: CpsPdfOrientation
}

const STORAGE_KEY = 'cps_pdf_display_prefs'

const DEFAULTS: CpsPdfDisplayPreferences = {
  templateId: 'ledger',
  orientation: 'portrait',
}

const RETIRED_TEMPLATE_IDS: ReadonlySet<string> = new Set(['schedule', 'compact'])

function isTemplateId(value: unknown): value is CpsPdfTemplateId {
  return value === 'ledger' || value === 'industry'
}

/** Retired ids stay readable so old saved prefs migrate instead of breaking. */
export function isRetiredTemplateId(value: unknown): value is RetiredCpsPdfTemplateId {
  return typeof value === 'string' && RETIRED_TEMPLATE_IDS.has(value)
}

/** Map any stored id to a renderable template. Retired ids fall back to ledger. */
export function resolveActiveTemplateId(value: unknown): CpsPdfTemplateId {
  if (isTemplateId(value)) return value
  return DEFAULTS.templateId
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
      templateId: resolveActiveTemplateId(parsed.templateId),
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
      templateId: resolveActiveTemplateId(prefs.templateId),
      orientation: isOrientation(prefs.orientation) ? prefs.orientation : DEFAULTS.orientation,
    }),
  )
}
