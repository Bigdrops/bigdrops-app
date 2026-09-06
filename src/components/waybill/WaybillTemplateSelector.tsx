import TemplatePickerCarousel, { type TemplatePickerOption } from '@/components/document-view/shared/TemplatePickerCarousel'

const TEMPLATE_OPTIONS: TemplatePickerOption[] = [
  { id: 'evergreen', label: 'Evergreen', blurb: 'Clean green header', layout: 'service', accentRule: true,
    theme: { pageBg: '#ffffff', headerBg: '#1f6e5c', headerFg: '#ffffff', accent: '#c9d9cf', border: '#e0ece4', mutedBg: '#f0f6f2' } },
  { id: 'minimal', label: 'Minimal', blurb: 'Bare minimum layout', layout: 'service', accentRule: true,
    theme: { pageBg: '#ffffff', headerBg: '#f4f4f4', headerFg: '#000000', accent: '#94a3b8', border: '#e2e8f0', mutedBg: '#fafafa' } },
  { id: 'thermal', label: 'Thermal', blurb: 'Receipt-style', layout: 'service', accentRule: true,
    theme: { pageBg: '#f7f3ea', headerBg: '#2d2a26', headerFg: '#ffffff', accent: '#d7cfbf', border: '#e8e4db', mutedBg: '#fffdf8' } },
  { id: 'classic', label: 'Classic', blurb: 'Traditional layout', layout: 'service', accentRule: true,
    theme: { pageBg: '#ffffff', headerBg: '#0f172a', headerFg: '#ffffff', accent: '#1e40af', border: '#e2e8f0', mutedBg: '#f8fafc' } },
  { id: 'premium', label: 'Premium', blurb: 'Gold-accent premium', layout: 'service', accentRule: true,
    theme: { pageBg: '#fffdf8', headerBg: '#2b2520', headerFg: '#fff8ec', accent: '#bda98f', border: '#eadfce', mutedBg: '#fcf8f1' } },
  { id: 'slate', label: 'Slate', blurb: 'Industrial style', layout: 'service', accentRule: true,
    theme: { pageBg: '#ffffff', headerBg: '#7d8a88', headerFg: '#ffffff', accent: '#4a5a57', border: '#ecf0ee', mutedBg: '#f9fbfa' } },
]

interface WaybillTemplateSelectorProps {
  value: string
  onChange: (id: string) => void
}

export default function WaybillTemplateSelector({ value, onChange }: WaybillTemplateSelectorProps) {
  return <TemplatePickerCarousel value={value} onChange={onChange} options={TEMPLATE_OPTIONS} />
}
