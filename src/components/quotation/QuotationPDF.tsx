import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import {
  BUILTIN_COLUMNS,
  calcTotals,
  extractCalculationInputs,
  getPdfCellValue,
  getPdfColumns,
} from '@/domain/invoice'
import type { ColumnConfig, InvoiceItem, InvoiceCustomFields } from '@/domain/invoice'
import type { Quotation } from '@/domain/quotation'

type QuotationPdfProps = {
  quotation: Quotation
  items: InvoiceItem[]
  client?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 34, backgroundColor: 'white' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
  },
  companyBlock: { flex: 1, marginRight: 16 },
  logo: { maxWidth: 108, maxHeight: 52, marginBottom: 6, objectFit: 'contain' },
  companyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 2 },
  companyDetail: { fontSize: 8.5, color: '#475569', marginBottom: 1.5 },
  docBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 4, letterSpacing: 0.8 },
  docNumber: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 2 },
  docMeta: { fontSize: 9, color: '#475569', marginBottom: 1.5 },
  twoCol: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  card: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 10, backgroundColor: '#f8fafc' },
  sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, color: '#475569', marginBottom: 5 },
  clientName: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  cardText: { fontSize: 8.5, color: '#475569', marginBottom: 2 },
  quotationTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0f172a', paddingVertical: 6, paddingHorizontal: 8 },
  thText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: 'white' },
  row: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  rowAlt: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#f8fafc' },
  descText: { fontSize: 8.5, color: '#111827', lineHeight: 1.35 },
  subDescText: { fontSize: 7.2, color: '#6b7280', marginTop: 1.5, lineHeight: 1.35 },
  cell: { fontSize: 8, color: '#334155' },
  amountCell: { fontSize: 8, color: '#111827', fontFamily: 'Helvetica-Bold' },
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, marginBottom: 10 },
  totalsBox: { width: 250 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 8.5, color: '#475569' },
  totalValue: { fontSize: 8.5, color: '#0f172a' },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: '#0f172a', paddingTop: 6, marginTop: 4 },
  grandLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  grandValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  notesSection: { marginTop: 10 },
  notesText: { fontSize: 8.5, color: '#475569', lineHeight: 1.45 },
  footer: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  footerText: { fontSize: 7.5, color: '#64748b', textAlign: 'center' },
})

function stripHtml(value?: string) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function textOrDash(value: unknown) {
  return value === null || value === undefined || value === '' ? '-' : String(value)
}

function money(value: number | string | null | undefined) {
  return `NGN ${Number(value || 0).toLocaleString()}`
}

