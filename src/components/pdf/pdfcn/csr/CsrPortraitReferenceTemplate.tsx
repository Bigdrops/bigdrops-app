import React from 'react'
import type { CanonicalPreparedCsr, CsrSignOffBlock } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import type { PdfcnDocumentEnvelope } from '@/domain/pdf/resolver'
import { Document, Page, View, Text, Fixed, Svg, type Style } from '../primitives'
import {
  BrandLogo,
  READING_FIELDS,
  SignatureStage,
  dash,
  formatServiceDate,
} from './csrPdfcnUtils'
import { CsrPortraitMaterialsSchedule } from './csrPortraitMaterials'
import { CSR_PORTRAIT_DISPLAY_FONT } from './csrPortraitFonts'
import { resolveInkFonts } from './csrFormeKit'

/* Industrial control palette: black structure, yellow signal, neutral paper. */
const C = {
  ink: '#111111',
  graphite: '#E6E6E6',
  muted: '#555555',
  signal: '#F2B705',
  paper: '#ffffff',
  wash: '#EFEFEF',
  soft: '#D8D8D8',
}

/** A4 portrait content width in PDF points (210 mm minus 28 pt margins). */
const PAGE_W = 595.28 - 2 * 28

const BOLD = { fontWeight: 'bold' } as const
const MONO = { fontFamily: 'Courier', fontWeight: 'bold' } as const
/** Heavy display typography: section heads, masthead identity, model, capacity. */
const DISPLAY = { fontFamily: CSR_PORTRAIT_DISPLAY_FONT } as const

const labelStyle: Style = {
  fontSize: 5.6,
  fontWeight: 'bold',
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
}

const bodyStyle: Style = { fontSize: 7.9, lineHeight: 1.27, color: C.ink }

type Pt = [number, number]

/** Clip a polygon to the vertical band x ∈ [0, max] (Sutherland–Hodgman). */
function clipX(poly: Pt[], max: number): Pt[] {
  const clip = (pts: Pt[], inside: (p: Pt) => boolean, cut: (a: Pt, b: Pt) => Pt) => {
    const out: Pt[] = []
    pts.forEach((cur, i) => {
      const prev = pts[(i + pts.length - 1) % pts.length]
      if (inside(cur)) {
        if (!inside(prev)) out.push(cut(prev, cur))
        out.push(cur)
      } else if (inside(prev)) out.push(cut(prev, cur))
    })
    return out
  }
  const at = (x: number) => (a: Pt, b: Pt): Pt => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])]
  let r = clip(poly, (p) => p[0] >= 0, at(0))
  if (r.length) r = clip(r, (p) => p[0] <= max, at(max))
  return r
}

/**
 * Diagonal hazard band drawn as vector polygons, so it survives grayscale
 * printing and every viewer (no gradients).
 */
const HazardStripe: React.FC<{ width?: number; height?: number; step?: number }> = ({
  width = PAGE_W,
  height = 7,
  step = 12,
}) => {
  const shapes: string[] = [`<rect x="0" y="0" width="${width}" height="${height}" fill="${C.signal}"/>`]
  for (let x = -height; x < width; x += step) {
    const w = step / 2
    const poly = clipX(
      [
        [x, height],
        [x + w, height],
        [x + w + height, 0],
        [x + height, 0],
      ],
      width,
    )
    if (poly.length > 2) {
      shapes.push(
        `<polygon points="${poly.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')}" fill="${C.ink}"/>`,
      )
    }
  }
  return <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} content={shapes.join('')} alt="" />
}

const SectionHead: React.FC<{ no: string; title: string; aside?: string; inTable?: boolean }> = ({
  no,
  title,
  aside,
  inTable,
}) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-end',
      borderTopWidth: 3.4,
      borderTopColor: C.ink,
      paddingTop: 1,
      paddingBottom: inTable ? 5 : 0,
      marginTop: inTable ? 0 : 4.5,
      marginBottom: inTable ? 0 : 1,
    }}
  >
    <Text style={{ ...BOLD, ...DISPLAY, fontSize: 14, width: 26, color: C.ink }}>{no}</Text>
    <Text style={{ ...BOLD, ...DISPLAY, fontSize: 8.6, textTransform: 'uppercase', flex: 1, paddingBottom: 1.5 }}>
      {title}
    </Text>
    {aside ? <Text style={{ ...labelStyle, paddingBottom: 2 }}>{aside}</Text> : null}
  </View>
)

