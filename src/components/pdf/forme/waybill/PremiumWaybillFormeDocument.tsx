import React from 'react'
import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { safeText } from '../../core/safeText'
import { glyphRuns } from '../glyphs'
import { resolveWaybillFormeFonts } from './kit'

/**
 * Forme port of the legacy React-PDF Premium waybill template.
 * Layout, palette, copy and field order mirror the retired React-PDF Premium template.
 */
export interface PremiumWaybillFormeDocumentProps {
  model: WaybillRenderModel
  designPreset?: PdfDesignPreset | null
}

const PAGE_WIDTH = 595.28
const CONTENT_WIDTH = PAGE_WIDTH - 32 // page margin 0 + content paddingHorizontal 16 on both sides
const NUM_COL_WIDTH = Math.floor(CONTENT_WIDTH * 0.05 * 100) / 100

export function PremiumWaybillFormeDocument({ model, designPreset }: PremiumWaybillFormeDocumentProps): React.JSX.Element {
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

  const waybillLength = model.header.waybillNumber?.length || 0
  const docValueSize = waybillLength > 24 ? 5.5 : waybillLength > 18 ? 7 : 9

  return (
    <Document
      title={`Waybill - ${model.header.waybillNumber || 'Premium'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Premium"
      style={{ fontFamily: bodyFont, fontSize: 9, color: txt }}
    >
      <Page size="A4" margin={0} style={{ backgroundColor: '#fffdf8' }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, flex: 1 }}>
          {/* Topbar */}
          <View style={{ flexDirection: 'row', borderWidth: 2, borderColor: '#2b2520', paddingTop: 14, marginBottom: 8, minHeight: 68 }}>
            <View style={{ width: 110, borderRightWidth: 1, borderRightColor: '#2b2520', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4efe6' }}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} alt="Company logo" style={{ width: 50, height: 50, backgroundColor: '#ffffff' }} />
              ) : (
                <View style={{ width: 50, height: 50, borderWidth: 0.5, borderColor: '#bda98f', borderRadius: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#efebe3' }}>
                  <Text style={{ fontSize: 7, color: '#8a7d6b' }}>LOGO</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1, paddingHorizontal: 10, justifyContent: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: 700, color: '#2d241b', marginBottom: 2 }}>{glyphRuns(safeText(model.branding.name), bodyFont)}</Text>
              {model.branding.address ? (
                <Text style={{ fontSize: 7.5, color: '#5e5146', lineHeight: 1.35 }}>{glyphRuns(safeText(model.branding.address), bodyFont)}</Text>
              ) : null}
              {model.branding.city ? (
                <Text style={{ fontSize: 7.5, color: '#5e5146', lineHeight: 1.35 }}>{glyphRuns(safeText(model.branding.city + (model.branding.state ? `, ${model.branding.state}` : '')), bodyFont)}</Text>
              ) : null}
              {model.branding.phone ? (
                <Text style={{ fontSize: 7.5, color: '#5e5146', lineHeight: 1.35 }}>{glyphRuns(safeText(`Phone: ${model.branding.phone}`), bodyFont)}</Text>
              ) : null}
              {model.branding.email ? (
                <Text style={{ fontSize: 7.5, color: '#5e5146', lineHeight: 1.35 }}>{glyphRuns(safeText(model.branding.email), bodyFont)}</Text>
              ) : null}
              {model.branding.website ? (
                <Text style={{ fontSize: 7.5, color: '#5e5146', lineHeight: 1.35 }}>{glyphRuns(safeText(`Web: ${model.branding.website}`), bodyFont)}</Text>
              ) : null}
              {model.branding.customInfo?.map((info, i) => (
                <Text key={i} style={{ fontSize: 7.5, color: '#5e5146', lineHeight: 1.35 }}>{glyphRuns(safeText(`${info.label}: ${info.value}`), bodyFont)}</Text>
              ))}
            </View>
            <View style={{ width: 104, borderLeftWidth: 1, borderLeftColor: '#2b2520' }}>
              <Text style={{ backgroundColor: '#2b2520', color: '#fff8ec', textAlign: 'center', fontSize: 7, letterSpacing: 0.5, textTransform: 'uppercase', paddingVertical: 3 }}>Waybill No</Text>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: docValueSize, fontWeight: 700, color: '#5a4630' }}>{glyphRuns(safeText(model.header.waybillNumber || ''), bodyFont)}</Text>
              </View>
            </View>
          </View>

          {/* Title band */}
          <View style={{ backgroundColor: '#3a3027', paddingVertical: 6, marginBottom: 8 }}>
            <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#fff7eb', letterSpacing: 2 }}>WAYBILL / DELIVERY NOTE</Text>
          </View>

          {/* Summary panels */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#bda98f', backgroundColor: '#fcf8f1', padding: 10 }}>
              <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5, color: '#7b6b5e', marginBottom: 3 }}>Consignee / Client</Text>
              <Text style={{ ...strong, fontSize: 10, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(model.parties.clientName || ''), fillableFont)}</Text>
              {model.parties.clientAddress ? (
                <Text style={{ fontSize: 8, color: '#5e5146', marginTop: 1 }}>{glyphRuns(safeText(model.parties.clientAddress), bodyFont)}</Text>
              ) : null}
              {model.parties.clientCityState ? (
                <Text style={{ fontSize: 8, color: '#5e5146', marginTop: 1 }}>{glyphRuns(safeText(model.parties.clientCityState), bodyFont)}</Text>
              ) : null}
              {model.parties.clientPhone ? (
                <Text style={{ fontSize: 8, color: '#5e5146', marginTop: 1 }}>{glyphRuns(safeText(`Phone: ${model.parties.clientPhone}`), bodyFont)}</Text>
              ) : null}
              {model.parties.clientEmail ? (
                <Text style={{ fontSize: 8, color: '#5e5146', marginTop: 1 }}>{glyphRuns(safeText(`Email: ${model.parties.clientEmail}`), bodyFont)}</Text>
              ) : null}
            </View>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#bda98f', backgroundColor: '#fcf8f1', padding: 10 }}>
              <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5, color: '#7b6b5e', marginBottom: 3 }}>Delivery Location</Text>
              <Text style={{ ...strong, fontSize: 10, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(model.logistics.deliveryLocation || ''), fillableFont)}</Text>
            </View>
          </View>

          {/* Meta grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
            {[
              { label: 'Date', value: model.header.date || '' },
              { label: 'Time', value: model.header.time || '' },
              { label: 'P.O. Number', value: model.header.poNumber || '' },
              { label: 'Vehicle Plate', value: model.logistics.vehiclePlate || '' },
              { label: 'Driver Name', value: model.logistics.driverName || '' },
              { label: 'Waybill No', value: model.header.waybillNumber || '' },
              { label: 'Prepared By', value: model.branding.name || '' },
              { label: 'Reference', value: model.header.waybillNumber || '' },
            ].map((item) => (
              <View key={item.label} style={{ width: '25%', paddingHorizontal: 3, marginBottom: 4 }}>
                <View style={{ borderWidth: 1, borderColor: '#d4c5b2', padding: 5, minHeight: 44 }}>
                  <Text style={{ fontSize: 7, textTransform: 'uppercase', color: '#8a7a6c', marginBottom: 1 }}>{item.label}</Text>
                  <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.3 }}>{glyphRuns(safeText(item.value), fillableFont)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Method & Purpose tick groups */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#c9b8a2', backgroundColor: '#fbf7f0', padding: 6 }}>
              <Text style={{ fontSize: 7, textTransform: 'uppercase', color: '#7c6c5e', marginBottom: 4 }}>Method</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {([
                  { value: 'By Hand', label: 'Hand' },
                  { value: 'By Vehicle', label: 'Vehicle' },
                  { value: 'By Courier', label: 'Courier' },
                ] as const).map((opt) => {
                  const checked = deliveryMode === opt.value
                  return (
                    <View key={opt.value} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 10, height: 10, borderWidth: 1, borderColor: fillableColor, ...(checked ? { backgroundColor: fillableColor } : {}) }} />
                      <Text style={{ fontSize: 8, fontWeight: 700, color: txt }}>{opt.label}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#c9b8a2', backgroundColor: '#fbf7f0', padding: 6 }}>
              <Text style={{ fontSize: 7, textTransform: 'uppercase', color: '#7c6c5e', marginBottom: 4 }}>Purpose</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['Supply', 'Return', 'Repair', 'Transfer', 'Other'] as const).map((opt) => {
                  const checked = purpose === opt
                  return (
                    <View key={opt} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <View style={{ width: 10, height: 10, borderWidth: 1, borderColor: fillableColor, ...(checked ? { backgroundColor: fillableColor } : {}) }} />
                      <Text style={{ fontSize: 8, fontWeight: 700, color: txt }}>{opt}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          </View>

          {/* Item Manifest table */}
          <Text style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.6, color: '#594b3f', marginBottom: 3 }}>Item Manifest</Text>
          <View style={{ borderWidth: 1, borderColor: '#eadfce', marginBottom: 6 }}>
            <Table columns={tableColumns}>
              <Row header>
                <Cell style={{ backgroundColor: '#4b3d30', paddingVertical: 4, paddingHorizontal: 5 }}>
                  <Text style={{ fontSize: 7.5, fontWeight: 700, color: '#fff8ef', textAlign: 'center' }}>#</Text>
                </Cell>
                {columns.map((col) => (
                  <Cell key={col.key} style={{ backgroundColor: '#4b3d30', paddingVertical: 4, paddingHorizontal: 5 }}>
                    <Text style={{ fontSize: 7.5, fontWeight: 700, color: '#fff8ef', textAlign: 'center' }}>{safeText(col.label)}</Text>
                  </Cell>
                ))}
              </Row>
              {model.table.rows.map((row, i) => {
                const isAlt = i % 2 === 1
                const cellBg = isAlt ? '#fcf8f2' : undefined
                return (
                  <Row key={i}>
                    <Cell style={{ ...(cellBg ? { backgroundColor: cellBg } : {}), paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: '#eadfce' }}>
                      <Text style={{ ...strong, fontSize: 7.5, color: fillableColor, lineHeight: 1.2, textAlign: 'center' }}>{i + 1}</Text>
                    </Cell>
                    {columns.map((col) => (
                      <Cell key={col.key} style={{ ...(cellBg ? { backgroundColor: cellBg } : {}), paddingVertical: 3, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: '#eadfce' }}>
                        <Text style={{ ...strong, fontSize: 7.5, color: fillableColor, lineHeight: 1.2, textAlign: 'center' }}>{glyphRuns(safeText(row.cells[col.key] || ''), fillableFont)}</Text>
                      </Cell>
                    ))}
                  </Row>
                )
              })}
            </Table>
          </View>

          {/* Driver row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#d4c5b2', backgroundColor: '#fcf8f1', paddingVertical: 3, paddingHorizontal: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 6.5, textTransform: 'uppercase', color: '#7b6b5e' }}>Driver</Text>
            <Text style={{ ...strong, fontSize: 9, color: fillableColor }}>{glyphRuns(safeText(model.logistics.driverName || ''), fillableFont)}</Text>
          </View>

          {/* Lower row — notes boxes */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#cab8a1', backgroundColor: '#fcf8f1', padding: 7 }}>
              <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5, color: '#7b6b5e', marginBottom: 2 }}>Operational Notes</Text>
              {model.notes ? (
                <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.4 }}>{glyphRuns(safeText(model.notes), fillableFont)}</Text>
              ) : null}
            </View>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#cab8a1', backgroundColor: '#fcf8f1', padding: 7 }}>
              <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5, color: '#7b6b5e', marginBottom: 2 }}>Receiving Check</Text>
              {['Quantity Verified', 'Packaging Intact', 'Condition Accepted', 'Exceptions Recorded'].map((item) => (
                <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <View style={{ width: 9, height: 9, borderWidth: 1, borderColor: '#4b3d30' }} />
                  <Text style={{ fontSize: 7.5, color: '#332a22' }}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Signature row */}
          <View wrap={false} style={{ flexDirection: 'row', gap: 8, marginBottom: 0 }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#bea98f', backgroundColor: '#fffdfa', padding: 7 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#4f4135', marginBottom: 4 }}>Delivered By</Text>
              <View style={{ marginBottom: 3 }}>
                <Text style={{ fontSize: 6.5, textTransform: 'uppercase', color: '#8b7a6a', marginBottom: 1 }}>Name</Text>
                <Text style={{ ...strong, minHeight: 13, borderBottomWidth: 0.5, borderBottomColor: '#8d7a65', paddingBottom: 1, fontSize: 8.5, color: fillableColor }}>{glyphRuns(safeText(model.parties.senderName || model.branding.name || ''), fillableFont)}</Text>
              </View>
              {model.signatures.sender?.url ? (
                <View style={{ height: 42, borderWidth: 0.5, borderColor: '#c7b7a3', backgroundColor: '#faf6ef', justifyContent: 'center', alignItems: 'center', marginVertical: 3 }}>
                  <Image src={model.signatures.sender.url} alt="Sender signature" style={{ width: 110, height: 42 }} />
                </View>
              ) : (
                <View style={{ height: 42, borderWidth: 0.5, borderColor: '#c7b7a3', backgroundColor: '#faf6ef', justifyContent: 'center', alignItems: 'center', marginVertical: 3 }} />
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ marginBottom: 3 }}>
                    <Text style={{ fontSize: 6.5, textTransform: 'uppercase', color: '#8b7a6a', marginBottom: 1 }}>Date</Text>
                    <View style={{ minHeight: 13, borderBottomWidth: 0.5, borderBottomColor: '#8d7a65', paddingBottom: 1 }} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ marginBottom: 3 }}>
                    <Text style={{ fontSize: 6.5, textTransform: 'uppercase', color: '#8b7a6a', marginBottom: 1 }}>Time</Text>
                    <View style={{ minHeight: 13, borderBottomWidth: 0.5, borderBottomColor: '#8d7a65', paddingBottom: 1 }} />
                  </View>
                </View>
              </View>
            </View>

            <View style={{ flex: 1, borderWidth: 1, borderColor: '#bea98f', backgroundColor: '#fffdfa', padding: 7 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#4f4135', marginBottom: 4 }}>Collected By</Text>
              <View style={{ marginBottom: 3 }}>
                <Text style={{ fontSize: 6.5, textTransform: 'uppercase', color: '#8b7a6a', marginBottom: 1 }}>Name</Text>
                <Text style={{ ...strong, minHeight: 13, borderBottomWidth: 0.5, borderBottomColor: '#8d7a65', paddingBottom: 1, fontSize: 8.5, color: fillableColor }}>{glyphRuns(safeText(model.parties.receiverName || ''), fillableFont)}</Text>
              </View>
              {model.signatures.receiver?.url ? (
                <View style={{ height: 42, borderWidth: 0.5, borderColor: '#c7b7a3', backgroundColor: '#faf6ef', justifyContent: 'center', alignItems: 'center', marginVertical: 3 }}>
                  <Image src={model.signatures.receiver.url} alt="Receiver signature" style={{ width: 110, height: 42 }} />
                </View>
              ) : (
                <View style={{ height: 42, borderWidth: 0.5, borderColor: '#c7b7a3', backgroundColor: '#faf6ef', justifyContent: 'center', alignItems: 'center', marginVertical: 3 }} />
              )}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ marginBottom: 3 }}>
                    <Text style={{ fontSize: 6.5, textTransform: 'uppercase', color: '#8b7a6a', marginBottom: 1 }}>Date</Text>
                    <View style={{ minHeight: 13, borderBottomWidth: 0.5, borderBottomColor: '#8d7a65', paddingBottom: 1 }} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ marginBottom: 3 }}>
                    <Text style={{ fontSize: 6.5, textTransform: 'uppercase', color: '#8b7a6a', marginBottom: 1 }}>Time</Text>
                    <View style={{ minHeight: 13, borderBottomWidth: 0.5, borderBottomColor: '#8d7a65', paddingBottom: 1 }} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Footer — repeats on every page */}
        <Fixed position="footer" style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#8d7a65', paddingTop: 4, paddingHorizontal: 16, fontSize: 7, color: '#6d5e51' }}>
          <Text>{glyphRuns(safeText(model.footer.companyName || model.branding.name || ''), bodyFont)}</Text>
          <Text>{glyphRuns(safeText(model.footer.waybillNumber || model.header.waybillNumber || ''), bodyFont)}</Text>
          <Text>{'Page {{pageNumber}} of {{totalPages}}'}</Text>
        </Fixed>
      </Page>
    </Document>
  )
}
