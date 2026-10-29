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

const PAGE_SIZE = { width: 841.89, height: 595.28 }

export const CsrLandscapeBlueprintTemplate: React.FC<{
  envelope: PdfcnDocumentEnvelope<CanonicalPreparedCsr>
}> = ({ envelope }) => {
  const csr = envelope.data

  return (
    <Document title={`CSR-${csr.csrNumber || 'Report'}`}>
      <Page size={PAGE_SIZE} style={{ backgroundColor: '#c6d2dd', padding: 8 }}>
        <View
          style={{
            backgroundColor: BLUEPRINT_PALETTE.paper,
            borderWidth: 1.5,
            borderColor: BLUEPRINT_PALETTE.lineHeavy,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: 4,
          }}
        >
          {/* Top Drawing Header Bar (4 Columns) */}
          <BlueprintHeader csr={csr} />

          {/* Main Technical Workspace (Left Plate + Right Dossier) */}
          <BlueprintWorkspace csr={csr} />

          {/* 4-Column Engineering Bill of Materials (BOM) */}
          <BlueprintBomSchedule csr={csr} />

          {/* Bottom Title Block & Handwriting Sign-Off Areas */}
          <BlueprintTitleBlock csr={csr} />
        </View>
      </Page>
    </Document>
  )
}