const Field: React.FC<{
  k: string
  v: string
  mono?: boolean
  last?: boolean
  exactLabel?: boolean
}> = ({ k, v, mono, last, exactLabel }) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      borderBottomWidth: last ? 0 : 0.8,
      borderBottomColor: C.ink,
    }}
  >
    <View
      style={{
        width: 70,
        backgroundColor: C.graphite,
        paddingHorizontal: 6,
        paddingVertical: 3,
        justifyContent: 'center',
      }}
    >
      <Text style={exactLabel ? { ...labelStyle, textTransform: 'none', letterSpacing: 0.2 } : labelStyle}>
        {k}
      </Text>
    </View>
    <View style={{ flex: 1, paddingHorizontal: 6, paddingVertical: 3, justifyContent: 'center' }}>
      <Text style={{ fontSize: 7.4, lineHeight: 1.25, ...BOLD, ...(mono ? MONO : {}) }}>{v}</Text>
    </View>
  </View>
)

const Masthead: React.FC<{ csr: CanonicalPreparedCsr }> = ({ csr }) => {
  const provider = csr.serviceProvider
  const hasIdentity = Boolean(provider.name || provider.subtitle || provider.address || provider.contact)

  return (
    <View>
      <View style={{ display: 'flex', flexDirection: 'row', backgroundColor: C.ink }}>
        {provider.logoUrl ? (
          <>
            <View style={{ width: 8 }} />
            <View
              style={{
                alignSelf: 'center',
                backgroundColor: C.paper,
                padding: 4,
              }}
            >
              {/* Height-led sizing reproduces the reference lockup scale and
                  keeps every tenant logo's own proportions. */}
              <BrandLogo logoUrl={provider.logoUrl} height={46} />
            </View>
            <View style={{ width: 10 }} />
          </>
        ) : null}

        <View style={{ flex: 1, paddingTop: 8, paddingRight: 8, paddingBottom: 4 }}>
          {hasIdentity ? (
            <View>
              {provider.name ? (
                <Text style={{ ...BOLD, ...DISPLAY, fontSize: 14, color: C.paper }}>{provider.name}</Text>
              ) : null}
              {provider.subtitle ? (
                <Text style={{ fontSize: 7.2, color: C.soft, marginTop: 2 }}>{provider.subtitle}</Text>
              ) : null}
              {provider.address ? (
                <Text style={{ fontSize: 7.2, color: C.soft, marginTop: 3 }}>{provider.address}</Text>
              ) : null}
              {provider.contact ? (
                <Text style={{ fontSize: 7.2, color: C.soft, marginTop: 1 }}>{provider.contact}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View
          style={{
            width: 186,
            backgroundColor: C.signal,
            paddingHorizontal: 11,
            paddingVertical: 6,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ ...BOLD, ...DISPLAY, fontSize: 9.4, textTransform: 'uppercase' }}>
            Customer Service Report
          </Text>
          <Text style={{ ...MONO, fontSize: 14, marginVertical: 4 }}>{dash(csr.csrNumber)}</Text>
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ ...BOLD, fontSize: 7.6, textTransform: 'uppercase' }}>{dash(csr.date)}</Text>
            {csr.status ? (
              <Text style={{ ...BOLD, fontSize: 7.6, textTransform: 'uppercase' }}>{csr.status}</Text>
            ) : null}
          </View>
        </View>
      </View>
      <HazardStripe />
    </View>
  )
}

const Panel: React.FC<{ children: React.ReactNode; style?: Style }> = ({ children, style }) => (
  <View style={{ borderWidth: 2.2, borderColor: C.ink, ...style }}>{children}</View>
)

const ClientPanel: React.FC<{ csr: CanonicalPreparedCsr }> = ({ csr }) => (
  <View style={{ flex: 1.1 }}>
    <SectionHead no="01" title="Client Information" />
    <View wrap={false}>
      <Panel>
        <View style={{ paddingHorizontal: 7, paddingVertical: 5, borderBottomWidth: 2.2, borderBottomColor: C.ink }}>
          <Text style={{ ...BOLD, ...DISPLAY, fontSize: 10 }}>{dash(csr.client.name)}</Text>
        </View>
        <Field k="Address" v={dash(csr.client.address)} />
        <Field k="Call type" v={dash(csr.callTypeDisplay)} />
        <Field k="Service basis" v={dash(csr.serviceBasis)} />
        <Field k="Service date" v={formatServiceDate(csr.serviceWindow, csr.date)} mono />
        {csr.client.accountRef ? <Field k="Account" v={csr.client.accountRef} mono /> : null}
        {csr.client.poNumber ? <Field k="PO number" v={csr.client.poNumber} mono /> : null}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: C.ink,
            paddingHorizontal: 7,
            paddingVertical: 5,
          }}
        >
          <Text style={{ ...labelStyle, color: '#CCCCCC', paddingBottom: 0 }}>System state</Text>
          <Text style={{ ...BOLD, fontSize: 10, color: C.signal, textTransform: 'uppercase' }}>
            {dash(csr.systemDownDisplay)}
          </Text>
        </View>
      </Panel>
    </View>
  </View>
)

