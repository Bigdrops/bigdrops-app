import { makeEmptyItem, makeExtraCharge, makeFieldEntry } from '@/domain/invoice'
import type { ExtraCharge, InvoiceAttachment, InvoiceFieldEntry, InvoiceItem } from '@/domain/invoice'

/**
 * Representative data for the Invoice Form Theme Experiment.
 *
 * Every value is local to the preview. Nothing here is read from or written to
 * Supabase, and no identifier matches a production record. The shapes follow the
 * production document types, so the mounted form presentation resolves exactly
 * as it resolves on the invoice route.
 */

/** Document fields, in the shape `useInvoiceEditableState` seeds from. */
export const PREVIEW_INVOICE = {
  invoice_number: 'INV-000248',
  po_number: 'PO-88410',
  project_id: '',
  client_id: 'preview-client-1',
  client_name: 'Cordelia Electricals Ltd',
  invoice_title: 'Second fix electrical works',
  issue_date: '2026-10-06',
  due_date: '2026-10-20',
  status: 'unpaid',
  document_type: 'INVOICE',
  payment_terms: 'Net 14',
  custom_payment_terms: '',
  notes: 'Please quote the invoice number on all payments.',
  terms: 'Payment is due within 14 days of the issue date. Late payments attract 2% monthly interest.',
  workmanship: 45000,
  transportation: 18000,
  shipping: 0,
  discount: 2.5,
  vat: 7.5,
  wht: 0,
  work_duration: '6 working days',
  amount_in_words: '',
} as const

export const PREVIEW_CLIENT = {
  id: 'preview-client-1',
  name: 'Cordelia Electricals Ltd',
  contact: 'Ngozi Eze',
  phone: '0702 118 8845',
  email: 'accounts@cordelia.ng',
  address: '12 Alausa Road, Ikeja, Lagos',
} as const

/** A grouped document: one group header, two grouped rows, two loose rows. */
const GROUP_ID = 'preview-group-1'
const GROUP_NAME = 'Ground floor wiring'

/** Every field starts from the production empty row, so no shape is invented. */
function previewItem(overrides: Partial<InvoiceItem>): InvoiceItem {
  return { ...makeEmptyItem(), ...overrides }
}

export const PREVIEW_INVOICE_ITEMS: InvoiceItem[] = [
  previewItem({
    row_type: 'group_header',
    group_id: GROUP_ID,
    group_name: GROUP_NAME,
    description: GROUP_NAME,
    sort_order: 0,
  }),
  previewItem({
    row_type: 'standard',
    group_id: GROUP_ID,
    group_name: GROUP_NAME,
    sort_order: 1,
    description: '2.5mm twin and earth cable',
    make: 'Nexans',
    quantity: 12,
    unit: 'roll',
    unit_price: 68000,
  }),
  previewItem({
    row_type: 'standard',
    group_id: GROUP_ID,
    group_name: GROUP_NAME,
    sort_order: 2,
    description: 'Surface-mounted double socket outlet',
    make: 'Schneider',
    quantity: 24,
    unit: 'pcs',
    unit_price: 14500,
    discount_rate: 5,
  }),
  previewItem({
    row_type: 'standard',
    group_id: null,
    group_name: '',
    sort_order: 3,
    description: 'Distribution board installation and testing',
    sub_description: 'Includes certification and load balancing',
    quantity: 1,
    unit: 'job',
    unit_price: 285000,
    install_rate: 10,
    install_rate_override: true,
  }),
  previewItem({
    row_type: 'standard',
    group_id: null,
    group_name: '',
    sort_order: 4,
    description: 'Cable tray and conduit runs',
    quantity: 45,
    unit: 'm',
    unit_price: 9500,
    vat_rate: 0,
  }),
].map((item, index): InvoiceItem => ({ ...item, sort_order: index }))

/** Header fields shown under the document identity. */
export const PREVIEW_HEADER_FIELDS: InvoiceFieldEntry[] = [
  makeFieldEntry({ label: 'Site', value: 'Plot 14, Lekki Phase 1' }),
  makeFieldEntry({ label: 'Contact', value: PREVIEW_CLIENT.contact }),
  makeFieldEntry({ label: 'Phone', value: PREVIEW_CLIENT.phone }),
]

/** Additional fields shown in the commercial terms section. */
export const PREVIEW_ADDITIONAL_FIELDS: InvoiceFieldEntry[] = [
  makeFieldEntry({ label: 'Delivery', value: 'On site, weekdays 8am – 5pm' }),
  makeFieldEntry({ label: 'Reference', value: 'COR-2026-114' }),
]

/** Extra charges, one taxable and one not. */
export const PREVIEW_EXTRA_CHARGES: ExtraCharge[] = [
  makeExtraCharge({ label: 'Site supervision', value: 65000, withTax: true }),
  makeExtraCharge({ label: 'Equipment hire', value: 40000, withTax: false }),
]

/** Reference links shown beside the notes. */
export const PREVIEW_ATTACHMENTS: InvoiceAttachment[] = [
  { label: 'Site survey', url: 'https://example.com/preview/site-survey.pdf' },
  { label: 'Bill of quantities', url: 'https://example.com/preview/boq.pdf' },
]

export const PREVIEW_SIGNATORIES = [
  { id: 'preview-signatory-1', name: 'Adewale Musa', role: 'Finance Manager' },
  { id: 'preview-signatory-2', name: 'Chioma Okafor', role: 'Director' },
]

export const PREVIEW_BANK_ACCOUNTS = [
  {
    id: 'preview-bank-1',
    bankName: 'Zenith Bank',
    accountName: 'BIGDROPS NIGERIA LTD',
    accountNumber: '1012223344',
    sortCode: '057',
    isDefault: true,
  },
  {
    id: 'preview-bank-2',
    bankName: 'GTBank',
    accountName: 'BIGDROPS NIGERIA LTD',
    accountNumber: '0221445588',
    sortCode: '058',
    isDefault: false,
  },
]

export const PREVIEW_COMPANY_PROFILE = {
  tagline: 'Power, projects, and progress',
  footerText: 'BIGDROPS Nigeria Ltd · 14 Adeniyi Jones, Ikeja, Lagos · TIN 20884471-0001',
} as const
