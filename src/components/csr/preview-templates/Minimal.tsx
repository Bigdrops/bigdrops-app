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
  getMaterialsRows,
  hasMaterials,
  hasText,
  safe,
  getPopulatedReadingRows,
} from './utils'
import { PdfBrandBlock, PdfSection, StatusListChecks } from './components'
import { ClientNotesBlock } from './ClientNotesBlock'
import { CSR_STATUS_OPTIONS_PDF } from '../CSRPreviewContent'
import type { CsrPdfProps } from './types'

function createMinimalStyles(density = 'comfortable', designPreset: any) {
  const compact = density !== 'comfortable'
  const tight = density === 'tight'
  const { fillableColor, fillableBold } = getFillablePdfTheme(designPreset)
  const l = { fontFamily: 'Helvetica-Bold' }
  return StyleSheet.create({
    page: {
      paddingTop: tight ? 10 : 20,
      paddingBottom: tight ? 10 : 20,
      paddingHorizontal: tight ? 12 : 24,
      backgroundColor: '#ffffff',
      fontFamily: 'Helvetica',
      fontSize: tight ? 7 : compact ? 7.5 : 8.5,
      color: '#111827',
    },
    headerTop: {
      flexDirection: 'row',
      borderBottomWidth: 2,
      borderBottomColor: '#111827',
      marginBottom: compact ? 6 : 12,
    },
    headerLeft: {
      flex: 1,
      paddingVertical: tight ? 6 : 10,
      paddingRight: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 15,
    },
    brandBlock: { flex: 1 },
    companyName: { fontSize: 20, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: -0.3, color: '#111827' },
    companyTagline: { fontSize: 8, color: '#374151', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginTop: 2 },
    contactLine: { fontSize: 7, color: '#6B7280', marginTop: 2 },
    headerRight: {
      width: 220,
      borderLeftWidth: 2,
      borderLeftColor: '#111827',
    },
    idRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#d1d5db',
    },
    idLabel: {
      width: 100,
      backgroundColor: '#f3f4f6',
      fontSize: 7.5,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      color: '#374151',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRightWidth: 1,
      borderRightColor: '#d1d5db',
    },
    idValue: {
      flex: 1,
      fontSize: 8.5,
      fontFamily: fillableBold,
      color: fillableColor,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    section: {
      marginBottom: compact ? 5 : 10,
      borderWidth: 2,
      borderColor: '#111827',
    },
    sectionTitle: {
      backgroundColor: '#111827',
      color: '#ffffff',
      fontSize: tight ? 7 : 8,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      paddingVertical: tight ? 3 : 5,
      paddingHorizontal: 8,
      letterSpacing: 1,
    },
    fieldRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#d1d5db',
    },
    fieldCell: {
      paddingVertical: tight ? 3 : 5,
      paddingHorizontal: 6,
      borderRightWidth: 1,
      borderRightColor: '#d1d5db',
    },
    fieldLabel: {
      fontSize: 6.5,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      color: '#374151',
      marginBottom: 2,
      letterSpacing: 0.3,
    },
    fieldValue: {
      fontSize: tight ? 7.5 : compact ? 8 : 8.5,
      color: fillableColor,
      fontFamily: fillableBold,
      lineHeight: 1.3,
    },
    blockCard: {
      paddingVertical: tight ? 4 : 6,
      paddingHorizontal: 6,
    },
    blockText: {
      fontSize: tight ? 7.5 : compact ? 8 : 8.5,
      color: fillableColor,
      fontFamily: 'Helvetica',
      lineHeight: 1.4,
    },
    sideBySide: {
      flexDirection: 'row',
    },
    sidePanel: {
      flex: 1,
      borderRightWidth: 1,
      borderRightColor: '#d1d5db',
    },
    sidePanelLast: { flex: 1 },
    textAreaOnly: {
      padding: compact ? 6 : 8,
      minHeight: tight ? 24 : compact ? 30 : 36,
    },
    labelBar: {
      backgroundColor: '#f3f4f6',
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      color: '#374151',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#d1d5db',
      letterSpacing: 0.5,
    },
    statusGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: tight ? 4 : 6,
      gap: 2,
    },
    statusItem: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
      paddingHorizontal: 4,
    },
    checkBox: {
      width: 9,
      height: 9,
      borderWidth: 1.5,
      borderColor: '#9ca3af',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkBoxActive: {
      borderColor: '#111827',
      backgroundColor: '#111827',
    },
    checkMark: {
      fontSize: 6,
      color: '#ffffff',
      fontFamily: 'Helvetica-Bold',
    },
    statusText: {
      fontSize: 7,
      color: fillableColor,
      fontFamily: fillableBold,
      textTransform: 'uppercase',
    },
    matHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#111827',
      backgroundColor: '#f3f4f6',
    },
    matHeaderCell: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      paddingVertical: tight ? 3 : 5,
      paddingHorizontal: 6,
      borderRightWidth: 1,
      borderRightColor: '#d1d5db',
    },
    matRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
    },
    matCell: {
      fontSize: tight ? 7.5 : 8.5,
      fontFamily: fillableBold,
      color: fillableColor,
      paddingVertical: tight ? 3 : 5,
      paddingHorizontal: 6,
      borderRightWidth: 1,
      borderRightColor: '#e5e7eb',
    },
    timeGrid: {
      flexDirection: 'column',
    },
    timeRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
    },
    timeLabel: {
      width: '50%',
      backgroundColor: '#f9fafb',
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      color: '#6B7280',
      paddingVertical: tight ? 3 : 5,
      paddingHorizontal: 8,
      textTransform: 'uppercase',
      borderRightWidth: 1,
      borderRightColor: '#e5e7eb',
    },
    timeValue: {
      width: '50%',
      fontSize: tight ? 7.5 : 8.5,
      fontFamily: fillableBold,
      color: fillableColor,
      paddingVertical: tight ? 3 : 5,
      paddingHorizontal: 8,
    },
    ackSection: {
      borderWidth: 2,
      borderColor: '#111827',
      marginBottom: compact ? 5 : 10,
    },
    ackHeader: {
      backgroundColor: '#111827',
      color: '#ffffff',
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      paddingVertical: 5,
      paddingHorizontal: 8,
      letterSpacing: 1,
    },
    ackTopRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#111827',
      minHeight: tight ? 36 : compact ? 40 : 46,
    },
    ackTopCell: {
      width: '50%',
      borderRightWidth: 1,
      borderRightColor: '#111827',
    },
    ackTopLabel: {
      backgroundColor: '#f3f4f6',
      fontSize: 6.5,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      color: '#374151',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#d1d5db',
    },
    ackTopContent: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    ackBottomRow: {
      flexDirection: 'row',
      minHeight: tight ? 60 : compact ? 70 : 80,
    },
    ackClientSig: {
      width: '50%',
      borderRightWidth: 1,
      borderRightColor: '#111827',
    },
    ackTechSplit: {
      width: '50%',
      flexDirection: 'row',
    },
    ackTechSigPanel: {
      width: '50%',
      borderRightWidth: 1,
      borderRightColor: '#111827',
    },
    ackTechNamePanel: {
      width: '50%',
    },
    ackSigPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ackSigText: {
      fontSize: 6.5,
      color: '#d1d5db',
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
    },
    ackSigImage: {
      maxHeight: 30,
      maxWidth: 90,
      objectFit: 'contain',
    },
    ackTechNameContent: {
      flex: 1,
      justifyContent: 'flex-end',
      padding: 8,
    },
    ackTechNameText: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: fillableColor,
      textTransform: 'uppercase',
    },
    signCard: {},
    signLabel: {},
    footer: {
      backgroundColor: '#111827',
      color: '#ffffff',
      paddingVertical: 6,
      paddingHorizontal: 12,
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    logoImage: { width: 80, maxHeight: 40, objectFit: 'contain' },
  })
}

