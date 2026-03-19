import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import { stripHtml, extractInvoiceData } from './pdfUtils'
import { renderTotals } from './base/renderTotals'
import { renderItemsTable } from './base/renderItems'

const BAND = '#0F172A'
const A    = '#3B82F6' // blue accent for totals/labels

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 0, backgroundColor: 'white' },

  // Full-width dark band header
  headerBand: { backgroundColor: BAND, padding: '28 40 24 40', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 0 },
  companyBlock: { flex: 1, marginRight: 20 },
  logo: { maxWidth: 100, maxHeight: 50, marginBottom: 6, objectFit: 'contain' },
  companyName: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: 'white', marginBottom: 2 },
  companyDetail: { fontSize: 8, color: '#94A3B8', marginBottom: 1 },
  docBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: 'white', letterSpacing: 2, marginBottom: 6 },
  docNumber: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#E2E8F0', marginBottom: 2 },
  docDate: { fontSize: 9, color: '#94A3B8', marginBottom: 1 },
  docSubtitle: { fontSize: 9, color: '#94A3B8', marginBottom: 2 },

  // Blue accent strip under band
  accentStrip: { backgroundColor: A, height: 4, marginBottom: 0 },

  // Body content area
  body: { padding: '20 40 40 40' },

  // Client section
  twoCol: { flexDirection: 'row', marginBottom: 20 },
  col: { flex: 1 },
  sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: A, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  clientName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 2 },
  clientDetail: { fontSize: 8, color: '#555', marginBottom: 2 },

  // Invoice title above table
  invoiceTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: BAND, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 6 },

  // Table
  table: { marginBottom: 14 },
  tableHeader: { flexDirection: 'row', backgroundColor: BAND, paddingVertical: 7, paddingHorizontal: 8 },
  thText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'white' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#F8FAFC' },
  groupRow: { flexDirection: 'row', backgroundColor: '#1E3A5F', paddingVertical: 5, paddingHorizontal: 8 },
  groupText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  groupSubtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: '#BFDBFE' },
  groupSubtotalLabel: { fontSize: 8, color: '#555', fontFamily: 'Helvetica-Bold', marginRight: 12 },
  groupSubtotalValue: { fontSize: 8, color: A, fontFamily: 'Helvetica-Bold' },

  cNum:   { width: 18, textAlign: 'center', fontSize: 8 },
  cDesc:  { flex: 2.5 },
  cMake:  { flex: 1.2, fontSize: 8 },
  cQty:   { flex: 0.7, textAlign: 'center', fontSize: 8 },
  cUnit:  { flex: 0.8, textAlign: 'center', fontSize: 8 },
  cPrice: { flex: 1.5, textAlign: 'right', fontSize: 8 },
  cAmt:   { flex: 1.5, textAlign: 'right', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  descText: { fontSize: 8.5, color: '#1a1a1a' },
  subDescText: { fontSize: 7, color: '#888', marginTop: 1, fontFamily: 'Helvetica-Oblique' },

  // Totals
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  totalsBox: { width: 260, backgroundColor: '#F8FAFC', padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 8, color: '#555' },
  totalValue: { fontSize: 8, color: '#1a1a1a' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: BAND, paddingTop: 6, marginTop: 4 },
  grandLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BAND },
  grandValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: BAND },
  whtRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#ddd' },
  payableRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: A, paddingTop: 6, marginTop: 4 },
  payableLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: A },
  payableValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: A },

  amountWords: { backgroundColor: '#EFF6FF', padding: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: A },
  amountWordsText: { fontSize: 8, color: '#334155', fontFamily: 'Helvetica-Oblique' },
  notesBox: { marginBottom: 10 },
  notesText: { fontSize: 8, color: '#555', lineHeight: 1.5 },
  docsSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  docsSectionLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#333', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  docItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  docLink: { fontSize: 8, color: A, textDecoration: 'underline' },
  footer: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 12 },
  footerText: { fontSize: 7.5, color: '#888', textAlign: 'center', lineHeight: 1.6 },
})

