import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import {
  getDefaultPdfDesignPreset,
  getEffectiveFillableFont,
  resolvePdfFontFamily,
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'

function createStyles(preset: PdfDesignPreset) {
  const fillableChoice = getEffectiveFillableFont(preset)
  const fillableBold = resolvePdfFontFamily(fillableChoice, 'bold')
  const accent = preset.templateAccentColor || '#1f6e5c'
  const txt = preset.textColor

  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: txt,
      padding: 0,
      backgroundColor: '#ffffff',
    },
    accentBar: {
      height: 5,
      backgroundColor: accent,
      marginHorizontal: 16,
      marginTop: 0,
      marginBottom: 10,
      borderRadius: 3,
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
      borderBottomWidth: 1.5,
      borderBottomColor: '#e6ede8',
      paddingBottom: 8,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    brandIcon: {
      width: 36,
      height: 36,
      backgroundColor: accent,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
    brandIconText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    brandLogo: {
      width: 36,
      height: 36,
      borderRadius: 8,
      flexShrink: 0,
    },
    brandText: {
      flex: 1,
    },
    brandName: {
      fontSize: 12,
      fontFamily: fillableBold,
      color: '#1a3a32',
      marginBottom: 1,
    },
    brandAddress: {
      fontSize: 7,
      color: '#5a7268',
      lineHeight: 1.3,
    },
    waybillBadge: {
      backgroundColor: '#f0f6f2',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: '#c9d9cf',
      alignItems: 'center',
    },
    badgeLabel: {
      fontSize: 5.5,
      textTransform: 'uppercase',
      color: '#5a7268',
      letterSpacing: 0.5,
      marginBottom: 1,
    },
    badgeNumber: {
      fontSize: 12,
      fontFamily: fillableBold,
      color: accent,
      letterSpacing: 0.5,
    },
    docTitle: {
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 'bold',
      letterSpacing: 2,
      color: '#1a3a32',
      backgroundColor: '#f5f9f6',
      paddingVertical: 4,
      borderRadius: 4,
      marginBottom: 8,
      borderWidth: 0.5,
      borderColor: '#dce8e0',
      textTransform: 'uppercase',
    },
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      backgroundColor: '#f8fbf9',
      padding: 6,
      borderRadius: 6,
      borderWidth: 0.5,
      borderColor: '#e0ece4',
      marginBottom: 8,
      gap: 4,
    },
    infoItem: {
      width: '25%',
      paddingHorizontal: 4,
    },
    infoLabel: {
      fontSize: 6,
      textTransform: 'uppercase',
      color: '#6a8a7c',
      letterSpacing: 0.3,
    },
    infoValue: {
      fontSize: 9,
      fontFamily: fillableBold,
      color: '#1a3a32',
      lineHeight: 1.2,
    },
    twinCards: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    card: {
      flex: 1,
      backgroundColor: '#f8fbf9',
      borderWidth: 0.5,
      borderColor: '#e0ece4',
      borderRadius: 6,
      padding: 5,
    },
    cardTitle: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#6a8a7c',
      letterSpacing: 0.3,
      marginBottom: 3,
      fontFamily: fillableBold,
    },
    cardValue: {
      fontSize: 8.5,
      fontFamily: fillableBold,
      color: '#1a3a32',
      lineHeight: 1.3,
    },
    tickGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    tick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    tickBox: {
      width: 9,
      height: 9,
      borderWidth: 1.2,
      borderColor: accent,
      borderRadius: 2,
      backgroundColor: '#ffffff',
    },
    tickBoxChecked: {
      width: 9,
      height: 9,
      borderWidth: 1.2,
      borderColor: accent,
      borderRadius: 2,
      backgroundColor: accent,
    },
    tickLabel: {
      fontSize: 7.5,
      fontWeight: 'bold',
      color: '#1a3a32',
    },
    clientDestRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    block: {
      flex: 1,
      backgroundColor: '#f8fbf9',
      borderWidth: 0.5,
      borderColor: '#e0ece4',
      borderRadius: 6,
      padding: 5,
    },
    blockLabel: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#6a8a7c',
      letterSpacing: 0.3,
      fontFamily: fillableBold,
    },
    blockMain: {
      fontSize: 10,
      fontFamily: fillableBold,
      color: '#1a3a32',
      marginTop: 1,
    },
    blockSub: {
      fontSize: 7.5,
      color: '#5a7268',
      marginTop: 1,
    },
    sectionTitle: {
      fontSize: 7.5,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#1a3a32',
      letterSpacing: 0.4,
      marginBottom: 3,
    },
    tableWrap: {
      marginBottom: 6,
      borderRadius: 6,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: '#e0ece4',
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: accent,
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    headerCell: {
      fontSize: 6.5,
      color: '#ffffff',
      fontWeight: 'bold',
      letterSpacing: 0.2,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 3,
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: '#e0ece4',
    },
    tableRowAlt: {
      flexDirection: 'row',
      paddingVertical: 3,
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: '#e0ece4',
      backgroundColor: '#f6faf8',
    },
    cell: {
      fontSize: 7.5,
      color: '#1a2e2a',
    },
    driverRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#f8fbf9',
      borderWidth: 0.5,
      borderColor: '#e0ece4',
      borderRadius: 6,
      paddingVertical: 4,
      paddingHorizontal: 8,
      marginBottom: 6,
    },
    driverLabel: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#6a8a7c',
      letterSpacing: 0.3,
    },
    driverValue: {
      fontSize: 8.5,
      fontFamily: fillableBold,
      color: '#1a3a32',
    },
    notesChecklist: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
    },
    notesBox: {
      flex: 1,
      backgroundColor: '#f8fbf9',
      borderWidth: 0.5,
      borderColor: '#e0ece4',
      borderRadius: 6,
      padding: 5,
    },
    notesLabel: {
      fontSize: 6.5,
      textTransform: 'uppercase',
      color: '#6a8a7c',
      fontFamily: fillableBold,
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    notesText: {
      fontSize: 7.5,
      color: '#1a2e2a',
      lineHeight: 1.3,
    },
    sigRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 4,
    },
    sigCard: {
      flex: 1,
      backgroundColor: '#f8fbf9',
      borderWidth: 0.5,
      borderColor: '#e0ece4',
      borderRadius: 6,
      padding: 6,
    },
    sigTitle: {
      fontSize: 7.5,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#1a3a32',
      letterSpacing: 0.3,
      marginBottom: 4,
    },
    sigField: {
      marginBottom: 3,
    },
    sigFieldLabel: {
      fontSize: 6,
      textTransform: 'uppercase',
      color: '#6a8a7c',
      letterSpacing: 0.3,
      marginBottom: 1,
    },
    sigFieldValue: {
      minHeight: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: '#c9d9cf',
      paddingBottom: 2,
      fontSize: 8.5,
      fontFamily: fillableBold,
      color: '#1a3a32',
    },
    sigFieldValueBlank: {
      minHeight: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: '#c9d9cf',
      paddingBottom: 2,
    },
    sigImageArea: {
      height: 42,
      borderWidth: 0.5,
      borderStyle: 'dashed',
      borderColor: '#c9d9cf',
      borderRadius: 3,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 2,
      backgroundColor: '#ffffff',
    },
    sigImage: {
      width: 110,
      height: 42,
      objectFit: 'contain',
    },
    sigDateRow: {
      flexDirection: 'row',
      gap: 6,
    },
    sigDateField: {
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 0.5,
      borderTopColor: '#dce8e0',
      paddingTop: 4,
      marginTop: 'auto',
      fontSize: 6.5,
      color: '#6a8a7c',
    },
  })
}

