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
      paddingHorizontal: 14,
      paddingBottom: 16,
      flex: 1,
    },
    title: {
      textAlign: 'center',
      fontSize: 16,
      fontWeight: 'bold',
      letterSpacing: 2,
      paddingTop: 14,
      marginBottom: 10,
      paddingBottom: 6,
      borderBottomWidth: 2,
      borderBottomColor: '#0f172a',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    brandBlock: {
      flex: 1,
      paddingRight: 12,
    },
    brandLogo: {
      width: 40,
      height: 40,
      borderRadius: 4,
      marginBottom: 4,
    },
    brandLogoPlaceholder: {
      width: 40,
      height: 40,
      borderWidth: 0.5,
      borderStyle: 'dashed',
      borderColor: '#cbd5e1',
      borderRadius: 4,
      marginBottom: 4,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
    },
    brandLogoPlaceholderText: {
      fontSize: 7,
      color: '#94a3b8',
    },
    brandName: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#1e40af',
      marginBottom: 1,
    },
    brandDetail: {
      fontSize: 8,
      color: '#475569',
      lineHeight: 1.35,
    },
    docNumber: {
      fontSize: 10,
      textAlign: 'right',
      fontWeight: 'bold',
      color: '#1e40af',
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: '#cbd5e1',
      marginBottom: 8,
    },
    metaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 8,
    },
    metaCard: {
      width: '25%',
      paddingHorizontal: 4,
      marginBottom: 6,
    },
    metaLabel: {
      fontSize: 7,
      color: '#64748b',
      textTransform: 'uppercase',
      marginBottom: 1,
      letterSpacing: 0.3,
    },
    metaValue: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#1e40af',
      lineHeight: 1.25,
    },
    tickRow: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'center',
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderWidth: 0.5,
      borderColor: '#cbd5e1',
      borderRadius: 4,
      backgroundColor: '#f8fafc',
      marginBottom: 6,
    },
    tickLabel: {
      fontSize: 7,
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginRight: 4,
    },
    tickGroup: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    tick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tickBox: {
      width: 10,
      height: 10,
      borderWidth: 1,
      borderColor: '#1e40af',
    },
    tickBoxChecked: {
      width: 10,
      height: 10,
      borderWidth: 1,
      borderColor: '#1e40af',
      backgroundColor: '#1e40af',
    },
    tickText: {
      fontSize: 9,
      fontWeight: '600',
      color: '#1e40af',
    },
    clientDestRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 8,
    },
    block: {
      flex: 1,
      borderWidth: 0.5,
      borderColor: '#cbd5e1',
      borderRadius: 4,
      padding: 6,
      backgroundColor: '#f8fafc',
      minHeight: 52,
    },
    blockLabel: {
      fontSize: 7,
      textTransform: 'uppercase',
      color: '#475569',
      marginBottom: 2,
    },
    blockValue: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#1e40af',
      lineHeight: 1.3,
    },
    sectionTitle: {
      fontSize: 8,
      fontWeight: 'bold',
      marginBottom: 4,
      textTransform: 'uppercase',
      color: '#334155',
      letterSpacing: 0.4,
    },
    tableWrap: {
      marginBottom: 0,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: '#0f172a',
      paddingVertical: 3,
      paddingHorizontal: 5,
    },
    headerCell: {
      fontSize: 8,
      fontWeight: 'bold',
      color: '#ffffff',
      textAlign: 'left',
      lineHeight: 1.2,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 3,
      paddingHorizontal: 5,
      borderBottomWidth: 0.5,
      borderBottomColor: '#e2e8f0',
      minHeight: 16,
    },
    tableRowAlt: {
      flexDirection: 'row',
      paddingVertical: 3,
      paddingHorizontal: 5,
      borderBottomWidth: 0.5,
      borderBottomColor: '#e2e8f0',
      backgroundColor: '#f8fafc',
      minHeight: 16,
    },
    cell: {
      fontSize: 8,
      color: '#1e40af',
      lineHeight: 1.2,
    },
    driverRow: {
      marginTop: 6,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderWidth: 0.5,
      borderColor: '#cbd5e1',
      borderRadius: 4,
      backgroundColor: '#f8fafc',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    driverLabel: {
      fontSize: 7,
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    driverValue: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#1e40af',
    },
    notesBox: {
      marginTop: 6,
      borderWidth: 0.5,
      borderColor: '#e2e8f0',
      borderRadius: 4,
      padding: 6,
      backgroundColor: '#f8fafc',
      minHeight: 38,
      marginBottom: 0,
    },
    notesText: {
      fontSize: 8,
      color: '#1e40af',
      lineHeight: 1.35,
    },
    sigRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    sigCard: {
      flex: 1,
      borderWidth: 0.5,
      borderColor: '#cbd5e1',
      borderRadius: 4,
      padding: 6,
    },
    sigTitle: {
      fontSize: 8,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#334155',
      marginBottom: 5,
    },
    sigField: {
      marginBottom: 5,
    },
    sigFieldLabel: {
      fontSize: 7,
      color: '#64748b',
      textTransform: 'uppercase',
      marginBottom: 1,
      letterSpacing: 0.3,
    },
    sigFieldValue: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#1e40af',
      minHeight: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: '#94a3b8',
      paddingBottom: 2,
      lineHeight: 1.2,
    },
    sigFieldValueBlank: {
      minHeight: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: '#94a3b8',
      paddingBottom: 2,
    },
    sigImageArea: {
      height: 44,
      borderWidth: 0.5,
      borderStyle: 'dashed',
      borderColor: '#cbd5e1',
      borderRadius: 3,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fafbfc',
      marginVertical: 2,
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
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: '#000000',
      paddingTop: 5,
      marginTop: 'auto',
      fontSize: 7,
      color: '#94a3b8',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
  })
}

