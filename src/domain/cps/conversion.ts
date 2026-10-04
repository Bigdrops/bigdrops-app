import type { Cps } from './types'
import type { TableDocumentRow } from '@/domain/table-document/types'
import { computeDocument } from '@/lib/Calculations'
import { BUILTIN_COLUMNS } from '@/domain/invoice/columns'
import { buildCalculationInputs } from '@/domain/invoice/calculations'
import { normalizeExtraCharges } from '@/domain/invoice/factories'
import type { ExtraCharge } from '@/domain/invoice/types'
import { withSourceTrail, buildTrailLink } from '@/domain/documentConversion'

export interface ConvertedQuotationItem {
  quotation_id?: string
  sort_order: number
  row_type: 'standard' | 'group_header'
  description: string
  sub_description: string | null
  make: string | null
  quantity: number
  unit: string | null
  unit_price: number
  amount: number
  group_id: string | null
  group_name: string | null
  image_url: string | null
  vat_rate: number | null
  discount_rate: number | null
  install_rate: number | null
  install_rate_override: boolean
  install_rate_taxable: boolean | null
  custom_data: string
}

export interface ConvertedQuotationPayload {
  quotation_number: string
  po_number: string | null
  quotation_title: string
  client_id: string | null
  client_name: string
  issue_date: string
  status: 'open'
  vat: number
  discount: number
  subtotal: number
  total: number
  source_cps_id: string
  notes: null
  terms: null
  project_id: null
  custom_fields: string
}

export interface CpsToQuotationMappingResult {
  payload: ConvertedQuotationPayload
  items: ConvertedQuotationItem[]
}

export interface CpsConversionOptions {
  vatRate: number
  discountValue: number
  discountType: 'fixed' | 'percent'
  discountTiming: 'before' | 'after'
  extraCharges: ExtraCharge[]
}

export const DEFAULT_CONVERSION_OPTIONS: CpsConversionOptions = {
  vatRate: 0,
  discountValue: 0,
  discountType: 'fixed',
  discountTiming: 'after',
  extraCharges: [],
}

function cleanCustomData(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const forbidden = new Set([
    'cp',
    'cost',
    'total_cost',
    'notes',
    'margin',
    'margin_percent',
    'profit',
    'project',
    'project_name',
    'site',
    'vendor_name',
    'vendor_contact',
  ])
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!forbidden.has(key.toLowerCase())) {
      result[key] = value
    }
  }
  return result
}

function sectionKey(row: TableDocumentRow): string {
  return row.group_id || row.id || row._uiKey || ''
}

function toStandardItem(
  row: TableDocumentRow,
  sortOrder: number,
  groupId: string | null,
  groupName: string | null,
): ConvertedQuotationItem {
  const sp = Number(row.sp || 0)
  const qty = Number(row.quantity || 0)
  return {
    sort_order: sortOrder,
    row_type: 'standard',
    description: row.description || '',
    sub_description: row.specification || null,
    make: row.make_brand || null,
    quantity: qty,
    unit: row.unit || null,
    unit_price: sp,
    amount: qty * sp,
    group_id: groupId,
    group_name: groupName,
    image_url: row.image_url || null,
    vat_rate: row.vat_rate != null ? Number(row.vat_rate) : null,
    discount_rate: row.discount_rate != null ? Number(row.discount_rate) : null,
    install_rate: row.install_rate != null ? Number(row.install_rate) : null,
    install_rate_override: Boolean(row.install_rate_override),
    install_rate_taxable: row.install_rate_taxable != null ? Boolean(row.install_rate_taxable) : null,
    custom_data: JSON.stringify(cleanCustomData(row.custom_data)),
  }
}

/**
 * Maps a Cost & Pricing Sheet into the Quotation domain model.
 * Emits rows in CPS source order so non-contiguous membership and row
 * order survive verbatim; the target resolves membership by group_id.
 * Enforces:
 * - CPS SP becomes Quotation commercial price authority (unit_price).
 * - CP is excluded (never mapped, never hidden in custom data).
 * - CPS notes are excluded.
 * - CPS project/site context is excluded.
 * - Header rows use row_type 'group_header' with quantity 0, unit_price 0.
 * - Totals derive through computeDocument over the transferred selling prices.
 */
