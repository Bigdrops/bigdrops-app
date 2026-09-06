import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'
import TemplateMiniPreview, { type TemplateMiniTheme } from '@/components/document-view/shared/TemplateMiniPreview'

const TEMPLATE_OPTIONS = [
  { id: 'evergreen', label: 'Evergreen', desc: 'Clean green header' },
  { id: 'minimal', label: 'Minimal', desc: 'Bare minimum layout' },
  { id: 'thermal', label: 'Thermal', desc: 'Receipt-style' },
  { id: 'classic', label: 'Classic', desc: 'Traditional layout' },
  { id: 'premium', label: 'Premium', desc: 'Gold-accent premium' },
  { id: 'slate', label: 'Slate', desc: 'Industrial style' },
] as const

const THEMES: Record<string, TemplateMiniTheme> = {
  evergreen:{ pageBg: '#ffffff', headerBg: '#1f6e5c', headerFg: '#ffffff', accent: '#c9d9cf', border: '#e0ece4', mutedBg: '#f0f6f2' },
  minimal:  { pageBg: '#ffffff', headerBg: '#f4f4f4', headerFg: '#000000', accent: '#94a3b8', border: '#e2e8f0', mutedBg: '#fafafa' },
  thermal:  { pageBg: '#f7f3ea', headerBg: '#2d2a26', headerFg: '#ffffff', accent: '#d7cfbf', border: '#e8e4db', mutedBg: '#fffdf8' },
  classic:  { pageBg: '#ffffff', headerBg: '#0f172a', headerFg: '#ffffff', accent: '#1e40af', border: '#e2e8f0', mutedBg: '#f8fafc' },
  premium:  { pageBg: '#fffdf8', headerBg: '#2b2520', headerFg: '#fff8ec', accent: '#bda98f', border: '#eadfce', mutedBg: '#fcf8f1' },
  slate:    { pageBg: '#ffffff', headerBg: '#7d8a88', headerFg: '#ffffff', accent: '#4a5a57', border: '#ecf0ee', mutedBg: '#f9fbfa' },
}

function MiniWaybillPreview({ theme }: { theme: TemplateMiniTheme }) {
  return <TemplateMiniPreview theme={theme} layout="service" accentRule />
}

interface WaybillTemplateSelectorProps {
  value: string
  onChange: (id: string) => void
}

export default function WaybillTemplateSelector({ value, onChange }: WaybillTemplateSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

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
      {TEMPLATE_OPTIONS.map((opt) => {
        const active = value === opt.id
        const theme = THEMES[opt.id]

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'relative flex w-[150px] shrink-0 snap-center flex-col overflow-hidden rounded-[20px] border p-1.5 transition-all duration-200',
              active
                ? 'border-slate-950 bg-slate-950 shadow-lg ring-2 ring-slate-950 ring-offset-2'
                : 'border-border bg-card hover:border-slate-400 hover:shadow-sm',
            )}
          >
            <MiniWaybillPreview theme={theme} />
            <div className="mt-2 flex items-center justify-between gap-1 px-1 pb-0.5">
              <span className={cn(
                'truncate text-xs font-bold leading-tight',
                active ? 'text-white' : 'text-foreground',
              )}>
                {opt.label}
              </span>
              {active && (
                <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <CheckCircle2 className="size-2.5 text-white" />
                </div>
              )}
            </div>
            <p className={cn(
              'px-1 text-[10px] leading-tight',
              active ? 'text-slate-400' : 'text-muted-foreground',
            )}>
              {opt.desc}
            </p>
          </button>
        )
      })}
    </div>
  )
}
