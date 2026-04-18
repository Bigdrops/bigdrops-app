import type { BaseDocument } from '../types/documentView'

export interface QuotationMetric {
  label: string
  value: string
  tone?: 'default' | 'amber' | 'green'
  hint?: string
}

export interface QuotationPreviewGroup {
  type: 'group'
  label: string
}

export interface QuotationPreviewItem {
  type: 'item'
  name: string
  description?: string
  quantity: string
  amount: string
}

export interface QuotationPreviewTotal {
  label: string
  value: string
  tone?: 'default' | 'grand' | 'balance'
}

export const quotationDocument: BaseDocument = {
  id: 'phase-1-quotation',
  number: 'SASQUO-B031',
  title: 'Quotation',
  status: 'draft',
}

export const quotationSubtitle =
  'Generator supply and installation for backup power continuity'

export const quotationThreadTag = 'Standard Quotation · V1'

export const quotationMetrics: QuotationMetric[] = [
  { label: 'Total Amount', value: '₦4,720,000', hint: 'incl. 7.5% VAT' },
  { label: 'Valid Until', value: '12 May 2025', hint: '30 days validity' },
]

export const quotationPreviewData = {
  companyName: 'Sun & Shield Power Solutions',
  companyLines: [
    '15B Adeyemo Alakija St, Victoria Island, Lagos',
    '+234 802 000 1234 · info@sunshieldpower.com',
    'RC No. 1234567 · TIN: 00123456-0001',
  ],
  documentNumber: 'SASQUO-B031',
  poReference: 'PTO/2024/0183',
  clientName: 'Pinnacle Towers Ltd',
  clientSubline: 'Attn: Adekunle Afolabi',
  clientAddress: 'Pinnacle Building, Ozumba Mbadiwe',
  issueDate: '12 April 2025',
  dueDate: '12 May 2025',
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
  ] as Array<QuotationPreviewGroup | QuotationPreviewItem>,
  totals: [
    { label: 'Subtotal', value: '₦4,150,000' },
    { label: 'Workmanship', value: '₦120,000' },
    { label: 'Transportation', value: '₦85,000' },
    { label: 'VAT (7.5%)', value: '₦365,000' },
    { label: 'Total Amount', value: '₦4,720,000', tone: 'grand' },
  ] as QuotationPreviewTotal[],
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
