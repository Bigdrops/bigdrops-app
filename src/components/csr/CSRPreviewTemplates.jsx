import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { CSR_READING_FIELDS, CSR_STATUS_OPTIONS_PDF } from './CSRPreviewContent'

export const CSR_TEMPLATE_VARIANTS = {
  classic: {
    headerBg: '#CC0000',
    headerFg: '#ffffff',
    accent: '#0056B3',
    border: '#0056B3',
    mutedBg: '#F8FAFC',
    pageBg: '#ffffff',
    pageFg: '#111827',
    pagePadding: 22,
    fontSize: 9.5,
    titleSize: 11,
    headerNameSize: 15,
    sectionTitleSize: 8.5,
    valueSize: 9,
    compact: false,
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
    previewShell: 'linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 100%)',
  },
  minimal: {
    headerBg: '#111827',
    headerFg: '#ffffff',
    accent: '#374151',
    border: '#111827',
    mutedBg: '#F3F4F6',
    pageBg: '#ffffff',
    pageFg: '#111827',
    pagePadding: 22,
    fontSize: 9.5,
    titleSize: 11,
    headerNameSize: 15,
    sectionTitleSize: 8.5,
    valueSize: 9,
    compact: false,
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
    previewShell: 'linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 100%)',
  },
  modern: {
    headerBg: '#1a2744',
    headerFg: '#ffffff',
    accent: '#e67e22',
    border: '#d0d8ec',
    mutedBg: '#f8faff',
    pageBg: '#ffffff',
    pageFg: '#111827',
    pagePadding: 22,
    fontSize: 9.5,
    titleSize: 11,
    headerNameSize: 15,
    sectionTitleSize: 8.5,
    valueSize: 9,
    compact: false,
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
    previewShell: 'linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 100%)',
  },
  classicCompact: {
    headerBg: '#B42318',
    headerFg: '#ffffff',
    accent: '#0056B3',
    border: '#C7D2FE',
    mutedBg: '#F8FAFC',
    pageBg: '#ffffff',
    pageFg: '#0F172A',
    pagePadding: 18,
    fontSize: 8.3,
    titleSize: 10,
    headerNameSize: 13.5,
    sectionTitleSize: 7.8,
    valueSize: 8.2,
    compact: true,
    previewSurface: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    previewShell: 'linear-gradient(180deg, #F8FAFC 0%, #EDF4FF 100%)',
  },
  editorialCompact: {
    headerBg: '#111827',
    headerFg: '#F8FAFC',
    accent: '#C2410C',
    border: '#334155',
    mutedBg: '#E5E7EB',
    pageBg: '#F8FAFC',
    pageFg: '#0F172A',
    pagePadding: 17,
    fontSize: 8.1,
    titleSize: 10,
    headerNameSize: 13,
    sectionTitleSize: 7.6,
    valueSize: 8,
    compact: true,
    previewSurface: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    previewShell: 'linear-gradient(180deg, #E2E8F0 0%, #CBD5E1 100%)',
  },
}

export const CSR_TEMPLATE_OPTIONS = [
  {
    key: '1',
    label: 'Classic',
    blurb: 'Strong brand header with the original service-report tone.',
    accent: CSR_TEMPLATE_VARIANTS.classic.headerBg,
  },
  {
    key: '2',
    label: 'Minimal',
    blurb: 'Cleaner monochrome layout for straightforward field reports.',
    accent: CSR_TEMPLATE_VARIANTS.minimal.headerBg,
  },
  {
    key: '3',
    label: 'Modern',
    blurb: 'Structured contemporary layout with deeper contrast blocks.',
    accent: CSR_TEMPLATE_VARIANTS.modern.headerBg,
  },
  {
    key: '4',
    label: 'Classic Compact',
    blurb: 'Structured red-blue service report condensed for one-page print.',
    accent: CSR_TEMPLATE_VARIANTS.classicCompact.headerBg,
  },
  {
    key: '5',
    label: 'Editorial Compact',
    blurb: 'Darker editorial layout compressed for one-page print friendliness.',
    accent: CSR_TEMPLATE_VARIANTS.editorialCompact.headerBg,
  },
]

