import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import { planClassicInvoicePages } from './pdfUtils'

const A = '#0F172A'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 11, padding: 40, backgroundColor: 'white' },
  pageMeta: { position: 'absolute', top: 18, right: 40, fontSize: 8, color: '#64748B' },
  pageFooter: { position: 'absolute', left: 40, right: 40, bottom: 18, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  footerText: { fontSize: 8, color: '#888', textAlign: 'center', lineHeight: 1.6 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: A,
  },
  companyBlock: { flex: 1, marginRight: 20 },
  logo: { maxWidth: 110, maxHeight: 55, marginBottom: 6, objectFit: 'contain' },
  companyName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: A, marginBottom: 2 },
  companyDetail: { fontSize: 9, color: '#64748B', marginBottom: 1 },
  docBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 23, fontFamily: 'Helvetica-Bold', color: A, marginBottom: 4, letterSpacing: 1 },
  docNumber: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: A, marginBottom: 2 },
  docDate: { fontSize: 10, color: '#64748B', marginBottom: 1 },

  continuationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  continuationTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: A },
  continuationMeta: { fontSize: 9, color: '#64748B', marginTop: 2 },
  continuationRight: { alignItems: 'flex-end' },

  twoCol: { flexDirection: 'row', marginBottom: 16 },
  col: { flex: 1 },
  sectionLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: A,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  clientName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 2 },
  clientDetail: { fontSize: 8.5, color: '#555', marginBottom: 2 },
  invoiceTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: A,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  table: { marginBottom: 14 },
  tableHeader: { flexDirection: 'row', backgroundColor: A, paddingVertical: 6, paddingHorizontal: 8 },
  thText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: 'white',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
  },
  groupRow: { flexDirection: 'row', backgroundColor: '#334155', paddingVertical: 5, paddingHorizontal: 8 },
  groupText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9.5 },
  groupSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  groupSubtotalLabel: { fontSize: 8.5, color: '#555', fontFamily: 'Helvetica-Bold', marginRight: 12 },
  groupSubtotalValue: { fontSize: 8.5, color: '#1a1a1a', fontFamily: 'Helvetica-Bold' },

  cNum: { width: 18, textAlign: 'center', fontSize: 8.5 },
  cDesc: { flex: 2.5 },
  cMake: { flex: 1.2, fontSize: 8.5 },
  cQty: { flex: 0.7, textAlign: 'center', fontSize: 8.5 },
  cUnit: { flex: 0.8, textAlign: 'center', fontSize: 8.5 },
  cPrice: { flex: 1.5, textAlign: 'right', fontSize: 8.5 },
  cAmt: { flex: 1.5, textAlign: 'right', fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  descText: { fontSize: 9, color: '#1a1a1a', lineHeight: 1.35 },
  subDescText: { fontSize: 7.5, color: '#888', marginTop: 1, fontFamily: 'Helvetica-Oblique', lineHeight: 1.35 },

  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  totalsBox: { width: 260 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 8.5, color: '#555' },
  totalValue: { fontSize: 8.5, color: '#1a1a1a' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: A, paddingTop: 6, marginTop: 4 },
  grandLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: A },
  grandValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: A },
  whtRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#ddd' },
  payableRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: A, paddingTop: 6, marginTop: 4 },
  payableLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: A },
  payableValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: A },

  amountWords: { backgroundColor: '#f8fafc', padding: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: A },
  amountWordsText: { fontSize: 8.5, color: '#555', fontFamily: 'Helvetica-Oblique', lineHeight: 1.45 },
  notesBox: { marginBottom: 10 },
  notesText: { fontSize: 8.5, color: '#555', lineHeight: 1.5 },
  docsSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  docsSectionLabel: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#333', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  docItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  docLink: { fontSize: 8.5, color: '#0056B3', textDecoration: 'underline' },
})

function PageIdentity({ d, invoice }) {
  return (
    <>
      <Text
        fixed
        style={s.pageMeta}
        render={({ pageNumber, totalPages }) =>
          `${d.companyName || 'Invoice'} • ${invoice.invoice_number} • Page ${pageNumber} of ${totalPages}`
        }
      />
      {d.footerText ? (
        <View fixed style={s.pageFooter}>
          <Text style={s.footerText}>{d.footerText}</Text>
        </View>
      ) : null}
    </>
  )
}

