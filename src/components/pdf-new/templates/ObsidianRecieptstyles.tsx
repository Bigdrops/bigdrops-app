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
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 0,
    borderBottom: '2px solid',
    borderBottomColor: '#1a1a1a', // will be overridden by accent if set
  },
  headerLeft: {
    flexDirection: 'column',
  },
  companyName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 7,
    color: '#5e5750',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 22,
    lineHeight: 1,
  },
  documentNumberBadge: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    backgroundColor: '#f6f3ef',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  /* ---------- META GRID ---------- */
  metaGrid: {
    flexDirection: 'row',
    borderBottom: '1px solid',
    borderBottomColor: '#e4ded4',
  },
  metaLeft: {
    flex: 1,
    padding: 14,
    borderRight: '1px solid',
    borderRightColor: '#e4ded4',
  },
  partyBlock: {
    marginBottom: 10,
  },
  partyLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#8c8279',
    marginBottom: 2,
  },
  partyName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 8,
    lineHeight: 1.45,
    color: '#3a3a3a',
  },
  customFieldsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  customField: {
    fontSize: 8,
    lineHeight: 1.3,
  },
  customFieldLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#8c8279',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  customFieldValue: {
    fontWeight: 500,
  },
  /* ---------- META RIGHT ---------- */
  metaRight: {
    width: 190,
    padding: 14,
    backgroundColor: '#fcfaf8',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 8,
  },
  dateLabel: {
    color: '#8c8279',
  },
  dateValue: {
    fontFamily: 'Helvetica-Bold',
  },
  totalsBlock: {
    marginTop: 'auto',
    paddingTop: 8,
    borderTop: '2px solid',
    borderTopColor: '#1a1a1a',
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    marginBottom: 3,
  },
  dueLine: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
    paddingTop: 5,
    borderTop: '1px solid',
    borderTopColor: '#cbc5bd',
  },
  amountInWords: {
    fontSize: 7,
    color: '#5e5750',
    marginTop: 4,
    fontStyle: 'italic',
  },
  /* ---------- TABLE ---------- */
  items: {
    padding: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '2px solid',
    borderBottomColor: '#1a1a1a',
    paddingBottom: 4,
    marginBottom: 4,
  },
  columnHeader: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#8c8279',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px dashed',
    borderBottomColor: '#e4ded4',
    paddingVertical: 5,
    alignItems: 'flex-start',
  },
  tableCell: {
    fontSize: 8.5,
    paddingHorizontal: 2,
  },
  itemDescription: {
    fontWeight: 500,
  },
  itemBrand: {
    color: '#3a3a3a',
  },
  itemImage: {
    width: 40,
    height: 30,
    objectFit: 'contain',
    marginRight: 8,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f6f3ef',
    marginVertical: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 2,
    borderBottom: '1px solid #cbc5bd',
  },
  groupHeaderText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  groupFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  groupSubtotalLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginRight: 6,
  },
  groupSubtotalValue: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  /* ---------- BOTTOM BLOCKS ---------- */
  notesBlock: {
    marginTop: 10,
    paddingHorizontal: 12,
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 8,
    lineHeight: 1.4,
    color: '#3a3a3a',
  },
  termsBlock: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 4,
    borderTop: '1px solid #e4ded4',
  },
  termsTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  termsContent: {
    fontSize: 8,
    lineHeight: 1.4,
  },
  bankDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    fontSize: 8,
  },
  signatureBlock: {
    marginTop: 14,
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  signatureImage: {
    width: 80,
    height: 30,
  },
  /* ---------- FIXED FOOTER ---------- */
  footerFixed: {
    position: 'absolute',
    bottom: 10,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid #cbc5bd',
    paddingTop: 8,
    fontSize: 7,
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
  },
  // Utility
  collapse: {
    margin: 0,
    padding: 0,
    border: 'none',
  },
});

export function resolveAlignment(align?: string) {
  if (align === 'right') return { textAlign: 'right' };
  if (align === 'center') return { textAlign: 'center' };
  return { textAlign: 'left' };
}