import { hexToHslTriplet, normalizeHexColor } from "@/lib/colorTheme"

/**
 * Central theme token bundle utilities.
 *
 * shadcn/ui expects Tailwind colors to reference CSS variables like:
 *   hsl(var(--background))
 *
 * This module lets us apply/remove a runtime "token bundle" by setting CSS
 * variables on `document.documentElement`.
 */

export const THEME_COLOR_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  // BigDrops Component/Form Tokens
  "bd-app-bg",
  "bd-surface",
  "bd-surface-muted",
  "bd-border",
  "bd-border-strong",
  "bd-text",
  "bd-text-muted",
  "bd-text-soft",
  "bd-input-bg",
  "bd-input-border",
  "bd-input-focus",
  "bd-input-error",
  "bd-card-bg",
  "bd-card-border",
  "bd-button-primary-bg",
  "bd-button-primary-text",
  "bd-button-primary-hover-bg",
  "bd-feedback-success-bg",
  "bd-feedback-error-bg",
  "bd-feedback-success",
  "bd-feedback-error",
  "bd-feedback-warning",
  "bd-feedback-info",
  "bd-feedback-save",
  "bd-layout-nav",
  "bd-layout-sidebar",
  "bd-focus-ring",
  // Status Tokens
  "bd-status-success-bg",
  "bd-status-success-text",
  "bd-status-success-border",
  "bd-status-warning-bg",
  "bd-status-warning-text",
  "bd-status-warning-border",
  "bd-status-danger-bg",
  "bd-status-danger-text",
  "bd-status-danger-border",
  "bd-status-info-bg",
  "bd-status-info-text",
  "bd-status-info-border",
  "bd-status-neutral-bg",
  "bd-status-neutral-text",
  "bd-status-neutral-border",
  // Navigation Tokens
  "bd-nav-active-bg",
  "bd-nav-active-text",
  "bd-nav-active-icon",
  "bd-nav-hover-bg",
  // Action Surface Tokens
  "bd-surface-action",
  "bd-surface-action-hover",
  "bd-surface-action-border",
  "bd-surface-action-text",
  "bd-surface-action-muted",
  "bd-action-icon-bg",
  "bd-action-icon-text",
  // Feedback & Global Action Tokens
  "bd-fab-bg",
  "bd-fab-text",
  // Overlay Tokens
  "bd-overlay-bg",
  "bd-overlay-text",
  "bd-overlay-muted",
  "bd-overlay-border",
  "bd-overlay-handle-bg",
  "bd-overlay-scrim",
  "bd-overlay-close-bg",
  "bd-overlay-close-text",
  "bd-overlay-section-bg",
  "bd-overlay-section-border",
  "bd-overlay-input-bg",
  "bd-overlay-footer-bg",
  "bd-overlay-disabled-bg",
  "bd-overlay-disabled-text",
  "bd-icon-container-bg",
  "bd-icon-container-text",
  "bd-brand",
  "bd-brand-foreground",
  "bd-accent",
  "bd-accent-foreground",
] as const

export const THEME_NON_COLOR_TOKENS = [
  "radius",
  "bd-radius-sm",
  "bd-radius-md",
  "bd-radius-lg",
  "bd-layout-density",
  "bd-layout-padding",
  "bd-layout-content-max",
  "bd-font-family",
  "bd-font-display-family",
  "bd-font-h1-family",
  "bd-font-label-family",
  "bd-font-body-size",
  "bd-font-body-line-height",
  "bd-font-display-size",
  "bd-font-display-weight",
  "bd-font-display-spacing",
  "bd-font-h1-size",
  "bd-font-h1-weight",
  "bd-font-h1-spacing",
  "bd-font-label-weight",
  "bd-label-letter-spacing",
  "bd-overlay-radius",
  "bd-space-xs",
  "bd-space-sm",
  "bd-space-md",
  "bd-space-lg",
  "bd-space-xl",
  "bd-card-padding",
  "bd-section-gap",
  "bd-row-gap",
  "bd-field-gap",
  "bd-sheet-padding",
  "bd-button-padding-x",
  "bd-button-padding-y",
  "bd-icon-size-sm",
  "bd-icon-size-md",
  "bd-icon-size-lg",
  "bd-icon-stroke",
  "bd-icon-container-radius",
] as const

