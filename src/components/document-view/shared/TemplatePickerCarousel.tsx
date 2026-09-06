import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import TemplateMiniPreview, { type TemplateMiniTheme } from './TemplateMiniPreview'

/**
 * TemplatePickerCarousel — one shared carousel shell for every document
 * family template picker (Invoice, Quotation, Waybill, CSR).
 *
 * Families supply normalized options only: identity, labels, theme tokens,
 * and miniature layout. Scrolling, snap, card density, selected state,
 * and label treatment stay identical everywhere.
 */

export interface TemplatePickerOption {
  id: string
  label: string
  blurb: string
  theme: TemplateMiniTheme
  layout: 'service' | 'commercial'
  accentRule?: boolean
}

interface TemplatePickerCarouselProps {
  value: string
  onChange: (id: string) => void
  options: TemplatePickerOption[]
}

export default function TemplatePickerCarousel({
  value,
  onChange,
  options,
}: TemplatePickerCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll selected card into view on mount
  useEffect(() => {
    if (!scrollRef.current) return
    const index = options.findIndex((o) => o.id === value)
    if (index < 0) return
    const card = scrollRef.current.children[index] as HTMLElement | undefined
    if (card) {
      card.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
  }, [value, options])

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
    >
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={cn(
              'flex w-[150px] shrink-0 snap-center flex-col overflow-hidden rounded-[20px] border p-1.5 transition-all duration-200',
              active
                ? 'border-slate-950 bg-slate-950 shadow-lg ring-2 ring-slate-950 ring-offset-2'
                : 'border-border bg-card hover:border-slate-400 hover:shadow-sm',
            )}
          >
            <TemplateMiniPreview
              theme={option.theme}
              layout={option.layout}
              accentRule={option.accentRule}
            />
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
