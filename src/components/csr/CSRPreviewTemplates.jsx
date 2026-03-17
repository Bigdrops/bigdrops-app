import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  CSR_READING_FIELDS,
  CSR_STATUS_OPTIONS_PDF,
  CSR_TEMPLATE_VARIANTS,
} from './CSRPreviewContent'

function createPdfStyles(variant) {
  const palette = CSR_TEMPLATE_VARIANTS[variant]
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: palette.fontSize,
      padding: palette.pagePadding,
      backgroundColor: palette.pageBg,
      color: palette.pageFg,
    },
    header: {
      backgroundColor: palette.headerBg,
      color: palette.headerFg,
      padding: palette.compact ? '8 10' : '10 12',
      marginBottom: palette.compact ? 8 : 10,
      borderRadius: palette.headerMode === 'editorialSplit' ? 12 : 8,
    },
    headerSplit: {
      flexDirection: 'row',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 10,
    },
    headerSplitMain: {
      flex: 1.5,
      backgroundColor: palette.headerBg,
      color: palette.headerFg,
      padding: palette.compact ? '10 12' : '12 14',
    },
    headerSplitMeta: {
      width: 118,
      backgroundColor: palette.accent,
      color: '#ffffff',
      padding: palette.compact ? '10 10' : '12 12',
      justifyContent: 'space-between',
    },
    ribbonCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 10,
      backgroundColor: '#ffffff',
    },
    ribbonBand: {
      backgroundColor: palette.headerBg,
      color: palette.headerFg,
      padding: palette.compact ? '8 10' : '10 12',
    },
    ribbonBody: {
      padding: palette.compact ? '8 10' : '10 12',
    },
    headerName: {
      fontSize: palette.headerNameSize,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
    },
    headerTagline: { fontSize: palette.compact ? 7 : 8, marginTop: 2 },
    headerContact: { fontSize: palette.compact ? 6.8 : 7.5, marginTop: 2 },
    metaLabel: {
      fontSize: palette.compact ? 6.4 : 7,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      opacity: 0.9,
    },
    metaValue: {
      fontSize: palette.compact ? 8.8 : 10.2,
      fontFamily: 'Helvetica-Bold',
      marginTop: 2,
    },
    reportTitle: {
      textAlign: palette.headerMode === 'compactRibbon' ? 'left' : 'center',
      fontFamily: 'Helvetica-Bold',
      fontSize: palette.titleSize,
      marginBottom: palette.compact ? 8 : 10,
      textTransform: 'uppercase',
      color: palette.headerBg,
      letterSpacing: palette.headerMode === 'editorialSplit' ? 1 : 0.3,
    },
    reportSubtitle: {
      fontSize: palette.compact ? 6.8 : 7.4,
      color: '#64748B',
      marginTop: 3,
    },
    section: {
      borderWidth: 1,
      borderColor: palette.border,
      marginBottom: palette.compact ? 6 : 8,
      borderRadius: palette.compact ? 8 : 10,
      overflow: 'hidden',
      backgroundColor: palette.sectionBg || '#ffffff',
    },
    sectionTitle: {
      backgroundColor: palette.sectionTitleBg || palette.mutedBg,
      color: palette.sectionTitleFg || palette.headerBg,
      fontFamily: 'Helvetica-Bold',
      fontSize: palette.sectionTitleSize,
      padding: palette.compact ? '3 5' : '4 6',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    sectionBody: { padding: palette.compact ? '5 6' : '6 8' },
    row: { flexDirection: 'row', gap: palette.compact ? 6 : 8, marginBottom: palette.compact ? 4 : 6 },
    field: { flex: 1 },
    label: {
      fontFamily: 'Helvetica-Bold',
      fontSize: palette.compact ? 6.8 : 7.5,
      color: palette.accent,
      marginBottom: 2,
      textTransform: 'uppercase',
    },
    value: { fontSize: palette.valueSize },
    blockValue: { fontSize: palette.valueSize, lineHeight: palette.compact ? 1.2 : 1.4, minHeight: palette.compact ? 8 : 14 },
    readingsRow: { flexDirection: 'row' },
    readingsHeader: {
      flex: 1,
      padding: palette.compact ? '3 2' : '4 3',
      fontSize: palette.compact ? 6.5 : 7.5,
      fontFamily: 'Helvetica-Bold',
      textAlign: 'center',
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.mutedBg,
    },
    readingsCell: {
      flex: 1,
      padding: palette.compact ? '3 2' : '4 3',
      fontSize: palette.compact ? 7.2 : 8.5,
      textAlign: 'center',
      borderWidth: 1,
      borderColor: palette.border,
      borderTopWidth: 0,
    },
    statusWrap: { marginTop: palette.compact ? 2 : 4 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: palette.compact ? 2 : 3 },
    statusBox: {
      width: palette.compact ? 8 : 10,
      height: palette.compact ? 8 : 10,
      borderWidth: 1,
      borderColor: '#111827',
      marginRight: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusBoxActive: {
      width: palette.compact ? 8 : 10,
      height: palette.compact ? 8 : 10,
      borderWidth: 1,
      borderColor: '#111827',
      marginRight: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.headerBg,
    },
    statusCapsule: {
      minWidth: palette.compact ? 24 : 28,
      padding: palette.compact ? '2 5' : '3 6',
      marginRight: 5,
      borderRadius: 999,
      textAlign: 'center',
      fontSize: palette.compact ? 5.8 : 6.2,
      fontFamily: 'Helvetica-Bold',
      backgroundColor: palette.mutedBg,
      color: '#64748B',
    },
    statusCapsuleActive: {
      minWidth: palette.compact ? 24 : 28,
      padding: palette.compact ? '2 5' : '3 6',
      marginRight: 5,
      borderRadius: 999,
      textAlign: 'center',
      fontSize: palette.compact ? 5.8 : 6.2,
      fontFamily: 'Helvetica-Bold',
      backgroundColor: palette.headerBg,
      color: palette.headerFg,
    },
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

function PdfStatusRow({ styles, csr, option, variant }) {
  const active = csr.status === option
  const capsule = CSR_TEMPLATE_VARIANTS[variant].statusStyle === 'capsule'

  return (
    <View style={styles.statusRow}>
      {capsule ? (
        <Text style={active ? styles.statusCapsuleActive : styles.statusCapsule}>
          {active ? 'Yes' : 'No'}
        </Text>
      ) : (
        <View style={active ? styles.statusBoxActive : styles.statusBox}>
          {active ? <Text style={styles.statusMark}>{'\u2713'}</Text> : null}
        </View>
      )}
      <Text style={styles.value}>{option}</Text>
    </View>
  )
}

function PdfHeader({ styles, csr, branding, variant }) {
  const palette = CSR_TEMPLATE_VARIANTS[variant]
  const hasBranding = branding.companyName || branding.companyTagline || branding.contactLine
  const needsStructuredHeader = palette.headerMode === 'editorialSplit' || palette.headerMode === 'compactRibbon'

  if (!hasBranding && !needsStructuredHeader) return null

  if (palette.headerMode === 'editorialSplit') {
    return (
      <View style={styles.headerSplit}>
        <View style={styles.headerSplitMain}>
          {branding.companyName ? <Text style={styles.headerName}>{branding.companyName}</Text> : null}
          {branding.companyTagline ? <Text style={styles.headerTagline}>{branding.companyTagline}</Text> : null}
          {branding.contactLine ? <Text style={styles.headerContact}>{branding.contactLine}</Text> : null}
          <Text style={{ marginTop: palette.compact ? 10 : 12, fontSize: palette.compact ? 12 : 14, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1.1 }}>Customer Service Report</Text>
        </View>
        <View style={styles.headerSplitMeta}>
          <View>
            <Text style={styles.metaLabel}>CSR No.</Text>
            <Text style={styles.metaValue}>{csr.csr_number}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>{csr.date}</Text>
          </View>
        </View>
      </View>
    )
  }

  if (palette.headerMode === 'compactRibbon') {
    return (
      <View style={styles.ribbonCard}>
        <View style={styles.ribbonBand}>
          {branding.companyName ? <Text style={styles.headerName}>{branding.companyName}</Text> : null}
          {branding.companyTagline ? <Text style={styles.headerTagline}>{branding.companyTagline}</Text> : null}
          {branding.contactLine ? <Text style={styles.headerContact}>{branding.contactLine}</Text> : null}
        </View>
        <View style={styles.ribbonBody}>
          <Text style={styles.reportTitle}>Customer Service Report</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Text style={{ fontSize: palette.compact ? 7 : 8, fontFamily: 'Helvetica-Bold', color: palette.accent }}>{csr.csr_number}</Text>
            <Text style={{ fontSize: palette.compact ? 7 : 8, color: '#64748B' }}>{csr.date}</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.header}>
      {branding.companyName ? <Text style={styles.headerName}>{branding.companyName}</Text> : null}
      {branding.companyTagline ? <Text style={styles.headerTagline}>{branding.companyTagline}</Text> : null}
      {branding.contactLine ? <Text style={styles.headerContact}>{branding.contactLine}</Text> : null}
    </View>
  )
}

function TemplateBase({ csr, branding, variant }) {
  const styles = createPdfStyles(variant)
  const palette = CSR_TEMPLATE_VARIANTS[variant]
  const readings = CSR_READING_FIELDS.map(({ key, label }) => [label, csr[key]])
  const showStandaloneTitle = palette.headerMode !== 'compactRibbon' && palette.headerMode !== 'editorialSplit'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader styles={styles} csr={csr} branding={branding} variant={variant} />

        {showStandaloneTitle ? <Text style={styles.reportTitle}>Customer Service Report</Text> : null}

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
                  <PdfStatusRow key={option} styles={styles} csr={csr} option={option} variant={variant} />
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
