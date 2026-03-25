export type ProjectDocumentType = 'purchase_order' | 'receipt' | 'receiving_waybill' | 'other'

export type ProjectDocumentRecord = Record<string, any> & {
  id?: string
  project_id?: string
  type?: ProjectDocumentType | string
  title?: string | null
  reference_number?: string | null
  voucher_number?: string | null
  from_party?: string | null
  to_party?: string | null
  date?: string | null
  total?: number | string | null
  vat?: number | string | null
  wht?: number | string | null
  raw_input?: string | null
  data?: Record<string, unknown> | null
}

export type ProjectDocumentKeyField = {
  label: string
  value: string
}

export type ProjectDocumentItemsTable = {
  columns: string[]
  rows: Array<Record<string, string>>
}

const TYPE_META: Record<ProjectDocumentType, { label: string; shortLabel: string }> = {
  purchase_order: { label: 'Purchase Order', shortLabel: 'PO' },
  receipt: { label: 'Receipt', shortLabel: 'Receipt' },
  receiving_waybill: { label: 'Receiving Waybill', shortLabel: 'Waybill' },
  other: { label: 'Other', shortLabel: 'Other' },
}

function hasText(value: unknown) {
  return String(value || '').trim().length > 0
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (hasText(value)) return String(value).trim()
  }
  return ''
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '')
    if (!cleaned) return 0
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatKeyLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function getProjectDocumentType(document: ProjectDocumentRecord): ProjectDocumentType {
  const type = String(document.type || '').trim() as ProjectDocumentType
  return TYPE_META[type] ? type : 'other'
}

export function getProjectDocumentTypeMeta(document: ProjectDocumentRecord) {
  return TYPE_META[getProjectDocumentType(document)]
}

export function getProjectDocumentData(document: ProjectDocumentRecord): Record<string, unknown> {
  return document.data && typeof document.data === 'object' ? document.data : {}
}

