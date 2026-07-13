import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { CsrRenderModel } from '@/domain/csr/csrRenderModel'
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
  PdfBrandBlock,
  PdfField,
  PdfTextBlock,
  ReadingsStrip,
} from './components'
import { ClientNotesBlock } from './ClientNotesBlock'
import { getMaterialsRows } from './utils'
import type { CsrPdfProps } from './types'

const PLUM = '#4A2C5A'
const AMBER = '#C87A2C'
const SAGE = '#8A9B6E'
const CREAM = '#FDF8F3'
const CREAM_DARK = '#F5EDE4'

function createStyles(density = 'comfortable', designPreset: any) {
  const compact = density !== 'comfortable'
  const tight = density === 'tight'
  const { fillableColor, fillableBold, fillableRegular } = getFillablePdfTheme(designPreset)
  return StyleSheet.create({
    page: { paddingTop: tight ? 10 : 12, paddingBottom: tight ? 10 : 12, paddingHorizontal: tight ? 10 : 12, backgroundColor: CREAM, color: '#1a1a1a', fontFamily: 'Helvetica', fontSize: tight ? 7.4 : compact ? 7.8 : 8 },
    header: { backgroundColor: PLUM, color: '#ffffff', paddingVertical: tight ? 10 : 12, paddingHorizontal: tight ? 10 : 12, marginBottom: compact ? 5 : 6 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    brandBlock: { flex: 1 },
    companyName: { fontSize: tight ? 10 : 11, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    companyTagline: { fontSize: 6.5, color: '#c9b8d4', marginTop: 1 },
    contactLine: { fontSize: 6, color: '#c9b8d4', marginTop: 1 },
    headerCenter: { alignItems: 'center' },
    headerTitle: { fontSize: tight ? 8.5 : 9.5, color: '#ffffff', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1.2 },
    headerDivider: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.5)', marginTop: 2 },
    headerRef: { fontSize: tight ? 6.5 : 7, color: '#c9b8d4', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    section: { paddingVertical: tight ? 4 : 5, paddingHorizontal: 0, borderTopWidth: 3, borderTopColor: 'rgba(74,44,90,0.14)', borderStyle: 'double' },
    sectionFirst: { borderTopWidth: 0 },
    sectionTitle: { fontSize: tight ? 6.8 : 7.2, color: PLUM, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2.5, paddingBottom: 1.5 },
    sectionTitleAmber: { fontSize: tight ? 6.8 : 7.2, color: AMBER, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2.5, paddingBottom: 1.5 },
    sectionTitleSage: { fontSize: tight ? 6.8 : 7.2, color: SAGE, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2.5, paddingBottom: 1.5 },
    sectionBody: { paddingVertical: tight ? 3 : 4, paddingHorizontal: 0 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    summaryCard: { width: '33.33%', paddingHorizontal: 3, marginBottom: 4 },
    summaryCardInner: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E7EB', borderLeftWidth: 2.5, borderLeftColor: PLUM, paddingVertical: tight ? 2 : 3, paddingHorizontal: 5, borderRadius: 1.5 },
    summaryCardAmber: { borderLeftColor: AMBER },
    summaryLabel: { fontSize: tight ? 5.5 : 5.8, color: '#6B7280', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.3 },
    summaryValue: { fontSize: tight ? 7 : 8, color: '#0F1722', fontFamily: 'Helvetica-Bold', lineHeight: 1.2 },
    twoCol: { flexDirection: 'row', gap: 8 },
    col: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 1.5, padding: tight ? 2 : 3, backgroundColor: '#ffffff' },
    infoRow: { flexDirection: 'row', paddingVertical: 0.8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', borderStyle: 'dashed' },
    infoRowLast: { borderBottomWidth: 0 },
    infoLabel: { width: 72, color: SAGE, fontFamily: 'Helvetica-Bold', fontSize: tight ? 6 : 6.5, textTransform: 'uppercase', letterSpacing: 0.2, flexShrink: 0 },
    infoValue: { flex: 1, fontSize: tight ? 6.5 : 7, color: '#1a1a1a' },
    opRow: { flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 1.5, overflow: 'hidden' },
    opItem: { flex: 1, alignItems: 'center', paddingVertical: tight ? 2 : 2.5, paddingHorizontal: 2, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
    opItemLast: { borderRightWidth: 0 },
    opItemHighlight: { backgroundColor: 'rgba(74,44,90,0.07)' },
    opLabel: { fontSize: tight ? 5 : 5.5, color: '#6B7280', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.3 },
    opValue: { fontSize: tight ? 6.5 : 7.5, color: '#0F1722', fontFamily: 'Helvetica-Bold', lineHeight: 1.2 },
    opUnit: { fontSize: tight ? 5 : 5.5, color: '#6B7280' },
    textBlock: { fontSize: tight ? 6.8 : 7.2, color: '#2a2a2a', lineHeight: 1.4, fontFamily: fillableRegular },
    defectList: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: compact ? 3 : 4, marginTop: compact ? 3 : 4 },
    defectItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 1.5, paddingVertical: 1.2, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', borderStyle: 'dashed' },
    defectItemLast: { borderBottomWidth: 0 },
    defectDot: { width: 4, height: 4, borderRadius: 99, backgroundColor: AMBER, marginTop: 5, marginRight: 5 },
    defectNum: { fontSize: tight ? 6.5 : 7, color: AMBER, fontFamily: 'Helvetica-Bold', marginRight: 2 },
    defectText: { flex: 1, fontSize: tight ? 6.8 : 7.2, color: '#1a1a1a', fontFamily: fillableRegular, lineHeight: 1.35 },
    materialsRow: { flexDirection: 'row', gap: 4 },
    matCol: { flex: 1 },
    matHeader: { flexDirection: 'row', fontSize: tight ? 5.5 : 5.8, color: SAGE, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.3, paddingVertical: 1.5, borderBottomWidth: 1.5, borderBottomColor: SAGE, marginBottom: 1 },
    matHNum: { width: 16, textAlign: 'center', flexShrink: 0 },
    matHDesc: { flex: 1, paddingLeft: 2 },
    matHQty: { width: 30, textAlign: 'right', flexShrink: 0 },
    matItem: { flexDirection: 'row', fontSize: tight ? 6 : 6.5, paddingVertical: 0.8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', borderStyle: 'dashed', alignItems: 'center' },
    matItemLast: { borderBottomWidth: 0 },
    matNum: { width: 16, textAlign: 'center', color: AMBER, fontFamily: 'Helvetica-Bold', fontSize: tight ? 5.5 : 6, flexShrink: 0 },
    matDesc: { flex: 1, paddingHorizontal: 2, fontSize: tight ? 6 : 6.5, color: '#1a1a1a' },
    matQty: { width: 30, textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: tight ? 6 : 6.5, color: '#0F1722', flexShrink: 0 },
    remarksGrid: { flexDirection: 'row', gap: 6 },
    remarksBox: { flex: 1.1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 1.5, padding: tight ? 2 : 3, backgroundColor: '#ffffff' },
    feedbackBox: { flex: 0.9, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 1.5, padding: tight ? 2 : 3, backgroundColor: '#ffffff' },
    boxTitle: { fontSize: tight ? 6 : 6.5, color: PLUM, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
    boxTitleAmber: { color: AMBER },
    fieldCard: { width: '33.33%', paddingRight: compact ? 4 : 5, marginBottom: compact ? 3 : 4 },
    fieldLabel: { fontSize: tight ? 6 : 6.5, color: '#6B7280', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    fieldValue: { fontSize: tight ? 7.5 : compact ? 8 : 8.5, color: fillableColor, fontFamily: fillableBold, lineHeight: 1.2 },
    grid3: { flexDirection: 'row', flexWrap: 'wrap' },
    timingRow: { flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 1.5, overflow: 'hidden' },
    timingItem: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: tight ? 1.5 : 2, paddingHorizontal: tight ? 4 : 6, gap: 3, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
    timingItemLast: { borderRightWidth: 0 },
    timingItemHighlight: { backgroundColor: 'rgba(74,44,90,0.07)' },
    timingIcon: { fontSize: tight ? 5.5 : 6, color: SAGE, fontFamily: 'Helvetica-Bold' },
    timingLabel: { fontSize: tight ? 5.5 : 5.8, color: '#6B7280', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.2 },
    timingValue: { fontSize: tight ? 6.5 : 7, color: '#0F1722', fontFamily: 'Helvetica-Bold' },
    signSection: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 1.5, marginBottom: compact ? 5 : 7 },
    signTitle: { fontSize: compact ? 6.5 : 7, color: SAGE, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.4, paddingVertical: 3, paddingHorizontal: tight ? 5 : 6, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    signBody: { padding: tight ? 4 : 5 },
    signGrid: { flexDirection: 'row', gap: 6 },
    signBox: { flex: 1, backgroundColor: CREAM, borderRadius: 1.5, padding: tight ? 3 : 4 },
    signLabel: { fontSize: tight ? 5.5 : 5.8, color: '#6B7280', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
    signRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: tight ? 32 : 36 },
    signPanelLeft: { flex: 1, justifyContent: 'center', paddingRight: 4 },
    signName: { fontSize: tight ? 6.5 : 7, color: '#0F1722', fontFamily: 'Helvetica-Bold', lineHeight: 1.2 },
    signRole: { fontSize: tight ? 5.5 : 6, color: '#6B7280', lineHeight: 1.2, marginTop: 1 },
    signDate: { fontSize: tight ? 5.5 : 6, color: '#6B7280', marginTop: 1 },
    signDivider: { width: 1, backgroundColor: PLUM, opacity: 0.45, flexShrink: 0 },
    signPanelRight: { justifyContent: 'center', paddingLeft: 4, flexShrink: 0, maxWidth: 100 },
    signImage: { maxHeight: 28, maxWidth: 90, objectFit: 'contain' },
    globalField: { fontSize: tight ? 7.5 : compact ? 8 : 8.5, color: fillableColor, fontFamily: fillableBold, lineHeight: 1.2 },
    footer: { backgroundColor: PLUM, paddingVertical: tight ? 7 : 8, paddingHorizontal: 12, marginTop: compact ? 5 : 7 },
    footerText: { fontSize: tight ? 5.5 : 6, color: '#c9b8d4', textAlign: 'center', lineHeight: 1.5 },
    footerMain: { fontSize: tight ? 6 : 6.5, color: '#ffffff', textAlign: 'center', fontFamily: 'Helvetica-Bold', letterSpacing: 0.3, marginBottom: 1 },
    footerDivider: { width: 60, height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 2, alignSelf: 'center' },
    logoImage: { width: 48, height: 'auto', objectFit: 'contain' },
  })
}

function renderSummaryCards(styles: any, csr: CsrRenderModel, tight: boolean) {
  const cards: { label: string; value: string; amber?: boolean }[] = []
  if (hasText(csr.csr_number)) cards.push({ label: 'CSR Number', value: safe(csr.csr_number) })
  if (hasText(csr.date)) cards.push({ label: 'Date of Service', value: safe(csr.date) })
  if (csr.show_po && hasText(csr.po_number)) cards.push({ label: 'PO Reference', value: safe(csr.po_number) })
  if (hasText(csr.callTypeDisplay)) cards.push({ label: 'Call Type', value: safe(csr.callTypeDisplay) })
  if (hasText(csr.serviceBasisDisplay)) cards.push({ label: 'Service Basis', value: safe(csr.serviceBasisDisplay) })
  if (hasText(getStatusValue(csr))) cards.push({ label: 'Status', value: safe(getStatusValue(csr)), amber: true })
  if (!cards.length) return null
  return (
    <View style={styles.summaryGrid}>
      {cards.map((card, idx) => (
        <View key={idx} style={styles.summaryCard}>
          <View style={[styles.summaryCardInner, card.amber ? styles.summaryCardAmber : null]}>
            <Text style={styles.summaryLabel}>{card.label}</Text>
            <Text style={styles.summaryValue}>{card.value}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function renderOperationalReadings(styles: any, csr: CsrRenderModel, tight: boolean) {
  if (!hasOperationalReadings(csr)) return null
  const fields = [
    { key: 'voltage', label: 'Voltage', unit: 'V' },
    { key: 'frequency', label: 'Frequency', unit: 'Hz' },
    { key: 'battery', label: 'Battery', unit: '' },
    { key: 'temperature', label: 'Temperature', unit: '°C' },
    { key: 'pressure', label: 'Pressure', unit: 'bar' },
    { key: 'hours', label: 'Run Hours', unit: 'h' },
  ]
  return (
    <View style={styles.opRow}>
      {fields.map((f, idx) => {
        const val = safe(csr[f.key as keyof CsrRenderModel])
        const isLast = idx === fields.length - 1
        const highlight = isLast
        return (
          <View key={f.key} style={[styles.opItem, isLast ? styles.opItemLast : null, highlight ? styles.opItemHighlight : null]}>
            <Text style={styles.opValue}>{val || '—'}</Text>
            <Text style={styles.opLabel}>{f.label}</Text>
          </View>
        )
      })}
    </View>
  )
}

function renderMaterialsNexus(styles: any, csr: CsrRenderModel, tight: boolean) {
  if (!hasMaterials(csr)) return null
  const rows = getMaterialsRows(csr)
  if (!rows.length) return null
  const cols = 3
  const perCol = Math.ceil(rows.length / cols)
  const columns: any[][] = []
  for (let c = 0; c < cols; c++) {
    columns.push(rows.slice(c * perCol, Math.min((c + 1) * perCol, rows.length)))
  }
  return (
    <View style={styles.sectionBody}>
      <View style={styles.materialsRow}>
        {columns.map((col, ci) => (
          <View key={ci} style={styles.matCol}>
            <View style={styles.matHeader}>
              <Text style={styles.matHNum}>No.</Text>
              <Text style={styles.matHDesc}>Description</Text>
              <Text style={styles.matHQty}>Qty</Text>
            </View>
            {col.map((row: any, ri: number) => {
              const gi = ci * perCol + ri
              const qty = [safe(row.quantity), safe(row.unit)].filter(Boolean).join(' ')
              const isLast = ri === col.length - 1
              return (
                <View key={gi} style={[styles.matItem, isLast ? styles.matItemLast : null]}>
                  <Text style={styles.matNum}>{String(gi + 1).padStart(2, '0')}</Text>
                  <Text style={styles.matDesc}>{safe(row.item) || ' '}</Text>
                  <Text style={styles.matQty}>{qty || '—'}</Text>
                </View>
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

function renderDefectList(styles: any, defectsFound: string) {
  const lines = defectsFound.split('\n').filter(Boolean)
  if (!lines.length) return null
  return (
    <View style={styles.defectList}>
      {lines.map((line: string, idx: number) => {
        const isLast = idx === lines.length - 1
        return (
          <View key={idx} style={[styles.defectItem, isLast ? styles.defectItemLast : null]}>
            <Text style={styles.defectNum}>{String(idx + 1).padStart(2, '0')}.</Text>
            <Text style={styles.defectText}>{line}</Text>
          </View>
        )
      })}
    </View>
  )
}

function renderTimingRow(styles: any, csr: CsrRenderModel, status: string, tight: boolean) {
  const startTime = safe(csr.start_time)
  const endTime = safe(csr.end_time)
  const hasTiming = [safe(csr.start_date), safe(csr.start_time), safe(csr.end_date), safe(csr.end_time)].some(Boolean)
  if (!hasTiming && !hasText(status)) return null
  return (
    <View style={styles.timingRow}>
      {hasText(csr.start_time) ? (
        <View style={styles.timingItem}>
          <Text style={styles.timingIcon}>{'>'}</Text>
          <Text style={styles.timingLabel}>Start</Text>
          <Text style={styles.timingValue}>{startTime}</Text>
        </View>
      ) : null}
      {hasText(csr.end_time) ? (
        <View style={styles.timingItem}>
          <Text style={styles.timingIcon}>{'[]'}</Text>
          <Text style={styles.timingLabel}>End</Text>
          <Text style={styles.timingValue}>{endTime}</Text>
        </View>
      ) : null}
      <View style={[styles.timingItem, styles.timingItemLast, styles.timingItemHighlight]}>
        <Text style={[styles.timingIcon, { color: PLUM }]}>{'✓'}</Text>
        <Text style={styles.timingLabel}>Status</Text>
        <Text style={[styles.timingValue, { color: PLUM }]}>{safe(status) || '—'}</Text>
      </View>
    </View>
  )
}

function renderSignatureNexus(styles: any, csr: CsrRenderModel, tight: boolean) {
  const techName = getTechnicianName(csr)
  const techSigUrl = getTechnicianSignatureUrl(csr)
  const hasTech = csr.showTechnicianSignLine
  const hasClient = csr.showAcknowledgement && hasText(csr.acknowledgement_name)
  if (!hasTech && !hasClient) return null
  return (
    <View style={styles.signSection}>
      <Text style={styles.signTitle}>Signatures</Text>
      <View style={styles.signBody}>
        <View style={styles.signGrid}>
          {hasTech ? (
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>Technician</Text>
              <View style={styles.signRow}>
                <View style={styles.signPanelLeft}>
                  <Text style={styles.signName}>{techName || techSigUrl ? ' ' : '—'}</Text>
                </View>
                <View style={styles.signDivider} />
                <View style={styles.signPanelRight}>
                  {techSigUrl ? (
                    <Image src={techSigUrl} style={styles.signImage} />
                  ) : null}
                </View>
              </View>
            </View>
          ) : null}
          {hasClient ? (
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>Recipient</Text>
              <View style={styles.signRow}>
                <View style={styles.signPanelLeft}>
                  <Text style={styles.signName}>{safe(csr.acknowledgement_name)}</Text>
                  {hasText(csr.recipientRole) ? <Text style={styles.signRole}>{safe(csr.recipientRole)}</Text> : null}
                </View>
                <View style={styles.signDivider} />
                <View style={styles.signPanelRight}>
                  <Text style={{ fontSize: tight ? 6 : 6.5, color: '#6B7280', fontFamily: 'Helvetica' }}>—</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

export function NexusTemplate({ csr, comments, branding, designPreset }: CsrPdfProps) {
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
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <PdfBrandBlock styles={styles} branding={branding} />
            </View>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Customer Service Report</Text>
              <View style={styles.headerDivider} />
            </View>
            <Text style={styles.headerRef}>{safe(csr.csr_number)}</Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={[styles.section, styles.sectionFirst]}>
          {renderSummaryCards(styles, csr, tight)}
        </View>

        {/* Client & Equipment */}
        <View style={styles.section}>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.sectionTitleSage}>Client Information</Text>
              {hasText(csr.client_name) ? (
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Company</Text><Text style={styles.infoValue}>{safe(csr.client_name)}</Text></View>
              ) : null}
              {hasText(csr.address) ? (
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Address</Text><Text style={styles.infoValue}>{safe(csr.address)}</Text></View>
              ) : null}
              <View style={styles.infoRowLast} />
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionTitleSage}>Equipment Information</Text>
              {hasText(csr.equipment_type) ? (
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Equipment</Text><Text style={styles.infoValue}>{safe(csr.equipment_type)}</Text></View>
              ) : null}
              {hasText(csr.make) || hasText(csr.model) ? (
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Make / Model</Text><Text style={styles.infoValue}>{[safe(csr.make), safe(csr.model)].filter(Boolean).join(' ')}</Text></View>
              ) : null}
              {hasText(csr.serial_no) ? (
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Serial No.</Text><Text style={styles.infoValue}>{safe(csr.serial_no)}</Text></View>
              ) : null}
              {hasText(csr.engine_no) ? (
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Engine No.</Text><Text style={styles.infoValue}>{safe(csr.engine_no)}</Text></View>
              ) : null}
              {hasText(csr.capacity) ? (
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Capacity</Text><Text style={styles.infoValue}>{safe(csr.capacity)}</Text></View>
              ) : null}
              {hasText(csr.equipment_location) ? (
                <View style={[styles.infoRow, styles.infoRowLast]}><Text style={styles.infoLabel}>Location</Text><Text style={styles.infoValue}>{safe(csr.equipment_location)}</Text></View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Operational Readings */}
        {renderOperationalReadings(styles, csr, tight) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operational Readings</Text>
            {renderOperationalReadings(styles, csr, tight)}
          </View>
        ) : null}

        {/* Problem Reported */}
        {shouldRender(true, csr.problem_reported) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitleAmber}>Problem Reported</Text>
            <Text style={styles.textBlock}>{safe(csr.problem_reported)}</Text>
          </View>
        ) : null}

        {/* Defects Found */}
        {shouldRender(true, csr.defects_found) && hasText(csr.defectsFound) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitleAmber}>Defects Found</Text>
            {renderDefectList(styles, safe(csr.defectsFound))}
          </View>
        ) : null}

        {/* Service Rendered */}
        {shouldRender(true, csr.service_rendered) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Rendered</Text>
            <Text style={styles.textBlock}>{safe(csr.service_rendered)}</Text>
          </View>
        ) : null}

        {/* Materials Used */}
        {hasMaterials(csr) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Materials Used</Text>
            {renderMaterialsNexus(styles, csr, tight)}
          </View>
        ) : null}

        {/* Remarks & Feedback */}
        {shouldRender(true, csr.technicianRemarks) || shouldRender(true, csr.customer_feedback) ? (
          <View style={styles.section}>
            <View style={styles.remarksGrid}>
              {shouldRender(true, csr.technicianRemarks) ? (
                <View style={styles.remarksBox}>
                  <Text style={styles.boxTitle}>Engineer Remarks</Text>
                  <Text style={[styles.textBlock, { fontSize: tight ? 6.5 : 6.8 }]}>{safe(csr.technicianRemarks)}</Text>
                </View>
              ) : <View style={{ flex: 1.1 }} />}
              {shouldRender(true, csr.customer_feedback) ? (
                <View style={styles.feedbackBox}>
                  <Text style={[styles.boxTitle, styles.boxTitleAmber]}>Customer Feedback</Text>
                  <Text style={[styles.textBlock, { fontSize: tight ? 6.5 : 6.8, fontStyle: 'italic' }]}>{safe(csr.customer_feedback)}</Text>
                </View>
              ) : <View style={{ flex: 0.9 }} />}
            </View>
          </View>
        ) : null}

        {/* Timing Row */}
        {renderTimingRow(styles, csr, status, tight) ? (
          <View style={styles.section}>
            {renderTimingRow(styles, csr, status, tight)}
          </View>
        ) : null}

        {/* Signatures */}
        {renderSignatureNexus(styles, csr, tight)}

        <ClientNotesBlock comments={comments} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerMain}>{safe(branding.companyName) || 'Nexus Report'}</Text>
          {branding.contactLine ? <Text style={styles.footerText}>{branding.contactLine}</Text> : null}
          {branding.footerText ? <Text style={styles.footerText}>{branding.footerText}</Text> : null}
        </View>
      </Page>
    </Document>
  )
}
