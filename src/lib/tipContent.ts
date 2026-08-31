/**
 * Loading-tip content library.
 *
 * Every tip is evidence-backed against repository source code.
 * The `context` field uses module names matching the routing structure.
 * Tips with a non-null `context` are preferred when the loading operation
 * relates to that module.
 *
 * @see docs/prd/Adaptive\ Mobile-First\ UIUX\ Facelift\ PRD/10-loading-and-refresh.md §7
 * @see docs/Reports/GENERAL/Tips-and-Tricks-Hidden-Functionality-Audit-2026-08-31.md
 */

export type TipCategory =
  | 'Feature Tips'
  | 'Workflow Tips'
  | 'Productivity Tips'
  | 'Document Tips'
  | 'Business Operations Tips'
  | 'Navigation Tips'
  | 'Contextual Tips'

export type LoadingTip = {
  id: string
  category: TipCategory
  message: string
  context: string | null
  priority: number
  audience: 'all'
  repeatPolicy: string
  active: boolean
}

// ── Feature Tips ────────────────────────────────────────────────────

const featureTips: LoadingTip[] = [
  {
    id: 'tip.feature.compliance-hub',
    category: 'Feature Tips',
    message:
      'The Compliance Hub tracks VAT exposure, WHT receipts, tax filings, and obligations. Open it from the menu to see what needs attention.',
    context: 'compliance',
    priority: 1,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.feature.convert-quotation',
    category: 'Feature Tips',
    message:
      'Convert an approved quotation directly into an invoice with one tap.',
    context: 'quotations',
    priority: 2,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.feature.advance-invoice',
    category: 'Feature Tips',
    message:
      'Need partial payment before work begins? Create an Advance Invoice from any standalone invoice. Set a percentage or fixed amount.',
    context: 'invoices',
    priority: 3,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.feature.item-library-suggestions',
    category: 'Feature Tips',
    message:
      'While typing a line item, the app suggests matching items from your library with past prices. Select one to auto-fill the row.',
    context: 'invoices',
    priority: 4,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.feature.duplicate-document',
    category: 'Feature Tips',
    message:
      'Any document can be duplicated. Open it, tap More, and select Duplicate.',
    context: null,
    priority: 5,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.feature.column-settings',
    category: 'Feature Tips',
    message:
      'Tap the table settings icon on any form to customise which columns appear and their order.',
    context: 'invoices',
    priority: 6,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.feature.blank-waybill',
    category: 'Feature Tips',
    message:
      'Need a waybill for the field? Download a blank waybill PDF from the waybill creation screen. The system tracks the assigned number.',
    context: 'waybills',
    priority: 7,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
]

// ── Workflow Tips ───────────────────────────────────────────────────

const workflowTips: LoadingTip[] = [
  {
    id: 'tip.workflow.record-payment',
    category: 'Workflow Tips',
    message:
      'Received a payment? Record it against the invoice. Your balance stays accurate, a receipt is generated, and audit records are created.',
    context: 'invoices',
    priority: 1,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.workflow.revert-invoice',
    category: 'Workflow Tips',
    message:
      'Made a mistake on an invoice? Use "Revert to Quotation" from the invoice menu. It restores the quotation with all items preserved.',
    context: 'invoices',
    priority: 2,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.workflow.waybill-from-invoice',
    category: 'Workflow Tips',
    message:
      'Generate a waybill directly from an invoice. Line items transfer automatically and monetary values are stripped.',
    context: 'invoices',
    priority: 3,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.workflow.csr-from-invoice',
    category: 'Workflow Tips',
    message:
      'Create a Customer Service Report directly from an invoice. The "Generate CSR" option is in the invoice action menu.',
    context: 'invoices',
    priority: 4,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.workflow.offline-drafts',
    category: 'Workflow Tips',
    message:
      'On Android, you can create quotation and CSR drafts offline. They sync when you reconnect.',
    context: null,
    priority: 5,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
]

// ── Productivity Tips ───────────────────────────────────────────────

const productivityTips: LoadingTip[] = [
  {
    id: 'tip.productivity.csv-export',
    category: 'Productivity Tips',
    message:
      'Export any invoice or quotation as CSV from the action menu for spreadsheets, price comparisons, or external reports.',
    context: 'invoices',
    priority: 1,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.productivity.json-import',
    category: 'Productivity Tips',
    message:
      'Import line items from a JSON file instead of typing them manually. Available on invoice and quotation forms.',
    context: 'invoices',
    priority: 2,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.productivity.merge-qty-unit',
    category: 'Productivity Tips',
    message:
      'Merge the Quantity and Unit columns into one to save space on narrow screens. Toggle it from the document options.',
    context: 'invoices',
    priority: 3,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.productivity.custom-columns',
    category: 'Productivity Tips',
    message:
      'Add custom columns to your line-item table for specifications, part numbers, or internal notes.',
    context: 'invoices',
    priority: 4,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.productivity.duplicate-quotation',
    category: 'Productivity Tips',
    message:
      'Reuse a quotation\u2019s line items: open it, tap More, and select Duplicate. The new draft keeps all items but clears client and number fields.',
    context: 'quotations',
    priority: 5,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
]

// ── Document Tips ───────────────────────────────────────────────────

const documentTips: LoadingTip[] = [
  {
    id: 'tip.document.internal-external-waybill',
    category: 'Document Tips',
    message:
      'External Waybills are for client deliveries. Internal Waybills are for custody transfers between your own teams. Choose the right type.',
    context: 'waybills',
    priority: 1,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.document.waybill-strips-money',
    category: 'Document Tips',
    message:
      'Waybills strip monetary values by design. Rates and totals live on the source invoice.',
    context: 'waybills',
    priority: 2,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.document.pdf-templates',
    category: 'Document Tips',
    message:
      'Switch between document templates to change your PDF style.',
    context: 'pdf-generation',
    priority: 3,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.document.signatory',
    category: 'Document Tips',
    message:
      'Add a signatory to your document for authorised approval. The signature appears on the PDF.',
    context: null,
    priority: 4,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.document.reference-links',
    category: 'Document Tips',
    message:
      'Attach reference links to documents. They appear on the PDF and in the document view.',
    context: null,
    priority: 5,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
]

// ── Business Operations Tips ────────────────────────────────────────

const businessTips: LoadingTip[] = [
  {
    id: 'tip.business.auto-receipt',
    category: 'Business Operations Tips',
    message:
      'Every recorded payment automatically generates a receipt. View and download it from the Receipts page.',
    context: 'invoices',
    priority: 1,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.business.overdue-recalc',
    category: 'Business Operations Tips',
    message:
      'Overdue flags recalculate every time the dashboard loads. No manual refresh needed.',
    context: null,
    priority: 2,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.business.wht-deduction',
    category: 'Business Operations Tips',
    message:
      'Withholding Tax (WHT) is deducted automatically when you select the WHT option on an invoice.',
    context: 'invoices',
    priority: 3,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.business.document-prefixes',
    category: 'Business Operations Tips',
    message:
      'Customise document number prefixes in Settings. Set distinct prefixes for invoices, quotations, waybills, and CSRs.',
    context: null,
    priority: 4,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.business.archives-restore',
    category: 'Business Operations Tips',
    message:
      'Accidentally archived a document? Go to Settings > Archives to restore it. Invoices, quotations, projects, and more can be recovered.',
    context: null,
    priority: 5,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.business.dashboard-kpi-config',
    category: 'Business Operations Tips',
    message:
      'Choose which KPI tiles appear on your dashboard. Go to Settings > Dashboard Layout to customise them.',
    context: null,
    priority: 6,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.business.device-codes',
    category: 'Business Operations Tips',
    message:
      'Each linked device gets a unique two-letter code. Use it to track which device created a document.',
    context: null,
    priority: 7,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
]

// ── Navigation Tips ─────────────────────────────────────────────────

const navigationTips: LoadingTip[] = [
  {
    id: 'tip.navigation.global-search',
    category: 'Navigation Tips',
    message:
      'Tap the search icon to find any document across all modules. Search by document number, client name, or project name.',
    context: null,
    priority: 1,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.navigation.client-workspace',
    category: 'Navigation Tips',
    message:
      'Tap a client name to open their workspace. See all invoices, quotations, CSRs, and waybills in one place.',
    context: 'clients',
    priority: 2,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.navigation.project-hub',
    category: 'Navigation Tips',
    message:
      'Open a project to see all linked invoices, quotations, waybills, and CSRs in one place.',
    context: 'projects',
    priority: 3,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.navigation.recent-documents',
    category: 'Navigation Tips',
    message:
      'Your recently viewed documents appear on the dashboard for quick access.',
    context: null,
    priority: 4,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
]

// ── Contextual Tips ─────────────────────────────────────────────────

const contextualTips: LoadingTip[] = [
  {
    id: 'tip.contextual.quotation-expiry',
    category: 'Contextual Tips',
    message:
      'Set an expiry date on quotations to automatically flag overdue responses.',
    context: 'quotations',
    priority: 1,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
  {
    id: 'tip.contextual.pdf-generating',
    category: 'Contextual Tips',
    message:
      'While you wait for this PDF, review the document details or prepare the next one.',
    context: 'pdf-generation',
    priority: 2,
    audience: 'all',
    repeatPolicy: 'session:3',
    active: true,
  },
]

// ── Exported library ────────────────────────────────────────────────

export const TIP_LIBRARY: LoadingTip[] = [
  ...featureTips,
  ...workflowTips,
  ...productivityTips,
  ...documentTips,
  ...businessTips,
  ...navigationTips,
  ...contextualTips,
].filter((tip) => tip.active)
