import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { CSR_STATUS_OPTIONS_PDF } from '../CSRPreviewContent'
import {
  getLayoutDensity,
  getFillablePdfTheme,
  getStatusValue,
  getTechnicianName,
  getTechnicianRole,
  getTechnicianSignatureUrl,
  shouldRender,
  hasOperationalReadings,
  hasMaterials,
  hasText,
  safe,
} from './utils'
import {
  PdfLogoSlot,
  PdfBrandBlock,
  PdfSection,
  MaterialsSection,
} from './components'
import type { CsrPdfProps } from './types'

function createCrimsonStyles(density = 'comfortable', designPreset: any) {
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
    brandBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', flex: 1 },
    logoSlot: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoImage: { width: 48, height: 'auto', objectFit: 'contain' },
    logoSlotText: { color: '#b91c1c', fontSize: 14, fontFamily: 'Helvetica-Bold' },
    brandBlock: { flex: 1 },
    companyName: { fontSize: tight ? 11 : 12.5, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.4 },
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
    docTitle: { fontSize: tight ? 10 : 11.5, color: '#0f172a', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
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
      flex: 1,
      minWidth: '18%',
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

export function CrimsonTemplate({ csr, branding, designPreset }: CsrPdfProps) {
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
              <PdfBrandBlock styles={styles} branding={branding} />
            </View>
            <View style={styles.idBox}>
              <Text style={styles.idLabel}>Service Report Number</Text>
              <Text style={styles.idValue}>{safe(csr.csr_number)}</Text>
              <Text style={styles.idDate}>{safe(csr.date)}</Text>
            </View>
          </View>
          <View style={styles.headerBottom}>
            <Text style={styles.docTitle}>Customer Service Report</Text>
          </View>
        </View>

        <PdfSection styles={styles} title="Customer & Job Details">
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}>
              <Text style={styles.fieldLabel}>Client Name</Text>
              <Text style={styles.fieldValue}>{safe(csr.client_name)}</Text>
            </View>
            <View style={[styles.fieldCard, { flex: 2, width: undefined }]}>
              <Text style={styles.fieldLabel}>Address</Text>
              <Text style={styles.fieldValue}>{safe(csr.address)}</Text>
            </View>
            {csr.show_po && hasText(csr.po_number) ? (
              <View style={[styles.fieldCard, { flex: 1, width: undefined }]}>
                <Text style={styles.fieldLabel}>Purchase Order (P.O.) Number</Text>
                <Text style={styles.fieldValue}>{safe(csr.po_number)}</Text>
              </View>
            ) : null}
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}>
              <Text style={styles.fieldLabel}>Service Start (Date/Time)</Text>
              <Text style={styles.fieldValue}>{serviceStart || 'Not recorded'}</Text>
            </View>
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}>
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
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}><Text style={styles.fieldLabel}>Equipment Type</Text><Text style={styles.fieldValue}>{safe(csr.equipment_type)}</Text></View>
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}><Text style={styles.fieldLabel}>Make</Text><Text style={styles.fieldValue}>{safe(csr.make)}</Text></View>
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}><Text style={styles.fieldLabel}>{safe(csr.modelLabel) || 'Model'}</Text><Text style={styles.fieldValue}>{safe(csr.model)}</Text></View>
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}><Text style={styles.fieldLabel}>Capacity</Text><Text style={styles.fieldValue}>{safe(csr.capacity)}</Text></View>
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}><Text style={styles.fieldLabel}>{safe(csr.serialLabel) || 'Serial Number'}</Text><Text style={styles.fieldValue}>{safe(csr.serial_no)}</Text></View>
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}><Text style={styles.fieldLabel}>Equipment Location</Text><Text style={styles.fieldValue}>{safe(csr.equipment_location)}</Text></View>
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
          <MaterialsSection styles={styles} csr={csr} templateId="crimson" preferredStyle={tightLayout ? 'comma' : 'list'} />
        ) : null}

        <PdfSection styles={styles} title="Status">
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

        {csr.showTechnicianSignLine || csr.showAcknowledgement ? (
          <PdfSection styles={styles} title="Acknowledgement">
            {csr.showAcknowledgement ? (
              <View style={[styles.fieldCard, { width: '100%', marginBottom: 0 }]}>
                <Text style={styles.fieldLabel}>Recipient name/title</Text>
                <Text style={styles.fieldValue}>{safe(csr.acknowledgement_name) || ' '}</Text>
              </View>
            ) : null}

            {shouldRender(true, csr.customer_feedback) ? (
              <View style={[styles.blockCard, { marginTop: 6 }]}>
                <Text style={styles.fieldLabel}>Comment</Text>
                <Text style={styles.blockText}>{safe(csr.customer_feedback)}</Text>
              </View>
            ) : null}

            <View style={styles.ackGrid}>
              {csr.showAcknowledgement ? (
                <View style={styles.signCard}>
                  <View style={{ height: 28, backgroundColor: '#ffffff', marginBottom: 4 }} />
                  <Text style={styles.signLabel}>Recipient Signature</Text>
                  {hasText(csr.acknowledgement_name) ? <Text style={styles.fieldValue}>{safe(csr.acknowledgement_name)}</Text> : null}
                </View>
              ) : null}

              {csr.showTechnicianSignLine ? (
                <View style={styles.signCard}>
                  {technicianSignatureUrl ? (
                    <View style={{ height: 28, marginBottom: 4, justifyContent: 'flex-end' }}>
                      <Image src={technicianSignatureUrl} style={{ maxHeight: 28, maxWidth: 92, objectFit: 'contain' }} />
                    </View>
                  ) : (
                    <View style={{ height: 28, backgroundColor: '#ffffff', marginBottom: 4 }} />
                  )}
                  <Text style={styles.signLabel}>Technician Signature</Text>
                  <Text style={styles.fieldValue}>{technicianName}</Text>
                  {technicianRole ? <Text style={[styles.fieldLabel, { marginTop: 2, marginBottom: 0 }]}>{technicianRole}</Text> : null}
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
