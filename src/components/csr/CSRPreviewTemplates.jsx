import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  CSR_READING_FIELDS,
  CSR_STATUS_OPTIONS_PDF,
  getCsrTemplateVariant,
} from './CSRPreviewContent'

const safe = (value) => String(value || '').trim()
const hasText = (value) => !!safe(value)

function shouldRender(enabled, value) {
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

function getStatusValue(csr) {
  return safe(csr.status)
}

function getServiceWindow(csr) {
  return {
    startDate: safe(csr.start_date),
    startTime: safe(csr.start_time),
    endDate: safe(csr.end_date),
    endTime: safe(csr.end_time),
  }
}

function buildReadingRows(csr) {
  return CSR_READING_FIELDS.map(({ key, label }) => ({
    key,
    label,
    value: safe(csr[key]),
  }))
}

function PdfField({ styles, label, value }) {
  return (
    <View style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{hasText(value) ? value : ' '}</Text>
    </View>
  )
}

function PdfTextBlock({ styles, label, value, minHeight = 34 }) {
  return (
    <View style={[styles.blockCard, { minHeight }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.blockText}>{hasText(value) ? value : ' '}</Text>
    </View>
  )
}

function PdfSectionTitle({ styles, title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>
}

function PdfSection({ styles, title, children }) {
  return (
    <View style={styles.section}>
      <PdfSectionTitle styles={styles} title={title} />
      {children}
    </View>
  )
}

function PdfLogoSlot({ styles, branding, fallback = 'LOGO' }) {
  return (
    <View style={styles.logoSlot}>
      <Text style={styles.logoSlotText}>
        {hasText(branding.companyName) ? branding.companyName.charAt(0).toUpperCase() : fallback}
      </Text>
    </View>
  )
}

function PdfBrandBlock({ styles, branding }) {
  return (
    <View style={styles.brandBlock}>
      {branding.companyName ? <Text style={styles.companyName}>{branding.companyName}</Text> : null}
      {branding.companyTagline ? <Text style={styles.companyTagline}>{branding.companyTagline}</Text> : null}
      {branding.contactLine ? <Text style={styles.contactLine}>{branding.contactLine}</Text> : null}
    </View>
  )
}

function StatusListDots({ styles, status }) {
  return (
    <View style={styles.statusGrid}>
      {CSR_STATUS_OPTIONS_PDF.map((option) => {
        const active = status === option
        return (
          <View key={option} style={styles.statusItem}>
            <View style={[styles.statusDot, active ? styles.statusDotActive : null]} />
            <Text style={styles.statusText}>{option}</Text>
          </View>
        )
      })}
    </View>
  )
}

function StatusListChecks({ styles, status }) {
  return (
    <View style={styles.statusGrid}>
      {CSR_STATUS_OPTIONS_PDF.map((option) => {
        const active = status === option
        return (
          <View key={option} style={styles.statusItem}>
            <View style={[styles.checkBox, active ? styles.checkBoxActive : null]}>
              {active ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.statusText}>{option}</Text>
          </View>
        )
      })}
    </View>
  )
}

function ReadingsCardGrid({ styles, csr }) {
  const rows = buildReadingRows(csr)
  const hasReadings = rows.some((row) => hasText(row.value))
  if (!csr.showOperationalReadings || !hasReadings) return null

  return (
    <PdfSection styles={styles} title="Readings">
      <View style={styles.readingGrid}>
        {rows.map((row) => (
          <View key={row.key} style={styles.readingCard}>
            <Text style={styles.readingLabel}>{row.label}</Text>
            <Text style={styles.readingValue}>{row.value || ' '}</Text>
          </View>
        ))}
      </View>
    </PdfSection>
  )
}

function ReadingsStrip({ styles, csr }) {
  const rows = buildReadingRows(csr)
  const hasReadings = rows.some((row) => hasText(row.value))
  if (!csr.showOperationalReadings || !hasReadings) return null

  return (
    <PdfSection styles={styles} title="Readings">
      <View style={styles.readingStrip}>
        {rows.map((row, index) => (
          <View
            key={row.key}
            style={[styles.readingStripCell, index === rows.length - 1 ? styles.readingStripCellLast : null]}
          >
            <Text style={styles.readingValue}>{row.value || ' '}</Text>
            <Text style={styles.readingLabel}>{row.label}</Text>
          </View>
        ))}
      </View>
    </PdfSection>
  )
}

function MaterialsPills({ styles, csr }) {
  if (!shouldRender(true, csr.materialsText)) return null

  const items = safe(csr.materialsText)
    .split(/[,\u00b7]/)
    .map((part) => part.trim())
    .filter(Boolean)

  return (
    <PdfSection styles={styles} title="Materials Used">
      <View style={styles.pillsWrap}>
        {(items.length ? items : [csr.materialsText]).map((item, index) => (
          <View key={`${item}-${index}`} style={styles.pill}>
            <Text style={styles.pillText}>{item}</Text>
          </View>
        ))}
      </View>
    </PdfSection>
  )
}

function MaterialsTable({ styles, csr }) {
  if (!shouldRender(true, csr.materialsRows)) {
    if (!shouldRender(true, csr.materialsText)) return null
  }

  const rows =
    Array.isArray(csr.materialsRows) && csr.materialsRows.some((row) => row.item || row.quantity || row.unit)
      ? csr.materialsRows.filter((row) => row.item || row.quantity || row.unit)
      : [{ item: csr.materialsText || ' ', quantity: '', unit: '' }]

  return (
    <PdfSection styles={styles} title="Materials Used">
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHead, { flex: 1.8 }]}>Description</Text>
        <Text style={[styles.tableHead, { flex: 0.6 }]}>Qty</Text>
        <Text style={[styles.tableHead, { flex: 0.8, borderRightWidth: 0 }]}>Unit</Text>
      </View>
      {rows.map((row, index) => (
        <View key={`${row.item}-${index}`} style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1.8 }]}>{safe(row.item) || ' '}</Text>
          <Text style={[styles.tableCell, { flex: 0.6 }]}>{safe(row.quantity) || ' '}</Text>
          <Text style={[styles.tableCell, { flex: 0.8, borderRightWidth: 0 }]}>{safe(row.unit) || ' '}</Text>
        </View>
      ))}
    </PdfSection>
  )
}

