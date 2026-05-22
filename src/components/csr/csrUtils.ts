import { getCsrPdfDocument } from './preview-templates'

export { getCsrPdfDocument }

export const CSR_META_PREFIX = '__CSR_META_V1__'

export interface MaterialRow {
  item: string
  quantity: string
  unit: string
}

export const DEFAULT_MATERIAL_ROW: MaterialRow = {
  item: '',
  quantity: '',
  unit: '',
}

export interface CsrMeta {
  showOperationalReadings: boolean
  modelLabel: string
  serialLabel: string
  showAcknowledgement: boolean
  recipientTitle: string
  recipientRole: string
  technicianName: string
  showTechnicianSignLine: boolean
  materialsOutputStyle: 'list' | 'comma'
}

export const DEFAULT_CSR_META: CsrMeta = {
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

export interface CsrSignatory {
  id: string | number | null
  name: string
  role: string
  signatureUrl: string
}

function normalizeSignatory(input: any): CsrSignatory | null {
  if (!input) return null
  return {
    id: input.id || null,
    name: input.name || '',
    role: input.role || '',
    signatureUrl: input.signature_url || input.signatureUrl || '',
  }
}

export interface CsrObject {
  csr_number: string
  date: string
  client_id: any
  client_name: string
  call_type: string
  system_down: string
  address: string
  problem_reported: string
  equipment_type: string
  equipment_location: string
  make: string
  model: string
  serial_no: string
  capacity: string
  voltage: string
  frequency: string
  battery: string
  temperature: string
  pressure: string
  hours: string
  materials_used: string
  service_rendered: string
  defects_found: string
  engineer_remarks: string
  status: string
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  customer_feedback: string
  acknowledgement_name: string
  technician_signatory_id: any
  linked_invoice_id: any
  show_po: boolean
  po_number: string
  [key: string]: any
}

export function createDefaultCsr(isField = false): CsrObject {
  const today = new Date().toISOString().split('T')[0]
  return {
    csr_number: '',
    date: today,
    client_id: '',
    client_name: '',
    call_type: '',
    system_down: '',
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
    defects_found: '',
    engineer_remarks: '',
    status: isField ? 'Field Entry Pending' : 'Complete',
    start_date: today,
    start_time: '',
    end_date: today,
    end_time: '',
    customer_feedback: '',
    acknowledgement_name: '',
    technician_signatory_id: null,
    linked_invoice_id: '',
    show_po: false,
    po_number: '',
  }
}

function normalizeLetters(value: string): string {
  return value.toUpperCase()
}

export function incrementTrailingLetters(value: string): string {
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

export function getNextCsrNumber(lastValue: string | null | undefined): string {
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

export function formatMaterialsRows(rows: MaterialRow[], outputStyle: 'list' | 'comma' = 'list'): string {
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

export interface ParsedCsrMaterials {
  materialsRows: MaterialRow[]
  materialsText: string
  meta: CsrMeta
}

export function parseCsrMaterials(rawValue: string | null | undefined, csr: Partial<CsrObject> = {}): ParsedCsrMaterials {
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
      ? parsed.materialsRows.map((row: any) => ({ ...DEFAULT_MATERIAL_ROW, ...row }))
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

export function serializeCsrMaterials(rows: MaterialRow[], meta: Partial<CsrMeta>): string {
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

export interface CsrPreviewOptions {
  meta?: Partial<CsrMeta>
  materialsRows?: MaterialRow[]
  materialsText?: string
  signatories?: any[]
  technicianSignatory?: any
  client?: { address?: string | null; city?: string | null; state?: string | null }
}

export function buildCsrPreviewData(csr: CsrObject, options: CsrPreviewOptions = {}): any {
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
  const signatories = Array.isArray(options.signatories) ? options.signatories : []
  const resolvedTechnicianSignatory =
    normalizeSignatory(options.technicianSignatory) ||
    normalizeSignatory(
      signatories.find((entry) => String(entry.id) === String(csr.technician_signatory_id || '')),
    )
  const resolvedTechnicianName =
    resolvedTechnicianSignatory?.name ||
    parsed.meta.technicianName ||
    ''
  const populatedMaterialsRows = parsed.materialsRows.filter((row) => row.item || row.quantity || row.unit)
  const totalNarrativeLength = [
    csr.problem_reported,
    csr.service_rendered,
    csr.defects_found,
    csr.engineer_remarks,
    csr.customer_feedback,
    materialsText,
    csr.address,
  ]
    .map((value) => String(value || '').trim().length)
    .reduce((sum, value) => sum + value, 0)
  const layoutDensity =
    totalNarrativeLength > 900 || populatedMaterialsRows.length > 4
      ? 'tight'
      : totalNarrativeLength > 520 || populatedMaterialsRows.length > 2
      ? 'compact'
      : 'comfortable'

  const fullAddress = [
    options.client?.address,
    options.client?.city,
    options.client?.state,
  ]
    .filter((part) => part && part.trim() !== '')
    .join(', ')

  return {
    ...csr,
    address: fullAddress || csr.address || '',
    materialsRows: parsed.materialsRows,
    materialsText,
    meta: parsed.meta,
    modelLabel: parsed.meta.modelLabel || DEFAULT_CSR_META.modelLabel,
    serialLabel: parsed.meta.serialLabel || DEFAULT_CSR_META.serialLabel,
    showOperationalReadings: parsed.meta.showOperationalReadings !== false,
    showAcknowledgement: parsed.meta.showAcknowledgement !== false,
    recipientTitle: parsed.meta.recipientTitle || DEFAULT_CSR_META.recipientTitle,
    recipientRole: parsed.meta.recipientRole || '',
    technicianName: resolvedTechnicianName,
    technicianSignatory: resolvedTechnicianSignatory,
    showTechnicianSignLine: !!parsed.meta.showTechnicianSignLine,
    technicianRemarks: csr.engineer_remarks || '',
    layoutDensity,
  }
}

export interface CsrBranding {
  companyName: string
  companyTagline: string
  contactLine: string
  footerText: string
  logoUrl: string
}

export function getCsrBranding(settings: any = {}): CsrBranding {
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
    logoUrl: settings.company_logo_url || '',
  }
}

export function getCsrViewData(csr: CsrObject, options: CsrPreviewOptions = {}): any {
  return buildCsrPreviewData(csr, options)
}
