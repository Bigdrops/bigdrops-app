import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import { stripHtml, extractInvoiceData } from './pdfUtils'

const A = '#1a8c5e' // green accent

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, backgroundColor: 'white' },

  // Centered title block at top
  titleBlock: { alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: A },
  docTitle: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: A, letterSpacing: 1, marginBottom: 4 },
  docSubtitle: { fontSize: 11, color: '#555', marginBottom: 0 },

  // Header row below title: logo left, invoice meta right
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  companyBlock: { flex: 1 },
  logo: { maxWidth: 100, maxHeight: 50, marginBottom: 4, objectFit: 'contain' },
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 1 },
  companyDetail: { fontSize: 8, color: '#64748B', marginBottom: 1 },
  metaBlock: { alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row', marginBottom: 3 },
  metaLabel: { fontSize: 9, color: '#777', marginRight: 8 },
  metaValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },

  // Two-column client cards
  clientRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  clientCard: { flex: 1, backgroundColor: '#f9fdf9', borderWidth: 1, borderColor: '#d1f0e0', padding: 12 },
  clientCardLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: A, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  clientName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 2 },
  clientDetail: { fontSize: 8, color: '#555', marginBottom: 2 },

  // Invoice title above table
  invoiceTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: A, marginBottom: 8, textTransform: 'uppercase', borderLeftWidth: 4, borderLeftColor: A, paddingLeft: 8 },

  // Table
  table: { marginBottom: 14 },
  tableHeader: { flexDirection: 'row', backgroundColor: A, paddingVertical: 7, paddingHorizontal: 8 },
  thText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e8f5ef', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: 'white' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e8f5ef', paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#f5fbf8' },
  groupRow: { flexDirection: 'row', backgroundColor: '#eef7f2', borderTopWidth: 1, borderTopColor: A, paddingVertical: 5, paddingHorizontal: 8 },
  groupText: { color: A, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  groupSubtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#f0f9f5', borderBottomWidth: 1, borderBottomColor: '#d1f0e0' },
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
  totalsBox: { width: 260 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 8, color: '#555' },
  totalValue: { fontSize: 8, color: '#1a1a1a' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: A, paddingTop: 6, marginTop: 4 },
  grandLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: A },
  grandValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: A },
  whtRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#ddd' },
  payableRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: A, paddingTop: 6, marginTop: 4 },
  payableLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: A },
  payableValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: A },

  amountWords: { backgroundColor: '#f5fbf8', padding: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: A },
  amountWordsText: { fontSize: 8, color: '#555', fontFamily: 'Helvetica-Oblique' },
  notesBox: { marginBottom: 10 },
  notesText: { fontSize: 8, color: '#555', lineHeight: 1.5 },
  sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: A, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  docsSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  docsSectionLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#333', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  docItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  docLink: { fontSize: 8, color: A, textDecoration: 'underline' },
  footer: { borderTopWidth: 1, borderTopColor: '#d1f0e0', paddingTop: 10, marginTop: 12 },
  footerText: { fontSize: 7.5, color: '#888', textAlign: 'center', lineHeight: 1.6 },
})

export default function InvoicePDF_Proforma({ invoice, items = [], client, settings = {} }) {
  const d = extractInvoiceData(invoice, items, client, settings)
  let itemCount = 0
  const hasMake =
    d.isColVisible('make') &&
    items.some(i => i.make)

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* CENTERED TITLE */}
        <View style={s.titleBlock}>
          <Text style={s.docTitle}>{invoice.document_type || 'INVOICE'}</Text>
        </View>

        {/* LOGO LEFT + META RIGHT */}
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
          <View style={s.metaBlock}>
            <View style={s.metaRow}><Text style={s.metaLabel}>Invoice No</Text><Text style={s.metaValue}>{invoice.invoice_number}</Text></View>
            <View style={s.metaRow}><Text style={s.metaLabel}>Date</Text><Text style={s.metaValue}>{invoice.issue_date}</Text></View>
            {invoice.due_date ? <View style={s.metaRow}><Text style={s.metaLabel}>Due Date</Text><Text style={s.metaValue}>{invoice.due_date}</Text></View> : null}
            {invoice.payment_terms ? <View style={s.metaRow}><Text style={s.metaLabel}>Payment Terms</Text><Text style={s.metaValue}>{invoice.payment_terms}</Text></View> : null}
          </View>
        </View>

        {/* TWO-COLUMN CLIENT CARDS */}
        <View style={s.clientRow}>
          <View style={s.clientCard}>
            <Text style={s.clientCardLabel}>Billed By</Text>
            <Text style={s.clientName}>{d.companyName}</Text>
            {d.companyAddress ? <Text style={s.clientDetail}>{d.companyAddress}</Text> : null}
            {d.companyCity    ? <Text style={s.clientDetail}>{d.companyCity}</Text>    : null}
            {d.companyPhone   ? <Text style={s.clientDetail}>{d.companyPhone}</Text>   : null}
            {d.companyEmail   ? <Text style={s.clientDetail}>{d.companyEmail}</Text>   : null}
          </View>
          <View style={s.clientCard}>
            <Text style={s.clientCardLabel}>Billed To</Text>
            <Text style={s.clientName}>{invoice.client_name}</Text>
            {client?.address        ? <Text style={s.clientDetail}>{client.address}</Text> : null}
            {client?.city           ? <Text style={s.clientDetail}>{client.city}{client.state ? ', ' + client.state : ''}</Text> : null}
            {client?.phone          ? <Text style={s.clientDetail}>{client.phone}</Text> : null}
            {client?.email          ? <Text style={s.clientDetail}>{client.email}</Text> : null}
            {client?.contact_person ? <Text style={s.clientDetail}>Attn: {client.contact_person}</Text> : null}
          </View>
        </View>

        {/* INVOICE TITLE ABOVE TABLE */}
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
        <View style={[s.totalsSection, { marginTop: 10 }]} wrap={false}>
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
        {invoice.notes && stripHtml(invoice.notes) ? <View style={s.notesBox}><Text style={[s.sectionLabel, { marginBottom: 4 }]}>{d.cf.notesTitle || 'Notes'}</Text><Text style={s.notesText}>{stripHtml(invoice.notes)}</Text></View> : null}
        {invoice.terms && stripHtml(invoice.terms) ? <View style={[s.notesBox, { marginBottom: 14 }]}><Text style={[s.sectionLabel, { marginBottom: 4 }]}>{d.cf.termsTitle || 'Terms and Conditions'}</Text><Text style={s.notesText}>{stripHtml(invoice.terms)}</Text></View> : null}

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
