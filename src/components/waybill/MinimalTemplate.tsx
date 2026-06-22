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
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: txt,
      padding: 0,
      backgroundColor: '#ffffff',
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 12,
      flex: 1,
    },
    title: {
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 'bold',
      letterSpacing: 2,
      paddingBottom: 4,
      borderBottomWidth: 1.5,
      borderBottomColor: '#000000',
      marginBottom: 6,
    },
    headerGrid: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    brandInfo: {
      flex: 1,
    },
    brandLogo: {
      width: 38,
      height: 38,
      borderRadius: 4,
      marginBottom: 3,
    },
    brandLogoPlaceholder: {
      width: 38,
      height: 38,
      borderWidth: 0.5,
      borderStyle: 'dashed',
      borderColor: '#94a3b8',
      borderRadius: 4,
      marginBottom: 3,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fafafa',
    },
    brandLogoPlaceholderText: {
      fontSize: 7,
      color: '#94a3b8',
    },
    brandName: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#000000',
    },
    brandDetail: {
      fontSize: 8,
      color: '#444444',
      lineHeight: 1.3,
    },
    brandContact: {
      fontSize: 8,
      color: '#444444',
    },
    brandTagline: {
      fontSize: 8,
      fontStyle: 'italic',
      color: '#555555',
      marginTop: 2,
    },
    docIdent: {
      width: 125,
      alignItems: 'flex-end',
    },
    pill: {
      borderWidth: 0.5,
      borderColor: '#000000',
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 8,
      marginBottom: 3,
      minWidth: 110,
      textAlign: 'right',
    },
    topGrid: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 5,
    },
    topBox: {
      flex: 1,
      borderWidth: 0.5,
      borderColor: '#000000',
      padding: 4,
      minHeight: 34,
    },
    secondGrid: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 5,
    },
    secondBox: {
      flex: 1,
      borderWidth: 0.5,
      borderColor: '#000000',
      padding: 3,
      minHeight: 22,
    },
    modeRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 6,
    },
    modeBox: {
      flex: 1,
      borderWidth: 0.5,
      borderColor: '#000000',
      padding: 4,
      minHeight: 26,
    },
    fieldLabel: {
      fontSize: 8,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    checkboxRow: {
      flexDirection: 'row',
      gap: 4,
      alignItems: 'center',
      marginTop: 2,
    },
    tick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 0.5,
      borderColor: '#000000',
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    tickBox: {
      width: 9,
      height: 9,
      borderWidth: 0.5,
      borderColor: '#000000',
    },
    tickBoxChecked: {
      width: 9,
      height: 9,
      backgroundColor: '#000000',
    },
    tickLabel: {
      fontSize: 8,
    },
    tableWrap: {
      marginBottom: 5,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#f4f4f4',
      paddingVertical: 2,
      paddingHorizontal: 2,
    },
    headerCell: {
      fontSize: 8,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      textAlign: 'left',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 3,
      paddingHorizontal: 2,
      borderBottomWidth: 0.5,
      borderBottomColor: '#000000',
    },
    cell: {
      fontSize: 9,
      color: '#000000',
    },
    notesBox: {
      borderWidth: 0.5,
      borderColor: '#000000',
      padding: 5,
      marginBottom: 5,
      minHeight: 34,
    },
    notesText: {
      fontSize: 9,
      lineHeight: 1.35,
    },
    sigRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 5,
    },
    sigCard: {
      flex: 1,
      borderWidth: 0.5,
      borderColor: '#000000',
      flexDirection: 'column',
      height: 72,
    },
    sigHeader: {
      backgroundColor: '#f4f4f4',
      paddingVertical: 3,
      paddingHorizontal: 6,
      fontSize: 8,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      borderBottomWidth: 0.5,
      borderBottomColor: '#000000',
    },
    sigMetaRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: '#000000',
      height: 20,
    },
    sigMetaCell: {
      flex: 1,
      paddingVertical: 2,
      paddingHorizontal: 6,
      fontSize: 8,
      color: '#555555',
      justifyContent: 'center',
    },
    sigMetaCellBordered: {
      flex: 1,
      paddingVertical: 2,
      paddingHorizontal: 6,
      fontSize: 8,
      color: '#555555',
      justifyContent: 'center',
      borderRightWidth: 0.5,
      borderRightColor: '#000000',
    },
    sigImageArea: {
      flex: 1,
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ffffff',
    },
    sigImage: {
      width: 110,
      height: 42,
      objectFit: 'contain',
    },
    sigBlankBox: {
      width: '100%',
      borderBottomWidth: 0.5,
      borderBottomColor: '#c9d9cf',
      height: 10,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 0.5,
      borderTopColor: '#000000',
      paddingTop: 5,
      marginTop: 4,
      fontSize: 8,
      color: '#555555',
    },
  })
}

