import {
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import { registerPdfFillableFonts } from '@/lib/pdfFontRegistry'

import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { GreenTemplateDocument } from './GreenTemplate'
import { MinimalTemplateDocument } from './MinimalTemplate'
import { ThermalTemplateDocument } from './ThermalTemplate'

type WaybillPdfTemplateId = 'green' | 'minimal' | 'thermal'

interface WaybillPDFProps {
  model?: WaybillRenderModel
  designPreset?: PdfDesignPreset
  template?: WaybillPdfTemplateId
}

registerPdfFillableFonts()

export default function WaybillPDF({ model, designPreset, template = 'green' }: WaybillPDFProps) {
  if (!model) return null

  if (template === 'minimal') {
    return <MinimalTemplateDocument model={model} designPreset={designPreset} />
  }

  if (template === 'thermal') {
    return <ThermalTemplateDocument model={model} designPreset={designPreset} />
  }

  return <GreenTemplateDocument model={model} designPreset={designPreset} />
}
