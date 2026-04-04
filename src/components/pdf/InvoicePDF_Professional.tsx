import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { BUILTIN_COLUMNS, getPdfColumns, type ColumnConfig, type InvoiceItem } from '@/domain/invoice'
import { buildRenderRows, renderItemsTable } from '@/components/pdf/base/renderItems'
import { renderTotals } from '@/components/pdf/base/renderTotals'
import { extractInvoiceData, getHeaderFields, hasDisplayValue, stripHtml } from '@/components/pdf/pdfUtils'
import {
  darkenHex,
  getDefaultPdfDesignPreset,
  getEffectiveFillableFont,
  lightenHex,
  resolvePdfFontFamily,
  type PdfDesignPreset,
  type PdfDesignPresetDocument,
} from '@/lib/pdfDesignPreset'
import type { DocumentResult } from '@/lib/Calculations'

type ProfessionalPdfDocument = {
  invoice_number?: string | null
  quotation_number?: string | null
  document_type?: string | null
  client_name?: string | null
  invoice_title?: string | null
  quotation_title?: string | null
  issue_date?: string | null
  due_date?: string | null
  valid_until?: string | null
  po_number?: string | null
  payment_terms?: string | null
  work_duration?: string | null
  notes?: string | null
  terms?: string | null
  amount_in_words?: string | null
  custom_fields?: unknown
}

type BankAccountRow = {
  id?: string | null
  bank_name?: string | null
  account_name?: string | null
  account_number?: string | null
  sort_code?: string | null
  is_default?: boolean | null
}

type PdfOutputState = {
  showBankDetails?: boolean
  bankAccountId?: string | null
  showFooter?: boolean
  showTagline?: boolean
  showBalanceDue?: boolean
}

type CustomFieldShape = {
  header?: Array<{ label?: unknown; value?: unknown }>
  bottom?: Array<{ text?: unknown }>
  attachments?: Array<{ label?: unknown; name?: unknown; url?: unknown }>
  columnConfig?: ColumnConfig[]
  groupMeta?: Record<string, { showSubtotal?: boolean }>
  notesTitle?: string
  termsTitle?: string
}

type ProfessionalPdfProps = {
  document: ProfessionalPdfDocument
  items?: InvoiceItem[]
  client?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
  computedResult: DocumentResult & {
    grandTotal?: number
    cashReceived?: number
    settledTotal?: number
    balanceDue?: number
  }
  pdfOutput?: PdfOutputState
  bankAccounts?: BankAccountRow[]
  designPreset?: PdfDesignPreset
}

type MetaEntry = {
  label: string
  value: string
}

function asText(value: unknown) {
  return String(value || '').trim()
}

function parseCustomFields(raw: unknown): CustomFieldShape {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as CustomFieldShape) : {}
    } catch {
      return {}
    }
  }
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as CustomFieldShape) : {}
}

function isQuotationDocument(document: ProfessionalPdfDocument) {
  return hasDisplayValue(document.quotation_number) || hasDisplayValue(document.valid_until)
}

