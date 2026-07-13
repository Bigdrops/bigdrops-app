import React from 'react'
import { Text, View, Image } from '@react-pdf/renderer'
import { CSR_STATUS_OPTIONS_PDF } from '../CSRPreviewContent'
import {
  getLayoutDensity,
  getPopulatedReadingRows,
  hasOperationalReadings,
  getMaterialsRows,
  hasMaterials,
  getTechnicianName,
  getTechnicianSignatureUrl,
  getServiceWindow,
  hasText,
  safe,
  shouldRender,
} from './utils'
import {
  formatCommaMaterialsText,
  resolveMaterialColumnBlocks,
} from './layoutModel'
import type { CsrRenderModel } from '../../../domain/csr/csrRenderModel'

export function PdfSignatureCard({ styles, label, name = '', signatureUrl = '' }: any) {
  return (
    <View style={[{ padding: 0 }, styles.signCard]}>
      <View style={{ flexDirection: 'row', alignItems: 'stretch', minHeight: 36 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 4 }}>
          {signatureUrl ? (
            <Image src={signatureUrl} style={{ maxHeight: 24, maxWidth: 92, objectFit: 'contain' }} />
          ) : null}
          <Text style={styles.signLabel}>{label}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: '#d0d0d0' }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 4 }}>
          {hasText(name) ? (
            <Text style={styles.fieldValue}>{name}</Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}

export function PdfField({ styles, label, value, span }: any) {
  if (!hasText(value)) return null
  return (
    <View style={[styles.fieldCard, span ? { width: `${span * 25}%` } : null]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  )
}

export function PdfTextBlock({ styles, label, value, minHeight = 34 }: any) {
  if (!hasText(value)) return null
  return (
    <View style={[styles.blockCard, { minHeight }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.blockText}>{value}</Text>
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

export function ReadingsCardGrid({ styles, csr }: { styles: any; csr: CsrRenderModel }) {
  csr = csr || ({} as CsrRenderModel)
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

export function ReadingsStrip({ styles, csr }: { styles: any; csr: CsrRenderModel }) {
  csr = csr || ({} as CsrRenderModel)
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

export function MaterialsSection({ styles, csr, noSection, templateId }: { styles: any; csr: CsrRenderModel; noSection?: boolean; templateId?: string }) {
  csr = csr || ({} as CsrRenderModel)
  if (!hasMaterials(csr)) return null

  const rows = getMaterialsRows(csr)
  if (rows.length === 0) return null

  const numBlocks = resolveMaterialColumnBlocks(rows.length, templateId)
  const content = numBlocks === 0
    ? renderCommaMaterials(rows)
    : renderTabulateMaterials(rows, numBlocks)

  if (noSection) return content
  return <PdfSection styles={styles} title="Materials Used">{content}</PdfSection>
}

function renderCommaMaterials(rows: any[]) {
  const text = formatCommaMaterialsText(rows)

  return (
    <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 8 }}>
      <Text style={{ fontSize: 8, color: '#0f172a', fontFamily: 'Helvetica', lineHeight: 1.6 }}>
        {text}
      </Text>
    </View>
  )
}

function renderTabulateMaterials(rows: any[], numBlocks: number) {
  const rowsPerBlock = Math.ceil(rows.length / numBlocks)
  const renderCell = (row: any, index: number) => {
    const qtyUnit = [safe(row.quantity), safe(row.unit)].filter(Boolean).join(' ')
    const children: any[] = [
      <Text key="name" style={{ fontSize: 8, color: '#0f172a', fontFamily: 'Helvetica', flex: 1 }}>{`${index + 1}. ${safe(row.item) || ' '}`}</Text>,
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

export function AcknowledgementBlock({ styles, csr }: { styles: any; csr: CsrRenderModel }) {
  csr = csr || ({} as CsrRenderModel)
  if (!csr.showAcknowledgement && !csr.showTechnicianSignLine) return null
  const technicianName = getTechnicianName(csr)
  const technicianSignatureUrl = getTechnicianSignatureUrl(csr)
  const density = getLayoutDensity(csr)
  const tight = density === 'tight'
  const compact = density !== 'comfortable'

  return (
    <PdfSection styles={styles} title="Acknowledgement">
      <View style={{ padding: tight ? 2.5 : compact ? 3.5 : 4.5 }}>
        <View style={styles.ackContainer}>
          {csr.showAcknowledgement ? (
            <View style={styles.ackTopRow}>
              <View style={styles.ackTopHalf}>
                <Text style={styles.ackFieldLabel}>Recipient Name</Text>
                <Text style={[styles.fieldValue, { marginTop: 5 }]}>
                  {hasText(csr.acknowledgement_name) ? csr.acknowledgement_name : ' '}
                </Text>
              </View>
              <View style={styles.ackTopHalfLast}>
                <Text style={styles.ackFieldLabel}>Comment</Text>
                {hasText(csr.customer_feedback) ? (
                  <Text style={[styles.blockText, { marginTop: 5 }]}>{csr.customer_feedback}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.ackBottomRow}>
            {csr.showAcknowledgement ? (
              <View style={styles.ackRecipientSig}>
                <Text style={styles.ackFieldLabel}>Recipient Signature</Text>
                <View style={{ flex: 1, width: '100%' }} />
              </View>
            ) : null}

            {csr.showTechnicianSignLine ? (
              <>
                <View style={styles.ackTechSig}>
                  <Text style={styles.ackFieldLabel}>Technician Signature</Text>
                  <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    {technicianSignatureUrl ? (
                      <Image src={technicianSignatureUrl} style={{ maxHeight: 50, maxWidth: 88, objectFit: 'contain' }} />
                    ) : null}
                  </View>
                </View>
                <View style={styles.ackTechName}>
                  <Text style={styles.ackFieldLabel}>Technician Name</Text>
                  <View style={{ flex: 1, width: '100%', justifyContent: 'center' }}>
                    {hasText(technicianName) ? (
                      <Text style={styles.fieldValue}>{technicianName}</Text>
                    ) : null}
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </PdfSection>
  )
}

export function StructuredTopIdentity({ styles, csr, branding }: { styles: any; csr: CsrRenderModel; branding: any }) {
  csr = csr || ({} as CsrRenderModel)
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
            {hasText(csr.callTypeDisplay) ? (
              <>
                <Text style={styles.metaLabel}>Call Type</Text>
                <Text style={styles.metaValue}>{safe(csr.callTypeDisplay)}</Text>
              </>
            ) : null}
            {hasText(csr.serviceBasisDisplay) ? (
              <>
                <Text style={styles.metaLabel}>Service Basis</Text>
                <Text style={styles.metaValue}>{safe(csr.serviceBasisDisplay)}</Text>
              </>
            ) : null}
            {hasText(csr.systemDownDisplay) ? (
              <View style={styles.identityFull}>
                <Text style={styles.metaLabel}>System Status</Text>
                <Text style={styles.metaValue}>{safe(csr.systemDownDisplay)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </>
  )
}

export function ServiceTimeSection({ styles, csr }: { styles: any; csr: CsrRenderModel }) {
  csr = csr || ({} as CsrRenderModel)
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

export function CustomerFeedbackSection({ styles, csr }: { styles: any; csr: CsrRenderModel }) {
  csr = csr || ({} as CsrRenderModel)
  if (!shouldRender(true, csr.customer_feedback)) return null
  return (
    <PdfSection styles={styles} title="Customer Feedback">
      <View style={styles.textAreaOnly}>
        <Text style={styles.blockText}>{safe(csr.customer_feedback)}</Text>
      </View>
    </PdfSection>
  )
}

export function DefectsFoundBlock({ styles, csr }: { styles: any; csr: CsrRenderModel }) {
  csr = csr || ({} as CsrRenderModel)
  if (!shouldRender(true, csr.defects_found)) return null
  return (
    <PdfSection styles={styles} title="Defects Found">
      <View style={styles.textAreaOnly}>
        <Text style={styles.blockText}>{safe(csr.defectsFound)}</Text>
      </View>
    </PdfSection>
  )
}

export function SharedProblemSection({ styles, csr, title = 'Problem Reported' }: { styles: any; csr: CsrRenderModel; title?: string }) {
  csr = csr || ({} as CsrRenderModel)
  if (!shouldRender(true, csr.problem_reported)) return null
  return (
    <PdfSection styles={styles} title={title}>
      <View style={styles.textAreaOnly}>
        <Text style={styles.blockText}>{safe(csr.problem_reported)}</Text>
      </View>
    </PdfSection>
  )
}

export function SharedEquipmentSection({ styles, csr }: { styles: any; csr: CsrRenderModel }) {
  csr = csr || ({} as CsrRenderModel)
  return (
    <PdfSection styles={styles} title="Equipment Information">
      <View style={styles.grid4}>
        <PdfField styles={styles} label="Equipment Type" value={csr.equipment_type} />
        <PdfField styles={styles} label="Equipment Location" value={csr.equipment_location} />
        <PdfField styles={styles} label="Make" value={csr.make} />
        <PdfField styles={styles} label={csr.modelLabel || 'Model'} value={csr.model} />
        <PdfField styles={styles} label={csr.serialLabel || 'Serial Number'} value={csr.serial_no} span={2} />
        <PdfField styles={styles} label="Capacity" value={csr.capacity} />
        <PdfField styles={styles} label="Engine No." value={csr.engine_no} />
        <PdfField styles={styles} label="Hours" value={csr.hours} />
      </View>
    </PdfSection>
  )
}