function FullHeader({ d, invoice, client }) {
  return (
    <>
      <View style={s.header}>
        <View style={s.companyBlock}>
          {d.logoUrl ? <Image src={d.logoUrl} style={s.logo} /> : null}
          <Text style={s.companyName}>{d.companyName}</Text>
          {d.companyTagline ? <Text style={s.companyDetail}>{d.companyTagline}</Text> : null}
          {d.companyAddress ? <Text style={s.companyDetail}>{d.companyAddress}</Text> : null}
          {d.companyCity ? <Text style={s.companyDetail}>{d.companyCity}</Text> : null}
          {d.companyPhone ? <Text style={s.companyDetail}>{d.companyPhone}</Text> : null}
          {d.companyEmail ? <Text style={s.companyDetail}>{d.companyEmail}</Text> : null}
        </View>
        <View style={s.docBlock}>
          <Text style={s.docTitle}>{invoice.document_type || 'INVOICE'}</Text>
          <Text style={s.docNumber}>{invoice.invoice_number}</Text>
          <Text style={s.docDate}>Date: {invoice.issue_date}</Text>
          {invoice.due_date ? <Text style={s.docDate}>Due: {invoice.due_date}</Text> : null}
        </View>
      </View>

      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={s.sectionLabel}>Bill To</Text>
          <Text style={s.clientName}>{invoice.client_name}</Text>
          {client?.address ? <Text style={s.clientDetail}>{client.address}</Text> : null}
          {client?.city ? <Text style={s.clientDetail}>{client.city}{client.state ? `, ${client.state}` : ''}</Text> : null}
          {client?.phone ? <Text style={s.clientDetail}>{client.phone}</Text> : null}
          {client?.email ? <Text style={s.clientDetail}>{client.email}</Text> : null}
          {client?.contact_person ? <Text style={s.clientDetail}>Attn: {client.contact_person}</Text> : null}
        </View>
        <View style={s.col}>
          <Text style={s.sectionLabel}>Details</Text>
          {invoice.payment_terms ? <Text style={s.clientDetail}>Payment Terms: {invoice.payment_terms}</Text> : null}
          {invoice.work_duration ? <Text style={s.clientDetail}>Work Duration: {invoice.work_duration}</Text> : null}
          {d.cf.header && d.cf.header.filter((f) => f.label && f.value).map((f, i) => (
            <Text key={i} style={s.clientDetail}>{f.label}: {f.value}</Text>
          ))}
        </View>
      </View>

      {invoice.invoice_title ? <Text style={s.invoiceTitle}>{invoice.invoice_title}</Text> : null}
    </>
  )
}

function CompactHeader({ d, invoice }) {
  return (
    <View style={s.continuationHeader}>
      <View>
        <Text style={s.continuationTitle}>{invoice.document_type || 'INVOICE'} Continued</Text>
        <Text style={s.continuationMeta}>{d.companyName || 'Company'} • {invoice.invoice_number}</Text>
      </View>
      <View style={s.continuationRight}>
        <Text style={s.docNumber}>{invoice.invoice_number}</Text>
        {invoice.issue_date ? <Text style={s.docDate}>Date: {invoice.issue_date}</Text> : null}
      </View>
    </View>
  )
}

function TableHeader({ hasMake, showUnit }) {
  return (
    <View style={s.tableHeader}>
      <Text style={[s.thText, s.cNum]}>#</Text>
      <Text style={[s.thText, s.cDesc]}>Description</Text>
      {hasMake ? <Text style={[s.thText, s.cMake]}>Make</Text> : null}
      <Text style={[s.thText, s.cQty]}>Qty</Text>
      {showUnit ? <Text style={[s.thText, s.cUnit]}>Unit</Text> : null}
      <Text style={[s.thText, s.cPrice]}>Unit Price</Text>
      <Text style={[s.thText, s.cAmt]}>Amount (NGN)</Text>
    </View>
  )
}

function RowSet({ rows, hasMake, showUnit, itemCounterRef }) {
  return rows.map((row, ri) => {
    if (row._type === 'group_header') {
      return (
        <View key={`gh_${ri}`} style={s.groupRow} wrap={false}>
          <Text style={s.groupText}>{row.item.group_name}</Text>
        </View>
      )
    }
    if (row._type === 'group_end') {
      return (
        <View
          key={`ge_${ri}`}
          style={{ height: 1, backgroundColor: '#e2e8f0', marginHorizontal: 8, marginBottom: 4 }}
          wrap={false}
        />
      )
    }
    if (row._type === 'group_subtotal') {
      return (
        <View key={`gs_${ri}`} style={s.groupSubtotalRow} wrap={false}>
          <Text style={s.groupSubtotalLabel}>{row.name} - Section Total</Text>
          <Text style={s.groupSubtotalValue}>NGN {row.subtotal.toLocaleString()}</Text>
        </View>
      )
    }

    itemCounterRef.current += 1
    const { item, amount } = row
    const rowStyle = itemCounterRef.current % 2 === 0 ? s.tableRowAlt : s.tableRow

    return (
      <View key={`item_${ri}`} style={rowStyle} wrap={false}>
        <Text style={[{ color: '#999', alignSelf: 'flex-start' }, s.cNum]}>{itemCounterRef.current}</Text>
        <View style={[s.cDesc, { alignSelf: 'flex-start' }]}>
          <Text style={s.descText}>{item.description}</Text>
          {item.sub_description ? <Text style={s.subDescText}>{item.sub_description}</Text> : null}
        </View>
        {hasMake ? <Text style={[s.cMake, { alignSelf: 'flex-start', color: '#555' }]}>{item.make || ''}</Text> : null}
        <Text style={[s.cQty, { alignSelf: 'flex-start' }]}>{item.quantity}</Text>
        {showUnit ? <Text style={[s.cUnit, { alignSelf: 'flex-start', color: '#555' }]}>{item.unit || ''}</Text> : null}
        <Text style={[s.cPrice, { alignSelf: 'flex-start' }]}>{Number(item.unit_price || 0).toLocaleString()}</Text>
        <Text style={[s.cAmt, { alignSelf: 'flex-start' }]}>{amount.toLocaleString()}</Text>
      </View>
    )
  })
}

