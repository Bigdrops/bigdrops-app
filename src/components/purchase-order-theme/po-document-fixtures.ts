/**
 * Purchase Order Document View — Design Lab fixtures.
 *
 * Representative Nigerian SME procurement scenario (Apex Industrial Supplies Ltd
 * ordering switchgear from Schneider Electric Nigeria). Zero tenant data — the
 * Design Lab page never touches Supabase, storage, or business services.
 *
 * The invoice specimen below mirrors the same company, items, and figures, so
 * the lab's compare toggle can mount the *actual* production Invoice document
 * card (`InvoiceDocumentCard`) next to the new PO concept with identical data.
 */

import { numberToWords } from '@/lib/formatters/money'

const moneyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatLabCurrency(value: number | null | undefined): string {
  return moneyFormatter.format(Number(value || 0))
}

export const PREVIEW_COMPANY = {
  name: 'Apex Industrial Supplies Ltd',
  tagline: 'Industrial distribution · Lagos',
  tin: 'TIN 20185734901',
  addressLines: ['Plot 14, Creek Road Industrial Layout', 'Apapa, Lagos'],
  phone: '+234 803 555 0188',
  email: 'operations@apexindustrial.ng',
  website: 'www.apexindustrial.ng',
}

export const PREVIEW_SUPPLIER = {
  name: 'Schneider Electric Nigeria Ltd',
  addressLines: ['4/6 Idowu Martins Street', 'Victoria Island, Lagos'],
  contact: 'Mrs. Kelechi Okorie · Key Account Manager',
  phone: '+234 809 120 4477',
  email: 'k.okorie@schneider-electric.com.ng',
  tin: 'TIN 18492037600',
  paymentTerms: 'Net 30 from delivery',
}

export const PREVIEW_DELIVERY = {
  site: 'Apapa Port Complex — Warehouse 4',
  attention: 'Storekeeper · Ngozi Ebere',
  addressLines: ['Apapa Port Access Road, Wharf Junction', 'Apapa, Lagos'],
  scheduledDate: '2026-11-21',
  instructions: 'Deliver before 14:00. Forklift on site. Offload into bay 4, do not block the fire lane.',
}

export type LabPoLine = {
  id: string
  description: string
  sub_description?: string | null
  make?: string | null
  quantity: number
  unit: string
  unit_cost: number
  line_total: number
}

export const PREVIEW_PO_ITEMS: LabPoLine[] = [
  {
    id: 'po-line-1',
    description: 'Masterpact MTZ2 20 630A air circuit breaker',
    sub_description: 'With MicroLogic 5.0E trip unit, 4P fixed',
    quantity: 2,
    unit: 'pcs',
    unit_cost: 1850000,
    line_total: 3700000,
  },
  {
    id: 'po-line-2',
    description: 'MVR 36kV ring main unit, 2L+1V configurations',
    sub_description: 'IP67, SF6 insulated, outdoor duty',
    quantity: 4,
    unit: 'pcs',
    unit_cost: 425000,
    line_total: 1700000,
  },
  {
    id: 'po-line-3',
    description: 'LV busbar kit, 4000A, tinned electrolytic copper',
    sub_description: 'Includes glands, fasteners and shrouds',
    quantity: 1,
    unit: 'lot',
    unit_cost: 1120000,
    line_total: 1120000,
  },
  {
    id: 'po-line-4',
    description: 'Commissioning and functional testing, site acceptance',
    sub_description: 'Two engineers, two days, reporting included',
    quantity: 1,
    unit: 'lot',
    unit_cost: 380000,
    line_total: 380000,
  },
  {
    id: 'po-line-5',
    description: 'Protection relay and CT commissioning kit',
    sub_description: 'Siemens 7SJ85 series, calibrated on site',
    make: 'Siemens',
    quantity: 1,
    unit: 'lot',
    unit_cost: 640000,
    line_total: 640000,
  },
  {
    id: 'po-line-6',
    description: 'Spares: MCB 3P C-curve 10A, Schneider Acti9',
    make: 'Schneider Electric',
    quantity: 100,
    unit: 'pcs',
    unit_cost: 2840,
    line_total: 284000,
  },
]

