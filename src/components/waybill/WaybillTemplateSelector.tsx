import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

type TemplateTheme = {
  pageBg: string
  headerBg: string
  headerFg: string
  accent: string
  border: string
  mutedBg: string
}

const TEMPLATE_OPTIONS = [
  { id: 'green', label: 'Green', desc: 'Clean green header' },
  { id: 'minimal', label: 'Minimal', desc: 'Bare minimum layout' },
  { id: 'thermal', label: 'Thermal', desc: 'Receipt-style' },
  { id: 'classic', label: 'Classic', desc: 'Traditional layout' },
  { id: 'split', label: 'Split', desc: 'Split-panel design' },
  { id: 'premium', label: 'Premium', desc: 'Gold-accent premium' },
  { id: 'industry', label: 'Industry', desc: 'Industrial style' },
] as const

const THEMES: Record<string, TemplateTheme> = {
  green:    { pageBg: '#ffffff', headerBg: '#1f6e5c', headerFg: '#ffffff', accent: '#c9d9cf', border: '#e0ece4', mutedBg: '#f0f6f2' },
  minimal:  { pageBg: '#ffffff', headerBg: '#f4f4f4', headerFg: '#000000', accent: '#94a3b8', border: '#e2e8f0', mutedBg: '#fafafa' },
  thermal:  { pageBg: '#f7f3ea', headerBg: '#2d2a26', headerFg: '#ffffff', accent: '#d7cfbf', border: '#e8e4db', mutedBg: '#fffdf8' },
  classic:  { pageBg: '#ffffff', headerBg: '#0f172a', headerFg: '#ffffff', accent: '#1e40af', border: '#e2e8f0', mutedBg: '#f8fafc' },
  split:    { pageBg: '#ffffff', headerBg: '#1e2b32', headerFg: '#ffffff', accent: '#d97a4a', border: '#dce3e8', mutedBg: '#f6f8f9' },
  premium:  { pageBg: '#fffdf8', headerBg: '#2b2520', headerFg: '#fff8ec', accent: '#bda98f', border: '#eadfce', mutedBg: '#fcf8f1' },
  industry: { pageBg: '#ffffff', headerBg: '#7d8a88', headerFg: '#ffffff', accent: '#4a5a57', border: '#ecf0ee', mutedBg: '#f9fbfa' },
}

function MiniWaybillPreview({ theme }: { theme: TemplateTheme }) {
  return (
    <div
      className="flex h-[80px] flex-col overflow-hidden rounded-[16px] border"
      style={{ backgroundColor: theme.pageBg, borderColor: theme.border }}
    >
      <div
        className="flex h-[18px] items-center gap-1.5 px-2"
        style={{ backgroundColor: theme.headerBg }}
      >
        <div className="size-2 rounded-full" style={{ backgroundColor: theme.headerFg, opacity: 0.8 }} />
        <div className="h-[4px] w-[40%] rounded-full" style={{ backgroundColor: theme.headerFg, opacity: 0.6 }} />
      </div>
      <div className="h-[3px]" style={{ backgroundColor: theme.accent }} />
      <div className="flex flex-1 flex-col justify-center gap-1.5 px-2 pb-1.5">
        <div className="h-[3px] w-full rounded-full" style={{ backgroundColor: theme.border }} />
        <div className="h-[3px] w-[65%] rounded-full" style={{ backgroundColor: theme.accent, opacity: 0.5 }} />
        <div className="flex gap-1.5">
          <div className="h-[3px] flex-1 rounded-full" style={{ backgroundColor: theme.border, opacity: 0.4 }} />
          <div className="h-[3px] w-[30%] rounded-full" style={{ backgroundColor: theme.mutedBg }} />
        </div>
      </div>
    </div>
  )
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
