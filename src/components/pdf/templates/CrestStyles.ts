import { StyleSheet } from '@react-pdf/renderer'

export const INK = '#2d1f3a'
export const ACCENT = '#b28b3d'
export const ACCENT_DIM = '#f9f3e6'
export const PAPER = '#fdfbf7'
export const RULE = '#c5bdaa'
export const LIGHT_RULE = '#e4ddd0'
export const PANEL = '#f7f3ed'
export const LINK = '#3d2b4f'
export const LINK_BG = '#f2eaf6'
export const WHITE = '#ffffff'
export const MUTED_TEXT = '#7d6f5f'
export const WARM_BLACK = '#1a1510'
export const CREST_SERIF = 'Cormorant Garamond'
export const CREST_SANS = 'Inter'

export const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: 72,
    backgroundColor: PAPER,
    fontFamily: CREST_SANS,
    color: INK,
    fontSize: 10,
  },

  // ── Header Band ──────────────────────────────────────
  headerBand: {
    backgroundColor: INK,
    marginHorizontal: -28,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 20,
    marginBottom: 0,
  },
  headerAccentBar: {
    height: 3,
    backgroundColor: ACCENT,
    marginHorizontal: -28,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    paddingRight: 18,
  },
  headerRight: {
    width: 86,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  logoWrapper: {
    width: 76,
    height: 76,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 76,
    height: 76,
    objectFit: 'contain',
  },
  companyName: {
    fontFamily: CREST_SANS,
    fontSize: 12,
    color: WHITE,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  companyLine: {
    fontFamily: CREST_SANS,
    fontSize: 8.5,
    color: '#d4cfc5',
    lineHeight: 1.4,
    marginBottom: 1,
  },
  title: {
    fontFamily: CREST_SERIF,
    fontSize: 24,
    fontWeight: 700,
    color: ACCENT,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  metaList: {
    marginTop: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  metaLabel: {
    width: 86,
    flexShrink: 0,
    color: '#d4cfc5',
    fontSize: 8.5,
    fontFamily: CREST_SANS,
  },
  metaValue: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    color: WHITE,
    fontSize: 8.5,
    fontFamily: CREST_SANS,
    lineHeight: 1.3,
  },

  // ── Party / Address Block ────────────────────────────
  partyRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 0,
  },
  partyBox: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 14,
    marginRight: 14,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: LIGHT_RULE,
  },
  partyBoxLast: {
    marginRight: 0,
  },
  partyTitle: {
    fontSize: 9,
    fontFamily: CREST_SANS,
    color: MUTED_TEXT,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  partyName: {
    fontSize: 11,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    color: INK,
    marginBottom: 4,
  },
  partyLine: {
    fontSize: 9,
    color: MUTED_TEXT,
    marginBottom: 2,
    lineHeight: 1.35,
  },

  // ── Custom Fields Strip ──────────────────────────────
  customFieldsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    marginBottom: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: ACCENT_DIM,
    borderWidth: 1,
    borderColor: LIGHT_RULE,
  },
  customFieldChip: {
    marginRight: 20,
    marginBottom: 4,
  },
  customFieldLabel: {
    fontSize: 7.5,
    fontFamily: CREST_SANS,
    color: MUTED_TEXT,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  customFieldValue: {
    fontSize: 10,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    color: INK,
  },

  // ── Table ─────────────────────────────────────────────
  tableWrap: {
    marginBottom: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: INK,
    marginBottom: 0,
  },
  tableHeaderCell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    color: WHITE,
    fontSize: 8.5,
    fontFamily: CREST_SANS,
    letterSpacing: 0.5,
    borderRightWidth: 0.5,
    borderRightColor: '#4a3d54',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: LIGHT_RULE,
  },
  tableRowEven: {
    backgroundColor: ACCENT_DIM,
  },
  tableCell: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 9.5,
    color: INK,
    justifyContent: 'center',
  },
  descriptionCellYield: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
  },
  descriptionMain: {
    fontSize: 9.8,
    color: INK,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    lineHeight: 1.25,
  },
  descriptionSub: {
    marginTop: 2,
    fontSize: 8.5,
    color: MUTED_TEXT,
    lineHeight: 1.2,
  },
  imageThumb: {
    width: 48,
    height: 48,
    objectFit: 'cover',
    marginTop: 4,
    marginBottom: 2,
  },
  imageLink: {
    marginTop: 1,
    fontSize: 8,
    color: LINK,
    textDecoration: 'underline',
  },
  tightCellText: {
    fontSize: 9.5,
    color: INK,
    lineHeight: 1.2,
  },
  qtyUnitToken: {
    flexGrow: 0,
    flexShrink: 0,
  },

  // ── Group Rows ────────────────────────────────────────
  groupHeaderRow: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: ACCENT_DIM,
    borderTopWidth: 1,
    borderTopColor: RULE,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
  },
  groupHeaderText: {
    fontSize: 9.5,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    color: INK,
    letterSpacing: 0.3,
  },
  groupSubtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: ACCENT_DIM,
  },
  groupSubtotalLabel: {
    flex: 1,
    fontSize: 9.5,
    color: MUTED_TEXT,
    fontFamily: CREST_SANS,
  },
  groupSubtotalValue: {
    fontSize: 9.5,
    color: INK,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    textAlign: 'right',
    width: 90,
  },
  groupClosingRule: {
    height: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: RULE,
    marginBottom: 8,
  },

  // ── Totals ────────────────────────────────────────────
  closingRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 8,
  },
  closingRowWide: {
    justifyContent: 'space-between',
  },
  totalsBox: {
    width: 240,
    flexShrink: 0,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    paddingVertical: 1,
  },
  totalLabel: {
    flex: 1,
    fontSize: 9.5,
    color: MUTED_TEXT,
    paddingRight: 10,
  },
  totalValue: {
    width: 90,
    fontSize: 9.5,
    color: INK,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    textAlign: 'right',
  },
  totalFinal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: ACCENT,
  },
  totalFinalLabel: {
    flex: 1,
    fontSize: 12,
    color: INK,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    paddingRight: 10,
  },
  totalFinalValue: {
    width: 100,
    fontSize: 12,
    color: INK,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    textAlign: 'right',
  },
  amountWords: {
    marginTop: 10,
    fontSize: 8.5,
    color: MUTED_TEXT,
    fontFamily: CREST_SERIF,
    fontStyle: 'italic',
    lineHeight: 1.45,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 0.5,
    borderColor: LIGHT_RULE,
    backgroundColor: ACCENT_DIM,
  },
  balanceDue: {
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceDueText: {
    flex: 1,
    color: WHITE,
    fontSize: 10,
    fontFamily: CREST_SANS,
    letterSpacing: 0.3,
  },
  balanceDueValue: {
    width: 100,
    color: WHITE,
    fontSize: 10,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    textAlign: 'right',
  },
  advanceBox: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    backgroundColor: ACCENT_DIM,
  },
  advanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  advanceLabel: {
    flex: 1,
    fontSize: 9,
    color: MUTED_TEXT,
    paddingRight: 8,
  },
  advanceValue: {
    width: 90,
    fontSize: 9,
    color: INK,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    textAlign: 'right',
  },
  advanceProminentLabel: {
    flex: 1,
    fontSize: 10.5,
    color: INK,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    paddingRight: 8,
  },
  advanceProminentValue: {
    width: 90,
    fontSize: 10.5,
    color: ACCENT,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    textAlign: 'right',
  },

  // ── Bank Details ──────────────────────────────────────
  bankBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: LIGHT_RULE,
    marginRight: 18,
  },
  bankTitle: {
    fontSize: 8.5,
    fontFamily: CREST_SANS,
    color: MUTED_TEXT,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bankRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bankLabel: {
    width: 90,
    fontSize: 8.5,
    color: MUTED_TEXT,
  },
  bankValue: {
    flex: 1,
    fontSize: 8.5,
    color: INK,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
  },

  // ── Notes / Terms / Attachments ───────────────────────
  optionalSection: {
    marginTop: 14,
    marginBottom: 6,
  },
  optionalTitle: {
    fontSize: 8.5,
    fontFamily: CREST_SANS,
    color: MUTED_TEXT,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  optionalText: {
    fontSize: 9,
    color: MUTED_TEXT,
    lineHeight: 1.5,
  },
  optionalRichText: {
    marginTop: 2,
  },
  optionalParagraph: {
    fontSize: 9,
    color: MUTED_TEXT,
    lineHeight: 1.5,
    marginBottom: 5,
  },
  optionalList: {
    marginBottom: 5,
  },
  optionalListItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  optionalListMarker: {
    width: 14,
    fontSize: 9,
    color: MUTED_TEXT,
    lineHeight: 1.5,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
  },
  optionalListItemText: {
    flex: 1,
    fontSize: 9,
    color: MUTED_TEXT,
    lineHeight: 1.5,
  },
  attachmentsWrap: {
    marginTop: 4,
  },
  attachmentItem: {
    fontSize: 9,
    color: MUTED_TEXT,
    marginBottom: 3,
    lineHeight: 1.35,
  },
  attachmentLink: {
    fontSize: 9,
    color: LINK,
    textDecoration: 'underline',
    marginBottom: 3,
    lineHeight: 1.35,
  },

  // ── Additional Fields ─────────────────────────────────
  additionalWrap: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: LIGHT_RULE,
  },
  additionalRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  additionalLabel: {
    width: 110,
    fontSize: 9,
    color: MUTED_TEXT,
  },
  additionalValue: {
    flex: 1,
    fontSize: 9,
    color: INK,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
  },

  // ── Signature ─────────────────────────────────────────
  signatureWrap: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  signatureBox: {
    width: 200,
    alignItems: 'flex-start',
  },
  signatureImage: {
    width: 120,
    height: 36,
    objectFit: 'contain',
    marginBottom: 2,
  },
  signatureLine: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: RULE,
    marginBottom: 5,
  },
  signerName: {
    fontSize: 10,
    color: INK,
    fontFamily: CREST_SERIF,
    fontWeight: 700,
    marginBottom: 2,
  },
  signerRole: {
    fontSize: 8.5,
    color: MUTED_TEXT,
  },

  // ── Footer ────────────────────────────────────────────
  footerZone: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 20,
  },
  footerExtraText: {
    marginBottom: 4,
    textAlign: 'center',
    fontSize: 8,
    color: MUTED_TEXT,
  },
  taglineFooter: {
    marginBottom: 4,
    textAlign: 'center',
    fontSize: 8,
    color: MUTED_TEXT,
    fontStyle: 'italic',
  },
  documentFooter: {
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: MUTED_TEXT,
  },
})
