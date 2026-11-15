import React, { useState, type ReactNode } from 'react'
import {
  BookOpen,
  Maximize2,
  Monitor,
  Smartphone,
  Tablet,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type BoluViewportMode =
  | 'actual'
  | 'fold-closed'
  | 'fold-open'
  | 'tablet'
  | 'desktop'

export interface BoluViewportPreset {
  id: BoluViewportMode
  label: string
  short: string
  width: number | null
  height: number | null
  icon: LucideIcon
  hint: string
}

export const BOLU_VIEWPORTS: readonly BoluViewportPreset[] = [
  {
    id: 'actual',
    label: 'Responsive (Actual)',
    short: 'Actual',
    width: null,
    height: null,
    icon: Maximize2,
    hint: 'Adapts to your current screen dimensions with full fluid layout',
  },
  {
    id: 'fold-closed',
    label: 'FoldClosed',
    short: '390px',
    width: 390,
    height: 812,
    icon: Smartphone,
    hint: '390 × 812 · Phone tier (single-column, mobile bottom sheets)',
  },
  {
    id: 'fold-open',
    label: 'FoldOpen',
    short: '828px',
    width: 828,
    height: 700,
    icon: BookOpen,
    hint: '828 × 700 · Foldable unfolded (dual-column cards, wide presentation)',
  },
  {
    id: 'tablet',
    label: 'TabletShell',
    short: '1024px',
    width: 1024,
    height: 740,
    icon: Tablet,
    hint: '1024 × 740 · Tablet shell (two-column card grid, constrained modals)',
  },
  {
    id: 'desktop',
    label: 'DesktopShell',
    short: '1280px',
    width: 1280,
    height: 800,
    icon: Monitor,
    hint: '1280 × 800 · Desktop workspace (three-column catalogue, full canvas)',
  },
] as const

interface BoluViewportStageProps {
  children: ReactNode
  className?: string
  initialMode?: BoluViewportMode
}

export function BoluViewportStage({
  children,
  className,
  initialMode = 'actual',
}: BoluViewportStageProps) {
  const [activeMode, setActiveMode] = useState<BoluViewportMode>(initialMode)

  const activePreset =
    BOLU_VIEWPORTS.find((v) => v.id === activeMode) ?? BOLU_VIEWPORTS[0]

  const isSimulated = activePreset.width !== null

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Viewport Simulation Toolbar */}
      <div className="flex flex-col gap-2 rounded-xl border border-bd-border bg-bd-surface p-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="group" aria-label="Device Viewport Simulation">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-bd-text-soft shrink-0">
            Viewport:
          </span>
          {BOLU_VIEWPORTS.map((preset) => {
            const Icon = preset.icon
            const isSelected = preset.id === activeMode
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setActiveMode(preset.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all shrink-0',
                  isSelected
                    ? 'bg-bd-primary text-white shadow-sm'
                    : 'border border-bd-border/60 bg-bd-surface-muted/60 text-bd-text-muted hover:border-bd-border-strong hover:text-bd-text',
                )}
                title={preset.hint}
              >
                <Icon size={13} aria-hidden="true" />
                <span className="font-medium">{preset.label}</span>
                {preset.width && (
                  <span className={cn('text-[10px]', isSelected ? 'text-white/80' : 'text-bd-text-soft')}>
                    {preset.short}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Viewport Meta & Dimensions Pill */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px] text-bd-text-muted shrink-0">
          <span className="rounded-md border border-bd-border/50 bg-bd-surface-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-bd-text">
            {isSimulated ? `${activePreset.width} × ${activePreset.height} px` : 'Fluid Responsive'}
          </span>
          <span className="hidden md:inline truncate max-w-[280px] text-[10px] text-bd-text-soft" title={activePreset.hint}>
            {activePreset.hint}
          </span>
        </div>
      </div>

      {/* Render Stage: Fluid or Device Shell */}
      {!isSimulated ? (
        <div className="w-full">{children}</div>
      ) : (
        <div className="w-full overflow-x-auto pb-6 pt-2">
          <div className="mx-auto flex justify-center min-w-full">
            <div
              className={cn(
                'relative flex flex-col rounded-2xl border-2 border-bd-border-strong bg-bd-bg shadow-2xl transition-all duration-200',
                activeMode === 'fold-closed' && 'rounded-[38px] p-2 sm:p-3 border-zinc-700/80 ring-8 ring-zinc-800/20',
                activeMode === 'fold-open' && 'rounded-3xl p-3 border-zinc-700/70 ring-4 ring-zinc-800/15',
                activeMode === 'tablet' && 'rounded-2xl p-4 border-zinc-700/60 ring-2 ring-zinc-800/10',
                activeMode === 'desktop' && 'rounded-xl p-4 border-zinc-700/50',
              )}
              style={{
                width: `${activePreset.width}px`,
                minWidth: `${activePreset.width}px`,
                maxWidth: `${activePreset.width}px`,
                height: activePreset.height ? `${activePreset.height}px` : undefined,
                maxHeight: '85vh',
              }}
            >
              {/* Optional Phone Island / Status bar representation */}
              {activeMode === 'fold-closed' && (
                <div className="mb-2 flex items-center justify-between px-3 pt-1 text-[10px] font-semibold text-bd-text-muted select-none">
                  <span>9:41</span>
                  <div className="h-3 w-16 rounded-full bg-zinc-800" />
                  <span className="font-mono text-[9px]">5G · 100%</span>
                </div>
              )}

              {/* Scrollable interior */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-xl bg-bd-bg p-3 sm:p-4">
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
