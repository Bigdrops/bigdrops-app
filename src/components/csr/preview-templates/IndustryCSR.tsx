import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { CsrRenderModel } from '@/domain/csr/csrRenderModel'
import {
  getLayoutDensity,
  getFillablePdfTheme,
  getStatusValue,
  shouldRender,
  safe,
  hasText,
  getTechnicianName,
  getTechnicianSignatureUrl,
} from './utils'
import {
  SharedProblemSection,
  DefectsFoundBlock,
  SharedEquipmentSection,
  ReadingsCardGrid,
  PdfSection,
  MaterialsSection,
  StatusListDots,
  ServiceTimeSection,
  CustomerFeedbackSection,
  PdfSignatureCard,
} from './components'
import { ClientNotesBlock } from './ClientNotesBlock'
import type { CsrPdfProps } from './types'

function createIndustryCsrStyles(density = 'comfortable', designPreset: any) {
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
      fontFamily: 'Helvetica',
      fontSize: tight ? 7.7 : compact ? 8.2 : 8.6,
      color: '#333333',
    },

    // ── Header (Invoice Industry proportions) ──
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'stretch',
      marginBottom: 6,
    },
    headerLeft: {
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      paddingRight: 18,
    },
    headerRight: {
      width: 96,
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
    },
    logo: {
      width: 86,
      height: 86,
      objectFit: 'contain',
    },
    title: {
      fontSize: 27,
      color: '#1f2937',
      marginBottom: 2,
      letterSpacing: 1.2,
      fontFamily: 'Helvetica-Bold',
    },
    customTitle: {
      fontSize: 14,
      color: '#6b7280',
      marginBottom: 16,
      fontFamily: 'Helvetica',
    },
    metaList: {
      marginTop: 0,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    metaLabel: {
      width: 96,
      flexShrink: 0,
      color: '#666666',
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
    },
    metaValue: {
      flex: 1,
      flexGrow: 1,
      flexShrink: 1,
      color: '#333333',
      fontSize: 10,
      lineHeight: 1.3,
    },

    // ── Summary cards row ──
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

    // ── Shared field primitives ──
    fieldLabel: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#64748b',
      fontFamily: 'Helvetica-Bold',
      marginBottom: 3,
    },
    fieldValue: {
      fontSize: tight ? 8 : compact ? 8.5 : 9,
      color: fillableColor,
      fontFamily: fillableBold,
      lineHeight: 1.15,
    },
    blockText: {
      fontSize: tight ? 7.2 : compact ? 7.6 : 8,
      color: fillableColor,
      fontFamily: fillableRegular,
      lineHeight: tight ? 1.25 : 1.35,
    },

    // ── Section wrapper ──
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
      backgroundColor: templateAccentColor || '#0f172a',
      fontSize: tight ? 6.7 : 7.2,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
    },

    // ── Grids ──
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
    blockCard: {
      paddingVertical: tight ? 5 : 6,
      paddingHorizontal: tight ? 6 : 7,
      minHeight: tight ? 30 : compact ? 34 : 38,
    },

    // ── Readings ──
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
    readingLabel: {
      fontSize: 6.1,
      color: '#475569',
      textTransform: 'uppercase',
      fontFamily: 'Helvetica-Bold',
      marginBottom: 2,
      textAlign: 'center',
    },
    readingValue: { fontSize: 10, color: fillableColor, fontFamily: fillableBold },

    // ── Service ──
    serviceGrid: { flexDirection: 'row' },
    serviceCard: {
      flex: 1,
      paddingVertical: tight ? 5 : 6,
      paddingHorizontal: tight ? 6 : 7,
      borderRightWidth: 1,
      borderColor: '#e2e8f0',
      minHeight: tight ? 46 : compact ? 52 : 60,
    },

    // ── Status ──
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
    statusDotActive: { borderColor: templateAccentColor || '#0f172a', backgroundColor: templateAccentColor || '#0f172a' },
    statusText: { fontSize: 6.8, color: fillableColor, fontFamily: fillableBold, textTransform: 'uppercase' },

    // ── Text area ──
    textAreaOnly: { padding: compact ? 6 : 8, minHeight: tight ? 24 : 30 },

    // ── Signature ──
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

    // ── Footer ──
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

export function IndustryCSRTemplate({ csr, comments, branding, designPreset }: CsrPdfProps) {
  csr = csr || {} as CsrRenderModel
  const styles = createIndustryCsrStyles(getLayoutDensity(csr), designPreset)
  const status = getStatusValue(csr)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Header (Invoice Industry style) ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>CERTIFICATE OF SERVICE</Text>
            {branding.companyName ? (
              <Text style={styles.customTitle}>{branding.companyName}</Text>
            ) : null}

            <View style={styles.metaList}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>CSR Number</Text>
                <Text style={styles.metaValue}>{safe(csr.csr_number)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{safe(csr.date)}</Text>
              </View>
              {csr.show_po && hasText(csr.po_number) ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>P.O. Number</Text>
                  <Text style={styles.metaValue}>{safe(csr.po_number)}</Text>
                </View>
              ) : null}
              {hasText(csr.callTypeDisplay) ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Call Type</Text>
                  <Text style={styles.metaValue}>{safe(csr.callTypeDisplay)}</Text>
                </View>
              ) : null}
              {hasText(csr.systemDownDisplay) ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>System Status</Text>
                  <Text style={styles.metaValue}>{safe(csr.systemDownDisplay)}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {branding.logoUrl ? (
            <View style={styles.headerRight}>
              <Image src={branding.logoUrl} style={styles.logo} />
            </View>
          ) : null}
        </View>

        {/* ── Summary cards ── */}
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

        {/* ── Body sections ── */}
        <SharedProblemSection styles={styles} csr={csr} />
        <DefectsFoundBlock styles={styles} csr={csr} />
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
          <MaterialsSection styles={styles} csr={csr} templateId="industry" />
        </PdfSection>

        <PdfSection styles={styles} title="Status">
          <StatusListDots styles={styles} status={status} />
        </PdfSection>

        <ServiceTimeSection styles={styles} csr={csr} />
        <CustomerFeedbackSection styles={styles} csr={csr} />

        {/* ── Acknowledgement & Signature ── */}
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
                <PdfSignatureCard
                  styles={styles}
                  label="Signature"
                  name={csr.acknowledgement_name}
                />
              ) : null}

              {csr.showTechnicianSignLine ? (
                <PdfSignatureCard
                  styles={styles}
                  label="Signature"
                  name={getTechnicianName(csr)}
                  signatureUrl={getTechnicianSignatureUrl(csr)}
                />
              ) : null}
            </View>
          </PdfSection>
        ) : null}

        {/* ── Client Notes ── */}
        <ClientNotesBlock comments={comments} />

        {/* ── Footer ── */}
        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}
