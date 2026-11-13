import React from 'react'
import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { safeText } from '../../core/safeText'
import { glyphRuns } from '../glyphs'
import { resolveWaybillFormeFonts } from './kit'

export interface SlateWaybillFormeDocumentProps {
  model: WaybillRenderModel
  designPreset?: PdfDesignPreset | null
}

const PAGE_WIDTH = 595.28
const SIDE_PADDING = 20
const CONTENT_WIDTH = PAGE_WIDTH - SIDE_PADDING * 2
const NUM_COL_WIDTH = Math.floor(CONTENT_WIDTH * 0.05 * 100) / 100

export function SlateWaybillFormeDocument({ model, designPreset }: SlateWaybillFormeDocumentProps): React.JSX.Element {
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
      title={`Waybill - ${model.header.waybillNumber || 'Industry'}`}
      author={model.branding.name || 'Company'}
      creator="Bigdrops Waybill Industry"
      style={{ fontFamily: bodyFont, fontSize: 9, color: txt }}
    >
      <Page size="A4" margin={0} style={{ backgroundColor: '#ffffff' }}>
        <View style={{ flex: 1 }}>
          {/* Dark header band */}
          <View style={{
            backgroundColor: '#7d8a88',
            paddingHorizontal: 22,
            paddingVertical: 16,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomWidth: 4,
            borderBottomColor: '#4a5a57',
          }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {model.branding.logo ? (
                <Image src={model.branding.logo} alt="Company logo" style={{ width: 46, height: 46, borderRadius: 4, flexShrink: 0, backgroundColor: '#ffffff' }} />
              ) : (
                <View style={{
                  width: 46,
                  height: 46,
                  borderWidth: 0.5,
                  borderColor: '#94a3b8',
                  borderRadius: 4,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  flexShrink: 0,
                }}>
                  <Text style={{ fontSize: 7, color: '#94a3b8' }}>LOGO</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: -0.3, lineHeight: 1.2 }}>{glyphRuns(safeText(model.branding.name), bodyFont)}</Text>
                {model.branding.address ? (
                  <Text style={{ fontSize: 7, fontWeight: 300, color: '#dbe4e1', letterSpacing: 0.2 }}>{glyphRuns(safeText(model.branding.address), bodyFont)}</Text>
                ) : null}
                {model.branding.city ? (
                  <Text style={{ fontSize: 7, fontWeight: 300, color: '#dbe4e1', letterSpacing: 0.2 }}>{glyphRuns(safeText(`${model.branding.city}${model.branding.state ? `, ${model.branding.state}` : ''}`), bodyFont)}</Text>
                ) : null}
                {model.branding.phone ? (
                  <Text style={{ fontSize: 7, fontWeight: 300, color: '#dbe4e1', letterSpacing: 0.2 }}>{glyphRuns(safeText(`Phone: ${model.branding.phone}`), bodyFont)}</Text>
                ) : null}
                {model.branding.email ? (
                  <Text style={{ fontSize: 7, fontWeight: 300, color: '#dbe4e1', letterSpacing: 0.2 }}>{glyphRuns(safeText(model.branding.email), bodyFont)}</Text>
                ) : null}
                {model.branding.website ? (
                  <Text style={{ fontSize: 7, fontWeight: 300, color: '#dbe4e1', letterSpacing: 0.2 }}>{glyphRuns(safeText(`Web: ${model.branding.website}`), bodyFont)}</Text>
                ) : null}
                {model.branding.customInfo?.map((info, i) => (
                  <Text key={i} style={{ fontSize: 7, fontWeight: 300, color: '#dbe4e1', letterSpacing: 0.2 }}>{glyphRuns(safeText(`${info.label}: ${info.value}`), bodyFont)}</Text>
                ))}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 6.5, textTransform: 'uppercase', color: '#dbe4e1', letterSpacing: 0.5 }}>Waybill No.</Text>
              <Text style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: 0.5 }}>{glyphRuns(safeText(model.header.waybillNumber || ''), bodyFont)}</Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, flex: 1 }}>
            <Text style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 5,
              textTransform: 'uppercase',
              color: '#7d8a88',
              textAlign: 'center',
              borderBottomWidth: 1,
              borderBottomColor: '#e0e8e4',
              paddingBottom: 5,
              marginBottom: 12,
            }}>WAYBILL / DELIVERY NOTE</Text>

            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 12 }}>
              <View style={{ flex: 1.2 }}>
                <View style={{ marginBottom: 7 }}>
                  <Text style={{
                    fontSize: 6.5,
                    textTransform: 'uppercase',
                    color: '#7d8a88',
                    letterSpacing: 0.4,
                    fontWeight: 600,
                    borderBottomWidth: 1,
                    borderBottomColor: '#e0e8e4',
                    paddingBottom: 1,
                    marginBottom: 2,
                  }}>Client / Consignee</Text>
                  <Text style={{ ...strong, fontSize: 11, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(model.parties.clientName || ''), fillableFont)}</Text>
                  {model.parties.clientAddress ? <Text style={{ fontSize: 8, color: '#4a5a57', marginTop: 1 }}>{glyphRuns(safeText(model.parties.clientAddress), bodyFont)}</Text> : null}
                  {model.parties.clientCityState ? <Text style={{ fontSize: 8, color: '#4a5a57', marginTop: 1 }}>{glyphRuns(safeText(model.parties.clientCityState), bodyFont)}</Text> : null}
                  {model.parties.clientPhone ? <Text style={{ fontSize: 8, color: '#4a5a57', marginTop: 1 }}>{glyphRuns(safeText(`Phone: ${model.parties.clientPhone}`), bodyFont)}</Text> : null}
                  {model.parties.clientEmail ? <Text style={{ fontSize: 8, color: '#4a5a57', marginTop: 1 }}>{glyphRuns(safeText(`Email: ${model.parties.clientEmail}`), bodyFont)}</Text> : null}
                </View>
                <View style={{ marginBottom: 7 }}>
                  <Text style={{
                    fontSize: 6.5,
                    textTransform: 'uppercase',
                    color: '#7d8a88',
                    letterSpacing: 0.4,
                    fontWeight: 600,
                    borderBottomWidth: 1,
                    borderBottomColor: '#e0e8e4',
                    paddingBottom: 1,
                    marginBottom: 2,
                  }}>Destination Address</Text>
                  <Text style={{ ...strong, fontSize: 11, color: fillableColor, lineHeight: 1.25 }}>{glyphRuns(safeText(model.logistics.deliveryLocation || ''), fillableFont)}</Text>
                </View>
                <View style={{ marginBottom: 7 }}>
                  <Text style={{
                    fontSize: 6.5,
                    textTransform: 'uppercase',
                    color: '#7d8a88',
                    letterSpacing: 0.4,
                    fontWeight: 600,
                    borderBottomWidth: 1,
                    borderBottomColor: '#e0e8e4',
                    paddingBottom: 1,
                    marginBottom: 2,
                  }}>Method</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                    {([
                      { value: 'By Hand', label: 'Hand' },
                      { value: 'By Vehicle', label: 'Vehicle' },
                      { value: 'By Courier', label: 'Courier' },
                    ] as const).map((opt) => (
                      <View key={opt.value} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginRight: 6 }}>
                        <View style={deliveryMode === opt.value
                          ? { width: 10, height: 10, borderWidth: 1, borderColor: fillableColor, backgroundColor: fillableColor }
                          : { width: 10, height: 10, borderWidth: 1.5, borderColor: fillableColor, borderRadius: 2 }} />
                        <Text style={{ fontSize: 7.5, fontWeight: 500, color: txt }}>{opt.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={{ marginBottom: 7 }}>
                  <Text style={{
                    fontSize: 6.5,
                    textTransform: 'uppercase',
                    color: '#7d8a88',
                    letterSpacing: 0.4,
                    fontWeight: 600,
                    borderBottomWidth: 1,
                    borderBottomColor: '#e0e8e4',
                    paddingBottom: 1,
                    marginBottom: 2,
                  }}>Purpose</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                    {(['Supply', 'Return', 'Repair', 'Transfer', 'Other'] as const).map((opt) => (
                      <View key={opt} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginRight: 6 }}>
                        <View style={purpose === opt
                          ? { width: 10, height: 10, borderWidth: 1, borderColor: fillableColor, backgroundColor: fillableColor }
                          : { width: 10, height: 10, borderWidth: 1.5, borderColor: fillableColor, borderRadius: 2 }} />
                        <Text style={{ fontSize: 7.5, fontWeight: 500, color: txt }}>{opt}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={{ flex: 0.8 }}>
                {[
                  { label: 'Date', value: model.header.date || '' },
                  { label: 'Time', value: model.header.time || '' },
                  { label: 'P.O. Number', value: model.header.poNumber || '' },
                  { label: 'Vehicle Plate', value: model.logistics.vehiclePlate || '' },
                  { label: 'Driver Name', value: model.logistics.driverName || '' },
                ].map((item) => (
                  <View key={item.label} style={{ marginBottom: 3 }}>
                    <Text style={{
                      fontSize: 6.5,
                      textTransform: 'uppercase',
                      color: '#7d8a88',
                      letterSpacing: 0.4,
                    }}>{item.label}</Text>
                    <Text style={{
                      ...strong,
                      fontSize: 9,
                      color: fillableColor,
                      borderBottomWidth: 0.5,
                      borderBottomColor: '#e0e8e4',
                      paddingBottom: 1,
                    }}>{glyphRuns(safeText(item.value), fillableFont)}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text style={{
              fontSize: 7.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#7d8a88',
              letterSpacing: 0.5,
              borderBottomWidth: 2,
              borderBottomColor: '#7d8a88',
              paddingBottom: 2,
              marginBottom: 4,
            }}>Goods Description</Text>
            <View style={{ borderWidth: 1, borderColor: '#e0e8e4', marginBottom: 7 }}>
              <Table columns={tableColumns}>
                <Row header>
                  <Cell style={{ backgroundColor: '#f0f4f2', paddingTop: 3, paddingBottom: 3, paddingHorizontal: 6, borderBottomWidth: 2, borderBottomColor: '#7d8a88' }}>
                    <Text style={{ fontSize: 7, fontWeight: 700, color: '#1a2624', letterSpacing: 0.3, textAlign: 'center' }}>#</Text>
                  </Cell>
                  {columns.map((col) => (
                    <Cell key={col.key} style={{ backgroundColor: '#f0f4f2', paddingTop: 3, paddingBottom: 3, paddingHorizontal: 6, borderBottomWidth: 2, borderBottomColor: '#7d8a88' }}>
                      <Text style={{ fontSize: 7, fontWeight: 700, color: '#1a2624', letterSpacing: 0.3, textAlign: 'center' }}>{safeText(col.label)}</Text>
                    </Cell>
                  ))}
                </Row>
                {model.table.rows.map((row, i) => {
                  const isAlt = i % 2 === 1
                  const cellBg = isAlt ? '#f9fbfa' : '#ffffff'
                  return (
                    <Row key={i}>
                      <Cell style={{ backgroundColor: cellBg, paddingTop: 3, paddingBottom: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: '#ecf0ee' }}>
                        <Text style={{ ...strong, fontSize: 7.5, color: fillableColor, textAlign: 'center' }}>{i + 1}</Text>
                      </Cell>
                      {columns.map((col) => (
                        <Cell key={col.key} style={{ backgroundColor: cellBg, paddingTop: 3, paddingBottom: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: '#ecf0ee' }}>
                          <Text style={{ ...strong, fontSize: 7.5, color: fillableColor, textAlign: 'center' }}>{glyphRuns(safeText(row.cells[col.key] || ''), fillableFont)}</Text>
                        </Cell>
                      ))}
                    </Row>
                  )
                })}
              </Table>
            </View>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#f6f9f7',
              borderWidth: 1,
              borderColor: '#e0e8e4',
              paddingVertical: 3,
              paddingHorizontal: 10,
              marginBottom: 7,
            }}>
              <Text style={{ fontSize: 6.5, textTransform: 'uppercase', color: '#7d8a88', letterSpacing: 0.3 }}>Driver</Text>
              <Text style={{ ...strong, fontSize: 8.5, color: fillableColor }}>{glyphRuns(safeText(model.logistics.driverName || ''), fillableFont)}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 10 }}>
              <View style={{ flex: 1, borderWidth: 1, borderColor: '#e0e8e4', padding: 6, backgroundColor: '#fafcfb' }}>
                <Text style={{
                  fontSize: 6.5,
                  textTransform: 'uppercase',
                  color: '#7d8a88',
                  letterSpacing: 0.3,
                  fontWeight: 600,
                }}>Operational Notes</Text>
                {model.notes ? (
                  <Text style={{ ...strong, fontSize: 8, color: fillableColor, lineHeight: 1.4, marginTop: 2 }}>{glyphRuns(safeText(model.notes), fillableFont)}</Text>
                ) : null}
              </View>
              <View style={{ flex: 1, borderWidth: 1, borderColor: '#e0e8e4', padding: 6, backgroundColor: '#fafcfb' }}>
                <Text style={{
                  fontSize: 6.5,
                  textTransform: 'uppercase',
                  color: '#7d8a88',
                  letterSpacing: 0.3,
                  fontWeight: 600,
                }}>Receiving Checklist</Text>
                {['Quantity Checked', 'Condition Confirmed', 'Shortage Reported', 'Goods Accepted'].map((item) => (
                  <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <View style={{ width: 9, height: 9, borderWidth: 1.5, borderColor: '#7d8a88', borderRadius: 2 }} />
                    <Text style={{ fontSize: 7.5, color: '#1a2624' }}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View wrap={false} style={{ borderWidth: 2, borderColor: '#7d8a88', padding: 10, backgroundColor: '#f9fbfa', marginBottom: 6 }}>
              <Text style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#7d8a88',
                letterSpacing: 1,
                textAlign: 'center',
                borderBottomWidth: 1,
                borderBottomColor: '#7d8a88',
                paddingBottom: 4,
                marginBottom: 7,
              }}>Delivery Confirmation</Text>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 6.5,
                    textTransform: 'uppercase',
                    color: '#7d8a88',
                    letterSpacing: 0.4,
                    fontWeight: 600,
                  }}>Delivered By (Sender)</Text>
                  <Text style={{
                    borderBottomWidth: 1,
                    borderBottomColor: '#cbd5d1',
                    minHeight: 16,
                    paddingBottom: 3,
                    ...strong,
                    fontSize: 8.5,
                    color: fillableColor,
                    marginBottom: 2,
                    marginTop: 1,
                  }}>{glyphRuns(safeText(model.parties.senderName || model.branding.name || ''), fillableFont)}</Text>
                  {model.signatures.sender?.url ? (
                    <View style={{
                      borderWidth: 2,
                      borderColor: '#7d8a88',
                      borderRadius: 4,
                      height: 50,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      marginVertical: 3,
                    }}>
                      <Image src={model.signatures.sender.url} alt="Sender signature" style={{ width: 110, height: 42 }} />
                    </View>
                  ) : (
                    <View style={{
                      borderWidth: 2,
                      borderColor: '#7d8a88',
                      borderRadius: 4,
                      height: 50,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      marginVertical: 3,
                    }} />
                  )}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 6.5,
                        textTransform: 'uppercase',
                        color: '#7d8a88',
                        letterSpacing: 0.4,
                        fontWeight: 600,
                      }}>Date</Text>
                      <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#cbd5d1', minHeight: 13, paddingVertical: 1 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 6.5,
                        textTransform: 'uppercase',
                        color: '#7d8a88',
                        letterSpacing: 0.4,
                        fontWeight: 600,
                      }}>Time</Text>
                      <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#cbd5d1', minHeight: 13, paddingVertical: 1 }} />
                    </View>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 6.5,
                    textTransform: 'uppercase',
                    color: '#7d8a88',
                    letterSpacing: 0.4,
                    fontWeight: 600,
                  }}>Received By (Receiver)</Text>
                  <Text style={{
                    borderBottomWidth: 1,
                    borderBottomColor: '#cbd5d1',
                    minHeight: 16,
                    paddingBottom: 3,
                    ...strong,
                    fontSize: 8.5,
                    color: fillableColor,
                    marginBottom: 2,
                    marginTop: 1,
                  }}>{glyphRuns(safeText(model.parties.receiverName || ''), fillableFont)}</Text>
                  {model.signatures.receiver?.url ? (
                    <View style={{
                      borderWidth: 2,
                      borderColor: '#7d8a88',
                      borderRadius: 4,
                      height: 50,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      marginVertical: 3,
                    }}>
                      <Image src={model.signatures.receiver.url} alt="Receiver signature" style={{ width: 110, height: 42 }} />
                    </View>
                  ) : (
                    <View style={{
                      borderWidth: 2,
                      borderColor: '#7d8a88',
                      borderRadius: 4,
                      height: 50,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      marginVertical: 3,
                    }} />
                  )}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 6.5,
                        textTransform: 'uppercase',
                        color: '#7d8a88',
                        letterSpacing: 0.4,
                        fontWeight: 600,
                      }}>Date</Text>
                      <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#cbd5d1', minHeight: 13, paddingVertical: 1 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 6.5,
                        textTransform: 'uppercase',
                        color: '#7d8a88',
                        letterSpacing: 0.4,
                        fontWeight: 600,
                      }}>Time</Text>
                      <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#cbd5d1', minHeight: 13, paddingVertical: 1 }} />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        <Fixed position="footer" style={{
          borderTopWidth: 1,
          borderTopColor: '#e0e8e4',
          paddingTop: 4,
          paddingHorizontal: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          fontSize: 6.5,
          color: '#7d8a88',
        }}>
          <Text>{safeText(model.footer.companyName || model.branding.name || '')}</Text>
          <Text>{safeText(model.footer.waybillNumber || model.header.waybillNumber || '')}</Text>
          <Text>{'Page {{pageNumber}} of {{totalPages}}'}</Text>
        </Fixed>
      </Page>
    </Document>
  )
}
