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
  const accentSoft = lightenHex(accent, 46)
  const accentPale = lightenHex(accent, 54)
  const accentBorder = lightenHex(accent, 36)
  const accentDark = darkenHex(accent, 22)
  const headerRegular = resolvePdfFontFamily(preset.headerFont, 'regular')
  const headerBold = resolvePdfFontFamily(preset.headerFont, 'bold')
  const bodyRegular = resolvePdfFontFamily(preset.bodyFont, 'regular')
  const bodyItalic = resolvePdfFontFamily(preset.bodyFont, 'italic')
  const fillableChoice = getEffectiveFillableFont(preset)
  const fillableRegular = resolvePdfFontFamily(fillableChoice, 'regular')
  const fillableBold = resolvePdfFontFamily(fillableChoice, 'bold')
  const fillableItalic = resolvePdfFontFamily(fillableChoice, 'italic')
  const fillableColor = preset.fillableColor

  return StyleSheet.create({
  page: { fontFamily: bodyRegular, fontSize: 10, padding: 40, backgroundColor: 'white' },

  // Centered title block at top
  titleBlock: { alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: accent },
  docTitle: { fontSize: 26, fontFamily: headerBold, color: accent, letterSpacing: 1, marginBottom: 4 },
  docSubtitle: { fontSize: 11, fontFamily: bodyRegular, color: accentDark, marginBottom: 0 },

  // Header row below title: logo left, invoice meta right
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  companyBlock: { flex: 1 },
  logo: { maxWidth: 100, maxHeight: 50, marginBottom: 4, objectFit: 'contain' },
  companyName: { fontSize: 11, fontFamily: fillableBold, color: fillableColor, marginBottom: 1 },
  companyDetail: { fontSize: 8, fontFamily: fillableRegular, color: fillableColor, marginBottom: 1 },
  metaBlock: { alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row', marginBottom: 3 },
  metaLabel: { fontSize: 9, fontFamily: bodyRegular, color: accentDark, marginRight: 8 },
  metaValue: { fontSize: 9, fontFamily: fillableBold, color: fillableColor },

  // Two-column client cards
  clientRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  clientCard: { flex: 1, backgroundColor: accentPale, borderWidth: 1, borderColor: accentBorder, padding: 12 },
  clientCardLabel: { fontSize: 8, fontFamily: headerBold, color: accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  clientName: { fontSize: 11, fontFamily: fillableBold, color: fillableColor, marginBottom: 2 },
  clientDetail: { fontSize: 8, fontFamily: fillableRegular, color: fillableColor, marginBottom: 2 },

  // Invoice title above table
  invoiceTitle: { fontSize: 12, fontFamily: headerBold, color: accent, marginBottom: 8, textTransform: 'uppercase', borderLeftWidth: 4, borderLeftColor: accent, paddingLeft: 8 },

  // Table
  table: { marginBottom: 14 },
  tableHeader: { flexDirection: 'row', backgroundColor: accent, paddingVertical: 7, paddingHorizontal: 8 },
  thText: { color: 'white', fontFamily: headerBold, fontSize: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: accentBorder, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: 'white' },
  tableRowAlt: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: accentBorder, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: accentPale },
  groupRow: { flexDirection: 'row', backgroundColor: accentSoft, borderTopWidth: 1, borderTopColor: accent, paddingVertical: 5, paddingHorizontal: 8 },
  groupText: { color: accent, fontFamily: headerBold, fontSize: 9 },
  groupSubtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: accentPale, borderBottomWidth: 1, borderBottomColor: accentBorder },
  groupSubtotalLabel: { fontSize: 8, color: accentDark, fontFamily: headerBold, marginRight: 12 },
  groupSubtotalValue: { fontSize: 8, color: fillableColor, fontFamily: fillableBold },

  cNum:   { width: 18, textAlign: 'center', fontSize: 8 },
  cDesc:  { flex: 2.5 },
  cMake:  { flex: 1.2, fontSize: 8 },
  cQty:   { flex: 0.7, textAlign: 'center', fontSize: 8 },
  cUnit:  { flex: 0.8, textAlign: 'center', fontSize: 8 },
  cPrice: { flex: 1.5, textAlign: 'right', fontSize: 8 },
  cAmt:   { flex: 1.5, textAlign: 'right', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  descText: { fontSize: 8.5, fontFamily: fillableRegular, color: fillableColor },
  subDescText: { fontSize: 7, color: accentDark, marginTop: 1, fontFamily: fillableItalic },

  // Totals
  totalsSection: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 },
  totalsBox: { width: 260 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 8, fontFamily: bodyRegular, color: accentDark },
  totalValue: { fontSize: 8, fontFamily: fillableRegular, color: fillableColor },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: accent, paddingTop: 6, marginTop: 4 },
  grandLabel: { fontSize: 11, fontFamily: headerBold, color: accent },
  grandValue: { fontSize: 13, fontFamily: fillableBold, color: fillableColor },
  whtRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#ddd' },
  payableRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: accent, paddingTop: 6, marginTop: 4 },
  payableLabel: { fontSize: 11, fontFamily: headerBold, color: accent },
  payableValue: { fontSize: 13, fontFamily: fillableBold, color: fillableColor },

  amountWords: { backgroundColor: accentPale, padding: 8, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: accent },
  amountWordsText: { fontSize: 8, color: fillableColor, fontFamily: fillableItalic },
  notesBox: { marginBottom: 10 },
  notesText: { fontSize: 8, fontFamily: fillableRegular, color: fillableColor, lineHeight: 1.5 },
  sectionLabel: { fontSize: 8, fontFamily: headerBold, color: accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  docsSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  docsSectionLabel: { fontSize: 9, fontFamily: headerBold, color: fillableColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  docItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  docLink: { fontSize: 8, color: accent, textDecoration: 'underline' },
  footer: { borderTopWidth: 1, borderTopColor: accentBorder, paddingTop: 10, marginTop: 12 },
  footerText: { fontSize: 7.5, fontFamily: bodyRegular, color: fillableColor, textAlign: 'center', lineHeight: 1.6 },
  groupDividerColor: accentBorder,
  rowNumberColor: accentDark,
  cellMutedColor: accentDark,
  cellValueColor: fillableColor,
  negativeValueColor: '#CC0000',
  payableNegativeColor: '#DC2626',
  payablePositiveColor: accent,
})
}

export default function InvoicePDF_Proforma({ document, items = [], client, settings = {}, computedResult, pdfOutput, designPreset }) {
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
            {d.documentMeta.map((entry) => (
              <View key={entry.label} style={s.metaRow}>
                <Text style={s.metaLabel}>{entry.label}</Text>
                <Text style={s.metaValue}>{entry.value}</Text>
              </View>
            ))}
            {d.referenceMeta.map((entry) => (
              <View key={`ref_${entry.label}`} style={s.metaRow}>
                <Text style={s.metaLabel}>{entry.label}</Text>
                <Text style={s.metaValue}>{entry.value}</Text>
              </View>
            ))}
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

        {renderItemsTable({
          rows: d.renderRows,
          columns,
          styles: s,
          getColumnStyle: columnStyle,
        })}

        {/* TOTALS */}
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

      </Page>
    </Document>
  )
}
