import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import TemplateMiniPreview, { type TemplateMiniTheme } from '@/components/document-view/shared/TemplateMiniPreview'
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

function MiniTemplatePreview({ theme }: { theme: TemplateMiniTheme }) {
  return <TemplateMiniPreview theme={theme} layout="service" />
}

interface CsrTemplateCarouselProps {
  value: string
  onChange: (templateId: string) => void
}

export default function CsrTemplateCarousel({ value, onChange }: CsrTemplateCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const options = CSR_TEMPLATE_OPTIONS as TemplateOption[]
  const variants = CSR_TEMPLATE_VARIANTS as Record<string, TemplateMiniTheme>

  // Scroll selected card into view on mount
  useEffect(() => {
    if (!scrollRef.current) return
    const index = options.findIndex((o) => o.key === value)
    if (index < 0) return
    const card = scrollRef.current.children[index] as HTMLElement | undefined
    if (card) {
      card.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
  }, [value, options])

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
    >
      {options.map((option) => {
        const active = value === option.key
        const theme = variants[getCsrVariantKey(option.key)]

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              'flex w-[160px] shrink-0 snap-center flex-col overflow-hidden rounded-[18px] border p-1.5 transition-all duration-200',
              active
                ? 'border-slate-950 bg-slate-950 shadow-lg ring-2 ring-slate-950 ring-offset-2'
                : 'border-border bg-card hover:border-slate-400 hover:shadow-sm',
            )}
          >
            <MiniTemplatePreview theme={theme} />
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
