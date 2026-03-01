import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, backgroundColor: 'white' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  companyBlock: { flex: 1 },
  companyName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#CC0000', marginBottom: 4 },
  companyTagline: { fontSize: 9, color: '#555', marginBottom: 2 },
  docBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#CC0000', marginBottom: 4 },
  docNumber: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#333', marginBottom: 2 },
  docDate: { fontSize: 9, color: '#555' },

  // Divider
  divider: { borderBottomWidth: 2, borderBottomColor: '#CC0000', marginBottom: 20 },

  // Client & Details
  twoCol: { flexDirection: 'row', marginBottom: 20 },
  col: { flex: 1 },
  sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  clientName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 3 },
  clientDetail: { fontSize: 9, color: '#555', marginBottom: 2 },

  // Table
  table: { marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1a1a1a', padding: 8 },
  tableHeaderText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', padding: 8 },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', padding: 8, backgroundColor: '#f9f9f9' },
  groupHeader: { flexDirection: 'row', backgroundColor: '#333', padding: 8 },
  groupHeaderText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 10 },
  cellDesc: { flex: 3 },
  cellMake: { flex: 1.5 },
  cellQty: { flex: 0.8, textAlign: 'center' },
  cellUnit: { flex: 0.8, textAlign: 'center' },
  cellPrice: { flex: 1.5, textAlign: 'right' },
  cellAmount: { flex: 1.5, textAlign: 'right' },
  cellVat: { flex: 0.8, textAlign: 'center' },
  subDesc: { fontSize: 8, color: '#888', marginTop: 2, fontFamily: 'Helvetica-Oblique' },

  // Totals
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20 },
  totalsBox: { width: 260 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 9, color: '#555' },
  totalValue: { fontSize: 9, color: '#1a1a1a' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: '#1a1a1a', paddingTop: 8, marginTop: 4 },
  grandTotalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },
  grandTotalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#CC0000' },

  // Amount in words
  amountWords: { backgroundColor: '#f9f9f9', padding: 10, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#CC0000' },
  amountWordsText: { fontSize: 9, color: '#555', fontFamily: 'Helvetica-Oblique' },

  // Footer
  footer: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#333', marginBottom: 3 },
  footerText: { fontSize: 8, color: '#555' },
  signatureBox: { width: 200, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 4, marginTop: 30 },
  signatureLabel: { fontSize: 8, color: '#555' },
})

export default function InvoicePDF({ invoice, items }) {
  const extras = [
    { label: 'Workmanship', value: invoice.workmanship },
    { label: 'Transportation', value: invoice.transportation },
    { label: 'Shipping', value: invoice.shipping },
  ].filter(e => Number(e.value) > 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>SUN & SHIELD POWER SOLUTIONS</Text>
            <Text style={styles.companyTagline}>Generator Sales | Maintenance | Installation | Rental | Facility Management</Text>
            <Text style={styles.clientDetail}>Lagos, Nigeria</Text>
          </View>
          <View style={styles.docBlock}>
            <Text style={styles.docTitle}>{invoice.document_type || 'INVOICE'}</Text>
            <Text style={styles.docNumber}>{invoice.invoice_number}</Text>
            <Text style={styles.docDate}>Date: {invoice.issue_date}</Text>
            {invoice.due_date && <Text style={styles.docDate}>Due: {invoice.due_date}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client & Invoice Details */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.clientName}>{invoice.client_name}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Invoice Details</Text>
            {invoice.payment_terms && <Text style={styles.clientDetail}>Payment Terms: {invoice.payment_terms}</Text>}
            {invoice.work_duration && <Text style={styles.clientDetail}>Work Duration: {invoice.work_duration}</Text>}
            {invoice.custom_fields && <Text style={styles.clientDetail}>{invoice.custom_fields}</Text>}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.cellDesc]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.cellMake]}>Make</Text>
            <Text style={[styles.tableHeaderText, styles.cellQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.cellUnit]}>Unit</Text>
            <Text style={[styles.tableHeaderText, styles.cellPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.cellAmount]}>Amount</Text>
            <Text style={[styles.tableHeaderText, styles.cellVat]}>VAT%</Text>
          </View>

          {items && items.map((item, index) => (
            item.row_type === 'group_header' ? (
              <View key={index} style={styles.groupHeader}>
                <Text style={styles.groupHeaderText}>{item.group_name}</Text>
              </View>
            ) : (
              <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <View style={styles.cellDesc}>
                  <Text>{item.description}</Text>
                  {item.sub_description ? <Text style={styles.subDesc}>{item.sub_description}</Text> : null}
                </View>
                <Text style={[{ fontSize: 9, color: '#555' }, styles.cellMake]}>{item.make || ''}</Text>
                <Text style={[{ fontSize: 9 }, styles.cellQty]}>{item.quantity}</Text>
                <Text style={[{ fontSize: 9, color: '#555' }, styles.cellUnit]}>{item.unit || ''}</Text>
                <Text style={[{ fontSize: 9 }, styles.cellPrice]}>
                  {Number(item.unit_price || 0).toLocaleString()}
                </Text>
                <Text style={[{ fontSize: 9, fontFamily: 'Helvetica-Bold' }, styles.cellAmount]}>
                  {Number(item.amount || item.quantity * item.unit_price || 0).toLocaleString()}
                </Text>
                <Text style={[{ fontSize: 9, color: '#555' }, styles.cellVat]}>{item.vat_rate || 0}%</Text>
              </View>
            )
          ))}
        </View>

        {/* Extras below table */}
        {extras.length > 0 && (
          <View style={{ marginBottom: 10 }}>
            {extras.map(e => (
              <View key={e.label} style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: '#555', marginRight: 20 }}>{e.label}</Text>
                <Text style={{ fontSize: 9, width: 100, textAlign: 'right' }}>
                  {Number(e.value).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{Number(invoice.subtotal || 0).toLocaleString()}</Text>
            </View>
            {Number(invoice.vat) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>VAT</Text>
                <Text style={styles.totalValue}>{Number(invoice.vat || 0).toLocaleString()}</Text>
              </View>
            )}
            {Number(invoice.discount) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, { color: '#CC0000' }]}>-{Number(invoice.discount || 0).toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL (NGN)</Text>
              <Text style={styles.grandTotalValue}>{Number(invoice.total || 0).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Amount in Words */}
        {invoice.amount_in_words && (
          <View style={styles.amountWords}>
            <Text style={styles.amountWordsText}>{invoice.amount_in_words}</Text>
          </View>
        )}

        {/* Notes & Terms */}
        {invoice.notes && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={{ fontSize: 9, color: '#555' }}>{invoice.notes}</Text>
          </View>
        )}
        {invoice.terms && (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.sectionLabel}>Terms & Conditions</Text>
            <Text style={{ fontSize: 9, color: '#555' }}>{invoice.terms}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.footerLabel}>Payment Terms</Text>
              <Text style={styles.footerText}>{invoice.payment_terms || 'Net 30'}</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Authorised Signature</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  )
}