export function getCsrTemplateVariant(template = '3') {
  if (template === '1') return 'classic'
  if (template === '2') return 'minimal'
  if (template === '4') return 'classicCompact'
  if (template === '5') return 'editorialCompact'
  return 'modern'
}

function createPdfStyles(variant) {
  const palette = CSR_TEMPLATE_VARIANTS[variant]
  return StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: palette.fontSize, padding: palette.pagePadding, backgroundColor: palette.pageBg, color: palette.pageFg },
    header: { backgroundColor: palette.headerBg, color: palette.headerFg, padding: palette.compact ? '8 10' : '10 12', marginBottom: palette.compact ? 8 : 10 },
    headerName: { fontSize: palette.headerNameSize, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    headerTagline: { fontSize: palette.compact ? 7 : 8, marginTop: 2 },
    headerContact: { fontSize: palette.compact ? 6.8 : 7.5, marginTop: 2 },
    reportTitle: { textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: palette.titleSize, marginBottom: palette.compact ? 8 : 10, textTransform: 'uppercase', color: palette.headerBg },
    section: { borderWidth: 1, borderColor: palette.border, marginBottom: palette.compact ? 6 : 8 },
    sectionTitle: { backgroundColor: palette.mutedBg, color: palette.headerBg, fontFamily: 'Helvetica-Bold', fontSize: palette.sectionTitleSize, padding: palette.compact ? '3 5' : '4 6', textTransform: 'uppercase' },
    sectionBody: { padding: palette.compact ? '5 6' : '6 8' },
    row: { flexDirection: 'row', gap: palette.compact ? 6 : 8, marginBottom: palette.compact ? 4 : 6 },
    field: { flex: 1 },
    label: { fontFamily: 'Helvetica-Bold', fontSize: palette.compact ? 6.8 : 7.5, color: palette.accent, marginBottom: 2, textTransform: 'uppercase' },
    value: { fontSize: palette.valueSize },
    blockValue: { fontSize: palette.valueSize, lineHeight: palette.compact ? 1.2 : 1.4, minHeight: palette.compact ? 8 : 14 },
    readingsRow: { flexDirection: 'row' },
    readingsHeader: { flex: 1, padding: palette.compact ? '3 2' : '4 3', fontSize: palette.compact ? 6.5 : 7.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', borderWidth: 1, borderColor: palette.border, backgroundColor: palette.mutedBg },
    readingsCell: { flex: 1, padding: palette.compact ? '3 2' : '4 3', fontSize: palette.compact ? 7.2 : 8.5, textAlign: 'center', borderWidth: 1, borderColor: palette.border, borderTopWidth: 0 },
    statusWrap: { marginTop: palette.compact ? 2 : 4 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: palette.compact ? 2 : 3 },
    statusBox: { width: palette.compact ? 8 : 10, height: palette.compact ? 8 : 10, borderWidth: 1, borderColor: '#111827', marginRight: 4, alignItems: 'center', justifyContent: 'center' },
    statusBoxActive: { width: palette.compact ? 8 : 10, height: palette.compact ? 8 : 10, borderWidth: 1, borderColor: '#111827', marginRight: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.headerBg },
    statusMark: { color: '#ffffff', fontSize: palette.compact ? 5 : 6 },
    ackGrid: { flexDirection: 'row', gap: palette.compact ? 6 : 10 },
    ackCell: { flex: 1 },
    line: { borderTopWidth: 1, borderTopColor: '#9CA3AF', marginTop: palette.compact ? 8 : 16, paddingTop: palette.compact ? 2 : 3, minHeight: palette.compact ? 10 : 18 },
    footer: { marginTop: palette.compact ? 4 : 6, textAlign: 'center', fontSize: palette.compact ? 6.6 : 7.5, color: '#6B7280' },
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
  const readings = CSR_READING_FIELDS.map(({ key, label }) => [label, csr[key]])

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
            <PdfField styles={styles} label="CSR No." value={csr.csr_number} />
            <PdfField styles={styles} label="Date" value={csr.date} />
            <PdfField styles={styles} label="Customer" value={csr.client_name} />
          </View>
          {csr.show_po && csr.po_number ? (
            <View style={styles.row}>
              <PdfField styles={styles} label="PO No." value={csr.po_number} />
            </View>
          ) : null}
          <View style={styles.row}>
            <PdfField styles={styles} label="Address" value={csr.address} block />
          </View>
        </PdfSection>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <PdfSection styles={styles} title="Nature of Problem">
              <PdfField styles={styles} label="Problem Reported" value={csr.problem_reported} block />
            </PdfSection>
          </View>
          <View style={{ flex: 1 }}>
            <PdfSection styles={styles} title="Equipment Details">
              <View style={styles.row}>
                <PdfField styles={styles} label="Equipment Type" value={csr.equipment_type} />
                <PdfField styles={styles} label="Location" value={csr.equipment_location} />
              </View>
              <View style={styles.row}>
                <PdfField styles={styles} label="Make" value={csr.make} />
                <PdfField styles={styles} label={csr.modelLabel} value={csr.model} />
              </View>
              <View style={styles.row}>
                <PdfField styles={styles} label={csr.serialLabel} value={csr.serial_no} />
                <PdfField styles={styles} label="Capacity" value={csr.capacity} />
              </View>
            </PdfSection>
          </View>
        </View>

        {csr.showOperationalReadings ? (
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
              <PdfField styles={styles} label="Materials" value={csr.materialsText} block />
            </PdfSection>
          </View>
          <View style={{ flex: 1.5 }}>
            <PdfSection styles={styles} title="Service Execution">
              <PdfField styles={styles} label="Service Rendered" value={csr.service_rendered} block />
              <View style={styles.row}>
                <PdfField styles={styles} label="Start of Service" value={[csr.start_date, csr.start_time].filter(Boolean).join(' ')} />
                <PdfField styles={styles} label="End of Service" value={[csr.end_date, csr.end_time].filter(Boolean).join(' ')} />
              </View>
              <View style={styles.row}>
                <PdfField styles={styles} label="Technician Name" value={csr.technicianName} />
              </View>
              <PdfField styles={styles} label="Technician Remarks" value={csr.technicianRemarks} block />
              <View style={styles.statusWrap}>
                <Text style={styles.label}>Status After Service</Text>
                {CSR_STATUS_OPTIONS_PDF.map((option) => (
                  <View key={option} style={styles.statusRow}>
                    <View style={csr.status === option ? styles.statusBoxActive : styles.statusBox}>
                      {csr.status === option ? <Text style={styles.statusMark}>{'\u2713'}</Text> : null}
                    </View>
                    <Text style={styles.value}>{option}</Text>
                  </View>
                ))}
              </View>
            </PdfSection>
          </View>
        </View>

        <PdfSection styles={styles} title="Customer Feedback">
          <PdfField styles={styles} label="Feedback" value={csr.customer_feedback} block />
        </PdfSection>

        {csr.showAcknowledgement ? (
          <PdfSection styles={styles} title="Acknowledgement">
            <View style={styles.ackGrid}>
              <View style={styles.ackCell}>
                <Text style={styles.label}>{csr.recipientTitle}</Text>
                <Text style={styles.value}>{csr.acknowledgement_name || ' '}</Text>
                <View style={styles.line}>
                  <Text style={{ fontSize: 7, color: '#6B7280' }}>{csr.recipientRole || 'Name / Role'}</Text>
                </View>
              </View>
              {csr.showTechnicianSignLine ? (
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

export function Template2({ csr, branding = {} }) {
  return <TemplateBase csr={csr} branding={branding} variant="minimal" />
}

export function Template3({ csr, branding = {} }) {
  return <TemplateBase csr={csr} branding={branding} variant="modern" />
}

export function Template4({ csr, branding = {} }) {
  return <TemplateBase csr={csr} branding={branding} variant="classicCompact" />
}

export function Template5({ csr, branding = {} }) {
  return <TemplateBase csr={csr} branding={branding} variant="editorialCompact" />
}

export function getCsrPdfDocument({ csr, branding = {}, template = '3' }) {
  if (template === '1') return <Template1 csr={csr} branding={branding} />
  if (template === '2') return <Template2 csr={csr} branding={branding} />
  if (template === '4') return <Template4 csr={csr} branding={branding} />
  if (template === '5') return <Template5 csr={csr} branding={branding} />
  return <Template3 csr={csr} branding={branding} />
}
