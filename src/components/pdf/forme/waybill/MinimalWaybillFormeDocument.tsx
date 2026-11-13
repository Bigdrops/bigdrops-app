import React from 'react'
import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import { safeText } from '../../core/safeText'
import { glyphRuns } from '../glyphs'
import { resolveWaybillFormeFonts } from './kit'

export interface MinimalWaybillFormeDocumentProps {
  model: WaybillRenderModel
  designPreset?: PdfDesignPreset | null
}

const PAGE_WIDTH = 595.28
const PAGE_SIDE_PADDING = 16
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_SIDE_PADDING * 2
const NUM_COL_WIDTH = Math.floor(CONTENT_WIDTH * 0.05 * 100) / 100

export function MinimalWaybillFormeDocument({ model, designPreset }: MinimalWaybillFormeDocumentProps): React.JSX.Element {
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

  return (
    <Document
      title={`Waybill - ${model.header.waybillNumber || 'Minimal'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Minimal"
      style={{ fontFamily: bodyFont, fontSize: 9, color: txt }}
    >
      <Page size="A4" margin={0} style={{ backgroundColor: '#ffffff' }}>
        <View style={{ paddingHorizontal: PAGE_SIDE_PADDING, paddingBottom: 12, flex: 1 }}>
          {/* Title */}
          <View style={{ textAlign: 'center', paddingTop: 10, paddingBottom: 4, borderBottomWidth: 1.5, borderBottomColor: '#000000', marginBottom: 6 }}>
            <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, letterSpacing: 2, color: txt }}>WAYBILL / DELIVERY NOTE</Text>
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} alt="Company logo" style={{ width: 48, height: 48, borderRadius: 4, marginBottom: 3 }} />
              ) : (
                <View style={{ width: 48, height: 48, borderWidth: 0.5, borderColor: '#94a3b8', borderRadius: 4, marginBottom: 3, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' }}>
                  <Text style={{ fontSize: 7, color: '#94a3b8' }}>LOGO</Text>
                </View>
              )}
              <Text style={{ fontSize: 12, fontWeight: 700, color: '#000000' }}>{glyphRuns(safeText(model.branding.name), bodyFont)}</Text>
              {model.branding.tagline ? (
                <Text style={{ fontSize: 8, fontStyle: 'italic', color: '#555555', marginTop: 2 }}>{glyphRuns(safeText(model.branding.tagline), bodyFont)}</Text>
              ) : null}
              {model.branding.address ? (
                <Text style={{ fontSize: 8, color: '#444444', lineHeight: 1.3 }}>{glyphRuns(safeText(model.branding.address), bodyFont)}</Text>
              ) : null}
              {model.branding.city ? (
                <Text style={{ fontSize: 8, color: '#444444', lineHeight: 1.3 }}>{glyphRuns(safeText(model.branding.city + (model.branding.state ? `, ${model.branding.state}` : '')), bodyFont)}</Text>
              ) : null}
              {model.branding.phone ? (
                <Text style={{ fontSize: 8, color: '#444444' }}>{glyphRuns(safeText(`Phone: ${model.branding.phone}`), bodyFont)}</Text>
              ) : null}
              {model.branding.email ? (
                <Text style={{ fontSize: 8, color: '#444444' }}>{glyphRuns(safeText(model.branding.email), bodyFont)}</Text>
              ) : null}
              {model.branding.website ? (
                <Text style={{ fontSize: 8, color: '#444444' }}>{glyphRuns(safeText(`Web: ${model.branding.website}`), bodyFont)}</Text>
              ) : null}
              {model.branding.customInfo?.map((info, i) => (
                <Text key={i} style={{ fontSize: 8, color: '#444444' }}>{glyphRuns(safeText(`${info.label}: ${info.value}`), bodyFont)}</Text>
              ))}
            </View>
            <View style={{ width: 125, alignItems: 'flex-end' }}>
              <Text style={{ borderWidth: 0.5, borderColor: '#000000', paddingHorizontal: 6, paddingVertical: 2, fontSize: 8, marginBottom: 3, minWidth: 110, textAlign: 'right' }}>{glyphRuns(safeText(model.header.waybillNumber || ''), bodyFont)}</Text>
              <Text style={{ borderWidth: 0.5, borderColor: '#000000', paddingHorizontal: 6, paddingVertical: 2, fontSize: 8, marginBottom: 3, minWidth: 110, textAlign: 'right' }}>{glyphRuns(safeText(`Date ${model.header.date || ''}`), bodyFont)}</Text>
              <Text style={{ borderWidth: 0.5, borderColor: '#000000', paddingHorizontal: 6, paddingVertical: 2, fontSize: 8, marginBottom: 3, minWidth: 110, textAlign: 'right' }}>{glyphRuns(safeText(`Time ${model.header.time || ''}`), bodyFont)}</Text>
            </View>
          </View>

          {/* Client & Destination */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 5 }}>
            <View style={{ flex: 1, borderWidth: 0.5, borderColor: '#000000', padding: 6, minHeight: 44 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Client / Consignee</Text>
              <Text style={{ ...strong, fontSize: 9, color: fillableColor, marginTop: 2 }}>{glyphRuns(safeText(model.parties.clientName || ''), fillableFont)}</Text>
              {model.parties.clientAddress ? (
                <Text style={{ fontSize: 8, color: '#444444', marginTop: 1 }}>{glyphRuns(safeText(model.parties.clientAddress), bodyFont)}</Text>
              ) : null}
              {model.parties.clientCityState ? (
                <Text style={{ fontSize: 8, color: '#444444', marginTop: 1 }}>{glyphRuns(safeText(model.parties.clientCityState), bodyFont)}</Text>
              ) : null}
              {model.parties.clientPhone ? (
                <Text style={{ fontSize: 8, color: '#444444', marginTop: 1 }}>{glyphRuns(safeText(`Phone: ${model.parties.clientPhone}`), bodyFont)}</Text>
              ) : null}
              {model.parties.clientEmail ? (
                <Text style={{ fontSize: 8, color: '#444444', marginTop: 1 }}>{glyphRuns(safeText(`Email: ${model.parties.clientEmail}`), bodyFont)}</Text>
              ) : null}
            </View>
            <View style={{ flex: 1, borderWidth: 0.5, borderColor: '#000000', padding: 6, minHeight: 44 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Destination Address</Text>
              <Text style={{ ...strong, fontSize: 9, color: fillableColor }}>{glyphRuns(safeText(model.logistics.deliveryLocation || ''), fillableFont)}</Text>
            </View>
          </View>

          {/* Vehicle & Driver */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 5 }}>
            <View style={{ flex: 1, borderWidth: 0.5, borderColor: '#000000', padding: 3, minHeight: 22 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Vehicle Plate</Text>
              <Text style={{ ...strong, fontSize: 9, color: fillableColor }}>{glyphRuns(safeText(model.logistics.vehiclePlate || ''), fillableFont)}</Text>
            </View>
            <View style={{ flex: 1, borderWidth: 0.5, borderColor: '#000000', padding: 3, minHeight: 22 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Driver Name</Text>
              <Text style={{ ...strong, fontSize: 9, color: fillableColor }}>{glyphRuns(safeText(model.logistics.driverName || ''), fillableFont)}</Text>
            </View>
          </View>

          {/* Delivery Mode & Purpose */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
            <View style={{ flex: 1, borderWidth: 0.5, borderColor: '#000000', padding: 4, minHeight: 26 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Method</Text>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 2 }}>
                {([
                  { value: 'By Hand', label: 'Hand' },
                  { value: 'By Vehicle', label: 'Vehicle' },
                  { value: 'By Courier', label: 'Courier' },
                ] as const).map((opt) => {
                  const checked = deliveryMode === opt.value
                  return (
                    <View key={opt.value} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 0.5, borderColor: '#000000', paddingHorizontal: 4, paddingVertical: 1 }}>
                      <View style={checked ? { width: 9, height: 9, backgroundColor: fillableColor } : { width: 9, height: 9, borderWidth: 0.5, borderColor: fillableColor }} />
                      <Text style={{ fontSize: 8 }}>{opt.label}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
            <View style={{ flex: 1, borderWidth: 0.5, borderColor: '#000000', padding: 4, minHeight: 26 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Purpose</Text>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 2 }}>
                {(['Supply', 'Return', 'Repair', 'Transfer', 'Other'] as const).map((opt) => {
                  const checked = purpose === opt
                  return (
                    <View key={opt} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 0.5, borderColor: '#000000', paddingHorizontal: 4, paddingVertical: 1 }}>
                      <View style={checked ? { width: 9, height: 9, backgroundColor: fillableColor } : { width: 9, height: 9, borderWidth: 0.5, borderColor: fillableColor }} />
                      <Text style={{ fontSize: 8 }}>{opt}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          </View>

          {/* Items table */}
          <View style={{ marginBottom: 5 }}>
            <Table columns={tableColumns}>
              <Row header>
                <Cell style={{ backgroundColor: '#f4f4f4', paddingVertical: 2, paddingHorizontal: 2 }}>
                  <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>#</Text>
                </Cell>
                {columns.map((col) => (
                  <Cell key={col.key} style={{ backgroundColor: '#f4f4f4', paddingVertical: 2, paddingHorizontal: 2 }}>
                    <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', textAlign: 'left' }}>{safeText(col.label)}</Text>
                  </Cell>
                ))}
              </Row>
              {model.table.rows.map((row, i) => (
                <Row key={i}>
                  <Cell style={{ paddingVertical: 3, paddingHorizontal: 2, borderBottomWidth: 0.5, borderBottomColor: '#000000' }}>
                    <Text style={{ ...strong, fontSize: 9, color: fillableColor, textAlign: 'center' }}>{i + 1}</Text>
                  </Cell>
                  {columns.map((col) => (
                    <Cell key={col.key} style={{ paddingVertical: 3, paddingHorizontal: 2, borderBottomWidth: 0.5, borderBottomColor: '#000000' }}>
                      <Text style={{ ...strong, fontSize: 9, color: fillableColor }}>{glyphRuns(safeText(row.cells[col.key] || ''), fillableFont)}</Text>
                    </Cell>
                  ))}
                </Row>
              ))}
            </Table>
          </View>

          {/* Notes */}
          <View style={{ borderWidth: 0.5, borderColor: '#000000', padding: 5, marginBottom: 5, minHeight: 34 }}>
            <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Delivery Remarks / Notes</Text>
            <Text style={{ ...strong, fontSize: 9, color: fillableColor, lineHeight: 1.35 }}>{glyphRuns(safeText(model.notes || ''), fillableFont)}</Text>
          </View>

          {/* Signatures */}
          <View wrap={false} style={{ flexDirection: 'row', gap: 6, marginBottom: 5 }}>
            {([
              { title: 'Delivered By / Driver', name: model.parties.senderName || model.branding.name || '', sig: model.signatures.sender, alt: 'Sender signature' },
              { title: 'Received By', name: model.parties.receiverName || '', sig: model.signatures.receiver, alt: 'Receiver signature' },
            ] as const).map((card) => (
              <View key={card.title} style={{ flex: 1, borderWidth: 0.5, borderColor: '#000000', flexDirection: 'column', height: 72 }}>
                <Text style={{ backgroundColor: '#f4f4f4', paddingVertical: 3, paddingHorizontal: 6, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottomWidth: 0.5, borderBottomColor: '#000000' }}>{card.title}</Text>
                <View style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#000000', height: 20 }}>
                  <View style={{ flex: 1, paddingVertical: 2, paddingHorizontal: 6, justifyContent: 'center', borderRightWidth: 0.5, borderRightColor: '#000000' }}>
                    <Text style={{ ...strong, fontSize: 8, color: fillableColor }}>{glyphRuns(safeText(`Name: ${card.name}`), fillableFont)}</Text>
                  </View>
                  <View style={{ flex: 1, paddingVertical: 2, paddingHorizontal: 6, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 8, color: '#555555' }}>Date / Time</Text>
                  </View>
                </View>
                <View style={{ flex: 1, padding: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
                  {card.sig?.url ? (
                    <Image src={card.sig.url} alt={card.alt} style={{ width: 110, height: 42 }} />
                  ) : (
                    <View style={{ width: '100%', borderBottomWidth: 0.5, borderBottomColor: '#c9d9cf', height: 10 }} />
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Footer — repeats on every page */}
        <Fixed position="footer" style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#000000', paddingTop: 5, fontSize: 8, color: '#555555', paddingHorizontal: PAGE_SIDE_PADDING, paddingBottom: 4 }}>
          <Text>{glyphRuns(safeText(model.footer.companyName || model.branding.name || ''), bodyFont)}</Text>
          <Text>{glyphRuns(safeText(model.footer.waybillNumber || model.header.waybillNumber || ''), bodyFont)}</Text>
          <Text>{'Page {{pageNumber}} of {{totalPages}}'}</Text>
        </Fixed>
      </Page>
    </Document>
  )
}
