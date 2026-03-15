import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { getCsrViewData } from '../components/csr/csrUtils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const STATUS_OPTIONS = ['Complete', 'Incomplete', 'Pending for spares', 'Under observation', 'Working solution provided', 'Field Entry Pending']
const STATUS_OPTIONS_PDF = ['Complete', 'Incomplete', 'Pending for spares', 'Under observation', 'Working solution provided']
const TEMPLATE_CHOICES = [['1', 'Classic'], ['2', 'Minimal'], ['3', 'Modern']]

const getBranding = (settings = {}) => {
  const companyName = settings.company_name || ''
  const companyTagline = settings.company_tagline || ''
  const contactBits = [
    settings.company_address,
    settings.company_city,
    settings.company_phone ? `Tel: ${settings.company_phone}` : '',
    settings.company_email,
  ].filter(Boolean)

  return {
    companyName,
    companyTagline,
    contactLine: contactBits.join('  |  '),
    footerText: settings.footer_text || contactBits.join('  |  ') || '',
  }
}

const TEMPLATE_VARIANTS = {
  classic: {
    headerBg: '#CC0000',
    headerFg: '#ffffff',
    accent: '#0056B3',
    border: '#0056B3',
    mutedBg: '#F8FAFC',
  },
  minimal: {
    headerBg: '#111827',
    headerFg: '#ffffff',
    accent: '#374151',
    border: '#111827',
    mutedBg: '#F3F4F6',
  },
  modern: {
    headerBg: '#1a2744',
    headerFg: '#ffffff',
    accent: '#e67e22',
    border: '#d0d8ec',
    mutedBg: '#f8faff',
  },
}

function createPdfStyles(variant) {
  const palette = TEMPLATE_VARIANTS[variant]
  return StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 9.5, padding: 22, backgroundColor: 'white', color: '#111827' },
    header: { backgroundColor: palette.headerBg, color: palette.headerFg, padding: '10 12', marginBottom: 10 },
    headerName: { fontSize: 15, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    headerTagline: { fontSize: 8, marginTop: 2 },
    headerContact: { fontSize: 7.5, marginTop: 2 },
    reportTitle: { textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 10, textTransform: 'uppercase', color: palette.headerBg },
    section: { borderWidth: 1, borderColor: palette.border, marginBottom: 8 },
    sectionTitle: { backgroundColor: palette.mutedBg, color: palette.headerBg, fontFamily: 'Helvetica-Bold', fontSize: 8.5, padding: '4 6', textTransform: 'uppercase' },
    sectionBody: { padding: '6 8' },
    row: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    field: { flex: 1 },
    label: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: palette.accent, marginBottom: 2, textTransform: 'uppercase' },
    value: { fontSize: 9 },
    blockValue: { fontSize: 9, lineHeight: 1.4, minHeight: 14 },
    readingsRow: { flexDirection: 'row' },
    readingsHeader: { flex: 1, padding: '4 3', fontSize: 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', borderWidth: 1, borderColor: palette.border, backgroundColor: palette.mutedBg },
    readingsCell: { flex: 1, padding: '4 3', fontSize: 8.5, textAlign: 'center', borderWidth: 1, borderColor: palette.border, borderTopWidth: 0 },
    statusWrap: { marginTop: 4 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    statusBox: { width: 10, height: 10, borderWidth: 1, borderColor: '#111827', marginRight: 4, alignItems: 'center', justifyContent: 'center' },
    statusBoxActive: { width: 10, height: 10, borderWidth: 1, borderColor: '#111827', marginRight: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.headerBg },
    statusMark: { color: '#ffffff', fontSize: 6 },
    ackGrid: { flexDirection: 'row', gap: 10 },
    ackCell: { flex: 1 },
    line: { borderTopWidth: 1, borderTopColor: '#9CA3AF', marginTop: 16, paddingTop: 3, minHeight: 18 },
    footer: { marginTop: 6, textAlign: 'center', fontSize: 7.5, color: '#6B7280' },
  })
}

