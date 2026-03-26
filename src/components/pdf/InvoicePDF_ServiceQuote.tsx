import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import { stripHtml, extractInvoiceData } from './pdfUtils'
import { renderTotals } from './base/renderTotals'
import { renderItemsTable } from './base/renderItems'

const A = '#1a8c5e'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 34,
    paddingBottom: 34,
    paddingHorizontal: 30,
    backgroundColor: 'white',
  },

  titleBlock: {
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: A,
  },
  docTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  docSubtitle: {
    fontSize: 12,
    color: '#555',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 16,
  },
  companyBlock: {
    flex: 1.2,
  },
  logo: {
    maxWidth: 110,
    maxHeight: 55,
    marginBottom: 6,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 2,
    lineHeight: 1.4,
  },

  metaBlock: {
    width: 190,
    alignItems: 'flex-end',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 9,
    color: '#666',
    marginRight: 8,
  },
  metaValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
  },

  clientRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  clientCard: {
    flex: 1,
    backgroundColor: '#f9fdf9',
    borderWidth: 1,
    borderColor: '#d1f0e0',
    padding: 12,
    minHeight: 96,
  },
  clientCardLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: A,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  clientName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
    marginBottom: 3,
  },
  clientDetail: {
    fontSize: 8.5,
    color: '#555',
    marginBottom: 2,
    lineHeight: 1.35,
  },

  invoiceTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: A,
    marginBottom: 10,
    textTransform: 'uppercase',
    borderLeftWidth: 4,
    borderLeftColor: A,
    paddingLeft: 8,
  },

  table: {
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: A,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  thText: {
    color: 'white',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e8f5ef',
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: 'white',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e8f5ef',
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: '#f5fbf8',
  },
  groupRow: {
    flexDirection: 'row',
    backgroundColor: '#eef7f2',
    borderTopWidth: 1,
    borderTopColor: A,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  groupText: {
    color: A,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
  },
  groupSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#f0f9f5',
    borderBottomWidth: 1,
    borderBottomColor: '#d1f0e0',
  },
  groupSubtotalLabel: {
    fontSize: 8.5,
    color: '#555',
    fontFamily: 'Helvetica-Bold',
    marginRight: 12,
  },
  groupSubtotalValue: {
    fontSize: 8.5,
    color: A,
    fontFamily: 'Helvetica-Bold',
  },

  cNum: {
    width: 20,
    textAlign: 'center',
    fontSize: 8.5,
  },
  cDesc: {
    flex: 3.1,
  },
  cMake: {
    flex: 1.25,
    fontSize: 8.5,
  },
  cQty: {
    flex: 0.75,
    textAlign: 'center',
    fontSize: 8.5,
  },
  cUnit: {
    flex: 0.9,
    textAlign: 'center',
    fontSize: 8.5,
  },
  cPrice: {
    flex: 1.45,
    textAlign: 'right',
    fontSize: 8.5,
  },
  cAmt: {
    flex: 1.5,
    textAlign: 'right',
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
  },
  descText: {
    fontSize: 9,
    color: '#111',
    lineHeight: 1.35,
  },
  subDescText: {
    fontSize: 7.5,
    color: '#777',
    marginTop: 2,
    lineHeight: 1.3,
    fontFamily: 'Helvetica-Oblique',
  },

  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  totalsBox: {
    width: 290,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 8.5,
    color: '#555',
  },
  totalValue: {
    fontSize: 8.5,
    color: '#111',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: A,
    paddingTop: 7,
    marginTop: 5,
  },
  grandLabel: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: A,
  },
  grandValue: {
    fontSize: 13.5,
    fontFamily: 'Helvetica-Bold',
    color: A,
  },
  whtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  payableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: A,
    paddingTop: 7,
    marginTop: 5,
  },
  payableLabel: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: A,
  },
  payableValue: {
    fontSize: 13.5,
    fontFamily: 'Helvetica-Bold',
    color: A,
  },

  amountWords: {
    backgroundColor: '#f5fbf8',
    padding: 9,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: A,
  },
  amountWordsText: {
    fontSize: 8.5,
    color: '#555',
    fontFamily: 'Helvetica-Oblique',
    lineHeight: 1.4,
  },

  notesBox: {
    marginBottom: 10,
  },
  notesText: {
    fontSize: 8.5,
    color: '#555',
    lineHeight: 1.5,
  },
  sectionLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: A,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },

  docsSection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  docsSectionLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  docLink: {
    fontSize: 8,
    color: A,
    textDecoration: 'underline',
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: '#d1f0e0',
    paddingTop: 10,
    marginTop: 12,
  },
  footerText: {
    fontSize: 7.5,
    color: '#888',
    textAlign: 'center',
    lineHeight: 1.6,
  },
})

type Props = {
  document: any
  items?: any[]
  client?: any
  settings?: any
  computedResult?: any
  bankAccounts?: any[]
}

