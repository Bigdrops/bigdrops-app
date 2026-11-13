import React from 'react'
import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { safeText } from '../../core/safeText'
import { glyphRuns } from '../glyphs'
import { resolveWaybillFormeFonts } from './kit'

export interface ThermalWaybillFormeDocumentProps {
  model: WaybillRenderModel
  designPreset?: PdfDesignPreset | null
}

const CARD_WIDTH = 295
const CARD_PADDING = 8
const CARD_CONTENT_WIDTH = CARD_WIDTH - CARD_PADDING * 2 // 279pt
const NUM_COL_WIDTH = Math.floor(CARD_CONTENT_WIDTH * 0.07 * 100) / 100

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

export function ThermalWaybillFormeDocument({ model, designPreset }: ThermalWaybillFormeDocumentProps): React.JSX.Element {
  const { preset, bodyFont, fillableFont, fillableColor } = resolveWaybillFormeFonts(designPreset)
  const txt = preset.textColor
  const strong = { fontFamily: fillableFont, fontWeight: 700 as const }

  const deliveryMode = model.logistics.deliveryMode || ''
  const purpose = model.logistics.purpose || ''
  const columns = model.table.columns
  const columnCount = Math.max(columns.length, 1)
  const dataColWidth = Math.floor(((CARD_CONTENT_WIDTH - NUM_COL_WIDTH) / columnCount) * 100) / 100
  const tableColumns = [
    { width: { fixed: NUM_COL_WIDTH } },
    ...columns.map(() => ({ width: { fixed: dataColWidth } })),
  ]

  return (
    <Document
      title={`Waybill - ${model.header.waybillNumber || 'Thermal'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Thermal"
      style={{ fontFamily: bodyFont, fontSize: 9, color: txt }}
    >
      <Page size="A4" margin={0} style={{ backgroundColor: '#f7f3ea' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', paddingBottom: 12, flex: 1 }}>
          <View style={{ width: CARD_WIDTH, backgroundColor: '#fffdf8', borderWidth: 0.5, borderColor: '#2d2a26', padding: CARD_PADDING }}>
            <ReceiptEdges count={32} />

            {/* Brand */}
            <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#333333', paddingBottom: 8, marginBottom: 8, alignItems: 'center' }}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} alt="Company logo" style={{ width: 36, height: 36, borderRadius: 4, marginBottom: 4 }} />
              ) : (
                <View style={{ width: 36, height: 36, borderWidth: 0.5, borderColor: '#666666', borderRadius: 4, marginBottom: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' }}>
                  <Text style={{ fontSize: 6, color: '#666666' }}>LOGO</Text>
                </View>
              )}
              <Text style={{ fontFamily: bodyFont, fontWeight: 700, fontSize: 12, textAlign: 'center', lineHeight: 1.2, marginBottom: 3 }}>{glyphRuns(safeText(model.branding.name), bodyFont)}</Text>
              {model.branding.address ? <Text style={{ fontSize: 8, textAlign: 'center', lineHeight: 1.35, color: '#333333' }}>{glyphRuns(safeText(model.branding.address), bodyFont)}</Text> : null}
              {model.branding.city ? (
                <Text style={{ fontSize: 8, textAlign: 'center', lineHeight: 1.35, color: '#333333' }}>{glyphRuns(safeText(model.branding.city + (model.branding.state ? `, ${model.branding.state}` : '')), bodyFont)}</Text>
              ) : null}
              {model.branding.phone ? <Text style={{ fontSize: 8, textAlign: 'center', lineHeight: 1.35, color: '#333333' }}>{glyphRuns(safeText(`Phone: ${model.branding.phone}`), bodyFont)}</Text> : null}
              {model.branding.email ? <Text style={{ fontSize: 8, textAlign: 'center', lineHeight: 1.35, color: '#333333' }}>{glyphRuns(safeText(model.branding.email), bodyFont)}</Text> : null}
              {model.branding.website ? <Text style={{ fontSize: 8, textAlign: 'center', lineHeight: 1.35, color: '#333333' }}>{glyphRuns(safeText(`Web: ${model.branding.website}`), bodyFont)}</Text> : null}
              {model.branding.customInfo?.map((info, i) => (
                <Text key={i} style={{ fontSize: 8, textAlign: 'center', lineHeight: 1.35, color: '#333333' }}>{glyphRuns(safeText(`${info.label}: ${info.value}`), bodyFont)}</Text>
              ))}
            </View>

            {/* Title */}
            <View style={{ textAlign: 'center', paddingTop: 12, paddingBottom: 5, borderTopWidth: 0.5, borderTopColor: '#333333', borderBottomWidth: 0.5, borderBottomColor: '#333333', marginBottom: 6 }}>
              <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>WAYBILL / DELIVERY NOTE</Text>
            </View>

            {/* Waybill number */}
            <Text style={{ textAlign: 'center', fontFamily: bodyFont, fontWeight: 700, fontSize: 9, marginBottom: 8 }}>{glyphRuns(safeText(model.header.waybillNumber || ''), bodyFont)}</Text>

            {/* Info rows */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, fontSize: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 8, color: '#444444' }}>DATE</Text>
              <Text style={{ ...strong, fontSize: 8, color: fillableColor, textAlign: 'right' }}>{glyphRuns(safeText(model.header.date || ''), fillableFont)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, fontSize: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 8, color: '#444444' }}>TIME</Text>
              <Text style={{ ...strong, fontSize: 8, color: fillableColor, textAlign: 'right' }}>{glyphRuns(safeText(model.header.time || ''), fillableFont)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, fontSize: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 8, color: '#444444' }}>P.O. NO</Text>
              <Text style={{ ...strong, fontSize: 8, color: fillableColor, textAlign: 'right' }}>{glyphRuns(safeText(model.header.poNumber || ''), fillableFont)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, fontSize: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 8, color: '#444444' }}>VEHICLE</Text>
              <Text style={{ ...strong, fontSize: 8, color: fillableColor, textAlign: 'right' }}>{glyphRuns(safeText(model.logistics.vehiclePlate || ''), fillableFont)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, fontSize: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 8, color: '#444444' }}>DRIVER</Text>
              <Text style={{ ...strong, fontSize: 8, color: fillableColor, textAlign: 'right' }}>{glyphRuns(safeText(model.logistics.driverName || ''), fillableFont)}</Text>
            </View>

            {/* Dispatch From */}
            <View style={{ borderTopWidth: 0.5, borderTopColor: '#333333', paddingTop: 6, marginTop: 6 }}>
              <Text style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: 0.7, marginBottom: 5 }}>DISPATCH FROM</Text>
              <View style={{ fontSize: 8, lineHeight: 1.4, borderWidth: 0.5, borderColor: '#666666', padding: 8, marginBottom: 6 }}>
                <Text style={{ ...strong, fontSize: 9, color: fillableColor }}>{glyphRuns(safeText(model.branding.name), fillableFont)}</Text>
                <Text style={{ fontSize: 8, lineHeight: 1.4 }}>{glyphRuns(safeText(model.branding.address || ''), bodyFont)}</Text>
              </View>
            </View>

            {/* Deliver To */}
            <View style={{ borderTopWidth: 0.5, borderTopColor: '#333333', paddingTop: 6, marginTop: 6 }}>
              <Text style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: 0.7, marginBottom: 5 }}>DELIVER TO</Text>
              <View style={{ fontSize: 8, lineHeight: 1.4, borderWidth: 0.5, borderColor: '#666666', padding: 8, marginBottom: 6 }}>
                <Text style={{ ...strong, fontSize: 9, color: fillableColor }}>{glyphRuns(safeText(model.parties.clientName || ''), fillableFont)}</Text>
                {model.parties.clientAddress ? <Text style={{ fontSize: 8, lineHeight: 1.4 }}>{glyphRuns(safeText(model.parties.clientAddress), bodyFont)}</Text> : null}
                {model.parties.clientCityState ? <Text style={{ fontSize: 8, lineHeight: 1.4 }}>{glyphRuns(safeText(model.parties.clientCityState), bodyFont)}</Text> : null}
                {model.parties.clientPhone ? <Text style={{ fontSize: 8, lineHeight: 1.4 }}>{glyphRuns(safeText(`Phone: ${model.parties.clientPhone}`), bodyFont)}</Text> : null}
                {model.parties.clientEmail ? <Text style={{ fontSize: 8, lineHeight: 1.4 }}>{glyphRuns(safeText(`Email: ${model.parties.clientEmail}`), bodyFont)}</Text> : null}
                {model.logistics.deliveryLocation ? (
                  <Text style={{ fontSize: 8, lineHeight: 1.4 }}>{glyphRuns(safeText(`Destination: ${model.logistics.deliveryLocation}`), bodyFont)}</Text>
                ) : null}
              </View>
            </View>

            {/* Movement Details */}
            <View style={{ borderTopWidth: 0.5, borderTopColor: '#333333', paddingTop: 6, marginTop: 6 }}>
              <Text style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: 0.7, marginBottom: 5 }}>MOVEMENT DETAILS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', fontSize: 8, lineHeight: 1.5, marginBottom: 4 }}>
                <Text>{'METHOD : '}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <View style={deliveryMode === 'By Hand' ? { width: 8, height: 8, backgroundColor: fillableColor } : { width: 8, height: 8, borderWidth: 0.5, borderColor: fillableColor }} />
                  <Text style={{ fontSize: 7 }}>HAND</Text>
                </View>
                <Text>{'   '}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <View style={deliveryMode === 'By Vehicle' ? { width: 8, height: 8, backgroundColor: fillableColor } : { width: 8, height: 8, borderWidth: 0.5, borderColor: fillableColor }} />
                  <Text style={{ fontSize: 7 }}>VEHICLE</Text>
                </View>
                <Text>{'   '}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <View style={deliveryMode === 'By Courier' ? { width: 8, height: 8, backgroundColor: fillableColor } : { width: 8, height: 8, borderWidth: 0.5, borderColor: fillableColor }} />
                  <Text style={{ fontSize: 7 }}>COURIER</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', fontSize: 8, lineHeight: 1.5, marginBottom: 4 }}>
                <Text>{'PURPOSE: '}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <View style={purpose === 'Supply' ? { width: 8, height: 8, backgroundColor: fillableColor } : { width: 8, height: 8, borderWidth: 0.5, borderColor: fillableColor }} />
                  <Text style={{ fontSize: 7 }}>SUPPLY</Text>
                </View>
                <Text>{' '}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <View style={purpose === 'Return' ? { width: 8, height: 8, backgroundColor: fillableColor } : { width: 8, height: 8, borderWidth: 0.5, borderColor: fillableColor }} />
                  <Text style={{ fontSize: 7 }}>RETURN</Text>
                </View>
                <Text>{' '}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <View style={purpose === 'Repair' ? { width: 8, height: 8, backgroundColor: fillableColor } : { width: 8, height: 8, borderWidth: 0.5, borderColor: fillableColor }} />
                  <Text style={{ fontSize: 7 }}>REPAIR</Text>
                </View>
                <Text>{' '}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <View style={purpose === 'Transfer' ? { width: 8, height: 8, backgroundColor: fillableColor } : { width: 8, height: 8, borderWidth: 0.5, borderColor: fillableColor }} />
                  <Text style={{ fontSize: 7 }}>TRANSFER</Text>
                </View>
                <Text>{' '}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <View style={purpose === 'Other' ? { width: 8, height: 8, backgroundColor: fillableColor } : { width: 8, height: 8, borderWidth: 0.5, borderColor: fillableColor }} />
                  <Text style={{ fontSize: 7 }}>OTHER</Text>
                </View>
              </View>
            </View>

            {/* Items */}
            <View style={{ borderTopWidth: 0.5, borderTopColor: '#333333', paddingTop: 6, marginTop: 6 }}>
              <Text style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: 0.7, marginBottom: 5 }}>ITEMS</Text>
              <Table columns={tableColumns}>
                <Row header>
                  <Cell style={{ borderBottomWidth: 0.5, borderBottomColor: '#777777', paddingBottom: 3, paddingHorizontal: 2 }}>
                    <Text style={{ fontSize: 7, fontWeight: 700, textAlign: 'center' }}>#</Text>
                  </Cell>
                  {columns.map((col) => (
                    <Cell key={col.key} style={{ borderBottomWidth: 0.5, borderBottomColor: '#777777', paddingBottom: 3, paddingHorizontal: 2 }}>
                      <Text style={{ fontSize: 7, fontWeight: 700 }}>{safeText(col.label)}</Text>
                    </Cell>
                  ))}
                </Row>
                {model.table.rows.map((row, i) => (
                  <Row key={i}>
                    <Cell style={{ borderBottomWidth: 0.5, borderBottomColor: '#777777', paddingVertical: 3, paddingHorizontal: 2 }}>
                      <Text style={{ ...strong, fontSize: 7, color: fillableColor, textAlign: 'center' }}>{i + 1}</Text>
                    </Cell>
                    {columns.map((col) => (
                      <Cell key={col.key} style={{ borderBottomWidth: 0.5, borderBottomColor: '#777777', paddingVertical: 3, paddingHorizontal: 2 }}>
                        <Text style={{ ...strong, fontSize: 7, color: fillableColor }}>{glyphRuns(safeText(row.cells[col.key] || ''), fillableFont)}</Text>
                      </Cell>
                    ))}
                  </Row>
                ))}
              </Table>
            </View>

            {/* Note */}
            <View style={{ borderTopWidth: 0.5, borderTopColor: '#333333', paddingTop: 6, marginTop: 6 }}>
              <Text style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: 0.7, marginBottom: 5 }}>NOTE</Text>
              <View style={{ fontSize: 8, lineHeight: 1.45, borderWidth: 0.5, borderColor: '#666666', padding: 6 }}>
                <Text style={{ ...strong, fontSize: 8, lineHeight: 1.45, color: fillableColor }}>{glyphRuns(safeText(model.notes || ''), fillableFont)}</Text>
              </View>
            </View>

            {/* Acknowledgement */}
            <View style={{ borderTopWidth: 0.5, borderTopColor: '#333333', paddingTop: 6, marginTop: 6 }} wrap={false}>
              <Text style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, letterSpacing: 0.7, marginBottom: 5 }}>ACKNOWLEDGEMENT</Text>
              <View style={{ borderWidth: 0.5, borderColor: '#666666', padding: 6, marginTop: 6 }}>
                <View style={{ marginTop: 4, fontSize: 8, flexDirection: 'row', gap: 4 }}>
                  <Text style={{ fontSize: 8 }}>Delivered By: </Text>
                  <Text style={{ ...strong, fontSize: 8, color: fillableColor }}>{glyphRuns(safeText(model.parties.senderName || model.branding.name || ''), fillableFont)}</Text>
                </View>
                <View style={{ marginTop: 4, fontSize: 8, flexDirection: 'row', gap: 4 }}>
                  <Text style={{ fontSize: 8 }}>Signature: </Text>
                  {model.signatures.sender?.url ? (
                    <View style={{ height: 42, borderWidth: 0.5, borderColor: '#c9d9cf', borderRadius: 2, justifyContent: 'center', alignItems: 'center', marginVertical: 4, backgroundColor: '#ffffff' }}>
                      <Image src={model.signatures.sender.url} alt="Sender signature" style={{ width: 110, height: 42 }} />
                    </View>
                  ) : (
                    <View style={{ borderWidth: 1, borderColor: '#333333', minWidth: 110, height: 42 }} />
                  )}
                </View>
                <View style={{ marginTop: 4, fontSize: 8, flexDirection: 'row', gap: 4 }}>
                  <Text style={{ fontSize: 8 }}>Date / Time: </Text>
                  <View style={{ borderWidth: 1, borderColor: '#333333', minWidth: 110, height: 42 }} />
                </View>

                <View style={{ height: 8 }} />

                <View style={{ marginTop: 4, fontSize: 8, flexDirection: 'row', gap: 4 }}>
                  <Text style={{ fontSize: 8 }}>Collected By: </Text>
                  <Text style={{ ...strong, fontSize: 8, color: fillableColor }}>{glyphRuns(safeText(model.parties.receiverName || ''), fillableFont)}</Text>
                </View>
                <View style={{ marginTop: 4, fontSize: 8, flexDirection: 'row', gap: 4 }}>
                  <Text style={{ fontSize: 8 }}>Signature: </Text>
                  {model.signatures.receiver?.url ? (
                    <View style={{ height: 42, borderWidth: 0.5, borderColor: '#c9d9cf', borderRadius: 2, justifyContent: 'center', alignItems: 'center', marginVertical: 4, backgroundColor: '#ffffff' }}>
                      <Image src={model.signatures.receiver.url} alt="Receiver signature" style={{ width: 110, height: 42 }} />
                    </View>
                  ) : (
                    <View style={{ borderWidth: 1, borderColor: '#333333', minWidth: 110, height: 42 }} />
                  )}
                </View>
                <View style={{ marginTop: 4, fontSize: 8, flexDirection: 'row', gap: 4 }}>
                  <Text style={{ fontSize: 8 }}>Date / Time: </Text>
                  <View style={{ borderWidth: 1, borderColor: '#333333', minWidth: 110, height: 42 }} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Footer — repeats on every page */}
        <Fixed position="footer" style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#333333', paddingTop: 6, paddingHorizontal: 0, fontSize: 7, lineHeight: 1.4, color: '#444444' }}>
          <Text>{glyphRuns(safeText(model.footer.companyName || model.branding.name || ''), bodyFont)}</Text>
          <Text>{glyphRuns(safeText(model.footer.waybillNumber || model.header.waybillNumber || ''), bodyFont)}</Text>
          <Text>{'Page {{pageNumber}} of {{totalPages}}'}</Text>
        </Fixed>
      </Page>
    </Document>
  )
}
