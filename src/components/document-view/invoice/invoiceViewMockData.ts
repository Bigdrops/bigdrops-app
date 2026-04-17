import type { BaseDocument } from '../types/documentView'

export interface InvoiceMetric {
  label: string
  value: string
  tone?: 'default' | 'amber' | 'green'
  hint?: string
}

export interface InvoicePreviewGroup {
  type: 'group'
  label: string
}

export interface InvoicePreviewItem {
  type: 'item'
  name: string
  description?: string
  quantity: string
  amount: string
}

export interface InvoicePreviewTotal {
  label: string
  value: string
  tone?: 'default' | 'grand' | 'balance'
}

export interface InvoicePaymentEntry {
  method: string
  reference: string
  amount: string
  date: string
  kind?: 'payment' | 'wht' | 'voided'
  tag?: string
}

export interface AdvanceInvoiceEntry {
  label: string
  subtitle: string
  amount: string
}

export const invoiceDocument: BaseDocument = {
  id: 'phase-1-invoice',
  number: 'SASINV-B047',
  title: 'Tax Invoice',
  status: 'partial',
}

export const invoiceSubtitle =
  'Generator supply and installation for backup power continuity'

export const invoiceThreadTag = 'Progress Invoice · 2 of 3'

export const invoiceMetrics: InvoiceMetric[] = [
  { label: 'Total', value: '₦4,720,000', hint: 'incl. 7.5% VAT' },
  { label: 'Received', value: '₦2,000,000', tone: 'green', hint: 'cash + WHT' },
  { label: 'Balance Due', value: '₦2,720,000', tone: 'amber', hint: 'due 30 May 25' },
]

export const invoicePreviewData = {
  companyName: 'Sun & Shield Power Solutions',
  companyLines: [
    '15B Adeyemo Alakija St, Victoria Island, Lagos',
    '+234 802 000 1234 · info@sunshieldpower.com',
    'RC No. 1234567 · TIN: 00123456-0001',
  ],
  documentNumber: 'SASINV-B047',
  poReference: 'PTO/2024/0183',
  clientName: 'Pinnacle Towers Ltd',
  clientSubline: 'Attn: Adekunle Afolabi',
  clientAddress: 'Pinnacle Building, Ozumba Mbadiwe',
  issueDate: '12 April 2025',
  dueDate: '30 May 2025',
  rows: [
    { type: 'group', label: 'Supply of Equipment' },
    {
      type: 'item',
      name: '40KVA Soundproof Generator (FG Wilson)',
      description: '3-phase, 415V output, with ATS panel and warranty',
      quantity: '1 unit',
      amount: '₦3,200,000',
    },
    {
      type: 'item',
      name: 'ATS / Changeover Panel (100A)',
      quantity: '1 set',
      amount: '₦180,000',
    },
    { type: 'group', label: 'Installation & Labour' },
    {
      type: 'item',
      name: 'Civil & Electrical Installation',
      description: 'Concrete plinth, cabling, conduits, earthing, load testing',
      quantity: '1 lot',
      amount: '₦650,000',
    },
    {
      type: 'item',
      name: 'Commissioning & Handover',
      quantity: '1',
      amount: '₦120,000',
    },
  ] as Array<InvoicePreviewGroup | InvoicePreviewItem>,
  totals: [
    { label: 'Subtotal', value: '₦4,150,000' },
    { label: 'Workmanship', value: '₦120,000' },
    { label: 'Transportation', value: '₦85,000' },
    { label: 'VAT (7.5%)', value: '₦365,000' },
    { label: 'Total Due', value: '₦4,720,000', tone: 'grand' },
    { label: 'Balance Remaining', value: '₦2,720,000', tone: 'balance' },
  ] as InvoicePreviewTotal[],
  notes:
    'All equipment carries a 12-month warranty from commissioning. WHT deductions must be accompanied by a valid WHT certificate. Payment within stipulated period.',
  bankRows: [
    ['Bank', 'Zenith Bank PLC'],
    ['Account Name', 'Sun & Shield Power Solutions'],
    ['Account Number', '2109384756'],
  ] as Array<[string, string]>,
  amountWords:
    'Four million, seven hundred and twenty thousand naira only (₦4,720,000.00)',
}

export const invoicePaymentHistory: InvoicePaymentEntry[] = [
  {
    method: 'Bank Transfer',
    reference: 'ZEN/2025/0041938',
    amount: '₦1,650,000',
    date: '14 Apr 2025',
  },
  {
    method: 'WHT Credit',
    reference: 'WHT/LAS/2025/1177',
    amount: '₦350,000',
    date: '12 Apr 2025',
    kind: 'wht',
    tag: '5% WHT rate',
  },
]

export const invoiceAdvanceItems: AdvanceInvoiceEntry[] = [
  {
    label: 'Mobilisation Advance',
    subtitle: '30% · Generated 01 Mar 2025',
    amount: '₦1,416,000',
  },
  {
    label: 'Generator Delivery Balance',
    subtitle: '20% · Generated 18 Mar 2025',
    amount: '₦944,000',
  },
]
