import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  CSR_READING_FIELDS,
  CSR_STATUS_OPTIONS_PDF,
  CSR_TEMPLATE_VARIANTS,
  getCsrTemplateVariant,
} from './CSRPreviewContent'

const hasText = (value) => !!String(value || '').trim()
const safe = (value) => String(value || '').trim()

function shouldShow(enabled, value) {
  if (!enabled) return false
  if (Array.isArray(value)) return value.length > 0
  return hasText(value)
}

function getBranding(branding = {}) {
  return {
    companyName: safe(branding.companyName),
    companyTagline: safe(branding.companyTagline),
    contactLine: safe(branding.contactLine),
    footerText: safe(branding.footerText),
  }
}

function buildTheme(variant) {
  const v = CSR_TEMPLATE_VARIANTS[variant] || CSR_TEMPLATE_VARIANTS.modern

  return {
    compact: !!v.compact,
    pageBg: v.pageBg || '#ffffff',
    pageFg: v.pageFg || '#111827',
    pagePadding: v.pagePadding || 20,
    border: v.border || '#0056B3',
    headerBg: v.headerBg || '#CC0000',
    headerFg: v.headerFg || '#ffffff',
    accent: v.accent || '#0056B3',
    mutedBg: v.mutedBg || '#F8FAFC',
    sectionBg: v.sectionBg || '#ffffff',
    sectionTitleBg: v.sectionTitleBg || v.mutedBg || '#F8FAFC',
    sectionTitleFg: v.sectionTitleFg || v.headerBg || '#CC0000',
    fontSize: v.fontSize || 9,
    titleSize: v.titleSize || 11,
    valueSize: v.valueSize || 9,
    headerNameSize: v.headerNameSize || 15,
    sectionTitleSize: v.sectionTitleSize || 8,
  }
}

