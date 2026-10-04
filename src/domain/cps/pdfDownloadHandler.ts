import { resolveCanonicalLogoUrl } from '@/domain/documentMedia'
import { computeCpsRowEconomics, computeCpsTotals } from '@/domain/cps/calculateCpsTotals'
import { normalizeCpsColumns } from '@/domain/cps/columns'
import type { Cps } from '@/domain/cps/types'
import type { TableDocumentRow } from '@/domain/table-document/types'
import type { CpsFormeColumnKey, CpsFormeModel } from '@/components/pdf/forme/CpsFormeDocument'
import { CPS_CAPABILITIES, CPS_POLICY, CPS_TEMPLATE_DEFAULTS } from '@/domain/pdf/customization/cps'
import { loadSettings } from '@/domain/pdf/customization/hooks'
import { resolveFull } from '@/domain/pdf/customization/resolver'
import { readCpsPdfDisplayPreferences, type CpsPdfOrientation, type CpsPdfTemplateId } from '@/domain/cps/pdfPreferences'
import { feedback } from '@/lib/feedback'

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

export function resolveCpsFormeVisibleColumns(visibility: CpsPdfColumnVisibility): CpsFormeColumnKey[] {
  const columns: CpsFormeColumnKey[] = ['no', 'description', 'qty']
  if (visibility.showCp) columns.push('cp')
  columns.push('sp', 'total')
  return columns
}

export function selectCpsFormeDocument(templateId: CpsPdfTemplateId): 'schedule' | 'compact' {
  return templateId === 'compact' ? 'compact' : 'schedule'
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
}): CpsFormeModel {
  const { cps, settings, logoDataUri, photoDataUris } = input
  const visibility = input.columnVisibility || resolveCpsPdfColumns(cps.custom_fields?.columnConfig)
  const fontFamily = input.fontFamily || 'Helvetica'
  const accent = input.accent === undefined ? null : input.accent
  const orientation: CpsPdfOrientation = input.orientation || 'portrait'
  const tableRows = cps.table_rows || []
  const totals = computeCpsTotals(tableRows)

  const titlesByGroupKey = new Map<string, string>()
  for (const row of tableRows) {
    if (row.row_type !== 'section') continue
    const key = row.group_id || row.id || row._uiKey || ''
    if (key && !titlesByGroupKey.has(key)) {
      titlesByGroupKey.set(key, row.section_title || row.description || 'Group')
    }
  }

  const subtotals = new Map<string, { total: number; count: number }>()
  for (const row of tableRows) {
    if (row.row_type !== 'item' || !row.group_id) continue
    const entry = subtotals.get(row.group_id) || { total: 0, count: 0 }
    entry.total += computeCpsRowEconomics(row).total_selling_price
    entry.count += 1
    subtotals.set(row.group_id, entry)
  }

  let itemNumber = 0
  const rows = tableRows.map((row: TableDocumentRow, index: number) => {
    const key = row.id || row._uiKey || `${row.row_type}-${index}`
    if (row.row_type === 'section') {
      const groupId = row.group_id || row.id || row._uiKey || null
      return {
        key,
        kind: 'group' as const,
        number: '',
        groupId,
        title: (groupId && titlesByGroupKey.get(groupId)) || row.section_title || row.description || 'Group',
        description: '',
        specification: '',
        make: '',
        quantityText: '',
        cpText: '',
        spText: '',
        totalText: '',
        imageDataUri: null,
      }
    }
    itemNumber += 1
    const econ = computeCpsRowEconomics(row)
    const photoKey = row.id || row._uiKey || ''
    const unit = visibility.showUnit ? row.unit || '' : ''
    return {
      key,
      kind: 'item' as const,
      number: String(itemNumber).padStart(2, '0'),
      groupId: row.group_id || null,
      title: '',
      description: row.description || '',
      specification: visibility.showSpec ? row.specification || '' : '',
      make: visibility.showMake ? row.make_brand || '' : '',
      quantityText: `${econ.quantity} ${unit}`.trim(),
      cpText: money(econ.cp),
      spText: money(econ.sp),
      totalText: money(econ.total_selling_price),
      imageDataUri: (photoKey && photoDataUris?.[photoKey]) || null,
    }
  })

  const groups = [...titlesByGroupKey].map(([id, title]) => {
    const subtotal = subtotals.get(id) || { total: 0, count: 0 }
    return { id, title, itemCount: String(subtotal.count), subtotalText: money(subtotal.total) }
  })

  const snapshot = (cps.custom_fields?.client_snapshot || {}) as Record<string, unknown>
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : asText(value).trim())
  const contactLines = [text(snapshot.phone), text(snapshot.email)].filter(Boolean).join(' · ')

  return {
    title: cps.title?.trim() || 'Cost & Pricing Sheet',
    number: cps.cps_number || '',
    issueDate: cps.issue_date || '',
    status: String((cps as { status?: unknown }).status || 'open').toUpperCase(),
    companyName: text(settings?.company_name),
    logoDataUri: logoDataUri || null,
    companyLines: [text(settings?.company_address), contactLines].filter(Boolean),
    clientName: text(snapshot.name) || text(cps.client_name),
    clientLines: [text(snapshot.contact_person), text(snapshot.city)].filter(Boolean),
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
    const { generateCpsFormePdf } = await import('@/components/pdf')
    const { CpsCompactDocument, CpsScheduleDocument } = await import('@/components/pdf/forme/CpsFormeDocument')
    const { ensureFormeFontFamily } = await import('@/components/pdf/forme/fonts')
    const React = await import('react')

    const prefs = readCpsPdfDisplayPreferences()
    const { customization } = resolveFull(CPS_TEMPLATE_DEFAULTS, CPS_CAPABILITIES, CPS_POLICY, loadSettings('cps_sheets'))
    const fontFamily = await ensureFormeFontFamily(customization.documentFont)
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

    const model = buildCpsFormeModel({
      cps,
      settings,
      logoDataUri,
      photoDataUris,
      fontFamily,
      accent,
      orientation: prefs.orientation,
      columnVisibility,
    })
    const rawName = `${model.number} ${model.title}`.trim() || 'cps'
    const filename = `${sanitizeFilename(rawName)}.pdf`
    const SelectedDocument = selectCpsFormeDocument(prefs.templateId) === 'compact' ? CpsCompactDocument : CpsScheduleDocument
    await generateCpsFormePdf({
      element: React.createElement(SelectedDocument, { model }),
      filename,
    })
    feedback.success('Download ready', { description: `${filename} saved.` })
  } catch (error) {
    feedback.error('Download failed', {
      description: error instanceof Error ? error.message : 'Could not generate the CPS PDF.',
    })
    throw error
  } finally {
    setDownloading(false)
  }
}
