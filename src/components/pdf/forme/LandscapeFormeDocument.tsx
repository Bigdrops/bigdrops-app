import React from 'react'
import { Cell, Document, Fixed, Image, Page, Row, Table, Text, View } from '@formepdf/react'
import type { CommercialDocumentData } from '../industryAdapter'
import { glyphRuns } from './glyphs'
import { buildAttachmentItems } from '../engine/attachments'
import {
  segmentCommercialRows,
} from './commercialSegments'
import {
  resolveCommercialTableWidths,
} from './commercialLayout'
import {
  LANDSCAPE_TOKENS,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_H,
  type LandscapeScale,
  type Block,
  createScale,
  resolveFont,
  hasText,
} from './landscape/landscapeTokens'
import {
  LandscapeCoordinateRuler,
  CompanyBlock,
  DocumentIdentity,
  ClientBlock,
  DetailsBlock,
  LandscapeTopBar,
} from './landscape/landscapeHeader'
import { ItemsTable } from './landscape/landscapeTable'
import {
  TotalsLedger,
  SummaryPanel,
  BankDetailsBlock,
  NotesSection,
  ReferencesSection,
  AdditionalFieldsSection,
  SignatureBlock,
  DeliveryDestinationBlock,
  ProcurementSignatureBlock,
  type SummaryRow,
} from './landscape/landscapeClosing'

export { LANDSCAPE_TOKENS } from './landscape/landscapeTokens'

export interface LandscapeFormeDocumentProps {
  data: CommercialDocumentData
  compact?: boolean
}

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

