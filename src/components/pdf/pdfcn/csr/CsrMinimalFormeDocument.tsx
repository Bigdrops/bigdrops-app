import React from 'react'
import type { PdfcnDocumentEnvelope } from '@/domain/pdf/resolver'
import type { CanonicalPreparedCsr, CsrMaterialItem } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import { Document, Page, View, Text, Fixed, Svg } from '../primitives'
import { getCsrRenderOptions, resolveInkFonts } from './csrFormeKit'
import {
  BrandLogo,
  SignatureStage,
  READING_FIELDS,
  dash,
  formatQuantity,
  getAdaptiveMaterialColumns,
} from './csrPdfcnUtils'
import { glyphRuns } from '@/components/pdf/forme/glyphs'

/**
 * Forme port of the Minimal CSR template: black masthead band with the
 * document-number table, dense black section bands, 1px #111827 field boxes,
 * a single bordered readings strip, the status checkbox row, the black
 * acknowledgement container and a full-width black footer band.
 */

const INK = '#111827'
const GRAY = '#6b7280'
const LIGHT_RULE = '#e5e7eb'
const PANEL_BG = '#f3f4f6'
const WHITE = '#ffffff'
const ON_BLACK = '#d1d5db'

/** Matches CSR_STATUS_OPTIONS_PDF order; active only on an exact status match. */
const STATUS_OPTIONS = [
  'Complete',
  'Incomplete',
  'Pending for spares',
  'Under observation',
  'Working solution provided',
] as const

const hasText = (value?: string | null): boolean => Boolean(value && value.trim().length > 0)
const equipVal = (value?: string | null): string => (hasText(value) ? (value as string).trim() : '—')