export default function InvoicePDF_Ref({
  document,
  items = [],
  client,
  settings = {},
  computedResult,
  bankAccounts = [],
}: Props) {
  const invoice = document
  const d = extractInvoiceData(document, items, client, settings, computedResult, bankAccounts)
  const columns = d.pdfColumns

  const columnStyle = (column: any, extra = {}) => ({
    flex: column.pdfFlex,
    textAlign: column.align,
    ...extra,
  })

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.titleBlock}>
          <Text style={s.docTitle}>{invoice.document_type || 'INVOICE'}</Text>
          {invoice.invoice_title ? <Text style={s.docSubtitle}>{invoice.invoice_title}</Text> : null}
        </View>

        <View style={s.header}>
          <View style={s.companyBlock}>
            {d.logoUrl ? <Image src={d.logoUrl} style={s.logo} /> : null}
            <Text style={s.companyName}>{d.companyName}</Text>
            {d.showTagline && d.companyTagline ? <Text style={s.companyDetail}>{d.companyTagline}</Text> : null}
            {d.companyAddress ? <Text style={s.companyDetail}>{d.companyAddress}</Text> : null}
            {d.companyCity ? <Text style={s.companyDetail}>{d.companyCity}</Text> : null}
            {d.companyPhone ? <Text style={s.companyDetail}>{d.companyPhone}</Text> : null}
            {d.companyEmail ? <Text style={s.companyDetail}>{d.companyEmail}</Text> : null}
          </View>

          <View style={s.metaBlock}>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Invoice No</Text>
              <Text style={s.metaValue}>{invoice.invoice_number}</Text>
            </View>

            {d.documentMeta.map((entry: any) => (
              <View key={entry.label} style={s.metaRow}>
                <Text style={s.metaLabel}>{entry.label}</Text>
                <Text style={s.metaValue}>{entry.value}</Text>
              </View>
            ))}

            {d.referenceMeta.map((entry: any) => (
              <View key={`ref_${entry.label}`} style={s.metaRow}>
                <Text style={s.metaLabel}>{entry.label}</Text>
                <Text style={s.metaValue}>{entry.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.clientRow}>
          <View style={s.clientCard}>
            <Text style={s.clientCardLabel}>Billed By</Text>
            <Text style={s.clientName}>{d.companyName}</Text>
            {d.companyAddress ? <Text style={s.clientDetail}>{d.companyAddress}</Text> : null}
            {d.companyCity ? <Text style={s.clientDetail}>{d.companyCity}</Text> : null}
            {d.companyPhone ? <Text style={s.clientDetail}>{d.companyPhone}</Text> : null}
            {d.companyEmail ? <Text style={s.clientDetail}>{d.companyEmail}</Text> : null}
          </View>

          <View style={s.clientCard}>
            <Text style={s.clientCardLabel}>Billed To</Text>
            <Text style={s.clientName}>{invoice.client_name}</Text>
            {client?.address ? <Text style={s.clientDetail}>{client.address}</Text> : null}
            {client?.city ? (
              <Text style={s.clientDetail}>
                {client.city}
                {client.state ? `, ${client.state}` : ''}
              </Text>
            ) : null}
            {client?.phone ? <Text style={s.clientDetail}>{client.phone}</Text> : null}
            {client?.email ? <Text style={s.clientDetail}>{client.email}</Text> : null}
            {client?.contact_person ? <Text style={s.clientDetail}>Attn: {client.contact_person}</Text> : null}
          </View>
        </View>

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
          bankDetails: d.showBankDetails ? d.bankDetails : null,
        })}

        {invoice.notes && stripHtml(invoice.notes) ? (
          <View style={s.notesBox}>
            <Text style={[s.sectionLabel, { marginBottom: 4 }]}>
              {d.cf.notesTitle || 'Notes'}
            </Text>
            <Text style={s.notesText}>{stripHtml(invoice.notes)}</Text>
          </View>
        ) : null}

        {invoice.terms && stripHtml(invoice.terms) ? (
          <View style={[s.notesBox, { marginBottom: 14 }]}>
            <Text style={[s.sectionLabel, { marginBottom: 4 }]}>
              {d.cf.termsTitle || 'Terms and Conditions'}
            </Text>
            <Text style={s.notesText}>{stripHtml(invoice.terms)}</Text>
          </View>
        ) : null}

        {d.validAttachments.length > 0 && (
          <View style={s.docsSection}>
            <Text style={s.docsSectionLabel}>Supporting Documents</Text>
            {d.validAttachments.map((att: any, i: number) => (
              <View key={i} style={s.docItem}>
                <Text>Attachment: </Text>
                <Link src={att.url} style={s.docLink}>
                  {att.label}
                </Link>
              </View>
            ))}
          </View>
        )}

        {d.showFooter && d.footerText ? (
          <View style={s.footer}>
            <Text style={s.footerText}>{d.footerText}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}