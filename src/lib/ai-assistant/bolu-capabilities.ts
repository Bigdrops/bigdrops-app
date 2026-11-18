import type { BoluPageContext } from './bolu-context'

export const BOLU_READ_CAPABILITIES = [
  'search-invoices',
  'read-receivables',
  'search-quotations',
] as const

export type BoluCapability = (typeof BOLU_READ_CAPABILITIES)[number]

const AVAILABLE_BY_MODULE: Record<BoluPageContext['origin']['module'], BoluCapability[]> = {
  dashboard: [...BOLU_READ_CAPABILITIES],
  invoice: ['search-invoices', 'read-receivables'],
  quotation: ['search-quotations', 'search-invoices'],
  receivables: ['read-receivables', 'search-invoices'],
  report: ['read-receivables', 'search-invoices', 'search-quotations'],
  other: ['search-invoices'],
}

export function getAvailableBoluCapabilities(context: BoluPageContext): BoluCapability[] {
  return AVAILABLE_BY_MODULE[context.origin.module]
}

export function matchBoluIntent(message: string, context?: BoluPageContext): BoluCapability | null {
  const normalized = message.toLowerCase()
  if (/\b(create|make|edit|change|update|delete|remove|record|pay|send)\b/.test(normalized)) return null

  if (context?.record?.kind === 'invoice' && /\b(this|that|current)\b/.test(normalized)) {
    if (/\b(payment|status|balance|paid|overdue|explain|details?)\b/.test(normalized)) return 'read-receivables'
  }
  if (context?.record?.kind === 'quotation' && /\b(this|that|current)\b/.test(normalized)) {
    if (/\b(status|explain|details?|quote|quotation)\b/.test(normalized)) return 'search-quotations'
  }

  if (/\b(overdue|past due|outstanding|receivable|balance due|payment status|paid|unpaid|owe|owing)\b/.test(normalized)) {
    return 'read-receivables'
  }
  if (/\b(quotation|quote)\b/.test(normalized)) return 'search-quotations'
  if (/\b(invoice|invoices|bill)\b|[A-Z]*INV[-\s]?[0-9][A-Z0-9-]*/i.test(message)) return 'search-invoices'
  return null
}

const BOLU_SAVE_INTENT_PATTERN = /^(save|file|confirm|yes|do it|approve)/i

/** Detects a natural-language Gate 2 confirmation (e.g. "file it", "confirmed"). */
export function matchesBoluSaveIntent(message: string): boolean {
  return BOLU_SAVE_INTENT_PATTERN.test(message.trim())
}

