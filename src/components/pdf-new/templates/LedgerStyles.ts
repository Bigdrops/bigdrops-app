import { StyleSheet } from '@react-pdf/renderer';

const colors = {
  ink: '#2b2b2b',
  paper: '#ffffff',
  rule: '#cdc9c1',
  lightRule: '#e7e3da',
  bgPanel: '#f4f2ed',
  accent: '#7b8b6f',
  link: '#0056b3',
  linkBg: '#f0f7ff',
  grayText: '#6b6560',
  lightGray: '#8a837b',
  groupBg: '#fcfbf9',
};

export const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.paper,
    fontFamily: 'Helvetica',
    padding: 0,
  },
  invoiceContainer: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingBottom: 60,
  },
  
  // Header (Fixed Flex Layout)
  header: {
    flexDirection: 'row',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightRule,
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1, // Allows it to take all available space left of logo
    flexDirection: 'column',
    paddingRight: 12,
  },
  brandName: {
    fontWeight: 'bold',
    fontSize: 12,
    color: colors.ink,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  brandContact: {
    fontSize: 8,
    color: colors.grayText,
    lineHeight: 1.4,
  },
  headerCenter: {
    width: 70, // Fixed width so it never shrinks or grows
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 60,
    height: 60,
    minWidth: 60, // Prevents compression
    minHeight: 60, // Prevents compression
    borderRadius: 8,
    objectFit: 'contain',
  },
  headerRight: {
    flex: 1, // Allows it to take all available space right of logo
    alignItems: 'flex-end',
    paddingLeft: 12,
  },
  docTitle: {
    fontSize: 20, // Slightly reduced to prevent wrap on long titles
    fontFamily: 'Times-Roman',
    color: colors.ink,
    marginBottom: 8,
    textAlign: 'right',
  },
  docMetaBlock: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  docMeta: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  customTitleText: {
    fontSize: 10,
    color: colors.grayText,
    marginBottom: 8,
    textAlign: 'right',
  },

  // Meta Section
  metaSection: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.lightRule,
    marginBottom: 24,
  },
  addressPanel: {
    width: '50%',
    padding: 24,
    borderRightWidth: 1,
    borderRightColor: colors.lightRule,
  },
  addressBlock: {
    marginBottom: 16,
  },
  addressLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: colors.lightGray,
    marginBottom: 4,
  },
  addressVal: {
    fontSize: 10,
    color: colors.ink,
    lineHeight: 1.4,
  },
  customHeadersPanel: {
    width: '50%',
    padding: 24,
    backgroundColor: '#fdfcfb',
  },
  customHeadersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  customItem: {
    width: '45%', 
    marginBottom: 12,
    flexDirection: 'column',
  },
  customKey: {
    fontSize: 7,
    fontWeight: 'bold',
    color: colors.lightGray,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  customVal: {
    fontSize: 9,
    color: colors.ink,
  },

  // Table
  tableSection: {
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: colors.lightGray,
    paddingHorizontal: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomStyle: 'dashed',
    borderBottomColor: colors.lightRule,
    paddingVertical: 12,
  },
  tableCell: {
    fontSize: 9,
    color: colors.ink,
    paddingHorizontal: 2,
  },
  itemDesc: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    marginBottom: 3,
    lineHeight: 1.3,
    paddingHorizontal: 2,
    color: colors.ink,
  },
  itemSub: {
    fontSize: 8,
    color: colors.grayText,
    lineHeight: 1.4,
    paddingHorizontal: 2,
  },
  
  // Thumbnails
  thumbnailContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  itemThumbnail: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.rule,
    marginRight: 8,
    objectFit: 'cover',
  },
  openImageLink: {
    fontSize: 8,
    color: colors.link,
    textDecoration: 'underline',
  },

  // Grouping
  groupHeader: {
    backgroundColor: colors.paper,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    flexDirection: 'row',
  },
  groupHeaderText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: colors.ink,
  },
  groupSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.paper,
  },
  groupSubtotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.ink,
    textAlign: 'right',
    marginRight: 8,
  },
  groupSubtotalVal: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.ink,
    textAlign: 'right',
  },
  groupClosingRule: {
    width: '100%',
    height: 2,
    backgroundColor: colors.ink,
  },

  // Bottom Section
  bottomSection: {
    paddingTop: 12,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
  },
  bottomPrimaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentCol: {
    width: '55%',
    paddingRight: 24,
  },
  leftFlowCol: {
    width: '55%',
    paddingRight: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: colors.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightRule,
    paddingBottom: 4,
    marginBottom: 8,
  },
  bankDetails: {
    backgroundColor: '#fdfcfb',
    borderWidth: 1,
    borderColor: colors.lightRule,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  bankLabel: {
    fontSize: 8,
    color: colors.grayText,
    width: '40%',
  },
  bankVal: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.ink,
    width: '60%',
    textAlign: 'right',
  },
  textBlock: {
    fontSize: 8,
    color: '#4a4a4a',
    lineHeight: 1.5,
    marginBottom: 16,
  },

  rightCol: {
    width: '100%',
  },
  totalsWrap: {
    width: '40%',
  },
  totalsPanel: {
    backgroundColor: colors.bgPanel,
    padding: 12,
    borderRadius: 4,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 9,
    color: '#4a4a4a',
    flex: 1,
    paddingRight: 8,
  },
  totalVal: {
    fontSize: 9,
    color: '#4a4a4a',
    textAlign: 'right',
  },
  totalLineGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    paddingTop: 6,
    marginTop: 6,
  },
  totalLabelGrand: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.ink,
    flex: 1,
    paddingRight: 8,
  },
  totalValGrand: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.ink,
    textAlign: 'right',
  },
  amountWords: {
    fontFamily: 'Times-Italic',
    fontSize: 8,
    color: colors.grayText,
    textAlign: 'right',
    marginTop: 10,
  },

  advanceBlock: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: colors.ink,
    padding: 12,
    backgroundColor: colors.paper,
  },
  advanceDue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  advanceDueLbl: {
    fontSize: 7,
    textTransform: 'uppercase',
    color: colors.ink,
    fontWeight: 'bold',
    flex: 1,
    paddingRight: 8,
  },
  advanceDueVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.ink,
    textAlign: 'right',
  },
  advanceBal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    borderTopStyle: 'dashed',
  },
  advanceBalText: {
    fontSize: 8,
    color: colors.grayText,
    flex: 1,
    paddingRight: 8,
  },
  advanceBalTextVal: {
    fontSize: 8,
    color: colors.grayText,
    textAlign: 'right',
  },

  // Footer Meta (Fields & Signatures)
  additionalFieldsBar: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.lightRule,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footerMetaGrid: {
    flexDirection: 'row',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.lightRule,
    flexWrap: 'wrap',
  },
  signatureBox: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingRight: 24,
  },
  signatureImg: {
    height: 40,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    paddingBottom: 4,
    minWidth: 120,
    objectFit: 'contain',
  },
  sigLineFallback: {
    height: 30,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    marginBottom: 8,
    width: 120,
  },
  sigName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.ink,
  },
  sigRole: {
    fontSize: 8,
    color: colors.grayText,
    marginTop: 2,
  },
  attachmentsBox: {
    flex: 1,
  },
  attachmentItem: {
    marginBottom: 4,
  },
  attachmentLink: {
    fontSize: 9,
    color: colors.link,
    textDecoration: 'none',
  },

  // Fixed Page Footer
  pageFooter: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: colors.lightRule,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  ftLeft: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.ink,
  },
  ftCenter: {
    fontSize: 8,
    color: colors.grayText,
  },
  ftRight: {
    fontSize: 8,
    color: colors.grayText,
    textTransform: 'uppercase',
  },

  // Utility Alignments
  textLeft: { textAlign: 'left' },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
});
