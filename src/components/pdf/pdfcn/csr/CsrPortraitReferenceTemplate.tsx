import React from 'react'
import type { CanonicalPreparedCsr } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import type { PdfcnDocumentEnvelope } from '@/domain/pdf/resolver'
import {
  Document,
  Page,
  View,
  Text,
  Table,
  Row,
  Cell,
} from '../primitives'
import { BrandLogo, SignatureStage, getAdaptiveMaterialColumns } from './csrPdfcnUtils'

// High-contrast Reference Palette matching approved HTML specification
const C = {
  ink: '#111111',
  muted: '#565656',
  rule: '#e2e2e0',
  signal: '#f2b705',
  paper: '#ffffff',
  wash: '#f5f5f2',
  white: '#ffffff',
  border: '#222222',
}

export const CsrPortraitReferenceTemplate: React.FC<{
  envelope: PdfcnDocumentEnvelope<CanonicalPreparedCsr>
}> = ({ envelope }) => {
  const csr = envelope.data
  const adaptiveMaterials = getAdaptiveMaterialColumns(csr.materials, 'portrait')

  return (
    <Document title={`CSR-${csr.csrNumber || 'Report'}`}>
      <Page size="A4" style={{ backgroundColor: C.paper, padding: 18 }}>
        <View
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ── Masthead ── */}
          <View style={{ display: 'flex', flexDirection: 'row', backgroundColor: C.ink }}>
            {/* Brand mark box */}
            <View
              style={{
                width: 34,
                height: 34,
                backgroundColor: C.white,
                margin: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BrandLogo
                logoUrl={csr.serviceProvider.logoUrl}
                width={26}
                height={26}
                fillColor={C.ink}
              />
            </View>

            {/* Brand Copy */}
            <View
              style={{
                flex: 1,
                padding: 4,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 9.5, fontWeight: 700, color: C.white, letterSpacing: 0.2 }}>
                {csr.serviceProvider.name.toUpperCase()}
              </Text>
              <Text style={{ fontSize: 5.8, color: '#d6d6d6', marginTop: 1 }}>
                {csr.serviceProvider.subtitle}
              </Text>
              <Text style={{ fontSize: 5.2, color: '#a0a0a0', marginTop: 2 }}>
                {csr.serviceProvider.address} · {csr.serviceProvider.contact}
              </Text>
            </View>

            {/* Restrained Safety Yellow Docket */}
            <View
              style={{
                width: 145,
                backgroundColor: C.signal,
                padding: 5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 6.8, fontWeight: 700, color: C.ink, textTransform: 'uppercase' }}>
                CUSTOMER SERVICE REPORT
              </Text>
              <Text style={{ fontSize: 9.8, fontWeight: 700, fontFamily: 'monospace', color: C.ink }}>
                {csr.csrNumber}
              </Text>
              <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.ink }}>DATE: {csr.date}</Text>
                <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.ink }}>STATUS: {csr.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Restrained Rule under Masthead */}
          <View style={{ height: 1.5, backgroundColor: C.ink }} />

          {/* ── Client & Equipment Split Box ── */}
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              borderWidth: 1.2,
              borderColor: C.ink,
              marginTop: 5,
            }}
          >
            {/* Left Column: Client Entity & Service Window */}
            <View style={{ flex: 1, padding: 5, borderRightWidth: 1.2, borderRightColor: C.ink }}>
              <View style={{ borderBottomWidth: 0.8, borderBottomColor: C.ink, paddingBottom: 3, marginBottom: 4 }}>
                <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.muted }}>CLIENT ENTITY</Text>
                <Text style={{ fontSize: 8.8, fontWeight: 700, color: C.ink }}>{csr.client.name}</Text>
                <Text style={{ fontSize: 6, color: C.muted, marginTop: 1 }}>{csr.client.address || '-'}</Text>
              </View>

              <View style={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 5.5, color: C.muted }}>CALL TYPE:</Text>
                  <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.ink }}>{csr.callTypeDisplay}</Text>
                </View>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 5.5, color: C.muted }}>SERVICE BASIS:</Text>
                  <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.ink }}>
                    {csr.serviceBasis || 'Contractual Maintenance'}
                  </Text>
                </View>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 5.5, color: C.muted }}>SYSTEM STATE:</Text>
                  <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.ink }}>{csr.systemDownDisplay}</Text>
                </View>
              </View>
            </View>

            {/* Right Column: Site / Equipment Location & Details */}
            <View style={{ flex: 1.2, padding: 5 }}>
              <View style={{ borderBottomWidth: 0.8, borderBottomColor: C.ink, paddingBottom: 3, marginBottom: 4 }}>
                <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.muted }}>
                  {csr.location.label.toUpperCase()}
                </Text>
                <Text style={{ fontSize: 8.5, fontWeight: 700, color: C.ink }}>
                  {csr.location.site || 'Site Location Not Specified'}
                </Text>
                {csr.location.subLocation ? (
                  <Text style={{ fontSize: 6, color: C.muted, marginTop: 1 }}>{csr.location.subLocation}</Text>
                ) : null}
              </View>

              <View style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 5.5, color: C.muted }}>EQUIPMENT:</Text>
                  <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.ink }}>
                    {csr.equipment.make} {csr.equipment.model}
                  </Text>
                </View>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 5.5, color: C.muted }}>TYPE / RATING:</Text>
                  <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.ink }}>
                    {csr.equipment.type} · {csr.equipment.capacity}
                  </Text>
                </View>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 5.5, color: C.muted }}>SERIAL / ENG NO:</Text>
                  <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.ink }}>
                    {csr.equipment.serialNo || '-'} / {csr.equipment.engineNo || '-'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Operational Readings (6-Parameter Strip) ── */}
          <View style={{ marginTop: 5 }}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <View style={{ backgroundColor: C.signal, paddingHorizontal: 3, paddingVertical: 0.5 }}>
                <Text style={{ fontSize: 5.5, fontWeight: 700, color: C.ink }}>02</Text>
              </View>
              <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.ink, marginLeft: 4 }}>
                OPERATIONAL READINGS (6-CELL PARAMETER STRIP)
              </Text>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row', borderWidth: 0.8, borderColor: C.ink }}>
              <View style={{ flex: 1, padding: 3, borderRightWidth: 0.5, borderRightColor: C.rule }}>
                <Text style={{ fontSize: 5, color: C.muted }}>GEN VOLTAGE (V)</Text>
                <Text style={{ fontSize: 6.8, fontWeight: 700, color: C.ink, marginTop: 1 }}>
                  {csr.readings.voltage.value ? `${csr.readings.voltage.value} V` : '-'}
                </Text>
              </View>
              <View style={{ flex: 1, padding: 3, borderRightWidth: 0.5, borderRightColor: C.rule }}>
                <Text style={{ fontSize: 5, color: C.muted }}>FREQUENCY (HZ)</Text>
                <Text style={{ fontSize: 6.8, fontWeight: 700, color: C.ink, marginTop: 1 }}>
                  {csr.readings.frequency.value ? `${csr.readings.frequency.value} Hz` : '-'}
                </Text>
              </View>
              <View style={{ flex: 1, padding: 3, borderRightWidth: 0.5, borderRightColor: C.rule }}>
                <Text style={{ fontSize: 5, color: C.muted }}>BATTERY / ALT</Text>
                <Text style={{ fontSize: 6.8, fontWeight: 700, color: C.ink, marginTop: 1 }}>
                  {csr.readings.battery.value ? `${csr.readings.battery.value} V` : '-'}
                </Text>
              </View>
              <View style={{ flex: 1, padding: 3, borderRightWidth: 0.5, borderRightColor: C.rule }}>
                <Text style={{ fontSize: 5, color: C.muted }}>TEMPERATURE</Text>
                <Text style={{ fontSize: 6.8, fontWeight: 700, color: C.ink, marginTop: 1 }}>
                  {csr.readings.temperature.value ? `${csr.readings.temperature.value} °C` : '-'}
                </Text>
              </View>
              <View style={{ flex: 1, padding: 3, borderRightWidth: 0.5, borderRightColor: C.rule }}>
                <Text style={{ fontSize: 5, color: C.muted }}>PRESSURE</Text>
                <Text style={{ fontSize: 6.8, fontWeight: 700, color: C.ink, marginTop: 1 }}>
                  {csr.readings.pressure.value ? `${csr.readings.pressure.value} kPa` : '-'}
                </Text>
              </View>
              <View style={{ flex: 1, padding: 3 }}>
                <Text style={{ fontSize: 5, color: C.muted }}>ENGINE HOURS</Text>
                <Text style={{ fontSize: 6.8, fontWeight: 700, color: C.ink, marginTop: 1 }}>
                  {csr.readings.hours.value ? `${csr.readings.hours.value}` : '-'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Narratives (2 Columns) ── */}
          <View style={{ display: 'flex', flexDirection: 'row', gap: 6, marginTop: 5 }}>
            {/* Left Narrative: Service Narrative & Scope */}
            <View style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <View>
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={{ fontSize: 6.2, fontWeight: 700, color: C.ink }}>
                    03 · SERVICE NARRATIVE & SCOPE
                  </Text>
                </View>
                <View style={{ borderTopWidth: 0.8, borderTopColor: C.ink, paddingTop: 2 }}>
                  <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.muted }}>PROBLEM REPORTED:</Text>
                  <Text style={{ fontSize: 6.2, color: C.ink, lineHeight: 1.25, marginTop: 1 }}>
                    {csr.narratives.problemReported || 'Routine inspection and scheduled maintenance.'}
                  </Text>
                </View>
              </View>

              <View style={{ borderTopWidth: 0.5, borderTopColor: C.rule, paddingTop: 2 }}>
                <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.muted }}>SERVICE RENDERED:</Text>
                <Text style={{ fontSize: 6.2, color: C.ink, lineHeight: 1.25, marginTop: 1 }}>
                  {csr.narratives.serviceRendered || 'Service rendered as per approved maintenance schedule.'}
                </Text>
              </View>
            </View>

            {/* Right Narrative: Observations, Defects & Remarks */}
            <View style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <View>
                <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={{ fontSize: 6.2, fontWeight: 700, color: C.ink }}>
                    04 · DEFECTS FOUND & ENGINEER REMARKS
                  </Text>
                </View>
                <View style={{ borderTopWidth: 0.8, borderTopColor: C.ink, paddingTop: 2 }}>
                  <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.muted }}>OBSERVATIONS & DEFECTS:</Text>
                  <Text style={{ fontSize: 6.2, color: C.ink, lineHeight: 1.25, marginTop: 1 }}>
                    {csr.narratives.defectsFound}
                  </Text>
                </View>
              </View>

              <View style={{ borderTopWidth: 0.5, borderTopColor: C.rule, paddingTop: 2 }}>
                <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.muted }}>ENGINEER REMARKS:</Text>
                <Text style={{ fontSize: 6.2, color: C.ink, lineHeight: 1.25, marginTop: 1 }}>
                  {csr.narratives.engineerRemarks || 'System tested and certified satisfactory.'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Content-Aware Adaptive Materials Schedule ── */}
          <View style={{ marginTop: 5 }}>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <View style={{ backgroundColor: C.signal, paddingHorizontal: 3, paddingVertical: 0.5 }}>
                <Text style={{ fontSize: 5.5, fontWeight: 700, color: C.ink }}>05</Text>
              </View>
              <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.ink, marginLeft: 4 }}>
                PARTS & MATERIALS SCHEDULE{csr.materials.length > 0 ? ` (${csr.materials.length} ITEMS)` : ''}
              </Text>
            </View>

            {adaptiveMaterials.layoutMode === 'empty' ? (
              <View
                style={{
                  borderWidth: 0.8,
                  borderColor: C.ink,
                  padding: 8,
                  backgroundColor: C.wash,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 6, color: C.muted, fontStyle: 'italic' }}>
                  No replacement parts or materials recorded for this service.
                </Text>
              </View>
            ) : adaptiveMaterials.layoutMode === 'single' ? (
              /* Single Full-Width Table Layout (Optimal for 1–4 items) */
              <View style={{ borderWidth: 0.8, borderColor: C.ink }}>
                <Table>
                  <Row header style={{ backgroundColor: C.wash, borderBottomWidth: 0.5, borderBottomColor: C.rule }}>
                    <Cell style={{ width: 28, padding: 3 }}>
                      <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.ink }}>ITEM NO</Text>
                    </Cell>
                    <Cell style={{ flex: 1, padding: 3 }}>
                      <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.ink }}>DESCRIPTION</Text>
                    </Cell>
                    <Cell style={{ width: 80, padding: 3 }}>
                      <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.ink }}>PART NUMBER</Text>
                    </Cell>
                    <Cell style={{ width: 50, padding: 3, alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.ink }}>QUANTITY</Text>
                    </Cell>
                  </Row>
                  {adaptiveMaterials.columns[0].map((item, rowIdx) => (
                    <Row
                      key={item.no}
                      style={{
                        backgroundColor: rowIdx % 2 === 1 ? C.wash : C.white,
                        borderBottomWidth: rowIdx < adaptiveMaterials.columns[0].length - 1 ? 0.3 : 0,
                        borderBottomColor: C.rule,
                      }}
                    >
                      <Cell style={{ width: 28, padding: 3 }}>
                        <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.ink }}>{item.no}</Text>
                      </Cell>
                      <Cell style={{ flex: 1, padding: 3 }}>
                        <Text style={{ fontSize: 5.8, color: C.ink }}>{item.description}</Text>
                      </Cell>
                      <Cell style={{ width: 80, padding: 3 }}>
                        <Text style={{ fontSize: 5.8, color: C.muted }}>{item.partNo || '-'}</Text>
                      </Cell>
                      <Cell style={{ width: 50, padding: 3, alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.ink }}>
                          {item.qty} {item.unit}
                        </Text>
                      </Cell>
                    </Row>
                  ))}
                </Table>
              </View>
            ) : (
              /* Multi-Column Grid Layout (Dual for 5–8 items, Quad for 9+ items) */
              <View style={{ display: 'flex', flexDirection: 'row', borderWidth: 0.8, borderColor: C.ink }}>
                {adaptiveMaterials.columns.map((group, colIdx) => (
                  <View
                    key={colIdx}
                    style={{
                      flex: 1,
                      borderRightWidth: colIdx < adaptiveMaterials.colCount - 1 ? 0.6 : 0,
                      borderRightColor: C.rule,
                    }}
                  >
                    <Table>
                      <Row header style={{ backgroundColor: C.wash, borderBottomWidth: 0.5, borderBottomColor: C.rule }}>
                        <Cell style={{ width: 16, padding: 2 }}>
                          <Text style={{ fontSize: 4.8, fontWeight: 700, color: C.ink }}>NO</Text>
                        </Cell>
                        <Cell style={{ flex: 1, padding: 2 }}>
                          <Text style={{ fontSize: 4.8, fontWeight: 700, color: C.ink }}>ITEM</Text>
                        </Cell>
                        <Cell style={{ width: 30, padding: 2, alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 4.8, fontWeight: 700, color: C.ink }}>QTY</Text>
                        </Cell>
                      </Row>
                      {group.map((item, rowIdx) => (
                        <Row
                          key={item.no}
                          style={{
                            backgroundColor: rowIdx % 2 === 1 ? C.wash : C.white,
                            borderBottomWidth: rowIdx < group.length - 1 ? 0.3 : 0,
                            borderBottomColor: C.rule,
                          }}
                        >
                          <Cell style={{ width: 16, padding: 2 }}>
                            <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.ink }}>{item.no}</Text>
                          </Cell>
                          <Cell style={{ flex: 1, padding: 2 }}>
                            <Text style={{ fontSize: 5.2, color: C.ink }}>{item.description}</Text>
                          </Cell>
                          <Cell style={{ width: 30, padding: 2, alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 5.2, fontWeight: 700, color: C.ink }}>
                              {item.qty} {item.unit}
                            </Text>
                          </Cell>
                        </Row>
                      ))}
                    </Table>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Two Professional Sign-Off Cards ── */}
          <View style={{ marginTop: 5, display: 'flex', flexDirection: 'row', gap: 6 }}>
            {/* Service Engineer Card */}
            <View style={{ flex: 1, borderWidth: 1, borderColor: C.ink, display: 'flex', flexDirection: 'column' }}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  backgroundColor: C.ink,
                  padding: 3,
                }}
              >
                <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.white }}>
                  SERVICE ENGINEER
                </Text>
                <View style={{ backgroundColor: C.signal, paddingHorizontal: 3 }}>
                  <Text style={{ fontSize: 5, fontWeight: 700, color: C.ink }}>VERIFIED</Text>
                </View>
              </View>
              <View style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Text style={{ fontSize: 5, color: C.muted }}>SIGNATURE:</Text>
                <SignatureStage
                  signatureUrl={csr.signatories.serviceEngineer.signatureUrl}
                  height={22}
                  lineColor={C.ink}
                />
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    borderBottomWidth: 0.4,
                    borderBottomColor: C.rule,
                    paddingBottom: 1.5,
                  }}
                >
                  <Text style={{ fontSize: 5, color: C.muted, width: 55 }}>FULL NAME:</Text>
                  <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.ink }}>
                    {csr.signatories.serviceEngineer.printedName || ''}
                  </Text>
                </View>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    borderBottomWidth: 0.4,
                    borderBottomColor: C.rule,
                    paddingBottom: 1.5,
                  }}
                >
                  <Text style={{ fontSize: 5, color: C.muted, width: 55 }}>DESIGNATION:</Text>
                  <Text style={{ fontSize: 5.8, color: C.ink }}>
                    {csr.signatories.serviceEngineer.designation || ''}
                  </Text>
                </View>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    borderBottomWidth: 0.4,
                    borderBottomColor: C.rule,
                    paddingBottom: 1.5,
                  }}
                >
                  <Text style={{ fontSize: 5, color: C.muted, width: 55 }}>DATE:</Text>
                  <Text style={{ fontSize: 5.8, color: C.ink }}>
                    {csr.signatories.serviceEngineer.signingDate || ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Client Representative Card */}
            <View style={{ flex: 1, borderWidth: 1, borderColor: C.ink, display: 'flex', flexDirection: 'column' }}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  backgroundColor: C.ink,
                  padding: 3,
                }}
              >
                <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.white }}>
                  CLIENT REPRESENTATIVE
                </Text>
                <View style={{ backgroundColor: C.signal, paddingHorizontal: 3 }}>
                  <Text style={{ fontSize: 5, fontWeight: 700, color: C.ink }}>ACCEPTED</Text>
                </View>
              </View>
              <View style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Text style={{ fontSize: 5, color: C.muted }}>SIGNATURE:</Text>
                <SignatureStage
                  signatureUrl={csr.signatories.clientRepresentative.signatureUrl}
                  height={22}
                  lineColor={C.ink}
                />
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    borderBottomWidth: 0.4,
                    borderBottomColor: C.rule,
                    paddingBottom: 1.5,
                  }}
                >
                  <Text style={{ fontSize: 5, color: C.muted, width: 55 }}>FULL NAME:</Text>
                  <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.ink }}>
                    {csr.signatories.clientRepresentative.printedName || ''}
                  </Text>
                </View>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    borderBottomWidth: 0.4,
                    borderBottomColor: C.rule,
                    paddingBottom: 1.5,
                  }}
                >
                  <Text style={{ fontSize: 5, color: C.muted, width: 55 }}>DESIGNATION:</Text>
                  <Text style={{ fontSize: 5.8, color: C.ink }}>
                    {csr.signatories.clientRepresentative.designation || ''}
                  </Text>
                </View>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    borderBottomWidth: 0.4,
                    borderBottomColor: C.rule,
                    paddingBottom: 1.5,
                  }}
                >
                  <Text style={{ fontSize: 5, color: C.muted, width: 55 }}>DATE:</Text>
                  <Text style={{ fontSize: 5.8, color: C.ink }}>
                    {csr.signatories.clientRepresentative.signingDate || ''}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Document Footer ── */}
          <View
            style={{
              marginTop: 'auto',
              paddingTop: 3,
              borderTopWidth: 0.8,
              borderTopColor: C.ink,
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 5.4, color: C.muted }}>
              {csr.serviceProvider.name} · {csr.serviceProvider.subtitle}
            </Text>
            <Text style={{ fontSize: 5.4, color: C.muted }}>
              REF: {csr.csrNumber} · A4 PORTRAIT
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