export function formatProjectDocumentDate(value: unknown) {
  if (!value) return ''
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatProjectDocumentCurrency(value: unknown) {
  const amount = toNumber(value)
  const hasFraction = Math.abs(amount % 1) > 0.000001
  return `₦${amount.toLocaleString('en-NG', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  })}`
}

export function getProjectDocumentTitle(document: ProjectDocumentRecord) {
  const data = getProjectDocumentData(document)
  return firstText(document.title, data.title)
}

export function getProjectDocumentReference(document: ProjectDocumentRecord) {
  const data = getProjectDocumentData(document)
  return firstText(document.reference_number, data.reference_number)
}

export function getProjectDocumentDate(document: ProjectDocumentRecord) {
  const data = getProjectDocumentData(document)
  return firstText(document.date, data.date)
}

export function getProjectDocumentMainLabel(document: ProjectDocumentRecord) {
  const type = getProjectDocumentType(document)
  const meta = getProjectDocumentTypeMeta(document)
  const title = getProjectDocumentTitle(document)
  const reference = getProjectDocumentReference(document)

  if (type === 'other') {
    return title || reference || meta.label
  }

  return reference || title || meta.label
}

export function getProjectDocumentSummaryParts(document: ProjectDocumentRecord) {
  const type = getProjectDocumentType(document)
  const data = getProjectDocumentData(document)
  const date = formatProjectDocumentDate(getProjectDocumentDate(document))
  const reference = getProjectDocumentReference(document)
  const title = getProjectDocumentTitle(document)
  const fromParty = firstText(document.from_party, data.from_party, data.vendor, data.supplier, data.source)
  const amount = toNumber(document.total || data.amount || data.total)
  const items = Array.isArray(data.items) ? data.items : []

  if (type === 'purchase_order') {
    return [
      fromParty ? `Supplier: ${fromParty}` : '',
      reference ? `PO: ${reference}` : '',
      date,
    ].filter(Boolean)
  }

  if (type === 'receipt') {
    return [
      fromParty ? `Vendor: ${fromParty}` : '',
      amount > 0 ? `Amount: ${formatProjectDocumentCurrency(amount)}` : '',
      date,
    ].filter(Boolean)
  }

  if (type === 'receiving_waybill') {
    return [
      fromParty ? `Source: ${fromParty}` : '',
      items.length > 0 ? `${items.length} ${items.length === 1 ? 'item' : 'items'}` : '',
      date,
    ].filter(Boolean)
  }

  return [title, date].filter(Boolean)
}

function pushField(fields: ProjectDocumentKeyField[], label: string, value: unknown, formatter?: (value: unknown) => string) {
  if (!hasText(value) && typeof value !== 'number') return
  const nextValue = formatter ? formatter(value) : String(value).trim()
  if (!nextValue) return
  fields.push({ label, value: nextValue })
}

export function getProjectDocumentKeyFields(document: ProjectDocumentRecord) {
  const type = getProjectDocumentType(document)
  const data = getProjectDocumentData(document)
  const fields: ProjectDocumentKeyField[] = []
  const title = getProjectDocumentTitle(document)
  const reference = getProjectDocumentReference(document)
  const voucher = firstText(document.voucher_number, data.voucher_number)
  const fromParty = firstText(document.from_party, data.from_party, data.vendor, data.supplier, data.source)
  const toParty = firstText(document.to_party, data.to_party, data.destination)
  const date = getProjectDocumentDate(document)

  pushField(fields, 'Title', title)
  pushField(fields, type === 'purchase_order' ? 'PO Number' : 'Reference Number', reference)
  pushField(fields, 'Voucher Number', voucher)
  pushField(fields, type === 'receipt' ? 'Vendor' : type === 'receiving_waybill' ? 'Source' : 'From Party', fromParty)
  pushField(fields, type === 'receiving_waybill' ? 'Destination' : 'To Party', toParty)
  pushField(fields, 'Date', date, formatProjectDocumentDate)

  if (type === 'purchase_order') {
    pushField(fields, 'Subtotal', data.subtotal, formatProjectDocumentCurrency)
    pushField(fields, 'VAT', document.vat || data.vat, formatProjectDocumentCurrency)
    pushField(fields, 'WHT', document.wht || data.wht, formatProjectDocumentCurrency)
    pushField(fields, 'Total', document.total || data.total, formatProjectDocumentCurrency)
  }

  if (type === 'receipt') {
    pushField(fields, 'Amount', data.amount || document.total, formatProjectDocumentCurrency)
    pushField(fields, 'Payment Method', data.payment_method)
    pushField(fields, 'VAT', document.vat || data.vat, formatProjectDocumentCurrency)
    pushField(fields, 'WHT', document.wht || data.wht, formatProjectDocumentCurrency)
  }

  if (type === 'receiving_waybill') {
    const items = Array.isArray(data.items) ? data.items : []
    if (items.length > 0) {
      fields.push({
        label: 'Items',
        value: `${items.length} ${items.length === 1 ? 'line' : 'lines'}`,
      })
    }
    pushField(fields, 'Received By', data.received_by)
  }

  if (type === 'other') {
    const skipKeys = new Set(['title', 'reference_number', 'date', 'from_party', 'to_party', 'notes', 'items'])
    for (const [key, value] of Object.entries(data)) {
      if (fields.length >= 8) break
      if (skipKeys.has(key)) continue
      if (Array.isArray(value) || (value && typeof value === 'object')) continue
      pushField(fields, formatKeyLabel(key), value)
    }
  }

  return fields
}

export function getProjectDocumentItemsTable(document: ProjectDocumentRecord): ProjectDocumentItemsTable | null {
  const type = getProjectDocumentType(document)
  const data = getProjectDocumentData(document)
  const items = Array.isArray(data.items) ? data.items : []
  if (items.length === 0) return null

  const preferredColumns =
    type === 'purchase_order'
      ? ['description', 'quantity', 'unit', 'unit_price', 'amount']
      : type === 'receiving_waybill'
        ? ['description', 'quantity', 'unit', 'condition']
        : Array.from(
            items.reduce((set, item) => {
              if (item && typeof item === 'object') {
                Object.keys(item).forEach((key) => set.add(key))
              }
              return set
            }, new Set<string>()),
          )

  const columns = preferredColumns.filter((column) =>
    items.some((item) => item && typeof item === 'object' && item[column] !== undefined && item[column] !== null && item[column] !== ''),
  )

  if (columns.length === 0) return null

  return {
    columns,
    rows: items.map((item) => {
      const row: Record<string, string> = {}
      columns.forEach((column) => {
        const value = item && typeof item === 'object' ? item[column] : ''
        if (typeof value === 'number') {
          row[column] = ['amount', 'unit_price', 'total', 'price'].includes(column)
            ? formatProjectDocumentCurrency(value)
            : String(value)
          return
        }
        if (Array.isArray(value) || (value && typeof value === 'object')) {
          row[column] = JSON.stringify(value)
          return
        }
        row[column] = String(value || '')
      })
      return row
    }),
  }
}

export function getProjectDocumentNotes(document: ProjectDocumentRecord) {
  const data = getProjectDocumentData(document)
  return firstText(data.notes, document.notes)
}

export function getProjectDocumentRawJson(document: ProjectDocumentRecord) {
  if (hasText(document.raw_input)) return String(document.raw_input)
  return JSON.stringify(getProjectDocumentData(document), null, 2)
}

export function getProjectDocumentFileName(document: ProjectDocumentRecord) {
  const type = getProjectDocumentTypeMeta(document).shortLabel.toLowerCase().replace(/\s+/g, '-')
  const label = getProjectDocumentMainLabel(document)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${label || type}.pdf`
}
