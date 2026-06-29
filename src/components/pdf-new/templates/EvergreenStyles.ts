import { StyleSheet } from '@react-pdf/renderer'

export const ACCENT = '#1f6e5c'
export const ACCENT_DIM = '#2a8a73'
export const ACCENT_LIGHT = '#e8f3ef'
export const ACCENT_PALE = '#f0f6f2'
export const INK = '#1a3a32'
export const PAPER = '#ffffff'
export const RULE = '#d4dfd8'
export const LIGHT_RULE = '#e6ede8'
export const PANEL = '#f7faf8'
export const GRAY_TEXT = '#5a7268'
export const MUTED_TEXT = '#7f9a8e'
export const LINK = '#1a6b5c'
export const WHITE = '#ffffff'

export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: INK,
    backgroundColor: PAPER,
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 60,
  },
  pageContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 6,
  },

  accentBar: {
    height: 4,
    backgroundColor: ACCENT,
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 2,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_RULE,
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  headerRight: {
    alignItems: 'flex-end',
    maxWidth: 160,
  },
  brandName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 2,
  },
  brandDetail: {
    fontSize: 8,
    color: GRAY_TEXT,
    lineHeight: 1.35,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 8,
    objectFit: 'contain',
    backgroundColor: PAPER,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 2,
  },
  customTitle: {
    fontSize: 9,
    color: GRAY_TEXT,
    marginBottom: 8,
    textAlign: 'right',
  },
  docMetaBlock: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  docMetaLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  docMetaValue: {
    fontSize: 9,
    color: INK,
    marginBottom: 3,
  },
  docMetaBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 3,
  },

  partyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  partyBox: {
    flex: 1,
    backgroundColor: ACCENT_PALE,
    borderRadius: 6,
    padding: 12,
  },
  partyTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 4,
  },
  partyLine: {
    fontSize: 9,
    color: GRAY_TEXT,
    lineHeight: 1.4,
    marginBottom: 1,
  },

  customFieldsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: ACCENT_PALE,
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  customFieldItem: {
    minWidth: '30%',
    flexGrow: 1,
  },
  customFieldLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  customFieldValue: {
    fontSize: 9,
    color: INK,
  },

  tableWrap: {
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: ACCENT,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableRowEven: {
    backgroundColor: PANEL,
  },
  tableRowLast: {
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  tableCell: {
    fontSize: 9,
    color: INK,
    paddingHorizontal: 4,
  },
  descriptionMain: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    lineHeight: 1.3,
    paddingHorizontal: 4,
  },
  descriptionSub: {
    fontSize: 8,
    color: GRAY_TEXT,
    lineHeight: 1.35,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  imageThumb: {
    width: 36,
    height: 36,
    borderRadius: 4,
    objectFit: 'cover',
    marginTop: 4,
  },
  imageLink: {
    fontSize: 7,
    color: LINK,
    textDecoration: 'underline',
    marginTop: 2,
  },

  groupHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: RULE,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    backgroundColor: ACCENT_PALE,
  },
  groupHeaderText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: INK,
  },
  groupSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: ACCENT_PALE,
  },
  groupSubtotalLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginRight: 8,
  },
  groupSubtotalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    textAlign: 'right',
  },
  groupClosingRule: {
    width: '100%',
    height: 1.5,
    backgroundColor: ACCENT,
  },

  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: LIGHT_RULE,
    paddingBottom: 4,
  },

  bankBox: {
    backgroundColor: ACCENT_PALE,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  bankLabel: {
    fontSize: 8,
    color: GRAY_TEXT,
    width: '35%',
  },
  bankValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    width: '65%',
    textAlign: 'right',
  },

  totalsBox: {
    backgroundColor: ACCENT_PALE,
    borderRadius: 6,
    padding: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 9,
    color: GRAY_TEXT,
    flex: 1,
    paddingRight: 8,
  },
  totalValue: {
    fontSize: 9,
    color: INK,
    textAlign: 'right',
  },
  totalFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: ACCENT,
    paddingTop: 6,
    marginTop: 6,
  },
  totalFinalLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    flex: 1,
    paddingRight: 8,
  },
  totalFinalValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    textAlign: 'right',
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  bottomLeft: {
    flex: 1,
    paddingRight: 20,
  },
  bottomRight: {
    width: 240,
    flexShrink: 0,
  },

  amountWords: {
    fontSize: 7.5,
    color: GRAY_TEXT,
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: 8,
    lineHeight: 1.4,
  },
  balanceDue: {
    marginTop: 8,
    backgroundColor: ACCENT,
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceDueLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    flex: 1,
    paddingRight: 8,
  },
  balanceDueValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    textAlign: 'right',
  },

  advanceBox: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: 6,
    padding: 10,
    backgroundColor: PAPER,
  },
  advanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  advancePrimaryLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    flex: 1,
    paddingRight: 8,
  },
  advancePrimaryValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: ACCENT,
    textAlign: 'right',
  },
  advanceSecondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: RULE,
  },
  advanceSecondaryLabel: {
    fontSize: 8,
    color: GRAY_TEXT,
    flex: 1,
    paddingRight: 8,
  },
  advanceSecondaryValue: {
    fontSize: 8,
    color: GRAY_TEXT,
    textAlign: 'right',
  },

  notesSection: {
    marginTop: 14,
    backgroundColor: ACCENT_PALE,
    borderRadius: 6,
    padding: 12,
  },
  notesTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  notesRichText: {
    marginTop: 2,
  },
  notesParagraph: {
    fontSize: 8,
    color: GRAY_TEXT,
    lineHeight: 1.5,
    marginBottom: 5,
  },
  notesList: {
    marginBottom: 5,
  },
  notesListItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  notesListMarker: {
    width: 12,
    fontSize: 8,
    color: GRAY_TEXT,
    lineHeight: 1.5,
    fontFamily: 'Helvetica-Bold',
  },
  notesListItemText: {
    flex: 1,
    fontSize: 8,
    color: GRAY_TEXT,
    lineHeight: 1.5,
  },
  notesPlainText: {
    fontSize: 8,
    color: GRAY_TEXT,
    lineHeight: 1.5,
  },

  attachmentsSection: {
    marginTop: 14,
  },
  attachmentsTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: LIGHT_RULE,
    paddingBottom: 4,
  },
  attachmentItem: {
    fontSize: 8,
    color: GRAY_TEXT,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  attachmentLink: {
    fontSize: 8,
    color: LINK,
    textDecoration: 'underline',
    marginBottom: 3,
    lineHeight: 1.4,
  },

  additionalFieldsBar: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: LIGHT_RULE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: ACCENT_PALE,
    borderRadius: 6,
    padding: 12,
  },
  additionalFieldItem: {
    minWidth: '30%',
    flexGrow: 1,
  },
  additionalFieldLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  additionalFieldValue: {
    fontSize: 9,
    color: INK,
  },

  signatureWrap: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  signatureBox: {
    width: 200,
    alignItems: 'center',
  },
  signatureImage: {
    width: 120,
    height: 36,
    objectFit: 'contain',
    marginBottom: 2,
  },
  signatureLine: {
    width: '100%',
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    marginBottom: 4,
  },
  signerName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 2,
    textAlign: 'center',
  },
  signerRole: {
    fontSize: 8,
    color: GRAY_TEXT,
    textAlign: 'center',
  },

  footerZone: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 16,
  },
  footerExtra: {
    fontSize: 7.5,
    color: MUTED_TEXT,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerTagline: {
    fontSize: 7.5,
    color: MUTED_TEXT,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 4,
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
    fontSize: 7.5,
    color: MUTED_TEXT,
  },

  textLeft: { textAlign: 'left' },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
})
