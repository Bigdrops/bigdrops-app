import { Image, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'

interface ThermalTemplateProps {
  model: WaybillRenderModel
}

const S = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 11, color: '#000000', padding: 24, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2pt solid #000', paddingBottom: 8, marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logo: { width: 56, height: 56, objectFit: 'contain', marginRight: 10 },
  companyName: { fontSize: 14, fontWeight: 'bold' },
  companyAddress: { fontSize: 9, color: '#444444', marginTop: 2 },
  docTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'right' },
  sectionBox: { border: '1pt solid #000', padding: 6 },
  fieldLabel: { fontWeight: 'bold', fontSize: 9, textTransform: 'uppercase', color: '#333333', marginBottom: 4 },
  clientRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  clientBox: { flex: 1, border: '1pt solid #000', padding: 6, minHeight: 64 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metaBox: { border: '1pt solid #000', padding: 6, minHeight: 40 },
  checkboxGroup: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 'auto', paddingBottom: 1 },
  checkboxLabel: { flexDirection: 'row', alignItems: 'center', gap: 3, fontSize: 9 },
  checkboxBox: { width: 10, height: 10, border: '1pt solid #000' },
  checkboxChecked: { fontSize: 8, lineHeight: 1 },
  table: { width: '100%', marginBottom: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f4f4f4' },
  tableHeaderCell: { border: '1pt solid #000', padding: '5pt 6pt', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row' },
  tableCell: { border: '1pt solid #000', padding: '5pt 6pt', fontSize: 10, minHeight: 28 },
  colNum: { flex: 1 },
  colDesc: { flex: 4 },
  colQty: { flex: 1.2, textAlign: 'center' },
  notesBox: { border: '1pt solid #000', padding: 6, minHeight: 44, marginBottom: 12 },
  sigsRow: { flexDirection: 'row', gap: 12 },
  sigCard: { flex: 1, border: '1pt solid #000' },
  sigHeader: { backgroundColor: '#f4f4f4', padding: '5pt 7pt', fontWeight: 'bold', fontSize: 9, textTransform: 'uppercase', borderBottom: '1pt solid #000' },
  sigRow: { flexDirection: 'row', borderBottom: '1pt solid #000', minHeight: 26 },
  sigCell: { padding: '3pt 7pt', fontSize: 9, color: '#555555', flex: 1 },
  sigCellBorder: { padding: '3pt 7pt', fontSize: 9, color: '#555555', flex: 1, borderRight: '1pt solid #000' },
  sigArea: { padding: '4pt 7pt', height: 50, fontSize: 9, color: '#555555', justifyContent: 'center', alignItems: 'center' },
  signatureImage: { width: 110, height: 42, objectFit: 'contain' },
})

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={S.checkboxBox}>
      {checked ? <Text style={S.checkboxChecked}>✓</Text> : null}
    </View>
  )
}

