import { BUILTIN_COLUMNS, getPdfColumns } from '../useInvoiceColumns.jsx'

export const stripHtml = (html) => {
  if (!html) return ''
  return html
    .replace(/<strong>(.*?)<\/strong>/gs, '$1')
    .replace(/<em>(.*?)<\/em>/gs, '$1')
    .replace(/<u>(.*?)<\/u>/gs, '$1')
    .replace(/<li>(.*?)<\/li>/gs, '\u2022 $1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const parseCF = (raw) => {
  const defaults = {
    header: [], bottom: [], extraCharges: [], chargeLabels: {},
    mergeQtyUnit: false, showItemImages: false, attachments: [],
    notesTitle: 'Notes', termsTitle: 'Terms and Conditions',
    groupMeta: {}, columnConfig: [],
  }
  if (!raw) return defaults
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return { ...defaults, header: p }
    return { ...defaults, ...p }
  } catch { return defaults }
}

export const hasDisplayValue = (value) => String(value ?? '').trim().length > 0

export const getHeaderFields = (cf) =>
  (cf?.header || []).filter((field) => hasDisplayValue(field?.label) && hasDisplayValue(field?.value))

export const getInvoiceDocumentMeta = (invoice) => [
  { label: 'Date', value: invoice.issue_date },
  { label: 'Due', value: invoice.due_date },
  { label: 'Status', value: invoice.status ? String(invoice.status).replace(/_/g, ' ') : '' },
].filter((entry) => hasDisplayValue(entry.value))

export const getInvoiceReferenceMeta = (invoice, cf, poNumber) => [
  { label: 'P.O. Number', value: poNumber },
  { label: 'Payment Terms', value: invoice.payment_terms },
  { label: 'Work Duration', value: invoice.work_duration },
  ...getHeaderFields(cf).map((field) => ({ label: field.label, value: field.value })),
].filter((entry) => hasDisplayValue(entry.value))

export const buildRenderRows = (items, computedItems = [], groups = [], groupMeta = {}) => {
  const rows = []
  const groupTotals = new Map(groups.map((group) => [group.group_id, group]))
  let currentGroupId = null
  let currentGroupName = null

  const flushGroup = () => {
    if (currentGroupId !== null) {
      const groupConfig = groupMeta[currentGroupId] || groupMeta[currentGroupName] || {}
      const groupTotalsRow = groupTotals.get(currentGroupId)
      if (groupConfig.showSubtotal && groupTotalsRow) {
        rows.push({ _type: 'group_subtotal', name: currentGroupName, subtotal: Number(groupTotalsRow.subtotal || 0) })
      }
      rows.push({ _type: 'group_end', name: currentGroupName })
    }
    currentGroupId = null
    currentGroupName = null
  }

  items.forEach((item, index) => {
    if (item.row_type === 'group_header') {
      flushGroup()
      currentGroupId = item.group_id || null
      currentGroupName = item.group_name
      rows.push({ _type: 'group_header', item })
    } else {
      const computed = computedItems[index]
      rows.push({
        _type: 'item',
        item,
        amount: computed?.line_subtotal ?? 0,
        installValue: computed?.line_install ?? 0,
      })
    }
  })
  flushGroup()
  return rows
}

export const extractInvoiceData = (invoice, items, client, settings, result) => {
  const cf = parseCF(invoice.custom_fields)
  const columnConfig = cf.columnConfig?.length ? cf.columnConfig : BUILTIN_COLUMNS
  const isColVisible = (key) => {
    const col = columnConfig.find(c => c.key === key)
    return col ? col.visible !== false : true
  }

  const companyName    = settings.company_name    || ''
  const companyTagline = settings.company_tagline  || ''
  const companyAddress = settings.company_address  || ''
  const companyCity    = settings.company_city     || ''
  const companyPhone   = settings.company_phone    || ''
  const companyEmail   = settings.company_email    || ''
  const logoUrl        = settings.logo_url         || ''
  const footerText     = settings.footer_text      || ''

  const poNumber = String(invoice.po_number || '').trim()

  const validAttachments = (cf.attachments || []).filter(a => a.label && a.url)
  const renderRows = buildRenderRows(items, result?.items || [], result?.groups || [], cf.groupMeta)
  const getColumnConfig = (key) => columnConfig.find((col) => col.key === key)
  const getColumnLabel = (key, fallback) => getColumnConfig(key)?.label || fallback
  const pdfColumns = getPdfColumns(columnConfig)
  const installColumn = getColumnConfig('install_rate')
  const headerFields = getHeaderFields(cf)
  const documentMeta = getInvoiceDocumentMeta(invoice)
  const referenceMeta = getInvoiceReferenceMeta(invoice, cf, poNumber)

  return {
    cf, companyName, companyTagline, companyAddress, companyCity,
    companyPhone, companyEmail, logoUrl, footerText, poNumber,
    validAttachments, renderRows, isColVisible, getColumnLabel,
    pdfColumns, headerFields, documentMeta, referenceMeta,
  }
}

