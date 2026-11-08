import TemplatePickerCarousel, { type TemplatePickerOption } from './TemplatePickerCarousel'

// Theme tokens sampled from each template's `*Styles.ts` defaults in
// `src/components/pdf/templates/`. Thumbnails use tokens only —
// no live data, no PDF generation.
const TEMPLATE_OPTIONS: TemplatePickerOption[] = [
  {
    id: 'industrial',
    label: 'Industrial',
    blurb: 'Technical · Forme',
    layout: 'commercial',
    theme: { pageBg: '#f6f6f2', headerBg: '#1d2528', headerFg: '#ffffff', accent: '#dc5a21', border: '#1d2528', mutedBg: '#eceeea' },
  },
  {
    id: 'industry',
    label: 'Industry — Forme',
    blurb: 'Structured · Forme',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#7D8A88', headerFg: '#ffffff', accent: '#7D8A88', border: '#e2e8f0', mutedBg: '#f1f5f9' },
  },
  {
    id: 'minimal',
    label: 'Minimal — Forme',
    blurb: 'Restrained · Forme',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#f5f5f5', headerFg: '#1a1a1a', accent: '#d4d4d4', border: '#e8e8e8', mutedBg: '#f5f5f5' },
  },
  {
    id: 'landscape',
    label: 'Landscape',
    blurb: 'Technical · Wide format',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#07192b', headerFg: '#ffffff', accent: '#1d568a', border: '#9cb4c9', mutedBg: '#edf3f8' },
  },
  {
    id: 'evergreen',
    label: 'Evergreen',
    blurb: 'Fresh',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#1f6e5c', headerFg: '#ffffff', accent: '#2a8a73', border: '#e8f3ef', mutedBg: '#f0f6f2' },
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
