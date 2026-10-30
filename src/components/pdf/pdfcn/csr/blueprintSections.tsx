import React from 'react'
import type { CanonicalPreparedCsr } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import { View, Text } from '../primitives'
import {
  BrandLogo,
  READING_FIELDS,
  dash,
  formatMakeModel,
  formatServiceDate,
  isCompleteStatus,
} from './csrPdfcnUtils'
import { CsrMaterialsSchedule, type MaterialsTheme } from './csrMaterialsSchedule'

export const BLUEPRINT_PALETTE = {
  navy: '#07192b',
  cobalt: '#0f3156',
  blue: '#1d568a',
  cyanDim: '#4678a3',
  slate: '#4f667a',
  lineHeavy: '#07192b',
  lineMed: '#29527a',
  lineFine: '#9cb4c9',
  lineGrid: '#dce6ef',
  paper: '#f9fbfd',
  white: '#ffffff',
  tint: '#edf3f8',
  tintStrong: '#dde8f2',
  amber: '#b84a14',
  ok: '#135c47',
}

const C = BLUEPRINT_PALETTE

const LABEL_SIZE = 7
const VALUE_SIZE = 10.5
const BODY_SIZE = 9

const labelStyle = { fontSize: LABEL_SIZE, fontWeight: 700 as const, color: C.blue, letterSpacing: 0.4 }

const BLUEPRINT_MATERIALS_THEME: MaterialsTheme = {
  border: C.lineHeavy,
  headerBg: C.tintStrong,
  headerText: C.cobalt,
  rule: C.lineGrid,
  zebra: C.tint,
  paper: C.white,
  text: C.navy,
  muted: C.slate,
  accent: C.blue,
  divider: C.lineMed,
}

/** Small caption above a value. */
const Field: React.FC<{ label: string; value: string; valueColor?: string; grow?: number }> = ({
  label,
  value,
  valueColor = C.navy,
  grow,
}) => (
  <View style={{ flexGrow: grow, flexShrink: 1 }}>
    <Text style={{ fontSize: LABEL_SIZE, color: C.slate, letterSpacing: 0.3 }}>{label}</Text>
    <Text style={{ fontSize: VALUE_SIZE, fontWeight: 700, color: valueColor, marginTop: 1.5 }}>{value}</Text>
  </View>
)

const SectionBar: React.FC<{ code: string; title: string; accent?: string }> = ({
  code,
  title,
  accent = C.navy,
}) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.tintStrong,
      borderBottomWidth: 0.8,
      borderBottomColor: C.lineMed,
      paddingVertical: 3.5,
      paddingHorizontal: 8,
    }}
  >
    <View style={{ backgroundColor: accent, paddingHorizontal: 4, paddingVertical: 1.5 }}>
      <Text style={{ fontSize: 7, fontWeight: 700, color: C.white }}>{code}</Text>
    </View>
    <Text style={{ fontSize: 8, fontWeight: 700, color: C.navy, marginLeft: 6, letterSpacing: 0.3 }}>{title}</Text>
  </View>
)

