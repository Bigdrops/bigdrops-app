import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const FOOTER_TEXT = 'Sun & Shield Power Solutions  |  Powering Your World, Shielding Your Future  |  sunshieldpowersolutions@gmail.com  |  08066190685'
const STATUS_OPTIONS = ['Complete', 'Incomplete', 'Pending for spares', 'Under observation', 'Working solution provided', 'Field Entry Pending']
// PDF templates only: exclude 'Field Entry Pending' from status checkboxes
const STATUS_OPTIONS_PDF = ['Complete', 'Incomplete', 'Pending for spares', 'Under observation', 'Working solution provided']

// ─── TEMPLATE 1: Classic Red/Blue ───────────────────────────────────────────
const t1 = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 20, backgroundColor: 'white' },
  header: { textAlign: 'center', marginBottom: 6 },
  headerName: { color: '#CC0000', fontFamily: 'Helvetica-Bold', fontSize: 16, textTransform: 'uppercase' },
  headerSub: { color: '#0056B3', fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  headerContact: { color: '#0056B3', fontSize: 8, marginTop: 1 },
  reportTitle: { backgroundColor: '#CC0000', color: 'white', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 11, padding: 4, marginBottom: 4, textTransform: 'uppercase' },
  secTitle: { backgroundColor: '#CC0000', color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9, padding: '3 6', marginTop: 4, textTransform: 'uppercase' },
  row: { flexDirection: 'row', borderWidth: 1, borderColor: '#0056B3', borderTopWidth: 0 },
  rowFirst: { flexDirection: 'row', borderWidth: 1, borderColor: '#0056B3' },
  cell: { flex: 1, padding: '4 6', borderRightWidth: 1, borderRightColor: '#0056B3' },
  cellLast: { flex: 1, padding: '4 6' },
  cellFull: { flex: 1, padding: '4 6' },
  label: { color: '#0056B3', fontFamily: 'Helvetica-Bold', fontSize: 8, marginBottom: 1 },
  value: { fontSize: 9 },
  readingsTh: { flex: 1, borderWidth: 1, borderColor: '#0056B3', padding: '3 4', fontFamily: 'Helvetica-Bold', fontSize: 8, textAlign: 'center', color: '#0056B3' },
  readingsTd: { flex: 1, borderWidth: 1, borderColor: '#0056B3', borderTopWidth: 0, padding: '4 4', fontSize: 9, textAlign: 'center' },
  serviceMain: { flex: 3, borderRightWidth: 1, borderRightColor: '#0056B3', padding: '4 6' },
  statusPanel: { flex: 1, padding: '5 6' },
  statusTitle: { color: '#CC0000', fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 4 },
  cbRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  chk: { width: 10, height: 10, borderWidth: 1, borderColor: '#333', marginRight: 3 },
  chkOn: { width: 10, height: 10, borderWidth: 1, borderColor: '#333', marginRight: 3, backgroundColor: '#CC0000' },
  chkMark: { color: 'white', fontSize: 7, textAlign: 'center' },
  sigRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#0056B3', borderTopWidth: 0 },
  sigCell: { flex: 1, padding: '4 6', borderRightWidth: 1, borderRightColor: '#0056B3' },
  sigCellLast: { flex: 1, padding: '4 6' },
  sigLine: { borderTopWidth: 1, borderTopColor: '#333', marginTop: 18, paddingTop: 2 },
  footer: { marginTop: 6, textAlign: 'center', fontSize: 7.5, color: '#0056B3', fontFamily: 'Helvetica-Bold' },
})

