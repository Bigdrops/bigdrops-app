import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { Waybill } from './waybillUtils'

interface Settings {
  company_name?: string
  company_address?: string
  company_phone?: string
  company_email?: string
  logo_url?: string
}

interface WaybillPDFProps {
  waybill: Waybill
  settings: Settings
}

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111827',
    backgroundColor: '#ffffff',
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 40,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  logo: { width: 52, height: 52, objectFit: 'contain' },
  companyBlock: { flex: 1, paddingLeft: 12 },
  companyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 2 },
  companyLine: { fontSize: 8, color: '#4b5563', marginBottom: 1 },
  docTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#0f172a', textAlign: 'right' },
  docSubtitle: { fontSize: 8, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  divider: { borderBottom: '1pt solid #d1d5db', marginVertical: 10 },
  thinDivider: { borderBottom: '0.5pt solid #e5e7eb', marginVertical: 6 },
  metaRow: { flexDirection: 'row', gap: 0, marginBottom: 14 },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  metaValue: { fontSize: 9, color: '#111827' },
  partiesRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  partyBox: {
    flex: 1,
    border: '1pt solid #d1d5db',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#f9fafb',
  },
  partyLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  partyName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginBottom: 0,
  },
  tableHeaderCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottom: '0.5pt solid #e5e7eb' },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottom: '0.5pt solid #e5e7eb', backgroundColor: '#f9fafb' },
  tableCell: { fontSize: 8.5, color: '#111827' },
  colNum:  { width: 22 },
  colDesc: { flex: 1 },
  colQty:  { width: 36, textAlign: 'center' },
  colUnit: { width: 44 },
  colCond: { width: 52 },
  notesBox: { marginTop: 10, padding: 10, backgroundColor: '#f9fafb', border: '0.5pt solid #e5e7eb', borderRadius: 3 },
  notesLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  notesText: { fontSize: 8.5, color: '#111827', lineHeight: 1.5 },
  sigRow: { flexDirection: 'row', gap: 20, marginTop: 20 },
  sigBox: { flex: 1, borderTop: '1pt solid #374151', paddingTop: 8 },
  sigLabel: { fontSize: 7, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  sigImage: { width: 100, height: 50, objectFit: 'contain', marginBottom: 4 },
  sigName: { fontSize: 8, color: '#111827', marginTop: 4 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTop: '0.5pt solid #d1d5db', paddingTop: 6 },
  footerText: { fontSize: 7, color: '#9ca3af' },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
})

function conditionLabel(c: string) {
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : '—'
}

