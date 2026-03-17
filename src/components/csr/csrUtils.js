export const CSR_META_PREFIX = '__CSR_META_V1__'

export const DEFAULT_MATERIAL_ROW = {
  item: '',
  quantity: '',
  unit: '',
}

export const DEFAULT_CSR_META = {
  showOperationalReadings: true,
  modelLabel: 'Model',
  serialLabel: 'Serial No.',
  showAcknowledgement: true,
  recipientTitle: 'Received By / Witness',
  recipientRole: '',
  technicianName: '',
  showTechnicianSignLine: false,
  materialsOutputStyle: 'list',
}

export function createDefaultCsr(isField = false) {
  const today = new Date().toISOString().split('T')[0]
  return {
    csr_number: '',
    date: today,
    client_id: '',
    client_name: '',
    address: '',
    problem_reported: '',
    equipment_type: '',
    equipment_location: '',
    make: '',
    model: '',
    serial_no: '',
    capacity: '',
    voltage: '',
    frequency: '',
    battery: '',
    temperature: '',
    pressure: '',
    hours: '',
    materials_used: '',
    service_rendered: '',
    engineer_remarks: '',
    status: isField ? 'Field Entry Pending' : 'Complete',
    start_date: today,
    start_time: '',
    end_date: today,
    end_time: '',
    customer_feedback: '',
    acknowledgement_name: '',
    linked_invoice_id: '',
    show_po: false,
    po_number: '',
  }
}

function normalizeLetters(value) {
  return value.toUpperCase()
}

export function incrementTrailingLetters(value) {
  if (!value) return 'A'
  const chars = normalizeLetters(value).split('')
  let carry = 1

  for (let index = chars.length - 1; index >= 0; index -= 1) {
    if (!carry) break
    const code = chars[index].charCodeAt(0) - 65 + carry
    if (code >= 26) {
      chars[index] = 'A'
      carry = 1
    } else {
      chars[index] = String.fromCharCode(65 + code)
      carry = 0
    }
  }

  if (carry) chars.unshift('A')
  return chars.join('')
}

export function getNextCsrNumber(lastValue) {
  if (!lastValue) return 'CSR-001'

  const digitMatch = lastValue.match(/(\d+)$/)
  if (digitMatch) {
    const digits = digitMatch[1]
    const prefix = lastValue.slice(0, -digits.length)
    const nextDigits = String(Number.parseInt(digits, 10) + 1).padStart(digits.length, '0')
    return `${prefix}${nextDigits}`
  }

  const letterMatch = lastValue.match(/([A-Za-z]+)$/)
  if (letterMatch) {
    const letters = letterMatch[1]
    const prefix = lastValue.slice(0, -letters.length)
    return `${prefix}${incrementTrailingLetters(letters)}`
  }

  return `${lastValue}-1`
}

export function formatMaterialsRows(rows, outputStyle = 'list') {
  const cleanedRows = (rows || []).filter((row) => row.item || row.quantity || row.unit)
  if (cleanedRows.length === 0) return ''

  const parts = cleanedRows.map((row, index) => {
    const quantityPart = [row.quantity, row.unit].filter(Boolean).join(' ').trim()
    const body = [row.item, quantityPart ? `(${quantityPart})` : ''].filter(Boolean).join(' ').trim()
    if (outputStyle === 'comma') return body
    return `${index + 1}. ${body}`
  })

  return outputStyle === 'comma' ? parts.join(', ') : parts.join('\n')
}

