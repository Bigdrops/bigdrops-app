/**
 * Prepare a Cost & Pricing Sheet (BOQ) for the commercial template pipeline.
 *
 * Reuses the commercial document family contract (PdfDocumentModel), feeding
 * the established commercial Forme renderers. No CPS-specific renderer is
 * required — the CPS is the same commercial situation: issuer, recipient,
 * grouped line items, totals strip.
 *
 * Confidentiality rules preserved:
 *  - Unit CP / Total Cost columns render only when `columnVisibility.showCp`.
 *  - Selling price remains the primary customer-facing `amount` column.
 *
 * Business invariants:
 *  - Totals come exclusively from `computeCpsTotals` (never recomputed here).
 *  - Item rows and group rows follow the CPS segment structure verbatim.
 */
import type {
  PdfColumnDefinition,
  PdfLineItem,
  PdfPageLayout,
  PdfParty,
  PdfTotalRow,
} from '../../../../components/pdf/types'
import type { Cps } from '@/domain/cps/types'
import { computeCpsTotals } from '@/domain/cps/calculateCpsTotals'
import { buildCpsViewData, buildCpsViewSegments, type CpsViewItemRow } from '@/domain/cps/viewData'
import { numberToWords } from '@/lib/formatters/money'
import type { CpsCommercialDocumentModel } from '@/domain/pdf/resolver/commercial'

export const DEFAULT_CPS_PAGE_LAYOUT: PdfPageLayout = {
  size: 'A4',
  orientation: 'portrait',
}

export interface CpsCommercialColumnVisibility {
  showMake: boolean
  showUnit: boolean
  showCp: boolean
  showSpec: boolean
}