function createStructuredStyles(theme) {
  const compact = theme.compact

  return StyleSheet.create({
    page: {
      backgroundColor: theme.pageBg,
      color: theme.pageFg,
      fontFamily: 'Helvetica',
      fontSize: theme.fontSize,
      paddingTop: theme.pagePadding,
      paddingBottom: theme.pagePadding,
      paddingHorizontal: theme.pagePadding,
    },

    header: {
      marginBottom: compact ? 6 : 8,
    },
    companyName: {
      color: theme.headerBg,
      fontSize: theme.headerNameSize,
      fontFamily: 'Helvetica-Bold',
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    companyTagline: {
      fontSize: compact ? 8 : 9,
      color: theme.accent,
      textAlign: 'center',
      marginTop: 2,
    },
    contactLine: {
      fontSize: compact ? 7 : 8,
      color: theme.accent,
      textAlign: 'center',
      marginTop: 2,
    },

    reportTitle: {
      backgroundColor: theme.headerBg,
      color: theme.headerFg,
      textAlign: 'center',
      fontFamily: 'Helvetica-Bold',
      fontSize: theme.titleSize,
      textTransform: 'uppercase',
      paddingVertical: compact ? 4 : 5,
      paddingHorizontal: 8,
      marginBottom: compact ? 6 : 8,
    },

    section: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.sectionBg,
      marginBottom: compact ? 5 : 6,
    },
    sectionTitle: {
      backgroundColor: theme.headerBg,
      color: '#ffffff',
      fontFamily: 'Helvetica-Bold',
      fontSize: theme.sectionTitleSize,
      textTransform: 'uppercase',
      paddingVertical: compact ? 4 : 5,
      paddingHorizontal: 8,
    },

    row: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    cell: {
      flex: 1,
      paddingVertical: compact ? 4 : 5,
      paddingHorizontal: compact ? 6 : 7,
      borderRightWidth: 1,
      borderRightColor: theme.border,
    },
    cellLast: {
      borderRightWidth: 0,
    },
    cellHalf: {
      flex: 2,
    },

    label: {
      color: theme.accent,
      fontSize: compact ? 7 : 8,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 2,
    },
    value: {
      fontSize: theme.valueSize,
      color: theme.pageFg,
      lineHeight: compact ? 1.2 : 1.3,
    },
    blockText: {
      paddingVertical: compact ? 5 : 6,
      paddingHorizontal: compact ? 6 : 8,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      minHeight: compact ? 24 : 28,
    },

    tableHeader: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    th: {
      flex: 1,
      borderRightWidth: 1,
      borderRightColor: theme.border,
      paddingVertical: compact ? 4 : 5,
      paddingHorizontal: 4,
    },
    thLast: {
      borderRightWidth: 0,
    },
    thText: {
      color: theme.accent,
      fontFamily: 'Helvetica-Bold',
      fontSize: compact ? 7 : 8,
      textAlign: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    td: {
      flex: 1,
      borderRightWidth: 1,
      borderRightColor: theme.border,
      paddingVertical: compact ? 4 : 5,
      paddingHorizontal: 4,
      minHeight: compact ? 18 : 20,
      justifyContent: 'center',
    },
    tdLast: {
      borderRightWidth: 0,
    },
    tdText: {
      fontSize: compact ? 8 : 9,
      textAlign: 'center',
    },

    serviceWrap: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    serviceMain: {
      flex: 3,
      borderRightWidth: 1,
      borderRightColor: theme.border,
    },
    serviceInner: {
      paddingVertical: compact ? 5 : 6,
      paddingHorizontal: compact ? 6 : 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      minHeight: compact ? 30 : 34,
    },
    serviceInnerLast: {
      borderBottomWidth: 0,
    },
    statusBox: {
      flex: 1,
      paddingVertical: compact ? 6 : 7,
      paddingHorizontal: compact ? 6 : 8,
    },
    statusTitle: {
      color: theme.headerBg,
      fontFamily: 'Helvetica-Bold',
      fontSize: compact ? 8 : 9,
      marginBottom: 4,
    },
    statusItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: compact ? 3 : 4,
    },
    checkBox: {
      width: compact ? 10 : 12,
      height: compact ? 10 : 12,
      borderWidth: 1,
      borderColor: '#333333',
      marginRight: 5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkMark: {
      color: theme.headerBg,
      fontSize: compact ? 7 : 8,
      fontFamily: 'Helvetica-Bold',
    },
    statusText: {
      fontSize: compact ? 8 : 9,
      color: theme.pageFg,
      lineHeight: 1.2,
    },

    ackGrid: {
      flexDirection: 'row',
    },
    ackCell: {
      flex: 1,
      paddingVertical: compact ? 5 : 6,
      paddingHorizontal: compact ? 6 : 8,
      borderRightWidth: 1,
      borderRightColor: theme.border,
      minHeight: compact ? 32 : 40,
    },
    ackCellLast: {
      borderRightWidth: 0,
    },
    lineBox: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: compact ? 8 : 12,
      paddingTop: 2,
      minHeight: compact ? 12 : 16,
    },
    lineHint: {
      fontSize: compact ? 7 : 8,
      color: '#6B7280',
    },

    footer: {
      marginTop: compact ? 4 : 6,
      fontSize: compact ? 7 : 8,
      textAlign: 'center',
      color: '#6B7280',
    },
  })
}

