export type BoluModule =
  | 'dashboard'
  | 'invoice'
  | 'quotation'
  | 'receivables'
  | 'report'
  | 'other'

export type BoluLauncherSource = 'dashboard' | 'contextual' | 'future-fab'

export type BoluRecordReference = {
  kind: 'invoice' | 'quotation'
  id: string
  persistence: 'persisted' | 'draft'
}

export type BoluPageContext = {
  formState: 'none' | 'unsaved-draft' | 'editing-persisted'
  origin: {
    pathname: string
    page: string
    module: BoluModule
    launcher: BoluLauncherSource
  }
  filters: Record<string, string>
  record: BoluRecordReference | null
}

export type BoluSuggestion = {
  id: string
  label: string
  prompt: string
  capability: 'search-invoices' | 'read-receivables' | 'search-quotations'
}

const SUGGESTIONS: Record<BoluModule, BoluSuggestion[]> = {
  dashboard: [
    {
      id: 'outstanding-invoices',
      label: 'Show outstanding invoices',
      prompt: 'Show outstanding invoices',
      capability: 'read-receivables',
    },
    {
      id: 'find-invoice',
      label: 'Find an invoice',
      prompt: 'Find an invoice',
      capability: 'search-invoices',
    },
    {
      id: 'find-quotation',
      label: 'Find a quotation',
      prompt: 'Find a quotation',
      capability: 'search-quotations',
    },
  ],
  invoice: [
    {
      id: 'invoice-search',
      label: 'Find an invoice',
      prompt: 'Find an invoice',
      capability: 'search-invoices',
    },
    {
      id: 'overdue-invoices',
      label: 'Show overdue invoices',
      prompt: 'Show overdue invoices',
      capability: 'read-receivables',
    },
    {
      id: 'invoice-status',
      label: 'Explain invoice status',
      prompt: 'Explain the status of this invoice',
      capability: 'read-receivables',
    },
  ],
  quotation: [
    {
      id: 'quotation-search',
      label: 'Find a quotation',
      prompt: 'Find a quotation',
      capability: 'search-quotations',
    },
    {
      id: 'quotation-status',
      label: 'Show quotation status',
      prompt: 'Show quotation status',
      capability: 'search-quotations',
    },
    {
      id: 'invoice-from-quotation',
      label: 'Find an invoice',
      prompt: 'Find an invoice',
      capability: 'search-invoices',
    },
  ],
  receivables: [
    { id: 'outstanding-invoices', label: 'Show outstanding invoices', prompt: 'Show outstanding invoices', capability: 'read-receivables' },
    { id: 'overdue-invoices', label: 'Show overdue invoices', prompt: 'Show overdue invoices', capability: 'read-receivables' },
  ],
  report: [
    { id: 'report-receivables', label: 'Review outstanding invoices', prompt: 'Show outstanding invoices', capability: 'read-receivables' },
    { id: 'report-find-invoice', label: 'Find an invoice', prompt: 'Find an invoice', capability: 'search-invoices' },
  ],
  other: [
    {
      id: 'find-invoice',
      label: 'Find an invoice',
      prompt: 'Find an invoice',
      capability: 'search-invoices',
    },
  ],
}

const WELCOME: Record<BoluModule, string> = {
  dashboard:
    "Hello! I'm Bolu. I can help you review outstanding payments, find invoices, or look up a quotation.",
  invoice:
    "You're in Invoices. I can help you find an invoice, understand its status, or explore invoice records.",
  quotation:
    "You're working with quotations. I can help you find a quotation or understand its current status.",
  receivables:
    "You're viewing receivables. I can help you find outstanding invoices and check their payment status.",
  report:
    "You're viewing a report. I can help you find invoices or review outstanding receivables.",
  other:
    "Hello! I'm Bolu. I can help you find invoices, review receivables, or look up quotations.",
}

const SAFE_PATH = /^\/[a-zA-Z0-9/_-]*$/
const RECORD_ID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

export function buildBoluPageContext(
  pathname: string,
  launcher: BoluLauncherSource,
  filters: Record<string, string> = {},
): BoluPageContext {
  const safePath = SAFE_PATH.test(pathname) ? pathname : '/'
  let module: BoluModule = 'other'
  let page = 'other-page'
  let formState: BoluPageContext['formState'] = 'none'
  let record: BoluRecordReference | null = null

  if (safePath === '/') {
    module = 'dashboard'
    page = 'dashboard-home'
  } else if (safePath === '/invoices') {
    module = 'invoice'
    page = 'invoice-list'
  } else if (safePath === '/invoices/new') {
    module = 'invoice'
    page = 'invoice-draft'
    formState = 'unsaved-draft'
  } else if (safePath.startsWith('/invoices/')) {
    const id = safePath.slice('/invoices/'.length)
    module = 'invoice'
    page = id.startsWith('edit/') ? 'invoice-draft' : 'invoice-detail'
    if (page === 'invoice-draft') formState = 'editing-persisted'
    if (page === 'invoice-detail' && RECORD_ID.test(id)) {
      record = { kind: 'invoice', id, persistence: 'persisted' }
    }
  } else if (safePath === '/quotations') {
    module = 'quotation'
    page = 'quotation-list'
  } else if (safePath === '/quotations/new') {
    module = 'quotation'
    page = 'quotation-draft'
    formState = 'unsaved-draft'
  } else if (safePath.startsWith('/quotations/')) {
    const id = safePath.slice('/quotations/'.length)
    module = 'quotation'
    page = id.startsWith('edit/') ? 'quotation-draft' : 'quotation-detail'
    if (page === 'quotation-draft') formState = 'editing-persisted'
    if (page === 'quotation-detail' && RECORD_ID.test(id)) {
      record = { kind: 'quotation', id, persistence: 'persisted' }
    }
  } else if (safePath === '/reports') {
    module = 'report'
    page = 'reports'
  }

  const safeFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([key, value]) => /^[a-zA-Z0-9_-]{1,40}$/.test(key) && value.length <= 120,
    ),
  )

  return {
    formState,
    origin: { pathname: safePath, page, module, launcher },
    filters: safeFilters,
    record,
  }
}

export function getBoluWelcome(context: BoluPageContext): string {
  if (context.record?.kind === 'invoice') {
    return 'I see you are viewing an invoice. I can help explain its details or check its payment status.'
  }
  if (context.record?.kind === 'quotation') {
    return 'I see you are viewing a quotation. I can help find its status or related information.'
  }
  return WELCOME[context.origin.module]
}

export function getBoluSuggestions(context: BoluPageContext): BoluSuggestion[] {
  if (context.record?.kind === 'invoice') {
    return [
      {
        id: 'explain-invoice',
        label: 'Explain this invoice',
        prompt: 'Explain this invoice',
        capability: 'read-receivables',
      },
      {
        id: 'invoice-payment-status',
        label: 'Check payment status',
        prompt: 'Check payment status for this invoice',
        capability: 'read-receivables',
      },
      {
        id: 'find-related-invoice',
        label: 'Find another invoice',
        prompt: 'Find an invoice',
        capability: 'search-invoices',
      },
    ]
  }
  if (context.record?.kind === 'quotation') {
    return [
      {
        id: 'quotation-current-status',
        label: 'Show quotation status',
        prompt: 'Show the status of this quotation',
        capability: 'search-quotations',
      },
      {
        id: 'find-related-quotation',
        label: 'Find another quotation',
        prompt: 'Find a quotation',
        capability: 'search-quotations',
      },
    ]
  }
  return SUGGESTIONS[context.origin.module]
}