function renderEquipValue(value: string) {
  const s = safe(value)
  return s || '—'
}

function renderStatusChecks(styles: any, status: string) {
  return (
    <View style={styles.statusGrid}>
      {CSR_STATUS_OPTIONS_PDF.map((option: string) => {
        const active = status === option
        return (
          <View key={option} style={styles.statusItem}>
            <View style={[styles.checkBox, active ? styles.checkBoxActive : null]}>
              {active ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.statusText}>{option}</Text>
          </View>
        )
      })}
    </View>
  )
}

function renderMaterialsTable(styles: any, csr: CsrRenderModel) {
  if (!hasMaterials(csr)) return null
  const rows = getMaterialsRows(csr)
  if (rows.length === 0) return null

  return (
    <View>
      <View style={styles.matHeader}>
        <Text style={[styles.matHeaderCell, { width: '70%' }]}>Item Description / Part Number</Text>
        <Text style={[styles.matHeaderCell, { width: '30%', textAlign: 'center' }]}>Quantity / Volume</Text>
      </View>
      {rows.map((row: any, idx: number) => {
        const qtyUnit = [safe(row.quantity), safe(row.unit)].filter(Boolean).join(' ')
        return (
          <View key={idx} style={styles.matRow}>
            <Text style={[styles.matCell, { width: '70%' }]}>{safe(row.item) || ' '}</Text>
            <Text style={[styles.matCell, { width: '30%', textAlign: 'center' }]}>{qtyUnit || ' '}</Text>
          </View>
        )
      })}
    </View>
  )
}