const CLASSIC_PAGE_METRICS = {
  contentHeight: 742,
  footerReserve: 34,
  firstHeaderBase: 104,
  continuationHeader: 48,
  tableHeader: 28,
  finalReserveGap: 10,
  extraPageTopGap: 12,
}

const cleanText = (value) => stripHtml(String(value || '')).replace(/\s+/g, ' ').trim()

const estimateWrappedLines = (text, width, fontSize) => {
  const normalized = cleanText(text)
  if (!normalized) return 0

  const words = normalized.split(/\s+/)
  const avgCharWidth = fontSize * 0.5
  const maxChars = Math.max(12, Math.floor(width / avgCharWidth))
  let lines = 1
  let current = 0

  words.forEach((word) => {
    const needed = word.length + (current > 0 ? 1 : 0)
    if (current > 0 && current + needed > maxChars) {
      lines += 1
      current = word.length
    } else {
      current += needed
    }
  })

  return lines
}

const CLASSIC_TABLE_WIDTH = 515

export const getClassicTableColumns = (d, items) => {
  const visibleColumns = [
    { key: 'num', label: '#', width: 18, align: 'center', sourceKey: 'num' },
    { key: 'desc', label: 'Description', width: 0, align: 'left', sourceKey: 'description' },
    { key: 'quantity', label: 'Qty/Unit', width: 52, align: 'center', sourceKey: 'quantity' },
    { key: 'unit_price', label: 'Price', width: 50, align: 'right', sourceKey: 'unit_price' },
    { key: 'amount', label: 'Amount', width: 58, align: 'right', sourceKey: 'amount' },
    ...(d.isColVisible('install_rate')
      ? [{ key: 'install_rate', label: 'Install', width: 42, align: 'right', sourceKey: 'install_rate' }]
      : []),
    ...(d.isColVisible('vat_rate')
      ? [{ key: 'vat_rate', label: 'VAT', width: 26, align: 'center', sourceKey: 'vat_rate' }]
      : []),
    ...(d.isColVisible('discount_rate')
      ? [{ key: 'discount_rate', label: 'Disc', width: 28, align: 'center', sourceKey: 'discount_rate' }]
      : []),
  ]
  const reservedWidth = visibleColumns.reduce((sum, column) => sum + (column.key === 'desc' ? 0 : column.width), 0)
  const descriptionWidth = Math.max(120, CLASSIC_TABLE_WIDTH - reservedWidth)

  return visibleColumns.map((column) =>
    column.key === 'desc' ? { ...column, width: descriptionWidth } : column,
  )
}

const estimateClassicHeaderHeight = (d, invoice) => {
  const companyLines = [
    d.companyName,
    d.companyTagline,
    d.companyAddress,
    d.companyCity,
    d.companyPhone,
    d.companyEmail,
  ].filter(Boolean).length || 1

  const docLines = [
    invoice.document_type || 'INVOICE',
    invoice.invoice_number,
    invoice.issue_date,
    invoice.due_date,
  ].filter(Boolean).length

  const logoBoost = d.logoUrl ? 8 : 0
  return CLASSIC_PAGE_METRICS.firstHeaderBase + Math.max(companyLines, docLines) * 8 + logoBoost
}

const estimateClassicTopContextHeight = (d, invoice, client) => {
  const leftLines = [
    invoice.client_name,
    client?.address,
    client?.city ? `${client.city}${client.state ? `, ${client.state}` : ''}` : '',
    client?.phone,
    client?.email,
    client?.contact_person ? `Attn: ${client.contact_person}` : '',
  ].filter(Boolean).length

  const rightLines = [
    d.poNumber ? `P.O. Number: ${d.poNumber}` : '',
    invoice.payment_terms ? `Payment Terms: ${invoice.payment_terms}` : '',
    invoice.work_duration ? `Work Duration: ${invoice.work_duration}` : '',
    ...(d.cf.header || []).filter((f) => f.label && f.value).map((f) => `${f.label}: ${f.value}`),
  ].filter(Boolean).length

  const twoColHeight = 28 + Math.max(leftLines, rightLines, 1) * 11
  const titleHeight = invoice.invoice_title ? 20 : 0
  return twoColHeight + titleHeight
}

