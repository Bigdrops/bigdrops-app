import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import { stripHtml, extractInvoiceData } from './pdfUtils'
import { renderTotals } from './base/renderTotals'
import { renderItemsTable } from './base/renderItems'
import {
  darkenHex,
  getDefaultPdfDesignPreset,
  getEffectiveFillableFont,
  lightenHex,
  resolvePdfFontFamily,
} from '@/lib/pdfDesignPreset'

function createStyles(designPreset) {
  const preset = designPreset || getDefaultPdfDesignPreset('invoice')
  const accent = preset.accentColor
  const accentDark = darkenHex(accent, 28)
  const accentSoft = lightenHex(accent, 46)
  const accentBorder = lightenHex(accent, 32)
  const headerBold = resolvePdfFontFamily(preset.headerFont, 'bold')
  const bodyRegular = resolvePdfFontFamily(preset.bodyFont, 'regular')
  const fillableChoice = getEffectiveFillableFont(preset)
  const fillableRegular = resolvePdfFontFamily(fillableChoice, 'regular')
  const fillableBold = resolvePdfFontFamily(fillableChoice, 'bold')
  const fillableItalic = resolvePdfFontFamily(fillableChoice, 'italic')
  const fillableColor = preset.fillableColor

  return StyleSheet.create({
  page: { fontFamily: bodyRegular, fontSize: 9, padding: 32, backgroundColor: 'white' },

  // Compact header — single row
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: accentBorder },
  companyBlock: { flex: 1, marginRight: 16 },
  logo: { maxWidth: 80, maxHeight: 40, marginBottom: 4, objectFit: 'contain' },
  companyName: { fontSize: 11, fontFamily: fillableBold, color: fillableColor, marginBottom: 1 },
  companyDetail: { fontSize: 7, fontFamily: fillableRegular, color: fillableColor, marginBottom: 0.5 },
  docBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 18, fontFamily: headerBold, color: accentDark, letterSpacing: 1, marginBottom: 3 },
  docNumber: { fontSize: 9, fontFamily: fillableBold, color: fillableColor, marginBottom: 1 },
  docDate: { fontSize: 7.5, fontFamily: fillableRegular, color: fillableColor, marginBottom: 0.5 },

  // Client — compact single row
  twoCol: { flexDirection: 'row', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: accentSoft },
  col: { flex: 1 },
  sectionLabel: { fontSize: 7, fontFamily: headerBold, color: accentDark, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  clientName: { fontSize: 9.5, fontFamily: fillableBold, color: fillableColor, marginBottom: 1 },
  clientDetail: { fontSize: 7, fontFamily: fillableRegular, color: fillableColor, marginBottom: 1 },

  // Invoice title above table — compact
  invoiceTitle: { fontSize: 10, fontFamily: headerBold, color: accentDark, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Table — tighter
  table: { marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: accentDark, paddingVertical: 5, paddingHorizontal: 6 },
  thText: { color: 'white', fontFamily: headerBold, fontSize: 7 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: 'white' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0', paddingVertical: 4, paddingHorizontal: 6, backgroundColor: accentSoft },
  groupRow: { flexDirection: 'row', backgroundColor: accentDark, paddingVertical: 4, paddingHorizontal: 6 },
  groupText: { color: 'white', fontFamily: headerBold, fontSize: 7.5 },
  groupSubtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 3, paddingHorizontal: 6, backgroundColor: accentSoft, borderBottomWidth: 0.5, borderBottomColor: accentBorder },
  groupSubtotalLabel: { fontSize: 7, color: accentDark, fontFamily: headerBold, marginRight: 10 },
  groupSubtotalValue: { fontSize: 7, color: fillableColor, fontFamily: fillableBold },

  cNum: { width: 14, textAlign: 'center', fontSize: 7 },
  cDesc: { flex: 2.5 },
  cMake: { flex: 1.2, fontSize: 7 },
  cQty: { flex: 0.6, textAlign: 'center', fontSize: 7 },
  cUnit: { flex: 0.7, textAlign: 'center', fontSize: 7 },
  cPrice: { flex: 1.4, textAlign: 'right', fontSize: 7 },
  cAmt: { flex: 1.4, textAlign: 'right', fontSize: 7, fontFamily: fillableBold },
  descText: { fontSize: 7.5, fontFamily: fillableRegular, color: fillableColor },
  subDescText: { fontSize: 6.5, color: accentDark, marginTop: 0.5, fontFamily: fillableItalic },

  // Totals — compact
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 },
  totalsBox: { width: 230 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  totalLabel: { fontSize: 7.5, fontFamily: bodyRegular, color: accentDark },
  totalValue: { fontSize: 7.5, fontFamily: fillableRegular, color: fillableColor },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, borderTopColor: accentDark, paddingTop: 5, marginTop: 3 },
  grandLabel: { fontSize: 10, fontFamily: headerBold, color: accentDark },
  grandValue: { fontSize: 11, fontFamily: fillableBold, color: fillableColor },
  whtRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3, paddingTop: 3, borderTopWidth: 0.5, borderTopColor: '#ddd' },
  payableRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1.5, borderTopColor: accentDark, paddingTop: 5, marginTop: 3 },
  payableLabel: { fontSize: 10, fontFamily: headerBold, color: accentDark },
  payableValue: { fontSize: 11, fontFamily: fillableBold, color: fillableColor },

  bankBox: { marginTop: 10, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#E2E8F0' },

  amountWords: { backgroundColor: accentSoft, padding: 6, marginBottom: 10, borderLeftWidth: 2, borderLeftColor: accentDark },
  amountWordsText: { fontSize: 7, color: fillableColor, fontFamily: fillableItalic },
  notesBox: { marginBottom: 8 },
  notesText: { fontSize: 7, fontFamily: fillableRegular, color: fillableColor, lineHeight: 1.4 },
  docsSection: { marginTop: 12, borderTopWidth: 0.5, borderTopColor: '#eee', paddingTop: 10 },
  docsSectionLabel: { fontSize: 7.5, fontFamily: headerBold, color: fillableColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  docItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  docLink: { fontSize: 7, color: accent, textDecoration: 'underline' },
  footer: { borderTopWidth: 0.5, borderTopColor: '#eee', paddingTop: 8, marginTop: 10 },
  footerText: { fontSize: 7, fontFamily: bodyRegular, color: fillableColor, textAlign: 'center', lineHeight: 1.5 },
  groupDividerColor: accentBorder,
  rowNumberColor: accentDark,
  cellMutedColor: accentDark,
  cellValueColor: fillableColor,
  negativeValueColor: '#CC0000',
  payableNegativeColor: '#DC2626',
  payablePositiveColor: accentDark,
})
}