const money = (value: unknown) =>
  '₦' + Number(value || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const trim = (value: unknown): string => String(value ?? '').trim()

type CpsCommercialCellValue = string | number | boolean | null | undefined

export const DEFAULT_CPS_COLUMN_VISIBILITY: CpsCommercialColumnVisibility = {
  showMake: false,
  showUnit: true,
  showCp: true,
  showSpec: true,
}

export function buildCpsCommercialColumns(
  visibility: CpsCommercialColumnVisibility = DEFAULT_CPS_COLUMN_VISIBILITY,
): PdfColumnDefinition[] {
  const columns: PdfColumnDefinition[] = [
    { key: 'num', label: 'No.', kind: 'builtin', align: 'left', pdfWidth: 22, pdfFlex: 0.38 },
    { key: 'description', label: 'Description / Specification', kind: 'builtin', align: 'left', pdfWidth: 0, pdfFlex: 2.55 },
    { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'right', pdfWidth: 38, pdfFlex: 0 },
  ]
  if (visibility.showUnit) columns.push({ key: 'unit', label: 'Unit', kind: 'builtin', align: 'center', pdfWidth: 32, pdfFlex: 0 })
  if (visibility.showMake) columns.push({ key: 'make', label: 'Make', kind: 'builtin', align: 'left', pdfWidth: 74, pdfFlex: 0 })
  if (visibility.showCp) columns.push({ key: 'unitCp', label: 'Unit CP (₦)', kind: 'custom', align: 'right', pdfWidth: 68, pdfFlex: 0 })
  columns.push({ key: 'sp', label: 'Unit SP (₦)', kind: 'custom', align: 'right', pdfWidth: 68, pdfFlex: 0 })
  columns.push({ key: 'amount', label: 'Total (SP)', kind: 'builtin', align: 'right', pdfWidth: 88, pdfFlex: 0 })
  if (visibility.showCp) columns.push({ key: 'totalCost', label: 'Total Cost', kind: 'custom', align: 'right', pdfWidth: 84, pdfFlex: 0 })
  return columns
}

function buildIssuer(settings?: Record<string, unknown> | null): PdfParty {
  const addressLines = [
    trim(settings?.company_address),
    [trim(settings?.company_city), trim(settings?.company_state)].filter(Boolean).join(', '),
  ].filter(Boolean)

  return {
    label: 'From (Issuer)',
    name: trim(settings?.company_name),
    taxId: trim(settings?.company_tax_id || settings?.company_tin) || null,
    email: trim(settings?.company_email) || null,
    phone: trim(settings?.company_phone) || null,
    addressLines,
    website: trim(settings?.company_website) || null,
    customInfo: [],
  }
}

function buildRecipient(cps: Cps): PdfParty | null {
  const snapshot = (cps.custom_fields?.client_snapshot as Record<string, unknown> | undefined) || {}
  const name = trim(snapshot.name) || trim(cps.client_name)
  if (!name) return null

  const addressLines = [
    trim(snapshot.address) || trim(snapshot.contact_address) || null,
    [trim(snapshot.city), trim(snapshot.state)].filter(Boolean).join(', ') || null,
  ].filter(Boolean) as string[]

  return {
    label: 'Bill To · Client',
    name,
    attention: trim(snapshot.contact_person) || null,
    email: trim(snapshot.email) || null,
    phone: trim(snapshot.phone) || null,
    addressLines,
    customInfo: [],
  }
}

function buildItemCells(row: CpsViewItemRow, visibility: CpsCommercialColumnVisibility) {
  const cells: Record<string, CpsCommercialCellValue> = {
    num: row.number,
    description: row.description,
    quantity: row.quantity,
    unit: visibility.showUnit ? row.unit : '',
    make: visibility.showMake ? row.makeBrand || '' : '',
    unitCp: money(row.cp),
    sp: money(row.sp),
    amount: money(row.selling),
    totalCost: money(row.cost),
  }
  return cells
}

export function prepareCpsCommercialDocument(
  cps: Cps,
  options: {
    settings?: Record<string, unknown> | null
    columnVisibility?: CpsCommercialColumnVisibility
    logoDataUri?: string | null
    photoDataUris?: Record<string, string>
    orientation?: 'portrait' | 'landscape'
    documentNumber?: string | null
    issueDate?: string | null
    title?: string | null
  } = {},
): CpsCommercialDocumentModel {
  const visibility = options.columnVisibility ?? DEFAULT_CPS_COLUMN_VISIBILITY
  const totals = computeCpsTotals(cps.table_rows || [])
  const viewData = buildCpsViewData(cps)
  const segments = buildCpsViewSegments(viewData.rows)

  const issuer = buildIssuer(options.settings)
  const recipient = buildRecipient(cps)

  // Groups collapse to group_header / group_footer lines on the wire.
  const items: PdfLineItem[] = []
  segments.forEach((segment) => {
    if (segment.type === 'item') {
      items.push({
        id: segment.row.key,
        rowType: 'line',
        groupId: null,
        groupLabel: null,
        description: segment.row.description,
        subDescription: visibility.showSpec ? segment.row.specification : '',
        make: visibility.showMake ? segment.row.makeBrand : null,
        quantity: segment.row.quantity,
        unit: visibility.showUnit ? segment.row.unit : '',
        unitCost: segment.row.cp,
        amount: segment.row.selling,
        cells: buildItemCells(segment.row, visibility),
        customData: visibility.showCp ? { totalCost: String(segment.row.cost) } : {},
        imageUrl: null,
      })
      return
    }

    const groupId = segment.membership
    items.push({
      id: `${groupId}-header`,
      rowType: 'group_header',
      groupId,
      groupLabel: segment.row.title,
      customData: { showSubtotal: true },
      description: segment.row.title,
      quantity: 0,
      unit: '',
      unitCost: 0,
      amount: 0,
      cells: { groupName: segment.row.title },
    })
    segment.items.forEach((row) => {
      items.push({
        id: row.key,
        rowType: 'line',
        groupId,
        groupLabel: segment.row.title,
        description: row.description,
        subDescription: visibility.showSpec ? row.specification : '',
        make: visibility.showMake ? row.makeBrand : null,
        quantity: row.quantity,
        unit: visibility.showUnit ? row.unit : '',
        unitCost: row.cp,
        amount: row.selling,
        cells: buildItemCells(row, visibility),
        customData: visibility.showCp ? { totalCost: String(row.cost) } : {},
        imageUrl: null,
      })
    })
    // The adapter derives the "section subtotal" footer row automatically when a
    // group runs out of members; do not inject manual footer lines here.
  })

  const totalRows: PdfTotalRow[] = [
    { key: 'cps-total-cost', label: 'Total Cost (CP × Qty)', amount: totals.total_cost },
    { key: 'cps-total-selling', label: 'Schedule Selling Total', amount: totals.total_selling_price },
    { key: 'cps-gross-profit', label: 'Gross Profit', amount: totals.gross_profit },
    { key: 'cps-margin', label: 'Margin', amount: Number(totals.margin_percent || 0), emphasis: true, format: 'percent' as const },
  ]

  const amountInWords = numberToWords(Number(totals.total_selling_price || 0))

  return {
    identity: {
      id: trim(cps.id),
      kind: 'cps',
      number: trim(options.documentNumber ?? cps.cps_number) || '',
      title: trim(options.title ?? cps.title) || 'Cost & Pricing Sheet',
      issueDate: trim(options.issueDate ?? cps.issue_date) || null,
      status: String((cps as { status?: unknown }).status || 'open'),
      currency: 'NGN',
    },
    issuer,
    recipient,
    headerFields: [
      { label: 'CPS Number', value: trim(cps.cps_number) },
      ...(cps.project_name ? [{ label: 'Project', value: trim(cps.project_name) }] : []),
    ],
    items,
    columns: buildCpsCommercialColumns(visibility),
    pageLayout: { size: 'A4', orientation: options.orientation || DEFAULT_CPS_PAGE_LAYOUT.orientation },
    mergeQtyUnit: true,
    hideEmptyGroups: true,
    totals: {
      mode: 'standard',
      rows: totalRows,
      amountInWords,
      balanceDue: null,
      advanceSummary: null,
    },
    bankDetails: null,
    notes: trim(cps.notes)
      ? {
          title: 'Notes',
          content: trim(cps.notes),
          plainText: trim(cps.notes),
          format: 'text',
        }
      : null,
    terms: null,
    additionalSections: [],
    additionalFields: [],
    signature: null,
    logo: options.logoDataUri ? { imageUrl: options.logoDataUri, altText: trim(options.settings?.company_name) || 'Company logo' } : null,
    footerText: trim(options.settings?.pdf_footer_text) || null,
    tagline: trim(options.settings?.company_tagline) || null,
    metaFooter: trim(options.settings?.company_name) ? { companyName: trim(options.settings?.company_name) } : undefined,
    template: null,
  }
}
