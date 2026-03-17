export const CSR_READING_FIELDS = [
  { key: 'voltage', label: 'Voltage (V)' },
  { key: 'frequency', label: 'Frequency (Hz)' },
  { key: 'battery', label: 'Battery (V)' },
  { key: 'temperature', label: 'Temperature (\u00B0C)' },
  { key: 'pressure', label: 'Pressure (bar)' },
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

export const CSR_TEMPLATE_VARIANTS = {
  pulseframe: {
    accent: '#1D4ED8',
  },
  signalbands: {
    accent: '#DC2626',
  },
  zinc: {
    accent: '#18181B',
  },
  crimson: {
    accent: '#B91C1C',
  },
}

export const CSR_TEMPLATE_OPTIONS = [
  {
    key: '1',
    label: 'PulseFrame',
    blurb: 'Premium modern report with summary cards and strong top identity.',
    accent: '#1D4ED8',
  },
  {
    key: '2',
    label: 'SignalBands',
    blurb: 'Banded report with narrative rails and strong section identity.',
    accent: '#DC2626',
  },
  {
    key: '3',
    label: 'Zinc Light',
    blurb: 'Compact technical report with minimal editorial styling.',
    accent: '#18181B',
  },
  {
    key: '4',
    label: 'Crimson System',
    blurb: 'Formal enterprise report with dense structure and strong print discipline.',
    accent: '#B91C1C',
  },
]

export function getCsrTemplateVariant(template = '4') {
  if (template === '1') return 'pulseframe'
  if (template === '2') return 'signalbands'
  if (template === '3') return 'zinc'
  return 'crimson'
}