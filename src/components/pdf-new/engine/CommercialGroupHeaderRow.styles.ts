import { StyleSheet } from '@react-pdf/renderer'

export const groupHeaderStyles = StyleSheet.create({
  tableGroupHeader: {
    marginTop: 14,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 12,
    borderTopWidth: 1.8,
    borderTopColor: '#333333',
    backgroundColor: '#f9fafb',
  },
  groupTitleCell: {
    textAlign: 'left',
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    letterSpacing: 0.1,
  },
})