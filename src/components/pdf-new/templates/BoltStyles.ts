import { StyleSheet } from '@react-pdf/renderer'

export const INK = '#1a1a2e'
export const DEEP_PINE = '#1b4332'
export const PRIMARY = '#2d6a4f'
export const ACCENT = '#52b788'
export const GOLD = '#d4a373'
export const GOLD_DIM = '#bc6c25'
export const PAPER = '#faf8f0'
export const MUTED_TEXT = '#6b7280'
export const WHITE = '#ffffff'
export const LIGHT_RULE = '#d1d5db'

export const BOLT_SERIF = 'Times-Roman'
export const BOLT_SANS = 'Helvetica'

const PAGE_PADDING = 48
const RULE_THICK = 2
const RULE_THIN = 1

export const styles = StyleSheet.create({
  page: {
    padding: PAGE_PADDING,
    paddingTop: 0,
    fontFamily: BOLT_SANS,
    fontSize: 9,
    color: INK,
    backgroundColor: PAPER,
  },

  /* ── Top Seal Band ───────────────────────────────── */
  sealBand: {
    backgroundColor: DEEP_PINE,
    marginLeft: -PAGE_PADDING,
    marginRight: -PAGE_PADDING,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: PAGE_PADDING,
  },
  sealContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sealLeft: {},
  sealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sealBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
  },
  sealBadgeText: {
    fontSize: 7,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: GOLD,
    fontFamily: BOLT_SANS,
  },
  sealDocumentType: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: ACCENT,
    fontFamily: BOLT_SANS,
  },
  sealTitle: {
    fontSize: 20,
    fontFamily: BOLT_SERIF,
    color: WHITE,
    marginTop: 4,
  },
  sealRight: {
    alignItems: 'flex-end',
  },
  sealNumber: {
    fontSize: 10,
    color: ACCENT,
    fontFamily: BOLT_SANS,
  },
  sealNumberValue: {
    fontSize: 14,
    fontFamily: BOLT_SERIF,
    color: WHITE,
    marginTop: 2,
  },

  /* ── Gold Divisor ────────────────────────────────── */
  goldRule: {
    height: RULE_THICK,
    backgroundColor: GOLD,
    marginTop: 0,
    marginLeft: -PAGE_PADDING,
    marginRight: -PAGE_PADDING,
  },
  thinGoldRule: {
    height: RULE_THIN,
    backgroundColor: GOLD_DIM,
    marginVertical: 12,
  },

  /* ── Company / Title Block ───────────────────────── */
  headerBlock: {
    marginTop: 20,
    marginBottom: 16,
  },
  companyName: {
    fontSize: 16,
    fontFamily: BOLT_SERIF,
    color: DEEP_PINE,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 8,
    color: MUTED_TEXT,
    fontFamily: BOLT_SANS,
    fontStyle: 'italic',
    marginBottom: 8,
  },

  /* ── Meta Rows ───────────────────────────────────── */
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: RULE_THIN,
    borderColor: LIGHT_RULE,
    borderRadius: 2,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: WHITE,
    gap: 4,
  },
  metaChipLabel: {
    fontSize: 7,
    color: MUTED_TEXT,
    fontFamily: BOLT_SANS,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaChipValue: {
    fontSize: 8,
    color: INK,
    fontFamily: BOLT_SANS,
  },

  /* ── Party / Address ─────────────────────────────── */
  partyRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  partyBox: {
    flex: 1,
    padding: 12,
    borderWidth: RULE_THIN,
    borderColor: ACCENT,
    backgroundColor: WHITE,
  },
  partyTitle: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: PRIMARY,
    fontFamily: BOLT_SANS,
    marginBottom: 6,
  },
  partyName: {
    fontSize: 11,
    fontFamily: BOLT_SERIF,
    color: DEEP_PINE,
    marginBottom: 2,
  },
  partyLine: {
    fontSize: 8,
    color: INK,
    fontFamily: BOLT_SANS,
    lineHeight: 1.6,
  },

  /* ── Custom Fields ───────────────────────────────── */
  customFieldsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  customFieldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WHITE,
    borderWidth: RULE_THIN,
    borderColor: LIGHT_RULE,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  customFieldLabel: {
    fontSize: 7,
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  customFieldValue: {
    fontSize: 8,
    color: INK,
  },

  /* ── Table ───────────────────────────────────────── */
  tableWrap: {
    marginBottom: 16,
    borderWidth: RULE_THIN,
    borderColor: DEEP_PINE,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: DEEP_PINE,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: WHITE,
    fontFamily: BOLT_SANS,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: WHITE,
  },
  tableRowEven: {
    backgroundColor: '#f0f7f0',
  },
  tableCell: {
    fontSize: 8,
    color: INK,
    fontFamily: BOLT_SANS,
  },
  descriptionCellYield: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  descriptionMain: {
    fontSize: 8,
    color: INK,
    fontFamily: BOLT_SANS,
  },
  descriptionSub: {
    fontSize: 7,
    color: MUTED_TEXT,
    marginTop: 1,
    fontFamily: BOLT_SANS,
  },
  imageThumb: {
    width: 48,
    height: 48,
    marginTop: 4,
    objectFit: 'cover',
  },
  imageLink: {
    fontSize: 7,
    color: ACCENT,
    marginTop: 2,
  },
  tightCellText: {
    fontSize: 8,
    fontFamily: BOLT_SANS,
  },
  qtyUnitToken: {
    fontSize: 7,
    color: MUTED_TEXT,
  },

  /* ── Group Rows ──────────────────────────────────── */
  groupHeaderRow: {
    backgroundColor: '#e8f0e8',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: RULE_THIN,
    borderBottomColor: LIGHT_RULE,
  },
  groupHeaderText: {
    fontSize: 8,
    fontFamily: BOLT_SERIF,
    color: DEEP_PINE,
    fontStyle: 'italic',
  },
  groupSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: WHITE,
    gap: 8,
  },
  groupSubtotalLabel: {
    fontSize: 8,
    color: DEEP_PINE,
    fontFamily: BOLT_SANS,
  },
  groupSubtotalValue: {
    fontSize: 8,
    color: DEEP_PINE,
    textAlign: 'right',
  },
  groupClosingRule: {
    height: RULE_THIN,
    backgroundColor: LIGHT_RULE,
    marginHorizontal: 8,
  },

  /* ── Closing (Totals + Bank) ─────────────────────── */
  closingRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  closingRowWide: {
    justifyContent: 'space-between',
  },
  bankBox: {
    flex: 1,
    padding: 12,
    borderWidth: RULE_THIN,
    borderColor: LIGHT_RULE,
    backgroundColor: WHITE,
  },
  bankTitle: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: PRIMARY,
    fontFamily: BOLT_SANS,
    marginBottom: 6,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  bankLabel: {
    fontSize: 7,
    color: MUTED_TEXT,
  },
  bankValue: {
    fontSize: 8,
    color: INK,
  },
  totalsBox: {
    width: 220,
    padding: 12,
    borderWidth: RULE_THIN,
    borderColor: DEEP_PINE,
    backgroundColor: WHITE,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: 8,
    color: MUTED_TEXT,
  },
  totalValue: {
    fontSize: 8,
    color: INK,
    textAlign: 'right',
  },
  totalFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: RULE_THICK,
    borderTopColor: DEEP_PINE,
    marginTop: 4,
    paddingTop: 4,
  },
  totalFinalLabel: {
    fontSize: 10,
    fontFamily: BOLT_SERIF,
    color: DEEP_PINE,
  },
  totalFinalValue: {
    fontSize: 10,
    fontFamily: BOLT_SERIF,
    color: DEEP_PINE,
    textAlign: 'right',
  },
  amountWords: {
    fontSize: 7,
    color: MUTED_TEXT,
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'right',
  },
  balanceDue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: DEEP_PINE,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  balanceDueText: {
    fontSize: 9,
    color: WHITE,
    fontFamily: BOLT_SERIF,
  },
  balanceDueValue: {
    fontSize: 9,
    color: GOLD,
    textAlign: 'right',
    fontFamily: BOLT_SERIF,
  },
  advanceBox: {
    marginTop: 6,
    borderTopWidth: RULE_THIN,
    borderTopColor: LIGHT_RULE,
    paddingTop: 4,
  },
  advanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  advanceProminentLabel: {
    fontSize: 8,
    color: PRIMARY,
    fontFamily: BOLT_SANS,
  },
  advanceProminentValue: {
    fontSize: 8,
    color: PRIMARY,
    textAlign: 'right',
  },
  advanceLabel: {
    fontSize: 7,
    color: MUTED_TEXT,
  },
  advanceValue: {
    fontSize: 7,
    color: MUTED_TEXT,
    textAlign: 'right',
  },

  /* ── Optional Sections (Notes, Terms) ────────────── */
  optionalSection: {
    marginBottom: 12,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
    paddingLeft: 10,
  },
  optionalTitle: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: PRIMARY,
    fontFamily: BOLT_SANS,
    marginBottom: 4,
  },
  optionalRichText: {},
  optionalText: {
    fontSize: 8,
    color: INK,
    lineHeight: 1.6,
  },
  optionalParagraph: {
    fontSize: 8,
    color: INK,
    lineHeight: 1.6,
    marginBottom: 4,
  },
  optionalList: {
    marginTop: 2,
  },
  optionalListItemRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  optionalListMarker: {
    width: 10,
    fontSize: 8,
    color: ACCENT,
  },
  optionalListItemText: {
    flex: 1,
    fontSize: 8,
    color: INK,
    lineHeight: 1.6,
  },

  /* ── Attachments ─────────────────────────────────── */
  attachmentsWrap: {
    gap: 2,
  },
  attachmentLink: {
    fontSize: 8,
    color: PRIMARY,
    textDecoration: 'underline',
  },
  attachmentItem: {
    fontSize: 8,
    color: INK,
  },

  /* ── Additional Fields ───────────────────────────── */
  additionalWrap: {
    gap: 3,
  },
  additionalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  additionalLabel: {
    fontSize: 7,
    color: MUTED_TEXT,
    width: 100,
  },
  additionalValue: {
    fontSize: 8,
    color: INK,
    flex: 1,
  },

  /* ── Signature ───────────────────────────────────── */
  signatureWrap: {
    marginTop: 16,
    marginBottom: 16,
  },
  signatureBox: {
    width: 200,
  },
  signatureImage: {
    width: 120,
    height: 40,
    objectFit: 'contain',
    marginBottom: 4,
  },
  signatureLine: {
    height: RULE_THIN,
    backgroundColor: INK,
    marginBottom: 4,
  },
  signerName: {
    fontSize: 9,
    fontFamily: BOLT_SERIF,
    color: DEEP_PINE,
  },
  signerRole: {
    fontSize: 7,
    color: MUTED_TEXT,
  },

  /* ── Footer ──────────────────────────────────────── */
  footerZone: {
    position: 'absolute',
    bottom: 20,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
  },
  footerRule: {
    height: RULE_THIN,
    backgroundColor: GOLD_DIM,
    marginBottom: 6,
  },
  footerExtraText: {
    fontSize: 7,
    color: MUTED_TEXT,
    textAlign: 'center',
    marginBottom: 4,
  },
  taglineFooter: {
    fontSize: 7,
    color: MUTED_TEXT,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  documentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: MUTED_TEXT,
  },
})
