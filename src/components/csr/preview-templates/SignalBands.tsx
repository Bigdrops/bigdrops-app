import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  getLayoutDensity,
  getFillablePdfTheme,
  getStatusValue,
  shouldRender,
  safe,
  hasOperationalReadings,
  hasMaterials,
  hasText,
} from './utils'
import {
  StructuredTopIdentity,
  SharedEquipmentSection,
  ReadingsStrip,
  MaterialsPillsInline,
  StatusListChecks,
  ServiceTimeSection,
  CustomerFeedbackSection,
  AcknowledgementBlock,
  PdfField,
} from './components'
import type { CsrPdfProps } from './types'

function createSignalBandsStyles(density = 'comfortable', designPreset: any) {
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

    sectionTitle: { height: 0, overflow: 'hidden', margin: 0, padding: 0 },
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

export function SignalBandsTemplate({ csr, branding, designPreset }: CsrPdfProps) {
  const styles = createSignalBandsStyles(getLayoutDensity(csr), designPreset)
  const status = getStatusValue(csr)

  const Band = ({ colorStyle, title, sub, children }: any) => (
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
            <MaterialsPillsInline styles={styles} csr={csr} />
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
