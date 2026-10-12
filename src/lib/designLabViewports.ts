import { useCallback, useMemo, useState } from 'react'

/**
 * Design Lab viewport presets.
 *
 * Shared by the Design Lab experiments that own a viewport switcher:
 * `dashboard-theme` and `invoice-theme`. Each experiment keeps its own
 * selection state, so switching one never moves the other. The Design Lab
 * shell has no viewport switcher of its own.
 *
 * The widths are the project's documented device tiers. They are recovered
 * from repository evidence, not invented:
 *
 *  - `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/02-mobile-first-model.md`
 *    — phone canonical width 430; folded foldable behaves as a phone; foldable
 *    unfolded 500–700 typical; tablet 768–1024 typical; desktop 1024+.
 *  - `src/lib/native/foldAwareness.ts` — the width classes and layout modes
 *    running in production today (compact <600, medium <840, expanded <1200,
 *    desktop ≥1200).
 *  - `src/components/cold-launch/preview-tree-geometry.ts` — the phone frame
 *    fallback (`390 x 844`) used by the Cold Launch preview.
 *  - `docs/reports/general/2026-10-04-cold-launch-concept-diversity-report.md`
 *    — phone 360–430, fold open 640–900.
 *  - `src/components/settings/settings.css` — the project's existing device
 *    simulation surface (`container-type: inline-size` plus `@container`
 *    rules), which this module follows.
 */

export type DesignLabViewportId =
  | 'actual'
  | 'desktop'
  | 'fold-open'
  | 'fold-closed'
  | 'tablet'
  | 'mobile'

/**
 * Composition tier of a simulated width, expressed with the production CSS
 * breakpoints (Tailwind `md` = 768, Tailwind `lg` = 1024). `actual` has no
 * tier: the real device media queries already decide the composition.
 */
export type DesignLabViewportTier = 'actual' | 'phone' | 'tablet' | 'desktop'

export interface DesignLabViewport {
  id: DesignLabViewportId
  /** Full name for the control and for assistive technology. */
  label: string
  /** Short name for the compact control. */
  short: string
  /** Simulated CSS layout width in px. `null` uses the real device width. */
  width: number | null
  tier: DesignLabViewportTier
}

/** Tailwind `md`, the production tablet entry point. */
export const DESIGN_LAB_VIEWPORT_TABLET_MIN = 768

/** Tailwind `lg`, the production desktop entry point. */
export const DESIGN_LAB_VIEWPORT_DESKTOP_MIN = 1024

export const DESIGN_LAB_VIEWPORTS: readonly DesignLabViewport[] = [
  {
    id: 'actual',
    label: 'Actual device',
    short: 'Actual',
    width: null,
    tier: 'actual',
  },
  {
    id: 'desktop',
    label: 'Desktop',
    short: 'Desktop',
    width: 1440,
    tier: 'desktop',
  },
  {
    id: 'fold-open',
    label: 'Fold open',
    short: 'Fold open',
    width: 673,
    tier: 'phone',
  },
  {
    id: 'fold-closed',
    label: 'Fold closed',
    short: 'Fold closed',
    width: 360,
    tier: 'phone',
  },
  {
    id: 'tablet',
    label: 'Tablet',
    short: 'Tablet',
    width: 834,
    tier: 'tablet',
  },
  {
    id: 'mobile',
    label: 'Mobile',
    short: 'Mobile',
    width: 430,
    tier: 'phone',
  },
]

/** The five simulated viewports, in control order. */
export const DESIGN_LAB_SIMULATED_VIEWPORTS: readonly DesignLabViewport[] =
  DESIGN_LAB_VIEWPORTS.filter((viewport) => viewport.id !== 'actual')

export const DESIGN_LAB_DEFAULT_VIEWPORT_ID: DesignLabViewportId = 'actual'

export function getDesignLabViewport(id: DesignLabViewportId): DesignLabViewport {
  return (
    DESIGN_LAB_VIEWPORTS.find((viewport) => viewport.id === id) ??
    DESIGN_LAB_VIEWPORTS[0]
  )
}

export function isDesignLabViewportId(value: string): value is DesignLabViewportId {
  return DESIGN_LAB_VIEWPORTS.some((viewport) => viewport.id === value)
}

/**
 * Independent viewport selection for one experiment.
 *
 * The default is the actual device, so opening an experiment shows it at full
 * available size. The state is local to the calling experiment.
 */
export function useDesignLabViewport(initialId: DesignLabViewportId = DESIGN_LAB_DEFAULT_VIEWPORT_ID) {
  const [viewportId, setViewportId] = useState<DesignLabViewportId>(initialId)

  const viewport = useMemo(() => getDesignLabViewport(viewportId), [viewportId])
  const resetViewport = useCallback(() => setViewportId(DESIGN_LAB_DEFAULT_VIEWPORT_ID), [])

  return {
    viewportId,
    viewport,
    isSimulated: viewport.width !== null,
    setViewportId,
    resetViewport,
  }
}
