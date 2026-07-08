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
      backgroundColor: '#ffffff',
    },
    content: {
      flex: 1,
    },
    darkHeader: {
      backgroundColor: '#7d8a88',
      paddingHorizontal: 22,
      paddingVertical: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 4,
      borderBottomColor: '#4a5a57',
    },
    brandBlock: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    brandLogo: {
      width: 46,
      height: 46,
      borderRadius: 4,
      flexShrink: 0,
      backgroundColor: '#ffffff',
    },
    brandLogoPlaceholder: {
      width: 46,
      height: 46,
      borderWidth: 0.5,
      borderStyle: 'dashed',
      borderColor: '#94a3b8',
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      flexShrink: 0,
    },
    brandLogoPlaceholderText: {
      fontSize: 7,
      color: '#94a3b8',
    },
    brandTextBlock: {
      flex: 1,
    },
    brandName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: -0.3,
      lineHeight: 1.2,
    },
    brandAddress: {
      fontSize: 7,
      fontWeight: '300',
      color: '#dbe4e1',
      letterSpacing: 0.2,
    },
    wbBlock: {
      alignItems: 'flex-end',
    },
    wbLabel: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#dbe4e1',
      letterSpacing: 0.5,
    },
    wbNumber: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    bodyContent: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 12,
      flex: 1,
    },
    titleText: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 5,
      textTransform: 'uppercase',
      color: '#7d8a88',
      textAlign: 'center',
      borderBottomWidth: 1,
      borderBottomColor: '#e0e8e4',
      paddingBottom: 5,
      marginBottom: 12,
    },
    topGrid: {
      flexDirection: 'row',
      gap: 14,
      marginBottom: 12,
    },
    leftCol: {
      flex: 1.2,
    },
    leftBlock: {
      marginBottom: 7,
    },
    blockTag: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#7d8a88',
      letterSpacing: 0.4,
      fontWeight: '600',
      borderBottomWidth: 1,
      borderBottomColor: '#e0e8e4',
      paddingBottom: 1,
      marginBottom: 2,
    },
    blockMain: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#1a2624',
      lineHeight: 1.25,
    },
    tickGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 2,
    },
    tick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginRight: 6,
    },
    tickBox: {
      width: 10,
      height: 10,
      borderWidth: 1.5,
      borderColor: '#7d8a88',
      borderRadius: 2,
    },
    tickBoxChecked: {
      width: 10,
      height: 10,
      borderWidth: 1.5,
      borderColor: '#7d8a88',
      backgroundColor: '#7d8a88',
      borderRadius: 2,
    },
    tickText: {
      fontSize: 7.5,
      fontWeight: '500',
      color: '#1a2624',
    },
    rightCol: {
      flex: 0.8,
    },
    metaItem: {
      marginBottom: 3,
    },
    metaLabel: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#7d8a88',
      letterSpacing: 0.4,
    },
    metaValue: {
      fontSize: 9,
      fontWeight: '600',
      color: '#1a2624',
      borderBottomWidth: 0.5,
      borderBottomColor: '#e0e8e4',
      paddingBottom: 1,
    },
    sectionTitle: {
      fontSize: 7.5,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#7d8a88',
      letterSpacing: 0.5,
      borderBottomWidth: 2,
      borderBottomColor: '#7d8a88',
      paddingBottom: 2,
      marginBottom: 4,
    },
    tableWrap: {
      borderWidth: 1,
      borderColor: '#e0e8e4',
      marginBottom: 7,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#f0f4f2',
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderBottomWidth: 2,
      borderBottomColor: '#7d8a88',
    },
    headerCell: {
      fontSize: 7,
      fontWeight: 'bold',
      color: '#1a2624',
      letterSpacing: 0.3,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: '#ecf0ee',
    },
    tableRowAlt: {
      flexDirection: 'row',
      paddingVertical: 3,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: '#ecf0ee',
      backgroundColor: '#f9fbfa',
    },
    cell: {
      fontSize: 7.5,
      color: '#1a2624',
    },
    driverRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#f6f9f7',
      borderWidth: 1,
      borderColor: '#e0e8e4',
      paddingVertical: 3,
      paddingHorizontal: 10,
      marginBottom: 7,
    },
    driverLabel: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#7d8a88',
      letterSpacing: 0.3,
    },
    driverValue: {
      fontSize: 8.5,
      fontWeight: '600',
      color: '#1a2624',
    },
    notesRow: {
      flexDirection: 'row',
      gap: 14,
      marginBottom: 10,
    },
    notesBox: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#e0e8e4',
      padding: 6,
      backgroundColor: '#fafcfb',
    },
    notesTag: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#7d8a88',
      letterSpacing: 0.3,
      fontWeight: '600',
    },
    notesText: {
      fontSize: 8,
      color: '#1a2624',
      lineHeight: 1.4,
      marginTop: 2,
    },
    chkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 1,
    },
    chkBox: {
      width: 9,
      height: 9,
      borderWidth: 1.5,
      borderColor: '#7d8a88',
      borderRadius: 2,
    },
    chkText: {
      fontSize: 7.5,
      color: '#1a2624',
    },
    sigBlock: {
      borderWidth: 2,
      borderColor: '#7d8a88',
      padding: 10,
      backgroundColor: '#f9fbfa',
      marginBottom: 6,
    },
    sigTitle: {
      fontSize: 9,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#7d8a88',
      letterSpacing: 1,
      textAlign: 'center',
      borderBottomWidth: 1,
      borderBottomStyle: 'dashed',
      borderBottomColor: '#7d8a88',
      paddingBottom: 4,
      marginBottom: 7,
    },
    sigGrid: {
      flexDirection: 'row',
      gap: 14,
    },
    sigCol: {},
    sigLabel: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#7d8a88',
      letterSpacing: 0.4,
      fontWeight: '600',
    },
    sigNameLine: {
      borderBottomWidth: 1,
      borderBottomColor: '#cbd5d1',
      minHeight: 16,
      paddingBottom: 3,
      fontSize: 8.5,
      fontWeight: '600',
      color: '#1a2624',
      marginBottom: 2,
      marginTop: 1,
    },
    sigDrawArea: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: '#7d8a88',
      borderRadius: 4,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      marginVertical: 3,
    },
    sigImage: {
      width: 110,
      height: 42,
      objectFit: 'contain',
    },
    sigDtRow: {
      flexDirection: 'row',
      gap: 10,
    },
    sigDtField: {
      flex: 1,
    },
    sigDtLine: {
      borderBottomWidth: 0.5,
      borderBottomColor: '#cbd5d1',
      minHeight: 13,
      fontSize: 8,
      fontWeight: '500',
      color: '#1a2624',
      paddingVertical: 1,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: '#e0e8e4',
      paddingTop: 4,
      paddingHorizontal: 20,
      marginTop: 'auto',
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 6.5,
      color: '#7d8a88',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
  })
}

