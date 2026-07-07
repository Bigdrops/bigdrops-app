import {
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import { registerPdfFillableFonts } from '@/lib/pdfFontRegistry'

import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { safeValidateRenderModel } from '@/domain/waybill/renderContract'
import { EvergreenTemplateDocument } from './EvergreenTemplate'
import { MinimalTemplateDocument } from './MinimalTemplate'
import { ThermalTemplateDocument } from './ThermalTemplate'
import { ClassicTemplateDocument } from './ClassicTemplate'
import { PremiumTemplateDocument } from './PremiumTemplate'
import { SlateTemplateDocument } from './SlateTemplate'

type WaybillPdfTemplateId = 'evergreen' | 'minimal' | 'thermal' | 'classic' | 'premium' | 'slate'

interface WaybillPDFProps {
  model?: WaybillRenderModel
  designPreset?: PdfDesignPreset
  template?: WaybillPdfTemplateId
}

registerPdfFillableFonts()

export default function WaybillPDF({ model, designPreset, template = 'evergreen' }: WaybillPDFProps) {
  if (!model) return null

  const result = safeValidateRenderModel(model)
  if (!result.success) {
    console.error('Waybill render model validation failed:', result.error.format())
    return null
  }

  if (template === 'minimal') {
    return <MinimalTemplateDocument model={model} designPreset={designPreset} />
  }

  if (template === 'thermal') {
    return <ThermalTemplateDocument model={model} designPreset={designPreset} />
  }

  if (template === 'classic') {
    return <ClassicTemplateDocument model={model} designPreset={designPreset} />
  }

  if (template === 'premium') {
    return <PremiumTemplateDocument model={model} designPreset={designPreset} />
  }

  if (template === 'slate') {
    return <SlateTemplateDocument model={model} designPreset={designPreset} />
  }

  return <EvergreenTemplateDocument model={model} designPreset={designPreset} />
}
