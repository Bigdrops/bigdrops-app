import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#334155',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 20,
  },
  brand: {
    flexDirection: 'column',
  },
  brandName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  brandAccent: {
    color: '#f59e0b',
  },
  brandMeta: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 4,
  },
  invoiceMeta: {
    textAlign: 'right',
  },
  metaLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  // Addresses
  addresses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  addressBox: {
    width: '48%',
  },
  addressLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  addressText: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  // Table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 9,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 10,
    color: '#334155',
  },
  tableCellBold: {
    fontWeight: 'bold',
  },
  tableCellSub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  tableCellImage: {
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 4,
  },
  // Group rows
  groupHeader: {
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    marginBottom: 8,
  },
  groupHeaderLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    marginTop: 4,
    marginBottom: 12,
  },
  groupSubtotalLabel: {
    fontSize: 10,
    color: '#64748b',
    marginRight: 20,
  },
  groupSubtotalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  // Totals
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 25,
  },
  totalsBox: {
    width: 280,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    fontSize: 10,
  },
  totalRowFinal: {
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
    paddingTop: 12,
    marginTop: 8,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  // Advance summary
  advanceSummary: {
    backgroundColor: '#ecfdf5',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    padding: 15,
    marginBottom: 20,
    borderRadius: 4,
  },
  advanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  advanceRowLast: {
    marginBottom: 0,
  },
  advanceLabel: {
    fontSize: 10,
    color: '#065f46',
    fontWeight: 'bold',
  },
  advanceValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#065f46',
  },
  // Bank details
  bankSection: {
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    marginBottom: 20,
  },
  bankTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  bankRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bankLabel: {
    fontSize: 9,
    color: '#64748b',
    width: 100,
  },
  bankValue: {
    fontSize: 10,
    fontWeight: '500',
    color: '#334155',
  },
  // Notes & Terms
  notesSection: {
    marginBottom: 15,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  notesContent: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 1.5,
  },
  // Signature
  signatureSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  signatureImage: {
    width: 120,
    height: 60,
    marginBottom: 8,
  },
  signatureName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  signatureRole: {
    fontSize: 9,
    color: '#64748b',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 8,
    color: '#64748b',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    textAlign: 'right',
  },
  // Utilities
  flexRow: {
    flexDirection: 'row',
  },
  flexCol: {
    flexDirection: 'column',
  },
  justifyBetween: {
    justifyContent: 'space-between',
  },
  itemsCenter: {
    alignItems: 'center',
  },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb20: { marginBottom: 20 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  textRight: { textAlign: 'right' },
  textCenter: { textAlign: 'center' },
  textLeft: { textAlign: 'left' },
  fontBold: { fontWeight: 'bold' },
  textUppercase: { textTransform: 'uppercase' },
  textMuted: { color: '#64748b' },
});

export function resolveAlignment(align?: string) {
  if (align === 'right') return { textAlign: 'right' } as const;
  if (align === 'center') return { textAlign: 'center' } as const;
  return { textAlign: 'left' } as const;
}