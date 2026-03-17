import { BUILTIN_COLUMNS, getPdfColumns, getPdfCellValue } from '../useInvoiceColumns.jsx'

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

export const buildRenderRows = (items, groupMeta) => {
  const rows = []
  let currentGroupName = null
  let currentGroupSubtotal = 0
  let currentGroupShowSubtotal = false
  const normalizeRate = (value) => {
    if (value === '' || value === null || value === undefined) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const flushGroup = () => {
    if (currentGroupName !== null) {
      if (currentGroupShowSubtotal) {
        rows.push({ _type: 'group_subtotal', name: currentGroupName, subtotal: currentGroupSubtotal })
      }
      rows.push({ _type: 'group_end', name: currentGroupName })
    }
    currentGroupName = null
    currentGroupSubtotal = 0
    currentGroupShowSubtotal = false
  }

  items.forEach((item) => {
    const normalizedItem = {
      ...item,
      install_rate: normalizeRate(item.install_rate),
      vat_rate: normalizeRate(item.vat_rate),
      discount_rate: normalizeRate(item.discount_rate),
    }

    if (item.row_type === 'group_header') {
      flushGroup()
      currentGroupName = item.group_name
      currentGroupShowSubtotal = !!(
        groupMeta &&
        (groupMeta[item.group_id]?.showSubtotal || groupMeta[item.group_name]?.showSubtotal)
      )
      currentGroupSubtotal = 0
      rows.push({ _type: 'group_header', item: normalizedItem })
    } else {
      const amount = Number(item.amount || (Number(item.quantity) * Number(item.unit_price)) || 0)
      if (currentGroupName !== null) currentGroupSubtotal += amount
      rows.push({ _type: 'item', item: normalizedItem, amount })
    }
  })
  flushGroup()
  return rows
}

export const extractInvoiceData = (invoice, items, client, settings) => {
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

  const subtotal     = Number(invoice.subtotal  || 0)
  const vatAmount    = Number(invoice.vat       || 0)
  const discount     = Number(invoice.discount  || 0)
  const whtAmount    = Number(invoice.wht       || 0)
  const totalPayable = Number(invoice.total     || 0)
  const grandTotal   = whtAmount > 0 ? totalPayable + whtAmount : totalPayable
  const installTotal = Number(invoice.install_rate_total || 0)

  const fixedCharges = [
    { label: cf.chargeLabels?.workmanship    || 'Workmanship',   value: Number(invoice.workmanship   || 0) },
    { label: cf.chargeLabels?.transportation || 'Transportation', value: Number(invoice.transportation || 0) },
    { label: cf.chargeLabels?.shipping       || 'Shipping',       value: Number(invoice.shipping      || 0) },
  ].filter(e => e.value > 0)

  const validAttachments = (cf.attachments || []).filter(a => a.label && a.url)
  const renderRows = buildRenderRows(items, cf.groupMeta)
  const getColumnConfig = (key) => columnConfig.find((col) => col.key === key)
  const getColumnLabel = (key, fallback) => getColumnConfig(key)?.label || fallback
  const pdfColumns = getPdfColumns(columnConfig)
  const installColumn = getColumnConfig('install_rate')

  return {
    cf, companyName, companyTagline, companyAddress, companyCity,
    companyPhone, companyEmail, logoUrl, footerText,
    subtotal, vatAmount, discount, whtAmount, totalPayable, grandTotal, installTotal,
    fixedCharges, validAttachments, renderRows, isColVisible, getColumnLabel,
    pdfColumns, installColumn,
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
  const standardItems = items.filter((item) => item.row_type !== 'group_header')
  const visibleColumns = d.pdfColumns.filter((column) => {
    if (column.key === 'make') return standardItems.some((item) => cleanText(item.make))
    return true
  }).map((column) => ({
    key: column.key === 'description' ? 'desc' : column.key,
    label: column.label,
    width: column.pdfWidth,
    align: column.align,
    type: column.type,
    sourceKey: column.key,
  }))
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
    invoice.payment_terms ? `Payment Terms: ${invoice.payment_terms}` : '',
    invoice.work_duration ? `Work Duration: ${invoice.work_duration}` : '',
    ...(d.cf.header || []).filter((f) => f.label && f.value).map((f) => `${f.label}: ${f.value}`),
  ].filter(Boolean).length

  const twoColHeight = 28 + Math.max(leftLines, rightLines, 1) * 11
  const titleHeight = invoice.invoice_title ? 20 : 0
  return twoColHeight + titleHeight
}

const estimateClassicRowHeight = (row, layout) => {
  if (row._type === 'group_header') return 24
  if (row._type === 'group_subtotal') return 20
  if (row._type === 'group_end') return 8

  const descriptionLines = Math.max(1, estimateWrappedLines(row.item.description, layout.desc, 9))
  const subDescriptionLines = row.item.sub_description
    ? estimateWrappedLines(row.item.sub_description, layout.desc, 7.5)
    : 0

  return 14 + descriptionLines * 11 + subDescriptionLines * 8 + (subDescriptionLines > 0 ? 2 : 0)
}

const estimateClassicTotalsReserve = (d, invoice) => {
  const totalsLineCount =
    2 +
    (d.isColVisible('install_rate') && d.installTotal > 0 ? 1 : 0) +
    d.fixedCharges.length +
    (d.cf.extraCharges || []).filter((c) => Number(c.value) > 0).length +
    (d.vatAmount > 0 ? 1 : 0) +
    (d.discount > 0 ? 1 : 0) +
    (d.whtAmount > 0 ? 2 : 0)

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

const canFitRowRange = (rows, layout, budget) => {
  let used = 0
  for (let i = 0; i < rows.length; i += 1) {
    used += estimateClassicRowHeight(rows[i], layout)
    if (used > budget) return false
  }
  return true
}

const takeRowsForBudget = (rows, layout, budget) => {
  const taken = []
  let used = 0

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    const rowHeight = estimateClassicRowHeight(row, layout)
    let required = rowHeight

    if (row._type === 'group_header' && rows[i + 1]) {
      required += estimateClassicRowHeight(rows[i + 1], layout)
    }

    if (used + required > budget && taken.length > 0) break

    taken.push(row)
    used += rowHeight

    if (used >= budget) break
  }

  if (!taken.length && rows[0]) {
    return {
      rows: [rows[0]],
      usedHeight: estimateClassicRowHeight(rows[0], layout),
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

export const planClassicInvoicePages = (invoice, items, client, settings) => {
  const d = extractInvoiceData(invoice, items, client, settings)
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

  const finalReserve = estimateClassicTotalsReserve(d, invoice)
  const rowPages = []
  let remainingRows = [...d.renderRows]
  let isFirstPage = true

  if (!remainingRows.length) {
    rowPages.push({ rows: [], usedHeight: 0, isFirstPage: true })
  }

  while (remainingRows.length) {
    const currentBudget = isFirstPage ? firstPageBudget : continuationBudget
    const finalPageBudget = Math.max(80, currentBudget - finalReserve)

    if (canFitRowRange(remainingRows, layout, finalPageBudget)) {
      rowPages.push({
        rows: [...remainingRows],
        usedHeight: remainingRows.reduce((sum, row) => sum + estimateClassicRowHeight(row, layout), 0),
        isFirstPage,
      })
      remainingRows = []
      break
    }

    const taken = takeRowsForBudget(remainingRows, layout, currentBudget)
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


