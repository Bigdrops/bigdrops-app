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
    headerBg: '#0F172A',
    headerFg: '#ffffff',
    accent: '#1D4ED8',
    border: '#DBEAFE',
    mutedBg: '#EFF6FF',
    sectionBg: '#ffffff',
    sectionTitleBg: '#1D4ED8',
    sectionTitleFg: '#ffffff',
    pageBg: '#ffffff',
    pageFg: '#14213D',
    pagePadding: 18,
    fontSize: 8.8,
    titleSize: 10.5,
    headerNameSize: 16,
    sectionTitleSize: 8,
    valueSize: 8.8,
    compact: true,
    headerMode: 'pulseframe',
    statusStyle: 'dots',
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
    previewShell: 'linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 100%)',
  },
  signalbands: {
    headerBg: '#7F1D1D',
    headerFg: '#ffffff',
    accent: '#DC2626',
    border: '#E7D7C8',
    mutedBg: '#FFF7ED',
    sectionBg: '#FFFDFA',
    sectionTitleBg: '#7F1D1D',
    sectionTitleFg: '#ffffff',
    pageBg: '#FFFDFA',
    pageFg: '#231F20',
    pagePadding: 16,
    fontSize: 8.6,
    titleSize: 10,
    headerNameSize: 16,
    sectionTitleSize: 7.8,
    valueSize: 8.6,
    compact: true,
    headerMode: 'signalbands',
    statusStyle: 'checks',
    previewSurface: 'linear-gradient(180deg, #fffdfa 0%, #fff7ed 100%)',
    previewShell: 'linear-gradient(180deg, #FFF7ED 0%, #FDEDDC 100%)',
  },
  zinc: {
    headerBg: '#18181B',
    headerFg: '#ffffff',
    accent: '#18181B',
    border: '#E4E4E7',
    mutedBg: '#F4F4F5',
    sectionBg: '#ffffff',
    sectionTitleBg: '#F4F4F5',
    sectionTitleFg: '#09090B',
    pageBg: '#ffffff',
    pageFg: '#09090B',
    pagePadding: 18,
    fontSize: 8.4,
    titleSize: 10,
    headerNameSize: 14,
    sectionTitleSize: 7.5,
    valueSize: 8.4,
    compact: true,
    headerMode: 'zinc',
    statusStyle: 'journey',
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
    previewShell: 'linear-gradient(180deg, #FAFAFA 0%, #F4F4F5 100%)',
  },
  crimson: {
    headerBg: '#0F172A',
    headerFg: '#ffffff',
    accent: '#B91C1C',
    border: '#E2E8F0',
    mutedBg: '#F8FAFC',
    sectionBg: '#ffffff',
    sectionTitleBg: '#0F172A',
    sectionTitleFg: '#ffffff',
    pageBg: '#ffffff',
    pageFg: '#0F172A',
    pagePadding: 14,
    fontSize: 8.2,
    titleSize: 9.8,
    headerNameSize: 14,
    sectionTitleSize: 7.2,
    valueSize: 8.4,
    compact: true,
    headerMode: 'crimson',
    statusStyle: 'pills',
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    previewShell: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F7 100%)',
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