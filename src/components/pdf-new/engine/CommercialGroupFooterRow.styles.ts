import { StyleSheet } from '@react-pdf/renderer'

export const groupFooterStyles = StyleSheet.create({
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
})