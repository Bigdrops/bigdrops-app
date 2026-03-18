import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import {
  BUILTIN_COLUMNS,
  calcTotals,
  extractCalculationInputs,
  resolveInstallRate,
} from '@/domain/invoice'
import type { ColumnConfig, InvoiceCustomFields, InvoiceItem } from '@/domain/invoice'
import type { Quotation } from '@/domain/quotation'

type QuotationPdfProps = {
  quotation: Quotation
  items: InvoiceItem[]
  client?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 32,
    paddingRight: 34,
    paddingBottom: 28,
    paddingLeft: 34,
    backgroundColor: 'white',
  },
  topBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
  },
  companyBlock: {
    flex: 1,
    marginRight: 18,
  },
  logo: {
    maxWidth: 120,
    maxHeight: 48,
    marginBottom: 6,
    objectFit: 'contain',
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  companyText: {
    fontSize: 8.2,
    color: '#475569',
    marginBottom: 1.5,
    lineHeight: 1.35,
  },
  metaBlock: {
    width: 190,
    alignItems: 'flex-end',
  },
  metaKicker: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  metaNumber: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 8.2,
    color: '#64748b',
    marginRight: 8,
  },
  metaValue: {
    fontSize: 8.6,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    flexShrink: 1,
  },
  preparedWrap: {
    marginTop: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  preparedCard: {
    flex: 1.25,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  infoCard: {
    flex: 0.95,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    backgroundColor: 'white',
  },
  blockLabel: {
    fontSize: 7.8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.15,
    color: '#64748b',
    marginBottom: 5,
  },
  clientName: {
    fontSize: 10.4,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 2,
  },
  bodyText: {
    fontSize: 8.5,
    color: '#475569',
    marginBottom: 1.5,
    lineHeight: 1.35,
  },
  titleWrap: {
    marginBottom: 10,
  },
  titleText: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    lineHeight: 1.3,
  },
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    borderTopWidth: 1.4,
    borderBottomWidth: 1,
    borderTopColor: '#0f172a',
    borderBottomColor: '#cbd5e1',
    paddingTop: 7,
    paddingBottom: 6,
  },
  th: {
    fontSize: 7.6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#475569',
  },
  row: {
    flexDirection: 'row',
    paddingTop: 7,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  colNum: { width: 22, textAlign: 'center' },
  colDesc: { flex: 1.85, paddingRight: 10 },
  colQty: { width: 54, textAlign: 'center' },
  colRate: { width: 82, textAlign: 'right' },
  colInstall: { width: 78, textAlign: 'right' },
  colAmount: { width: 92, textAlign: 'right' },
  descMain: {
    fontSize: 8.8,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.35,
  },
  descSub: {
    fontSize: 7.4,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 1.35,
  },
  cell: {
    fontSize: 8.3,
    color: '#334155',
    lineHeight: 1.3,
  },
  amountCell: {
    fontSize: 8.3,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.3,
  },
  totalsWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  totalsBox: {
    width: 248,
  },
  totalsTitle: {
    fontSize: 7.8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: '#64748b',
    marginBottom: 7,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 8.5,
    color: '#475569',
  },
  totalValue: {
    fontSize: 8.5,
    color: '#0f172a',
    textAlign: 'right',
  },
  totalNegative: {
    color: '#b91c1c',
  },
  grossRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 6,
    marginTop: 4,
  },
  grossLabel: {
    fontSize: 9.2,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  grossValue: {
    fontSize: 9.2,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
    paddingTop: 7,
    marginTop: 6,
  },
  netLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  netValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  notesSection: {
    marginTop: 12,
  },
  notesTitle: {
    fontSize: 7.8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: '#64748b',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 8.4,
    color: '#475569',
    lineHeight: 1.45,
    marginBottom: 3,
  },
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

function formatPercent(value: unknown) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return `${num.toLocaleString('en-NG', { maximumFractionDigits: 2 })}%`
}

