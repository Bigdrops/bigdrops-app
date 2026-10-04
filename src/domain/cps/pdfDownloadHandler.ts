import { resolveCanonicalLogoUrl } from '@/domain/documentMedia'
import { computeCpsRowEconomics, computeCpsTotals } from '@/domain/cps/calculateCpsTotals'
import type { Cps } from '@/domain/cps/types'
import type { TableDocumentRow } from '@/domain/table-document/types'
import type { CpsPdfGroup, CpsPdfModel, CpsPdfRow } from '@/components/pdf/types'
import { feedback } from '@/lib/feedback'
import { userDownloadLocationLabel } from '@/lib/native/fileDownload'

function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function buildCpsPdfRows(tableRows: TableDocumentRow[]): { rows: CpsPdfRow[]; groups: CpsPdfGroup[] } {
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
    const econ = computeCpsRowEconomics(row)
    const entry = subtotals.get(row.group_id) || { total: 0, count: 0 }
    entry.total += econ.total_selling_price
    entry.count += 1
    subtotals.set(row.group_id, entry)
  }

  let itemNumber = 0
  const rows: CpsPdfRow[] = tableRows.map((row, index) => {
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
        quantity: 0,
        unit: '',
        cp: 0,
        sp: 0,
        totalCost: 0,
        totalSelling: 0,
        profit: 0,
        marginPercent: 0,
        imageUrl: null,
      }
    }
    itemNumber += 1
    const econ = computeCpsRowEconomics(row)
    return {
      key,
      kind: 'item' as const,
      number: String(itemNumber).padStart(2, '0'),
      groupId: row.group_id || null,
      title: '',
      description: row.description || '',
      specification: row.specification || '',
      make: row.make_brand || '',
      quantity: econ.quantity,
      unit: row.unit || '',
      cp: econ.cp,
      sp: econ.sp,
      totalCost: econ.total_cost_price,
      totalSelling: econ.total_selling_price,
      profit: econ.profit,
      marginPercent: econ.margin_percent,
      imageUrl: row.image_url || null,
    }
  })

  const groups: CpsPdfGroup[] = []
  for (const [id, title] of titlesByGroupKey) {
    const subtotal = subtotals.get(id) || { total: 0, count: 0 }
    groups.push({ id, title, itemCount: subtotal.count, subtotal: subtotal.total })
  }

  return { rows, groups }
}

export function buildCpsPdfModel(input: {
  cps: Cps
  settings: any
  documentFont?: string | null
}): CpsPdfModel {
  const { cps, settings, documentFont } = input
  const tableRows = cps.table_rows || []
  const totals = computeCpsTotals(tableRows)
  const { rows, groups } = buildCpsPdfRows(tableRows)

  const snapshot = (cps.custom_fields?.client_snapshot || {}) as Record<string, unknown>
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : asText(value).trim())

  return {
    identity: {
      kind: 'cps',
      number: cps.cps_number || '',
      title: cps.title || 'Cost & Pricing Sheet',
      issueDate: cps.issue_date || '',
      status: String((cps as any).status || 'open').toUpperCase(),
    },
    company: {
      name: text(settings?.company_name),
      logoUrl: resolveCanonicalLogoUrl(settings),
      addressLines: [text(settings?.company_address)].filter(Boolean),
      phone: text(settings?.company_phone),
      email: text(settings?.company_email),
    },
    client: {
      name: text(snapshot.name) || text(cps.client_name),
      contactPerson: text(snapshot.contact_person),
      phone: text(snapshot.phone),
      email: text(snapshot.email),
      city: text(snapshot.city),
    },
    site: text(cps.project_name),
    notes: text(cps.notes),
    documentFont: documentFont || null,
    rows,
    groups,
    totals: {
      total_cost: totals.total_cost,
      total_selling_price: totals.total_selling_price,
      gross_profit: totals.gross_profit,
      margin_percent: totals.margin_percent,
    },
  }
}

export async function handleDownloadCpsPdf(input: {
  cps: Cps
  settings: any
  documentFont?: string | null
  setDownloading: (v: boolean) => void
}): Promise<void> {
  const { cps, settings, documentFont, setDownloading } = input

  setDownloading(true)
  try {
    const { generateCpsPdf } = await import('@/components/pdf')
    const model = buildCpsPdfModel({ cps, settings, documentFont })
    const result = await generateCpsPdf({ model })
    const location = userDownloadLocationLabel()
    feedback.success('Download ready', {
      description: `${result.filename} saved${location ? ` to ${location}` : ''}.`,
    })
  } catch (error) {
    feedback.error('Download failed', {
      description: error instanceof Error ? error.message : 'Could not generate the CPS PDF.',
    })
    throw error
  } finally {
    setDownloading(false)
  }
}
