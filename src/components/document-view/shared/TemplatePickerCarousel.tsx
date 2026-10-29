import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import TemplateMiniPreview, { type TemplateMiniTheme } from './TemplateMiniPreview'

/**
 * TemplatePickerCarousel — one shared carousel shell for every document
 * family template picker (Invoice, Quotation, Waybill, CSR).
 *
 * Families supply normalized options: identity, labels, theme tokens,
 * miniature layout, optional badge, and optional custom miniature preview.
 * Scrolling, bounds-aware chevron navigation, visible desktop scrollbar,
 * snap, card density, selected state, and label treatment stay identical everywhere.
 */

export interface TemplatePickerOption {
  id: string
  label: string
  blurb: string
  theme: TemplateMiniTheme
  layout: 'service' | 'commercial'
  accentRule?: boolean
  /** Optional badge pill displayed on the preview thumbnail (e.g. 'A4 Landscape'). */
  badge?: string
  /** Optional custom miniature component overriding standard TemplateMiniPreview. */
  customPreview?: React.ReactNode
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
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollBounds = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6)
  }, [])

  // Scroll selected card into view on mount or value change
  useEffect(() => {
    if (!scrollRef.current) return
    const index = options.findIndex((o) => o.id === value)
    if (index < 0) return
    const card = scrollRef.current.children[index] as HTMLElement | undefined
    if (card) {
      card.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
  }, [value, options])

  // Track scroll boundaries for chevron visibility
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollBounds()

    el.addEventListener('scroll', updateScrollBounds, { passive: true })
    window.addEventListener('resize', updateScrollBounds)
    return () => {
      el.removeEventListener('scroll', updateScrollBounds)
      window.removeEventListener('resize', updateScrollBounds)
    }
  }, [updateScrollBounds, options])

  // Step scroll left/right on chevron click
  const scrollByStep = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const stepAmount = Math.max(160, Math.floor(el.clientWidth * 0.7))
    el.scrollBy({
      left: direction === 'left' ? -stepAmount : stepAmount,
      behavior: 'smooth',
    })
  }

  // Horizontal mouse-wheel support on desktop
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY
    }
  }

  // Keyboard navigation for arrow keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      scrollByStep('right')
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      scrollByStep('left')
    }
  }

  return (
    <div className="relative group/carousel -mx-1 px-1" onKeyDown={handleKeyDown}>
      {/* Left Chevron Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByStep('left')}
          aria-label="Scroll templates left"
          className="absolute -left-1.5 top-[38px] z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-md backdrop-blur-xs transition-all hover:scale-105 hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Right Chevron Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByStep('right')}
          aria-label="Scroll templates right"
          className="absolute -right-1.5 top-[38px] z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-md backdrop-blur-xs transition-all hover:scale-105 hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Horizontal Carousel Container with Visible Contrasting Desktop Scrollbar */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        tabIndex={0}
        aria-label="Document Templates Carousel"
        className={cn(
          'flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 pt-0.5 focus:outline-none',
          // High-visibility desktop scrollbar
          '[scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.35)_hsl(var(--muted)/0.4)]',
          '[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-200/80 dark:[&::-webkit-scrollbar-track]:bg-slate-800/80',
          '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/80 hover:[&::-webkit-scrollbar-thumb]:bg-slate-600 dark:[&::-webkit-scrollbar-thumb]:bg-slate-500/80 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-400',
        )}
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
                'flex w-[150px] shrink-0 snap-center flex-col overflow-hidden rounded-[20px] border p-1.5 text-left transition-all duration-200',
                active
                  ? 'border-slate-950 bg-slate-950 shadow-lg ring-2 ring-slate-950 ring-offset-2'
                  : 'border-border bg-card hover:border-slate-400 hover:shadow-sm',
              )}
            >
              {/* Miniature Container */}
              <div className="relative w-full">
                {option.customPreview ? (
                  option.customPreview
                ) : (
                  <TemplateMiniPreview
                    theme={option.theme}
                    layout={option.layout}
                    accentRule={option.accentRule}
                  />
                )}

                {/* Optional Badge Pill */}
                {option.badge && (
                  <span
                    className={cn(
                      'pointer-events-none absolute right-1.5 top-1.5 rounded-[4px] px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider shadow-xs',
                      active
                        ? 'border border-white/40 bg-black/60 text-white backdrop-blur-xs'
                        : 'border border-slate-700/50 bg-slate-900/80 text-white backdrop-blur-xs',
                    )}
                  >
                    {option.badge}
                  </span>
                )}
              </div>

              {/* Title & Blurb */}
              <div className="mt-2 px-1 pb-1">
                <div
                  className={cn(
                    'truncate text-xs font-bold',
                    active ? 'text-white' : 'text-foreground',
                  )}
                >
                  {option.label}
                </div>
                <div
                  className={cn(
                    'mt-0.5 line-clamp-1 text-[10px] leading-tight',
                    active ? 'text-slate-400' : 'text-muted-foreground',
                  )}
                >
                  {option.blurb}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