function Template1({ csr }) {
  return (
    <Document>
      <Page size="A4" style={t1.page}>
        <View style={t1.header}>
          <Text style={t1.headerName}>Sun & Shield Power Solutions</Text>
          <Text style={t1.headerSub}>Power Generator Sales | Maintenance | Installation | Rental | Facility Management</Text>
          <Text style={t1.headerContact}>43, Oshola Street, Ifako Ijaiye, Lagos  |  Tel: 08066190685  |  sunshieldpowersolutions@gmail.com  |  TIN: 10530485G8</Text>
        </View>
        <Text style={t1.reportTitle}>Customer Service Report</Text>

        <Text style={t1.secTitle}>Customer Details</Text>
        <View style={t1.rowFirst}>
          <View style={t1.cell}><Text style={t1.label}>CSR No.</Text><Text style={t1.value}>{csr.csr_number}</Text></View>
          <View style={t1.cellLast}><Text style={t1.label}>Date</Text><Text style={t1.value}>{csr.date}</Text></View>
        </View>
        {csr.show_po && csr.po_number ? (
          <View style={t1.row}>
            <View style={t1.cell}><Text style={t1.label}>PO No.</Text><Text style={t1.value}>{csr.po_number}</Text></View>
            <View style={t1.cellLast} />
          </View>
        ) : null}
        <View style={t1.row}><View style={t1.cellFull}><Text style={t1.label}>Customer Name</Text><Text style={t1.value}>{csr.client_name}</Text></View></View>
        <View style={t1.row}><View style={t1.cellFull}><Text style={t1.label}>Address</Text><Text style={t1.value}>{csr.address}</Text></View></View>

        <Text style={t1.secTitle}>Nature of Problem</Text>
        <View style={t1.rowFirst}><View style={t1.cellFull}><Text style={t1.label}>Detail Problem Reported</Text><Text style={t1.value}>{csr.problem_reported}</Text></View></View>

        <Text style={t1.secTitle}>Equipment Details</Text>
        <View style={t1.rowFirst}>
          <View style={t1.cell}><Text style={t1.label}>Equipment Type</Text><Text style={t1.value}>{csr.equipment_type}</Text></View>
          <View style={t1.cellLast}><Text style={t1.label}>Equipment Location</Text><Text style={t1.value}>{csr.equipment_location}</Text></View>
        </View>
        <View style={t1.row}>
          <View style={t1.cell}><Text style={t1.label}>Make</Text><Text style={t1.value}>{csr.make}</Text></View>
          <View style={t1.cell}><Text style={t1.label}>Model</Text><Text style={t1.value}>{csr.model}</Text></View>
          <View style={t1.cell}><Text style={t1.label}>Serial No.</Text><Text style={t1.value}>{csr.serial_no}</Text></View>
          <View style={t1.cellLast}><Text style={t1.label}>Capacity</Text><Text style={t1.value}>{csr.capacity}</Text></View>
        </View>

        <Text style={t1.secTitle}>Readings</Text>
        <View style={{ flexDirection: 'row' }}>
          {['Voltage (V)', 'Frequency (Hz)', 'Battery (V)', 'Temp (°C)', 'Pressure (bar)', 'Hours'].map(h => (
            <Text key={h} style={t1.readingsTh}>{h}</Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row' }}>
          {[csr.voltage, csr.frequency, csr.battery, csr.temperature, csr.pressure, csr.hours].map((v, i) => (
            <Text key={i} style={t1.readingsTd}>{v || ' '}</Text>
          ))}
        </View>

        <Text style={t1.secTitle}>Materials & Parts Used</Text>
        <View style={t1.rowFirst}><View style={t1.cellFull}><Text style={t1.value}>{csr.materials_used}</Text></View></View>

        <Text style={t1.secTitle}>Service Details</Text>
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: '#0056B3' }}>
          <View style={t1.serviceMain}>
            <Text style={t1.label}>Service Rendered</Text>
            <Text style={[t1.value, { marginBottom: 6 }]}>{csr.service_rendered}</Text>
            <Text style={t1.label}>Engineer's Remarks</Text>
            <Text style={t1.value}>{csr.engineer_remarks || ' '}</Text>
          </View>
          <View style={t1.statusPanel}>
            <Text style={t1.statusTitle}>Status after Service:</Text>
            {STATUS_OPTIONS_PDF.map(opt => (
              <View key={opt} style={t1.cbRow}>
                <View style={csr.status === opt ? t1.chkOn : t1.chk}>
                  {csr.status === opt && <Text style={t1.chkMark}>✓</Text>}
                </View>
                <Text style={{ fontSize: 8 }}>{opt}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={t1.row}>
          <View style={t1.cell}><Text style={t1.label}>Start of Service</Text><Text style={t1.value}>{csr.start_date} {csr.start_time || ''}</Text></View>
          <View style={t1.cellLast}><Text style={t1.label}>End of Service</Text><Text style={t1.value}>{csr.end_date} {csr.end_time || ''}</Text></View>
        </View>

        <Text style={t1.secTitle}>Customer Feedback</Text>
        <View style={t1.rowFirst}><View style={t1.cellFull}><Text style={t1.label}>Remarks</Text><Text style={t1.value}>{csr.customer_feedback || ' '}</Text></View></View>
        <View style={t1.sigRow}>
          <View style={t1.sigCell}><Text style={t1.label}>Name</Text><View style={t1.sigLine}><Text style={{ fontSize: 7, color: '#888' }}>{csr.acknowledgement_name || ''}</Text></View></View>
          <View style={t1.sigCell}><Text style={t1.label}>Signature</Text><View style={t1.sigLine} /></View>
          <View style={t1.sigCellLast}><Text style={t1.label}>Engineer Signature</Text><View style={t1.sigLine} /></View>
        </View>
        <Text style={t1.footer}>{FOOTER_TEXT}</Text>
      </Page>
    </Document>
  )
}

// ─── TEMPLATE 2: Clean Black Bordered ────────────────────────────────────────
const t2 = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 22, backgroundColor: 'white' },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#000', paddingBottom: 6, marginBottom: 8 },
  brandName: { fontSize: 13, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  tagline: { fontSize: 8, color: '#444', marginTop: 2 },
  metaRight: { alignItems: 'flex-end', fontSize: 8, color: '#333' },
  reportTitle: { backgroundColor: '#000', color: 'white', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 11, padding: 5, marginBottom: 8, textTransform: 'uppercase' },
  section: { marginBottom: 5, borderWidth: 1, borderColor: '#000' },
  secHead: { backgroundColor: '#f0f0f0', fontFamily: 'Helvetica-Bold', fontSize: 9, padding: '3 6', borderBottomWidth: 1, borderBottomColor: '#000', textTransform: 'uppercase' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ccc' },
  rowLast: { flexDirection: 'row' },
  cell: { flex: 1, padding: '4 6', borderRightWidth: 1, borderRightColor: '#ccc' },
  cellLast: { flex: 1, padding: '4 6' },
  cellFull: { flex: 4, padding: '4 6' },
  label: { fontFamily: 'Helvetica-Bold', fontSize: 8, marginBottom: 2 },
  value: { fontSize: 9 },
  twoCol: { flexDirection: 'row', gap: 5, marginBottom: 5 },
  halfSec: { flex: 1, borderWidth: 1, borderColor: '#000' },
  readingsTh: { flex: 1, backgroundColor: '#f8f8f8', borderRightWidth: 1, borderRightColor: '#000', borderBottomWidth: 1, borderBottomColor: '#000', padding: '3 4', fontFamily: 'Helvetica-Bold', fontSize: 8, textAlign: 'center' },
  readingsTd: { flex: 1, borderRightWidth: 1, borderRightColor: '#000', padding: '5 4', fontSize: 9, textAlign: 'center' },
  serviceGrid: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#000' },
  serviceMain: { flex: 3, borderRightWidth: 1, borderRightColor: '#000', padding: '5 6' },
  serviceField: { marginBottom: 5 },
  statusPanel: { flex: 1, padding: '5 6', backgroundColor: '#fafafa' },
  statusTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 3 },
  cbRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  chk: { width: 10, height: 10, borderWidth: 1, borderColor: '#000', marginRight: 4 },
  chkOn: { width: 10, height: 10, borderWidth: 1, borderColor: '#000', marginRight: 4, backgroundColor: '#1a1a1a' },
  chkMark: { color: 'white', fontSize: 7, textAlign: 'center' },
  sigRow: { flexDirection: 'row', padding: '5 6' },
  sigBox: { flex: 1, marginRight: 10 },
  sigLabel: { fontFamily: 'Helvetica-Bold', fontSize: 8, marginBottom: 4 },
  sigLine: { borderTopWidth: 1, borderTopColor: '#999', marginTop: 22, paddingTop: 3 },
  footer: { marginTop: 6, textAlign: 'center', fontSize: 7.5, color: '#555' },
})

function Template2({ csr }) {
  return (
    <Document>
      <Page size="A4" style={t2.page}>
        <View style={t2.header}>
          <View>
            <Text style={t2.brandName}>Sun & Shield Power Solutions</Text>
            <Text style={t2.tagline}>Generator Sales • Maintenance • Installation • Rental • Facility Management</Text>
          </View>
          <View style={t2.metaRight}>
            <Text>43, Oshola Street, Ifako Ijaiye, Lagos</Text>
            <Text>Tel: 08066190685</Text>
            <Text>sunshieldpowersolutions@gmail.com</Text>
            <Text>TIN: 10530485G8</Text>
          </View>
        </View>
        <Text style={t2.reportTitle}>Customer Service Report</Text>

        <View style={t2.section}>
          <Text style={t2.secHead}>Customer Details</Text>
          <View style={t2.row}>
            <View style={t2.cell}><Text style={t2.label}>CSR No.</Text><Text style={t2.value}>{csr.csr_number}</Text></View>
            <View style={t2.cell}><Text style={t2.label}>Date</Text><Text style={t2.value}>{csr.date}</Text></View>
            <View style={[t2.cellLast, { flex: 2 }]}><Text style={t2.label}>Customer</Text><Text style={t2.value}>{csr.client_name}</Text></View>
          </View>
          {csr.show_po && csr.po_number ? (
            <View style={t2.row}>
              <View style={t2.cell}><Text style={t2.label}>PO No.</Text><Text style={t2.value}>{csr.po_number}</Text></View>
              <View style={[t2.cellLast, { flex: 2 }]} />
            </View>
          ) : null}
          <View style={t2.rowLast}><View style={t2.cellFull}><Text style={t2.label}>Address</Text><Text style={t2.value}>{csr.address}</Text></View></View>
        </View>

        <View style={t2.twoCol}>
          <View style={t2.halfSec}>
            <Text style={t2.secHead}>Nature of Problem</Text>
            <View style={{ padding: '4 6' }}><Text style={t2.label}>Reported Issue</Text><Text style={t2.value}>{csr.problem_reported}</Text></View>
          </View>
          <View style={t2.halfSec}>
            <Text style={t2.secHead}>Equipment Details</Text>
            <View style={t2.row}>
              <View style={t2.cell}><Text style={t2.label}>Type</Text><Text style={t2.value}>{csr.equipment_type}</Text></View>
              <View style={t2.cellLast}><Text style={t2.label}>Location</Text><Text style={t2.value}>{csr.equipment_location}</Text></View>
            </View>
            <View style={t2.row}>
              <View style={t2.cell}><Text style={t2.label}>Make</Text><Text style={t2.value}>{csr.make}</Text></View>
              <View style={t2.cellLast}><Text style={t2.label}>Model</Text><Text style={t2.value}>{csr.model}</Text></View>
            </View>
            <View style={t2.rowLast}>
              <View style={t2.cell}><Text style={t2.label}>Serial No.</Text><Text style={t2.value}>{csr.serial_no}</Text></View>
              <View style={t2.cellLast}><Text style={t2.label}>Capacity</Text><Text style={t2.value}>{csr.capacity}</Text></View>
            </View>
          </View>
        </View>

        <View style={t2.section}>
          <Text style={t2.secHead}>Operational Readings</Text>
          <View style={{ flexDirection: 'row' }}>
            {['Voltage (V)', 'Frequency (Hz)', 'Battery (V)', 'Temp (°C)', 'Pressure (bar)', 'Run Hours'].map(h => (
              <Text key={h} style={t2.readingsTh}>{h}</Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row' }}>
            {[csr.voltage, csr.frequency, csr.battery, csr.temperature, csr.pressure, csr.hours].map((v, i) => (
              <Text key={i} style={t2.readingsTd}>{v || ' '}</Text>
            ))}
          </View>
        </View>

        <View style={t2.twoCol}>
          <View style={[t2.halfSec, { flex: 1 }]}>
            <Text style={t2.secHead}>Parts Used</Text>
            <View style={{ padding: '4 6' }}><Text style={t2.value}>{csr.materials_used}</Text></View>
          </View>
          <View style={[t2.halfSec, { flex: 2 }]}>
            <Text style={t2.secHead}>Service Execution</Text>
            <View style={t2.serviceGrid}>
              <View style={t2.serviceMain}>
                <View style={t2.serviceField}><Text style={t2.label}>Work Performed</Text><Text style={t2.value}>{csr.service_rendered}</Text></View>
                <View style={t2.serviceField}><Text style={t2.label}>Engineer Remarks</Text><Text style={[t2.value, { color: '#555' }]}>{csr.engineer_remarks || '—'}</Text></View>
              </View>
              <View style={t2.statusPanel}>
                <Text style={t2.statusTitle}>Status</Text>
                {STATUS_OPTIONS_PDF.map(opt => (
                  <View key={opt} style={t2.cbRow}>
                    <View style={csr.status === opt ? t2.chkOn : t2.chk}>
                      {csr.status === opt && <Text style={t2.chkMark}>✓</Text>}
                    </View>
                    <Text style={{ fontSize: 8 }}>{opt}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={t2.section}>
          <Text style={t2.secHead}>Completion & Acknowledgement</Text>
          <View style={t2.row}>
            <View style={t2.cell}><Text style={t2.label}>Service Start</Text><Text style={t2.value}>{csr.start_date} {csr.start_time || ''}</Text></View>
            <View style={t2.cell}><Text style={t2.label}>Service End</Text><Text style={t2.value}>{csr.end_date} {csr.end_time || ''}</Text></View>
            <View style={[t2.cellLast, { flex: 2 }]}><Text style={t2.label}>Feedback</Text><Text style={t2.value}>{csr.customer_feedback || '—'}</Text></View>
          </View>
          <View style={t2.sigRow}>
            <View style={t2.sigBox}><Text style={t2.sigLabel}>Name</Text><Text style={{ fontSize: 9 }}>{csr.acknowledgement_name || ' '}</Text><View style={t2.sigLine}><Text style={{ fontSize: 7, color: '#888' }}>Signature</Text></View></View>
            <View style={t2.sigBox}><Text style={t2.sigLabel}>Engineer Signature</Text><View style={[t2.sigLine, { marginTop: 28 }]} /></View>
          </View>
        </View>

        <Text style={t2.footer}>{FOOTER_TEXT}</Text>
      </Page>
    </Document>
  )
}

// ─── TEMPLATE 3: Navy/Orange Modern ─────────────────────────────────────────
const t3 = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, backgroundColor: 'white' },
  headerBand: { backgroundColor: '#1a2744', flexDirection: 'row', padding: '8 12 6', justifyContent: 'space-between', alignItems: 'center' },
  brandName: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  tagline: { color: '#e67e22', fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  metaRight: { alignItems: 'flex-end', fontSize: 8, color: '#c8d6f0' },
  titleStrip: { flexDirection: 'row', alignItems: 'stretch' },
  titleMain: { backgroundColor: '#e67e22', color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 11, padding: '4 14', flex: 1, textTransform: 'uppercase', letterSpacing: 2 },
  titleMeta: { backgroundColor: '#f0f4ff', flexDirection: 'row', alignItems: 'center', padding: '4 14', borderBottomWidth: 2, borderBottomColor: '#1a2744' },
  titleMetaText: { fontSize: 9, color: '#1a2744', marginRight: 16 },
  titleMetaBold: { color: '#e67e22', fontFamily: 'Helvetica-Bold' },
  content: { marginHorizontal: 0, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#1a2744' },
  secHead: { backgroundColor: '#1a2744', color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9, padding: '3 10', textTransform: 'uppercase', letterSpacing: 1 },
  secBody: { padding: '6 10' },
  twoCol: { flexDirection: 'row' },
  half: { flex: 1, borderRightWidth: 1, borderRightColor: '#d0d8ec' },
  halfLast: { flex: 1 },
  lbl: { color: '#e67e22', fontFamily: 'Helvetica-Bold', fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 },
  val: { borderBottomWidth: 1, borderBottomColor: '#1a2744', fontSize: 9.5, paddingBottom: 1, minHeight: 13 },
  valBlock: { borderWidth: 1, borderColor: '#d0d8ec', backgroundColor: '#f8faff', fontSize: 9.5, padding: '3 5', minHeight: 28 },
  fRow: { flexDirection: 'row', gap: 10, marginBottom: 5 },
  field: { flex: 1 },
  readingsTh: { flex: 1, backgroundColor: '#f0f4ff', borderWidth: 1, borderColor: '#c5cfea', padding: '3 4', fontFamily: 'Helvetica-Bold', fontSize: 8, textAlign: 'center', color: '#1a2744' },
  readingsTd: { flex: 1, borderWidth: 1, borderColor: '#c5cfea', borderTopWidth: 0, padding: '4 4', fontSize: 9, textAlign: 'center' },
  cbRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  chk: { width: 11, height: 11, borderWidth: 1.5, borderColor: '#1a2744', marginRight: 5, alignItems: 'center', justifyContent: 'center' },
  chkOn: { width: 11, height: 11, borderWidth: 1.5, borderColor: '#1a2744', marginRight: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a2744' },
  chkMark: { color: '#e67e22', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  sigStrip: { flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: '#1a2744' },
  sigCell: { flex: 1, padding: '5 10', borderRightWidth: 1, borderRightColor: '#d0d8ec' },
  sigCellLast: { flex: 1, padding: '5 10' },
  sigLine: { borderBottomWidth: 1, borderBottomColor: '#1a2744', minHeight: 20, marginTop: 4 },
  footerBar: { backgroundColor: '#1a2744', color: '#8a9ccc', fontSize: 8, textAlign: 'center', padding: 4 },
  divider: { borderTopWidth: 1, borderTopColor: '#d0d8ec' },
})

export function Template3({ csr }) {
  return (
    <Document>
      <Page size="A4" style={t3.page}>
        <View style={t3.headerBand}>
          <View>
            <Text style={t3.brandName}>Sun & Shield Power Solutions</Text>
            <Text style={t3.tagline}>Power Generator Sales  |  Maintenance  |  Installation  |  Rental  |  Facility Management</Text>
          </View>
          <View style={t3.metaRight}>
            <Text>43, Oshola Street, Ifako Ijaiye, Lagos</Text>
            <Text>Tel: 08066190685  |  sunshieldpowersolutions@gmail.com</Text>
            <Text>TIN: 10530485G8</Text>
          </View>
        </View>

        <View style={t3.titleStrip}>
          <Text style={t3.titleMain}>Customer Service Report</Text>
          <View style={t3.titleMeta}>
            <Text style={t3.titleMetaText}><Text style={t3.titleMetaBold}>CSR No.: </Text>{csr.csr_number}</Text>
            <Text style={t3.titleMetaText}><Text style={t3.titleMetaBold}>Date: </Text>{csr.date}</Text>
            {csr.show_po && csr.po_number ? (
              <Text style={t3.titleMetaText}><Text style={t3.titleMetaBold}>PO No.: </Text>{csr.po_number}</Text>
            ) : null}
          </View>
        </View>

        <View style={t3.content}>
          <View style={t3.twoCol}>
            <View style={t3.half}>
              <Text style={t3.secHead}>Customer Details</Text>
              <View style={t3.secBody}>
                <View style={[t3.fRow, { marginBottom: 5 }]}><View style={t3.field}><Text style={t3.lbl}>Customer Name</Text><Text style={t3.val}>{csr.client_name}</Text></View></View>
                <View style={t3.fRow}><View style={[t3.field, { flex: 3 }]}><Text style={t3.lbl}>Address</Text><Text style={t3.val}>{csr.address}</Text></View></View>
              </View>
            </View>
            <View style={t3.halfLast}>
              <Text style={t3.secHead}>Equipment Details</Text>
              <View style={t3.secBody}>
                <View style={t3.fRow}>
                  <View style={t3.field}><Text style={t3.lbl}>Type</Text><Text style={t3.val}>{csr.equipment_type}</Text></View>
                  <View style={t3.field}><Text style={t3.lbl}>Capacity</Text><Text style={t3.val}>{csr.capacity}</Text></View>
                </View>
                <View style={t3.fRow}>
                  <View style={t3.field}><Text style={t3.lbl}>Make</Text><Text style={t3.val}>{csr.make}</Text></View>
                  <View style={t3.field}><Text style={t3.lbl}>Model</Text><Text style={t3.val}>{csr.model}</Text></View>
                  <View style={t3.field}><Text style={t3.lbl}>Serial No.</Text><Text style={t3.val}>{csr.serial_no}</Text></View>
                </View>
                <View style={t3.fRow}><View style={[t3.field, { flex: 3 }]}><Text style={t3.lbl}>Equipment Location</Text><Text style={t3.val}>{csr.equipment_location}</Text></View></View>
              </View>
            </View>
          </View>

          <View style={[t3.twoCol, t3.divider]}>
            <View style={t3.half}>
              <Text style={t3.secHead}>Nature of Problem</Text>
              <View style={t3.secBody}><View style={t3.fRow}><View style={t3.field}><Text style={t3.lbl}>Detail Problem Reported</Text><Text style={t3.valBlock}>{csr.problem_reported}</Text></View></View></View>
            </View>
            <View style={t3.halfLast}>
              <Text style={t3.secHead}>Materials & Parts Used</Text>
              <View style={t3.secBody}><View style={t3.fRow}><View style={t3.field}><Text style={t3.lbl}>Parts / Materials</Text><Text style={t3.valBlock}>{csr.materials_used}</Text></View></View></View>
            </View>
          </View>

          <View style={t3.divider}>
            <Text style={t3.secHead}>Readings</Text>
            <View style={[t3.secBody, { paddingBottom: 6 }]}>
              <View style={{ flexDirection: 'row' }}>
                {['Voltage (V)', 'Frequency (Hz)', 'Battery (V)', 'Temperature (°C)', 'Pressure (bar)', 'Hours'].map(h => (
                  <Text key={h} style={t3.readingsTh}>{h}</Text>
                ))}
              </View>
              <View style={{ flexDirection: 'row' }}>
                {[csr.voltage, csr.frequency, csr.battery, csr.temperature, csr.pressure, csr.hours].map((v, i) => (
                  <Text key={i} style={t3.readingsTd}>{v || ' '}</Text>
                ))}
              </View>
            </View>
          </View>

          <View style={t3.divider}>
            <Text style={t3.secHead}>Service Details</Text>
            <View style={t3.twoCol}>
              <View style={[t3.half, { padding: '6 10' }]}>
                <Text style={[t3.lbl, { marginBottom: 2 }]}>Service Rendered</Text>
                <Text style={[t3.valBlock, { marginBottom: 6, minHeight: 32 }]}>{csr.service_rendered}</Text>
                <Text style={[t3.lbl, { marginBottom: 2 }]}>Engineer's Remarks</Text>
                <Text style={[t3.valBlock, { minHeight: 32 }]}>{csr.engineer_remarks || ' '}</Text>
              </View>
              <View style={[t3.halfLast, { padding: '6 10' }]}>
                <View style={{ marginBottom: 8 }}>
                  <View style={t3.fRow}>
                    <View style={t3.field}><Text style={t3.lbl}>Start of Service</Text><Text style={t3.val}>{csr.start_date} {csr.start_time || ''}</Text></View>
                    <View style={t3.field}><Text style={t3.lbl}>End of Service</Text><Text style={t3.val}>{csr.end_date} {csr.end_time || ''}</Text></View>
                  </View>
                </View>
                <Text style={t3.lbl}>Status After Service</Text>
                {STATUS_OPTIONS_PDF.map(opt => (
                  <View key={opt} style={t3.cbRow}>
                    <View style={csr.status === opt ? t3.chkOn : t3.chk}>
                      {csr.status === opt && <Text style={t3.chkMark}>✓</Text>}
                    </View>
                    <Text style={{ fontSize: 9 }}>{opt}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={t3.divider}>
            <Text style={t3.secHead}>Customer Feedback</Text>
            <View style={t3.secBody}>
              <View style={t3.fRow}><View style={[t3.field, { flex: 3 }]}><Text style={t3.lbl}>Remarks</Text><Text style={[t3.valBlock, { minHeight: 24 }]}>{csr.customer_feedback || ' '}</Text></View></View>
            </View>
          </View>

          <View style={t3.sigStrip}>
            <View style={t3.sigCell}><Text style={t3.lbl}>Name</Text><Text style={{ fontSize: 9 }}>{csr.acknowledgement_name || ' '}</Text><View style={t3.sigLine} /></View>
            <View style={t3.sigCell}><Text style={t3.lbl}>Signature</Text><View style={[t3.sigLine, { marginTop: 18 }]} /></View>
            <View style={t3.sigCellLast}><Text style={t3.lbl}>Engineer / Technician Signature</Text><View style={[t3.sigLine, { marginTop: 18 }]} /></View>
          </View>
        </View>

        <Text style={t3.footerBar}>{FOOTER_TEXT}</Text>
      </Page>
    </Document>
  )
}

// ─── MAIN VIEW COMPONENT ─────────────────────────────────────────────────────
export default function ViewCSR() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [csr, setCsr] = useState(null)
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState('3')

  useEffect(() => {
    supabase.from('csrs').select('*').eq('id', id).single().then(({ data }) => {
      setCsr(data)
      setLoading(false)
    })
  }, [id])

  if (loading) return <Layout title="CSR"><p style={{ padding: 30 }}>Loading...</p></Layout>
  if (!csr) return <Layout title="CSR"><p style={{ padding: 30 }}>CSR not found.</p></Layout>

  const statusColor = {
    'Complete': { bg: '#DCFCE7', color: '#16A34A' },
    'Incomplete': { bg: '#FEE2E2', color: '#CC0000' },
    'Pending for spares': { bg: '#FEF9C3', color: '#CA8A04' },
    'Under observation': { bg: '#E0F2FE', color: '#0284C7' },
    'Working solution provided': { bg: '#F3E8FF', color: '#7C3AED' },
    'Field Entry Pending': { bg: '#EDE9FE', color: '#4B5563' },
  }
  const s = statusColor[csr.status] || { bg: '#F5F5F5', color: '#555' }

  const getPDFDoc = () => {
    if (template === '1') return <Template1 csr={csr} />
    if (template === '2') return <Template2 csr={csr} />
    return <Template3 csr={csr} />
  }

  const handleDownload = async () => {
    const blob = await pdf(getPDFDoc()).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = csr.csr_number + '.pdf'
    a.click()
  }

  const lbl = { fontSize: '11px', fontWeight: '700', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block', marginBottom: '4px' }
  const val = { fontSize: '13px', color: '#1a1a1a' }
  const sec = { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '16px', overflow: 'hidden' }
  const secH = { backgroundColor: '#f0f0f0', padding: '8px 16px', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #ddd' }

  return (
    <Layout title={csr.csr_number}>
      <div style={{ maxWidth: '900px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div onClick={() => navigate('/csr')} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', border: '1px solid #ddd', backgroundColor: 'white' }}>← Back</div>
          <span style={{ backgroundColor: s.bg, color: s.color, padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{csr.status}</span>
          <div style={{ flex: 1 }} />
          <span style={{ color: '#555', fontWeight: '600', fontSize: '13px' }}>Template:</span>
          {[['1', 'Classic'], ['2', 'Minimal'], ['3', 'Modern']].map(([key, label]) => (
            <div key={key} onClick={() => setTemplate(key)} style={{ padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', backgroundColor: template === key ? '#1a1a1a' : 'white', color: template === key ? 'white' : '#555', border: '1px solid #ddd' }}>{label}</div>
          ))}
          <div onClick={handleDownload} style={{ padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', backgroundColor: '#0056B3', color: 'white', fontWeight: '600' }}>⬇ Download PDF</div>
          <div onClick={() => navigate('/csr/edit/' + id)} style={{ padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', backgroundColor: '#CC0000', color: 'white', fontWeight: '600' }}>Edit CSR</div>
        </div>

        <div style={sec}>
          <div style={secH}>Customer Details</div>
          <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div><span style={lbl}>CSR No.</span><span style={{ ...val, color: '#CC0000', fontWeight: '700' }}>{csr.csr_number}</span></div>
            <div><span style={lbl}>Date</span><span style={val}>{csr.date}</span></div>
            <div><span style={lbl}>Customer</span><span style={val}>{csr.client_name}</span></div>
            <div style={{ gridColumn: '1 / -1' }}><span style={lbl}>Address</span><span style={val}>{csr.address}</span></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={sec}>
            <div style={secH}>Nature of Problem</div>
            <div style={{ padding: '16px' }}><span style={lbl}>Reported Issue</span><p style={{ ...val, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{csr.problem_reported}</p></div>
          </div>
          <div style={sec}>
            <div style={secH}>Equipment Details</div>
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><span style={lbl}>Type</span><span style={val}>{csr.equipment_type}</span></div>
              <div><span style={lbl}>Capacity</span><span style={val}>{csr.capacity}</span></div>
              <div><span style={lbl}>Make</span><span style={val}>{csr.make}</span></div>
              <div><span style={lbl}>Model</span><span style={val}>{csr.model}</span></div>
              <div><span style={lbl}>Serial No.</span><span style={val}>{csr.serial_no}</span></div>
              <div><span style={lbl}>Location</span><span style={val}>{csr.equipment_location}</span></div>
            </div>
          </div>
        </div>

        <div style={sec}>
          <div style={secH}>Operational Readings</div>
          <div style={{ padding: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr style={{ backgroundColor: '#f8f8f8' }}>
                {['Voltage (V)', 'Frequency (Hz)', 'Battery (V)', 'Temp (°C)', 'Pressure (bar)', 'Run Hours'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', border: '1px solid #ddd', fontWeight: '700', fontSize: '11px', color: '#333' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody><tr>
                {[csr.voltage, csr.frequency, csr.battery, csr.temperature, csr.pressure, csr.hours].map((v, i) => (
                  <td key={i} style={{ padding: '10px 12px', border: '1px solid #ddd', textAlign: 'center' }}>{v || '—'}</td>
                ))}
              </tr></tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
          <div style={sec}>
            <div style={secH}>Parts Used</div>
            <div style={{ padding: '16px' }}><p style={{ ...val, lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{csr.materials_used || '—'}</p></div>
          </div>
          <div style={sec}>
            <div style={secH}>Service Execution</div>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr' }}>
              <div style={{ padding: '16px', borderRight: '1px solid #eee' }}>
                <div style={{ marginBottom: '14px' }}><span style={lbl}>Work Performed</span><p style={{ ...val, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{csr.service_rendered}</p></div>
                <div><span style={lbl}>Engineer Remarks</span><p style={{ ...val, color: '#555' }}>{csr.engineer_remarks || '—'}</p></div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#FAFAFA' }}>
                <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '10px' }}>Status</div>
                {STATUS_OPTIONS.map(opt => (
                  <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '14px', height: '14px', border: '1px solid #333', borderRadius: '2px', backgroundColor: csr.status === opt ? '#1a1a1a' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {csr.status === opt && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: csr.status === opt ? '600' : '400', color: csr.status === opt ? '#1a1a1a' : '#888' }}>{opt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={sec}>
          <div style={secH}>Completion & Acknowledgement</div>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div><span style={lbl}>Service Start</span><span style={val}>{csr.start_date} {csr.start_time || ''}</span></div>
              <div><span style={lbl}>Service End</span><span style={val}>{csr.end_date} {csr.end_time || ''}</span></div>
              <div style={{ gridColumn: 'span 2' }}><span style={lbl}>Customer Feedback</span><span style={val}>{csr.customer_feedback || '—'}</span></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div><span style={lbl}>Name</span><div style={{ borderTop: '1px dashed #999', marginTop: '28px', paddingTop: '6px', fontSize: '12px', color: '#555' }}>{csr.acknowledgement_name || ''}</div></div>
              <div><span style={lbl}>Signature</span><div style={{ borderTop: '1px dashed #999', marginTop: '28px', paddingTop: '6px', fontSize: '12px', color: '#888' }}>Signature</div></div>
              <div><span style={lbl}>Engineer Signature</span><div style={{ borderTop: '1px dashed #999', marginTop: '28px', paddingTop: '6px', fontSize: '12px', color: '#888' }}>Signature & Stamp</div></div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