function AcknowledgementBlock({ styles, csr }) {
  if (!csr.showAcknowledgement) return null

  return (
    <PdfSection styles={styles} title="Acknowledgement">
      <View style={styles.ackGrid}>
        <PdfField styles={styles} label="Customer Name" value={csr.acknowledgement_name} />
        <PdfField styles={styles} label="Recipient Title" value={csr.recipientTitle} />
        <PdfField styles={styles} label="Recipient Role" value={csr.recipientRole} />
        <PdfField styles={styles} label="Signature" value="________________" />
      </View>

      <View style={styles.signRow}>
        {csr.showTechnicianSignLine ? (
          <View style={styles.signCard}>
            <View style={styles.signSpace} />
            <Text style={styles.signLabel}>Technician Sign Line</Text>
          </View>
        ) : null}

        <View style={styles.signCard}>
          <View style={styles.signSpace} />
          <Text style={styles.signLabel}>Customer Sign Line</Text>
        </View>
      </View>
    </PdfSection>
  )
}

function StructuredTopIdentity({ styles, csr, branding }) {
  return (
    <>
      <View style={styles.headerRow}>
        <PdfBrandBlock styles={styles} branding={branding} />

        <View style={styles.identityCard}>
          <View style={styles.identityGrid}>
            <View>
              <Text style={styles.metaLabel}>CSR Number</Text>
              <Text style={styles.metaValue}>{safe(csr.csr_number)}</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{safe(csr.date)}</Text>
            </View>
            {csr.show_po && hasText(csr.po_number) ? (
              <View style={styles.identityFull}>
                <Text style={styles.metaLabel}>P.O. Number</Text>
                <Text style={styles.metaValue}>{safe(csr.po_number)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </>
  )
}

function ServiceTimeSection({ styles, csr }) {
  const w = getServiceWindow(csr)
  return (
    <PdfSection styles={styles} title="Service Time">
      <View style={styles.grid4}>
        <PdfField styles={styles} label="Start Date" value={w.startDate} />
        <PdfField styles={styles} label="Start Time" value={w.startTime} />
        <PdfField styles={styles} label="End Date" value={w.endDate} />
        <PdfField styles={styles} label="End Time" value={w.endTime} />
      </View>
    </PdfSection>
  )
}

function CustomerFeedbackSection({ styles, csr }) {
  if (!shouldRender(true, csr.customer_feedback)) return null
  return (
    <PdfSection styles={styles} title="Customer Feedback">
      <View style={styles.textAreaOnly}>
        <Text style={styles.blockText}>{safe(csr.customer_feedback)}</Text>
      </View>
    </PdfSection>
  )
}

function SharedProblemSection({ styles, csr, title = 'Problem Reported' }) {
  if (!shouldRender(true, csr.problem_reported)) return null
  return (
    <PdfSection styles={styles} title={title}>
      <View style={styles.textAreaOnly}>
        <Text style={styles.blockText}>{safe(csr.problem_reported)}</Text>
      </View>
    </PdfSection>
  )
}

function SharedEquipmentSection({ styles, csr }) {
  return (
    <PdfSection styles={styles} title="Equipment Information">
      <View style={styles.grid4}>
        <PdfField styles={styles} label="Equipment Type" value={csr.equipment_type} />
        <PdfField styles={styles} label="Equipment Location" value={csr.equipment_location} />
        <PdfField styles={styles} label="Make" value={csr.make} />
        <PdfField styles={styles} label={csr.modelLabel || 'Model'} value={csr.model} />
        <PdfField styles={styles} label={csr.serialLabel || 'Serial Number'} value={csr.serial_no} span={2} />
        <PdfField styles={styles} label="Capacity" value={csr.capacity} />
        <PdfField styles={styles} label="Hours" value={csr.hours} />
      </View>
    </PdfSection>
  )
}

/* ---------------- PulseFrame ---------------- */

function createPulseFrameStyles() {
  return StyleSheet.create({
    page: {
      paddingTop: 16,
      paddingBottom: 16,
      paddingHorizontal: 16,
      backgroundColor: '#ffffff',
      color: '#14213d',
      fontFamily: 'Helvetica',
      fontSize: 9,
    },
    topWrap: {
      backgroundColor: '#0f172a',
      paddingTop: 12,
      paddingBottom: 40,
      paddingHorizontal: 14,
      borderRadius: 12,
      marginBottom: 0,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    brandBlock: { flex: 1 },
    companyName: { fontSize: 16, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    companyTagline: { fontSize: 7.4, color: '#ffffff', marginTop: 2 },
    contactLine: { fontSize: 6.6, color: '#E2E8F0', marginTop: 3, lineHeight: 1.2 },
    identityCard: {
      width: 198,
      backgroundColor: '#ffffff20',
      borderWidth: 1,
      borderColor: '#ffffff40',
      borderRadius: 12,
      padding: 8,
    },
    identityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    identityFull: { width: '100%' },
    metaLabel: { fontSize: 6.5, color: '#E2E8F0', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    metaValue: { fontSize: 9, color: '#ffffff', fontFamily: 'Helvetica-Bold', marginTop: 2 },

    summaryRow: {
      marginTop: -26,
      marginBottom: 8,
      flexDirection: 'row',
      gap: 6,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#dbeafe',
      borderRadius: 12,
      padding: 8,
    },
    fieldLabel: { fontSize: 6.5, textTransform: 'uppercase', color: '#64748b', fontFamily: 'Helvetica-Bold', marginBottom: 3 },
    fieldValue: { fontSize: 9.5, color: '#0f172a', fontFamily: 'Helvetica-Bold', lineHeight: 1.2 },
    blockText: { fontSize: 8.5, color: '#1e293b', lineHeight: 1.5 },
    section: {
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#dbe7f5',
      borderRadius: 14,
      overflow: 'hidden',
    },
    sectionTitle: {
      paddingVertical: 5,
      paddingHorizontal: 8,
      color: '#ffffff',
      backgroundColor: '#1d4ed8',
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
    },
    grid4: { flexDirection: 'row', flexWrap: 'wrap' },
    grid2: { flexDirection: 'row' },
    fieldCard: {
      width: '25%',
      paddingVertical: 6,
      paddingHorizontal: 7,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#e2e8f0',
      minHeight: 42,
    },
    blockCard: { paddingVertical: 8, paddingHorizontal: 8, minHeight: 42 },
    readingGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 4 },
    readingCard: {
      width: '15.5%',
      backgroundColor: '#eff6ff',
      borderWidth: 1,
      borderColor: '#bfdbfe',
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 5,
      alignItems: 'center',
    },
    readingLabel: { fontSize: 6.1, color: '#475569', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 2, textAlign: 'center' },
    readingValue: { fontSize: 10, color: '#0f172a', fontFamily: 'Helvetica-Bold' },
    pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 8 },
    pill: {
      paddingVertical: 4,
      paddingHorizontal: 7,
      backgroundColor: '#dbeafe',
      borderWidth: 1,
      borderColor: '#93c5fd',
      borderRadius: 999,
    },
    pillText: { fontSize: 7.5, color: '#1d4ed8', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    serviceGrid: { flexDirection: 'row' },
    serviceCard: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRightWidth: 1,
      borderColor: '#e2e8f0',
      minHeight: 70,
    },
    statusGrid: { padding: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    statusItem: {
      width: '31%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: '#dbeafe',
      borderRadius: 10,
      paddingVertical: 5,
      paddingHorizontal: 6,
      backgroundColor: '#f8fbff',
    },
    statusDot: { width: 8, height: 8, borderRadius: 99, borderWidth: 1.5, borderColor: '#94a3b8', backgroundColor: '#ffffff' },
    statusDotActive: { borderColor: '#1d4ed8', backgroundColor: '#1d4ed8' },
    statusText: { fontSize: 6.8, color: '#0f172a', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    textAreaOnly: { padding: 8, minHeight: 40 },
    ackGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    signRow: { flexDirection: 'row', gap: 8, padding: 8 },
    signCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#dbe7f5',
      borderRadius: 12,
      padding: 8,
    },
    signSpace: { height: 20, borderBottomWidth: 1.5, borderBottomColor: '#93c5fd', borderStyle: 'dashed', marginBottom: 4 },
    signLabel: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    footer: {
      marginTop: 4,
      backgroundColor: '#0f172a',
      color: '#ffffff',
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: 10,
      fontSize: 6.8,
      lineHeight: 1.2,
    },
  })
}

function PulseFrameTemplate({ csr, branding }) {
  const styles = createPulseFrameStyles()
  const status = getStatusValue(csr)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topWrap}>
          <StructuredTopIdentity styles={styles} csr={csr} branding={branding} />
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.fieldLabel}>Client Name</Text>
            <Text style={styles.fieldValue}>{safe(csr.client_name)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.fieldLabel}>Address</Text>
            <Text style={styles.fieldValue}>{safe(csr.address)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.fieldLabel}>Start Date</Text>
            <Text style={styles.fieldValue}>{safe(csr.start_date)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.fieldLabel}>End Date</Text>
            <Text style={styles.fieldValue}>{safe(csr.end_date)}</Text>
          </View>
        </View>

        <SharedProblemSection styles={styles} csr={csr} />
        <SharedEquipmentSection styles={styles} csr={csr} />
        <ReadingsCardGrid styles={styles} csr={csr} />

        <PdfSection styles={styles} title="Service & Materials">
          <View style={styles.serviceGrid}>
            <View style={styles.serviceCard}>
              <Text style={styles.fieldLabel}>Service Rendered</Text>
              <Text style={styles.blockText}>{safe(csr.service_rendered)}</Text>
            </View>
            <View style={styles.serviceCard}>
              <Text style={styles.fieldLabel}>Technician Remarks</Text>
              <Text style={styles.blockText}>{safe(csr.technicianRemarks)}</Text>
            </View>
          </View>
          {shouldRender(true, csr.materialsText) ? <MaterialsPills styles={styles} csr={csr} /> : null}
        </PdfSection>

        <PdfSection styles={styles} title="Status">
          <StatusListDots styles={styles} status={status} />
        </PdfSection>

        <ServiceTimeSection styles={styles} csr={csr} />
        <CustomerFeedbackSection styles={styles} csr={csr} />
        <AcknowledgementBlock styles={styles} csr={csr} />

        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}

/* ---------------- SignalBands ---------------- */

function createSignalBandsStyles() {
  return StyleSheet.create({
    page: {
      paddingTop: 14,
      paddingBottom: 14,
      paddingHorizontal: 14,
      backgroundColor: '#fffdfa',
      color: '#231f20',
      fontFamily: 'Helvetica',
      fontSize: 8.5,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      backgroundColor: '#7f1d1d',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 8,
    },
    brandBlock: { flex: 1 },
    companyName: { fontSize: 16, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    companyTagline: { fontSize: 7.2, color: '#FDE68A', marginTop: 2 },
    contactLine: { fontSize: 6.6, color: '#ffffff', marginTop: 3, lineHeight: 1.2 },
    identityCard: {
      width: 200,
      backgroundColor: '#ffffff22',
      borderWidth: 1,
      borderColor: '#ffffff33',
      borderRadius: 10,
      padding: 8,
    },
    identityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    identityFull: { width: '100%' },
    metaLabel: { fontSize: 6.4, color: '#FDECEC', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    metaValue: { fontSize: 8.8, color: '#ffffff', fontFamily: 'Helvetica-Bold', marginTop: 2 },

    band: {
      flexDirection: 'row',
      marginBottom: 6,
      borderWidth: 1,
      borderColor: '#e7d7c8',
      borderRadius: 12,
      overflow: 'hidden',
    },
    bandKey: {
      width: 112,
      paddingVertical: 8,
      paddingHorizontal: 8,
      justifyContent: 'center',
    },
    bandKeyRed: { backgroundColor: '#991b1b' },
    bandKeyGold: { backgroundColor: '#92400e' },
    bandKeyCharcoal: { backgroundColor: '#1f2937' },
    bandKeyTeal: { backgroundColor: '#0f766e' },
    bandKeyTitle: { color: '#ffffff', fontSize: 7.2, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 2 },
    bandKeySub: { color: '#ffffff', fontSize: 6.4, lineHeight: 1.15 },
    bandMain: { flex: 1, backgroundColor: '#fffdfa' },

    sectionTitle: { display: 'none' },
    section: {},

    grid4: { flexDirection: 'row', flexWrap: 'wrap' },
    fieldCard: {
      width: '25%',
      paddingVertical: 7,
      paddingHorizontal: 8,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#eee3d7',
      minHeight: 44,
      backgroundColor: '#fffdfa',
    },
    fieldLabel: { fontSize: 6.5, color: '#78716c', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 3 },
    fieldValue: { fontSize: 9.5, color: '#231f20', fontFamily: 'Helvetica-Bold', lineHeight: 1.2 },
    blockCard: { paddingVertical: 8, paddingHorizontal: 10, minHeight: 42 },
    blockText: { fontSize: 8.5, color: '#292524', lineHeight: 1.4 },

    readingStrip: {
      flexDirection: 'row',
      backgroundColor: '#fffdfa',
    },
    readingStripCell: {
      flex: 1,
      paddingVertical: 7,
      paddingHorizontal: 4,
      borderRightWidth: 1,
      borderColor: '#eee3d7',
      alignItems: 'center',
    },
    readingStripCellLast: { borderRightWidth: 0 },
    readingLabel: { fontSize: 6.1, color: '#78716c', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginTop: 2, textAlign: 'center' },
    readingValue: { fontSize: 10, color: '#231f20', fontFamily: 'Helvetica-Bold' },

    pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 8 },
    pill: {
      paddingVertical: 4,
      paddingHorizontal: 7,
      backgroundColor: '#ffedd5',
      borderWidth: 1,
      borderColor: '#fdba74',
      borderRadius: 999,
    },
    pillText: { fontSize: 7.2, color: '#9a3412', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },

    statusGrid: {
      padding: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    statusItem: {
      width: '31%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#eadfd1',
      backgroundColor: '#ffffff',
    },
    checkBox: {
      width: 10,
      height: 10,
      borderWidth: 1.2,
      borderColor: '#b9ada1',
      borderRadius: 3,
      backgroundColor: '#ffffff',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkBoxActive: {
      width: 10,
      height: 10,
      borderWidth: 1.2,
      borderColor: '#15803d',
      borderRadius: 3,
      backgroundColor: '#15803d',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkMark: { color: '#ffffff', fontSize: 7, fontFamily: 'Helvetica-Bold' },
    statusText: { fontSize: 6.8, color: '#231f20', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },

    textAreaOnly: { padding: 8, minHeight: 38 },
    ackGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    signRow: { flexDirection: 'row', gap: 8, padding: 8 },
    signCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#e7d7c8',
      borderRadius: 12,
      padding: 8,
      backgroundColor: '#ffffff',
    },
    signSpace: {
      height: 20,
      borderBottomWidth: 1.5,
      borderBottomColor: '#d6bfa6',
      borderStyle: 'dashed',
      marginBottom: 4,
    },
    signLabel: { fontSize: 7, color: '#78716c', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },

    footer: {
      marginTop: 4,
      backgroundColor: '#1f2937',
      color: '#ffffff',
      borderRadius: 10,
      paddingVertical: 5,
      paddingHorizontal: 8,
      fontSize: 6.8,
      lineHeight: 1.2,
    },
  })
}

function SignalBandsTemplate({ csr, branding }) {
  const styles = createSignalBandsStyles()
  const status = getStatusValue(csr)

  const Band = ({ colorStyle, title, sub, children }) => (
    <View style={styles.band}>
      <View style={[styles.bandKey, colorStyle]}>
        <Text style={styles.bandKeyTitle}>{title}</Text>
        <Text style={styles.bandKeySub}>{sub}</Text>
      </View>
      <View style={styles.bandMain}>{children}</View>
    </View>
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <StructuredTopIdentity styles={styles} csr={csr} branding={branding} />

        <Band
          colorStyle={styles.bandKeyRed}
          title="Client Info"
          sub="Ownership, location, and service timing snapshot."
        >
          <View style={styles.grid4}>
            <PdfField styles={styles} label="Client Name" value={csr.client_name} />
            <View style={[styles.fieldCard, { width: '50%' }]}>
              <Text style={styles.fieldLabel}>Address</Text>
              <Text style={styles.fieldValue}>{safe(csr.address)}</Text>
            </View>
            {csr.show_po && hasText(csr.po_number) ? (
              <PdfField styles={styles} label="P.O. Number" value={csr.po_number} />
            ) : (
              <PdfField styles={styles} label="Date" value={csr.date} />
            )}
          </View>
        </Band>

        {shouldRender(true, csr.problem_reported) ? (
          <Band colorStyle={styles.bandKeyCharcoal} title="Problem" sub="Original complaint as reported by client.">
            <View style={styles.textAreaOnly}>
              <Text style={styles.blockText}>{safe(csr.problem_reported)}</Text>
            </View>
          </Band>
        ) : null}

        <Band colorStyle={styles.bandKeyGold} title="Equipment" sub="Registered asset, location, and technical identity.">
          <SharedEquipmentSection styles={styles} csr={csr} />
        </Band>

        {csr.showOperationalReadings ? (
          <Band colorStyle={styles.bandKeyTeal} title="Readings" sub="Field values captured during attendance.">
            <ReadingsStrip styles={styles} csr={csr} />
          </Band>
        ) : null}

        <Band colorStyle={styles.bandKeyRed} title="Service" sub="Work execution and technician observations.">
          <View style={{ flexDirection: 'row' }}>
            <View style={[styles.fieldCard, { width: '50%', minHeight: 74 }]}>
              <Text style={styles.fieldLabel}>Service Rendered</Text>
              <Text style={styles.blockText}>{safe(csr.service_rendered)}</Text>
            </View>
            <View style={[styles.fieldCard, { width: '50%', minHeight: 74, borderRightWidth: 0 }]}>
              <Text style={styles.fieldLabel}>Technician Remarks</Text>
              <Text style={styles.blockText}>{safe(csr.technicianRemarks)}</Text>
            </View>
          </View>
        </Band>

        {shouldRender(true, csr.materialsText) ? (
          <Band colorStyle={styles.bandKeyGold} title="Materials" sub="Consumables and replaced items used on site.">
            <MaterialsPills styles={styles} csr={csr} />
          </Band>
        ) : null}

        <Band colorStyle={styles.bandKeyCharcoal} title="Status" sub="Operational outcome and support state.">
          <StatusListChecks styles={styles} status={status} />
        </Band>

        <Band colorStyle={styles.bandKeyTeal} title="Service Time" sub="Attendance start and close timestamps.">
          <ServiceTimeSection styles={styles} csr={csr} />
        </Band>

        {shouldRender(true, csr.customer_feedback) ? (
          <Band colorStyle={styles.bandKeyRed} title="Feedback" sub="Customer response after job completion.">
            <CustomerFeedbackSection styles={styles} csr={csr} />
          </Band>
        ) : null}

        {csr.showAcknowledgement ? (
          <Band colorStyle={styles.bandKeyCharcoal} title="Acknowledgement" sub="Recipient identity, approval, and signature fields.">
            <AcknowledgementBlock styles={styles} csr={csr} />
          </Band>
        ) : null}

        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}

/* ---------------- Zinc ---------------- */

function createZincStyles() {
  return StyleSheet.create({
    page: {
      paddingTop: 16,
      paddingBottom: 16,
      paddingHorizontal: 16,
      backgroundColor: '#ffffff',
      color: '#09090b',
      fontFamily: 'Helvetica',
      fontSize: 8.5,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    brandBlock: { flex: 1 },
    companyName: { fontSize: 16, color: '#09090b', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    companyTagline: { fontSize: 7, color: '#71717a', marginTop: 3, textTransform: 'uppercase' },
    contactLine: { fontSize: 7, color: '#71717a', marginTop: 3 },
    idBox: { alignItems: 'flex-end' },
    idLabel: { fontSize: 6.5, color: '#71717a', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    idValue: { fontSize: 12, color: '#09090b', fontFamily: 'Courier-Bold', marginTop: 2 },
    idDate: { fontSize: 7.5, color: '#71717a', marginTop: 4 },
    section: { marginBottom: 10 },
    sectionTitle: {
      fontSize: 7.5,
      color: '#09090b',
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      borderBottomWidth: 1.5,
      borderBottomColor: '#09090b',
      paddingBottom: 4,
      marginBottom: 6,
    },
    fieldCard: { width: '33.33%', paddingRight: 8, marginBottom: 6 },
    fieldLabel: { fontSize: 6.5, color: '#71717a', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 3 },
    fieldValue: { fontSize: 9, color: '#09090b', fontFamily: 'Helvetica-Bold', lineHeight: 1.2 },
    grid3: { flexDirection: 'row', flexWrap: 'wrap' },
    grid4: { flexDirection: 'row', flexWrap: 'wrap' },
    blockCard: {
      paddingVertical: 7,
      paddingHorizontal: 8,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e4e4e7',
      borderRadius: 4,
      minHeight: 36,
    },
    blockText: { fontSize: 8.4, color: '#09090b', lineHeight: 1.45 },
    readingStrip: {
      flexDirection: 'row',
      backgroundColor: '#f4f4f5',
      borderWidth: 1,
      borderColor: '#e4e4e7',
      borderRadius: 6,
      paddingVertical: 8,
      paddingHorizontal: 6,
    },
    readingStripCell: {
      flex: 1,
      alignItems: 'center',
      borderRightWidth: 1,
      borderColor: '#e4e4e7',
    },
    readingStripCellLast: { borderRightWidth: 0 },
    readingLabel: { fontSize: 6.2, color: '#71717a', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginTop: 3 },
    readingValue: { fontSize: 9.5, color: '#09090b', fontFamily: 'Courier-Bold' },
    lifecycleBox: {
      backgroundColor: '#09090b',
      borderRadius: 6,
      paddingVertical: 10,
      paddingHorizontal: 10,
      marginTop: 4,
    },
    lifecycleNodes: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    lifecycleNode: {
      width: '18%',
      alignItems: 'center',
    },
    lifecycleDot: {
      width: 10,
      height: 10,
      borderRadius: 99,
      backgroundColor: '#3f3f46',
      marginBottom: 6,
    },
    lifecycleDotPast: { backgroundColor: '#71717a' },
    lifecycleDotActive: { backgroundColor: '#ffffff' },
    lifecycleLabel: { fontSize: 6.1, color: '#a1a1aa', textAlign: 'center' },
    lifecycleLabelActive: { color: '#ffffff' },
    lifecycleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    lifecycleCurrentLabel: { fontSize: 6.4, color: '#a1a1aa', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    lifecycleCurrentText: { fontSize: 8.5, color: '#ffffff', fontFamily: 'Helvetica-Bold', marginTop: 2 },
    lifecycleBadge: { backgroundColor: '#ffffff', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 },
    lifecycleBadgeText: { fontSize: 6.6, color: '#000000', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },

    tableHeaderRow: {
      flexDirection: 'row',
      borderBottomWidth: 1.5,
      borderBottomColor: '#e4e4e7',
      paddingBottom: 4,
      marginBottom: 2,
    },
    tableHead: {
      fontSize: 6.5,
      color: '#71717a',
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
      paddingVertical: 3,
      paddingHorizontal: 3,
      borderRightWidth: 1,
      borderRightColor: '#e4e4e7',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f1f1',
    },
    tableCell: {
      fontSize: 8,
      color: '#09090b',
      fontFamily: 'Helvetica-Bold',
      paddingVertical: 5,
      paddingHorizontal: 3,
      borderRightWidth: 1,
      borderRightColor: '#f1f1f1',
    },
    textAreaOnly: { paddingTop: 4 },
    ackGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
    signRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    signCard: { flex: 1 },
    signSpace: { height: 20, borderBottomWidth: 1.5, borderBottomColor: '#09090b', marginBottom: 4 },
    signLabel: { fontSize: 6.5, color: '#71717a', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    footer: { marginTop: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e4e4e7', fontSize: 6.4, color: '#71717a', textAlign: 'center' },
    statusGrid: { display: 'none' },
    statusItem: {},
    statusText: {},
  })
}

function ZincTemplate({ csr, branding }) {
  const styles = createZincStyles()
  const status = getStatusValue(csr)
  const stages = ['Arrival', 'Diagnostic', 'Repair', 'Observation', 'Handover']
  const activeIndex = status === 'Working solution provided' || status === 'Under observation'
    ? 3
    : status === 'Complete'
    ? 4
    : status === 'Pending for spares' || status === 'Incomplete'
    ? 2
    : 1

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerTop}>
          <PdfBrandBlock styles={styles} branding={branding} />
          <View style={styles.idBox}>
            <Text style={styles.idLabel}>Service Report</Text>
            <Text style={styles.idValue}>{safe(csr.csr_number)}</Text>
            <Text style={styles.idDate}>{safe(csr.date)}</Text>
          </View>
        </View>

        <PdfSection styles={styles} title="Client & Deployment Details">
          <View style={styles.grid3}>
            <PdfField styles={styles} label="Client Name" value={csr.client_name} />
            <View style={[styles.fieldCard, { width: '66.66%' }]}>
              <Text style={styles.fieldLabel}>Site Address</Text>
              <Text style={styles.fieldValue}>{safe(csr.address)}</Text>
            </View>
            {csr.show_po && hasText(csr.po_number) ? (
              <PdfField styles={styles} label="P.O. Number" value={csr.po_number} />
            ) : null}
            <PdfField
              styles={styles}
              label="Service Window (Start)"
              value={[csr.start_date, csr.start_time].filter(Boolean).join(' // ')}
            />
            <PdfField
              styles={styles}
              label="Service Window (End)"
              value={[csr.end_date, csr.end_time].filter(Boolean).join(' // ')}
            />
          </View>
        </PdfSection>

        <PdfSection styles={styles} title="Asset Identity & Telemetry">
          <View style={styles.grid4}>
            <View style={[styles.fieldCard, { width: '25%' }]}><Text style={styles.fieldLabel}>Equipment Type</Text><Text style={styles.fieldValue}>{safe(csr.equipment_type)}</Text></View>
            <View style={[styles.fieldCard, { width: '25%' }]}><Text style={styles.fieldLabel}>Make/Model</Text><Text style={styles.fieldValue}>{[safe(csr.make), safe(csr.model)].filter(Boolean).join(' ')}</Text></View>
            <View style={[styles.fieldCard, { width: '25%' }]}><Text style={styles.fieldLabel}>Serial No.</Text><Text style={styles.fieldValue}>{safe(csr.serial_no)}</Text></View>
            <View style={[styles.fieldCard, { width: '25%' }]}><Text style={styles.fieldLabel}>Capacity</Text><Text style={styles.fieldValue}>{safe(csr.capacity)}</Text></View>
            <View style={[styles.fieldCard, { width: '100%' }]}><Text style={styles.fieldLabel}>Equipment Location</Text><Text style={styles.fieldValue}>{safe(csr.equipment_location)}</Text></View>
          </View>
          <ReadingsStrip styles={styles} csr={csr} />
        </PdfSection>

        <PdfSection styles={styles} title="Technical Narrative">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <PdfTextBlock styles={styles} label="Problem Reported" value={csr.problem_reported} />
            </View>
            <View style={{ flex: 1 }}>
              <PdfTextBlock styles={styles} label="Service Rendered" value={csr.service_rendered} />
            </View>
          </View>
          {shouldRender(true, csr.technicianRemarks) ? (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.fieldLabel}>Technician Remarks</Text>
              <View style={[styles.blockCard, { backgroundColor: '#f4f4f5' }]}>
                <Text style={styles.blockText}>{safe(csr.technicianRemarks)}</Text>
              </View>
            </View>
          ) : null}
        </PdfSection>

        <PdfSection styles={styles} title="Service Lifecycle Position">
          <View style={styles.lifecycleBox}>
            <View style={styles.lifecycleNodes}>
              {stages.map((stage, index) => {
                const past = index < activeIndex
                const active = index === activeIndex
                return (
                  <View key={stage} style={styles.lifecycleNode}>
                    <View
                      style={[
                        styles.lifecycleDot,
                        past ? styles.lifecycleDotPast : null,
                        active ? styles.lifecycleDotActive : null,
                      ]}
                    />
                    <Text style={[styles.lifecycleLabel, active ? styles.lifecycleLabelActive : null]}>
                      {stage}
                    </Text>
                  </View>
                )
              })}
            </View>
            <View style={styles.lifecycleFooter}>
              <View>
                <Text style={styles.lifecycleCurrentLabel}>Current Status</Text>
                <Text style={styles.lifecycleCurrentText}>{status || 'Pending'}</Text>
              </View>
              <View style={styles.lifecycleBadge}>
                <Text style={styles.lifecycleBadgeText}>
                  {status === 'Working solution provided' ? 'Under Observation' : status || 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        </PdfSection>

        {shouldRender(true, csr.materialsText) || shouldRender(true, csr.customer_feedback) ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <MaterialsTable styles={styles} csr={csr} />
            </View>
            {shouldRender(true, csr.customer_feedback) ? (
              <View style={{ flex: 1 }}>
                <PdfSection styles={styles} title="Customer Feedback">
                  <View style={[styles.blockCard, { borderStyle: 'dashed' }]}>
                    <Text style={styles.blockText}>{safe(csr.customer_feedback)}</Text>
                  </View>
                </PdfSection>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.ackGrid}>
          {csr.showTechnicianSignLine ? (
            <View style={styles.signCard}>
              <View style={styles.signSpace} />
              <Text style={styles.signLabel}>Lead Technician Signature</Text>
              <Text style={styles.fieldValue}>{safe(csr.technicianName) || ' '}</Text>
            </View>
          ) : null}

          {csr.showAcknowledgement ? (
            <View style={styles.signCard}>
              <View style={styles.signSpace} />
              <Text style={styles.signLabel}>Customer Acknowledgement</Text>
              <Text style={styles.fieldValue}>
                {[safe(csr.acknowledgement_name), safe(csr.recipientRole)].filter(Boolean).join(' • ') || ' '}
              </Text>
            </View>
          ) : null}
        </View>

        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}

/* ---------------- Crimson ---------------- */

function createCrimsonStyles() {
  return StyleSheet.create({
    page: {
      paddingTop: 12,
      paddingBottom: 12,
      paddingHorizontal: 12,
      backgroundColor: '#ffffff',
      color: '#0f172a',
      fontFamily: 'Helvetica',
      fontSize: 8.3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: 3,
      borderBottomColor: '#0f172a',
      paddingBottom: 8,
      marginBottom: 8,
    },
    brandBox: { flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1 },
    logoSlot: {
      width: 30,
      height: 30,
      backgroundColor: '#b91c1c',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoSlotText: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' },
    brandBlock: { flex: 1 },
    companyName: { fontSize: 14, color: '#0f172a', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    companyTagline: { fontSize: 6.8, color: '#b91c1c', textTransform: 'uppercase', marginTop: 2 },
    contactLine: { fontSize: 6.8, color: '#64748b', marginTop: 2, lineHeight: 1.3 },
    idBox: { alignItems: 'flex-end', width: 120 },
    idLabel: { fontSize: 6.3, color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    idValue: { fontSize: 11.5, color: '#b91c1c', fontFamily: 'Courier-Bold', marginTop: 2 },
    idDate: { fontSize: 7.2, color: '#0f172a', marginTop: 3, fontFamily: 'Helvetica-Bold' },

    section: { marginBottom: 8 },
    sectionTitle: {
      fontSize: 7.2,
      color: '#ffffff',
      backgroundColor: '#0f172a',
      borderLeftWidth: 4,
      borderLeftColor: '#b91c1c',
      paddingVertical: 3,
      paddingHorizontal: 7,
      marginBottom: 4,
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
    },

    fieldLabel: { fontSize: 6.2, color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    fieldValue: { fontSize: 8.8, color: '#1e293b', fontFamily: 'Helvetica-Bold', lineHeight: 1.2 },
    blockText: { fontSize: 8.2, color: '#444444', lineHeight: 1.45 },

    grid4: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    fieldCard: {
      width: '24%',
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 4,
      paddingVertical: 5,
      paddingHorizontal: 6,
      minHeight: 36,
      marginBottom: 4,
    },
    blockCard: {
      backgroundColor: '#fffcf0',
      borderWidth: 1,
      borderColor: '#fbbf24',
      borderRadius: 4,
      paddingVertical: 6,
      paddingHorizontal: 6,
      minHeight: 32,
    },

    readingsSection: {
      backgroundColor: '#0f172a',
      borderRadius: 4,
      paddingVertical: 6,
      paddingHorizontal: 6,
    },
    readingStrip: { flexDirection: 'row' },
    readingStripCell: {
      flex: 1,
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: '#ffffff20',
      paddingVertical: 4,
    },
    readingStripCellLast: { borderRightWidth: 0 },
    readingLabel: { fontSize: 5.8, color: '#ffffff99', textTransform: 'uppercase', marginTop: 2, fontFamily: 'Helvetica-Bold' },
    readingValue: { fontSize: 8.8, color: '#ffffff', fontFamily: 'Courier-Bold' },

    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#f1f5f9',
      borderBottomWidth: 1.5,
      borderBottomColor: '#e2e8f0',
      marginTop: 2,
    },
    tableHead: {
      fontSize: 6.3,
      color: '#64748b',
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
      paddingVertical: 5,
      paddingHorizontal: 5,
      borderRightWidth: 1,
      borderRightColor: '#e2e8f0',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    tableCell: {
      fontSize: 7.8,
      color: '#1e293b',
      fontFamily: 'Helvetica-Bold',
      paddingVertical: 4,
      paddingHorizontal: 4,
      borderRightWidth: 1,
      borderRightColor: '#f1f5f9',
    },

    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
    statusItem: {
      width: '24%',
      paddingVertical: 4,
      paddingHorizontal: 4,
      borderWidth: 1.2,
      borderColor: '#e2e8f0',
      borderRadius: 4,
      alignItems: 'center',
    },
    statusItemActive: {
      backgroundColor: '#15803d',
      borderColor: '#15803d',
    },
    statusText: { fontSize: 6.5, color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    statusTextActive: { color: '#ffffff' },

    textAreaOnly: {},
    ackGrid: { flexDirection: 'row', gap: 10, marginTop: 8 },
    signRow: { display: 'none' },
    signCard: {
      flex: 1,
      borderTopWidth: 1.5,
      borderTopColor: '#0f172a',
      paddingTop: 5,
    },
    signSpace: { height: 20, marginBottom: 3, backgroundColor: '#fafafa', borderRadius: 4 },
    signLabel: { fontSize: 6.3, color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    footer: {
      marginTop: 8,
      paddingTop: 5,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      fontSize: 6.2,
      color: '#94a3b8',
      textAlign: 'center',
      textTransform: 'uppercase',
    },
  })
}

function CrimsonTemplate({ csr, branding }) {
  const styles = createCrimsonStyles()
  const status = getStatusValue(csr)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandBox}>
            <PdfLogoSlot styles={styles} branding={branding} fallback="L" />
            <PdfBrandBlock styles={styles} branding={branding} />
          </View>
          <View style={styles.idBox}>
            <Text style={styles.idLabel}>Service Report Number</Text>
            <Text style={styles.idValue}>{safe(csr.csr_number)}</Text>
            <Text style={styles.idDate}>{safe(csr.date)}</Text>
          </View>
        </View>

        <PdfSection styles={styles} title="Client Information & Authorization">
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <View style={[styles.fieldCard, { width: '32%' }]}>
              <Text style={styles.fieldLabel}>Client Name</Text>
              <Text style={styles.fieldValue}>{safe(csr.client_name)}</Text>
            </View>
            <View style={[styles.fieldCard, { width: '66%' }]}>
              <Text style={styles.fieldLabel}>Site Address</Text>
              <Text style={styles.fieldValue}>{safe(csr.address)}</Text>
            </View>
            {csr.show_po && hasText(csr.po_number) ? (
              <View style={[styles.fieldCard, { width: '32%' }]}>
                <Text style={styles.fieldLabel}>Purchase Order (P.O.) Number</Text>
                <Text style={styles.fieldValue}>{safe(csr.po_number)}</Text>
              </View>
            ) : null}
            <View style={[styles.fieldCard, { width: csr.show_po && hasText(csr.po_number) ? '32%' : '49%' }]}>
              <Text style={styles.fieldLabel}>Service Start (Date/Time)</Text>
              <Text style={styles.fieldValue}>{[safe(csr.start_date), safe(csr.start_time)].filter(Boolean).join(' / ')}</Text>
            </View>
            <View style={[styles.fieldCard, { width: csr.show_po && hasText(csr.po_number) ? '32%' : '49%' }]}>
              <Text style={styles.fieldLabel}>Service End (Date/Time)</Text>
              <Text style={styles.fieldValue}>{[safe(csr.end_date), safe(csr.end_time)].filter(Boolean).join(' / ')}</Text>
            </View>
          </View>
        </PdfSection>

        <PdfSection styles={styles} title="Asset Identification & Telemetry">
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <View style={[styles.fieldCard, { width: '24%' }]}><Text style={styles.fieldLabel}>Equipment Type</Text><Text style={styles.fieldValue}>{safe(csr.equipment_type)}</Text></View>
            <View style={[styles.fieldCard, { width: '24%' }]}><Text style={styles.fieldLabel}>Make</Text><Text style={styles.fieldValue}>{safe(csr.make)}</Text></View>
            <View style={[styles.fieldCard, { width: '24%' }]}><Text style={styles.fieldLabel}>{safe(csr.modelLabel) || 'Model'}</Text><Text style={styles.fieldValue}>{safe(csr.model)}</Text></View>
            <View style={[styles.fieldCard, { width: '24%' }]}><Text style={styles.fieldLabel}>Capacity</Text><Text style={styles.fieldValue}>{safe(csr.capacity)}</Text></View>
            <View style={[styles.fieldCard, { width: '49%' }]}><Text style={styles.fieldLabel}>{safe(csr.serialLabel) || 'Serial Number'}</Text><Text style={styles.fieldValue}>{safe(csr.serial_no)}</Text></View>
            <View style={[styles.fieldCard, { width: '49%' }]}><Text style={styles.fieldLabel}>Equipment Location</Text><Text style={styles.fieldValue}>{safe(csr.equipment_location)}</Text></View>
          </View>

          {csr.showOperationalReadings ? (
            <View style={styles.readingsSection}>
              <ReadingsStrip styles={styles} csr={csr} />
            </View>
          ) : null}
        </PdfSection>

        <PdfSection styles={styles} title="Technical Problem & Execution">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Problem Reported</Text>
              <View style={styles.blockCard}>
                <Text style={styles.blockText}>{safe(csr.problem_reported)}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Service Rendered</Text>
              <View style={styles.blockCard}>
                <Text style={styles.blockText}>{safe(csr.service_rendered)}</Text>
              </View>
            </View>
          </View>
          {shouldRender(true, csr.technicianRemarks) ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.fieldLabel}>Technician Remarks</Text>
              <View style={[styles.blockCard, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                <Text style={styles.blockText}>{safe(csr.technicianRemarks)}</Text>
              </View>
            </View>
          ) : null}
        </PdfSection>

        {shouldRender(true, csr.materialsRows) || shouldRender(true, csr.materialsText) ? (
          <MaterialsTable styles={styles} csr={csr} />
        ) : null}

        <PdfSection styles={styles} title="Current Service Status">
          <View style={styles.statusGrid}>
            {CSR_STATUS_OPTIONS_PDF.map((option) => {
              const active = status === option || (option === 'Complete' && status === 'Working solution provided')
              return (
                <View key={option} style={[styles.statusItem, active ? styles.statusItemActive : null]}>
                  <Text style={[styles.statusText, active ? styles.statusTextActive : null]}>{option}</Text>
                </View>
              )
            })}
          </View>
        </PdfSection>

        <CustomerFeedbackSection styles={styles} csr={csr} />

        <View style={styles.ackGrid}>
          {csr.showTechnicianSignLine ? (
            <View style={styles.signCard}>
              <View style={styles.signSpace} />
              <Text style={styles.signLabel}>Technician Name</Text>
              <Text style={styles.fieldValue}>{safe(csr.technicianName)}</Text>
            </View>
          ) : null}

          {csr.showAcknowledgement ? (
            <View style={styles.signCard}>
              <View style={styles.signSpace} />
              <Text style={styles.signLabel}>Recipient Name / Role</Text>
              <Text style={styles.fieldValue}>
                {[safe(csr.acknowledgement_name), safe(csr.recipientRole)].filter(Boolean).join(' • ')}
              </Text>
            </View>
          ) : null}
        </View>

        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}

export function Template1({ csr, branding = {} }) {
  return <PulseFrameTemplate csr={csr} branding={getBranding(branding)} />
}

export function Template2({ csr, branding = {} }) {
  return <SignalBandsTemplate csr={csr} branding={getBranding(branding)} />
}

export function Template3({ csr, branding = {} }) {
  return <ZincTemplate csr={csr} branding={getBranding(branding)} />
}

export function Template4({ csr, branding = {} }) {
  return <CrimsonTemplate csr={csr} branding={getBranding(branding)} />
}

export function getCsrPdfDocument({ csr, branding = {}, template = '4' }) {
  const variant = getCsrTemplateVariant(template)

  if (variant === 'pulseframe') return <Template1 csr={csr} branding={branding} />
  if (variant === 'signalbands') return <Template2 csr={csr} branding={branding} />
  if (variant === 'zinc') return <Template3 csr={csr} branding={branding} />
  return <Template4 csr={csr} branding={branding} />
}