export const CsrMinimalFormeDocument: React.FC<{
  envelope: PdfcnDocumentEnvelope<CanonicalPreparedCsr>
}> = ({ envelope }) => {
  const csr = envelope.data
  const opts = getCsrRenderOptions(envelope)
  const { ink, fillableFont, bodyFont } = resolveInkFonts(opts.designPreset)
  const tight = opts.density === 'tight'
  const compact = opts.density !== 'comfortable'

  // Density ladder: comfortable = source defaults, compact/tight scale down.
  const pad = tight ? 10 : compact ? 14 : 20
  const sectionGap = tight ? 5 : compact ? 6 : 7
  const titlePadV = tight ? 3 : compact ? 4 : 4
  const bodyPad = tight ? 4 : compact ? 5 : 5
  const labelSize = tight ? 5.4 : compact ? 5.8 : 6.2
  const valueSize = tight ? 7 : compact ? 7.5 : 8
  const blockFont = tight ? 7 : compact ? 7.5 : 8
  const readingsValueSize = tight ? 8.5 : compact ? 9.5 : 10.5
  const minBlockH = tight ? 22 : compact ? 26 : 32
  const ackMinH = tight ? 52 : compact ? 60 : 72
  const matFont = tight ? 6.6 : compact ? 7.1 : 7.8
  const matRowPadV = tight ? 1.8 : compact ? 2.6 : 3.4

  const provider = csr.serviceProvider
  const clientRep = csr.signatories.clientRepresentative
  const technician = csr.signatories.serviceEngineer

  const labelStyle = {
    fontFamily: 'Inter',
    fontWeight: 700 as const,
    fontSize: labelSize,
    color: GRAY,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  }
  const valueStyle = {
    fontFamily: fillableFont,
    fontWeight: 700 as const,
    fontSize: valueSize,
    color: ink,
    lineHeight: 1.3,
  }
  const ackNameStyle = {
    fontFamily: fillableFont,
    fontWeight: 700 as const,
    fontSize: valueSize,
    color: ink,
    textTransform: 'uppercase' as const,
  }
  const bodyTextStyle = {
    fontFamily: fillableFont,
    fontWeight: 400 as const,
    fontSize: blockFont,
    color: ink,
    lineHeight: 1.35,
  }

  const sectionBox = { borderWidth: 1, borderColor: INK, marginBottom: sectionGap, backgroundColor: WHITE }
  const fieldBox = {
    borderWidth: 1,
    borderColor: INK,
    backgroundColor: WHITE,
    paddingVertical: tight ? 3.5 : 5,
    paddingHorizontal: 6,
    flex: 1,
  }

  // Section band with the dense white-on-black Minimal heading treatment.
  const sectionBand = (title: string) => (
    <View style={{ backgroundColor: INK, paddingVertical: titlePadV, paddingHorizontal: 8 }}>
      <Text
        style={{
          fontFamily: 'Inter',
          fontWeight: 700,
          fontSize: 6.8,
          color: WHITE,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        }}
      >
        {title}
      </Text>
    </View>
  )

  // Small uppercase gray caption above a 1px-bordered narrative box.
  const fieldLabel = (text: string) => (
    <Text style={{ ...labelStyle, marginBottom: 2 }}>{text}</Text>
  )

  // ── Header masthead: logo + white company block left, SERVICE REPORT table right. ──
  const headerRows: Array<[string, string]> = [
    ['CSR Number', csr.csrNumber],
    ['Report Date', csr.date],
  ]
  if (hasText(csr.callTypeDisplay)) headerRows.push(['Call Type', csr.callTypeDisplay])
  if (hasText(csr.serviceBasis)) headerRows.push(['Service Basis', csr.serviceBasis])
  if (hasText(csr.systemDownDisplay)) headerRows.push(['System Status', csr.systemDownDisplay])

  const renderHeader = () => (
    <View
      style={{
        backgroundColor: INK,
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: tight ? 8 : 10,
        paddingBottom: tight ? 8 : 10,
        paddingHorizontal: pad,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 14 }}>
        {provider.logoUrl ? (
          <View style={{ backgroundColor: WHITE, padding: 3, marginRight: 12 }}>
            {/* Width-led sizing keeps every tenant logo's aspect ratio on the black band. */}
            <BrandLogo logoUrl={provider.logoUrl} width={80} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          {hasText(provider.name) ? (
            <Text
              style={{
                fontFamily: bodyFont,
                fontWeight: 700,
                fontSize: tight ? 13 : 15,
                color: WHITE,
                textTransform: 'uppercase',
                letterSpacing: -0.2,
                lineHeight: 1.15,
              }}
            >
              {glyphRuns(provider.name.trim(), bodyFont)}
            </Text>
          ) : null}
          {hasText(provider.subtitle) ? (
            <Text
              style={{
                fontFamily: bodyFont,
                fontWeight: 700,
                fontSize: 6.8,
                color: ON_BLACK,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginTop: 2,
              }}
            >
              {glyphRuns(provider.subtitle.trim(), bodyFont)}
            </Text>
          ) : null}
          {hasText(provider.address) ? (
            <Text style={{ fontFamily: bodyFont, fontSize: 6.8, color: ON_BLACK, marginTop: 2, lineHeight: 1.3 }}>
              {glyphRuns(provider.address.trim(), bodyFont)}
            </Text>
          ) : null}
          {hasText(provider.contact) ? (
            <Text style={{ fontFamily: bodyFont, fontSize: 6.4, color: '#9ca3af', marginTop: 1 }}>
              {glyphRuns(provider.contact.trim(), bodyFont)}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ width: 228 }}>
        <Text
          style={{
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 7.2,
            color: WHITE,
            textTransform: 'uppercase',
            letterSpacing: 2.4,
            textAlign: 'right',
            marginBottom: 4,
          }}
        >
          Service Report
        </Text>
        {headerRows.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', marginBottom: 2 }}>
            <View
              style={{
                width: 86,
                justifyContent: 'center',
                paddingVertical: 2.5,
                paddingHorizontal: 4,
                borderRightWidth: 0,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 700,
                  fontSize: 5.4,
                  color: WHITE,
                  textTransform: 'uppercase',
                  letterSpacing: 0.3,
                }}
              >
                {label}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: WHITE,
                borderWidth: 1,
                borderColor: INK,
                justifyContent: 'center',
                paddingVertical: 2.5,
                paddingHorizontal: 5,
              }}
            >
              <Text style={{ ...valueStyle, fontSize: tight ? 6.8 : 7.6 }}>
                {glyphRuns(dash(value), fillableFont)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )

  // ── Client Details: identity boxes + service window row. ──
  const renderClientSection = () => {
    const w = csr.serviceWindow
    const start = [w.startDate, w.startTime].filter(Boolean).join(' // ').trim() || '—'
    const end = [w.endDate, w.endTime].filter(Boolean).join(' // ').trim() || '—'
    const locationSite = [csr.location.site, csr.location.subLocation].filter((s) => hasText(s)).join(', ')

    return (
      <View style={sectionBox} wrap={false}>
        {sectionBand('Client Details')}
        <View style={{ padding: bodyPad }}>
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
            <View style={{ ...fieldBox, flex: 1.5 }}>
              {fieldLabel('Client Name')}
              <Text style={valueStyle}>{glyphRuns(dash(csr.client.name), fillableFont)}</Text>
            </View>
            <View style={{ ...fieldBox, flex: 2 }}>
              {fieldLabel('Client Address')}
              <Text style={valueStyle}>{glyphRuns(dash(csr.client.address), fillableFont)}</Text>
            </View>
            {hasText(csr.client.accountRef) ? (
              <View style={fieldBox}>
                {fieldLabel('Account Ref')}
                <Text style={valueStyle}>{glyphRuns(csr.client.accountRef as string, fillableFont)}</Text>
              </View>
            ) : null}
            {hasText(csr.client.poNumber) ? (
              <View style={fieldBox}>
                {fieldLabel('PO Number')}
                <Text style={valueStyle}>{glyphRuns(csr.client.poNumber as string, fillableFont)}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <View style={fieldBox}>
              {fieldLabel('Site')}
              <Text style={valueStyle}>{glyphRuns(equipVal(locationSite), fillableFont)}</Text>
            </View>
            <View style={fieldBox}>
              {fieldLabel('Service Start')}
              <Text style={valueStyle}>{glyphRuns(start, fillableFont)}</Text>
            </View>
            <View style={fieldBox}>
              {fieldLabel('Service End')}
              <Text style={valueStyle}>{glyphRuns(end, fillableFont)}</Text>
            </View>
            <View style={fieldBox}>
              {fieldLabel('Operating Hours')}
              <Text style={valueStyle}>{glyphRuns(hasText(w.operatingHours) ? w.operatingHours.trim() : '—', fillableFont)}</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  // ── Equipment & Telemetry: seven bordered boxes, then the readings strip. ──
  const showReadings =
    opts.showOperationalReadings &&
    READING_FIELDS.some((field) => hasText(csr.readings[field.key].value))

  const renderEquipmentSection = () => {
    const e = csr.equipment
    const locationSite = [csr.location.site, csr.location.subLocation].filter((s) => hasText(s)).join(', ')
    const equipFields = [
      { label: 'Equipment Type', value: e.type },
      { label: 'Make', value: e.make },
      { label: 'Model', value: e.model },
      { label: 'Serial', value: e.serialNo },
      { label: 'Engine', value: e.engineNo },
      { label: 'Capacity', value: e.capacity },
      { label: 'Location', value: locationSite },
    ]

    return (
      <View style={sectionBox} wrap={false}>
        {sectionBand('Equipment & Telemetry')}
        <View style={{ padding: bodyPad }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {equipFields.slice(0, 3).map((field) => (
              <View key={field.label} style={fieldBox}>
                {fieldLabel(field.label)}
                <Text style={{ ...valueStyle, fontSize: tight ? 6.4 : compact ? 6.8 : 7.2 }}>
                  {glyphRuns(equipVal(field.value), fillableFont)}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
            {equipFields.slice(3, 6).map((field) => (
              <View key={field.label} style={fieldBox}>
                {fieldLabel(field.label)}
                <Text style={{ ...valueStyle, fontSize: tight ? 6.4 : compact ? 6.8 : 7.2 }}>
                  {glyphRuns(equipVal(field.value), fillableFont)}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
            <View style={fieldBox}>
              {fieldLabel(equipFields[6].label)}
              <Text style={{ ...valueStyle, fontSize: tight ? 6.4 : compact ? 6.8 : 7.2 }}>
                {glyphRuns(equipVal(equipFields[6].value), fillableFont)}
              </Text>
            </View>
          </View>

          {showReadings ? (
            <View
              style={{
                flexDirection: 'row',
                borderWidth: 1,
                borderColor: INK,
                backgroundColor: WHITE,
                marginTop: 4,
              }}
            >
              {READING_FIELDS.map((field, idx) => {
                const reading = csr.readings[field.key]
                const hasValue = hasText(reading.value)
                return (
                  <View
                    key={field.key}
                    style={{
                      flex: 1,
                      paddingVertical: tight ? 3 : 4.5,
                      paddingHorizontal: 5,
                      borderLeftWidth: idx === 0 ? 0 : 1,
                      borderLeftColor: INK,
                    }}
                  >
                    <Text style={{ ...labelStyle, fontSize: tight ? 4.8 : 5.2 }}>{field.label}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 }}>
                      <Text style={{ ...valueStyle, fontSize: readingsValueSize }}>
                        {glyphRuns(hasValue ? (reading.value as string) : '—', fillableFont)}
                      </Text>
                      {hasValue && hasText(reading.unit) ? (
                        <Text
                          style={{
                            fontFamily: 'Inter',
                            fontWeight: 700,
                            fontSize: 5.6,
                            color: GRAY,
                            marginLeft: 2,
                            paddingBottom: 1,
                          }}
                        >
                          {glyphRuns((reading.unit as string).trim(), 'Inter')}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )
              })}
            </View>
          ) : null}
        </View>
      </View>
    )
  }

  // ── Technical Narrative: problem/defects row, service rendered, remarks. ──
  const narrativeBox = {
    borderWidth: 1,
    borderColor: INK,
    backgroundColor: WHITE,
    padding: tight ? 5 : 6,
    minHeight: minBlockH,
  }

  const renderNarrativeSection = () => {
    const n = csr.narratives
    const hasDefects = hasText(n.defectsFound) || n.defectsList.length > 0
    const hasRemarks = hasText(n.engineerRemarks)

    return (
      <View style={sectionBox}>
        {sectionBand('Technical Narrative')}
        <View style={{ padding: bodyPad }}>
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
            <View style={{ flex: 1 }}>
              {fieldLabel('Problem Reported')}
              <View style={narrativeBox}>
                <Text style={bodyTextStyle}>{glyphRuns(hasText(n.problemReported) ? n.problemReported.trim() : '—', fillableFont)}</Text>
              </View>
            </View>
            {hasDefects ? (
              <View style={{ flex: 1 }}>
                {fieldLabel('Defects Found')}
                <View style={narrativeBox}>
                  {hasText(n.defectsFound) ? (
                    <Text style={bodyTextStyle}>{glyphRuns(n.defectsFound.trim(), fillableFont)}</Text>
                  ) : null}
                  {!hasText(n.defectsFound) && n.defectsList.map((defect, idx) =>
                    hasText(defect) ? (
                      <Text key={idx} style={bodyTextStyle}>
                        {glyphRuns(`• ${defect.trim()}`, fillableFont)}
                      </Text>
                    ) : null,
                  )}
                </View>
              </View>
            ) : null}
          </View>
          <View style={hasRemarks ? { marginBottom: 4 } : undefined}>
            {fieldLabel('Service Rendered')}
            <View style={narrativeBox}>
              <Text style={bodyTextStyle}>{glyphRuns(hasText(n.serviceRendered) ? n.serviceRendered.trim() : '—', fillableFont)}</Text>
            </View>
          </View>
          {hasRemarks ? (
            <View>
              {fieldLabel('Engineer Remarks')}
              <View style={narrativeBox}>
                <Text style={bodyTextStyle}>{glyphRuns(n.engineerRemarks.trim(), fillableFont)}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    )
  }

  // ── Materials Used: 1px bordered box, adaptive column blocks of rows. ──
  const renderMaterialsSection = () => {
    const materials = csr.materials
    if (materials.length === 0) return null

    // ≤5 portrait items stay a single list; beyond that the adaptive
    // partitioner picks 2–4 sequential/interleaved columns.
    const adaptive = getAdaptiveMaterialColumns(materials, 'portrait')
    const groups = adaptive.columns
    const maxRows = Math.max(...groups.map((group) => group.length))

    const renderMaterialRow = (item: CsrMaterialItem | undefined, key: string, isLast: boolean) => (
      <View
        key={key}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: matRowPadV,
          paddingHorizontal: 6,
          borderBottomWidth: isLast ? 0 : 0.5,
          borderBottomColor: LIGHT_RULE,
        }}
      >
        {item ? (
          <>
            <Text
              style={{
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: matFont,
                color: INK,
                width: 18,
              }}
            >
              {glyphRuns(item.no, 'Inter')}
            </Text>
            <Text style={{ fontFamily: bodyFont, fontSize: matFont, color: INK, flex: 1 }}>
              {glyphRuns(item.description, bodyFont)}
            </Text>
            <Text style={{ color: '#9ca3af', fontFamily: 'Inter', marginHorizontal: 3 }}>|</Text>
            <Text style={{ fontFamily: fillableFont, fontWeight: 700, fontSize: matFont, color: ink }}>
              {glyphRuns(formatQuantity(item), fillableFont)}
            </Text>
          </>
        ) : (
          <Text style={{ fontFamily: bodyFont, fontSize: matFont, color: INK }}> </Text>
        )}
      </View>
    )

    return (
      <View style={sectionBox}>
        {sectionBand('Materials Used')}
        <View style={{ padding: bodyPad }}>
          <View style={{ borderWidth: 1, borderColor: INK, backgroundColor: WHITE }}>
            <View style={{ flexDirection: 'row' }}>
              {groups.map((group, g) => (
                <View
                  key={`col-${g}`}
                  style={{
                    flex: 1,
                    borderLeftWidth: g === 0 ? 0 : 1,
                    borderLeftColor: INK,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: PANEL_BG,
                      borderBottomWidth: 1,
                      borderBottomColor: INK,
                      paddingVertical: tight ? 2.5 : 3.5,
                      paddingHorizontal: 6,
                    }}
                  >
                    <Text style={{ ...labelStyle, flex: 1, color: '#374151' }}>Item</Text>
                    <Text style={{ ...labelStyle, color: '#374151' }}>Qty</Text>
                  </View>
                  {Array.from({ length: maxRows }, (_, rowIdx) =>
                    renderMaterialRow(
                      group[rowIdx],
                      `m-${g}-${rowIdx}`,
                      rowIdx === maxRows - 1,
                    ),
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    )
  }

  // ── Status: horizontal row of five bordered checkbox cells. ──
  const renderStatusSection = () => (
    <View style={sectionBox} wrap={false}>
      {sectionBand('Status')}
      <View style={{ padding: bodyPad }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {STATUS_OPTIONS.map((option) => {
            const active = csr.status === option
            return (
              <View
                key={option}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: INK,
                  backgroundColor: WHITE,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  paddingVertical: tight ? 4 : 6,
                  paddingHorizontal: 3,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderWidth: 1.2,
                    borderColor: INK,
                    backgroundColor: active ? INK : WHITE,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {active ? (
                    <Svg width={7} height={6} viewBox="0 0 10 8" content='<path d="M1.4 4.4 L3.9 6.8 L8.6 1.4" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>' />
                  ) : null}
                </View>
                <Text
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 700,
                    fontSize: 5.8,
                    color: INK,
                    textTransform: 'uppercase',
                    letterSpacing: 0.2,
                    textAlign: 'center',
                    flexShrink: 1,
                  }}
                >
                  {option}
                </Text>
              </View>
            )
          })}
        </View>
      </View>
    </View>
  )

  // ── Acknowledgement: 50/50 client/technician, each split signature + name. ──
  const ackLabelStyle = { ...labelStyle, marginBottom: 2 }
  const sigStageHeight = tight ? 34 : compact ? 40 : 46

  const renderAcknowledgementSection = () => (
    <View style={{ ...sectionBox, marginBottom: 0 }} wrap={false}>
      {sectionBand('Acknowledgement')}
      <View style={{ borderTopWidth: 0 }}>
        {/* Top row: recipient identity + date rule | designation / comments. */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: INK }}>
          <View style={{ width: '50%', borderRightWidth: 1, borderRightColor: INK, padding: bodyPad }}>
            <Text style={ackLabelStyle}>Recipient Name</Text>
            <View
              style={{
                borderBottomWidth: 0.8,
                borderBottomColor: INK,
                paddingBottom: 2,
                minHeight: 14,
                justifyContent: 'flex-end',
              }}
            >
              <Text style={ackNameStyle}>{glyphRuns((clientRep.printedName ?? '').trim().toUpperCase(), fillableFont)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
              <Text style={{ ...ackLabelStyle, width: 26, marginBottom: 0 }}>Date</Text>
              <View
                style={{
                  flex: 1,
                  borderBottomWidth: 0.8,
                  borderBottomColor: INK,
                  paddingBottom: 2,
                  minHeight: 12,
                  justifyContent: 'flex-end',
                }}
              >
                {hasText(clientRep.signingDate) ? (
                  <Text style={ackNameStyle}>{glyphRuns((clientRep.signingDate as string).trim(), fillableFont)}</Text>
                ) : null}
              </View>
            </View>
          </View>
          <View style={{ width: '50%', padding: bodyPad }}>
            <Text style={ackLabelStyle}>Designation / Comments</Text>
            <Text style={{ ...bodyTextStyle, minHeight: 34 }}>
              {glyphRuns(hasText(csr.narratives.customerFeedback) ? csr.narratives.customerFeedback.trim() : '', fillableFont)}
            </Text>
          </View>
        </View>

        {/* Bottom row: client signature | technician signature + technician name. */}
        <View style={{ flexDirection: 'row', minHeight: ackMinH }}>
          <View style={{ width: '50%', borderRightWidth: 1, borderRightColor: INK }}>
            <Text style={{ ...ackLabelStyle, paddingHorizontal: bodyPad, paddingTop: bodyPad }}>Client Signature</Text>
            <View style={{ paddingHorizontal: bodyPad, paddingBottom: 4 }}>
              <SignatureStage signatureUrl={clientRep.signatureUrl} height={sigStageHeight} lineColor={INK} />
            </View>
          </View>
          <View style={{ width: '25%', borderRightWidth: 1, borderRightColor: INK }}>
            <Text style={{ ...ackLabelStyle, paddingHorizontal: bodyPad, paddingTop: bodyPad }}>Technician Signature</Text>
            <View style={{ paddingHorizontal: bodyPad, paddingBottom: 4 }}>
              <SignatureStage signatureUrl={technician.signatureUrl} height={sigStageHeight} lineColor={INK} />
            </View>
          </View>
          <View style={{ width: '25%' }}>
            <Text style={{ ...ackLabelStyle, paddingHorizontal: bodyPad, paddingTop: bodyPad }}>Technician Name</Text>
            <View style={{ flex: 1, justifyContent: 'flex-end', padding: bodyPad }}>
              <View style={{ borderBottomWidth: 0.8, borderBottomColor: INK, paddingBottom: 2 }}>
                <Text style={ackNameStyle}>{glyphRuns((technician.printedName ?? '').trim().toUpperCase(), fillableFont)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  )

  // ── Fixed footer: full-width black band, document type left, company/CSR right. ──
  const footerRight = hasText(provider.name) ? provider.name.trim() : csr.csrNumber
  const renderFooter = () => (
    <Fixed
      position="footer"
      style={{
        backgroundColor: INK,
        paddingVertical: 5,
        paddingHorizontal: pad,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text
        style={{
          fontFamily: 'Inter',
          fontWeight: 700,
          fontSize: 6.4,
          color: WHITE,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        }}
      >
        Service Report
      </Text>
      <Text
        style={{
          fontFamily: 'Inter',
          fontWeight: 700,
          fontSize: 6.4,
          color: WHITE,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
        }}
      >
        {glyphRuns(footerRight.toUpperCase(), bodyFont)}
      </Text>
    </Fixed>
  )

  return (
    <Document
      title={`${csr.csrNumber || 'CSR'} — Service Report`}
      author={provider.name || undefined}
      lang="en-NG"
      style={{ fontFamily: 'Inter', color: INK }}
    >
      <Page
        size="A4"
        margin={0}
        style={{ backgroundColor: WHITE, fontFamily: 'Inter', fontSize: 7.8, color: INK }}
      >
        {renderHeader()}
        {renderFooter()}
        <View style={{ paddingHorizontal: pad, paddingTop: tight ? 8 : 10, paddingBottom: 30 }}>
          {renderClientSection()}
          {renderEquipmentSection()}
          {renderNarrativeSection()}
          {renderMaterialsSection()}
          {renderStatusSection()}
          {renderAcknowledgementSection()}
        </View>
      </Page>
    </Document>
  )
}
