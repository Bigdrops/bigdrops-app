import * as React from 'react'

import {
  getPhotoHeroVars,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
  type PhotoHeroVars,
} from '@/components/onboarding/photo-hero-v2-theme'
import {
  getDarkVariantBundle,
  getDarkVariantSemanticTokens,
  getThemePreset,
  type ThemePresetId,
} from '@/lib/themePresets'

/**
 * Shared theme layer for the Design Lab experiments.
 *
 * One root element carries two token layers for the selected family and
 * appearance:
 *
 *  1. Atmosphere — `getPhotoHeroVars(family, appearance)`: the Design Lab
 *     canvas (scene gradient, light fields, glass recipe, chrome ink).
 *  2. Surface — the theme registry bundle and the PRD semantic tokens in
 *     production HSL-triplet format, so every `hsl(var(--…))` consumer inside
 *     the mounted production presentation resolves.
 *
 * The values match what `AppThemeManager` writes to the document root. The
 * experiments never write there: the layer is scoped to the experiment root.
 */

// Material opacity. Light surfaces sit on a light canvas and need more body
// than dark surfaces on a dark canvas. Content stays legible: text tokens stay
// opaque and are not in this table.
export const MATERIAL_ALPHA: Record<
  PhotoHeroAppearance,
  { surface: number; raised: number; muted: number; chrome: number }
> = {
  light: { surface: 0.88, raised: 0.78, muted: 0.72, chrome: 0.82 },
  dark: { surface: 0.74, raised: 0.62, muted: 0.5, chrome: 0.68 },
}

/** Production surface tokens that carry the atmosphere, mapped to their alpha. */
export const MATERIAL_TOKENS: ReadonlyArray<
  readonly [string, keyof (typeof MATERIAL_ALPHA)['light']]
> = [
  ['--surface', 'surface'],
  ['--bd-surface', 'surface'],
  ['--bd-card-bg', 'surface'],
  ['--surface-raised', 'raised'],
  ['--bd-surface-raised', 'raised'],
  ['--bd-overlay-section-bg', 'raised'],
  ['--bd-surface-action', 'raised'],
  ['--bd-surface-action-hover', 'raised'],
  ['--surface-muted', 'muted'],
  ['--bd-surface-muted', 'muted'],
  ['--bd-input-bg', 'muted'],
  ['--bd-overlay-input-bg', 'muted'],
  ['--bd-overlay-close-bg', 'muted'],
  ['--bd-overlay-disabled-bg', 'muted'],
  ['--bd-status-neutral-bg', 'muted'],
  ['--bd-layout-sidebar', 'muted'],
  ['--bd-overlay-bg', 'chrome'],
  ['--bd-overlay-footer-bg', 'chrome'],
]

/** Border tokens. The normalizer drops rgba line values from the bundle. */
export const LINE_TOKENS = [
  '--border',
  '--input',
  '--bd-border',
  '--bd-card-border',
  '--bd-overlay-border',
  '--bd-surface-action-border',
  '--bd-status-neutral-border',
]

/** Resolve a theme mode to the appearance the app would show right now. */
export function resolveAppearance(mode: 'light' | 'dark' | 'system'): PhotoHeroAppearance {
  if (mode === 'dark') return 'dark'
  if (mode === 'light') return 'light'
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** `H S% L%` becomes `H S% L% / a`. Values that already carry alpha pass through. */
export function withAlpha(triplet: string, alpha: number): string {
  const value = String(triplet || '').trim()
  if (!value) return value
  return value.includes('/') ? value : `${value} / ${alpha}`
}

/** Viewport width at the production desktop breakpoint (Tailwind `lg`). */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = React.useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
  )

  React.useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}

/**
 * Production-format token layer for one family and appearance.
 *
 * `AppThemeManager` writes these values to the document root. This function
 * builds the same set for one scoped element, then keeps an alpha channel on the
 * material surfaces so the Design Lab canvas reads through every card,
 * navigation surface, panel, and input of the mounted production presentation.
 */
export function experimentTokens(
  family: PhotoHeroFamilyId,
  appearance: PhotoHeroAppearance,
  atmosphere: PhotoHeroVars,
): React.CSSProperties {
  const presetId = family as ThemePresetId
  const preset = getThemePreset(family)
  const bundle =
    appearance === 'dark'
      ? getDarkVariantBundle(presetId) ?? preset?.bundle ?? {}
      : preset?.bundle ?? {}
  const semantic =
    appearance === 'dark'
      ? getDarkVariantSemanticTokens(presetId) ?? preset?.semanticTokens ?? {}
      : preset?.semanticTokens ?? {}

  const style: Record<string, string> = {}
  for (const [token, value] of Object.entries(bundle)) {
    if (typeof value === 'string' && value) style[`--${token}`] = value
  }
  for (const [token, value] of Object.entries(semantic)) {
    if (typeof value === 'string' && value) style[token] = value
  }

  const alpha = MATERIAL_ALPHA[appearance]

  for (const [token, key] of MATERIAL_TOKENS) {
    const base = style[token] ?? style[token.slice(2)]
    if (typeof base === 'string' && base) style[token] = withAlpha(base, alpha[key])
  }

  const line = semantic['--line']
  const lineStrong = semantic['--line-strong']
  if (line) for (const token of LINE_TOKENS) style[token] = line
  if (lineStrong) {
    style['--bd-border-strong'] = lineStrong
    style['--bd-input-border'] = lineStrong
  }

  // Opaque family chrome, consumed by the experiment header treatment.
  const chrome = semantic['--bg']
  if (typeof chrome === 'string' && chrome) style['--dlv-chrome'] = chrome

  // The mobile bottom navigation accepts a full colour, so it takes the glass
  // recipe directly. `--primary-soft` has no definition in the app today; the
  // experiments define it so the workspace mark resolves.
  const glass = atmosphere['--glass-bg']
  if (typeof glass === 'string' && glass) style['--nav'] = glass
  const primary = style['--primary']
  if (typeof primary === 'string' && primary) style['--primary-soft'] = withAlpha(primary, 0.14)

  return style as React.CSSProperties
}

/** Atmosphere plus the surface layer, ready for the experiment root element. */
export function useExperimentThemeStyle(family: PhotoHeroFamilyId, appearance: PhotoHeroAppearance) {
  const atmosphere = React.useMemo(() => getPhotoHeroVars(family, appearance), [family, appearance])
  const tokens = React.useMemo(
    () => experimentTokens(family, appearance, atmosphere),
    [family, appearance, atmosphere],
  )
  const rootStyle = React.useMemo(
    () => ({ ...atmosphere, ...tokens }) as React.CSSProperties,
    [atmosphere, tokens],
  )

  return { atmosphere, tokens, rootStyle }
}