const EquipmentPanel: React.FC<{ csr: CanonicalPreparedCsr }> = ({ csr }) => {
  const e = csr.equipment
  const location = [csr.location.site, csr.location.subLocation].filter(Boolean).join(', ')

  return (
    <View style={{ flex: 1 }}>
      <SectionHead no="02" title="Equipment Information" />
      <View wrap={false}>
        <Panel>
          <View style={{ display: 'flex', flexDirection: 'row', borderBottomWidth: 2.2, borderBottomColor: C.ink }}>
            <View
              style={{
                flex: 1,
                paddingHorizontal: 7,
                paddingVertical: 5,
                borderRightWidth: 2.2,
                borderRightColor: C.ink,
              }}
            >
              <Text style={labelStyle}>Make &amp; model</Text>
              {e.make && e.model ? <Text style={{ ...BOLD, fontSize: 7.6, marginTop: 1 }}>{e.make}</Text> : null}
              <Text style={{ ...BOLD, ...DISPLAY, fontSize: 18, marginTop: 1 }}>
                {e.model || e.make || '-'}
              </Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 7, paddingVertical: 5 }}>
              <Text style={labelStyle}>Rated capacity</Text>
              <Text style={{ ...BOLD, ...DISPLAY, fontSize: 13, marginTop: 1 }}>{dash(e.capacity)}</Text>
              <Text style={{ ...labelStyle, marginTop: 5 }}>Equipment type</Text>
              <Text style={{ ...BOLD, fontSize: 7.6, marginTop: 1 }}>{dash(e.type)}</Text>
            </View>
          </View>
          <Field k="Serial no." v={dash(e.serialNo)} mono />
          <Field k="Engine no." v={dash(e.engineNo)} mono />
          <Field k={csr.location.label} v={location || '-'} last exactLabel />
        </Panel>
      </View>
    </View>
  )
}

const Readings: React.FC<{ csr: CanonicalPreparedCsr }> = ({ csr }) => (
  <View wrap={false}>
    <SectionHead no="03" title="Operational Readings" />
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
        borderWidth: 2.2,
        borderColor: C.ink,
      }}
    >
      {READING_FIELDS.map((field, idx) => {
        const reading = csr.readings[field.key]
        const hasValue = Boolean(reading.value)
        return (
          <View
            key={field.key}
            style={{
              paddingTop: 3.5,
              paddingHorizontal: 6,
              paddingBottom: 3,
              borderLeftWidth: idx === 0 ? 0 : 0.8,
              borderLeftColor: C.ink,
            }}
          >
            <Text style={labelStyle}>{field.label}</Text>
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 }}>
              <Text style={{ ...BOLD, fontSize: 12.5 }}>{dash(reading.value)}</Text>
              {hasValue && reading.unit ? (
                <Text style={{ ...BOLD, fontSize: 6.8, marginLeft: 2, paddingBottom: 1.5 }}>{reading.unit}</Text>
              ) : null}
            </View>
          </View>
        )
      })}
    </View>
  </View>
)

const Narrative: React.FC<{
  no: string
  title: string
  text: string
  variant?: 'plain' | 'defects' | 'remarks'
}> = ({ no, title, text, variant = 'plain' }) => (
  <View>
    <SectionHead no={no} title={title} />
    {variant === 'plain' ? <Text style={bodyStyle}>{dash(text)}</Text> : null}
    {variant === 'defects' ? (
      <View style={{ borderWidth: 1, borderLeftWidth: 5, borderColor: C.ink, paddingHorizontal: 7, paddingVertical: 5 }}>
        <Text style={bodyStyle}>{dash(text)}</Text>
      </View>
    ) : variant === 'remarks' ? (
      <View style={{ borderWidth: 2, borderColor: C.ink, backgroundColor: C.graphite, paddingHorizontal: 7, paddingVertical: 5 }}>
        <Text style={bodyStyle}>{dash(text)}</Text>
      </View>
    ) : null}
  </View>
)

const Narratives: React.FC<{ csr: CanonicalPreparedCsr }> = ({ csr }) => (
  <View style={{ display: 'flex', flexDirection: 'row', gap: 14 }}>
    <View style={{ flex: 1 }}>
      <Narrative no="04" title="Problem Reported" text={csr.narratives.problemReported} />
      <Narrative no="05" title="Service Rendered" text={csr.narratives.serviceRendered} />
    </View>
    <View style={{ flex: 1 }}>
      <Narrative no="06" title="Observations & Defects Found" text={csr.narratives.defectsFound} variant="defects" />
      <Narrative no="07" title="Engineer's Remarks" text={csr.narratives.engineerRemarks} variant="remarks" />
    </View>
  </View>
)

