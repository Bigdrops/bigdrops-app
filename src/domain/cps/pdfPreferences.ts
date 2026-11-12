/**
 * CPS PDF display preferences.
 *
 * CPS consumes the same established commercial Forme template inventory as
 * Invoice and Quotation. The persistent preference mechanism (localStorage
 * key) is kept; only the template id registry has moved. Retired ids
 * ('ledger' | 'schedule' | 'compact') migrate to the industry default.
 */

import { normalizeInvoicePdfTemplateId } from '@/domain/invoice/types'

export type CpsPdfTemplateId =
  | 'industrial'
  | 'industry'
  | 'minimal'
  | 'landscape'
  | 'evergreen'
  | 'architectural'
  | 'executive'
  | 'heritage'
  | 'mosaic'

export type CpsPdfOrientation = 'portrait' | 'landscape'

export interface CpsPdfTemplateMeta {
  id: CpsPdfTemplateId
  label: string
  description: string
}

export const CPS_PDF_TEMPLATES: CpsPdfTemplateMeta[] = [
  { id: 'industrial', label: 'Industrial', description: 'Technical Forme presentation of the cost schedule.' },
  { id: 'industry', label: 'Industry', description: 'Structured commercial presentation of the cost schedule.' },
  { id: 'minimal', label: 'Minimal', description: 'Restrained, low-noise cost schedule.' },
  { id: 'landscape', label: 'Landscape', description: 'Wide-format schedule for dense BOQs.' },
  { id: 'evergreen', label: 'Evergreen', description: 'Evergreen Forme presentation.' },
  { id: 'architectural', label: 'Architectural', description: 'Architectural House presentation.' },
  { id: 'executive', label: 'Executive', description: 'Executive Forme presentation.' },
  { id: 'heritage', label: 'Heritage House', description: 'Heritage House presentation.' },
  { id: 'mosaic', label: 'Mosaic', description: 'Mosaic Forme presentation.' },
]

export interface CpsPdfDisplayPreferences {
  templateId: CpsPdfTemplateId
  orientation: CpsPdfOrientation
}

const STORAGE_KEY = 'cps_pdf_display_prefs'

const DEFAULTS: CpsPdfDisplayPreferences = {
  templateId: 'industry',
  orientation: 'portrait',
}

function isTemplateId(value: unknown): value is CpsPdfTemplateId {
  return (
    value === 'industrial' ||
    value === 'industry' ||
    value === 'minimal' ||
    value === 'landscape' ||
    value === 'evergreen' ||
    value === 'architectural' ||
    value === 'executive' ||
    value === 'heritage' ||
    value === 'mosaic'
  )
}

/** Map any stored id to a renderable template. Retired/unknown ids fall back to the industry default. */
export function resolveActiveTemplateId(value: unknown): CpsPdfTemplateId {
  const normalized = normalizeInvoicePdfTemplateId(value)
  if (normalized && isTemplateId(normalized)) return normalized
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