function createStyles(designPreset?: PdfDesignPreset, presetType: PdfDesignPresetDocument = 'invoice') {
  const preset = designPreset || getDefaultPdfDesignPreset(presetType)
  const accent = preset.accentColor
  const accentStrong = darkenHex(accent, 16)
  const accentDark = darkenHex(accent, 24)
  const accentLine = lightenHex(accent, 30)
  const accentSoft = lightenHex(accent, 45)
  const accentMist = lightenHex(accent, 58)
  const neutralBorder = '#D7DEE7'
  const headerBold = resolvePdfFontFamily(preset.headerFont, 'bold')
  const bodyRegular = resolvePdfFontFamily(preset.bodyFont, 'regular')
  const fillableChoice = getEffectiveFillableFont(preset)
  const fillableRegular = resolvePdfFontFamily(fillableChoice, 'regular')
  const fillableBold = resolvePdfFontFamily(fillableChoice, 'bold')
  const fillableItalic = resolvePdfFontFamily(fillableChoice, 'italic')
  const fillableColor = preset.fillableColor

  const baseStyles = StyleSheet.create({
    page: {
      paddingTop: 42,
      paddingRight: 34,
      paddingBottom: 34,
      paddingLeft: 34,
      backgroundColor: '#FFFFFF',
      fontFamily: bodyRegular,
      fontSize: 8.8,
      color: fillableColor,
    },
    topSection: {
      paddingBottom: 14,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 18,
    },
    titleBlock: {
      flex: 1,
      paddingRight: 12,
    },
    docLabel: {
      fontSize: 23,
      fontFamily: headerBold,
      color: accentStrong,
      textTransform: 'uppercase',
      letterSpacing: 1.1,
      lineHeight: 1.05,
    },
    logo: {
      width: 108,
      maxHeight: 50,
      objectFit: 'contain',
    },
    metaStack: {
      marginTop: 12,
      width: 310,
      maxWidth: '100%',
    },
    metaRow: {
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 2.5,
    },
    metaLabel: {
      fontSize: 8,
      fontFamily: bodyRegular,
      color: accentDark,
      width: 112,
    },
    metaValue: {
      flex: 1,
      fontSize: 8.8,
      fontFamily: fillableBold,
      color: fillableColor,
      textAlign: 'left',
      lineHeight: 1.3,
    },
    cardRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
      alignItems: 'flex-start',
    },
    infoCard: {
      flex: 1,
      minHeight: 116,
      borderRadius: 8,
      backgroundColor: accentSoft,
      paddingTop: 13,
      paddingRight: 16,
      paddingBottom: 13,
      paddingLeft: 16,
    },
    cardLabel: {
      fontSize: 8,
      fontFamily: headerBold,
      color: accentDark,
      marginBottom: 6,
    },
    cardName: {
      fontSize: 9.9,
      fontFamily: fillableBold,
      color: fillableColor,
      lineHeight: 1.28,
      marginBottom: 3,
    },
    cardText: {
      fontSize: 8.2,
      fontFamily: fillableRegular,
      color: fillableColor,
      lineHeight: 1.38,
      marginBottom: 2,
    },
    subjectTitle: {
      marginTop: 10,
      marginBottom: 8,
      fontSize: 10.2,
      fontFamily: headerBold,
      color: accentDark,
      lineHeight: 1.25,
      textTransform: 'uppercase',
      letterSpacing: 0.45,
    },
    table: {
      marginTop: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: accentLine,
      borderRadius: 8,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: accent,
      paddingTop: 8,
      paddingBottom: 8,
      paddingHorizontal: 10,
      borderBottomWidth: 0.8,
      borderBottomColor: accentStrong,
    },
    thText: {
      fontSize: 7.8,
      fontFamily: headerBold,
      letterSpacing: 0.45,
      color: '#F8FAFC',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 8.5,
      paddingHorizontal: 10,
      borderBottomWidth: 0.6,
      borderBottomColor: accentLine,
      backgroundColor: '#FDFEFE',
    },
    tableRowAlt: {
      flexDirection: 'row',
      paddingVertical: 8.5,
      paddingHorizontal: 10,
      borderBottomWidth: 0.6,
      borderBottomColor: accentLine,
      backgroundColor: accentMist,
    },
    groupRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: accentDark,
    },
    groupText: {
      fontSize: 8.2,
      fontFamily: headerBold,
      color: '#FFFFFF',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    groupSubtotalRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingVertical: 7,
      paddingHorizontal: 10,
      backgroundColor: accentSoft,
      borderBottomWidth: 1,
      borderBottomColor: accentLine,
    },
    groupSubtotalLabel: {
      fontSize: 7.6,
      fontFamily: headerBold,
      color: accentDark,
      marginRight: 12,
    },
    groupSubtotalValue: {
      fontSize: 7.8,
      fontFamily: fillableBold,
      color: fillableColor,
    },
    descText: {
      fontSize: 8.3,
      fontFamily: fillableBold,
      color: fillableColor,
      lineHeight: 1.35,
    },
    subDescText: {
      marginTop: 2,
      fontSize: 7.2,
      fontFamily: fillableItalic,
      color: accentDark,
      lineHeight: 1.35,
    },
    totalsSection: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 12,
    },
    totalsBox: {
      width: 272,
      paddingTop: 6,
      paddingRight: 2,
      paddingBottom: 2,
      paddingLeft: 2,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
      gap: 12,
    },
    totalLabel: {
      fontSize: 9,
      fontFamily: bodyRegular,
      color: accentDark,
    },
    totalValue: {
      fontSize: 9,
      fontFamily: fillableBold,
      color: fillableColor,
      textAlign: 'right',
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 7,
      paddingTop: 8,
      borderTopWidth: 1.2,
      borderTopColor: accentDark,
      borderBottomWidth: 1.2,
      borderBottomColor: accentDark,
      paddingBottom: 6,
    },
    grandLabel: {
      fontSize: 10.5,
      fontFamily: headerBold,
      color: accentDark,
    },
    grandValue: {
      fontSize: 11.6,
      fontFamily: fillableBold,
      color: fillableColor,
    },
    whtRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
      paddingTop: 5,
      borderTopWidth: 1,
      borderTopColor: neutralBorder,
    },
    payableRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingTop: 7,
      borderTopWidth: 1.1,
      borderTopColor: accentDark,
    },
    payableLabel: {
      fontSize: 10.2,
      fontFamily: headerBold,
      color: accentDark,
    },
    payableValue: {
      fontSize: 11.4,
      fontFamily: fillableBold,
      color: fillableColor,
    },
    amountWords: {
      marginBottom: 10,
      marginTop: 1,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: accentMist,
      borderRadius: 7,
      borderLeftWidth: 2,
      borderLeftColor: accent,
    },
    amountWordsText: {
      fontSize: 8,
      fontFamily: fillableItalic,
      color: fillableColor,
      lineHeight: 1.45,
    },
    supportCard: {
      marginBottom: 8,
      paddingTop: 10,
      paddingRight: 12,
      paddingBottom: 10,
      paddingLeft: 12,
      borderWidth: 1,
      borderColor: neutralBorder,
      borderRadius: 8,
      backgroundColor: accentMist,
    },
    supportTitle: {
      fontSize: 7.9,
      fontFamily: headerBold,
      color: accentDark,
      marginBottom: 5,
    },
    supportText: {
      fontSize: 8.3,
      fontFamily: fillableRegular,
      color: fillableColor,
      lineHeight: 1.4,
      marginBottom: 3,
    },
    docItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      gap: 4,
    },
    docLink: {
      fontSize: 8.1,
      fontFamily: fillableRegular,
      color: accentStrong,
      textDecoration: 'underline',
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: accentLine,
      marginTop: 8,
      paddingTop: 8,
    },
    footerText: {
      fontSize: 7.4,
      fontFamily: bodyRegular,
      color: fillableColor,
      textAlign: 'center',
      lineHeight: 1.6,
    },
  })

  return {
    ...baseStyles,
    groupDividerColor: accentLine,
    rowNumberColor: accentDark,
    cellMutedColor: accentDark,
    cellValueColor: fillableColor,
    negativeValueColor: '#b91c1c',
    payableNegativeColor: '#b91c1c',
    payablePositiveColor: accentDark,
  }
}

