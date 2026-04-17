import { formatCurrency } from '../../lib/formatters/money.js'
import type { PdfColumnDefinition, PdfDocumentModel, PdfPageLayout } from './types'

export type IndustryTemplateData = {
  title: string
  documentNumber: string
  documentNumberLabel: string
  issueDate: string | null | undefined
  issueDateLabel: string
  dueDateOrValidityDate: string | null | undefined
  dueDateOrValidityDateLabel: string
  poNumber: string | null | undefined
  poNumberLabel: string
  customHeaderFields: Array<{ label: string; value: string }>
  showTagline: boolean
  showBankDetails: boolean
  company: {
    logoUrl: string
    name: string
    tagline: string
    address: string
    cityState: string
    phone: string
    email: string
    customInfo: Array<{ label: string; value: string }>
  } | null
  client: {
    name: string
    address: string
    cityState: string
    phone: string
    email: string
  } | null
  table: {
    columns: Array<{
      key: string
      label: string
      align?: string
      width?: number
      flex?: number
      dataType?: string | null
    }>
    rows: Array<{
      type?: string
      rowType?: string
      isGroupHeader?: boolean
      groupName?: string | null
      groupLabel?: string | null
      imageUrl?: string | null
      cells?: Record<string, unknown>
    }>
  }
  paymentDetails: {
    bankName: string
    accountName: string
    accountNumber: string
    sortCode: string
  } | null
  totals: {
    lines: Array<{ label: string; value: string }>
    mainLine: { label: string; value: string } | null
    amountInWords: string
    balanceDue: { label: string; value: string } | null
  }
  advanceSummary: {
    contractValueLabel: string
    contractValue: string
    primaryLabel: string
    advanceAmount: string
    secondaryLabel: string
    balanceRemaining: string
  } | null
  notes: { title: string; content: string; format?: string } | null
  terms: { title: string; content: string; format?: string } | null
  attachments: Array<{ label?: string; url?: string | undefined }>
  additionalFields: Array<{ label: string; value: string }>
  signature: PdfDocumentModel['signature'] | null
  footer: {
    documentNumber: string
    companyName: string
    extraText: string
  }
  layout: PdfPageLayout
}

const PDF_MONEY_KEYS = new Set(['unit_price', 'amount', 'install_rate'])

function getDocumentNumberLabel(kind: PdfDocumentModel['identity']['kind']) {
  return kind === 'invoice' ? 'Invoice Number' : 'Quotation Number'
}

function getDateLabel(kind: PdfDocumentModel['identity']['kind']) {
  return kind === 'invoice' ? 'Due Date' : 'Valid Until'
}

