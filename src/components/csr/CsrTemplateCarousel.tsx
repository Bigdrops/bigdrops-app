import { useMemo } from 'react'
import TemplatePickerCarousel, { type TemplatePickerOption } from '@/components/document-view/shared/TemplatePickerCarousel'
import type { TemplateMiniTheme } from '@/components/document-view/shared/TemplateMiniPreview'
import { CSR_TEMPLATE_OPTIONS, CSR_TEMPLATE_VARIANTS } from './CSRPreviewContent'

type TemplateOption = {
  key: string
  label: string
  blurb: string
  accent: string
}

function getCsrVariantKey(key: string) {
  if (key === '3') return 'zinc'
  if (key === '4') return 'sentinel'
  if (key === '5') return 'nexus'
  if (key === '6') return 'minimal'
  if (key === '8') return 'industry'
  return 'zinc'
}

interface CsrTemplateCarouselProps {
  value: string
  onChange: (templateId: string) => void
}

export default function CsrTemplateCarousel({ value, onChange }: CsrTemplateCarouselProps) {
  const options = useMemo<TemplatePickerOption[]>(() => {
    const source = CSR_TEMPLATE_OPTIONS as TemplateOption[]
    const variants = CSR_TEMPLATE_VARIANTS as Record<string, TemplateMiniTheme>
    return source.map((option) => ({
      id: option.key,
      label: option.label,
      blurb: option.blurb,
      layout: 'service' as const,
      theme: variants[getCsrVariantKey(option.key)],
    }))
  }, [])

  return <TemplatePickerCarousel value={value} onChange={onChange} options={options} />
}
