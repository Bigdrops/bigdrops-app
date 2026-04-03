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
  const band = darkenHex(accent, 35)
  const accentSoft = lightenHex(accent, 42)
  const accentPale = lightenHex(accent, 50)
  const accentBorder = lightenHex(accent, 34)
  const headerBold = resolvePdfFontFamily(preset.headerFont, 'bold')
  const bodyRegular = resolvePdfFontFamily(preset.bodyFont, 'regular')
  const fillableChoice = getEffectiveFillableFont(preset)
  const fillableRegular = resolvePdfFontFamily(fillableChoice, 'regular')
  const fillableBold = resolvePdfFontFamily(fillableChoice, 'bold')
  const fillableItalic = resolvePdfFontFamily(fillableChoice, 'italic')
  const fillableColor = preset.fillableColor

  return StyleSheet.create({
  page: { fontFamily: bodyRegular, fontSize: 10, padding: 0, backgroundColor: 'white' },

  // Full-width dark band header
  headerBand: { backgroundColor: band, padding: '28 40 24 40', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 0 },
  companyBlock: { flex: 1, marginRight: 20 },
  logo: { maxWidth: 100, maxHeight: 50, marginBottom: 6, objectFit: 'contain' },
  companyName: { fontSize: 14, fontFamily: fillableBold, color: 'white', marginBottom: 2 },
  companyDetail: { fontSize: 8, fontFamily: fillableRegular, color: accentSoft, marginBottom: 1 },
  docBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 24, fontFamily: headerBold, color: 'white', letterSpacing: 2, marginBottom: 6 },
  docNumber: { fontSize: 11, fontFamily: fillableBold, color: accentPale, marginBottom: 2 },
  docDate: { fontSize: 9, fontFamily: fillableRegular, color: accentSoft, marginBottom: 1 },
  docSubtitle: { fontSize: 9, fontFamily: bodyRegular, color: accentSoft, marginBottom: 2 },

  // Blue accent strip under band
  accentStrip: { backgroundColor: accent, height: 4, marginBottom: 0 },

  // Body content area
  body: { padding: '20 40 40 40' },

  // Client section
  twoCol: { flexDirection: 'row', marginBottom: 20 },
  col: { flex: 1 },
  sectionLabel: { fontSize: 8, fontFamily: headerBold, color: accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  clientName: { fontSize: 11, fontFamily: fillableBold, color: fillableColor, marginBottom: 2 },
  clientDetail: { fontSize: 8, fontFamily: fillableRegular, color: fillableColor, marginBottom: 2 },

  // Invoice title above table
  invoiceTitle: { fontSize: 12, fontFamily: headerBold, color: band, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, borderBottomWidth: 1, borderBottomColor: accentBorder, paddingBottom: 6 },

  // Table
  table: { marginBottom: 14 },
  tableHeader: { flexDirection: 'row', backgroundColor: band, paddingVertical: 7, paddingHorizontal: 8 },
  thText: { color: 'white', fontFamily: headerBold, fontSize: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'white' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 8, backgroundColor: accentPale },
  groupRow: { flexDirection: 'row', backgroundColor: band, paddingVertical: 5, paddingHorizontal: 8 },
  groupText: { color: 'white', fontFamily: headerBold, fontSize: 9 },
  groupSubtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: accentPale, borderBottomWidth: 1, borderBottomColor: accentBorder },
  groupSubtotalLabel: { fontSize: 8, color: fillableColor, fontFamily: headerBold, marginRight: 12 },
  groupSubtotalValue: { fontSize: 8, color: fillableColor, fontFamily: fillableBold },

  cNum:   { width: 18, textAlign: 'center', fontSize: 8 },
  cDesc:  { flex: 2.5 },
  cMake:  { flex: 1.2, fontSize: 8 },
  cQty:   { flex: 0.7, textAlign: 'center', fontSize: 8 },
  cUnit:  { flex: 0.8, textAlign: 'center', fontSize: 8 },
  cPrice: { flex: 1.5, textAlign: 'right', fontSize: 8 },
  cAmt:   { flex: 1.5, textAlign: 'right', fontSize: 8, fontFamily: fillableBold },
  descText: { fontSize: 8.5, fontFamily: fillableRegular, color: fillableColor },
  subDescText: { fontSize: 7, color: darkenHex(accent, 18), marginTop: 1, fontFamily: fillableItalic },

  // Totals
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  totalsBox: { width: 260, backgroundColor: '#F8FAFC', padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 8, fontFamily: bodyRegular, color: darkenHex(accent, 18) },
  totalValue: { fontSize: 8, fontFamily: fillableRegular, color: fillableColor },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: band, paddingTop: 6, marginTop: 4 },
  grandLabel: { fontSize: 11, fontFamily: headerBold, color: band },
  grandValue: { fontSize: 13, fontFamily: fillableBold, color: fillableColor },
  whtRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#ddd' },
  payableRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: accent, paddingTop: 6, marginTop: 4 },
  payableLabel: { fontSize: 11, fontFamily: headerBold, color: accent },
  payableValue: { fontSize: 13, fontFamily: fillableBold, color: fillableColor },

  amountWords: { backgroundColor: accentPale, padding: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: accent },
  amountWordsText: { fontSize: 8, color: fillableColor, fontFamily: fillableItalic },
  notesBox: { marginBottom: 10 },
  notesText: { fontSize: 8, fontFamily: fillableRegular, color: fillableColor, lineHeight: 1.5 },
  docsSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  docsSectionLabel: { fontSize: 9, fontFamily: headerBold, color: fillableColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  docItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  docLink: { fontSize: 8, color: accent, textDecoration: 'underline' },
  footer: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 12 },
  footerText: { fontSize: 7.5, fontFamily: bodyRegular, color: fillableColor, textAlign: 'center', lineHeight: 1.6 },
  groupDividerColor: accentBorder,
  rowNumberColor: darkenHex(accent, 18),
  cellMutedColor: darkenHex(accent, 18),
  cellValueColor: fillableColor,
  negativeValueColor: '#CC0000',
  payableNegativeColor: '#DC2626',
  payablePositiveColor: accent,
})
}

export default function InvoicePDF_Bold({ document, items = [], client, settings = {}, computedResult, pdfOutput, designPreset }) {
  const invoice = document
  const d = extractInvoiceData(document, items, client, settings, computedResult)
  const s = createStyles(designPreset)
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
            showBalanceDue: pdfOutput?.showBalanceDue !== false,
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
