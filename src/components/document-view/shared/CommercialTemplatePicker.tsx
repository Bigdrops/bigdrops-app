import { cn } from '@/lib/utils'
import TemplatePickerCarousel, { type TemplatePickerOption } from './TemplatePickerCarousel'
import industrialPreview from '../../../assets/template-previews/industrial.png'
import industryPreview from '../../../assets/template-previews/industry.png'
import minimalPreview from '../../../assets/template-previews/minimal.png'
import landscapePreview from '../../../assets/template-previews/landscape.png'
import evergreenPreview from '../../../assets/template-previews/evergreen.png'
import architecturalPreview from '../../../assets/template-previews/architectural.png'
import executivePreview from '../../../assets/template-previews/executive.png'
import heritagePreview from '../../../assets/template-previews/heritage.png'
import mosaicPreview from '../../../assets/template-previews/mosaic.png'

/**
 * Static miniature previews generated from the actual production Forme
 * renderers (see scripts/generate-commercial-template-previews.ts).
 * No PDF generation or rasterisation happens when the picker opens.
 */
function Preview({
  src,
  alt,
  orientation = 'portrait',
}: {
  src: string
  alt: string
  orientation?: 'portrait' | 'landscape'
}) {
  return (
    <div className="flex h-[154px] w-full items-center justify-center rounded-[14px] bg-slate-100/70 p-1 dark:bg-slate-900/50">
      <img
        src={src}
        alt={alt}
        className={cn(
          'rounded-[8px] object-contain shadow-xs transition-transform duration-200 group-hover:scale-[1.02]',
          orientation === 'landscape' ? 'w-full h-auto max-h-[146px]' : 'h-full w-auto max-w-full',
        )}
        draggable={false}
      />
    </div>
  )
}

// Static miniature previews generated from the actual production Forme
// renderers (see scripts/generate-commercial-template-previews.ts). They are
// ordinary committed PNGs — no PDF generation or rasterisation happens when
// the picker opens.
const TEMPLATE_OPTIONS: TemplatePickerOption[] = [
  {
    id: 'industrial',
    label: 'Industrial',
    blurb: 'Technical · Forme',
    layout: 'commercial',
    theme: { pageBg: '#f6f6f2', headerBg: '#1d2528', headerFg: '#ffffff', accent: '#dc5a21', border: '#1d2528', mutedBg: '#eceeea' },
    customPreview: <Preview src={industrialPreview} alt="Industrial template preview" />,
  },
  {
    id: 'industry',
    label: 'Industry — Forme',
    blurb: 'Structured · Forme',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#7D8A88', headerFg: '#ffffff', accent: '#7D8A88', border: '#e2e8f0', mutedBg: '#f1f5f9' },
    customPreview: <Preview src={industryPreview} alt="Industry template preview" />,
  },
  {
    id: 'minimal',
    label: 'Minimal — Forme',
    blurb: 'Restrained · Forme',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#f5f5f5', headerFg: '#1a1a1a', accent: '#d4d4d4', border: '#e8e8e8', mutedBg: '#f5f5f5' },
    customPreview: <Preview src={minimalPreview} alt="Minimal template preview" />,
  },
  {
    id: 'landscape',
    label: 'Landscape',
    blurb: 'Technical · Wide format',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#07192b', headerFg: '#ffffff', accent: '#1d568a', border: '#9cb4c9', mutedBg: '#edf3f8' },
    badge: 'A4 Landscape',
    customPreview: <Preview src={landscapePreview} alt="Landscape template preview" orientation="landscape" />,
  },
  {
    id: 'evergreen',
    label: 'Evergreen',
    blurb: 'Fresh',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#1f6e5c', headerFg: '#ffffff', accent: '#2a8a73', border: '#e8f3ef', mutedBg: '#f0f6f2' },
    customPreview: <Preview src={evergreenPreview} alt="Evergreen template preview" />,
  },
  {
    id: 'architectural',
    label: 'Architectural',
    blurb: 'Charcoal & Copper',
    layout: 'commercial',
    theme: { pageBg: '#f6f0e4', headerBg: '#1e2427', headerFg: '#ffffff', accent: '#a4663f', border: '#c08a5f', mutedBg: '#ede4d3' },
    customPreview: <Preview src={architecturalPreview} alt="Architectural template preview" />,
  },
  {
    id: 'executive',
    label: 'Executive',
    blurb: 'Forest & Slate',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#173a2c', headerFg: '#ffffff', accent: '#527c91', border: '#9db8c6', mutedBg: '#f4f7f9' },
    customPreview: <Preview src={executivePreview} alt="Executive template preview" />,
  },
  {
    id: 'heritage',
    label: 'Heritage House',
    blurb: 'Burgundy & Bronze',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#5c1a26', headerFg: '#ffffff', accent: '#9a7b45', border: '#d9cbac', mutedBg: '#ffffff' },
    customPreview: <Preview src={heritagePreview} alt="Heritage House template preview" />,
  },
  {
    id: 'mosaic',
    label: 'Mosaic',
    blurb: 'Forest & Lime',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#0d2b1d', headerFg: '#ffffff', accent: '#84cc16', border: '#d6dfd9', mutedBg: '#eef4f0' },
    customPreview: <Preview src={mosaicPreview} alt="Mosaic template preview" />,
  },
]

interface CommercialTemplatePickerProps {
  value: string
  onChange: (id: string) => void
}

export default function CommercialTemplatePicker({ value, onChange }: CommercialTemplatePickerProps) {
  const activeValue = value === 'industry-forme' ? 'industry' : value
  return (
    <TemplatePickerCarousel
      value={activeValue}
      onChange={onChange}
      options={TEMPLATE_OPTIONS}
      hideCardLabels
    />
  )
}
