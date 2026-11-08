import React from 'react'
import { Cell, Image, Row, Table, Text, View } from '@formepdf/react'
import type { CommercialDocumentData } from '../../industryAdapter'
import { glyphRuns } from '../glyphs'
import { renderFormeRichText } from '../formeRichText'
import { parseRichText } from '../../core/richText'
import {
  LANDSCAPE_TOKENS as C,
  type LandscapeScale,
  hasText,
} from './landscapeTokens'
import { SectionBand } from './landscapeHeader'

export type SummaryRow = { label: string; value: string; isDeduction?: boolean }

export function TotalsLedger({
  lines,
  balanceDue,
  advanceSummary,
  scale,
  accent,
}: {
  lines: SummaryRow[]
  balanceDue: string | null
  advanceSummary: { advanceDue: string; balanceDue: string } | null
  scale: LandscapeScale
  accent: string
}) {
  return (
    <View style={{ marginBottom: scale.gap(4) }}>
      {lines.map((line, index) => {
        const isDed = Boolean(line.isDeduction)
        return (
          <View
            key={`tot-${line.label}-${index}`}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: scale.pad(2.2),
              borderBottomWidth: 0.3,
              borderBottomColor: C.grid,
            }}
          >
            <Text
              style={{
                fontFamily: scale.font,
                fontSize: scale.bodySmall,
                color: isDed ? C.deductionRed : C.slate,
                fontWeight: isDed ? 700 : 400,
              }}
            >
              {glyphRuns(line.label, scale.font)}
            </Text>
            <Text
              style={{
                fontFamily: scale.font,
                fontSize: scale.bodySmall,
                fontWeight: 700,
                color: isDed ? C.deductionRed : C.navy,
              }}
            >
              {glyphRuns(isDed && !line.value.startsWith('-') ? `-${line.value}` : line.value, scale.font)}
            </Text>
          </View>
        )
      })}

      {advanceSummary ? (
        <View style={{ marginTop: scale.pad(3), borderTopWidth: 0.5, borderTopColor: C.lineMed, paddingTop: scale.pad(2) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 }}>
            <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, color: C.cobalt }}>
              Advance Due
            </Text>
            <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, color: C.navy }}>
              {glyphRuns(advanceSummary.advanceDue, scale.font)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 }}>
            <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, color: C.slate }}>
              Balance Due
            </Text>
            <Text style={{ fontFamily: scale.font, fontSize: scale.micro, fontWeight: 700, color: C.slate }}>
              {glyphRuns(advanceSummary.balanceDue, scale.font)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}