const estimateClassicDescriptionExtras = (row, d, layout) => {
  if (row._type !== 'item') return 0

  const extras = []
  if (d.isColVisible('make') && cleanText(row.item.make)) {
    extras.push(`Make: ${row.item.make}`)
  }

  d.pdfColumns
    .filter((column) => column.kind === 'custom')
    .forEach((column) => {
      const value = row.item.custom_data?.[column.key]
      if (value === null || value === undefined || value === '') return
      extras.push(`${column.label}: ${value}`)
    })

  return extras.reduce((sum, line) => sum + Math.max(1, estimateWrappedLines(line, layout.desc, 7)), 0)
}

const estimateClassicRowHeight = (row, layout, d) => {
  if (row._type === 'group_header') return 24
  if (row._type === 'group_subtotal') return 20
  if (row._type === 'group_end') return 8

  const descriptionLines = Math.max(1, estimateWrappedLines(row.item.description, layout.desc, 9))
  const subDescriptionLines = row.item.sub_description
    ? estimateWrappedLines(row.item.sub_description, layout.desc, 7.5)
    : 0
  const extraLines = estimateClassicDescriptionExtras(row, d, layout)

  return 14 + descriptionLines * 11 + subDescriptionLines * 8 + extraLines * 8 + (subDescriptionLines > 0 || extraLines > 0 ? 2 : 0)
}

const estimateClassicTotalsReserve = (d, invoice, result) => {
  const totalsLineCount =
    2 +
    (d.isColVisible('install_rate') && Number(result?.installRateTotal || 0) > 0 ? 1 : 0) +
    (Number(result?.extraChargesTotal || 0) > 0 ? 1 : 0) +
    (Number(result?.vat || 0) > 0 ? 1 : 0) +
    (Number(result?.discount || 0) > 0 ? 1 : 0) +
    (Number(result?.wht || 0) > 0 ? 2 : 0)

  const totalsHeight = 30 + totalsLineCount * 12
  const amountInWordsHeight = invoice.amount_in_words
    ? 18 + estimateWrappedLines(invoice.amount_in_words, 360, 8.5) * 10
    : 0

  return totalsHeight + amountInWordsHeight + CLASSIC_PAGE_METRICS.footerReserve + CLASSIC_PAGE_METRICS.finalReserveGap
}

const estimateClassicExtraBlockHeight = (block) => {
  if (block.type === 'attachments') {
    return 28 + block.items.length * 14
  }

  const width = 500
  const lineCount = Math.max(1, estimateWrappedLines(block.content, width, 8.5))
  return 24 + lineCount * 10
}

const canFitRowRange = (rows, layout, budget, d) => {
  let used = 0
  for (let i = 0; i < rows.length; i += 1) {
    used += estimateClassicRowHeight(rows[i], layout, d)
    if (used > budget) return false
  }
  return true
}

const takeRowsForBudget = (rows, layout, budget, d) => {
  const taken = []
  let used = 0

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    const rowHeight = estimateClassicRowHeight(row, layout, d)
    let required = rowHeight

    if (row._type === 'group_header' && rows[i + 1]) {
      required += estimateClassicRowHeight(rows[i + 1], layout, d)
    }

    if (used + required > budget && taken.length > 0) break

    taken.push(row)
    used += rowHeight

    if (used >= budget) break
  }

  if (!taken.length && rows[0]) {
    return {
      rows: [rows[0]],
      usedHeight: estimateClassicRowHeight(rows[0], layout, d),
    }
  }

  return { rows: taken, usedHeight: used }
}

const paginateExtraBlocks = (blocks, budget, firstBudget) => {
  if (!blocks.length) return []

  const pages = []
  let remaining = [...blocks]
  let currentBudget = firstBudget

  while (remaining.length) {
    let used = 0
    const pageBlocks = []

    while (remaining.length) {
      const next = remaining[0]
      const height = estimateClassicExtraBlockHeight(next)
      if (pageBlocks.length && used + height > currentBudget) break
      pageBlocks.push(next)
      used += height
      remaining.shift()
      if (used >= currentBudget) break
    }

    pages.push(pageBlocks)
    currentBudget = budget
  }

  return pages
}