function renderServiceTime(styles: any, w: { startDate: string; startTime: string; endDate: string; endTime: string }) {
  return (
    <View style={styles.timeGrid}>
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>Start</Text>
        <Text style={styles.timeValue}>{[w.startDate, w.startTime].filter(Boolean).join(' // ') || '—'}</Text>
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>End</Text>
        <Text style={styles.timeValue}>{[w.endDate, w.endTime].filter(Boolean).join(' // ') || '—'}</Text>
      </View>
    </View>
  )
}

function renderHeaderIdTable(styles: any, csr: CsrRenderModel) {
  const items: [string, string][] = [
    ['CSR Number', csr.csr_number],
    ['Report Date', csr.date],
  ]
  if (hasText(csr.callTypeDisplay)) items.push(['Call Type', csr.callTypeDisplay])
  if (hasText(csr.systemDownDisplay)) items.push(['System Status', csr.systemDownDisplay])

  return (
    <View style={styles.headerRight}>
      {items.map(([label, value], idx) => (
        <View key={idx} style={styles.idRow}>
          <Text style={styles.idLabel}>{label}</Text>
          <Text style={styles.idValue}>{safe(value) || '—'}</Text>
        </View>
      ))}
    </View>
  )
}

function renderEquipField(label: string, value: string, width = '16.66%') {
  return (
    <View style={{ width, paddingVertical: 4, paddingHorizontal: 5, borderRightWidth: 1, borderRightColor: '#d1d5db' }}>
      <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#374151', marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 7.5, color: '#111827', fontFamily: 'Helvetica-Bold' }}>{renderEquipValue(value)}</Text>
    </View>
  )
}