export function extractBoluSearchTerm(message: string): string {
  return message
    .replace(/^\s*(please\s+)?(find|search\s+for|look\s+up|show\s+me|show|open|locate)\s+/i, '')
    .replace(/^(an?\s+)?(invoice|invoices|quotation|quotations|quote|quotes)\b\s*/i, '')
    .replace(/^the\s+(invoice|invoices|quotation|quotations|quote|quotes)\b\s*/i, '')
    .replace(/^(for|number|no\.?|#)\s*/i, '')
    .trim()
}

/** Words that follow "for" but never name a client. */
const NON_NAME_CANDIDATE = /^(the|a|an|this|that|these|those|my|our|your|his|her|their|me|us|them|him|it|now|today|tomorrow|yesterday|tonight|later|soon|next|last|payment|payments|approval|review|reference|records?|everything|anything|all|free|good|example)$/i

/** Keeps a candidate plausible as a client identifier: a name, email or phone. */
function isPlausibleClientName(candidate: string): boolean {
  if (candidate.length < 2 || candidate.length > 80) return false
  if (!/[A-Za-z]/.test(candidate) && !/^[\d\s\-()+]{4,}$/.test(candidate)) return false
  if (NON_NAME_CANDIDATE.test(candidate)) return false
  return candidate.split(/\s+/).length <= 6
}

/**
 * Extracts a candidate client name hint from natural language messages.
 * e.g. "create an invoice for Tecno Power Solutions with 10 cables" -> "Tecno Power Solutions"
 *
 * The hint is only a search seed. It is always verified against the tenant
 * client directory before any record is attached.
 */
export function extractClientSearchTerm(message: string): string | null {
  const clean = message.trim()
  // Pattern: "for [Client Name]" before item descriptions or punctuation
  const match = clean.match(
    /\b(?:for|to)\s+([A-Z0-9][A-Za-z0-9\s&'.,\-]{1,60}?)(?=\s+(?:with|having|for\s+\d|at\s+\d|10|20|\d+\s*(?:pcs|rolls|bags|items)|,|;|\.|$))/i,
  ) || clean.match(/\b(?:client|customer)\s+([A-Z0-9][A-Za-z0-9\s&'.,\-]{1,60}?)(?=\s+(?:with|,|\.|$))/i)

  if (match) {
    const candidate = match[1].trim()
    if (isPlausibleClientName(candidate)) {
      return candidate
    }
  }

  // Fallback for simple "for [Name]" at the end of the text
  const endMatch = clean.match(/\b(?:for|to)\s+([A-Z0-9][A-Za-z0-9\s&'.,\-]{1,60})$/i)
  if (endMatch) {
    const candidate = endMatch[1].trim()
    if (isPlausibleClientName(candidate)) {
      return candidate
    }
  }

  return null
}

/**
 * Extracts any document reference number (e.g. INV-0012, QTN-2026-004) from message.
 */
export function extractDocumentSearchRef(message: string): { type: 'invoice' | 'quotation' | 'unknown'; number: string } | null {
  const matchInv = message.match(/\b([A-Z]*INV[-\s]?[0-9][A-Z0-9-]*)\b/i)
  if (matchInv) {
    return { type: 'invoice', number: matchInv[1].replace(/\s+/g, '-').toUpperCase() }
  }
  const matchQtn = message.match(/\b([A-Z]*QTN[-\s]?[0-9][A-Z0-9-]*)\b/i)
  if (matchQtn) {
    return { type: 'quotation', number: matchQtn[1].replace(/\s+/g, '-').toUpperCase() }
  }
  return null
}

/**
 * Extracts a supplier/vendor name hint from a message.
 * Read-only discovery seed; it is verified against the tenant directory.
 */
export function extractSupplierSearchTerm(message: string): string | null {
  const patterns = [
    /\bfrom\s+(?:the\s+)?(?:supplier|vendor)\s+([A-Z0-9][A-Za-z0-9\s&'.,\-]{1,60}?)(?=\s+(?:for|with|at)\b|[,.]|$)/i,
    /\b(?:supplier|vendor)\s+(?:named\s+)?([A-Z0-9][A-Za-z0-9\s&'.,\-]{1,60}?)(?=\s+(?:for|with|at)\b|[,.]|$)/i,
  ]
  for (const pattern of patterns) {
    const match = message.match(pattern)
    const candidate = match?.[1]?.trim()
    if (candidate && isPlausibleClientName(candidate)) return candidate
  }
  return null
}

/**
 * Operation-aware context classification for write/mutation prompts.
 * Keeps intent classification separate from context retrieval so write
 * requests still hydrate required business records.
 */
export function matchBoluWriteContext(message: string): {
  targetFamily: 'invoice' | 'quotation' | 'unknown'
  clientHint: string | null
  documentRef: { type: 'invoice' | 'quotation' | 'unknown'; number: string } | null
  supplierHint: string | null
} {
  const normalized = message.toLowerCase()
  let targetFamily: 'invoice' | 'quotation' | 'unknown' = 'unknown'
  if (/\b(quotation|quotations|quote|quotes)\b/i.test(normalized)) {
    targetFamily = 'quotation'
  } else if (/\b(invoice|invoices|bill)\b/i.test(normalized)) {
    targetFamily = 'invoice'
  }

  // A client hint is only useful for a document operation. An ordinary message
  // must not trigger a client lookup and pollute the model context.
  const isDocumentRequest =
    targetFamily !== 'unknown' ||
    /\b(create|make|draft|prepare|edit|change|update|delete|remove|record|add)\b/.test(normalized)

  return {
    targetFamily,
    clientHint: isDocumentRequest ? extractClientSearchTerm(message) : null,
    documentRef: extractDocumentSearchRef(message),
    supplierHint: isDocumentRequest ? extractSupplierSearchTerm(message) : null,
  }
}
