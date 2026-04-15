import { Image, StyleSheet, Text, View, Link } from '@react-pdf/renderer'
import { resolvePdfFontFamily } from '@/lib/pdfDesignPreset'
import { buildPdfTableColumns, renderPdfLineCell } from '../table'
import type { PdfDocumentModel, PdfTextAlign } from '../types'

type MinimalPdfTemplateProps = {
  model: PdfDocumentModel
}

type MinimalPalette = {
  pageBackground: string
  title: string
  heading: string
  text: string
  muted: string
  tableHeaderBg: string
  tableHeaderText: string
  border: string
  primary: string
  primarySoft: string
  danger: string
  success: string
}

function clamp(value: number, min = 0, max = 255) {
  return Math.min(max, Math.max(min, value))
}

function shiftHex(hex: string, delta: number) {
  const raw = String(hex || '').replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return '#0f172a'
  const value = Number.parseInt(raw, 16)
  const r = clamp((value >> 16) + delta)
  const g = clamp(((value >> 8) & 0xff) + delta)
  const b = clamp((value & 0xff) + delta)
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`
}

function buildPalette(model: PdfDocumentModel): MinimalPalette {
  const base = model.identity.kind === 'invoice'
    ? {
        pageBackground: '#ffffff',
        title: '#0f172a',
        heading: '#334155',
        text: '#0f172a',
        muted: '#64748b',
        tableHeaderBg: '#f1f5f9',
        tableHeaderText: '#334155',
        border: '#cbd5e1',
        primary: '#0f766e',
        primarySoft: '#f0fdfa',
        danger: '#b91c1c',
        success: '#047857',
      }
    : {
        pageBackground: '#ffffff',
        title: '#111827',
        heading: '#1f2937',
        text: '#111827',
        muted: '#6b7280',
        tableHeaderBg: '#f8fafc',
        tableHeaderText: '#1f2937',
        border: '#d1d5db',
        primary: '#1d4ed8',
        primarySoft: '#eff6ff',
        danger: '#b91c1c',
        success: '#065f46',
      }

  const preset = model.template?.designPreset
  if (!preset?.useCustomColors) return base

  const accent = String(preset.accentColor || '').trim()
  if (!accent) return base

  return {
    ...base,
    heading: shiftHex(accent, -24),
    title: shiftHex(accent, -40),
    primary: shiftHex(accent, -16),
    primarySoft: shiftHex(accent, 220),
    tableHeaderBg: shiftHex(accent, 224),
    tableHeaderText: shiftHex(accent, -32),
    border: shiftHex(accent, 140),
  }
}

function styleForAlign(align?: PdfTextAlign) {
  if (align === 'center') return { textAlign: 'center' as const }
  if (align === 'right') return { textAlign: 'right' as const }
  return { textAlign: 'left' as const }
}

function formatMoney(value?: number | null, currency?: string | null) {
  const amount = Number(value || 0)
  const code = String(currency || 'NGN').trim() || 'NGN'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
}

function textToPlain(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function renderPartyBlock(label: string, party?: PdfDocumentModel['issuer']) {
  const lines = [
    party?.attention,
    ...(party?.addressLines || []),
    party?.phone,
    party?.email,
    party?.taxId,
  ].filter((entry) => String(entry || '').trim().length > 0)

  if (!party?.name && lines.length === 0) return null

  return { label, name: party?.name, lines }
}

export function MinimalPdfTemplate({ model }: MinimalPdfTemplateProps) {
  const palette = buildPalette(model)
  const headerFont = model.template?.fontConfig?.useCustomFonts
    ? resolvePdfFontFamily((model.template?.fontConfig?.headerFont || 'Inter') as any)
    : 'Helvetica-Bold'
  const bodyFont = model.template?.fontConfig?.useCustomFonts
    ? resolvePdfFontFamily((model.template?.fontConfig?.bodyFont || 'Inter') as any)
    : 'Helvetica'

  const styles = StyleSheet.create({
    root: { backgroundColor: palette.pageBackground, color: palette.text, fontFamily: bodyFont },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
    logo: { width: 88, height: 52, objectFit: 'contain' },
    titleWrap: { alignItems: 'flex-end', flexShrink: 1 },
    title: { fontSize: 18, color: palette.title, fontFamily: headerFont, textTransform: 'uppercase' },
    number: { fontSize: 11, color: palette.heading, marginTop: 3 },
    headerMeta: { marginTop: 4, gap: 2, alignItems: 'flex-end' },
    metaText: { fontSize: 9, color: palette.muted },
    sectionLabel: {
      fontSize: 8.5,
      color: palette.heading,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
      fontFamily: headerFont,
    },
    twoCol: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
    block: { flex: 1, borderWidth: 0.8, borderColor: palette.border, borderRadius: 3, padding: 8 },
    blockName: { fontFamily: headerFont, fontSize: 10, marginBottom: 2, color: palette.text },
    blockLine: { fontSize: 9, color: palette.muted, marginBottom: 1 },
    headerFields: { marginBottom: 8, gap: 2 },
    headerField: { flexDirection: 'row', gap: 5 },
    headerFieldLabel: { fontSize: 9, color: palette.muted, fontFamily: headerFont },
    headerFieldValue: { fontSize: 9, color: palette.text, flexShrink: 1 },
    table: { borderWidth: 0.8, borderColor: palette.border, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
    row: { flexDirection: 'row', borderBottomWidth: 0.6, borderBottomColor: palette.border },
    headerRow: { backgroundColor: palette.tableHeaderBg },
    cell: { paddingVertical: 6, paddingHorizontal: 5, fontSize: 9, color: palette.text },
    headerCell: { fontSize: 8.5, fontFamily: headerFont, color: palette.tableHeaderText, textTransform: 'uppercase' },
    groupRow: { backgroundColor: palette.primarySoft },
    groupText: { fontSize: 9, paddingVertical: 6, paddingHorizontal: 5, fontFamily: headerFont, color: palette.primary },
    image: { width: 24, height: 24, objectFit: 'cover', borderRadius: 2, marginTop: 3 },
    totalsWrap: { alignSelf: 'flex-end', width: '55%', minWidth: 220, marginBottom: 10 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 8 },
    totalLabel: { fontSize: 9, color: palette.heading },
    totalValue: { fontSize: 9, color: palette.text, textAlign: 'right' },
    totalLabelStrong: { fontFamily: headerFont, color: palette.title },
    totalValueStrong: { fontFamily: headerFont, color: palette.title },
    totalPrimary: { color: palette.primary },
    totalDanger: { color: palette.danger },
    totalSuccess: { color: palette.success },
    amountWords: { marginTop: 6, fontSize: 9, color: palette.muted },
    section: { marginBottom: 8 },
    sectionTitle: { fontFamily: headerFont, color: palette.heading, fontSize: 10, marginBottom: 3 },
    sectionBody: { fontSize: 9, color: palette.text },
    linksList: { gap: 2, marginTop: 2 },
    linkText: { fontSize: 9, color: palette.primary, textDecoration: 'none' },
    signatureWrap: { marginTop: 12, width: 190 },
    signatureImage: { width: 120, height: 44, objectFit: 'contain', marginBottom: 3 },
    divider: { marginTop: 4, borderBottomWidth: 0.8, borderBottomColor: palette.border },
    signatureName: { marginTop: 3, fontFamily: headerFont, fontSize: 9 },
    signatureRole: { fontSize: 8.5, color: palette.muted },
    footerText: { fontSize: 8.5, color: palette.muted, marginTop: 6 },
    tagline: { fontSize: 8.5, color: palette.heading, marginTop: 2 },
  })

  const issuerBlock = renderPartyBlock(model.issuer?.label || 'From', model.issuer)
  const recipientBlock = renderPartyBlock(model.recipient?.label || (model.identity.kind === 'invoice' ? 'Bill To' : 'Prepared For'), model.recipient)
  const visibleColumns = buildPdfTableColumns(model.columns || [], { mergeQtyUnit: model.mergeQtyUnit === true })

  const headerMeta: Array<{ label: string; value?: string | null }> = [
    { label: 'Issue Date', value: model.identity.issueDate },
    { label: model.identity.kind === 'invoice' ? 'Due Date' : 'Validity', value: model.identity.kind === 'invoice' ? model.identity.dueDate : model.identity.validUntil },
    { label: 'PO Number', value: model.identity.poNumber },
  ].filter((entry) => String(entry.value || '').trim().length > 0)

  const totalRows = model.totals.mode === 'advance' && model.totals.advanceSummary
    ? [
        {
          label: model.totals.advanceSummary.secondaryLabel || 'Contract / Grand Total',
          amount: model.totals.advanceSummary.contractValue,
          tone: 'muted' as const,
        },
        {
          label: model.totals.advanceSummary.primaryLabel || 'Requested Advance',
          amount: model.totals.advanceSummary.requestedAmount,
          tone: 'primary' as const,
          emphasis: true,
        },
        {
          label: 'Remaining Balance',
          amount: model.totals.advanceSummary.balanceRemaining,
          tone: model.totals.advanceSummary.balanceRemaining > 0 ? 'danger' : 'success',
          emphasis: true,
        },
      ]
    : model.totals.rows

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View>
          {model.logo?.imageUrl ? <Image src={model.logo.imageUrl} style={styles.logo} /> : null}
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{model.identity.title || (model.identity.kind === 'invoice' ? 'Invoice' : 'Quotation')}</Text>
          <Text style={styles.number}>{model.identity.number}</Text>
          <View style={styles.headerMeta}>
            {headerMeta.map((entry) => (
              <Text key={`meta-${entry.label}`} style={styles.metaText}>{`${entry.label}: ${entry.value}`}</Text>
            ))}
          </View>
        </View>
      </View>

      {model.headerFields && model.headerFields.length > 0 ? (
        <View style={styles.headerFields}>
          {model.headerFields.map((field, index) => (
            <View style={styles.headerField} key={`header-field-${index}`}>
              <Text style={styles.headerFieldLabel}>{field.label}:</Text>
              <Text style={styles.headerFieldValue}>{field.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {(issuerBlock || recipientBlock) ? (
        <View style={styles.twoCol}>
          <View style={styles.block}>
            {issuerBlock ? (
              <>
                <Text style={styles.sectionLabel}>{issuerBlock.label}</Text>
                {issuerBlock.name ? <Text style={styles.blockName}>{issuerBlock.name}</Text> : null}
                {issuerBlock.lines.map((line, index) => (
                  <Text key={`issuer-${index}`} style={styles.blockLine}>{line}</Text>
                ))}
              </>
            ) : null}
          </View>
          <View style={styles.block}>
            {recipientBlock ? (
              <>
                <Text style={styles.sectionLabel}>{recipientBlock.label}</Text>
                {recipientBlock.name ? <Text style={styles.blockName}>{recipientBlock.name}</Text> : null}
                {recipientBlock.lines.map((line, index) => (
                  <Text key={`recipient-${index}`} style={styles.blockLine}>{line}</Text>
                ))}
              </>
            ) : null}
          </View>
        </View>
      ) : null}

      {model.items.length > 0 ? (
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            {visibleColumns.map((column) => (
              <Text key={`head-${column.key}`} style={[styles.cell, styles.headerCell, { flex: column.key === 'description' ? 2.1 : 1 }, styleForAlign(column.align)]}>
                {column.label}
              </Text>
            ))}
          </View>
          {(() => {
            let lineNumber = 0

            return model.items.map((item, index) => {
              if (item.rowType === 'group_header') {
                return (
                  <View key={item.id || `item-${index}`} style={[styles.row, styles.groupRow]} wrap={false}>
                    <Text style={styles.groupText}>{item.groupLabel || item.description || `Group ${index + 1}`}</Text>
                  </View>
                )
              }

              lineNumber += 1

              return (
                <View key={item.id || `item-${index}`} style={styles.row}>
                  {visibleColumns.map((column) => (
                    <View key={`${item.id}-${column.key}`} style={[styles.cell, { flex: column.key === 'description' ? 2.1 : 1 }]}>
                      <Text style={styleForAlign(column.align)}>
                        {renderPdfLineCell(item, column.key, {
                          mergeQtyUnit: model.mergeQtyUnit === true,
                          currency: model.identity.currency,
                          rowNumber: lineNumber,
                        })}
                      </Text>
                      {column.key === 'description' && item.imageUrl ? <Image src={item.imageUrl} style={styles.image} /> : null}
                    </View>
                  ))}
                </View>
              )
            })
          })()}
        </View>
      ) : null}

      {totalRows.length > 0 ? (
        <View style={styles.totalsWrap}>
          {totalRows.map((row, index) => (
            <View style={styles.totalRow} key={`total-${row.key || row.label}-${index}`}>
              <Text style={[styles.totalLabel, row.emphasis ? styles.totalLabelStrong : undefined]}>{row.label}</Text>
              <Text
                style={[
                  styles.totalValue,
                  row.emphasis ? styles.totalValueStrong : undefined,
                  row.tone === 'primary' ? styles.totalPrimary : undefined,
                  row.tone === 'danger' ? styles.totalDanger : undefined,
                  row.tone === 'success' ? styles.totalSuccess : undefined,
                ]}
              >
                {formatMoney(row.amount, model.identity.currency)}
              </Text>
            </View>
          ))}
          {model.totals.mode === 'advance' && model.totals.advanceSummary?.percentage !== null && model.totals.advanceSummary?.percentage !== undefined ? (
            <Text style={styles.amountWords}>{`Advance: ${model.totals.advanceSummary.percentage}%`}</Text>
          ) : null}
          {model.totals.amountInWords ? <Text style={styles.amountWords}>{model.totals.amountInWords}</Text> : null}
          {model.totals.balanceDue !== null && model.totals.balanceDue !== undefined && model.totals.mode !== 'advance' ? (
            <Text style={styles.amountWords}>{`Balance Due: ${formatMoney(model.totals.balanceDue, model.identity.currency)}`}</Text>
          ) : null}
        </View>
      ) : null}

      {model.bankDetails && Object.values(model.bankDetails).some((value) => String(value || '').trim()) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Details</Text>
          {model.bankDetails.bankName ? <Text style={styles.sectionBody}>{`Bank: ${model.bankDetails.bankName}`}</Text> : null}
          {model.bankDetails.accountName ? <Text style={styles.sectionBody}>{`Account Name: ${model.bankDetails.accountName}`}</Text> : null}
          {model.bankDetails.accountNumber ? <Text style={styles.sectionBody}>{`Account Number: ${model.bankDetails.accountNumber}`}</Text> : null}
          {model.bankDetails.sortCode ? <Text style={styles.sectionBody}>{`Sort Code: ${model.bankDetails.sortCode}`}</Text> : null}
          {model.bankDetails.iban ? <Text style={styles.sectionBody}>{`IBAN: ${model.bankDetails.iban}`}</Text> : null}
          {model.bankDetails.swift ? <Text style={styles.sectionBody}>{`SWIFT: ${model.bankDetails.swift}`}</Text> : null}
        </View>
      ) : null}

      {model.notes?.content ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{model.notes.title || 'Notes'}</Text>
          <Text style={styles.sectionBody}>{model.notes.format === 'html' ? textToPlain(model.notes.content) : model.notes.content}</Text>
        </View>
      ) : null}

      {model.terms?.content ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{model.terms.title || 'Terms'}</Text>
          <Text style={styles.sectionBody}>{model.terms.format === 'html' ? textToPlain(model.terms.content) : model.terms.content}</Text>
        </View>
      ) : null}

      {(model.additionalSections || []).map((section, index) => (
        <View style={styles.section} key={`additional-${index}`}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.format === 'html' ? textToPlain(section.content) : section.content}</Text>
        </View>
      ))}

      {(model.referenceLinks && model.referenceLinks.length > 0) || (model.attachments && model.attachments.length > 0) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>References</Text>
          <View style={styles.linksList}>
            {(model.referenceLinks || []).map((link, index) => (
              <Link src={link.url} style={styles.linkText} key={`ref-${index}`}>{`${link.label}: ${link.url}`}</Link>
            ))}
            {(model.attachments || []).map((file, index) => {
              const value = file.url || file.fileName
              if (!value) return null
              return <Text style={styles.sectionBody} key={`att-${index}`}>{`${file.label}: ${value}`}</Text>
            })}
          </View>
        </View>
      ) : null}

      {model.signature && (model.signature.name || model.signature.imageUrl) ? (
        <View style={styles.signatureWrap}>
          {model.signature.imageUrl ? <Image src={model.signature.imageUrl} style={styles.signatureImage} /> : null}
          <View style={styles.divider} />
          {model.signature.name ? <Text style={styles.signatureName}>{model.signature.name}</Text> : null}
          {model.signature.role ? <Text style={styles.signatureRole}>{model.signature.role}</Text> : null}
        </View>
      ) : null}

      {model.footerText ? <Text style={styles.footerText}>{model.footerText}</Text> : null}
      {model.tagline ? <Text style={styles.tagline}>{model.tagline}</Text> : null}
    </View>
  )
}
