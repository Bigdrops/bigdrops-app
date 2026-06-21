import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import {
  getDefaultPdfDesignPreset,
  getEffectiveFillableFont,
  resolvePdfFontFamily,
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'

interface MinimalTemplateProps {
  model: WaybillRenderModel
  designPreset?: PdfDesignPreset
}

const deliveryModes = ['By Hand', 'By Vehicle', 'Other'] as const
const deliveryReasons = ['Supply', 'Return', 'Repair', 'Other'] as const

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={{ width: 9, height: 9, border: '1pt solid #000', marginRight: 3, flexShrink: 0, backgroundColor: checked ? '#000' : 'transparent' }} />
  )
}

function createStyles(preset: PdfDesignPreset) {
  const fillableChoice = getEffectiveFillableFont(preset)
  const fillableBold = resolvePdfFontFamily(fillableChoice, 'bold')
  const accent = preset.templateAccentColor || preset.accentColor
  const muted = preset.mutedColor

  return StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 9, color: '#000000', padding: '10mm 12mm', backgroundColor: '#ffffff' },
    titleZone: { textAlign: 'center', fontSize: 14, fontWeight: 'bold', letterSpacing: 2, paddingBottom: 4, borderBottom: '2pt solid #000', marginBottom: 6 },
    headerGrid: { flexDirection: 'row', marginBottom: 6, paddingRight: 0, position: 'relative' },
    brandInfo: { flex: 3 },
    brandLogo: { width: 38, height: 38, objectFit: 'contain', border: '1pt dashed #94a3b8', marginBottom: 3, justifyContent: 'center', alignItems: 'center' },
    brandName: { fontSize: 12, fontWeight: 'bold', marginBottom: 1 },
    brandDetail: { fontSize: 8, color: '#444444', marginBottom: 1 },
    brandTagline: { fontSize: 8, fontStyle: 'italic', color: '#555555', marginTop: 2 },
    docIdent: { flex: 1, alignItems: 'flex-end' },
    pill: { border: '1pt solid #000', padding: '2pt 6pt', fontSize: 8, marginBottom: 3, minWidth: 110 },
    fieldLabel: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, color: accent },
    topGrid: { flexDirection: 'row', gap: 6, marginBottom: 5 },
    topBox: { flex: 1, border: '1pt solid #000', padding: '4pt 6pt', minHeight: 34 },
    secondGrid: { flexDirection: 'row', gap: 6, marginBottom: 5 },
    secondBox: { flex: 1, border: '1pt solid #000', padding: '3pt 6pt', minHeight: 22 },
    modeRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
    modeBox: { flex: 1, border: '1pt solid #000', padding: '4pt 6pt', minHeight: 26 },
    checkboxRow: { flexDirection: 'row', gap: 4, alignItems: 'center', flexWrap: 'wrap' },
    checkboxLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, border: '1pt solid #000', padding: '2pt 6pt', fontSize: 9 },
    tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f4f4f4' },
    tableRow: { flexDirection: 'row' },
    tableHeaderCell: { border: '1pt solid #000', padding: '2pt 5pt', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
    tableCell: { border: '1pt solid #000', padding: '2pt 5pt', fontSize: 9, minHeight: 16 },
    colNum: { width: '6%', textAlign: 'center' },
    colDesc: { flex: 8 },
    colQty: { width: '16%', textAlign: 'center' },
    colCond: { width: '12%', textAlign: 'center' },
    colPart: { width: '14%', textAlign: 'center' },
    colCell: { flex: 1 },
    notesBox: { border: '1pt solid #000', padding: '5pt 7pt', minHeight: 34, marginBottom: 5, fontSize: 9 },
    sigsRow: { flexDirection: 'row', gap: 6, marginBottom: 5 },
    sigCard: { flex: 1, border: '1pt solid #000', height: 72 },
    sigHeader: { backgroundColor: '#f4f4f4', padding: '4pt 8pt', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1pt solid #000' },
    sigMetaRow: { flexDirection: 'row', borderBottom: '1pt solid #000', height: 20 },
    sigMetaCell: { flex: 1, padding: '2pt 8pt', fontSize: 8, color: muted, flexDirection: 'row', alignItems: 'center' },
    sigMetaCellBordered: { flex: 1, padding: '2pt 8pt', fontSize: 8, color: muted, flexDirection: 'row', alignItems: 'center', borderRight: '1pt solid #000' },
    sigArea: { flex: 1, padding: 4, justifyContent: 'center', alignItems: 'center', fontSize: 8, color: muted },
    sigLine: { width: '100%', borderBottom: '0.5pt solid #cbd5e1' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', borderTop: '1pt solid #000', paddingTop: 5, marginTop: 4, fontSize: 8, color: muted },
  })
}

