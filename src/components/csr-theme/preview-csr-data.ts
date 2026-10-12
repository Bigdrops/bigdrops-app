/**
 * Preview-local mock data for the CSR Form Theme Experiment.
 *
 * Representative values only. Nothing here touches Supabase, generates a
 * production document number, or persists. Option lists mirror the
 * production CSR form's visible choices so the information architecture
 * matches; no business rules are reimplemented.
 */

export interface PreviewMaterialRow {
  item: string
  quantity: string
  unit: string
}

export const PREVIEW_CSR_NUMBER = 'CSR-2026-0481'

export const PREVIEW_CSR: Record<string, string> = {
  client_id: 'client-acme-plant',
  client_name: 'Acme Foods Plant 2',
  csr_number: PREVIEW_CSR_NUMBER,
  date: '2026-10-11',
  po_number: 'PO-88412',
  call_type: 'Breakdown',
  service_basis: 'AMC',
  system_down: 'Yes',
  equipment_type: 'Diesel Generator',
  equipment_location: 'Bay 2',
  make: 'Cummins',
  capacity: '500 kVA',
  model: 'C550D5P',
  serial_no: 'K19-771204',
  engine_no: 'ENG-55210-A',
  problem_reported:
    'Generator failed to start on mains failure. Control panel shows low battery voltage alarm.',
  service_rendered:
    'Replaced both starter batteries, cleaned terminals, ran a 30-minute load test at 80% capacity.',
  defects_found: 'Sulfated starter batteries; corroded earth strap.',
  engineer_remarks: 'Recommend quarterly battery load testing under the AMC schedule.',
  start_date: '2026-10-11',
  start_time: '09:30',
  end_date: '2026-10-11',
  end_time: '13:45',
  status: 'Complete',
  voltage: '415 V',
  frequency: '50 Hz',
  battery: '24 VDC',
  temperature: '85 °C',
  pressure: '4.5 Bar',
  hours: '12,480 Hrs',
  acknowledgement_name: 'John Doe (Plant Manager)',
  customer_feedback: 'Satisfied with response time. Unit running normally.',
}

export const PREVIEW_CSR_META = {
  showOperationalReadings: true,
  modelLabel: 'Model',
  serialLabel: 'Serial No.',
  showAcknowledgement: true,
  recipientTitle: 'Received By / Witness',
  recipientRole: '',
  technicianName: 'Engr. Adaeze Okafor',
  showTechnicianSignLine: true,
}

export const PREVIEW_MATERIALS: PreviewMaterialRow[] = [
  { item: '12V 200AH starter battery', quantity: '2', unit: 'pcs' },
  { item: 'Battery terminal grease', quantity: '1', unit: 'tub' },
  { item: 'Earth strap 50mm²', quantity: '1', unit: 'pc' },
]

export const PREVIEW_CLIENTS = [
  { id: 'client-acme-plant', name: 'Acme Foods Plant 2' },
  { id: 'client-delta-logistics', name: 'Delta Logistics Depot' },
  { id: 'client-harbor-heights', name: 'Harbor Heights Estate' },
]

export const PREVIEW_SIGNATORIES = [
  { id: 'sig-adaeze', name: 'Engr. Adaeze Okafor', role: 'Field Engineer' },
  { id: 'sig-tunde', name: 'Engr. Tunde Bakare', role: 'Senior Technician' },
]

export const CALL_TYPE_OPTIONS = [
  'Breakdown',
  'Preventive Maintenance',
  'Installation',
  'Commissioning',
  'Inspection',
  'Emergency Repair',
  'Other',
]

export const SERVICE_BASIS_OPTIONS = ['Paid Service', 'AMC', 'Warranty']

export const YES_NO_OPTIONS = ['Yes', 'No']

export const STATUS_OPTIONS = [
  'Complete',
  'Incomplete',
  'Pending for spares',
  'Under observation',
  'Working solution provided',
]

export const OPERATIONAL_READING_FIELDS = [
  { label: 'Voltage', field: 'voltage' },
  { label: 'Frequency', field: 'frequency' },
  { label: 'Battery', field: 'battery' },
  { label: 'Temperature', field: 'temperature' },
  { label: 'Pressure', field: 'pressure' },
  { label: 'Running hours', field: 'hours' },
] as const
