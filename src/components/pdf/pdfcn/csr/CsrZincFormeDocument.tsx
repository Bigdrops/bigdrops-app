import React from 'react'
import type { PdfcnDocumentEnvelope } from '@/domain/pdf/resolver'
import type { CanonicalPreparedCsr } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import { Document, Page, View, Text, Fixed } from '../primitives'
import { glyphRuns } from '../../forme/glyphs'
import { safeText } from '../../core/safeText'
import { getCsrRenderOptions, resolveInkFonts } from './csrFormeKit'
import {
  BrandLogo,
  READING_FIELDS,
  SignatureStage,
  dash,
  formatQuantity,
  getAdaptiveMaterialColumns,
} from './csrPdfcnUtils'

const C = {
  black: '#09090b',
  muted: '#71717a',
  soft: '#a1a1aa',
  border: '#e4e4e7',
  wash: '#f4f4f5',
  zinc: '#3f3f46',
} as const

const MONO_LIFECYCLE = ['Arrival', 'Diagnostic', 'Repair', 'Observation', 'Handover'] as const

/** Same mapping as resolveZincLifecycleStages in the retired preview layoutModel. */
function resolveZincLifecycleStages(status: string) {
  const normalized = safeText(status).toLowerCase()
  const activeLabel = (() => {
    if (normalized === 'complete') return 'Handover'
    if (normalized === 'working solution provided' || normalized === 'under observation') return 'Observation'
    if (normalized === 'pending for spares') return 'Repair'
    if (normalized === 'incomplete') return 'Diagnostic'
    return 'Arrival'
  })()
  return MONO_LIFECYCLE.map((label) => ({ label, active: label === activeLabel }))
}

interface ZincTheme {
  ink: string
  fillableFont: string
  bodyFont: string
  density: 'comfortable' | 'compact' | 'tight'
  compact: boolean
  tight: boolean
  sectionMB: number
  blockPadV: number
  blockPadH: number
  blockMinH: number
  fieldValueSize: number
  blockTextSize: number
  blockTextLH: number
  sectionTitleSize: number
  sectionTitleMB: number
  fieldMB: number
  fieldPadR: number
  pagePad: number
}

function buildTheme(opts: { density: 'comfortable' | 'compact' | 'tight' }, ink: string, fillableFont: string, bodyFont: string): ZincTheme {
  const density = opts.density
  const compact = density !== 'comfortable'
  const tight = density === 'tight'
  return {
    ink,
    fillableFont,
    bodyFont,
    density,
    compact,
    tight,
    sectionMB: tight ? 5 : compact ? 6 : 8,
    blockPadV: tight ? 4 : compact ? 5 : 6,
    blockPadH: tight ? 6 : compact ? 6.5 : 7,
    blockMinH: tight ? 28 : compact ? 30 : 34,
    fieldValueSize: tight ? 7.8 : compact ? 8.2 : 8.5,
    blockTextSize: tight ? 7 : compact ? 7.3 : 7.7,
    blockTextLH: tight ? 1.22 : 1.3,
    sectionTitleSize: tight ? 6.8 : 7.1,
    sectionTitleMB: compact ? 4 : 5,
    fieldMB: compact ? 4 : 5,
    fieldPadR: compact ? 5 : 6,
    pagePad: tight ? 10 : 12,
  }
}

const SectionTitle: React.FC<{ t: ZincTheme; title: string }> = ({ t, title }) => (
  <Text
    style={{
      fontFamily: t.bodyFont,
      fontWeight: 700,
      fontSize: t.sectionTitleSize,
      color: C.black,
      borderBottomWidth: 1.5,
      borderBottomColor: C.black,
      paddingBottom: 3,
      marginBottom: t.sectionTitleMB,
    }}
  >
    {title}
  </Text>
)

const Section: React.FC<{ t: ZincTheme; title: string; children: React.ReactNode }> = ({ t, title, children }) => (
  <View style={{ marginBottom: t.sectionMB }}>
    <SectionTitle t={t} title={title} />
    {children}
  </View>
)

