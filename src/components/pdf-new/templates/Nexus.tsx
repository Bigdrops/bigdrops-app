import { Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type {
  PdfColumnDefinition,
  PdfDocumentModel,
  PdfLineItem,
  PdfTotalRow,
} from '../types'

type TemplateProps = {
  data: PdfDocumentModel
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#0b4f6c',
    paddingBottom: 14,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  metaItem: {
    marginRight: 16,
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 10,
    color: '#4b6589',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  logo: {
    maxHeight: 60,
    maxWidth: 160,
  },
  partyRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 20,
  },
  partyCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d9e1ec',
    padding: 12,
  },
  partyCardSpacer: {
    marginRight: 10,
  },
  partyLabel: {
    fontSize: 10,
    color: '#4b6589',
    marginBottom: 4,
  },
  partyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  partyText: {
    fontSize: 12,
    marginBottom: 2,
  },
  tableWrapper: {
    marginTop: 16,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#cfddee',
    paddingVertical: 6,
  },
  tableHeader: {
    backgroundColor: '#1c3347',
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingRight: 6,
  },
  tableCell: {
    paddingRight: 6,
  },
  tableCellText: {
    fontSize: 12,
  },
  groupRow: {
    backgroundColor: '#e4ecf7',
  },
  groupText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  descWrap: {
    flexDirection: 'row',
  },
  image: {
    width: 36,
    height: 36,
    marginRight: 6,
  },
  subDesc: {
    fontSize: 10,
    color: '#555555',
  },
  totalsContainer: {
    alignItems: 'flex-end',
    marginTop: 20,
  },
  totalsBox: {
    width: 300,
    borderWidth: 1,
    borderColor: '#bdcfe2',
    padding: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalMainText: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  advanceBox: {
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#c07c2c',
    paddingLeft: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    marginTop: 24,
  },
  leftCol: {
    flex: 2,
    marginRight: 12,
  },
  rightCol: {
    flex: 1,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 11,
  },
  signatureName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
  },
  signatureRole: {
    fontSize: 11,
    marginTop: 2,
  },
  footer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 10,
  },
})

function formatAmount(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function resolveColumnFlex(column: PdfColumnDefinition) {
  switch (column.key) {
    case 'description':
      return { flex: 2.4 }
    case 'quantity':
    case 'unit':
    case 'vat_rate':
    case 'discount_rate':
      return { flex: 0.8 }
    case 'num':
      return { flex: 0.6 }
    default:
      return { flex: 1 }
  }
}

function renderCellValue(row: PdfLineItem, column: PdfColumnDefinition, mergeQtyUnit: boolean) {
  switch (column.key) {
    case 'num':
      return ''
    case 'description':
      return row.description || ''
    case 'make':
      return row.make || ''
    case 'quantity':
      if (mergeQtyUnit) {
        const quantity = row.quantity ?? ''
        const unit = row.unit || ''
        return `${quantity}${unit ? ` ${unit}` : ''}`.trim()
      }
      return row.quantity ?? ''
    case 'unit':
      return row.unit || ''
    case 'unit_price':
      return formatAmount(row.unitPrice)
    case 'install_rate':
      return formatAmount(row.installRate)
    case 'vat_rate':
      return row.vatRate ?? ''
    case 'discount_rate':
      return row.discountRate ?? ''
    case 'amount':
      return formatAmount(row.amount)
    default:
      return row.customData?.[column.key] ?? ''
  }
}

function Section({ title, content }: { title: string; content?: string | null }) {
  if (!content) return null

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{content}</Text>
    </View>
  )
}

