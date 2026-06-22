import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import {
  getDefaultPdfDesignPreset,
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'

function createStyles(preset: PdfDesignPreset) {
  const txt = preset.textColor
  return StyleSheet.create({
    page: {
      fontFamily: 'Courier',
      fontSize: 9,
      color: txt,
      padding: 0,
      backgroundColor: '#f7f3ea',
    },
    pageRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingBottom: 12,
      flex: 1,
    },
    receipt: {
      width: 295,
      backgroundColor: '#fffdf8',
      borderWidth: 0.5,
      borderColor: '#2d2a26',
      padding: 8,
    },
    receiptEdgeLeft: {
      position: 'absolute',
      left: -6,
      top: 0,
      bottom: 0,
      width: 4,
      borderWidth: 0,
    },
    receiptEdgeRight: {
      position: 'absolute',
      right: -6,
      top: 0,
      bottom: 0,
      width: 4,
      borderWidth: 0,
    },
    edgeDot: {
      width: 2.4,
      height: 2.4,
      borderRadius: 1.2,
      backgroundColor: '#d7cfbf',
      marginBottom: 7.6,
    },
    brand: {
      borderBottomWidth: 0.5,
      borderBottomStyle: 'dashed',
      borderBottomColor: '#333333',
      paddingBottom: 6,
      marginBottom: 6,
      alignItems: 'center',
    },
    brandLogo: {
      width: 30,
      height: 30,
      borderRadius: 4,
      marginBottom: 4,
    },
    brandLogoPlaceholder: {
      width: 30,
      height: 30,
      borderWidth: 0.5,
      borderStyle: 'dashed',
      borderColor: '#666666',
      borderRadius: 4,
      marginBottom: 4,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fafafa',
    },
    brandLogoPlaceholderText: {
      fontSize: 6,
      color: '#666666',
    },
    brandName: {
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
      lineHeight: 1.2,
      marginBottom: 3,
    },
    brandDetail: {
      fontSize: 8,
      textAlign: 'center',
      lineHeight: 1.35,
      color: '#333333',
    },
    title: {
      textAlign: 'center',
      fontSize: 12,
      fontWeight: 'bold',
      letterSpacing: 1,
      paddingTop: 12,
      paddingBottom: 5,
      borderTopWidth: 0.5,
      borderTopStyle: 'dashed',
      borderTopColor: '#333333',
      borderBottomWidth: 0.5,
      borderBottomStyle: 'dashed',
      borderBottomColor: '#333333',
      marginBottom: 6,
    },
    barcodePlaceholder: {
      marginVertical: 6,
      height: 20,
      backgroundColor: '#e8e4db',
      borderRadius: 2,
    },
    wbno: {
      textAlign: 'center',
      fontSize: 9,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      fontSize: 8,
      paddingVertical: 2,
    },
    infoLabel: {
      color: '#444444',
    },
    infoValue: {
      fontWeight: 'bold',
      textAlign: 'right',
    },
    block: {
      borderTopWidth: 0.5,
      borderTopStyle: 'dashed',
      borderTopColor: '#333333',
      paddingTop: 6,
      marginTop: 6,
    },
    blockTitle: {
      textAlign: 'center',
      fontSize: 8,
      fontWeight: 'bold',
      letterSpacing: 0.7,
      marginBottom: 5,
    },
    addrBox: {
      fontSize: 8,
      lineHeight: 1.4,
      borderWidth: 0.5,
      borderStyle: 'dashed',
      borderColor: '#666666',
      padding: 6,
      marginBottom: 6,
    },
    addrName: {
      fontSize: 9,
      fontWeight: 'bold',
    },
    choiceLine: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'nowrap',
      fontSize: 8,
      lineHeight: 1.5,
      marginBottom: 4,
    },
    tick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    tickBox: {
      width: 8,
      height: 8,
      borderWidth: 0.5,
      borderColor: '#333333',
    },
    tickBoxChecked: {
      width: 8,
      height: 8,
      backgroundColor: '#333333',
    },
    tickLabel: {
      fontSize: 7,
    },
    tableWrap: {},
    tableHeaderRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomStyle: 'dotted',
      borderBottomColor: '#777777',
      paddingBottom: 3,
      paddingHorizontal: 2,
    },
    headerCell: {
      fontSize: 7,
      fontWeight: 'bold',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomStyle: 'dotted',
      borderBottomColor: '#777777',
      paddingVertical: 3,
      paddingHorizontal: 2,
    },
    cell: {
      fontSize: 7,
      color: '#111111',
    },
    noteBox: {
      fontSize: 8,
      lineHeight: 1.45,
      borderWidth: 0.5,
      borderStyle: 'dashed',
      borderColor: '#666666',
      padding: 6,
    },
    ackBox: {
      borderWidth: 0.5,
      borderStyle: 'dashed',
      borderColor: '#666666',
      padding: 6,
      marginTop: 6,
    },
    ackLine: {
      marginTop: 4,
      fontSize: 8,
      flexDirection: 'row',
      gap: 4,
    },
    ackLabel: {
      fontSize: 8,
    },
    sigBlankLine: {
      borderWidth: 1,
      borderColor: '#333333',
      minWidth: 110,
      height: 42,
    },
    sigImageArea: {
      height: 42,
      borderWidth: 0.5,
      borderStyle: 'dashed',
      borderColor: '#c9d9cf',
      borderRadius: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 4,
      backgroundColor: '#ffffff',
    },
    sigImage: {
      width: 110,
      height: 42,
      objectFit: 'contain',
    },
    footer: {
      borderTopWidth: 0.5,
      borderTopStyle: 'dashed',
      borderTopColor: '#333333',
      marginTop: 8,
      paddingTop: 6,
      alignItems: 'center',
      fontSize: 7,
      lineHeight: 1.4,
      color: '#444444',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
  })
}

