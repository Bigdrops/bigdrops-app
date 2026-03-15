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
    groupMeta: {},
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
    if (item.row_type === 'group_header') {
      flushGroup()
      currentGroupName = item.group_name
      currentGroupShowSubtotal = !!(groupMeta && groupMeta[item.group_name]?.showSubtotal)
      currentGroupSubtotal = 0
      rows.push({ _type: 'group_header', item })
    } else {
      const amount = Number(item.amount || (Number(item.quantity) * Number(item.unit_price)) || 0)
      if (currentGroupName !== null) currentGroupSubtotal += amount
      rows.push({ _type: 'item', item, amount })
    }
  })
  flushGroup()
  return rows
}

export const extractInvoiceData = (invoice, items, client, settings) => {
  const cf = parseCF(invoice.custom_fields)
  const columnConfig = cf.columnConfig || []
  const isColVisible = (key) => {
    if (!columnConfig.length) return true
    const col = columnConfig.find(c => c.key === key)
    return col ? col.visible !== false : true
  }

  const companyName    = settings.company_name    || 'SUN & SHIELD POWER SOLUTIONS'
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

  return {
    cf, companyName, companyTagline, companyAddress, companyCity,
    companyPhone, companyEmail, logoUrl, footerText,
    subtotal, vatAmount, discount, whtAmount, totalPayable, grandTotal, installTotal,
    fixedCharges, validAttachments, renderRows, isColVisible,
  }
}


