import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import {
  CSR_READING_FIELDS,
  CSR_STATUS_OPTIONS_PDF,
  getCsrTemplateVariant,
} from './CSRPreviewContent'
import {
  getDefaultPdfDesignPreset,
  getEffectiveFillableFont,
  resolvePdfFontFamily,
} from '../../lib/pdfDesignPreset'
import { registerPdfFillableFonts } from '../../lib/pdfFontRegistry'

registerPdfFillableFonts()

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

function getPopulatedReadingRows(csr) {
  return buildReadingRows(csr).filter((row) => hasText(row.value))
}

function hasOperationalReadings(csr) {
  return !!csr.showOperationalReadings && getPopulatedReadingRows(csr).length > 0
}

function getMaterialsRows(csr) {
  if (Array.isArray(csr.materialsRows)) {
    const populated = csr.materialsRows.filter((row) => row.item || row.quantity || row.unit)
    if (populated.length > 0) return populated
  }
  return hasText(csr.materialsText) ? [{ item: csr.materialsText || ' ', quantity: '', unit: '' }] : []
}

function hasMaterials(csr) {
  return getMaterialsRows(csr).length > 0
}

function getTechnicianName(csr) {
  return safe(csr.technicianSignatory?.name || csr.technicianName)
}

function getTechnicianRole(csr) {
  return safe(csr.technicianSignatory?.role)
}

function getTechnicianSignatureUrl(csr) {
  return safe(csr.technicianSignatory?.signatureUrl)
}

function getLayoutDensity(csr) {
  return csr.layoutDensity || 'comfortable'
}

function getFillablePdfTheme(designPreset) {
  const preset = designPreset || getDefaultPdfDesignPreset('csr')
  const fillableChoice = getEffectiveFillableFont(preset)
  return {
    fillableColor: preset.fillableColor || '#0f172a',
    fillableRegular: resolvePdfFontFamily(fillableChoice, 'regular'),
    fillableBold: resolvePdfFontFamily(fillableChoice, 'bold'),
  }
}

function PdfSignatureCard({ styles, label, name = '', role = '', signatureUrl = '' }) {
  return (
    <View style={styles.signCard}>
      {signatureUrl ? (
        <View style={{ height: 24, marginBottom: 4, justifyContent: 'flex-end' }}>
          <Image src={signatureUrl} style={{ maxHeight: 24, maxWidth: 92, objectFit: 'contain' }} />
        </View>
      ) : (
        <View style={styles.signSpace} />
      )}
      <Text style={styles.signLabel}>{label}</Text>
      {hasText(name) ? <Text style={styles.fieldValue}>{name}</Text> : null}
      {hasText(role) ? <Text style={[styles.fieldLabel, { marginTop: 2, marginBottom: 0 }]}>{role}</Text> : null}
    </View>
  )
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
  const rows = getPopulatedReadingRows(csr)
  if (!hasOperationalReadings(csr)) return null

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
  const rows = getPopulatedReadingRows(csr)
  if (!hasOperationalReadings(csr)) return null

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
  if (!hasMaterials(csr)) return null

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
  const rows = getMaterialsRows(csr)
  if (rows.length === 0) return null

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
  if (!csr.showAcknowledgement && !csr.showTechnicianSignLine) return null
  const technicianName = getTechnicianName(csr)
  const technicianRole = getTechnicianRole(csr)
  const technicianSignatureUrl = getTechnicianSignatureUrl(csr)

  return (
    <PdfSection styles={styles} title="Acknowledgement">
      {csr.showAcknowledgement ? (
        <View style={styles.ackGrid}>
          <PdfField styles={styles} label="Customer Name" value={csr.acknowledgement_name} />
          <PdfField styles={styles} label="Recipient Title" value={csr.recipientTitle} />
          <PdfField styles={styles} label="Recipient Role" value={csr.recipientRole} />
          <PdfField styles={styles} label="Signature" value="________________" />
        </View>
      ) : null}

      <View style={styles.signRow}>
        {csr.showTechnicianSignLine ? (
          <PdfSignatureCard
            styles={styles}
            label="Technician Signature"
            name={technicianName}
            role={technicianRole}
            signatureUrl={technicianSignatureUrl}
          />
        ) : null}

        {csr.showAcknowledgement ? (
          <PdfSignatureCard
            styles={styles}
            label="Customer Sign Line"
            name={safe(csr.acknowledgement_name)}
            role={safe(csr.recipientRole)}
          />
        ) : null}
      </View>
    </PdfSection>
  )
}

