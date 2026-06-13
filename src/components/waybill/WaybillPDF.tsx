import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import {
  getDefaultPdfDesignPreset,
  getEffectiveFillableFont,
  resolvePdfFontFamily,
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import { registerPdfFillableFonts } from '@/lib/pdfFontRegistry'

import {
  formatWaybillDate,
  formatWaybillTime,
  getWaybillSignature,
  getWaybillTypeContent,
  mapDbWaybill,
} from './waybillUtils'
import type { Waybill } from './waybillUtils'

interface Settings {
  company_name?: string
  company_address?: string
  company_phone?: string
  company_email?: string
  company_logo_url?: string
}

interface WaybillPDFProps {
  waybill: Waybill
  settings: Settings
  designPreset?: PdfDesignPreset
}

registerPdfFillableFonts()

function createStyles(designPreset?: PdfDesignPreset) {
  const preset = designPreset || getDefaultPdfDesignPreset('waybill')
  const fillableChoice = getEffectiveFillableFont(preset)
  const fillableRegular = resolvePdfFontFamily(fillableChoice, 'regular')
  const fillableBold = resolvePdfFontFamily(fillableChoice, 'bold')
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
  numberCol: { width: 20 },
  descCol: { flex: 1.8, paddingRight: 6 },
  qtyCol: { width: 32, textAlign: 'right' },
  unitCol: { width: 40, paddingLeft: 6 },
  conditionCol: { width: 48, paddingLeft: 6 },
  customCol: { width: 54, paddingLeft: 6 },
  notesBox: { marginTop: 10, border: '1pt solid #e2e8f0', borderRadius: 4, padding: 8, backgroundColor: '#f8fafc' },
  signatureRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  signatureBox: { flex: 1, border: '1pt solid #cbd5e1', borderRadius: 4, padding: 8 },
  signatureImage: { width: 110, height: 42, objectFit: 'contain', marginBottom: 6 },
  signatureTitle: { fontSize: 7, textTransform: 'uppercase', color: '#475569', marginBottom: 4 },
  signatureText: { fontSize: 8, color: fillableColor, fontFamily: fillableRegular, marginBottom: 2 },
  footer: { position: 'absolute', bottom: 18, left: 34, right: 34, borderTop: '0.5pt solid #cbd5e1', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#94a3b8' },
})
}

