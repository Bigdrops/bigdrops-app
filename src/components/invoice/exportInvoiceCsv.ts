import type { InvoiceItem } from '@/domain/invoice'
import {
  buildDocumentSummaryCsvRows,
  resolveDocumentTextSection,
  type DocumentCsvTotals,
} from '@/utils/csvDocumentSummary'

type InvoiceCsvInvoice = {
  invoice_number?: string
  po_number?: string | null
  invoice_title?: string | null
  document_type?: string | null
  status?: string | null
  client_name?: string | null
  issue_date?: string | null
  due_date?: string | null
  notes?: string | null
  terms?: string | null
}

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function buildInvoiceCsv(params: {
  invoice: InvoiceCsvInvoice
  items: InvoiceItem[]
  totals?: DocumentCsvTotals
  customFields?: Record<string, any>
}) {
  const { invoice, items, totals, customFields } = params
  const rows: string[][] = [
    ['Invoice Number', invoice.invoice_number || ''],
    ['P.O. Number', invoice.po_number || ''],
    ['Invoice Title', invoice.invoice_title || ''],
    ['Document Type', invoice.document_type || 'INVOICE'],
    ['Status', invoice.status || 'unpaid'],
    ['Client', invoice.client_name || ''],
    ['Issue Date', invoice.issue_date || ''],
    ['Due Date', invoice.due_date || ''],
    [],
    [
      'Line',
      'Row Type',
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

  let lineNumber = 0
  items.forEach((item) => {
    const rowType = item.row_type === 'group_header' ? 'group_header' : 'standard'
    if (rowType === 'standard') lineNumber += 1
    rows.push([
      rowType === 'standard' ? String(lineNumber) : '',
      rowType,
      rowType === 'group_header' ? item.group_name || '' : item.description || '',
      rowType === 'group_header' ? '' : item.sub_description || '',
      rowType === 'group_header' ? '' : item.make || '',
      rowType === 'group_header' ? '' : String(Number(item.quantity || 0)),
      rowType === 'group_header' ? '' : item.unit || '',
      rowType === 'group_header' ? '' : String(Number(item.unit_price || 0)),
      rowType === 'group_header' ? '' : item.install_rate == null ? '' : String(item.install_rate),
      rowType === 'group_header' ? '' : item.vat_rate == null ? '' : String(item.vat_rate),
      rowType === 'group_header' ? '' : item.discount_rate == null ? '' : String(item.discount_rate),
      rowType === 'group_header' ? '' : String(Number(item.quantity || 0) * Number(item.unit_price || 0)),
    ])
  })

  if (totals) {
    rows.push([])
    rows.push(...buildDocumentSummaryCsvRows({ document: invoice, totals, customFields }))
  }

  const notes = resolveDocumentTextSection(invoice, customFields, 'notes', 'notesHtml')
  const terms = resolveDocumentTextSection(invoice, customFields, 'terms', 'termsHtml')

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

export function downloadInvoiceCsv(filename: string, csv: string) {
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
