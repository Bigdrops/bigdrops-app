import React from 'react'
import type { CanonicalPreparedCsr, CsrSignOffBlock } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import { View, Text } from '../primitives'
import { BLUEPRINT_PALETTE as C } from './blueprintSections'
import { SignatureStage, dash, isCompleteStatus } from './csrPdfcnUtils'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import { resolveInkFonts } from './csrFormeKit'

export interface BlueprintTitleBlockProps {
  csr: CanonicalPreparedCsr
  envelope?: {
    metadata?: Record<string, unknown>
  }
}

const WriteLine: React.FC<{ label: string; value: string | null; labelWidth?: number; valueStyle?: { fontFamily?: string; color?: string } }> = ({
  label,
  value,
  labelWidth = 66,
  valueStyle,
}) => (
  <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end' }}>
    <Text style={{ fontSize: 7, fontWeight: 700, color: C.cobalt, width: labelWidth, paddingBottom: 2.5 }}>{label}</Text>
    <View
      style={{
        flex: 1,
        minHeight: 17,
        borderBottomWidth: 0.6,
        borderBottomColor: C.lineMed,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <Text style={{ fontSize: 9.5, color: C.navy, paddingBottom: 2, ...valueStyle }}>{value || ' '}</Text>
    </View>
  </View>
)

/**
 * One sign-off area: a wide signature space beside three write-in lines, so a
 * handwritten signature has room without making the area tall.
 */
const SignOffArea: React.FC<{ title: string; block: CsrSignOffBlock; borderRight?: boolean; valueStyle?: { fontFamily?: string; color?: string } }> = ({
  title,
  block,
  borderRight,
  valueStyle,
}) => (
  <View
    style={{
      flex: 1,
      padding: 7,
      borderRightWidth: borderRight ? 1 : 0,
      borderRightColor: C.lineHeavy,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <View style={{ borderBottomWidth: 0.8, borderBottomColor: C.lineHeavy, paddingBottom: 2, marginBottom: 4 }}>
      <Text style={{ fontSize: 8.5, fontWeight: 700, color: C.navy, letterSpacing: 0.4 }}>{title}</Text>
    </View>

    <View style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
      <View style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 7, fontWeight: 700, color: C.cobalt }}>SIGNATURE</Text>
        <SignatureStage signatureUrl={block.signatureUrl} height={40} lineColor={C.lineHeavy} />
      </View>
      <View style={{ flex: 1.15, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <WriteLine label="FULL NAME" value={block.printedName} valueStyle={valueStyle} />
        <WriteLine label="DESIGNATION" value={block.designation} valueStyle={valueStyle} />
        <WriteLine label="DATE" value={block.signingDate} valueStyle={valueStyle} />
      </View>
    </View>
  </View>
)

export const BlueprintTitleBlock: React.FC<BlueprintTitleBlockProps> = ({ csr, envelope }) => {
  const ink = resolveInkFonts((envelope?.metadata?.designPreset as PdfDesignPreset | null) ?? null)
  const valueStyle = { fontFamily: ink.fillableFont, color: ink.ink }
  return (
  <View style={{ display: 'flex', flexDirection: 'row', backgroundColor: C.white }}>
    <SignOffArea title="SERVICE ENGINEER" block={csr.signatories.serviceEngineer} borderRight valueStyle={valueStyle} />
    <SignOffArea title="CLIENT REPRESENTATIVE" block={csr.signatories.clientRepresentative} borderRight valueStyle={valueStyle} />

    {/* Drawing-style title block */}
    <View
      style={{
        width: 128,
        padding: 7,
        backgroundColor: C.navy,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <View>
        <Text style={{ fontSize: 6.5, color: C.lineFine, letterSpacing: 0.4 }}>REPORT NO.</Text>
        <Text style={{ fontSize: 11, fontWeight: 700, color: C.white, marginTop: 1.5 }}>{dash(csr.csrNumber)}</Text>
      </View>
      <View style={{ marginTop: 4 }}>
        <Text style={{ fontSize: 6.5, color: C.lineFine, letterSpacing: 0.4 }}>DATE</Text>
        <Text style={{ fontSize: 9.5, fontWeight: 700, color: C.white, marginTop: 1.5 }}>{dash(csr.date)}</Text>
      </View>
      {csr.status ? (
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 6.5, color: C.lineFine, letterSpacing: 0.4 }}>STATUS</Text>
          <Text
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              color: isCompleteStatus(csr.status) ? '#64e3a1' : C.white,
              marginTop: 1.5,
            }}
          >
            {csr.status.toUpperCase()}
          </Text>
        </View>
      ) : null}
    </View>
  </View>
  )
}