export function MinimalTemplate({ csr, comments, branding, designPreset }: CsrPdfProps) {
  csr = csr || ({} as CsrRenderModel)
  const styles = createMinimalStyles(getLayoutDensity(csr), designPreset)
  const status = getStatusValue(csr)
  const technicianName = getTechnicianName(csr)
  const technicianSignatureUrl = getTechnicianSignatureUrl(csr)
  const readingsRows = getPopulatedReadingRows(csr)
  const hasReadings = hasOperationalReadings(csr)
  const serviceWindow = {
    startDate: safe(csr.start_date),
    startTime: safe(csr.start_time),
    endDate: safe(csr.end_date),
    endTime: safe(csr.end_time),
  }

  const equipRow1 = [
    { label: 'Unit Type', value: csr.equipment_type },
    { label: 'Location', value: csr.equipment_location },
    { label: 'Manufacturer', value: csr.make },
    { label: 'Model No.', value: csr.model },
    { label: 'Serial No.', value: csr.serial_no },
    { label: 'Engine No.', value: csr.engine_no },
  ]

  const equipRow2 = readingsRows.length > 0
    ? readingsRows
    : [
        { key: 'voltage', label: 'Voltage (V)', value: csr.voltage },
        { key: 'frequency', label: 'Freq (Hz)', value: csr.frequency },
        { key: 'battery', label: 'Battery (V)', value: csr.battery },
        { key: 'temperature', label: 'Temp (°C)', value: csr.temperature },
        { key: 'pressure', label: 'Pressure (PSI)', value: csr.pressure },
        { key: 'hours', label: 'Run Hours', value: csr.hours },
      ]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            {branding.logoUrl ? (
              <Image src={branding.logoUrl} style={styles.logoImage} />
            ) : null}
            <View style={{ flex: 1 }}>
              <PdfBrandBlock styles={styles} branding={branding} />
            </View>
          </View>
          {renderHeaderIdTable(styles, csr)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client &amp; Site Information</Text>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldCell, { width: '33.33%' }]}>
              <Text style={styles.fieldLabel}>Client Name</Text>
              <Text style={styles.fieldValue}>{safe(csr.client_name) || ' '}</Text>
            </View>
            <View style={[styles.fieldCell, { width: '50%' }]}>
              <Text style={styles.fieldLabel}>Site Address</Text>
              <Text style={styles.fieldValue}>{safe(csr.address) || ' '}</Text>
            </View>
            <View style={[{ width: '16.66%', paddingVertical: 4, paddingHorizontal: 6 }]}>
              <Text style={styles.fieldLabel}>Service Date</Text>
              <Text style={styles.fieldValue}>{safe(csr.date) || ' '}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment Specification &amp; Operational Metrics</Text>
          <View style={styles.fieldRow}>
            {equipRow1.map((f, idx) => (
              <View key={idx} style={{ width: '16.66%', paddingVertical: 4, paddingHorizontal: 5, borderRightWidth: 1, borderRightColor: '#d1d5db' }}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <Text style={styles.fieldValue}>{renderEquipValue(f.value)}</Text>
              </View>
            ))}
          </View>
          {hasReadings || readingsRows.length > 0 ? (
            <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
              {equipRow2.map((r: any, idx: number) => (
                <View key={idx} style={{ width: '16.66%', paddingVertical: 4, paddingHorizontal: 5, borderRightWidth: idx < equipRow2.length - 1 ? 1 : 0, borderRightColor: '#d1d5db' }}>
                  <Text style={styles.fieldLabel}>{r.label}</Text>
                  <Text style={styles.fieldValue}>{safe(r.value) || '—'}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={[styles.section, { flexDirection: 'row' }]}>
          <View style={[styles.sidePanel, { borderRightWidth: 2, borderRightColor: '#111827' }]}>
            <Text style={styles.labelBar}>Reported Problem</Text>
            <View style={styles.textAreaOnly}>
              <Text style={styles.blockText}>{safe(csr.problem_reported) || '—'}</Text>
            </View>
          </View>
          {shouldRender(true, csr.defects_found) ? (
            <View style={styles.sidePanelLast}>
              <Text style={styles.labelBar}>Defects Found</Text>
              <View style={styles.textAreaOnly}>
                <Text style={styles.blockText}>{safe(csr.defectsFound)}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.labelBar}>Work Description / Service Rendered</Text>
          <View style={styles.textAreaOnly}>
            <Text style={styles.blockText}>{safe(csr.service_rendered) || '—'}</Text>
          </View>
        </View>

        {hasMaterials(csr) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Materials Used</Text>
            {renderMaterialsTable(styles, csr)}
          </View>
        ) : null}

        <View style={[styles.section, { flexDirection: 'row' }]}>
          <View style={[styles.sidePanel, { borderRightWidth: 2, borderRightColor: '#111827' }]}>
            <Text style={styles.labelBar}>System Operational Status</Text>
            {renderStatusChecks(styles, status)}
          </View>
          <View style={styles.sidePanelLast}>
            <Text style={styles.labelBar}>Service Time Logs</Text>
            {renderServiceTime(styles, serviceWindow)}
          </View>
        </View>

        <View style={styles.ackSection}>
          <Text style={styles.ackHeader}>Final Acknowledgement &amp; Sign-off</Text>
          <View style={styles.ackTopRow}>
            <View style={styles.ackTopCell}>
              <Text style={styles.ackTopLabel}>Client Representative Name</Text>
              <View style={styles.ackTopContent}>
                <Text style={styles.fieldValue}>{safe(csr.acknowledgement_name) || ' '}</Text>
              </View>
            </View>
            <View style={{ width: '50%' }}>
              <Text style={styles.ackTopLabel}>Designation / Comments</Text>
              <View style={styles.ackTopContent}>
                <Text style={styles.fieldValue}>
                  {safe(csr.customer_feedback) || ' '}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.ackBottomRow}>
            <View style={styles.ackClientSig}>
              <Text style={styles.ackTopLabel}>Client Signature &amp; Stamp</Text>
              <View style={styles.ackSigPlaceholder}>
                <Text style={styles.ackSigText}>Authorized Signatory Only</Text>
              </View>
            </View>
            <View style={styles.ackTechSplit}>
              <View style={styles.ackTechSigPanel}>
                <Text style={styles.ackTopLabel}>Technician Signature</Text>
                <View style={[styles.ackSigPlaceholder, { padding: 4 }]}>
                  {technicianSignatureUrl ? (
                    <Image src={technicianSignatureUrl} style={styles.ackSigImage} />
                  ) : null}
                </View>
              </View>
              <View style={styles.ackTechNamePanel}>
                <Text style={styles.ackTopLabel}>Lead Technician Name</Text>
                <View style={styles.ackTechNameContent}>
                  <Text style={styles.ackTechNameText}>{technicianName || ' '}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <ClientNotesBlock comments={comments} />

        <View style={styles.footer}>
          <Text>Official Service Document | {safe(branding.companyName) || 'Company'}</Text>
          <Text>Page 01 of 01</Text>
        </View>
      </Page>
    </Document>
  )
}