const SignLine: React.FC<{ k: string; v?: string | null; valueStyle?: Style }> = ({ k, v, valueStyle }) => (
  <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: 8, height: 14 }}>
    <Text style={{ ...labelStyle, width: 62, paddingBottom: 2 }}>{k}</Text>
    <View
      style={{
        flex: 1,
        borderBottomWidth: 0.8,
        borderBottomColor: C.ink,
        paddingBottom: 2,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <Text style={{ ...BOLD, fontSize: 7.8, ...valueStyle }}>{v || ' '}</Text>
    </View>
  </View>
)

const SignPanel: React.FC<{ title: string; block: CsrSignOffBlock; valueStyle?: Style }> = ({ title, block, valueStyle }) => (
  <View wrap={false} style={{ flex: 1, borderWidth: 2.2, borderColor: C.ink, paddingBottom: 4 }}>
    <View style={{ backgroundColor: C.ink, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ ...BOLD, fontSize: 7, color: C.paper, textTransform: 'uppercase', letterSpacing: 0.7 }}>
        {title}
      </Text>
    </View>
    <Text style={{ ...labelStyle, marginTop: 2, marginHorizontal: 8 }}>Signature</Text>
    <View style={{ marginHorizontal: 8 }}>
      <SignatureStage signatureUrl={block.signatureUrl} height={42} lineColor={C.ink} />
    </View>
    <SignLine k="Full name" v={block.printedName} valueStyle={valueStyle} />
    <SignLine k="Designation" v={block.designation} valueStyle={valueStyle} />
    <SignLine k="Date" v={block.signingDate} valueStyle={valueStyle} />
  </View>
)

export const CsrPortraitReferenceTemplate: React.FC<{
  envelope: PdfcnDocumentEnvelope<CanonicalPreparedCsr>
}> = ({ envelope }) => {
  const csr = envelope.data
  const provider = csr.serviceProvider
  const materialCount = csr.materials.length
  const ink = resolveInkFonts((envelope.metadata?.designPreset as import('@/lib/pdfDesignPreset').PdfDesignPreset | null) ?? null)
  const valueStyle: Style = { fontFamily: ink.fillableFont, fontWeight: 'bold', color: ink.ink }

  return (
    <Document
      title={`${csr.csrNumber || 'CSR'} — Customer Service Report`}
      author={provider.name || undefined}
      lang="en-NG"
      style={{ fontFamily: 'Helvetica', color: C.ink }}
    >
      <Page
        size="A4"
        margin={{ top: 26, right: 28, bottom: 34, left: 28 }}
        style={{ backgroundColor: C.paper, fontFamily: 'Helvetica', color: C.ink }}
      >
        <Masthead csr={csr} />

        {/* Forme omits a Fixed footer from the first page when it is declared
            after a table that wraps, so keep it ahead of the flowing content. */}
        <Fixed
          position="footer"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: 5,
            borderTopWidth: 0.6,
            borderTopColor: C.soft,
          }}
        >
          <Text style={{ flex: 1, fontSize: 6.6, color: C.muted }}>
            Page {'{{pageNumber}}'} of {'{{totalPages}}'}
          </Text>
          <Text style={{ flex: 1, fontSize: 6.6, color: C.muted, textAlign: 'center' }}>
            {dash(csr.csrNumber)}
          </Text>
          <Text style={{ flex: 1, fontSize: 6.6, color: C.muted, textAlign: 'right' }}>
            {provider.name || ''}
          </Text>
        </Fixed>

        <View style={{ display: 'flex', flexDirection: 'row', gap: 14, marginTop: 1 }}>
          <ClientPanel csr={csr} />
          <EquipmentPanel csr={csr} />
        </View>

        <Readings csr={csr} />
        <Narratives csr={csr} />

        <CsrPortraitMaterialsSchedule
          materials={csr.materials}
          heading={
            <SectionHead
              no="08"
              title="Parts & Materials Schedule"
              aside={materialCount > 0 ? `${materialCount} ${materialCount === 1 ? 'item' : 'items'}` : undefined}
            />
          }
          tableHeading={
            <SectionHead
              no="08"
              title="Parts & Materials Schedule"
              aside={materialCount > 0 ? `${materialCount} ${materialCount === 1 ? 'item' : 'items'}` : undefined}
              inTable
            />
          }
        />

        <View wrap={false} style={{ marginTop: 3 }}>
          <SectionHead no="09" title="Sign-off" />
          <View style={{ display: 'flex', flexDirection: 'row', gap: 14 }}>
            <SignPanel title="Service Engineer" block={csr.signatories.serviceEngineer} valueStyle={valueStyle} />
            <SignPanel title="Client Representative" block={csr.signatories.clientRepresentative} valueStyle={valueStyle} />
          </View>
        </View>
      </Page>
    </Document>
  )
}
