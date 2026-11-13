import React from 'react'
import type { PdfcnDocumentEnvelope } from '@/domain/pdf/resolver'
import type { CanonicalPreparedCsr, CsrMaterialItem } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import { Document, Page, View, Text, Fixed } from '../primitives'
import { getCsrRenderOptions, resolveInkFonts } from './csrFormeKit'
import {
  BrandLogo,
  READING_FIELDS,
  SignatureStage,
  dash,
  formatQuantity,
  getAdaptiveMaterialColumns,
} from './csrPdfcnUtils'
import { glyphRuns } from '../../forme/glyphs'

/**
 * Industry CSR Forme port. Formerly a React-PDF template (retired).
 * steel-slate band header with company block + centred document identity row,
 * seven-field grids, hero problem card with teal-ash (#7D8A88) accent, six-cell
 * readings strip, status rectangle row and the two-signature acknowledgement grid.
 */

const C = {
  header: '#1f3a68',
  accent: '#7D8A88',
  paper: '#ffffff',
  tint: '#F7F9F8',
  remarks: '#f7f9f8',
  text: '#374151',
  muted: '#9CA3AF',
  border: '#E5E9E8',
  rowRule: '#F1F4F3',
  borderStrong: '#D1D5D4',
  borderSteel: '#c5cfd9',
} as const

/** Mirrors CSR_STATUS_OPTIONS_PDF (Field Entry Pending excluded). */
const STATUS_OPTIONS = [
  'Complete',
  'Incomplete',
  'Pending for spares',
  'Under observation',
  'Working solution provided',
] as const

