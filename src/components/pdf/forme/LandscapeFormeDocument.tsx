import React from 'react'
import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'
import type { CommercialDocumentData } from '../industryAdapter'
import { isFormeSupportedFamily } from './fonts'
import { glyphRuns } from './glyphs'
import { parseGroupHeader } from './industrialLayout'
import { renderFormeRichText } from './formeRichText'
import { parseRichText } from '../core/richText'
import { buildAttachmentItems } from '../engine/attachments'
import {
  buildPartyLines,
  buildTotalsLines,
  getMainTotal,
  getBalanceDue,
  getAmountInWords,
  buildAdvanceSummary,
} from '../engine'
import {
  segmentCommercialRows,
  countSegmentLines,
  countSegmentsWithGroups,
  type CommercialSegment,
} from './commercialSegments'
import {
  resolveCommercialTableWidths,
  resolveCellAlign,
  readDescription,
  displayCellValue,
} from './commercialLayout'

export interface LandscapeFormeDocumentProps {
  data: CommercialDocumentData
  compact?: boolean
}

/** Palette sampled from commercial-landscape.html (CSR drawing family). */
export const LANDSCAPE_TOKENS = {
  navy: '#07192b',
  cobalt: '#0f3156',
  blue: '#1d568a',
  slate: '#4f667a',
  line: '#9cb4c9',
  grid: '#dce6ef',
  tint: '#edf3f8',
  tint2: '#dde8f2',
  amber: '#b84a14',
  amberSoft: '#fbeee8',
  paper: '#ffffff',
  inkSoft: '#3f5670',
  rowTint: '#f7fafc',
  headerInk: '#dbe8f2',
} as const

const PAGE_WIDTH = 841.89
const PAGE_HEIGHT = 595.28
const MARGIN_H = 22
const TABLE_BORDER = 0.71

const LANDSCAPE_PREFERRED_WIDTHS: Record<string, number> = {
  num: 30,
  quantity: 44,
  unit: 52,
  make: 64,
  unit_price: 88,
  amount: 98,
  install_rate: 80,
  vat_rate: 44,
  discount_rate: 50,
}

const LANDSCAPE_MIN_WIDTHS: Record<string, number> = {
  num: 24,
  quantity: 36,
  unit: 42,
  make: 50,
  unit_price: 74,
  amount: 84,
  install_rate: 66,
  vat_rate: 38,
  discount_rate: 42,
}

type BankDetails = NonNullable<CommercialDocumentData['paymentDetails']>
type NoteSection = NonNullable<CommercialDocumentData['notes']>
type SummaryRow = { label: string; value: string; isDeduction?: boolean }

type LandscapeScale = {
  font: string
  compact: boolean
  body: number
  bodySmall: number
  micro: number
  title: number
  number: number
  hero: number
  pad: (value: number) => number
  gap: (value: number) => number
}

type Block = {
  key: string
  weight: number
  node: React.ReactNode
}

function resolveFont(choice: string | null | undefined, fallback: string): string {
  return choice && isFormeSupportedFamily(choice) ? choice : fallback
}