export const MinimalTemplateDocument: React.FC<{ model: WaybillRenderModel; designPreset?: PdfDesignPreset }> = ({ model, designPreset }) => {
  const preset = designPreset || getDefaultPdfDesignPreset('waybill')
  const S = createStyles(preset)

  const isHand = model.logistics.deliveryMode === 'By Hand'
  const isVehicle = model.logistics.deliveryMode === 'By Vehicle'
  const isModeOther = !!model.logistics.deliveryMode && !['By Hand', 'By Vehicle'].includes(model.logistics.deliveryMode)
  const isSupply = model.logistics.purpose === 'Supply'
  const isReturn = model.logistics.purpose === 'Return'
  const isRepair = model.logistics.purpose === 'Repair'
  const isReasonOther = model.logistics.purpose === 'Other'

  return (
    <Document
      title={`Waybill - ${model.header.waybillNumber || 'Minimal'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Minimal"
    >
      <Page size="A4" style={S.page}>
        <View style={S.titleZone}>
          <Text>WAYBILL / DELIVERY NOTE</Text>
        </View>

        <View style={S.headerGrid} wrap={false}>
          <View style={S.brandInfo}>
            <View style={S.brandLogo}>
              {model.branding.logo ? <Image src={model.branding.logo} style={{ width: 36, height: 36, objectFit: 'contain' }} /> : null}
            </View>
            <Text style={S.brandName}>{model.branding.name}</Text>
            {model.branding.address ? <Text style={S.brandDetail}>{model.branding.address}</Text> : null}
            {model.branding.phone || model.branding.email ? (
              <Text style={S.brandDetail}>{[model.branding.phone, model.branding.email].filter(Boolean).join('  |  ')}</Text>
            ) : null}
            {model.branding.tagline ? <Text style={S.brandTagline}>{model.branding.tagline}</Text> : null}
          </View>
          <View style={S.docIdent}>
            <View style={S.pill}><Text>{model.header.waybillNumber}</Text></View>
            {model.header.date ? <View style={S.pill}><Text>Date  {model.header.date}</Text></View> : null}
            {model.header.time ? <View style={S.pill}><Text>Time  {model.header.time}</Text></View> : null}
          </View>
        </View>

        <View style={S.topGrid} wrap={false}>
          <View style={S.topBox}>
            <Text style={S.fieldLabel}>{model.header.type === 'internal' ? 'ORIGIN' : 'CLIENT / CONSIGNEE'}</Text>
            <Text>{model.header.type === 'internal' ? (model.logistics.deliveryLocation || '—') : (model.parties.clientName || '—')}</Text>
          </View>
          <View style={S.topBox}>
            <Text style={S.fieldLabel}>Destination Address</Text>
            <Text>{model.logistics.deliveryLocation || '—'}</Text>
          </View>
        </View>

        <View style={S.secondGrid} wrap={false}>
          <View style={S.secondBox}>
            <Text style={S.fieldLabel}>Vehicle Plate</Text>
            <Text>{model.logistics.vehiclePlate || '—'}</Text>
          </View>
          <View style={S.secondBox}>
            <Text style={S.fieldLabel}>Driver Name</Text>
            <Text>{model.logistics.driverName || '—'}</Text>
          </View>
        </View>

        <View style={S.modeRow} wrap={false}>
          <View style={S.modeBox}>
            <Text style={S.fieldLabel}>Delivery Mode</Text>
            <View style={S.checkboxRow}>
              <View style={S.checkboxLabel}><Checkbox checked={isHand} /><Text>Hand</Text></View>
              <View style={S.checkboxLabel}><Checkbox checked={isVehicle} /><Text>Vehicle</Text></View>
              <View style={S.checkboxLabel}><Checkbox checked={isModeOther} /><Text>Other</Text></View>
            </View>
          </View>
          <View style={S.modeBox}>
            <Text style={S.fieldLabel}>Delivery Reason</Text>
            <View style={S.checkboxRow}>
              <View style={S.checkboxLabel}><Checkbox checked={isSupply} /><Text>Supply</Text></View>
              <View style={S.checkboxLabel}><Checkbox checked={isReturn} /><Text>Return</Text></View>
              <View style={S.checkboxLabel}><Checkbox checked={isRepair} /><Text>Repair</Text></View>
              <View style={S.checkboxLabel}><Checkbox checked={isReasonOther} /><Text>Other</Text></View>
            </View>
          </View>
        </View>

        <View style={{ flex: 1, marginBottom: 6 }}>
          <View style={S.tableHeaderRow} fixed>
            <Text style={[S.tableHeaderCell, S.colNum]}>#</Text>
            {model.table.columns.map((col) => (
              <Text key={col.key} style={[S.tableHeaderCell, col.key === 'description' ? S.colDesc : col.key === 'qtyLabel' ? S.colQty : col.key === 'condition' ? S.colCond : col.key.includes('part') || col.key.includes('make') ? S.colPart : S.colCell]}>{col.label}</Text>
            ))}
          </View>
          {model.table.rows.map((row, idx) => (
            <View key={idx} style={S.tableRow}>
              <Text style={[S.tableCell, S.colNum]}>{idx + 1}</Text>
              {model.table.columns.map((col) => (
                <Text key={col.key} style={[S.tableCell, col.key === 'description' ? S.colDesc : col.key === 'qtyLabel' ? S.colQty : col.key === 'condition' ? S.colCond : col.key.includes('part') || col.key.includes('make') ? S.colPart : S.colCell]}>{row.cells[col.key] || ''}</Text>
              ))}
            </View>
          ))}
        </View>

        {model.notes ? (
          <View style={S.notesBox} wrap={false}>
            <Text style={S.fieldLabel}>Delivery Remarks / Notes</Text>
            <Text style={{ marginTop: 3 }}>{model.notes}</Text>
          </View>
        ) : null}

        <View style={S.sigsRow} wrap={false}>
          <View style={S.sigCard}>
            <View style={S.sigHeader}><Text>Delivered By / Driver</Text></View>
            <View style={S.sigMetaRow}>
              <View style={S.sigMetaCellBordered}><Text>Name: {model.parties.senderName || '—'}</Text></View>
              <View style={S.sigMetaCell}><Text>Date / Time</Text></View>
            </View>
            <View style={S.sigArea}>
              {model.signatures.sender ? (
                <Image src={model.signatures.sender.url} style={{ width: 110, height: 36, objectFit: 'contain' }} />
              ) : (
                <View style={S.sigLine} />
              )}
            </View>
          </View>
          <View style={S.sigCard}>
            <View style={S.sigHeader}><Text>Received By</Text></View>
            <View style={S.sigMetaRow}>
              <View style={S.sigMetaCellBordered}><Text>Name: {model.parties.receiverName || '—'}</Text></View>
              <View style={S.sigMetaCell}><Text>Date / Time</Text></View>
            </View>
            <View style={S.sigArea}>
              {model.signatures.receiver ? (
                <Image src={model.signatures.receiver.url} style={{ width: 110, height: 36, objectFit: 'contain' }} />
              ) : (
                <View style={S.sigLine} />
              )}
            </View>
          </View>
        </View>

        <View style={S.footer}>
          <Text>{model.footer.companyName || model.branding.name}</Text>
          <Text>{model.footer.waybillNumber}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export default MinimalTemplateDocument
