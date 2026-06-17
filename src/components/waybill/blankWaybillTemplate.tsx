/* eslint-disable react-refresh/only-export-components */

import { Document, Image, Page, Text, View, pdf } from '@react-pdf/renderer'
import type { WaybillItem, WaybillType } from './waybillUtils'
import { minimalStyles } from './waybillMinimalStyles'

export interface MinimalContentData {
  type: WaybillType
  waybillNumber?: string
  date?: string
  companyName?: string
  companyAddress?: string
  companyLogoUrl?: string
  tagline?: string
  clientName?: string
  destinationAddress?: string
  vehiclePlate?: string
  driverName?: string
  transportMode?: string
  purpose?: string
  items?: WaybillItem[]
  notes?: string
}

export function WaybillMinimalContent({ data }: { data: MinimalContentData }) {
  const {
    type, waybillNumber, date, companyName, companyAddress, companyLogoUrl, tagline,
    clientName, destinationAddress, vehiclePlate, driverName, transportMode, purpose, items, notes,
  } = data

  const blankMode = !items || items.length === 0
  const rowCount = blankMode ? 10 : items.length

  const c = (checked: boolean) => (checked ? '☑' : '☐')

  const isHand = transportMode === 'By Hand'
  const isVehicle = transportMode === 'By Vehicle'
  const isModeOther = !!transportMode && !['By Hand', 'By Vehicle'].includes(transportMode)
  const isTransfer = purpose === 'Supply'
  const isMaint = purpose === 'Return'
  const isReasonOther = purpose === 'Third-Party Custody'

  return (
    <View>
      <View style={minimalStyles.header}>
        <View style={minimalStyles.brand}>
          <View style={minimalStyles.logoBox}>
            {companyLogoUrl ? (
              <Image src={companyLogoUrl} style={{ width: 48, height: 48 }} />
            ) : (
              <Text style={minimalStyles.logoText}>LOGO</Text>
            )}
          </View>
          <View>
            <Text style={minimalStyles.brandName}>{companyName || 'Company Name'}</Text>
            {companyAddress ? <Text style={minimalStyles.brandAddress}>{companyAddress}</Text> : null}
          </View>
        </View>
        <View>
          <Text style={minimalStyles.docTitle}>WAYBILL</Text>
          <View style={minimalStyles.metaPillRow}>
            <View style={minimalStyles.metaPill}>
              <Text style={minimalStyles.metaPillLabel}>No: </Text>
              <Text style={minimalStyles.metaPillValue}>{waybillNumber || ''}</Text>
            </View>
            <View style={minimalStyles.metaPill}>
              <Text style={minimalStyles.metaPillLabel}>Date: </Text>
              <Text style={minimalStyles.metaPillValue}>{date || ''}</Text>
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
          <Text style={minimalStyles.boxLabel}>Destination{type === 'internal' ? '' : ' Address'}</Text>
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
              <Text style={minimalStyles.checkboxChar}>{c(isHand)}</Text>
              <Text> Hand</Text>
            </View>
            <View style={minimalStyles.checkboxLabel}>
              <Text style={minimalStyles.checkboxChar}>{c(isVehicle)}</Text>
              <Text> Vehicle</Text>
            </View>
            <View style={minimalStyles.checkboxLabel}>
              <Text style={minimalStyles.checkboxChar}>{c(isModeOther)}</Text>
              <Text> Other</Text>
            </View>
          </View>
        </View>
        {type === 'external' ? (
          <View style={minimalStyles.modeBox}>
            <Text style={minimalStyles.boxLabel}>Delivery Reason</Text>
            <View style={minimalStyles.checkboxRow}>
              <View style={minimalStyles.checkboxLabel}>
                <Text style={minimalStyles.checkboxChar}>{c(isTransfer)}</Text>
                <Text> Transfer</Text>
              </View>
              <View style={minimalStyles.checkboxLabel}>
                <Text style={minimalStyles.checkboxChar}>{c(isMaint)}</Text>
                <Text> Maint.</Text>
              </View>
              <View style={minimalStyles.checkboxLabel}>
                <Text style={minimalStyles.checkboxChar}>{c(isReasonOther)}</Text>
                <Text> Other</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

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
        <Text>{notes || ''}</Text>
      </View>

      <View style={minimalStyles.sigsRow}>
        <View style={minimalStyles.sigCard}>
          <Text style={minimalStyles.sigHeader}>Delivered By / Driver</Text>
          <View style={minimalStyles.sigMetaRow}>
            <Text style={minimalStyles.sigMetaCellBorder}>Name:</Text>
            <Text style={minimalStyles.sigMetaCell}>Time:</Text>
          </View>
          <View style={minimalStyles.sigArea}>
            <Text>Signature:</Text>
          </View>
        </View>
        <View style={minimalStyles.sigCard}>
          <Text style={minimalStyles.sigHeader}>Received By</Text>
          <View style={minimalStyles.sigMetaRow}>
            <Text style={minimalStyles.sigMetaCellBorder}>Name:</Text>
            <Text style={minimalStyles.sigMetaCell}>Time:</Text>
          </View>
          <View style={minimalStyles.sigArea}>
            <Text>Signature:</Text>
          </View>
        </View>
      </View>

      <View style={minimalStyles.footer}>
        <Text>{companyName || ''}{tagline ? ` — ${tagline}` : ''}</Text>
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
  companyName: string
  companyAddress?: string
  companyLogoUrl?: string
  tagline?: string
}

export async function downloadBlankWaybillTemplate(options: BlankTemplateOptions): Promise<void> {
  const contentData: MinimalContentData = {
    type: options.type,
    waybillNumber: options.waybillNumber,
    companyName: options.companyName,
    companyAddress: options.companyAddress,
    companyLogoUrl: options.companyLogoUrl,
    tagline: options.tagline,
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
