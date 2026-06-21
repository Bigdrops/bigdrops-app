import {
  getDefaultPdfDesignPreset,
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import { registerPdfFillableFonts } from '@/lib/pdfFontRegistry'

import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { GreenTemplateDocument } from './GreenTemplate'

interface WaybillPDFProps {
  model?: WaybillRenderModel
  designPreset?: PdfDesignPreset
}

registerPdfFillableFonts()

export default function WaybillPDF({ model, designPreset }: WaybillPDFProps) {
  if (!model) return null

  return <GreenTemplateDocument model={model} designPreset={designPreset} />
}
