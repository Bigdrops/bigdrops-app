import React from 'react'
import { Cell, Document, Fixed, Image, Page, Row, Svg, Table, Text, View } from '@formepdf/react'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { safeText } from '../../core/safeText'
import { glyphRuns } from '../glyphs'
import { resolveWaybillFormeFonts } from './kit'

export interface EvergreenWaybillFormeDocumentProps {
  model: WaybillRenderModel
  designPreset?: PdfDesignPreset | null
}

const PAGE_WIDTH = 595.28
const CONTENT_WIDTH = PAGE_WIDTH - 32
const NUM_COL_WIDTH = Math.floor(CONTENT_WIDTH * 0.05 * 100) / 100

export function EvergreenWaybillFormeDocument({ model, designPreset }: EvergreenWaybillFormeDocumentProps): React.JSX.Element {
  const { preset, bodyFont, fillableFont, fillableColor } = resolveWaybillFormeFonts(designPreset)
  const accent = preset.templateAccentColor || '#1f6e5c'
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

  return (
    <Document
      title={`Waybill - ${model.header.waybillNumber || 'Green'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Green"
      style={{ fontFamily: bodyFont, fontSize: 9, color: txt }}
    >
      <Page size="A4" margin={0} style={{ backgroundColor: '#ffffff' }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, flex: 1 }}>
          {/* Accent bar */}
          <View style={{ height: 5, backgroundColor: accent, marginHorizontal: 16, marginTop: 0, marginBottom: 10, borderRadius: 3 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, borderBottomWidth: 1.5, borderBottomColor: '#e6ede8', paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} alt="Company logo" style={{ width: 46, height: 46, borderRadius: 8, flexShrink: 0 }} />
              ) : (
                <View style={{ width: 36, height: 36, backgroundColor: accent, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" content='<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="#ffffff"/>' />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ ...strong, fontSize: 12, color: '#1a3a32', marginBottom: 1 }}>{glyphRuns(safeText(model.branding.name), fillableFont)}</Text>
                {model.branding.address ? <Text style={{ fontSize: 7, color: '#5a7268', lineHeight: 1.3 }}>{glyphRuns(safeText(model.branding.address), bodyFont)}</Text> : null}
                {model.branding.city ? <Text style={{ fontSize: 7, color: '#5a7268', lineHeight: 1.3 }}>{glyphRuns(safeText(model.branding.city + (model.branding.state ? `, ${model.branding.state}` : '')), bodyFont)}</Text> : null}
                {model.branding.phone ? <Text style={{ fontSize: 7, color: '#5a7268', lineHeight: 1.3 }}>{glyphRuns(safeText(`Phone: ${model.branding.phone}`), bodyFont)}</Text> : null}
                {model.branding.email ? <Text style={{ fontSize: 7, color: '#5a7268', lineHeight: 1.3 }}>{glyphRuns(safeText(model.branding.email), bodyFont)}</Text> : null}
                {model.branding.website ? <Text style={{ fontSize: 7, color: '#5a7268', lineHeight: 1.3 }}>{glyphRuns(safeText(`Web: ${model.branding.website}`), bodyFont)}</Text> : null}
                {model.branding.customInfo?.map((info, i) => (
                  <Text key={i} style={{ fontSize: 7, color: '#5a7268', lineHeight: 1.3 }}>{glyphRuns(safeText(`${info.label}: ${info.value}`), bodyFont)}</Text>
                ))}
              </View>
            </View>
            <View style={{ backgroundColor: '#f0f6f2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 0.5, borderColor: '#c9d9cf', alignItems: 'center' }}>
              <Text style={{ fontSize: 5.5, textTransform: 'uppercase', color: '#5a7268', letterSpacing: 0.5, marginBottom: 1 }}>Waybill No.</Text>
              <Text style={{ ...strong, fontSize: 12, color: accent, letterSpacing: 0.5 }}>{glyphRuns(safeText(model.header.waybillNumber || ''), fillableFont)}</Text>
            </View>
          </View>

          {/* Title */}
          <View style={{ textAlign: 'center', backgroundColor: '#f5f9f6', paddingVertical: 4, borderRadius: 4, marginBottom: 8, borderWidth: 0.5, borderColor: '#dce8e0' }}>
            <Text style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, color: '#1a3a32', textAlign: 'center', textTransform: 'uppercase' }}>WAYBILL / DELIVERY NOTE</Text>
          </View>

          {/* Info grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#f8fbf9', padding: 6, borderRadius: 6, borderWidth: 0.5, borderColor: '#e0ece4', marginBottom: 8, gap: 4 }}>
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 6, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3 }}>Date</Text>
              <Text style={{ ...strong, fontSize: 9, color: fillableColor, lineHeight: 1.2 }}>{glyphRuns(safeText(model.header.date || ''), fillableFont)}</Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 6, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3 }}>Time</Text>
              <Text style={{ ...strong, fontSize: 9, color: fillableColor, lineHeight: 1.2 }}>{glyphRuns(safeText(model.header.time || ''), fillableFont)}</Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 6, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3 }}>P.O. Number</Text>
              <Text style={{ ...strong, fontSize: 9, color: fillableColor, lineHeight: 1.2 }}>{glyphRuns(safeText(model.header.poNumber || ''), fillableFont)}</Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 6, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3 }}>Vehicle Plate</Text>
              <Text style={{ ...strong, fontSize: 9, color: fillableColor, lineHeight: 1.2 }}>{glyphRuns(safeText(model.logistics.vehiclePlate || ''), fillableFont)}</Text>
            </View>
          </View>

          {/* Delivery Mode & Purpose */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1, backgroundColor: '#f8fbf9', borderWidth: 0.5, borderColor: '#e0ece4', borderRadius: 6, padding: 5 }}>
              <Text style={{ ...strong, fontSize: 6.5, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3, marginBottom: 3 }}>Method</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {([{ value: 'By Hand', label: 'Hand' }, { value: 'By Vehicle', label: 'Vehicle' }, { value: 'By Courier', label: 'Courier' }] as const).map((opt) => {
                  const checked = deliveryMode === opt.value
                  return (
                    <View key={opt.value} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 9, height: 9, borderWidth: 1.2, borderColor: fillableColor, borderRadius: 2, backgroundColor: checked ? fillableColor : '#ffffff' }} />
                      <Text style={{ fontSize: 7.5, fontWeight: 700, color: txt }}>{opt.label}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
            <View style={{ flex: 1, backgroundColor: '#f8fbf9', borderWidth: 0.5, borderColor: '#e0ece4', borderRadius: 6, padding: 5 }}>
              <Text style={{ ...strong, fontSize: 6.5, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3, marginBottom: 3 }}>Purpose</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(['Supply', 'Return', 'Repair', 'Transfer', 'Other'] as const).map((opt) => {
                  const checked = purpose === opt
                  return (
                    <View key={opt} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 9, height: 9, borderWidth: 1.2, borderColor: fillableColor, borderRadius: 2, backgroundColor: checked ? fillableColor : '#ffffff' }} />
                      <Text style={{ fontSize: 7.5, fontWeight: 700, color: txt }}>{opt}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          </View>

          {/* Client & Destination */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1, backgroundColor: '#f8fbf9', borderWidth: 0.5, borderColor: '#e0ece4', borderRadius: 6, padding: 5 }}>
              <Text style={{ ...strong, fontSize: 6.5, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3 }}>Client / Consignee</Text>
              <Text style={{ ...strong, fontSize: 10, color: fillableColor, marginTop: 1 }}>{glyphRuns(safeText(model.parties.clientName || ''), fillableFont)}</Text>
              <Text style={{ fontSize: 7.5, color: '#5a7268', marginTop: 1 }}>{glyphRuns(safeText(model.parties.clientAddress || ''), bodyFont)}</Text>
              {model.parties.clientCityState ? <Text style={{ fontSize: 7.5, color: '#5a7268', marginTop: 1 }}>{glyphRuns(safeText(model.parties.clientCityState), bodyFont)}</Text> : null}
              {model.parties.clientPhone ? <Text style={{ fontSize: 7.5, color: '#5a7268', marginTop: 1 }}>{glyphRuns(safeText(`Phone: ${model.parties.clientPhone}`), bodyFont)}</Text> : null}
              {model.parties.clientEmail ? <Text style={{ fontSize: 7.5, color: '#5a7268', marginTop: 1 }}>{glyphRuns(safeText(`Email: ${model.parties.clientEmail}`), bodyFont)}</Text> : null}
            </View>
            <View style={{ flex: 1, backgroundColor: '#f8fbf9', borderWidth: 0.5, borderColor: '#e0ece4', borderRadius: 6, padding: 5 }}>
              <Text style={{ ...strong, fontSize: 6.5, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3 }}>Destination Address</Text>
              <Text style={{ ...strong, fontSize: 10, color: fillableColor, marginTop: 1 }}>{glyphRuns(safeText(model.logistics.deliveryLocation || ''), fillableFont)}</Text>
            </View>
          </View>

          {/* Items table */}
          <Text style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: '#1a3a32', letterSpacing: 0.4, marginBottom: 3 }}>Goods Description</Text>
          <View style={{ marginBottom: 6, borderRadius: 6, overflow: 'hidden', borderWidth: 0.5, borderColor: '#e0ece4' }}>
            <Table columns={tableColumns}>
              <Row header>
                <Cell style={{ backgroundColor: accent, paddingTop: 4, paddingBottom: 4, paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 6.5, color: '#ffffff', fontWeight: 700, letterSpacing: 0.2, textAlign: 'center' }}>#</Text>
                </Cell>
                {columns.map((col) => (
                  <Cell key={col.key} style={{ backgroundColor: accent, paddingTop: 4, paddingBottom: 4, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 6.5, color: '#ffffff', fontWeight: 700, letterSpacing: 0.2, textAlign: 'center' }}>{safeText(col.label)}</Text>
                  </Cell>
                ))}
              </Row>
              {model.table.rows.map((row, i) => {
                const isAlt = i % 2 === 1
                const cellBg = isAlt ? '#f6faf8' : '#ffffff'
                return (
                  <Row key={i}>
                    <Cell style={{ backgroundColor: cellBg, paddingTop: 3, paddingBottom: 3, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: '#e0ece4' }}>
                      <Text style={{ ...strong, fontSize: 7.5, color: fillableColor, textAlign: 'center' }}>{i + 1}</Text>
                    </Cell>
                    {columns.map((col) => (
                      <Cell key={col.key} style={{ backgroundColor: cellBg, paddingTop: 3, paddingBottom: 3, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: '#e0ece4' }}>
                        <Text style={{ ...strong, fontSize: 7.5, color: fillableColor, textAlign: 'center' }}>{glyphRuns(safeText(row.cells[col.key] || ''), fillableFont)}</Text>
                      </Cell>
                    ))}
                  </Row>
                )
              })}
            </Table>
          </View>

          {/* Driver row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f8fbf9', borderWidth: 0.5, borderColor: '#e0ece4', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 6.5, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3 }}>Driver</Text>
            <Text style={{ ...strong, fontSize: 8.5, color: fillableColor }}>{glyphRuns(safeText(model.logistics.driverName || ''), fillableFont)}</Text>
          </View>

          {/* Notes */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
            <View style={{ flex: 1, backgroundColor: '#f8fbf9', borderWidth: 0.5, borderColor: '#e0ece4', borderRadius: 6, padding: 5 }}>
              <Text style={{ ...strong, fontSize: 6.5, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3, marginBottom: 2 }}>Operational Notes</Text>
              <Text style={{ ...strong, fontSize: 7.5, color: fillableColor, lineHeight: 1.3 }}>{glyphRuns(safeText(model.notes || ''), fillableFont)}</Text>
            </View>
          </View>

          {/* Signatures */}
          <View wrap={false} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
            {([
              { title: 'Delivered By (Sender)', name: model.parties.senderName || model.branding.name || '', sig: model.signatures.sender },
              { title: 'Collected By (Receiver)', name: model.parties.receiverName || '', sig: model.signatures.receiver },
            ] as const).map((card, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: '#f8fbf9', borderWidth: 0.5, borderColor: '#e0ece4', borderRadius: 6, padding: 6 }}>
                <Text style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: '#1a3a32', letterSpacing: 0.3, marginBottom: 4 }}>{card.title}</Text>
                <View style={{ marginBottom: 3 }}>
                  <Text style={{ fontSize: 6, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3, marginBottom: 1 }}>Name</Text>
                  <Text style={{ ...strong, fontSize: 8.5, color: fillableColor, minHeight: 12, borderBottomWidth: 0.5, borderBottomColor: '#c9d9cf', paddingBottom: 2 }}>{glyphRuns(safeText(card.name), fillableFont)}</Text>
                </View>
                <View style={{ height: 42, borderWidth: 0.5, borderColor: '#c9d9cf', borderRadius: 3, justifyContent: 'center', alignItems: 'center', marginVertical: 2, backgroundColor: '#ffffff' }}>
                  {card.sig?.url ? <Image src={card.sig.url} alt={i === 0 ? 'Sender signature' : 'Receiver signature'} style={{ width: 110, height: 42 }} /> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 6, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3, marginBottom: 1 }}>Date</Text>
                    <View style={{ minHeight: 12, borderBottomWidth: 0.5, borderBottomColor: '#c9d9cf', paddingBottom: 2 }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 6, textTransform: 'uppercase', color: '#6a8a7c', letterSpacing: 0.3, marginBottom: 1 }}>Time</Text>
                    <View style={{ minHeight: 12, borderBottomWidth: 0.5, borderBottomColor: '#c9d9cf', paddingBottom: 2 }} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Footer — repeats on every page */}
        <Fixed position="footer" style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#dce8e0', paddingTop: 4, paddingHorizontal: 16, fontSize: 6.5, color: '#6a8a7c' }}>
          <Text>{safeText(model.footer.companyName || model.branding.name || '')}</Text>
          <Text>{safeText(model.footer.waybillNumber || model.header.waybillNumber || '')}</Text>
          <Text>{'Page {{pageNumber}} of {{totalPages}}'}</Text>
        </Fixed>
      </Page>
    </Document>
  )
}