export function mapCpsToQuotation(
  cps: Cps,
  nextQuotationNumber: string,
  options: CpsConversionOptions = DEFAULT_CONVERSION_OPTIONS,
): CpsToQuotationMappingResult {
  const tableRows = cps.table_rows || []

  const titlesByGroupKey = new Map<string, string>()
  for (const row of tableRows) {
    if (row.row_type !== 'section') continue
    const key = sectionKey(row)
    if (key && !titlesByGroupKey.has(key)) {
      titlesByGroupKey.set(key, row.section_title || row.description || 'Group')
    }
  }

  const itemRows: ConvertedQuotationItem[] = []
  let sortOrder = 0

  for (const row of tableRows) {
    if (row.row_type === 'section') {
      const key = sectionKey(row)
      const groupTitle = (key && titlesByGroupKey.get(key)) || row.section_title || row.description || 'Group'
      itemRows.push({
        sort_order: sortOrder++,
        row_type: 'group_header',
        description: groupTitle,
        sub_description: null,
        make: null,
        quantity: 0,
        unit: null,
        unit_price: 0,
        amount: 0,
        group_id: key || null,
        group_name: groupTitle,
        image_url: null,
        vat_rate: null,
        discount_rate: null,
        install_rate: null,
        install_rate_override: false,
        install_rate_taxable: null,
        custom_data: JSON.stringify({}),
      })
      continue
    }

    const groupId = row.group_id || null
    const groupName = groupId ? titlesByGroupKey.get(groupId) || '' : null
    itemRows.push(toStandardItem(row, sortOrder++, groupId, groupName))
  }

  // Calculate quotation totals through computeDocument over transferred items
  const computeItems = itemRows.map((item, idx) => ({
    id: `temp-${idx}`,
    row_type: item.row_type,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    amount: item.amount,
    group_id: item.group_id,
    group_name: item.group_name,
    vat_rate: item.vat_rate,
    discount_rate: item.discount_rate,
    install_rate: item.install_rate,
    install_rate_override: item.install_rate_override,
  }))

  // Destination commercial options (VAT, discount, extra charges) apply here
  // through the existing quotation calculation contract.
  const vatRate = Number(options.vatRate || 0)
  const discountValue = Number(options.discountValue || 0)
  const discountType = options.discountType === 'percent' ? 'percent' : 'fixed'
  const discountTiming = options.discountTiming === 'before' ? 'before' : 'after'
  const extraCharges = normalizeExtraCharges(options.extraCharges || [])
  const calculationInputs = buildCalculationInputs({
    invoice: { vat: vatRate, discount: discountValue },
    discountType,
    discountTiming,
    whtType: 'percent',
  })
  const calculationResult = computeDocument({
    items: computeItems,
    columns: BUILTIN_COLUMNS,
    document: { status: 'open' },
    cf: { calculationInputs, extraCharges },
  })

  const clientId =
    (cps.custom_fields?.client_id && typeof cps.custom_fields.client_id === 'string' && cps.custom_fields.client_id.trim()) ||
    (cps.custom_fields?.client_snapshot?.id && typeof cps.custom_fields.client_snapshot.id === 'string' && cps.custom_fields.client_snapshot.id.trim()) ||
    ((cps as any).client_id && typeof (cps as any).client_id === 'string' && (cps as any).client_id.trim()) ||
    null

  const clientName =
    (typeof cps.client_name === 'string' && cps.client_name.trim()) ||
    (cps.custom_fields?.client_snapshot?.name && typeof cps.custom_fields.client_snapshot.name === 'string' && cps.custom_fields.client_snapshot.name.trim()) ||
    ''

  const groupMeta: Record<string, { title: string; showSubtotal: boolean }> = {}
  for (const [key, title] of titlesByGroupKey) {
    groupMeta[key] = {
      title,
      showSubtotal: true,
    }
  }

  const customFieldsObj = withSourceTrail(
    {
      groupMeta: Object.keys(groupMeta).length > 0 ? groupMeta : undefined,
      calculationInputs,
      discountType,
      discountTiming,
      extraCharges,
    },
    buildTrailLink({
      id: cps.id,
      type: 'quotation',
      number: cps.cps_number,
    }),
  )

  const payload: ConvertedQuotationPayload = {
    quotation_number: nextQuotationNumber,
    po_number: (cps as any).po_number || null,
    quotation_title: cps.title?.trim() || 'Quotation from Cost & Pricing Sheet',
    client_id: clientId,
    client_name: clientName,
    issue_date: new Date().toISOString().split('T')[0],
    status: 'open',
    vat: vatRate,
    discount: discountValue,
    subtotal: Number(calculationResult.subtotal || 0),
    total: Number(calculationResult.totalPayable || 0),
    source_cps_id: cps.id,
    notes: null,
    terms: null,
    project_id: null,
    custom_fields: JSON.stringify(customFieldsObj),
  }

  return { payload, items: itemRows }
}
