import type {
  PurchaseOrder,
  PurchaseOrderCalculationInputs,
  PurchaseOrderExtraCharge,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from '@/domain/purchase-order/types'

export interface PreviewSupplierDetails {
  id: string
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  tax_id: string
}

export interface PreviewCompanyProfile {
  name: string
  monogram: string
  tagline: string
  address: string
  city: string
  state: string
  phone: string
  email: string
  tax_id: string
  vat_number: string
}

export interface PreviewAuditEntry {
  id: string
  actorLabel: string
  actionLabel: string
  timestamp: string
  note?: string
}

export const PREVIEW_COMPANY: PreviewCompanyProfile = {
  name: 'SAS Electrical & Industrial Engineering Ltd',
  monogram: 'SAS',
  tagline: 'Power Generation, Industrial Distribution & Automation Systems',
  address: 'Plot 14 Commercial Avenue, Ikeja Industrial Estate',
  city: 'Ikeja',
  state: 'Lagos State, Nigeria',
  phone: '+234 1 497 2200',
  email: 'procurement@sas-engineering.ng',
  tax_id: '24891023-0001',
  vat_number: 'SAS-VAT-092-IKJ',
}

export const PREVIEW_SUPPLIER_SCHNEIDER: PreviewSupplierDetails = {
  id: 'sup-schneider-01',
  name: 'Schneider Electric Nigeria Limited',
  contact_person: 'Chidinma Okafor (Senior Accounts Manager)',
  email: 'chidinma.okafor@se.com',
  phone: '+234 1 279 8000',
  address: 'Commercial House, 12 Commercial Avenue, Victoria Island',
  city: 'Lagos',
  state: 'Lagos State',
  tax_id: 'RC 489201 / TIN 10482910-0001',
}

export const PREVIEW_SUPPLIER_TOTAL: PreviewSupplierDetails = {
  id: 'sup-total-02',
  name: 'TotalEnergies Marketing Nigeria Plc',
  contact_person: 'Ibrahim Danjuma (Industrial Key Accounts)',
  email: 'orders.ng@totalenergies.com',
  phone: '+234 802 300 4500',
  address: 'Plot 247 Herbert Macaulay Way, Central Business District',
  city: 'Abuja',
  state: 'Federal Capital Territory',
  tax_id: 'RC 1395 / TIN 08392019-0001',
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Dataset 1: Industrial Switchgear & Automation Procurement (Schneider Electric)
 * ───────────────────────────────────────────────────────────────────────────── */
export const DATASET_1_ITEMS: PurchaseOrderItem[] = [
  {
    id: 'poi-1',
    purchase_order_id: 'po-2026-0042',
    description: 'Compact NSX100F 3-Phase 100A Moulded Case Circuit Breaker (MCCB) with Micrologic 2.2 Trip Unit',
    quantity: 12,
    unit: 'units',
    unit_cost: 185000,
    line_total: 2220000,
    sort_order: 1,
    _uiKey: 'poi-1',
  },
  {
    id: 'poi-2',
    purchase_order_id: 'po-2026-0042',
    description: '16mm² 4-Core XLPE/SWA/PVC Armoured Copper Underground Cable, 600/1000V rated (100m Drum)',
    quantity: 4,
    unit: 'drums',
    unit_cost: 640000,
    line_total: 2560000,
    sort_order: 2,
    _uiKey: 'poi-2',
  },
  {
    id: 'poi-3',
    purchase_order_id: 'po-2026-0042',
    description: 'Acti9 iPRD40r Type 2 Modular Surge Protection Device (SPD) 40kA 4-Pole with remote signaling contact',
    quantity: 8,
    unit: 'units',
    unit_cost: 78500,
    line_total: 628000,
    sort_order: 3,
    _uiKey: 'poi-3',
  },
  {
    id: 'poi-4',
    purchase_order_id: 'po-2026-0042',
    description: 'Heavy Duty Perforated Galvanized Steel Cable Tray 300mm × 50mm × 3m length with coupling accessories',
    quantity: 40,
    unit: 'lengths',
    unit_cost: 24500,
    line_total: 980000,
    sort_order: 4,
    _uiKey: 'poi-4',
  },
]

export const DATASET_1_EXTRA_CHARGES: PurchaseOrderExtraCharge[] = [
  {
    label: 'Dedicated Flatbed Freight & Depot Offloading (Ikeja Central Yard)',
    value: 150000,
    withTax: true,
  },
]

export const DATASET_1_CALCULATION_INPUTS: PurchaseOrderCalculationInputs = {
  vatPercent: 7.5,
  discountType: 'percent',
  discountTiming: 'before_tax',
  discountValue: 5, // 5% bulk procurement discount
}

export const DATASET_1_PO: PurchaseOrder = {
  id: 'po-sas-0042',
  po_number: 'PO-2026-0042',
  po_date: '2026-11-09',
  supplier_id: PREVIEW_SUPPLIER_SCHNEIDER.id,
  supplier_name: PREVIEW_SUPPLIER_SCHNEIDER.name,
  status: 'issued',
  currency: 'NGN',
  subtotal: 6388000,
  discount: 319400, // 5% of 6,388,000
  vat: 466395, // 7.5% of (6,388,000 - 319,400 + 150,000) = 7.5% of 6,218,600
  extra_charges: DATASET_1_EXTRA_CHARGES,
  total: 6684995,
  calculation_inputs: DATASET_1_CALCULATION_INPUTS,
  notes:
    'Deliver strictly to SAS Central Engineering Works Yard (Bay 3), Off Ashabi Cole Street, Ikeja. Delivery window: Monday to Friday 08:30 - 16:00. Every consignment drum must be tagged with factory batch numbers, test inspection certificates, and warranty seal intact.',
  terms:
    '1. Commercial Invoice & Delivery Note (Waybill) must cite PO number PO-2026-0042.\n2. Payment terms: 30 days net upon full QA/QC site inspection and commissioning verification.\n3. Defective, damaged, or non-conforming items will be rejected and returned at vendor expense within 7 calendar days.',
  created_at: '2026-11-09T08:15:00Z',
  updated_at: '2026-11-09T09:20:00Z',
  created_by: 'Babatunde Adeleke (Lead Procurement Engineer)',
  updated_by: 'Engr. Dapo Alabi (Head of Operations)',
  items: DATASET_1_ITEMS,
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Dataset 2: Fleet Consumables & High-Viscosity Lubricants (TotalEnergies)
 * ───────────────────────────────────────────────────────────────────────────── */
export const DATASET_2_ITEMS: PurchaseOrderItem[] = [
  {
    id: 'poi-201',
    purchase_order_id: 'po-2026-0089',
    description: 'Rubia TIR 7400 15W-40 Premium Heavy Duty Diesel Engine Oil (208L Steel Drum)',
    quantity: 6,
    unit: 'drums',
    unit_cost: 485000,
    line_total: 2910000,
    sort_order: 1,
    _uiKey: 'poi-201',
  },
  {
    id: 'poi-202',
    purchase_order_id: 'po-2026-0089',
    description: 'Transmission Gear Fluid Transmission Axle 7 80W-90 (20L Pail)',
    quantity: 15,
    unit: 'pails',
    unit_cost: 62000,
    line_total: 930000,
    sort_order: 2,
    _uiKey: 'poi-202',
  },
  {
    id: 'poi-203',
    purchase_order_id: 'po-2026-0089',
    description: 'Multis Complex EP 2 Extreme Pressure Lithium Complex Grease (18kg Pail)',
    quantity: 10,
    unit: 'pails',
    unit_cost: 74000,
    line_total: 740000,
    sort_order: 3,
    _uiKey: 'poi-203',
  },
]

export const DATASET_2_EXTRA_CHARGES: PurchaseOrderExtraCharge[] = [
  {
    label: 'Bulk Drum Handling & Environmental Compliance Packaging',
    value: 85000,
    withTax: false,
  },
]

export const DATASET_2_CALCULATION_INPUTS: PurchaseOrderCalculationInputs = {
  vatPercent: 7.5,
  discountType: 'fixed',
  discountTiming: 'before_tax',
  discountValue: 100000,
}

export const DATASET_2_PO: PurchaseOrder = {
  id: 'po-sas-0089',
  po_number: 'PO-2026-0089',
  po_date: '2026-11-08',
  supplier_id: PREVIEW_SUPPLIER_TOTAL.id,
  supplier_name: PREVIEW_SUPPLIER_TOTAL.name,
  status: 'draft',
  currency: 'NGN',
  subtotal: 4580000,
  discount: 100000,
  vat: 336000, // 7.5% of (4,580,000 - 100,000) = 7.5% of 4,480,000
  extra_charges: DATASET_2_EXTRA_CHARGES,
  total: 4901000, // 4,480,000 + 85,000 + 336,000
  calculation_inputs: DATASET_2_CALCULATION_INPUTS,
  notes:
    'Deliver to Fleet Operations Terminal, Idu Industrial District, Abuja. Receiving technician must sign calibration and seal verification checklist prior to discharge.',
  terms:
    'Payment due 14 days after physical receipt and batch certificate clearance. Product quality must conform to ISO 9001 and API CI-4/SL standards.',
  created_at: '2026-11-08T11:00:00Z',
  updated_at: '2026-11-08T11:45:00Z',
  created_by: 'Musa Bello (Fleet Inventory Supervisor)',
  items: DATASET_2_ITEMS,
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Activity & History logs
 * ───────────────────────────────────────────────────────────────────────────── */
export const PREVIEW_AUDIT_LOGS_SCHNEIDER: PreviewAuditEntry[] = [
  {
    id: 'log-1',
    actorLabel: 'Babatunde Adeleke (Procurement)',
    actionLabel: 'created purchase order draft',
    timestamp: '09 Nov 2026, 08:15',
    note: 'Initial RFQ comparison completed. Price locked per quarterly vendor agreement.',
  },
  {
    id: 'log-2',
    actorLabel: 'System Authority',
    actionLabel: 'captured supplier identity snapshot',
    timestamp: '09 Nov 2026, 08:15',
    note: 'Vendor identity frozen: Schneider Electric Nigeria Limited (TIN 10482910-0001).',
  },
  {
    id: 'log-3',
    actorLabel: 'Engr. Dapo Alabi (Operations Head)',
    actionLabel: 'approved procurement terms and discount',
    timestamp: '09 Nov 2026, 08:50',
    note: '5% volume incentive applied against electrical schedule.',
  },
  {
    id: 'log-4',
    actorLabel: 'Engr. Dapo Alabi (Operations Head)',
    actionLabel: 'issued purchase order to supplier',
    timestamp: '09 Nov 2026, 09:20',
    note: 'Procurement commitment finalized. Outgoing notification transmitted to vendor contact.',
  },
]

export const PREVIEW_AUDIT_LOGS_TOTAL: PreviewAuditEntry[] = [
  {
    id: 'log-201',
    actorLabel: 'Musa Bello (Fleet)',
    actionLabel: 'created purchase order draft',
    timestamp: '08 Nov 2026, 11:00',
    note: 'Prepared scheduled monthly lubricant replenishment order for fleet haulage units.',
  },
]
