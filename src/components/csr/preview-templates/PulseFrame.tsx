import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import {
  getLayoutDensity,
  getFillablePdfTheme,
  getStatusValue,
  shouldRender,
  safe,
  hasText,
  getTechnicianName,
  getTechnicianRole,
  getTechnicianSignatureUrl,
} from './utils'
import {
  StructuredTopIdentity,
  SharedProblemSection,
  SharedEquipmentSection,
  ReadingsCardGrid,
  PdfSection,
  MaterialsSection,
  StatusListDots,
  ServiceTimeSection,
  CustomerFeedbackSection,
} from './components'
import type { CsrPdfProps } from './types'

function createPulseFrameStyles(density = 'comfortable', designPreset: any) {
  const compact = density !== 'comfortable'
  const tight = density === 'tight'
  const { fillableColor, fillableRegular, fillableBold } = getFillablePdfTheme(designPreset)
  const templateAccentColor = designPreset?.templateAccentColor
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
      position: 'relative',
      marginBottom: 0,
      paddingTop: 24,
      paddingBottom: 24,
      paddingLeft: 28,
      paddingRight: 28,
      backgroundColor: templateAccentColor || '#0f172a',
      flexDirection: 'row',
      justifyContent: 'space-between',
      height: 40,
      minHeight: 40,
      maxHeight: 40,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    brandBlock: { flex: 1 },
    logoSlot: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoImage: { width: 48, height: 'auto', objectFit: 'contain' },
    logoSlotText: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' },
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
      backgroundColor: templateAccentColor || '#1d4ed8',
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
      borderRadius: 4,
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
    statusDotActive: { borderColor: templateAccentColor || '#1d4ed8', backgroundColor: templateAccentColor || '#1d4ed8' },
    statusText: { fontSize: 6.8, color: fillableColor, fontFamily: fillableBold, textTransform: 'uppercase' },
    textAreaOnly: { padding: compact ? 6 : 8, minHeight: tight ? 24 : 30 },
    ackGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    signRow: { flexDirection: 'row', gap: compact ? 6 : 8, padding: compact ? 6 : 8 },
    signCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#dbe7f5',
      borderRadius: 4,
      padding: compact ? 6 : 8,
    },
    signSpace: { height: tight ? 14 : 18, marginBottom: 4 },
    signLabel: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    footer: {
      marginTop: compact ? 2 : 4,
      backgroundColor: templateAccentColor || '#0f172a',
      color: '#ffffff',
      paddingVertical: 4,
      paddingHorizontal: 7,
      borderRadius: 10,
      fontSize: 6.2,
      lineHeight: 1.2,
    },
  })
}

export function PulseFrameTemplate({ csr, branding, designPreset }: CsrPdfProps) {
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
          <MaterialsSection styles={styles} csr={csr} templateId="pulseframe" />
        </PdfSection>

        <PdfSection styles={styles} title="Status">
          <StatusListDots styles={styles} status={status} />
        </PdfSection>

        <ServiceTimeSection styles={styles} csr={csr} />
        <CustomerFeedbackSection styles={styles} csr={csr} />

        {csr.showAcknowledgement || csr.showTechnicianSignLine ? (
          <PdfSection styles={styles} title="Acknowledgement">
            {csr.showAcknowledgement ? (
              <View style={[styles.fieldCard, { width: '100%', borderRightWidth: 0, borderBottomWidth: 0 }]}>
                <Text style={styles.fieldLabel}>Recipient name/title</Text>
                <Text style={styles.fieldValue}>{safe(csr.acknowledgement_name) || ' '}</Text>
              </View>
            ) : null}

            {shouldRender(true, csr.customer_feedback) ? (
              <View style={[styles.blockCard, { borderBottomWidth: 1, borderColor: '#e2e8f0' }]}>
                <Text style={styles.fieldLabel}>Comment</Text>
                <Text style={styles.blockText}>{safe(csr.customer_feedback)}</Text>
              </View>
            ) : null}

            <View style={styles.signRow}>
              {csr.showAcknowledgement ? (
                <View style={styles.signCard}>
                  <View style={{ height: 24, backgroundColor: '#f8fbff', borderWidth: 1, borderColor: '#dbeafe', borderRadius: 6, marginBottom: 4 }} />
                  <Text style={styles.signLabel}>Recipient Signature</Text>
                  {hasText(csr.acknowledgement_name) ? <Text style={styles.fieldValue}>{safe(csr.acknowledgement_name)}</Text> : null}
                </View>
              ) : null}

              {csr.showTechnicianSignLine ? (
                <View style={styles.signCard}>
                  {getTechnicianSignatureUrl(csr) ? (
                    <View style={{ height: 24, marginBottom: 4, justifyContent: 'flex-end' }}>
                      <Image src={getTechnicianSignatureUrl(csr)} style={{ maxHeight: 24, maxWidth: 92, objectFit: 'contain' }} />
                    </View>
                  ) : (
                    <View style={{ height: 24, backgroundColor: '#f8fbff', borderWidth: 1, borderColor: '#dbeafe', borderRadius: 6, marginBottom: 4 }} />
                  )}
                  <Text style={styles.signLabel}>Technician Signature</Text>
                  {hasText(getTechnicianName(csr)) ? <Text style={styles.fieldValue}>{getTechnicianName(csr)}</Text> : null}
                  {hasText(getTechnicianRole(csr)) ? <Text style={[styles.fieldLabel, { marginTop: 2, marginBottom: 0 }]}>{getTechnicianRole(csr)}</Text> : null}
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
