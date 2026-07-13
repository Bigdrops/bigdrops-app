import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { CsrRenderModel } from '@/domain/csr/csrRenderModel'
import {
  getLayoutDensity,
  getFillablePdfTheme,
  getStatusValue,
  shouldRender,
  hasOperationalReadings,
  hasMaterials,
  hasText,
  safe,
} from './utils'
import {
  PdfBrandBlock,
  PdfField,
  PdfTextBlock,
  PdfLogoSlot,
  AcknowledgementBlock,
  ReadingsStrip,
} from './components'
import { ClientNotesBlock } from './ClientNotesBlock'
import { getMaterialsRows } from './utils'
import type { CsrPdfProps } from './types'

const TEAL = '#0D7377'
const GOLD = '#D4A857'
const COPPER = '#B85C3A'
const CREAM = '#FFF8F0'
const DARK = '#1A1A2E'

function createStyles(density = 'comfortable', designPreset: any) {
  const compact = density !== 'comfortable'
  const tight = density === 'tight'
  const { fillableColor, fillableBold, fillableRegular } = getFillablePdfTheme(designPreset)
  return StyleSheet.create({
    page: { paddingTop: tight ? 10 : 12, paddingBottom: tight ? 8 : 10, paddingHorizontal: tight ? 10 : 12, backgroundColor: '#FFFAF5', color: '#3A2E20', fontFamily: 'Helvetica', fontSize: tight ? 7.4 : compact ? 7.8 : 8 },
    headerOuter: { marginBottom: compact ? 6 : 8, borderTopLeftRadius: 10, borderTopRightRadius: 10, overflow: 'hidden' },
    headerBg: { backgroundColor: TEAL, paddingVertical: tight ? 8 : 10, paddingHorizontal: tight ? 10 : 12 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    brandBlock: { flex: 1 },
    companyName: { fontSize: 16, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    companyTagline: { fontSize: 6.5, color: '#BDD8D9', marginTop: 2, textTransform: 'uppercase' },
    contactLine: { fontSize: 6.5, color: '#BDD8D9', marginTop: 2 },
    idBlock: { alignItems: 'flex-end' },
    idLabel: { fontSize: 6, color: '#BDD8D9', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    idValue: { fontSize: 11, color: '#ffffff', fontFamily: 'Helvetica-Bold', marginTop: 1 },
    idDate: { fontSize: 7, color: '#BDD8D9', marginTop: 2 },
    logoSlot: { width: 44, height: 44, borderRadius: 99, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' },
    logoSlotText: { color: '#ffffff', fontSize: 16, fontFamily: 'Helvetica-Bold' },
    goldBar: { height: 2, backgroundColor: GOLD },
    summaryBar: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: CREAM, borderRadius: 6, paddingVertical: tight ? 5 : 6, paddingHorizontal: tight ? 6 : 8, marginBottom: compact ? 6 : 8, borderLeftWidth: 3, borderLeftColor: GOLD },
    summaryItem: { flexDirection: 'row', alignItems: 'center', marginRight: compact ? 6 : 8, marginVertical: 1 },
    summaryDot: { width: 5, height: 5, borderRadius: 99, backgroundColor: GOLD, marginRight: 4 },
    summaryLabel: { fontSize: tight ? 6 : 6.5, color: '#8B7355', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginRight: 2 },
    summaryValue: { fontSize: tight ? 6.5 : 7, color: fillableColor, fontFamily: fillableBold },
    section: { marginBottom: compact ? 5 : 7, backgroundColor: CREAM, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#F0E6D3' },
    sectionTitle: { fontSize: tight ? 6.8 : 7.2, color: COPPER, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5, paddingVertical: tight ? 5 : 6, paddingHorizontal: tight ? 8 : 10, borderBottomWidth: 1, borderBottomColor: '#F0E6D3' },
    sectionBody: { padding: tight ? 6 : 8 },
    fieldCard: { width: '33.33%', paddingRight: compact ? 4 : 5, marginBottom: compact ? 3 : 4 },
    fieldLabel: { fontSize: tight ? 6 : 6.5, color: '#8B7355', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    fieldValue: { fontSize: tight ? 7.5 : compact ? 8 : 8.5, color: fillableColor, fontFamily: fillableBold, lineHeight: 1.2 },
    grid3: { flexDirection: 'row', flexWrap: 'wrap' },
    blockCard: { paddingVertical: tight ? 4 : 5, minHeight: tight ? 24 : 28 },
    blockText: { fontSize: tight ? 7 : compact ? 7.3 : 7.7, color: fillableColor, fontFamily: fillableRegular, lineHeight: tight ? 1.2 : 1.3 },
    sideBySide: { flexDirection: 'row', gap: compact ? 5 : 7 },
    sidePanel: { flex: 1 },
    textAreaOnly: {},
    readingStrip: { flexDirection: 'row', backgroundColor: '#F5EDE0', borderRadius: 6, paddingVertical: tight ? 4 : 5, paddingHorizontal: tight ? 3 : 4 },
    readingStripCell: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E6D9C7' },
    readingStripCellLast: { borderRightWidth: 0 },
    readingLabel: { fontSize: 6, color: '#8B7355', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginTop: 2 },
    readingValue: { fontSize: 9, color: fillableColor, fontFamily: fillableBold },
    defectList: { borderTopWidth: 1, borderTopColor: '#F0E6D3', paddingTop: compact ? 4 : 6, marginTop: compact ? 4 : 6 },
    defectItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
    defectDot: { width: 5, height: 5, borderRadius: 99, backgroundColor: COPPER, marginTop: 4, marginRight: 5 },
    defectText: { flex: 1, fontSize: tight ? 7 : compact ? 7.3 : 7.7, color: fillableColor, fontFamily: fillableRegular, lineHeight: tight ? 1.2 : 1.3 },
    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
    statusItem: { flexDirection: 'row', alignItems: 'center', marginRight: compact ? 6 : 8 },
    statusDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#E6D9C7', marginRight: 4 },
    statusDotActive: { backgroundColor: COPPER },
    statusText: { fontSize: tight ? 6.5 : 7, color: '#8B7355', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    materialsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    materialCard: { width: '33.33%', flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingRight: 4 },
    materialNum: { width: 18, height: 18, borderRadius: 99, backgroundColor: COPPER, alignItems: 'center', justifyContent: 'center', marginRight: 5 },
    materialNumText: { fontSize: 8, color: '#ffffff', fontFamily: 'Helvetica-Bold' },
    materialName: { fontSize: tight ? 7 : compact ? 7.3 : 7.7, color: fillableColor, fontFamily: fillableBold, flex: 1 },
    materialQty: { fontSize: 6.5, color: '#8B7355', fontFamily: 'Helvetica' },
    signRow: { flexDirection: 'row', gap: compact ? 4 : 6, marginTop: compact ? 4 : 6 },
    signCard: { flex: 1, borderWidth: 1, borderColor: '#F0E6D3', borderRadius: 6, padding: 4 },
    ackGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    signLabel: { fontSize: 6.5, color: '#8B7355', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    footerOuter: { marginTop: compact ? 4 : 6, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, overflow: 'hidden' },
    footer: { backgroundColor: DARK, paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 2, borderTopColor: GOLD },
    footerText: { fontSize: 6, color: '#8B8B9E', textAlign: 'center', textTransform: 'uppercase' },
    footerCompany: { fontSize: 6.5, color: '#ffffff', textAlign: 'center', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    logoImage: { width: 48, height: 'auto', objectFit: 'contain' },
  })
}

function renderSummaryBar(styles: any, csr: CsrRenderModel, compact: boolean) {
  const items: { label: string; value: string }[] = []
  if (hasText(csr.csr_number)) items.push({ label: 'CSR No.', value: safe(csr.csr_number) })
  if (hasText(csr.date)) items.push({ label: 'Date', value: safe(csr.date) })
  if (hasText(csr.callTypeDisplay)) items.push({ label: 'Call Type', value: safe(csr.callTypeDisplay) })
  if (hasText(csr.serviceBasisDisplay)) items.push({ label: 'Basis', value: safe(csr.serviceBasisDisplay) })
  if (hasText(csr.systemDownDisplay)) items.push({ label: 'System', value: safe(csr.systemDownDisplay) })
  if (!items.length) return null
  return (
    <View style={styles.summaryBar}>
      {items.map((item, idx) => (
        <View key={idx} style={styles.summaryItem}>
          <View style={styles.summaryDot} />
          <Text style={styles.summaryLabel}>{item.label}</Text>
          <Text style={styles.summaryValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  )
}

function renderNumberedMaterials(styles: any, csr: CsrRenderModel) {
  if (!hasMaterials(csr)) return null
  const rows = getMaterialsRows(csr)
  if (!rows.length) return null
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Materials Used</Text>
      <View style={styles.sectionBody}>
        <View style={styles.materialsGrid}>
          {rows.map((row: any, idx: number) => {
            const qty = [safe(row.quantity), safe(row.unit)].filter(Boolean).join(' ')
            return (
              <View key={idx} style={styles.materialCard}>
                <View style={styles.materialNum}>
                  <Text style={styles.materialNumText}>{idx + 1}</Text>
                </View>
                <Text style={styles.materialName}>{safe(row.item)}</Text>
                {qty ? <Text style={styles.materialQty}>({qty})</Text> : null}
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )
}

function renderStatusDots(styles: any, status: string) {
  const opts = ['Complete', 'Incomplete', 'Pending for spares', 'Under observation', 'Working solution provided']
  return (
    <View style={styles.statusGrid}>
      {opts.map((opt) => {
        const active = status === opt
        return (
          <View key={opt} style={styles.statusItem}>
            <View style={[styles.statusDot, active ? styles.statusDotActive : null]} />
            <Text style={styles.statusText}>{opt}</Text>
          </View>
        )
      })}
    </View>
  )
}

export function SentinelTemplate({ csr, comments, branding, designPreset }: CsrPdfProps) {
  csr = csr || {} as CsrRenderModel
  const density = getLayoutDensity(csr)
  const compact = density !== 'comfortable'
  const tight = density === 'tight'
  const styles = createStyles(density, designPreset)
  const status = getStatusValue(csr)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerOuter}>
          <View style={styles.headerBg}>
            <View style={styles.headerTopRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <PdfLogoSlot styles={styles} branding={branding} fallback="S" />
                <PdfBrandBlock styles={styles} branding={branding} />
              </View>
              <View style={styles.idBlock}>
                <Text style={styles.idLabel}>Service Report</Text>
                <Text style={styles.idValue}>{safe(csr.csr_number)}</Text>
                <Text style={styles.idDate}>{safe(csr.date)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.goldBar} />
        </View>

        {renderSummaryBar(styles, csr, compact)}

        {/* Client & Site */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client & Site Details</Text>
          <View style={styles.sectionBody}>
            <View style={styles.grid3}>
              <PdfField styles={styles} label="Client Name" value={csr.client_name} />
              <View style={[styles.fieldCard, { width: '66.66%' }]}>
                <Text style={styles.fieldLabel}>Address</Text>
                <Text style={styles.fieldValue}>{safe(csr.address)}</Text>
              </View>
              {csr.show_po && hasText(csr.po_number) ? (
                <PdfField styles={styles} label="P.O. Number" value={csr.po_number} />
              ) : null}
              <PdfField styles={styles} label="Service Start" value={[csr.start_date, csr.start_time].filter(Boolean).join(' // ')} />
              <PdfField styles={styles} label="Service End" value={[csr.end_date, csr.end_time].filter(Boolean).join(' // ')} />
              {hasText(csr.callTypeDisplay) ? <PdfField styles={styles} label="Call Type" value={csr.callTypeDisplay} /> : null}
              {hasText(csr.serviceBasisDisplay) ? <PdfField styles={styles} label="Service Basis" value={csr.serviceBasisDisplay} /> : null}
              {hasText(csr.systemDownDisplay) ? <PdfField styles={styles} label="System Status" value={csr.systemDownDisplay} /> : null}
            </View>
          </View>
        </View>

        {/* Equipment & Telemetry */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment & Telemetry</Text>
          <View style={styles.sectionBody}>
            <View style={styles.grid3}>
              <PdfField styles={styles} label="Equipment Type" value={csr.equipment_type} />
              <PdfField styles={styles} label="Make / Model" value={[safe(csr.make), safe(csr.model)].filter(Boolean).join(' ')} />
              <PdfField styles={styles} label="Serial No." value={csr.serial_no} />
              <PdfField styles={styles} label="Engine No." value={csr.engine_no} />
              <PdfField styles={styles} label="Capacity" value={csr.capacity} />
              <PdfField styles={styles} label="Location" value={csr.equipment_location} />
            </View>
            {hasOperationalReadings(csr) ? <ReadingsStrip styles={styles} csr={csr} /> : null}
          </View>
        </View>

        {/* Technical Narrative */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technical Narrative</Text>
          <View style={styles.sectionBody}>
            <View style={styles.sideBySide}>
              <View style={styles.sidePanel}>
                <PdfTextBlock styles={styles} label="Problem Reported" value={csr.problem_reported} minHeight={tight ? 24 : 30} />
              </View>
              <View style={styles.sidePanel}>
                <PdfTextBlock styles={styles} label="Service Rendered" value={csr.service_rendered} minHeight={tight ? 24 : 30} />
              </View>
            </View>
            {shouldRender(true, csr.defects_found) ? (
              <View style={styles.defectList}>
                <Text style={styles.fieldLabel}>Defects Found</Text>
                {hasText(csr.defectsFound) ? (
                  <View>
                    {(safe(csr.defectsFound) || '').split('\n').filter(Boolean).map((line: string, idx: number) => (
                      <View key={idx} style={styles.defectItem}>
                        <View style={styles.defectDot} />
                        <Text style={styles.defectText}>{line}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
            {shouldRender(true, csr.technicianRemarks) ? (
              <View style={{ marginTop: compact ? 4 : 6 }}>
                <PdfTextBlock styles={styles} label="Technician Remarks" value={csr.technicianRemarks} minHeight={tight ? 22 : 26} />
              </View>
            ) : null}
          </View>
        </View>

        {/* Materials */}
        {renderNumberedMaterials(styles, csr)}

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Operational Status</Text>
          <View style={styles.sectionBody}>
            {renderStatusDots(styles, status)}
          </View>
        </View>

        {/* Customer Feedback */}
        {shouldRender(true, csr.customer_feedback) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Feedback</Text>
            <View style={styles.sectionBody}>
              <PdfTextBlock styles={styles} label="Feedback" value={csr.customer_feedback} />
            </View>
          </View>
        ) : null}

        <AcknowledgementBlock styles={styles} csr={csr} />
        <ClientNotesBlock comments={comments} />

        {/* Footer */}
        <View style={styles.footerOuter}>
          <View style={styles.footer}>
            <Text style={styles.footerCompany}>{safe(branding.companyName) || 'Sentinel Report'}</Text>
            {branding.footerText ? <Text style={styles.footerText}>{branding.footerText}</Text> : null}
          </View>
        </View>
      </Page>
    </Document>
  )
}