function getCompanyLines(source: {
  companyTagline: string
  companyAddress: string
  companyCity: string
  companyPhone: string
  companyEmail: string
}) {
  return [
    source.companyAddress,
    source.companyCity,
    source.companyPhone,
    source.companyEmail,
  ].filter((line) => hasDisplayValue(line))
}

function getClientLines(client?: Record<string, unknown> | null) {
  return [
    client?.contact_person ? `Attn: ${String(client.contact_person)}` : '',
    client?.address,
    [client?.city, client?.state].filter(Boolean).join(', '),
    client?.phone,
    client?.email,
  ]
    .map((line) => asText(line))
    .filter((line) => hasDisplayValue(line))
}

function pickBankAccount(pdfOutput?: PdfOutputState, bankAccounts: BankAccountRow[] = []) {
  if (!pdfOutput?.showBankDetails) return null
  return (
    bankAccounts.find((account) => account.id && account.id === pdfOutput.bankAccountId) ||
    bankAccounts.find((account) => account.is_default) ||
    bankAccounts[0] ||
    null
  )
}

function normalizeInvoice(document: ProfessionalPdfDocument, items: InvoiceItem[], client: Record<string, unknown> | null, settings: Record<string, unknown> | null, computedResult: ProfessionalPdfProps['computedResult']) {
  const d = extractInvoiceData(document, items, client, settings || {}, computedResult)

  return {
    presetType: 'invoice' as PdfDesignPresetDocument,
    documentLabel: asText(document.document_type) || 'INVOICE',
    documentNumber: asText(document.invoice_number) || 'Invoice',
    subjectTitle: asText(document.invoice_title),
    companyName: d.companyName,
    companyTagline: asText(d.companyTagline),
    companyLines: getCompanyLines(d),
    logoUrl: asText(d.logoUrl) || asText(settings?.company_logo_url),
    clientName: asText(document.client_name) || 'Unassigned client',
    clientLines: getClientLines(client),
    metaRows: [
      { label: 'Invoice No #', value: asText(document.invoice_number) },
      { label: 'Invoice Date', value: asText(document.issue_date) },
      { label: 'Due Date', value: asText(document.due_date) },
      ...d.referenceMeta.map((entry: MetaEntry) => ({ label: entry.label, value: asText(entry.value) })),
    ].filter((entry) => hasDisplayValue(entry.value)),
    renderRows: d.renderRows,
    columns: d.pdfColumns,
    showInstallRate: d.isColVisible('install_rate'),
    showMake: d.isColVisible('make'),
    showVatRate: d.isColVisible('vat_rate'),
    showDiscountRate: d.isColVisible('discount_rate'),
    notesTitle: d.cf.notesTitle || 'Notes',
    termsTitle: d.cf.termsTitle || 'Terms and Conditions',
    notesText: stripHtml(asText(document.notes)),
    termsText: stripHtml(asText(document.terms)),
    bottomFields: (d.cf.bottom || [])
      .map((field: { text?: unknown }) => asText(field.text))
      .filter((line: string) => hasDisplayValue(line)),
    attachments: d.validAttachments,
    footerText: asText(d.footerText),
    amountInWords: asText(document.amount_in_words),
  }
}