const Field: React.FC<{ t: ZincTheme; label: string; value: string; width?: string }> = ({ t, label, value, width }) => {
  const v = safeText(value)
  if (!v) return null
  return (
    <View style={{ width: width ?? '33.33%', paddingRight: t.fieldPadR, marginBottom: t.fieldMB }}>
      <Text
        style={{
          fontFamily: t.bodyFont,
          fontWeight: 700,
          fontSize: 6.5,
          color: C.muted,
          marginBottom: 3,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: t.fillableFont,
          fontWeight: 700,
          fontSize: t.fieldValueSize,
          color: t.ink,
          lineHeight: 1.15,
        }}
      >
        {glyphRuns(v, t.fillableFont)}
      </Text>
    </View>
  )
}

const BlockCard: React.FC<{ t: ZincTheme; children: React.ReactNode; wash?: boolean }> = ({ t, children, wash }) => (
  <View
    style={{
      paddingVertical: t.blockPadV,
      paddingHorizontal: t.blockPadH,
      backgroundColor: wash ? C.wash : '#ffffff',
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 4,
      minHeight: t.blockMinH,
    }}
  >
    {children}
  </View>
)

const BlockLabel: React.FC<{ t: ZincTheme; label: string }> = ({ t, label }) => (
  <Text
    style={{
      fontFamily: t.bodyFont,
      fontWeight: 700,
      fontSize: 6.5,
      color: C.muted,
      marginBottom: 3,
    }}
  >
    {label}
  </Text>
)

const BlockValue: React.FC<{ t: ZincTheme; value: string }> = ({ t, value }) => (
  <Text
    style={{
      fontFamily: t.fillableFont,
      fontWeight: 400,
      fontSize: t.blockTextSize,
      color: t.ink,
      lineHeight: t.blockTextLH,
    }}
  >
    {glyphRuns(safeText(value), t.fillableFont)}
  </Text>
)

const AckLabel: React.FC<{ t: ZincTheme; label: string }> = ({ t, label }) => (
  <Text
    style={{
      fontFamily: t.bodyFont,
      fontWeight: 700,
      fontSize: t.tight ? 5.6 : 6.1,
      color: C.muted,
    }}
  >
    {label}
  </Text>
)