export const MinimalTemplateDocument: React.FC<{
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
      title={`Waybill - ${model.header.waybillNumber || 'Minimal'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Minimal"
    >
      <Page size="A4" style={S.page}>
        <View style={S.content}>
          {/* Title */}
          <View style={S.title}>
            <Text>WAYBILL / DELIVERY NOTE</Text>
          </View>

          {/* Header */}
          <View style={S.headerGrid}>
            <View style={S.brandInfo}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} style={S.brandLogo} />
              ) : (
                <View style={S.brandLogoPlaceholder}>
                  <Text style={S.brandLogoPlaceholderText}>LOGO</Text>
                </View>
              )}
              <Text style={S.brandName}>{model.branding.name || ''}</Text>
              {model.branding.address ? (
                <Text style={S.brandDetail}>{model.branding.address}</Text>
              ) : null}
              {model.branding.phone || model.branding.email ? (
                <Text style={S.brandContact}>
                  {[model.branding.phone, model.branding.email].filter(Boolean).join(' | ')}
                </Text>
              ) : null}
              {model.branding.tagline ? (
                <Text style={S.brandTagline}>{model.branding.tagline}</Text>
              ) : null}
            </View>
            <View style={S.docIdent}>
              <Text style={S.pill}>{model.header.waybillNumber || ''}</Text>
              <Text style={S.pill}>Date {model.header.date || ''}</Text>
              <Text style={S.pill}>Time {model.header.time || ''}</Text>
            </View>
          </View>

          {/* Client & Destination */}
          <View style={S.topGrid}>
            <View style={S.topBox}>
              <Text style={S.fieldLabel}>Client / Consignee</Text>
              <Text>{model.parties.clientName || ''}</Text>
            </View>
            <View style={S.topBox}>
              <Text style={S.fieldLabel}>Destination Address</Text>
              <Text>{model.logistics.deliveryLocation || ''}</Text>
            </View>
          </View>

          {/* Vehicle & Driver */}
          <View style={S.secondGrid}>
            <View style={S.secondBox}>
              <Text style={S.fieldLabel}>Vehicle Plate</Text>
              <Text>{model.logistics.vehiclePlate || ''}</Text>
            </View>
            <View style={S.secondBox}>
              <Text style={S.fieldLabel}>Driver Name</Text>
              <Text>{model.logistics.driverName || ''}</Text>
            </View>
          </View>

          {/* Delivery Mode & Purpose */}
          <View style={S.modeRow}>
            <View style={S.modeBox}>
              <Text style={S.fieldLabel}>Delivery Mode</Text>
              <View style={S.checkboxRow}>
                {([
                  { value: 'By Hand', label: 'Hand' },
                  { value: 'By Vehicle', label: 'Vehicle' },
                  { value: 'By Courier', label: 'Other' },
                ] as const).map((opt) => {
                  const checked = deliveryMode === opt.value
                  return (
                    <View key={opt.value} style={S.tick}>
                      <View style={checked ? S.tickBoxChecked : S.tickBox} />
                      <Text style={S.tickLabel}>{opt.label}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
            <View style={S.modeBox}>
              <Text style={S.fieldLabel}>Delivery Reason</Text>
              <View style={S.checkboxRow}>
                {(['Supply', 'Return', 'Repair', 'Other'] as const).map((opt) => {
                  const checked = purpose === opt
                  return (
                    <View key={opt} style={S.tick}>
                      <View style={checked ? S.tickBoxChecked : S.tickBox} />
                      <Text style={S.tickLabel}>{opt}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          </View>

          {/* Items table */}
          <View style={S.tableWrap}>
            <View style={S.tableHeaderRow} fixed>
              <Text style={[S.headerCell, { width: '5%', textAlign: 'center' }]}>#</Text>
              {columns.map((col) => (
                <Text
                  key={col.key}
                  style={[
                    S.headerCell,
                    {
                      width: `${Math.floor(95 / Math.max(columns.length, 1))}%`,
                    },
                  ]}
                >
                  {col.label}
                </Text>
              ))}
            </View>
            {model.table.rows.map((row, i) => (
              <View key={i} style={S.tableRow}>
                <Text style={[S.cell, { width: '5%', textAlign: 'center' }]}>{i + 1}</Text>
                {columns.map((col) => (
                  <Text
                    key={col.key}
                    style={[
                      S.cell,
                      {
                        width: `${Math.floor(95 / Math.max(columns.length, 1))}%`,
                      },
                    ]}
                  >
                    {row.cells[col.key] || ''}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          {/* Notes */}
          <View style={S.notesBox}>
            <Text style={S.fieldLabel}>Delivery Remarks / Notes</Text>
            <Text style={S.notesText}>{model.notes || ''}</Text>
          </View>

          {/* Signatures */}
          <View style={S.sigRow} wrap={false}>
            <View style={S.sigCard}>
              <Text style={S.sigHeader}>Delivered By / Driver</Text>
              <View style={S.sigMetaRow}>
                <View style={S.sigMetaCellBordered}>
                  <Text style={{ fontSize: 8, color: '#555555' }}>
                    Name: {model.parties.senderName || model.branding.name || ''}
                  </Text>
                </View>
                <View style={S.sigMetaCell}>
                  <Text style={{ fontSize: 8, color: '#555555' }}>Date / Time</Text>
                </View>
              </View>
              <View style={S.sigImageArea}>
                {model.signatures.sender?.url ? (
                  <Image src={model.signatures.sender.url} style={S.sigImage} />
                ) : (
                  <View style={S.sigBlankBox} />
                )}
              </View>
            </View>

            <View style={S.sigCard}>
              <Text style={S.sigHeader}>Received By</Text>
              <View style={S.sigMetaRow}>
                <View style={S.sigMetaCellBordered}>
                  <Text style={{ fontSize: 8, color: '#555555' }}>
                    Name: {model.parties.receiverName || ''}
                  </Text>
                </View>
                <View style={S.sigMetaCell}>
                  <Text style={{ fontSize: 8, color: '#555555' }}>Date / Time</Text>
                </View>
              </View>
              <View style={S.sigImageArea}>
                {model.signatures.receiver?.url ? (
                  <Image src={model.signatures.receiver.url} style={S.sigImage} />
                ) : (
                  <View style={S.sigBlankBox} />
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={S.footer}>
          <Text>{model.footer.companyName || model.branding.name || ''}</Text>
          <Text>{model.footer.waybillNumber || model.header.waybillNumber || ''}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

export default MinimalTemplateDocument
