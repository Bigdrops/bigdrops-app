import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import {
  getDefaultPdfDesignPreset,
  getEffectiveFillableFont,
  resolvePdfFontFamily,
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'

interface ClassicTemplateProps {
  model: WaybillRenderModel
  designPreset?: PdfDesignPreset
}

const deliveryModes = ['By Hand', 'By Vehicle', 'Courier'] as const
const deliveryReasons = ['Supply', 'Return', 'Repair', 'Transfer', 'Other'] as const

function Tick({ checked }: { checked: boolean }) {
  return (
    <View style={{ width: 10, height: 10, border: '1pt solid #1e40af', marginRight: 3, flexShrink: 0, backgroundColor: checked ? '#1e40af' : 'transparent' }} />
  )
}

function createStyles(preset: PdfDesignPreset) {
  const fillableChoice = getEffectiveFillableFont(preset)
  const fillableRegular = resolvePdfFontFamily(fillableChoice, 'regular')
  const fillableBold = resolvePdfFontFamily(fillableChoice, 'bold')
  const accent = preset.templateAccentColor || preset.accentColor
  const txt = preset.textColor
  const muted = preset.mutedColor
  const border = preset.borderColor
  const surface = preset.surfaceColor

  return StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 9, color: txt, padding: '18pt', backgroundColor: '#ffffff' },
    titleZone: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', letterSpacing: 2, marginBottom: 10, paddingBottom: 6, borderBottom: `2pt solid ${accent}` },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    companyBlock: { flex: 1, paddingRight: 12 },
    logo: { width: 40, height: 40, objectFit: 'contain', marginBottom: 4 },
    companyName: { fontSize: 13, fontFamily: fillableBold, color: accent, marginBottom: 1 },
    companyLine: { fontSize: 8, color: muted, marginBottom: 1 },
    docNumber: { fontSize: 10, textAlign: 'right', fontFamily: fillableBold, color: accent },
    divider: { borderBottom: `1pt solid ${border}`, marginBottom: 8 },
    metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
    metaCard: { width: '25%', paddingRight: 8, marginBottom: 6 },
    metaLabel: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 1, letterSpacing: 0.3 },
    metaValue: { fontSize: 9, fontFamily: fillableBold, color: accent },
    tickRow: { flexDirection: 'row', alignItems: 'center', padding: '5pt 8pt', border: `1pt solid ${border}`, borderRadius: 4, backgroundColor: surface, marginBottom: 6, gap: 14 },
    tickLabel: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, flexShrink: 0 },
    tickGroup: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    tick: { flexDirection: 'row', alignItems: 'center', fontSize: 9, fontFamily: fillableBold, color: accent },
    clientBox: { flex: 1, border: `1pt solid ${border}`, borderRadius: 4, padding: '6pt 8pt', backgroundColor: surface, minHeight: 40 },
    boxLabel: { fontSize: 7, textTransform: 'uppercase', color: muted, marginBottom: 2, letterSpacing: 0.3 },
    boxValue: { fontSize: 10, fontFamily: fillableBold, color: accent },
    boxSub: { fontSize: 8, color: muted, marginTop: 2 },
    sectionTitle: { fontSize: 8, fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase', color: '#334155', letterSpacing: 0.4 },
    tableHeaderRow: { flexDirection: 'row', backgroundColor: '#0f172a', paddingVertical: '3pt', paddingHorizontal: '5pt' },
    tableRow: { flexDirection: 'row', paddingVertical: '3pt', paddingHorizontal: '5pt', borderBottom: '0.5pt solid #e2e8f0' },
    tableRowAlt: { flexDirection: 'row', paddingVertical: '3pt', paddingHorizontal: '5pt', borderBottom: '0.5pt solid #e2e8f0', backgroundColor: surface },
    headerCell: { fontSize: 8, color: '#ffffff', fontFamily: fillableBold },
    cell: { fontSize: 8, color: accent, fontFamily: fillableRegular },
    colNum: { width: '6%', textAlign: 'center' },
    colDesc: { width: '40%' },
    colQty: { width: '16%', textAlign: 'center' },
    colCond: { width: '10%', textAlign: 'center' },
    colPart: { width: '16%', textAlign: 'center' },
    colMake: { width: '12%', textAlign: 'center' },
    colCell: { flex: 1, paddingLeft: 4 },
    notesBox: { marginTop: 6, border: `1pt solid ${border}`, borderRadius: 4, padding: '6pt 8pt', backgroundColor: surface, fontSize: 8, color: accent, lineHeight: 1.35 },
    sigRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
    sigBox: { flex: 1, border: `1pt solid ${border}`, borderRadius: 4, padding: '6pt 8pt' },
    sigFieldLabel: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 1, letterSpacing: 0.3 },
    sigFieldValue: { fontSize: 9, fontFamily: fillableBold, color: accent, minHeight: 14, borderBottom: '0.5pt solid #94a3b8', paddingBottom: 2, marginBottom: 4 },
    sigFieldBlank: { minHeight: 14, borderBottom: '0.5pt solid #94a3b8', paddingBottom: 2, marginBottom: 4 },
    sigImage: { width: '100%', height: 44, objectFit: 'contain', border: `1pt dashed ${border}`, borderRadius: 3, justifyContent: 'center', alignItems: 'center' },
    sigDateRow: { flexDirection: 'row', gap: 10 },
    sigDateField: { flex: 1 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', borderTop: '1pt solid #000', paddingTop: 5, marginTop: 'auto', fontSize: 7, color: muted },
  })
}

