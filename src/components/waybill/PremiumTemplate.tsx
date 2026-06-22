import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { getDefaultPdfDesignPreset, type PdfDesignPreset } from '@/lib/pdfDesignPreset'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'

function createStyles(preset: PdfDesignPreset) {
  const txt = preset.textColor

  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: txt,
      padding: 0,
      backgroundColor: '#fffdf8',
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 16,
      flex: 1,
    },
    topbar: {
      flexDirection: 'row',
      borderWidth: 2,
      borderColor: '#2b2520',
      marginBottom: 8,
      minHeight: 56,
    },
    logoBox: {
      width: 110,
      borderRightWidth: 1,
      borderRightColor: '#2b2520',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f4efe6',
    },
    logoImg: {
      width: 40,
      height: 40,
    },
    logoPlaceholder: {
      width: 40,
      height: 40,
      borderWidth: 0.5,
      borderStyle: 'dashed',
      borderColor: '#bda98f',
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#efebe3',
    },
    logoPlaceholderText: {
      fontSize: 7,
      color: '#8a7d6b',
    },
    brandBox: {
      flex: 1,
      paddingHorizontal: 10,
      justifyContent: 'center',
    },
    brandName: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#2d241b',
      marginBottom: 2,
    },
    brandDetail: {
      fontSize: 7.5,
      color: '#5e5146',
      lineHeight: 1.35,
    },
    docBox: {
      width: 104,
      borderLeftWidth: 1,
      borderLeftColor: '#2b2520',
    },
    docLabel: {
      backgroundColor: '#2b2520',
      color: '#fff8ec',
      textAlign: 'center',
      fontSize: 7,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      paddingVertical: 3,
    },
    docValue: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: 11,
      fontWeight: 'bold',
      color: '#5a4630',
    },
    titleBand: {
      backgroundColor: '#3a3027',
      paddingVertical: 6,
      marginBottom: 8,
    },
    titleText: {
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 'bold',
      color: '#fff7eb',
      letterSpacing: 2,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    panel: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#bda98f',
      backgroundColor: '#fcf8f1',
      padding: 7,
    },
    panelTitle: {
      fontSize: 7,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: '#7b6b5e',
      marginBottom: 3,
    },
    panelBig: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#2f261d',
      lineHeight: 1.25,
    },
    metaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 8,
    },
    metaCard: {
      width: '25%',
      paddingHorizontal: 3,
      marginBottom: 4,
    },
    metaInner: {
      borderWidth: 1,
      borderColor: '#d4c5b2',
      padding: 5,
      minHeight: 44,
    },
    metaLabel: {
      fontSize: 7,
      textTransform: 'uppercase',
      color: '#8a7a6c',
      marginBottom: 1,
    },
    metaValue: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#2f261d',
      lineHeight: 1.3,
    },
    choiceRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    choiceBox: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#c9b8a2',
      backgroundColor: '#fbf7f0',
      padding: 6,
    },
    choiceTitle: {
      fontSize: 7,
      textTransform: 'uppercase',
      color: '#7c6c5e',
      marginBottom: 4,
    },
    tickGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    tickBox: {
      width: 10,
      height: 10,
      borderWidth: 1,
      borderColor: '#4b3d30',
    },
    tickBoxChecked: {
      width: 10,
      height: 10,
      borderWidth: 1,
      borderColor: '#4b3d30',
      backgroundColor: '#4b3d30',
    },
    tickText: {
      fontSize: 8,
      fontWeight: 'bold',
      color: '#2c241d',
    },
    sectionTitle: {
      fontSize: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: '#594b3f',
      marginBottom: 3,
    },
    tableWrap: {
      borderWidth: 1,
      borderColor: '#eadfce',
      marginBottom: 6,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#4b3d30',
      paddingVertical: 4,
      paddingHorizontal: 5,
    },
    headerCell: {
      fontSize: 7.5,
      fontWeight: 'bold',
      color: '#fff8ef',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 3,
      paddingHorizontal: 5,
      borderBottomWidth: 0.5,
      borderBottomColor: '#eadfce',
    },
    tableRowAlt: {
      flexDirection: 'row',
      paddingVertical: 3,
      paddingHorizontal: 5,
      borderBottomWidth: 0.5,
      borderBottomColor: '#eadfce',
      backgroundColor: '#fcf8f2',
    },
    cell: {
      fontSize: 7.5,
      color: '#2c241d',
      lineHeight: 1.2,
    },
    driverRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: '#d4c5b2',
      backgroundColor: '#fcf8f1',
      paddingVertical: 3,
      paddingHorizontal: 8,
      marginBottom: 6,
    },
    driverLabel: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#7b6b5e',
    },
    driverValue: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#2f261d',
    },
    lowerRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
    },
    notesBox: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#cab8a1',
      backgroundColor: '#fcf8f1',
      padding: 7,
    },
    notesTag: {
      fontSize: 7,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: '#7b6b5e',
      marginBottom: 2,
    },
    notesText: {
      fontSize: 8,
      color: '#3c3229',
      lineHeight: 1.4,
    },
    chkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 3,
    },
    chkBox: {
      width: 9,
      height: 9,
      borderWidth: 1,
      borderColor: '#4b3d30',
    },
    chkText: {
      fontSize: 7.5,
      color: '#332a22',
    },
    sigRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 0,
    },
    sigCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#bea98f',
      backgroundColor: '#fffdfa',
      padding: 7,
    },
    sigTitle: {
      fontSize: 8,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#4f4135',
      marginBottom: 4,
    },
    sigField: {
      marginBottom: 3,
    },
    sigFieldLabel: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#8b7a6a',
      marginBottom: 1,
    },
    sigFieldValue: {
      minHeight: 13,
      borderBottomWidth: 0.5,
      borderBottomColor: '#8d7a65',
      paddingBottom: 1,
      fontSize: 8.5,
      fontWeight: 'bold',
      color: '#2f261d',
    },
    sigFieldValueBlank: {
      minHeight: 13,
      borderBottomWidth: 0.5,
      borderBottomColor: '#8d7a65',
      paddingBottom: 1,
    },
    sigImageArea: {
      height: 42,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#c7b7a3',
      backgroundColor: '#faf6ef',
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 3,
    },
    sigImage: {
      width: 110,
      height: 42,
      objectFit: 'contain',
    },
    sigDateRow: {
      flexDirection: 'row',
      gap: 8,
    },
    sigDateField: {
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: '#8d7a65',
      paddingTop: 4,
      marginTop: 'auto',
      fontSize: 7,
      color: '#6d5e51',
    },
  })
}