export default function InvoicePDF_Bold({ document, items = [], client, settings = {}, computedResult }) {
  const invoice = document
  const d = extractInvoiceData(document, items, client, settings, computedResult)
  const columns = d.pdfColumns
  const columnStyle = (column, extra = {}) => ({
    flex: column.pdfFlex,
    textAlign: column.align,
    ...extra,
  })

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* FULL-WIDTH DARK BAND */}
        <View style={s.headerBand}>
          <View style={s.companyBlock}>
            {d.logoUrl ? <Image src={d.logoUrl} style={s.logo} /> : null}
            <Text style={s.companyName}>{d.companyName}</Text>
            {d.companyTagline ? <Text style={s.companyDetail}>{d.companyTagline}</Text> : null}
            {d.companyAddress ? <Text style={s.companyDetail}>{d.companyAddress}</Text> : null}
            {d.companyCity    ? <Text style={s.companyDetail}>{d.companyCity}</Text>    : null}
            {d.companyPhone   ? <Text style={s.companyDetail}>{d.companyPhone}</Text>   : null}
            {d.companyEmail   ? <Text style={s.companyDetail}>{d.companyEmail}</Text>   : null}
          </View>
          <View style={s.docBlock}>
            <Text style={s.docTitle}>{invoice.document_type || 'INVOICE'}</Text>
            <Text style={s.docNumber}>{invoice.invoice_number}</Text>
            {d.documentMeta.map((entry) => (
              <Text key={entry.label} style={s.docDate}>{entry.label}: {entry.value}</Text>
            ))}
          </View>
        </View>
        <View style={s.accentStrip} />

        {/* BODY */}
        <View style={s.body}>
          <View style={s.twoCol}>
            <View style={s.col}>
              <Text style={s.sectionLabel}>Bill To</Text>
              <Text style={s.clientName}>{invoice.client_name}</Text>
              {client?.address        ? <Text style={s.clientDetail}>{client.address}</Text> : null}
              {client?.city           ? <Text style={s.clientDetail}>{client.city}{client.state ? ', ' + client.state : ''}</Text> : null}
              {client?.phone          ? <Text style={s.clientDetail}>{client.phone}</Text> : null}
              {client?.email          ? <Text style={s.clientDetail}>{client.email}</Text> : null}
              {client?.contact_person ? <Text style={s.clientDetail}>Attn: {client.contact_person}</Text> : null}
            </View>
            <View style={s.col}>
              <Text style={s.sectionLabel}>Details</Text>
              {d.referenceMeta.map((entry) => (
                <Text key={entry.label} style={s.clientDetail}>{entry.label}: {entry.value}</Text>
              ))}
            </View>
          </View>

          {invoice.invoice_title ? <Text style={s.invoiceTitle}>{invoice.invoice_title}</Text> : null}

          {renderItemsTable({
            rows: d.renderRows,
            columns,
            styles: s,
            getColumnStyle: columnStyle,
          })}

          {renderTotals({
            result: computedResult,
            styles: s,
            showInstallRate: d.isColVisible('install_rate'),
            amountInWords: invoice.amount_in_words,
          })}
          {invoice.notes && stripHtml(invoice.notes) ? <View style={s.notesBox}><Text style={[s.sectionLabel, { marginBottom: 4 }]}>{d.cf.notesTitle || 'Notes'}</Text><Text style={s.notesText}>{stripHtml(invoice.notes)}</Text></View> : null}
          {invoice.terms && stripHtml(invoice.terms) ? <View style={[s.notesBox, { marginBottom: 14 }]}><Text style={[s.sectionLabel, { marginBottom: 4 }]}>{d.cf.termsTitle || 'Terms and Conditions'}</Text><Text style={s.notesText}>{stripHtml(invoice.terms)}</Text></View> : null}

        {d.validAttachments.length > 0 && (
          <View style={s.docsSection}>
            <Text style={s.docsSectionLabel}>Supporting Documents</Text>
            {d.validAttachments.map((att, i) => <View key={i} style={s.docItem}><Text>Attachment: </Text><Link src={att.url} style={s.docLink}>{att.label}</Link></View>)}
          </View>
        )}
          {d.footerText ? <View style={s.footer}><Text style={s.footerText}>{d.footerText}</Text></View> : null}
        </View>

      </Page>
    </Document>
  )
}
