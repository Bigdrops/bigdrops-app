import { Image, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import {
  getDefaultPdfDesignPreset,
  getEffectiveFillableFont,
  resolvePdfFontFamily,
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'

interface ClassicTemplateProps {
  model: WaybillRenderModel
  designPreset?: PdfDesignPreset
}

function createStyles(designPreset?: PdfDesignPreset) {
  const preset = designPreset || getDefaultPdfDesignPreset('waybill')
  const fillableChoice = getEffectiveFillableFont(preset)
  const fillableBold = resolvePdfFontFamily(fillableChoice, 'bold')
  const fillableRegular = resolvePdfFontFamily(fillableChoice, 'regular')
  const fillableColor = preset.fillableColor

  return StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 9, color: '#0f172a', paddingTop: 32, paddingBottom: 40, paddingHorizontal: 34, backgroundColor: '#ffffff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    companyBlock: { flex: 1, paddingRight: 12 },
    logo: { width: 48, height: 48, objectFit: 'contain', marginBottom: 8 },
    companyName: { fontSize: 14, fontFamily: fillableBold, color: fillableColor, marginBottom: 2 },
    companyLine: { fontSize: 8, color: '#475569', marginBottom: 1 },
    docTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
    docNumber: { fontSize: 10, textAlign: 'right', marginTop: 4, fontFamily: fillableBold, color: fillableColor },
    divider: { borderBottom: '1pt solid #cbd5e1', marginBottom: 12 },
    metaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
    metaCard: { width: '25%', paddingRight: 8, marginBottom: 8 },
    metaLabel: { fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 },
    metaValue: { fontSize: 9, fontFamily: fillableBold, color: fillableColor },
    sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 6, textTransform: 'uppercase', color: '#334155' },
    partyRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    partyBox: { flex: 1, border: '1pt solid #cbd5e1', borderRadius: 4, padding: 8, backgroundColor: '#f8fafc' },
    partyLabel: { fontSize: 7, textTransform: 'uppercase', color: '#475569', marginBottom: 4 },
    partyValue: { fontSize: 10, fontFamily: fillableBold, color: fillableColor, marginBottom: 2 },
    partyNote: { fontSize: 8, color: fillableColor, fontFamily: fillableRegular },
    tableHeader: { flexDirection: 'row', backgroundColor: '#0f172a', paddingVertical: 5, paddingHorizontal: 6 },
    tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottom: '0.5pt solid #e2e8f0' },
    tableRowAlt: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottom: '0.5pt solid #e2e8f0', backgroundColor: '#f8fafc' },
    cell: { fontSize: 8, color: fillableColor, fontFamily: fillableRegular },
    headerCell: { fontSize: 8, color: '#ffffff', fontFamily: fillableBold },
    numberCol: { flex: 1 },
    customCol: { flex: 2, paddingLeft: 6 },
    notesBox: { marginTop: 10, border: '1pt solid #e2e8f0', borderRadius: 4, padding: 8, backgroundColor: '#f8fafc' },
    signatureRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    signatureBox: { flex: 1, border: '1pt solid #cbd5e1', borderRadius: 4, padding: 8 },
    signatureImage: { width: 110, height: 42, objectFit: 'contain', marginBottom: 6 },
    signatureTitle: { fontSize: 7, textTransform: 'uppercase', color: '#475569', marginBottom: 4 },
    signatureText: { fontSize: 8, color: fillableColor, fontFamily: fillableRegular, marginBottom: 2 },
    dateTimeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    dateTimeField: { fontSize: 7, color: '#94a3b8', flex: 1 },
    dateTimeLine: { borderBottom: '0.5pt solid #cbd5e1', marginTop: 2, height: 10 },
    footer: {
      paddingTop: 4,
      borderTop: '1pt solid #000',
      textAlign: 'center',
      fontSize: 8,
      color: '#555555',
    },
    footerText: { fontSize: 7, color: '#94a3b8' },
  })
}