function PulseAcknowledgementBlock({ styles, csr }) {
  if (!csr.showAcknowledgement && !csr.showTechnicianSignLine) return null
  const technicianName = getTechnicianName(csr)
  const technicianRole = getTechnicianRole(csr)
  const technicianSignatureUrl = getTechnicianSignatureUrl(csr)

  return (
    <PdfSection styles={styles} title="Acknowledgement">
      {csr.showAcknowledgement ? (
        <View style={styles.ackGrid}>
          <PdfField styles={styles} label="Recipient" value={csr.acknowledgement_name} />
          <PdfField styles={styles} label="Recipient Title" value={csr.recipientTitle} />
          <PdfField styles={styles} label="Recipient Role" value={csr.recipientRole} />
          <PdfField styles={styles} label="Signature" value="________________" />
        </View>
      ) : null}

      <View style={styles.signRow}>
        {csr.showTechnicianSignLine ? (
          <PdfSignatureCard
            styles={styles}
            label="Technician Signature"
            name={technicianName}
            role={technicianRole}
            signatureUrl={technicianSignatureUrl}
          />
        ) : null}

        {csr.showAcknowledgement ? (
          <View style={styles.signCard}>
            <View style={[styles.fieldLabel, { fontSize: 6, marginBottom: 2 }]}>Recipient / Signature</View>
            <View style={{ marginTop: 4 }}>
              <Text style={[styles.fieldLabel, { fontSize: 6 }]}>Comment</Text>
            </View>
          </View>
        ) : null}
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

function createPulseFrameStyles(density = 'comfortable', designPreset) {
  const compact = density !== 'comfortable'
  const tight = density === 'tight'
  const { fillableColor, fillableRegular, fillableBold } = getFillablePdfTheme(designPreset)
  return StyleSheet.create({
    page: {
      paddingTop: tight ? 10 : compact ? 12 : 14,
      paddingBottom: tight ? 10 : compact ? 12 : 14,
      paddingHorizontal: tight ? 10 : compact ? 12 : 14,
      backgroundColor: '#ffffff',
      color: '#14213d',
      fontFamily: 'Helvetica',
      fontSize: tight ? 7.7 : compact ? 8.2 : 8.6,
    },
    topWrap: {
      backgroundColor: '#0f172a',
      paddingTop: tight ? 9 : 10,
      paddingBottom: tight ? 28 : compact ? 30 : 34,
      paddingHorizontal: tight ? 10 : 12,
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
    metaValue: { fontSize: 9, color: '#ffffff', fontFamily: fillableBold, marginTop: 2 },

    summaryRow: {
      marginTop: tight ? -20 : compact ? -22 : -24,
      marginBottom: compact ? 6 : 8,
      flexDirection: 'row',
      gap: compact ? 4 : 6,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#dbeafe',
      borderRadius: 12,
      padding: tight ? 5 : compact ? 6 : 7,
    },
    fieldLabel: { fontSize: 6.5, textTransform: 'uppercase', color: '#64748b', fontFamily: 'Helvetica-Bold', marginBottom: 3 },
    fieldValue: { fontSize: tight ? 8 : compact ? 8.5 : 9, color: fillableColor, fontFamily: fillableBold, lineHeight: 1.15 },
    blockText: { fontSize: tight ? 7.2 : compact ? 7.6 : 8, color: fillableColor, fontFamily: fillableRegular, lineHeight: tight ? 1.25 : 1.35 },
    section: {
      marginBottom: compact ? 5 : 7,
      borderWidth: 1,
      borderColor: '#dbe7f5',
      borderRadius: 14,
      overflow: 'hidden',
    },
    sectionTitle: {
      paddingVertical: tight ? 3 : 4,
      paddingHorizontal: tight ? 6 : 7,
      color: '#ffffff',
      backgroundColor: '#1d4ed8',
      fontSize: tight ? 6.7 : 7.2,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
    },
    grid4: { flexDirection: 'row', flexWrap: 'wrap' },
    grid2: { flexDirection: 'row' },
    fieldCard: {
      width: '25%',
      paddingVertical: tight ? 4 : 5,
      paddingHorizontal: tight ? 5 : 6,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#e2e8f0',
      minHeight: tight ? 30 : compact ? 34 : 38,
    },
    blockCard: { paddingVertical: tight ? 5 : 6, paddingHorizontal: tight ? 6 : 7, minHeight: tight ? 30 : compact ? 34 : 38 },
    readingGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: compact ? 6 : 8, gap: 4 },
    readingCard: {
      width: '15.5%',
      backgroundColor: '#eff6ff',
      borderWidth: 1,
      borderColor: '#bfdbfe',
      borderRadius: 10,
      paddingVertical: tight ? 4 : 5,
      paddingHorizontal: 5,
      alignItems: 'center',
    },
    readingLabel: { fontSize: 6.1, color: '#475569', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 2, textAlign: 'center' },
    readingValue: { fontSize: 10, color: fillableColor, fontFamily: fillableBold },
    pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: compact ? 6 : 8 },
    pill: {
      paddingVertical: 4,
      paddingHorizontal: 7,
      backgroundColor: '#dbeafe',
      borderWidth: 1,
      borderColor: '#93c5fd',
      borderRadius: 999,
    },
    pillText: { fontSize: 7.5, color: fillableColor, fontFamily: fillableBold, textTransform: 'uppercase' },
    serviceGrid: { flexDirection: 'row' },
    serviceCard: {
      flex: 1,
      paddingVertical: tight ? 5 : 6,
      paddingHorizontal: tight ? 6 : 7,
      borderRightWidth: 1,
      borderColor: '#e2e8f0',
      minHeight: tight ? 46 : compact ? 52 : 60,
    },
    statusGrid: { padding: compact ? 6 : 8, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    statusItem: {
      width: '31%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: '#dbeafe',
      borderRadius: 10,
      paddingVertical: tight ? 4 : 5,
      paddingHorizontal: 6,
      backgroundColor: '#f8fbff',
    },
    statusDot: { width: 8, height: 8, borderRadius: 99, borderWidth: 1.5, borderColor: '#94a3b8', backgroundColor: '#ffffff' },
    statusDotActive: { borderColor: '#1d4ed8', backgroundColor: '#1d4ed8' },
    statusText: { fontSize: 6.8, color: fillableColor, fontFamily: fillableBold, textTransform: 'uppercase' },
    textAreaOnly: { padding: compact ? 6 : 8, minHeight: tight ? 24 : 30 },
    ackGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    signRow: { flexDirection: 'row', gap: compact ? 6 : 8, padding: compact ? 6 : 8 },
    signCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#dbe7f5',
      borderRadius: 12,
      padding: compact ? 6 : 8,
    },
    signSpace: { height: tight ? 14 : 18, borderBottomWidth: 1.5, borderBottomColor: '#93c5fd', borderStyle: 'dashed', marginBottom: 4 },
    signLabel: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    footer: {
      marginTop: compact ? 2 : 4,
      backgroundColor: '#0f172a',
      color: '#ffffff',
      paddingVertical: 4,
      paddingHorizontal: 7,
      borderRadius: 10,
      fontSize: 6.2,
      lineHeight: 1.2,
    },
  })
}

function PulseFrameTemplate({ csr, branding, designPreset }) {
  const styles = createPulseFrameStyles(getLayoutDensity(csr), designPreset)
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
        <PulseAcknowledgementBlock styles={styles} csr={csr} />

        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}

/* ---------------- SignalBands ---------------- */

function createSignalBandsStyles(density = 'comfortable', designPreset) {
  const compact = density !== 'comfortable'
  const tight = density === 'tight'
  const { fillableColor, fillableBold, fillableRegular } = getFillablePdfTheme(designPreset)
  return StyleSheet.create({
    page: {
      paddingTop: tight ? 10 : 12,
      paddingBottom: tight ? 10 : 12,
      paddingHorizontal: tight ? 10 : 12,
      backgroundColor: '#fffdfa',
      color: '#231f20',
      fontFamily: 'Helvetica',
      fontSize: tight ? 7.5 : compact ? 7.9 : 8.2,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: compact ? 8 : 10,
      backgroundColor: '#7f1d1d',
      borderRadius: 10,
      paddingVertical: tight ? 7 : 8,
      paddingHorizontal: tight ? 9 : 10,
      marginBottom: compact ? 6 : 8,
    },
    brandBlock: { flex: 1 },
    companyName: { fontSize: 16, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    companyTagline: { fontSize: 7.2, color: '#FDE68A', marginTop: 2 },
    contactLine: { fontSize: 6.6, color: '#ffffff', marginTop: 3, lineHeight: 1.2 },
    identityCard: {
      width: tight ? 184 : 192,
      backgroundColor: '#ffffff22',
      borderWidth: 1,
      borderColor: '#ffffff33',
      borderRadius: 10,
      padding: tight ? 6 : 7,
    },
    identityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    identityFull: { width: '100%' },
    metaLabel: { fontSize: 6.4, color: '#FDECEC', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    metaValue: { fontSize: 8.8, color: '#ffffff', fontFamily: fillableBold, marginTop: 2 },

    band: {
      flexDirection: 'row',
      marginBottom: compact ? 4 : 6,
      borderWidth: 1,
      borderColor: '#e7d7c8',
      borderRadius: 12,
      overflow: 'hidden',
    },
    bandKey: {
      width: tight ? 96 : 104,
      paddingVertical: tight ? 6 : 7,
      paddingHorizontal: tight ? 6 : 7,
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
      paddingVertical: tight ? 5 : 6,
      paddingHorizontal: tight ? 6 : 7,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#eee3d7',
      minHeight: tight ? 30 : compact ? 34 : 38,
      backgroundColor: '#fffdfa',
    },
    fieldLabel: { fontSize: 6.5, color: '#78716c', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 3 },
    fieldValue: { fontSize: 9.5, color: fillableColor, fontFamily: fillableBold, lineHeight: 1.2 },
    blockCard: { paddingVertical: tight ? 5 : 6, paddingHorizontal: tight ? 7 : 8, minHeight: tight ? 30 : compact ? 34 : 38 },
    blockText: { fontSize: tight ? 7.1 : compact ? 7.4 : 7.8, color: fillableColor, fontFamily: fillableRegular, lineHeight: tight ? 1.22 : 1.3 },

    readingStrip: {
      flexDirection: 'row',
      backgroundColor: '#fffdfa',
    },
    readingStripCell: {
      flex: 1,
      paddingVertical: tight ? 5 : 6,
      paddingHorizontal: 4,
      borderRightWidth: 1,
      borderColor: '#eee3d7',
      alignItems: 'center',
    },
    readingStripCellLast: { borderRightWidth: 0 },
    readingLabel: { fontSize: 6.1, color: '#78716c', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginTop: 2, textAlign: 'center' },
    readingValue: { fontSize: 10, color: fillableColor, fontFamily: fillableBold },

    pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: compact ? 6 : 8 },
    pill: {
      paddingVertical: 4,
      paddingHorizontal: 7,
      backgroundColor: '#ffedd5',
      borderWidth: 1,
      borderColor: '#fdba74',
      borderRadius: 999,
    },
    pillText: { fontSize: 7.2, color: fillableColor, fontFamily: fillableBold, textTransform: 'uppercase' },

    statusGrid: {
      padding: compact ? 6 : 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    statusItem: {
      width: '31%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: tight ? 4 : 5,
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
    statusText: { fontSize: 6.8, color: fillableColor, fontFamily: fillableBold, textTransform: 'uppercase' },

    textAreaOnly: { padding: compact ? 6 : 8, minHeight: tight ? 24 : 28 },
    ackGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    signRow: { flexDirection: 'row', gap: compact ? 6 : 8, padding: compact ? 6 : 8 },
    signCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#e7d7c8',
      borderRadius: 12,
      padding: compact ? 6 : 8,
      backgroundColor: '#ffffff',
    },
    signSpace: {
      height: tight ? 14 : 18,
      borderBottomWidth: 1.5,
      borderBottomColor: '#d6bfa6',
      borderStyle: 'dashed',
      marginBottom: 4,
    },
    signLabel: { fontSize: 7, color: '#78716c', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },

    footer: {
      marginTop: compact ? 2 : 4,
      backgroundColor: '#1f2937',
      color: '#ffffff',
      borderRadius: 10,
      paddingVertical: 4,
      paddingHorizontal: 7,
      fontSize: 6.2,
      lineHeight: 1.2,
    },
  })
}

function SignalBandsTemplate({ csr, branding, designPreset }) {
  const styles = createSignalBandsStyles(getLayoutDensity(csr), designPreset)
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

        {hasOperationalReadings(csr) ? (
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

        {hasMaterials(csr) ? (
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

        {csr.showAcknowledgement || csr.showTechnicianSignLine ? (
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

function createZincStyles(density = 'comfortable', designPreset) {
  const compact = density !== 'comfortable'
  const tight = density === 'tight'
  const { fillableColor, fillableBold, fillableRegular } = getFillablePdfTheme(designPreset)
  return StyleSheet.create({
    page: {
      paddingTop: tight ? 10 : 12,
      paddingBottom: tight ? 10 : 12,
      paddingHorizontal: tight ? 10 : 12,
      backgroundColor: '#ffffff',
      color: '#09090b',
      fontFamily: 'Helvetica',
      fontSize: tight ? 7.4 : compact ? 7.8 : 8,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: compact ? 6 : 8,
    },
    brandBlock: { flex: 1 },
    companyName: { fontSize: 16, color: '#09090b', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    companyTagline: { fontSize: 7, color: '#71717a', marginTop: 3, textTransform: 'uppercase' },
    contactLine: { fontSize: 7, color: '#71717a', marginTop: 3 },
    idBox: { alignItems: 'flex-end' },
    idLabel: { fontSize: 6.5, color: '#71717a', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    idValue: { fontSize: 12, color: fillableColor, fontFamily: fillableBold, marginTop: 2 },
    idDate: { fontSize: 7.5, color: '#71717a', marginTop: 4 },
    section: { marginBottom: compact ? 6 : 8 },
    sectionTitle: {
      fontSize: tight ? 6.8 : 7.1,
      color: '#09090b',
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      borderBottomWidth: 1.5,
      borderBottomColor: '#09090b',
      paddingBottom: 3,
      marginBottom: compact ? 4 : 5,
    },
    fieldCard: { width: '33.33%', paddingRight: compact ? 5 : 6, marginBottom: compact ? 4 : 5 },
    fieldLabel: { fontSize: 6.5, color: '#71717a', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 3 },
    fieldValue: { fontSize: tight ? 7.8 : compact ? 8.2 : 8.5, color: fillableColor, fontFamily: fillableBold, lineHeight: 1.15 },
    grid3: { flexDirection: 'row', flexWrap: 'wrap' },
    grid4: { flexDirection: 'row', flexWrap: 'wrap' },
    blockCard: {
      paddingVertical: tight ? 5 : 6,
      paddingHorizontal: tight ? 6 : 7,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e4e4e7',
      borderRadius: 4,
      minHeight: tight ? 28 : compact ? 30 : 34,
    },
    blockText: { fontSize: tight ? 7 : compact ? 7.3 : 7.7, color: fillableColor, fontFamily: fillableRegular, lineHeight: tight ? 1.22 : 1.3 },
    readingStrip: {
      flexDirection: 'row',
      backgroundColor: '#f4f4f5',
      borderWidth: 1,
      borderColor: '#e4e4e7',
      borderRadius: 6,
      paddingVertical: tight ? 5 : 6,
      paddingHorizontal: tight ? 4 : 5,
    },
    readingStripCell: {
      flex: 1,
      alignItems: 'center',
      borderRightWidth: 1,
      borderColor: '#e4e4e7',
    },
    readingStripCellLast: { borderRightWidth: 0 },
    readingLabel: { fontSize: 6.2, color: '#71717a', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginTop: 3 },
    readingValue: { fontSize: 9.5, color: fillableColor, fontFamily: fillableBold },
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
    lifecycleCurrentText: { fontSize: 8.5, color: '#ffffff', fontFamily: fillableBold, marginTop: 2 },
    lifecycleBadge: { backgroundColor: '#ffffff', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 },
    lifecycleBadgeText: { fontSize: 6.6, color: '#000000', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },

    tableHeaderRow: {
      flexDirection: 'row',
      borderBottomWidth: 1.5,
      borderBottomColor: '#e4e4e7',
      paddingBottom: 3,
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
      color: fillableColor,
      fontFamily: fillableBold,
      paddingVertical: tight ? 4 : 5,
      paddingHorizontal: 3,
      borderRightWidth: 1,
      borderRightColor: '#f1f1f1',
    },
    textAreaOnly: { paddingTop: compact ? 2 : 4 },
    ackGrid: { flexDirection: 'row', gap: compact ? 6 : 8, marginTop: compact ? 6 : 8 },
    signRow: { flexDirection: 'row', gap: compact ? 6 : 8, marginTop: compact ? 6 : 8 },
    signCard: { flex: 1 },
    signSpace: { height: tight ? 14 : 18, borderBottomWidth: 1.5, borderBottomColor: '#09090b', marginBottom: 4 },
    signLabel: { fontSize: 6.5, color: '#71717a', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    footer: { marginTop: compact ? 6 : 8, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#e4e4e7', fontSize: 6, color: '#71717a', textAlign: 'center' },
    statusGrid: { display: 'none' },
    statusItem: {},
    statusText: {},
  })
}

function ZincTemplate({ csr, branding, designPreset }) {
  const styles = createZincStyles(getLayoutDensity(csr), designPreset)
  const status = getStatusValue(csr)
  const technicianName = getTechnicianName(csr)
  const technicianRole = getTechnicianRole(csr)
  const technicianSignatureUrl = getTechnicianSignatureUrl(csr)
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
          {hasOperationalReadings(csr) ? <ReadingsStrip styles={styles} csr={csr} /> : null}
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

        {hasMaterials(csr) || shouldRender(true, csr.customer_feedback) ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {hasMaterials(csr) ? (
              <View style={{ flex: 1 }}>
                <MaterialsTable styles={styles} csr={csr} />
              </View>
            ) : null}
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

        {csr.showTechnicianSignLine || csr.showAcknowledgement ? (
          <View style={styles.ackGrid}>
            {csr.showTechnicianSignLine ? (
              <PdfSignatureCard
                styles={styles}
                label="Lead Technician Signature"
                name={technicianName}
                role={technicianRole}
                signatureUrl={technicianSignatureUrl}
              />
            ) : null}

            {csr.showAcknowledgement ? (
              <View style={{ flex: 2 }}>
                <View style={[styles.grid3, { marginBottom: 8 }]}>
                  <PdfField styles={styles} label="Customer Name" value={csr.acknowledgement_name} />
                  <PdfField styles={styles} label="Recipient Title" value={csr.recipientTitle} />
                  <PdfField styles={styles} label="Recipient Role" value={csr.recipientRole} />
                </View>
                <PdfSignatureCard
                  styles={styles}
                  label="Customer Acknowledgement"
                  name={safe(csr.acknowledgement_name)}
                  role={safe(csr.recipientRole)}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}

/* ---------------- Crimson ---------------- */

function createCrimsonStyles(density = 'comfortable', designPreset) {
  const compact = density !== 'comfortable'
  const tight = density === 'tight'
  const { fillableColor, fillableBold, fillableRegular } = getFillablePdfTheme(designPreset)
  return StyleSheet.create({
    page: {
      paddingTop: tight ? 8 : 12,
      paddingBottom: tight ? 8 : 12,
      paddingHorizontal: tight ? 8 : 12,
      backgroundColor: '#ffffff',
      color: '#0f172a',
      fontFamily: 'Helvetica',
      fontSize: tight ? 7.2 : compact ? 7.6 : 7.9,
    },
    header: {
      backgroundColor: '#0f172a',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: tight ? 4 : compact ? 6 : 8,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: compact ? 8 : 10,
      paddingVertical: tight ? 6 : 8,
      paddingHorizontal: tight ? 8 : 10,
    },
    headerBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: compact ? 6 : 8,
      backgroundColor: '#f8fafc',
      paddingVertical: tight ? 5 : 7,
      paddingHorizontal: tight ? 8 : 10,
      borderTopWidth: 1,
      borderTopColor: '#1e293b',
    },
    brandBox: { flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1 },
    logoSlot: {
      width: 34,
      height: 34,
      backgroundColor: '#b91c1c',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 6,
    },
    logoSlotText: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' },
    brandBlock: { flex: 1 },
    companyName: { fontSize: tight ? 13 : 15, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.4 },
    companyTagline: { fontSize: tight ? 5.8 : 6.8, color: '#e2e8f0', textTransform: 'uppercase', marginTop: 2 },
    contactLine: { fontSize: tight ? 5.7 : 6.7, color: '#cbd5e1', marginTop: 3, lineHeight: tight ? 1.1 : 1.35 },
    idBox: {
      width: tight ? 134 : 148,
      backgroundColor: '#111827',
      borderWidth: 1,
      borderColor: '#334155',
      borderRadius: 8,
      paddingVertical: tight ? 6 : 8,
      paddingHorizontal: tight ? 7 : 9,
      alignItems: 'flex-end',
    },
    idLabel: { fontSize: 6.1, color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    idValue: { fontSize: 12.2, color: '#ffffff', fontFamily: fillableBold, marginTop: 2 },
    idDate: { fontSize: 7, color: '#e2e8f0', marginTop: 3, fontFamily: 'Helvetica-Bold' },
    docKicker: { fontSize: 6.3, color: '#64748b', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
    docTitle: { fontSize: tight ? 10 : 11.5, color: '#0f172a', fontFamily: 'Helvetica-Bold', marginTop: 3, textTransform: 'uppercase' },
    docSubtext: { fontSize: 6.3, color: '#475569', marginTop: 2, lineHeight: 1.15 },
    summaryPillRow: { flexDirection: 'row', gap: 6 },
    summaryPill: {
      flex: 1,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 999,
      paddingVertical: tight ? 4 : 5,
      paddingHorizontal: tight ? 6 : 8,
    },
    summaryPillLabel: { fontSize: 5.8, color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    summaryPillValue: { fontSize: 7.3, color: fillableColor, fontFamily: fillableBold, marginTop: 2 },

    section: { marginBottom: tight ? 4 : compact ? 6 : 8 },
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
      letterSpacing: 0.4,
    },

    fieldLabel: { fontSize: tight ? 5.6 : 6.1, color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    fieldValue: { fontSize: tight ? 7.1 : compact ? 7.9 : 8.2, color: fillableColor, fontFamily: fillableBold, lineHeight: 1.1 },
    blockText: { fontSize: tight ? 6.5 : compact ? 7.2 : 7.5, color: fillableColor, fontFamily: fillableRegular, lineHeight: tight ? 1.12 : 1.26 },

    grid4: { flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 4 : 6 },
    fieldCard: {
      width: '24%',
      backgroundColor: '#f8fafc',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 6,
      paddingVertical: tight ? 3 : 5,
      paddingHorizontal: tight ? 4 : 6,
      minHeight: tight ? 24 : compact ? 30 : 34,
      marginBottom: tight ? 2 : compact ? 3 : 4,
    },
    blockCard: {
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 6,
      paddingVertical: tight ? 4 : 6,
      paddingHorizontal: tight ? 5 : 7,
      minHeight: tight ? 24 : compact ? 30 : 34,
    },
    heroBlockCard: {
      backgroundColor: '#fff7ed',
      borderColor: '#fdba74',
    },
    mutedBlockCard: {
      backgroundColor: '#f8fafc',
      borderColor: '#e2e8f0',
    },

    readingsSection: {
      backgroundColor: '#0f172a',
      borderRadius: 6,
      paddingVertical: tight ? 4 : 6,
      paddingHorizontal: tight ? 4 : 6,
      marginTop: 2,
    },
    readingStrip: { flexDirection: 'row' },
    readingStripCell: {
      flex: 1,
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: '#ffffff20',
      paddingVertical: 5,
    },
    readingStripCellLast: { borderRightWidth: 0 },
    readingLabel: { fontSize: 5.7, color: '#cbd5e1', textTransform: 'uppercase', marginTop: 2, fontFamily: 'Helvetica-Bold' },
    readingValue: { fontSize: 8.8, color: '#ffffff', fontFamily: fillableBold },

    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#f1f5f9',
      borderBottomWidth: 1.5,
      borderBottomColor: '#e2e8f0',
      marginTop: 3,
    },
    tableHead: {
      fontSize: tight ? 5.7 : 6.3,
      color: '#64748b',
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
      paddingVertical: tight ? 3 : 5,
      paddingHorizontal: tight ? 4 : 6,
      borderRightWidth: 1,
      borderRightColor: '#e2e8f0',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    tableCell: {
      fontSize: tight ? 6.9 : 7.8,
      color: fillableColor,
      fontFamily: fillableBold,
      paddingVertical: tight ? 3 : 5,
      paddingHorizontal: tight ? 4 : 6,
      borderRightWidth: 1,
      borderRightColor: '#f1f5f9',
    },

    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 4 : 5, marginTop: 2 },
    statusItem: {
      width: '24%',
      paddingVertical: tight ? 4 : 5,
      paddingHorizontal: 5,
      borderWidth: 1.2,
      borderColor: '#e2e8f0',
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: tight ? 18 : 24,
      backgroundColor: '#f8fafc',
    },
    statusItemActive: {
      backgroundColor: '#15803d',
      borderColor: '#15803d',
    },
    statusText: { fontSize: 6.5, color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    statusTextActive: { color: '#ffffff' },

    textAreaOnly: {},
    ackGrid: { flexDirection: 'row', gap: tight ? 4 : compact ? 6 : 8, marginTop: tight ? 4 : compact ? 6 : 8 },
    signRow: { display: 'none' },
    signCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 6,
      paddingVertical: tight ? 4 : 6,
      paddingHorizontal: tight ? 5 : 7,
      backgroundColor: '#f8fafc',
    },
    signSpace: {
      height: tight ? 10 : 18,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: '#94a3b8',
      borderStyle: 'dashed',
    },
    signLabel: { fontSize: 6.3, color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    footer: {
      marginTop: compact ? 6 : 8,
      paddingTop: 5,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      fontSize: 5.8,
      color: '#94a3b8',
      textAlign: 'center',
      textTransform: 'uppercase',
    },
  })
}

function CrimsonTemplate({ csr, branding, designPreset }) {
  const layoutDensity = getLayoutDensity(csr)
  const tightLayout = layoutDensity === 'tight'
  const styles = createCrimsonStyles(layoutDensity, designPreset)
  const status = getStatusValue(csr)
  const serviceStart = [safe(csr.start_date), safe(csr.start_time)].filter(Boolean).join(' / ')
  const serviceEnd = [safe(csr.end_date), safe(csr.end_time)].filter(Boolean).join(' / ')
  const technicianName = getTechnicianName(csr)
  const technicianRole = getTechnicianRole(csr)
  const technicianSignatureUrl = getTechnicianSignatureUrl(csr)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandBox}>
              <PdfLogoSlot styles={styles} branding={branding} fallback="L" />
                <View>
                  <PdfBrandBlock styles={styles} branding={branding} />
                  <Text style={[styles.docTitle, { marginTop: 4, letterSpacing: 1 }]}>Customer Service Report</Text>
                </View>
            </View>
            <View style={styles.idBox}>
              <Text style={styles.idLabel}>Service Report Number</Text>
              <Text style={styles.idValue}>{safe(csr.csr_number)}</Text>
              <Text style={styles.idDate}>{safe(csr.date)}</Text>
            </View>
          </View>
        </View>

        <PdfSection styles={styles} title="Customer & Job Details">
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
              <Text style={styles.fieldValue}>{serviceStart || 'Not recorded'}</Text>
            </View>
            <View style={[styles.fieldCard, { width: csr.show_po && hasText(csr.po_number) ? '32%' : '49%' }]}>
              <Text style={styles.fieldLabel}>Service End (Date/Time)</Text>
              <Text style={styles.fieldValue}>{serviceEnd || 'Not recorded'}</Text>
            </View>
          </View>
        </PdfSection>

        <PdfSection styles={styles} title="Problem Reported">
          <View style={[styles.blockCard, styles.heroBlockCard]}>
            <Text style={styles.blockText}>{safe(csr.problem_reported) || ' '}</Text>
          </View>
        </PdfSection>

        <PdfSection styles={styles} title="Equipment Details">
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <View style={[styles.fieldCard, { width: '24%' }]}><Text style={styles.fieldLabel}>Equipment Type</Text><Text style={styles.fieldValue}>{safe(csr.equipment_type)}</Text></View>
            <View style={[styles.fieldCard, { width: '24%' }]}><Text style={styles.fieldLabel}>Make</Text><Text style={styles.fieldValue}>{safe(csr.make)}</Text></View>
            <View style={[styles.fieldCard, { width: '24%' }]}><Text style={styles.fieldLabel}>{safe(csr.modelLabel) || 'Model'}</Text><Text style={styles.fieldValue}>{safe(csr.model)}</Text></View>
            <View style={[styles.fieldCard, { width: '24%' }]}><Text style={styles.fieldLabel}>Capacity</Text><Text style={styles.fieldValue}>{safe(csr.capacity)}</Text></View>
            <View style={[styles.fieldCard, { width: '49%' }]}><Text style={styles.fieldLabel}>{safe(csr.serialLabel) || 'Serial Number'}</Text><Text style={styles.fieldValue}>{safe(csr.serial_no)}</Text></View>
            <View style={[styles.fieldCard, { width: '49%' }]}><Text style={styles.fieldLabel}>Equipment Location</Text><Text style={styles.fieldValue}>{safe(csr.equipment_location)}</Text></View>
          </View>

          {hasOperationalReadings(csr) ? (
            <View style={styles.readingsSection}>
              <ReadingsStrip styles={styles} csr={csr} />
            </View>
          ) : null}
        </PdfSection>

        <PdfSection styles={styles} title="Service Rendered">
          <View style={styles.blockCard}>
            <Text style={styles.blockText}>{safe(csr.service_rendered) || ' '}</Text>
          </View>
          {shouldRender(true, csr.technicianRemarks) ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.fieldLabel}>Technician Remarks</Text>
              <View style={[styles.blockCard, styles.mutedBlockCard]}>
                <Text style={styles.blockText}>{safe(csr.technicianRemarks)}</Text>
              </View>
            </View>
          ) : null}
        </PdfSection>

        {hasMaterials(csr) ? (
          tightLayout ? <MaterialsPills styles={styles} csr={csr} /> : <MaterialsTable styles={styles} csr={csr} />
        ) : null}

        <PdfSection styles={styles} title="Status & Acknowledgement">
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

          {csr.showTechnicianSignLine || csr.showAcknowledgement ? (
            <View style={styles.ackGrid}>
              {csr.showTechnicianSignLine ? (
                <View style={styles.signCard}>
                  <View>
                    {technicianSignatureUrl ? (
                      <View style={{ height: 24, marginBottom: 4, justifyContent: 'flex-end' }}>
                        <Image src={technicianSignatureUrl} style={{ maxHeight: 24, maxWidth: 92, objectFit: 'contain' }} />
                      </View>
                    ) : (
                      <View style={styles.signSpace} />
                    )}
                  </View>
                  <Text style={styles.signLabel}>Technician Name</Text>
                  <Text style={styles.fieldValue}>{technicianName}</Text>
                  {technicianRole ? <Text style={[styles.fieldLabel, { marginTop: 2, marginBottom: 0 }]}>{technicianRole}</Text> : null}
                </View>
              ) : null}

              {csr.showAcknowledgement ? (
                <View style={styles.signCard}>
                  <Text style={styles.signLabel}>Recipient / Signature</Text>
                  <View style={{ marginTop: 4 }}>
                    <Text style={[styles.fieldLabel, { fontSize: 6 }]}>Comment</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </PdfSection>

        <CustomerFeedbackSection styles={styles} csr={csr} />

        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}

export function Template1({ csr, branding = {}, designPreset }) {
  return <PulseFrameTemplate csr={csr} branding={getBranding(branding)} designPreset={designPreset} />
}

export function Template2({ csr, branding = {}, designPreset }) {
  return <SignalBandsTemplate csr={csr} branding={getBranding(branding)} designPreset={designPreset} />
}

export function Template3({ csr, branding = {}, designPreset }) {
  return <ZincTemplate csr={csr} branding={getBranding(branding)} designPreset={designPreset} />
}

export function Template4({ csr, branding = {}, designPreset }) {
  return <CrimsonTemplate csr={csr} branding={getBranding(branding)} designPreset={designPreset} />
}

export function getCsrPdfDocument({ csr, branding = {}, template = '4', designPreset }) {
  const variant = getCsrTemplateVariant(template)

  if (variant === 'pulseframe') return <Template1 csr={csr} branding={branding} designPreset={designPreset} />
  if (variant === 'signalbands') return <Template2 csr={csr} branding={branding} designPreset={designPreset} />
  if (variant === 'zinc') return <Template3 csr={csr} branding={branding} designPreset={designPreset} />
  return <Template4 csr={csr} branding={branding} designPreset={designPreset} />
}
