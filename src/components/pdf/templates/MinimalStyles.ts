import { StyleSheet } from '@react-pdf/renderer'

export const INK = '#1a1a1a'
export const PAPER = '#ffffff'
export const RULE = '#d4d4d4'
export const LIGHT_RULE = '#e8e8e8'
export const PANEL_BG = '#f5f5f5'
export const GRAY_TEXT = '#6b6b6b'
export const MUTED_TEXT = '#8a8a8a'
export const LINK = '#2563eb'

export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: INK,
    backgroundColor: PAPER,
    paddingTop: 28,
    paddingHorizontal: 28,
    paddingBottom: 60,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  customTitle: {
    fontSize: 10,
    color: GRAY_TEXT,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  brandName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 3,
  },
  brandDetail: {
    fontSize: 8,
    color: GRAY_TEXT,
    lineHeight: 1.4,
  },
  logo: {
    width: 70,
    height: 70,
    objectFit: 'contain',
  },
  docMeta: {
    fontSize: 8,
    color: GRAY_TEXT,
    marginBottom: 2,
    textAlign: 'right',
  },
  docMetaBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginBottom: 2,
    textAlign: 'right',
  },

  partyRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  partyBox: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: RULE,
  },
  partyBoxLast: {
    marginLeft: 0,
    borderLeftWidth: 0,
  },
  partyTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    paddingVertical: 8,
    marginBottom: 10,
    borderTopWidth: 1,
    borderTopColor: LIGHT_RULE,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT_RULE,
  },
  customFieldItem: {
    width: '33%',
    marginBottom: 6,
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
    borderBottomWidth: 1.5,
    borderBottomColor: INK,
    paddingVertical: 6,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: LIGHT_RULE,
    paddingVertical: 7,
  },
  tableRowEven: {
    backgroundColor: PANEL_BG,
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
    paddingHorizontal: 4,
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    backgroundColor: PAPER,
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
    paddingHorizontal: 4,
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
    backgroundColor: INK,
  },

  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bottomLeft: {
    flex: 1,
    paddingRight: 20,
  },
  bottomRight: {
    width: 240,
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: LIGHT_RULE,
    paddingBottom: 4,
  },

  bankBox: {
    borderWidth: 1,
    borderColor: RULE,
    padding: 10,
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
    borderWidth: 1,
    borderColor: RULE,
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
    borderTopColor: INK,
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
    borderTopWidth: 1,
    borderTopColor: INK,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceDueLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    flex: 1,
    paddingRight: 8,
  },
  balanceDueValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    textAlign: 'right',
  },

  advanceBox: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: INK,
    padding: 10,
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
    color: INK,
    textAlign: 'right',
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
    marginTop: 16,
  },
  notesTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED_TEXT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: LIGHT_RULE,
    paddingBottom: 4,
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
    marginTop: 12,
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
    marginBottom: 3,
    lineHeight: 1.4,
  },

  additionalFieldsBar: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: LIGHT_RULE,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  additionalFieldItem: {
    width: '33%',
    marginBottom: 6,
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
    borderTopColor: INK,
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
    left: 28,
    right: 28,
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
