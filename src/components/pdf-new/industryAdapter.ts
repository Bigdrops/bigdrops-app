import { formatPdfCurrencyString } from '../../lib/formatters/pdfCurrency'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import { normalizeRichTextSection } from './core/richText'
import { resolveCanonicalItemImageUrl, resolveCanonicalLogoUrl } from '../../domain/documentMedia'
import type { PdfColumnDefinition, PdfDocumentModel, PdfPageLayout } from './types'

type IndustryTemplateDesign = Pick<
  PdfDesignPreset,
  | 'accentColor'
  | 'textColor'
  | 'mutedColor'
  | 'borderColor'
  | 'surfaceColor'
  | 'headerFont'
  | 'bodyFont'
  | 'useCustomFonts'
  | 'useCustomColors'
> & {
  accentColor: string | null
  textColor: string | null
  mutedColor: string | null
  borderColor: string | null
  surfaceColor: string | null
  headerFont: string | null
  bodyFont: string | null
}

export type IndustryTemplateData = {
  title: string
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
    companyLogoUrl: string
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
      isGroupFooter?: boolean
      groupName?: string | null
      groupLabel?: string | null
      showSubtotal?: boolean
      groupSubtotalLabel?: string | null
      groupSubtotalValue?: string | null
      imageUrl?: string | null
      cells?: Record<string, unknown>
      isInGroup?: boolean
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
  notes: { title: string; content: string; plainText?: string; format?: string } | null
  terms: { title: string; content: string; plainText?: string; format?: string } | null
  attachments: Array<{ label?: string; url?: string | undefined }>
  additionalFields: Array<{ label: string; value: string }>
  signature: PdfDocumentModel['signature'] | null
  footer: {
    documentNumber: string
    companyName: string
    extraText: string
  }
  layout: PdfPageLayout
  design: IndustryTemplateDesign
}

const PDF_MONEY_KEYS = new Set(['unit_price', 'amount', 'install_rate'])

function getDocumentNumberLabel(kind: PdfDocumentModel['identity']['kind']) {
  return kind === 'invoice' ? 'Invoice Number' : 'Quotation Number'
}

function getDateLabel(kind: PdfDocumentModel['identity']['kind']) {
  return kind === 'invoice' ? 'Due Date' : 'Valid Until'
}

