import type { BaseDocument } from '../types/documentView'

export interface CsrMetric {
  label: string
  value: string
  tone?: 'default' | 'amber' | 'green' | 'blue' | 'purple' | 'red'
  hint?: string
}

export interface CsrMaterialItem {
  name: string
  quantity: string
}

export const csrDocument: BaseDocument = {
  id: 'phase-1-csr',
  number: 'SASCSR-9014',
  title: 'Service Record',
  status: 'in-progress',
}

export const csrSubtitle = 'Generator Routine Maintenance & Fault Check'

export const csrThreadTag = 'Tech: Adetola O. · Priority: High'

export const csrMetrics: CsrMetric[] = [
  { label: 'Service Date', value: '18 May 2025', tone: 'blue' },
  { label: 'Location', value: 'Plot 4, Lekki Ph 1' },
  { label: 'Priority', value: 'High Severity', tone: 'red' },
]

export const csrPreviewData = {
  serviceCompany: 'Sun & Shield Power Solutions',
  companyContact: 'support@sunshieldpower.com · +234 802 000 1234',
  clientName: 'Pinnacle Towers Ltd',
  clientContact: 'Engr. Emmanuel · +234 811 000 9876',
  documentNumber: 'SASCSR-9014',
  dateTime: '18 May 2025 · 09:30 WAT',
  assetInfo: '40KVA FG Wilson Genset (S/N: FG-40-2025)',
  problemDescription:
    'Client reported sudden shutdown during operation, followed by an inability to crank. Suspected battery or ATS failure, accompanied by strange humming noise from the control module before shutdown.',
  workPerformed:
    '1. Conducted deep diagnostic on deep sea controller module.\n2. Disconnected and load-tested primary batteries (found voltages severely depleted - 9.4V).\n3. Cleaned battery terminals and replaced faulty alternator belt.\n4. Reset controller and successfully ran no-load test for 20 minutes.',
  materialsUsed: [
    { name: 'Alternator Belt (B-Type)', quantity: '1 pc' },
    { name: 'Terminal Protectors', quantity: '2 pcs' },
  ] as CsrMaterialItem[],
  observations:
    'The battery charging alternator is failing to adequately maintain charge during extended runtimes. Furthermore, dusty conditions in the generator house are accelerating belt wear.',
  recommendations:
    'Strongly recommend replacing the battery charging alternator within the next 14 days to prevent complete battery drain. Suggest installing industrial ventilation in the generator room to reduce ambient dust.',
  technicianNotes: 'Site access was delayed by 45 minutes due to estate security checks. Job completed under 2 hours once access was granted.',
}