export default function QuotationPDF({
  quotation,
  items,
  client = null,
  settings = null,
}: QuotationPdfProps) {
  const customFields = (quotation.custom_fields || {}) as InvoiceCustomFields & {
    columnConfig?: ColumnConfig[]
    header?: Array<Record<string, unknown>>
    bottom?: Array<Record<string, unknown>>
    notesTitle?: string
    termsTitle?: string
  }
  const columns = Array.isArray(customFields.columnConfig) && customFields.columnConfig.length
    ? customFields.columnConfig
    : BUILTIN_COLUMNS
  const pdfColumns = getPdfColumns(columns)
  const installColumn = columns.find((column) => column.key === 'install_rate')
  const calculationInputs = extractCalculationInputs(quotation, customFields)
  const totals = calcTotals({
    items,
    columns,
    invoice: quotation,
    discountType: calculationInputs.discountType,
    discountTiming: calculationInputs.discountTiming,
    whtType: calculationInputs.whtType,
  })

  const companyName = String(settings?.company_name || '')
  const companyTagline = String(settings?.company_tagline || '')
  const companyAddress = String(settings?.company_address || '')
  const companyCity = String(settings?.company_city || '')
  const companyPhone = String(settings?.company_phone || '')
  const companyEmail = String(settings?.company_email || '')
  const logoUrl = String(settings?.company_logo_url || settings?.logo_url || '')
  const bottomFields = Array.isArray(customFields.bottom) ? customFields.bottom : []
  const headerFields = Array.isArray(customFields.header) ? customFields.header : []
  const standardItems = items.filter((item) => item.row_type !== 'group_header')

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.companyBlock}>
            {logoUrl ? <Image src={logoUrl} style={s.logo} /> : null}
            {companyName ? <Text style={s.companyName}>{companyName}</Text> : null}
            {companyTagline ? <Text style={s.companyDetail}>{companyTagline}</Text> : null}
            {companyAddress ? <Text style={s.companyDetail}>{companyAddress}</Text> : null}
            {companyCity ? <Text style={s.companyDetail}>{companyCity}</Text> : null}
            {companyPhone ? <Text style={s.companyDetail}>{companyPhone}</Text> : null}
            {companyEmail ? <Text style={s.companyDetail}>{companyEmail}</Text> : null}
          </View>
          <View style={s.docBlock}>
            <Text style={s.docTitle}>QUOTATION</Text>
            <Text style={s.docNumber}>{quotation.quotation_number || 'Quotation'}</Text>
            <Text style={s.docMeta}>Issue Date: {textOrDash(quotation.issue_date)}</Text>
            <Text style={s.docMeta}>Valid Until: {textOrDash(quotation.valid_until)}</Text>
            <Text style={s.docMeta}>Status: {textOrDash(quotation.status)}</Text>
          </View>
        </View>

        <View style={s.twoCol}>
          <View style={s.card}>
            <Text style={s.sectionLabel}>Prepared For</Text>
            <Text style={s.clientName}>{quotation.client_name || 'Unassigned client'}</Text>
            {client?.address ? <Text style={s.cardText}>{String(client.address)}</Text> : null}
            {client?.city ? <Text style={s.cardText}>{String(client.city)}{client?.state ? `, ${String(client.state)}` : ''}</Text> : null}
            {client?.phone ? <Text style={s.cardText}>{String(client.phone)}</Text> : null}
            {client?.email ? <Text style={s.cardText}>{String(client.email)}</Text> : null}
            {client?.contact_person ? <Text style={s.cardText}>Attn: {String(client.contact_person)}</Text> : null}
          </View>
          <View style={s.card}>
            <Text style={s.sectionLabel}>Quotation Details</Text>
            {quotation.quotation_title ? <Text style={s.cardText}>Title: {quotation.quotation_title}</Text> : null}
            {headerFields
              .filter((field) => field.label && field.value)
              .map((field, index) => (
                <Text key={`${field.label || 'field'}_${index}`} style={s.cardText}>
                  {String(field.label)}: {String(field.value)}
                </Text>
              ))}
          </View>
        </View>

        {quotation.quotation_title ? <Text style={s.quotationTitle}>{quotation.quotation_title}</Text> : null}

        <View style={s.tableHeader}>
          {pdfColumns.map((column) => (
            <Text
              key={column.key}
              style={[
                s.thText,
                { flexGrow: column.pdfFlex, flexBasis: 0, textAlign: column.align },
              ]}
            >
              {column.label}
            </Text>
          ))}
        </View>

        {standardItems.map((item, index) => {
          const rowStyle = index % 2 === 0 ? s.row : s.rowAlt
          const amount = Number(item.quantity || 0) * Number(item.unit_price || 0)
          return (
            <View key={item._uiKey || item.id || index} style={rowStyle} wrap={false}>
              {pdfColumns.map((column) => {
                let value: string | number = getPdfCellValue(column, item, { amount, installColumn })
                if (column.key === 'num') value = index + 1
                if (column.key === 'description') {
                  return (
                    <View key={column.key} style={{ flexGrow: column.pdfFlex, flexBasis: 0 }}>
                      <Text style={s.descText}>{item.description || ''}</Text>
                      {item.sub_description ? <Text style={s.subDescText}>{item.sub_description}</Text> : null}
                    </View>
                  )
                }
                return (
                  <Text
                    key={column.key}
                    style={[
                      column.key === 'amount' ? s.amountCell : s.cell,
                      { flexGrow: column.pdfFlex, flexBasis: 0, textAlign: column.align },
                    ]}
                  >
                    {String(value)}
                  </Text>
                )
              })}
            </View>
          )
        })}

        <View style={s.totalsWrap}>
          <View style={s.totalsBox}>
            {[
              ['Subtotal', totals.rawSubtotal],
              ['Install Rate Total', totals.installRateTotal],
              ['VAT', totals.vatAmount],
              ['Discount', totals.discountAmount],
              ['WHT', totals.whtAmount],
            ].map(([label, value]) => (
              <View key={String(label)} style={s.totalRow}>
                <Text style={s.totalLabel}>{label}</Text>
                <Text style={s.totalValue}>{money(value as number)}</Text>
              </View>
            ))}
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>Total Quotation</Text>
              <Text style={s.grandValue}>{money(totals.totalPayable)}</Text>
            </View>
          </View>
        </View>

        {stripHtml(quotation.notes) ? (
          <View style={s.notesSection}>
            <Text style={s.sectionLabel}>{String(customFields.notesTitle || 'Notes')}</Text>
            <Text style={s.notesText}>{stripHtml(quotation.notes)}</Text>
          </View>
        ) : null}

        {stripHtml(quotation.terms) ? (
          <View style={s.notesSection}>
            <Text style={s.sectionLabel}>{String(customFields.termsTitle || 'Terms and Conditions')}</Text>
            <Text style={s.notesText}>{stripHtml(quotation.terms)}</Text>
          </View>
        ) : null}

        {bottomFields.length > 0 ? (
          <View style={s.notesSection}>
            <Text style={s.sectionLabel}>Additional Notes</Text>
            {bottomFields
              .filter((field) => field.text)
              .map((field, index) => (
                <Text key={`bottom_${index}`} style={s.notesText}>{String(field.text)}</Text>
              ))}
          </View>
        ) : null}

        <View style={s.footer}>
          <Text style={s.footerText}>Quotation generated from the quotation module.</Text>
        </View>
      </Page>
    </Document>
  )
}