export function LandscapeFormeDocument({ data, compact = false }: LandscapeFormeDocumentProps): React.JSX.Element {
  const font = resolveFont(data.design?.bodyFont || data.design?.headerFont, 'Inter')
  const scale: LandscapeScale = createScale(font, compact)
  const accent = (data.design?.useCustomColors && data.design?.accentColor) ? data.design.accentColor : LANDSCAPE_TOKENS.amber
  const company = data.company
  const client = data.client

  const contentWidth = PAGE_WIDTH - 2 * MARGIN_H
  const tableWidth = contentWidth

  const tableColumns = resolveCommercialTableWidths(
    data.table.columns,
    tableWidth,
    {
      preferred: LANDSCAPE_PREFERRED_WIDTHS,
      minimums: LANDSCAPE_MIN_WIDTHS,
      minDescription: 140,
      fallbackPreferred: 55,
      fallbackMinimum: 42,
    },
  )
  const segments = segmentCommercialRows(data.table.rows)

  const detailPairs: Array<{ label: string; value: string }> = []
  if (hasText(data.issueDate)) detailPairs.push({ label: data.issueDateLabel || 'Date', value: data.issueDate! })
  if (hasText(data.dueDateOrValidityDate)) detailPairs.push({ label: data.dueDateOrValidityDateLabel || 'Due Date', value: data.dueDateOrValidityDate! })
  if (hasText(data.poNumber)) detailPairs.push({ label: data.poNumberLabel || 'PO Number', value: data.poNumber! })
  if (data.customHeaderFields) {
    data.customHeaderFields.forEach((item) => {
      if (hasText(item.value)) detailPairs.push({ label: item.label, value: item.value })
    })
  }

  const rowOneBlocks: Block[] = []
  if (company) {
    rowOneBlocks.push({
      key: 'company',
      weight: 1.5,
      node: <CompanyBlock company={company} showTagline={data.showTagline} scale={scale} />,
    })
  }
  rowOneBlocks.push({
    key: 'document',
    weight: 1.0,
    node: <DocumentIdentity data={data} scale={scale} accent={accent} />,
  })

  const rowTwoBlocks: Block[] = []
  if (client) {
    rowTwoBlocks.push({
      key: 'client',
      weight: 1.4,
      node: <ClientBlock client={client} scale={scale} label={data.isProcurement ? (data.partyHeaderLabel || 'Order From · Supplier') : 'Client'} />,
    })
  }
  if (detailPairs.length > 0) {
    rowTwoBlocks.push({
      key: 'details',
      weight: 1.1,
      node: <DetailsBlock pairs={detailPairs} scale={scale} />,
    })
  }

  const totalsLines: SummaryRow[] = (data.totals?.lines || []).map((row) => ({
    label: row.label,
    value: row.value,
    isDeduction: row.isDeduction,
  }))
  const mainTotal = data.totals?.mainLine || null
  const ledgerBalanceDue = data.totals?.balanceDue?.value || null
  const amountInWords = data.totals?.amountInWords || null
  const advanceSummary =
    data.advanceSummary && data.advanceSummary.advanceAmount && data.advanceSummary.balanceRemaining
      ? {
          advanceDue: data.advanceSummary.advanceAmount,
          balanceDue: data.advanceSummary.balanceRemaining,
        }
      : null
  const bankDetails = data.showBankDetails ? data.paymentDetails : null
  const deliveryDestination = data.isProcurement ? data.deliveryDestination : null

  const hasLedger = totalsLines.length > 0 || advanceSummary !== null
  const hasSummaryPanel = mainTotal !== null || amountInWords !== null || bankDetails !== null || deliveryDestination !== null
  const hasClosing = hasLedger || hasSummaryPanel

  const ledgerColumnWidth = Math.round(contentWidth * 0.52 * 100) / 100
  const summaryColumnWidth = Math.round((contentWidth - ledgerColumnWidth) * 100) / 100

  const attachmentItems = buildAttachmentItems(data.attachments)
  const additionalFields = (data.additionalFields || []).filter((f) => hasText(f.value))
  const signature = data.signature
  const footerNote = data.footer?.extraText || null

  const bandMeta = data.documentNumber
    ? `${data.title} · ${data.documentNumber}`
    : data.title

  return (
    <Document title={data.documentNumber || data.title}>
      <Page
        size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
        margin={{ top: 14, bottom: 28, left: MARGIN_H, right: MARGIN_H }}
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* Fixed Header: Coordinate Ruler */}
        <Fixed position="header">
          <LandscapeCoordinateRuler scale={scale} borderBottom />
        </Fixed>

        {/* Fixed Footer: 12-cell ruler + dark navy metadata bar with company logo badge */}
        <Fixed position="footer">
          <LandscapeCoordinateRuler scale={scale} borderTop borderBottom />
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
              <Text
                style={{
                  fontFamily: font,
                  fontSize: 5,
                  fontWeight: 700,
                  color: LANDSCAPE_TOKENS.headerInk,
                  textTransform: 'uppercase',
                  letterSpacing: 0.7,
                }}
              >
                {data.footer?.companyName || company?.name || ''}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: font,
                fontSize: 5.2,
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              {'Sheet {{pageNumber}} of {{totalPages}}'}
            </Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text
                style={{
                  fontFamily: font,
                  fontSize: 5,
                  fontWeight: 700,
                  color: LANDSCAPE_TOKENS.line,
                  letterSpacing: 0.7,
                  textTransform: 'uppercase',
                }}
              >
                {data.footer?.documentNumber || data.documentNumber || ''}
              </Text>
            </View>
          </View>
        </Fixed>

        {/* 4-Cell Partitioned Header */}
        <LandscapeTopBar
          rowOneBlocks={rowOneBlocks}
          rowTwoBlocks={rowTwoBlocks}
          tableWidth={tableWidth}
          scale={scale}
        />

        {/* Bill of Materials Items Schedule Table */}
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

        {/* Multi-Column Technical Closing Section */}
        {hasClosing ? (
          <View wrap={false} style={{ marginTop: scale.gap(2) }}>
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
                  Summary
                </Text>
              </View>
            </View>

            {hasLedger && hasSummaryPanel ? (
              <Table
                columns={[{ width: { fixed: ledgerColumnWidth } }, { width: { fixed: summaryColumnWidth } }]}
                style={{ borderWidth: 0.8, borderColor: LANDSCAPE_TOKENS.navy, borderTopWidth: 0 }}
              >
                <Row>
                  <Cell style={{ padding: scale.pad(7), borderRightWidth: 0.8, borderRightColor: LANDSCAPE_TOKENS.navy }}>
                    <TotalsLedger
                      lines={totalsLines}
                      balanceDue={ledgerBalanceDue}
                      advanceSummary={advanceSummary}
                      scale={scale}
                      accent={accent}
                    />
                    {bankDetails ? <BankDetailsBlock bankDetails={bankDetails} scale={scale} /> : null}
                    {deliveryDestination ? <DeliveryDestinationBlock deliveryDestination={deliveryDestination} scale={scale} /> : null}
                  </Cell>
                  <Cell style={{ padding: scale.pad(7) }}>
                    <SummaryPanel
                      mainTotal={mainTotal}
                      amountInWords={amountInWords}
                      bankDetails={null}
                      scale={scale}
                      accent={accent}
                    />
                  </Cell>
                </Row>
              </Table>
            ) : (
              <View style={{ borderWidth: 0.8, borderColor: LANDSCAPE_TOKENS.navy, borderTopWidth: 0, padding: scale.pad(7) }}>
                {hasLedger ? (
                  <TotalsLedger
                    lines={totalsLines}
                    balanceDue={ledgerBalanceDue}
                    advanceSummary={advanceSummary}
                    scale={scale}
                    accent={accent}
                  />
                ) : (
                  <SummaryPanel
                    mainTotal={mainTotal}
                    amountInWords={amountInWords}
                    bankDetails={bankDetails}
                    scale={scale}
                    accent={accent}
                  />
                )}
              </View>
            )}
          </View>
        ) : null}

        {/* Notes & Terms */}
        <NotesSection notes={data.notes} terms={data.terms} width={contentWidth} scale={scale} accent={accent} />

        {/* Attachments & References */}
        <ReferencesSection items={attachmentItems} scale={scale} accent={accent} />

        {/* Additional Custom Fields */}
        <AdditionalFieldsSection fields={additionalFields} width={contentWidth} scale={scale} accent={accent} />

        {/* Signature & Verification Block */}
        {(data.isProcurement && data.procurementSignatories) || signature || footerNote ? (
          <View
            wrap={false}
            style={{
              marginTop: scale.gap(8),
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, paddingRight: scale.gap(12) }}>
              {footerNote ? (
                <View style={{ borderTopWidth: 0.3, borderTopColor: LANDSCAPE_TOKENS.line, paddingTop: scale.pad(4) }}>
                  <Text style={{ fontFamily: scale.font, fontSize: scale.micro + 0.3, lineHeight: 1.4, color: LANDSCAPE_TOKENS.slate }}>
                    {glyphRuns(footerNote, scale.font)}
                  </Text>
                </View>
              ) : null}
            </View>
            {data.isProcurement && data.procurementSignatories ? (
              <ProcurementSignatureBlock procurementSignatories={data.procurementSignatories} scale={scale} />
            ) : (
              <SignatureBlock signature={signature} scale={scale} />
            )}
          </View>
        ) : null}
      </Page>
    </Document>
  )
}
