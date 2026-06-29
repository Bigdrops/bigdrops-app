import { StyleSheet } from '@react-pdf/renderer'

export const INK = '#1a2f2f'
export const ACCENT = '#0d7c7c'
export const ACCENT_DIM = '#e6f4f4'
export const PAPER = '#fefefe'
export const RULE = '#b8c4c4'
export const LIGHT_RULE = '#dfe5e5'
export const PANEL = '#f5f8f8'
export const SAND = '#f0ebe0'
export const LINK = '#0d5c5c'
export const LINK_BG = '#e0f2f2'

export const BODY_SERIF = 'Times-Roman'
export const BODY_SERIF_BOLD = 'Times-Bold'
export const BODY_SERIF_ITALIC = 'Times-Italic'
export const BODY_SANS = 'Helvetica'

const PAGE_PADDING = 40

export const styles = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    fontFamily: BODY_SANS,
    paddingBottom: 50,
    fontSize: 9,
    color: INK,
    lineHeight: 1.4,
  },

  headerContent: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 28,
    paddingBottom: 12,
  },
  headerGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  headerLeft: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: BODY_SERIF_BOLD,
    fontSize: 7,
    color: ACCENT,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  docLabel: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: ACCENT,
    fontFamily: BODY_SANS,
    marginBottom: 2,
  },
  docTitle: {
    fontFamily: BODY_SERIF,
    fontSize: 22,
    color: INK,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {},
  metaLabel: {
    fontSize: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: RULE,
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 8,
    color: INK,
  },
  headerRight: {
    width: 156,
  },
  partyLabel: {
    fontSize: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: RULE,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 9,
    fontFamily: BODY_SANS,
    color: INK,
    marginBottom: 2,
  },
  partyLine: {
    fontSize: 8,
    color: INK,
    lineHeight: 1.6,
  },

  accentBar: {
    height: 2,
    backgroundColor: ACCENT,
    marginHorizontal: PAGE_PADDING,
    marginBottom: 8,
  },

  ribbon: {
    marginHorizontal: PAGE_PADDING,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_RULE,
    paddingBottom: 8,
  },
  ribbonItem: {
    flexDirection: 'row',
    paddingVertical: 3,
    gap: 8,
  },
  ribbonLabel: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: RULE,
    width: 100,
  },
  ribbonValue: {
    fontSize: 8,
    color: INK,
    flex: 1,
  },

  content: {
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 4,
  },

  tableCard: {
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PANEL,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  tableHeaderCell: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: INK,
    fontFamily: BODY_SANS,
  },
  tableBody: {},
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_RULE,
  },
  tableCell: {
    fontSize: 8,
    color: INK,
  },
  descriptionCellYield: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  descriptionMain: {
    fontSize: 8,
    color: INK,
  },
  descriptionSub: {
    fontSize: 7,
    color: RULE,
    marginTop: 1,
  },
  imageThumb: {
    width: 40,
    height: 40,
    marginTop: 4,
    objectFit: 'cover',
  },
  imageLink: {
    fontSize: 7,
    color: LINK,
    marginTop: 2,
    textDecoration: 'underline',
  },
  tightCellText: {
    fontSize: 8,
  },
  qtyUnitToken: {
    fontSize: 7,
    color: RULE,
  },

  groupHeaderRow: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: ACCENT_DIM,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_RULE,
  },
  groupHeaderText: {
    fontSize: 9,
    fontFamily: BODY_SERIF_BOLD,
    color: INK,
  },
  groupSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 12,
    backgroundColor: PANEL,
  },
  groupSubtotalLabel: {
    fontSize: 8,
    color: INK,
  },
  groupSubtotalValue: {
    fontSize: 8,
    color: INK,
    textAlign: 'right',
    width: 80,
  },
  groupClosingRule: {
    height: 1,
    backgroundColor: LIGHT_RULE,
    marginHorizontal: 10,
  },

  infoRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  infoSection: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: ACCENT,
    fontFamily: BODY_SERIF_BOLD,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 8,
    color: INK,
    lineHeight: 1.6,
  },
  infoRichText: {},
  infoParagraph: {
    fontSize: 8,
    color: INK,
    lineHeight: 1.6,
    marginBottom: 4,
  },
  infoList: {
    marginTop: 2,
  },
  infoListItemRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  infoListMarker: {
    width: 10,
    fontSize: 8,
    color: ACCENT,
  },
  infoListItemText: {
    flex: 1,
    fontSize: 8,
    color: INK,
    lineHeight: 1.6,
  },
  attachmentLink: {
    fontSize: 8,
    color: LINK,
    textDecoration: 'underline',
  },
  attachmentItem: {
    fontSize: 8,
    color: INK,
  },

  totalsWrap: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  totalsGrid: {
    width: 220,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: 8,
    color: INK,
  },
  totalValue: {
    fontSize: 8,
    color: INK,
    textAlign: 'right',
  },
  totalFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: INK,
    marginTop: 4,
    paddingTop: 4,
  },
  totalFinalLabel: {
    fontSize: 10,
    fontFamily: BODY_SERIF_BOLD,
    color: INK,
  },
  totalFinalValue: {
    fontSize: 10,
    fontFamily: BODY_SERIF_BOLD,
    color: INK,
    textAlign: 'right',
  },
  amountWords: {
    fontSize: 7,
    color: RULE,
    fontFamily: BODY_SERIF_ITALIC,
    marginTop: 4,
    textAlign: 'right',
  },
  advanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: ACCENT_DIM,
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  advanceLabel: {
    fontSize: 8,
    color: INK,
    fontFamily: BODY_SERIF_BOLD,
  },
  advanceValue: {
    fontSize: 8,
    color: INK,
    textAlign: 'right',
    fontFamily: BODY_SERIF_BOLD,
  },
  balanceDue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: INK,
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  balanceDueText: {
    fontSize: 9,
    color: PAPER,
    fontFamily: BODY_SANS,
  },
  balanceDueValue: {
    fontSize: 9,
    color: PAPER,
    textAlign: 'right',
    fontFamily: BODY_SANS,
  },
  advanceBox: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: LIGHT_RULE,
    paddingTop: 4,
  },
  advanceSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  advanceSubLabel: {
    fontSize: 7,
    color: RULE,
  },
  advanceSubValue: {
    fontSize: 7,
    color: RULE,
    textAlign: 'right',
  },

  sigExtraRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 16,
  },
  sigBox: {
    width: 200,
  },
  sigImage: {
    width: 120,
    height: 40,
    objectFit: 'contain',
    marginBottom: 4,
  },
  sigLine: {
    width: 180,
    height: 1,
    backgroundColor: RULE,
    marginBottom: 4,
  },
  sigScribble: {
    width: 180,
    height: 28,
    marginBottom: 4,
  },
  sigName: {
    fontSize: 9,
    color: INK,
  },
  sigRole: {
    fontSize: 7,
    color: RULE,
  },
  extraFieldsWrap: {
    gap: 3,
    flex: 1,
  },
  extraFieldRow: {
    flexDirection: 'row',
    gap: 8,
  },
  extraFieldLabel: {
    fontSize: 7,
    color: RULE,
    width: 100,
  },
  extraFieldValue: {
    fontSize: 8,
    color: INK,
    flex: 1,
  },

  footerZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PANEL,
    paddingHorizontal: PAGE_PADDING,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: LIGHT_RULE,
  },
  footerExtra: {
    fontSize: 7,
    color: RULE,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerTagline: {
    fontSize: 7,
    color: RULE,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: RULE,
  },
})
