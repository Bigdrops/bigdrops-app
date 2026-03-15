import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { getCsrViewData } from '../components/csr/csrUtils'

const STATUS_OPTIONS = ['Complete', 'Incomplete', 'Pending for spares', 'Under observation', 'Working solution provided', 'Field Entry Pending']
const STATUS_OPTIONS_PDF = ['Complete', 'Incomplete', 'Pending for spares', 'Under observation', 'Working solution provided']

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

  const statusColor = {
    Complete: { bg: '#DCFCE7', color: '#16A34A' },
    Incomplete: { bg: '#FEE2E2', color: '#CC0000' },
    'Pending for spares': { bg: '#FEF9C3', color: '#CA8A04' },
    'Under observation': { bg: '#E0F2FE', color: '#0284C7' },
    'Working solution provided': { bg: '#F3E8FF', color: '#7C3AED' },
    'Field Entry Pending': { bg: '#EDE9FE', color: '#4B5563' },
  }
  const s = statusColor[d.status] || { bg: '#F5F5F5', color: '#555' }

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

  const lbl = { fontSize: '11px', fontWeight: '700', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: '4px' }
  const val = { fontSize: '13px', color: '#1a1a1a' }
  const sec = { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '16px', overflow: 'hidden' }
  const secH = { backgroundColor: '#f0f0f0', padding: '8px 16px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #ddd' }
  const readings = [
    ['Voltage (V)', d.voltage],
    ['Frequency (Hz)', d.frequency],
    ['Battery (V)', d.battery],
    ['Temperature (°C)', d.temperature],
    ['Pressure (bar)', d.pressure],
    ['Hours', d.hours],
  ]

  return (
    <Layout title={d.csr_number}>
      <div style={{ maxWidth: '900px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div onClick={() => navigate('/csr')} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', border: '1px solid #ddd', backgroundColor: 'white' }}>Back</div>
          <span style={{ backgroundColor: s.bg, color: s.color, padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{d.status}</span>
          <div style={{ flex: 1 }} />
          <span style={{ color: '#555', fontWeight: '600', fontSize: '13px' }}>Template:</span>
          {[['1', 'Classic'], ['2', 'Minimal'], ['3', 'Modern']].map(([key, label]) => (
            <div key={key} onClick={() => setTemplate(key)} style={{ padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', backgroundColor: template === key ? '#1a1a1a' : 'white', color: template === key ? 'white' : '#555', border: '1px solid #ddd' }}>{label}</div>
          ))}
          <div onClick={handleDownload} style={{ padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', backgroundColor: '#0056B3', color: 'white', fontWeight: '600' }}>Download PDF</div>
          <div onClick={() => navigate('/csr/edit/' + id)} style={{ padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', backgroundColor: '#CC0000', color: 'white', fontWeight: '600' }}>Edit CSR</div>
        </div>

        <div style={sec}>
          <div style={secH}>Customer Details</div>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div><span style={lbl}>CSR No.</span><span style={{ ...val, color: '#CC0000', fontWeight: '700' }}>{d.csr_number}</span></div>
            <div><span style={lbl}>Date</span><span style={val}>{d.date}</span></div>
            <div><span style={lbl}>Customer</span><span style={val}>{d.client_name}</span></div>
            {d.show_po && d.po_number ? <div><span style={lbl}>PO No.</span><span style={val}>{d.po_number}</span></div> : null}
            <div style={{ gridColumn: '1 / -1' }}><span style={lbl}>Address</span><span style={val}>{d.address}</span></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={sec}>
            <div style={secH}>Nature of Problem</div>
            <div style={{ padding: '16px' }}>
              <span style={lbl}>Problem Reported</span>
              <p style={{ ...val, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{d.problem_reported}</p>
            </div>
          </div>
          <div style={sec}>
            <div style={secH}>Equipment Details</div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><span style={lbl}>Type</span><span style={val}>{d.equipment_type}</span></div>
              <div><span style={lbl}>Capacity</span><span style={val}>{d.capacity}</span></div>
              <div><span style={lbl}>Make</span><span style={val}>{d.make}</span></div>
              <div><span style={lbl}>{d.modelLabel}</span><span style={val}>{d.model}</span></div>
              <div><span style={lbl}>{d.serialLabel}</span><span style={val}>{d.serial_no}</span></div>
              <div><span style={lbl}>Location</span><span style={val}>{d.equipment_location}</span></div>
            </div>
          </div>
        </div>

        {d.showOperationalReadings ? (
          <div style={sec}>
            <div style={secH}>Operational Readings</div>
            <div style={{ padding: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ backgroundColor: '#f8f8f8' }}>
                  {readings.map(([heading]) => (
                    <th key={heading} style={{ padding: '8px 12px', border: '1px solid #ddd', fontWeight: '700', fontSize: '11px', color: '#333' }}>{heading}</th>
                  ))}
                </tr></thead>
                <tbody><tr>
                  {readings.map(([heading, value]) => (
                    <td key={heading} style={{ padding: '10px 12px', border: '1px solid #ddd', textAlign: 'center' }}>{value || '-'}</td>
                  ))}
                </tr></tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
          <div style={sec}>
            <div style={secH}>Materials Used</div>
            <div style={{ padding: '16px' }}>
              <p style={{ ...val, lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{d.materialsText || '-'}</p>
            </div>
          </div>
          <div style={sec}>
            <div style={secH}>Service Execution</div>
            <div style={{ padding: '16px' }}>
              <div style={{ marginBottom: '14px' }}><span style={lbl}>Service Rendered</span><p style={{ ...val, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{d.service_rendered}</p></div>
              <div style={{ marginBottom: '14px' }}><span style={lbl}>Technician Name</span><span style={val}>{d.technicianName || '-'}</span></div>
              <div style={{ marginBottom: '14px' }}><span style={lbl}>Technician Remarks</span><p style={{ ...val, color: '#555', whiteSpace: 'pre-wrap' }}>{d.technicianRemarks || '-'}</p></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div><span style={lbl}>Start of Service</span><span style={val}>{[d.start_date, d.start_time].filter(Boolean).join(' ') || '-'}</span></div>
                <div><span style={lbl}>End of Service</span><span style={val}>{[d.end_date, d.end_time].filter(Boolean).join(' ') || '-'}</span></div>
              </div>
              <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '10px' }}>Status</div>
              {STATUS_OPTIONS.map((option) => (
                <div key={option} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '14px', height: '14px', border: '1px solid #333', borderRadius: '2px', backgroundColor: d.status === option ? '#1a1a1a' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {d.status === option ? <span style={{ color: 'white', fontSize: '10px' }}>✓</span> : null}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: d.status === option ? '600' : '400', color: d.status === option ? '#1a1a1a' : '#888' }}>{option}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={sec}>
          <div style={secH}>Customer Feedback</div>
          <div style={{ padding: '16px' }}>
            <span style={lbl}>Feedback</span>
            <span style={val}>{d.customer_feedback || '-'}</span>
          </div>
        </div>

        {d.showAcknowledgement ? (
          <div style={sec}>
            <div style={secH}>Acknowledgement</div>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: d.showTechnicianSignLine ? '1fr 1fr' : '1fr', gap: '20px' }}>
                <div>
                  <span style={lbl}>{d.recipientTitle}</span>
                  <div style={{ borderTop: '1px dashed #999', marginTop: '28px', paddingTop: '6px', fontSize: '12px', color: '#555' }}>
                    {d.acknowledgement_name || ''}
                    {d.recipientRole ? <div style={{ marginTop: '4px', color: '#888' }}>{d.recipientRole}</div> : null}
                  </div>
                </div>
                {d.showTechnicianSignLine ? (
                  <div>
                    <span style={lbl}>Technician Sign</span>
                    <div style={{ borderTop: '1px dashed #999', marginTop: '28px', paddingTop: '6px', fontSize: '12px', color: '#888' }}>Optional sign</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  )
}
