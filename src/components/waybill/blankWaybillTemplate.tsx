import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import type { WaybillType } from './waybillUtils'

const S = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },

  header: {
    textAlign: 'center',
    marginBottom: 20,
    borderBottom: '2pt solid #000',
    paddingBottom: 10,
  },
  companyName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  docTitle: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  docNumber: { fontSize: 9, color: '#666666', marginTop: 4, textAlign: 'center' },

  partyRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  partyBox: { flex: 1, border: '1pt solid #000', padding: 10 },
  partyLabel: { fontWeight: 'bold', marginBottom: 6, borderBottom: '1pt solid #000', paddingBottom: 4 },
  partyLine: { marginBottom: 8 },
  partyLineLast: {},

  sectionTitle: {
    fontWeight: 'bold',
    borderBottom: '1pt solid #000',
    padding: 8,
    backgroundColor: '#f0f0f0',
    fontSize: 9,
  },

  tableHeader: { flexDirection: 'row', borderBottom: '1pt solid #000' },
  tableHeaderCell: { padding: 6, fontWeight: 'bold' },
  tableHeaderCellBordered: { padding: 6, fontWeight: 'bold', borderRight: '1pt solid #000' },

  tableRow: { flexDirection: 'row', borderBottom: '1pt solid #000' },
  tableCell: { padding: 6 },
  tableCellBordered: { padding: 6, borderRight: '1pt solid #000' },

  colNum: { width: 30 },
  colDesc: { flex: 6 },
  colQty: { flex: 1 },
  colUnit: { flex: 2 },
  colNotes: { flex: 3 },

  infoRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  infoBox: { flex: 1, border: '1pt solid #000', padding: 10 },
  infoLabel: { fontWeight: 'bold', marginBottom: 6, borderBottom: '1pt solid #000', paddingBottom: 4 },
  infoLine: { marginBottom: 8 },
  infoLineLast: {},

  signatureRow: { flexDirection: 'row', gap: 20 },
  signatureBox: { flex: 1, border: '1pt solid #000', padding: 10 },
  signatureLabel: { fontWeight: 'bold', marginBottom: 6, borderBottom: '1pt solid #000', paddingBottom: 4 },
  signatureSpace: { height: 60 },
  signatureDate: { borderTop: '1pt solid #000', paddingTop: 4, fontSize: 8 },
})

function BlankExternalTemplate({ waybillNumber, companyName }: { waybillNumber: string; companyName: string }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.companyName}>{companyName}</Text>
          <Text style={S.docTitle}>EXTERNAL DELIVERY NOTE</Text>
          <Text style={S.docNumber}>Waybill No: {waybillNumber || '____________________'}</Text>
        </View>

        <View style={S.partyRow}>
          <View style={S.partyBox}>
            <Text style={S.partyLabel}>Sender</Text>
            <Text style={S.partyLine}>Name: _________________________</Text>
            <Text style={S.partyLine}>Phone: ________________________</Text>
            <Text style={S.partyLineLast}>Address: _____________________</Text>
          </View>
          <View style={S.partyBox}>
            <Text style={S.partyLabel}>Receiver</Text>
            <Text style={S.partyLine}>Name: _________________________</Text>
            <Text style={S.partyLine}>Phone: ________________________</Text>
            <Text style={S.partyLineLast}>Address: _____________________</Text>
          </View>
        </View>

        <View style={{ border: '1pt solid #000', marginBottom: 20 }}>
          <Text style={S.sectionTitle}>Items</Text>
          <View style={S.tableHeader}>
            <Text style={[S.tableHeaderCellBordered, S.colNum]}>#</Text>
            <Text style={[S.tableHeaderCellBordered, S.colDesc]}>Description</Text>
            <Text style={[S.tableHeaderCellBordered, S.colQty]}>Qty</Text>
            <Text style={[S.tableHeaderCellBordered, S.colUnit]}>Unit</Text>
            <Text style={[S.tableHeaderCell, S.colNotes]}>Notes</Text>
          </View>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={S.tableRow}>
              <Text style={[S.tableCellBordered, S.colNum]}>{i}</Text>
              <Text style={[S.tableCellBordered, S.colDesc]}>_________________________</Text>
              <Text style={[S.tableCellBordered, S.colQty]}>__________</Text>
              <Text style={[S.tableCellBordered, S.colUnit]}>__________</Text>
              <Text style={[S.tableCell, S.colNotes]}>_________________________</Text>
            </View>
          ))}
        </View>

        <View style={S.infoRow}>
          <View style={S.infoBox}>
            <Text style={S.infoLabel}>Invoice Reference</Text>
            <Text style={S.infoLine}>Invoice No: ___________________</Text>
            <Text style={S.infoLineLast}>Invoice Date: _________________</Text>
          </View>
          <View style={S.infoBox}>
            <Text style={S.infoLabel}>Vehicle Info</Text>
            <Text style={S.infoLine}>Plate: ________________________</Text>
            <Text style={S.infoLineLast}>Driver: ______________________</Text>
          </View>
        </View>

        <View style={S.signatureRow}>
          <View style={S.signatureBox}>
            <Text style={S.signatureLabel}>Sender Signature</Text>
            <View style={S.signatureSpace} />
            <Text style={S.signatureDate}>Date: _________________</Text>
          </View>
          <View style={S.signatureBox}>
            <Text style={S.signatureLabel}>Receiver Signature</Text>
            <View style={S.signatureSpace} />
            <Text style={S.signatureDate}>Date: _________________</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

