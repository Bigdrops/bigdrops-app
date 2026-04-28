import { StyleSheet } from '@react-pdf/renderer';

// Olive & Stone palette
const palette = {
  ink: '#2d2d2d',
  accent: '#7d8c6d',
  sidebarBg: '#f4f1ea',
  paper: '#fefcf7',
  rule: '#c5bfb0',
  lightRule: '#e3ddd0',
  panel: '#ede8dd',
  link: '#2b4a3b',
  linkBg: '#e9f0e6',
  muted: '#8c857b',
};

export const styles = StyleSheet.create({
  /* ---- PAGE ---- */
  page: {
    backgroundColor: palette.paper,
    fontFamily: 'Helvetica',
    flexDirection: 'row',
    paddingBottom: 42, // space for fixed footer
  },

  /* ---- SIDEBAR ---- */
  sidebar: {
    width: 215,
    backgroundColor: palette.sidebarBg,
    borderRight: `1px solid ${palette.rule}`,
    padding: 24,
    flexShrink: 0,
  },
  sbLogo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: palette.ink,
    borderBottom: `2px solid ${palette.accent}`,
    paddingBottom: 5,
    marginBottom: 4,
  },
  sbCompanyDetail: {
    fontSize: 6,
    color: '#5a5a5a',
    lineHeight: 1.5,
    marginBottom: 10,
  },
  sbDivider: {
    borderTop: `1px dashed ${palette.rule}`,
    marginVertical: 8,
    height: 0,
  },
  sbSection: {
    marginBottom: 6,
  },
  sbLabel: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: palette.muted,
    marginBottom: 1,
  },
  sbValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    lineHeight: 1.3,
  },
  sbValueSm: {
    fontSize: 6.5,
    color: '#4a4a4a',
  },
  /* Totals inside sidebar */
  sbTotals: {
    marginTop: 2,
  },
  sbTotalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6.5,
    marginBottom: 2,
  },
  sbTotalLineGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    borderTop: `1px solid ${palette.rule}`,
    paddingTop: 4,
    marginTop: 4,
  },
  sbAmountWords: {
    fontFamily: 'Times-Italic',
    fontSize: 5.5,
    color: '#6b6560',
    lineHeight: 1.3,
    marginTop: 3,
  },
  /* Advance inside sidebar */
  sbAdvance: {
    backgroundColor: '#ffffff',
    border: `1px solid ${palette.rule}`,
    padding: 8,
    marginTop: 6,
  },
  sbAdvanceLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6.5,
    marginBottom: 3,
  },
  sbAdvanceLineLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6.5,
    marginBottom: 0,
  },
  /* Bank inside sidebar */
  sbBank: {
    fontSize: 6,
    lineHeight: 1.6,
    color: '#4a4a4a',
    marginTop: 2,
  },
  sbBankStrong: {
    fontFamily: 'Helvetica-Bold',
    color: palette.ink,
  },
  /* Signature inside sidebar */
  sbSignature: {
    marginTop: 'auto',
    paddingTop: 10,
  },
  sbSigScribble: {
    fontFamily: 'Times-Italic',
    fontSize: 18,
    color: palette.ink,
    borderBottom: `1px solid ${palette.rule}`,
    paddingBottom: 3,
    marginBottom: 3,
  },
  sbSigName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
  },
  sbSigRole: {
    fontSize: 6,
    color: '#6b6560',
  },

  /* ---- MAIN AREA ---- */
  mainArea: {
    flex: 1,
    padding: 24,
    paddingRight: 28,
  },
  mainTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 22,
    color: palette.ink,
    lineHeight: 1,
    marginBottom: 3,
  },
  mainMeta: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: palette.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },

  /* ---- TABLE ---- */
  table: {
    width: '100%',
  },
  /* Header */
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottom: `2px solid ${palette.ink}`,
    paddingBottom: 6,
    marginBottom: 4,
  },
  th: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: palette.muted,
  },
  /* Column widths */
  colNum: { width: 14, textAlign: 'center' },
  colDesc: { width: 106 },
  colMake: { width: 44 },
  colModel: { width: 50 },
  colQty: { width: 30, textAlign: 'center' },
  colUnitPrice: { width: 50, textAlign: 'right' },
  colAmount: { width: 54, textAlign: 'right' },

  /* Data row */
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${palette.lightRule}`,
    paddingVertical: 7,
    alignItems: 'flex-start',
  },
  td: {
    fontSize: 7,
    paddingHorizontal: 1,
  },
  tdNum: {
    fontSize: 6.5,
    color: palette.muted,
    textAlign: 'center',
  },
  itemTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    marginBottom: 2,
    lineHeight: 1.2,
  },
  itemSub: {
    fontSize: 6,
    color: '#555555',
    lineHeight: 1.3,
  },
  makeCell: {
    fontSize: 6.5,
    color: '#5a5a5a',
  },
  modelCell: {
    fontSize: 6,
    color: '#3d3d3d',
  },
  qtyCell: {
    fontSize: 7,
    textAlign: 'center',
  },
  priceCell: {
    fontSize: 7,
    textAlign: 'right',
  },
  amountCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },

  /* Thumbnail */
  thumbnailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 5,
  },
  thumbnailImg: {
    width: 50,
    height: 36,
    border: `1px solid ${palette.rule}`,
    backgroundColor: palette.panel,
    marginRight: 6,
  },
  openImageLink: {
    fontSize: 5.5,
    color: palette.link,
    backgroundColor: palette.linkBg,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'none',
  },

  /* Group header */
  groupHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#ece7dc',
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderBottom: `1px solid ${palette.rule}`,
    marginTop: 2,
  },
  groupHeaderText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: palette.ink,
  },

  /* Group item indent */
  groupItemIndent: {
    marginLeft: 12,
  },
  groupItemPrefix: {
    position: 'absolute',
    left: 0,
    top: 0,
    fontSize: 7,
    color: palette.accent,
    fontFamily: 'Helvetica-Bold',
  },

  /* Group subtotal */
  groupSubtotalRow: {
    flexDirection: 'row',
    borderTop: `1px solid ${palette.rule}`,
    borderBottom: `2px solid ${palette.ink}`,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  groupSubtotalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    textAlign: 'right',
  },
  groupSubtotalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    textAlign: 'right',
  },

  /* ---- BOTTOM NOTES (page 2) ---- */
  bottomNotes: {
    marginTop: 14,
    borderTop: `1px solid ${palette.lightRule}`,
    paddingTop: 8,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: palette.muted,
    marginBottom: 3,
  },
  textBlock: {
    fontSize: 6.5,
    lineHeight: 1.5,
    color: '#4a4a4a',
    marginBottom: 8,
  },
  extraFieldsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  extraFieldItem: {
    marginRight: 24,
  },

  /* ---- FIXED FOOTER ---- */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderTop: `1px solid ${palette.rule}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: palette.paper,
    fontSize: 5.5,
    color: '#7a736c',
  },
  footerLeft: {
    fontFamily: 'Helvetica-Bold',
    color: palette.ink,
  },
  footerCenter: {
    fontWeight: 'normal',
  },
  footerRight: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});

export function resolveAlign(align?: string) {
  if (align === 'right') return { textAlign: 'right' as const };
  if (align === 'center') return { textAlign: 'center' as const };
  return { textAlign: 'left' as const };
}