function TotalsBlock({ d, invoice }) {
  return (
    <>
      <View style={[s.totalsSection, { marginTop: 10 }]} wrap={false}>
        <View style={s.totalsBox}>
          <View style={s.totalRow}><Text style={s.totalLabel}>Subtotal</Text><Text style={s.totalValue}>NGN {d.subtotal.toLocaleString()}</Text></View>
          {d.isColVisible('install_rate') && d.installTotal > 0 ? (
            <View style={s.totalRow}><Text style={s.totalLabel}>Install Rate</Text><Text style={s.totalValue}>NGN {d.installTotal.toLocaleString()}</Text></View>
          ) : null}
          {d.fixedCharges.map((entry) => (
            <View key={entry.label} style={s.totalRow}>
              <Text style={s.totalLabel}>{entry.label}</Text>
              <Text style={s.totalValue}>NGN {entry.value.toLocaleString()}</Text>
            </View>
          ))}
          {d.cf.extraCharges && d.cf.extraCharges.filter((charge) => Number(charge.value) > 0).map((charge, i) => (
            <View key={i} style={s.totalRow}>
              <Text style={s.totalLabel}>{charge.label}</Text>
              <Text style={s.totalValue}>NGN {Number(charge.value).toLocaleString()}</Text>
            </View>
          ))}
          {d.vatAmount > 0 ? <View style={s.totalRow}><Text style={s.totalLabel}>VAT</Text><Text style={s.totalValue}>NGN {d.vatAmount.toLocaleString()}</Text></View> : null}
          {d.discount > 0 ? (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Discount</Text>
              <Text style={[s.totalValue, { color: '#CC0000' }]}>- NGN {d.discount.toLocaleString()}</Text>
            </View>
          ) : null}
          <View style={s.grandTotalRow}>
            <Text style={s.grandLabel}>Grand Total</Text>
            <Text style={s.grandValue}>NGN {d.grandTotal.toLocaleString()}</Text>
          </View>
          {d.whtAmount > 0 ? (
            <>
              <View style={s.whtRow}>
                <Text style={[s.totalLabel, { color: '#CC0000' }]}>Less: WHT</Text>
                <Text style={[s.totalValue, { color: '#CC0000' }]}>- NGN {d.whtAmount.toLocaleString()}</Text>
              </View>
              <View style={s.payableRow}>
                <Text style={s.payableLabel}>Total Payable</Text>
                <Text style={s.payableValue}>NGN {d.totalPayable.toLocaleString()}</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      {invoice.amount_in_words ? (
        <View style={s.amountWords} wrap={false}>
          <Text style={s.amountWordsText}>{invoice.amount_in_words}</Text>
        </View>
      ) : null}
    </>
  )
}

function ExtraBlock({ block }) {
  if (block.type === 'attachments') {
    return (
      <View style={s.docsSection}>
        <Text style={s.docsSectionLabel}>{block.title}</Text>
        {block.items.map((att, i) => (
          <View key={i} style={s.docItem}>
            <Text>Attachment: </Text>
            <Link src={att.url} style={s.docLink}>{att.label}</Link>
          </View>
        ))}
      </View>
    )
  }

  return (
    <View style={s.notesBox}>
      <Text style={[s.sectionLabel, { marginBottom: 4 }]}>{block.title}</Text>
      <Text style={s.notesText}>{block.content}</Text>
    </View>
  )
}

export default function InvoicePDF_Classic({ invoice, items = [], client, settings = {} }) {
  const { d, hasMake, showUnit, pages } = planClassicInvoicePages(invoice, items, client, settings)
  const itemCounterRef = { current: 0 }

  return (
    <Document>
      {pages.map((page, index) => (
        <Page key={`classic_page_${index}`} size="A4" style={s.page}>
          <PageIdentity d={d} invoice={invoice} />

          {index === 0 && page.kind === 'rows' ? (
            <FullHeader d={d} invoice={invoice} client={client} />
          ) : (
            <CompactHeader d={d} invoice={invoice} />
          )}

          {page.kind === 'rows' ? (
            <>
              <View style={s.table}>
                <TableHeader hasMake={hasMake} showUnit={showUnit} />
                <RowSet rows={page.rows} hasMake={hasMake} showUnit={showUnit} itemCounterRef={itemCounterRef} />
              </View>

              {page.showTotals ? <TotalsBlock d={d} invoice={invoice} /> : null}
              {page.inlineExtraBlocks?.map((block, blockIndex) => (
                <ExtraBlock key={`inline_extra_${blockIndex}`} block={block} />
              ))}
            </>
          ) : (
            <View>
              {page.blocks.map((block, blockIndex) => (
                <ExtraBlock key={`extra_page_block_${blockIndex}`} block={block} />
              ))}
            </View>
          )}
        </Page>
      ))}
    </Document>
  )
}
