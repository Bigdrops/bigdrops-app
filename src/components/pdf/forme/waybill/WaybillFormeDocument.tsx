import type React from 'react'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { safeValidateRenderModel } from '@/domain/waybill/renderContract'
import type { WaybillPdfTemplateId } from '@/components/waybill/waybillUtils'
import { EvergreenWaybillFormeDocument } from './EvergreenWaybillFormeDocument'
import { MinimalWaybillFormeDocument } from './MinimalWaybillFormeDocument'
import { ThermalWaybillFormeDocument } from './ThermalWaybillFormeDocument'
import { ClassicWaybillFormeDocument } from './ClassicWaybillFormeDocument'
import { PremiumWaybillFormeDocument } from './PremiumWaybillFormeDocument'
import { SlateWaybillFormeDocument } from './SlateWaybillFormeDocument'

export interface WaybillFormeDocumentProps {
  model?: WaybillRenderModel
  designPreset?: PdfDesignPreset
  template?: WaybillPdfTemplateId
}

export function WaybillFormeDocument({ model, designPreset, template = 'evergreen' }: WaybillFormeDocumentProps): React.JSX.Element | null {
  if (!model) return null

  const result = safeValidateRenderModel(model)
  if (!result.success) {
    console.error('Waybill render model validation failed:', result.error.format())
    return null
  }

  switch (template) {
    case 'minimal':
      return <MinimalWaybillFormeDocument model={model} designPreset={designPreset} />
    case 'thermal':
      return <ThermalWaybillFormeDocument model={model} designPreset={designPreset} />
    case 'classic':
      return <ClassicWaybillFormeDocument model={model} designPreset={designPreset} />
    case 'premium':
      return <PremiumWaybillFormeDocument model={model} designPreset={designPreset} />
    case 'slate':
      return <SlateWaybillFormeDocument model={model} designPreset={designPreset} />
    case 'evergreen':
    default:
      return <EvergreenWaybillFormeDocument model={model} designPreset={designPreset} />
  }
}
