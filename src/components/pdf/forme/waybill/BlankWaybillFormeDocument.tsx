/* eslint-disable react-refresh/only-export-components */

// CONTRACT: The Minimal blank waybill must fit on a single portrait A4 page.
// Any change that causes signatures or footer to spill to a second page
// is an automatic contract violation.

import React from 'react'
import { Document, Image, Page, Text, View } from '@formepdf/react'
import type { WaybillItem, WaybillType } from '@/components/waybill/waybillUtils'
import { richTextToPlainText } from '@/components/pdf/core/richText'
import { safeText } from '@/components/pdf/core/safeText'
import { glyphRuns } from '../glyphs'
import { renderPdfcnToBytes } from '@/components/pdf/pdfcn/adapter'

export interface MinimalContentData {
  type: WaybillType
  waybillNumber?: string
  date?: string
  companyName?: string
  companyAddress?: string
  companyLogoUrl?: string
  tagline?: string
  companyPhone?: string
  companyEmail?: string
  clientName?: string
  destinationAddress?: string
  vehiclePlate?: string
  driverName?: string
  transportMode?: string
  purpose?: string
  senderName?: string
  receiverName?: string
  senderSignatureUrl?: string
  receiverSignatureUrl?: string
  items?: WaybillItem[]
  notes?: string
}

const s = { gap: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }
const HELVETICA = 'Helvetica'
/** Forme Edges equivalent of the source's `padding: '4pt 8pt'`. */
const PAD_4_8 = { top: 4, right: 8, bottom: 4, left: 8 }
const PAD_4_12 = { top: 4, right: 12, bottom: 4, left: 12 }