const Template = ({ data }: TemplateProps) => {
  const documentTitle = data.identity.title || (data.identity.kind === 'invoice' ? 'Invoice' : 'Quotation')
  const documentNumberLabel = data.identity.kind === 'invoice' ? 'Invoice Number' : 'Quotation Number'
  const secondaryDateLabel = data.identity.kind === 'invoice' ? 'Due Date' : 'Valid Until'
  const secondaryDateValue = data.identity.kind === 'invoice' ? data.identity.dueDate : data.identity.validUntil
  const headerFields = [
    { label: documentNumberLabel, value: data.identity.number },
    { label: 'Issue Date', value: data.identity.issueDate || '' },
    ...(secondaryDateValue ? [{ label: secondaryDateLabel, value: secondaryDateValue }] : []),
    ...(data.headerFields || []),
  ].filter((field, index, allFields) => field.value && allFields.findIndex((item) => item.label === field.label) === index)
  const columns = data.columns || []
  const rows = data.items || []
  const totals = data.totals?.rows || []
  const notesText = data.notes?.content || null
  const termsText = data.terms?.content || null

  return (
    <Page size="A4" style={styles.page}>
      {(documentTitle || headerFields.length > 0 || data.logo?.imageUrl) && (
        <View style={styles.header}>
          <View>
            {documentTitle ? <Text style={styles.title}>{documentTitle}</Text> : null}

            {headerFields.length > 0 ? (
              <View style={styles.metaRow}>
                {headerFields.map((field) => (
                  <View key={field.label} style={styles.metaItem}>
                    <Text style={styles.metaLabel}>{field.label}</Text>
                    <Text style={styles.metaValue}>{field.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {data.logo?.imageUrl ? (
            <Image src={data.logo.imageUrl} style={styles.logo} />
          ) : null}
        </View>
      )}

      {(data.issuer || data.recipient) && (
        <View style={styles.partyRow}>
          {data.issuer ? (
            <View style={[styles.partyCard, data.recipient ? styles.partyCardSpacer : null]}>
              {data.issuer.label ? <Text style={styles.partyLabel}>{data.issuer.label}</Text> : null}
              {data.issuer.name ? <Text style={styles.partyName}>{data.issuer.name}</Text> : null}
              {(data.issuer.addressLines || []).map((line, index) => (
                <Text key={`issuer-line-${index}`} style={styles.partyText}>{line}</Text>
              ))}
              {data.issuer.phone ? <Text style={styles.partyText}>{data.issuer.phone}</Text> : null}
              {data.issuer.email ? <Text style={styles.partyText}>{data.issuer.email}</Text> : null}
              {data.issuer.taxId ? <Text style={styles.partyText}>{data.issuer.taxId}</Text> : null}
            </View>
          ) : null}

          {data.recipient ? (
            <View style={styles.partyCard}>
              {data.recipient.label ? <Text style={styles.partyLabel}>{data.recipient.label}</Text> : null}
              {data.recipient.name ? <Text style={styles.partyName}>{data.recipient.name}</Text> : null}
              {data.recipient.attention ? <Text style={styles.partyText}>{data.recipient.attention}</Text> : null}
              {(data.recipient.addressLines || []).map((line, index) => (
                <Text key={`recipient-line-${index}`} style={styles.partyText}>{line}</Text>
              ))}
              {data.recipient.phone ? <Text style={styles.partyText}>{data.recipient.phone}</Text> : null}
              {data.recipient.email ? <Text style={styles.partyText}>{data.recipient.email}</Text> : null}
            </View>
          ) : null}
        </View>
      )}

      {columns.length > 0 ? (
        <View style={styles.tableWrapper}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            {columns.map((column) => (
              <Text key={column.key} style={[styles.tableHeaderText, resolveColumnFlex(column)]}>
                {column.label}
              </Text>
            ))}
          </View>

          {rows.map((row, index) => {
            if (row.rowType === 'group_header') {
              return (
                <View key={row.id || index} style={[styles.tableRow, styles.groupRow]}>
                  <Text style={styles.groupText}>{row.groupLabel || ''}</Text>
                </View>
              )
            }

            return (
              <View key={row.id || index} style={styles.tableRow}>
                {columns.map((column) => {
                  if (column.key === 'description') {
                    return (
                      <View key={column.key} style={[styles.tableCell, resolveColumnFlex(column)]}>
                        <View style={styles.descWrap}>
                          {row.imageUrl ? <Image src={row.imageUrl} style={styles.image} /> : null}
                          <View>
                            <Text style={styles.tableCellText}>{renderCellValue(row, column, data.mergeQtyUnit === true)}</Text>
                            {row.subDescription ? <Text style={styles.subDesc}>{row.subDescription}</Text> : null}
                          </View>
                        </View>
                      </View>
                    )
                  }

                  return (
                    <View key={column.key} style={[styles.tableCell, resolveColumnFlex(column)]}>
                      <Text style={styles.tableCellText}>{String(renderCellValue(row, column, data.mergeQtyUnit === true))}</Text>
                    </View>
                  )
                })}
              </View>
            )
          })}
        </View>
      ) : null}

      {totals.length > 0 || data.totals?.advanceSummary ? (
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            {totals.map((line: PdfTotalRow, index) => (
              <View key={line.key || index} style={styles.totalRow}>
                <Text style={line.emphasis ? styles.totalMainText : null}>{line.label}</Text>
                <Text style={line.emphasis ? styles.totalMainText : null}>{formatAmount(line.amount)}</Text>
              </View>
            ))}

            {data.totals?.advanceSummary ? (
              <View style={styles.advanceBox}>
                {data.totals.advanceSummary.primaryLabel ? (
                  <Text>{data.totals.advanceSummary.primaryLabel}</Text>
                ) : null}
                <Text>{formatAmount(data.totals.advanceSummary.requestedAmount)}</Text>
                {data.totals.advanceSummary.secondaryLabel ? (
                  <Text>{data.totals.advanceSummary.secondaryLabel}</Text>
                ) : null}
                <Text>{formatAmount(data.totals.advanceSummary.balanceRemaining)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {(notesText || termsText || data.signature) ? (
        <View style={styles.bottomRow}>
          <View style={styles.leftCol}>
            <Section title={data.notes?.title || 'Notes'} content={notesText} />
            <Section title={data.terms?.title || 'Terms'} content={termsText} />
          </View>

          <View style={styles.rightCol}>
            {data.signature ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Signature</Text>
                {data.signature.imageUrl ? <Image src={data.signature.imageUrl} style={styles.logo} /> : null}
                {data.signature.name ? <Text style={styles.signatureName}>{data.signature.name}</Text> : null}
                {data.signature.role ? <Text style={styles.signatureRole}>{data.signature.role}</Text> : null}
                {data.signature.signedAt ? <Text style={styles.sectionText}>{data.signature.signedAt}</Text> : null}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {(data.footerText || data.identity.number || data.metaFooter?.companyName) ? (
        <View style={styles.footer}>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
          <Text style={styles.footerText}>{data.identity.number}</Text>
          <Text style={styles.footerText}>{data.metaFooter?.companyName || data.footerText || ''}</Text>
        </View>
      ) : null}
    </Page>
  )
}

export default Template