function BlankInternalTemplate({ waybillNumber, companyName }: { waybillNumber: string; companyName: string }) {
  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.companyName}>{companyName}</Text>
          <Text style={S.docTitle}>INTERNAL TRANSFER NOTE</Text>
          <Text style={S.docNumber}>Waybill No: {waybillNumber || '____________________'}</Text>
        </View>

        <View style={S.partyRow}>
          <View style={S.partyBox}>
            <Text style={S.partyLabel}>Origin</Text>
            <Text style={S.partyLine}>Depot: ________________________</Text>
            <Text style={S.partyLine}>Contact: ______________________</Text>
            <Text style={S.partyLineLast}>Date: _______________________</Text>
          </View>
          <View style={S.partyBox}>
            <Text style={S.partyLabel}>Destination</Text>
            <Text style={S.partyLine}>Depot: ________________________</Text>
            <Text style={S.partyLine}>Contact: ______________________</Text>
            <Text style={S.partyLineLast}>Date: _______________________</Text>
          </View>
        </View>

        <View style={{ border: '1pt solid #000', marginBottom: 20 }}>
          <Text style={S.sectionTitle}>Items</Text>
          <View style={S.tableHeader}>
            <Text style={[S.tableHeaderCellBordered, S.colNum]}>#</Text>
            <Text style={[S.tableHeaderCellBordered, S.colDesc]}>Description</Text>
            <Text style={[S.tableHeaderCellBordered, S.colQty]}>Qty</Text>
            <Text style={[S.tableHeaderCellBordered, S.colUnit]}>Unit</Text>
            <Text style={[S.tableHeaderCell, S.colNotes]}>Notes</Text>
          </View>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={S.tableRow}>
              <Text style={[S.tableCellBordered, S.colNum]}>{i}</Text>
              <Text style={[S.tableCellBordered, S.colDesc]}>_________________________</Text>
              <Text style={[S.tableCellBordered, S.colQty]}>__________</Text>
              <Text style={[S.tableCellBordered, S.colUnit]}>__________</Text>
              <Text style={[S.tableCell, S.colNotes]}>_________________________</Text>
            </View>
          ))}
        </View>

        <View style={S.infoRow}>
          <View style={S.infoBox}>
            <Text style={S.infoLabel}>Purpose</Text>
            <Text style={S.infoLine}>☐ Transfer  ☐ Maintenance  ☐ Other</Text>
            <Text style={S.infoLineLast}>Notes: ______________________</Text>
          </View>
          <View style={S.infoBox}>
            <Text style={S.infoLabel}>Vehicle Info</Text>
            <Text style={S.infoLine}>Plate: ________________________</Text>
            <Text style={S.infoLineLast}>Driver: ______________________</Text>
          </View>
        </View>

        <View style={S.signatureRow}>
          <View style={S.signatureBox}>
            <Text style={S.signatureLabel}>Sender Signature</Text>
            <View style={S.signatureSpace} />
            <Text style={S.signatureDate}>Date: _________________</Text>
          </View>
          <View style={S.signatureBox}>
            <Text style={S.signatureLabel}>Receiver Signature</Text>
            <View style={S.signatureSpace} />
            <Text style={S.signatureDate}>Date: _________________</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadBlankWaybillTemplate(type: WaybillType, waybillNumber: string, companyName: string): Promise<void> {
  const element = type === 'internal'
    ? <BlankInternalTemplate waybillNumber={waybillNumber} companyName={companyName} />
    : <BlankExternalTemplate waybillNumber={waybillNumber} companyName={companyName} />

  const blob = await pdf(element).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `blank-${type}-waybill.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