export const ClassicTemplateDocument: React.FC<{ model: WaybillRenderModel; designPreset?: PdfDesignPreset }> = ({ model, designPreset }) => {
  const preset = designPreset || getDefaultPdfDesignPreset('waybill')
  const S = createStyles(preset)

  return (
    <Document
      title={`Waybill - ${model.header.waybillNumber || 'Classic'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Classic"
    >
      <Page size="A4" style={S.page}>
        <View style={S.titleZone}>
          <Text>WAYBILL / DELIVERY NOTE</Text>
        </View>

        <View style={S.header}>
          <View style={S.companyBlock}>
            {model.branding.logo ? <Image src={model.branding.logo} style={S.logo} /> : null}
            <Text style={S.companyName}>{model.branding.name || 'Company Name'}</Text>
            {model.branding.address ? <Text style={S.companyLine}>{model.branding.address}</Text> : null}
            {model.branding.phone ? <Text style={S.companyLine}>{model.branding.phone}</Text> : null}
            {model.branding.email ? <Text style={S.companyLine}>{model.branding.email}</Text> : null}
          </View>
          <View>
            <Text style={S.docNumber}>{model.header.waybillNumber || '—'}</Text>
          </View>
        </View>

        <View style={S.divider} />

        <View style={S.metaGrid}>
          <View style={S.metaCard}><Text style={S.metaLabel}>Date</Text><Text style={S.metaValue}>{model.header.date || '—'}</Text></View>
          <View style={S.metaCard}><Text style={S.metaLabel}>Time</Text><Text style={S.metaValue}>{model.header.time || '—'}</Text></View>
          <View style={S.metaCard}><Text style={S.metaLabel}>P.O. Number</Text><Text style={S.metaValue}>{model.header.poNumber || '—'}</Text></View>
          <View style={S.metaCard}><Text style={S.metaLabel}>Waybill No</Text><Text style={S.metaValue}>{model.header.waybillNumber || '—'}</Text></View>
          <View style={S.metaCard}><Text style={S.metaLabel}>Vehicle Plate</Text><Text style={S.metaValue}>{model.logistics.vehiclePlate || '—'}</Text></View>
          <View style={S.metaCard}><Text style={S.metaLabel}>Driver Name</Text><Text style={S.metaValue}>{model.logistics.driverName || '—'}</Text></View>
          <View style={S.metaCard}><Text style={S.metaLabel}>Client</Text><Text style={S.metaValue}>{model.parties.clientName || '—'}</Text></View>
          <View style={S.metaCard}><Text style={S.metaLabel}>Delivery Location</Text><Text style={S.metaValue}>{model.logistics.deliveryLocation || '—'}</Text></View>
        </View>

        <View style={S.tickRow} wrap={false}>
          <Text style={S.tickLabel}>Method</Text>
          <View style={S.tickGroup}>
            {deliveryModes.map((mode) => (
              <View key={mode} style={S.tick}>
                <Tick checked={mode === 'By Vehicle' ? model.logistics.deliveryMode === 'By Vehicle' : model.logistics.deliveryMode === mode} />
                <Text>{mode.replace('By ', '')}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={S.tickRow} wrap={false}>
          <Text style={S.tickLabel}>Purpose</Text>
          <View style={S.tickGroup}>
            {deliveryReasons.map((reason) => (
              <View key={reason} style={S.tick}>
                <Tick checked={model.logistics.purpose === reason} />
                <Text>{reason}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: 8 }} wrap={false}>
          <View style={S.clientBox}>
            <Text style={S.boxLabel}>Client / Consignee</Text>
            <Text style={S.boxValue}>{model.parties.clientName || '—'}</Text>
          </View>
        </View>

        <Text style={S.sectionTitle}>Items</Text>
        <View style={S.tableHeaderRow} fixed>
          <Text style={[S.headerCell, S.colNum]}>#</Text>
          {model.table.columns.map((col) => (
            <Text key={col.key} style={[S.headerCell, col.key === 'description' ? S.colDesc : col.key === 'qtyLabel' ? S.colQty : col.key === 'condition' ? S.colCond : col.key.includes('part') ? S.colPart : col.key.includes('make') ? S.colMake : S.colCell]}>{col.label}</Text>
          ))}
        </View>

        {model.table.rows.map((row, index) => (
          <View key={index} style={index % 2 === 0 ? S.tableRow : S.tableRowAlt}>
            <Text style={[S.cell, S.colNum]}>{index + 1}</Text>
            {model.table.columns.map((col) => (
              <Text key={col.key} style={[S.cell, col.key === 'description' ? S.colDesc : col.key === 'qtyLabel' ? S.colQty : col.key === 'condition' ? S.colCond : col.key.includes('part') ? S.colPart : col.key.includes('make') ? S.colMake : S.colCell]}>{row.cells[col.key] || ''}</Text>
            ))}
          </View>
        ))}

        {model.notes ? (
          <View style={S.notesBox} wrap={false}>
            <Text style={S.sectionTitle}>Operational Notes</Text>
            <Text>{model.notes}</Text>
          </View>
        ) : null}

        <View style={S.sigRow} wrap={false}>
          <View style={S.sigBox}>
            <Text style={S.sectionTitle}>Delivered By (Sender)</Text>
            <View>
              <Text style={S.sigFieldLabel}>Name</Text>
              <Text style={S.sigFieldValue}>{model.parties.senderName || ''}</Text>
            </View>
            <View style={S.sigImage}>
              {model.signatures.sender ? (
                <Image src={model.signatures.sender.url} style={{ width: '100%', height: 40, objectFit: 'contain' }} />
              ) : (
                <Text style={{ fontSize: 7, color: '#b0b8c1', fontStyle: 'italic' }}>Signature</Text>
              )}
            </View>
            <View style={S.sigDateRow}>
              <View style={S.sigDateField}>
                <Text style={S.sigFieldLabel}>Date</Text>
                <View style={S.sigFieldBlank} />
              </View>
              <View style={S.sigDateField}>
                <Text style={S.sigFieldLabel}>Time</Text>
                <View style={S.sigFieldBlank} />
              </View>
            </View>
          </View>
          <View style={S.sigBox}>
            <Text style={S.sectionTitle}>Collected By (Receiver)</Text>
            <View>
              <Text style={S.sigFieldLabel}>Name</Text>
              <View style={S.sigFieldBlank} />
            </View>
            <View style={S.sigImage}>
              {model.signatures.receiver ? (
                <Image src={model.signatures.receiver.url} style={{ width: '100%', height: 40, objectFit: 'contain' }} />
              ) : (
                <Text style={{ fontSize: 7, color: '#b0b8c1', fontStyle: 'italic' }}>Signature</Text>
              )}
            </View>
            <View style={S.sigDateRow}>
              <View style={S.sigDateField}>
                <Text style={S.sigFieldLabel}>Date</Text>
                <View style={S.sigFieldBlank} />
              </View>
              <View style={S.sigDateField}>
                <Text style={S.sigFieldLabel}>Time</Text>
                <View style={S.sigFieldBlank} />
              </View>
            </View>
          </View>
        </View>

        <View style={S.footer}>
          <Text>{model.footer.companyName || model.branding.name}</Text>
          <Text>{model.footer.waybillNumber}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export default ClassicTemplateDocument
