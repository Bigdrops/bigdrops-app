/**
 * CSV DOCUMENT SUMMARY — Shared financial summary + text sections for CSV exports.
 *
 * Single-document CSV exports (Invoice, Quotation) must reproduce the exact
 * financial breakdown shown in the application's View page and PDF export.
 * This module reuses the canonical `buildSummaryRows` app summary builder so the
 * CSV can never drift from the UI/PDF financial pipeline (src/lib/Calculations.ts).
 */

import { buildSummaryRows } from '@/domain/invoice'

/**
 * Accepted totals shape for CSV summary generation.
 * Supports BOTH the canonical `computeDocument` result keys
 * (`subtotal`, `vat`, `discount`, `wht`, ...) and the legacy
 * preview-style aliases (`rawSubtotal`, `vatAmount`, ...).
 */
export type DocumentCsvTotals = {
  // Canonical computeDocument (DocumentResult) keys
  subtotal?: number
  installRateTotal?: number
  vat?: number
  discount?: number
  wht?: number
  grandTotal?: number
  totalPayable?: number
  // Legacy preview-style aliases
  rawSubtotal?: number
  vatAmount?: number
  discountAmount?: number
  whtAmount?: number
} | null

function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Builds the `[label, value]` CSV rows for a document's financial summary.
 * Uses the same `buildSummaryRows` pipeline as the application view and PDF,
 * including discount timing, taxable/non-taxable extra charges, install rate,
 * and WHT rows. Appends the final `Total` row (total payable).
 */
export function buildDocumentSummaryCsvRows({
  document,
  totals,
  customFields,
}: {
  document: Record<string, any>
  totals?: DocumentCsvTotals
  customFields?: Record<string, any>
}): string[][] {
  if (!totals) return []

  const summary = buildSummaryRows({
    invoice: document,
    totals: {
      rawSubtotal: totals.rawSubtotal ?? totals.subtotal ?? 0,
      vatAmount: totals.vatAmount ?? totals.vat ?? 0,
      discountAmount: totals.discountAmount ?? totals.discount ?? 0,
      whtAmount: totals.whtAmount ?? totals.wht ?? 0,
      installRateTotal: totals.installRateTotal ?? 0,
    },
    customFields: customFields ?? {},
  })

  const totalPayable = totals.totalPayable ?? totals.grandTotal ?? 0

  return [
    ...summary.map((row) => [row.label, String(toNumber(row.amount))]),
    ['Total', String(toNumber(totalPayable))],
  ]
}

/**
 * Resolves a document text section (Notes / Terms and Conditions) for CSV.
 * Prefers the persisted plain-text column, falls back to the HTML variant
 * stored in custom fields, and strips markup so cells stay readable.
 */
export function resolveDocumentTextSection(
  document: Record<string, any>,
  customFields: Record<string, any> | undefined,
  field: 'notes' | 'terms',
  htmlField: 'notesHtml' | 'termsHtml',
): string {
  const value = document?.[field] ?? customFields?.[htmlField] ?? ''
  return stripHtml(String(value ?? ''))
}

function stripHtml(value: string): string {
  if (!/<[a-z][\s\S]*>/i.test(value)) return value.trim()
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
