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
    banner: {
      backgroundColor: '#1e2b32',
      padding: 6,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 4,
      borderBottomColor: '#d97a4a',
    },
    bannerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    bannerIcon: {
      width: 36,
      height: 36,
      backgroundColor: '#d97a4a',
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bannerIconText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1e2b32',
    },
    bannerLogo: {
      width: 36,
      height: 36,
      borderRadius: 18,
      overflow: 'hidden',
      objectFit: 'contain',
      backgroundColor: '#ffffff',
    },
    bannerText: {
      flex: 1,
    },
    bannerName: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: -0.3,
      lineHeight: 15,
    },
    bannerAddress: {
      fontSize: 7.5,
      color: '#b0c4ce',
      letterSpacing: 0.2,
      lineHeight: 9,
    },
    bannerRight: {
      alignItems: 'flex-end',
    },
    bannerRightLabel: {
      fontSize: 6,
      textTransform: 'uppercase',
      color: '#b0c4ce',
      letterSpacing: 0.5,
    },
    bannerRightNumber: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#d97a4a',
      letterSpacing: 0.5,
    },
    mainGrid: {
      flexDirection: 'row',
      padding: 14,
      paddingBottom: 0,
    },
    colLeft: {
      flex: 1,
      paddingRight: 14,
      borderRightWidth: 1,
      borderRightColor: '#e2e8f0',
    },
    colRight: {
      flex: 1,
      paddingLeft: 14,
    },
    block: {
      marginBottom: 10,
    },
    blockTag: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#7a8e99',
      letterSpacing: 0.5,
      fontWeight: '600',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      paddingBottom: 2,
      marginBottom: 3,
    },
    blockMain: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#1e2b32',
      lineHeight: 1.25,
    },
    blockSub: {
      fontSize: 8,
      color: '#4a5f6a',
      marginTop: 1,
    },
    tickBlock: {
      marginBottom: 8,
    },
    tickTag: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#7a8e99',
      letterSpacing: 0.5,
      fontWeight: '600',
    },
    tickGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
    tick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tickBox: {
      width: 10,
      height: 10,
      borderWidth: 1.5,
      borderColor: '#1e2b32',
      backgroundColor: '#ffffff',
    },
    tickBoxChecked: {
      width: 10,
      height: 10,
      borderWidth: 1.5,
      borderColor: '#d97a4a',
      backgroundColor: '#d97a4a',
    },
    tickText: {
      fontSize: 8,
      fontWeight: '600',
      color: '#1e2b32',
    },
    metaItem: {
      marginBottom: 6,
    },
    metaLabel: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#7a8e99',
      letterSpacing: 0.4,
    },
    metaValue: {
      fontSize: 9.5,
      fontWeight: 'bold',
      color: '#1e2b32',
      lineHeight: 1.3,
      borderBottomWidth: 0.5,
      borderBottomColor: '#e2e8f0',
      paddingBottom: 1,
    },
    sectionWrap: {
      paddingHorizontal: 18,
    },
    sectionTitle: {
      fontSize: 8,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#1e2b32',
      letterSpacing: 0.5,
      marginTop: 8,
      marginBottom: 4,
      borderBottomWidth: 2,
      borderBottomColor: '#d97a4a',
      paddingBottom: 2,
    },
    tableWrap: {
      borderWidth: 1,
      borderColor: '#dce3e8',
      marginBottom: 6,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#1e2b32',
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    headerCell: {
      fontSize: 7,
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: 0.3,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: '#dce3e8',
    },
    tableRowAlt: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: '#dce3e8',
      backgroundColor: '#f6f8f9',
    },
    cell: {
      fontSize: 7.5,
      color: '#1e2b32',
    },
    driverBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#f6f8f9',
      borderWidth: 1,
      borderColor: '#dce3e8',
      paddingVertical: 4,
      paddingHorizontal: 12,
      marginBottom: 6,
    },
    driverLabel: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#7a8e99',
      letterSpacing: 0.4,
    },
    driverValue: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#1e2b32',
    },
    notesChecklist: {
      flexDirection: 'row',
      gap: 14,
      paddingHorizontal: 18,
      marginBottom: 6,
    },
    notesBox: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#dce3e8',
      padding: 6,
      backgroundColor: '#fafcfc',
    },
    notesTag: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#7a8e99',
      letterSpacing: 0.4,
      fontWeight: '600',
    },
    notesText: {
      fontSize: 8,
      color: '#1e2b32',
      lineHeight: 1.4,
      marginTop: 2,
    },
    chkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 1,
    },
    chkBox: {
      width: 9,
      height: 9,
      borderWidth: 1.5,
      borderColor: '#1e2b32',
      backgroundColor: '#ffffff',
    },
    chkText: {
      fontSize: 7.5,
      color: '#1e2b32',
    },
    sigRow: {
      flexDirection: 'row',
      gap: 14,
      paddingHorizontal: 18,
      marginBottom: 6,
    },
    sigCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#dce3e8',
      padding: 8,
      backgroundColor: '#fafcfc',
    },
    sigTitle: {
      fontSize: 8,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#1e2b32',
      letterSpacing: 0.4,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: '#d97a4a',
      paddingBottom: 2,
    },
    sigField: {
      marginBottom: 3,
    },
    sigFieldLabel: {
      fontSize: 6,
      textTransform: 'uppercase',
      color: '#7a8e99',
      letterSpacing: 0.3,
    },
    sigFieldValue: {
      minHeight: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: '#dce3e8',
      paddingBottom: 1,
      fontSize: 8.5,
      fontWeight: '600',
      color: '#1e2b32',
    },
    sigFieldValueBlank: {
      minHeight: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: '#dce3e8',
      paddingBottom: 1,
    },
    sigImageArea: {
      height: 38,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#bcc9d1',
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
    sigDateRow: {
      flexDirection: 'row',
      gap: 10,
    },
    sigDateField: {
      flex: 1,
    },
    titleBlock: {
      paddingHorizontal: 18,
      paddingVertical: 5,
      backgroundColor: '#d97a4a',
    },
    titleText: {
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#ffffff',
      letterSpacing: 2,
    },
    footer: {
      borderTopWidth: 2,
      borderTopColor: '#1e2b32',
      paddingVertical: 4,
      paddingHorizontal: 18,
      marginTop: 'auto',
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 6.5,
      color: '#7a8e99',
      backgroundColor: '#f6f8f9',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
  })
}

