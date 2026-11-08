import React from 'react'
import { Cell, Image, Row, Table, Text, View } from '@formepdf/react'
import type { CommercialDocumentData } from '../../industryAdapter'
import { glyphRuns } from '../glyphs'
import { buildPartyLines } from '../../engine'
import {
  LANDSCAPE_TOKENS as C,
  type LandscapeScale,
  type Block,
  hasText,
  weightedColumnWidths,
} from './landscapeTokens'

export function LandscapeCoordinateRuler({
  scale,
  borderTop = false,
  borderBottom = false,
}: {
  scale: LandscapeScale
  borderTop?: boolean
  borderBottom?: boolean
}) {
  const cells = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  return (
    <View
      style={{
        flexDirection: 'row',
        height: 10,
        backgroundColor: C.tint,
        borderTopWidth: borderTop ? 0.4 : 0,
        borderTopColor: C.lineMed,
        borderBottomWidth: borderBottom ? 0.4 : 0,
        borderBottomColor: C.lineMed,
      }}
    >
      {cells.map((num, i) => (
        <View
          key={num}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            borderRightWidth: i === cells.length - 1 ? 0 : 0.3,
            borderRightColor: C.line,
          }}
        >
          <Text
            style={{
              fontFamily: scale.font,
              fontSize: 4.4,
              fontWeight: 700,
              color: C.slate,
            }}
          >
            {num}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function FieldLabel({
  children,
  scale,
  tone = C.blue,
}: {
  children: React.ReactNode
  scale: LandscapeScale
  tone?: string
}) {
  return (
    <Text
      style={{
        fontFamily: scale.font,
        fontSize: scale.micro,
        fontWeight: 700,
        letterSpacing: 0.9,
        textTransform: 'uppercase',
        color: tone,
        marginBottom: 3,
      }}
    >
      {children}
    </Text>
  )
}

export function SectionBand({
  title,
  meta,
  scale,
  accent,
}: {
  title: string
  meta?: string
  scale: LandscapeScale
  accent: string
}) {
  return (
    <View
      style={{
        backgroundColor: C.cobalt,
        borderWidth: 0.8,
        borderColor: C.navy,
        paddingTop: scale.pad(4),
        paddingBottom: scale.pad(4),
        paddingLeft: 8,
        paddingRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 5, height: 5, backgroundColor: accent, marginRight: 6 }} />
        <Text
          style={{
            fontFamily: scale.font,
            fontSize: scale.micro + 1,
            fontWeight: 700,
            color: '#FFFFFF',
            textTransform: 'uppercase',
            letterSpacing: 1.1,
          }}
        >
          {title}
        </Text>
      </View>
      {meta ? (
        <Text
          style={{
            fontFamily: scale.font,
            fontSize: scale.micro,
            color: C.line,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          {meta}
        </Text>
      ) : null}
    </View>
  )
}

export function CompanyBlock({
  company,
  showTagline,
  scale,
}: {
  company: NonNullable<CommercialDocumentData['company']>
  showTagline: boolean
  scale: LandscapeScale
}) {
  const addressLines = [company.address, company.cityState].filter(hasText)
  const contactParts = [company.phone, company.email, company.website].filter(hasText)
  const customInfo = company.customInfo.filter((entry) => hasText(entry.value))

  return (
    <View>
      <FieldLabel scale={scale}>From</FieldLabel>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {hasText(company.companyLogoUrl) ? (
          <View
            style={{
              width: 38,
              height: 38,
              borderWidth: 0.5,
              borderColor: C.line,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: scale.gap(6),
              backgroundColor: C.paper,
            }}
          >
            <Image src={company.companyLogoUrl} style={{ width: 32, height: 32 }} alt="" />
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          {hasText(company.name) ? (
            <Text
              style={{
                fontFamily: scale.font,
                fontSize: scale.body + 2.2,
                fontWeight: 700,
                color: C.navy,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                lineHeight: 1.15,
              }}
            >
              {glyphRuns(company.name, scale.font)}
            </Text>
          ) : null}
          {showTagline && hasText(company.tagline) ? (
            <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, color: C.blue, marginTop: 1, lineHeight: 1.3 }}>
              {glyphRuns(company.tagline, scale.font)}
            </Text>
          ) : null}
          {customInfo.map((entry, index) => (
            <Text
              key={`ci-${entry.label}-${index}`}
              style={{
                fontFamily: scale.font,
                fontSize: scale.micro + 0.2,
                fontWeight: 700,
                color: C.cobalt,
                marginTop: 1,
                lineHeight: 1.3,
              }}
            >
              {glyphRuns([entry.label, entry.value].filter(hasText).join(': '), scale.font)}
            </Text>
          ))}
        </View>
      </View>
      {addressLines.length > 0 || contactParts.length > 0 ? (
        <View style={{ borderTopWidth: 0.3, borderTopColor: C.line, marginTop: scale.pad(4), paddingTop: scale.pad(3) }}>
          {addressLines.map((line, index) => (
            <Text key={`co-${index}`} style={{ fontFamily: scale.font, fontSize: scale.bodySmall, lineHeight: 1.3, color: C.slate }}>
              {glyphRuns(line, scale.font)}
            </Text>
          ))}
          {contactParts.length > 0 ? (
            <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, lineHeight: 1.35, color: C.slate, marginTop: 1 }}>
              {glyphRuns(contactParts.join(' · '), scale.font)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

export function DocumentIdentity({
  data,
  scale,
  accent,
}: {
  data: CommercialDocumentData
  scale: LandscapeScale
  accent: string
}) {
  return (
    <View>
      <Text
        style={{
          fontFamily: scale.font,
          fontSize: scale.title,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: '#FFFFFF',
          lineHeight: 1.05,
        }}
      >
        {glyphRuns(data.title, scale.font)}
      </Text>
      <View style={{ width: 42, height: 2, backgroundColor: accent, marginTop: 4, marginBottom: 5 }} />
      {data.customTitle ? (
        <Text
          style={{
            fontFamily: scale.font,
            fontSize: scale.body,
            fontWeight: 700,
            color: C.headerInk,
            borderLeftWidth: 1.5,
            borderLeftColor: accent,
            paddingLeft: 5,
            lineHeight: 1.25,
          }}
        >
          {glyphRuns(data.customTitle, scale.font)}
        </Text>
      ) : null}
      {hasText(data.documentNumber) ? (
        <View style={{ marginTop: scale.pad(5) }}>
          <Text
            style={{
              fontFamily: scale.font,
              fontSize: scale.micro,
              fontWeight: 700,
              letterSpacing: 0.9,
              textTransform: 'uppercase',
              color: C.line,
            }}
          >
            {data.documentNumberLabel}
          </Text>
          <Text
            style={{
              fontFamily: scale.font,
              fontSize: scale.number,
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: 0.4,
              lineHeight: 1.1,
              marginTop: 1,
            }}
          >
            {glyphRuns(data.documentNumber, scale.font)}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

export function ClientBlock({
  client,
  scale,
}: {
  client: NonNullable<CommercialDocumentData['client']>
  scale: LandscapeScale
}) {
  const lines = buildPartyLines(client).filter((line) => line.type !== 'name')

  return (
    <View>
      <FieldLabel scale={scale}>Client</FieldLabel>
      {hasText(client.name) ? (
        <Text
          style={{
            fontFamily: scale.font,
            fontSize: scale.body + 2,
            fontWeight: 700,
            color: C.navy,
            lineHeight: 1.22,
            marginBottom: 2,
          }}
        >
          {glyphRuns(client.name, scale.font)}
        </Text>
      ) : null}
      {lines.map((line) => (
        <Text
          key={`cl-${line.key}`}
          style={{
            fontFamily: scale.font,
            fontSize: scale.bodySmall,
            lineHeight: 1.35,
            color: line.type === 'custom' ? C.cobalt : C.slate,
            fontWeight: line.type === 'custom' ? 700 : 400,
            marginBottom: line.type === 'custom' ? 1 : 0,
          }}
        >
          {glyphRuns(line.value, scale.font)}
        </Text>
      ))}
    </View>
  )
}

export function DetailsBlock({
  pairs,
  scale,
}: {
  pairs: Array<{ label: string; value: string }>
  scale: LandscapeScale
}) {
  return (
    <View>
      <FieldLabel scale={scale}>Document Details</FieldLabel>
      {pairs.map((pair, index) => (
        <View
          key={`meta-${pair.label}-${index}`}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: scale.pad(2.5),
          }}
        >
          {hasText(pair.label) ? (
            <Text
              style={{
                width: 76,
                fontFamily: scale.font,
                fontSize: scale.micro,
                fontWeight: 700,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                color: C.slate,
                lineHeight: 1.3,
              }}
            >
              {pair.label}
            </Text>
          ) : null}
          <Text
            style={{
              flex: 1,
              fontFamily: scale.font,
              fontSize: scale.bodySmall,
              fontWeight: 700,
              color: C.navy,
              textAlign: 'right',
              lineHeight: 1.3,
              marginLeft: hasText(pair.label) ? 6 : 0,
            }}
          >
            {glyphRuns(pair.value, scale.font)}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function LandscapeTopBar({
  rowOneBlocks,
  rowTwoBlocks,
  tableWidth,
  scale,
}: {
  rowOneBlocks: Block[]
  rowTwoBlocks: Block[]
  tableWidth: number
  scale: LandscapeScale
}) {
  return (
    <View wrap={false} style={{ marginBottom: scale.gap(8) }}>
      <Table
        columns={weightedColumnWidths(rowOneBlocks, tableWidth)}
        style={{ borderWidth: 0.8, borderColor: C.navy }}
      >
        <Row>
          {rowOneBlocks.map((block, index) => (
            <Cell
              key={block.key}
              style={{
                padding: scale.pad(8),
                backgroundColor: block.key === 'document' ? C.navy : C.paper,
                borderRightWidth: index === rowOneBlocks.length - 1 ? 0 : 0.8,
                borderRightColor: C.navy,
              }}
            >
              {block.node}
            </Cell>
          ))}
        </Row>
      </Table>

      {rowTwoBlocks.length > 0 ? (
        <Table
          columns={weightedColumnWidths(rowTwoBlocks, tableWidth)}
          style={{ borderWidth: 0.8, borderColor: C.navy, marginTop: scale.gap(4) }}
        >
          <Row>
            {rowTwoBlocks.map((block, index) => (
              <Cell
                key={block.key}
                style={{
                  padding: scale.pad(7),
                  backgroundColor: block.key === 'details' ? C.tint : C.paper,
                  borderRightWidth: index === rowTwoBlocks.length - 1 ? 0 : 0.8,
                  borderRightColor: C.navy,
                }}
              >
                {block.node}
              </Cell>
            ))}
          </Row>
        </Table>
      ) : null}
    </View>
  )
}