export default function ThermalTemplate({ model }: ThermalTemplateProps) {
  const isHand = model.logistics.deliveryMode === 'By Hand'
  const isVehicle = model.logistics.deliveryMode === 'By Vehicle'
  const isModeOther = !!model.logistics.deliveryMode && !['By Hand', 'By Vehicle'].includes(model.logistics.deliveryMode)
  const isRepair = model.logistics.purpose === 'Repair'
  const isTransfer = model.logistics.purpose === 'Transfer'
  const isReasonOther = model.logistics.purpose === 'Other'

  const clientLabel = model.header.type === 'internal' ? 'Origin' : 'Client / Consignee'
  const clientValue = model.header.type === 'internal'
    ? (model.logistics.deliveryLocation || '')
    : (model.parties.clientName || '')

  return (
    <View style={S.page}>
      <View style={S.header}>
        <View style={S.headerLeft}>
          {model.branding.logo ? <Image src={model.branding.logo} style={S.logo} /> : null}
          <View>
            <Text style={S.companyName}>{model.branding.name || 'Company Name'}</Text>
            {model.branding.address ? <Text style={S.companyAddress}>{model.branding.address}</Text> : null}
          </View>
        </View>
        <View>
          <Text style={S.docTitle}>WAYBILL / DELIVERY NOTE</Text>
        </View>
      </View>

      <View style={S.clientRow}>
        <View style={S.clientBox}>
          <Text style={S.fieldLabel}>{clientLabel}</Text>
          <Text style={{ fontSize: 11 }}>{clientValue || ''}</Text>
        </View>
        <View style={S.clientBox}>
          <Text style={S.fieldLabel}>Destination Address</Text>
          <Text style={{ fontSize: 11 }}>{model.logistics.deliveryLocation || ''}</Text>
        </View>
      </View>

      <View style={S.metaRow}>
        <View style={[S.metaBox, { flex: 1.2 }]}>
          <Text style={S.fieldLabel}>Vehicle Plate</Text>
          <Text style={{ fontSize: 11 }}>{model.logistics.vehiclePlate || ''}</Text>
        </View>
        <View style={[S.metaBox, { flex: 2 }]}>
          <Text style={S.fieldLabel}>Driver Name</Text>
          <Text style={{ fontSize: 11 }}>{model.logistics.driverName || ''}</Text>
        </View>
        <View style={[S.metaBox, { flex: 1.5 }]}>
          <Text style={S.fieldLabel}>Delivery Mode</Text>
          <View style={S.checkboxGroup}>
            <View style={S.checkboxLabel}>
              <Checkbox checked={isHand} />
              <Text>Hand</Text>
            </View>
            <View style={S.checkboxLabel}>
              <Checkbox checked={isVehicle} />
              <Text>Vehicle</Text>
            </View>
            {isModeOther ? (
              <View style={S.checkboxLabel}>
                <Checkbox checked />
                <Text>Other</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={[S.metaBox, { flex: 2 }]}>
          <Text style={S.fieldLabel}>Delivery Reason</Text>
          <View style={S.checkboxGroup}>
            <View style={S.checkboxLabel}>
              <Checkbox checked={isTransfer} />
              <Text>Transfer</Text>
            </View>
            <View style={S.checkboxLabel}>
              <Checkbox checked={isRepair} />
              <Text>Maint.</Text>
            </View>
            <View style={S.checkboxLabel}>
              <Checkbox checked={isReasonOther} />
              <Text>Other</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={S.table}>
        <View style={S.tableHeader} fixed>
          <Text style={[S.tableHeaderCell, S.colNum]}>#</Text>
          <Text style={[S.tableHeaderCell, S.colDesc]}>Description</Text>
          <Text style={[S.tableHeaderCell, S.colQty]}>Qty</Text>
        </View>
        {model.table.rows.map((row, index) => (
          <View key={index} style={S.tableRow}>
            <Text style={[S.tableCell, S.colNum]}>{index + 1}</Text>
            <Text style={[S.tableCell, S.colDesc]}>{row.cells['description'] || ''}</Text>
            <Text style={[S.tableCell, S.colQty]}>{row.cells['qty'] || ''}</Text>
          </View>
        ))}
      </View>

      {model.notes ? (
        <View style={S.notesBox}>
          <Text style={S.fieldLabel}>Delivery Remarks / Notes</Text>
          <Text style={{ fontSize: 10 }}>{model.notes}</Text>
        </View>
      ) : null}

      <View style={S.sigsRow} wrap={false}>
        <View style={S.sigCard}>
          <Text style={S.sigHeader}>Delivered By / Driver</Text>
          <View style={S.sigRow}>
            <Text style={S.sigCellBorder}>Name: {model.parties.senderName || ''}</Text>
            <Text style={S.sigCell}>Time:</Text>
          </View>
          <View style={S.sigArea}>
            {model.signatures.sender ? (
              <Image src={model.signatures.sender.url} style={S.signatureImage} />
            ) : null}
          </View>
        </View>
        <View style={S.sigCard}>
          <Text style={S.sigHeader}>Received By</Text>
          <View style={S.sigRow}>
            <Text style={S.sigCellBorder}>Name: {model.parties.receiverName || ''}</Text>
            <Text style={S.sigCell}>Time:</Text>
          </View>
          <View style={S.sigArea}>
            {model.signatures.receiver ? (
              <Image src={model.signatures.receiver.url} style={S.signatureImage} />
            ) : null}
          </View>
        </View>
      </View>
    </View>
  )
}