export default function InvoicePDF_Compact({
  document,
  items = [],
  client,
  settings = {},
  computedResult,
  pdfOutput,
  bankAccounts = [],
  designPreset,
}) {
  const invoice = document
  const d = extractInvoiceData(document, items, client, settings, computedResult)
  const s = createStyles(designPreset)
  const columns = d.pdfColumns
  const columnStyle = (column, extra = {}) => ({
    flex: column.pdfFlex,
    textAlign: column.align,
    ...extra,
  })

  const selectedBank =
    pdfOutput?.showBankDetails
      ? bankAccounts.find((b) => b.id === pdfOutput?.bankAccountId) ||
        bankAccounts.find((b) => b.is_default) ||
        bankAccounts[0] ||
        null
      : null

  return (
    <Document>
      <Page size="A4" style={s.page}>
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
              <Text key={entry.label} style={s.docDate}>
                {entry.label}: {entry.value}
              </Text>
            ))}
          </View>
        </View>

        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionLabel}>Bill To</Text>
            <Text style={s.clientName}>{invoice.client_name}</Text>
            {client?.address ? <Text style={s.clientDetail}>{client.address}</Text> : null}
            {client?.city ? <Text style={s.clientDetail}>{client.city}{client.state ? ', ' + client.state : ''}</Text> : null}
            {client?.phone ? <Text style={s.clientDetail}>{client.phone}</Text> : null}
            {client?.email ? <Text style={s.clientDetail}>{client.email}</Text> : null}
            {client?.contact_person ? <Text style={s.clientDetail}>Attn: {client.contact_person}</Text> : null}
          </View>

          <View style={s.col}>
            {d.referenceMeta.map((entry) => (
              <Text key={entry.label} style={s.clientDetail}>
                {entry.label}: {entry.value}
              </Text>
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
          totalLabel: 'Balance Due',
        })}

        {selectedBank ? (
          <View style={s.bankBox}>
            <Text style={s.sectionLabel}>Bank Details</Text>
            {selectedBank.bank_name ? <Text style={s.clientDetail}>{selectedBank.bank_name}</Text> : null}
            {selectedBank.account_name ? <Text style={s.clientDetail}>{selectedBank.account_name}</Text> : null}
            {selectedBank.account_number ? <Text style={s.clientDetail}>{selectedBank.account_number}</Text> : null}
            {selectedBank.sort_code ? <Text style={s.clientDetail}>Sort Code: {selectedBank.sort_code}</Text> : null}
          </View>
        ) : null}

        {invoice.notes && stripHtml(invoice.notes) ? (
          <View style={s.notesBox}>
            <Text style={[s.sectionLabel, { marginBottom: 3 }]}>{d.cf.notesTitle || 'Notes'}</Text>
            <Text style={s.notesText}>{stripHtml(invoice.notes)}</Text>
          </View>
        ) : null}

        {invoice.terms && stripHtml(invoice.terms) ? (
          <View style={[s.notesBox, { marginBottom: 10 }]}>
            <Text style={[s.sectionLabel, { marginBottom: 3 }]}>{d.cf.termsTitle || 'Terms and Conditions'}</Text>
            <Text style={s.notesText}>{stripHtml(invoice.terms)}</Text>
          </View>
        ) : null}

        {d.validAttachments.length > 0 && (
          <View style={s.docsSection}>
            <Text style={s.docsSectionLabel}>Supporting Documents</Text>
            {d.validAttachments.map((att, i) => (
              <View key={i} style={s.docItem}>
                <Text>Attachment: </Text>
                <Link src={att.url} style={s.docLink}>{att.label}</Link>
              </View>
            ))}
          </View>
        )}

        {d.footerText ? (
          <View style={s.footer}>
            <Text style={s.footerText}>{d.footerText}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
