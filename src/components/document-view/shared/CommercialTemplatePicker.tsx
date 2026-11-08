import TemplatePickerCarousel, { type TemplatePickerOption } from './TemplatePickerCarousel'
import CommercialTemplateMiniature from './CommercialTemplateMiniature'

// Theme tokens sampled from each template's `*Styles.ts` defaults in
// `src/components/pdf/templates/`. Each option supplies a faithful
// template-specific miniature (CommercialTemplateMiniature) — no live
// data, no PDF generation.
const TEMPLATE_OPTIONS: TemplatePickerOption[] = [
  {
    id: 'industrial',
    label: 'Industrial',
    blurb: 'Technical · Forme',
    layout: 'commercial',
    theme: { pageBg: '#f6f6f2', headerBg: '#1d2528', headerFg: '#ffffff', accent: '#dc5a21', border: '#1d2528', mutedBg: '#eceeea' },
    customPreview: <CommercialTemplateMiniature templateId="industrial" />,
  },
  {
    id: 'industry',
    label: 'Industry — Forme',
    blurb: 'Structured · Forme',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#7D8A88', headerFg: '#ffffff', accent: '#7D8A88', border: '#e2e8f0', mutedBg: '#f1f5f9' },
    customPreview: <CommercialTemplateMiniature templateId="industry" />,
  },
  {
    id: 'minimal',
    label: 'Minimal — Forme',
    blurb: 'Restrained · Forme',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#f5f5f5', headerFg: '#1a1a1a', accent: '#d4d4d4', border: '#e8e8e8', mutedBg: '#f5f5f5' },
    customPreview: <CommercialTemplateMiniature templateId="minimal" />,
  },
  {
    id: 'landscape',
    label: 'Landscape',
    blurb: 'Technical · Wide format',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#07192b', headerFg: '#ffffff', accent: '#1d568a', border: '#9cb4c9', mutedBg: '#edf3f8' },
    badge: 'A4 Landscape',
    customPreview: <CommercialTemplateMiniature templateId="landscape" />,
  },
  {
    id: 'evergreen',
    label: 'Evergreen',
    blurb: 'Fresh',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#1f6e5c', headerFg: '#ffffff', accent: '#2a8a73', border: '#e8f3ef', mutedBg: '#f0f6f2' },
    customPreview: <CommercialTemplateMiniature templateId="evergreen" />,
  },
  {
    id: 'architectural',
    label: 'Architectural',
    blurb: 'Charcoal & Copper',
    layout: 'commercial',
    theme: { pageBg: '#f6f0e4', headerBg: '#1e2427', headerFg: '#ffffff', accent: '#a4663f', border: '#c08a5f', mutedBg: '#ede4d3' },
    customPreview: <CommercialTemplateMiniature templateId="architectural" />,
  },
  {
    id: 'executive',
    label: 'Executive',
    blurb: 'Forest & Gold',
    layout: 'commercial',
    theme: { pageBg: '#fcf9f2', headerBg: '#173a2c', headerFg: '#ffffff', accent: '#a9854f', border: '#d8c39c', mutedBg: '#f6f0e2' },
    customPreview: <CommercialTemplateMiniature templateId="executive" />,
  },
  {
    id: 'heritage',
    label: 'Heritage House',
    blurb: 'Burgundy & Bronze',
    layout: 'commercial',
    theme: { pageBg: '#f8f2e3', headerBg: '#5c1a26', headerFg: '#ffffff', accent: '#9a7b45', border: '#d9cbac', mutedBg: '#f2e9d4' },
    customPreview: <CommercialTemplateMiniature templateId="heritage" />,
  },
]

interface CommercialTemplatePickerProps {
  value: string
  onChange: (id: string) => void
}

export default function CommercialTemplatePicker({ value, onChange }: CommercialTemplatePickerProps) {
  const activeValue = value === 'industry-forme' ? 'industry' : value
  return <TemplatePickerCarousel value={activeValue} onChange={onChange} options={TEMPLATE_OPTIONS} />
}
