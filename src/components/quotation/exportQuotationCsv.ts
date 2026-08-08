import type { InvoiceItem } from '@/domain/invoice'
import type { Quotation } from '@/domain/quotation'
import {
  buildDocumentSummaryCsvRows,
  resolveDocumentTextSection,
  type DocumentCsvTotals,
} from '@/utils/csvDocumentSummary'

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
  totals?: DocumentCsvTotals
  customFields?: Record<string, any>
}) {
  const { quotation, items, totals, customFields } = params
  const rows: string[][] = [
    ['Quotation Number', quotation.quotation_number || ''],
    ['P.O. Number', quotation.po_number || ''],
    ['Quotation Title', quotation.quotation_title || ''],
    ['Status', quotation.status || 'open'],
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
    rows.push(...buildDocumentSummaryCsvRows({ document: quotation, totals, customFields }))
  }

  const notes = resolveDocumentTextSection(quotation, customFields, 'notes', 'notesHtml')
  const terms = resolveDocumentTextSection(quotation, customFields, 'terms', 'termsHtml')

  if (notes) {
    rows.push([])
    rows.push([customFields?.notesTitle || 'Notes', notes])
  }
  if (terms) {
    rows.push([])
    rows.push([customFields?.termsTitle || 'Terms and Conditions', terms])
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
