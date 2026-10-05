import { resolveCanonicalLogoUrl } from '@/domain/documentMedia'
import { computeCpsTotals } from '@/domain/cps/calculateCpsTotals'
import { normalizeCpsColumns } from '@/domain/cps/columns'
import type { Cps } from '@/domain/cps/types'
import { buildCpsViewData, buildCpsViewSegments, type CpsViewItemRow } from '@/domain/cps/viewData'
import type { CpsPdfColumnKey, CpsPdfModel } from '@/components/pdf/cpsPreparedModel'
import { CPS_CAPABILITIES, CPS_POLICY, CPS_TEMPLATE_DEFAULTS } from '@/domain/pdf/customization/cps'
import { loadSettings } from '@/domain/pdf/customization/hooks'
import { resolveFull } from '@/domain/pdf/customization/resolver'
import { readCpsPdfDisplayPreferences, type CpsPdfOrientation, type CpsPdfTemplateId } from '@/domain/cps/pdfPreferences'
import { feedback } from '@/lib/feedback'

type CpsPdfPipelineStage = 'prepare' | 'customization' | 'font' | 'template'
type ErrorWithCause = Error & { cause?: unknown }

class CpsPdfPipelineError extends Error {
  readonly stage: CpsPdfPipelineStage

  constructor(stage: CpsPdfPipelineStage, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause)
    super(`CPS PDF ${stage} failed: ${causeMessage}`)
    this.name = 'CpsPdfPipelineError'
    this.stage = stage
    ;(this as ErrorWithCause).cause = cause
  }
}

async function cpsStage<T>(stage: CpsPdfPipelineStage, operation: () => Promise<T> | T): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw new CpsPdfPipelineError(stage, error)
  }
}

function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function money(value: number): string {
  return '₦' + Number(value || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

async function toDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) return null
    const buffer = await blob.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index])
    }
    return `data:${blob.type};base64,${btoa(binary)}`
  } catch {
    return null
  }
}

export interface CpsPdfColumnVisibility {
  showMake: boolean
  showUnit: boolean
  showCp: boolean
  showSpec: boolean
}

const NEVER_AUTO_HIDE = new Set(['description', 'quantity', 'sp'])

function isColumnShown(columns: Array<{ key: string; visibilityMode?: string }>, key: string): boolean {
  if (NEVER_AUTO_HIDE.has(key)) return true
  const column = columns.find((entry) => entry.key === key)
  if (!column) return key === 'make_brand' || key === 'unit'
  return (column.visibilityMode || 'show') === 'show'
}

export function resolveCpsPdfColumns(columnConfig: unknown): CpsPdfColumnVisibility {
  const columns = normalizeCpsColumns(columnConfig)
  const descriptionShown = isColumnShown(columns, 'description')
  return {
    showMake: isColumnShown(columns, 'make_brand'),
    showUnit: isColumnShown(columns, 'unit'),
    showCp: isColumnShown(columns, 'cp'),
    showSpec: descriptionShown,
  }
}

export function resolveCpsFormeVisibleColumns(visibility: CpsPdfColumnVisibility): CpsPdfColumnKey[] {
  const columns: CpsPdfColumnKey[] = ['no', 'description', 'qty']
  if (visibility.showCp) columns.push('cp')
  columns.push('sp', 'total')
  return columns
}

export function selectCpsFormeDocument(templateId: CpsPdfTemplateId): 'ledger' | 'industry' {
  if (templateId === 'industry') return 'industry'
  return 'ledger'
}

export function resolveExternalImageHref(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const candidate = value.trim()
  if (!candidate) return null
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  return url.href
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/^_|_$/g, '')
}

