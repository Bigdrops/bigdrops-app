/**
 * Preview-only theme derivation for the Onboarding V2 (`/photohero-preview`) experiment.
 *
 * Theme family and appearance mode are independent dimensions:
 *   family:     slate-navy | amber-terracotta | ocean-teal | rose-gold | forest-green
 *   appearance: light | dark
 *
 * Base tokens (canvas, surfaces, ink, lines, primary) are read live from the
 * existing theme registry (`@/lib/themePresets`) — light from `getThemePreset`,
 * dark from `getDarkVariantSemanticTokens`. No palette is duplicated here and no
 * global theme state is touched; the caller applies the returned custom
 * properties to the preview container only.
 *
 * The cinematic recipe (scene gradients, light fields, glass recipe) has no
 * registry equivalent:
 *   - dark: the approved PhotoHero V2 baseline, preserved literally.
 *   - light: one shared white-primary recipe built with `color-mix` from the
 *     registry triplets, so every family keeps its own atmospheric character
 *     without a per-family hardcoded palette.
 */

import { getDarkVariantSemanticTokens, getThemePreset } from '@/lib/themePresets'

export const PHOTO_HERO_FAMILIES = [
  'slate-navy',
  'amber-terracotta',
  'ocean-teal',
  'rose-gold',
  'forest-green',
] as const

export type PhotoHeroFamilyId = (typeof PHOTO_HERO_FAMILIES)[number]
export type PhotoHeroAppearance = 'light' | 'dark'

/** CSS custom properties (with `--` prefix) for one family × appearance combo. */
export type PhotoHeroVars = Record<string, string>

export function isPhotoHeroFamilyId(value: unknown): value is PhotoHeroFamilyId {
  return typeof value === 'string' && (PHOTO_HERO_FAMILIES as readonly string[]).includes(value)
}

export const PHOTO_HERO_FAMILY_META: ReadonlyArray<{
  id: PhotoHeroFamilyId
  label: string
  short: string
  swatch: string
}> = [
  { id: 'slate-navy', label: 'Slate Navy', short: 'Navy', swatch: '#60a5fa' },
  { id: 'amber-terracotta', label: 'Amber Terracotta', short: 'Amber', swatch: '#f59e0b' },
  { id: 'ocean-teal', label: 'Ocean Teal', short: 'Teal', swatch: '#2dd4bf' },
  { id: 'rose-gold', label: 'Rose Gold', short: 'Rose', swatch: '#f472b6' },
  { id: 'forest-green', label: 'Forest Green', short: 'Forest', swatch: '#4ade80' },
]

const FAMILY_NAMES: Record<PhotoHeroFamilyId, string> = {
  'slate-navy': 'Slate Navy',
  'amber-terracotta': 'Amber Terracotta',
  'ocean-teal': 'Ocean Teal',
  'rose-gold': 'Rose Gold',
  'forest-green': 'Forest Green',
}

// ── Approved dark cinematic baseline (PhotoHero V2 reference, preserved) ──
// ponytail: literal recipe strings; the registry holds no scene/field/glass
// equivalent, and dark must not regress. Light stays fully derived below.

type DarkRecipe = {
  primaryInk: string
  info: string
  glassBg: string
  glassLine: string
  glassShadow: string
  intro: string
  invoicing: string
  logi: string
  projects: string
  fieldA: string
  fieldB: string
  fieldC: string
  deepA: string
  deepB: string
  heroAccent: string
}

