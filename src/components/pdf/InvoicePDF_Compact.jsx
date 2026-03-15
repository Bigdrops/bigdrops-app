import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import { stripHtml, extractInvoiceData } from './pdfUtils'

const A = '#1E293B'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, padding: 32, backgroundColor: 'white' },

  // Compact header Ã¢â‚¬â€ single row
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#CBD5E1' },
  companyBlock: { flex: 1, marginRight: 16 },
  logo: { maxWidth: 80, maxHeight: 40, marginBottom: 4, objectFit: 'contain' },
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: A, marginBottom: 1 },
  companyDetail: { fontSize: 7, color: '#64748B', marginBottom: 0.5 },
  docBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: A, letterSpacing: 1, marginBottom: 3 },
  docNumber: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: A, marginBottom: 1 },
  docDate: { fontSize: 7.5, color: '#64748B', marginBottom: 0.5 },

  // Client Ã¢â‚¬â€ compact single row
  twoCol: { flexDirection: 'row', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  col: { flex: 1 },
  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  clientName: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 1 },
  clientDetail: { fontSize: 7, color: '#555', marginBottom: 1 },

  // Invoice title above table Ã¢â‚¬â€ compact
  invoiceTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: A, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Table Ã¢â‚¬â€ tighter
  table: { marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: A, paddingVertical: 5, paddingHorizontal: 6 },
  thText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 7 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: 'white' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#F8FAFC' },
  groupRow: { flexDirection: 'row', backgroundColor: '#334155', paddingVertical: 4, paddingHorizontal: 6 },
  groupText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  groupSubtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 3, paddingHorizontal: 6, backgroundColor: '#f0f0f0', borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  groupSubtotalLabel: { fontSize: 7, color: '#555', fontFamily: 'Helvetica-Bold', marginRight: 10 },
  groupSubtotalValue: { fontSize: 7, color: '#1a1a1a', fontFamily: 'Helvetica-Bold' },

  cNum:   { width: 14, textAlign: 'center', fontSize: 7 },
  cDesc:  { flex: 2.5 },
  cMake:  { flex: 1.2, fontSize: 7 },
  cQty:   { flex: 0.6, textAlign: 'center', fontSize: 7 },
  cUnit:  { flex: 0.7, textAlign: 'center', fontSize: 7 },
  cPrice: { flex: 1.4, textAlign: 'right', fontSize: 7 },
  cAmt:   { flex: 1.4, textAlign: 'right', fontSize: 7, fontFamily: 'Helvetica-Bold' },
  descText: { fontSize: 7.5, color: '#1a1a1a' },
  subDescText: { fontSize: 6.5, color: '#888', marginTop: 0.5, fontFamily: 'Helvetica-Oblique' },

  // Totals Ã¢â‚¬â€ compact
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  totalsBox: { width: 230 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  totalLabel: { fontSize: 7.5, color: '#555' },
  totalValue: { fontSize: 7.5, color: '#1a1a1a' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, borderTopColor: A, paddingTop: 5, marginTop: 3 },
  grandLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: A },
  grandValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: A },
  whtRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3, paddingTop: 3, borderTopWidth: 0.5, borderTopColor: '#ddd' },
  payableRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, borderTopColor: A, paddingTop: 5, marginTop: 3 },
  payableLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: A },
  payableValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: A },

  amountWords: { backgroundColor: '#F8FAFC', padding: 6, marginBottom: 10, borderLeftWidth: 2, borderLeftColor: '#CBD5E1' },
  amountWordsText: { fontSize: 7, color: '#555', fontFamily: 'Helvetica-Oblique' },
  notesBox: { marginBottom: 8 },
  notesText: { fontSize: 7, color: '#555', lineHeight: 1.4 },
  docsSection: { marginTop: 12, borderTopWidth: 0.5, borderTopColor: '#eee', paddingTop: 10 },
  docsSectionLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#333', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  docItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  docLink: { fontSize: 7, color: '#0056B3', textDecoration: 'underline' },
  footer: { borderTopWidth: 0.5, borderTopColor: '#eee', paddingTop: 8, marginTop: 10 },
  footerText: { fontSize: 7, color: '#888', textAlign: 'center', lineHeight: 1.5 },
})

