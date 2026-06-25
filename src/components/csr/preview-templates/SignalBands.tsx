import React from 'react'
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import type { CsrRenderModel } from '@/domain/csr/csrRenderModel'
import {
  getLayoutDensity,
  getFillablePdfTheme,
  getStatusValue,
  shouldRender,
  safe,
  hasOperationalReadings,
  hasMaterials,
  hasText,
  getTechnicianName,
  getTechnicianSignatureUrl,
} from './utils'
import {
  SharedEquipmentSection,
  ReadingsStrip,
  MaterialsSection,
  StatusListChecks,
  ServiceTimeSection,
  PdfField,
  PdfLogoSlot,
  PdfBrandBlock,
} from './components'
import { ClientNotesBlock } from './ClientNotesBlock'
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
      backgroundColor: '#7e1f1f',
      borderRadius: 10,
      paddingVertical: tight ? 7 : 8,
      paddingHorizontal: tight ? 9 : 10,
      marginBottom: compact ? 6 : 8,
    },
    brandBlock: { flex: 1 },
    logoSlot: {
      width: 96,
      height: 128,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoImage: { maxWidth: 96, maxHeight: 128, objectFit: 'contain' },
    logoSlotText: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' },
    companyName: { fontSize: 16, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    companyTagline: { fontSize: 7.2, color: '#FDE68A', marginTop: 2 },
    contactLine: { fontSize: 6.6, color: '#ffffff', marginTop: 3, lineHeight: 1.2 },
    identityCard: {
      width: tight ? 200 : 220,
      backgroundColor: '#ffffff22',
      borderWidth: 1,
      borderColor: '#ffffff33',
      borderRadius: 10,
      padding: tight ? 6 : 7,
    },
    identityGrid: { flexDirection: 'column', gap: 6 },
    identityRow: { flexDirection: 'row', gap: 6 },
    identityHalf: { flex: 1 },
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
      marginRight: 4,
      marginBottom: 4,
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
    ackContainer: { borderWidth: 1, borderColor: '#e7d7c8', borderRadius: 12, overflow: 'hidden' },
    ackTopRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e7d7c8' },
    ackTopHalf: { flex: 1, paddingVertical: tight ? 6 : 8, paddingHorizontal: tight ? 7 : 10, borderRightWidth: 1, borderRightColor: '#e7d7c8' },
    ackTopHalfLast: { flex: 1, paddingVertical: tight ? 6 : 8, paddingHorizontal: tight ? 7 : 10 },
    ackBottomRow: { flexDirection: 'row', minHeight: 150 },
    ackRecipientSig: { width: '40%', paddingVertical: tight ? 6 : 8, paddingHorizontal: tight ? 7 : 10, borderRightWidth: 2, borderRightColor: '#9ca3af' },
    ackTechSig: { width: '30%', paddingVertical: tight ? 6 : 8, paddingHorizontal: tight ? 7 : 10, borderRightWidth: 2, borderRightColor: '#9ca3af' },
    ackTechName: { width: '30%', paddingVertical: tight ? 6 : 8, paddingHorizontal: tight ? 7 : 10 },
    ackFieldLabel: { fontSize: 6.5, color: '#78716c', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },

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

export function SignalBandsTemplate({ csr, comments, branding, designPreset }: CsrPdfProps) {
  csr = csr || {} as CsrRenderModel
  const density = getLayoutDensity(csr)
  const compact = density !== 'comfortable'
  const styles = createSignalBandsStyles(density, designPreset)
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

  const SignalBandsHeader = ({ styles, csr, branding }: any) => (
    <View style={styles.headerRow}>
      <View style={{ flexDirection: 'row', gap: 8, flex: 1, alignItems: 'center' }}>
        <PdfLogoSlot styles={styles} branding={branding} />
        <PdfBrandBlock styles={styles} branding={branding} />
      </View>
      <View style={styles.identityCard}>
        <View style={styles.identityGrid}>
          <View style={styles.identityRow}>
            <View style={styles.identityHalf}>
              <Text style={styles.metaLabel}>CSR Number</Text>
              <Text style={styles.metaValue}>{safe(csr.csr_number)}</Text>
            </View>
            <View style={styles.identityHalf}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{safe(csr.date)}</Text>
            </View>
          </View>
          {csr.show_po && hasText(csr.po_number) ? (
            <View style={styles.identityFull}>
              <Text style={styles.metaLabel}>P.O. Number</Text>
              <Text style={styles.metaValue}>{safe(csr.po_number)}</Text>
            </View>
          ) : null}
          {hasText(csr.callTypeDisplay) ? (
            <View style={styles.identityFull}>
              <Text style={styles.metaLabel}>Call Type</Text>
              <Text style={styles.metaValue}>{safe(csr.callTypeDisplay)}</Text>
            </View>
          ) : null}
          {hasText(csr.systemDownDisplay) ? (
            <View style={styles.identityFull}>
              <Text style={styles.metaLabel}>System Status</Text>
              <Text style={styles.metaValue}>{safe(csr.systemDownDisplay)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <SignalBandsHeader styles={styles} csr={csr} branding={branding} />

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

        {shouldRender(true, csr.defects_found) ? (
          <Band colorStyle={styles.bandKeyCharcoal} title="Defects Found" sub="Additional issues identified during inspection.">
            <View style={styles.textAreaOnly}>
              <Text style={styles.blockText}>{safe(csr.defectsFound)}</Text>
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
            <MaterialsSection styles={styles} csr={csr} templateId="signalbands" noSection />
          </Band>
        ) : null}

        <Band colorStyle={styles.bandKeyCharcoal} title="Status" sub="Operational outcome and support state.">
          <StatusListChecks styles={styles} status={status} />
        </Band>

        <Band colorStyle={styles.bandKeyTeal} title="Service Time" sub="Attendance start and close timestamps.">
          <ServiceTimeSection styles={styles} csr={csr} />
        </Band>

        {csr.showAcknowledgement || csr.showTechnicianSignLine ? (
          <Band colorStyle={styles.bandKeyCharcoal} title="Acknowledgement" sub="Recipient identity, approval, and signature fields.">
            <View style={{ padding: compact ? 6 : 8 }}>
              <View style={styles.ackContainer}>
                {csr.showAcknowledgement ? (
                  <View style={styles.ackTopRow}>
                    <View style={styles.ackTopHalf}>
                      <Text style={styles.ackFieldLabel}>Recipient Name</Text>
                      <Text style={[styles.fieldValue, { marginTop: 6 }]}>
                        {hasText(csr.acknowledgement_name) ? csr.acknowledgement_name : ' '}
                      </Text>
                    </View>
                    <View style={styles.ackTopHalfLast}>
                      <Text style={styles.ackFieldLabel}>Comment</Text>
                      {hasText(csr.customer_feedback) ? (
                        <Text style={[styles.blockText, { marginTop: 6 }]}>{csr.customer_feedback}</Text>
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
                          {getTechnicianSignatureUrl(csr) ? (
                            <Image src={getTechnicianSignatureUrl(csr)} style={{ maxHeight: 56, maxWidth: 96, objectFit: 'contain' }} />
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.ackTechName}>
                        <Text style={styles.ackFieldLabel}>Technician Name</Text>
                        <View style={{ flex: 1, width: '100%', justifyContent: 'center' }}>
                          {hasText(getTechnicianName(csr)) ? (
                            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold' }}>{getTechnicianName(csr)}</Text>
                          ) : null}
                        </View>
                      </View>
                    </>
                  ) : null}
                </View>
              </View>
            </View>
          </Band>
        ) : null}

        <ClientNotesBlock comments={comments} />
        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}
