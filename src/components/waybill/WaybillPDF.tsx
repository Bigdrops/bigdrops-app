import {
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import { registerPdfFillableFonts } from '@/lib/pdfFontRegistry'

import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { GreenTemplateDocument } from './GreenTemplate'
import { MinimalTemplateDocument } from './MinimalTemplate'
import { ThermalTemplateDocument } from './ThermalTemplate'
import { ClassicTemplateDocument } from './ClassicTemplate'
import { SplitTemplateDocument } from './SplitTemplate'
import { PremiumTemplateDocument } from './PremiumTemplate'
import { IndustryTemplateDocument } from './IndustryTemplate'

type WaybillPdfTemplateId = 'green' | 'minimal' | 'thermal' | 'classic' | 'split' | 'premium' | 'industry'

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

  if (template === 'classic') {
    return <ClassicTemplateDocument model={model} designPreset={designPreset} />
  }

  if (template === 'split') {
    return <SplitTemplateDocument model={model} designPreset={designPreset} />
  }

  if (template === 'premium') {
    return <PremiumTemplateDocument model={model} designPreset={designPreset} />
  }

  if (template === 'industry') {
    return <IndustryTemplateDocument model={model} designPreset={designPreset} />
  }

  return <GreenTemplateDocument model={model} designPreset={designPreset} />
}