export const BicolorTemplateDocument: React.FC<{
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
      title={`Waybill - ${model.header.waybillNumber || 'Split'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Split"
    >
      <Page size="A4" style={S.page}>
        <View style={S.content}>
          <View style={S.banner}>
            <View style={S.bannerLeft}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} style={S.bannerLogo} />
              ) : (
                <View style={S.bannerIcon}>
                  <Text style={S.bannerIconText}>⚡</Text>
                </View>
              )}
              <View style={S.bannerText}>
                <Text style={S.bannerName}>{model.branding.name || 'Company'}</Text>
                <Text style={S.bannerAddress}>
                  {[model.branding.address, model.branding.phone].filter(Boolean).join(' · ')}
                </Text>
                {model.branding.tagline ? (
                  <Text style={S.bannerAddress}>{model.branding.tagline}</Text>
                ) : null}
              </View>
            </View>
            <View style={S.bannerRight}>
              <Text style={S.bannerRightLabel}>Waybill Number</Text>
              <Text style={S.bannerRightNumber}>{model.header.waybillNumber || ''}</Text>
            </View>
          </View>

          <View style={S.titleBlock}>
            <Text style={S.titleText}>WAYBILL / DELIVERY NOTE</Text>
          </View>

          <View style={S.mainGrid}>
            <View style={S.colLeft}>
              <View style={S.block}>
                <Text style={S.blockTag}>Client / Consignee</Text>
                <Text style={S.blockMain}>{model.parties.clientName || ''}</Text>
                {model.parties.clientAddress ? <Text style={[S.blockMain, { fontSize: 8, marginTop: 2 }]}>{model.parties.clientAddress}</Text> : null}
              </View>
              <View style={S.block}>
                <Text style={S.blockTag}>Destination Address</Text>
                <Text style={S.blockMain}>{model.logistics.deliveryLocation || ''}</Text>
              </View>
              <View style={S.tickBlock}>
                <Text style={S.tickTag}>Method</Text>
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
              <View style={S.tickBlock}>
                <Text style={S.tickTag}>Purpose</Text>
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

            <View style={S.colRight}>
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

          <View style={S.sectionWrap}>
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
          </View>

          <View style={S.driverBar}>
            <Text style={S.driverLabel}>Driver</Text>
            <Text style={S.driverValue}>{model.logistics.driverName || ''}</Text>
          </View>

          <View style={S.notesChecklist}>
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

          <View style={S.sigRow} wrap={false}>
            <View style={S.sigCard}>
              <Text style={S.sigTitle}>Delivered By (Sender)</Text>
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
              <Text style={S.sigTitle}>Collected By (Receiver)</Text>
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

        <View style={S.footer} fixed>
          <Text>{model.footer.companyName || model.branding.name || ''}</Text>
          <Text>{model.footer.waybillNumber || model.header.waybillNumber || ''}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export default BicolorTemplateDocument