function normalizeHeaderLabel(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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

const normalizePdfTextSection = normalizeRichTextSection

export function formatPdfMoney(value: unknown, options: { withSymbol?: boolean } = { withSymbol: true }) {
  if (!hasDisplayValue(value)) return ''
  const formatted = formatPdfCurrencyString(value as any)
  return options.withSymbol === false ? formatted.replace(/^₦\s*/, '') : formatted
}

function formatPreparedCell(column: PdfColumnDefinition | undefined, cell: unknown) {
  if (!column || !hasDisplayValue(cell)) return cell
  if (!PDF_MONEY_KEYS.has(column.key)) return cell
  return formatPdfMoney(cell)
}

function resolveLineAmount(item: PdfDocumentModel['items'][number]) {
  if (typeof item.amount === 'number' && Number.isFinite(item.amount)) return item.amount

  const unitPrice = Number(item.unitPrice || 0)
  const quantity = Number(item.quantity || 0)
  const derivedAmount = unitPrice * quantity

  return Number.isFinite(derivedAmount) ? derivedAmount : 0
}

function resolveGroupSubtotal(model: PdfDocumentModel, groupId: string | null) {
  if (!groupId) return 0
  let subtotal = 0
  for (const item of model.items) {
    if (item.rowType !== 'line') continue
    if (item.groupId !== groupId) continue
    subtotal += resolveLineAmount(item)
  }
  return subtotal
}

function createIndustryRows(model: PdfDocumentModel, columns: PdfColumnDefinition[]) {
  let lineNumber = 0
  const rows: IndustryTemplateData['table']['rows'] = []
  let currentGroupHeader: any = null

  model.items.forEach((item, index) => {
    const isGroupHeader = item.rowType === 'group_header'

    if (isGroupHeader) {
      const showSubtotal = item.customData?.showSubtotal === true
      const groupSubtotal = showSubtotal ? resolveGroupSubtotal(model, item.groupId || null) : null

      currentGroupHeader = {
        type: item.rowType,
        rowType: item.rowType,
        isGroupHeader: true,
        groupId: item.groupId || null,
        groupName: item.groupLabel,
        groupLabel: item.groupLabel,
        showSubtotal,
        groupSubtotalLabel: null,
        groupSubtotalValue: showSubtotal && groupSubtotal !== null ? formatPdfMoney(groupSubtotal) : null,
        imageUrl: resolveCanonicalItemImageUrl(item),
        cells: undefined,
      }
      rows.push(currentGroupHeader)
      return
    }

    // Determine if this line belongs to the currently open group
    const belongsToCurrentGroup = !!currentGroupHeader && !!item.groupId && item.groupId === currentGroupHeader.groupId

    // If we have an open group but this line does NOT belong to it, close the group first
    // This is critical for group integrity
    if (currentGroupHeader && !belongsToCurrentGroup) {
      rows.push({
        type: 'group_footer',
        rowType: 'group_footer',
        isGroupFooter: true,
        groupSubtotalLabel: currentGroupHeader.groupSubtotalLabel,
        groupSubtotalValue: currentGroupHeader.groupSubtotalValue,
        showSubtotal: currentGroupHeader.showSubtotal,
        isInGroup: false,
      })
      currentGroupHeader = null
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

    const isInGroup = !!currentGroupHeader && !!item.groupId && item.groupId === currentGroupHeader.groupId

    rows.push({
      type: item.rowType,
      rowType: item.rowType,
      isGroupHeader: false,
      groupName: item.groupLabel,
      groupLabel: item.groupLabel,
      imageUrl: resolveCanonicalItemImageUrl(item),
      cells,
      isInGroup,
    })

    const nextItem = model.items[index + 1]
    const isEndingGroup = !!currentGroupHeader && (
      !nextItem ||
      nextItem.rowType === 'group_header' ||
      nextItem.groupId !== currentGroupHeader.groupId
    )

    if (currentGroupHeader && isEndingGroup) {
      rows.push({
        type: 'group_footer',
        rowType: 'group_footer',
        isGroupFooter: true,
        groupSubtotalLabel: currentGroupHeader.groupSubtotalLabel,
        groupSubtotalValue: currentGroupHeader.groupSubtotalValue,
        showSubtotal: currentGroupHeader.showSubtotal,
        isInGroup: true,
      })
      currentGroupHeader = null
    }
  })

  return rows
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
  const standardHeaderLabels = new Set([
    normalizeHeaderLabel(getDocumentNumberLabel(model.identity.kind)),
    normalizeHeaderLabel('Issue Date'),
    normalizeHeaderLabel(getDateLabel(model.identity.kind)),
    normalizeHeaderLabel('PO Number'),
  ])

  if (model.identity.kind === 'quotation') {
    standardHeaderLabels.add(normalizeHeaderLabel('Client'))
    standardHeaderLabels.add(normalizeHeaderLabel('Title'))
  }

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
    customHeaderFields: (model.headerFields || []).filter((field) => !standardHeaderLabels.has(normalizeHeaderLabel(field.label))),
    showTagline: Boolean(model.tagline),
    showBankDetails: Boolean(model.bankDetails),
    company: model.issuer
        ? {
          companyLogoUrl: resolveCanonicalLogoUrl(model.logo) || '',
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
        return {
          key: column.key,
          label: column.label,
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
      balanceDue: !isAdvanceDocument && model.totals.balanceDue !== null && model.totals.balanceDue !== undefined
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
    notes: normalizePdfTextSection(model.notes),
    terms: normalizePdfTextSection(model.terms),
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
