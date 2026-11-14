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
  if (/\b(invoice|invoices|bill)\b|\bINV[-\s]?[A-Z0-9-]+\b/i.test(message)) return 'search-invoices'
  return null
}

export function extractBoluSearchTerm(message: string): string {
  return message
    .replace(/^\s*(please\s+)?(find|search\s+for|look\s+up|show\s+me|show|open|locate)\s+/i, '')
    .replace(/^(an?\s+)?(invoice|invoices|quotation|quotations|quote|quotes)\b\s*/i, '')
    .replace(/^the\s+(invoice|invoices|quotation|quotations|quote|quotes)\b\s*/i, '')
    .replace(/^(for|number|no\.?|#)\s*/i, '')
    .trim()
}