function normalizeQuotation(document: ProfessionalPdfDocument, items: InvoiceItem[], client: Record<string, unknown> | null, settings: Record<string, unknown> | null, computedResult: ProfessionalPdfProps['computedResult']) {
  const cf = parseCustomFields(document.custom_fields)
  const columns = cf.columnConfig?.length ? cf.columnConfig : BUILTIN_COLUMNS
  const isVisible = (key: string) => {
    const column = columns.find((entry) => entry.key === key)
    return column ? column.visible !== false : true
  }
  const renderRows = buildRenderRows({
    rawItems: items,
    computedItems: computedResult.items || [],
    groups: computedResult.groups || [],
    groupMeta: cf.groupMeta || {},
  })
  const company = {
    companyName: asText(settings?.company_name),
    companyTagline: asText(settings?.company_tagline),
    companyAddress: asText(settings?.company_address),
    companyCity: asText(settings?.company_city),
    companyPhone: asText(settings?.company_phone),
    companyEmail: asText(settings?.company_email),
  }

  return {
    presetType: 'quotation' as PdfDesignPresetDocument,
    documentLabel: 'QUOTATION',
    documentNumber: asText(document.quotation_number) || 'Quotation',
    subjectTitle: asText(document.quotation_title),
    companyName: company.companyName,
    companyTagline: company.companyTagline,
    companyLines: getCompanyLines(company),
    logoUrl: asText(settings?.company_logo_url) || asText(settings?.logo_url),
    clientName: asText(document.client_name) || 'Unassigned client',
    clientLines: getClientLines(client),
    metaRows: [
      { label: 'Quotation No #', value: asText(document.quotation_number) },
      { label: 'Issue Date', value: asText(document.issue_date) },
      { label: 'Valid Until', value: asText(document.valid_until) },
      { label: 'P.O. Number', value: asText(document.po_number) },
      { label: 'Payment Terms', value: asText(document.payment_terms) },
      { label: 'Work Duration', value: asText(document.work_duration) },
      ...getHeaderFields(cf).map((field) => ({
        label: asText(field?.label),
        value: asText(field?.value),
      })),
    ].filter((entry) => hasDisplayValue(entry.value)),
    renderRows,
    columns: getPdfColumns(columns),
    showInstallRate: isVisible('install_rate') && Number(computedResult.installRateTotal || 0) > 0,
    showMake: isVisible('make'),
    showVatRate: isVisible('vat_rate'),
    showDiscountRate: isVisible('discount_rate'),
    notesTitle: cf.notesTitle || 'Notes',
    termsTitle: cf.termsTitle || 'Terms and Conditions',
    notesText: stripHtml(asText(document.notes)),
    termsText: stripHtml(asText(document.terms)),
    bottomFields: (cf.bottom || [])
      .map((field) => asText(field?.text))
      .filter((line) => hasDisplayValue(line)),
    attachments: (cf.attachments || [])
      .map((attachment) => ({
        label: asText(attachment.label) || asText(attachment.name),
        url: asText(attachment.url),
      }))
      .filter((attachment) => hasDisplayValue(attachment.label) && hasDisplayValue(attachment.url)),
    footerText: asText(settings?.footer_text),
    amountInWords: asText(document.amount_in_words),
  }
}

