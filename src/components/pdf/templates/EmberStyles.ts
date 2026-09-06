import { StyleSheet } from '@react-pdf/renderer'

export const NAVY = '#2c3e50'
export const BLUE = '#4a90e2'
export const AMBER = '#e67e22'
export const AMBER_LIGHT = '#fef3c7'
export const BORDER_LIGHT = '#e9edf2'
export const INK = '#1e2a3a'
export const MUTED = '#7a8a9a'
export const LIGHT_BG = '#f4f6f8'
export const WHITE = '#ffffff'
export const DANGER = '#e74c3c'

export const DISPLAY = 'Helvetica-Bold'
export const BODY = 'Helvetica'

const PAGE_PADDING = 40

export const styles = StyleSheet.create({
  page: {
    backgroundColor: LIGHT_BG,
    fontFamily: BODY,
    paddingBottom: 44,
    fontSize: 9,
    color: INK,
  },

  /* ── Header Band ──────────────────────────────────── */
  headerBand: {
    backgroundColor: NAVY,
    paddingTop: 28,
    paddingBottom: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {},
  headerLabel: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: DISPLAY,
    color: WHITE,
    marginBottom: 8,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  headerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  headerMetaLabel: {
    fontSize: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
  headerMetaValue: {
    fontSize: 8,
    color: WHITE,
    fontFamily: DISPLAY,
  },

  /* ── Amber Accent Bar ─────────────────────────────── */
  amberBar: {
    backgroundColor: AMBER,
    height: 4,
    marginTop: 0,
  },

  /* ── Content Card ─────────────────────────────────── */
  contentCard: {
    backgroundColor: WHITE,
    marginTop: 16,
    borderRadius: 16,
    padding: 24,
  },

  /* ── Company ──────────────────────────────────────── */
  companyBlock: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_LIGHT,
    paddingBottom: 12,
  },
  companyName: {
    fontSize: 14,
    fontFamily: DISPLAY,
    color: NAVY,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 8,
    color: MUTED,
    fontStyle: 'italic',
  },

  /* ── Party Row ────────────────────────────────────── */
  partyRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  partyBox: {
    flex: 1,
  },
  partyTitle: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: BLUE,
    fontFamily: DISPLAY,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 10,
    fontFamily: DISPLAY,
    color: NAVY,
    marginBottom: 2,
  },
  partyLine: {
    fontSize: 8,
    color: INK,
    lineHeight: 1.6,
  },

  /* ── Custom Fields ────────────────────────────────── */
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
    backgroundColor: LIGHT_BG,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  customFieldLabel: {
    fontSize: 7,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  customFieldValue: {
    fontSize: 8,
    color: INK,
  },

  /* ── Table ────────────────────────────────────────── */
  tableWrap: {
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: NAVY,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCell: {
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: WHITE,
    fontFamily: DISPLAY,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_LIGHT,
  },
  tableRowEven: {
    backgroundColor: '#fafbfc',
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
    color: MUTED,
    marginTop: 1,
  },
  imageThumb: {
    width: 48,
    height: 48,
    marginTop: 4,
    objectFit: 'cover',
    borderRadius: 6,
  },
  imageLink: {
    fontSize: 7,
    color: BLUE,
    marginTop: 2,
    textDecoration: 'underline',
  },
  tightCellText: {
    fontSize: 8,
  },
  qtyUnitToken: {
    fontSize: 7,
    color: MUTED,
  },

  /* ── Group Rows ───────────────────────────────────── */
  groupHeaderRow: {
    backgroundColor: '#f0f4f8',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_LIGHT,
  },
  groupHeaderText: {
    fontSize: 8,
    fontFamily: DISPLAY,
    color: NAVY,
  },
  groupSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 12,
    gap: 8,
  },
  groupSubtotalLabel: {
    fontSize: 8,
    color: NAVY,
    fontFamily: DISPLAY,
  },
  groupSubtotalValue: {
    fontSize: 8,
    color: NAVY,
    textAlign: 'right',
  },
  groupClosingRule: {
    height: 1,
    backgroundColor: BORDER_LIGHT,
    marginHorizontal: 12,
  },

  /* ── Closing (Totals + Bank) ──────────────────────── */
  closingRow: {
    flexDirection: 'row',
    gap: 16,
  },
  closingRowWide: {
    justifyContent: 'space-between',
  },
  bankBox: {
    flex: 1,
    backgroundColor: LIGHT_BG,
    borderRadius: 12,
    padding: 14,
  },
  bankTitle: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: BLUE,
    fontFamily: DISPLAY,
    marginBottom: 6,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  bankLabel: {
    fontSize: 7,
    color: MUTED,
  },
  bankValue: {
    fontSize: 8,
    color: INK,
  },
  totalsBox: {
    width: 220,
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
    padding: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: 8,
    color: MUTED,
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
    borderTopColor: BLUE,
    marginTop: 4,
    paddingTop: 4,
  },
  totalFinalLabel: {
    fontSize: 10,
    fontFamily: DISPLAY,
    color: NAVY,
  },
  totalFinalValue: {
    fontSize: 10,
    fontFamily: DISPLAY,
    color: NAVY,
    textAlign: 'right',
  },
  amountWords: {
    fontSize: 7,
    color: MUTED,
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'right',
  },
  balanceDue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: AMBER,
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  balanceDueText: {
    fontSize: 9,
    color: WHITE,
    fontFamily: DISPLAY,
  },
  balanceDueValue: {
    fontSize: 9,
    color: WHITE,
    textAlign: 'right',
    fontFamily: DISPLAY,
  },
  advanceBox: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER_LIGHT,
    paddingTop: 4,
  },
  advanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  advanceProminentLabel: {
    fontSize: 8,
    color: NAVY,
  },
  advanceProminentValue: {
    fontSize: 8,
    color: NAVY,
    textAlign: 'right',
  },
  advanceLabel: {
    fontSize: 7,
    color: MUTED,
  },
  advanceValue: {
    fontSize: 7,
    color: MUTED,
    textAlign: 'right',
  },

  /* ── Optional Sections ────────────────────────────── */
  optionalSection: {
    marginBottom: 12,
    backgroundColor: LIGHT_BG,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: BLUE,
  },
  optionalTitle: {
    fontSize: 7,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: BLUE,
    fontFamily: DISPLAY,
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
    color: BLUE,
  },
  optionalListItemText: {
    flex: 1,
    fontSize: 8,
    color: INK,
    lineHeight: 1.6,
  },

  /* ── Attachments ──────────────────────────────────── */
  attachmentsWrap: {
    gap: 2,
  },
  attachmentLink: {
    fontSize: 8,
    color: BLUE,
    textDecoration: 'underline',
  },
  attachmentItem: {
    fontSize: 8,
    color: INK,
  },

  /* ── Additional Fields ────────────────────────────── */
  additionalWrap: {
    gap: 3,
  },
  additionalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  additionalLabel: {
    fontSize: 7,
    color: MUTED,
    width: 100,
  },
  additionalValue: {
    fontSize: 8,
    color: INK,
    flex: 1,
  },

  /* ── Signature ────────────────────────────────────── */
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
    height: 1,
    backgroundColor: INK,
    marginBottom: 4,
  },
  signerName: {
    fontSize: 9,
    fontFamily: DISPLAY,
    color: NAVY,
  },
  signerRole: {
    fontSize: 7,
    color: MUTED,
  },

  /* ── Footer ───────────────────────────────────────── */
  footerZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_LIGHT,
  },
  footerExtraText: {
    fontSize: 7,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 4,
  },
  taglineFooter: {
    fontSize: 7,
    color: MUTED,
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
    color: MUTED,
  },
})