export const ClassicTemplateDocument: React.FC<{
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
      title={`Waybill - ${model.header.waybillNumber || 'Classic'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Classic"
    >
      <Page size="A4" style={S.page}>
        <View style={S.content}>
          <View style={S.title}>
            <Text>WAYBILL / DELIVERY NOTE</Text>
          </View>

          <View style={S.header}>
            <View style={S.brandBlock}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} style={S.brandLogo} />
              ) : (
                <View style={S.brandLogoPlaceholder}>
                  <Text style={S.brandLogoPlaceholderText}>LOGO</Text>
                </View>
              )}
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
            <Text style={S.docNumber}>{model.header.waybillNumber || ''}</Text>
          </View>

          <View style={S.divider} />

          <View style={S.metaGrid}>
            {[
              { label: 'Date', value: model.header.date || '' },
              { label: 'Time', value: model.header.time || '' },
              { label: 'P.O. Number', value: model.header.poNumber || '' },
              { label: 'Waybill No', value: model.header.waybillNumber || '' },
              { label: 'Vehicle Plate', value: model.logistics.vehiclePlate || '' },
              { label: 'Driver Name', value: model.logistics.driverName || '' },
              { label: 'Client', value: model.parties.clientName || '' },
              { label: 'Delivery Location', value: model.logistics.deliveryLocation || '' },
            ].map((item) => (
              <View key={item.label} style={S.metaCard}>
                <Text style={S.metaLabel}>{item.label}</Text>
                <Text style={S.metaValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <View style={S.tickRow}>
            <Text style={S.tickLabel}>Method</Text>
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

          <View style={S.tickRow}>
            <Text style={S.tickLabel}>Purpose</Text>
            <View style={S.tickGroup}>
              {(['Supply', 'Return', 'Repair', 'Transfer', 'Other'] as const).map((opt) => (
                <View key={opt} style={S.tick}>
                  <View style={purpose === opt ? S.tickBoxChecked : S.tickBox} />
                  <Text style={S.tickText}>{opt}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={S.clientDestRow}>
            <View style={S.block}>
              <Text style={S.blockLabel}>Client / Consignee</Text>
              <Text style={S.blockValue}>{model.parties.clientName || ''}</Text>
              {model.parties.clientAddress ? <Text style={[S.blockValue, { fontSize: 8, marginTop: 2 }]}>{model.parties.clientAddress}</Text> : null}
            </View>
          </View>

          <Text style={S.sectionTitle}>Items</Text>
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

          <View style={S.notesBox}>
            {model.notes ? (
              <Text style={S.notesText}>{model.notes}</Text>
            ) : null}
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

export default ClassicTemplateDocument
