export type FillableDocumentType = 'invoice' | 'quotation' | 'csr' | 'waybill'

export type DocumentFillableSettingEntry = {
  enabled: boolean
}

export type DocumentFillableSettings = Record<FillableDocumentType, DocumentFillableSettingEntry>

export const DEFAULT_DOCUMENT_FILLABLE_SETTINGS: DocumentFillableSettings = {
  invoice: { enabled: false },
  quotation: { enabled: false },
  csr: { enabled: true },
  waybill: { enabled: true },
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeDocumentFillableSettings(value: unknown): DocumentFillableSettings {
  const candidate =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value)
          } catch {
            return {}
          }
        })()
      : value

  const source = candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? (candidate as Partial<Record<FillableDocumentType, Partial<DocumentFillableSettingEntry>>>)
    : {}

  return {
    invoice: { enabled: toBoolean(source.invoice?.enabled, DEFAULT_DOCUMENT_FILLABLE_SETTINGS.invoice.enabled) },
    quotation: { enabled: toBoolean(source.quotation?.enabled, DEFAULT_DOCUMENT_FILLABLE_SETTINGS.quotation.enabled) },
    csr: { enabled: toBoolean(source.csr?.enabled, DEFAULT_DOCUMENT_FILLABLE_SETTINGS.csr.enabled) },
    waybill: { enabled: toBoolean(source.waybill?.enabled, DEFAULT_DOCUMENT_FILLABLE_SETTINGS.waybill.enabled) },
  }
}

export function isDocumentFillableEnabled(value: unknown, documentType: FillableDocumentType) {
  return normalizeDocumentFillableSettings(value)[documentType].enabled
}

export function serializeDocumentFillableSettings(value: unknown) {
  return JSON.stringify(normalizeDocumentFillableSettings(value))
}
