import { StyleSheet } from '@react-pdf/renderer'
import { safeText } from '../core/safeText'
import { getDescriptionMain, getDescriptionSub } from '../core/description'

export { safeText as getCellText, getDescriptionMain, getDescriptionSub }

type IndustryColumn = {
  key: string
  align?: string
  width?: number
  flex?: number
  dataType?: string | null
}

const INDUSTRY_COLUMN_OVERRIDES: Record<string, { width?: number; flex?: number }> = {
  num: { width: 20, flex: 0.45 },
  description: { flex: 3.7 },
  make: { flex: 1.1 },
  quantity: { width: 44, flex: 0.8 },
  unit: { width: 44, flex: 0.85 },
  unit_price: { width: 74, flex: 1.35 },
  amount: { width: 82, flex: 1.55 },
  install_rate: { width: 74, flex: 1.3 },
  vat_rate: { width: 42, flex: 0.82 },
  discount_rate: { width: 48, flex: 0.92 },
}

export const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 64,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    color: '#333333',
    fontSize: 10.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginBottom: 18,
  },
  headerLeft: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    paddingRight: 18,
  },
  headerRight: {
    width: 96,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 27,
    color: '#1f2937',
    marginBottom: 2,
    letterSpacing: 1.2,
    fontFamily: 'Helvetica-Bold',
  },
  customTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    fontFamily: 'Helvetica',
  },
  metaList: {
    marginTop: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 9,
  },
  metaLabel: {
    width: 96,
    flexShrink: 0,
    color: '#666666',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  metaValue: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    color: '#333333',
    fontSize: 10,
    lineHeight: 1.3,
  },
  logo: {
    width: 86,
    height: 86,
    objectFit: 'contain',
  },
  partyRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  partyBox: {
    flex: 1,
    backgroundColor: '#e8e8e8',
    borderWidth: 1,
    borderColor: '#d4d4d4',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    marginRight: 14,
    borderRadius: 3,
  },
  partyBoxLast: {
    marginRight: 0,
  },
  partyTitle: {
    fontSize: 14,
    color: '#7d8a88',
    marginBottom: 10,
    fontFamily: 'Helvetica-Bold',
  },
  partyName: {
    fontSize: 12.5,
    marginBottom: 5,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  partyLine: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 2,
    lineHeight: 1.35,
  },
  partyMuted: {
    fontSize: 9.5,
    color: '#6b7280',
    marginBottom: 2,
    lineHeight: 1.35,
  },
  customInfoWrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
  },
  tableWrap: {
    marginBottom: 20,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#7d8a88',
    borderBottomWidth: 1,
    borderBottomColor: '#6c7a78',
  },
  tableHeaderCell: {
    paddingVertical: 9,
    paddingHorizontal: 6,
    color: '#ffffff',
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    borderRightWidth: 0.5,
    borderRightColor: '#dfe5e4',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowEven: { backgroundColor: '#f8fafc' },
  tableGroupHeader: {
    marginTop: 14,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 12,
    borderTopWidth: 1.8,
    borderTopColor: '#333333',
    backgroundColor: '#f9fafb',
  },
  tableGroupFooter: {
    marginBottom: 14,
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1.8,
    borderBottomColor: '#333333',
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  tableRowInGroup: {
    borderLeftWidth: 3,
    borderLeftColor: '#d1d5db',
  },
  tableCell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 10,
    color: '#333333',
    borderRightWidth: 0.5,
    borderRightColor: '#ececec',
    justifyContent: 'center',
  },
  descriptionCellYield: {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
  },
  quantityCellFixed: {
    width: 72,
    flexGrow: 0,
    flexShrink: 0,
  },
  groupTitleCell: {
    textAlign: 'left',
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    letterSpacing: 0.1,
  },
  groupBlockStack: {
    flexDirection: 'column',
    gap: 3,
  },
  groupSubtotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupSubtotalLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'Helvetica-Bold',
  },
  groupSubtotalValue: {
    fontSize: 10,
    color: '#1f2937',
    fontFamily: 'Helvetica-Bold',
  },
  descriptionMain: {
    fontSize: 10.2,
    color: '#1f2937',
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.35,
  },
  descriptionSub: {
    marginTop: 3,
    fontSize: 8.8,
    color: '#6b7280',
    lineHeight: 1.35,
  },
  makeText: { fontSize: 9.6, color: '#6b7280' },
  tightCellText: {
    fontSize: 10,
    color: '#333333',
    lineHeight: 1.2,
  },
  qtyUnitToken: {
    flexGrow: 0,
    flexShrink: 0,
  },
  textRight: { textAlign: 'right' },
  textCenter: { textAlign: 'center' },
  imageThumb: {
    width: 58,
    height: 58,
    objectFit: 'cover',
    marginBottom: 4,
  },
  imageLink: {
    marginTop: 2,
    fontSize: 8.5,
    color: '#2563eb',
    textDecoration: 'underline',
  },
  closingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  closingRowNoBank: { justifyContent: 'flex-end' },
  bankBox: {
    flex: 1,
    backgroundColor: '#e8e8e8',
    borderWidth: 1,
    borderColor: '#d4d4d4',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    marginRight: 18,
    borderRadius: 3,
  },
  totalsBox: {
    width: 232,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#d4d4d4',
    borderRadius: 3,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  totalsBoxSolo: { alignSelf: 'flex-end' },
  sectionTitle: {
    fontSize: 13,
    color: '#7d8a88',
    marginBottom: 10,
    fontFamily: 'Helvetica-Bold',
  },
  bankRow: { flexDirection: 'row', marginBottom: 7 },
  bankLabel: {
    width: 98,
    fontSize: 10,
    color: '#555555',
    fontFamily: 'Helvetica-Bold',
  },
  bankValue: {
    flex: 1,
    fontSize: 10,
    color: '#444444',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingVertical: 1,
  },
  totalLabel: {
    flex: 1,
    fontSize: 10,
    color: '#6b7280',
    paddingRight: 12,
  },
  totalValue: {
    width: 94,
    fontSize: 10,
    color: '#1f2937',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  totalFinal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#1f2937',
  },
  totalFinalLabel: {
    flex: 1,
    fontSize: 13,
    color: '#1f2937',
    fontFamily: 'Helvetica-Bold',
    paddingRight: 12,
  },
  totalFinalValue: {
    width: 108,
    fontSize: 13,
    color: '#1f2937',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  advanceBox: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 13,
    backgroundColor: '#f3f4f6',
    borderLeftWidth: 4,
    borderLeftColor: '#7d8a88',
  },
  advanceRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  advanceLabel: {
    flex: 1,
    fontSize: 9.5,
    color: '#555555',
    paddingRight: 10,
  },
  advanceValue: {
    width: 94,
    fontSize: 9.7,
    color: '#1f2937',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  advanceProminentLabel: {
    flex: 1,
    fontSize: 12.4,
    color: '#7d8a88',
    fontFamily: 'Helvetica-Bold',
    paddingRight: 10,
  },
  advanceProminentValue: {
    width: 94,
    fontSize: 13,
    color: '#7d8a88',
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  amountWords: {
    marginTop: 12,
    fontSize: 9,
    color: '#555555',
    fontStyle: 'italic',
    lineHeight: 1.45,
    backgroundColor: '#f8fafc',
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 3,
  },
  balanceDue: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#7d8a88',
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceDueText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
  },
  balanceDueValue: {
    width: 108,
    color: '#ffffff',
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  optionalSection: { marginBottom: 18 },
  optionalTitle: {
    fontSize: 13,
    color: '#7d8a88',
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
  },
  optionalText: {
    fontSize: 10,
    color: '#666666',
    lineHeight: 1.5,
  },
  optionalRichText: {
    marginTop: 2,
  },
  optionalParagraph: {
    fontSize: 10,
    color: '#666666',
    lineHeight: 1.5,
    marginBottom: 6,
  },
  optionalList: {
    marginBottom: 6,
  },
  optionalListItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  optionalListMarker: {
    width: 16,
    fontSize: 10,
    color: '#666666',
    lineHeight: 1.5,
    fontFamily: 'Helvetica-Bold',
  },
  optionalListItemText: {
    flex: 1,
    fontSize: 10,
    color: '#666666',
    lineHeight: 1.5,
  },
  attachmentsWrap: { marginTop: 6 },
  attachmentItem: {
    fontSize: 10,
    color: '#555555',
    marginBottom: 4,
    lineHeight: 1.4,
  },
  attachmentLink: {
    fontSize: 10,
    color: '#555555',
    textDecoration: 'underline',
    marginBottom: 4,
    lineHeight: 1.4,
  },
  additionalWrap: {
    marginTop: 4,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: '#f5f7f6',
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  additionalRow: { flexDirection: 'row', marginBottom: 6 },
  additionalLabel: {
    width: 118,
    fontSize: 10,
    color: '#666666',
  },
  additionalValue: {
    flex: 1,
    fontSize: 10,
    color: '#333333',
    fontFamily: 'Helvetica-Bold',
  },
  signatureWrap: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  signatureBox: {
    width: 230,
    alignItems: 'center',
  },
  signatureImage: {
    width: 138,
    height: 40,
    objectFit: 'contain',
    marginBottom: 2,
  },
  signatureLine: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    marginBottom: 6,
  },
  signerName: {
    fontSize: 11,
    color: '#333333',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  signerRole: {
    fontSize: 9.5,
    color: '#666666',
    textAlign: 'center',
  },
  footerZone: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 14,
  },
  footerExtraText: {
    marginBottom: 6,
    textAlign: 'center',
    fontSize: 9,
    color: '#777777',
  },
  taglineFooter: {
    marginBottom: 6,
    textAlign: 'center',
    fontSize: 9,
    color: '#999999',
    fontStyle: 'italic',
  },
  documentFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#dddddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#888888',
  },
})

export function resolveIndustryColumnStyle(column: IndustryColumn) {
  const override = INDUSTRY_COLUMN_OVERRIDES[column.key] || {}
  const width = Number(column.width ?? override.width ?? 0)
  const flex = Number(column.flex ?? override.flex ?? 1)

  if (width > 0) {
    return {
      width,
      flexGrow: 0,
      flexShrink: 0,
    }
  }

  return {
    flexBasis: 0,
    flexGrow: flex,
    flexShrink: 1,
  }
}

export function resolveTextAlignmentStyle(column: IndustryColumn) {
  if (column.align === 'right') return styles.textRight
  if (column.align === 'center') return styles.textCenter
  return null
}
