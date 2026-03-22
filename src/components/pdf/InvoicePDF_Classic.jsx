import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import { planClassicInvoicePages } from './pdfUtils'
import { renderTotals } from './base/renderTotals'
import { renderItemsTable } from './base/renderItems'

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

  cell: { fontSize: 8 },
  cellMuted: { color: '#555' },
  amountCell: { fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },
  centeredCell: { textAlign: 'center' },
  rightCell: { textAlign: 'right' },
  descCell: { alignSelf: 'flex-start' },
  descText: { fontSize: 8.25, color: '#1a1a1a', lineHeight: 1.3 },
  subDescText: { fontSize: 7, color: '#888', marginTop: 1, fontFamily: 'Helvetica-Oblique', lineHeight: 1.3 },

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

const getColumnCellStyle = (column) => {
  const styles = [s.cell, { width: column.width }]
  if (column.align === 'center') styles.push(s.centeredCell)
  if (column.align === 'right') styles.push(s.rightCell)
  if (column.key === 'amount') styles.push(s.amountCell)
  return styles
}

function PageIdentity({ d, invoice }) {
  return (
    <>
      <Text
        fixed
        style={s.pageMeta}
        render={({ pageNumber, totalPages }) =>
          `${d.companyName || 'Invoice'} | ${invoice.invoice_number} | Page ${pageNumber} of ${totalPages}`
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
          {d.documentMeta.map((entry) => (
            <Text key={entry.label} style={s.docDate}>{entry.label}: {entry.value}</Text>
          ))}
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
          {d.referenceMeta.map((entry) => (
            <Text key={entry.label} style={s.clientDetail}>{entry.label}: {entry.value}</Text>
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
        <Text style={s.continuationTitle}>{d.companyName || invoice.document_type || 'INVOICE'}</Text>
        <Text style={s.continuationMeta}>{invoice.document_type || 'INVOICE'}</Text>
      </View>
      <View style={s.continuationRight}>
        <Text style={s.docNumber}>{invoice.invoice_number}</Text>
        {d.companyTagline ? <Text style={s.docDate}>{d.companyTagline}</Text> : null}
      </View>
    </View>
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

export default function InvoicePDF_Classic({ document, items = [], client, settings = {}, computedResult }) {
  const invoice = document
  const { d, columns, pages } = planClassicInvoicePages(document, items, client, settings, computedResult)
  const itemCounterRef = { current: 0 }
  const customDescriptionColumns = d.pdfColumns.filter((column) => column.kind === 'custom')

  const getDescriptionExtras = (rawItem) => {
    const extras = []

    if (d.isColVisible('make') && String(rawItem.make || '').trim()) {
      extras.push(`Make: ${rawItem.make}`)
    }

    customDescriptionColumns.forEach((column) => {
      const value = rawItem.custom_data?.[column.key]
      if (value === null || value === undefined || value === '') return
      extras.push(`${column.label}: ${value}`)
    })

    return extras
  }

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
              {renderItemsTable({
                rows: page.rows,
                columns: columns.map((column) => ({
                  key: column.sourceKey || (column.key === 'desc' ? 'description' : column.key),
                  label: column.label,
                  kind: 'builtin',
                  align: column.align,
                  pdfWidth: column.width,
                  pdfFlex: 0,
                })),
                styles: {
                  ...s,
                },
                getColumnStyle: (column, extra = {}) => {
                  const sourceColumn = columns.find((candidate) => (candidate.sourceKey || candidate.key) === column.key)
                  return {
                    ...getColumnCellStyle(sourceColumn || { ...column, width: column.pdfWidth }),
                    ...extra,
                  }
                },
                mergeQtyUnit: true,
                itemCounterRef,
                getDescriptionExtras,
              })}

              {page.showTotals ? renderTotals({
                result: computedResult,
                styles: s,
                showInstallRate: d.isColVisible('install_rate'),
                amountInWords: invoice.amount_in_words,
              }) : null}
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
