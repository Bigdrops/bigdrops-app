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
  const accent = designPreset?.accent || '#7D8A88'
  return StyleSheet.create({
    page: {
      paddingTop: tight ? 6 : 8,
      paddingBottom: tight ? 6 : 8,
      paddingHorizontal: tight ? 6 : 8,
      backgroundColor: '#ffffff',
      color: '#374151',
      fontFamily: 'Helvetica',
      fontSize: tight ? 7.2 : compact ? 7.5 : 7.8,
    },

    // ── Header ──────────────────────────────────────────
    header: {
      marginBottom: tight ? 4 : compact ? 5 : 6,
    },
    headerTop: {
      backgroundColor: accent,
      paddingVertical: tight ? 8 : 10,
      paddingHorizontal: tight ? 10 : 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    logoSlot: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoImage: { width: 48, height: 'auto', objectFit: 'contain' },
    logoSlotText: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' },
    brandBlock: { flex: 1 },
    companyName: {
      fontSize: tight ? 12 : 14,
      color: '#ffffff',
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    companyTagline: {
      fontSize: tight ? 5.5 : 6.2,
      color: '#dce5e2',
      textTransform: 'uppercase',
      marginTop: 2,
    },
    contactLine: {
      fontSize: tight ? 5.4 : 6.1,
      color: '#c8d4d0',
      marginTop: 2,
      lineHeight: tight ? 1.1 : 1.3,
    },
    docIdRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: tight ? 4 : 5,
      paddingHorizontal: tight ? 10 : 12,
      borderBottomWidth: 2,
      borderBottomColor: accent,
      marginBottom: tight ? 4 : compact ? 5 : 6,
    },
    docTitle: {
      fontSize: tight ? 9 : 10,
      color: '#374151',
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    docNumberBlock: {
      alignItems: 'flex-end',
    },
    docNumberLabel: {
      fontSize: 5.5,
      color: '#9CA3AF',
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 0.3,
    },
    docNumberValue: {
      fontSize: 10,
      color: fillableColor,
      fontFamily: fillableBold,
      marginTop: 1,
    },
    docDate: {
      fontSize: 6,
      color: '#9CA3AF',
      marginTop: 1,
    },

    // ── Sections ────────────────────────────────────────
    section: { marginBottom: tight ? 3 : compact ? 4 : 5 },
    sectionTitle: {
      fontSize: 6.8,
      color: accent,
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 0.4,
      paddingBottom: tight ? 1.5 : 2,
      borderBottomWidth: 1,
      borderBottomColor: accent,
      marginBottom: tight ? 3 : compact ? 4 : 5,
    },

    // ── Fields ──────────────────────────────────────────
    fieldLabel: { fontSize: tight ? 5.2 : 5.6, color: '#9CA3AF', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    fieldValue: { fontSize: tight ? 6.8 : compact ? 7.4 : 7.8, color: fillableColor, fontFamily: fillableBold, lineHeight: 1.1 },
    blockText: { fontSize: tight ? 6.3 : compact ? 6.8 : 7.2, color: fillableColor, fontFamily: fillableRegular, lineHeight: tight ? 1.1 : 1.25 },

    fieldRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: compact ? 3 : 4,
      marginBottom: tight ? 2 : compact ? 2.5 : 3,
    },
    fieldCard: {
      width: '24%',
      backgroundColor: '#F7F9F8',
      borderRadius: 3,
      paddingVertical: tight ? 2.5 : 4,
      paddingHorizontal: tight ? 3 : 5,
      borderBottomWidth: 1.5,
      borderBottomColor: '#E5E9E8',
    },
    blockCard: {
      backgroundColor: '#F7F9F8',
      borderRadius: 3,
      paddingVertical: tight ? 3.5 : 5,
      paddingHorizontal: tight ? 4.5 : 6,
      minHeight: tight ? 22 : compact ? 28 : 32,
      borderBottomWidth: 1.5,
      borderBottomColor: '#E5E9E8',
    },
    heroBlockCard: {
      backgroundColor: '#EFF6F3',
      borderBottomColor: accent,
    },
    mutedBlockCard: {
      backgroundColor: '#F7F9F8',
      borderBottomColor: '#E5E9E8',
    },

    // ── Readings ────────────────────────────────────────
    readingsSection: {
      backgroundColor: '#F7F9F8',
      borderRadius: 3,
      paddingVertical: tight ? 3 : 4,
      paddingHorizontal: tight ? 3 : 4,
      marginTop: 2,
      borderBottomWidth: 1.5,
      borderBottomColor: '#E5E9E8',
    },
    readingStrip: { flexDirection: 'row' },
    readingStripCell: {
      flex: 1,
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: '#E5E9E8',
      paddingVertical: 3,
    },
    readingStripCellLast: { borderRightWidth: 0 },
    readingLabel: { fontSize: 5.2, color: '#9CA3AF', textTransform: 'uppercase', marginTop: 2, fontFamily: 'Helvetica-Bold' },
    readingValue: { fontSize: 8.2, color: fillableColor, fontFamily: fillableBold },

    // ── Table ───────────────────────────────────────────
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#F1F4F3',
      borderBottomWidth: 1,
      borderBottomColor: '#D1D5D4',
      marginTop: 2,
    },
    tableHead: {
      fontSize: tight ? 5.4 : 6,
      color: '#9CA3AF',
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
      paddingVertical: tight ? 2.5 : 4,
      paddingHorizontal: tight ? 3.5 : 5,
      borderRightWidth: 1,
      borderRightColor: '#E5E9E8',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#F1F4F3',
    },
    tableCell: {
      fontSize: tight ? 6.5 : 7.2,
      color: fillableColor,
      fontFamily: fillableBold,
      paddingVertical: tight ? 2.5 : 4,
      paddingHorizontal: tight ? 3.5 : 5,
      borderRightWidth: 1,
      borderRightColor: '#F1F4F3',
    },

    // ── Status ──────────────────────────────────────────
    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 3.5 : 4, marginTop: 2 },
    statusItem: {
      flex: 1,
      minWidth: '18%',
      paddingVertical: tight ? 3.5 : 4.5,
      paddingHorizontal: 4.5,
      borderWidth: 1,
      borderColor: '#D1D5D4',
      borderRadius: 3,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: tight ? 16 : 22,
    },
    statusItemActive: {
      backgroundColor: accent,
      borderColor: accent,
    },
    statusText: { fontSize: 6.2, color: '#9CA3AF', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', textAlign: 'center' },
    statusTextActive: { color: '#ffffff' },

    // ── Acknowledgement ─────────────────────────────────
    textAreaOnly: {},
    ackGrid: { flexDirection: 'row', gap: tight ? 3.5 : compact ? 5 : 6, marginTop: tight ? 3.5 : compact ? 5 : 6 },
    signRow: { display: 'none' },
    signCard: {
      flex: 1,
      borderRadius: 3,
      paddingVertical: tight ? 3.5 : 5,
      paddingHorizontal: tight ? 4.5 : 6,
      backgroundColor: '#F7F9F8',
      borderBottomWidth: 1.5,
      borderBottomColor: '#E5E9E8',
    },
    signSpace: {
      height: tight ? 8 : 14,
      marginBottom: 3,
    },
    signLabel: { fontSize: 6, color: '#9CA3AF', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    ackContainer: { borderWidth: 1, borderColor: '#D1D5D4', borderRadius: 3, overflow: 'hidden' },
    ackTopRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#D1D5D4' },
    ackTopHalf: { flex: 1, paddingTop: tight ? 2.5 : 3.5, paddingBottom: tight ? 18 : 22, paddingHorizontal: tight ? 4.5 : 5.5, borderRightWidth: 1, borderRightColor: '#D1D5D4' },
    ackTopHalfLast: { flex: 1, paddingTop: tight ? 2.5 : 3.5, paddingBottom: tight ? 18 : 22, paddingHorizontal: tight ? 4.5 : 5.5 },
    ackBottomRow: { flexDirection: 'row', minHeight: tight ? 45 : compact ? 55 : 65 },
    ackRecipientSig: { width: '40%', paddingTop: tight ? 2.5 : 3.5, paddingBottom: tight ? 12 : 16, paddingHorizontal: tight ? 4.5 : 5.5, borderRightWidth: 2, borderRightColor: accent },
    ackTechSig: { width: '30%', paddingTop: tight ? 2.5 : 3.5, paddingBottom: tight ? 12 : 16, paddingHorizontal: tight ? 4.5 : 5.5, borderRightWidth: 2, borderRightColor: accent },
    ackTechName: { width: '30%', paddingTop: tight ? 2.5 : 3.5, paddingBottom: tight ? 12 : 16, paddingHorizontal: tight ? 4.5 : 5.5 },
    ackFieldLabel: { fontSize: tight ? 5.4 : 5.8, color: '#9CA3AF', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },

    // ── Footer ──────────────────────────────────────────
    footer: {
      marginTop: compact ? 5 : 6,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: '#E5E9E8',
      fontSize: 5.5,
      color: '#9CA3AF',
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
        {/* ── Header ─────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <PdfLogoSlot styles={styles} branding={branding} fallback="I" />
            <PdfBrandBlock styles={styles} branding={branding} />
          </View>
          <View style={styles.docIdRow}>
            <Text style={styles.docTitle}>Customer Service Report</Text>
            <View style={styles.docNumberBlock}>
              <Text style={styles.docNumberLabel}>Report No.</Text>
              <Text style={styles.docNumberValue}>{safe(csr.csr_number)}</Text>
              <Text style={styles.docDate}>{safe(csr.date)}</Text>
            </View>
          </View>
        </View>

        {/* ── Customer & Job Details ─────────────────── */}
        <PdfSection styles={styles} title="Customer & Job Details">
          <View style={styles.fieldRow}>
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
                <Text style={styles.fieldLabel}>P.O. Number</Text>
                <Text style={styles.fieldValue}>{safe(csr.po_number)}</Text>
              </View>
            ) : null}
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}>
              <Text style={styles.fieldLabel}>Service Start</Text>
              <Text style={styles.fieldValue}>{serviceStart || 'Not recorded'}</Text>
            </View>
            <View style={[styles.fieldCard, { flex: 1, width: undefined }]}>
              <Text style={styles.fieldLabel}>Service End</Text>
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

        {/* ── Problem Reported ───────────────────────── */}
        <PdfSection styles={styles} title="Problem Reported">
          <View style={[styles.blockCard, styles.heroBlockCard]}>
            <Text style={styles.blockText}>{safe(csr.problem_reported) || ' '}</Text>
          </View>
        </PdfSection>

        {/* ── Equipment Details ──────────────────────── */}
        <PdfSection styles={styles} title="Equipment Details">
          <View style={styles.fieldRow}>
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

        {/* ── Service Rendered ───────────────────────── */}
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
          <MaterialsSection styles={styles} csr={csr} templateId="industry"  />
        ) : null}

        {/* ── Status ─────────────────────────────────── */}
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

        {/* ── Acknowledgement ────────────────────────── */}
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