export const THEME_TOKENS = [...THEME_COLOR_TOKENS, ...THEME_NON_COLOR_TOKENS] as const

export type ThemeToken = (typeof THEME_TOKENS)[number]
export type ThemeTokenBundle = Partial<Record<ThemeToken, string>>

type NormalizeOptions = {
  allowRadius?: boolean
}

const HSL_TRIPLET_RE = /^\s*\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%\s*$/
const CSS_LENGTH_RE = /^\s*(0|(\d+(\.\d+)?)(px|rem|em))\s*$/

function isThemeToken(value: unknown): value is ThemeToken {
  return typeof value === "string" && (THEME_TOKENS as readonly string[]).includes(value)
}

export function normalizeThemeTokenValue(
  token: ThemeToken,
  value: unknown,
  options: NormalizeOptions = {},
): string | null {
  if (typeof value !== "string") return null
  const raw = value.trim()
  if (!raw) return null

  if (
    token === "radius" || 
    token === "bd-radius-sm" || 
    token === "bd-radius-md" || 
    token === "bd-radius-lg" || 
    token === "bd-layout-padding" || 
    token === "bd-layout-content-max" || 
    token === "bd-font-body-size" || 
    token === "bd-font-body-line-height" || 
    token === "bd-font-display-size" || 
    token === "bd-font-h1-size" || 
    token === "bd-overlay-radius" ||
    token.startsWith("bd-space-") ||
    token.includes("-padding") ||
    token.includes("-gap")
  ) {
    if (options.allowRadius === false && token.includes("radius")) return null
    return /^\s*\d+(\.\d+)?(px|rem|em)?\s*$/.test(raw) ? raw : null
  }

  if (token === "bd-label-letter-spacing" || token === "bd-font-h1-spacing" || token === "bd-font-display-spacing") {
    return /^\s*-?\d+(\.\d+)?(em|px|rem)\s*$/.test(raw) ? raw : null
  }

  if (token === "bd-font-h1-weight" || token === "bd-font-display-weight" || token === "bd-font-label-weight") {
    return /^\s*\d{3}\s*$/.test(raw) ? raw : null
  }

  if (token === "bd-font-family" || token === "bd-font-display-family" || token === "bd-font-h1-family" || token === "bd-font-label-family") {
    return raw.length > 0 ? raw : null
  }

  if (token === "bd-layout-density") {
    return ["compact", "standard", "comfortable"].includes(raw) ? raw : null
  }

  // Color token: allow "#RRGGBB" (stored in settings today) and "H S% L%" (CSS var format).
  if (raw.startsWith("#")) {
    const normalizedHex = normalizeHexColor(raw)
    if (!normalizedHex) return null
    return hexToHslTriplet(normalizedHex)
  }

  if (HSL_TRIPLET_RE.test(raw)) return raw

  return null
}

export function normalizeThemeTokenBundle(
  input: unknown,
  options: NormalizeOptions = {},
): ThemeTokenBundle {
  if (!input || typeof input !== "object") return {}

  const bundle: ThemeTokenBundle = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isThemeToken(key)) continue
    const normalized = normalizeThemeTokenValue(key, value, options)
    if (!normalized) continue
    bundle[key] = normalized
  }
  return bundle
}

export function applyThemeTokenBundle(bundle: ThemeTokenBundle): ThemeToken[] {
  if (typeof document === "undefined") return []
  const root = document.documentElement
  const applied: ThemeToken[] = []

  for (const token of THEME_TOKENS) {
    const value = bundle[token]
    if (!value) continue
    root.style.setProperty(`--${token}`, value)
    applied.push(token)
  }

  return applied
}

export function clearThemeTokenBundle(tokens: ThemeToken[]): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  for (const token of tokens) {
    root.style.removeProperty(`--${token}`)
  }
}