export const PREVIEW_PO_TOTALS = (() => {
  const subtotal = PREVIEW_PO_ITEMS.reduce((sum, item) => sum + item.line_total, 0)
  const discount = 345000
  const freight = 85000
  const taxable = subtotal - discount + freight
  const vat = Math.round(taxable * 0.075)
  const total = taxable + vat
  return {
    subtotal,
    discount,
    freight,
    vat,
    total,
    amountInWords: numberToWords(total),
  }
})()

export const PREVIEW_PO = {
  id: 'lab-po-000042',
  po_number: 'PO-2026-0042',
  po_title: 'Industrial switchgear restock',
  status: 'issued' as const,
  currency: 'NGN',
  po_date: '2026-11-02',
  delivery_date: PREVIEW_DELIVERY.scheduledDate,
  notes: '<p>All units to be delivered with factory test reports and original OEM warranty certificates.</p>',
  terms:
    '<ul><li>Partial deliveries require prior written approval.</li><li>Invoices must quote PO-2026-0042.</li><li>Goods failing factory acceptance are rejected on our cost.</li></ul>',
}

export const PREVIEW_PO_SIGNATORIES = {
  authorisation: {
    name: 'Adaeze Nwosu',
    role: 'Head of Procurement',
    signature: 'Adaeze Nwosu',
  },
  received: {
    name: 'Ngozi Ebere',
    role: 'Storekeeper, Apapa',
    signature: '',
  },
}

export const PREVIEW_PO_ACTIVITY = [
  { id: 'act-1', label: 'Adaeze Nwosu issued this purchase order', timestamp: '02 Nov 2026, 09:14' },
  { id: 'act-2', label: 'Draft approved by Emeka Obi (Finance Director)', timestamp: '31 Oct 2026, 16:40' },
  { id: 'act-3', label: 'Created from requisition REQ-2026-0018', timestamp: '30 Oct 2026, 11:02' },
]

/** Mirror specimen: same company, items and figures as the invoice rendering. */
export const PREVIEW_INVOICE = {
  id: 'lab-inv-000130',
  invoice_number: 'SASINV-000130',
  invoice_title: 'Industrial switchgear supply',
  status: 'unpaid',
  currency: 'NGN',
  issue_date: '2026-11-02',
  due_date: '2026-12-02',
  po_reference: 'PO-2026-0042',
  client_name: 'Meridian Fabrics Ltd',
  notes: '<p>All units delivered with factory test reports and original OEM warranty certificates.</p>',
  terms:
    '<ul><li>Payment within 30 days of delivery.</li><li>Invoices must quote PO-2026-0042.</li><li>Goods failing acceptance are rejected on the supplier&apos;s cost.</li></ul>',
  subtotal: PREVIEW_PO_TOTALS.subtotal,
  discount: PREVIEW_PO_TOTALS.discount,
  vat: PREVIEW_PO_TOTALS.vat,
  total: PREVIEW_PO_TOTALS.total,
}

export const PREVIEW_INVOICE_ITEMS = PREVIEW_PO_ITEMS.map((item) => ({
  description: item.description,
  sub_description: item.sub_description ?? null,
  quantity: item.quantity,
  unit: item.unit,
  unit_price: item.unit_cost,
  amount: item.line_total,
  vat_rate: 7.5,
}))

export const PREVIEW_CLIENT = {
  contact_person: 'Mr. Tunde Bakare · Director',
  address: '12 Adeola Odeku Street',
  city: 'Victoria Island',
  state: 'Lagos',
  phone: '+234 802 778 9034',
  email: 't.bakare@meridianfabrics.ng',
}

/** Same company, shaped for the production preview builder. */
export const PREVIEW_SETTINGS: import('@/domain/invoice/renderTypes').SettingsLike = {
  company_address: PREVIEW_COMPANY.addressLines[0],
  company_city: 'Apapa',
  company_state: 'Lagos',
  company_email: PREVIEW_COMPANY.email,
  company_phone: PREVIEW_COMPANY.phone,
  company_website: PREVIEW_COMPANY.website,
  custom_info: null,
}
