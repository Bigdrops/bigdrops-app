import { StyleSheet } from '@react-pdf/renderer'
import { TEMPLATE_TOKENS } from './templateTokens'
import type { RefrensTemplateId } from './types'
import { darkenHex, lightenHex, resolvePdfFontFamily, type PdfDesignPreset } from '@/lib/pdfDesignPreset'

export function createTemplateStyles(templateId: RefrensTemplateId, designPreset?: PdfDesignPreset) {
  const tokens = TEMPLATE_TOKENS[templateId]
  
  // Customization overrides
  const useColorOverride = designPreset?.useCustomColors === true
  const useFontOverride = designPreset?.useCustomFonts === true

  const accentColor = useColorOverride ? designPreset?.accentColor! : tokens.accent
  const accentDark = useColorOverride ? darkenHex(accentColor, 15) : tokens.grandTotalColor
  const accentSoft = lightenHex(accentColor, 40)
  const accentBorder = lightenHex(accentColor, 30)

  const headerFont = useFontOverride ? resolvePdfFontFamily(designPreset?.headerFont!, 'bold') : 'Helvetica-Bold'
  const bodyFont = useFontOverride ? resolvePdfFontFamily(designPreset?.bodyFont!, 'regular') : 'Helvetica'
  const bodyBoldFont = useFontOverride ? resolvePdfFontFamily(designPreset?.bodyFont!, 'bold') : 'Helvetica-Bold'

  const isDarkHeader = templateId === 'modern' || templateId === 'bold'
  const isElegant = templateId === 'elegant'
  const isMinimal = templateId === 'minimal'

  return StyleSheet.create({
    page: {
      paddingTop: 32,
      paddingRight: 32,
      paddingBottom: 32,
      paddingLeft: 32,
      backgroundColor: tokens.pageBackground,
      color: tokens.bodyText,
      fontFamily: bodyFont,
      fontSize: 10,
    },
    // Header
    headerWrap: {
      backgroundColor: tokens.headerBackground,
      color: tokens.headerText,
      paddingTop: isDarkHeader ? 24 : 0,
      paddingRight: isDarkHeader ? 24 : 0,
      paddingBottom: 24,
      paddingLeft: isDarkHeader ? 24 : 0,
      marginTop: isDarkHeader ? -32 : 0,
      marginRight: isDarkHeader ? -32 : 0,
      marginLeft: isDarkHeader ? -32 : 0,
      marginBottom: 20,
      borderBottomWidth: isDarkHeader ? 0 : isMinimal ? 1 : 2,
      borderBottomColor: isMinimal ? tokens.tableBorder : accentColor,
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
      fontFamily: headerFont,
      color: isElegant && !useColorOverride ? tokens.accent : tokens.headerText,
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
      fontFamily: headerFont,
      color: isDarkHeader ? '#ffffff' : accentColor,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    documentNumber: {
      fontSize: 12,
      fontFamily: headerFont,
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
      fontFamily: bodyBoldFont,
      color: tokens.headerText,
    },
    title: {
      fontSize: 12,
      fontFamily: headerFont,
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
      padding: 12,
      borderRadius: 4,
      backgroundColor: tokens.cardBackground,
      borderWidth: isMinimal ? 1 : 0,
      borderColor: tokens.tableBorder,
    },
    partyLabel: {
      fontSize: 8,
      fontFamily: headerFont,
      textTransform: 'uppercase',
      color: tokens.mutedText,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    partyName: {
      fontSize: 11,
      fontFamily: headerFont,
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
      borderBottomWidth: 1,
      borderBottomColor: tokens.tableBorder,
      borderTopWidth: isMinimal ? 1 : 0,
      borderTopColor: tokens.tableBorder,
    },
    thText: {
      fontSize: 8,
      fontFamily: bodyBoldFont,
      paddingVertical: 8,
      paddingHorizontal: 6,
      color: tokens.tableHeaderText,
      textTransform: 'uppercase',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: tokens.tableBorder,
    },
    tableRowAlt: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: tokens.tableBorder,
      backgroundColor: isElegant ? '#fffdf4' : tokens.tableHeaderBackground,
    },
    tdText: {
      fontSize: 9,
      paddingVertical: 8,
      paddingHorizontal: 6,
      color: tokens.bodyText,
    },
    tdBoldText: {
      fontSize: 9,
      fontFamily: bodyBoldFont,
      paddingVertical: 8,
      paddingHorizontal: 6,
      color: tokens.bodyText,
    },
    descText: {
      fontFamily: bodyBoldFont,
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
      width: 220,
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
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 2,
      borderTopColor: accentColor,
    },
    grandLabel: {
      fontSize: 12,
      fontFamily: headerFont,
      color: accentDark,
    },
    grandValue: {
      fontSize: 12,
      fontFamily: headerFont,
      color: accentDark,
      textAlign: 'right',
    },
    // Amount in words
    amountWordsBox: {
      marginTop: 20,
      padding: 12,
      backgroundColor: accentSoft,
      borderWidth: 1,
      borderColor: accentBorder,
      borderRadius: 4,
    },
    amountWordsLead: {
      fontSize: 8,
      fontFamily: headerFont,
      textTransform: 'uppercase',
      color: accentDark,
      marginBottom: 4,
    },
    amountWordsText: {
      fontSize: 9,
      color: tokens.bodyText,
      fontStyle: 'italic',
    },
    // Support Sections (Notes, Bank, etc.)
    supportWrap: {
      marginTop: 24,
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
      marginBottom: 16,
    },
    supportTitle: {
      fontSize: 8,
      fontFamily: headerFont,
      textTransform: 'uppercase',
      color: tokens.mutedText,
      marginBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: tokens.subtleBorder,
      paddingBottom: 2,
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
      width: 120,
      height: 48,
      objectFit: 'contain',
    },
    signatureName: {
      fontSize: 10,
      fontFamily: bodyBoldFont,
      marginTop: 4,
    },
    signatureRole: {
      fontSize: 9,
      color: tokens.mutedText,
    },
    // Footer
    footerNote: {
      position: 'absolute',
      bottom: 32,
      left: 32,
      right: 32,
      borderTopWidth: 1,
      borderTopColor: tokens.footerBorder,
      paddingTop: 10,
      textAlign: 'center',
      fontSize: 8,
      color: tokens.mutedText,
    },
  })
}
