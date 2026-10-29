import type {
  CanonicalPreparedCsr,
  CsrClientParty,
  CsrEquipmentInfo,
  CsrLocationInfo,
  CsrMaterialItem,
  CsrNarrativeRecord,
  CsrOperationalReadings,
  CsrServiceProvider,
  CsrServiceWindow,
  CsrSignOffBlock,
} from './csrPreparedContract'
import type { PdfcnValidationResult } from '../types'

const DEFAULT_SERVICE_PROVIDER: CsrServiceProvider = {
  name: 'Sun & Shield Power Solutions',
  subtitle: 'Authorised Cummins Generation Specialist',
  address: '43 Oshola Street, Ifako-Ijaiye, Lagos State',
  contact: 'Tel: +234 806 619 0685 · Sunshieldpowersolutions@gmail.com',
}

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

function safeNullableStr(val: unknown): string | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  return s.length > 0 ? s : null
}

function parseDefectsList(rawDefects: string): string[] {
  if (!rawDefects) return []
  return rawDefects
    .split(/\r?\n|;/)
    .map((s) => s.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((s) => s.length > 0)
}

/**
 * Groups items into 4 vertical reading columns:
 * Col 1: 01, 05, 09, 13, 17
 * Col 2: 02, 06, 10, 14, 18
 * Col 3: 03, 07, 11, 15
 * Col 4: 04, 08, 12, 16
 */
export function groupMaterialsVertically(items: readonly CsrMaterialItem[]): CsrMaterialItem[][] {
  const groups: CsrMaterialItem[][] = [[], [], [], []]
  items.forEach((item, index) => {
    const colIndex = index % 4
    groups[colIndex].push(item)
  })
  return groups
}

/**
 * Pure preparation function for CSR documents.
 * Never mutates source data. Never manufactures operational readings.
 */
export function prepareCsrDocument(
  raw: Record<string, any>,
  options?: Record<string, unknown>,
): CanonicalPreparedCsr {
  const csrNumber = safeStr(raw.csr_number || raw.csrNumber || raw.number)
  const date = safeStr(raw.date || raw.issue_date || raw.issueDate)
  const status = safeStr(raw.status || 'Complete')

  const callType = safeStr(raw.call_type || raw.callType)
  const callTypeDisplay = safeStr(raw.callTypeDisplay || raw.call_type_display || callType || 'Preventive Maint.')
  const serviceBasis = safeStr(raw.service_basis || raw.serviceBasis)
  const systemDownDisplay = safeStr(raw.systemDownDisplay || raw.system_down || 'OPERATIONAL').toUpperCase()

  // Service Provider
  const spOverride = options?.serviceProvider as Partial<CsrServiceProvider> | undefined
  const serviceProvider: CsrServiceProvider = {
    name: safeStr(spOverride?.name || raw.company_name || raw.companyName || DEFAULT_SERVICE_PROVIDER.name),
    subtitle: safeStr(spOverride?.subtitle || DEFAULT_SERVICE_PROVIDER.subtitle),
    address: safeStr(spOverride?.address || DEFAULT_SERVICE_PROVIDER.address),
    contact: safeStr(spOverride?.contact || DEFAULT_SERVICE_PROVIDER.contact),
    logoSvg: spOverride?.logoSvg,
    logoUrl: safeNullableStr(spOverride?.logoUrl || raw.company_logo_url || raw.logoUrl || raw.branding?.logoUrl),
  }

  // Client
  const client: CsrClientParty = {
    name: safeStr(raw.client_name || raw.clientName || raw.client?.name),
    address: safeStr(raw.address || raw.client_address || raw.clientAddress || raw.client?.address),
    accountRef: safeNullableStr(raw.account_ref || raw.accountRef || raw.accountNumber),
    poNumber: safeNullableStr(raw.po_number || raw.poNumber),
  }

  // Site / Equipment Location
  const location: CsrLocationInfo = {
    label: 'Site / Equipment Location',
    site: safeStr(raw.equipment_location || raw.equipmentLocation || raw.location || raw.site),
    subLocation: safeNullableStr(raw.sub_location || raw.subLocation),
  }

  // Equipment
  const equipment: CsrEquipmentInfo = {
    type: safeStr(raw.equipment_type || raw.equipmentType || 'Gas Generator Set'),
    make: safeStr(raw.make || 'Cummins'),
    model: safeStr(raw.model || 'QSV91G'),
    serialNo: safeStr(raw.serial_no || raw.serialNo || raw.serial_number),
    capacity: safeStr(raw.capacity || '1750 kVA / 1400 kWe'),
    engineNo: safeStr(raw.engine_no || raw.engineNo || raw.engine_number),
  }

  // Service Window
  const serviceWindow: CsrServiceWindow = {
    startDate: safeStr(raw.start_date || raw.startDate || date),
    startTime: safeStr(raw.start_time || raw.startTime || '08:00'),
    endDate: safeStr(raw.end_date || raw.endDate || date),
    endTime: safeStr(raw.end_time || raw.endTime || '17:30'),
    operatingHours: safeStr(raw.hours || raw.operatingHours || raw.engine_hours || '-'),
  }

  // Operational Readings - Strict 6 channels, no invented channels
  const readings: CsrOperationalReadings = {
    voltage: {
      label: 'Generator Output Voltage',
      value: safeNullableStr(raw.voltage),
      unit: 'V',
    },
    frequency: {
      label: 'Frequency',
      value: safeNullableStr(raw.frequency),
      unit: 'Hz',
    },
    battery: {
      label: 'Charging Alternator / Battery',
      value: safeNullableStr(raw.battery),
      unit: 'Vdc',
    },
    temperature: {
      label: 'Temperature',
      value: safeNullableStr(raw.temperature),
      unit: '°C',
    },
    pressure: {
      label: 'Pressure',
      value: safeNullableStr(raw.pressure),
      unit: 'bar',
    },
    hours: {
      label: 'Engine Running Hours',
      value: safeNullableStr(raw.hours),
      unit: 'hrs',
    },
  }

  // Narratives
  const rawDefects = safeStr(raw.defects_found || raw.defectsFound)
  const narratives: CsrNarrativeRecord = {
    problemReported: safeStr(raw.problem_reported || raw.problemReported),
    serviceRendered: safeStr(raw.service_rendered || raw.serviceRendered),
    defectsFound: rawDefects || 'None reported',
    defectsList: parseDefectsList(rawDefects),
    engineerRemarks: safeStr(raw.engineer_remarks || raw.engineerRemarks || raw.technicianRemarks),
    customerFeedback: safeStr(raw.customer_feedback || raw.customerFeedback),
  }

  // Materials parsing
  let rawMaterials: any[] = []
  if (Array.isArray(raw.materialsRows) && raw.materialsRows.length > 0) {
    rawMaterials = raw.materialsRows
  } else if (Array.isArray(raw.materials) && raw.materials.length > 0) {
    rawMaterials = raw.materials
  } else if (Array.isArray(options?.materials) && options.materials.length > 0) {
    rawMaterials = options.materials
  }

  const materials: CsrMaterialItem[] = rawMaterials.map((m, idx) => {
    const itemNo = safeStr(m.no || m.itemNo || String(idx + 1).padStart(2, '0'))
    return {
      no: itemNo,
      description: safeStr(m.description || m.item || m.name),
      qty: safeStr(m.quantity || m.qty || '1'),
      unit: safeStr(m.unit || 'pcs'),
      partNo: safeNullableStr(m.partNo || m.part_no || m.partNumber),
    }
  })

  const materialGroups = groupMaterialsVertically(materials)

  // Signatories: exactly two sign-off blocks, built for physical handwriting
  const signatories = {
    serviceEngineer: {
      roleId: '01' as const,
      roleTitle: 'SERVICE ENGINEER SIGN-OFF',
      roleSubtitle: 'Field Verification & Release',
      signatureLabel: 'Engineer Signature',
      printedName: safeNullableStr(raw.technicianName || raw.engineerName || raw.technicianSignatory?.name),
      designation: safeNullableStr(raw.technicianRole || raw.engineerRole || raw.technicianSignatory?.role),
      signingDate: safeNullableStr(raw.technicianSignDate || raw.engineerSignDate || date),
      signatureUrl: safeNullableStr(raw.technicianSignatory?.signatureUrl || raw.technicianSignatureUrl || raw.technician_signature_uri || raw.technicianSignature),
    },
    clientRepresentative: {
      roleId: '02' as const,
      roleTitle: 'CLIENT REPRESENTATIVE SIGN-OFF',
      roleSubtitle: 'Customer Acknowledgement & Acceptance',
      signatureLabel: 'Client Signature',
      printedName: safeNullableStr(raw.acknowledgement_name || raw.clientRepName),
      designation: safeNullableStr(raw.recipientRole || raw.clientRepRole),
      signingDate: safeNullableStr(raw.clientSignDate || date),
      signatureUrl: safeNullableStr(raw.recipient_signature_uri || raw.clientSignatureUrl || raw.clientSignature),
    },
  }

  return {
    csrNumber,
    date,
    status,
    callType,
    callTypeDisplay,
    serviceBasis,
    systemDownDisplay,
    serviceProvider,
    client,
    location,
    equipment,
    serviceWindow,
    readings,
    narratives,
    materials,
    materialGroups,
    signatories,
  }
}

/**
 * Validation function for CanonicalPreparedCsr.
 */
export function validateCsrDocument(doc: CanonicalPreparedCsr): PdfcnValidationResult {
  const errors: string[] = []

  if (!doc.csrNumber || !doc.csrNumber.trim()) {
    errors.push('CSR Number is required')
  }
  if (!doc.date || !doc.date.trim()) {
    errors.push('CSR Date is required')
  }
  if (!doc.client || !doc.client.name || !doc.client.name.trim()) {
    errors.push('Client name is required')
  }
  if (doc.location.label !== 'Site / Equipment Location') {
    errors.push('Location label must strictly be "Site / Equipment Location"')
  }
  if (!doc.signatories || !doc.signatories.serviceEngineer || !doc.signatories.clientRepresentative) {
    errors.push('Both Service Engineer and Client Representative sign-offs are required')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