function splitAddressLines(lines: string[] = []) {
  const filtered = lines.filter(Boolean)
  return {
    address: filtered[0] || '',
    cityState: filtered.slice(1).join(', '),
  }
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function hasDisplayValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

export function formatPdfMoney(value: unknown) {
  if (!hasDisplayValue(value)) return ''

  return formatCurrency(value, {
    currencySymbol: 'NGN ',
    locale: 'en-NG',
    preserveFraction: true,
  })
}

function formatPreparedCell(column: PdfColumnDefinition | undefined, cell: unknown) {
  if (!column || !hasDisplayValue(cell)) return cell
  if (!PDF_MONEY_KEYS.has(column.key)) return cell
  return formatPdfMoney(cell)
}

function createIndustryRows(model: PdfDocumentModel, columns: PdfColumnDefinition[]) {
  let lineNumber = 0

  return model.items.map((item) => {
    const isGroupHeader = item.rowType === 'group_header'

    if (isGroupHeader) {
      return {
        type: item.rowType,
        rowType: item.rowType,
        isGroupHeader: true,
        groupName: item.groupLabel,
        groupLabel: item.groupLabel,
        imageUrl: item.imageUrl,
        cells: undefined,
      }
    }

    lineNumber += 1
    const cells: Record<string, unknown> = { ...(item.cells || {}) }

    if (!hasDisplayValue(cells.num) && columns.some((column) => column.key === 'num')) {
      cells.num = String(lineNumber)
    }

    for (const column of columns) {
      if (column.key === 'description') continue
      cells[column.key] = formatPreparedCell(column, cells[column.key])
    }

    cells.description = {
      main: item.cells?.description ?? item.description ?? '',
      sub: item.subDescription ?? '',
    }

    return {
      type: item.rowType,
      rowType: item.rowType,
      isGroupHeader: false,
      groupName: item.groupLabel,
      groupLabel: item.groupLabel,
      imageUrl: item.imageUrl,
      cells,
    }
  })
}

export function adaptIndustryData(model: PdfDocumentModel): IndustryTemplateData {
  const issuerAddress = splitAddressLines(model.issuer?.addressLines || [])
  const recipientAddress = splitAddressLines(model.recipient?.addressLines || [])
  const mainLine = model.totals.rows.find((line) => line.emphasis)
  const totalLines = model.totals.rows
    .filter((line) => !line.emphasis)
    .map((line) => ({
      label: line.label,
      value: formatPdfMoney(line.amount),
    }))
  const columns = model.columns || []

  return {
    title: model.identity.title || (model.identity.kind === 'invoice' ? 'Invoice' : 'Quotation'),
    documentNumber: model.identity.number,
    documentNumberLabel: getDocumentNumberLabel(model.identity.kind),
    issueDate: model.identity.issueDate,
    issueDateLabel: 'Issue Date',
    dueDateOrValidityDate: model.identity.kind === 'invoice' ? model.identity.dueDate : model.identity.validUntil,
    dueDateOrValidityDateLabel: getDateLabel(model.identity.kind),
    poNumber: model.identity.poNumber,
    poNumberLabel: 'PO Number',
    customHeaderFields: model.headerFields || [],
    showTagline: Boolean(model.tagline),
    showBankDetails: Boolean(model.bankDetails),
    company: model.issuer
      ? {
          logoUrl: model.logo?.imageUrl || '',
          name: model.issuer.name || '',
          tagline: model.tagline || '',
          address: issuerAddress.address,
          cityState: issuerAddress.cityState,
          phone: model.issuer.phone || '',
          email: model.issuer.email || '',
          customInfo: model.issuer.taxId ? [{ label: 'Tax ID', value: model.issuer.taxId }] : [],
        }
      : null,
    client: model.recipient
      ? {
          name: model.recipient.name || '',
          address: recipientAddress.address,
          cityState: recipientAddress.cityState,
          phone: model.recipient.phone || '',
          email: model.recipient.email || '',
        }
      : null,
    table: {
      columns: columns.map((column) => ({
        key: column.key,
        label: column.label,
        align: column.align,
        width: column.pdfWidth || undefined,
        flex: column.pdfFlex || undefined,
        dataType: column.dataType || null,
      })),
      rows: createIndustryRows(model, columns),
    },
    paymentDetails: model.bankDetails
      ? {
          bankName: model.bankDetails.bankName || '',
          accountName: model.bankDetails.accountName || '',
          accountNumber: model.bankDetails.accountNumber || '',
          sortCode: model.bankDetails.sortCode || '',
        }
      : null,
    totals: {
      lines: totalLines,
      mainLine: mainLine
        ? {
            label: mainLine.label,
            value: formatPdfMoney(mainLine.amount),
          }
        : null,
      amountInWords: model.totals.amountInWords || '',
      balanceDue: model.totals.balanceDue !== null && model.totals.balanceDue !== undefined
        ? {
            label: 'Balance Due',
            value: formatPdfMoney(model.totals.balanceDue),
          }
        : null,
    },
    advanceSummary: model.totals.advanceSummary
      ? {
          contractValueLabel: 'Contract Value',
          contractValue: formatPdfMoney(model.totals.advanceSummary.contractValue),
          primaryLabel: model.totals.advanceSummary.primaryLabel || '',
          advanceAmount: formatPdfMoney(model.totals.advanceSummary.requestedAmount),
          secondaryLabel: model.totals.advanceSummary.secondaryLabel || '',
          balanceRemaining: formatPdfMoney(model.totals.advanceSummary.balanceRemaining),
        }
      : null,
    notes: model.notes || null,
    terms: model.terms || null,
    attachments: [
      ...(model.referenceLinks || []).map((entry) => ({ label: entry.label, url: entry.url })),
      ...(model.attachments || []).map((entry) => ({ label: entry.label || entry.fileName || '', url: entry.url || undefined })),
    ].filter((entry) => entry.label || entry.url),
    additionalFields: (model.additionalSections || []).map((section) => ({
      label: section.title,
      value: section.content,
    })),
    signature: model.signature || null,
    footer: {
      documentNumber: model.identity.number,
      companyName: model.metaFooter?.companyName || model.issuer?.name || '',
      extraText: model.footerText || '',
    },
    layout: { size: 'A4', orientation: 'portrait' },
  }
}
