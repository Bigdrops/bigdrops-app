import React from 'react'
import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { safeText } from '../../core/safeText'
import { glyphRuns } from '../glyphs'
import { resolveWaybillFormeFonts } from './kit'

export interface ClassicWaybillFormeDocumentProps {
  model: WaybillRenderModel
  designPreset?: PdfDesignPreset | null
}

const PAGE_WIDTH = 595.28
const CONTENT_WIDTH = PAGE_WIDTH - 28
const NUM_COL_WIDTH = Math.floor(CONTENT_WIDTH * 0.05 * 100) / 100

export function ClassicWaybillFormeDocument({ model, designPreset }: ClassicWaybillFormeDocumentProps): React.JSX.Element {
  const { preset, bodyFont, fillableFont, fillableColor } = resolveWaybillFormeFonts(designPreset)
  const txt = preset.textColor
  const strong = { fontFamily: fillableFont, fontWeight: 700 as const }

  const deliveryMode = model.logistics.deliveryMode || ''
  const purpose = model.logistics.purpose || ''
  const columns = model.table.columns
  const columnCount = Math.max(columns.length, 1)
  const dataColWidth = Math.floor(((CONTENT_WIDTH - NUM_COL_WIDTH) / columnCount) * 100) / 100
  const tableColumns = [
    { width: { fixed: NUM_COL_WIDTH } },
    ...columns.map(() => ({ width: { fixed: dataColWidth } })),
  ]

  const metaCards: Array<{ label: string; value: string }> = [
    { label: 'Date', value: model.header.date || '' },
    { label: 'Time', value: model.header.time || '' },
    { label: 'P.O. Number', value: model.header.poNumber || '' },
    { label: 'Waybill No', value: model.header.waybillNumber || '' },
    { label: 'Vehicle Plate', value: model.logistics.vehiclePlate || '' },
    { label: 'Driver Name', value: model.logistics.driverName || '' },
    { label: 'Delivery Location', value: model.logistics.deliveryLocation || '' },
  ]
  const renderMetaCard = (label: string, children: React.ReactNode, key: string) => (
    <View key={key} style={{ flex: 1, paddingHorizontal: 4, marginBottom: 4 }}>
      <Text style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 1, letterSpacing: 0.3 }}>{label}</Text>
      {children}
    </View>
  )

  return (
    <Document
      title={`Waybill - ${model.header.waybillNumber || 'Classic'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Classic"
      style={{ fontFamily: bodyFont, fontSize: 9, color: txt }}
    >
      <Page size="A4" margin={0} style={{ backgroundColor: '#ffffff' }}>
        <View style={{ paddingHorizontal: 14, paddingBottom: 12, flex: 1 }}>
          {/* Title */}
          <View style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, letterSpacing: 2, paddingTop: 14, marginBottom: 10, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: '#0f172a' }}>
            <Text>WAYBILL / DELIVERY NOTE</Text>
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} alt="Company logo" style={{ width: 50, height: 50, borderRadius: 4, marginBottom: 4 }} />
              ) : (
                <View style={{ width: 50, height: 50, borderWidth: 0.5, borderColor: '#cbd5e1', borderRadius: 4, marginBottom: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                  <Text style={{ fontSize: 7, color: '#94a3b8' }}>LOGO</Text>
                </View>
              )}
              <Text style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 1 }}>{glyphRuns(safeText(model.branding.name), bodyFont)}</Text>
              {model.branding.address ? (
                <Text style={{ fontSize: 8, color: '#475569', lineHeight: 1.35 }}>{glyphRuns(safeText(model.branding.address), bodyFont)}</Text>
              ) : null}
              {model.branding.city ? (
                <Text style={{ fontSize: 8, color: '#475569', lineHeight: 1.35 }}>{glyphRuns(safeText(model.branding.city + (model.branding.state ? `, ${model.branding.state}` : '')), bodyFont)}</Text>
              ) : null}
              {model.branding.phone ? (
                <Text style={{ fontSize: 8, color: '#475569', lineHeight: 1.35 }}>{glyphRuns(safeText(`Phone: ${model.branding.phone}`), bodyFont)}</Text>
              ) : null}
              {model.branding.email ? (
                <Text style={{ fontSize: 8, color: '#475569', lineHeight: 1.35 }}>{glyphRuns(safeText(model.branding.email), bodyFont)}</Text>
              ) : null}
              {model.branding.website ? (
                <Text style={{ fontSize: 8, color: '#475569', lineHeight: 1.35 }}>{glyphRuns(safeText(`Web: ${model.branding.website}`), bodyFont)}</Text>
              ) : null}
              {model.branding.customInfo?.map((info, i) => (
                <Text key={i} style={{ fontSize: 8, color: '#475569', lineHeight: 1.35 }}>{glyphRuns(safeText(`${info.label}: ${info.value}`), bodyFont)}</Text>
              ))}
            </View>
            <Text style={{ fontSize: 9, textAlign: 'right', fontWeight: 700, color: '#1e40af' }}>{glyphRuns(safeText(model.header.waybillNumber || ''), bodyFont)}</Text>
          </View>

          {/* Divider */}
          <View style={{ borderBottomWidth: 1, borderBottomColor: '#cbd5e1', marginBottom: 8 }} />

          {/* Meta grid — 4 per row, two rows (source used 25% widths with wrap) */}
          <View style={{ flexDirection: 'row' }}>
            {renderMetaCard(metaCards[0].label, <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(metaCards[0].value), fillableFont)}</Text>, metaCards[0].label)}
            {renderMetaCard(metaCards[1].label, <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(metaCards[1].value), fillableFont)}</Text>, metaCards[1].label)}
            {renderMetaCard(metaCards[2].label, <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(metaCards[2].value), fillableFont)}</Text>, metaCards[2].label)}
            {renderMetaCard(metaCards[3].label, <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(metaCards[3].value), fillableFont)}</Text>, metaCards[3].label)}
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            {renderMetaCard(metaCards[4].label, <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(metaCards[4].value), fillableFont)}</Text>, metaCards[4].label)}
            {renderMetaCard(metaCards[5].label, <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(metaCards[5].value), fillableFont)}</Text>, metaCards[5].label)}
            {renderMetaCard(metaCards[6].label, <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(metaCards[6].value), fillableFont)}</Text>, metaCards[6].label)}
            {renderMetaCard(
              'Client',
              <>
                <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(model.parties.clientName || ''), fillableFont)}</Text>
                {model.parties.clientAddress ? (
                  <Text style={{ ...strong, fontSize: 7, color: fillableColor, lineHeight: 1.25, marginTop: 1 }}>{glyphRuns(safeText(model.parties.clientAddress), fillableFont)}</Text>
                ) : null}
                {model.parties.clientCityState ? (
                  <Text style={{ ...strong, fontSize: 7, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(model.parties.clientCityState), fillableFont)}</Text>
                ) : null}
                {model.parties.clientPhone ? (
                  <Text style={{ ...strong, fontSize: 7, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(`Phone: ${model.parties.clientPhone}`), fillableFont)}</Text>
                ) : null}
              </>,
              'Client',
            )}
          </View>

          {/* Method tick row */}
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderWidth: 0.5, borderColor: '#cbd5e1', borderRadius: 4, backgroundColor: '#f8fafc', marginBottom: 6 }}>
            <Text style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, marginRight: 4 }}>Method</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              {([
                { value: 'By Hand', label: 'Hand' },
                { value: 'By Vehicle', label: 'Vehicle' },
                { value: 'By Courier', label: 'Courier' },
              ] as const).map((opt) => {
                const checked = deliveryMode === opt.value
                return (
                  <View key={opt.value} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 10, height: 10, borderWidth: 1, borderColor: fillableColor, backgroundColor: checked ? fillableColor : '#ffffff' }} />
                    <Text style={{ fontSize: 9, fontWeight: 600, color: txt }}>{opt.label}</Text>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Purpose tick row */}
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderWidth: 0.5, borderColor: '#cbd5e1', borderRadius: 4, backgroundColor: '#f8fafc', marginBottom: 6 }}>
            <Text style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3, marginRight: 4 }}>Purpose</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              {(['Supply', 'Return', 'Repair', 'Transfer', 'Other'] as const).map((opt) => {
                const checked = purpose === opt
                return (
                  <View key={opt} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 10, height: 10, borderWidth: 1, borderColor: fillableColor, backgroundColor: checked ? fillableColor : '#ffffff' }} />
                    <Text style={{ fontSize: 9, fontWeight: 600, color: txt }}>{opt}</Text>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Client / Consignee block */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
            <View style={{ flex: 1, borderWidth: 0.5, borderColor: '#cbd5e1', borderRadius: 4, padding: 8, backgroundColor: '#f8fafc', minHeight: 50 }}>
              <Text style={{ fontSize: 7, textTransform: 'uppercase', color: '#475569', marginBottom: 2 }}>Client / Consignee</Text>
              <Text style={{ ...strong, fontSize: 9, color: fillableColor, lineHeight: 1.3 }}>{glyphRuns(safeText(model.parties.clientName || ''), fillableFont)}</Text>
              {model.parties.clientAddress ? <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.3, marginTop: 2 }}>{glyphRuns(safeText(model.parties.clientAddress), fillableFont)}</Text> : null}
              {model.parties.clientCityState ? <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.3, marginTop: 2 }}>{glyphRuns(safeText(model.parties.clientCityState), fillableFont)}</Text> : null}
              {model.parties.clientPhone ? <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.3, marginTop: 2 }}>{glyphRuns(safeText(`Phone: ${model.parties.clientPhone}`), fillableFont)}</Text> : null}
              {model.parties.clientEmail ? <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.3, marginTop: 2 }}>{glyphRuns(safeText(`Email: ${model.parties.clientEmail}`), fillableFont)}</Text> : null}
            </View>
          </View>

          {/* Items */}
          <Text style={{ fontSize: 8, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', color: '#334155', letterSpacing: 0.4 }}>Items</Text>
          <View style={{ marginBottom: 0 }}>
            <Table columns={tableColumns}>
              <Row header>
                <Cell style={{ backgroundColor: '#0f172a', paddingVertical: 3, paddingHorizontal: 5 }}>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: '#ffffff', textAlign: 'center', lineHeight: 1.2 }}>#</Text>
                </Cell>
                {columns.map((col) => (
                  <Cell key={col.key} style={{ backgroundColor: '#0f172a', paddingVertical: 3, paddingHorizontal: 5 }}>
                    <Text style={{ fontSize: 8, fontWeight: 700, color: '#ffffff', textAlign: 'center', lineHeight: 1.2 }}>{safeText(col.label)}</Text>
                  </Cell>
                ))}
              </Row>
              {model.table.rows.map((row, i) => {
                const isAlt = i % 2 === 1
                const cellBg = isAlt ? '#f8fafc' : '#ffffff'
                return (
                  <Row key={i}>
                    <Cell style={{ backgroundColor: cellBg, paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', minHeight: 16 }}>
                      <Text style={{ ...strong, fontSize: 8, color: fillableColor, textAlign: 'center', lineHeight: 1.2 }}>{i + 1}</Text>
                    </Cell>
                    {columns.map((col) => (
                      <Cell key={col.key} style={{ backgroundColor: cellBg, paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', minHeight: 16 }}>
                        <Text style={{ ...strong, fontSize: 8, color: fillableColor, textAlign: 'center', lineHeight: 1.2 }}>{glyphRuns(safeText(row.cells[col.key] || ''), fillableFont)}</Text>
                      </Cell>
                    ))}
                  </Row>
                )
              })}
            </Table>
          </View>

          {/* Driver row */}
          <View style={{ marginTop: 6, paddingVertical: 4, paddingHorizontal: 8, borderWidth: 0.5, borderColor: '#cbd5e1', borderRadius: 4, backgroundColor: '#f8fafc', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3 }}>Driver</Text>
            <Text style={{ ...strong, fontSize: 9, color: fillableColor }}>{glyphRuns(safeText(model.logistics.driverName || ''), fillableFont)}</Text>
          </View>

          {/* Notes */}
          <View style={{ marginTop: 6, borderWidth: 0.5, borderColor: '#e2e8f0', borderRadius: 4, padding: 6, backgroundColor: '#f8fafc', minHeight: 38, marginBottom: 0 }}>
            {model.notes ? (
              <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.35 }}>{glyphRuns(safeText(model.notes), fillableFont)}</Text>
            ) : null}
          </View>

          {/* Signatures */}
          <View wrap={false} style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <View style={{ flex: 1, borderWidth: 0.5, borderColor: '#cbd5e1', borderRadius: 4, padding: 6 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#334155', marginBottom: 5 }}>Delivered By (Sender)</Text>
              <View style={{ marginBottom: 5 }}>
                <Text style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 1, letterSpacing: 0.3 }}>Name</Text>
                <Text style={{ ...strong, fontSize: 9, color: fillableColor, minHeight: 14, borderBottomWidth: 0.5, borderBottomColor: '#94a3b8', paddingBottom: 2, lineHeight: 1.2 }}>{glyphRuns(safeText(model.parties.senderName || model.branding.name || ''), fillableFont)}</Text>
              </View>
              {model.signatures.sender?.url ? (
                <View style={{ height: 44, borderWidth: 0.5, borderColor: '#cbd5e1', borderRadius: 3, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafbfc', marginVertical: 2 }}>
                  <Image src={model.signatures.sender.url} alt="Sender signature" style={{ width: 110, height: 42 }} />
                </View>
              ) : (
                <View style={{ height: 44, borderWidth: 0.5, borderColor: '#cbd5e1', borderRadius: 3, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafbfc', marginVertical: 2 }} />
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ marginBottom: 5 }}>
                    <Text style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 1, letterSpacing: 0.3 }}>Date</Text>
                    <View style={{ minHeight: 14, borderBottomWidth: 0.5, borderBottomColor: '#94a3b8', paddingBottom: 2 }} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ marginBottom: 5 }}>
                    <Text style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 1, letterSpacing: 0.3 }}>Time</Text>
                    <View style={{ minHeight: 14, borderBottomWidth: 0.5, borderBottomColor: '#94a3b8', paddingBottom: 2 }} />
                  </View>
                </View>
              </View>
            </View>

            <View style={{ flex: 1, borderWidth: 0.5, borderColor: '#cbd5e1', borderRadius: 4, padding: 6 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#334155', marginBottom: 5 }}>Collected By (Receiver)</Text>
              <View style={{ marginBottom: 5 }}>
                <Text style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 1, letterSpacing: 0.3 }}>Name</Text>
                <Text style={{ ...strong, fontSize: 9, color: fillableColor, minHeight: 14, borderBottomWidth: 0.5, borderBottomColor: '#94a3b8', paddingBottom: 2, lineHeight: 1.2 }}>{glyphRuns(safeText(model.parties.receiverName || ''), fillableFont)}</Text>
              </View>
              {model.signatures.receiver?.url ? (
                <View style={{ height: 44, borderWidth: 0.5, borderColor: '#cbd5e1', borderRadius: 3, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafbfc', marginVertical: 2 }}>
                  <Image src={model.signatures.receiver.url} alt="Receiver signature" style={{ width: 110, height: 42 }} />
                </View>
              ) : (
                <View style={{ height: 44, borderWidth: 0.5, borderColor: '#cbd5e1', borderRadius: 3, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafbfc', marginVertical: 2 }} />
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ marginBottom: 5 }}>
                    <Text style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 1, letterSpacing: 0.3 }}>Date</Text>
                    <View style={{ minHeight: 14, borderBottomWidth: 0.5, borderBottomColor: '#94a3b8', paddingBottom: 2 }} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ marginBottom: 5 }}>
                    <Text style={{ fontSize: 7, color: '#64748b', textTransform: 'uppercase', marginBottom: 1, letterSpacing: 0.3 }}>Time</Text>
                    <View style={{ minHeight: 14, borderBottomWidth: 0.5, borderBottomColor: '#94a3b8', paddingBottom: 2 }} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Footer — repeats on every page */}
        <Fixed position="footer" style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#000000', paddingTop: 5, paddingHorizontal: 14, fontSize: 7, color: '#94a3b8' }}>
          <Text>{safeText(model.footer.companyName || model.branding.name || '')}</Text>
          <Text>{safeText(model.footer.waybillNumber || model.header.waybillNumber || '')}</Text>
          <Text>{'Page {{pageNumber}} of {{totalPages}}'}</Text>
        </Fixed>
      </Page>
    </Document>
  )
}

export default ClassicWaybillFormeDocument