export default function WaybillPDF({ waybill, settings, designPreset }: WaybillPDFProps) {
  const S = createStyles(designPreset)
  const mapped = mapDbWaybill(waybill)
  const customFields = mapped.custom_fields && typeof mapped.custom_fields === 'object' ? mapped.custom_fields : {}
  const customColumns = customFields.customColumns || []
  const senderSignature = getWaybillSignature(mapped, 'sender')
  const receiverSignature = getWaybillSignature(mapped, 'receiver')
  const typeContent = getWaybillTypeContent(mapped.type)
  const footerContact = [settings.company_phone, settings.company_email].filter(Boolean).join('  |  ')

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <View style={S.companyBlock}>
            {settings.company_logo_url ? <Image src={settings.company_logo_url} style={S.logo} /> : null}
            <Text style={S.companyName}>{settings.company_name || 'Company Name'}</Text>
            {settings.company_address ? <Text style={S.companyLine}>{settings.company_address}</Text> : null}
            {settings.company_phone ? <Text style={S.companyLine}>{settings.company_phone}</Text> : null}
            {settings.company_email ? <Text style={S.companyLine}>{settings.company_email}</Text> : null}
          </View>
          <View>
            <Text style={S.docTitle}>{typeContent.pdfTitle}</Text>
            <Text style={S.docNumber}>{mapped.waybill_number || '—'}</Text>
          </View>
        </View>

        <View style={S.divider} />

        <View style={S.metaGrid}>
          {[
            mapped.date ? { label: 'Date', value: formatWaybillDate(mapped.date) } : null,
            mapped.time ? { label: 'Time', value: formatWaybillTime(mapped.time) } : null,
            mapped.vehicle_plate ? { label: 'Vehicle Plate', value: mapped.vehicle_plate } : null,
            mapped.delivery_location ? { label: typeContent.locationLabel, value: mapped.delivery_location } : null,
            mapped.client_name ? { label: typeContent.clientLabel, value: mapped.client_name } : null,
            mapped.po_number ? { label: 'P.O. Number', value: mapped.po_number } : null,
            customFields.references?.linkedInvoiceNumber ? { label: 'Invoice Ref', value: customFields.references.linkedInvoiceNumber } : null,
            customFields.references?.linkedProjectName ? { label: 'Project Ref', value: customFields.references.linkedProjectName } : null,
          ].filter(Boolean).map((entry) => (
            <View key={entry!.label} style={S.metaCard}>
              <Text style={S.metaLabel}>{entry!.label}</Text>
              <Text style={S.metaValue}>{entry!.value}</Text>
            </View>
          ))}
        </View>

        <View style={S.partyRow}>
          <View style={S.partyBox}>
            <Text style={S.partyLabel}>{typeContent.senderPdfLabel}</Text>
            <Text style={S.partyValue}>{mapped.sender_name || ''}</Text>
            {customFields.partyNotes?.sender ? <Text style={S.partyNote}>{customFields.partyNotes.sender}</Text> : null}
          </View>
          <View style={S.partyBox}>
            <Text style={S.partyLabel}>{typeContent.receiverPdfLabel}</Text>
            <Text style={S.partyValue}>{mapped.receiver_name || ''}</Text>
            {customFields.partyNotes?.receiver ? <Text style={S.partyNote}>{customFields.partyNotes.receiver}</Text> : null}
          </View>
        </View>

        <Text style={S.sectionTitle}>Items</Text>
        <View style={S.tableHeader}>
          <Text style={[S.cell, S.numberCol]}>#</Text>
          <Text style={[S.cell, S.descCol]}>Description</Text>
          <Text style={[S.cell, S.qtyCol]}>Qty</Text>
          <Text style={[S.cell, S.unitCol]}>Unit</Text>
          <Text style={[S.cell, S.conditionCol]}>Condition</Text>
          {customColumns.map((column) => (
            <Text key={column.key} style={[S.cell, S.customCol]}>{column.label}</Text>
          ))}
        </View>

        {mapped.items.map((item, index) => (
          <View key={`${item.description}-${index}`} style={index % 2 === 0 ? S.tableRow : S.tableRowAlt}>
            <Text style={[S.cell, S.numberCol]}>{index + 1}</Text>
            <Text style={[S.cell, S.descCol]}>{item.description || ''}</Text>
            <Text style={[S.cell, S.qtyCol]}>{item.quantity != null ? String(item.quantity) : ''}</Text>
            <Text style={[S.cell, S.unitCol]}>{item.unit || ''}</Text>
            <Text style={[S.cell, S.conditionCol]}>{item.condition || ''}</Text>
            {customColumns.map((column) => (
              <Text key={column.key} style={[S.cell, S.customCol]}>{String(item.custom_data?.[column.key] || '')}</Text>
            ))}
          </View>
        ))}

        {mapped.notes ? (
          <View style={S.notesBox}>
            <Text style={S.sectionTitle}>Operational Notes</Text>
            <Text style={S.cell}>{mapped.notes}</Text>
          </View>
        ) : null}

        <View style={S.signatureRow}>
          {[{ title: typeContent.senderSignatureLabel, signature: senderSignature }, { title: typeContent.receiverSignatureLabel, signature: receiverSignature }].map((entry) => (
            <View key={entry.title} style={S.signatureBox}>
              <Text style={S.signatureTitle}>{entry.title}</Text>
              {entry.signature.image_url || entry.signature.drawn_data_url ? (
                <Image src={entry.signature.image_url || entry.signature.drawn_data_url || ''} style={S.signatureImage} />
              ) : (
                <View style={[S.signatureImage, { borderBottom: '0.5pt solid #cbd5e1' }]} />
              )}
            </View>
          ))}
        </View>

        <View style={S.footer}>
          <Text style={S.footerText}>{settings.company_name || ''}</Text>
          <Text style={S.footerText}>{footerContact}</Text>
          <Text style={S.footerText}>Waybill: {mapped.waybill_number}</Text>
        </View>
      </Page>
    </Document>
  )
}