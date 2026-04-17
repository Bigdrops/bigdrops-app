import { formatCurrency } from '../../lib/formatters/money.js'
import type { PdfColumnDefinition, PdfDocumentModel, PdfPageLayout } from './types'

export type IndustryTemplateData = {
  customTitle: string | null
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
      showSubtotal?: boolean
      groupSubtotalLabel?: string | null
      groupSubtotalValue?: string | null
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
    primaryLabel: string | null
    advanceAmount: string | null
    secondaryLabel: string | null
    balanceRemaining: string | null
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
  design: {
    accentColor: string | null
    textColor: string | null
    mutedColor: string | null
    borderColor: string | null
    surfaceColor: string | null
    headerFont: string | null
    bodyFont: string | null
    useCustomFonts: boolean
    useCustomColors: boolean
  }
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

export function formatPdfMoney(value: unknown, options: { withSymbol?: boolean } = { withSymbol: true }) {
  if (!hasDisplayValue(value)) return ''

  return formatCurrency(value, {
    currencySymbol: options.withSymbol ? 'NGN ' : '',
    locale: 'en-NG',
    preserveFraction: true,
  })
}

function formatPreparedCell(column: PdfColumnDefinition | undefined, cell: unknown) {
  if (!column || !hasDisplayValue(cell)) return cell
  if (!PDF_MONEY_KEYS.has(column.key)) return cell
  return formatPdfMoney(cell, { withSymbol: false })
}

function resolveLineAmount(item: PdfDocumentModel['items'][number]) {
  if (typeof item.amount === 'number' && Number.isFinite(item.amount)) return item.amount

  const unitPrice = Number(item.unitPrice || 0)
  const quantity = Number(item.quantity || 0)
  const derivedAmount = unitPrice * quantity

  return Number.isFinite(derivedAmount) ? derivedAmount : 0
}

function resolveGroupSubtotal(model: PdfDocumentModel, startIndex: number) {
  let subtotal = 0

  for (let index = startIndex + 1; index < model.items.length; index += 1) {
    const item = model.items[index]
    if (item.rowType === 'group_header') break
    subtotal += resolveLineAmount(item)
  }

  return subtotal
}

function createIndustryRows(model: PdfDocumentModel, columns: PdfColumnDefinition[]) {
  let lineNumber = 0

  return model.items.map((item, index) => {
    const isGroupHeader = item.rowType === 'group_header'

    if (isGroupHeader) {
      const showSubtotal = item.customData?.showSubtotal === true
      const groupSubtotal = showSubtotal ? resolveGroupSubtotal(model, index) : null

      return {
        type: item.rowType,
        rowType: item.rowType,
        isGroupHeader: true,
        groupName: item.groupLabel,
        groupLabel: item.groupLabel,
        showSubtotal,
        groupSubtotalLabel: showSubtotal ? 'Group Subtotal' : null,
        groupSubtotalValue: showSubtotal && groupSubtotal !== null ? formatPdfMoney(groupSubtotal) : null,
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

  const totalLinesRaw = model.totals.rows
    .filter((line) => !line.emphasis)
    .map((line) => ({
      label: line.label,
      value: formatPdfMoney(line.amount),
    }))

  // Remove "Balance Due" only when this is an advance child document
  const isAdvanceDocument = Boolean(model.totals.advanceSummary)
  const totalLines = isAdvanceDocument
    ? totalLinesRaw.filter((line) => {
        const rawLabel = String(line?.label || '').trim().toLowerCase()
        return rawLabel !== 'balance due'
      })
    : totalLinesRaw

  const columns = model.columns || []

  const primaryTitle = model.identity.kind === 'invoice' ? 'INVOICE' : 'QUOTATION'
  const rawTitle = (model.identity.title || '').trim()
  const isDuplicate = rawTitle.toUpperCase() === primaryTitle

  return {
    title: primaryTitle,
    customTitle: (rawTitle && !isDuplicate) ? rawTitle : null,
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
      columns: columns.map((column) => {
        let label = column.label
        if (PDF_MONEY_KEYS.has(column.key)) {
          label = `${label} (NGN)`
        }
        return {
          key: column.key,
          label,
          align: column.align,
          width: column.pdfWidth || undefined,
          flex: column.pdfFlex || undefined,
          dataType: column.dataType || null,
        }
      }),
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
          primaryLabel: model.totals.advanceSummary.primaryLabel || null,
          advanceAmount: formatPdfMoney(model.totals.advanceSummary.requestedAmount) || null,
          secondaryLabel: model.totals.advanceSummary.secondaryLabel || null,
          balanceRemaining: formatPdfMoney(model.totals.advanceSummary.balanceRemaining) || null,
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
    design: {
      accentColor: model.template?.designPreset?.accentColor || null,
      textColor: model.template?.designPreset?.textColor || null,
      mutedColor: model.template?.designPreset?.mutedColor || null,
      borderColor: model.template?.designPreset?.borderColor || null,
      surfaceColor: model.template?.designPreset?.surfaceColor || null,
      headerFont: model.template?.designPreset?.headerFont || null,
      bodyFont: model.template?.designPreset?.bodyFont || null,
      useCustomFonts: Boolean(model.template?.designPreset?.useCustomFonts),
      useCustomColors: Boolean(model.template?.designPreset?.useCustomColors),
    },
  }
}