export const CsrZincFormeDocument: React.FC<{ envelope: PdfcnDocumentEnvelope<CanonicalPreparedCsr> }> = ({ envelope }) => {
  const csr = envelope.data
  const opts = getCsrRenderOptions(envelope)
  const { ink, fillableFont, bodyFont } = resolveInkFonts(opts.designPreset)
  const t = buildTheme(opts, ink, fillableFont, bodyFont)

  const status = safeText(csr.status)
  const statusLabel = status || 'Pending'
  // Badge shows plain status except for the "Working solution provided" case,
  // which the source remaps to "Under Observation".
  const badgeLabel = status === 'Working solution provided' ? 'Under Observation' : statusLabel
  const stages = resolveZincLifecycleStages(status)

  const provider = csr.serviceProvider
  const providerName = safeText(provider.name)
  const footerLine = safeText(provider.contact) || providerName

  const startWindow = [csr.serviceWindow.startDate, csr.serviceWindow.startTime].map(safeText).filter(Boolean).join(' // ')
  const endWindow = [csr.serviceWindow.endDate, csr.serviceWindow.endTime].map(safeText).filter(Boolean).join(' // ')
  const makeModel = [csr.equipment.make, csr.equipment.model].map(safeText).filter(Boolean).join(' ')

  const readingRows = READING_FIELDS.map((field) => ({ field, reading: csr.readings[field.key] })).filter(
    ({ reading }) => safeText(reading?.value).length > 0,
  )
  const showReadings = opts.showOperationalReadings && readingRows.length > 0

  const defectsFound = safeText(csr.narratives.defectsFound)
  const defectsList = (csr.narratives.defectsList ?? []).map(safeText).filter(Boolean)
  const showDefects = defectsFound.length > 0 || defectsList.length > 0
  const engineerRemarks = safeText(csr.narratives.engineerRemarks)
  const customerFeedback = safeText(csr.narratives.customerFeedback)
  const problemReported = safeText(csr.narratives.problemReported)
  const serviceRendered = safeText(csr.narratives.serviceRendered)

  const materials = csr.materials ?? []
  const materialOrder = new Map(materials.map((item, index) => [item, index]))
  const adaptiveMaterials = getAdaptiveMaterialColumns(materials, 'portrait')

  const technician = csr.signatories.serviceEngineer
  const recipient = csr.signatories.clientRepresentative
  const technicianName = safeText(technician.printedName)
  const technicianSignatureUrl = safeText(technician.signatureUrl ?? '')
  const recipientName = safeText(recipient.printedName)

  const logoNode = provider.logoUrl ? (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 4, padding: 2 }}>
      <BrandLogo logoUrl={provider.logoUrl} height={48} />
    </View>
  ) : null

  // Field values the source renders verbatim; absent-but-required fields keep an empty writable line.
  const ackTopPad = t.tight ? 3 : 4
  const ackHalfPadB = t.tight ? 20 : 24
  const ackHalfPadH = t.tight ? 5 : 6
  const ackBottomMinH = t.tight ? 50 : t.compact ? 60 : 70
  const ackCellPadB = t.tight ? 14 : 18

  return (
    <Document
      title={`${safeText(csr.csrNumber) || 'CSR'} — Customer Service Report`}
      author={providerName || undefined}
      lang="en-NG"
      style={{ fontFamily: bodyFont, color: C.black }}
    >
      <Page size="A4" margin={{ top: t.pagePad, right: t.pagePad, bottom: t.pagePad, left: t.pagePad }} style={{ backgroundColor: '#ffffff', fontFamily: bodyFont, fontSize: t.tight ? 7.4 : t.compact ? 7.8 : 8, color: C.black }}>
        {footerLine ? (
          <Fixed
            position="footer"
            style={{ display: 'flex', alignItems: 'center', paddingTop: 5, borderTopWidth: 1, borderTopColor: C.border }}
          >
            <Text style={{ width: '100%', fontSize: 6, color: C.muted, textAlign: 'center', fontFamily: bodyFont }}>
              {glyphRuns(footerLine, bodyFont)}
            </Text>
          </Fixed>
        ) : null}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: t.compact ? 6 : 8 }}>
          {logoNode}
          <View style={{ flex: 1 }}>
            {providerName ? (
              <Text style={{ fontFamily: bodyFont, fontWeight: 700, fontSize: 16, color: C.black }}>
                {glyphRuns(providerName.toUpperCase(), bodyFont)}
              </Text>
            ) : null}
            {safeText(provider.subtitle) ? (
              <Text style={{ fontFamily: bodyFont, fontSize: 7, color: C.muted, marginTop: 3 }}>
                {glyphRuns(safeText(provider.subtitle).toUpperCase(), bodyFont)}
              </Text>
            ) : null}
            {safeText(provider.address) ? (
              <Text style={{ fontFamily: bodyFont, fontSize: 7, color: C.muted, marginTop: 3 }}>
                {glyphRuns(safeText(provider.address), bodyFont)}
              </Text>
            ) : null}
            {safeText(provider.contact) ? (
              <Text style={{ fontFamily: bodyFont, fontSize: 7, color: C.muted, marginTop: 3 }}>
                {glyphRuns(safeText(provider.contact), bodyFont)}
              </Text>
            ) : null}
          </View>
          <View style={{ width: 120, alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: bodyFont, fontWeight: 700, fontSize: 6.5, color: C.muted }}>
              SERVICE REPORT
            </Text>
            <Text
              style={{
                fontFamily: fillableFont,
                fontWeight: 700,
                fontSize: 12,
                color: ink,
                marginTop: 2,
              }}
            >
              {glyphRuns(safeText(csr.csrNumber), fillableFont)}
            </Text>
            <Text style={{ fontFamily: bodyFont, fontSize: 7.5, color: C.muted, marginTop: 4 }}>
              {glyphRuns(safeText(csr.date), bodyFont)}
            </Text>
          </View>
        </View>

        <Section t={t} title="CLIENT & DEPLOYMENT DETAILS">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Field t={t} label="CLIENT NAME" value={csr.client.name} />
            <Field t={t} label="ADDRESS" value={csr.client.address} width="66.66%" />
            {safeText(csr.client.poNumber ?? '') ? <Field t={t} label="P.O. NUMBER" value={safeText(csr.client.poNumber)} /> : null}
            <Field t={t} label="SERVICE WINDOW (START)" value={startWindow} />
            <Field t={t} label="SERVICE WINDOW (END)" value={endWindow} />
            {safeText(csr.callTypeDisplay) ? <Field t={t} label="CALL TYPE" value={csr.callTypeDisplay} /> : null}
            {safeText(csr.serviceBasis) ? <Field t={t} label="SERVICE BASIS" value={csr.serviceBasis} /> : null}
            {safeText(csr.systemDownDisplay) ? <Field t={t} label="SYSTEM STATUS" value={csr.systemDownDisplay} /> : null}
          </View>
        </Section>

        <Section t={t} title="ASSET IDENTITY & TELEMETRY">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Field t={t} label="EQUIPMENT TYPE" value={csr.equipment.type} width="25%" />
            <Field t={t} label="MAKE/MODEL" value={makeModel} width="25%" />
            <Field t={t} label="SERIAL NO." value={csr.equipment.serialNo} width="25%" />
            <Field t={t} label="ENGINE NO." value={csr.equipment.engineNo} width="25%" />
            <Field t={t} label="CAPACITY" value={csr.equipment.capacity} width="25%" />
            <Field t={t} label="EQUIPMENT LOCATION" value={csr.location.site} width="75%" />
          </View>
          {showReadings ? (
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: C.wash,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 6,
                paddingVertical: t.tight ? 5 : 6,
                paddingHorizontal: t.tight ? 4 : 5,
              }}
            >
              {readingRows.map(({ field, reading }, index) => (
                <View
                  key={field.key}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    borderRightWidth: index === readingRows.length - 1 ? 0 : 1,
                    borderRightColor: C.border,
                    paddingHorizontal: 2,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        fontFamily: fillableFont,
                        fontWeight: 700,
                        fontSize: 9.5,
                        color: ink,
                      }}
                    >
                      {glyphRuns(dash(reading.value), fillableFont)}
                    </Text>
                    {safeText(reading.unit ?? '') ? (
                      <Text
                        style={{
                          fontFamily: fillableFont,
                          fontWeight: 700,
                          fontSize: 6.8,
                          color: ink,
                          marginLeft: 2,
                          paddingBottom: 1,
                        }}
                      >
                        {glyphRuns(safeText(reading.unit), fillableFont)}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={{
                      fontFamily: bodyFont,
                      fontWeight: 700,
                      fontSize: 6.2,
                      color: C.muted,
                      marginTop: 3,
                      textAlign: 'center',
                    }}
                  >
                    {field.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Section>

        <Section t={t} title="TECHNICAL NARRATIVE">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <BlockCard t={t}>
                <BlockLabel t={t} label="PROBLEM REPORTED" />
                <BlockValue t={t} value={problemReported} />
              </BlockCard>
            </View>
            <View style={{ flex: 1 }}>
              <BlockCard t={t}>
                <BlockLabel t={t} label="SERVICE RENDERED" />
                <BlockValue t={t} value={serviceRendered} />
              </BlockCard>
            </View>
          </View>
          {showDefects ? (
            <View style={{ marginTop: 6 }}>
              <BlockCard t={t}>
                <BlockLabel t={t} label="DEFECTS FOUND" />
                {defectsFound ? <BlockValue t={t} value={defectsFound} /> : null}
                {!defectsFound && defectsList.map((defect, index) => (
                  <Text
                    key={index}
                    style={{
                      fontFamily: fillableFont,
                      fontWeight: 400,
                      fontSize: t.blockTextSize,
                      color: ink,
                      lineHeight: t.blockTextLH,
                      marginTop: index === 0 && defectsFound ? 2 : 0,
                    }}
                  >
                    {glyphRuns(`\u2022 ${defect}`, fillableFont)}
                  </Text>
                ))}
              </BlockCard>
            </View>
          ) : null}
          {engineerRemarks ? (
            <View style={{ marginTop: 6 }}>
              <BlockLabel t={t} label="TECHNICIAN REMARKS" />
              <BlockCard t={t} wash>
                <BlockValue t={t} value={engineerRemarks} />
              </BlockCard>
            </View>
          ) : null}
        </Section>

        <Section t={t} title="SERVICE LIFECYCLE POSITION">
          <View
            style={{
              backgroundColor: C.black,
              borderRadius: 6,
              paddingVertical: 10,
              paddingHorizontal: 10,
              marginTop: 4,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              {stages.map((stage) => {
                const active = stage.active
                return (
                  <View key={stage.label} style={{ flex: 1, alignItems: 'center' }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 99,
                        backgroundColor: active ? '#ffffff' : C.zinc,
                        marginBottom: 6,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: active ? fillableFont : bodyFont,
                        fontWeight: active ? 700 : 400,
                        fontSize: 6.1,
                        color: active ? '#ffffff' : C.soft,
                        textTransform: 'uppercase',
                      }}
                    >
                      {stage.label}
                    </Text>
                  </View>
                )
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <View>
                <Text
                  style={{
                    fontFamily: bodyFont,
                    fontWeight: 700,
                    fontSize: 6.4,
                    color: C.soft,
                  }}
                >
                  CURRENT STATUS
                </Text>
                <Text
                  style={{
                    fontFamily: fillableFont,
                    fontWeight: 700,
                    fontSize: 8.5,
                    color: '#ffffff',
                    marginTop: 2,
                  }}
                >
                  {glyphRuns(statusLabel, fillableFont)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 4,
                  paddingVertical: 2,
                  paddingHorizontal: 6,
                  borderWidth: 1,
                  borderColor: ink,
                }}
              >
                <Text
                  style={{
                    fontFamily: fillableFont,
                    fontWeight: 700,
                    fontSize: 6.6,
                    color: ink,
                  }}
                >
                  {glyphRuns(badgeLabel.toUpperCase(), fillableFont)}
                </Text>
              </View>
            </View>
          </View>
        </Section>

        {adaptiveMaterials.layoutMode !== 'empty' || customerFeedback ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {adaptiveMaterials.layoutMode !== 'empty' ? (
              <View style={{ flex: 1 }}>
                <Section t={t} title="MATERIALS USED">
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: C.border,
                      borderRadius: 6,
                      padding: 6,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                      {adaptiveMaterials.columns.map((column, colIndex) => (
                        <React.Fragment key={`col-${colIndex}`}>
                          {colIndex > 0 ? (
                            <View style={{ width: 2, backgroundColor: C.zinc, marginHorizontal: 4 }} />
                          ) : null}
                          <View style={{ flex: 1, paddingHorizontal: 2 }}>
                            {column.map((item, rowIndex) => {
                              const orderIndex = materialOrder.get(item)
                              const leading = safeText(item.no) || String((orderIndex ?? rowIndex) + 1)
                              return (
                                <View
                                  key={`${colIndex}-${rowIndex}`}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 3,
                                    borderBottomWidth: 1,
                                    borderBottomColor: '#f1f1f1',
                                    gap: 3,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontFamily: fillableFont,
                                      fontWeight: 700,
                                      fontSize: 7.7,
                                      color: ink,
                                    }}
                                  >
                                    {glyphRuns(leading, fillableFont)}
                                  </Text>
                                  <Text style={{ fontFamily: bodyFont, fontWeight: 700, color: C.soft }}>
                                    {'|'}
                                  </Text>
                                  <Text
                                    style={{
                                      flex: 1,
                                      fontFamily: fillableFont,
                                      fontWeight: 700,
                                      fontSize: 7.7,
                                      color: ink,
                                    }}
                                  >
                                    {glyphRuns(dash(item.description), fillableFont)}
                                  </Text>
                                  <Text
                                    style={{
                                      fontFamily: fillableFont,
                                      fontWeight: 700,
                                      fontSize: 7,
                                      color: C.muted,
                                      textAlign: 'right',
                                    }}
                                  >
                                    {glyphRuns(formatQuantity(item), fillableFont)}
                                  </Text>
                                </View>
                              )
                            })}
                          </View>
                        </React.Fragment>
                      ))}
                    </View>
                  </View>
                </Section>
              </View>
            ) : null}
            {customerFeedback ? (
              <View style={{ flex: 1 }}>
                <Section t={t} title="CUSTOMER FEEDBACK">
                  <BlockCard t={t}>
                    <BlockValue t={t} value={customerFeedback} />
                  </BlockCard>
                </Section>
              </View>
            ) : null}
          </View>
        ) : null}

        <Section t={t} title="ACKNOWLEDGEMENT">
          <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View
                style={{
                  flex: 1,
                  paddingTop: ackTopPad,
                  paddingBottom: ackHalfPadB,
                  paddingHorizontal: ackHalfPadH,
                  borderRightWidth: 1,
                  borderRightColor: C.border,
                }}
              >
                <AckLabel t={t} label="RECIPIENT NAME" />
                <Text
                  style={{
                    fontFamily: fillableFont,
                    fontWeight: 700,
                    fontSize: t.fieldValueSize,
                    color: ink,
                    marginTop: 6,
                  }}
                >
                  {recipientName ? glyphRuns(recipientName, fillableFont) : ' '}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  paddingTop: ackTopPad,
                  paddingBottom: ackHalfPadB,
                  paddingHorizontal: ackHalfPadH,
                }}
              >
                <AckLabel t={t} label="COMMENT" />
                {customerFeedback ? (
                  <Text
                    style={{
                      fontFamily: fillableFont,
                      fontWeight: 400,
                      fontSize: t.blockTextSize,
                      color: ink,
                      lineHeight: t.blockTextLH,
                      marginTop: 6,
                    }}
                  >
                    {glyphRuns(customerFeedback, fillableFont)}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', minHeight: ackBottomMinH }}>
              <View
                style={{
                  width: '40%',
                  paddingTop: ackTopPad,
                  paddingBottom: ackCellPadB,
                  paddingHorizontal: ackHalfPadH,
                  borderRightWidth: 2,
                  borderRightColor: C.soft,
                }}
              >
                <AckLabel t={t} label="RECIPIENT SIGNATURE" />
                <View style={{ flex: 1, width: '100%' }} />
              </View>
              <View
                style={{
                  width: '30%',
                  paddingTop: ackTopPad,
                  paddingBottom: ackCellPadB,
                  paddingHorizontal: ackHalfPadH,
                  borderRightWidth: 2,
                  borderRightColor: C.soft,
                }}
              >
                <AckLabel t={t} label="TECHNICIAN SIGNATURE" />
                <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                  {technicianSignatureUrl ? (
                    <SignatureStage signatureUrl={technicianSignatureUrl} height={22} lineColor={C.black} />
                  ) : null}
                </View>
              </View>
              <View
                style={{
                  width: '30%',
                  paddingTop: ackTopPad,
                  paddingBottom: ackCellPadB,
                  paddingHorizontal: ackHalfPadH,
                }}
              >
                <AckLabel t={t} label="TECHNICIAN NAME" />
                <View style={{ flex: 1, width: '100%', justifyContent: 'center' }}>
                  {technicianName ? (
                    <Text
                      style={{
                        fontFamily: fillableFont,
                        fontWeight: 700,
                        fontSize: t.fieldValueSize,
                        color: ink,
                      }}
                    >
                      {glyphRuns(technicianName, fillableFont)}
                    </Text>
                  ) : (
                    <View style={{ width: '100%', borderBottomWidth: 0.8, borderBottomColor: C.black }} />
                  )}
                </View>
              </View>
            </View>
          </View>
        </Section>
      </Page>
    </Document>
  )
}
