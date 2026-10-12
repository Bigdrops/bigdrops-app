import * as React from 'react'

import type { DesignLabViewport, DesignLabViewportId } from '@/lib/designLabViewports'
import { DESIGN_LAB_VIEWPORTS } from '@/lib/designLabViewports'
import './design-lab-viewport.css'

/**
 * Shared Design Lab viewport controls.
 *
 * The Design Lab experiments (Dashboard Theme, Invoice Form Theme) place this
 * switcher inside their own compact Customisation popover. It renders markup
 * only: the calling experiment owns the selection state, so each experiment
 * keeps an independent viewport.
 */
export function ViewportSwitcher({
  viewportId,
  onSelect,
}: {
  viewportId: DesignLabViewportId
  onSelect: (id: DesignLabViewportId) => void
}) {
  return (
    <div className="dlv-group" role="group" aria-label="Viewport">
      {DESIGN_LAB_VIEWPORTS.map((viewport) => {
        const selected = viewport.id === viewportId
        return (
          <button
            key={viewport.id}
            type="button"
            className="dlv-switch-btn"
            aria-pressed={selected}
            aria-label={
              viewport.width === null
                ? 'Use the actual device width'
                : `Simulate a ${viewport.label} viewport at ${viewport.width}px`
            }
            title={viewport.width === null ? 'Actual device' : `${viewport.width}px`}
            onClick={() => onSelect(viewport.id)}
          >
            {viewport.short}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The surface a simulated viewport is applied to.
 *
 * `actual` keeps the real device viewport. A simulated viewport applies its
 * documented layout width as a real CSS width: text, controls, and fields are
 * never scaled. When the simulated width is wider than the host, the stage
 * scrolls horizontally instead of shrinking the content.
 */
export function ViewportStage({
  viewport,
  className,
  children,
}: {
  viewport: DesignLabViewport
  className?: string
  children: React.ReactNode
}) {
  const simulated = viewport.width !== null

  return (
    <div
      className={className ? `dlv-stage ${className}` : 'dlv-stage'}
      data-dlv-viewport={viewport.id}
      data-dlv-tier={viewport.tier}
      {...(simulated ? { 'data-dlv-sim': '' } : {})}
      style={
        simulated
          ? ({ '--dlv-width': `${viewport.width}px` } as React.CSSProperties)
          : undefined
      }
    >
      <div className="dlv-surface" data-dlv-surface="">
        {children}
      </div>
    </div>
  )
}