export default function ClassicTemplate({ model, designPreset }: ClassicTemplateProps) {
  const S = createStyles(designPreset)

  const metaEntries = [
    model.header.date ? { label: 'Date', value: model.header.date } : null,
    model.header.time ? { label: 'Time', value: model.header.time } : null,
    model.logistics.vehiclePlate ? { label: 'Vehicle Plate', value: model.logistics.vehiclePlate } : null,
    model.logistics.deliveryLocation ? { label: 'Delivery Location', value: model.logistics.deliveryLocation } : null,
    model.parties.clientName ? { label: 'Client', value: model.parties.clientName } : null,
    model.header.poNumber ? { label: 'P.O. Number', value: model.header.poNumber } : null,
    model.logistics.deliveryMode ? { label: 'Delivery Mode', value: model.logistics.deliveryMode } : null,
    model.logistics.purpose ? { label: 'Purpose', value: model.logistics.purpose } : null,
    model.logistics.driverName ? { label: 'Driver Name', value: model.logistics.driverName } : null,
  ].filter(Boolean)

  const senderLabel = model.header.type === 'internal' ? 'Released By / From' : 'Sender'
  const receiverLabel = model.header.type === 'internal' ? 'Received By / To' : 'Receiver'

  return (
    <View style={S.page}>
      <View style={S.header}>
        <View style={S.companyBlock}>
          {model.branding.logo ? <Image src={model.branding.logo} style={S.logo} /> : null}
          <Text style={S.companyName}>{model.branding.name || 'Company Name'}</Text>
          {model.branding.address ? <Text style={S.companyLine}>{model.branding.address}</Text> : null}
          {model.branding.phone ? <Text style={S.companyLine}>{model.branding.phone}</Text> : null}
          {model.branding.email ? <Text style={S.companyLine}>{model.branding.email}</Text> : null}
        </View>
        <View>
          <Text style={S.docTitle}>WAYBILL / DELIVERY NOTE</Text>
          <Text style={S.docNumber}>{model.header.waybillNumber || '—'}</Text>
        </View>
      </View>

      <View style={S.divider} />

      <View style={S.metaGrid}>
        {metaEntries.map((entry) => (
          <View key={entry!.label} style={S.metaCard}>
            <Text style={S.metaLabel}>{entry!.label}</Text>
            <Text style={S.metaValue}>{entry!.value}</Text>
          </View>
        ))}
      </View>

      <View style={S.partyRow}>
        <View style={S.partyBox}>
          <Text style={S.partyLabel}>{senderLabel}</Text>
          <Text style={S.partyValue}>{model.parties.senderName || ''}</Text>
        </View>
        <View style={S.partyBox}>
          <Text style={S.partyLabel}>{receiverLabel}</Text>
          <Text style={S.partyValue}>{model.parties.receiverName || ''}</Text>
        </View>
      </View>

      <Text style={S.sectionTitle}>Items</Text>
      <View style={S.tableHeader} fixed>
        <Text style={[S.headerCell, S.numberCol]}>#</Text>
        {model.table.columns.map((col) => (
          <Text key={col.key} style={[S.headerCell, S.customCol]}>{col.label}</Text>
        ))}
      </View>

      {model.table.rows.map((row, index) => (
        <View key={index} style={index % 2 === 0 ? S.tableRow : S.tableRowAlt}>
          <Text style={[S.cell, S.numberCol]}>{index + 1}</Text>
          {model.table.columns.map((col) => (
            <Text key={col.key} style={[S.cell, S.customCol]}>{row.cells[col.key] || ''}</Text>
          ))}
        </View>
      ))}

      {model.notes ? (
        <View style={S.notesBox} wrap={false}>
          <Text style={S.sectionTitle}>Operational Notes</Text>
          <Text style={S.cell}>{model.notes}</Text>
        </View>
      ) : null}

      <View style={S.signatureRow} wrap={false}>
        <View style={S.signatureBox}>
          <Text style={S.signatureTitle}>{'SENDER'}'S SIGNATURE</Text>
          {model.signatures.sender ? (
            <Image src={model.signatures.sender.url} style={S.signatureImage} />
          ) : (
            <View style={[S.signatureImage, { borderBottom: '0.5pt solid #cbd5e1' }]} />
          )}
          <View style={S.dateTimeRow}>
            <View style={S.dateTimeField}>
              <Text>Date</Text>
              <View style={S.dateTimeLine} />
            </View>
            <View style={S.dateTimeField}>
              <Text>Time</Text>
              <View style={S.dateTimeLine} />
            </View>
          </View>
        </View>
        <View style={S.signatureBox}>
          <Text style={S.signatureTitle}>{'RECEIVER'}'S SIGNATURE</Text>
          {model.signatures.receiver ? (
            <Image src={model.signatures.receiver.url} style={S.signatureImage} />
          ) : (
            <View style={[S.signatureImage, { borderBottom: '0.5pt solid #cbd5e1' }]} />
          )}
          <View style={S.dateTimeRow}>
            <View style={S.dateTimeField}>
              <Text>Date</Text>
              <View style={S.dateTimeLine} />
            </View>
            <View style={S.dateTimeField}>
              <Text>Time</Text>
              <View style={S.dateTimeLine} />
            </View>
          </View>
        </View>
      </View>

      <View style={S.footer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={S.footerText}>{model.footer.waybillNumber}</Text>
          <Text style={S.footerText}>{model.footer.companyName}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} style={S.footerText} />
        </View>
      </View>
    </View>
  )
}
