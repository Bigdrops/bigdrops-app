import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import {
  BUILTIN_COLUMNS,
  getPdfColumns,
} from '@/domain/invoice'
import type { ColumnConfig, InvoiceCustomFields, InvoiceItem } from '@/domain/invoice'
import type { Quotation } from '@/domain/quotation'
import type { PdfDocumentProps } from '@/components/pdf/base/PdfTypes'
import type { DocumentResult } from '@/lib/Calculations'
import { buildRenderRows, renderItemsTable } from '@/components/pdf/base/renderItems'
import { renderTotals } from '@/components/pdf/base/renderTotals'

type QuotationPdfProps = {
  document: Quotation
  items: InvoiceItem[]
  client?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
  computedResult: DocumentResult
} & Partial<PdfDocumentProps<Quotation, InvoiceItem, Record<string, unknown> | null, Record<string, unknown> | null>>

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
  thText: {
    fontSize: 7.6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    paddingTop: 7,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingTop: 7,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  groupRow: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  groupText: {
    fontSize: 8.5,
    color: 'white',
    fontFamily: 'Helvetica-Bold',
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
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  totalsBox: {
    width: 248,
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
  payableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
    paddingTop: 7,
    marginTop: 6,
  },
  payableLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  payableValue: {
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

function toMoneyNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '')
    if (!cleaned) return 0
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (value === null || value === undefined || value === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatPercent(value: unknown) {
  const num = toMoneyNumber(value)
  if (!Number.isFinite(num)) return '-'
  return `${num.toLocaleString('en-NG', { maximumFractionDigits: 2 })}%`
}

function formatNaira(value: number | string | null | undefined) {
  const num = toMoneyNumber(value)
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
  document,
  items,
  client = null,
  settings = null,
  computedResult,
}: QuotationPdfProps) {
  const quotation = document
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
  const isVisible = (key: string) => {
    if (!columns?.length) return true
    const col = columns.find((column) => column.key === key)
    return col ? col.visible !== false : true
  }
  const showMake = isVisible('make')
  const showVatRate = isVisible('vat_rate')
  const showDiscountRate = isVisible('discount_rate')
  const hasInstallColumn = isVisible('install_rate') && computedResult.installRateTotal > 0
  const bottomFields = Array.isArray(customFields.bottom) ? customFields.bottom : []
  const headerFields = pickHeaderFields(Array.isArray(customFields.header) ? customFields.header : [])
  const renderRows = buildRenderRows({
    rawItems: items,
    computedItems: computedResult.items,
    groups: computedResult.groups,
    groupMeta: customFields.groupMeta || {},
  })
  const itemColumns = getPdfColumns(columns)
    .filter((column) => ['num', 'description', 'quantity', 'unit', 'unit_price', 'amount', 'install_rate'].includes(column.key))
    .filter((column) => (column.key === 'install_rate' ? hasInstallColumn : true))
  const columnStyle = (column: { key: string }, extra: Record<string, unknown> = {}) => {
    if (column.key === 'num') return { ...styles.colNum, ...styles.cell, ...extra }
    if (column.key === 'description') return { ...styles.colDesc, ...extra }
    if (column.key === 'quantity') return { ...styles.colQty, ...styles.cell, ...extra }
    if (column.key === 'unit_price') return { ...styles.colRate, ...styles.cell, ...extra }
    if (column.key === 'install_rate') return { ...styles.colInstall, ...styles.cell, ...extra }
    if (column.key === 'amount') return { ...styles.colAmount, ...styles.amountCell, ...extra }
    return { ...styles.cell, ...extra }
  }

  const companyName = String(settings?.company_name || '')
  const companyTagline = String(settings?.company_tagline || '')
  const companyAddress = String(settings?.company_address || '')
  const companyCity = String(settings?.company_city || '')
  const companyPhone = String(settings?.company_phone || '')
  const companyEmail = String(settings?.company_email || '')
  const logoUrl = String(settings?.company_logo_url || settings?.logo_url || '')

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
            {String(quotation.po_number || '').trim() ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>P.O. Number</Text>
                <Text style={styles.metaValue}>{textOrDash(String(quotation.po_number || '').trim())}</Text>
              </View>
            ) : null}
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

        {renderItemsTable({
          rows: renderRows,
          columns: itemColumns,
          mergeQtyUnit: true,
          styles: {
            ...styles,
            descText: styles.descMain,
            subDescText: styles.descSub,
          },
          getColumnStyle: columnStyle,
          getDescriptionExtras: (item) => [
            showMake && item.make ? `Make: ${String(item.make).trim()}` : '',
            showVatRate && item.vat_rate !== null && item.vat_rate !== undefined ? `VAT ${formatPercent(item.vat_rate)}` : '',
            showDiscountRate && item.discount_rate !== null && item.discount_rate !== undefined ? `Discount ${formatPercent(item.discount_rate)}` : '',
          ].filter(Boolean),
        })}

        {renderTotals({
          result: computedResult,
          styles,
          showInstallRate: hasInstallColumn,
          totalLabel: 'Total Payable',
          includeGrandTotal: false,
        })}

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
