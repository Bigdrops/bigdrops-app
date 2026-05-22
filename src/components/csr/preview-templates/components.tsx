import React from 'react'
import { Text, View, Image } from '@react-pdf/renderer'
import { CSR_STATUS_OPTIONS_PDF } from '../CSRPreviewContent'
import {
  getPopulatedReadingRows,
  hasOperationalReadings,
  getMaterialsRows,
  hasMaterials,
  getTechnicianName,
  getTechnicianRole,
  getTechnicianSignatureUrl,
  getServiceWindow,
  hasText,
  safe,
  shouldRender,
} from './utils'

export function PdfSignatureCard({ styles, label, name = '', role = '', signatureUrl = '' }: any) {
  return (
    <View style={styles.signCard}>
      {signatureUrl ? (
        <View style={{ height: 24, marginBottom: 4, justifyContent: 'flex-end' }}>
          <Image src={signatureUrl} style={{ maxHeight: 24, maxWidth: 92, objectFit: 'contain' }} />
        </View>
      ) : (
        <View style={{ height: 24, marginBottom: 4 }} />
      )}
      <Text style={styles.signLabel}>{label}</Text>
      {hasText(name) ? <Text style={styles.fieldValue}>{name}</Text> : null}
      {hasText(role) ? <Text style={[styles.fieldLabel, { marginTop: 2, marginBottom: 0 }]}>{role}</Text> : null}
    </View>
  )
}

export function PdfField({ styles, label, value, span }: any) {
  return (
    <View style={[styles.fieldCard, span ? { width: `${span * 25}%` } : null]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{hasText(value) ? value : ' '}</Text>
    </View>
  )
}

export function PdfTextBlock({ styles, label, value, minHeight = 34 }: any) {
  return (
    <View style={[styles.blockCard, { minHeight }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.blockText}>{hasText(value) ? value : ' '}</Text>
    </View>
  )
}

export function PdfSectionTitle({ styles, title }: any) {
  return <Text style={styles.sectionTitle}>{title}</Text>
}

export function PdfSection({ styles, title, children }: any) {
  return (
    <View style={styles.section}>
      <PdfSectionTitle styles={styles} title={title} />
      {children}
    </View>
  )
}

export function PdfLogoSlot({ styles, branding, fallback = 'LOGO' }: any) {
  if (branding.logoUrl) {
    return (
      <View style={{ backgroundColor: '#ffffff', borderRadius: 4, padding: 2 }}>
        <Image src={branding.logoUrl} style={styles.logoImage} />
      </View>
    )
  }
  return (
    <View style={styles.logoSlot}>
      <Text style={styles.logoSlotText}>
        {hasText(branding.companyName) ? branding.companyName.charAt(0).toUpperCase() : fallback}
      </Text>
    </View>
  )
}

export function PdfBrandBlock({ styles, branding }: any) {
  return (
    <View style={styles.brandBlock}>
      {branding.companyName ? <Text style={styles.companyName}>{branding.companyName}</Text> : null}
      {branding.companyTagline ? <Text style={styles.companyTagline}>{branding.companyTagline}</Text> : null}
      {branding.contactLine ? <Text style={styles.contactLine}>{branding.contactLine}</Text> : null}
    </View>
  )
}

export function StatusListDots({ styles, status }: any) {
  return (
    <View style={styles.statusGrid}>
      {CSR_STATUS_OPTIONS_PDF.map((option) => {
        const active = status === option
        return (
          <View key={option} style={styles.statusItem}>
            <View style={[styles.statusDot, active ? styles.statusDotActive : null]} />
            <Text style={styles.statusText}>{option}</Text>
          </View>
        )
      })}
    </View>
  )
}

export function StatusListChecks({ styles, status }: any) {
  return (
    <View style={styles.statusGrid}>
      {CSR_STATUS_OPTIONS_PDF.map((option) => {
        const active = status === option
        return (
          <View key={option} style={styles.statusItem}>
            <View style={[styles.checkBox, active ? styles.checkBoxActive : null]}>
              {active ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.statusText}>{option}</Text>
          </View>
        )
      })}
    </View>
  )
}

export function ReadingsCardGrid({ styles, csr }: any) {
  const rows = getPopulatedReadingRows(csr)
  if (!hasOperationalReadings(csr)) return null

  return (
    <PdfSection styles={styles} title="Readings">
      <View style={styles.readingGrid}>
        {rows.map((row: any) => (
          <View key={row.key} style={styles.readingCard}>
            <Text style={styles.readingLabel}>{row.label}</Text>
            <Text style={styles.readingValue}>{row.value || ' '}</Text>
          </View>
        ))}
      </View>
    </PdfSection>
  )
}

export function ReadingsStrip({ styles, csr }: any) {
  const rows = getPopulatedReadingRows(csr)
  if (!hasOperationalReadings(csr)) return null

  return (
    <PdfSection styles={styles} title="Readings">
      <View style={styles.readingStrip}>
        {rows.map((row: any, index: number) => (
          <View
            key={row.key}
            style={[styles.readingStripCell, index === rows.length - 1 ? styles.readingStripCellLast : null]}
          >
            <Text style={styles.readingValue}>{row.value || ' '}</Text>
            <Text style={styles.readingLabel}>{row.label}</Text>
          </View>
        ))}
      </View>
    </PdfSection>
  )
}

const TEMPLATE_MAX_PER_COLUMN: Record<string, number> = {
  signalbands: 5,
  zinc: 6,
  crimson: 6,
  pulseframe: 10,
}

export function MaterialsSection({ styles, csr, preferredStyle, noSection, templateId }: any) {
  if (!hasMaterials(csr)) return null

  const rows = getMaterialsRows(csr)
  if (rows.length === 0) return null

  const metaStyle = csr.meta?.materialsOutputStyle || ''
  const resolvedStyle = preferredStyle || (metaStyle === 'comma' ? 'comma' : 'list')
  const maxPerCol = TEMPLATE_MAX_PER_COLUMN[templateId] || 6

  const numBlocks = rows.length <= maxPerCol ? 1
    : rows.length <= maxPerCol * 2 ? 2
    : rows.length <= maxPerCol * 3 ? 3
    : 0

  const activeStyle = numBlocks === 0 ? 'comma' : resolvedStyle

  const content = activeStyle === 'comma'
    ? renderCommaMaterials(rows)
    : renderTabulateMaterials(rows, numBlocks)

  if (noSection) return content
  return <PdfSection styles={styles} title="Materials Used">{content}</PdfSection>
}

function renderCommaMaterials(rows: any[]) {
  return (
    <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 8 }}>
      <Text style={{ fontSize: 8, color: '#09090b', lineHeight: 1.6 }}>
        {rows.map((row: any, i: number) => {
          const qtyUnit = [safe(row.quantity), safe(row.unit)].filter(Boolean).join(' ')
          const text = `${safe(row.item)}${qtyUnit ? ` ${qtyUnit}` : ''}`
          return `${i > 0 ? '  │  ' : ''}${text}`
        }).join('')}
      </Text>
    </View>
  )
}

