import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import TemplateMiniPreview, { type TemplateMiniTheme } from './TemplateMiniPreview'

// Theme tokens sampled from each template's `*Styles.ts` defaults in
// `src/components/pdf/templates/`. Thumbnails use tokens only —
// no live data, no PDF generation.
const TEMPLATE_OPTIONS: Array<{
  id: string
  label: string
  blurb: string
  theme: TemplateMiniTheme
}> = [
  {
    id: 'industry',
    label: 'Industry',
    blurb: 'Structured',
    theme: { pageBg: '#ffffff', headerBg: '#334155', headerFg: '#ffffff', accent: '#64748b', border: '#e2e8f0', mutedBg: '#f1f5f9' },
  },
  {
    id: 'ledger',
    label: 'Ledger',
    blurb: 'Editorial',
    theme: { pageBg: '#fdfcfb', headerBg: '#2b2b2b', headerFg: '#f4f2ed', accent: '#7b8b6f', border: '#e7e3da', mutedBg: '#f4f2ed' },
  },
  {
    id: 'crest',
    label: 'Crest',
    blurb: 'Gold serif',
    theme: { pageBg: '#fdfbf7', headerBg: '#2d1f3a', headerFg: '#f9f3e6', accent: '#b28b3d', border: '#e4ddd0', mutedBg: '#f7f3ed' },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    blurb: 'Restrained',
    theme: { pageBg: '#ffffff', headerBg: '#f5f5f5', headerFg: '#1a1a1a', accent: '#d4d4d4', border: '#e8e8e8', mutedBg: '#f5f5f5' },
  },
  {
    id: 'evergreen',
    label: 'Evergreen',
    blurb: 'Fresh',
    theme: { pageBg: '#ffffff', headerBg: '#1f6e5c', headerFg: '#ffffff', accent: '#2a8a73', border: '#e8f3ef', mutedBg: '#f0f6f2' },
  },
  {
    id: 'bolt',
    label: 'Bolt',
    blurb: 'Certificate',
    theme: { pageBg: '#faf8f0', headerBg: '#1b4332', headerFg: '#ffffff', accent: '#52b788', border: '#d1d5db', mutedBg: '#f0f7f0' },
  },
  {
    id: 'ember',
    label: 'Ember',
    blurb: 'Warm',
    theme: { pageBg: '#f4f6f8', headerBg: '#2c3e50', headerFg: '#ffffff', accent: '#e67e22', border: '#e9edf2', mutedBg: '#ffffff' },
  },
]

interface CommercialTemplatePickerProps {
  value: string
  onChange: (id: string) => void
}

export default function CommercialTemplatePicker({ value, onChange }: CommercialTemplatePickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll selected card into view on mount
  useEffect(() => {
    if (!scrollRef.current) return
    const index = TEMPLATE_OPTIONS.findIndex((o) => o.id === value)
    if (index < 0) return
    const card = scrollRef.current.children[index] as HTMLElement | undefined
    if (card) {
      card.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
  }, [value])

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
    >
      {TEMPLATE_OPTIONS.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'flex w-[150px] shrink-0 snap-center flex-col overflow-hidden rounded-[20px] border p-1.5 transition-all duration-200',
              active
                ? 'border-slate-950 bg-slate-950 shadow-lg ring-2 ring-slate-950 ring-offset-2'
                : 'border-border bg-card hover:border-slate-400 hover:shadow-sm',
            )}
          >
            <TemplateMiniPreview theme={option.theme} layout="commercial" />
            <div className="mt-2 px-1 pb-1">
              <div className={cn(
                'truncate text-xs font-bold',
                active ? 'text-white' : 'text-foreground',
              )}>
                {option.label}
              </div>
              <div className={cn(
                'mt-0.5 line-clamp-1 text-[10px] leading-tight',
                active ? 'text-slate-400' : 'text-muted-foreground',
              )}>
                {option.blurb}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
