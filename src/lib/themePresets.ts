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

export const ALL_THEME_IDS = [
  ...CANONICAL_THEME_IDS,
  ...ADDITIONAL_THEME_IDS,
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
): ThemePresetDefinition {
  const bundle = normalizeThemeTokenBundle(buildBundle(core), { allowRadius: true })
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
  "bmw": BMW_CORE,
  "modern-minimalist": MINIMALIST_CORE,
}

/**
 * Returns the dark variant bundle for a given theme ID.
 * Used when the user toggles dark mode within a theme.
 */
export function getDarkVariantBundle(themeId: ThemePresetId): ThemeTokenBundle | null {
  const core = DARK_VARIANTS[themeId]
  if (!core) return null
  return normalizeThemeTokenBundle(buildBundle(core), { allowRadius: true })
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
