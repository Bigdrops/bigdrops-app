/**
 * Representative read-only data for the Dashboard Theme Experiment
 * (`/design-lab/dashboard-theme`).
 *
 * The production dashboard reads live tenant data through `useDashboardData`
 * and `useNotifications`. The experiment must not open those providers: they
 * query Supabase and expose mutation-capable controls. This module supplies
 * the same shapes with fixed sample values so the preview presents the real
 * dashboard structure without touching production data.
 *
 * The shapes are the production types (`KpiStats`, `RecentDoc`) and the
 * production KPI metric selection, so `buildKpiCards` and the shared
 * formatters resolve the preview exactly as they resolve the dashboard.
 */

import type { RecentDoc, KpiStats } from '@/hooks/useDashboardData'
import { DEFAULT_KPI_METRIC_IDS, type KpiMetricId } from '@/config/kpiCards'

export const PREVIEW_WORKSPACE = {
  workspace: 'bigdrops-hq',
  business: 'Bigdrops Logistics Ltd',
  user: 'Adaeze',
} as const

/**
 * Sample KPI ingredient set. Every field is present because `buildKpiCards`
 * reads trends and segmented bars from the comparison fields.
 */
export const PREVIEW_KPI_STATS: KpiStats = {
  collections: 12_480_000,
  openWork: 18,
  awaitingPaymentCount: 6,
  inTransitWaybills: 3,
  overdue: 2,
  pastDue: 1,
  dueThisWeek: 4,
  thisMonthCollections: 3_420_000,
  pendingFollowUp: 5,
  prevMonthCollections: 2_780_000,
  outstandingTotal: 6_150_000,
  dueLastWeekWindow: 2_400_000,
  totalFinancialRows: 148,
  waybillsTotal: 96,
  waybillsDispatchedTotal: 61,
  totalInvoiced: 24_900_000,
  thisMonthInvoiced: 4_050_000,
  prevMonthInvoiced: 3_600_000,
  vatOnPaid: 1_018_400,
  whtOnPaid: 342_000,
  vatUnpaid: 486_200,
  whtOutstanding: 168_400,
}

/** Production KPI selection, so the preview shows the dashboard's own cards. */
export const PREVIEW_KPI_SELECTION: KpiMetricId[] = DEFAULT_KPI_METRIC_IDS

export const PREVIEW_RECENT_DOCS: RecentDoc[] = [
  {
    id: 'inv-2049',
    type: 'Invoice',
    number: 'INV-2049',
    client: 'Delta Marine Services',
    date: '2026-10-09',
    status: 'paid',
    amount: 1_250_000,
    path: '/invoices/inv-2049',
  },
  {
    id: 'quo-1188',
    type: 'Quotation',
    number: 'QUO-1188',
    client: 'Lagos Intermodal',
    date: '2026-10-08',
    status: 'sent',
    amount: 2_780_000,
    path: '/quotations/quo-1188',
  },
  {
    id: 'wb-773',
    type: 'Waybill',
    number: 'WB-773',
    client: 'Delta Marine Services',
    date: '2026-10-07',
    status: 'delivered',
    path: '/waybills/wb-773',
  },
  {
    id: 'csr-412',
    type: 'CSR',
    number: 'CSR-412',
    client: 'Harbour Freight',
    date: '2026-10-06',
    status: 'draft',
    path: '/csr/csr-412',
  },
  {
    id: 'rfq-233',
    type: 'RFQ',
    number: 'RFQ-233',
    client: 'Northline Haulage',
    date: '2026-10-05',
    status: 'open',
    path: '/rfqs/rfq-233',
  },
  {
    id: 'inv-2041',
    type: 'Invoice',
    number: 'INV-2041',
    client: 'Harbour Freight',
    date: '2026-10-03',
    status: 'overdue',
    amount: 640_000,
    path: '/invoices/inv-2041',
  },
]

export type PreviewAlert = {
  id: string
  title: string
  body: string
  severity: 'info' | 'warning' | 'success'
  domain: string
  time: string
  unread: boolean
}

export const PREVIEW_ALERTS: PreviewAlert[] = [
  {
    id: 'alert-1',
    title: 'INV-2041 is 9 days overdue',
    body: 'Harbour Freight has an outstanding balance of ₦640,000 past the agreed terms.',
    severity: 'warning',
    domain: 'invoice',
    time: '2 hours ago',
    unread: true,
  },
  {
    id: 'alert-2',
    title: 'Payment recorded for INV-2049',
    body: 'Delta Marine Services settled ₦1,250,000 in full.',
    severity: 'success',
    domain: 'payment',
    time: '6 hours ago',
    unread: true,
  },
  {
    id: 'alert-3',
    title: 'Waybill WB-773 delivered',
    body: 'Proof of delivery was captured for the Lagos to Abuja shipment.',
    severity: 'info',
    domain: 'waybill',
    time: 'Yesterday',
    unread: false,
  },
  {
    id: 'alert-4',
    title: 'VAT for September is unreconciled',
    body: '₦486,200 of VAT on unpaid invoices is still open.',
    severity: 'warning',
    domain: 'tax',
    time: '2 days ago',
    unread: false,
  },
]

export type PreviewAuditEntry = {
  id: string
  text: string
  meta: string
  variant: 'primary' | 'copper'
}

export const PREVIEW_AUDIT_ENTRIES: PreviewAuditEntry[] = [
  {
    id: 'audit-1',
    text: 'INV-2049 payment recorded by ada@bigdrops.ng',
    meta: 'Today, 9:42 AM',
    variant: 'primary',
  },
  {
    id: 'audit-2',
    text: 'QUO-1188 created by ada@bigdrops.ng',
    meta: 'Today, 8:15 AM',
    variant: 'copper',
  },
  {
    id: 'audit-3',
    text: 'WB-773 status changed to delivered by emeka@bigdrops.ng',
    meta: 'Yesterday, 4:28 PM',
    variant: 'copper',
  },
  {
    id: 'audit-4',
    text: 'CSR-412 logged by tunde@bigdrops.ng',
    meta: 'Yesterday, 11:02 AM',
    variant: 'copper',
  },
]

export const PREVIEW_REMINDER = {
  eyebrow: 'Smart banner',
  headline: 'Keep payments recorded as they land',
  copy: 'Record each invoice payment promptly so your books stay accurate.',
} as const