export const SlateTemplateDocument: React.FC<{
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
      title={`Waybill - ${model.header.waybillNumber || 'Industry'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Industry"
    >
      <Page size="A4" style={S.page}>
        <View style={S.content}>
          <View style={S.darkHeader}>
            <View style={S.brandBlock}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} style={S.brandLogo} />
              ) : (
                <View style={S.brandLogoPlaceholder}>
                  <Text style={S.brandLogoPlaceholderText}>LOGO</Text>
                </View>
              )}
              <View style={S.brandTextBlock}>
                <Text style={S.brandName}>{model.branding.name}</Text>
                {model.branding.address && (
                  <Text style={S.brandAddress}>{model.branding.address}</Text>
                )}
                {model.branding.city && (
                  <Text style={S.brandAddress}>{model.branding.city}{model.branding.state ? `, ${model.branding.state}` : ''}</Text>
                )}
                {model.branding.phone && (
                  <Text style={S.brandAddress}>Phone: {model.branding.phone}</Text>
                )}
                {model.branding.email && (
                  <Text style={S.brandAddress}>{model.branding.email}</Text>
                )}
                {model.branding.website && (
                  <Text style={S.brandAddress}>Web: {model.branding.website}</Text>
                )}
                {model.branding.customInfo?.map((info, i) => (
                  <Text key={i} style={S.brandAddress}>{info.label}: {info.value}</Text>
                ))}
              </View>
            </View>
            <View style={S.wbBlock}>
              <Text style={S.wbLabel}>Waybill No.</Text>
              <Text style={S.wbNumber}>{model.header.waybillNumber || ''}</Text>
            </View>
          </View>

          <View style={S.bodyContent}>
            <Text style={S.titleText}>WAYBILL / DELIVERY NOTE</Text>

            <View style={S.topGrid}>
              <View style={S.leftCol}>
                <View style={S.leftBlock}>
                  <Text style={S.blockTag}>Client / Consignee</Text>
                  <Text style={S.blockMain}>{model.parties.clientName || ''}</Text>
                  {model.parties.clientAddress && <Text style={{ fontSize: 8, color: '#4a5a57', marginTop: 1 }}>{model.parties.clientAddress}</Text>}
                  {model.parties.clientCityState && <Text style={{ fontSize: 8, color: '#4a5a57', marginTop: 1 }}>{model.parties.clientCityState}</Text>}
                  {model.parties.clientPhone && <Text style={{ fontSize: 8, color: '#4a5a57', marginTop: 1 }}>Phone: {model.parties.clientPhone}</Text>}
                  {model.parties.clientEmail && <Text style={{ fontSize: 8, color: '#4a5a57', marginTop: 1 }}>Email: {model.parties.clientEmail}</Text>}
                </View>
                <View style={S.leftBlock}>
                  <Text style={S.blockTag}>Destination Address</Text>
                  <Text style={S.blockMain}>{model.logistics.deliveryLocation || ''}</Text>
                </View>
                <View style={S.leftBlock}>
                  <Text style={S.blockTag}>Method</Text>
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
                <View style={S.leftBlock}>
                  <Text style={S.blockTag}>Purpose</Text>
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

              <View style={S.rightCol}>
                {[
                  { label: 'Date', value: model.header.date || '' },
                  { label: 'Time', value: model.header.time || '' },
                  { label: 'P.O. Number', value: model.header.poNumber || '' },
                  { label: 'Vehicle Plate', value: model.logistics.vehiclePlate || '' },
                  { label: 'Driver Name', value: model.logistics.driverName || '' },
                ].map((item) => (
                  <View key={item.label} style={S.metaItem}>
                    <Text style={S.metaLabel}>{item.label}</Text>
                    <Text style={S.metaValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={S.sectionTitle}>Goods Description</Text>
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

            <View style={S.notesRow}>
              <View style={S.notesBox}>
                <Text style={S.notesTag}>Operational Notes</Text>
                {model.notes ? (
                  <Text style={S.notesText}>{model.notes}</Text>
                ) : null}
              </View>
              <View style={S.notesBox}>
                <Text style={S.notesTag}>Receiving Checklist</Text>
                {['Quantity Checked', 'Condition Confirmed', 'Shortage Reported', 'Goods Accepted'].map((item) => (
                  <View key={item} style={S.chkItem}>
                    <View style={S.chkBox} />
                    <Text style={S.chkText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={S.sigBlock} wrap={false}>
              <Text style={S.sigTitle}>Delivery Confirmation</Text>
              <View style={S.sigGrid}>
                <View style={[S.sigCol, { flex: 1 }]}>
                  <Text style={S.sigLabel}>Delivered By (Sender)</Text>
                  <View style={S.sigNameLine}>
                    <Text>{model.parties.senderName || model.branding.name || ''}</Text>
                  </View>
                  {model.signatures.sender?.url ? (
                    <View style={S.sigDrawArea}>
                      <Image src={model.signatures.sender.url} style={S.sigImage} />
                    </View>
                  ) : (
                    <View style={S.sigDrawArea} />
                  )}
                  <View style={S.sigDtRow}>
                    <View style={S.sigDtField}>
                      <Text style={S.sigLabel}>Date</Text>
                      <View style={S.sigDtLine} />
                    </View>
                    <View style={S.sigDtField}>
                      <Text style={S.sigLabel}>Time</Text>
                      <View style={S.sigDtLine} />
                    </View>
                  </View>
                </View>
                <View style={[S.sigCol, { flex: 1 }]}>
                  <Text style={S.sigLabel}>Received By (Receiver)</Text>
                  <View style={S.sigNameLine}>
                    <Text>{model.parties.receiverName || ''}</Text>
                  </View>
                  {model.signatures.receiver?.url ? (
                    <View style={S.sigDrawArea}>
                      <Image src={model.signatures.receiver.url} style={S.sigImage} />
                    </View>
                  ) : (
                    <View style={S.sigDrawArea} />
                  )}
                  <View style={S.sigDtRow}>
                    <View style={S.sigDtField}>
                      <Text style={S.sigLabel}>Date</Text>
                      <View style={S.sigDtLine} />
                    </View>
                    <View style={S.sigDtField}>
                      <Text style={S.sigLabel}>Time</Text>
                      <View style={S.sigDtLine} />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={S.footer} fixed>
          <Text>{model.footer.companyName || model.branding.name || ''}</Text>
          <Text>{model.footer.waybillNumber || model.header.waybillNumber || ''}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export default SlateTemplateDocument
