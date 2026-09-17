/**
 * PERMANENTLY ENABLED (2026-09-17).
 *
 * This is the narrowest source of truth for the formerly user-editable
 * "Document Controls" / fillable-writing toggle. The Settings destination
 * was retired; per the product decision, the "ON" behavior is now
 * permanent. Every document type's fillable-writing gate always evaluates
 * to enabled — a persisted `enabled: false` value in the tenant settings
 * column `document_fillable_settings` can no longer disable the feature.
 *
 * The runtime consumers never read the persisted value; they call
 * `isDocumentFillableEnabled(value, type)` which now returns true
 * unconditionally. The `value` parameter is retained for API
 * compatibility but is ignored.
 *
 * Persistence shape helpers are retained for backward compatibility: the
 * stored column may still exist with legacy `false` values and is no
 * longer written by any UI.
 */
export type FillableDocumentType = 'invoice' | 'quotation' | 'csr' | 'waybill'

export type DocumentFillableSettingEntry = {
  enabled: boolean
}

export type DocumentFillableSettings = Record<FillableDocumentType, DocumentFillableSettingEntry>

export const DEFAULT_DOCUMENT_FILLABLE_SETTINGS: DocumentFillableSettings = {
  invoice: { enabled: true },
  quotation: { enabled: true },
  csr: { enabled: true },
  waybill: { enabled: true },
}

/** Always-on shim: returns every type permanently enabled, ignoring stored values. */
export function normalizeDocumentFillableSettings(_value: unknown): DocumentFillableSettings {
  return {
    invoice: { enabled: true },
    quotation: { enabled: true },
    csr: { enabled: true },
    waybill: { enabled: true },
  }
}

/** Always-on shim: the formerly gated capability is permanently enabled. */
export function isDocumentFillableEnabled(_value: unknown, _documentType: FillableDocumentType) {
  return true
}

/** Always-on shim: serializes the permanent all-enabled state. */
export function serializeDocumentFillableSettings(_value: unknown) {
  return JSON.stringify(DEFAULT_DOCUMENT_FILLABLE_SETTINGS)
}