export function buildCpsFormeModel(input: {
  cps: Cps
  settings: Record<string, unknown>
  logoDataUri?: string | null
  photoDataUris?: Record<string, string>
  fontFamily?: string
  accent?: string | null
  orientation?: CpsPdfOrientation
  columnVisibility?: CpsPdfColumnVisibility
}): CpsPdfModel {
  const { cps, settings, logoDataUri, photoDataUris } = input
  const visibility = input.columnVisibility || resolveCpsPdfColumns(cps.custom_fields?.columnConfig)
  const fontFamily = input.fontFamily || 'Helvetica'
  const accent = input.accent === undefined ? null : input.accent
  const orientation: CpsPdfOrientation = input.orientation || 'portrait'
  const tableRows = cps.table_rows || []
  const totals = computeCpsTotals(tableRows)
  const viewData = buildCpsViewData(cps)
  const segments = buildCpsViewSegments(viewData.rows)

  const toItemRow = (row: CpsViewItemRow) => {
    const unit = visibility.showUnit ? row.unit || '' : ''
    return {
      key: row.key,
      kind: 'item' as const,
      number: row.number,
      groupId: row.groupId || null,
      title: '',
      description: row.description || '',
      specification: visibility.showSpec ? row.specification || '' : '',
      make: visibility.showMake ? row.makeBrand || '' : '',
      quantityText: `${row.quantity} ${unit}`.trim(),
      quantityValue: Number(row.quantity) || 0,
      unitText: unit,
      cpText: money(row.cp),
      spText: money(row.sp),
      totalText: money(row.selling),
      totalCostText: money(row.cost),
      imageDataUri: (row.key && photoDataUris?.[row.key]) || null,
      imageHref: resolveExternalImageHref(row.imageUrl),
    }
  }

  const rows: CpsPdfModel['rows'] = []
  const groups: CpsPdfModel['groups'] = []
  segments.forEach((segment) => {
    if (segment.type === 'item') {
      rows.push(toItemRow(segment.row))
      return
    }

    rows.push({
      key: `${segment.row.key}-heading`,
      kind: 'group',
      number: '',
      groupId: segment.membership,
      title: segment.row.title,
      description: '',
      specification: '',
      make: '',
      quantityText: '',
      quantityValue: 0,
      unitText: '',
      cpText: '',
      spText: '',
      totalText: '',
      totalCostText: '',
      imageDataUri: null,
      imageHref: null,
    })
    segment.items.forEach((row) => rows.push(toItemRow(row)))
    const groupCost = segment.items.reduce((sum, row) => sum + (Number(row.cost) || 0), 0)
    rows.push({
      key: `${segment.row.key}-subtotal`,
      kind: 'group-subtotal',
      number: '',
      groupId: segment.membership,
      title: `${segment.row.title} subtotal`,
      description: '',
      specification: '',
      make: '',
      quantityText: '',
      quantityValue: 0,
      unitText: '',
      cpText: '',
      spText: '',
      totalText: money(segment.total),
      totalCostText: money(groupCost),
      imageDataUri: null,
      imageHref: null,
    })
    groups.push({
      id: segment.membership,
      title: segment.row.title,
      itemCount: String(segment.count),
      subtotalText: money(segment.total),
      costSubtotalText: money(groupCost),
    })
  })


  const snapshot = (cps.custom_fields?.client_snapshot || {}) as Record<string, unknown>
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : asText(value).trim())

  return {
    title: cps.title?.trim() || 'Cost & Pricing Sheet',
    number: cps.cps_number || '',
    issueDate: cps.issue_date || '',
    status: String((cps as { status?: unknown }).status || 'open').toUpperCase(),
    currency: 'NGN',
    companyName: text(settings?.company_name),
    logoDataUri: logoDataUri || null,
    companyLines: [text(settings?.company_address)].filter(Boolean),
    clientName: text(snapshot.name) || text(cps.client_name),
    clientLines: [text(snapshot.contact_person), text(snapshot.city), text(snapshot.phone), text(snapshot.email)].filter(Boolean),
    site: text(cps.project_name),
    notes: text(cps.notes),
    fontFamily,
    accent,
    orientation,
    visibleColumns: resolveCpsFormeVisibleColumns(visibility),
    rows,
    groups,
    totals: [
      { label: 'Total Cost (CP × Qty)', display: money(totals.total_cost) },
      { label: 'Schedule Selling Total (SP × Qty)', display: money(totals.total_selling_price) },
      { label: 'Gross Profit', display: money(totals.gross_profit) },
      {
        label: 'Margin',
        display: `${Number(totals.margin_percent || 0).toFixed(1)}%`,
        emphasis: true,
      },
    ],
  }
}

export async function handleDownloadCpsPdf(input: {
  cps: Cps
  settings: Record<string, unknown>
  setDownloading: (v: boolean) => void
}): Promise<void> {
  const { cps, settings, setDownloading } = input

  setDownloading(true)
  try {
    const { generateCpsFormePdf } = await cpsStage('prepare', () => import('@/components/pdf'))
    const { LedgerCpsDocument } = await cpsStage('prepare', () => import('@/components/pdf/forme/LedgerCpsDocument'))
    const { CpsIndustryDocument } = await cpsStage('prepare', () => import('@/components/pdf/forme/CpsIndustryDocument'))
    const { ensureFormeFontFamily } = await cpsStage('prepare', () => import('@/components/pdf/forme/fonts'))
    const React = await cpsStage('prepare', () => import('react'))

    const prefs = await cpsStage('customization', () => readCpsPdfDisplayPreferences())
    const { customization } = await cpsStage('customization', () => resolveFull(CPS_TEMPLATE_DEFAULTS, CPS_CAPABILITIES, CPS_POLICY, loadSettings('cps_sheets')))
    const fontFamily = await cpsStage('font', () => ensureFormeFontFamily(customization.documentFont))
    const accent = customization.accentEnabled ? customization.accentColor : null
    const columnVisibility = resolveCpsPdfColumns(cps.custom_fields?.columnConfig)

    const logoUrl = resolveCanonicalLogoUrl(settings)
    const logoDataUri = logoUrl && logoUrl.startsWith('data:') ? logoUrl : logoUrl ? await toDataUri(logoUrl) : null

    const photoDataUris: Record<string, string> = {}
    for (const row of cps.table_rows || []) {
      if (row.row_type !== 'item' || !row.image_url) continue
      const key = row.id || row._uiKey || ''
      if (!key) continue
      if (row.image_url.startsWith('data:')) {
        photoDataUris[key] = row.image_url
        continue
      }
      const dataUri = await toDataUri(row.image_url)
      if (dataUri) photoDataUris[key] = dataUri
    }

    const model = await cpsStage('template', () => buildCpsFormeModel({
      cps,
      settings,
      logoDataUri,
      photoDataUris,
      fontFamily,
      accent,
      orientation: prefs.orientation,
      columnVisibility,
    }))
    const rawName = `${model.number} ${model.title}`.trim() || 'cps'
    const filename = `${sanitizeFilename(rawName)}.pdf`
    const SelectedDocument = await cpsStage('template', () => {
      const selected = selectCpsFormeDocument(prefs.templateId)
      if (selected === 'industry') return CpsIndustryDocument
      return LedgerCpsDocument
    })
    await generateCpsFormePdf({
      element: React.createElement(SelectedDocument, { model }),
      filename,
    })
    feedback.success('Download ready', { description: `${filename} saved.` })
  } catch (error) {
    const downloadError = new Error('Download failed') as ErrorWithCause
    downloadError.cause = error
    feedback.error(downloadError, {
      description: 'Could not generate the CPS PDF.',
    })
    throw error
  } finally {
    setDownloading(false)
  }
}
