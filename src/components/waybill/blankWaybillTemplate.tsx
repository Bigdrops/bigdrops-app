import React, { useEffect, useState } from 'react'
import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { minimalStyles as styles } from './waybillMinimalStyles'

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={styles.checkboxBox}>
      {checked ? <Text style={{ fontSize: 8, lineHeight: 1 }}>✓</Text> : null}
    </View>
  )
}

const deliveryModes = ['By Hand', 'By Vehicle'] as const
const deliveryReasons = ['Supply', 'Return', 'Repair', 'Transfer', 'Other'] as const

export function WaybillMinimalContent({ model }: { model: WaybillRenderModel }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(timer)
  }, [])

  // Derive checkbox state from model strings
  const isHand = model.logistics.deliveryMode === 'By Hand'
  const isVehicle = model.logistics.deliveryMode === 'By Vehicle'
  const isModeOther = !!model.logistics.deliveryMode && !['By Hand', 'By Vehicle'].includes(model.logistics.deliveryMode)

  const isSupply = model.logistics.purpose === 'Supply'
  const isReturn = model.logistics.purpose === 'Return'
  const isRepair = model.logistics.purpose === 'Repair'
  const isTransfer = model.logistics.purpose === 'Transfer'
  const isReasonOther = model.logistics.purpose === 'Other'

  const blankMode = model.table.rows.length === 0
  const rowCount = blankMode ? 10 : model.table.rows.length

  return (
    <View style={styles.page}>
      {/* ──────── TITLE ZONE ──────── */}
      <View style={[styles.titleZone, { opacity: mounted ? 1 : 0 }]} {...(model.pagination?.repeatTableHeader ? { fixed: true } : {})}>
        <Text style={styles.docTitle}>WAYBILL / DELIVERY NOTE</Text>
      </View>

      {/* ──────── HEADER GRID ──────── */}
      <View style={[styles.headerGrid, { opacity: mounted ? 1 : 0 }]} wrap={false}>
        {/* Left — Company Info */}
        <View style={styles.brandInfo}>
          {model.branding.logo ? (
            <Image src={model.branding.logo} style={styles.brandLogo} />
          ) : null}
          <Text style={styles.brandName}>{model.branding.name}</Text>
          {model.branding.address ? (
            <Text style={styles.brandAddress}>{model.branding.address}</Text>
          ) : null}
          <View style={styles.brandContact}>
            {model.branding.phone ? <Text style={styles.brandContact}>📞 {model.branding.phone}</Text> : null}
            {model.branding.email ? <Text style={styles.brandContact}>✉ {model.branding.email}</Text> : null}
          </View>
          {model.branding.tagline ? <Text style={styles.brandTagline}>{model.branding.tagline}</Text> : null}
        </View>

        {/* Right — Identifier Column */}
        <View style={styles.identifierColumn}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillValue}>{model.header.waybillNumber}</Text>
          </View>
          {model.header.date ? (
            <View style={[styles.metaPill, styles.datePill]}>
              <Text style={styles.metaPillValue}>{model.header.date}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ──────── TOP GRID: Client / Destination ──────── */}
      <View style={[styles.topGrid, { opacity: mounted ? 1 : 0 }]} wrap={false}>
        <View style={styles.topBox}>
          <Text style={styles.boxLabel}>
            {model.header.type === 'internal' ? 'ORIGIN' : 'CLIENT / CONSIGNEE'}
          </Text>
          <Text>
            {model.header.type === 'internal'
              ? (model.logistics.deliveryLocation || '—')
              : (model.parties.clientName || '—')}
          </Text>
        </View>
        <View style={styles.topBox}>
          <Text style={styles.boxLabel}>DESTINATION</Text>
          <Text>{model.logistics.deliveryLocation || '—'}</Text>
        </View>
      </View>

      {/* ──────── SECOND GRID ──────── */}
      <View style={[styles.secondGrid, { opacity: mounted ? 1 : 0 }]} wrap={false}>
        <View style={styles.secondBox}>
          <Text style={styles.boxLabel}>VEHICLE PLATE NO.</Text>
          <Text>{model.logistics.vehiclePlate || '—'}</Text>
        </View>
        <View style={styles.secondBox}>
          <Text style={styles.boxLabel}>DRIVER NAME</Text>
          <Text>{model.logistics.driverName || '—'}</Text>
        </View>
      </View>

      {/* ──────── MODE ROW ──────── */}
      <View style={[styles.modeRow, { opacity: mounted ? 1 : 0 }]} wrap={false}>
        <View style={styles.modeBox}>
          <Text style={styles.boxLabel}>DELIVERY MODE</Text>
          <View style={styles.checkboxRow}>
            {deliveryModes.map((mode) => {
              const checked =
                mode === 'By Hand' ? isHand :
                mode === 'By Vehicle' ? isVehicle : false
              return (
                <View key={mode} style={styles.checkboxLabel}>
                  <Checkbox checked={checked} />
                  <Text>{mode}</Text>
                </View>
              )
            })}
            {isModeOther ? (
              <View style={styles.checkboxLabel}>
                <Checkbox checked />
                <Text>Other</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.modeBox}>
          <Text style={styles.boxLabel}>REASON FOR DELIVERY</Text>
          <View style={styles.checkboxRow}>
            {deliveryReasons.map((reason) => {
              const checked =
                reason === 'Supply' ? isSupply :
                reason === 'Return' ? isReturn :
                reason === 'Repair' ? isRepair :
                reason === 'Transfer' ? isTransfer :
                reason === 'Other' ? isReasonOther : false
              return (
                <View key={reason} style={styles.checkboxLabel}>
                  <Checkbox checked={checked} />
                  <Text>{reason}</Text>
                </View>
              )
            })}
          </View>
        </View>
      </View>

      {/* ──────── TABLE ──────── */}
      <View style={[styles.table, { opacity: mounted ? 1 : 0 }]}>
        <View style={[styles.tableRow, styles.tableHeaderRow]} {...(model.pagination?.repeatTableHeader ? { fixed: true } : {})}>
          {model.table.columns.map((col, i) => (
            <Text
              key={`hdr-${col.key}`}
              style={[
                styles.tableHeaderCell,
                i === 0 ? styles.colNum :
                i === model.table.columns.length - 1 ? styles.colUnit :
                col.key === 'description' ? styles.colDesc :
                col.key === 'qtyLabel' ? styles.colQty :
                undefined,
              ]}
            >
              {i === 0 ? '#' : col.label}
            </Text>
          ))}
        </View>
        {Array.from({ length: rowCount }).map((_, idx) => {
          const row = blankMode ? null : model.table.rows[idx]
          const cells = row?.cells ?? {}
          return (
            <View key={idx} style={styles.tableRow}>
              {model.table.columns.map((col, i) => (
                <Text
                  key={`cell-${idx}-${col.key}`}
                  style={[
                    styles.tableCell,
                    i === 0 ? styles.colNum :
                    i === model.table.columns.length - 1 ? styles.colUnit :
                    col.key === 'description' ? styles.colDesc :
                    col.key === 'qtyLabel' ? styles.colQty :
                    undefined,
                  ]}
                >
                  {i === 0 ? (idx + 1).toString() : (cells[col.key] ?? '')}
                </Text>
              ))}
            </View>
          )
        })}
      </View>

      {/* ──────── NOTES BOX ──────── */}
      {model.notes ? (
        <View style={[styles.notesBox, { opacity: mounted ? 1 : 0 }]} wrap={false}>
          <Text style={styles.boxLabel}>NOTES / INSTRUCTIONS</Text>
          <Text>{model.notes}</Text>
        </View>
      ) : null}

      {/* ──────── SIGNATURE CARDS ──────── */}
      <View style={[styles.sigsRow, { opacity: mounted ? 1 : 0 }]} wrap={false}>
        {/* Sender Signature */}
        <View style={styles.sigCard}>
          <View style={styles.sigHeader}>
            <Text>SENDER'S SIGNATURE</Text>
          </View>
          <View style={styles.sigMetaRow}>
            <View style={styles.sigMetaCellBorder}>
              <Text style={styles.dateLabel}>Name</Text>
              <Text>{model.parties.senderName || '—'}</Text>
            </View>
            <View style={styles.sigMetaCell}>
              <Text style={styles.dateLabel}>Date</Text>
              <Text>{model.header.date || '—'}</Text>
            </View>
          </View>
          <View style={styles.sigArea}>
            {model.signatures.sender ? (
              <Image src={model.signatures.sender.url} style={{ width: 110, height: 42 }} />
            ) : null}
          </View>
        </View>

        {/* Receiver Signature */}
        <View style={styles.sigCard}>
          <View style={styles.sigHeader}>
            <Text>RECEIVER'S SIGNATURE</Text>
          </View>
          <View style={styles.sigMetaRow}>
            <View style={styles.sigMetaCellBorder}>
              <Text style={styles.dateLabel}>Name</Text>
              <Text>{model.parties.receiverName || '—'}</Text>
            </View>
            <View style={styles.sigMetaCell}>
              <Text style={styles.dateLabel}>Date</Text>
              <Text>{model.header.date || '—'}</Text>
            </View>
          </View>
          <View style={styles.sigArea}>
            {model.signatures.receiver ? (
              <Image src={model.signatures.receiver.url} style={{ width: 110, height: 42 }} />
            ) : null}
          </View>
        </View>
      </View>

      {/* ──────── FOOTER ──────── */}
      <View style={[styles.footer, { opacity: mounted ? 1 : 0 }]} wrap={false}>
        <Text>{model.footer.waybillNumber}</Text>
        <Text>{model.footer.companyName}</Text>
      </View>
    </View>
  )
}

export function downloadBlankWaybillTemplate(options: {
  model: WaybillRenderModel
  type: 'internal' | 'external'
  fileName?: string
}) {
  const { pdf } = require('@react-pdf/renderer') as typeof import('@react-pdf/renderer')
  const fileName = options.fileName ?? `waybill-${options.model.header.waybillNumber || 'blank'}.pdf`

  const doc = (
    <Document
      title={`Waybill - ${options.model.header.waybillNumber || 'Blank'}`}
      author={options.model.branding.name || 'Company'}
      creator="Bigdrops Waybill Minimal"
    >
      <Page
        size="A4"
        style={{
          paddingVertical: 25,
          paddingHorizontal: 20,
          fontFamily: 'Helvetica',
          fontSize: 9,
          color: '#111827',
          backgroundColor: 'white',
        }}
      >
        <WaybillMinimalContent model={options.model} />
      </Page>
    </Document>
  )

  return pdf(doc).toBlob().then((blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  })
}
