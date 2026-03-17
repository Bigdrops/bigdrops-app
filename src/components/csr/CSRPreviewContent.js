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
