import { StyleSheet } from '@react-pdf/renderer'

export const minimalStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#000000',
    backgroundColor: '#ffffff',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '2pt solid #000',
    paddingBottom: 10,
    marginBottom: 15,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 52,
    height: 52,
    border: '1pt solid #000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  brandName: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  brandAddress: { fontSize: 10, color: '#444444' },
  docTitle: { fontSize: 22, fontWeight: 'bold', letterSpacing: 2, textAlign: 'right' },
  metaPillRow: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end', marginTop: 4 },
  metaPill: { border: '1pt solid #000', padding: '3pt 8pt', fontSize: 9, flexDirection: 'row' },
  metaPillLabel: { fontWeight: 'bold' },
  metaPillValue: {},

  topGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  topBox: { flex: 1, border: '1pt solid #000', padding: '6pt 10pt', minHeight: 55 },
  boxLabel: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },

  secondGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  secondBox: { flex: 1, border: '1pt solid #000', padding: '6pt 10pt', minHeight: 50 },

  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modeBox: { flex: 1, border: '1pt solid #000', padding: '6pt 10pt', minHeight: 50 },
  checkboxRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 'auto', paddingBottom: 4 },
  checkboxLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, border: '1pt solid #000', padding: '3pt 8pt', fontSize: 10 },
  checkboxChar: { fontSize: 10 },

  table: { marginBottom: 12 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f4f4f4' },
  tableHeaderCell: { border: '1pt solid #000', padding: '6pt 8pt', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.8 },
  tableRow: { flexDirection: 'row' },
  tableCell: { border: '1pt solid #000', padding: '4pt 8pt', fontSize: 10, minHeight: 24 },
  colNum: { width: '5%', textAlign: 'center' },
  colDesc: { width: '70%' },
  colQty: { width: '12%', textAlign: 'center' },
  colUnit: { width: '13%', textAlign: 'center' },

  notesBox: { border: '1pt solid #000', padding: '6pt 10pt', minHeight: 50, marginBottom: 10 },

  sigsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  sigCard: { flex: 1, border: '1pt solid #000' },
  sigHeader: {
    backgroundColor: '#f4f4f4',
    padding: '6pt 10pt',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottom: '1pt solid #000',
  },
  sigMetaRow: { flexDirection: 'row', borderBottom: '1pt solid #000' },
  sigMetaCell: { flex: 1, padding: '4pt 10pt', fontSize: 9, minHeight: 24 },
  sigMetaCellBorder: { flex: 1, padding: '4pt 10pt', fontSize: 9, minHeight: 24, borderRight: '1pt solid #000' },
  sigArea: { padding: '5pt 10pt', minHeight: 48, fontSize: 9, color: '#555555' },

  footer: {
    marginTop: 10,
    paddingTop: 6,
    borderTop: '1pt solid #000',
    textAlign: 'center',
    fontSize: 9,
    color: '#555555',
  },
})