function formatNaira(value: number | string | null | undefined) {
  const num = Number(value || 0)
  const hasFraction = Math.abs(num % 1) > 0.000001
  return `₦${num.toLocaleString('en-NG', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  })}`
}

function cleanUnit(value: unknown) {
  const text = String(value || '').trim()
  return text ? text.toUpperCase() : ''
}

function pickHeaderFields(header: Array<Record<string, unknown>>) {
  return header
    .filter((field) => field.label && field.value)
    .slice(0, 4)
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

  const columns =
    Array.isArray(customFields.columnConfig) && customFields.columnConfig.length
      ? customFields.columnConfig
      : BUILTIN_COLUMNS
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

  const standardItems = items.filter((item) => item.row_type === 'standard')
  const bottomFields = Array.isArray(customFields.bottom) ? customFields.bottom : []
  const headerFields = pickHeaderFields(Array.isArray(customFields.header) ? customFields.header : [])

  const companyName = String(settings?.company_name || '')
  const companyTagline = String(settings?.company_tagline || '')
  const companyAddress = String(settings?.company_address || '')
  const companyCity = String(settings?.company_city || '')
  const companyPhone = String(settings?.company_phone || '')
  const companyEmail = String(settings?.company_email || '')
  const logoUrl = String(settings?.company_logo_url || settings?.logo_url || '')

  const hasInstallColumn =
    Boolean(installColumn?.visible) &&
    standardItems.some((item) => resolveInstallRate(item, installColumn) > 0)

  const grossTotal = totals.totalPayable + totals.whtAmount

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBand}>
          <View style={styles.companyBlock}>
            {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : null}
            {companyName ? <Text style={styles.companyName}>{companyName}</Text> : null}
            {companyTagline ? <Text style={styles.companyText}>{companyTagline}</Text> : null}
            {companyAddress ? <Text style={styles.companyText}>{companyAddress}</Text> : null}
            {companyCity ? <Text style={styles.companyText}>{companyCity}</Text> : null}
            {companyPhone ? <Text style={styles.companyText}>{companyPhone}</Text> : null}
            {companyEmail ? <Text style={styles.companyText}>{companyEmail}</Text> : null}
          </View>

          <View style={styles.metaBlock}>
            <Text style={styles.metaKicker}>Quotation</Text>
            <Text style={styles.metaNumber}>{quotation.quotation_number || 'Quotation'}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issue Date</Text>
              <Text style={styles.metaValue}>{textOrDash(quotation.issue_date)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Valid Until</Text>
              <Text style={styles.metaValue}>{textOrDash(quotation.valid_until)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>{textOrDash(quotation.status)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.preparedWrap}>
          <View style={styles.preparedCard}>
            <Text style={styles.blockLabel}>Prepared For</Text>
            <Text style={styles.clientName}>{quotation.client_name || 'Unassigned client'}</Text>
            {client?.contact_person ? <Text style={styles.bodyText}>Attn: {String(client.contact_person)}</Text> : null}
            {client?.address ? <Text style={styles.bodyText}>{String(client.address)}</Text> : null}
            {client?.city ? (
              <Text style={styles.bodyText}>
                {String(client.city)}
                {client?.state ? `, ${String(client.state)}` : ''}
              </Text>
            ) : null}
            {client?.phone ? <Text style={styles.bodyText}>{String(client.phone)}</Text> : null}
            {client?.email ? <Text style={styles.bodyText}>{String(client.email)}</Text> : null}
          </View>

          {headerFields.length > 0 ? (
            <View style={styles.infoCard}>
              <Text style={styles.blockLabel}>Reference</Text>
              {headerFields.map((field, index) => (
                <View key={`header_${index}`} style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{String(field.label)}</Text>
                  <Text style={styles.metaValue}>{String(field.value)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {quotation.quotation_title ? (
          <View style={styles.titleWrap}>
            <Text style={styles.titleText}>{quotation.quotation_title}</Text>
          </View>
        ) : null}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colNum]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Rate</Text>
            {hasInstallColumn ? <Text style={[styles.th, styles.colInstall]}>Install</Text> : null}
            <Text style={[styles.th, styles.colAmount]}>Amount</Text>
          </View>

          {standardItems.map((item, index) => {
            const rowAmount = Number(item.quantity || 0) * Number(item.unit_price || 0)
            const installRate = resolveInstallRate(item, installColumn)
            const quantityLabel = cleanUnit(item.unit)
              ? `${Number(item.quantity || 0).toLocaleString('en-NG')} ${cleanUnit(item.unit)}`
              : Number(item.quantity || 0).toLocaleString('en-NG')

            const subLines = [
              item.sub_description ? String(item.sub_description).trim() : '',
              item.make ? `Make: ${String(item.make).trim()}` : '',
              item.vat_rate !== null && item.vat_rate !== undefined ? `VAT ${formatPercent(item.vat_rate)}` : '',
              item.discount_rate !== null && item.discount_rate !== undefined ? `Discount ${formatPercent(item.discount_rate)}` : '',
            ].filter(Boolean)

            return (
              <View key={item._uiKey || item.id || index} style={styles.row} wrap={false}>
                <Text style={[styles.cell, styles.colNum]}>{index + 1}</Text>
                <View style={styles.colDesc}>
                  <Text style={styles.descMain}>{item.description || ''}</Text>
                  {subLines.map((line, lineIndex) => (
                    <Text key={`sub_${lineIndex}`} style={styles.descSub}>
                      {line}
                    </Text>
                  ))}
                </View>
                <Text style={[styles.cell, styles.colQty]}>{quantityLabel}</Text>
                <Text style={[styles.cell, styles.colRate]}>{formatNaira(item.unit_price || 0)}</Text>
                {hasInstallColumn ? (
                  <Text style={[styles.cell, styles.colInstall]}>
                    {installRate > 0 ? formatNaira(installRate) : '-'}
                  </Text>
                ) : null}
                <Text style={[styles.amountCell, styles.colAmount]}>{formatNaira(rowAmount)}</Text>
              </View>
            )
          })}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totalsBox}>
            <Text style={styles.totalsTitle}>Totals</Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatNaira(totals.rawSubtotal)}</Text>
            </View>
            {hasInstallColumn && totals.installRateTotal > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Install Rate Total</Text>
                <Text style={styles.totalValue}>{formatNaira(totals.installRateTotal)}</Text>
              </View>
            ) : null}
            {totals.vatAmount > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>VAT</Text>
                <Text style={styles.totalValue}>{formatNaira(totals.vatAmount)}</Text>
              </View>
            ) : null}
            {totals.discountAmount > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, styles.totalNegative]}>- {formatNaira(totals.discountAmount)}</Text>
              </View>
            ) : null}

            <View style={styles.grossRow}>
              <Text style={styles.grossLabel}>Gross Total</Text>
              <Text style={styles.grossValue}>{formatNaira(grossTotal)}</Text>
            </View>

            {totals.whtAmount > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Less WHT</Text>
                <Text style={[styles.totalValue, styles.totalNegative]}>- {formatNaira(totals.whtAmount)}</Text>
              </View>
            ) : null}

            <View style={styles.netRow}>
              <Text style={styles.netLabel}>Net Quotation</Text>
              <Text style={styles.netValue}>{formatNaira(totals.totalPayable)}</Text>
            </View>
          </View>
        </View>

        {stripHtml(quotation.notes) ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>{String(customFields.notesTitle || 'Notes')}</Text>
            <Text style={styles.notesText}>{stripHtml(quotation.notes)}</Text>
          </View>
        ) : null}

        {stripHtml(quotation.terms) ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>{String(customFields.termsTitle || 'Terms and Conditions')}</Text>
            <Text style={styles.notesText}>{stripHtml(quotation.terms)}</Text>
          </View>
        ) : null}

        {bottomFields.filter((field) => field.text).length > 0 ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Additional Notes</Text>
            {bottomFields
              .filter((field) => field.text)
              .map((field, index) => (
                <Text key={`bottom_${index}`} style={styles.notesText}>
                  {String(field.text)}
                </Text>
              ))}
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
