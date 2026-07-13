export const CSR_READING_FIELDS = [
  { key: 'voltage', label: 'Voltage (V)' },
  { key: 'frequency', label: 'Frequency (Hz)' },
  { key: 'battery', label: 'Charging Alternator Condition' },
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
  industry: {
    headerBg: '#1f3a68',
    headerFg: '#ffffff',
    accent: '#7D8A88',
    border: '#c5cfd9',
    mutedBg: '#F7F9F8',
    sectionBg: '#ffffff',
    sectionTitleBg: '#ffffff',
    sectionTitleFg: '#1f3a68',
    pageBg: '#ffffff',
    pageFg: '#1f3a68',
    pagePadding: 12,
    fontSize: 7.8,
    titleSize: 9.5,
    headerNameSize: 14,
    sectionTitleSize: 7.5,
    valueSize: 8.2,
    compact: true,
    headerMode: 'industry',
    statusStyle: 'pills',
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #F7F9F8 100%)',
    previewShell: 'linear-gradient(180deg, #F7F9F8 0%, #EDF2F7 100%)',
  },
  minimal: {
    headerBg: '#111827',
    headerFg: '#ffffff',
    accent: '#111827',
    border: '#111827',
    mutedBg: '#f3f4f6',
    sectionBg: '#ffffff',
    sectionTitleBg: '#111827',
    sectionTitleFg: '#ffffff',
    pageBg: '#ffffff',
    pageFg: '#111827',
    pagePadding: 12,
    fontSize: 7.8,
    titleSize: 9,
    headerNameSize: 14,
    sectionTitleSize: 6.8,
    valueSize: 7.4,
    compact: true,
    headerMode: 'minimal',
    statusStyle: 'checks',
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
    previewShell: 'linear-gradient(180deg, #F3F4F6 0%, #E5E7EB 100%)',
  },
}

export const CSR_TEMPLATE_OPTIONS = [
  {
    key: '3',
    label: 'Zinc Light',
    blurb: 'Compact technical report with minimal editorial styling.',
    accent: '#18181B',
  },
  {
    key: '6',
    label: 'Minimal',
    blurb: 'Monochrome industrial report with dense table-driven layout and strong borders.',
    accent: '#111827',
  },
  {
    key: '8',
    label: 'Industry',
    blurb: 'Slate-inspired industrial report with distinct layout and customization support.',
    accent: '#7D8A88',
  },
]

export function getCsrTemplateVariant(template = '3') {
  if (template === '3') return 'zinc'
  if (template === '6') return 'minimal'
  if (template === '8') return 'industry'
  return 'zinc'
}