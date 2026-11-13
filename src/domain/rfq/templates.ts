import type { TableTemplateId } from '@/domain/table-document/types'

/**
 * RFQ PDF template catalogue — exactly two Forme templates.
 *
 * Compatibility mapping for stored `rfq.template_id` values (documented in
 * the RFQ Forme migration report):
 *   'modern'            → 'mosaic'
 *   'bordered_schedule' → 'executive'
 *   anything else/unknown → 'mosaic'
 */

export type RfqTemplateId = 'mosaic' | 'executive'

export const DEFAULT_RFQ_TEMPLATE: RfqTemplateId = 'mosaic'

export const RFQ_TEMPLATE_OPTIONS: Array<{ id: RfqTemplateId; label: string; description: string }> = [
  { id: 'mosaic', label: 'Mosaic', description: 'Forest slab masthead, lime accent, monospaced micro labels' },
  { id: 'executive', label: 'Executive', description: 'Symmetric centred masthead, slate rules, panel metadata bar' },
]

export function isRfqTemplateId(value: unknown): value is RfqTemplateId {
  return value === 'mosaic' || value === 'executive'
}

export function normalizeRfqTemplateId(value: unknown): RfqTemplateId {
  if (value === 'executive' || value === 'bordered_schedule') return 'executive'
  if (value === 'mosaic' || value === 'modern') return 'mosaic'
  return DEFAULT_RFQ_TEMPLATE
}

export function getRfqTemplateLabel(templateId: TableTemplateId | null | undefined): string {
  return RFQ_TEMPLATE_OPTIONS.find((t) => t.id === templateId)?.label ?? 'Mosaic'
}