function renderTabulateMaterials(rows: any[], numBlocks: number) {
  const rowsPerBlock = Math.ceil(rows.length / numBlocks)
  const renderCell = (row: any, index: number) => {
    const qtyUnit = [safe(row.quantity), safe(row.unit)].filter(Boolean).join(' ')
    const children: any[] = [
      <Text key="name" style={{ fontSize: 8, color: '#09090b', flex: 1 }}>{`${index + 1}. ${safe(row.item) || ' '}`}</Text>,
    ]
    if (qtyUnit) {
      children.push(
        <Text key="pipe" style={{ color: '#94A3B8', fontFamily: 'Helvetica-Bold', marginHorizontal: 1 }}>│</Text>,
        <Text key="qty" style={{ fontSize: 7, color: '#71717a' }}>{qtyUnit}</Text>,
      )
    }
    return (
      <View key={index} style={{ flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
        {children}
      </View>
    )
  }
  const blocks: any[] = []
  for (let b = 0; b < numBlocks; b++) {
    const start = b * rowsPerBlock
    const end = Math.min(start + rowsPerBlock, rows.length)
    const slice = rows.slice(start, end)
    blocks.push(
      <View key={`block-${b}`} style={{ flex: 1, paddingHorizontal: 4 }}>
        {slice.map((row: any, i: number) => renderCell(row, start + i))}
      </View>
    )
    if (b < numBlocks - 1) {
      blocks.push(
        <View key={`divider-${b}`} style={{ width: 2, backgroundColor: '#475569' }} />
      )
    }
  }
  return (
    <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' }}>
        {blocks}
      </View>
    </View>
  )
}

export function AcknowledgementBlock({ styles, csr }: any) {
  if (!csr.showAcknowledgement && !csr.showTechnicianSignLine) return null
  const technicianName = getTechnicianName(csr)
  const technicianRole = getTechnicianRole(csr)
  const technicianSignatureUrl = getTechnicianSignatureUrl(csr)

  return (
    <PdfSection styles={styles} title="Acknowledgement">
      {csr.showAcknowledgement ? (
        <View style={styles.ackGrid}>
          <PdfField styles={styles} label="Customer Name" value={csr.acknowledgement_name} />
          <PdfField styles={styles} label="Recipient Title" value={csr.recipientTitle} />
          <PdfField styles={styles} label="Recipient Role" value={csr.recipientRole} />
          <PdfField styles={styles} label="Signature" value="________________" />
        </View>
      ) : null}

      <View style={styles.signRow}>
        {csr.showTechnicianSignLine ? (
          <PdfSignatureCard
            styles={styles}
            label="Technician Signature"
            name={technicianName}
            role={technicianRole}
            signatureUrl={technicianSignatureUrl}
          />
        ) : null}

        {csr.showAcknowledgement ? (
          <PdfSignatureCard
            styles={styles}
            label="Customer Sign Line"
            name={safe(csr.acknowledgement_name)}
            role={safe(csr.recipientRole)}
            signatureUrl={csr.recipient_signature_uri}
          />
        ) : null}
      </View>
    </PdfSection>
  )
}

export function PulseAcknowledgementBlock({ styles, csr }: any) {
  if (!csr.showAcknowledgement && !csr.showTechnicianSignLine) return null
  const technicianName = getTechnicianName(csr)
  const technicianRole = getTechnicianRole(csr)
  const technicianSignatureUrl = getTechnicianSignatureUrl(csr)

  return (
    <PdfSection styles={styles} title="Acknowledgement">
      <View style={styles.signRow}>
        {csr.showTechnicianSignLine ? (
          <PdfSignatureCard
            styles={styles}
            label="Technician Signature"
            name={technicianName}
            role={technicianRole}
            signatureUrl={technicianSignatureUrl}
          />
        ) : null}

        {csr.showAcknowledgement ? (
          <View style={styles.signCard}>
            <View style={[styles.fieldLabel, { fontSize: 6, marginBottom: 2 }]}>Recipient / Signature</View>
            <View style={{ marginTop: 4 }}>
              <Text style={[styles.fieldLabel, { fontSize: 6 }]}>Comment</Text>
            </View>
          </View>
        ) : null}
      </View>
    </PdfSection>
  )
}

export function StructuredTopIdentity({ styles, csr, branding }: any) {
  return (
    <>
      <View style={styles.headerRow}>
        {branding.logoUrl ? (
          <View style={{ backgroundColor: '#ffffff', borderRadius: 4, padding: 2 }}>
            <Image src={branding.logoUrl} style={styles.logoImage} />
          </View>
        ) : null}
        <PdfBrandBlock styles={styles} branding={branding} />

        <View style={styles.identityCard}>
          <View style={styles.identityGrid}>
            <View>
              <Text style={styles.metaLabel}>CSR Number</Text>
              <Text style={styles.metaValue}>{safe(csr.csr_number)}</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{safe(csr.date)}</Text>
            </View>
            {csr.show_po && hasText(csr.po_number) ? (
              <View style={styles.identityFull}>
                <Text style={styles.metaLabel}>P.O. Number</Text>
                <Text style={styles.metaValue}>{safe(csr.po_number)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </>
  )
}

export function ServiceTimeSection({ styles, csr }: any) {
  const w = getServiceWindow(csr)
  return (
    <PdfSection styles={styles} title="Service Time">
      <View style={styles.grid4}>
        <PdfField styles={styles} label="Start Date" value={w.startDate} />
        <PdfField styles={styles} label="Start Time" value={w.startTime} />
        <PdfField styles={styles} label="End Date" value={w.endDate} />
        <PdfField styles={styles} label="End Time" value={w.endTime} />
      </View>
    </PdfSection>
  )
}

export function CustomerFeedbackSection({ styles, csr }: any) {
  if (!shouldRender(true, csr.customer_feedback)) return null
  return (
    <PdfSection styles={styles} title="Customer Feedback">
      <View style={styles.textAreaOnly}>
        <Text style={styles.blockText}>{safe(csr.customer_feedback)}</Text>
      </View>
    </PdfSection>
  )
}

export function SharedProblemSection({ styles, csr, title = 'Problem Reported' }: any) {
  if (!shouldRender(true, csr.problem_reported)) return null
  return (
    <PdfSection styles={styles} title={title}>
      <View style={styles.textAreaOnly}>
        <Text style={styles.blockText}>{safe(csr.problem_reported)}</Text>
      </View>
    </PdfSection>
  )
}

export function SharedEquipmentSection({ styles, csr }: any) {
  return (
    <PdfSection styles={styles} title="Equipment Information">
      <View style={styles.grid4}>
        <PdfField styles={styles} label="Equipment Type" value={csr.equipment_type} />
        <PdfField styles={styles} label="Equipment Location" value={csr.equipment_location} />
        <PdfField styles={styles} label="Make" value={csr.make} />
        <PdfField styles={styles} label={csr.modelLabel || 'Model'} value={csr.model} />
        <PdfField styles={styles} label={csr.serialLabel || 'Serial Number'} value={csr.serial_no} span={2} />
        <PdfField styles={styles} label="Capacity" value={csr.capacity} />
        <PdfField styles={styles} label="Hours" value={csr.hours} />
      </View>
    </PdfSection>
  )
}
