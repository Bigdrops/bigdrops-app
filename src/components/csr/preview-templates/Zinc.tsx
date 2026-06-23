import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { CsrRenderModel } from '@/domain/csr/csrRenderModel'
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
  PdfBrandBlock,
  PdfSection,
  PdfField,
  PdfTextBlock,
  ReadingsStrip,
  MaterialsSection,
  PdfSignatureCard,
} from './components'
import { ClientNotesBlock } from './ClientNotesBlock'
import { resolveZincLifecycleStages, safeText } from './layoutModel'
import type { CsrPdfProps } from './types'

function createZincStyles(density = 'comfortable', designPreset: any) {
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
      gap: 8,
      marginBottom: compact ? 6 : 8,
    },
    logoSlot: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoImage: { width: 48, height: 'auto', objectFit: 'contain' },
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
    lifecycleDotActive: { backgroundColor: fillableColor },
    lifecycleLabel: { fontSize: 6.1, color: '#a1a1aa', textAlign: 'center' },
    lifecycleLabelActive: { color: fillableColor, fontFamily: fillableBold },
    lifecycleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    lifecycleCurrentLabel: { fontSize: 6.4, color: '#a1a1aa', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    lifecycleCurrentText: { fontSize: 8.5, color: fillableColor, fontFamily: fillableBold, marginTop: 2 },
    lifecycleBadge: { backgroundColor: '#ffffff', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6, borderWidth: 1, borderColor: fillableColor },
    lifecycleBadgeText: { fontSize: 6.6, color: fillableColor, textTransform: 'uppercase', fontFamily: fillableBold },

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

export function ZincTemplate({ csr, comments, branding, designPreset }: CsrPdfProps) {
  csr = csr || {} as CsrRenderModel
  const styles = createZincStyles(getLayoutDensity(csr), designPreset)
  const status = getStatusValue(csr)
  const technicianName = getTechnicianName(csr)
  const technicianRole = getTechnicianRole(csr)
  const technicianSignatureUrl = getTechnicianSignatureUrl(csr)
  const stages = resolveZincLifecycleStages(status)
  const statusLabel = safeText(status) || 'Pending'
  const lifecycleBadgeLabel = statusLabel === 'Working solution provided' ? 'Under Observation' : statusLabel

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerTop}>
          {branding.logoUrl ? (
            <View style={{ backgroundColor: '#ffffff', borderRadius: 4, padding: 2 }}>
              <Image src={branding.logoUrl} style={styles.logoImage} />
            </View>
          ) : null}
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
              <Text style={styles.fieldLabel}>Address</Text>
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
            {hasText(csr.callTypeDisplay) ? (
              <PdfField styles={styles} label="Call Type" value={csr.callTypeDisplay} />
            ) : null}
            {hasText(csr.systemDownDisplay) ? (
              <PdfField styles={styles} label="System Status" value={csr.systemDownDisplay} />
            ) : null}
          </View>
        </PdfSection>

        <PdfSection styles={styles} title="Asset Identity & Telemetry">
          <View style={styles.grid4}>
            <View style={[styles.fieldCard, { width: '25%' }]}><Text style={styles.fieldLabel}>Equipment Type</Text><Text style={styles.fieldValue}>{safe(csr.equipment_type)}</Text></View>
            <View style={[styles.fieldCard, { width: '25%' }]}><Text style={styles.fieldLabel}>Make/Model</Text><Text style={styles.fieldValue}>{[safe(csr.make), safe(csr.model)].filter(Boolean).join(' ')}</Text></View>
            <View style={[styles.fieldCard, { width: '25%' }]}><Text style={styles.fieldLabel}>Serial No.</Text><Text style={styles.fieldValue}>{safe(csr.serial_no)}</Text></View>
            <View style={[styles.fieldCard, { width: '25%' }]}><Text style={styles.fieldLabel}>Engine No.</Text><Text style={styles.fieldValue}>{safe(csr.engine_no)}</Text></View>
            <View style={[styles.fieldCard, { width: '25%' }]}><Text style={styles.fieldLabel}>Capacity</Text><Text style={styles.fieldValue}>{safe(csr.capacity)}</Text></View>
            <View style={[styles.fieldCard, { width: '75%' }]}><Text style={styles.fieldLabel}>Equipment Location</Text><Text style={styles.fieldValue}>{safe(csr.equipment_location)}</Text></View>
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
          {shouldRender(true, csr.defects_found) ? (
            <View style={{ marginTop: 6 }}>
              <PdfTextBlock styles={styles} label="Defects Found" value={csr.defectsFound} />
            </View>
          ) : null}
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
              {stages.map((stage) => {
                const active = stage.active
                return (
                  <View key={stage.label} style={styles.lifecycleNode}>
                    <View
                      style={[
                        styles.lifecycleDot,
                        active ? styles.lifecycleDotActive : null,
                      ]}
                    />
                    <Text style={[styles.lifecycleLabel, active ? styles.lifecycleLabelActive : null]}>
                      {stage.label}
                    </Text>
                  </View>
                )
              })}
            </View>
            <View style={styles.lifecycleFooter}>
              <View>
                <Text style={styles.lifecycleCurrentLabel}>Current Status</Text>
                <Text style={styles.lifecycleCurrentText}>{statusLabel}</Text>
              </View>
              <View style={styles.lifecycleBadge}>
                <Text style={styles.lifecycleBadgeText}>{lifecycleBadgeLabel}</Text>
              </View>
            </View>
          </View>
        </PdfSection>

        {hasMaterials(csr) || shouldRender(true, csr.customer_feedback) ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {hasMaterials(csr) ? (
              <View style={{ flex: 1 }}>
                <MaterialsSection styles={styles} csr={csr} templateId="zinc" />
              </View>
            ) : null}
            {shouldRender(true, csr.customer_feedback) ? (
              <View style={{ flex: 1 }}>
                <PdfSection styles={styles} title="Customer Feedback">
                  <View style={[styles.blockCard, { borderWidth: 1, borderColor: '#e4e4e7' }]}>
                    <Text style={styles.blockText}>{safe(csr.customer_feedback)}</Text>
                  </View>
                </PdfSection>
              </View>
            ) : null}
          </View>
        ) : null}

        {csr.showTechnicianSignLine || csr.showAcknowledgement ? (
          <PdfSection styles={styles} title="Acknowledgement">
            {csr.showAcknowledgement ? (
              <View style={[styles.fieldCard, { width: '100%', marginBottom: 4 }]}>
                <Text style={styles.fieldLabel}>Recipient name/title</Text>
                <Text style={styles.fieldValue}>{safe(csr.acknowledgement_name) || ' '}</Text>
              </View>
            ) : null}

            {shouldRender(true, csr.customer_feedback) ? (
              <View style={[styles.blockCard, { marginBottom: 6 }]}>
                <Text style={styles.fieldLabel}>Comment</Text>
                <Text style={styles.blockText}>{safe(csr.customer_feedback)}</Text>
              </View>
            ) : null}

            <View style={styles.ackGrid}>
              {csr.showAcknowledgement ? (
                <View style={[styles.signCard, { padding: 8, backgroundColor: '#f4f4f5', borderRadius: 4, borderWidth: 1, borderColor: '#e4e4e7' }]}>
                  <View style={{ height: 24, backgroundColor: '#ffffff', borderRadius: 4, marginBottom: 4 }} />
                  <Text style={styles.signLabel}>Recipient Signature</Text>
                  {hasText(csr.acknowledgement_name) ? <Text style={styles.fieldValue}>{safe(csr.acknowledgement_name)}</Text> : null}
                </View>
              ) : null}

              {csr.showTechnicianSignLine ? (
                <View style={[styles.signCard, { padding: 8, backgroundColor: '#f4f4f5', borderRadius: 4, borderWidth: 1, borderColor: '#e4e4e7' }]}>
                  {technicianSignatureUrl ? (
                    <View style={{ height: 24, marginBottom: 4, justifyContent: 'flex-end' }}>
                      <Image src={technicianSignatureUrl} style={{ maxHeight: 24, maxWidth: 92, objectFit: 'contain' }} />
                    </View>
                  ) : (
                    <View style={{ height: 24, backgroundColor: '#ffffff', borderRadius: 4, marginBottom: 4 }} />
                  )}
                  <Text style={styles.signLabel}>Technician Signature</Text>
                  <Text style={[styles.fieldValue, { width: '100%', flex: 1 }]}>
                    {technicianRole ? technicianRole : ''}{technicianRole && technicianName ? ' - ' : ''}{technicianName ? technicianName : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          </PdfSection>
        ) : null}

        <ClientNotesBlock comments={comments} />
        {branding.footerText ? <Text style={styles.footer}>{branding.footerText}</Text> : null}
      </Page>
    </Document>
  )
}