export const GreenTemplateDocument: React.FC<{
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
      title={`Waybill - ${model.header.waybillNumber || 'Green'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Green"
    >
      <Page size="A4" style={S.page}>
        <View style={S.content}>
          {/* Accent bar */}
          <View style={S.accentBar} />

          {/* Header */}
          <View style={S.header}>
            <View style={S.brand}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} style={S.brandLogo} />
              ) : (
                <View style={S.brandIcon}>
                  <Text style={S.brandIconText}>⚡</Text>
                </View>
              )}
              <View style={S.brandText}>
                <Text style={S.brandName}>{model.branding.name || 'Company'}</Text>
                <Text style={S.brandAddress}>
                  {[
                    model.branding.address,
                    model.branding.phone ? `· ${model.branding.phone}` : null,
                    model.branding.email ? `· ${model.branding.email}` : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </Text>
              </View>
            </View>
            <View style={S.waybillBadge}>
              <Text style={S.badgeLabel}>Waybill No.</Text>
              <Text style={S.badgeNumber}>{model.header.waybillNumber || ''}</Text>
            </View>
          </View>

          {/* Title */}
          <View style={S.docTitle}>
            <Text>WAYBILL / DELIVERY NOTE</Text>
          </View>

          {/* Info grid */}
          <View style={S.infoGrid}>
            <View style={S.infoItem}>
              <Text style={S.infoLabel}>Date</Text>
              <Text style={S.infoValue}>{model.header.date || ''}</Text>
            </View>
            <View style={S.infoItem}>
              <Text style={S.infoLabel}>Time</Text>
              <Text style={S.infoValue}>{model.header.time || ''}</Text>
            </View>
            <View style={S.infoItem}>
              <Text style={S.infoLabel}>P.O. Number</Text>
              <Text style={S.infoValue}>{model.header.poNumber || ''}</Text>
            </View>
            <View style={S.infoItem}>
              <Text style={S.infoLabel}>Vehicle Plate</Text>
              <Text style={S.infoValue}>{model.logistics.vehiclePlate || ''}</Text>
            </View>
          </View>

          {/* Delivery Mode & Purpose */}
          <View style={S.twinCards}>
            <View style={S.card}>
              <Text style={S.cardTitle}>Method</Text>
              <View style={S.tickGroup}>
                {(
                  [
                    { value: 'By Hand', label: 'Hand' },
                    { value: 'By Vehicle', label: 'Vehicle' },
                    { value: 'By Courier', label: 'Courier' },
                  ] as const
                ).map((opt) => {
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
            <View style={S.card}>
              <Text style={S.cardTitle}>Purpose</Text>
              <View style={S.tickGroup}>
                {(['Supply', 'Return', 'Repair', 'Transfer', 'Other'] as const).map((opt) => {
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

          {/* Client & Destination */}
          <View style={S.clientDestRow}>
            <View style={S.block}>
              <Text style={S.blockLabel}>Client / Consignee</Text>
              <Text style={S.blockMain}>{model.parties.clientName || ''}</Text>
              <Text style={S.blockSub}>{model.parties.senderName || ''}</Text>
            </View>
            <View style={S.block}>
              <Text style={S.blockLabel}>Destination Address</Text>
              <Text style={S.blockMain}>{model.logistics.deliveryLocation || ''}</Text>
            </View>
          </View>

          {/* Items table — dynamic columns */}
          <Text style={S.sectionTitle}>Goods Description</Text>
          <View style={S.tableWrap}>
            <View style={S.tableHeaderRow}>
              <Text style={[S.headerCell, { width: '5%', textAlign: 'center' }]}>#</Text>
              {columns.map((col) => (
                <Text
                  key={col.key}
                  style={[
                    S.headerCell,
                    {
                      width: `${Math.floor(95 / Math.max(columns.length, 1))}%`,
                      textAlign: 'center',
                    },
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
                  <Text style={[S.cell, { width: '5%', textAlign: 'center' }]}>{i + 1}</Text>
                  {columns.map((col) => (
                    <Text
                      key={col.key}
                      style={[
                        S.cell,
                        {
                          width: `${Math.floor(95 / Math.max(columns.length, 1))}%`,
                          textAlign: 'center',
                        },
                      ]}
                    >
                      {row.cells[col.key] || ''}
                    </Text>
                  ))}
                </View>
              )
            })}
          </View>

          {/* Driver row */}
          <View style={S.driverRow}>
            <Text style={S.driverLabel}>Driver</Text>
            <Text style={S.driverValue}>{model.logistics.driverName || ''}</Text>
          </View>

          {/* Notes */}
          <View style={S.notesChecklist}>
            <View style={S.notesBox}>
              <Text style={S.notesLabel}>Operational Notes</Text>
              <Text style={S.notesText}>{model.notes || ''}</Text>
            </View>
          </View>

          {/* Signatures */}
          <View style={S.sigRow}>
            {/* Delivered By */}
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

            {/* Collected By */}
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

export default GreenTemplateDocument
