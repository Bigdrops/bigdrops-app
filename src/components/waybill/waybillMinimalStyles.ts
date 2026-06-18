import { StyleSheet } from '@react-pdf/renderer'

const s = { gap: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }

export const minimalStyles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#000000',
    backgroundColor: '#ffffff',
  },

  root: {
    flex: 1,
    flexDirection: 'column',
  },

  titleZone: {
    marginBottom: s.sm,
    paddingBottom: s.sm,
    borderBottom: '2pt solid #000',
  },
  docTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
  },

  headerGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s.md,
    marginBottom: s.md,
  },
  brandLogo: {
    width: 48,
    height: 48,
    objectFit: 'contain',
    marginBottom: s.xs,
  },
  brandInfo: {
    flex: 3,
  },
  brandName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: s.xs,
  },
  brandTagline: {
    fontSize: 9,
    marginBottom: s.xs,
  },
  brandAddress: {
    fontSize: 9,
    marginBottom: s.xs,
  },
  brandContact: {
    fontSize: 9,
    color: '#444444',
    marginBottom: s.xs,
  },

  identifierColumn: {
    flex: 1,
    alignSelf: 'flex-start',
  },
  identifierBlock: {
    marginTop: 0,
  },

  metaPillRow: {
    flexDirection: 'column',
    gap: s.xs,
    alignItems: 'flex-end',
    marginBottom: s.sm,
  },
  metaPillCol: {
    flexDirection: 'column',
    gap: s.xs,
    alignItems: 'flex-end',
    marginBottom: s.sm,
  },
  metaPill: {
    border: '1pt solid #000',
    padding: '4pt 8pt',
    fontSize: 9,
    flexDirection: 'row',
    minWidth: 120,
  },
  metaPillValue: {},
  datePill: { minHeight: 24 },
  dateLabel: {
    fontSize: 8,
    color: '#555555',
    marginBottom: 1,
  },
  dateValue: {
    minWidth: 100,
  },

  topGrid: {
    flexDirection: 'row',
    gap: s.sm,
    marginBottom: s.sm,
  },
  topBox: {
    flex: 1,
    border: '1pt solid #000',
    padding: s.sm,
    minHeight: 56,
  },
  boxLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: s.xs,
    color: '#000000',
  },

  secondGrid: {
    flexDirection: 'row',
    gap: s.sm,
    marginBottom: s.sm,
  },
  secondBox: {
    flex: 1,
    border: '1pt solid #000',
    padding: s.sm,
    minHeight: 28,
  },

  modeRow: {
    flexDirection: 'row',
    gap: s.sm,
    marginBottom: s.md,
  },
  modeBox: {
    flex: 1,
    border: '1pt solid #000',
    padding: s.sm,
    minHeight: 40,
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: s.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 'auto',
    paddingBottom: s.xs,
  },
  checkboxLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    border: '1pt solid #000',
    padding: '4pt 8pt',
    fontSize: 10,
  },
  checkboxBox: {
    width: 10,
    height: 10,
    border: '1pt solid #000',
  },

  contentZone: {
    flex: 1,
    marginBottom: s.md,
  },
  table: {
    marginBottom: s.md,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f4',
  },
  tableHeaderCell: {
    border: '1pt solid #000',
    padding: '4pt 8pt',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableRow: { flexDirection: 'row' },
  tableCell: {
    border: '1pt solid #000',
    padding: '4pt 8pt',
    fontSize: 10,
    minHeight: 24,
  },
  colNum: { flex: 1 },
  colDesc: { flex: 14 },
  colQty: { flex: 2.4, textAlign: 'center' },
  colUnit: { flex: 2.6, textAlign: 'center' },

  notesBox: {
    border: '1pt solid #000',
    padding: s.sm,
    minHeight: 40,
    marginBottom: s.sm,
  },

  sigsRow: {
    flexDirection: 'row',
    gap: s.sm,
    marginBottom: s.sm,
  },
  sigCard: {
    flex: 1,
    border: '1pt solid #000',
    minHeight: 100,
  },
  sigHeader: {
    backgroundColor: '#f4f4f4',
    padding: s.sm,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottom: '1pt solid #000',
  },
  sigMetaRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
  },
  sigMetaCell: {
    flex: 1,
    padding: '4pt 12pt',
    fontSize: 9,
    minHeight: 24,
  },
  sigMetaCellBorder: {
    flex: 1,
    padding: '4pt 12pt',
    fontSize: 9,
    minHeight: 24,
    borderRight: '1pt solid #000',
  },
  sigArea: {
    padding: s.sm,
    minHeight: 48,
    fontSize: 9,
    color: '#555555',
  },

  footer: {
    paddingTop: s.xs,
    borderTop: '1pt solid #000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#555555',
  },
})