export default function InvoicePDF_Compact({ invoice, items = [], client, settings = {} }) {
  const d = extractInvoiceData(invoice, items, client, settings)
  let itemCount = 0
  const hasMake =
    d.isColVisible('make') &&
    items.some(i => i.make)

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* HEADER */}
        <View style={s.header}>
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
            <Text style={s.docDate}>Date: {invoice.issue_date}</Text>
            {invoice.due_date ? <Text style={s.docDate}>Due: {invoice.due_date}</Text> : null}
          </View>
        </View>

        {/* CLIENT */}
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
            {invoice.payment_terms ? <Text style={s.clientDetail}>Payment Terms: {invoice.payment_terms}</Text> : null}
            {invoice.work_duration ? <Text style={s.clientDetail}>Work Duration: {invoice.work_duration}</Text> : null}
            {d.cf.header && d.cf.header.filter(f => f.label && f.value).map((f, i) => (
              <Text key={i} style={s.clientDetail}>{f.label}: {f.value}</Text>
            ))}
          </View>
        </View>

        {/* TITLE ABOVE TABLE */}
        {invoice.invoice_title ? <Text style={s.invoiceTitle}>{invoice.invoice_title}</Text> : null}

        {/* TABLE */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.thText, s.cNum]}>#</Text>
            <Text style={[s.thText, s.cDesc]}>Description</Text>
            {hasMake ? <Text style={[s.thText, s.cMake]}>Make</Text> : null}
            <Text style={[s.thText, s.cQty]}>Qty</Text>
            {d.isColVisible('unit') ? <Text style={[s.thText, s.cUnit]}>Unit</Text> : null}
            <Text style={[s.thText, s.cPrice]}>Unit Price</Text>
            <Text style={[s.thText, s.cAmt]}>Amount (NGN)</Text>
          </View>
          {d.renderRows.map((row, ri) => {
            if (row._type === 'group_header') return (
              <View key={'gh_' + ri} style={s.groupRow}><Text style={s.groupText}>{row.item.group_name}</Text></View>
            )
            if (row._type === 'group_end') return (
              <View key={'ge_' + ri} style={{ height: 1, backgroundColor: '#e2e8f0', marginHorizontal: 8, marginBottom: 4 }} />
            )
            if (row._type === 'group_subtotal') return (
              <View key={'gs_' + ri} style={s.groupSubtotalRow}>
                <Text style={s.groupSubtotalLabel}>{row.name} - Section Total</Text>
                <Text style={s.groupSubtotalValue}>NGN {row.subtotal.toLocaleString()}</Text>
              </View>
            )
            itemCount++
            const { item, amount } = row
            const rowStyle = itemCount % 2 === 0 ? s.tableRowAlt : s.tableRow
            return (
              <View key={'item_' + ri} style={rowStyle} wrap={false}>
                <Text style={[{ color: '#999', alignSelf: 'flex-start' }, s.cNum]}>{itemCount}</Text>
                <View style={[s.cDesc, { alignSelf: 'flex-start' }]}>
                  <Text style={s.descText}>{item.description}</Text>
                  {item.sub_description ? <Text style={s.subDescText}>{item.sub_description}</Text> : null}
                </View>
                {hasMake ? <Text style={[s.cMake, { alignSelf: 'flex-start', color: '#555' }]}>{item.make || ''}</Text> : null}
                <Text style={[s.cQty, { alignSelf: 'flex-start' }]}>{item.quantity}</Text>
                {d.isColVisible('unit') ? <Text style={[s.cUnit, { alignSelf: 'flex-start', color: '#555' }]}>{item.unit || ''}</Text> : null}
                <Text style={[s.cPrice, { alignSelf: 'flex-start' }]}>{Number(item.unit_price || 0).toLocaleString()}</Text>
                <Text style={[s.cAmt, { alignSelf: 'flex-start' }]}>{amount.toLocaleString()}</Text>
              </View>
            )
          })}
        </View>

        {/* TOTALS */}
        <View style={[s.totalsSection, { marginTop: 8 }]} wrap={false}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}><Text style={s.totalLabel}>Subtotal</Text><Text style={s.totalValue}>NGN {d.subtotal.toLocaleString()}</Text></View>
            {d.isColVisible('install_rate') && d.installTotal > 0 && <View style={s.totalRow}><Text style={s.totalLabel}>Install Rate</Text><Text style={s.totalValue}>NGN {d.installTotal.toLocaleString()}</Text></View>}
            {d.fixedCharges.map(e => <View key={e.label} style={s.totalRow}><Text style={s.totalLabel}>{e.label}</Text><Text style={s.totalValue}>NGN {e.value.toLocaleString()}</Text></View>)}
            {d.cf.extraCharges && d.cf.extraCharges.filter(c => Number(c.value) > 0).map((c, i) => <View key={i} style={s.totalRow}><Text style={s.totalLabel}>{c.label}</Text><Text style={s.totalValue}>NGN {Number(c.value).toLocaleString()}</Text></View>)}
            {d.vatAmount > 0 && <View style={s.totalRow}><Text style={s.totalLabel}>VAT</Text><Text style={s.totalValue}>NGN {d.vatAmount.toLocaleString()}</Text></View>}
            {d.discount > 0 && <View style={s.totalRow}><Text style={s.totalLabel}>Discount</Text><Text style={[s.totalValue, { color: '#CC0000' }]}>- NGN {d.discount.toLocaleString()}</Text></View>}
            <View style={s.grandTotalRow}><Text style={s.grandLabel}>Grand Total</Text><Text style={s.grandValue}>NGN {d.grandTotal.toLocaleString()}</Text></View>
            {d.whtAmount > 0 && <>
              <View style={s.whtRow}><Text style={[s.totalLabel, { color: '#CC0000' }]}>Less: WHT</Text><Text style={[s.totalValue, { color: '#CC0000' }]}>- NGN {d.whtAmount.toLocaleString()}</Text></View>
              <View style={s.payableRow}><Text style={s.payableLabel}>Total Payable</Text><Text style={s.payableValue}>NGN {d.totalPayable.toLocaleString()}</Text></View>
            </>}
          </View>
        </View>

        {invoice.amount_in_words ? <View style={s.amountWords}><Text style={s.amountWordsText}>{invoice.amount_in_words}</Text></View> : null}
        {invoice.notes && stripHtml(invoice.notes) ? <View style={s.notesBox}><Text style={[s.sectionLabel, { marginBottom: 3 }]}>{d.cf.notesTitle || 'Notes'}</Text><Text style={s.notesText}>{stripHtml(invoice.notes)}</Text></View> : null}
        {invoice.terms && stripHtml(invoice.terms) ? <View style={[s.notesBox, { marginBottom: 10 }]}><Text style={[s.sectionLabel, { marginBottom: 3 }]}>{d.cf.termsTitle || 'Terms and Conditions'}</Text><Text style={s.notesText}>{stripHtml(invoice.terms)}</Text></View> : null}

        {d.validAttachments.length > 0 && (
          <View style={s.docsSection}>
            <Text style={s.docsSectionLabel}>Supporting Documents</Text>
            {d.validAttachments.map((att, i) => <View key={i} style={s.docItem}><Text>Attachment: </Text><Link src={att.url} style={s.docLink}>{att.label}</Link></View>)}
          </View>
        )}
        {d.footerText ? <View style={s.footer}><Text style={s.footerText}>{d.footerText}</Text></View> : null}

      </Page>
    </Document>
  )
}
