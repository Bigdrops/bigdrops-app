import React from 'react'
import type { CanonicalPreparedCsr } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import type { PdfcnDocumentEnvelope } from '@/domain/pdf/resolver'
import { Document, Page, View } from '../primitives'
import {
  BLUEPRINT_PALETTE,
  BlueprintHeader,
  BlueprintWorkspace,
  BlueprintBomSchedule,
  BlueprintTitleBlock,
} from './blueprintSections'

/** A4 landscape in PDF points (297 x 210 mm). Fixed regardless of content volume. */
const PAGE_SIZE = { width: 841.89, height: 595.28 }
const PAGE_MARGIN = 14

export const CsrLandscapeBlueprintTemplate: React.FC<{
  envelope: PdfcnDocumentEnvelope<CanonicalPreparedCsr>
}> = ({ envelope }) => {
  const csr = envelope.data

  return (
    <Document title={`CSR-${csr.csrNumber || 'Report'}`}>
      <Page size={PAGE_SIZE} margin={PAGE_MARGIN} style={{ backgroundColor: '#ffffff' }}>
        <View
          style={{
            backgroundColor: BLUEPRINT_PALETTE.paper,
            borderWidth: 1.5,
            borderColor: BLUEPRINT_PALETTE.lineHeavy,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <BlueprintHeader csr={csr} />
          <BlueprintWorkspace csr={csr} />
          <BlueprintBomSchedule csr={csr} />
          <BlueprintTitleBlock csr={csr} />
        </View>
      </Page>
    </Document>
  )
}
