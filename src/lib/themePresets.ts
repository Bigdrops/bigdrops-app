import type { ThemeTokenBundle } from "@/lib/themeTokens"
import { normalizeThemeTokenBundle } from "@/lib/themeTokens"
import { hexToHslTriplet, normalizeHexColor } from "./colorTheme"

/**
 * Converts a color string (hex or rgba) to an HSL triplet for CSS variable use.
 * Returns the original string if conversion fails.
 */
function toHslTriplet(color: string): string {
  const trimmed = color.trim()
  
  // Handle hex colors
  if (trimmed.startsWith('#')) {
    const normalized = normalizeHexColor(trimmed)
    if (normalized) return hexToHslTriplet(normalized)
  }
  
  // Handle rgba() format: rgba(r, g, b, a)
  const rgbaMatch = trimmed.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/)
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch
    const rNorm = parseInt(r) / 255
    const gNorm = parseInt(g) / 255
    const bNorm = parseInt(b) / 255
    
    const max = Math.max(rNorm, gNorm, bNorm)
    const min = Math.min(rNorm, gNorm, bNorm)
    let h = 0
    let s = 0
    const l = (max + min) / 2
    
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      
      switch (max) {
        case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break
        case gNorm: h = (bNorm - rNorm) / d + 2; break
        case bNorm: h = (rNorm - gNorm) / d + 4; break
      }
      h /= 6
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}% / ${a}`
  }
  
  // Handle rgb() format without alpha
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch
    return toHslTriplet(`rgba(${r}, ${g}, ${b}, 1)`)
  }
  
  // Return original if not convertible (e.g., already HSL triplet)
  return trimmed
}

// ────────────────────────────────────────────────────────────────────
// Theme ID constants
// ────────────────────────────────────────────────────────────────────

/**
 * Canonical theme families from the PRD (04-theme-system.md).
 * Each theme family has a light variant (primary) and a dark variant.
 * "Slate Navy" is the canonical default. Its dark variant is "Liquid Onyx."
 * Liquid Onyx is NOT a separate selectable theme — it is Slate Navy's dark mode.
 */
export const CANONICAL_THEME_IDS = [
  "slate-navy",      // Canonical default (light mode = Slate Navy Light, dark mode = Liquid Onyx)
] as const

/**
 * Additional theme families from dashboard HTML prototypes.
 * Each has a light variant (the ID) and a dark variant (in DARK_VARIANTS).
 */
export const ADDITIONAL_THEME_IDS = [
  "amber-terracotta",
  "ocean-teal",
  "rose-gold",
  "forest-green",
  "warm-cocoa",
] as const

/** Legacy presets — kept for backward compatibility */
export const LEGACY_THEME_IDS = [
  "bmw",
  "modern-minimalist",
] as const

/**
 * ShadcnBlocks registry themes (chisled, color-only per PRD).
 * Source: https://www.shadcnblocks.com/r/theme/{name} (light + dark tokens).
 * Alpine (Pro) excluded: registry returns 401 without a license key.
 */
export const SHADCN_THEME_IDS = [
  "citrus",
  "vercel",
  "supabase",
  "linear",
  "claude",
  "claymorphism",
  "amber-minimal",
  "cleanslate",
  "falcon",
  "modern-minimal",
  "shadcnblocks",
  "shadcn-default",
] as const

export const ALL_THEME_IDS = [
  ...CANONICAL_THEME_IDS,
  ...ADDITIONAL_THEME_IDS,
  ...SHADCN_THEME_IDS,
  ...LEGACY_THEME_IDS,
] as const

export type ThemePresetId = (typeof ALL_THEME_IDS)[number]
export type CanonicalThemeId = (typeof CANONICAL_THEME_IDS)[number]
export type LegacyThemeId = (typeof LEGACY_THEME_IDS)[number]

export const BASE_THEME_MODE = "base" as const
export type ThemeMode = typeof BASE_THEME_MODE | ThemePresetId | "custom"

// ────────────────────────────────────────────────────────────────────
// Legacy preset ID mapping (backward compatibility)
// ────────────────────────────────────────────────────────────────────

/**
 * Maps old preset IDs to new canonical theme families.
 * Both legacy presets map to slate-navy (the canonical default).
 * "liquid-onyx" is NOT a standalone theme — it is slate-navy's dark variant.
 */
const LEGACY_MAP: Record<LegacyThemeId, ThemePresetId> = {
  "bmw": "slate-navy",
  "modern-minimalist": "slate-navy",
}

export function resolveLegacyPresetId(id: string | null | undefined): ThemePresetId | null {
  if (!id) return null
  if (isThemePresetId(id)) return id
  if (id in LEGACY_MAP) return LEGACY_MAP[id as LegacyThemeId]
  return null
}

// ────────────────────────────────────────────────────────────────────
// Type guards
// ────────────────────────────────────────────────────────────────────

export function isThemePresetId(value: unknown): value is ThemePresetId {
  return typeof value === "string" && (ALL_THEME_IDS as readonly string[]).includes(value)
}

export function isFixedThemePresetId(value: unknown): value is ThemePresetId {
  return isThemePresetId(value)
}

// ────────────────────────────────────────────────────────────────────
// PRD Semantic Token Helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Generates the PRD semantic token set (--bg, --surface, --ink, etc.)
 * from a theme's core color values. These are CSS custom properties
 * that components consume via `var(--bg)`, `var(--ink)`, etc.
 *
 * The values are converted to HSL triplets for CSS variable use with `hsl()` wrapper.
 */
function prdSemanticTokens(opts: {
  bg: string
  surface: string
  surfaceRaised?: string
  surfaceMuted?: string
  surfaceStrong?: string
  ink: string
  ink2: string
  ink3: string
  primary: string
  primaryBright?: string
  secondary: string
  secondaryBright?: string
  attention: string
  attentionSoft?: string
  sage?: string
  sageSoft?: string
  line: string
  lineStrong: string
  nav: string
}): Record<string, string> {
  return {
    "--bg": toHslTriplet(opts.bg),
    "--surface": toHslTriplet(opts.surface),
    "--surface-raised": toHslTriplet(opts.surfaceRaised ?? opts.surface),
    "--surface-muted": toHslTriplet(opts.surfaceMuted ?? opts.surface),
    "--surface-strong": toHslTriplet(opts.surfaceStrong ?? opts.surface),
    "--ink": toHslTriplet(opts.ink),
    "--ink-2": toHslTriplet(opts.ink2),
    "--ink-3": toHslTriplet(opts.ink3),
    "--primary": toHslTriplet(opts.primary),
    "--primary-bright": toHslTriplet(opts.primaryBright ?? opts.primary),
    "--secondary": toHslTriplet(opts.secondary),
    "--secondary-bright": toHslTriplet(opts.secondaryBright ?? opts.secondary),
    "--attention": toHslTriplet(opts.attention),
    "--attention-soft": toHslTriplet(opts.attentionSoft ?? opts.attention),
    "--sage": toHslTriplet(opts.sage ?? opts.ink2),
    "--sage-soft": toHslTriplet(opts.sageSoft ?? opts.surface),
    "--line": toHslTriplet(opts.line),
    "--line-strong": toHslTriplet(opts.lineStrong),
    "--nav": opts.nav,
    "--gradient": `linear-gradient(135deg, ${opts.primary}, ${opts.secondary})`,
  }
}

// ────────────────────────────────────────────────────────────────────
// Theme Definitions
// ────────────────────────────────────────────────────────────────────

type ThemePresetDefinition = {
  id: ThemePresetId
  label: string
  description: string
  isDark: boolean
  preview: {
    background: string
    card: string
    primary: string
    accent: string
  }
  /** Color tokens applied via the theme engine (both bd-* and shadcn bridge) */
  bundle: ThemeTokenBundle
  /** PRD semantic tokens set as CSS custom properties on :root */
  semanticTokens: Record<string, string>
}

// ── Helper: Build full bundle from core colors ──

type CoreColors = {
  bg: string
  surface: string
  surfaceRaised?: string
  surfaceMuted?: string
  surfaceStrong?: string
  ink: string
  ink2: string
  ink3: string
  primary: string
  primaryBright?: string
  secondary: string
  secondaryBright?: string
  attention: string
  attentionSoft?: string
  sage?: string
  sageSoft?: string
  line: string
  lineStrong: string
  nav: string
}

function buildBundle(c: CoreColors): ThemeTokenBundle {
  return {
    // shadcn bridge tokens
    background: c.bg,
    foreground: c.ink,
    card: c.surface,
    "card-foreground": c.ink,
    popover: c.surface,
    "popover-foreground": c.ink,
    primary: c.primary,
    "primary-foreground": c.ink,
    secondary: c.secondary,
    "secondary-foreground": c.ink,
    muted: c.surfaceMuted ?? c.surface,
    "muted-foreground": c.ink2,
    accent: c.primaryBright ?? c.primary,
    "accent-foreground": c.ink,
    destructive: c.attention,
    "destructive-foreground": "#ffffff",
    border: c.line,
    input: c.line,
    ring: c.primary,

    // bd-* component tokens
    "bd-app-bg": c.bg,
    "bd-surface": c.surface,
    "bd-surface-muted": c.surfaceMuted ?? c.surface,
    "bd-surface-raised": c.surfaceRaised ?? c.surface,
    "bd-surface-strong": c.surfaceStrong ?? c.surface,
    "bd-border": c.line,
    "bd-border-strong": c.lineStrong,
    "bd-text": c.ink,
    "bd-text-muted": c.ink2,
    "bd-text-soft": c.ink3,
    "bd-input-bg": c.surfaceMuted ?? c.surface,
    "bd-input-border": c.lineStrong,
    "bd-input-focus": c.primary,
    "bd-input-error": c.attention,
    "bd-card-bg": c.surface,
    "bd-card-border": c.line,
    "bd-button-primary-bg": c.primary,
    "bd-button-primary-text": "#ffffff",
    "bd-button-primary-hover-bg": c.primaryBright ?? c.primary,
    "bd-feedback-success-bg": "#dcfce7",
    "bd-feedback-success": "#16a34a",
    "bd-feedback-error-bg": c.attentionSoft ?? "#fee2e2",
    "bd-feedback-error": c.attention,
    "bd-feedback-warning": "#f59e0b",
    "bd-feedback-info": c.primary,
    "bd-feedback-save": c.primary,
    "bd-layout-nav": c.nav,
    "bd-layout-sidebar": c.surface,
    "bd-focus-ring": c.primary,

    // Status tokens
    "bd-status-success-bg": "#dcfce7",
    "bd-status-success-text": "#16a34a",
    "bd-status-success-border": "#bbf7d0",
    "bd-status-warning-bg": "#fef3c7",
    "bd-status-warning-text": "#d97706",
    "bd-status-warning-border": "#fde68a",
    "bd-status-danger-bg": c.attentionSoft ?? "#fee2e2",
    "bd-status-danger-text": c.attention,
    "bd-status-danger-border": "#fecaca",
    "bd-status-info-bg": "#dbeafe",
    "bd-status-info-text": c.primary,
    "bd-status-info-border": "#bfdbfe",
    "bd-status-neutral-bg": c.surfaceMuted ?? c.surface,
    "bd-status-neutral-text": c.ink2,
    "bd-status-neutral-border": c.line,

    // Nav tokens
    "bd-nav-active-bg": c.primary,
    "bd-nav-active-text": "#ffffff",
    "bd-nav-active-icon": "#ffffff",
    "bd-nav-hover-bg": c.surfaceMuted ?? c.surface,

    // Action surface tokens
    "bd-surface-action": c.surface,
    "bd-surface-action-hover": c.surfaceRaised ?? c.surface,
    "bd-surface-action-border": c.line,
    "bd-surface-action-text": c.ink,
    "bd-surface-action-muted": c.ink3,
    "bd-action-icon-bg": c.primary,
    "bd-action-icon-text": "#ffffff",

    // FAB tokens
    "bd-fab-bg": c.primary,
    "bd-fab-text": "#ffffff",

    // Overlay tokens
    "bd-overlay-bg": c.surface,
    "bd-overlay-text": c.ink,
    "bd-overlay-muted": c.ink2,
    "bd-overlay-border": c.line,
    "bd-overlay-handle-bg": c.surfaceStrong ?? c.surface,
    "bd-overlay-scrim": "rgba(14,12,10,.38)",
    "bd-overlay-close-bg": c.surfaceMuted ?? c.surface,
    "bd-overlay-close-text": c.ink,
    "bd-overlay-section-bg": c.surfaceRaised ?? c.surface,
    "bd-overlay-section-border": c.line,
    "bd-overlay-input-bg": c.surfaceMuted ?? c.surface,
    "bd-overlay-footer-bg": c.surface,
    "bd-overlay-disabled-bg": c.surfaceMuted ?? c.surface,
    "bd-overlay-disabled-text": c.ink3,
    "bd-icon-container-bg": c.primary + "14",
    "bd-icon-container-text": c.primary,
    "bd-brand": c.primary,
    "bd-brand-foreground": "#ffffff",
    "bd-accent": c.primary,
    "bd-accent-foreground": "#ffffff",

    // Structural tokens (theme-invariant but included for completeness)
    radius: "0.75rem",
    "bd-radius-sm": "6px",
    "bd-radius-md": "12px",
    "bd-radius-lg": "18px",
    "bd-overlay-radius": "24px",
    "bd-layout-density": "compact",
    "bd-layout-padding": "14px",
    "bd-layout-content-max": "1200px",
    "bd-font-family": "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
    "bd-font-display-family": "'Syne', sans-serif",
    "bd-space-xs": "4px",
    "bd-space-sm": "6px",
    "bd-space-md": "8px",
    "bd-space-lg": "10px",
    "bd-space-xl": "12px",
    "bd-card-padding": "12px",
    "bd-section-gap": "14px",
    "bd-row-gap": "9px",
    "bd-field-gap": "12px",
    "bd-sheet-padding": "13px",
    "bd-button-padding-x": "12px",
    "bd-button-padding-y": "8px",
    "bd-icon-size-sm": "14px",
    "bd-icon-size-md": "16px",
    "bd-icon-size-lg": "21px",
    "bd-icon-stroke": "1.8",
    "bd-icon-container-radius": "10px",
  }
}

// ════════════════════════════════════════════════════════════════════
// SLATE NAVY — Canonical Light Default
// Source: 04-theme-system.md, mobile-dashboard-v6.html
// ════════════════════════════════════════════════════════════════════

const SLATE_NAVY_CORE: CoreColors = {
  bg: "#f0f4f8",
  surface: "#ffffff",
  surfaceRaised: "#f8fafc",
  surfaceMuted: "#e2e8f0",
  surfaceStrong: "#cbd5e1",
  ink: "#0f172a",
  ink2: "#475569",
  ink3: "#94a3b8",
  primary: "#1e3a5f",
  primaryBright: "#3b82f6",
  secondary: "#0f172a",
  secondaryBright: "#64748b",
  attention: "#ef4444",
  attentionSoft: "#fee2e2",
  sage: "#64748b",
  sageSoft: "#f1f5f9",
  line: "rgba(15,23,42,.07)",
  lineStrong: "rgba(15,23,42,.14)",
  nav: "rgba(255,255,255,.88)",
}

// ════════════════════════════════════════════════════════════════════
// LIQUID ONYX — Canonical Dark Default
// Source: 04-theme-system.md, liquid-onyx.html
// ════════════════════════════════════════════════════════════════════

const LIQUID_ONYX_CORE: CoreColors = {
  bg: "#0f172a",
  surface: "#1e293b",
  surfaceRaised: "#253448",
  surfaceMuted: "#334155",
  surfaceStrong: "#475569",
  ink: "#f1f5f9",
  ink2: "#cbd5e1",
  ink3: "#64748b",
  primary: "#60a5fa",
  primaryBright: "#93c5fd",
  secondary: "#94a3b8",
  secondaryBright: "#cbd5e1",
  attention: "#f87171",
  attentionSoft: "#3b1518",
  sage: "#94a3b8",
  sageSoft: "#1e293b",
  line: "rgba(241,245,249,.08)",
  lineStrong: "rgba(241,245,249,.15)",
  nav: "rgba(15,23,42,.88)",
}

// ════════════════════════════════════════════════════════════════════
// AMBER TERRACOTTA — v2.html
// ════════════════════════════════════════════════════════════════════

const AMBER_LIGHT: CoreColors = {
  bg: "#faf7f2",
  surface: "#ffffff",
  surfaceRaised: "#fdfcfa",
  surfaceMuted: "#f5f0e8",
  surfaceStrong: "#e8dfd2",
  ink: "#1c1612",
  ink2: "#7a6e62",
  ink3: "#b5a99a",
  primary: "#b45309",
  primaryBright: "#d97706",
  secondary: "#c2410c",
  secondaryBright: "#ea580c",
  attention: "#dc2626",
  attentionSoft: "#fee2e2",
  sage: "#8b7355",
  sageSoft: "#ede8df",
  line: "rgba(28,22,18,.07)",
  lineStrong: "rgba(28,22,18,.14)",
  nav: "rgba(255,255,255,.88)",
}

const AMBER_DARK: CoreColors = {
  bg: "#1a1714",
  surface: "#242019",
  surfaceRaised: "#2c2720",
  surfaceMuted: "#332d24",
  surfaceStrong: "#4a4035",
  ink: "#f5f0e8",
  ink2: "#c4b8a8",
  ink3: "#7d7264",
  primary: "#f59e0b",
  primaryBright: "#fbbf24",
  secondary: "#fb923c",
  secondaryBright: "#fdba74",
  attention: "#f87171",
  attentionSoft: "#3b1518",
  sage: "#a89279",
  sageSoft: "#242019",
  line: "rgba(245,240,232,.08)",
  lineStrong: "rgba(245,240,232,.15)",
  nav: "rgba(26,23,20,.88)",
}

// ════════════════════════════════════════════════════════════════════
// OCEAN TEAL — v3.html
// ════════════════════════════════════════════════════════════════════

const TEAL_LIGHT: CoreColors = {
  bg: "#f0fafa",
  surface: "#ffffff",
  surfaceRaised: "#f8fdfd",
  surfaceMuted: "#e0f0f0",
  surfaceStrong: "#b8d8d8",
  ink: "#0c1e1e",
  ink2: "#4a6e6e",
  ink3: "#8aafaf",
  primary: "#0d9488",
  primaryBright: "#14b8a6",
  secondary: "#0891b2",
  secondaryBright: "#22d3ee",
  attention: "#e11d48",
  attentionSoft: "#ffe4e6",
  sage: "#6b8a8a",
  sageSoft: "#e0eded",
  line: "rgba(12,30,30,.07)",
  lineStrong: "rgba(12,30,30,.14)",
  nav: "rgba(255,255,255,.88)",
}

const TEAL_DARK: CoreColors = {
  bg: "#0f1a1a",
  surface: "#162424",
  surfaceRaised: "#1c2c2c",
  surfaceMuted: "#243434",
  surfaceStrong: "#3a5555",
  ink: "#e8f5f5",
  ink2: "#a8d0d0",
  ink3: "#5a8888",
  primary: "#2dd4bf",
  primaryBright: "#5eead4",
  secondary: "#22d3ee",
  secondaryBright: "#67e8f9",
  attention: "#fb7185",
  attentionSoft: "#3b1520",
  sage: "#7eb0b0",
  sageSoft: "#162424",
  line: "rgba(232,245,245,.08)",
  lineStrong: "rgba(232,245,245,.15)",
  nav: "rgba(15,26,26,.88)",
}

// ════════════════════════════════════════════════════════════════════
// ROSE GOLD — v4.html
// ════════════════════════════════════════════════════════════════════

const ROSE_LIGHT: CoreColors = {
  bg: "#fdf2f4",
  surface: "#ffffff",
  surfaceRaised: "#fef7f9",
  surfaceMuted: "#fce4ec",
  surfaceStrong: "#f0b8c8",
  ink: "#1c0f14",
  ink2: "#7a5268",
  ink3: "#b88a9a",
  primary: "#be185d",
  primaryBright: "#db2777",
  secondary: "#9f1239",
  secondaryBright: "#e11d48",
  attention: "#dc2626",
  attentionSoft: "#fee2e2",
  sage: "#9ca3af",
  sageSoft: "#f1f5f9",
  line: "rgba(28,15,20,.07)",
  lineStrong: "rgba(28,15,20,.14)",
  nav: "rgba(255,255,255,.88)",
}

const ROSE_DARK: CoreColors = {
  bg: "#1a0f12",
  surface: "#24141c",
  surfaceRaised: "#2c1a22",
  surfaceMuted: "#342028",
  surfaceStrong: "#4a3040",
  ink: "#f5e8ee",
  ink2: "#d0a8b8",
  ink3: "#8a5a6a",
  primary: "#f472b6",
  primaryBright: "#f9a8d4",
  secondary: "#fb7185",
  secondaryBright: "#fda4af",
  attention: "#f87171",
  attentionSoft: "#3b1520",
  sage: "#b0a0a8",
  sageSoft: "#24141c",
  line: "rgba(245,232,238,.08)",
  lineStrong: "rgba(245,232,238,.15)",
  nav: "rgba(26,15,18,.88)",
}

// ════════════════════════════════════════════════════════════════════
// FOREST GREEN — v5.html
// ════════════════════════════════════════════════════════════════════

const FOREST_LIGHT: CoreColors = {
  bg: "#f0fdf4",
  surface: "#ffffff",
  surfaceRaised: "#f4fdf7",
  surfaceMuted: "#dcfce7",
  surfaceStrong: "#a7f3d0",
  ink: "#0c1a0e",
  ink2: "#4a7a52",
  ink3: "#88b890",
  primary: "#15803d",
  primaryBright: "#22c55e",
  secondary: "#166534",
  secondaryBright: "#4ade80",
  attention: "#dc2626",
  attentionSoft: "#fee2e2",
  sage: "#6b8a6b",
  sageSoft: "#e8f5e8",
  line: "rgba(12,26,14,.07)",
  lineStrong: "rgba(12,26,14,.14)",
  nav: "rgba(255,255,255,.88)",
}

const FOREST_DARK: CoreColors = {
  bg: "#0a1a0c",
  surface: "#142218",
  surfaceRaised: "#1a2c20",
  surfaceMuted: "#203428",
  surfaceStrong: "#305038",
  ink: "#e8f5ec",
  ink2: "#a8d0b0",
  ink3: "#5a8860",
  primary: "#4ade80",
  primaryBright: "#86efac",
  secondary: "#22c55e",
  secondaryBright: "#4ade80",
  attention: "#f87171",
  attentionSoft: "#3b1518",
  sage: "#7eb080",
  sageSoft: "#142218",
  line: "rgba(232,245,236,.08)",
  lineStrong: "rgba(232,245,236,.15)",
  nav: "rgba(10,26,12,.88)",
}

// ════════════════════════════════════════════════════════════════════
// WARM COCOA — v7.html
// ════════════════════════════════════════════════════════════════════

const COCOA_LIGHT: CoreColors = {
  bg: "#faf6f1",
  surface: "#ffffff",
  surfaceRaised: "#fdfbf8",
  surfaceMuted: "#f0ebe3",
  surfaceStrong: "#d8cfc2",
  ink: "#1c1510",
  ink2: "#6b5a4a",
  ink3: "#a89880",
  primary: "#78350f",
  primaryBright: "#b45309",
  secondary: "#92400e",
  secondaryBright: "#d97706",
  attention: "#dc2626",
  attentionSoft: "#fee2e2",
  sage: "#7a6a55",
  sageSoft: "#ede6da",
  line: "rgba(28,21,16,.07)",
  lineStrong: "rgba(28,21,16,.14)",
  nav: "rgba(255,255,255,.88)",
}

const COCOA_DARK: CoreColors = {
  bg: "#1a1410",
  surface: "#241e18",
  surfaceRaised: "#2c241c",
  surfaceMuted: "#342c22",
  surfaceStrong: "#4a3e30",
  ink: "#f5efe8",
  ink2: "#d0c0a8",
  ink3: "#8a7a65",
  primary: "#d97706",
  primaryBright: "#f59e0b",
  secondary: "#b45309",
  secondaryBright: "#d97706",
  attention: "#f87171",
  attentionSoft: "#3b1518",
  sage: "#a09080",
  sageSoft: "#241e18",
  line: "rgba(245,239,232,.08)",
  lineStrong: "rgba(245,239,232,.15)",
  nav: "rgba(26,20,16,.88)",
}

// ════════════════════════════════════════════════════════════════════
// SHADCNBLOCKS REGISTRY THEMES — chiseled light/dark CoreColors
// Source: https://www.shadcnblocks.com/r/theme/{name} (official tokens).
// Mapping rules (documented, deterministic):
// - bg/surface/ink/primary/secondary/muted/attention/line/nav: official values.
// - surfaceRaised = card. surfaceStrong/sageSoft = muted. sage/secondary share.
// - ink2 = official muted-foreground. ink3 = oklch midpoint of
//   muted-foreground and border (computed once, stored as hex).
// - line/lineStrong = rgba(ink, .07/.14) light, .08/.15 dark (codebase rule).
// - nav = rgba(255,255,255,.88) light, rgba(bg,.88) dark (codebase rule).
// - attentionSoft = #fee2e2 light / #3b1518 dark (codebase constants).
// - Fonts, radius, spacing, shadows: theme-invariant per PRD (excluded).
// ════════════════════════════════════════════════════════════════════

const CITRUS_LIGHT: CoreColors = {
  bg: "#fafafa",
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  surfaceMuted: "#f5f5f5",
  surfaceStrong: "#f5f5f5",
  ink: "#262626",
  ink2: "#525252",
  ink3: "#989898",
  primary: "#b8e954",
  secondary: "#45807a",
  attention: "#141414",
  attentionSoft: "#fee2e2",
  line: "rgba(38,38,38,.07)",
  lineStrong: "rgba(38,38,38,.14)",
  nav: "rgba(255,255,255,.88)",
}

const CITRUS_DARK: CoreColors = {
  bg: "#0a0a0a",
  surface: "#171717",
  surfaceRaised: "#171717",
  surfaceMuted: "#262626",
  surfaceStrong: "#262626",
  ink: "#e5e5e5",
  ink2: "#d4d4d4",
  ink3: "#777777",
  primary: "#b8e954",
  secondary: "#45807a",
  attention: "#f14444",
  attentionSoft: "#3b1518",
  line: "rgba(229,229,229,.08)",
  lineStrong: "rgba(229,229,229,.15)",
  nav: "rgba(10,10,10,.88)",
}

const VERCEL_LIGHT: CoreColors = {
  bg: "#fcfcfc",
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  surfaceMuted: "#f5f5f5",
  surfaceStrong: "#f5f5f5",
  ink: "#000000",
  ink2: "#525252",
  ink3: "#989898",
  primary: "#000000",
  secondary: "#ebebeb",
  attention: "#e54b4f",
  attentionSoft: "#fee2e2",
  line: "rgba(0,0,0,.07)",
  lineStrong: "rgba(0,0,0,.14)",
  nav: "rgba(255,255,255,.88)",
}

const VERCEL_DARK: CoreColors = {
  bg: "#000000",
  surface: "#090909",
  surfaceRaised: "#090909",
  surfaceMuted: "#1d1d1d",
  surfaceStrong: "#1d1d1d",
  ink: "#ffffff",
  ink2: "#a4a4a4",
  ink3: "#606060",
  primary: "#ffffff",
  secondary: "#222222",
  attention: "#ff5b5b",
  attentionSoft: "#3b1518",
  line: "rgba(255,255,255,.08)",
  lineStrong: "rgba(255,255,255,.15)",
  nav: "rgba(0,0,0,.88)",
}

const SUPABASE_LIGHT: CoreColors = {
  bg: "#fcfcfc",
  surface: "#fcfcfc",
  surfaceRaised: "#fcfcfc",
  surfaceMuted: "#eeeeee",
  surfaceStrong: "#eeeeee",
  ink: "#161616",
  ink2: "#1f1f1f",
  ink3: "#777777",
  primary: "#71e1ac",
  secondary: "#fcfcfc",
  attention: "#c83316",
  attentionSoft: "#fee2e2",
  line: "rgba(22,22,22,.07)",
  lineStrong: "rgba(22,22,22,.14)",
  nav: "rgba(255,255,255,.88)",
}

const SUPABASE_DARK: CoreColors = {
  bg: "#121212",
  surface: "#161616",
  surfaceRaised: "#161616",
  surfaceMuted: "#1f1f1f",
  surfaceStrong: "#1f1f1f",
  ink: "#e4e8ef",
  ink2: "#a1a1a1",
  ink3: "#626262",
  primary: "#0d623b",
  secondary: "#242424",
  attention: "#551912",
  attentionSoft: "#3b1518",
  line: "rgba(228,232,239,.08)",
  lineStrong: "rgba(228,232,239,.15)",
  nav: "rgba(18,18,18,.88)",
}

const LINEAR_LIGHT: CoreColors = {
  bg: "#fbfbfb",
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  surfaceMuted: "#ececef",
  surfaceStrong: "#ececef",
  ink: "#1b1b1b",
  ink2: "#71737a",
  ink3: "#aaada9",
  primary: "#6e78d5",
  secondary: "#1b1b1b",
  attention: "#92681b",
  attentionSoft: "#fee2e2",
  line: "rgba(27,27,27,.07)",
  lineStrong: "rgba(27,27,27,.14)",
  nav: "rgba(255,255,255,.88)",
}

const LINEAR_DARK: CoreColors = {
  bg: "#101011",
  surface: "#17181a",
  surfaceRaised: "#17181a",
  surfaceMuted: "#141415",
  surfaceStrong: "#141415",
  ink: "#e3e4e6",
  ink2: "#a1a2a5",
  ink3: "#5f6064",
  primary: "#e6e6e6",
  secondary: "#7987e1",
  attention: "#bba44a",
  attentionSoft: "#3b1518",
  line: "rgba(227,228,230,.08)",
  lineStrong: "rgba(227,228,230,.15)",
  nav: "rgba(16,16,17,.88)",
}

const CLAUDE_LIGHT: CoreColors = {
  bg: "#faf8f1",
  surface: "#fcfcfc",
  surfaceRaised: "#fcfcfc",
  surfaceMuted: "#ede8d9",
  surfaceStrong: "#ede8d9",
  ink: "#3d3826",
  ink2: "#85837d",
  ink3: "#aeaca5",
  primary: "#cb6441",
  secondary: "#e7e4dd",
  attention: "#141414",
  attentionSoft: "#fee2e2",
  line: "rgba(61,56,38,.07)",
  lineStrong: "rgba(61,56,38,.14)",
  nav: "rgba(255,255,255,.88)",
}

const CLAUDE_DARK: CoreColors = {
  bg: "#262626",
  surface: "#262626",
  surfaceRaised: "#262626",
  surfaceMuted: "#1b1b1b",
  surfaceStrong: "#1b1b1b",
  ink: "#c3c1ba",
  ink2: "#b7b5a6",
  ink3: "#77766c",
  primary: "#d87757",
  secondary: "#faf8f1",
  attention: "#f14444",
  attentionSoft: "#3b1518",
  line: "rgba(195,193,186,.08)",
  lineStrong: "rgba(195,193,186,.15)",
  nav: "rgba(38,38,38,.88)",
}

const CLAYMORPHISM_LIGHT: CoreColors = {
  bg: "#e0e0e0",
  surface: "#fafafa",
  surfaceRaised: "#fafafa",
  surfaceMuted: "#ededed",
  surfaceStrong: "#ededed",
  ink: "#1d293d",
  ink2: "#6c727e",
  ink3: "#9ca39f",
  primary: "#6468f0",
  secondary: "#d4d4d4",
  attention: "#f14444",
  attentionSoft: "#fee2e2",
  line: "rgba(29,41,61,.07)",
  lineStrong: "rgba(29,41,61,.14)",
  nav: "rgba(255,255,255,.88)",
}

const CLAYMORPHISM_DARK: CoreColors = {
  bg: "#1e1a16",
  surface: "#1e1a16",
  surfaceRaised: "#1e1a16",
  surfaceMuted: "#2d2824",
  surfaceStrong: "#2d2824",
  ink: "#e4e8ef",
  ink2: "#9ba2ae",
  ink3: "#636d67",
  primary: "#818cf9",
  secondary: "#3c3733",
  attention: "#f14444",
  attentionSoft: "#3b1518",
  line: "rgba(228,232,239,.08)",
  lineStrong: "rgba(228,232,239,.15)",
  nav: "rgba(30,26,22,.88)",
}

const AMBER_MINIMAL_LIGHT: CoreColors = {
  bg: "#ffffff",
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  surfaceMuted: "#f8f8f8",
  surfaceStrong: "#f8f8f8",
  ink: "#262626",
  ink2: "#6c727e",
  ink3: "#a6abb5",
  primary: "#f49f1e",
  secondary: "#f5f5f5",
  attention: "#f14444",
  attentionSoft: "#fee2e2",
  line: "rgba(38,38,38,.07)",
  lineStrong: "rgba(38,38,38,.14)",
  nav: "rgba(255,255,255,.88)",
}

const AMBER_MINIMAL_DARK: CoreColors = {
  bg: "#161616",
  surface: "#262626",
  surfaceRaised: "#262626",
  surfaceMuted: "#262626",
  surfaceStrong: "#262626",
  ink: "#e4e4e4",
  ink2: "#a4a4a4",
  ink3: "#707070",
  primary: "#f49f1e",
  secondary: "#262626",
  attention: "#f14444",
  attentionSoft: "#3b1518",
  line: "rgba(228,228,228,.08)",
  lineStrong: "rgba(228,228,228,.15)",
  nav: "rgba(22,22,22,.88)",
}

const CLEANSLATE_LIGHT: CoreColors = {
  bg: "#f8f8f8",
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  surfaceMuted: "#f5f5f5",
  surfaceStrong: "#f5f5f5",
  ink: "#1d293d",
  ink2: "#6c727e",
  ink3: "#9ca2ab",
  primary: "#6468f0",
  secondary: "#e4e8ef",
  attention: "#f14444",
  attentionSoft: "#fee2e2",
  line: "rgba(29,41,61,.07)",
  lineStrong: "rgba(29,41,61,.14)",
  nav: "rgba(255,255,255,.88)",
}

const CLEANSLATE_DARK: CoreColors = {
  bg: "#0f182b",
  surface: "#1d293d",
  surfaceRaised: "#1d293d",
  surfaceMuted: "#1d293d",
  surfaceStrong: "#1d293d",
  ink: "#e4e8ef",
  ink2: "#9ba2ae",
  ink3: "#727b8a",
  primary: "#818cf9",
  secondary: "#2f3848",
  attention: "#f14444",
  attentionSoft: "#3b1518",
  line: "rgba(228,232,239,.08)",
  lineStrong: "rgba(228,232,239,.15)",
  nav: "rgba(15,24,43,.88)",
}

const FALCON_LIGHT: CoreColors = {
  bg: "#f6f7f9",
  surface: "#feffff",
  surfaceRaised: "#feffff",
  surfaceMuted: "#eceff4",
  surfaceStrong: "#eceff4",
  ink: "#464c65",
  ink2: "#686c75",
  ink3: "#a2a6ae",
  primary: "#464c65",
  secondary: "#6a7f8b",
  attention: "#af6a65",
  attentionSoft: "#fee2e2",
  line: "rgba(70,76,101,.07)",
  lineStrong: "rgba(70,76,101,.14)",
  nav: "rgba(255,255,255,.88)",
}

const FALCON_DARK: CoreColors = {
  bg: "#121212",
  surface: "#0c0c0c",
  surfaceRaised: "#0c0c0c",
  surfaceMuted: "#1c1516",
  surfaceStrong: "#1c1516",
  ink: "#ffffff",
  ink2: "#a5a2a2",
  ink3: "#626060",
  primary: "#99b6b2",
  secondary: "#799db1",
  attention: "#bd9c9c",
  attentionSoft: "#3b1518",
  line: "rgba(255,255,255,.08)",
  lineStrong: "rgba(255,255,255,.15)",
  nav: "rgba(18,18,18,.88)",
}

const MODERN_MINIMAL_LIGHT: CoreColors = {
  bg: "#ffffff",
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  surfaceMuted: "#f9fafb",
  surfaceStrong: "#f9fafb",
  ink: "#333333",
  ink2: "#6b7280",
  ink3: "#a6abb4",
  primary: "#3b82f6",
  secondary: "#f3f4f6",
  attention: "#ef4444",
  attentionSoft: "#fee2e2",
  line: "rgba(51,51,51,.07)",
  lineStrong: "rgba(51,51,51,.14)",
  nav: "rgba(255,255,255,.88)",
}

const MODERN_MINIMAL_DARK: CoreColors = {
  bg: "#171717",
  surface: "#262626",
  surfaceRaised: "#262626",
  surfaceMuted: "#1f1f1f",
  surfaceStrong: "#1f1f1f",
  ink: "#e5e5e5",
  ink2: "#a3a3a3",
  ink3: "#707070",
  primary: "#3b82f6",
  secondary: "#262626",
  attention: "#ef4444",
  attentionSoft: "#3b1518",
  line: "rgba(229,229,229,.08)",
  lineStrong: "rgba(229,229,229,.15)",
  nav: "rgba(23,23,23,.88)",
}

const SHADCNBLOCKS_LIGHT: CoreColors = {
  bg: "#ffffff",
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  surfaceMuted: "#f5f5f5",
  surfaceStrong: "#f5f5f5",
  ink: "#0a0a0a",
  ink2: "#737373",
  ink3: "#aaaaaa",
  primary: "#171717",
  secondary: "#f5f5f5",
  attention: "#e7000b",
  attentionSoft: "#fee2e2",
  line: "rgba(10,10,10,.07)",
  lineStrong: "rgba(10,10,10,.14)",
  nav: "rgba(255,255,255,.88)",
}

const SHADCNBLOCKS_DARK: CoreColors = {
  bg: "#0a0a0a",
  surface: "#0a0a0a",
  surfaceRaised: "#0a0a0a",
  surfaceMuted: "#262626",
  surfaceStrong: "#262626",
  ink: "#fafafa",
  ink2: "#a1a1a1",
  ink3: "#cfcfcf",
  primary: "#e5e5e5",
  secondary: "#262626",
  attention: "#ff6467",
  attentionSoft: "#3b1518",
  line: "rgba(250,250,250,.08)",
  lineStrong: "rgba(250,250,250,.15)",
  nav: "rgba(10,10,10,.88)",
}

const SHADCN_DEFAULT_LIGHT: CoreColors = {
  bg: "#ffffff",
  surface: "#ffffff",
  surfaceRaised: "#ffffff",
  surfaceMuted: "#f5f5f5",
  surfaceStrong: "#f5f5f5",
  ink: "#0a0a0a",
  ink2: "#737373",
  ink3: "#aaaaaa",
  primary: "#171717",
  secondary: "#f5f5f5",
  attention: "#e7000b",
  attentionSoft: "#fee2e2",
  line: "rgba(10,10,10,.07)",
  lineStrong: "rgba(10,10,10,.14)",
  nav: "rgba(255,255,255,.88)",
}

const SHADCN_DEFAULT_DARK: CoreColors = {
  bg: "#0a0a0a",
  surface: "#171717",
  surfaceRaised: "#171717",
  surfaceMuted: "#262626",
  surfaceStrong: "#262626",
  ink: "#fafafa",
  ink2: "#a1a1a1",
  ink3: "#cfcfcf",
  primary: "#e5e5e5",
  secondary: "#262626",
  attention: "#ff6467",
  attentionSoft: "#3b1518",
  line: "rgba(250,250,250,.08)",
  lineStrong: "rgba(250,250,250,.15)",
  nav: "rgba(10,10,10,.88)",
}

// ════════════════════════════════════════════════════════════════════
// LEGACY PRESETS (backward compatibility)
// ════════════════════════════════════════════════════════════════════

const BMW_CORE: CoreColors = {
  bg: "#000000",
  surface: "#1C1C1C",
  surfaceRaised: "#222222",
  surfaceMuted: "#111111",
  surfaceStrong: "#333333",
  ink: "#FFFFFF",
  ink2: "#A0A0A0",
  ink3: "#666666",
  primary: "#0066B3",
  primaryBright: "#3399DD",
  secondary: "#000000",
  secondaryBright: "#A0A0A0",
  attention: "#ff4444",
  attentionSoft: "#331111",
  sage: "#808080",
  sageSoft: "#1C1C1C",
  line: "rgba(255,255,255,.07)",
  lineStrong: "rgba(255,255,255,.14)",
  nav: "rgba(0,0,0,.88)",
}

const MINIMALIST_CORE: CoreColors = {
  bg: "#F5F5F5",
  surface: "#FFFFFF",
  surfaceRaised: "#FAFAFA",
  surfaceMuted: "#F0F0F0",
  surfaceStrong: "#D3D3D3",
  ink: "#36454F",
  ink2: "#708090",
  ink3: "#A0A0A0",
  primary: "#36454F",
  primaryBright: "#4A5A6A",
  secondary: "#D3D3D3",
  secondaryBright: "#E0E0E0",
  attention: "#DC2626",
  attentionSoft: "#FEE2E2",
  sage: "#708090",
  sageSoft: "#F0F0F0",
  line: "rgba(54,69,79,.07)",
  lineStrong: "rgba(54,69,79,.14)",
  nav: "rgba(255,255,255,.88)",
}

// ════════════════════════════════════════════════════════════════════
// Build Preset Definitions
// ════════════════════════════════════════════════════════════════════

function makePreset(
  id: ThemePresetId,
  label: string,
  description: string,
  isDark: boolean,
  core: CoreColors,
  preview?: { background: string; card: string; primary: string; accent: string },
  overrides?: ThemeTokenBundle,
): ThemePresetDefinition {
  const bundle = normalizeThemeTokenBundle({ ...buildBundle(core), ...overrides }, { allowRadius: true })
  const semantic = prdSemanticTokens(core)
  return {
    id,
    label,
    description,
    isDark,
    preview: preview ?? {
      background: core.bg,
      card: core.surface,
      primary: core.primary,
      accent: core.secondary,
    },
    bundle,
    semanticTokens: semantic,
  }
}

export const THEME_PRESETS: ThemePresetDefinition[] = [
  // Theme families (each is selectable; light/dark mode determines variant)
  makePreset("slate-navy", "Slate Navy", "Professional blue-gray. The canonical BIGDROPS theme.", false, SLATE_NAVY_CORE),
  makePreset("amber-terracotta", "Amber Terracotta", "Warm amber and gold tones inspired by terracotta.", false, AMBER_LIGHT),
  makePreset("ocean-teal", "Ocean Teal", "Cool teal and cyan palette inspired by ocean depths.", false, TEAL_LIGHT),
  makePreset("rose-gold", "Rose Gold", "Warm rose and pink palette with elegant depth.", false, ROSE_LIGHT),
  makePreset("forest-green", "Forest Green", "Natural green palette inspired by lush forests.", false, FOREST_LIGHT),
  makePreset("warm-cocoa", "Warm Cocoa", "Earthy brown palette with warm, inviting tones.", false, COCOA_LIGHT),

  // ShadcnBlocks registry themes (chisled; official light tokens, PRD color-only).
  // Official *-foreground overrides preserve published contrast pairs.
  makePreset("citrus", "Citrus", "Electric lime energy with deep teal depth.", false, CITRUS_LIGHT,
    undefined, { "primary-foreground": "#000000", "secondary-foreground": "#ffffff" }),
  makePreset("vercel", "Vercel", "High-contrast monochrome precision.", false, VERCEL_LIGHT,
    undefined, { "primary-foreground": "#ffffff", "secondary-foreground": "#000000" }),
  makePreset("supabase", "Supabase", "Emerald developer energy.", false, SUPABASE_LIGHT,
    undefined, { "primary-foreground": "#202623", "secondary-foreground": "#161616" }),
  makePreset("linear", "Linear", "Indigo product-tool polish.", false, LINEAR_LIGHT,
    undefined, { "primary-foreground": "#ffffff", "secondary-foreground": "#fbfbfb" }),
  makePreset("claude", "Claude", "Warm parchment with terracotta warmth.", false, CLAUDE_LIGHT,
    undefined, { "primary-foreground": "#ffffff", "secondary-foreground": "#525044" }),
  makePreset("claymorphism", "Claymorphism", "Soft dimensional violet surfaces.", false, CLAYMORPHISM_LIGHT,
    undefined, { "primary-foreground": "#ffffff", "secondary-foreground": "#4b5666" }),
  makePreset("amber-minimal", "Amber Minimal", "Warm amber accents on clean neutrals.", false, AMBER_MINIMAL_LIGHT,
    undefined, { "primary-foreground": "#000000", "secondary-foreground": "#4b5666" }),
  makePreset("cleanslate", "Cleanslate", "Clean coastal slate neutrals.", false, CLEANSLATE_LIGHT,
    undefined, { "primary-foreground": "#ffffff", "secondary-foreground": "#364050" }),
  makePreset("falcon", "Falcon", "Sharp slate contrast with steel blue.", false, FALCON_LIGHT,
    undefined, { "primary-foreground": "#ffffff", "secondary-foreground": "#000000" }),
  makePreset("modern-minimal", "Modern Minimal", "Architectural blue calm.", false, MODERN_MINIMAL_LIGHT,
    undefined, { "primary-foreground": "#ffffff", "secondary-foreground": "#4b5563" }),
  makePreset("shadcnblocks", "Shadcnblocks", "Neutral monochrome registry default.", false, SHADCNBLOCKS_LIGHT,
    undefined, { "primary-foreground": "#fafafa", "secondary-foreground": "#171717" }),
  makePreset("shadcn-default", "Shadcn Default", "Stock shadcn monochrome base.", false, SHADCN_DEFAULT_LIGHT,
    undefined, { "primary-foreground": "#fafafa", "secondary-foreground": "#171717" }),

  // Legacy presets (backward compatibility — both migrate to slate-navy)
  makePreset("bmw", "BMW (Legacy)", "Legacy preset. Migrates to Slate Navy.", true, BMW_CORE),
  makePreset("modern-minimalist", "Modern Minimalist (Legacy)", "Legacy preset. Migrates to Slate Navy.", false, MINIMALIST_CORE),
]

/**
 * Dark variants for themes that have them.
 * Key: theme ID, Value: dark variant core colors.
 */
/**
 * Dark variants for each theme family.
 * Key: theme family ID. Value: dark variant core colors.
 * liquid-onyx IS the dark variant of slate-navy — not a separate theme.
 */
const DARK_VARIANTS: Record<string, CoreColors> = {
  "slate-navy": LIQUID_ONYX_CORE,     // Liquid Onyx = Slate Navy dark
  "amber-terracotta": AMBER_DARK,
  "ocean-teal": TEAL_DARK,
  "rose-gold": ROSE_DARK,
  "forest-green": FOREST_DARK,
  "warm-cocoa": COCOA_DARK,
  "citrus": CITRUS_DARK,
  "vercel": VERCEL_DARK,
  "supabase": SUPABASE_DARK,
  "linear": LINEAR_DARK,
  "claude": CLAUDE_DARK,
  "claymorphism": CLAYMORPHISM_DARK,
  "amber-minimal": AMBER_MINIMAL_DARK,
  "cleanslate": CLEANSLATE_DARK,
  "falcon": FALCON_DARK,
  "modern-minimal": MODERN_MINIMAL_DARK,
  "shadcnblocks": SHADCNBLOCKS_DARK,
  "shadcn-default": SHADCN_DEFAULT_DARK,
  "bmw": BMW_CORE,
  "modern-minimalist": MINIMALIST_CORE,
}

/**
 * Official dark-mode foreground pairs for chiseled themes.
 * Merged over the derived bundle so published contrast pairs survive.
 */
const DARK_FOREGROUND_OVERRIDES: Record<string, ThemeTokenBundle> = {
  "citrus": { "primary-foreground": "#000000", "secondary-foreground": "#ffffff" },
  "vercel": { "primary-foreground": "#000000", "secondary-foreground": "#ffffff" },
  "supabase": { "primary-foreground": "#dfe7e3", "secondary-foreground": "#fcfcfc" },
  "linear": { "primary-foreground": "#000000", "secondary-foreground": "#e3e4e6" },
  "claude": { "primary-foreground": "#ffffff", "secondary-foreground": "#303030" },
  "claymorphism": { "primary-foreground": "#1e1a16", "secondary-foreground": "#d0d4db" },
  "amber-minimal": { "primary-foreground": "#000000", "secondary-foreground": "#e4e4e4" },
  "cleanslate": { "primary-foreground": "#0f182b", "secondary-foreground": "#d0d4db" },
  "falcon": { "primary-foreground": "#000000", "secondary-foreground": "#000000" },
  "modern-minimal": { "primary-foreground": "#ffffff", "secondary-foreground": "#e5e5e5" },
  "shadcnblocks": { "primary-foreground": "#171717", "secondary-foreground": "#fafafa" },
  "shadcn-default": { "primary-foreground": "#171717", "secondary-foreground": "#fafafa" },
}

/**
 * Returns the dark variant bundle for a given theme ID.
 * Used when the user toggles dark mode within a theme.
 */
export function getDarkVariantBundle(themeId: ThemePresetId): ThemeTokenBundle | null {
  const core = DARK_VARIANTS[themeId]
  if (!core) return null
  return normalizeThemeTokenBundle({ ...buildBundle(core), ...(DARK_FOREGROUND_OVERRIDES[themeId] ?? {}) }, { allowRadius: true })
}

/**
 * Returns the dark variant semantic tokens for a given theme ID.
 */
export function getDarkVariantSemanticTokens(themeId: ThemePresetId): Record<string, string> | null {
  const core = DARK_VARIANTS[themeId]
  if (!core) return null
  return prdSemanticTokens(core)
}

// ────────────────────────────────────────────────────────────────────
// Lookup Helpers
// ────────────────────────────────────────────────────────────────────

export function getThemePreset(id: unknown): ThemePresetDefinition | null {
  if (!isThemePresetId(id)) return null
  return THEME_PRESETS.find((preset) => preset.id === id) ?? null
}

/**
 * Returns true if the given ID is a selectable theme family (not liquid-onyx, not legacy).
 */
export function isSelectableThemePresetId(id: unknown): boolean {
  if (!isThemePresetId(id)) return false
  // Exclude legacy presets from selectable list
  return !(ALL_THEME_IDS as readonly string[]).includes(id as string) ||
    !((typeof id === 'string') && (id === 'bmw' || id === 'modern-minimalist'))
}

/**
 * All selectable theme families (excludes legacy presets).
 * This is the list shown in the Settings UI.
 */
export const SELECTABLE_THEME_PRESETS: readonly ThemePresetDefinition[] =
  THEME_PRESETS.filter(p => p.id !== 'bmw' && p.id !== 'modern-minimalist')

/**
 * Resolves the effective theme mode from user settings.
 * Handles legacy preset migration and fallback.
 */
export function resolveThemeMode(
  settings: {
    app_theme_preset_id?: unknown
    app_background_color?: unknown
    app_card_color?: unknown
    app_theme_tokens?: unknown
  } | null | undefined,
): ThemeMode {
  const presetId = settings?.app_theme_preset_id

  // Explicit custom mode
  if (presetId === "custom") return "custom"

  // Valid preset ID (including legacy — we'll migrate at apply time)
  if (typeof presetId === "string" && presetId.length > 0) {
    // If it's a legacy ID, return it — the migration happens in AppThemeManager
    if (presetId in LEGACY_MAP) return LEGACY_MAP[presetId as LegacyThemeId]
    if (isThemePresetId(presetId)) return presetId
  }

  // Backwards compatibility: explicit manual values should behave as custom mode
  if (settings?.app_background_color || settings?.app_card_color || settings?.app_theme_tokens) {
    return "custom"
  }

  return BASE_THEME_MODE
}
