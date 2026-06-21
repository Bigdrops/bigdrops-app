import { Document, Image, Page, Text, View } from '@react-pdf/renderer'
import {
  getDefaultPdfDesignPreset,
  type PdfDesignPreset,
} from '@/lib/pdfDesignPreset'
import { registerPdfFillableFonts } from '@/lib/pdfFontRegistry'

import type { Waybill } from './waybillUtils'
import type { WaybillRenderModel } from '@/domain/waybill/engine/types'
import { ClassicTemplateDocument } from './ClassicTemplate'
import { MinimalTemplateDocument } from './templates/MinimalTemplate'
import { ThermalTemplateDocument } from './ThermalTemplate'


interface Settings {
  company_name?: string
  company_address?: string
  company_phone?: string
  company_email?: string
  company_logo_url?: string
  company_tagline?: string
}

interface WaybillPDFProps {
  model?: WaybillRenderModel
  waybill: Waybill
  settings: Settings
  designPreset?: PdfDesignPreset
  template?: 'classic' | 'minimal' | 'thermal'
}

registerPdfFillableFonts()

export default function WaybillPDF({ model, waybill: _waybill, designPreset, template }: WaybillPDFProps) {
  if (!model) return null

  if (template === 'minimal') {
    return <MinimalTemplateDocument model={model} designPreset={designPreset} />
  }

  if (template === 'thermal') {
    return <ThermalTemplateDocument model={model} designPreset={designPreset} />
  }

  return <ClassicTemplateDocument model={model} designPreset={designPreset} />
}