export default function WaybillPDF({ waybill, settings }: WaybillPDFProps) {
  const items = Array.isArray(waybill.items) ? waybill.items : []
  const formattedDate = waybill.date
    ? new Date(waybill.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  const footerContact = [settings.company_phone, settings.company_email].filter(Boolean).join('  |  ')

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {settings.logo_url ? <Image src={settings.logo_url} style={S.logo} /> : null}
            <View style={S.companyBlock}>
              <Text style={S.companyName}>{settings.company_name || 'Company Name'}</Text>
              {settings.company_address ? <Text style={S.companyLine}>{settings.company_address}</Text> : null}
              {settings.company_phone  ? <Text style={S.companyLine}>{settings.company_phone}</Text>  : null}
              {settings.company_email  ? <Text style={S.companyLine}>{settings.company_email}</Text>  : null}
            </View>
          </View>
          <View>
            <Text style={S.docTitle}>WAYBILL</Text>
            <Text style={S.docSubtitle}>{waybill.waybill_number}</Text>
            <Text style={S.docSubtitle}>{waybill.type === 'internal' ? 'Internal' : 'External'}</Text>
          </View>
        </View>

        <View style={S.divider} />

        <View style={S.metaRow}>
          <View style={S.metaCol}>
            <Text style={S.metaLabel}>Waybill No.</Text>
            <Text style={S.metaValue}>{waybill.waybill_number || '—'}</Text>
          </View>
          <View style={S.metaCol}>
            <Text style={S.metaLabel}>Date</Text>
            <Text style={S.metaValue}>{formattedDate}</Text>
          </View>
          <View style={S.metaCol}>
            <Text style={S.metaLabel}>Time</Text>
            <Text style={S.metaValue}>{waybill.time || '—'}</Text>
          </View>
          <View style={S.metaCol}>
            <Text style={S.metaLabel}>Vehicle Plate</Text>
            <Text style={S.metaValue}>{waybill.vehicle_plate || '—'}</Text>
          </View>
          {waybill.po_number ? (
            <View style={S.metaCol}>
              <Text style={S.metaLabel}>PO Number</Text>
              <Text style={S.metaValue}>{waybill.po_number}</Text>
            </View>
          ) : null}
        </View>

        <View style={S.metaRow}>
          <View style={S.metaCol}>
            <Text style={S.metaLabel}>Delivery Location</Text>
            <Text style={S.metaValue}>{waybill.delivery_location || '—'}</Text>
          </View>
          {waybill.client_name ? (
            <View style={S.metaCol}>
              <Text style={S.metaLabel}>Client</Text>
              <Text style={S.metaValue}>{waybill.client_name}</Text>
            </View>
          ) : null}
        </View>

        <View style={S.thinDivider} />

        <View style={S.partiesRow}>
          <View style={S.partyBox}>
            <Text style={S.partyLabel}>Sender</Text>
            <Text style={S.partyName}>{waybill.sender_name || '—'}</Text>
          </View>
          <View style={S.partyBox}>
            <Text style={S.partyLabel}>Receiver</Text>
            <Text style={S.partyName}>{waybill.receiver_name || '—'}</Text>
          </View>
        </View>

        <Text style={S.sectionTitle}>Items</Text>

        <View style={S.tableHeader}>
          <Text style={[S.tableHeaderCell, S.colNum]}>#</Text>
          <Text style={[S.tableHeaderCell, S.colDesc]}>Description</Text>
          <Text style={[S.tableHeaderCell, S.colQty]}>Qty</Text>
          <Text style={[S.tableHeaderCell, S.colUnit]}>Unit</Text>
          <Text style={[S.tableHeaderCell, S.colCond]}>Condition</Text>
        </View>

        {items.map((item, i) => (
          <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
            <Text style={[S.tableCell, S.colNum]}>{i + 1}</Text>
            <Text style={[S.tableCell, S.colDesc]}>{item.description || '—'}</Text>
            <Text style={[S.tableCell, S.colQty]}>{item.quantity ?? '—'}</Text>
            <Text style={[S.tableCell, S.colUnit]}>{item.unit || '—'}</Text>
            <Text style={[S.tableCell, S.colCond]}>{conditionLabel(item.condition)}</Text>
          </View>
        ))}

        {waybill.notes ? (
          <View style={S.notesBox}>
            <Text style={S.notesLabel}>Notes</Text>
            <Text style={S.notesText}>{waybill.notes}</Text>
          </View>
        ) : null}

        <View style={S.sigRow}>
          <View style={S.sigBox}>
            {waybill.receiver_signature_url ? (
              <Image src={waybill.receiver_signature_url} style={S.sigImage} />
            ) : null}
            <Text style={S.sigLabel}>Receiver Signature</Text>
            {waybill.receiver_name ? <Text style={S.sigName}>{waybill.receiver_name}</Text> : null}
            {waybill.receiver_description ? <Text style={S.sigName}>{waybill.receiver_description}</Text> : null}
          </View>
          <View style={S.sigBox}>
            <View style={{ height: 50 }} />
            <Text style={S.sigLabel}>Authorised Signature</Text>
          </View>
        </View>

        <View style={S.footer}>
          <Text style={S.footerText}>{settings.company_name || ''}</Text>
          <Text style={S.footerText}>{footerContact}</Text>
          <Text style={S.footerText}>Waybill: {waybill.waybill_number}</Text>
        </View>
      </Page>
    </Document>
  )
}
