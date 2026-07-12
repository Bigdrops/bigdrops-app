import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { CsrRenderModel } from '@/domain/csr/csrRenderModel'
import { CSR_STATUS_OPTIONS_PDF } from '../CSRPreviewContent'
import {
  getLayoutDensity,
  getFillablePdfTheme,
  getStatusValue,
  getTechnicianName,
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
  ReadingsStrip,
  MaterialsSection,
  PdfSignatureCard,
} from './components'
import { ClientNotesBlock } from './ClientNotesBlock'
import type { CsrPdfProps } from './types'

function createIndustryStyles(density = 'comfortable', designPreset: any) {
  const compact = density !== 'comfortable'
  const tight = density === 'tight'
  const { fillableColor, fillableBold, fillableRegular } = getFillablePdfTheme(designPreset)
  const accent = designPreset?.accent || '#1a4d2e'
  return StyleSheet.create({
    page: {
      paddingTop: tight ? 8 : 10,
      paddingBottom: tight ? 8 : 10,
      paddingHorizontal: tight ? 8 : 10,
      backgroundColor: '#f8f7f4',
      color: '#1a1a1a',
      fontFamily: 'Helvetica',
      fontSize: tight ? 7.2 : compact ? 7.5 : 7.8,
    },
    header: {
      backgroundColor: accent,
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: tight ? 4 : compact ? 5 : 6,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: compact ? 6 : 8,
      paddingVertical: tight ? 5 : 6,
      paddingHorizontal: tight ? 7 : 8,
    },
    headerBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: compact ? 5 : 6,
      backgroundColor: '#f0efe8',
      paddingVertical: tight ? 4 : 5,
      paddingHorizontal: tight ? 7 : 8,
      borderTopWidth: 1,
      borderTopColor: '#2d6b45',
    },
    brandBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', flex: 1 },
    logoSlot: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoImage: { width: 44, height: 'auto', objectFit: 'contain' },
    logoSlotText: { color: '#ffffff', fontSize: 12, fontFamily: 'Helvetica-Bold' },
    brandBlock: { flex: 1 },
    companyName: { fontSize: tight ? 10 : 11, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.3 },
    companyTagline: { fontSize: tight ? 5.5 : 6.2, color: '#d4e8dc', textTransform: 'uppercase', marginTop: 2 },
    contactLine: { fontSize: tight ? 5.4 : 6.1, color: '#c2d9cc', marginTop: 2, lineHeight: tight ? 1.1 : 1.3 },
    idBox: {
      width: tight ? 120 : 132,
      backgroundColor: '#0d3a1f',
      borderWidth: 1,
      borderColor: '#2d6b45',
      borderRadius: 5,
      paddingVertical: tight ? 5 : 6,
      paddingHorizontal: tight ? 6 : 7,
      alignItems: 'flex-end',
    },
    idLabel: { fontSize: 5.8, color: '#a3c4b0', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    idValue: { fontSize: 11, color: '#ffffff', fontFamily: fillableBold, marginTop: 2 },
    idDate: { fontSize: 6.5, color: '#c2d9cc', marginTop: 2, fontFamily: 'Helvetica-Bold' },
    docTitle: { fontSize: tight ? 9 : 10, color: '#1a1a1a', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    section: { marginBottom: tight ? 3 : compact ? 4 : 5 },
    sectionTitle: {
      fontSize: 6.8,
      color: '#ffffff',
      backgroundColor: accent,
      borderLeftWidth: 3,
      borderLeftColor: '#2d6b45',
      paddingVertical: 2.5,
      paddingHorizontal: 6,
      marginBottom: 3,
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 0.3,
    },

    fieldLabel: { fontSize: tight ? 5.4 : 5.8, color: '#6b7280', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    fieldValue: { fontSize: tight ? 6.8 : compact ? 7.4 : 7.8, color: fillableColor, fontFamily: fillableBold, lineHeight: 1.1 },
    blockText: { fontSize: tight ? 6.3 : compact ? 6.8 : 7.2, color: fillableColor, fontFamily: fillableRegular, lineHeight: tight ? 1.1 : 1.25 },

    grid4: { flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 3 : 4 },
    fieldCard: {
      width: '24%',
      backgroundColor: '#f0efe8',
      borderWidth: 1,
      borderColor: '#d4d3c8',
      borderRadius: 4,
      paddingVertical: tight ? 2.5 : 4,
      paddingHorizontal: tight ? 3 : 5,
      minHeight: tight ? 22 : compact ? 28 : 32,
      marginBottom: tight ? 2 : compact ? 2.5 : 3,
    },
    blockCard: {
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#d4d3c8',
      borderRadius: 4,
      paddingVertical: tight ? 3.5 : 5,
      paddingHorizontal: tight ? 4.5 : 6,
      minHeight: tight ? 22 : compact ? 28 : 32,
    },
    heroBlockCard: {
      backgroundColor: '#fdf8ed',
      borderColor: '#d4c98a',
    },
    mutedBlockCard: {
      backgroundColor: '#f0efe8',
      borderColor: '#d4d3c8',
    },

    readingsSection: {
      backgroundColor: accent,
      borderRadius: 4,
      paddingVertical: tight ? 3.5 : 5,
      paddingHorizontal: tight ? 3.5 : 5,
      marginTop: 2,
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
    readingLabel: { fontSize: 5.4, color: '#c2d9cc', textTransform: 'uppercase', marginTop: 2, fontFamily: 'Helvetica-Bold' },
    readingValue: { fontSize: 8.2, color: '#ffffff', fontFamily: fillableBold },

    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#e8e7df',
      borderBottomWidth: 1.5,
      borderBottomColor: '#d4d3c8',
      marginTop: 2,
    },
    tableHead: {
      fontSize: tight ? 5.4 : 6,
      color: '#6b7280',
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
      paddingVertical: tight ? 2.5 : 4,
      paddingHorizontal: tight ? 3.5 : 5,
      borderRightWidth: 1,
      borderRightColor: '#d4d3c8',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e8e7df',
    },
    tableCell: {
      fontSize: tight ? 6.5 : 7.2,
      color: fillableColor,
      fontFamily: fillableBold,
      paddingVertical: tight ? 2.5 : 4,
      paddingHorizontal: tight ? 3.5 : 5,
      borderRightWidth: 1,
      borderRightColor: '#e8e7df',
    },

    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 3.5 : 4, marginTop: 2 },
    statusItem: {
      flex: 1,
      minWidth: '18%',
      paddingVertical: tight ? 3.5 : 4.5,
      paddingHorizontal: 4.5,
      borderWidth: 1,
      borderColor: '#d4d3c8',
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: tight ? 16 : 22,
      backgroundColor: '#f0efe8',
    },
    statusItemActive: {
      backgroundColor: '#15803d',
      borderColor: '#15803d',
    },
    statusText: { fontSize: 6.2, color: '#6b7280', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    statusTextActive: { color: '#ffffff' },

    textAreaOnly: {},
    ackGrid: { flexDirection: 'row', gap: tight ? 3.5 : compact ? 5 : 6, marginTop: tight ? 3.5 : compact ? 5 : 6 },
    signRow: { display: 'none' },
    signCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#d4d3c8',
      borderRadius: 4,
      paddingVertical: tight ? 3.5 : 5,
      paddingHorizontal: tight ? 4.5 : 6,
      backgroundColor: '#f0efe8',
    },
    signSpace: {
      height: tight ? 8 : 14,
      marginBottom: 3,
    },
    signLabel: { fontSize: 6, color: '#6b7280', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    ackContainer: { borderWidth: 1, borderColor: '#d4d3c8', borderRadius: 4, overflow: 'hidden' },
    ackTopRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#d4d3c8' },
    ackTopHalf: { flex: 1, paddingTop: tight ? 2.5 : 3.5, paddingBottom: tight ? 18 : 22, paddingHorizontal: tight ? 4.5 : 5.5, borderRightWidth: 1, borderRightColor: '#d4d3c8' },
    ackTopHalfLast: { flex: 1, paddingTop: tight ? 2.5 : 3.5, paddingBottom: tight ? 18 : 22, paddingHorizontal: tight ? 4.5 : 5.5 },
    ackBottomRow: { flexDirection: 'row', minHeight: tight ? 45 : compact ? 55 : 65 },
    ackRecipientSig: { width: '40%', paddingTop: tight ? 2.5 : 3.5, paddingBottom: tight ? 12 : 16, paddingHorizontal: tight ? 4.5 : 5.5, borderRightWidth: 2, borderRightColor: '#9ca3af' },
    ackTechSig: { width: '30%', paddingTop: tight ? 2.5 : 3.5, paddingBottom: tight ? 12 : 16, paddingHorizontal: tight ? 4.5 : 5.5, borderRightWidth: 2, borderRightColor: '#9ca3af' },
    ackTechName: { width: '30%', paddingTop: tight ? 2.5 : 3.5, paddingBottom: tight ? 12 : 16, paddingHorizontal: tight ? 4.5 : 5.5 },
    ackFieldLabel: { fontSize: tight ? 5.4 : 5.8, color: '#6b7280', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    footer: {
      marginTop: compact ? 5 : 6,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: '#d4d3c8',
      fontSize: 5.5,
      color: '#6b7280',
      textAlign: 'center',
      textTransform: 'uppercase',
    },
  })
}

export function IndustryCsrTemplate({ csr, comments, branding, designPreset }: CsrPdfProps) {
  csr = csr || {} as CsrRenderModel
  const layoutDensity = getLayoutDensity(csr)
  const tightLayout = layoutDensity === 'tight'
  const compact = layoutDensity !== 'comfortable'
  const styles = createIndustryStyles(layoutDensity, designPreset)
  const status = getStatusValue(csr)
  const serviceStart = [safe(csr.start_date), safe(csr.start_time)].filter(Boolean).join(' / ')
  const serviceEnd = [safe(csr.end_date), safe(csr.end_time)].filter(Boolean).join(' / ')
  const technicianName = getTechnicianName(csr)
  const technicianSignatureUrl = getTechnicianSignatureUrl(csr)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandBox}>
              <PdfLogoSlot styles={styles} branding={branding} fallback="I" />
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
          <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
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
            {hasText(csr.callTypeDisplay) ? (
              <View style={[styles.fieldCard, { flex: 1, width: undefined }]}>
                <Text style={styles.fieldLabel}>Call Type</Text>
                <Text style={styles.fieldValue}>{safe(csr.callTypeDisplay)}</Text>
              </View>
            ) : null}
            {hasText(csr.serviceBasisDisplay) ? (
              <View style={[styles.fieldCard, { flex: 1, width: undefined }]}>
                <Text style={styles.fieldLabel}>Service Basis</Text>
                <Text style={styles.fieldValue}>{safe(csr.serviceBasisDisplay)}</Text>
              </View>
            ) : null}
            {hasText(csr.systemDownDisplay) ? (
              <View style={[styles.fieldCard, { flex: 1, width: undefined }]}>
                <Text style={styles.fieldLabel}>System Status</Text>
                <Text style={styles.fieldValue}>{safe(csr.systemDownDisplay)}</Text>
              </View>
            ) : null}
          </View>
        </PdfSection>

        <PdfSection styles={styles} title="Problem Reported">
          <View style={[styles.blockCard, styles.heroBlockCard]}>
            <Text style={styles.blockText}>{safe(csr.problem_reported) || ' '}</Text>
          </View>
        </PdfSection>

        <PdfSection styles={styles} title="Equipment Details">
          <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}><Text style={styles.fieldLabel}>Equipment Type</Text><Text style={styles.fieldValue}>{safe(csr.equipment_type)}</Text></View>
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}><Text style={styles.fieldLabel}>Make</Text><Text style={styles.fieldValue}>{safe(csr.make)}</Text></View>
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}><Text style={styles.fieldLabel}>{safe(csr.modelLabel) || 'Model'}</Text><Text style={styles.fieldValue}>{safe(csr.model)}</Text></View>
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}><Text style={styles.fieldLabel}>Engine No.</Text><Text style={styles.fieldValue}>{safe(csr.engine_no)}</Text></View>
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
          {shouldRender(true, csr.defects_found) ? (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.fieldLabel}>Defects Found</Text>
              <View style={[styles.blockCard, styles.heroBlockCard]}>
                <Text style={styles.blockText}>{safe(csr.defectsFound)}</Text>
              </View>
            </View>
          ) : null}
          {shouldRender(true, csr.technicianRemarks) ? (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.fieldLabel}>Technician Remarks</Text>
              <View style={[styles.blockCard, styles.mutedBlockCard]}>
                <Text style={styles.blockText}>{safe(csr.technicianRemarks)}</Text>
              </View>
            </View>
          ) : null}
        </PdfSection>

        {hasMaterials(csr) ? (
          <MaterialsSection styles={styles} csr={csr} templateId="industry" preferredStyle={tightLayout ? 'comma' : 'list'} />
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
            <View style={{ padding: tightLayout ? 2.5 : compact ? 3.5 : 4.5 }}>
              <View style={styles.ackContainer}>
                {csr.showAcknowledgement ? (
                  <View style={styles.ackTopRow}>
                    <View style={styles.ackTopHalf}>
                      <Text style={styles.ackFieldLabel}>Recipient Name</Text>
                      <Text style={[styles.fieldValue, { marginTop: 5 }]}>
                        {hasText(csr.acknowledgement_name) ? csr.acknowledgement_name : ' '}
                      </Text>
                    </View>
                    <View style={styles.ackTopHalfLast}>
                      <Text style={styles.ackFieldLabel}>Comment</Text>
                      {hasText(csr.customer_feedback) ? (
                        <Text style={[styles.blockText, { marginTop: 5 }]}>{csr.customer_feedback}</Text>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                <View style={styles.ackBottomRow}>
                  {csr.showAcknowledgement ? (
                    <View style={styles.ackRecipientSig}>
                      <Text style={styles.ackFieldLabel}>Recipient Signature</Text>
                      <View style={{ flex: 1, width: '100%' }} />
                    </View>
                  ) : null}

                  {csr.showTechnicianSignLine ? (
                    <>
                      <View style={styles.ackTechSig}>
                        <Text style={styles.ackFieldLabel}>Technician Signature</Text>
                        <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                          {technicianSignatureUrl ? (
                            <Image
                              src={technicianSignatureUrl}
                              style={{ maxHeight: 50, maxWidth: 88, objectFit: 'contain' }}
                            />
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.ackTechName}>
                        <Text style={styles.ackFieldLabel}>Technician Name</Text>
                        <View style={{ flex: 1, width: '100%', justifyContent: 'center' }}>
                          {hasText(technicianName) ? (
                            <Text style={styles.fieldValue}>{technicianName}</Text>
                          ) : null}
                        </View>
                      </View>
                    </>
                  ) : null}
                </View>
              </View>
            </View>
          </PdfSection>
        ) : null}

        <ClientNotesBlock comments={comments} />
        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}