const minimalStyles = {
  // Page padding moved to the Forme <Page margin={20}> prop; Forme has no page padding style drift.
  page: {
    fontFamily: HELVETICA,
    fontSize: 10,
    color: '#000000',
    backgroundColor: '#ffffff',
  },

  root: {
    flex: 1,
    flexDirection: 'column' as const,
  },

  titleZone: {
    marginBottom: s.sm,
    paddingBottom: s.sm,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  docTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    letterSpacing: 2,
  },

  headerGrid: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: s.md,
    marginBottom: s.md,
  },
  brandLogo: {
    width: 48,
    height: 48,
    marginBottom: s.xs,
  },
  brandInfo: {
    flex: 3,
  },
  brandName: {
    fontSize: 12,
    fontWeight: 'bold' as const,
    marginBottom: s.xs,
  },
  brandTagline: {
    fontSize: 9,
    marginBottom: s.xs,
  },
  brandAddress: {
    fontSize: 9,
    marginBottom: s.xs,
  },
  brandContact: {
    fontSize: 9,
    color: '#444444',
    marginBottom: s.xs,
  },

  identifierColumn: {
    flex: 1,
    alignSelf: 'flex-start' as const,
  },
  identifierBlock: {
    marginTop: 0,
  },

  metaPill: {
    borderWidth: 1,
    borderColor: '#000',
    padding: PAD_4_8,
    fontSize: 9,
    flexDirection: 'row' as const,
  },
  metaPillValue: {},
  datePill: { minHeight: 24 },

  topGrid: {
    flexDirection: 'row' as const,
    gap: s.sm,
    marginBottom: s.sm,
  },
  topBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000',
    padding: s.sm,
    minHeight: 56,
  },
  boxLabel: {
    fontSize: 9,
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: s.xs,
    color: '#000000',
  },

  secondGrid: {
    flexDirection: 'row' as const,
    gap: s.sm,
    marginBottom: s.sm,
  },
  secondBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000',
    padding: s.sm,
    minHeight: 28,
  },

  modeRow: {
    flexDirection: 'row' as const,
    gap: s.sm,
    marginBottom: s.md,
  },
  modeBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000',
    padding: s.sm,
    minHeight: 40,
  },
  checkboxRow: {
    flexDirection: 'row' as const,
    gap: s.sm,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
    marginTop: 'auto' as const,
    paddingBottom: s.xs,
  },
  checkboxLabel: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: s.sm,
    borderWidth: 1,
    borderColor: '#000',
    padding: PAD_4_8,
    fontSize: 10,
  },
  checkboxBox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: '#000',
  },

  contentZone: {
    flex: 1,
    marginBottom: s.md,
  },
  table: {
    marginBottom: s.md,
  },
  tableHeaderRow: {
    flexDirection: 'row' as const,
    backgroundColor: '#f4f4f4',
  },
  tableHeaderCell: {
    borderWidth: 1,
    borderColor: '#000',
    padding: PAD_4_8,
    justifyContent: 'center' as const,
  },
  tableHeaderCellText: {
    fontSize: 9,
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  tableRow: { flexDirection: 'row' as const },
  tableCell: {
    borderWidth: 1,
    borderColor: '#000',
    padding: PAD_4_8,
    justifyContent: 'center' as const,
    minHeight: 21,
  },
  tableCellText: { fontSize: 10 },
  colNum: { flex: 1, minWidth: 34 },
  colDesc: { flex: 14 },
  colQty: { flex: 2.4 },
  colUnit: { flex: 2.6 },
  colCenter: { alignItems: 'center' as const },

  notesBox: {
    borderWidth: 1,
    borderColor: '#000',
    padding: s.sm,
    minHeight: 40,
    marginBottom: s.sm,
  },

  sigsRow: {
    flexDirection: 'row' as const,
    gap: s.sm,
    marginBottom: s.sm,
  },
  sigCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000',
    height: 100,
  },
  sigHeader: {
    backgroundColor: '#f4f4f4',
    padding: s.sm,
    fontSize: 9,
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  sigMetaRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  sigMetaCell: {
    flex: 1,
    padding: PAD_4_12,
    fontSize: 9,
    minHeight: 24,
  },
  sigMetaCellBorder: {
    flex: 1,
    padding: PAD_4_12,
    fontSize: 9,
    minHeight: 24,
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  sigArea: {
    padding: s.sm,
    height: 48,
    fontSize: 9,
    color: '#555555',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  footer: {
    paddingTop: s.xs,
    borderTopWidth: 1,
    borderTopColor: '#000',
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    fontSize: 8,
    color: '#555555',
  },
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={checked ? { ...minimalStyles.checkboxBox, backgroundColor: '#000' } : minimalStyles.checkboxBox} />
  )
}

export function WaybillMinimalFormeContent({ data }: { data: MinimalContentData }): React.JSX.Element {
  const {
    type, waybillNumber, date, companyName, companyAddress, companyLogoUrl, tagline,
    companyPhone, companyEmail,
    clientName, destinationAddress, vehiclePlate, driverName, transportMode, purpose,
    senderName, receiverName, senderSignatureUrl, receiverSignatureUrl, items, notes,
  } = data

  const sanitizedNotes = richTextToPlainText(notes || '')

  const blankMode = !items || items.length === 0
  const rowCount = blankMode ? 10 : items.length

  const isHand = transportMode === 'By Hand'
  const isVehicle = transportMode === 'By Vehicle'
  const isModeOther = !!transportMode && !['By Hand', 'By Vehicle'].includes(transportMode)
  const isSupply = purpose === 'Supply'
  const isReturn = purpose === 'Return'
  const isRepair = purpose === 'Repair'
  const isTransfer = purpose === 'Transfer'
  const isReasonOther = purpose === 'Other'

  const contactParts: string[] = []
  if (companyPhone) contactParts.push(companyPhone)
  if (companyEmail) contactParts.push(companyEmail)
  const contactLine = contactParts.length > 0 ? contactParts.join('  |  ') : ''

  return (
    <View style={minimalStyles.root}>
      {/* This template is designed to render on a single A4 page. */}
      {/* ZONE 1 — TITLE */}
      <View style={minimalStyles.titleZone}>
        <Text style={minimalStyles.docTitle}>WAYBILL / DELIVERY NOTE</Text>
      </View>

      {/* ZONE 2 — HEADER GRID */}
      <View style={minimalStyles.headerGrid}>
        <View style={minimalStyles.brandInfo}>
          {companyLogoUrl ? (
            <Image src={companyLogoUrl} alt="Company logo" style={minimalStyles.brandLogo} />
          ) : null}
          <Text style={minimalStyles.brandName}>{glyphRuns(safeText(companyName || 'Company Name'), HELVETICA)}</Text>
          {companyAddress ? <Text style={minimalStyles.brandAddress}>{glyphRuns(safeText(companyAddress), HELVETICA)}</Text> : null}
          {contactLine ? <Text style={minimalStyles.brandContact}>{glyphRuns(safeText(contactLine), HELVETICA)}</Text> : null}
          {tagline ? <Text style={minimalStyles.brandTagline}>{glyphRuns(safeText(tagline), HELVETICA)}</Text> : null}
        </View>
        <View style={minimalStyles.identifierColumn}>
          <View style={minimalStyles.identifierBlock}>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={minimalStyles.metaPill}>
                <Text style={minimalStyles.metaPillValue}>{glyphRuns(safeText(waybillNumber || ''), HELVETICA)}</Text>
              </View>
              <View style={{ ...minimalStyles.metaPill, ...minimalStyles.datePill }}>
                <Text style={minimalStyles.metaPillValue}>Date{'  '}{glyphRuns(safeText(date || ''), HELVETICA)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={minimalStyles.topGrid}>
        <View style={minimalStyles.topBox}>
          <Text style={minimalStyles.boxLabel}>{type === 'internal' ? 'Origin' : 'Client / Consignee'}</Text>
          <Text>{glyphRuns(safeText(clientName || ''), HELVETICA)}</Text>
        </View>
        <View style={minimalStyles.topBox}>
          <Text style={minimalStyles.boxLabel}>{type === 'internal' ? 'Destination' : 'Destination Address'}</Text>
          <Text>{glyphRuns(safeText(destinationAddress || ''), HELVETICA)}</Text>
        </View>
      </View>

      <View style={minimalStyles.secondGrid}>
        <View style={minimalStyles.secondBox}>
          <Text style={minimalStyles.boxLabel}>Vehicle Plate</Text>
          <Text>{glyphRuns(safeText(vehiclePlate || ''), HELVETICA)}</Text>
        </View>
        <View style={minimalStyles.secondBox}>
          <Text style={minimalStyles.boxLabel}>Driver Name</Text>
          <Text>{glyphRuns(safeText(driverName || ''), HELVETICA)}</Text>
        </View>
      </View>

      <View style={minimalStyles.modeRow}>
        <View style={minimalStyles.modeBox}>
          <Text style={minimalStyles.boxLabel}>Delivery Mode</Text>
          <View style={minimalStyles.checkboxRow}>
            <View style={minimalStyles.checkboxLabel}>
              <Checkbox checked={isHand} />
              <Text>Hand</Text>
            </View>
            <View style={minimalStyles.checkboxLabel}>
              <Checkbox checked={isVehicle} />
              <Text>Vehicle</Text>
            </View>
            <View style={minimalStyles.checkboxLabel}>
              <Checkbox checked={isModeOther} />
              <Text>Other</Text>
            </View>
          </View>
        </View>
        {type === 'external' ? (
          <View style={minimalStyles.modeBox}>
            <Text style={minimalStyles.boxLabel}>Delivery Reason</Text>
            <View style={minimalStyles.checkboxRow}>
              <View style={minimalStyles.checkboxLabel}>
                <Checkbox checked={isSupply} />
                <Text>Supply</Text>
              </View>
              <View style={minimalStyles.checkboxLabel}>
                <Checkbox checked={isReturn} />
                <Text>Return</Text>
              </View>
              <View style={minimalStyles.checkboxLabel}>
                <Checkbox checked={isRepair} />
                <Text>Repair</Text>
              </View>
              <View style={minimalStyles.checkboxLabel}>
                <Checkbox checked={isReasonOther} />
                <Text>Other</Text>
              </View>
            </View>
          </View>
        ) : null}
        {type === 'internal' ? (
          <View style={minimalStyles.modeBox}>
            <Text style={minimalStyles.boxLabel}>Delivery Reason</Text>
            <View style={minimalStyles.checkboxRow}>
              <View style={minimalStyles.checkboxLabel}>
                <Checkbox checked={isTransfer} />
                <Text>Transfer</Text>
              </View>
              <View style={minimalStyles.checkboxLabel}>
                <Checkbox checked={isRepair} />
                <Text>Repair</Text>
              </View>
              <View style={minimalStyles.checkboxLabel}>
                <Checkbox checked={isReasonOther} />
                <Text>Other</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {/* ZONE 4 — CONTENT */}
      <View style={minimalStyles.contentZone}>
        <View style={minimalStyles.table}>
          <View style={minimalStyles.tableHeaderRow}>
            <View style={{ ...minimalStyles.tableHeaderCell, ...minimalStyles.colNum }}><Text style={minimalStyles.tableHeaderCellText}>#</Text></View>
            <View style={{ ...minimalStyles.tableHeaderCell, ...minimalStyles.colDesc }}><Text style={minimalStyles.tableHeaderCellText}>Description</Text></View>
            <View style={{ ...minimalStyles.tableHeaderCell, ...minimalStyles.colQty, ...minimalStyles.colCenter }}><Text style={minimalStyles.tableHeaderCellText}>Qty</Text></View>
            <View style={{ ...minimalStyles.tableHeaderCell, ...minimalStyles.colUnit, ...minimalStyles.colCenter }}><Text style={minimalStyles.tableHeaderCellText}>Unit</Text></View>
          </View>
          {Array.from({ length: rowCount }, (_, i) => {
            const item = blankMode ? null : items[i]
            return (
              <View key={i} style={minimalStyles.tableRow}>
                <View style={{ ...minimalStyles.tableCell, ...minimalStyles.colNum }}><Text style={minimalStyles.tableCellText}>{glyphRuns(String(i + 1), HELVETICA)}</Text></View>
                <View style={{ ...minimalStyles.tableCell, ...minimalStyles.colDesc }}><Text style={minimalStyles.tableCellText}>{glyphRuns(safeText(item?.description || ''), HELVETICA)}</Text></View>
                <View style={{ ...minimalStyles.tableCell, ...minimalStyles.colQty, ...minimalStyles.colCenter }}><Text style={minimalStyles.tableCellText}>{glyphRuns(safeText(item?.quantity != null ? String(item.quantity) : ''), HELVETICA)}</Text></View>
                <View style={{ ...minimalStyles.tableCell, ...minimalStyles.colUnit, ...minimalStyles.colCenter }}><Text style={minimalStyles.tableCellText}>{glyphRuns(safeText(item?.unit || ''), HELVETICA)}</Text></View>
              </View>
            )
          })}
        </View>

        <View style={minimalStyles.notesBox}>
          <Text style={minimalStyles.boxLabel}>Delivery Remarks / Notes</Text>
          <Text>{glyphRuns(safeText(sanitizedNotes), HELVETICA)}</Text>
        </View>
      </View>

      {/* ZONE 5 — SIGNATURE + FOOTER */}
      <View>
        <View style={minimalStyles.sigsRow}>
          <View style={minimalStyles.sigCard}>
            <Text style={minimalStyles.sigHeader}>Delivered By / Driver</Text>
            <View style={minimalStyles.sigMetaRow}>
              <Text style={minimalStyles.sigMetaCellBorder}>{glyphRuns(safeText(senderName || 'Name'), HELVETICA)}</Text>
              <Text style={minimalStyles.sigMetaCell}>{' '}</Text>
            </View>
            <View style={minimalStyles.sigArea}>
              {senderSignatureUrl ? (
                <Image src={senderSignatureUrl} alt="Sender signature" style={{ width: 110, height: 42 }} />
              ) : (
                <View style={{ width: 110, height: 42 }} />
              )}
            </View>
          </View>
          <View style={minimalStyles.sigCard}>
            <Text style={minimalStyles.sigHeader}>Received By</Text>
            <View style={minimalStyles.sigMetaRow}>
              <Text style={minimalStyles.sigMetaCellBorder}>{glyphRuns(safeText(receiverName || 'Name'), HELVETICA)}</Text>
              <Text style={minimalStyles.sigMetaCell}>{' '}</Text>
            </View>
            <View style={minimalStyles.sigArea}>
              {receiverSignatureUrl ? (
                <Image src={receiverSignatureUrl} alt="Receiver signature" style={{ width: 110, height: 42 }} />
              ) : (
                <View style={{ width: 110, height: 42 }} />
              )}
            </View>
          </View>
        </View>

        <View style={minimalStyles.footer}>
          <Text>{glyphRuns(safeText(companyName || ''), HELVETICA)}</Text>
          <Text>{glyphRuns(safeText(waybillNumber || ''), HELVETICA)}</Text>
        </View>
      </View>
    </View>
  )
}

function BlankExternalTemplate(options: MinimalContentData) {
  return (
    <Document style={{ fontFamily: HELVETICA, lineHeight: 1.0 }}>
      <Page size="A4" margin={20} style={minimalStyles.page}>
        <WaybillMinimalFormeContent data={options} />
      </Page>
    </Document>
  )
}

function BlankInternalTemplate(options: MinimalContentData) {
  return (
    <Document style={{ fontFamily: HELVETICA, lineHeight: 1.0 }}>
      <Page size="A4" margin={20} style={minimalStyles.page}>
        <WaybillMinimalFormeContent data={options} />
      </Page>
    </Document>
  )
}

export interface BlankTemplateOptions {
  type: WaybillType
  waybillNumber: string
  date?: string
  companyName: string
  companyAddress?: string
  companyLogoUrl?: string
  tagline?: string
  companyPhone?: string
  companyEmail?: string
}

export async function downloadBlankWaybillTemplate(options: BlankTemplateOptions): Promise<void> {
  const contentData: MinimalContentData = {
    type: options.type,
    waybillNumber: options.waybillNumber,
    date: options.date || new Date().toLocaleDateString(),
    companyName: options.companyName,
    companyAddress: options.companyAddress,
    companyLogoUrl: options.companyLogoUrl,
    tagline: options.tagline,
    companyPhone: options.companyPhone,
    companyEmail: options.companyEmail,
  }

  const element = options.type === 'internal'
    ? <BlankInternalTemplate {...contentData} />
    : <BlankExternalTemplate {...contentData} />

  const bytes = await renderPdfcnToBytes(element)
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
  const { downloadBlobFile } = await import('@/lib/native/fileDownload')
  await downloadBlobFile({ fileName: `blank-${options.type}-waybill.pdf`, blob })
}