const DARK_RECIPES: Record<PhotoHeroFamilyId, DarkRecipe> = {
  'slate-navy': {
    primaryInk: '#0f172a',
    info: '#93c5fd',
    glassBg: 'rgba(15,23,42,.5)',
    glassLine: 'rgba(148,163,184,.22)',
    glassShadow: 'rgba(15,23,42,.28)',
    intro: 'linear-gradient(165deg,#16283f 0%,#1e3a5f 44%,#3b5c82 78%,#7d97b4 100%)',
    invoicing: 'linear-gradient(160deg,#101d30 0%,#1e3a5f 52%,#4a6890 100%)',
    logi: 'linear-gradient(180deg,#0b1524 0%,#13233a 46%,#27496f 100%)',
    projects: 'linear-gradient(155deg,#0e1b2e 0%,#1e3a5f 60%,#33517a 100%)',
    fieldA: '#60a5fa',
    fieldB: '#93c5fd',
    fieldC: '#fbbf24',
    deepA: '#0b1524',
    deepB: '#13233a',
    heroAccent: '#60a5fa',
  },
  'amber-terracotta': {
    primaryInk: '#1a1714',
    info: '#fdba74',
    glassBg: 'rgba(36,32,25,.54)',
    glassLine: 'rgba(251,191,36,.24)',
    glassShadow: 'rgba(15,9,3,.36)',
    intro: 'linear-gradient(165deg,#1a1714 0%,#3a2512 40%,#8a4d12 76%,#f59e0b 118%)',
    invoicing: 'linear-gradient(160deg,#120f0c 0%,#422710 52%,#a16207 112%)',
    logi: 'linear-gradient(180deg,#100c08 0%,#2b1b0d 48%,#7c3f11 112%)',
    projects: 'linear-gradient(155deg,#15100b 0%,#3a2512 58%,#8b4513 112%)',
    fieldA: '#f59e0b',
    fieldB: '#fdba74',
    fieldC: '#fb923c',
    deepA: '#120f0c',
    deepB: '#2c1b0d',
    heroAccent: '#fbbf24',
  },
  'ocean-teal': {
    primaryInk: '#082f2e',
    info: '#67e8f9',
    glassBg: 'rgba(16,42,42,.54)',
    glassLine: 'rgba(94,234,212,.24)',
    glassShadow: 'rgba(1,18,18,.38)',
    intro: 'linear-gradient(165deg,#081817 0%,#0f3a38 44%,#0f766e 78%,#67e8f9 118%)',
    invoicing: 'linear-gradient(160deg,#061413 0%,#0f3a38 52%,#0891b2 112%)',
    logi: 'linear-gradient(180deg,#061313 0%,#0b2b2a 46%,#0e7490 112%)',
    projects: 'linear-gradient(155deg,#071817 0%,#0f3a38 60%,#115e59 112%)',
    fieldA: '#2dd4bf',
    fieldB: '#67e8f9',
    fieldC: '#22d3ee',
    deepA: '#061313',
    deepB: '#0b2b2a',
    heroAccent: '#5eead4',
  },
  'rose-gold': {
    primaryInk: '#1a0f12',
    info: '#f9a8d4',
    glassBg: 'rgba(36,20,28,.56)',
    glassLine: 'rgba(249,168,212,.24)',
    glassShadow: 'rgba(24,3,12,.38)',
    intro: 'linear-gradient(165deg,#1a0f12 0%,#4a182b 44%,#9f1239 80%,#f9a8d4 122%)',
    invoicing: 'linear-gradient(160deg,#13090d 0%,#4a182b 54%,#be185d 116%)',
    logi: 'linear-gradient(180deg,#12080c 0%,#31121f 46%,#9f1239 112%)',
    projects: 'linear-gradient(155deg,#170b10 0%,#4a182b 60%,#831843 112%)',
    fieldA: '#f472b6',
    fieldB: '#f9a8d4',
    fieldC: '#fb7185',
    deepA: '#12080c',
    deepB: '#31121f',
    heroAccent: '#f9a8d4',
  },
  'forest-green': {
    primaryInk: '#052e16',
    info: '#86efac',
    glassBg: 'rgba(20,34,24,.56)',
    glassLine: 'rgba(134,239,172,.23)',
    glassShadow: 'rgba(1,17,5,.4)',
    intro: 'linear-gradient(165deg,#071508 0%,#12301a 42%,#166534 78%,#86efac 120%)',
    invoicing: 'linear-gradient(160deg,#061207 0%,#12301a 52%,#15803d 112%)',
    logi: 'linear-gradient(180deg,#051006 0%,#0d2514 46%,#166534 112%)',
    projects: 'linear-gradient(155deg,#071508 0%,#12301a 60%,#14532d 112%)',
    fieldA: '#4ade80',
    fieldB: '#86efac',
    fieldC: '#22c55e',
    deepA: '#051006',
    deepB: '#0d2514',
    heroAccent: '#86efac',
  },
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Wrap a registry `H S% L%` triplet channel for `hsl()` use. */
function hslOf(tokens: Record<string, string>, key: string, fallback: string): string {
  const raw = tokens[key]
  if (!raw || raw.startsWith('rgba') || raw.startsWith('#') || raw.startsWith('linear')) {
    return raw || fallback
  }
  return `hsl(${raw})`
}

/** Registry line tokens are already `rgba()` strings; pass through. */
function rawOf(tokens: Record<string, string>, key: string, fallback: string): string {
  return tokens[key] || fallback
}

function hslTripletRef(tokens: Record<string, string>, key: string): string {
  // Returns the bare `H S% L%` triplet so callers can embed it in color-mix().
  return tokens[key] && !tokens[key].startsWith('rgba') ? tokens[key] : '220 10% 50%'
}

// ── Public API ──────────────────────────────────────────────────────────

export function getPhotoHeroVars(family: PhotoHeroFamilyId, appearance: PhotoHeroAppearance): PhotoHeroVars {
  if (appearance === 'dark') return darkVars(family)
  return lightVars(family)
}

function baseFrom(tokens: Record<string, string>): PhotoHeroVars {
  return {
    '--bg': hslOf(tokens, '--bg', '#0f172a'),
    '--surface': hslOf(tokens, '--surface', '#1e293b'),
    '--surface-muted': hslOf(tokens, '--surface-muted', '#334155'),
    '--surface-strong': hslOf(tokens, '--surface-strong', '#475569'),
    '--surface-raised': hslOf(tokens, '--surface-raised', '#253448'),
    '--ink': hslOf(tokens, '--ink', '#f1f5f9'),
    '--ink-2': hslOf(tokens, '--ink-2', '#cbd5e1'),
    '--ink-3': hslOf(tokens, '--ink-3', '#64748b'),
    '--line': rawOf(tokens, '--line', '#334155'),
    '--line-strong': rawOf(tokens, '--line-strong', '#475569'),
    '--primary': hslOf(tokens, '--primary', '#60a5fa'),
    '--primary-bright': hslOf(tokens, '--primary-bright', '#93c5fd'),
    '--secondary': hslOf(tokens, '--secondary', '#94a3b8'),
    '--secondary-bright': hslOf(tokens, '--secondary-bright', '#cbd5e1'),
    '--attention': hslOf(tokens, '--attention', '#f87171'),
    '--panel': hslOf(tokens, '--surface-raised', '#253448'),
    '--panel-2': hslOf(tokens, '--surface-muted', '#334155'),
  }
}

function darkVars(family: PhotoHeroFamilyId): PhotoHeroVars {
  const tokens = getDarkVariantSemanticTokens(family as never) ?? getThemePreset(family)?.semanticTokens ?? {}
  const recipe = DARK_RECIPES[family]
  return {
    ...baseFrom(tokens),
    '--primary-ink': recipe.primaryInk,
    '--accent': hslOf(tokens, '--primary-bright', recipe.heroAccent),
    '--success': '#4ade80',
    '--info': recipe.info,
    '--warning': '#fbbf24',
    '--danger': hslOf(tokens, '--attention', '#f87171'),
    '--glass-bg': recipe.glassBg,
    '--glass-line': recipe.glassLine,
    '--glass-ink': hslOf(tokens, '--ink', '#f1f5f9'),
    '--glass-shadow': recipe.glassShadow,
    '--scene-intro': recipe.intro,
    '--scene-invoicing': recipe.invoicing,
    '--scene-logi': recipe.logi,
    '--scene-projects': recipe.projects,
    '--field-a': recipe.fieldA,
    '--field-b': recipe.fieldB,
    '--field-c': recipe.fieldC,
    '--deep-a': recipe.deepA,
    '--deep-b': recipe.deepB,
    '--hero-accent': recipe.heroAccent,
    '--vignette':
      'linear-gradient(180deg,rgba(15,23,42,.14) 0%,rgba(15,23,42,0) 30%,rgba(15,23,42,.42) 62%,rgba(15,23,42,.88) 100%)',
    '--shadow': '0 12px 28px rgba(0,0,0,.30),0 2px 6px rgba(0,0,0,.24)',
    '--shadow-float': '0 18px 40px rgba(0,0,0,.40),0 3px 9px rgba(0,0,0,.30)',
    // AA hardening: the baseline white CTA keeps its look, but button and
    // eyebrow text use a blackened primary so contrast clears 4.5:1.
    '--cta-bg': '#ffffff',
    '--cta-ink': `color-mix(in srgb, ${hslOf(tokens, '--primary', '#60a5fa')} 55%, #000000)`,
    '--cta-auth-bg': 'var(--primary)',
    '--cta-auth-ink': 'var(--primary-ink)',
    '--pill-ok-ink': '#052e16',
    '--pill-info-ink': 'var(--primary-ink)',
    '--track-bg': 'rgba(255,255,255,.18)',
    '--track-fill': '#ffffff',
    '--glass-row-line': 'rgba(255,255,255,.14)',
    '--mini-ink': '#ffffff',
    '--mini-sub': 'rgba(255,255,255,.76)',
    '--mini-shadow': '0 12px 28px rgba(0,0,0,.75)',
    '--eyebrow': '#bfdbfe',
    '--copy': '#dbe4ee',
    '--chrome-ink': '#ffffff',
    '--theme-name': `"${FAMILY_NAMES[family]}"`,
  }
}

function lightVars(family: PhotoHeroFamilyId): PhotoHeroVars {
  const tokens = getThemePreset(family)?.semanticTokens ?? {}
  const P = hslTripletRef(tokens, '--primary')
  const PB = hslTripletRef(tokens, '--primary-bright')
  const S = hslTripletRef(tokens, '--secondary')
  const bg = `hsl(${hslTripletRef(tokens, '--bg')})`
  const ink = `hsl(${hslTripletRef(tokens, '--ink')})`
  const ink2 = `hsl(${hslTripletRef(tokens, '--ink-2')})`
  const primary = `hsl(${P})`
  const tint = (triplet: string, pct: number, target = '#ffffff') =>
    `color-mix(in srgb, hsl(${triplet}) ${pct}%, ${target})`
  return {
    ...baseFrom(tokens),
    '--primary-ink': '#ffffff',
    '--accent': hslOf(tokens, '--primary-bright', primary),
    '--success': '#16a34a',
    '--info': hslOf(tokens, '--secondary', primary),
    '--warning': '#b45309',
    '--danger': hslOf(tokens, '--attention', '#dc2626'),
    // Selective frosted glass: white-dominant fill, theme-tinted border,
    // dark ink — never pale-on-pale.
    '--glass-bg': `color-mix(in srgb, hsl(${P}) 10%, rgba(255,255,255,.74))`,
    '--glass-line': tint(P, 30),
    '--glass-ink': ink,
    '--glass-shadow': `color-mix(in srgb, hsl(${P}) 22%, rgba(15,23,42,.16))`,
    // White-primary canvas with theme-aware atmospheric fields.
    '--scene-intro': `linear-gradient(165deg, ${bg} 0%, ${tint(P, 16)} 42%, ${tint(P, 34)} 72%, ${tint(S, 44)} 100%)`,
    '--scene-invoicing': `linear-gradient(160deg, ${bg} 0%, ${tint(P, 20)} 52%, ${tint(S, 40)} 100%)`,
    '--scene-logi': `linear-gradient(180deg, ${bg} 0%, ${tint(P, 16)} 48%, ${tint(S, 36)} 100%)`,
    '--scene-projects': `linear-gradient(155deg, ${bg} 0%, ${tint(P, 18)} 58%, ${tint(PB, 38)} 100%)`,
    '--field-a': primary,
    '--field-b': `hsl(${S})`,
    '--field-c': `hsl(${PB})`,
    '--deep-a': tint(P, 26),
    '--deep-b': tint(P, 48),
    '--hero-accent': primary,
    // Readability treatment: keep scene bottoms near-white for dark copy.
    '--vignette': `linear-gradient(180deg, rgba(255,255,255,.30) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 60%, ${tint(P, 12)} 100%)`,
    '--shadow': `0 12px 28px color-mix(in srgb, hsl(${P}) 16%, rgba(15,23,42,.10)),0 2px 6px rgba(15,23,42,.08)`,
    '--shadow-float': `0 18px 40px color-mix(in srgb, hsl(${P}) 24%, rgba(15,23,42,.16)),0 3px 9px rgba(15,23,42,.10)`,
    // Solid primary CTA (a white button would vanish on a white canvas);
    // blackened slightly so white text clears 4.5:1 on every family.
    '--cta-bg': `color-mix(in srgb, ${primary} 86%, #000000)`,
    '--cta-ink': '#ffffff',
    '--cta-auth-bg': `color-mix(in srgb, ${primary} 86%, #000000)`,
    '--cta-auth-ink': '#ffffff',
    '--pill-ok-ink': '#052e16',
    '--pill-info-ink': `color-mix(in srgb, hsl(${S}) 62%, #000000)`,
    '--track-bg': 'var(--surface-strong)',
    '--track-fill': primary,
    '--glass-row-line': 'var(--line-strong)',
    '--mini-ink': ink,
    '--mini-sub': `color-mix(in srgb, ${ink2} 82%, ${ink})`,
    '--mini-shadow': 'none',
    '--eyebrow': `color-mix(in srgb, ${primary} 70%, ${ink})`,
    '--copy': `color-mix(in srgb, ${ink2} 82%, ${ink})`,
    '--chrome-ink': ink,
    '--theme-name': `"${FAMILY_NAMES[family]}"`,
  }
}
