import type { InvoiceItem } from '@/domain/invoice'
import type { Quotation } from '@/domain/quotation'

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function buildQuotationCsv(params: {
  quotation: Quotation
  items: InvoiceItem[]
  totals?: {
    rawSubtotal?: number
    installRateTotal?: number
    vatAmount?: number
    discountAmount?: number
    whtAmount?: number
    totalPayable?: number
  } | null
}) {
  const { quotation, items, totals } = params
  const rows: string[][] = [
    ['Quotation Number', quotation.quotation_number || ''],
    ['P.O. Number', quotation.po_number || ''],
    ['Quotation Title', quotation.quotation_title || ''],
    ['Status', quotation.status || 'draft'],
    ['Client', quotation.client_name || ''],
    ['Issue Date', quotation.issue_date || ''],
    ['Valid Until', quotation.valid_until || ''],
    [],
    [
      'Line',
      'Description',
      'Sub Description',
      'Make',
      'Qty',
      'Unit',
      'Rate',
      'Install Rate',
      'VAT Rate',
      'Discount Rate',
      'Amount',
    ],
  ]

  items.forEach((item, index) => {
    rows.push([
      String(index + 1),
      item.description || '',
      item.sub_description || '',
      item.make || '',
      String(Number(item.quantity || 0)),
      item.unit || '',
      String(Number(item.unit_price || 0)),
      item.install_rate == null ? '' : String(item.install_rate),
      item.vat_rate == null ? '' : String(item.vat_rate),
      item.discount_rate == null ? '' : String(item.discount_rate),
      String(Number(item.quantity || 0) * Number(item.unit_price || 0)),
    ])
  })

  if (totals) {
    rows.push([])
    rows.push(['Subtotal', String(Number(totals.rawSubtotal || 0))])
    rows.push(['Install Rate Total', String(Number(totals.installRateTotal || 0))])
    rows.push(['VAT', String(Number(totals.vatAmount || 0))])
    rows.push(['Discount', String(Number(totals.discountAmount || 0))])
    rows.push(['WHT', String(Number(totals.whtAmount || 0))])
    rows.push(['Total', String(Number(totals.totalPayable || 0))])
  }

  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
}

export function downloadQuotationCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  setTimeout(() => {
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, 100)
}