export const planClassicInvoicePages = (invoice, items, client, settings, result) => {
  const d = extractInvoiceData(invoice, items, client, settings, result)
  const columns = getClassicTableColumns(d, items)
  const layout = columns.reduce((acc, column) => ({ ...acc, [column.key]: column.width }), {})
  const hasMake = columns.some((column) => column.key === 'make')
  const showUnit = columns.some((column) => column.key === 'unit')

  const firstPageBudget =
    CLASSIC_PAGE_METRICS.contentHeight -
    estimateClassicHeaderHeight(d, invoice) -
    estimateClassicTopContextHeight(d, invoice, client) -
    CLASSIC_PAGE_METRICS.tableHeader -
    CLASSIC_PAGE_METRICS.footerReserve

  const continuationBudget =
    CLASSIC_PAGE_METRICS.contentHeight -
    CLASSIC_PAGE_METRICS.continuationHeader -
    CLASSIC_PAGE_METRICS.tableHeader -
    CLASSIC_PAGE_METRICS.footerReserve

  const finalReserve = estimateClassicTotalsReserve(d, invoice, result)
  const rowPages = []
  let remainingRows = [...d.renderRows]
  let isFirstPage = true

  if (!remainingRows.length) {
    rowPages.push({ rows: [], usedHeight: 0, isFirstPage: true })
  }

  while (remainingRows.length) {
    const currentBudget = isFirstPage ? firstPageBudget : continuationBudget
    const finalPageBudget = Math.max(80, currentBudget - finalReserve)

    if (canFitRowRange(remainingRows, layout, finalPageBudget, d)) {
      rowPages.push({
        rows: [...remainingRows],
        usedHeight: remainingRows.reduce((sum, row) => sum + estimateClassicRowHeight(row, layout, d), 0),
        isFirstPage,
      })
      remainingRows = []
      break
    }

    const taken = takeRowsForBudget(remainingRows, layout, currentBudget, d)
    rowPages.push({ ...taken, isFirstPage })
    remainingRows = remainingRows.slice(taken.rows.length)
    isFirstPage = false
  }

  const extras = []
  const notesText = cleanText(invoice.notes)
  const termsText = cleanText(invoice.terms)

  if (notesText) {
    extras.push({ type: 'text', title: d.cf.notesTitle || 'Notes', content: notesText })
  }
  if (termsText) {
    extras.push({ type: 'text', title: d.cf.termsTitle || 'Terms and Conditions', content: termsText })
  }
  if (d.validAttachments.length) {
    extras.push({ type: 'attachments', title: 'Supporting Documents', items: d.validAttachments })
  }

  const lastRowPage = rowPages[rowPages.length - 1]
  const lastRowPageBudget = lastRowPage.isFirstPage ? firstPageBudget : continuationBudget
  const extraSpaceOnLastRowPage = Math.max(
    0,
    lastRowPageBudget - lastRowPage.usedHeight - finalReserve - CLASSIC_PAGE_METRICS.extraPageTopGap,
  )

  const inlineExtraBlocks = []
  let usedInlineExtra = 0
  while (extras.length) {
    const next = extras[0]
    const height = estimateClassicExtraBlockHeight(next)
    if (inlineExtraBlocks.length && usedInlineExtra + height > extraSpaceOnLastRowPage) break
    if (!inlineExtraBlocks.length && height > extraSpaceOnLastRowPage) break
    inlineExtraBlocks.push(next)
    usedInlineExtra += height
    extras.shift()
  }

  lastRowPage.inlineExtraBlocks = inlineExtraBlocks
  const extraPages = paginateExtraBlocks(
    extras,
    CLASSIC_PAGE_METRICS.contentHeight - CLASSIC_PAGE_METRICS.continuationHeader - CLASSIC_PAGE_METRICS.footerReserve,
    CLASSIC_PAGE_METRICS.contentHeight - CLASSIC_PAGE_METRICS.continuationHeader - CLASSIC_PAGE_METRICS.footerReserve,
  )

  return {
    d,
    hasMake,
    showUnit,
    columns,
    layout,
    pages: rowPages.map((page, index) => ({
      kind: 'rows',
      rows: page.rows,
      showTopContext: page.isFirstPage,
      showTotals: index === rowPages.length - 1,
      inlineExtraBlocks: page.inlineExtraBlocks || [],
    })).concat(
      extraPages.map((blocks) => ({
        kind: 'extras',
        blocks,
      })),
    ),
  }
}


