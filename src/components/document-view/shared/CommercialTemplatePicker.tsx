import TemplatePickerCarousel, { type TemplatePickerOption } from './TemplatePickerCarousel'

// Theme tokens sampled from each template's `*Styles.ts` defaults in
// `src/components/pdf/templates/`. Thumbnails use tokens only —
// no live data, no PDF generation.
const TEMPLATE_OPTIONS: TemplatePickerOption[] = [
  {
    id: 'industry',
    label: 'Industry',
    blurb: 'Structured',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#334155', headerFg: '#ffffff', accent: '#64748b', border: '#e2e8f0', mutedBg: '#f1f5f9' },
  },
  {
    id: 'ledger',
    label: 'Ledger',
    blurb: 'Editorial',
    layout: 'commercial',
    theme: { pageBg: '#fdfcfb', headerBg: '#2b2b2b', headerFg: '#f4f2ed', accent: '#7b8b6f', border: '#e7e3da', mutedBg: '#f4f2ed' },
  },
  {
    id: 'crest',
    label: 'Crest',
    blurb: 'Gold serif',
    layout: 'commercial',
    theme: { pageBg: '#fdfbf7', headerBg: '#2d1f3a', headerFg: '#f9f3e6', accent: '#b28b3d', border: '#e4ddd0', mutedBg: '#f7f3ed' },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    blurb: 'Restrained',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#f5f5f5', headerFg: '#1a1a1a', accent: '#d4d4d4', border: '#e8e8e8', mutedBg: '#f5f5f5' },
  },
  {
    id: 'evergreen',
    label: 'Evergreen',
    blurb: 'Fresh',
    layout: 'commercial',
    theme: { pageBg: '#ffffff', headerBg: '#1f6e5c', headerFg: '#ffffff', accent: '#2a8a73', border: '#e8f3ef', mutedBg: '#f0f6f2' },
  },
  {
    id: 'bolt',
    label: 'Bolt',
    blurb: 'Certificate',
    layout: 'commercial',
    theme: { pageBg: '#faf8f0', headerBg: '#1b4332', headerFg: '#ffffff', accent: '#52b788', border: '#d1d5db', mutedBg: '#f0f7f0' },
  },
  {
    id: 'ember',
    label: 'Ember',
    blurb: 'Warm',
    layout: 'commercial',
    theme: { pageBg: '#f4f6f8', headerBg: '#2c3e50', headerFg: '#ffffff', accent: '#e67e22', border: '#e9edf2', mutedBg: '#ffffff' },
  },
]

interface CommercialTemplatePickerProps {
  value: string
  onChange: (id: string) => void
}

export default function CommercialTemplatePicker({ value, onChange }: CommercialTemplatePickerProps) {
  return <TemplatePickerCarousel value={value} onChange={onChange} options={TEMPLATE_OPTIONS} />
}