export const CsrIndustryFormeDocument: React.FC<{
  envelope: PdfcnDocumentEnvelope<CanonicalPreparedCsr>
}> = ({ envelope }) => {
  const csr = envelope.data
  const opts = getCsrRenderOptions(envelope)
  const { ink, fillableFont, bodyFont } = resolveInkFonts(opts.designPreset)

  const tight = opts.density === 'tight'
  const compact = opts.density !== 'comfortable'

  const padX = tight ? 8 : compact ? 9 : 10
  const bandPadV = tight ? 7 : 10
  const bandPadX = tight ? 9 : 12
  const docPadV = tight ? 5 : 8
  const docPadX = tight ? 10 : 12
  const sectionGap = tight ? 3 : compact ? 4 : 5
  const titleGap = tight ? 3 : compact ? 4 : 5
  const labelSize = tight ? 5.3 : compact ? 5.6 : 6
  const valueSize = tight ? 6.8 : compact ? 7.35 : 7.8
  const narrativeSize = tight ? 8.5 : compact ? 9 : 9.5
  const cardPadV = tight ? 2.5 : compact ? 3.5 : 4.5
  const cardPadX = tight ? 3.5 : 5
  const blockPadV = tight ? 5 : compact ? 6.5 : 8
  const heroPad = tight ? 7 : 10
  const gridGap = compact ? 3 : 4

  const companyName = csr.serviceProvider.name.trim()
  const monogram = companyName ? companyName.charAt(0).toUpperCase() : 'I'
  const locationSite = [csr.location.site, csr.location.subLocation].filter(Boolean).join(', ')
  const serviceStart = [csr.serviceWindow.startDate, csr.serviceWindow.startTime].filter(Boolean).join(' / ')
  const serviceEnd = [csr.serviceWindow.endDate, csr.serviceWindow.endTime].filter(Boolean).join(' / ')

  const sectionTitleStyle = {
    fontFamily: 'Inter',
    fontWeight: 800 as const,
    fontSize: tight ? 6.4 : 7,
    color: C.header,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    paddingBottom: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: C.borderSteel,
    marginBottom: titleGap,
  }

  const fieldLabelStyle = {
    fontFamily: 'Inter',
    fontWeight: 700 as const,
    fontSize: labelSize,
    color: C.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
    marginBottom: 2,
  }

  const fieldValueStyle = {
    fontFamily: fillableFont,
    fontWeight: 700 as const,
    fontSize: valueSize,
    color: ink,
    lineHeight: 1.15,
  }

  const narrativeStyle = {
    fontFamily: fillableFont,
    fontSize: narrativeSize,
    color: ink,
    lineHeight: tight ? 1.15 : 1.3,
  }

  const ackLabelStyle = {
    fontFamily: 'Inter',
    fontWeight: 700 as const,
    fontSize: tight ? 5.3 : 5.8,
    color: C.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  }

  const Field: React.FC<{ label: string; value: string; flex?: number; width?: number }> = ({ label, value, flex = 1, width }) => (
    <View
      style={{
        flex,
        width,
        backgroundColor: C.tint,
        borderBottomWidth: 1.5,
        borderBottomColor: C.border,
        borderRadius: 3,
        paddingVertical: cardPadV,
        paddingHorizontal: cardPadX,
      }}
    >
      <Text style={fieldLabelStyle}>{label}</Text>
      <Text style={fieldValueStyle}>{glyphRuns(dash(value), fillableFont)}</Text>
    </View>
  )

  const readingRow = (idx: number, key: (typeof READING_FIELDS)[number]['key'], label: string) => {
    const reading = csr.readings[key]
    const hasValue = Boolean(reading.value && reading.value.trim())
    return (
      <View
        key={key}
        style={{
          flex: 1,
          alignItems: 'center',
          paddingVertical: tight ? 2 : 3.5,
          paddingHorizontal: 3,
          borderLeftWidth: idx === 0 ? 0 : 1,
          borderLeftColor: C.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
          <Text style={{ fontFamily: fillableFont, fontWeight: 700, fontSize: tight ? 7.2 : 8.2, color: ink }}>
            {hasValue ? glyphRuns(String(reading.value), fillableFont) : '-'}
          </Text>
          {hasValue && reading.unit ? (
            <Text style={{ fontFamily: fillableFont, fontWeight: 700, fontSize: 6, color: ink, paddingBottom: 1 }}>
              {glyphRuns(String(reading.unit), fillableFont)}
            </Text>
          ) : null}
        </View>
        <Text style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 5.2, color: C.muted, textTransform: 'uppercase', marginTop: 2 }}>
          {label}
        </Text>
      </View>
    )
  }

  const readings = READING_FIELDS.map((field, idx) => readingRow(idx, field.key, field.label))
  const hasAnyReading = READING_FIELDS.some((field) => {
    const value = csr.readings[field.key].value
    return Boolean(value && value.trim())
  })
  const showReadings = opts.showOperationalReadings && hasAnyReading

  // Industry policy caps the tabulation at three columns; re-interleave when
  // the adaptive helper returns a fourth column for very large lists.
  const adaptive = getAdaptiveMaterialColumns(csr.materials, 'portrait')
  let materialColumns = adaptive.columns
  if (materialColumns.length > 3) {
    materialColumns = [[], [], []]
    csr.materials.forEach((item, index) => {
      materialColumns[index % 3].push(item)
    })
  }
  const materialRowCount = materialColumns.reduce((max, column) => Math.max(max, column.length), 0)
  const renderMaterialCell = (item: CsrMaterialItem | undefined, rowIdx: number) => {
    if (!item) return <View key={`e-${rowIdx}`} style={{ flex: 1 }} />
    return (
      <View
        key={`${item.no}-${rowIdx}`}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          paddingVertical: tight ? 2 : 3,
          paddingHorizontal: 6,
        }}
      >
        <Text style={{ fontFamily: fillableFont, fontWeight: 700, fontSize: 7.2, color: C.header }}>
          {glyphRuns(dash(item.no), fillableFont)}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fillableFont, fontSize: 7, color: ink, lineHeight: 1.15 }}>
            {glyphRuns(dash(item.description), fillableFont)}
          </Text>
          {item.partNo ? (
            <Text style={{ fontFamily: bodyFont, fontSize: 5.8, color: C.muted, marginTop: 1 }}>
              {glyphRuns(item.partNo, bodyFont)}
            </Text>
          ) : null}
        </View>
        <Text style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 8, color: C.muted }}>│</Text>
        <Text style={{ fontFamily: fillableFont, fontWeight: 700, fontSize: 7, color: ink }}>
          {glyphRuns(formatQuantity(item), fillableFont)}
        </Text>
      </View>
    )
  }

  const showDefects = Boolean(csr.narratives.defectsFound.trim()) || csr.narratives.defectsList.length > 0
  const showRemarks = Boolean(csr.narratives.engineerRemarks.trim())

  return (
    <Document
      title={`${csr.csrNumber || 'CSR'} — Customer Service Report`}
      author={companyName || undefined}
      lang="en-NG"
      style={{ fontFamily: 'Inter', color: C.text }}
    >
      <Page
        size="A4"
        margin={0}
        style={{ backgroundColor: C.paper, fontFamily: 'Inter', fontSize: 7.8, color: C.text }}
      >
        {/* ── Header band ─────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: C.accent,
            paddingVertical: bandPadV,
            paddingHorizontal: bandPadX,
          }}
        >
          {csr.serviceProvider.logoUrl ? (
            <BrandLogo logoUrl={csr.serviceProvider.logoUrl} height={48} />
          ) : (
            <View
              style={{
                width: 48,
                height: 48,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.6)',
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 14, color: '#ffffff' }}>
                {monogram}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            {companyName ? (
              <Text
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 800,
                  fontSize: tight ? 12 : 14,
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {glyphRuns(companyName, 'Inter')}
              </Text>
            ) : null}
            {csr.serviceProvider.subtitle ? (
              <Text
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 700,
                  fontSize: 5.8,
                  color: 'rgba(255,255,255,0.78)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                  marginTop: 2,
                }}
              >
                {glyphRuns(csr.serviceProvider.subtitle, 'Inter')}
              </Text>
            ) : null}
            {csr.serviceProvider.address ? (
              <Text style={{ fontFamily: bodyFont, fontSize: 6.1, color: '#c8d4d0', marginTop: 2, lineHeight: 1.3 }}>
                {glyphRuns(csr.serviceProvider.address, bodyFont)}
              </Text>
            ) : null}
            {csr.serviceProvider.contact ? (
              <Text style={{ fontFamily: bodyFont, fontSize: 6.1, color: '#c8d4d0', marginTop: 1, lineHeight: 1.3 }}>
                {glyphRuns(csr.serviceProvider.contact, bodyFont)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── Document identity row ───────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: docPadV,
            paddingHorizontal: docPadX,
            borderBottomWidth: 2,
            borderBottomColor: C.accent,
            marginBottom: sectionGap + 1,
          }}
        >
          <Text
            style={{
              fontFamily: 'Inter',
              fontWeight: 800,
              fontSize: 14,
              color: C.header,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Customer Service Report
          </Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: 6.5,
                color: C.muted,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
              }}
            >
              Report No.
            </Text>
            <Text style={{ fontFamily: fillableFont, fontWeight: 700, fontSize: 12, color: ink, marginTop: 1 }}>
              {glyphRuns(dash(csr.csrNumber), fillableFont)}
            </Text>
            <Text style={{ fontFamily: bodyFont, fontSize: 7.5, color: C.muted, marginTop: 1 }}>
              {glyphRuns(dash(csr.date), bodyFont)}
            </Text>
          </View>
        </View>

        {/* Forme omits a Fixed footer declared after a wrapping table, so it stays ahead of the flowing body. */}
        <Fixed
          position="footer"
          style={{
            borderTopWidth: 1,
            borderTopColor: C.border,
            paddingTop: 4,
            paddingHorizontal: padX,
            textAlign: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: bodyFont,
              fontWeight: 700,
              fontSize: 5.5,
              color: C.muted,
              textTransform: 'uppercase',
              letterSpacing: 1.6,
              textAlign: 'center',
            }}
          >
            Customer Service Report
          </Text>
        </Fixed>

        <View style={{ paddingHorizontal: padX }}>
          {/* ── Customer & Job Details ─────────────────── */}
          <View style={{ marginBottom: sectionGap }}>
            <Text style={sectionTitleStyle}>Customer &amp; Job Details</Text>
            <View style={{ flexDirection: 'row', gap: gridGap }}>
              <Field label="Client Name" value={csr.client.name} flex={1} />
              <Field label="Address" value={csr.client.address} flex={2} />
              {csr.client.poNumber?.trim() ? <Field label="P.O. Number" value={csr.client.poNumber} flex={1} /> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: gridGap, marginTop: gridGap }}>
              <Field label="Service Start" value={serviceStart || 'Not recorded'} flex={1} />
              <Field label="Service End" value={serviceEnd || 'Not recorded'} flex={1} />
            </View>
            {csr.callTypeDisplay.trim() || csr.serviceBasis.trim() || csr.systemDownDisplay.trim() ? (
              <View style={{ flexDirection: 'row', gap: gridGap, marginTop: gridGap }}>
                {csr.callTypeDisplay.trim() ? <Field label="Call Type" value={csr.callTypeDisplay} flex={1} /> : null}
                {csr.serviceBasis.trim() ? <Field label="Service Basis" value={csr.serviceBasis} flex={1} /> : null}
                {csr.systemDownDisplay.trim() ? <Field label="System Status" value={csr.systemDownDisplay} flex={1} /> : null}
              </View>
            ) : null}
          </View>

          {/* ── Problem Reported ───────────────────────── */}
          <View style={{ marginBottom: sectionGap }} wrap={false}>
            <Text style={sectionTitleStyle}>Problem Reported</Text>
            <View
              style={{
                backgroundColor: C.paper,
                borderWidth: 2,
                borderColor: C.accent,
                borderRadius: 4,
                padding: heroPad,
              }}
            >
              <Text style={narrativeStyle}>{glyphRuns(csr.narratives.problemReported.trim() ? csr.narratives.problemReported : ' ', fillableFont)}</Text>
            </View>
          </View>

          {/* ── Equipment Details ──────────────────────── */}
          <View style={{ marginBottom: sectionGap }}>
            <Text style={sectionTitleStyle}>Equipment Details</Text>
            <View style={{ flexDirection: 'row', gap: gridGap }}>
              <Field label="Equipment Type" value={csr.equipment.type} flex={1} />
              <Field label="Make" value={csr.equipment.make} flex={1} />
              <Field label="Model" value={csr.equipment.model} flex={1} />
            </View>
            <View style={{ flexDirection: 'row', gap: gridGap, marginTop: gridGap }}>
              <Field label="Engine No." value={csr.equipment.engineNo} flex={1} />
              <Field label="Capacity" value={csr.equipment.capacity} flex={1} />
              <Field label="Serial No." value={csr.equipment.serialNo} flex={1} />
            </View>
            <View style={{ flexDirection: 'row', gap: gridGap, marginTop: gridGap }}>
              <Field label="Equipment Location" value={locationSite} flex={1} />
            </View>

            {showReadings ? (
              <View
                wrap={false}
                style={{
                  flexDirection: 'row',
                  marginTop: 4,
                  backgroundColor: C.tint,
                  borderWidth: 1,
                  borderColor: C.borderStrong,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                {readings}
              </View>
            ) : null}
          </View>

          {/* ── Service Rendered ───────────────────────── */}
          <View style={{ marginBottom: sectionGap }}>
            <Text style={sectionTitleStyle}>Service Rendered</Text>
            <View
              style={{
                backgroundColor: C.paper,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 4,
                paddingVertical: blockPadV,
                paddingHorizontal: blockPadV + 2,
                minHeight: tight ? 20 : compact ? 26 : 32,
              }}
            >
              <Text style={narrativeStyle}>{glyphRuns(csr.narratives.serviceRendered.trim() ? csr.narratives.serviceRendered : ' ', fillableFont)}</Text>
            </View>

            {showDefects ? (
              <View style={{ marginTop: 6 }}>
                <Text style={fieldLabelStyle}>Defects Found</Text>
                <View
                  style={{
                    backgroundColor: C.paper,
                    borderWidth: 2,
                    borderColor: C.accent,
                    borderRadius: 4,
                    padding: heroPad,
                  }}
                >
                  {csr.narratives.defectsFound.trim() ? (
                    <Text style={narrativeStyle}>{glyphRuns(csr.narratives.defectsFound, fillableFont)}</Text>
                  ) : (
                    csr.narratives.defectsList.map((defect, index) => (
                      <View
                        key={index}
                        style={{ flexDirection: 'row', gap: 4, marginTop: index === 0 ? 0 : 3 }}
                      >
                        <Text style={{ ...narrativeStyle, color: C.accent }}>-</Text>
                        <Text style={{ ...narrativeStyle, flex: 1 }}>{glyphRuns(defect, fillableFont)}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            ) : null}

            {showRemarks ? (
              <View style={{ marginTop: 6 }}>
                <Text style={fieldLabelStyle}>Technician Remarks</Text>
                <View
                  style={{
                    backgroundColor: C.remarks,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 4,
                    paddingVertical: blockPadV,
                    paddingHorizontal: blockPadV + 2,
                  }}
                >
                  <Text style={narrativeStyle}>{glyphRuns(csr.narratives.engineerRemarks, fillableFont)}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* ── Materials Used ─────────────────────────── */}
          {csr.materials.length > 0 ? (
            <View style={{ marginBottom: sectionGap }} wrap={false}>
              <Text style={sectionTitleStyle}>Materials Used</Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                {Array.from({ length: materialRowCount }, (_, rowIdx) => (
                  <View
                    key={rowIdx}
                    style={{
                      flexDirection: 'row',
                      borderBottomWidth: rowIdx === materialRowCount - 1 ? 0 : 1,
                      borderBottomColor: C.rowRule,
                    }}
                  >
                    {materialColumns.map((column, columnIdx) => {
                      const item = column[rowIdx]
                      if (!item) return <View key={`pad-${columnIdx}`} style={{ flex: 1, borderLeftWidth: columnIdx === 0 ? 0 : 1, borderLeftColor: C.border }} />
                      return (
                        <View key={`${columnIdx}-${rowIdx}`} style={{ flex: 1, borderLeftWidth: columnIdx === 0 ? 0 : 1, borderLeftColor: C.border }}>
                          {renderMaterialCell(item, rowIdx)}
                        </View>
                      )
                    })}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── Status ─────────────────────────────────── */}
          <View style={{ marginBottom: sectionGap }} wrap={false}>
            <Text style={sectionTitleStyle}>Status</Text>
            <View style={{ flexDirection: 'row', gap: compact ? 3.5 : 4 }}>
              {STATUS_OPTIONS.map((option) => {
                const active =
                  csr.status === option || (option === 'Complete' && csr.status === 'Working solution provided')
                return (
                  <View
                    key={option}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: tight ? 16 : 22,
                      paddingVertical: tight ? 3.5 : 4.5,
                      paddingHorizontal: 4,
                      backgroundColor: active ? C.tint : C.paper,
                      borderWidth: active ? 1.5 : 1,
                      borderColor: active ? C.accent : C.borderSteel,
                      borderRadius: 3,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 700,
                        fontSize: 7,
                        color: active ? C.header : C.muted,
                        textTransform: 'uppercase',
                        textAlign: 'center',
                      }}
                    >
                      {option}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>

          {/* ── Acknowledgement ────────────────────────── */}
          <View style={{ marginBottom: sectionGap }} wrap={false}>
            <Text style={sectionTitleStyle}>Acknowledgement</Text>
            <View style={{ padding: compact ? 3.5 : 4.5 }}>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.borderStrong,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.borderStrong }}>
                  <View
                    style={{
                      width: '40%',
                      paddingTop: tight ? 2.5 : 3.5,
                      paddingBottom: tight ? 14 : compact ? 18 : 22,
                      paddingHorizontal: 5.5,
                      borderRightWidth: 1,
                      borderRightColor: C.borderStrong,
                    }}
                  >
                    <Text style={ackLabelStyle}>Recipient Name</Text>
                    <Text style={{ ...fieldValueStyle, marginTop: 5 }}>
                      {glyphRuns(dash(csr.signatories.clientRepresentative.printedName), fillableFont)}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: '60%',
                      paddingTop: tight ? 2.5 : 3.5,
                      paddingBottom: tight ? 14 : compact ? 18 : 22,
                      paddingHorizontal: 5.5,
                    }}
                  >
                    <Text style={ackLabelStyle}>Comment</Text>
                    {csr.narratives.customerFeedback.trim() ? (
                      <Text style={{ ...narrativeStyle, marginTop: 5, fontSize: narrativeSize - 1 }}>
                        {glyphRuns(csr.narratives.customerFeedback, fillableFont)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', minHeight: tight ? 45 : compact ? 55 : 65 }}>
                  <View
                    style={{
                      width: '40%',
                      paddingTop: tight ? 2.5 : 3.5,
                      paddingHorizontal: 5.5,
                      borderRightWidth: 2,
                      borderRightColor: C.accent,
                    }}
                  >
                    <Text style={ackLabelStyle}>Recipient Signature</Text>
                    <View style={{ marginTop: 4 }}>
                      <SignatureStage
                        signatureUrl={csr.signatories.clientRepresentative.signatureUrl}
                        height={tight ? 28 : 40}
                        lineColor={C.accent}
                      />
                    </View>
                  </View>
                  <View
                    style={{
                      width: '30%',
                      paddingTop: tight ? 2.5 : 3.5,
                      paddingHorizontal: 5.5,
                      borderRightWidth: 2,
                      borderRightColor: C.accent,
                    }}
                  >
                    <Text style={ackLabelStyle}>Technician Signature</Text>
                    <View style={{ marginTop: 4 }}>
                      <SignatureStage
                        signatureUrl={csr.signatories.serviceEngineer.signatureUrl}
                        height={tight ? 28 : 40}
                        lineColor={C.accent}
                      />
                    </View>
                  </View>
                  <View
                    style={{
                      width: '30%',
                      paddingTop: tight ? 2.5 : 3.5,
                      paddingHorizontal: 5.5,
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={ackLabelStyle}>Technician Name</Text>
                    <Text style={{ ...fieldValueStyle, marginTop: 4, textTransform: 'uppercase' }}>
                      {glyphRuns(dash(csr.signatories.serviceEngineer.printedName), fillableFont)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