function createEditorialStyles(theme) {
  const compact = true

  return StyleSheet.create({
    page: {
      backgroundColor: '#ffffff',
      color: '#1F2937',
      fontFamily: 'Helvetica',
      fontSize: theme.fontSize,
      paddingTop: theme.pagePadding,
      paddingBottom: theme.pagePadding,
      paddingHorizontal: theme.pagePadding,
    },

    headerWrap: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: '#444444',
      marginBottom: 8,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
    },
    markBlock: {
      width: 36,
      backgroundColor: '#2D2D2D',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 8,
    },
    markText: {
      color: '#ffffff',
      fontFamily: 'Helvetica-Bold',
      fontSize: 12,
      lineHeight: 1,
    },
    brandBlock: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderLeftWidth: 1,
      borderLeftColor: '#444444',
    },
    companyName: {
      color: '#2D2D2D',
      fontFamily: 'Helvetica-Bold',
      fontSize: 14,
      textTransform: 'uppercase',
    },
    companyTagline: {
      fontSize: 7,
      color: '#6B7280',
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
      paddingTop: 4,
    },
    headerRight: {
      width: 120,
      borderLeftWidth: 1,
      borderLeftColor: '#444444',
      backgroundColor: '#FCFCFC',
      paddingVertical: 8,
      paddingHorizontal: 10,
      justifyContent: 'center',
    },
    metaSmallLabel: {
      fontSize: 6,
      color: '#9CA3AF',
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      marginTop: 3,
    },
    metaSmallValue: {
      fontSize: 7,
      color: '#111827',
      marginTop: 1,
      lineHeight: 1.2,
    },

    reportBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#2D2D2D',
      color: '#ffffff',
      paddingVertical: 5,
      paddingHorizontal: 10,
      marginBottom: 8,
    },
    reportMain: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    reportRef: {
      fontSize: 8,
    },

    section: {
      borderWidth: 1,
      borderColor: '#444444',
      marginBottom: 6,
    },
    sectionTitle: {
      backgroundColor: '#E9E9E9',
      color: '#2D2D2D',
      fontFamily: 'Helvetica-Bold',
      fontSize: 8,
      textTransform: 'uppercase',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#444444',
    },

    row: {
      flexDirection: 'row',
      borderTopWidth: 0,
    },
    rowSplitBottom: {
      borderBottomWidth: 1,
      borderBottomColor: '#DDDDDD',
    },
    cell: {
      flex: 1,
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRightWidth: 1,
      borderRightColor: '#DDDDDD',
    },
    cellLast: {
      borderRightWidth: 0,
    },
    cellHalf: {
      flex: 2,
    },
    label: {
      fontSize: 6,
      color: '#888888',
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
      marginBottom: 1,
    },
    value: {
      fontSize: 10,
      color: '#2D2D2D',
      fontFamily: 'Helvetica-Bold',
      lineHeight: 1.2,
    },
    blockText: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      minHeight: 34,
    },

    workGrid: {
      flexDirection: 'row',
      borderTopWidth: 0,
    },
    largeTextArea: {
      flex: 3,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRightWidth: 1,
      borderRightColor: '#DDDDDD',
      minHeight: 90,
    },
    scopeTitle: {
      fontFamily: 'Helvetica-Bold',
      fontSize: 9,
      color: '#2D2D2D',
      marginBottom: 5,
    },
    statusPanel: {
      flex: 1,
      backgroundColor: '#FAFAFA',
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    statusItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    checkBox: {
      width: 10,
      height: 10,
      borderWidth: 1,
      borderColor: '#888888',
      marginRight: 5,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ffffff',
    },
    checkBoxActive: {
      width: 10,
      height: 10,
      borderWidth: 1,
      borderColor: '#2D2D2D',
      marginRight: 5,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#2D2D2D',
    },
    checkMark: {
      color: '#ffffff',
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
    },
    statusText: {
      fontSize: 8,
      color: '#444444',
      fontFamily: 'Helvetica-Bold',
    },

    tableHeader: {
      flexDirection: 'row',
      borderTopWidth: 0,
    },
    th: {
      flex: 1,
      borderRightWidth: 1,
      borderRightColor: '#DDDDDD',
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    thLast: {
      borderRightWidth: 0,
    },
    thText: {
      fontSize: 6.5,
      color: '#888888',
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
      textAlign: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: '#DDDDDD',
    },
    td: {
      flex: 1,
      borderRightWidth: 1,
      borderRightColor: '#DDDDDD',
      paddingVertical: 5,
      paddingHorizontal: 4,
      minHeight: 18,
      justifyContent: 'center',
    },
    tdLast: {
      borderRightWidth: 0,
    },
    tdText: {
      fontSize: 8,
      textAlign: 'center',
      color: '#2D2D2D',
      fontFamily: 'Helvetica-Bold',
    },

    ackGrid: {
      flexDirection: 'row',
    },
    ackCell: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRightWidth: 1,
      borderRightColor: '#DDDDDD',
      minHeight: 34,
    },
    ackCellLast: {
      borderRightWidth: 0,
    },
    lineBox: {
      borderTopWidth: 1,
      borderTopColor: '#CBD5E1',
      marginTop: 10,
      paddingTop: 2,
      minHeight: 12,
    },
    lineHint: {
      fontSize: 7,
      color: '#6B7280',
    },

    footer: {
      marginTop: 4,
      fontSize: 7,
      textAlign: 'center',
      color: '#6B7280',
    },
  })
}

