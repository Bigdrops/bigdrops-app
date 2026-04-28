// BoltStyles.ts
import { StyleSheet } from '@react-pdf/renderer';

// static styles that don’t depend on dynamic colors
export const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    paddingBottom: 42, // space for fixed footer
  },

  /* ----- HEADER BANNER ----- */
  headerBanner: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
    paddingBottom: 18,
  },
  headerBannerBottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)', // subtle white strip
  },
  headerLeft: {
    flexDirection: 'column',
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  logoText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1a56db', // will be overridden with accent
    letterSpacing: 0.5,
  },
  companyName: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.2,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  companyContact: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 1.4,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  documentLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  documentTitle: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.5,
    lineHeight: 1,
    color: '#FFFFFF',
  },
  metaLine: {
    marginTop: 10,
    fontSize: 8,
    lineHeight: 1.6,
    alignItems: 'flex-end',
  },
  metaLabel: {
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 'normal',
    marginRight: 8,
    color: '#FFFFFF',
  },
  metaValue: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  /* ----- ADDRESS BLOCK ----- */
  addressRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e2e8f0',
  },
  addressColumn: {
    flex: 1,
    padding: 16,
    borderRight: '1px solid #e2e8f0',
  },
  addressColumnLast: {
    flex: 1,
    padding: 16,
  },
  addressLabel: {
    fontSize: 6,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#64748b',
    marginBottom: 4,
  },
  addressName: {
    fontWeight: 'bold',
    fontSize: 10,
    marginBottom: 2,
  },
  addressDetail: {
    fontSize: 8,
    color: '#475569',
    lineHeight: 1.4,
  },

  /* ----- CUSTOM FIELDS STRIP ----- */
  customStrip: {
    flexDirection: 'row',
    padding: 10,
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    flexWrap: 'wrap',
  },
  customFieldItem: {
    marginRight: 24,
    lineHeight: 1.4,
  },
  customFieldKey: {
    fontSize: 6,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#64748b',
  },
  customFieldValue: {
    fontWeight: 'bold',
    fontSize: 8,
  },

  /* ----- TABLE ----- */
  tableSection: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '2px solid #0f172a',
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableHeaderCell: {
    fontSize: 6.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#64748b',
  },
  /* column widths – fixed */
  colNum: { width: 14, textAlign: 'center' },
  colDesc: { width: 106 },
  colMake: { width: 44 },
  colModel: { width: 50 },
  colQty: { width: 30, textAlign: 'center' },
  colUnitPrice: { width: 50, textAlign: 'right' },
  colAmount: { width: 54, textAlign: 'right' },

  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e2e8f0',
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  tableCellBase: {
    fontSize: 8,
    paddingHorizontal: 1,
  },
  itemTitle: {
    fontWeight: 'bold',
    fontSize: 8,
    marginBottom: 2,
    lineHeight: 1.2,
  },
  itemSub: {
    fontSize: 7,
    color: '#475569',
    lineHeight: 1.3,
  },
  makeCell: {
    color: '#475569',
    fontSize: 7.5,
    marginLeft: 4,
  },
  modelCell: {
    fontSize: 7,
    color: '#334155',
    fontFamily: 'Courier',
  },
  qtyCell: {
    fontSize: 8,
    textAlign: 'center',
  },
  priceCell: {
    fontSize: 8,
    textAlign: 'right',
  },
  amountCell: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  /* Thumbnail */
  thumbnailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  thumbnailImg: {
    width: 50,
    height: 36,
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    marginRight: 8,
  },
  openImageLink: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#1e40af', // will be overridden
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 3,
    textDecoration: 'none',
    borderRadius: 4,
  },
  /* Group header */
  groupHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: '1px solid #dbeafe',
    marginTop: 4,
  },
  groupHeaderText: {
    fontWeight: 'bold',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#1a56db', // token
  },
  /* Group item indent */
  groupItemIndent: {
    marginLeft: 14,
  },
  groupItemPrefix: {
    position: 'absolute',
    left: 0,
    top: 0,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1a56db',
  },
  /* Group subtotal */
  groupSubtotalRow: {
    flexDirection: 'row',
    borderTop: '1px solid #cbd5e1',
    borderBottom: '2px solid #0f172a',
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  groupSubtotalLabel: {
    fontWeight: 'bold',
    fontSize: 8,
    textAlign: 'right',
    marginRight: 4,
  },
  groupSubtotalValue: {
    fontWeight: 'bold',
    fontSize: 8,
    textAlign: 'right',
  },

  /* ----- BOTTOM PANEL (3 columns) ----- */
  bottomPanel: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTop: '1px solid #e2e8f0',
    marginTop: 14,
  },
  bottomColumn: {
    flex: 1,
    marginRight: 24,
  },
  bottomColumnLast: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 7,
    color: '#1a56db', // token
    marginBottom: 6,
    borderBottom: '2px solid #dbeafe',
    paddingBottom: 3,
  },
  bankLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 8,
  },
  bankLabel: {
    color: '#475569',
  },
  bankValue: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  textBlock: {
    fontSize: 7.5,
    lineHeight: 1.5,
    color: '#475569',
  },
  attachmentLink: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e40af', // token
    textDecoration: 'none',
    marginBottom: 4,
  },

  /* ----- TOTALS + SIGNATURE ROW ----- */
  totalsSignatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTop: '2px solid #0f172a',
  },
  leftSection: {
    flex: 1,
  },
  totalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
  },
  totalsLine: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsLabel: {
    fontSize: 8.5,
    color: '#475569',
  },
  totalsValue: {
    fontSize: 8.5,
    fontWeight: '500',
    textAlign: 'right',
  },
  totalsGrandLine: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTop: '1px solid #cbd5e1',
  },
  totalsGrandLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalsGrandValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'right',
  },
  amountWords: {
    width: '100%',
    fontSize: 7,
    fontStyle: 'italic',
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  advanceBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#eff6ff',
    borderLeft: '4 solid #1a56db', // token
    padding: 12,
    borderRadius: 4,
  },
  advanceColumn: {
    flex: 1,
    marginRight: 16,
  },
  advanceLabel: {
    fontSize: 6.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#475569',
    marginBottom: 2,
  },
  advanceValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a56db', // token
  },
  advanceDivider: {
    width: 1,
    backgroundColor: '#dbeafe',
    alignSelf: 'stretch',
    marginRight: 16,
  },

  rightSection: {
    width: 220,
    alignItems: 'flex-end',
  },
  extraFieldsVertical: {
    marginBottom: 14,
    width: '100%',
  },
  extraFieldItem: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
    width: '100%',
  },
  extraFieldKey: {
    fontSize: 6,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#64748b',
    marginRight: 12,
  },
  extraFieldValue: {
    fontSize: 8,
    fontWeight: '500',
  },
  signatureBox: {
    width: '100%',
    alignItems: 'flex-end',
  },
  signatureScribble: {
    fontFamily: 'Times-Italic',
    fontSize: 20,
    color: '#0f172a',
    borderBottom: '1px solid #cbd5e1',
    paddingBottom: 4,
    marginBottom: 4,
    minWidth: 130,
    textAlign: 'right',
  },
  signatureName: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  signatureRole: {
    fontSize: 7.5,
    color: '#64748b',
  },

  /* ----- FIXED FOOTER ----- */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderTop: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: 7,
    color: '#64748b',
  },
  footerLeft: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  footerCenter: {
    fontWeight: 'normal',
  },
  footerRight: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Utility
  collapse: {
    margin: 0,
    padding: 0,
    border: 'none',
  },
});