export const PremiumTemplateDocument: React.FC<{
  model: WaybillRenderModel
  designPreset?: PdfDesignPreset
}> = ({ model, designPreset }) => {
  const preset = designPreset || getDefaultPdfDesignPreset('waybill')
  const S = createStyles(preset)

  const deliveryMode = model.logistics.deliveryMode || ''
  const purpose = model.logistics.purpose || ''
  const columns = model.table.columns

  return (
    <Document
      title={`Waybill - ${model.header.waybillNumber || 'Premium'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Premium"
    >
      <Page size="A4" style={S.page}>
        <View style={S.content}>
          <View style={S.topbar}>
            <View style={S.logoBox}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} style={S.logoImg} />
              ) : (
                <View style={S.logoPlaceholder}>
                  <Text style={S.logoPlaceholderText}>LOGO</Text>
                </View>
              )}
            </View>
            <View style={S.brandBox}>
              <Text style={S.brandName}>{model.branding.name || 'Company'}</Text>
              {model.branding.address ? (
                <Text style={S.brandDetail}>{model.branding.address}</Text>
              ) : null}
              {model.branding.phone || model.branding.email ? (
                <Text style={S.brandDetail}>
                  {[model.branding.phone, model.branding.email].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <View style={S.docBox}>
              <Text style={S.docLabel}>Waybill No</Text>
              <View style={S.docValue}>
                <Text>{model.header.waybillNumber || ''}</Text>
              </View>
            </View>
          </View>

          <View style={S.titleBand}>
            <Text style={S.titleText}>WAYBILL / DELIVERY NOTE</Text>
          </View>

          <View style={S.summaryRow}>
            <View style={S.panel}>
              <Text style={S.panelTitle}>Consignee / Client</Text>
              <Text style={S.panelBig}>{model.parties.clientName || ''}</Text>
            </View>
            <View style={S.panel}>
              <Text style={S.panelTitle}>Delivery Location</Text>
              <Text style={S.panelBig}>{model.logistics.deliveryLocation || ''}</Text>
            </View>
          </View>

          <View style={S.metaGrid}>
            {[
              { label: 'Date', value: model.header.date || '' },
              { label: 'Time', value: model.header.time || '' },
              { label: 'P.O. Number', value: model.header.poNumber || '' },
              { label: 'Vehicle Plate', value: model.logistics.vehiclePlate || '' },
              { label: 'Driver Name', value: model.logistics.driverName || '' },
              { label: 'Waybill No', value: model.header.waybillNumber || '' },
              { label: 'Prepared By', value: model.branding.name || '' },
              { label: 'Reference', value: model.header.waybillNumber || '' },
            ].map((item) => (
              <View key={item.label} style={S.metaCard}>
                <View style={S.metaInner}>
                  <Text style={S.metaLabel}>{item.label}</Text>
                  <Text style={S.metaValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={S.choiceRow}>
            <View style={S.choiceBox}>
              <Text style={S.choiceTitle}>Method</Text>
              <View style={S.tickGroup}>
                {([
                  { value: 'By Hand', label: 'Hand' },
                  { value: 'By Vehicle', label: 'Vehicle' },
                  { value: 'By Courier', label: 'Courier' },
                ] as const).map((opt) => (
                  <View key={opt.value} style={S.tick}>
                    <View style={deliveryMode === opt.value ? S.tickBoxChecked : S.tickBox} />
                    <Text style={S.tickText}>{opt.label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={S.choiceBox}>
              <Text style={S.choiceTitle}>Purpose</Text>
              <View style={S.tickGroup}>
                {(['Supply', 'Return', 'Repair', 'Transfer', 'Other'] as const).map((opt) => (
                  <View key={opt} style={S.tick}>
                    <View style={purpose === opt ? S.tickBoxChecked : S.tickBox} />
                    <Text style={S.tickText}>{opt}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <Text style={S.sectionTitle}>Item Manifest</Text>
          <View style={S.tableWrap}>
            <View style={S.tableHeaderRow} fixed>
              <Text style={[S.headerCell, { width: '4%', textAlign: 'center' }]}>#</Text>
              {columns.map((col) => (
                <Text
                  key={col.key}
                  style={[
                    S.headerCell,
                    { width: `${Math.floor(96 / Math.max(columns.length, 1))}%`, textAlign: 'center' },
                  ]}
                >
                  {col.label}
                </Text>
              ))}
            </View>
            {model.table.rows.map((row, i) => {
              const isAlt = i % 2 === 1
              return (
                <View key={i} style={isAlt ? S.tableRowAlt : S.tableRow}>
                  <Text style={[S.cell, { width: '4%', textAlign: 'center' }]}>{i + 1}</Text>
                  {columns.map((col) => (
                    <Text
                      key={col.key}
                      style={[
                        S.cell,
                        { width: `${Math.floor(96 / Math.max(columns.length, 1))}%`, textAlign: 'center' },
                      ]}
                    >
                      {row.cells[col.key] || ''}
                    </Text>
                  ))}
                </View>
              )
            })}
          </View>

          <View style={S.driverRow}>
            <Text style={S.driverLabel}>Driver</Text>
            <Text style={S.driverValue}>{model.logistics.driverName || ''}</Text>
          </View>

          <View style={S.lowerRow}>
            <View style={S.notesBox}>
              <Text style={S.notesTag}>Operational Notes</Text>
              {model.notes ? (
                <Text style={S.notesText}>{model.notes}</Text>
              ) : null}
            </View>
            <View style={S.notesBox}>
              <Text style={S.notesTag}>Receiving Check</Text>
              {['Quantity Verified', 'Packaging Intact', 'Condition Accepted', 'Exceptions Recorded'].map((item) => (
                <View key={item} style={S.chkItem}>
                  <View style={S.chkBox} />
                  <Text style={S.chkText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={S.sigRow} wrap={false}>
            <View style={S.sigCard}>
              <Text style={S.sigTitle}>Delivered By</Text>
              <View style={S.sigField}>
                <Text style={S.sigFieldLabel}>Name</Text>
                <Text style={S.sigFieldValue}>
                  {model.parties.senderName || model.branding.name || ''}
                </Text>
              </View>
              {model.signatures.sender?.url ? (
                <View style={S.sigImageArea}>
                  <Image src={model.signatures.sender.url} style={S.sigImage} />
                </View>
              ) : (
                <View style={S.sigImageArea} />
              )}
              <View style={S.sigDateRow}>
                <View style={S.sigDateField}>
                  <View style={S.sigField}>
                    <Text style={S.sigFieldLabel}>Date</Text>
                    <View style={S.sigFieldValueBlank} />
                  </View>
                </View>
                <View style={S.sigDateField}>
                  <View style={S.sigField}>
                    <Text style={S.sigFieldLabel}>Time</Text>
                    <View style={S.sigFieldValueBlank} />
                  </View>
                </View>
              </View>
            </View>

            <View style={S.sigCard}>
              <Text style={S.sigTitle}>Collected By</Text>
              <View style={S.sigField}>
                <Text style={S.sigFieldLabel}>Name</Text>
                <Text style={S.sigFieldValue}>{model.parties.receiverName || ''}</Text>
              </View>
              {model.signatures.receiver?.url ? (
                <View style={S.sigImageArea}>
                  <Image src={model.signatures.receiver.url} style={S.sigImage} />
                </View>
              ) : (
                <View style={S.sigImageArea} />
              )}
              <View style={S.sigDateRow}>
                <View style={S.sigDateField}>
                  <View style={S.sigField}>
                    <Text style={S.sigFieldLabel}>Date</Text>
                    <View style={S.sigFieldValueBlank} />
                  </View>
                </View>
                <View style={S.sigDateField}>
                  <View style={S.sigField}>
                    <Text style={S.sigFieldLabel}>Time</Text>
                    <View style={S.sigFieldValueBlank} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={S.footer}>
          <Text>{model.footer.companyName || model.branding.name || ''}</Text>
          <Text>{model.footer.waybillNumber || model.header.waybillNumber || ''}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export default PremiumTemplateDocument