function hasText(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function createScale(font: string, compact: boolean): LandscapeScale {
  const size = (base: number) => Math.round((compact ? base * 0.9 : base) * 10) / 10
  return {
    font,
    compact,
    body: size(6.5),
    bodySmall: size(5.8),
    micro: size(4.9),
    title: size(20),
    number: size(13),
    hero: size(18),
    pad: (value) => (compact ? Math.max(1, Math.round(value * 0.75 * 2) / 2) : value),
    gap: (value) => (compact ? Math.max(2, Math.round(value * 0.72)) : value),
  }
}

function weightedColumnWidths(blocks: Block[], width: number) {
  const totalWeight = blocks.reduce((sum, block) => sum + block.weight, 0)
  let consumed = 0
  return blocks.map((block, index) => {
    if (index === blocks.length - 1) return { width: { fixed: Math.round((width - consumed) * 100) / 100 } }
    const value = Math.round(((width * block.weight) / totalWeight) * 100) / 100
    consumed += value
    return { width: { fixed: value } }
  })
}

function FieldLabel({
  children,
  scale,
  tone = LANDSCAPE_TOKENS.blue,
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

function SectionLabel({ children, scale }: { children: React.ReactNode; scale: LandscapeScale }) {
  return (
    <Text
      style={{
        fontFamily: scale.font,
        fontSize: scale.micro + 0.2,
        fontWeight: 700,
        letterSpacing: 0.9,
        textTransform: 'uppercase',
        color: LANDSCAPE_TOKENS.cobalt,
        borderBottomWidth: 0.3,
        borderBottomColor: LANDSCAPE_TOKENS.line,
        paddingBottom: 2,
        marginBottom: 4,
      }}
    >
      {children}
    </Text>
  )
}

function SectionBand({
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
        backgroundColor: LANDSCAPE_TOKENS.cobalt,
        borderWidth: 0.8,
        borderColor: LANDSCAPE_TOKENS.navy,
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
        <Text style={{ fontFamily: scale.font, fontSize: scale.micro + 1, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1.1 }}>
          {title}
        </Text>
      </View>
      {meta ? (
        <Text style={{ fontFamily: scale.font, fontSize: scale.micro, color: LANDSCAPE_TOKENS.line, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          {meta}
        </Text>
      ) : null}
    </View>
  )
}

function CompanyBlock({
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
              width: 40,
              height: 40,
              borderWidth: 0.5,
              borderColor: LANDSCAPE_TOKENS.line,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: scale.gap(6),
              backgroundColor: LANDSCAPE_TOKENS.paper,
            }}
          >
            <Image src={company.companyLogoUrl} style={{ width: 34, height: 34 }} alt="" />
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          {hasText(company.name) ? (
            <Text style={{ fontFamily: scale.font, fontSize: scale.body + 2.4, fontWeight: 700, color: LANDSCAPE_TOKENS.navy, textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1.15 }}>
              {glyphRuns(company.name, scale.font)}
            </Text>
          ) : null}
          {showTagline && hasText(company.tagline) ? (
            <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, color: LANDSCAPE_TOKENS.blue, marginTop: 1, lineHeight: 1.3 }}>
              {glyphRuns(company.tagline, scale.font)}
            </Text>
          ) : null}
          {customInfo.map((entry, index) => (
            <Text key={`ci-${entry.label}-${index}`} style={{ fontFamily: scale.font, fontSize: scale.micro + 0.2, fontWeight: 700, color: LANDSCAPE_TOKENS.cobalt, marginTop: 1, lineHeight: 1.3 }}>
              {glyphRuns([entry.label, entry.value].filter(hasText).join(': '), scale.font)}
            </Text>
          ))}
        </View>
      </View>
      {addressLines.length > 0 || contactParts.length > 0 ? (
        <View style={{ borderTopWidth: 0.3, borderTopColor: LANDSCAPE_TOKENS.line, marginTop: scale.pad(4), paddingTop: scale.pad(3) }}>
          {addressLines.map((line, index) => (
            <Text key={`co-${index}`} style={{ fontFamily: scale.font, fontSize: scale.bodySmall, lineHeight: 1.3, color: LANDSCAPE_TOKENS.slate }}>
              {glyphRuns(line, scale.font)}
            </Text>
          ))}
          {contactParts.length > 0 ? (
            <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, lineHeight: 1.35, color: LANDSCAPE_TOKENS.slate, marginTop: 1 }}>
              {glyphRuns(contactParts.join(' · '), scale.font)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function DocumentIdentity({
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
      <View style={{ width: 46, height: 2, backgroundColor: accent, marginTop: 4, marginBottom: 5 }} />
      {data.customTitle ? (
        <Text
          style={{
            fontFamily: scale.font,
            fontSize: scale.body,
            fontWeight: 700,
            color: LANDSCAPE_TOKENS.headerInk,
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
        <View style={{ marginTop: scale.pad(6) }}>
          <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase', color: LANDSCAPE_TOKENS.line }}>
            {data.documentNumberLabel}
          </Text>
          <Text style={{ fontFamily: scale.font, fontSize: scale.number, fontWeight: 700, color: '#FFFFFF', letterSpacing: 0.4, lineHeight: 1.1, marginTop: 1 }}>
            {glyphRuns(data.documentNumber, scale.font)}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function ClientBlock({
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
        <Text style={{ fontFamily: scale.font, fontSize: scale.body + 2, fontWeight: 700, color: LANDSCAPE_TOKENS.navy, lineHeight: 1.22, marginBottom: 2 }}>
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
            color: line.type === 'custom' ? LANDSCAPE_TOKENS.cobalt : LANDSCAPE_TOKENS.slate,
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

function DetailsBlock({
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
        <View key={`meta-${pair.label}-${index}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: scale.pad(2.6) }}>
          {hasText(pair.label) ? (
            <Text style={{ width: 76, fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: LANDSCAPE_TOKENS.slate, lineHeight: 1.3 }}>
              {pair.label}
            </Text>
          ) : null}
          <Text
            style={{
              flex: 1,
              fontFamily: scale.font,
              fontSize: scale.bodySmall,
              fontWeight: 700,
              color: LANDSCAPE_TOKENS.navy,
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

function ItemsTable({
  segment,
  data,
  tableColumns,
  scale,
  accent,
  showBand,
  bandMeta,
}: {
  segment: CommercialSegment
  data: CommercialDocumentData
  tableColumns: Array<{ width: { fixed: number } }>
  scale: LandscapeScale
  accent: string
  showBand: boolean
  bandMeta: string
}) {
  const parsed = segment.groupLabel ? parseGroupHeader(segment.groupLabel) : null
  const groupTitle = parsed?.title || segment.groupLabel || ''
  const groupKey = parsed?.key || null

  return (
    <Table
      columns={tableColumns}
      style={{ borderWidth: TABLE_BORDER, borderColor: LANDSCAPE_TOKENS.navy, marginBottom: scale.gap(7) }}
    >
      {showBand ? (
        <Row header>
          <Cell
            colSpan={data.table.columns.length}
            style={{
              backgroundColor: LANDSCAPE_TOKENS.cobalt,
              borderBottomWidth: 0.5,
              borderBottomColor: LANDSCAPE_TOKENS.navy,
              paddingTop: scale.pad(4),
              paddingBottom: scale.pad(4),
              paddingLeft: 8,
              paddingRight: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 5, height: 5, backgroundColor: accent, marginRight: 6 }} />
                <Text style={{ fontFamily: scale.font, fontSize: scale.micro + 1, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1.1 }}>
                  Items Schedule
                </Text>
              </View>
              <Text style={{ fontFamily: scale.font, fontSize: scale.micro, color: LANDSCAPE_TOKENS.line, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {bandMeta}
              </Text>
            </View>
          </Cell>
        </Row>
      ) : null}

      <Row header>
        {data.table.columns.map((column, index) => {
          const align = resolveCellAlign(column)
          const isFirst = index === 0
          const isLast = index === data.table.columns.length - 1
          return (
            <Cell
              key={`head-${column.key}`}
              style={{
                backgroundColor: LANDSCAPE_TOKENS.tint2,
                borderBottomWidth: 0.8,
                borderBottomColor: LANDSCAPE_TOKENS.navy,
                borderLeftWidth: isFirst ? TABLE_BORDER : 0.4,
                borderLeftColor: isFirst ? LANDSCAPE_TOKENS.navy : LANDSCAPE_TOKENS.line,
                borderRightWidth: isLast ? TABLE_BORDER : 0,
                borderRightColor: LANDSCAPE_TOKENS.navy,
                paddingTop: scale.pad(3.4),
                paddingBottom: scale.pad(3.4),
                paddingLeft: 5,
                paddingRight: 5,
              }}
            >
              <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color: LANDSCAPE_TOKENS.cobalt, textAlign: align }}>
                {column.label}
              </Text>
            </Cell>
          )
        })}
      </Row>

      {segment.groupHeader ? (
        <Row header>
          <Cell
            colSpan={data.table.columns.length}
            style={{
              backgroundColor: LANDSCAPE_TOKENS.tint,
              borderTopWidth: 1.2,
              borderTopColor: accent,
              borderBottomWidth: 0.5,
              borderBottomColor: LANDSCAPE_TOKENS.navy,
              paddingTop: scale.pad(4),
              paddingBottom: scale.pad(4),
              paddingLeft: 6,
              paddingRight: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
                {groupKey ? (
                  <View style={{ backgroundColor: LANDSCAPE_TOKENS.paper, paddingLeft: 4, paddingRight: 4, paddingTop: 1, paddingBottom: 1, marginRight: 6 }}>
                    <Text style={{ fontFamily: scale.font, fontSize: scale.micro + 1.5, fontWeight: 700, color: accent, letterSpacing: 0.6 }}>
                      {groupKey}
                    </Text>
                  </View>
                ) : null}
                {groupTitle ? (
                  <Text style={{ fontFamily: scale.font, fontSize: scale.body + 0.6, fontWeight: 700, color: LANDSCAPE_TOKENS.navy, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {glyphRuns(groupTitle, scale.font)}
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, color: LANDSCAPE_TOKENS.slate, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {segment.lines.length} {segment.lines.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </Cell>
        </Row>
      ) : null}

      {segment.lines.map((row, rowIndex) => (
        <Row key={`row-${segment.key}-${rowIndex}`}>
          {data.table.columns.map((column, columnIndex) => {
            const align = resolveCellAlign(column)
            const isFirst = columnIndex === 0
            const isLast = columnIndex === data.table.columns.length - 1
            const value = row.cells ? row.cells[column.key] : ''
            const cellStyle = {
              backgroundColor: rowIndex % 2 === 0 ? LANDSCAPE_TOKENS.paper : LANDSCAPE_TOKENS.rowTint,
              borderBottomWidth: 0.3,
              borderBottomColor: LANDSCAPE_TOKENS.grid,
              borderLeftWidth: isFirst ? TABLE_BORDER : 0,
              borderLeftColor: LANDSCAPE_TOKENS.navy,
              borderRightWidth: isLast ? TABLE_BORDER : 0,
              borderRightColor: LANDSCAPE_TOKENS.navy,
              paddingTop: scale.pad(3.4),
              paddingBottom: scale.pad(3.4),
              paddingLeft: 5,
              paddingRight: 5,
            } as const

            if (column.key === 'description') {
              const description = readDescription(value)
              return (
                <Cell key={`cell-${column.key}`} style={cellStyle}>
                  {description.main ? (
                    <Text style={{ fontFamily: scale.font, fontSize: scale.body + 0.6, fontWeight: 700, lineHeight: 1.3, color: LANDSCAPE_TOKENS.navy }}>
                      {glyphRuns(description.main, scale.font)}
                    </Text>
                  ) : null}
                  {description.sub ? (
                    <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, lineHeight: 1.36, color: LANDSCAPE_TOKENS.inkSoft, marginTop: description.main ? 1 : 0 }}>
                      {glyphRuns(description.sub, scale.font)}
                    </Text>
                  ) : null}
                  {row.imageUrl ? (
                    <View style={{ marginTop: scale.pad(3), width: 46, height: 24, borderWidth: 0.4, borderColor: LANDSCAPE_TOKENS.line, backgroundColor: LANDSCAPE_TOKENS.paper, alignItems: 'center', justifyContent: 'center' }}>
                      <Image src={row.imageUrl} style={{ width: 42, height: 20 }} alt="" />
                    </View>
                  ) : null}
                </Cell>
              )
            }

            const rawText = displayCellValue(value)
            const text = column.key === 'quantity'
              ? rawText.replace(/^(\d+(?:\.\d+)?)([a-zA-Z]+)$/, '$1 $2')
              : rawText
            return (
              <Cell key={`cell-${column.key}`} style={cellStyle}>
                <Text
                  style={{
                    fontFamily: scale.font,
                    fontSize: column.key === 'amount' ? scale.body + 0.2 : scale.bodySmall,
                    fontWeight: column.key === 'num' || column.key === 'amount' ? 700 : 400,
                    color: column.key === 'num' ? LANDSCAPE_TOKENS.blue : LANDSCAPE_TOKENS.navy,
                    textAlign: align,
                    lineHeight: 1.3,
                  }}
                >
                  {glyphRuns(text, scale.font)}
                </Text>
              </Cell>
            )
          })}
        </Row>
      ))}

      {segment.footer && segment.footer.showSubtotal && hasText(segment.footer.groupSubtotalValue) ? (
        <Row>
          <Cell
            colSpan={data.table.columns.length}
            style={{
              backgroundColor: LANDSCAPE_TOKENS.tint,
              borderTopWidth: 0.4,
              borderTopColor: LANDSCAPE_TOKENS.line,
              borderBottomWidth: TABLE_BORDER,
              borderBottomColor: LANDSCAPE_TOKENS.navy,
              paddingTop: scale.pad(3.6),
              paddingBottom: scale.pad(3.6),
              paddingLeft: 6,
              paddingRight: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: LANDSCAPE_TOKENS.cobalt }}>
                {segment.footer.groupSubtotalLabel || 'Subtotal'}
              </Text>
              <Text style={{ fontFamily: scale.font, fontSize: scale.body + 0.2, fontWeight: 700, color: LANDSCAPE_TOKENS.navy }}>
                {glyphRuns(segment.footer.groupSubtotalValue, scale.font)}
              </Text>
            </View>
          </Cell>
        </Row>
      ) : null}
    </Table>
  )
}

function TotalsLedger({
  lines,
  balanceDue,
  advanceSummary,
  scale,
  accent,
}: {
  lines: SummaryRow[]
  balanceDue: { label: string; value: string } | null
  advanceSummary: ReturnType<typeof buildAdvanceSummary>
  scale: LandscapeScale
  accent: string
}) {
  const hasAdvanceRows = Boolean(advanceSummary?.advanceAmount || advanceSummary?.balanceRemaining)

  return (
    <View>
      {lines.map((line, index) => {
        const isLast = index === lines.length - 1 && !balanceDue && !hasAdvanceRows
        return (
          <View
            key={`total-${line.label}-${index}`}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingTop: scale.pad(3.8),
              paddingBottom: scale.pad(3.8),
              borderBottomWidth: isLast ? 0 : 0.3,
              borderBottomColor: LANDSCAPE_TOKENS.grid,
              backgroundColor: line.isDeduction ? LANDSCAPE_TOKENS.amberSoft : undefined,
            }}
          >
            <Text style={{ flex: 1, fontFamily: scale.font, fontSize: scale.bodySmall, color: LANDSCAPE_TOKENS.navy, lineHeight: 1.3 }}>
              {glyphRuns(line.label, scale.font)}
            </Text>
            <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall + 0.2, fontWeight: 700, color: line.isDeduction ? accent : LANDSCAPE_TOKENS.navy, textAlign: 'right', marginLeft: 8 }}>
              {glyphRuns(line.value, scale.font)}
            </Text>
          </View>
        )
      })}
      {balanceDue ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingTop: scale.pad(4),
            paddingBottom: scale.pad(4),
            backgroundColor: LANDSCAPE_TOKENS.tint2,
            borderTopWidth: 0.8,
            borderTopColor: LANDSCAPE_TOKENS.navy,
            borderBottomWidth: hasAdvanceRows ? 0.3 : 0,
            borderBottomColor: LANDSCAPE_TOKENS.grid,
          }}
        >
          <Text style={{ flex: 1, fontFamily: scale.font, fontSize: scale.bodySmall + 0.2, fontWeight: 700, color: LANDSCAPE_TOKENS.navy }}>
            {glyphRuns(balanceDue.label, scale.font)}
          </Text>
          <Text style={{ fontFamily: scale.font, fontSize: scale.body + 0.2, fontWeight: 700, color: LANDSCAPE_TOKENS.navy, marginLeft: 8 }}>
            {glyphRuns(balanceDue.value, scale.font)}
          </Text>
        </View>
      ) : null}
      {hasAdvanceRows && advanceSummary ? (
        <View style={{ backgroundColor: LANDSCAPE_TOKENS.tint, paddingTop: scale.pad(4), paddingBottom: scale.pad(4), borderTopWidth: balanceDue ? 0 : 0.8, borderTopColor: LANDSCAPE_TOKENS.navy }}>
          {advanceSummary.advanceAmount ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: advanceSummary.balanceRemaining ? 2 : 0 }}>
              <Text style={{ flex: 1, fontFamily: scale.font, fontSize: scale.bodySmall, color: LANDSCAPE_TOKENS.slate }}>{advanceSummary.primaryLabel}</Text>
              <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, fontWeight: 700, color: LANDSCAPE_TOKENS.navy, marginLeft: 8 }}>{glyphRuns(advanceSummary.advanceAmount, scale.font)}</Text>
            </View>
          ) : null}
          {advanceSummary.balanceRemaining ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ flex: 1, fontFamily: scale.font, fontSize: scale.bodySmall, color: LANDSCAPE_TOKENS.slate }}>{advanceSummary.secondaryLabel}</Text>
              <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, fontWeight: 700, color: LANDSCAPE_TOKENS.navy, marginLeft: 8 }}>{glyphRuns(advanceSummary.balanceRemaining, scale.font)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function BankDetailsBlock({
  bankDetails,
  scale,
}: {
  bankDetails: BankDetails
  scale: LandscapeScale
}) {
  return (
    <View style={{ marginTop: scale.gap(6) }}>
      <FieldLabel scale={scale}>Bank Details</FieldLabel>
      <View style={{ borderWidth: 0.5, borderColor: LANDSCAPE_TOKENS.line, padding: scale.pad(6) }}>
        {hasText(bankDetails.bankName) ? (
          <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: LANDSCAPE_TOKENS.slate }}>
            {glyphRuns(bankDetails.bankName, scale.font)}
          </Text>
        ) : null}
        {hasText(bankDetails.accountNumber) ? (
          <Text style={{ fontFamily: scale.font, fontSize: scale.body + 2.6, fontWeight: 700, color: LANDSCAPE_TOKENS.navy, lineHeight: 1.2, marginTop: 1 }}>
            {glyphRuns(bankDetails.accountNumber, scale.font)}
          </Text>
        ) : null}
        {hasText(bankDetails.accountName) ? (
          <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, color: LANDSCAPE_TOKENS.slate, marginTop: 1, lineHeight: 1.3 }}>
            {glyphRuns(bankDetails.accountName, scale.font)}
          </Text>
        ) : null}
        {hasText(bankDetails.sortCode) ? (
          <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, color: LANDSCAPE_TOKENS.slate, lineHeight: 1.3 }}>
            {glyphRuns(bankDetails.sortCode, scale.font)}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

function SummaryPanel({
  mainTotal,
  amountInWords,
  bankDetails,
  scale,
  accent,
}: {
  mainTotal: { label: string; value: string } | null
  amountInWords: string
  bankDetails: BankDetails | null
  scale: LandscapeScale
  accent: string
}) {
  return (
    <View>
      {mainTotal ? (
        <View style={{ backgroundColor: LANDSCAPE_TOKENS.navy, borderLeftWidth: 3, borderLeftColor: accent, padding: scale.pad(8) }}>
          <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: LANDSCAPE_TOKENS.line }}>
            {mainTotal.label}
          </Text>
          <Text style={{ fontFamily: scale.font, fontSize: scale.hero, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1, marginTop: 2 }}>
            {glyphRuns(mainTotal.value, scale.font)}
          </Text>
        </View>
      ) : null}

      {amountInWords ? (
        <View style={{ backgroundColor: LANDSCAPE_TOKENS.tint, padding: scale.pad(7), borderLeftWidth: 3, borderLeftColor: mainTotal ? accent : LANDSCAPE_TOKENS.line }}>
          <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase', color: LANDSCAPE_TOKENS.blue, marginBottom: 2 }}>
            Amount in Words
          </Text>
          <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, lineHeight: 1.38, color: LANDSCAPE_TOKENS.inkSoft }}>
            {glyphRuns(amountInWords, scale.font)}
          </Text>
        </View>
      ) : null}

      {bankDetails ? <BankDetailsBlock bankDetails={bankDetails} scale={scale} /> : null}
    </View>
  )
}

function splitPlainNoteParagraph(text: string): string[] {
  const clauseParts = text.split(/(?=\bClause\s+\d{1,2}\s*:)|(?<=[.!?])\s+(?=\d{1,2}\.\s)/i)
  const chunks: string[] = []

  const pushLongPart = (part: string) => {
    let current = ''
    part.split(/(?<=[.!?])\s+(?=[A-Z(])/).forEach((sentence) => {
      const piece = sentence.trim()
      if (!piece) return
      if (current && current.length + piece.length + 1 > 600) {
        chunks.push(current)
        current = piece
      } else {
        current = current ? `${current} ${piece}` : piece
      }
    })
    if (current) chunks.push(current)
  }

  clauseParts.forEach((part) => {
    const trimmed = part.trim()
    if (!trimmed) return
    if (trimmed.length <= 800) chunks.push(trimmed)
    else pushLongPart(trimmed)
  })

  return chunks.length > 1 ? chunks : [text]
}

function NoteBody({ section, scale }: { section: NoteSection; scale: LandscapeScale }) {
  const content = String(section.content || '')
  const plainText = String(section.plainText || '')
  const paragraphStyle = { fontFamily: scale.font, fontSize: scale.bodySmall, lineHeight: 1.4, color: LANDSCAPE_TOKENS.inkSoft, marginBottom: 3 }

  const parsed = parseRichText(content || plainText)
  const singleParagraph = parsed.blocks.length === 1 && parsed.blocks[0].type === 'paragraph' ? parsed.blocks[0] : null
  const isUnmarked = Boolean(singleParagraph && singleParagraph.segments.every((segment) => !segment.bold && !segment.italic && !segment.underline))
  const rawText = singleParagraph && isUnmarked ? singleParagraph.segments.map((segment) => segment.text).join('') : ''

  if (isUnmarked && rawText.length > 700) {
    const chunks = splitPlainNoteParagraph(rawText)
    if (chunks.length > 1) {
      return (
        <View>
          {chunks.map((chunk, index) => (
            <Text key={`note-chunk-${index}`} style={{ ...paragraphStyle, marginBottom: 2 }}>
              {glyphRuns(chunk, scale.font)}
            </Text>
          ))}
        </View>
      )
    }
  }

  return renderFormeRichText(content || plainText, {
    font: scale.font,
    paragraphStyle,
    headingStyle: { fontFamily: scale.font, fontSize: scale.body, fontWeight: 700, color: LANDSCAPE_TOKENS.navy, lineHeight: 1.3, marginTop: 3 },
    listStyle: { marginTop: 2, marginBottom: 3 },
    listItemRowStyle: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
    listMarkerStyle: { fontFamily: scale.font, fontSize: scale.bodySmall, lineHeight: 1.35, color: LANDSCAPE_TOKENS.blue, width: 9 },
    listItemTextStyle: { flex: 1, fontFamily: scale.font, fontSize: scale.bodySmall, lineHeight: 1.4, color: LANDSCAPE_TOKENS.inkSoft },
  })
}

function NotesSection({
  notes,
  terms,
  width,
  scale,
  accent,
}: {
  notes: NoteSection | null
  terms: NoteSection | null
  width: number
  scale: LandscapeScale
  accent: string
}) {
  const hasNotes = Boolean(notes && (notes.content || notes.plainText))
  const hasTerms = Boolean(terms && (terms.content || terms.plainText))
  if (!hasNotes && !hasTerms) return null

  const estimate = (section: NoteSection | null) => String(section?.plainText || section?.content || '').length
  const sideBySide = hasNotes && hasTerms && estimate(notes) <= 900 && estimate(terms) <= 900
  const title = hasNotes && hasTerms
    ? 'Notes & Terms'
    : hasNotes
      ? (notes?.title || 'Notes')
      : (terms?.title || 'Terms & Conditions')

  if (sideBySide && notes && terms) {
    const tableWidth = width - 1.6
    const firstWidth = Math.round((tableWidth / 2) * 100) / 100
    return (
      <View wrap={false} style={{ marginTop: scale.gap(9) }}>
        <SectionBand title="Notes & Terms" meta="Notes · Terms" scale={scale} accent={accent} />
        <Table
          columns={[{ width: { fixed: firstWidth } }, { width: { fixed: Math.round((tableWidth - firstWidth) * 100) / 100 } }]}
          style={{ borderWidth: 0.8, borderColor: LANDSCAPE_TOKENS.navy, borderTopWidth: 0 }}
        >
          <Row>
            <Cell style={{ padding: scale.pad(7), borderRightWidth: 0.8, borderRightColor: LANDSCAPE_TOKENS.navy }}>
              <SectionLabel scale={scale}>{notes.title || 'Notes'}</SectionLabel>
              <NoteBody section={notes} scale={scale} />
            </Cell>
            <Cell style={{ padding: scale.pad(7) }}>
              <SectionLabel scale={scale}>{terms.title || 'Terms & Conditions'}</SectionLabel>
              <NoteBody section={terms} scale={scale} />
            </Cell>
          </Row>
        </Table>
      </View>
    )
  }

  const notesBox = hasNotes && notes ? (
    <View style={{ borderWidth: 0.8, borderColor: LANDSCAPE_TOKENS.navy, borderTopWidth: 0, padding: scale.pad(7), marginBottom: hasTerms ? scale.gap(7) : 0 }}>
      {hasTerms ? <SectionLabel scale={scale}>{notes.title || 'Notes'}</SectionLabel> : null}
      <NoteBody section={notes} scale={scale} />
    </View>
  ) : null

  const termsBox = hasTerms && terms ? (
    <View style={{ borderWidth: 0.8, borderColor: LANDSCAPE_TOKENS.navy, borderTopWidth: 0, padding: scale.pad(7) }}>
      {hasNotes ? <SectionLabel scale={scale}>{terms.title || 'Terms & Conditions'}</SectionLabel> : null}
      <NoteBody section={terms} scale={scale} />
    </View>
  ) : null

  const firstEstimate = hasNotes ? estimate(notes) : estimate(terms)
  const firstBox = hasNotes ? notesBox : termsBox
  const secondBox = hasNotes ? termsBox : null

  return (
    <View style={{ marginTop: scale.gap(9) }}>
      {firstEstimate <= 700 ? (
        <View wrap={false}>
          <SectionBand title={title} scale={scale} accent={accent} />
          {firstBox}
        </View>
      ) : (
        <>
          <SectionBand title={title} scale={scale} accent={accent} />
          {firstBox}
        </>
      )}
      {secondBox}
    </View>
  )
}

function ReferencesSection({
  items,
  scale,
  accent,
}: {
  items: ReturnType<typeof buildAttachmentItems>
  scale: LandscapeScale
  accent: string
}) {
  if (items.length === 0) return null

  return (
    <View wrap={items.length > 10} style={{ marginTop: scale.gap(9) }}>
      <SectionBand title="References" meta={`${items.length} ${items.length === 1 ? 'item' : 'items'}`} scale={scale} accent={accent} />
      <View style={{ borderWidth: 0.8, borderColor: LANDSCAPE_TOKENS.navy, borderTopWidth: 0, padding: scale.pad(7) }}>
        {items.map((item, index) => {
          const label = item.label || ''
          const url = item.formattedUrl || item.url || ''
          const showUrl = Boolean(url && url !== label)
          return (
            <View key={`ref-${index}`} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: index === items.length - 1 ? 0 : scale.pad(4) }}>
              <Text style={{ width: 10, fontFamily: scale.font, fontSize: scale.bodySmall, lineHeight: 1.35, color: LANDSCAPE_TOKENS.blue }}>•</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                {label ? (
                  <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, fontWeight: 700, color: LANDSCAPE_TOKENS.navy, lineHeight: 1.35 }}>
                    {glyphRuns(label, scale.font)}
                  </Text>
                ) : null}
                {showUrl ? (
                  <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall - 0.2, color: LANDSCAPE_TOKENS.slate, lineHeight: 1.35 }}>
                    {glyphRuns(url, scale.font)}
                  </Text>
                ) : null}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function AdditionalFieldsSection({
  fields,
  width,
  scale,
  accent,
}: {
  fields: Array<{ label: string; value: string }>
  width: number
  scale: LandscapeScale
  accent: string
}) {
  if (fields.length === 0) return null

  const tableWidth = width - 1.6
  const firstWidth = Math.round((tableWidth / 2) * 100) / 100
  const rows: Array<Array<{ label: string; value: string } | undefined>> = []
  for (let index = 0; index < fields.length; index += 2) {
    rows.push([fields[index], fields[index + 1]])
  }

  return (
    <View wrap={fields.length > 12} style={{ marginTop: scale.gap(9) }}>
      <SectionBand title="Additional Details" scale={scale} accent={accent} />
      <Table
        columns={[{ width: { fixed: firstWidth } }, { width: { fixed: Math.round((tableWidth - firstWidth) * 100) / 100 } }]}
        style={{ borderWidth: 0.8, borderColor: LANDSCAPE_TOKENS.navy, borderTopWidth: 0 }}
      >
        {rows.map((row, rowIndex) => (
          <Row key={`af-${rowIndex}`}>
            {[0, 1].map((columnIndex) => {
              const field = row[columnIndex]
              return (
                <Cell
                  key={`af-${rowIndex}-${columnIndex}`}
                  style={{
                    padding: scale.pad(5),
                    borderRightWidth: columnIndex === 0 ? 0.4 : 0,
                    borderRightColor: LANDSCAPE_TOKENS.line,
                    borderBottomWidth: rowIndex === rows.length - 1 ? 0 : 0.3,
                    borderBottomColor: LANDSCAPE_TOKENS.grid,
                  }}
                >
                  {field ? (
                    <View>
                      {hasText(field.label) ? (
                        <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: LANDSCAPE_TOKENS.slate, marginBottom: 1 }}>
                          {field.label}
                        </Text>
                      ) : null}
                      {hasText(field.value) ? (
                        <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, color: LANDSCAPE_TOKENS.navy, lineHeight: 1.35 }}>
                          {glyphRuns(field.value, scale.font)}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </Cell>
              )
            })}
          </Row>
        ))}
      </Table>
    </View>
  )
}

function SignatureBlock({
  signature,
  scale,
}: {
  signature: CommercialDocumentData['signature']
  scale: LandscapeScale
}) {
  if (!signature) return null
  const hasImage = hasText(signature.imageUrl)
  const hasName = hasText(signature.name)
  const hasRole = hasText(signature.role)
  const hasSignedAt = hasText(signature.signedAt)
  if (!hasImage && !hasName && !hasRole && !hasSignedAt) return null

  return (
    <View style={{ width: 250 }}>
      <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase', color: LANDSCAPE_TOKENS.cobalt, marginBottom: 3 }}>
        Authorised Signatory
      </Text>
      {hasImage ? (
        <Image src={signature.imageUrl as string} style={{ height: 34, width: 120, marginTop: 2, marginBottom: 2 }} alt="" />
      ) : null}
      <View style={{ height: 0.8, backgroundColor: LANDSCAPE_TOKENS.navy, marginTop: hasImage ? 0 : 2, marginBottom: 4 }} />
      {hasName ? (
        <Text style={{ fontFamily: scale.font, fontSize: scale.body + 1, fontWeight: 700, color: LANDSCAPE_TOKENS.navy }}>
          {glyphRuns(signature.name as string, scale.font)}
        </Text>
      ) : null}
      {hasRole ? (
        <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, color: LANDSCAPE_TOKENS.slate, lineHeight: 1.3 }}>
          {glyphRuns(signature.role as string, scale.font)}
        </Text>
      ) : null}
      {hasSignedAt ? (
        <Text style={{ fontFamily: scale.font, fontSize: scale.micro + 0.3, color: LANDSCAPE_TOKENS.slate, lineHeight: 1.3 }}>
          {glyphRuns(signature.signedAt as string, scale.font)}
        </Text>
      ) : null}
    </View>
  )
}

export function LandscapeFormeDocument({ data, compact = false }: LandscapeFormeDocumentProps): React.JSX.Element {
  const design = data.design
  const font = resolveFont(design?.useCustomFonts ? design?.bodyFont : null, 'Inter')
  const accent = design?.useCustomColors && design?.accentColor ? design.accentColor : LANDSCAPE_TOKENS.amber
  const scale = createScale(font, compact)

  const contentWidth = PAGE_WIDTH - MARGIN_H * 2
  const tableWidth = contentWidth - 1.6

  const segments = segmentCommercialRows(data.table.rows)
  const totalLines = countSegmentLines(segments)
  const groupCount = countSegmentsWithGroups(segments)
  const tableColumns = resolveCommercialTableWidths(
    data.table.columns,
    contentWidth - TABLE_BORDER * 4,
    {
      preferred: LANDSCAPE_PREFERRED_WIDTHS,
      minimums: LANDSCAPE_MIN_WIDTHS,
      minDescription: 170,
      fallbackPreferred: 62,
      fallbackMinimum: 48,
    },
  )

  const totalsLines = buildTotalsLines(data.totals)
  const mainTotal = getMainTotal(data.totals)
  const balanceDue = getBalanceDue(data.totals)
  const ledgerBalanceDue = balanceDue && (!mainTotal || balanceDue.value !== mainTotal.value) ? balanceDue : null
  const amountInWords = getAmountInWords(data.totals)
  const advanceSummary = buildAdvanceSummary(data.advanceSummary)

  const bankDetails = data.showBankDetails && data.paymentDetails
    && [data.paymentDetails.bankName, data.paymentDetails.accountName, data.paymentDetails.accountNumber, data.paymentDetails.sortCode]
      .some(hasText)
    ? data.paymentDetails
    : null

  const company = data.company && (
    hasText(data.company.name)
    || hasText(data.company.companyLogoUrl)
    || hasText(data.company.address)
    || hasText(data.company.cityState)
    || hasText(data.company.phone)
    || hasText(data.company.email)
    || hasText(data.company.website)
    || data.company.customInfo.some((entry) => hasText(entry.value))
    || (data.showTagline && hasText(data.company.tagline))
  ) ? data.company : null

  const client = data.client && (
    hasText(data.client.name)
    || hasText(data.client.attention)
    || hasText(data.client.address)
    || hasText(data.client.cityState)
    || hasText(data.client.phone)
    || hasText(data.client.email)
  ) ? data.client : null

  const metaPairs = [
    data.issueDate ? { label: data.issueDateLabel, value: data.issueDate } : null,
    data.dueDateOrValidityDate ? { label: data.dueDateOrValidityDateLabel, value: data.dueDateOrValidityDate } : null,
    data.poNumber ? { label: data.poNumberLabel, value: data.poNumber } : null,
    ...(data.customHeaderFields || []).filter((field) => hasText(field.value)),
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const additionalFields = (data.additionalFields || []).filter((field) => hasText(field.value))
  const attachmentItems = buildAttachmentItems(data.attachments || [])
  const signature = data.signature && (hasText(data.signature.imageUrl) || hasText(data.signature.name) || hasText(data.signature.role) || hasText(data.signature.signedAt))
    ? data.signature
    : null
  const footerNote = hasText(data.footer?.extraText) ? String(data.footer?.extraText) : ''

  const hasLedger = totalsLines.length > 0 || Boolean(ledgerBalanceDue) || Boolean(advanceSummary?.advanceAmount || advanceSummary?.balanceRemaining)
  const hasSummaryPanel = Boolean(mainTotal) || Boolean(amountInWords) || Boolean(bankDetails)
  const hasClosing = hasLedger || hasSummaryPanel

  const rowOneBlocks: Block[] = []
  if (company) rowOneBlocks.push({ key: 'company', weight: 1.45, node: <CompanyBlock company={company} showTagline={data.showTagline} scale={scale} /> })
  rowOneBlocks.push({ key: 'document', weight: 1, node: <DocumentIdentity data={data} scale={scale} accent={accent} /> })

  const rowTwoBlocks: Block[] = []
  if (client) rowTwoBlocks.push({ key: 'client', weight: 1.25, node: <ClientBlock client={client} scale={scale} /> })
  if (metaPairs.length > 0) rowTwoBlocks.push({ key: 'details', weight: 1, node: <DetailsBlock pairs={metaPairs} scale={scale} /> })

  const bandMeta = `${totalLines} ${totalLines === 1 ? 'item' : 'items'}${groupCount > 0 ? ` · ${groupCount} ${groupCount === 1 ? 'group' : 'groups'}` : ''}`

  const ledgerColumnWidth = Math.round(tableWidth * 0.56 * 100) / 100
  const summaryColumnWidth = Math.round((tableWidth - ledgerColumnWidth) * 100) / 100

  return (
    <Document title={`${data.title} ${data.documentNumber || ''}`.trim()} style={{ fontFamily: font, fontSize: 7, color: LANDSCAPE_TOKENS.navy }}>
      <Page
        size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
        margin={{ top: compact ? 24 : 28, right: MARGIN_H, bottom: compact ? 30 : 36, left: MARGIN_H }}
        style={{ backgroundColor: LANDSCAPE_TOKENS.paper }}
      >
        <Fixed position="header">
          <View style={{ height: 10, borderTopWidth: 0.8, borderTopColor: LANDSCAPE_TOKENS.navy, borderBottomWidth: 0.4, borderBottomColor: LANDSCAPE_TOKENS.line, flexDirection: 'row' }}>
            {Array.from({ length: 12 }).map((_, index) => (
              <View
                key={`ruler-${index}`}
                style={{
                  flex: 1,
                  borderRightWidth: index === 11 ? 0 : 0.3,
                  borderRightColor: LANDSCAPE_TOKENS.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: font, fontSize: 4.2, fontWeight: 700, color: LANDSCAPE_TOKENS.slate }}>
                  {index + 1}
                </Text>
              </View>
            ))}
          </View>
        </Fixed>

        <Fixed position="footer">
          <View style={{ height: 10, borderTopWidth: 0.4, borderTopColor: LANDSCAPE_TOKENS.line, borderBottomWidth: 0.8, borderBottomColor: LANDSCAPE_TOKENS.navy, flexDirection: 'row' }}>
            {Array.from({ length: 12 }).map((_, index) => (
              <View
                key={`footer-ruler-${index}`}
                style={{
                  flex: 1,
                  borderRightWidth: index === 11 ? 0 : 0.3,
                  borderRightColor: LANDSCAPE_TOKENS.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontFamily: font, fontSize: 4.2, fontWeight: 700, color: LANDSCAPE_TOKENS.slate }}>
                  {index + 1}
                </Text>
              </View>
            ))}
          </View>
          <View
            style={{
              backgroundColor: LANDSCAPE_TOKENS.navy,
              height: compact ? 16 : 20,
              paddingLeft: 8,
              paddingRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTopWidth: 0.8,
              borderTopColor: accent,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
              {company?.companyLogoUrl ? (
                <View
                  style={{
                    width: 14,
                    height: 14,
                    backgroundColor: '#ffffff',
                    borderRadius: 2,
                    borderWidth: 0.3,
                    borderColor: LANDSCAPE_TOKENS.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 6,
                  }}
                >
                  <Image src={company.companyLogoUrl} style={{ width: 11, height: 11 }} alt="" />
                </View>
              ) : null}
              <Text style={{ fontFamily: font, fontSize: 5, fontWeight: 700, color: LANDSCAPE_TOKENS.headerInk, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                {data.footer?.companyName || company?.name || ''}
              </Text>
            </View>
            <Text style={{ fontFamily: font, fontSize: 5.2, fontWeight: 700, color: '#FFFFFF', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {'Sheet {{pageNumber}} of {{totalPages}}'}
            </Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: font, fontSize: 5, fontWeight: 700, color: LANDSCAPE_TOKENS.line, letterSpacing: 0.7, textTransform: 'uppercase' }}>
                {data.footer?.documentNumber || data.documentNumber || ''}
              </Text>
            </View>
          </View>
        </Fixed>

        <View wrap={false} style={{ marginBottom: scale.gap(9) }}>
          <Table
            columns={weightedColumnWidths(rowOneBlocks, tableWidth)}
            style={{ borderWidth: 0.8, borderColor: LANDSCAPE_TOKENS.navy }}
          >
            <Row>
              {rowOneBlocks.map((block, index) => (
                <Cell
                  key={block.key}
                  style={{
                    padding: scale.pad(8),
                    backgroundColor: block.key === 'document' ? LANDSCAPE_TOKENS.navy : LANDSCAPE_TOKENS.paper,
                    borderRightWidth: index === rowOneBlocks.length - 1 ? 0 : 0.8,
                    borderRightColor: LANDSCAPE_TOKENS.navy,
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
              style={{ borderWidth: 0.8, borderColor: LANDSCAPE_TOKENS.navy, marginTop: scale.gap(5) }}
            >
              <Row>
                {rowTwoBlocks.map((block, index) => (
                  <Cell
                    key={block.key}
                    style={{
                      padding: scale.pad(7),
                      backgroundColor: block.key === 'details' ? LANDSCAPE_TOKENS.tint : LANDSCAPE_TOKENS.paper,
                      borderRightWidth: index === rowTwoBlocks.length - 1 ? 0 : 0.8,
                      borderRightColor: LANDSCAPE_TOKENS.navy,
                    }}
                  >
                    {block.node}
                  </Cell>
                ))}
              </Row>
            </Table>
          ) : null}
        </View>

        {segments.length > 0 && data.table.columns.length > 0 ? (
          <View>
            {segments.map((segment, index) => {
              const keepGroupTogether = Boolean(segment.groupHeader)
                && segment.lines.length <= 6
                && segment.lines.every((row) => !row.imageUrl)
              const table = (
                <ItemsTable
                  key={segment.key}
                  segment={segment}
                  data={data}
                  tableColumns={tableColumns}
                  scale={scale}
                  accent={accent}
                  showBand={index === 0}
                  bandMeta={bandMeta}
                />
              )
              return keepGroupTogether ? <View key={`${segment.key}-wrap`} wrap={false}>{table}</View> : table
            })}
          </View>
        ) : null}

        {hasClosing ? (
          <View wrap={false} style={{ marginTop: scale.gap(2) }}>
            <SectionBand title="Summary" scale={scale} accent={accent} />
            {hasLedger && hasSummaryPanel ? (
              <Table
                columns={[{ width: { fixed: ledgerColumnWidth } }, { width: { fixed: summaryColumnWidth } }]}
                style={{ borderWidth: 0.8, borderColor: LANDSCAPE_TOKENS.navy, borderTopWidth: 0 }}
              >
                <Row>
                  <Cell style={{ padding: scale.pad(7), borderRightWidth: 0.8, borderRightColor: LANDSCAPE_TOKENS.navy }}>
                    <TotalsLedger lines={totalsLines} balanceDue={ledgerBalanceDue} advanceSummary={advanceSummary} scale={scale} accent={accent} />
                    {bankDetails ? <BankDetailsBlock bankDetails={bankDetails} scale={scale} /> : null}
                  </Cell>
                  <Cell style={{ padding: scale.pad(7) }}>
                    <SummaryPanel mainTotal={mainTotal} amountInWords={amountInWords} bankDetails={null} scale={scale} accent={accent} />
                  </Cell>
                </Row>
              </Table>
            ) : (
              <View style={{ borderWidth: 0.8, borderColor: LANDSCAPE_TOKENS.navy, borderTopWidth: 0, padding: scale.pad(7) }}>
                {hasLedger ? (
                  <TotalsLedger lines={totalsLines} balanceDue={ledgerBalanceDue} advanceSummary={advanceSummary} scale={scale} accent={accent} />
                ) : (
                  <SummaryPanel mainTotal={mainTotal} amountInWords={amountInWords} bankDetails={bankDetails} scale={scale} accent={accent} />
                )}
              </View>
            )}
          </View>
        ) : null}

        <NotesSection notes={data.notes} terms={data.terms} width={contentWidth} scale={scale} accent={accent} />
        <ReferencesSection items={attachmentItems} scale={scale} accent={accent} />
        <AdditionalFieldsSection fields={additionalFields} width={contentWidth} scale={scale} accent={accent} />

        {signature || footerNote ? (
          <View wrap={false} style={{ marginTop: scale.gap(10), flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: scale.gap(12) }}>
              {footerNote ? (
                <View style={{ borderTopWidth: 0.3, borderTopColor: LANDSCAPE_TOKENS.line, paddingTop: scale.pad(4) }}>
                  <Text style={{ fontFamily: scale.font, fontSize: scale.micro + 0.3, lineHeight: 1.4, color: LANDSCAPE_TOKENS.slate }}>
                    {glyphRuns(footerNote, scale.font)}
                  </Text>
                </View>
              ) : null}
            </View>
            <SignatureBlock signature={signature} scale={scale} />
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
