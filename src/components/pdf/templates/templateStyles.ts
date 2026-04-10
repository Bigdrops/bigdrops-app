import { StyleSheet } from '@react-pdf/renderer'
import { TEMPLATE_TOKENS } from './templateTokens'
import type { RefrensTemplateId } from './types'
import { darkenHex, lightenHex, resolvePdfFontFamily, type PdfDesignPreset, type PdfFontChoice } from '@/lib/pdfDesignPreset'

type PdfStyleValue = string | number | boolean
type PdfStyleShape = Record<string, PdfStyleValue | null | undefined>

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function sanitizeStyle(style: PdfStyleShape): PdfStyleShape {
  const next: PdfStyleShape = {}
  const BORDER_WIDTH_KEY_PATTERN = /^border(?:Top|Right|Bottom|Left)?Width$/

  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) continue
    if (typeof value === 'number' && !Number.isFinite(value)) continue
    if (typeof value === 'number' && BORDER_WIDTH_KEY_PATTERN.test(key) && value <= 0) continue
    next[key] = value
  }

  return next
}

export function createTemplateStyles(templateId: RefrensTemplateId, designPreset?: PdfDesignPreset) {
  const tokens = TEMPLATE_TOKENS[templateId] || TEMPLATE_TOKENS.minimal

  const accentColor = safeText(designPreset?.accentColor, tokens.accent)
  const accentDark = designPreset?.accentColor ? darkenHex(accentColor, 15) : tokens.grandTotalColor
  const accentSoft = designPreset?.accentColor ? lightenHex(accentColor, 40) : tokens.amountWordsBackground
  const accentBorder = designPreset?.accentColor ? lightenHex(accentColor, 30) : tokens.amountWordsBorder

  const headerFontChoice: PdfFontChoice = designPreset?.headerFont ?? 'Inter'
  const bodyFontChoice: PdfFontChoice = designPreset?.bodyFont ?? 'Inter'
  const headerFontFamily = resolvePdfFontFamily(headerFontChoice, 'regular')
  const bodyFontFamily = resolvePdfFontFamily(bodyFontChoice, 'regular')

  const isDarkHeader = templateId === 'modern' || templateId === 'bold'
  const isElegant = templateId === 'elegant'
  const isMinimal = templateId === 'minimal'
  const headerBorderBottomColor = isMinimal ? tokens.tableBorder : accentColor

  const rawStyles: Record<string, PdfStyleShape> = {
    page: {
      paddingTop: safeNumber(tokens.pagePaddingTop, 32),
      paddingRight: safeNumber(tokens.pagePaddingRight, 32),
      paddingBottom: safeNumber(tokens.pagePaddingBottom, 32),
      paddingLeft: safeNumber(tokens.pagePaddingLeft, 32),
      backgroundColor: tokens.pageBackground,
      color: tokens.bodyText,
      fontFamily: bodyFontFamily,
      fontWeight: 400,
      fontSize: 10,
    },
    // Header
    headerWrap: {
      backgroundColor: tokens.headerBackground,
      color: tokens.headerText,
      paddingTop: safeNumber(tokens.headerPaddingTop),
      paddingRight: safeNumber(tokens.headerPaddingRight),
      paddingBottom: safeNumber(tokens.headerPaddingBottom, 24),
      paddingLeft: safeNumber(tokens.headerPaddingLeft),
      marginTop: safeNumber(tokens.headerMarginTop),
      marginRight: safeNumber(tokens.headerMarginRight),
      marginLeft: safeNumber(tokens.headerMarginLeft),
      marginBottom: safeNumber(tokens.headerMarginBottom, 20),
      borderBottomWidth: safeNumber(tokens.headerBorderBottomWidth),
      borderBottomColor: headerBorderBottomColor,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 20,
    },
    headerBusiness: {
      flex: 1,
    },
    businessName: {
      fontSize: 18,
      fontFamily: headerFontFamily,
      fontWeight: 700,
      color: isElegant ? accentColor : tokens.headerText,
      marginBottom: 4,
    },
    businessTagline: {
      fontSize: 9,
      color: tokens.headerMuted,
      marginBottom: 8,
    },
    businessLine: {
      fontSize: 9,
      color: tokens.headerMuted,
      lineHeight: 1.4,
    },
    headerMeta: {
      alignItems: 'flex-end',
      minWidth: 160,
    },
    logo: {
      maxWidth: 140,
      maxHeight: 60,
      objectFit: 'contain',
      marginBottom: 12,
    },
    documentLabel: {
      fontSize: 15,
      fontFamily: headerFontFamily,
      fontWeight: 700,
      color: isDarkHeader ? '#ffffff' : accentColor,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    documentNumber: {
      fontSize: 12,
      fontFamily: headerFontFamily,
      fontWeight: 700,
      color: tokens.headerText,
      marginBottom: 8,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 6,
      marginBottom: 2,
    },
    metaLabel: {
      fontSize: 9,
      color: tokens.headerMuted,
    },
    metaValue: {
      fontSize: 9,
      fontFamily: bodyFontFamily,
      fontWeight: 700,
      color: tokens.headerText,
    },
    title: {
      fontSize: 12,
      fontFamily: headerFontFamily,
      fontWeight: 700,
      color: tokens.bodyText,
      marginTop: 8,
      marginBottom: 12,
    },
    // Parties
    partiesWrap: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 24,
    },
    partyCard: {
      flex: 1,
      padding: safeNumber(tokens.partyCardPadding, 12),
      borderRadius: 4,
      backgroundColor: tokens.cardBackground,
      borderWidth: safeNumber(tokens.partyCardBorderWidth),
      borderColor: tokens.tableBorder,
    },
    partyLabel: {
      fontSize: 8,
      fontFamily: headerFontFamily,
      fontWeight: 700,
      textTransform: 'uppercase',
      color: tokens.mutedText,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    partyName: {
      fontSize: 11,
      fontFamily: headerFontFamily,
      fontWeight: 700,
      color: tokens.bodyText,
      marginBottom: 4,
    },
    partyLine: {
      fontSize: 9,
      color: tokens.bodyText,
      lineHeight: 1.4,
    },
    // Table
    table: {
      marginTop: 0,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: tokens.tableHeaderBackground,
      borderBottomWidth: safeNumber(tokens.tableHeaderBorderBottomWidth, 1),
      borderBottomColor: tokens.tableBorder,
      borderTopWidth: safeNumber(tokens.tableHeaderBorderTopWidth),
      borderTopColor: tokens.tableBorder,
    },
    thText: {
      fontSize: 8,
      fontFamily: bodyFontFamily,
      fontWeight: 700,
      paddingVertical: safeNumber(tokens.tableCellPaddingVertical, 8),
      paddingHorizontal: safeNumber(tokens.tableCellPaddingHorizontal, 6),
      color: tokens.tableHeaderText,
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: safeNumber(tokens.tableRowBorderBottomWidth, 1),
      borderBottomColor: tokens.tableBorder,
    },
    tableRowAlt: {
      flexDirection: 'row',
      borderBottomWidth: safeNumber(tokens.tableRowBorderBottomWidth, 1),
      borderBottomColor: tokens.tableBorder,
      backgroundColor: isElegant ? '#fffdf4' : tokens.tableHeaderBackground,
    },
    tdText: {
      fontSize: 9,
      paddingVertical: safeNumber(tokens.tableCellPaddingVertical, 8),
      paddingHorizontal: safeNumber(tokens.tableCellPaddingHorizontal, 6),
      color: tokens.bodyText,
    },
    tdBoldText: {
      fontSize: 9,
      fontFamily: bodyFontFamily,
      fontWeight: 700,
      paddingVertical: safeNumber(tokens.tableCellPaddingVertical, 8),
      paddingHorizontal: safeNumber(tokens.tableCellPaddingHorizontal, 6),
      color: tokens.bodyText,
    },
    descText: {
      fontFamily: bodyFontFamily,
      fontWeight: 700,
      fontSize: 9,
    },
    subDescText: {
      fontSize: 8,
      color: tokens.mutedText,
      marginTop: 2,
    },
    // Totals
    totalsSection: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 16,
    },
    totalsBox: {
      width: safeNumber(tokens.totalsBoxWidth, 220),
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    totalLabel: {
      fontSize: 9,
      color: tokens.mutedText,
    },
    totalValue: {
      fontSize: 9,
      color: tokens.bodyText,
      textAlign: 'right',
    },
    grandRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: safeNumber(tokens.grandRowMarginTop, 8),
      paddingTop: safeNumber(tokens.grandRowPaddingTop, 8),
      borderTopWidth: safeNumber(tokens.grandRowBorderTopWidth, 2),
      borderTopColor: accentColor,
    },
    grandLabel: {
      fontSize: 12,
      fontFamily: headerFontFamily,
      fontWeight: 700,
      color: accentDark,
    },
    grandValue: {
      fontSize: 12,
      fontFamily: headerFontFamily,
      fontWeight: 700,
      color: accentDark,
      textAlign: 'right',
    },
    // Amount in words
    amountWordsBox: {
      marginTop: safeNumber(tokens.amountWordsMarginTop, 20),
      padding: safeNumber(tokens.amountWordsPadding, 12),
      backgroundColor: accentSoft,
      borderWidth: safeNumber(tokens.amountWordsBorderWidth, 1),
      borderColor: accentBorder,
      borderRadius: 4,
    },
    amountWordsLead: {
      fontSize: 8,
      fontFamily: headerFontFamily,
      fontWeight: 700,
      textTransform: 'uppercase',
      color: accentDark,
      marginBottom: 4,
    },
    amountWordsText: {
      fontSize: 9,
      fontFamily: bodyFontFamily,
      color: tokens.bodyText,
      fontStyle: 'italic',
    },
    // Support Sections (Notes, Bank, etc.)
    supportWrap: {
      marginTop: safeNumber(tokens.supportWrapMarginTop, 24),
      flexDirection: 'row',
      gap: 20,
    },
    supportColumn: {
      flex: 1.5,
    },
    signatureColumn: {
      flex: 1,
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
    },
    supportBlock: {
      marginBottom: safeNumber(tokens.supportBlockMarginBottom, 16),
    },
    supportTitle: {
      fontSize: 8,
      fontFamily: headerFontFamily,
      fontWeight: 700,
      textTransform: 'uppercase',
      color: tokens.mutedText,
      marginBottom: safeNumber(tokens.supportTitleMarginBottom, 6),
      borderBottomWidth: safeNumber(tokens.supportTitleBorderBottomWidth, 1),
      borderBottomColor: tokens.subtleBorder,
      paddingBottom: safeNumber(tokens.supportTitlePaddingBottom, 2),
    },
    supportText: {
      fontSize: 9,
      lineHeight: 1.4,
      color: tokens.bodyText,
    },
    supportRow: {
      flexDirection: 'row',
      marginBottom: 2,
    },
    supportLabel: {
      width: 80,
      fontSize: 9,
      color: tokens.mutedText,
    },
    supportValue: {
      flex: 1,
      fontSize: 9,
      color: tokens.bodyText,
    },
    signatureImage: {
      width: safeNumber(tokens.signatureImageWidth, 120),
      height: safeNumber(tokens.signatureImageHeight, 48),
      objectFit: 'contain',
    },
    signatureName: {
      fontSize: 10,
      fontFamily: bodyFontFamily,
      fontWeight: 700,
      marginTop: 4,
    },
    signatureRole: {
      fontSize: 9,
      color: tokens.mutedText,
    },
    // Footer
    footerNote: {
      position: 'absolute',
      bottom: safeNumber(tokens.footerBottom, 32),
      left: safeNumber(tokens.footerInsetLeft, 32),
      right: safeNumber(tokens.footerInsetRight, 32),
      borderTopWidth: safeNumber(tokens.footerBorderTopWidth, 1),
      borderTopColor: tokens.footerBorder,
      paddingTop: safeNumber(tokens.footerPaddingTop, 10),
      textAlign: 'center',
      fontSize: 8,
      color: tokens.mutedText,
    },
  }

  const sanitizedStyles = Object.fromEntries(
    Object.entries(rawStyles).map(([name, style]) => [name, sanitizeStyle(style)]),
  )

  return StyleSheet.create(sanitizedStyles)
}