function PdfSection({ styles, title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function PdfField({ styles, label, value, block }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={block ? styles.blockValue : styles.value}>{value || ' '}</Text>
    </View>
  )
}

function TemplateBase({ csr, branding, variant }) {
  const styles = createPdfStyles(variant)
  const d = getCsrViewData(csr)

  const readings = [
    ['Voltage (V)', d.voltage],
    ['Frequency (Hz)', d.frequency],
    ['Battery (V)', d.battery],
    ['Temperature (°C)', d.temperature],
    ['Pressure (bar)', d.pressure],
    ['Hours', d.hours],
  ]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {(branding.companyName || branding.companyTagline || branding.contactLine) ? (
          <View style={styles.header}>
            {branding.companyName ? <Text style={styles.headerName}>{branding.companyName}</Text> : null}
            {branding.companyTagline ? <Text style={styles.headerTagline}>{branding.companyTagline}</Text> : null}
            {branding.contactLine ? <Text style={styles.headerContact}>{branding.contactLine}</Text> : null}
          </View>
        ) : null}

        <Text style={styles.reportTitle}>Customer Service Report</Text>

        <PdfSection styles={styles} title="Customer Details">
          <View style={styles.row}>
            <PdfField styles={styles} label="CSR No." value={d.csr_number} />
            <PdfField styles={styles} label="Date" value={d.date} />
            <PdfField styles={styles} label="Customer" value={d.client_name} />
          </View>
          {d.show_po && d.po_number ? (
            <View style={styles.row}>
              <PdfField styles={styles} label="PO No." value={d.po_number} />
            </View>
          ) : null}
          <View style={styles.row}>
            <PdfField styles={styles} label="Address" value={d.address} block />
          </View>
        </PdfSection>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <PdfSection styles={styles} title="Nature of Problem">
              <PdfField styles={styles} label="Problem Reported" value={d.problem_reported} block />
            </PdfSection>
          </View>
          <View style={{ flex: 1 }}>
            <PdfSection styles={styles} title="Equipment Details">
              <View style={styles.row}>
                <PdfField styles={styles} label="Equipment Type" value={d.equipment_type} />
                <PdfField styles={styles} label="Location" value={d.equipment_location} />
              </View>
              <View style={styles.row}>
                <PdfField styles={styles} label="Make" value={d.make} />
                <PdfField styles={styles} label={d.modelLabel} value={d.model} />
              </View>
              <View style={styles.row}>
                <PdfField styles={styles} label={d.serialLabel} value={d.serial_no} />
                <PdfField styles={styles} label="Capacity" value={d.capacity} />
              </View>
            </PdfSection>
          </View>
        </View>

        {d.showOperationalReadings ? (
          <PdfSection styles={styles} title="Operational Readings">
            <View style={styles.readingsRow}>
              {readings.map(([label]) => (
                <Text key={label} style={styles.readingsHeader}>{label}</Text>
              ))}
            </View>
            <View style={styles.readingsRow}>
              {readings.map(([label, value]) => (
                <Text key={label} style={styles.readingsCell}>{value || ' '}</Text>
              ))}
            </View>
          </PdfSection>
        ) : null}

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <PdfSection styles={styles} title="Materials Used">
              <PdfField styles={styles} label="Materials" value={d.materialsText} block />
            </PdfSection>
          </View>
          <View style={{ flex: 1.5 }}>
            <PdfSection styles={styles} title="Service Execution">
              <PdfField styles={styles} label="Service Rendered" value={d.service_rendered} block />
              <View style={styles.row}>
                <PdfField styles={styles} label="Start of Service" value={[d.start_date, d.start_time].filter(Boolean).join(' ')} />
                <PdfField styles={styles} label="End of Service" value={[d.end_date, d.end_time].filter(Boolean).join(' ')} />
              </View>
              <View style={styles.row}>
                <PdfField styles={styles} label="Technician Name" value={d.technicianName} />
              </View>
              <PdfField styles={styles} label="Technician Remarks" value={d.technicianRemarks} block />
              <View style={styles.statusWrap}>
                <Text style={styles.label}>Status After Service</Text>
                {STATUS_OPTIONS_PDF.map((option) => (
                  <View key={option} style={styles.statusRow}>
                    <View style={d.status === option ? styles.statusBoxActive : styles.statusBox}>
                      {d.status === option ? <Text style={styles.statusMark}>✓</Text> : null}
                    </View>
                    <Text style={styles.value}>{option}</Text>
                  </View>
                ))}
              </View>
            </PdfSection>
          </View>
        </View>

        <PdfSection styles={styles} title="Customer Feedback">
          <PdfField styles={styles} label="Feedback" value={d.customer_feedback} block />
        </PdfSection>

        {d.showAcknowledgement ? (
          <PdfSection styles={styles} title="Acknowledgement">
            <View style={styles.ackGrid}>
              <View style={styles.ackCell}>
                <Text style={styles.label}>{d.recipientTitle}</Text>
                <Text style={styles.value}>{d.acknowledgement_name || ' '}</Text>
                <View style={styles.line}>
                  <Text style={{ fontSize: 7, color: '#6B7280' }}>{d.recipientRole || 'Name / Role'}</Text>
                </View>
              </View>
              {d.showTechnicianSignLine ? (
                <View style={styles.ackCell}>
                  <Text style={styles.label}>Technician Sign</Text>
                  <View style={styles.line}>
                    <Text style={{ fontSize: 7, color: '#6B7280' }}>Optional sign</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </PdfSection>
        ) : null}

        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}

export function Template1({ csr, branding = {} }) {
  return <TemplateBase csr={csr} branding={branding} variant="classic" />
}

function Template2({ csr, branding = {} }) {
  return <TemplateBase csr={csr} branding={branding} variant="minimal" />
}

export function Template3({ csr, branding = {} }) {
  return <TemplateBase csr={csr} branding={branding} variant="modern" />
}

function SectionCard({ title, children, className = '' }) {
  return (
    <Card className={`rounded-3xl border-zinc-200 shadow-sm ${className}`.trim()}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-zinc-950">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function InfoField({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-900">{value || '-'}</div>
    </div>
  )
}

export default function ViewCSR() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [csr, setCsr] = useState(null)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState('3')

  useEffect(() => {
    supabase.from('csrs').select('*').eq('id', id).single().then(({ data }) => {
      setCsr(data)
      setLoading(false)
    })
    supabase.from('settings').select('*').eq('id', 1).single().then(({ data }) => {
      if (data) setSettings(data)
    })
  }, [id])

  if (loading) return <Layout title="CSR"><p style={{ padding: 30 }}>Loading...</p></Layout>
  if (!csr) return <Layout title="CSR"><p style={{ padding: 30 }}>CSR not found.</p></Layout>

  const d = getCsrViewData(csr)
  const branding = getBranding(settings)
  const hasCompanyIdentity = Boolean(branding.companyName || branding.companyTagline || branding.contactLine)
  const readings = [
    ['Voltage (V)', d.voltage],
    ['Frequency (Hz)', d.frequency],
    ['Battery (V)', d.battery],
    ['Temperature (°C)', d.temperature],
    ['Pressure (bar)', d.pressure],
    ['Hours', d.hours],
  ]

  const statusBadgeClass = {
    Complete: 'bg-emerald-100 text-emerald-700',
    Incomplete: 'bg-red-100 text-red-700',
    'Pending for spares': 'bg-amber-100 text-amber-700',
    'Under observation': 'bg-sky-100 text-sky-700',
    'Working solution provided': 'bg-violet-100 text-violet-700',
    'Field Entry Pending': 'bg-zinc-200 text-zinc-700',
  }[d.status] || 'bg-zinc-100 text-zinc-700'

  const getPDFDoc = () => {
    if (template === '1') return <Template1 csr={d} branding={branding} />
    if (template === '2') return <Template2 csr={d} branding={branding} />
    return <Template3 csr={d} branding={branding} />
  }

  const handleDownload = async () => {
    const blob = await pdf(getPDFDoc()).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = d.csr_number + '.pdf'
    a.click()
  }

  return (
    <Layout title={d.csr_number}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/csr')}>
            Back
          </Button>
          <Badge className={statusBadgeClass}>{d.status}</Badge>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Template</span>
            {TEMPLATE_CHOICES.map(([key, label]) => (
              <Button
                key={key}
                type="button"
                variant={template === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTemplate(key)}
              >
                {label}
              </Button>
            ))}
            <Button type="button" variant="outline" onClick={handleDownload}>
              Download PDF
            </Button>
            <Button type="button" onClick={() => navigate('/csr/edit/' + id)}>
              Edit CSR
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[32px] border-zinc-200 shadow-sm">
          <CardContent className="space-y-8 p-6 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              {hasCompanyIdentity ? (
                <div className="space-y-1">
                  {branding.companyName ? <div className="text-2xl font-bold tracking-tight text-red-700">{branding.companyName}</div> : null}
                  {branding.companyTagline ? <div className="text-sm text-zinc-600">{branding.companyTagline}</div> : null}
                  {branding.contactLine ? <div className="text-sm text-zinc-500">{branding.contactLine}</div> : null}
                </div>
              ) : (
                <div />
              )}

              <div className="space-y-1 text-left md:text-right">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">Customer Service Report</div>
                <div className="text-xl font-semibold text-zinc-950">{d.csr_number}</div>
                <div className="text-sm text-zinc-500">Date: {d.date || '-'}</div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
              <SectionCard title="Customer Details">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoField label="CSR No." value={d.csr_number} />
                  <InfoField label="Date" value={d.date} />
                  <InfoField label="Customer" value={d.client_name} />
                  {d.show_po && d.po_number ? <InfoField label="PO No." value={d.po_number} /> : null}
                </div>
                <InfoField label="Address" value={d.address} />
              </SectionCard>

              <SectionCard title="Equipment Details">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoField label="Type" value={d.equipment_type} />
                  <InfoField label="Capacity" value={d.capacity} />
                  <InfoField label="Make" value={d.make} />
                  <InfoField label={d.modelLabel} value={d.model} />
                  <InfoField label={d.serialLabel} value={d.serial_no} />
                  <InfoField label="Location" value={d.equipment_location} />
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <SectionCard title="Nature of Problem">
                <div className="text-sm leading-7 whitespace-pre-wrap text-zinc-700">{d.problem_reported || '-'}</div>
              </SectionCard>

              <SectionCard title="Materials Used">
                <div className="text-sm leading-7 whitespace-pre-wrap text-zinc-700">{d.materialsText || '-'}</div>
              </SectionCard>
            </div>

            {d.showOperationalReadings ? (
              <SectionCard title="Operational Readings">
                <div className="rounded-2xl border border-zinc-200">
                  <Table>
                    <TableHeader className="bg-zinc-50">
                      <TableRow>
                        {readings.map(([heading]) => (
                          <TableHead key={heading}>{heading}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        {readings.map(([heading, value]) => (
                          <TableCell key={heading} className="text-sm text-zinc-700">
                            {value || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </SectionCard>
            ) : null}

            <SectionCard title="Service Execution">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoField label="Start of Service" value={[d.start_date, d.start_time].filter(Boolean).join(' ') || '-'} />
                <InfoField label="End of Service" value={[d.end_date, d.end_time].filter(Boolean).join(' ') || '-'} />
                <InfoField label="Technician Name" value={d.technicianName} />
                <InfoField label="Status" value={d.status} />
              </div>

              <Separator />

              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Service Rendered</div>
                <div className="text-sm leading-7 whitespace-pre-wrap text-zinc-700">{d.service_rendered || '-'}</div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Technician Remarks</div>
                <div className="text-sm leading-7 whitespace-pre-wrap text-zinc-700">{d.technicianRemarks || '-'}</div>
              </div>

              <div>
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Status Checklist</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {STATUS_OPTIONS.map((option) => (
                    <div key={option} className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2">
                      <div className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${d.status === option ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white text-transparent'}`}>
                        ✓
                      </div>
                      <span className={`text-sm ${d.status === option ? 'font-medium text-zinc-900' : 'text-zinc-500'}`}>{option}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Customer Feedback">
              <div className="text-sm leading-7 whitespace-pre-wrap text-zinc-700">{d.customer_feedback || '-'}</div>
            </SectionCard>

            {d.showAcknowledgement ? (
              <SectionCard title="Acknowledgement">
                <div className={`grid gap-6 ${d.showTechnicianSignLine ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                  <div className="space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">{d.recipientTitle}</div>
                    <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-5">
                      <div className="text-sm font-medium text-zinc-900">{d.acknowledgement_name || '-'}</div>
                      <div className="mt-1 text-xs text-zinc-500">{d.recipientRole || 'Name / Role'}</div>
                    </div>
                  </div>

                  {d.showTechnicianSignLine ? (
                    <div className="space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Technician Sign</div>
                      <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500">
                        Optional sign
                      </div>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
