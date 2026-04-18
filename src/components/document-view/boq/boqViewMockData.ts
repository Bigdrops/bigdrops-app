import type { BaseDocument } from '../types/documentView'

export interface BoqMetric {
  label: string
  value: string
  tone?: 'default' | 'amber' | 'green' | 'blue'
  hint?: string
}

export interface BoqPreviewGroup {
  type: 'group'
  label: string
}

export interface BoqPreviewItem {
  type: 'item'
  refCode?: string
  name: string
  description?: string
  quantity: string
  unit: string
  rate: string
  amount: string
}

export interface BoqPreviewTotal {
  label: string
  value: string
  tone?: 'default' | 'grand' | 'sub'
}

export const boqDocument: BaseDocument = {
  id: 'phase-1-boq',
  number: 'SASBOQ-A101',
  title: 'Bill of Quantities',
  status: 'draft',
}

export const boqSubtitle = 'Main Power Plant Civil Works'

export const boqThreadTag = 'Revision 2 · Structural'

export const boqMetrics: BoqMetric[] = [
  { label: 'Total Value', value: '₦14,250,000', hint: 'Excl. Contingency' },
  { label: 'Line Items', value: '18 lines', hint: 'across 3 packages' },
  { label: 'Revision', value: 'Rev. 02', tone: 'blue' },
]

export const boqPreviewData = {
  projectName: 'Lekki Phase 1 Commercial Plant',
  clientName: 'Pinnacle Towers Ltd',
  documentNumber: 'SASBOQ-A101',
  dateIssued: '18 Nov 2025',
  preparedBy: 'Engineering Div.',
  rows: [
    { type: 'group', label: '1.0 Substructure & Earthworks' },
    {
      type: 'item',
      refCode: '1.01',
      name: 'Site Clearance',
      description: 'Clearing of topsoil and vegetation up to 150mm depth.',
      quantity: '400',
      unit: 'm2',
      rate: '₦1,200',
      amount: '₦480,000',
    },
    {
      type: 'item',
      refCode: '1.02',
      name: 'Trench Excavation',
      description: 'Excavating foundation trenches for main pad footprint.',
      quantity: '120',
      unit: 'm3',
      rate: '₦4,500',
      amount: '₦540,000',
    },
    { type: 'group', label: '2.0 Concrete Works' },
    {
      type: 'item',
      refCode: '2.01',
      name: 'Reinforced Concrete (Grade 25)',
      description: 'Supplying and pouring vibrated concrete into foundation trenches.',
      quantity: '45',
      unit: 'm3',
      rate: '₦180,000',
      amount: '₦8,100,000',
    },
    {
      type: 'item',
      refCode: '2.02',
      name: 'High yield reinforcement bars',
      description: '12mm-16mm Y-bars including cutting, bending and tying.',
      quantity: '2.5',
      unit: 'ton',
      rate: '₦1,200,000',
      amount: '₦3,000,000',
    },
  ] as Array<BoqPreviewGroup | BoqPreviewItem>,
  totals: [
    { label: 'Subtotal Base Works', value: '₦12,120,000' },
    { label: 'Preliminaries (5%)', value: '₦606,000' },
    { label: 'Contingency (10%)', value: '₦1,212,000', tone: 'sub' },
    { label: 'Estimated Total Value', value: '₦13,938,000', tone: 'grand' },
  ] as BoqPreviewTotal[],
  notes:
    'Rates are fixed for 60 days. All works strictly comply with British Standard BS 8110 for structural use of concrete. Excludes mechanical piping.',
}