export function parseCsrMaterials(rawValue, csr = {}) {
  const hasAnyReadings = [
    csr.voltage,
    csr.frequency,
    csr.battery,
    csr.temperature,
    csr.pressure,
    csr.hours,
  ].some(Boolean)

  if (!rawValue || typeof rawValue !== 'string' || !rawValue.startsWith(CSR_META_PREFIX)) {
    const trimmed = (rawValue || '').trim()
    return {
      materialsRows: trimmed ? [{ ...DEFAULT_MATERIAL_ROW, item: trimmed }] : [{ ...DEFAULT_MATERIAL_ROW }],
      materialsText: trimmed,
      meta: {
        ...DEFAULT_CSR_META,
        showOperationalReadings: hasAnyReadings,
      },
    }
  }

  try {
    const parsed = JSON.parse(rawValue.slice(CSR_META_PREFIX.length))
    const materialsRows = Array.isArray(parsed.materialsRows) && parsed.materialsRows.length > 0
      ? parsed.materialsRows.map((row) => ({ ...DEFAULT_MATERIAL_ROW, ...row }))
      : [{ ...DEFAULT_MATERIAL_ROW }]
    const meta = { ...DEFAULT_CSR_META, ...(parsed.meta || {}) }
    const materialsText = parsed.materialsText || formatMaterialsRows(materialsRows, meta.materialsOutputStyle)

    return {
      materialsRows,
      materialsText,
      meta,
    }
  } catch {
    const fallback = (rawValue || '').trim()
    return {
      materialsRows: fallback ? [{ ...DEFAULT_MATERIAL_ROW, item: fallback }] : [{ ...DEFAULT_MATERIAL_ROW }],
      materialsText: fallback,
      meta: {
        ...DEFAULT_CSR_META,
        showOperationalReadings: hasAnyReadings,
      },
    }
  }
}

export function serializeCsrMaterials(rows, meta) {
  const normalizedMeta = { ...DEFAULT_CSR_META, ...(meta || {}) }
  const materialsRows = (rows || [])
    .map((row) => ({
      item: row.item || '',
      quantity: row.quantity || '',
      unit: row.unit || '',
    }))
    .filter((row) => row.item || row.quantity || row.unit)

  const materialsText = formatMaterialsRows(materialsRows, normalizedMeta.materialsOutputStyle)

  return CSR_META_PREFIX + JSON.stringify({
    version: 1,
    materialsRows,
    materialsText,
    meta: normalizedMeta,
  })
}

export function buildCsrPreviewData(csr, options = {}) {
  const parsed = options.meta || options.materialsRows
    ? {
        materialsRows:
          Array.isArray(options.materialsRows) && options.materialsRows.length > 0
            ? options.materialsRows.map((row) => ({ ...DEFAULT_MATERIAL_ROW, ...row }))
            : [{ ...DEFAULT_MATERIAL_ROW }],
        materialsText: options.materialsText || '',
        meta: { ...DEFAULT_CSR_META, ...(options.meta || {}) },
      }
    : parseCsrMaterials(csr.materials_used, csr)
  const materialsText =
    options.materialsText ||
    parsed.materialsText ||
    formatMaterialsRows(parsed.materialsRows, parsed.meta.materialsOutputStyle)

  return {
    ...csr,
    materialsRows: parsed.materialsRows,
    materialsText,
    meta: parsed.meta,
    modelLabel: parsed.meta.modelLabel || DEFAULT_CSR_META.modelLabel,
    serialLabel: parsed.meta.serialLabel || DEFAULT_CSR_META.serialLabel,
    showOperationalReadings: parsed.meta.showOperationalReadings !== false,
    showAcknowledgement: parsed.meta.showAcknowledgement !== false,
    recipientTitle: parsed.meta.recipientTitle || DEFAULT_CSR_META.recipientTitle,
    recipientRole: parsed.meta.recipientRole || '',
    technicianName: parsed.meta.technicianName || '',
    showTechnicianSignLine: !!parsed.meta.showTechnicianSignLine,
    technicianRemarks: csr.engineer_remarks || '',
  }
}

export function getCsrBranding(settings = {}) {
  const companyName = settings.company_name || ''
  const companyTagline = settings.company_tagline || ''
  const contactBits = [
    settings.company_address,
    settings.company_city,
    settings.company_phone ? `Tel: ${settings.company_phone}` : '',
    settings.company_email,
  ].filter(Boolean)

  return {
    companyName,
    companyTagline,
    contactLine: contactBits.join('  |  '),
    footerText: settings.footer_text || contactBits.join('  |  ') || '',
  }
}

export function getCsrViewData(csr) {
  return buildCsrPreviewData(csr)
}