function buildDescriptionExtras(
  item: InvoiceItem,
  config: { showMake: boolean; showVatRate: boolean; showDiscountRate: boolean },
) {
  return [
    config.showMake && asText(item.make) ? `Make: ${asText(item.make)}` : '',
    config.showVatRate && hasDisplayValue(item.vat_rate)
      ? `VAT ${Number(item.vat_rate).toLocaleString('en-NG', { maximumFractionDigits: 2 })}%`
      : '',
    config.showDiscountRate && hasDisplayValue(item.discount_rate)
      ? `Discount ${Number(item.discount_rate).toLocaleString('en-NG', { maximumFractionDigits: 2 })}%`
      : '',
  ].filter((line) => hasDisplayValue(line))
}

export default function InvoicePDF_Professional({
  document,
  items = [],
  client = null,
  settings = null,
  computedResult,
  pdfOutput,
  bankAccounts = [],
  designPreset,
}: ProfessionalPdfProps) {
  const doc = isQuotationDocument(document)
    ? normalizeQuotation(document, items, client, settings, computedResult)
    : normalizeInvoice(document, items, client, settings, computedResult)
  const styles = createStyles(designPreset, doc.presetType)
  const selectedBank = pickBankAccount(pdfOutput, bankAccounts)
  const showFooter = pdfOutput?.showFooter !== false
  const showTagline = pdfOutput?.showTagline !== false
  const columns = doc.columns.filter((column) => {
    if (column.key === 'install_rate') return doc.showInstallRate
    return true
  })
  const columnStyle = (column: { key: string; pdfFlex: number; align: string }, extra: Record<string, unknown> = {}) => ({
    flex: column.pdfFlex,
    textAlign: column.align,
    ...extra,
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topSection}>
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.docLabel}>{doc.documentLabel}</Text>
            </View>
            {doc.logoUrl ? <Image src={doc.logoUrl} style={styles.logo} /> : null}
          </View>

          {doc.metaRows.length > 0 ? (
            <View style={styles.metaStack}>
              {doc.metaRows.map((entry) => (
                <View key={`${entry.label}_${entry.value}`} style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{entry.label}</Text>
                  <Text style={styles.metaValue}>{entry.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.cardRow}>
              <View style={styles.infoCard}>
              <Text style={styles.cardLabel}>Billed By</Text>
              <Text style={styles.cardName}>{doc.companyName || 'Company'}</Text>
              {showTagline && doc.companyTagline ? (
                <Text style={styles.cardText}>{doc.companyTagline}</Text>
              ) : null}
              {doc.companyLines.map((line) => (
                <Text key={`company_${line}`} style={styles.cardText}>
                  {line}
                </Text>
              ))}
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.cardLabel}>Billed To</Text>
              <Text style={styles.cardName}>{doc.clientName}</Text>
              {doc.clientLines.map((line) => (
                <Text key={`client_${line}`} style={styles.cardText}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {doc.subjectTitle ? <Text style={styles.subjectTitle}>{doc.subjectTitle}</Text> : null}

        {renderItemsTable({
          rows: doc.renderRows,
          columns,
          styles,
          getColumnStyle: columnStyle,
          getDescriptionExtras: (item) =>
            buildDescriptionExtras(item, {
              showMake: doc.showMake,
              showVatRate: doc.showVatRate,
              showDiscountRate: doc.showDiscountRate,
            }),
        })}

        {renderTotals({
          result: computedResult,
          styles,
          showInstallRate: doc.showInstallRate,
          amountInWords: doc.amountInWords,
          totalLabel: isQuotationDocument(document) ? 'Total Payable' : 'Balance Due',
          includeGrandTotal: !isQuotationDocument(document),
          showBalanceDue: pdfOutput?.showBalanceDue !== false,
        })}

        {selectedBank ? (
          <View style={styles.supportCard} wrap={false}>
            <Text style={styles.supportTitle}>Bank Details</Text>
            {asText(selectedBank.bank_name) ? <Text style={styles.supportText}>{asText(selectedBank.bank_name)}</Text> : null}
            {asText(selectedBank.account_name) ? <Text style={styles.supportText}>{asText(selectedBank.account_name)}</Text> : null}
            {asText(selectedBank.account_number) ? <Text style={styles.supportText}>{asText(selectedBank.account_number)}</Text> : null}
            {asText(selectedBank.sort_code) ? <Text style={styles.supportText}>Sort Code: {asText(selectedBank.sort_code)}</Text> : null}
          </View>
        ) : null}

        {doc.notesText ? (
          <View style={styles.supportCard} wrap={false}>
            <Text style={styles.supportTitle}>{doc.notesTitle}</Text>
            <Text style={styles.supportText}>{doc.notesText}</Text>
          </View>
        ) : null}

        {doc.termsText ? (
          <View style={styles.supportCard} wrap={false}>
            <Text style={styles.supportTitle}>{doc.termsTitle}</Text>
            <Text style={styles.supportText}>{doc.termsText}</Text>
          </View>
        ) : null}

        {doc.bottomFields.length > 0 ? (
          <View style={styles.supportCard} wrap={false}>
            <Text style={styles.supportTitle}>Additional Notes</Text>
            {doc.bottomFields.map((line, index) => (
              <Text key={`bottom_${index}`} style={styles.supportText}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}

        {doc.attachments.length > 0 ? (
          <View style={styles.supportCard} wrap={false}>
            <Text style={styles.supportTitle}>Supporting Documents</Text>
            {doc.attachments.map((attachment, index) => (
              <View key={`attachment_${index}`} style={styles.docItem}>
                <Text style={styles.supportText}>Attachment:</Text>
                <Link src={attachment.url} style={styles.docLink}>
                  {attachment.label}
                </Link>
              </View>
            ))}
          </View>
        ) : null}

        {showFooter && doc.footerText ? (
          <View style={styles.footer} wrap={false}>
            <Text style={styles.footerText}>{doc.footerText}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
