import { Document, Page } from '@react-pdf/renderer'
import { registerPdfFillableFonts } from '@/lib/pdfFontRegistry'

import { type WaybillRenderModel } from '@/domain/waybill/engine/types'
import { type WaybillPdfTemplateId } from './waybillUtils'
import { WaybillMinimalContent } from './blankWaybillTemplate'
import { minimalStyles } from './waybillMinimalStyles'
import ClassicTemplate from './ClassicTemplate'
import ThermalTemplate from './ThermalTemplate'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'

registerPdfFillableFonts()

interface WaybillPDFProps {
  model?: WaybillRenderModel
  designPreset?: PdfDesignPreset
  template?: WaybillPdfTemplateId
}

export default function WaybillPDF({ model, designPreset, template }: WaybillPDFProps) {
  if (!model) return null

  if (template === 'minimal') {
    return (
      <Document>
        <Page size="A4" style={minimalStyles.page}>
          <WaybillMinimalContent model={model} />
        </Page>
      </Document>
    )
  }

  if (template === 'thermal') {
    return (
      <Document>
        <Page size="A4" style={{ padding: 0, backgroundColor: '#ffffff' }}>
          <ThermalTemplate model={model} />
        </Page>
      </Document>
    )
  }

  return (
    <Document>
      <Page size="A4" style={{ padding: 0, backgroundColor: '#ffffff' }}>
        <ClassicTemplate model={model} designPreset={designPreset} />
      </Page>
    </Document>
  )
}
