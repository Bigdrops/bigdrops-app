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
] as const

export const THEME_NON_COLOR_TOKENS = ["radius"] as const

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

  if (token === "radius") {
    if (options.allowRadius === false) return null
    return CSS_LENGTH_RE.test(raw) ? raw : null
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
