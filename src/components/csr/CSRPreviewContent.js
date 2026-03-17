export const CSR_READING_FIELDS = [
  { key: 'voltage', label: 'Voltage' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'battery', label: 'Battery' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'pressure', label: 'Pressure' },
  { key: 'hours', label: 'Hours' },
]

export const CSR_STATUS_OPTIONS = [
  'Complete',
  'Incomplete',
  'Pending for spares',
  'Under observation',
  'Working solution provided',
  'Field Entry Pending',
]

export const CSR_STATUS_OPTIONS_PDF = CSR_STATUS_OPTIONS.filter(
  (status) => status !== 'Field Entry Pending'
)

export const CSR_TEMPLATE_OPTIONS = [
  {
    key: '1',
    label: 'PulseFrame',
    blurb: 'Premium modern report with summary cards and strong top identity.',
    family: 'pulseframe',
  },
  {
    key: '2',
    label: 'SignalBands',
    blurb: 'Banded report with narrative rails and strong section identity.',
    family: 'signalbands',
  },
  {
    key: '3',
    label: 'Zinc Light',
    blurb: 'Compact technical report with minimal editorial styling.',
    family: 'zinc',
  },
  {
    key: '4',
    label: 'Crimson System',
    blurb: 'Formal enterprise report with dense structure and strong print discipline.',
    family: 'crimson',
  },
]

export function getCsrTemplateVariant(template = '4') {
  if (template === '1') return 'pulseframe'
  if (template === '2') return 'signalbands'
  if (template === '3') return 'zinc'
  return 'crimson'
}