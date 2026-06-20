/* eslint-disable react-refresh/only-export-components */

// CONTRACT: The Minimal blank waybill must fit on a single portrait A4 page.
// Any change that causes signatures or footer to spill to a second page
// is an automatic contract violation.

import { Document, Image, Page, Text, View, pdf } from '@react-pdf/renderer'
import type { WaybillItem, WaybillType } from './waybillUtils'
import { minimalStyles } from './waybillMinimalStyles'
import { richTextToPlainText } from '@/components/pdf-new/core/richText'

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

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[minimalStyles.checkboxBox, checked && { backgroundColor: '#000' }]} />
  )
}

export function WaybillMinimalContent({ data }: { data: MinimalContentData }) {
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
  const isTransfer = purpose === 'Supply'
  const isMaint = purpose === 'Return'
  const isReasonOther = purpose === 'Third-Party Custody'

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
            <Image src={companyLogoUrl} style={minimalStyles.brandLogo} />
          ) : null}
          <Text style={minimalStyles.brandName}>{companyName || 'Company Name'}</Text>
          {companyAddress ? <Text style={minimalStyles.brandAddress}>{companyAddress}</Text> : null}
          {contactLine ? <Text style={minimalStyles.brandContact}>{contactLine}</Text> : null}
          {tagline ? <Text style={minimalStyles.brandTagline}>{tagline}</Text> : null}
        </View>
        <View style={minimalStyles.identifierColumn}>
          <View style={minimalStyles.identifierBlock}>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={minimalStyles.metaPill}>
                <Text style={minimalStyles.metaPillValue}>{waybillNumber || ''}</Text>
              </View>
              <View style={[minimalStyles.metaPill, minimalStyles.datePill]}>
                <Text style={minimalStyles.metaPillValue}>Date{'  '}{date || ''}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={minimalStyles.topGrid}>
        <View style={minimalStyles.topBox}>
          <Text style={minimalStyles.boxLabel}>{type === 'internal' ? 'Origin' : 'Client / Consignee'}</Text>
          <Text>{clientName || ''}</Text>
        </View>
        <View style={minimalStyles.topBox}>
          <Text style={minimalStyles.boxLabel}>{type === 'internal' ? 'Destination' : 'Destination Address'}</Text>
          <Text>{destinationAddress || ''}</Text>
        </View>
      </View>

      <View style={minimalStyles.secondGrid}>
        <View style={minimalStyles.secondBox}>
          <Text style={minimalStyles.boxLabel}>Vehicle Plate</Text>
          <Text>{vehiclePlate || ''}</Text>
        </View>
        <View style={minimalStyles.secondBox}>
          <Text style={minimalStyles.boxLabel}>Driver Name</Text>
          <Text>{driverName || ''}</Text>
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
                <Checkbox checked={isTransfer} />
                <Text>Transfer</Text>
              </View>
              <View style={minimalStyles.checkboxLabel}>
                <Checkbox checked={isMaint} />
                <Text>Maint.</Text>
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
            <Text style={[minimalStyles.tableHeaderCell, minimalStyles.colNum]}>#</Text>
            <Text style={[minimalStyles.tableHeaderCell, minimalStyles.colDesc]}>Description</Text>
            <Text style={[minimalStyles.tableHeaderCell, minimalStyles.colQty]}>Qty</Text>
            <Text style={[minimalStyles.tableHeaderCell, minimalStyles.colUnit]}>Unit</Text>
          </View>
          {Array.from({ length: rowCount }, (_, i) => {
            const item = blankMode ? null : items[i]
            return (
              <View key={i} style={minimalStyles.tableRow}>
                <Text style={[minimalStyles.tableCell, minimalStyles.colNum]}>{i + 1}</Text>
                <Text style={[minimalStyles.tableCell, minimalStyles.colDesc]}>{item?.description || ''}</Text>
                <Text style={[minimalStyles.tableCell, minimalStyles.colQty]}>{item?.quantity != null ? String(item.quantity) : ''}</Text>
                <Text style={[minimalStyles.tableCell, minimalStyles.colUnit]}>{item?.unit || ''}</Text>
              </View>
            )
          })}
        </View>

        <View style={minimalStyles.notesBox}>
          <Text style={minimalStyles.boxLabel}>Delivery Remarks / Notes</Text>
          <Text>{sanitizedNotes}</Text>
        </View>
      </View>

      {/* ZONE 5 — SIGNATURE + FOOTER */}
      <View>
        <View style={minimalStyles.sigsRow}>
          <View style={minimalStyles.sigCard}>
            <Text style={minimalStyles.sigHeader}>Delivered By / Driver</Text>
            <View style={minimalStyles.sigMetaRow}>
              <Text style={minimalStyles.sigMetaCellBorder}>{senderName || 'Name'}</Text>
              <Text style={minimalStyles.sigMetaCell}>{date || 'Time'}</Text>
            </View>
            <View style={minimalStyles.sigArea}>
              {senderSignatureUrl ? (
                <Image src={senderSignatureUrl} style={{ width: 110, height: 42, objectFit: 'contain' }} />
              ) : (
                <Text>Signature</Text>
              )}
            </View>
          </View>
          <View style={minimalStyles.sigCard}>
            <Text style={minimalStyles.sigHeader}>Received By</Text>
            <View style={minimalStyles.sigMetaRow}>
              <Text style={minimalStyles.sigMetaCellBorder}>{receiverName || 'Name'}</Text>
              <Text style={minimalStyles.sigMetaCell}>{date || 'Time'}</Text>
            </View>
            <View style={minimalStyles.sigArea}>
              {receiverSignatureUrl ? (
                <Image src={receiverSignatureUrl} style={{ width: 110, height: 42, objectFit: 'contain' }} />
              ) : (
                <Text>Signature</Text>
              )}
            </View>
          </View>
        </View>

        <View style={minimalStyles.footer}>
          <Text>{companyName || ''}</Text>
          <Text>{waybillNumber || ''}</Text>
        </View>
      </View>
    </View>
  )
}

function BlankExternalTemplate(options: MinimalContentData) {
  return (
    <Document>
      <Page size="A4" style={minimalStyles.page}>
        <WaybillMinimalContent data={options} />
      </Page>
    </Document>
  )
}

function BlankInternalTemplate(options: MinimalContentData) {
  return (
    <Document>
      <Page size="A4" style={minimalStyles.page}>
        <WaybillMinimalContent data={options} />
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

  const blob = await pdf(element).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `blank-${options.type}-waybill.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
