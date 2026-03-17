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
  classic: {
    headerBg: '#CC0000',
    headerFg: '#ffffff',
    accent: '#0056B3',
    border: '#0056B3',
    mutedBg: '#F8FAFC',
    sectionBg: '#ffffff',
    sectionTitleBg: '#F8FAFC',
    sectionTitleFg: '#CC0000',
    pageBg: '#ffffff',
    pageFg: '#111827',
    pagePadding: 22,
    fontSize: 9.5,
    titleSize: 11,
    headerNameSize: 15,
    sectionTitleSize: 8.5,
    valueSize: 9,
    compact: false,
    headerMode: 'standard',
    statusStyle: 'boxes',
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
    previewShell: 'linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 100%)',
  },
  minimal: {
    headerBg: '#111827',
    headerFg: '#ffffff',
    accent: '#374151',
    border: '#111827',
    mutedBg: '#F3F4F6',
    sectionBg: '#ffffff',
    sectionTitleBg: '#F3F4F6',
    sectionTitleFg: '#111827',
    pageBg: '#ffffff',
    pageFg: '#111827',
    pagePadding: 22,
    fontSize: 9.5,
    titleSize: 11,
    headerNameSize: 15,
    sectionTitleSize: 8.5,
    valueSize: 9,
    compact: false,
    headerMode: 'minimal',
    statusStyle: 'boxes',
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
    previewShell: 'linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 100%)',
  },
  modern: {
    headerBg: '#1a2744',
    headerFg: '#ffffff',
    accent: '#e67e22',
    border: '#d0d8ec',
    mutedBg: '#f8faff',
    sectionBg: '#ffffff',
    sectionTitleBg: '#F8FAFC',
    sectionTitleFg: '#1a2744',
    pageBg: '#ffffff',
    pageFg: '#111827',
    pagePadding: 22,
    fontSize: 9.5,
    titleSize: 11,
    headerNameSize: 15,
    sectionTitleSize: 8.5,
    valueSize: 9,
    compact: false,
    headerMode: 'modern',
    statusStyle: 'boxes',
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
    previewShell: 'linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 100%)',
  },
  classicCompact: {
    headerBg: '#B42318',
    headerFg: '#ffffff',
    accent: '#0B4AA8',
    border: '#BFDBFE',
    mutedBg: '#EFF6FF',
    sectionBg: '#ffffff',
    sectionTitleBg: '#EFF6FF',
    sectionTitleFg: '#0B4AA8',
    pageBg: '#ffffff',
    pageFg: '#0F172A',
    pagePadding: 18,
    fontSize: 8.3,
    titleSize: 10,
    headerNameSize: 13.5,
    sectionTitleSize: 7.8,
    valueSize: 8.2,
    compact: true,
    headerMode: 'compactRibbon',
    statusStyle: 'capsule',
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    previewShell: 'linear-gradient(180deg, #F8FAFC 0%, #EDF4FF 100%)',
  },
  editorialCompact: {
    headerBg: '#111827',
    headerFg: '#F8FAFC',
    accent: '#C2410C',
    border: '#334155',
    mutedBg: '#E2E8F0',
    sectionBg: '#ffffff',
    sectionTitleBg: '#111827',
    sectionTitleFg: '#F8FAFC',
    pageBg: '#F8FAFC',
    pageFg: '#0F172A',
    pagePadding: 17,
    fontSize: 8.1,
    titleSize: 10,
    headerNameSize: 13,
    sectionTitleSize: 7.6,
    valueSize: 8,
    compact: true,
    headerMode: 'editorialSplit',
    statusStyle: 'capsule',
    previewSurface: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    previewShell: 'linear-gradient(180deg, #E2E8F0 0%, #CBD5E1 100%)',
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

export function getCsrTemplateVariant(template = '3') {
  if (template === '1') return 'classic'
  if (template === '2') return 'minimal'
  if (template === '4') return 'classicCompact'
  if (template === '5') return 'editorialCompact'
  return 'modern'
}
