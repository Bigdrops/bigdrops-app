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
    backgroundColor: '#e8e4db',
    fontFamily: 'Helvetica',
    padding: 24,
    paddingBottom: 60, // Space for fixed footer
  },
  invoiceContainer: {
    backgroundColor: colors.paper,
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightRule,
    alignItems: 'flex-start',
  },
  headerLeft: {
    width: '33.33%',
    flexDirection: 'column',
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
    width: '33.33%',
    alignItems: 'center',
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    objectFit: 'contain',
  },
  headerRight: {
    width: '33.33%',
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 24,
    fontFamily: 'Times-Roman',
    color: colors.ink,
    marginBottom: 6,
  },
  docMeta: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.accent,
    textTransform: 'uppercase',
  },

  // Meta Section
  metaSection: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.lightRule,
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
  },
  customItem: {
    marginRight: 24,
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
    paddingTop: 24,
    flexGrow: 1,
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
  },
  itemDesc: {
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 1.3,
  },
  itemSub: {
    fontSize: 8,
    color: '#555555',
    lineHeight: 1.4,
  },
  
  // Thumbnails
  thumbnailContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  itemThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.bgPanel,
    marginRight: 8,
    objectFit: 'cover',
  },
  openImageLink: {
    fontSize: 8,
    color: colors.link,
    backgroundColor: colors.linkBg,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    textDecoration: 'none',
    marginTop: 2,
  },

  // Grouping
  groupHeader: {
    backgroundColor: colors.bgPanel,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    flexDirection: 'row',
  },
  groupHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: colors.ink,
  },
  groupItemRow: {
    backgroundColor: colors.groupBg,
  },
  groupSubtotalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    paddingVertical: 12,
    backgroundColor: colors.paper,
  },
  groupSubtotalLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.ink,
    textAlign: 'right',
    paddingRight: 8,
  },
  groupSubtotalVal: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.ink,
    textAlign: 'right',
  },

  // Bottom Section
  bottomSection: {
    padding: 24,
  },
  bottomGrid: {
    flexDirection: 'row',
  },
  leftCol: {
    flex: 1,
    paddingRight: 32,
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
  },
  bankVal: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.ink,
  },
  textBlock: {
    fontSize: 8,
    color: '#4a4a4a',
    lineHeight: 1.5,
    marginBottom: 16,
  },

  rightCol: {
    width: 220,
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
  },
  advanceDueVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.ink,
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
  },

  // Footer Meta
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
  },
  signatureBox: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fdfcfb',
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