function PdfSection({ styles, title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function InfoCell({ styles, label, value, half = false, last = false }) {
  return (
    <View style={[styles.cell, half ? styles.cellHalf : null, last ? styles.cellLast : null]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Text style={styles.value}>{safe(value) || ' '}</Text>
    </View>
  )
}

function StructuredHeader({ styles, branding }) {
  if (!branding.companyName && !branding.companyTagline && !branding.contactLine) return null

  return (
    <View style={styles.header}>
      {branding.companyName ? <Text style={styles.companyName}>{branding.companyName}</Text> : null}
      {branding.companyTagline ? <Text style={styles.companyTagline}>{branding.companyTagline}</Text> : null}
      {branding.contactLine ? <Text style={styles.contactLine}>{branding.contactLine}</Text> : null}
    </View>
  )
}

function EditorialHeader({ styles, branding, csr }) {
  const showBranding = branding.companyName || branding.companyTagline || branding.contactLine

  return (
    <>
      {showBranding ? (
        <View style={styles.headerWrap}>
          <View style={styles.headerLeft}>
            <View style={styles.markBlock}>
              <Text style={styles.markText}>C</Text>
              <Text style={styles.markText}>S</Text>
              <Text style={styles.markText}>R</Text>
            </View>
            <View style={styles.brandBlock}>
              {branding.companyName ? <Text style={styles.companyName}>{branding.companyName}</Text> : null}
              {branding.companyTagline ? <Text style={styles.companyTagline}>{branding.companyTagline}</Text> : null}
            </View>
          </View>
          <View style={styles.headerRight}>
            {branding.contactLine ? (
              <>
                <Text style={styles.metaSmallLabel}>Contact</Text>
                <Text style={styles.metaSmallValue}>{branding.contactLine}</Text>
              </>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.reportBar}>
        <Text style={styles.reportMain}>Service Report</Text>
        <Text style={styles.reportRef}>{safe(csr.csr_number)}</Text>
      </View>
    </>
  )
}

function ReadingsTable({ styles, csr }) {
  const values = CSR_READING_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    value: csr?.[field.key] ?? '',
  }))

  const hasReadings = values.some((field) => hasText(field.value))
  if (!csr.showOperationalReadings || !hasReadings) return null

  return (
    <PdfSection styles={styles} title="Readings">
      <View style={styles.tableHeader}>
        {values.map((field, index) => (
          <View key={field.key} style={[styles.th, index === values.length - 1 ? styles.thLast : null]}>
            <Text style={styles.thText}>{field.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.tableRow}>
        {values.map((field, index) => (
          <View key={field.key} style={[styles.td, index === values.length - 1 ? styles.tdLast : null]}>
            <Text style={styles.tdText}>{safe(field.value) || ' '}</Text>
          </View>
        ))}
      </View>
    </PdfSection>
  )
}

function StructuredStatusList({ styles, status }) {
  return CSR_STATUS_OPTIONS_PDF.map((option) => {
    const active = status === option
    return (
      <View key={option} style={styles.statusItem}>
        <View style={styles.checkBox}>{active ? <Text style={styles.checkMark}>✓</Text> : null}</View>
        <Text style={styles.statusText}>{option}</Text>
      </View>
    )
  })
}

function EditorialStatusList({ styles, status }) {
  return CSR_STATUS_OPTIONS_PDF.map((option) => {
    const active = status === option
    return (
      <View key={option} style={styles.statusItem}>
        <View style={active ? styles.checkBoxActive : styles.checkBox}>
          {active ? <Text style={styles.checkMark}>✓</Text> : null}
        </View>
        <Text style={styles.statusText}>{option}</Text>
      </View>
    )
  })
}

function StructuredTemplate({ csr, branding, variant }) {
  const theme = buildTheme(variant)
  const styles = createStructuredStyles(theme)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <StructuredHeader styles={styles} branding={branding} />
        <Text style={styles.reportTitle}>Customer Service Report</Text>

        <PdfSection styles={styles} title="Customer Details">
          <View style={styles.row}>
            <InfoCell styles={styles} label="CSR No." value={csr.csr_number} />
            <InfoCell styles={styles} label="Date" value={csr.date} last />
          </View>
          <View style={styles.row}>
            <InfoCell styles={styles} label="Customer Name" value={csr.client_name} last />
          </View>
          <View style={styles.row}>
            <InfoCell styles={styles} label="Address" value={csr.address} last />
          </View>
        </PdfSection>

        {shouldShow(true, csr.problem_reported) ? (
          <PdfSection styles={styles} title="Nature of Problem">
            <View style={styles.blockText}>
              <Text style={styles.label}>Detail Problem Reported</Text>
              <Text style={styles.value}>{safe(csr.problem_reported)}</Text>
            </View>
          </PdfSection>
        ) : null}

        <PdfSection styles={styles} title="Equipment Details">
          <View style={styles.row}>
            <InfoCell styles={styles} label="Equipment Type" value={csr.equipment_type} />
            <InfoCell styles={styles} label="Equipment Location" value={csr.equipment_location} last />
          </View>
          <View style={styles.row}>
            <InfoCell styles={styles} label="Make" value={csr.make} />
            <InfoCell styles={styles} label={csr.modelLabel || 'Model'} value={csr.model} />
            <InfoCell styles={styles} label={csr.serialLabel || 'Serial No.'} value={csr.serial_no} />
            <InfoCell styles={styles} label="Capacity" value={csr.capacity} last />
          </View>
        </PdfSection>

        <ReadingsTable styles={styles} csr={csr} />

        {shouldShow(true, csr.materialsText) ? (
          <PdfSection styles={styles} title="Materials & Parts Used">
            <View style={styles.blockText}>
              <Text style={styles.value}>{safe(csr.materialsText)}</Text>
            </View>
          </PdfSection>
        ) : null}

        <PdfSection styles={styles} title="Service Details">
          <View style={styles.serviceWrap}>
            <View style={styles.serviceMain}>
              <View style={styles.serviceInner}>
                <Text style={styles.label}>Service Rendered</Text>
                <Text style={styles.value}>{safe(csr.service_rendered)}</Text>
              </View>
              <View style={[styles.serviceInner, styles.serviceInnerLast]}>
                <Text style={styles.label}>Technician Remarks</Text>
                <Text style={styles.value}>{safe(csr.technicianRemarks)}</Text>
              </View>
            </View>

            <View style={styles.statusBox}>
              <Text style={styles.statusTitle}>Status after Service</Text>
              {StructuredStatusList({ styles, status: csr.status })}
            </View>
          </View>
        </PdfSection>

        <View style={styles.section}>
          <View style={styles.row}>
            <InfoCell
              styles={styles}
              label="Start of Service"
              value={[csr.start_date, csr.start_time].filter(Boolean).join(' ')}
            />
            <InfoCell
              styles={styles}
              label="End of Service"
              value={[csr.end_date, csr.end_time].filter(Boolean).join(' ')}
              last
            />
          </View>
        </View>

        {csr.showAcknowledgement ? (
          <PdfSection styles={styles} title="Customer Feedback">
            <View style={styles.blockText}>
              <Text style={styles.label}>Remarks</Text>
              <Text style={styles.value}>{safe(csr.customer_feedback)}</Text>
            </View>
            <View style={styles.ackGrid}>
              <View style={styles.ackCell}>
                <Text style={styles.label}>{csr.recipientTitle || 'Name'}</Text>
                <Text style={styles.value}>{safe(csr.acknowledgement_name)}</Text>
                <View style={styles.lineBox}>
                  <Text style={styles.lineHint}>{csr.recipientRole || 'Name / Role'}</Text>
                </View>
              </View>
              <View style={[styles.ackCell, styles.ackCellLast]}>
                <Text style={styles.label}>
                  {csr.showTechnicianSignLine ? 'Technician Sign' : 'Signature'}
                </Text>
                <View style={styles.lineBox}>
                  <Text style={styles.lineHint}>
                    {csr.showTechnicianSignLine ? 'Optional sign' : ' '}
                  </Text>
                </View>
              </View>
            </View>
          </PdfSection>
        ) : null}

        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}

function EditorialTemplate({ csr, branding }) {
  const theme = buildTheme('editorialCompact')
  const styles = createEditorialStyles(theme)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <EditorialHeader styles={styles} branding={branding} csr={csr} />

        <PdfSection styles={styles} title="General Information">
          <View style={[styles.row, styles.rowSplitBottom]}>
            <InfoCell styles={styles} label="CSR Number" value={csr.csr_number} half />
            <InfoCell styles={styles} label="Started" value={[csr.start_date, csr.start_time].filter(Boolean).join(' ')} />
            <InfoCell styles={styles} label="Completed" value={[csr.end_date, csr.end_time].filter(Boolean).join(' ')} last />
          </View>
          <View style={styles.row}>
            <InfoCell styles={styles} label="Client Name" value={csr.client_name} half />
            <InfoCell styles={styles} label="Location" value={csr.address || csr.equipment_location} half last />
          </View>
        </PdfSection>

        <PdfSection styles={styles} title="Equipment Specification">
          <View style={styles.row}>
            <InfoCell styles={styles} label="Make" value={csr.make} />
            <InfoCell styles={styles} label={csr.modelLabel || 'Model'} value={csr.model} />
            <InfoCell styles={styles} label={csr.serialLabel || 'Serial No. / Unit ID'} value={csr.serial_no} />
            <InfoCell styles={styles} label="Capacity" value={csr.capacity} last />
          </View>
        </PdfSection>

        {shouldShow(true, csr.problem_reported || csr.service_rendered || csr.technicianRemarks) ? (
          <PdfSection styles={styles} title="Work Performed & Status">
            <View style={styles.workGrid}>
              <View style={styles.largeTextArea}>
                {shouldShow(true, csr.problem_reported) ? (
                  <>
                    <Text style={styles.scopeTitle}>Problem Reported</Text>
                    <Text style={styles.value}>{safe(csr.problem_reported)}</Text>
                  </>
                ) : null}
                {shouldShow(true, csr.service_rendered) ? (
                  <>
                    <Text style={[styles.scopeTitle, { marginTop: hasText(csr.problem_reported) ? 8 : 0 }]}>Service Rendered</Text>
                    <Text style={styles.value}>{safe(csr.service_rendered)}</Text>
                  </>
                ) : null}
                {shouldShow(true, csr.technicianRemarks) ? (
                  <>
                    <Text style={[styles.scopeTitle, { marginTop: hasText(csr.service_rendered) ? 8 : 0 }]}>Technician Remarks</Text>
                    <Text style={styles.value}>{safe(csr.technicianRemarks)}</Text>
                  </>
                ) : null}
              </View>
              <View style={styles.statusPanel}>
                {EditorialStatusList({ styles, status: csr.status })}
              </View>
            </View>
          </PdfSection>
        ) : null}

        <ReadingsTable styles={styles} csr={csr} />

        {shouldShow(true, csr.materialsText) ? (
          <PdfSection styles={styles} title="Materials & Parts Used">
            <View style={styles.blockText}>
              <Text style={styles.value}>{safe(csr.materialsText)}</Text>
            </View>
          </PdfSection>
        ) : null}

        {csr.showAcknowledgement ? (
          <PdfSection styles={styles} title="Customer Feedback">
            <View style={styles.blockText}>
              <Text style={styles.label}>Remarks</Text>
              <Text style={styles.value}>{safe(csr.customer_feedback)}</Text>
            </View>
            <View style={styles.ackGrid}>
              <View style={styles.ackCell}>
                <Text style={styles.label}>{csr.recipientTitle || 'Name'}</Text>
                <Text style={styles.value}>{safe(csr.acknowledgement_name)}</Text>
                <View style={styles.lineBox}>
                  <Text style={styles.lineHint}>{csr.recipientRole || 'Name / Role'}</Text>
                </View>
              </View>
              <View style={[styles.ackCell, styles.ackCellLast]}>
                <Text style={styles.label}>
                  {csr.showTechnicianSignLine ? 'Technician Sign' : 'Signature'}
                </Text>
                <View style={styles.lineBox}>
                  <Text style={styles.lineHint}>
                    {csr.showTechnicianSignLine ? 'Optional sign' : ' '}
                  </Text>
                </View>
              </View>
            </View>
          </PdfSection>
        ) : null}

        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}

export function Template1({ csr, branding = {} }) {
  return <StructuredTemplate csr={csr} branding={getBranding(branding)} variant="classic" />
}

export function Template2({ csr, branding = {} }) {
  return <StructuredTemplate csr={csr} branding={getBranding(branding)} variant="minimal" />
}

export function Template3({ csr, branding = {} }) {
  return <StructuredTemplate csr={csr} branding={getBranding(branding)} variant="modern" />
}

export function Template4({ csr, branding = {} }) {
  return <StructuredTemplate csr={csr} branding={getBranding(branding)} variant="classicCompact" />
}

export function Template5({ csr, branding = {} }) {
  return <EditorialTemplate csr={csr} branding={getBranding(branding)} />
}

export function getCsrPdfDocument({ csr, branding = {}, template = '3' }) {
  const variant = getCsrTemplateVariant(template)

  if (variant === 'classic') return <Template1 csr={csr} branding={branding} />
  if (variant === 'minimal') return <Template2 csr={csr} branding={branding} />
  if (variant === 'classicCompact') return <Template4 csr={csr} branding={branding} />
  if (variant === 'editorialCompact') return <Template5 csr={csr} branding={branding} />
  return <Template3 csr={csr} branding={branding} />
}