export function SummaryPanel({
  mainTotal,
  amountInWords,
  bankDetails,
  scale,
  accent,
}: {
  mainTotal: { label: string; value: string } | null
  amountInWords: string | null
  bankDetails: CommercialDocumentData['paymentDetails'] | null
  scale: LandscapeScale
  accent: string
}) {
  return (
    <View style={{ justifyContent: 'space-between', height: '100%' }}>
      {mainTotal ? (
        <View
          style={{
            backgroundColor: C.navy,
            borderLeftWidth: 3,
            borderLeftColor: accent,
            padding: scale.pad(8),
            marginBottom: scale.gap(4),
          }}
        >
          <Text
            style={{
              fontFamily: scale.font,
              fontSize: scale.micro + 0.5,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: C.headerInk,
            }}
          >
            {mainTotal.label}
          </Text>
          <Text
            style={{
              fontFamily: scale.font,
              fontSize: scale.hero,
              fontWeight: 700,
              color: '#FFFFFF',
              marginTop: 2,
              lineHeight: 1.1,
            }}
          >
            {glyphRuns(mainTotal.value, scale.font)}
          </Text>
        </View>
      ) : null}

      {amountInWords ? (
        <View style={{ paddingVertical: scale.pad(2) }}>
          <Text
            style={{
              fontFamily: scale.font,
              fontSize: scale.micro,
              fontWeight: 700,
              color: C.blue,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}
          >
            Amount in Words
          </Text>
          <Text
            style={{
              fontFamily: scale.font,
              fontSize: scale.bodySmall,
              fontWeight: 700,
              color: C.navy,
              lineHeight: 1.3,
              marginTop: 1,
            }}
          >
            {glyphRuns(amountInWords, scale.font)}
          </Text>
        </View>
      ) : null}

      {bankDetails ? <BankDetailsBlock bankDetails={bankDetails} scale={scale} /> : null}
    </View>
  )
}

export function BankDetailsBlock({
  bankDetails,
  scale,
}: {
  bankDetails: NonNullable<CommercialDocumentData['paymentDetails']>
  scale: LandscapeScale
}) {
  const parts = [
    { label: 'Bank', value: bankDetails.bankName },
    { label: 'Account Name', value: bankDetails.accountName },
    { label: 'Account No', value: bankDetails.accountNumber },
    { label: 'Sort Code', value: bankDetails.sortCode },
  ].filter((p) => hasText(p.value))

  if (parts.length === 0) return null

  return (
    <View
      style={{
        marginTop: scale.gap(4),
        padding: scale.pad(6),
        backgroundColor: C.paper,
        borderWidth: 0.5,
        borderColor: C.lineMed,
      }}
    >
      <Text
        style={{
          fontFamily: scale.font,
          fontSize: scale.micro,
          fontWeight: 700,
          color: C.cobalt,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
          marginBottom: 3,
        }}
      >
        Bank Payment Details
      </Text>
      {parts.map((p, i) => (
        <View key={`bank-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 }}>
          <Text style={{ fontFamily: scale.font, fontSize: scale.micro, color: C.slate }}>
            {p.label}
          </Text>
          <Text style={{ fontFamily: scale.font, fontSize: scale.micro + 0.2, fontWeight: 700, color: C.navy }}>
            {p.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function NotesSection({
  notes,
  terms,
  width,
  scale,
  accent,
}: {
  notes: CommercialDocumentData['notes']
  terms: CommercialDocumentData['terms']
  width: number
  scale: LandscapeScale
  accent: string
}) {
  const hasNotes = Boolean(notes?.content || notes?.plainText)
  const hasTerms = Boolean(terms?.content || terms?.plainText)

  if (!hasNotes && !hasTerms) return null

  const showBoth = hasNotes && hasTerms
  const halfWidth = (width - 10) / 2

  const renderContent = (sec: NonNullable<typeof notes>) => {
    const rawContent = sec.content || sec.plainText || ''
    return (
      <View style={{ marginTop: 2 }}>
        {renderFormeRichText(rawContent, {
          font: scale.font,
          paragraphStyle: {
            fontFamily: scale.font,
            fontSize: scale.bodySmall,
            color: C.inkSoft,
            lineHeight: 1.35,
          },
        })}
      </View>
    )
  }

  const bandTitle = showBoth
    ? 'Notes & Terms'
    : hasNotes
      ? (notes?.title || 'Notes')
      : (terms?.title || 'Terms & Conditions')

  return (
    <View wrap={false} style={{ marginTop: scale.gap(4) }}>
      <SectionBand
        title={bandTitle}
        scale={scale}
        accent={accent}
      />
      <View
        style={{
          borderWidth: 0.8,
          borderColor: C.navy,
          borderTopWidth: 0,
          backgroundColor: C.paper,
          padding: scale.pad(7),
          flexDirection: showBoth ? 'row' : 'column',
          gap: 10,
        }}
      >
        {hasNotes ? (
          <View style={{ width: showBoth ? halfWidth : undefined }}>
            {showBoth ? (
              <Text
                style={{
                  fontFamily: scale.font,
                  fontSize: scale.micro + 0.3,
                  fontWeight: 700,
                  color: C.cobalt,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginBottom: 2,
                }}
              >
                {notes?.title || 'Notes'}
              </Text>
            ) : null}
            {renderContent(notes!)}
          </View>
        ) : null}

        {hasTerms ? (
          <View style={{ width: showBoth ? halfWidth : undefined }}>
            {showBoth ? (
              <Text
                style={{
                  fontFamily: scale.font,
                  fontSize: scale.micro + 0.3,
                  fontWeight: 700,
                  color: C.cobalt,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginBottom: 2,
                }}
              >
                {terms?.title || 'Terms & Conditions'}
              </Text>
            ) : null}
            {renderContent(terms!)}
          </View>
        ) : null}
      </View>
    </View>
  )
}

export function ReferencesSection({
  items,
  scale,
  accent,
}: {
  items: Array<{ label: string; url: string }>
  scale: LandscapeScale
  accent: string
}) {
  if (items.length === 0) return null
  return (
    <View wrap={false} style={{ marginTop: scale.gap(4) }}>
      <SectionBand title="Attachments & References" scale={scale} accent={accent} />
      <View
        style={{
          borderWidth: 0.8,
          borderColor: C.navy,
          borderTopWidth: 0,
          backgroundColor: C.paper,
          padding: scale.pad(6),
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {items.map((item, idx) => (
          <View key={`att-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', minWidth: 200, marginBottom: 2 }}>
            <Text style={{ width: 10, fontFamily: scale.font, fontSize: scale.bodySmall, lineHeight: 1.35, color: C.blue }}>•</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, fontWeight: 700, color: C.navy, lineHeight: 1.35 }}>
                {glyphRuns(item.label, scale.font)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

export function AdditionalFieldsSection({
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
  return (
    <View wrap={false} style={{ marginTop: scale.gap(4) }}>
      <SectionBand title="Additional Information" scale={scale} accent={accent} />
      <View
        style={{
          borderWidth: 0.8,
          borderColor: C.navy,
          borderTopWidth: 0,
          backgroundColor: C.paper,
          padding: scale.pad(6),
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        {fields.map((f, i) => (
          <View key={`add-${i}`} style={{ minWidth: 100 }}>
            <Text style={{ fontFamily: scale.font, fontSize: scale.micro, color: C.slate, textTransform: 'uppercase' }}>
              {f.label}
            </Text>
            <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, fontWeight: 700, color: C.navy, marginTop: 1 }}>
              {glyphRuns(f.value, scale.font)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function SignatureBlock({
  signature,
  scale,
}: {
  signature: CommercialDocumentData['signature']
  scale: LandscapeScale
}) {
  if (!signature?.name && !signature?.imageUrl) return null
  return (
    <View style={{ width: 140, alignItems: 'center' }}>
      {signature.imageUrl ? (
        <View
          style={{
            height: 36,
            width: 110,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 3,
          }}
        >
          <Image src={signature.imageUrl} style={{ width: 90, height: 32 }} alt="" />
        </View>
      ) : (
        <View style={{ height: 26 }} />
      )}
      <View style={{ width: '100%', borderTopWidth: 0.8, borderTopColor: C.navy, paddingTop: 3, alignItems: 'center' }}>
        <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, fontWeight: 700, color: C.navy }}>
          {glyphRuns(signature.name, scale.font)}
        </Text>
        {signature.role ? (
          <Text style={{ fontFamily: scale.font, fontSize: scale.micro, color: C.slate, marginTop: 1 }}>
            {glyphRuns(signature.role, scale.font)}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

export function DeliveryDestinationBlock({
  deliveryDestination,
  scale,
}: {
  deliveryDestination: NonNullable<CommercialDocumentData['deliveryDestination']>
  scale: LandscapeScale
}) {
  return (
    <View
      style={{
        marginTop: scale.gap(4),
        padding: scale.pad(6),
        backgroundColor: C.paper,
        borderWidth: 0.5,
        borderColor: C.lineMed,
      }}
    >
      <Text
        style={{
          fontFamily: scale.font,
          fontSize: scale.micro,
          fontWeight: 700,
          color: C.cobalt,
          textTransform: 'uppercase',
          letterSpacing: 0.7,
          marginBottom: 3,
        }}
      >
        {deliveryDestination.label || 'Delivery Destination'}
      </Text>
      {deliveryDestination.site ? (
        <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, fontWeight: 700, color: C.navy, marginBottom: 1 }}>
          {glyphRuns(deliveryDestination.site, scale.font)}
        </Text>
      ) : null}
      {(deliveryDestination.addressLines || []).map((line, idx) => (
        <Text key={'dest-line-' + idx} style={{ fontFamily: scale.font, fontSize: scale.micro, color: C.slate, marginBottom: 1 }}>
          {glyphRuns(line, scale.font)}
        </Text>
      ))}
      {deliveryDestination.contactPerson ? (
        <Text style={{ fontFamily: scale.font, fontSize: scale.micro, color: C.slate, marginTop: 1 }}>
          Contact: {glyphRuns(deliveryDestination.contactPerson, scale.font)} {deliveryDestination.phone ? '(' + glyphRuns(deliveryDestination.phone, scale.font) + ')' : ''}
        </Text>
      ) : null}
    </View>
  )
}

export function ProcurementSignatureBlock({
  procurementSignatories,
  scale,
}: {
  procurementSignatories: NonNullable<CommercialDocumentData['procurementSignatories']>
  scale: LandscapeScale
}) {
  const req = procurementSignatories.requisitioner
  const auth = procurementSignatories.authorizer

  return (
    <View style={{ flexDirection: 'row', gap: scale.gap(12) }}>
      {req ? (
        <View style={{ width: 140, alignItems: 'center' }}>
          {req.signatureUrl ? (
            <View style={{ height: 36, width: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 3 }}>
              <Image src={req.signatureUrl} style={{ width: 90, height: 32 }} alt="" />
            </View>
          ) : (
            <View style={{ height: 26 }} />
          )}
          <View style={{ width: '100%', borderTopWidth: 0.8, borderTopColor: C.navy, paddingTop: 3, alignItems: 'center' }}>
            <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, fontWeight: 700, color: C.navy }}>
              {glyphRuns(req.name || 'Authorised Signatory', scale.font)}
            </Text>
            <Text style={{ fontFamily: scale.font, fontSize: scale.micro, color: C.slate, marginTop: 1 }}>
              {glyphRuns(req.title || req.label || 'Purchasing Officer', scale.font)}
            </Text>
          </View>
        </View>
      ) : null}
      {auth ? (
        <View style={{ width: 140, alignItems: 'center' }}>
          {auth.signatureUrl ? (
            <View style={{ height: 36, width: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 3 }}>
              <Image src={auth.signatureUrl} style={{ width: 90, height: 32 }} alt="" />
            </View>
          ) : (
            <View style={{ height: 26 }} />
          )}
          <View style={{ width: '100%', borderTopWidth: 0.8, borderTopColor: C.navy, paddingTop: 3, alignItems: 'center' }}>
            <Text style={{ fontFamily: scale.font, fontSize: scale.bodySmall, fontWeight: 700, color: C.navy }}>
              {glyphRuns(auth.name || 'Authorised By', scale.font)}
            </Text>
            <Text style={{ fontFamily: scale.font, fontSize: scale.micro, color: C.slate, marginTop: 1 }}>
              {glyphRuns(auth.title || auth.label || 'Management Authorisation', scale.font)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  )
}
