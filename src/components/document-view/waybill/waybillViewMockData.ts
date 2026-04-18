import type { BaseDocument } from '../types/documentView'

export interface WaybillMetric {
  label: string
  value: string
  tone?: 'default' | 'amber' | 'green' | 'blue' | 'purple'
  hint?: string
}

export interface WaybillPreviewGroup {
  type: 'group'
  label: string
}

export interface WaybillPreviewItem {
  type: 'item'
  name: string
  description?: string
  quantity: string
  unit: string
  weight?: string
}

export const waybillDocument: BaseDocument = {
  id: 'phase-1-waybill',
  number: 'SASWB-1002',
  title: 'Waybill / Delivery Note',
  status: 'dispatched',
}

export const waybillSubtitle = 'Generator and Electrical Parts Delivery'

export const waybillThreadTag = 'Route: Ikeja - Lekki'

export const waybillMetrics: WaybillMetric[] = [
  { label: 'Total Packages', value: '5 Pallets', hint: 'Cargo weight ~450kg' },
  { label: 'Dispatch Date', value: '18 May 2025', tone: 'blue', hint: '14:30 WAT' },
  { label: 'Delivery Status', value: 'In Transit', tone: 'amber' },
]

export const waybillPreviewData = {
  shipperName: 'Sun & Shield Power Solutions',
  shipperLines: [
    'Warehouse 4, Acme Road, Ikeja',
    '+234 802 000 1234 · logistics@sunshieldpower.com',
  ],
  consigneeName: 'Pinnacle Towers Ltd',
  consigneeLines: [
    'Attn: Site Manager (Lekki Phase 1)',
    'Phase 1 Commercial Plant Site',
    '+234 811 000 9876',
  ],
  documentNumber: 'SASWB-1002',
  dateIssued: '18 May 2025',
  deliveryReference: 'PO-2025-119',
  vehicleReg: 'LSR 452 XY',
  driverName: 'Mohammed Yusuf',
  driverPhone: '0812 345 6789',
  rows: [
    { type: 'group', label: 'Main Equipment' },
    {
      type: 'item',
      name: '40KVA Soundproof Generator (FG Wilson)',
      description: 'S/N: FG-40-2025-001',
      quantity: '1',
      unit: 'unit',
      weight: '850kg',
    },
    { type: 'group', label: 'Accessories & Panel' },
    {
      type: 'item',
      name: 'ATS / Changeover Panel (100A)',
      quantity: '1',
      unit: 'set',
      weight: '45kg',
    },
    {
      type: 'item',
      name: 'Heavy Duty Power Cables 16mm',
      description: 'Armoured 4-core cable',
      quantity: '3',
      unit: 'drums',
      weight: '120kg',
    },
  ] as Array<WaybillPreviewGroup | WaybillPreviewItem>,
  notes:
    'Goods received in good condition. Receiver must sign and stamp the delivery note upon arrival. Any damages must be reported within 24 hours of receipt.',
}