function ReceiptEdges({ count }: { count: number }) {
  const dots = Array.from({ length: count }, (_, i) => i)
  return (
    <>
      <View style={{ position: 'absolute', left: -6, top: 0, bottom: 0, width: 4 }}>
        {dots.map((i) => (
          <View key={`l-${i}`} style={{ width: 2.4, height: 2.4, borderRadius: 1.2, backgroundColor: '#d7cfbf', marginBottom: 7.6 }} />
        ))}
      </View>
      <View style={{ position: 'absolute', right: -6, top: 0, bottom: 0, width: 4 }}>
        {dots.map((i) => (
          <View key={`r-${i}`} style={{ width: 2.4, height: 2.4, borderRadius: 1.2, backgroundColor: '#d7cfbf', marginBottom: 7.6 }} />
        ))}
      </View>
    </>
  )
}

export const ThermalTemplateDocument: React.FC<{
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
      title={`Waybill - ${model.header.waybillNumber || 'Thermal'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Thermal"
    >
      <Page size="A4" style={S.page}>
        <View style={S.pageRow}>
          <View style={S.receipt}>
            <ReceiptEdges count={32} />

            {/* Brand */}
            <View style={S.brand}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} style={S.brandLogo} />
              ) : (
                <View style={S.brandLogoPlaceholder}>
                  <Text style={S.brandLogoPlaceholderText}>LOGO</Text>
                </View>
              )}
              <Text style={S.brandName}>{model.branding.name || ''}</Text>
              <Text style={S.brandDetail}>
                {[model.branding.address, model.branding.phone, model.branding.email]
                  .filter(Boolean)
                  .join(' | ')}
              </Text>
            </View>

            {/* Title */}
            <View style={S.title}>
              <Text>WAYBILL / DELIVERY NOTE</Text>
            </View>

            {/* Waybill number */}
            <Text style={S.wbno}>{model.header.waybillNumber || ''}</Text>

            {/* Info rows */}
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>DATE</Text>
              <Text style={S.infoValue}>{model.header.date || ''}</Text>
            </View>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>TIME</Text>
              <Text style={S.infoValue}>{model.header.time || ''}</Text>
            </View>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>P.O. NO</Text>
              <Text style={S.infoValue}>{model.header.poNumber || ''}</Text>
            </View>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>VEHICLE</Text>
              <Text style={S.infoValue}>{model.logistics.vehiclePlate || ''}</Text>
            </View>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>DRIVER</Text>
              <Text style={S.infoValue}>{model.logistics.driverName || ''}</Text>
            </View>

            {/* Dispatch From */}
            <View style={S.block}>
              <Text style={S.blockTitle}>DISPATCH FROM</Text>
              <View style={S.addrBox}>
                <Text style={S.addrName}>{model.branding.name || ''}</Text>
                {model.branding.address ? (
                  <Text>{model.branding.address}</Text>
                ) : null}
              </View>
            </View>

            {/* Deliver To */}
            <View style={S.block}>
              <Text style={S.blockTitle}>DELIVER TO</Text>
              <View style={S.addrBox}>
                <Text style={S.addrName}>{model.parties.clientName || ''}</Text>
                {model.parties.clientAddress ? <Text style={{ fontSize: 7 }}>{model.parties.clientAddress}</Text> : null}
                {model.logistics.deliveryLocation ? (
                  <Text>{model.logistics.deliveryLocation}</Text>
                ) : null}
              </View>
            </View>

            {/* Movement Details */}
            <View style={S.block}>
              <Text style={S.blockTitle}>MOVEMENT DETAILS</Text>
              <View style={S.choiceLine}>
                <Text>
                  {'METHOD : '}
                </Text>
                <View style={S.tick}>
                  <View style={deliveryMode === 'By Hand' ? S.tickBoxChecked : S.tickBox} />
                  <Text style={S.tickLabel}>HAND</Text>
                </View>
                <Text>{'   '}</Text>
                <View style={S.tick}>
                  <View style={deliveryMode === 'By Vehicle' ? S.tickBoxChecked : S.tickBox} />
                  <Text style={S.tickLabel}>VEHICLE</Text>
                </View>
                <Text>{'   '}</Text>
                <View style={S.tick}>
                  <View style={deliveryMode === 'By Courier' ? S.tickBoxChecked : S.tickBox} />
                  <Text style={S.tickLabel}>COURIER</Text>
                </View>
              </View>
              <View style={S.choiceLine}>
                <Text>
                  {'PURPOSE: '}
                </Text>
                <View style={S.tick}>
                  <View style={purpose === 'Supply' ? S.tickBoxChecked : S.tickBox} />
                  <Text style={S.tickLabel}>SUPPLY</Text>
                </View>
                <Text>{' '}</Text>
                <View style={S.tick}>
                  <View style={purpose === 'Return' ? S.tickBoxChecked : S.tickBox} />
                  <Text style={S.tickLabel}>RETURN</Text>
                </View>
                <Text>{' '}</Text>
                <View style={S.tick}>
                  <View style={purpose === 'Repair' ? S.tickBoxChecked : S.tickBox} />
                  <Text style={S.tickLabel}>REPAIR</Text>
                </View>
                <Text>{' '}</Text>
                <View style={S.tick}>
                  <View style={purpose === 'Transfer' ? S.tickBoxChecked : S.tickBox} />
                  <Text style={S.tickLabel}>TRANSFER</Text>
                </View>
                <Text>{' '}</Text>
                <View style={S.tick}>
                  <View style={purpose === 'Other' ? S.tickBoxChecked : S.tickBox} />
                  <Text style={S.tickLabel}>OTHER</Text>
                </View>
              </View>
            </View>

            {/* Items */}
            <View style={S.block}>
              <Text style={S.blockTitle}>ITEMS</Text>
              <View style={S.tableWrap}>
                <View style={S.tableHeaderRow} fixed>
                  <Text style={[S.headerCell, { width: '7%', textAlign: 'center' }]}>#</Text>
                  {columns.map((col) => (
                    <Text
                      key={col.key}
                      style={[
                        S.headerCell,
                        {
                          width: `${Math.floor(93 / Math.max(columns.length, 1))}%`,
                        },
                      ]}
                    >
                      {col.label}
                    </Text>
                  ))}
                </View>
                {model.table.rows.map((row, i) => (
                  <View key={i} style={S.tableRow}>
                    <Text style={[S.cell, { width: '7%', textAlign: 'center' }]}>{i + 1}</Text>
                    {columns.map((col) => (
                      <Text
                        key={col.key}
                        style={[
                          S.cell,
                          {
                            width: `${Math.floor(93 / Math.max(columns.length, 1))}%`,
                          },
                        ]}
                      >
                        {row.cells[col.key] || ''}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </View>

            {/* Note */}
            <View style={S.block}>
              <Text style={S.blockTitle}>NOTE</Text>
              <View style={S.noteBox}>
                <Text>{model.notes || ''}</Text>
              </View>
            </View>

            {/* Acknowledgement */}
            <View style={S.block} wrap={false}>
              <Text style={S.blockTitle}>ACKNOWLEDGEMENT</Text>
              <View style={S.ackBox}>
                <View style={S.ackLine}>
                  <Text style={S.ackLabel}>Delivered By: </Text>
                  <Text>{model.parties.senderName || model.branding.name || ''}</Text>
                </View>
                <View style={S.ackLine}>
                  <Text style={S.ackLabel}>Signature: </Text>
                  {model.signatures.sender?.url ? (
                    <View style={S.sigImageArea}>
                      <Image src={model.signatures.sender.url} style={S.sigImage} />
                    </View>
                  ) : (
                    <View style={S.sigBlankLine} />
                  )}
                </View>
                <View style={S.ackLine}>
                  <Text style={S.ackLabel}>Date / Time: </Text>
                  <View style={S.sigBlankLine} />
                </View>

                <View style={{ height: 8 }} />

                <View style={S.ackLine}>
                  <Text style={S.ackLabel}>Collected By: </Text>
                  <Text>{model.parties.receiverName || ''}</Text>
                </View>
                <View style={S.ackLine}>
                  <Text style={S.ackLabel}>Signature: </Text>
                  {model.signatures.receiver?.url ? (
                    <View style={S.sigImageArea}>
                      <Image src={model.signatures.receiver.url} style={S.sigImage} />
                    </View>
                  ) : (
                    <View style={S.sigBlankLine} />
                  )}
                </View>
                <View style={S.ackLine}>
                  <Text style={S.ackLabel}>Date / Time: </Text>
                  <View style={S.sigBlankLine} />
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={S.footer} fixed>
              <Text>{model.footer.companyName || model.branding.name || ''}</Text>
              <Text>
                {model.footer.waybillNumber || model.header.waybillNumber || ''}
                {' · Page '}
                <Text
                  render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`}
                />
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default ThermalTemplateDocument
