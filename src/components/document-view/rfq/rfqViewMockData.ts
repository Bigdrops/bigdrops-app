import type { BaseDocument } from '../types/documentView'

export interface RfqMetric {
  label: string
  value: string
  tone?: 'default' | 'amber' | 'green' | 'red'
  hint?: string
}

export interface RfqPreviewGroup {
  type: 'group'
  label: string
}

export interface RfqPreviewItem {
  type: 'item'
  name: string
  description?: string
  quantity: string
  uom: string
}

export const rfqDocument: BaseDocument = {
  id: 'phase-1-rfq',
  number: 'SASRFQ-0021',
  title: 'Request for Quotation',
  status: 'open',
}

export const rfqSubtitle = 'Supply of Heavy Equipment Parts'

export const rfqThreadTag = 'Tender Request · Urgent'

export const rfqMetrics: RfqMetric[] = [
  { label: 'Requested Items', value: '14 lines', hint: 'mixed equipment' },
  { label: 'Submission Deadline', value: '25 May 2025', tone: 'amber', hint: '12:00 PM WAT' },
  { label: 'Priority', value: 'High', tone: 'red' },
]

export const rfqPreviewData = {
  companyName: 'Sun & Shield Power Solutions',
  companyLines: [
    '15B Adeyemo Alakija St, Victoria Island, Lagos',
    '+234 802 000 1234 · procurement@sunshieldpower.com',
    'RC No. 1234567 · TIN: 00123456-0001',
  ],
  documentNumber: 'SASRFQ-0021',
  rfqReference: 'PR/2025/1109',
  vendorName: 'Multiple Eligible Vendors',
  vendorSubline: 'Tender Invitation Category B',
  issueDate: '10 May 2025',
  deadline: '25 May 2025',
  rows: [
    { type: 'group', label: 'Engine Components' },
    {
      type: 'item',
      name: 'Fuel Injector Nozzle',
      description: 'Part No. 123-x4. Compatible with Perkins 1104',
      quantity: '40',
      uom: 'pcs',
    },
    {
      type: 'item',
      name: 'Fuel Filter Element',
      quantity: '120',
      uom: 'units',
    },
    { type: 'group', label: 'Electricals' },
    {
      type: 'item',
      name: 'Deep Sea Controller Board',
      description: 'DSE 7320 AMF Controller, fully programmed',
      quantity: '5',
      uom: 'pcs',
    },
  ] as Array<RfqPreviewGroup | RfqPreviewItem>,
  notes:
    'All bids must include valid lead times and strict adherence to specific part numbers. Substitutes must be clearly indicated in your submission. Deliveries to Ikeja main warehouse.',
}