export const BlueprintHeader: React.FC<{ csr: CanonicalPreparedCsr }> = ({ csr }) => {
  const provider = csr.serviceProvider
  const hasLogo = Boolean(provider.logoUrl)
  const hasProvider = Boolean(
    provider.name || provider.subtitle || provider.address || provider.contact || hasLogo,
  )
  const hasContact = Boolean(provider.address || provider.contact)
  const statusColor = isCompleteStatus(csr.status) ? C.ok : C.navy

  return (
    <View style={{ borderBottomWidth: 1.2, borderBottomColor: C.lineHeavy }}>
      {/* Tier 1: who issued the document and what it is */}
      <View style={{ display: 'flex', flexDirection: 'row', borderBottomWidth: 0.8, borderBottomColor: C.lineMed }}>
        {hasProvider ? (
          <View
            style={{
              flex: 1.35,
              padding: 8,
              backgroundColor: C.tint,
              borderRightWidth: 1.2,
              borderRightColor: C.lineHeavy,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {hasLogo ? (
                <View
                  style={{
                    width: 44,
                    height: 44,
                    backgroundColor: C.white,
                    borderWidth: 0.8,
                    borderColor: C.lineMed,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BrandLogo logoUrl={provider.logoUrl} width={36} height={36} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>SERVICE PROVIDER</Text>
                {provider.name ? (
                  <Text style={{ fontSize: 14.5, fontWeight: 700, color: C.navy, lineHeight: 1.15, marginTop: 1.5 }}>
                    {provider.name}
                  </Text>
                ) : null}
                {provider.subtitle ? (
                  <Text style={{ fontSize: 9, fontWeight: 700, color: C.cobalt, marginTop: 2 }}>
                    {provider.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
            {hasContact ? (
              <View style={{ borderTopWidth: 0.5, borderTopColor: C.lineFine, paddingTop: 4, marginTop: 5 }}>
                {provider.address ? <Text style={{ fontSize: 8.5, color: C.slate }}>{provider.address}</Text> : null}
                {provider.contact ? (
                  <Text style={{ fontSize: 8.5, color: C.slate, marginTop: 1 }}>{provider.contact}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <View
          style={{
            flex: 1,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 19, fontWeight: 700, color: C.navy, letterSpacing: 0.6 }}>
            CUSTOMER SERVICE REPORT
          </Text>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 18,
              borderTopWidth: 0.5,
              borderTopColor: C.lineFine,
              paddingTop: 4,
              marginTop: 6,
            }}
          >
            <Field label="REPORT NO." value={dash(csr.csrNumber)} />
            <Field label="DATE" value={dash(csr.date)} />
            {csr.status ? <Field label="STATUS" value={csr.status.toUpperCase()} valueColor={statusColor} /> : null}
          </View>
        </View>
      </View>

      {/* Tier 2: client, location and service date */}
      <View style={{ display: 'flex', flexDirection: 'row' }}>
        <View style={{ flex: 1.2, padding: 8, borderRightWidth: 0.8, borderRightColor: C.lineMed }}>
          <Text style={labelStyle}>CLIENT</Text>
          <Text style={{ fontSize: 11.5, fontWeight: 700, color: C.navy, marginTop: 1.5 }}>{dash(csr.client.name)}</Text>
          {csr.client.address ? (
            <Text style={{ fontSize: 8.5, color: C.slate, marginTop: 1.5, lineHeight: 1.25 }}>{csr.client.address}</Text>
          ) : null}
          {csr.client.accountRef || csr.client.poNumber ? (
            <Text style={{ fontSize: 8.5, color: C.blue, marginTop: 3 }}>
              {[
                csr.client.accountRef ? `Account: ${csr.client.accountRef}` : '',
                csr.client.poNumber ? `PO: ${csr.client.poNumber}` : '',
              ]
                .filter(Boolean)
                .join('  |  ')}
            </Text>
          ) : null}
        </View>
        <View style={{ flex: 1.2, padding: 8, borderRightWidth: 0.8, borderRightColor: C.lineMed }}>
          <Text style={labelStyle}>{csr.location.label.toUpperCase()}</Text>
          <Text style={{ fontSize: 11.5, fontWeight: 700, color: C.navy, marginTop: 1.5 }}>{dash(csr.location.site)}</Text>
          {csr.location.subLocation ? (
            <Text style={{ fontSize: 8.5, color: C.slate, marginTop: 1.5 }}>{csr.location.subLocation}</Text>
          ) : null}
        </View>
        <View style={{ flex: 0.7, padding: 8, backgroundColor: C.tint }}>
          <Text style={labelStyle}>SERVICE DATE</Text>
          <Text style={{ fontSize: 11.5, fontWeight: 700, color: C.navy, marginTop: 1.5 }}>
            {formatServiceDate(csr.serviceWindow, csr.date)}
          </Text>
        </View>
      </View>
    </View>
  )
}

const SpecCell: React.FC<{ label: string; value: string; width: string; borderRight?: boolean; borderTop?: boolean }> = ({
  label,
  value,
  width,
  borderRight,
  borderTop,
}) => (
  <View
    style={{
      width,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRightWidth: borderRight ? 0.5 : 0,
      borderRightColor: C.lineFine,
      borderTopWidth: borderTop ? 0.5 : 0,
      borderTopColor: C.lineFine,
    }}
  >
    <Text style={{ fontSize: LABEL_SIZE, color: C.slate, letterSpacing: 0.3 }}>{label}</Text>
    <Text style={{ fontSize: 10, fontWeight: 700, color: C.navy, marginTop: 1.5 }}>{value}</Text>
  </View>
)

const Narrative: React.FC<{
  code: string
  title: string
  text: string
  accent?: string
  grow?: number
  borderRight?: boolean
}> = ({ code, title, text, accent, grow = 1, borderRight }) => (
  <View
    style={{
      flex: grow,
      display: 'flex',
      flexDirection: 'column',
      borderRightWidth: borderRight ? 0.8 : 0,
      borderRightColor: C.lineMed,
    }}
  >
    <SectionBar code={code} title={title} accent={accent} />
    <View style={{ padding: 8 }}>
      <Text style={{ fontSize: BODY_SIZE, color: C.navy, lineHeight: 1.35 }}>{dash(text)}</Text>
    </View>
  </View>
)

export const BlueprintWorkspace: React.FC<{ csr: CanonicalPreparedCsr }> = ({ csr }) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      borderBottomWidth: 1.2,
      borderBottomColor: C.lineHeavy,
      flexGrow: 1,
    }}
  >
    {/* Left plate: equipment specification and the six recorded readings */}
    <View
      style={{
        width: 282,
        borderRightWidth: 1.2,
        borderRightColor: C.lineHeavy,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SectionBar code="01" title="EQUIPMENT" />
      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
        <SpecCell label="MAKE / MODEL" value={formatMakeModel(csr.equipment)} width="60%" borderRight />
        <SpecCell label="TYPE" value={dash(csr.equipment.type)} width="40%" />
        <SpecCell label="SERIAL NO." value={dash(csr.equipment.serialNo)} width="33.33%" borderRight borderTop />
        <SpecCell label="ENGINE NO." value={dash(csr.equipment.engineNo)} width="33.33%" borderRight borderTop />
        <SpecCell label="RATED CAPACITY" value={dash(csr.equipment.capacity)} width="33.34%" borderTop />
      </View>

      <View style={{ borderTopWidth: 0.8, borderTopColor: C.lineMed }}>
        <SectionBar code="02" title="OPERATIONAL READINGS" />
      </View>
      <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', flexGrow: 1 }}>
        {READING_FIELDS.map((field, idx) => (
          <View
            key={field.key}
            style={{
              width: '33.33%',
              paddingVertical: 5,
              paddingHorizontal: 8,
              borderRightWidth: idx % 3 !== 2 ? 0.5 : 0,
              borderRightColor: C.lineFine,
              borderBottomWidth: idx < 3 ? 0.5 : 0,
              borderBottomColor: C.lineFine,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 6.5, color: C.slate, letterSpacing: 0.2 }}>{field.label}</Text>
            <Text style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginTop: 2 }}>
              {dash(csr.readings[field.key].value)}
            </Text>
          </View>
        ))}
      </View>
    </View>

    {/* Right dossier: call details and the four narrative records */}
    <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          borderBottomWidth: 0.8,
          borderBottomColor: C.lineMed,
          backgroundColor: C.tint,
        }}
      >
        <View style={{ flex: 1, padding: 8, borderRightWidth: 0.5, borderRightColor: C.lineFine }}>
          <Field label="CALL TYPE" value={dash(csr.callTypeDisplay)} />
        </View>
        <View style={{ flex: 1, padding: 8, borderRightWidth: 0.5, borderRightColor: C.lineFine }}>
          <Field label="SERVICE BASIS" value={dash(csr.serviceBasis)} />
        </View>
        <View style={{ flex: 1, padding: 8 }}>
          <Field label="SYSTEM STATE" value={dash(csr.systemDownDisplay)} />
        </View>
      </View>

      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          borderBottomWidth: 0.8,
          borderBottomColor: C.lineMed,
          flexGrow: 1,
        }}
      >
        <Narrative code="03" title="PROBLEM REPORTED" text={csr.narratives.problemReported} borderRight />
        <Narrative
          code="04"
          title="OBSERVATIONS & DEFECTS FOUND"
          text={csr.narratives.defectsFound}
          accent={C.amber}
        />
      </View>

      <View style={{ display: 'flex', flexDirection: 'row', flexGrow: 1.4 }}>
        <Narrative code="05" title="SERVICE RENDERED" text={csr.narratives.serviceRendered} grow={1.2} borderRight />
        <Narrative code="06" title="ENGINEER'S REMARKS" text={csr.narratives.engineerRemarks} />
      </View>
    </View>
  </View>
)

export const BlueprintBomSchedule: React.FC<{ csr: CanonicalPreparedCsr }> = ({ csr }) => (
  <View style={{ borderBottomWidth: 1.2, borderBottomColor: C.lineHeavy, backgroundColor: C.white }}>
    <View
      style={{
        paddingVertical: 4.5,
        paddingHorizontal: 9,
        backgroundColor: C.navy,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 8, fontWeight: 700, color: C.white, letterSpacing: 0.3 }}>
        {`07 \u00b7 PARTS & MATERIALS SCHEDULE${csr.materials.length > 0 ? ` (${csr.materials.length} ${csr.materials.length === 1 ? 'ITEM' : 'ITEMS'})` : ''}`}
      </Text>
    </View>
    <CsrMaterialsSchedule materials={csr.materials} orientation="landscape" theme={BLUEPRINT_MATERIALS_THEME} />
  </View>
)

export { BlueprintTitleBlock } from './blueprintTitleBlock'
