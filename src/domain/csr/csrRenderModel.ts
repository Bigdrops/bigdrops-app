import type { CsrObject, MaterialRow } from '@/components/csr/csrUtils'

export type CallTypeDisplay = string

export type SystemDownDisplay = string

export type LayoutDensity = 'comfortable' | 'compact' | 'tight'

export interface TechnicianSignatory {
  name: string
  role: string
  signatureUrl: string
}

export interface CsrRenderModel {
  // Identity
  csr_number: string
  date: string
  status: string

  // Client
  client_name: string
  address: string
  po_number: string
  show_po: boolean

  // Call info (newly surfaced — was missing from all output)
  call_type: string
  callTypeDisplay: CallTypeDisplay
  system_down: string
  systemDownDisplay: SystemDownDisplay

  // Equipment
  equipment_type: string
  equipment_location: string
  make: string
  model: string
  modelLabel: string
  serial_no: string
  serialLabel: string
  capacity: string
  engine_no: string
  engineNo: string

  // Narrative
  problem_reported: string
  service_rendered: string
  defects_found: string
  defectsFound: string
  engineer_remarks: string
  technicianRemarks: string
  customer_feedback: string

  // Operational readings (keys match CSR_READING_FIELDS for dynamic access)
  voltage: string
  frequency: string
  battery: string
  temperature: string
  pressure: string
  hours: string

  // Service window
  start_date: string
  start_time: string
  end_date: string
  end_time: string

  // Acknowledgement
  acknowledgement_name: string
  recipientTitle: string
  recipientRole: string
  showAcknowledgement: boolean

  // Technician
  technicianName: string
  technicianRole: string
  technicianSignatureUrl: string
  showTechnicianSignLine: boolean
  technicianSignatory: TechnicianSignatory | null

  // Materials (parsed from materials_used)
  materialsRows: MaterialRow[]
  materialsText: string
  materialsOutputStyle: 'list' | 'comma'
  meta: Record<string, unknown>

  // Display controls
  showOperationalReadings: boolean
  layoutDensity: LayoutDensity

  [key: string]: unknown
}

function normalizeSignatory(input: unknown): TechnicianSignatory | null {
  if (!input || typeof input !== 'object') return null
  const s = input as Record<string, unknown>
  return {
    name: String(s.name ?? s.Name ?? ''),
    role: String(s.role ?? s.Role ?? ''),
    signatureUrl: String(s.signatureUrl ?? s.signature_url ?? s.SignatureUrl ?? ''),
  }
}

function safeString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function resolveCallTypeDisplay(raw: string): CallTypeDisplay {
  if (!raw) return ''
  const upper = raw.toUpperCase()
  if (upper === 'BREAKDOWN' || upper === 'BD') return 'BREAKDOWN'
  if (upper === 'MAINTENANCE' || upper === 'MNT') return 'MAINTENANCE'
  if (upper === 'INSTALLATION' || upper === 'INST') return 'INSTALLATION'
  if (upper === 'OTHER') return 'OTHER'
  return raw
}

function resolveSystemDownDisplay(raw: string): SystemDownDisplay {
  if (!raw) return ''
  const normalized = raw.toLowerCase().trim()
  if (normalized === 'true' || normalized === 'yes' || normalized === '1' || normalized === 'down') return 'DOWN'
  if (normalized === 'false' || normalized === 'no' || normalized === '0' || normalized === 'operational') return 'OPERATIONAL'
  return raw
}

function computeLayoutDensity(csr: CsrObject): LayoutDensity {
  const narrativeTotal = [
    csr.problem_reported,
    csr.service_rendered,
    csr.defects_found,
    csr.engineer_remarks,
    csr.customer_feedback,
    csr.materials_used,
    csr.address,
  ]
    .map((v) => safeString(v).length)
    .reduce((sum, len) => sum + len, 0)

  const materialCount = (Array.isArray(csr.materialsRows) ? csr.materialsRows : []).length

  if (narrativeTotal > 900 || materialCount > 4) return 'tight'
  if (narrativeTotal > 520 || materialCount > 2) return 'compact'
  return 'comfortable'
}

export function buildCsrRenderModel(csr: CsrObject): CsrRenderModel {
  const address = safeString(csr.address)
  const rawCallType = safeString(csr.call_type)
  const rawSystemDown = safeString(csr.system_down)
  const rawBattery = safeString(csr.battery)
  const rawEngineNo = safeString(csr.engine_no)
  const rawDefects = safeString(csr.defects_found)
  const rawRemarks = safeString(csr.engineer_remarks)

  return {
    // Identity
    csr_number: safeString(csr.csr_number),
    date: safeString(csr.date),
    status: safeString(csr.status) || 'Complete',

    // Client
    client_name: safeString(csr.client_name),
    address,
    po_number: safeString(csr.po_number),
    show_po: Boolean(csr.show_po),

    // Call info — newly surfaced
    call_type: rawCallType,
    callTypeDisplay: resolveCallTypeDisplay(rawCallType),
    system_down: rawSystemDown,
    systemDownDisplay: resolveSystemDownDisplay(rawSystemDown),

    // Equipment
    equipment_type: safeString(csr.equipment_type),
    equipment_location: safeString(csr.equipment_location),
    make: safeString(csr.make),
    model: safeString(csr.model),
    modelLabel: 'Model',
    serial_no: safeString(csr.serial_no),
    serialLabel: 'Serial No.',
    capacity: safeString(csr.capacity),
    engine_no: rawEngineNo,
    engineNo: rawEngineNo,

    // Narrative
    problem_reported: safeString(csr.problem_reported),
    service_rendered: safeString(csr.service_rendered),
    defects_found: rawDefects,
    defectsFound: rawDefects || 'None reported',
    engineer_remarks: rawRemarks,
    technicianRemarks: rawRemarks,
    customer_feedback: safeString(csr.customer_feedback),

    // Operational readings
    voltage: safeString(csr.voltage),
    frequency: safeString(csr.frequency),
    battery: rawBattery,
    temperature: safeString(csr.temperature),
    pressure: safeString(csr.pressure),
    hours: safeString(csr.hours),

    // Service window
    start_date: safeString(csr.start_date),
    start_time: safeString(csr.start_time),
    end_date: safeString(csr.end_date),
    end_time: safeString(csr.end_time),

    // Acknowledgement
    acknowledgement_name: safeString(csr.acknowledgement_name),
    recipientTitle: 'Received By / Witness',
    recipientRole: safeString(csr.recipientRole ?? ''),
    showAcknowledgement: true,

    // Technician
    technicianName: safeString(csr.technicianName || normalizeSignatory(csr.technician_signatory_id)?.name || ''),
    technicianRole: normalizeSignatory(csr.technicianSignatory)?.role ?? '',
    technicianSignatureUrl: normalizeSignatory(csr.technicianSignatory)?.signatureUrl ?? '',
    showTechnicianSignLine: false,
    technicianSignatory: normalizeSignatory(csr.technicianSignatory),

    // Materials
    materialsRows: Array.isArray(csr.materialsRows) ? csr.materialsRows : [],
    materialsText: safeString(csr.materialsText || csr.materials_used),
    materialsOutputStyle: 'list',
    meta: {},

    // Display controls
    showOperationalReadings: true,
    layoutDensity: computeLayoutDensity(csr),
  }
}
