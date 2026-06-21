import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import {
  getDefaultPdfDesignPreset,
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'

interface ThermalTemplateProps {
  model: WaybillRenderModel
  designPreset?: PdfDesignPreset
}

const deliveryModes = ['Hand', 'Vehicle', 'Courier'] as const
const deliveryReasons = ['Supply', 'Return', 'Repair', 'Transfer', 'Other'] as const

const THERMAL_PAGE_WIDTH = 295 // 104mm in points

function Tick({ checked }: { checked: boolean }) {
  return (
    <Text>{checked ? '[X]' : '[ ]'}</Text>
  )
}

function createStyles() {
  return StyleSheet.create({
    page: {
      fontFamily: 'Courier',
      fontSize: 8,
      color: '#000000',
      backgroundColor: '#ffffff',
      padding: '8pt 6pt',
      width: THERMAL_PAGE_WIDTH,
    },
    center: { textAlign: 'center' },
    header: { textAlign: 'center', marginBottom: 4 },
    companyName: { fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
    companyLine: { fontSize: 7, marginBottom: 1 },
    title: { fontSize: 10, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, paddingBottom: 2, borderBottom: '1pt solid #000' },
    barcode: { flexDirection: 'row', justifyContent: 'center', marginBottom: 4 },
    barcodeBar: { width: 1, height: 20, backgroundColor: '#000', marginRight: 1 },
    waybillNum: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginBottom: 4, letterSpacing: 2 },
    row: { flexDirection: 'row', marginBottom: 1 },
    rowLabel: { width: 80, fontWeight: 'bold' },
    rowValue: { flex: 1 },
    divider: { borderBottom: '1pt solid #000', marginVertical: 3 },
    sectionTitle: { fontSize: 8, fontWeight: 'bold', textAlign: 'center', marginBottom: 2, textTransform: 'uppercase' },
    blockBox: { border: '1pt solid #000', padding: '3pt 4pt', marginBottom: 3 },
    blockLabel: { fontSize: 7, fontWeight: 'bold', marginBottom: 1 },
    blockText: { fontSize: 8 },
    tickRow: { flexDirection: 'row', gap: 4, marginBottom: 3, flexWrap: 'wrap' },
    tickItem: { flexDirection: 'row', alignItems: 'center', gap: 1, fontSize: 8, marginRight: 4 },
    tableHeader: { flexDirection: 'row', borderBottom: '1pt solid #000', paddingVertical: 1 },
    tableRow: { flexDirection: 'row', borderBottom: '0.5pt solid #000', paddingVertical: 1 },
    tableCellNum: { width: 16, textAlign: 'center' },
    tableCellDesc: { flex: 1 },
    tableCellQty: { width: 40, textAlign: 'center' },
    tableCellCond: { width: 36, textAlign: 'center' },
    tableCellPart: { width: 50, textAlign: 'center' },
    tableCellHeader: { fontSize: 7, fontWeight: 'bold' },
    tableCellText: { fontSize: 7 },
    noteBox: { border: '1pt solid #000', padding: '3pt 4pt', marginBottom: 3, fontSize: 7 },
    sigSection: { marginTop: 3 },
    sigRow: { flexDirection: 'row', border: '1pt solid #000', marginBottom: 3 },
    sigBlock: { flex: 1, padding: '3pt 4pt' },
    sigBorder: { flex: 1, padding: '3pt 4pt', borderRight: '1pt solid #000' },
    sigTitle: { fontSize: 7, fontWeight: 'bold', marginBottom: 1, textTransform: 'uppercase' },
    sigLine: { fontSize: 7, marginBottom: 1 },
    sigBlank: { borderBottom: '0.5pt solid #000', height: 10, marginBottom: 1 },
    sigImg: { width: '100%', height: 20, objectFit: 'contain' },
    footer: { marginTop: 4, borderTop: '1pt solid #000', paddingTop: 2, textAlign: 'center', fontSize: 7 },
  })
}

export const ThermalTemplateDocument: React.FC<{ model: WaybillRenderModel; designPreset?: PdfDesignPreset }> = ({ model }) => {
  const S = createStyles()

  return (
    <Document
      title={`Waybill - ${model.header.waybillNumber || 'Thermal'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Thermal"
    >
      <Page size={{ width: THERMAL_PAGE_WIDTH, height: 'auto' }} style={S.page} wrap>
        <View style={S.header}>
          <Text style={S.companyName}>{model.branding.name || 'Company Name'}</Text>
          {model.branding.address ? <Text style={S.companyLine}>{model.branding.address}</Text> : null}
          {model.branding.phone || model.branding.email ? (
            <Text style={S.companyLine}>{[model.branding.phone, model.branding.email].filter(Boolean).join(' | ')}</Text>
          ) : null}
        </View>

        <Text style={S.title}>WAYBILL / DELIVERY NOTE</Text>

        <View style={S.barcode}>
          {Array.from({ length: 40 }).map((_, i) => (
            <View key={i} style={{ width: i % 3 === 0 ? 2 : 1, height: 20, backgroundColor: '#000', marginRight: 1 }} />
          ))}
        </View>

        <Text style={S.waybillNum}>{model.header.waybillNumber || '—'}</Text>

        {model.header.date ? <View style={S.row}><Text style={S.rowLabel}>DATE</Text><Text style={S.rowValue}>{model.header.date}</Text></View> : null}
        {model.header.time ? <View style={S.row}><Text style={S.rowLabel}>TIME</Text><Text style={S.rowValue}>{model.header.time}</Text></View> : null}
        {model.header.poNumber ? <View style={S.row}><Text style={S.rowLabel}>P.O. NO</Text><Text style={S.rowValue}>{model.header.poNumber}</Text></View> : null}
        {model.logistics.vehiclePlate ? <View style={S.row}><Text style={S.rowLabel}>VEHICLE</Text><Text style={S.rowValue}>{model.logistics.vehiclePlate}</Text></View> : null}
        {model.logistics.driverName ? <View style={S.row}><Text style={S.rowLabel}>DRIVER</Text><Text style={S.rowValue}>{model.logistics.driverName}</Text></View> : null}

        <View style={S.divider} />

        <View style={S.blockBox}>
          <Text style={S.blockLabel}>DISPATCH FROM</Text>
          <Text style={S.blockText}>{model.parties.senderName || '—'}</Text>
        </View>

        <View style={S.blockBox}>
          <Text style={S.blockLabel}>DELIVER TO</Text>
          <Text style={S.blockText}>{model.parties.receiverName || '—'}</Text>
          {model.logistics.deliveryLocation ? <Text style={S.blockText}>{model.logistics.deliveryLocation}</Text> : null}
        </View>

        <View style={S.divider} />

        <View style={S.tickRow}>
          <Text style={[S.rowLabel, { width: 'auto', marginRight: 4 }]}>METHOD:</Text>
          {deliveryModes.map((mode) => (
            <View key={mode} style={S.tickItem}>
              <Tick checked={model.logistics.deliveryMode?.replace('By ', '') === mode} />
              <Text>{mode}</Text>
            </View>
          ))}
        </View>

        <View style={S.tickRow}>
          <Text style={[S.rowLabel, { width: 'auto', marginRight: 4 }]}>PURPOSE:</Text>
          {deliveryReasons.map((reason) => (
            <View key={reason} style={S.tickItem}>
              <Tick checked={model.logistics.purpose === reason} />
              <Text>{reason}</Text>
            </View>
          ))}
        </View>

        <View style={S.divider} />

        <Text style={S.sectionTitle}>ITEMS</Text>
        <View style={S.tableHeader} fixed>
          <Text style={[S.tableCellNum, S.tableCellHeader]}>#</Text>
          <Text style={[S.tableCellDesc, S.tableCellHeader]}>DESCRIPTION</Text>
          <Text style={[S.tableCellQty, S.tableCellHeader]}>QTY</Text>
          <Text style={[S.tableCellCond, S.tableCellHeader]}>COND</Text>
          <Text style={[S.tableCellPart, S.tableCellHeader]}>PART NO</Text>
        </View>
        {model.table.rows.map((row, idx) => (
          <View key={idx} style={S.tableRow}>
            <Text style={[S.tableCellNum, S.tableCellText]}>{idx + 1}</Text>
            <Text style={[S.tableCellDesc, S.tableCellText]}>{row.cells['description'] || ''}</Text>
            <Text style={[S.tableCellQty, S.tableCellText]}>{row.cells['qtyLabel'] || ''}</Text>
            <Text style={[S.tableCellCond, S.tableCellText]}>{row.cells['condition'] || ''}</Text>
            <Text style={[S.tableCellPart, S.tableCellText]}>{row.cells['partNo'] || row.cells['part_no'] || ''}</Text>
          </View>
        ))}
        <View style={S.divider} />

        {model.notes ? (
          <View style={S.noteBox}>
            <Text style={S.blockLabel}>NOTE</Text>
            <Text>{model.notes}</Text>
          </View>
        ) : null}

        <View style={S.sigSection} wrap={false}>
          <View style={S.sigRow}>
            <View style={S.sigBorder}>
              <Text style={S.sigTitle}>DELIVERED BY</Text>
              <Text style={S.sigLine}>Name: {model.parties.senderName || '—'}</Text>
              <View style={S.sigBlank} />
              <Text style={S.sigLine}>Date / Time:</Text>
              <View style={S.sigBlank} />
              {model.signatures.sender ? (
                <Image src={model.signatures.sender.url} style={S.sigImg} />
              ) : null}
            </View>
            <View style={S.sigBlock}>
              <Text style={S.sigTitle}>COLLECTED BY</Text>
              <Text style={S.sigLine}>Name: {model.parties.receiverName || '—'}</Text>
              <View style={S.sigBlank} />
              <Text style={S.sigLine}>Date / Time:</Text>
              <View style={S.sigBlank} />
              {model.signatures.receiver ? (
                <Image src={model.signatures.receiver.url} style={S.sigImg} />
              ) : null}
            </View>
          </View>
        </View>

        <View style={S.footer}>
          <Text>{model.footer.companyName || model.branding.name}</Text>
          <Text>{model.footer.waybillNumber}</Text>
        </View>
      </Page>
    </Document>
  )
}

export default ThermalTemplateDocument
