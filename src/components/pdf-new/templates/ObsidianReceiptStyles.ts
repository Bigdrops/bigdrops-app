import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: {
    padding: 24,
    paddingBottom: 35, // space for fixed footer
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  /* ---------- HEADER ---------- */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Changed to center for better logo alignment
    paddingBottom: 16,
    marginBottom: 0,
    borderBottomWidth: 1.5,
    borderBottomStyle: 'solid',
    borderBottomColor: '#1a1a1a', 
  },
  headerLeft: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  companyName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14, // Increased
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 8, // Increased
    color: '#5e5750',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  invoiceTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 26, // Increased
    lineHeight: 1,
  },
  documentNumberBadge: {
    fontSize: 10, // Increased
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    backgroundColor: '#f6f3ef',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  /* ---------- META GRID ---------- */
  metaGrid: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#e4ded4',
  },
  metaLeft: {
    flex: 1,
    padding: 16, // Increased padding
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: '#e4ded4',
  },
  partyBlock: {
    marginBottom: 14,
  },
  partyLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#8c8279',
    marginBottom: 3,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  partyDetail: {
    fontSize: 9,
    lineHeight: 1.45,
    color: '#3a3a3a',
  },
  customFieldsContainer: {
    flexDirection: 'column', // Changed to vertical stack
    marginTop: 8,
  },
  customField: {
    marginBottom: 8, // Spacing between vertical fields
  },
  customFieldLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#8c8279',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2, // Space between label and value
  },
  customFieldValue: {
    fontSize: 9,
    fontWeight: 500,
  },
  /* ---------- META RIGHT ---------- */
  metaRight: {
    width: 210, // Increased from 190 to give totals more breathing room
    padding: 16,
    backgroundColor: '#fcfaf8',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    fontSize: 9,
  },
  dateLabel: {
    color: '#8c8279',
  },
  dateValue: {
    fontFamily: 'Helvetica-Bold',
  },
  totalsBlock: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopStyle: 'solid',
    borderTopColor: '#1a1a1a',
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 10, // Increased
    marginBottom: 4,
  },
  dueLine: {
    fontSize: 13, // Increased
    fontFamily: 'Helvetica-Bold',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#cbc5bd',
  },
  amountInWords: {
    fontSize: 8,
    color: '#5e5750',
    marginTop: 4,
    fontStyle: 'italic',
  },
  /* ---------- TABLE ---------- */
  items: {
    padding: 16, // Increased padding
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: '#1a1a1a',
    paddingBottom: 6,
    marginBottom: 6,
  },
  columnHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#8c8279',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomStyle: 'dashed',
    borderBottomColor: '#e4ded4',
    paddingVertical: 10, // Increased for natural row expansion
    alignItems: 'flex-start',
  },
  tableCell: {
    fontSize: 9.5, // Increased
    paddingHorizontal: 4,
    lineHeight: 1.4,
  },
  itemDescription: {
    fontWeight: 500,
  },
  itemBrand: {
    color: '#3a3a3a',
  },
  itemImage: {
    width: 48, // Increased size
    height: 48,
    objectFit: 'cover',
    marginTop: 6,
    borderRadius: 6, // Subtle rounding
    backgroundColor: '#f6f3ef',
  },
  itemDescriptionSub: {
    fontSize: 8,
    color: '#8c8279',
    marginTop: 4, // More spacing
    lineHeight: 1.4,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f6f3ef',
    marginVertical: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 2,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: '#cbc5bd',
  },
  groupHeaderText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  groupFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  groupSubtotalLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginRight: 6,
  },
  groupSubtotalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  /* ---------- ADVANCE SUMMARY ---------- */
  advanceSummaryContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 4,
  },
  advanceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  advanceSummaryLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#8c8279',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  advanceSummaryValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  /* ---------- BOTTOM BLOCKS ---------- */
  notesBlock: {
    marginTop: 10,
    paddingHorizontal: 16,
  },
  notesTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#3a3a3a',
  },
  termsBlock: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#e4ded4',
  },
  termsTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  termsContent: {
    fontSize: 9,
    lineHeight: 1.4,
  },
  bankDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    fontSize: 9,
  },
  signatureBlock: {
    marginTop: 16,
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  signatureImage: {
    width: 100, // Increased slightly
    height: 40,
    objectFit: 'contain',
  },
  /* ---------- FIXED FOOTER ---------- */
  footerFixed: {
    position: 'absolute',
    bottom: 10,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: '#cbc5bd',
    paddingTop: 8,
    fontSize: 8,
    color: '#6b625a',
    backgroundColor: 'white',
  },
  footerLeft: {
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  footerCenter: {
    fontWeight: 'normal',
  },
  footerRight: {
    fontWeight: 'normal',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#1a1a1a',
  },
  // Utility
  collapse: {
    margin: 0,
    padding: 0,
    borderWidth: 0,
  },
});

export function resolveAlignment(align?: string) {
  if (align === 'right') return { textAlign: 'right' as const };
  if (align === 'center') return { textAlign: 'center' as const };
  return { textAlign: 'left' as const };
}
