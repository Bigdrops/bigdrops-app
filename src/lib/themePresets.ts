import type { ThemeTokenBundle } from "@/lib/themeTokens"
import { normalizeThemeTokenBundle } from "@/lib/themeTokens"

export const FIXED_THEME_PRESET_IDS = [
  "bmw",
  "modern-minimalist",
] as const

export const BASE_THEME_MODE = "base" as const
export type FixedThemePresetId = (typeof FIXED_THEME_PRESET_IDS)[number]
export type ThemeMode = typeof BASE_THEME_MODE | FixedThemePresetId | "custom"

type ThemePresetDefinition = {
  id: FixedThemePresetId
  label: string
  description: string
  preview: {
    background: string
    card: string
    primary: string
    accent: string
  }
  bundle: ThemeTokenBundle
}

const PRESET_SOURCE: Record<FixedThemePresetId, Omit<ThemePresetDefinition, "id" | "bundle"> & { tokens: ThemeTokenBundle }> = {
  "bmw": {
    label: "BMW",
    description: "Automotive luxury: black finish with M-series blue.",
    preview: {
      background: "#000000",
      card: "#1C1C1C",
      primary: "#FFFFFF",
      accent: "#0066B3",
    },
    tokens: {
      background: "#000000",
      foreground: "#FFFFFF",
      card: "#1C1C1C",
      "card-foreground": "#FFFFFF",
      primary: "#FFFFFF",
      "primary-foreground": "#000000",
      secondary: "#000000",
      "secondary-foreground": "#A0A0A0",
      muted: "#1C1C1C",
      "muted-foreground": "#A0A0A0",
      accent: "#0066B3",
      "accent-foreground": "#FFFFFF",
      border: "#333333",
      input: "#333333",
      ring: "#0066B3",
      radius: "4px",
      "bd-app-bg": "#000000",
      "bd-surface": "#1C1C1C",
      "bd-surface-muted": "#111111",
      "bd-border": "#333333",
      "bd-border-strong": "#FFFFFF",
      "bd-text": "#FFFFFF",
      "bd-text-muted": "#A0A0A0",
      "bd-input-bg": "#1C1C1C",
      "bd-button-primary-bg": "#0066B3",
      "bd-button-primary-text": "#FFFFFF",
      "bd-radius-sm": "2px",
      "bd-radius-md": "4px",
      "bd-radius-lg": "8px",
      "bd-font-family": "'Inter', sans-serif",
    },
  },
  "modern-minimalist": {
    label: "Modern Minimalist",
    description: "Clean grayscale palette for tech, architecture, and design.",
    preview: {
      background: "#F5F5F5",
      card: "#FFFFFF",
      primary: "#36454F",
      accent: "#708090",
    },
    tokens: {
      background: "#F5F5F5",
      foreground: "#36454F",
      card: "#FFFFFF",
      "card-foreground": "#36454F",
      popover: "#FFFFFF",
      "popover-foreground": "#36454F",
      primary: "#36454F",
      "primary-foreground": "#FFFFFF",
      secondary: "#D3D3D3",
      "secondary-foreground": "#36454F",
      muted: "#F0F0F0",
      "muted-foreground": "#708090",
      accent: "#708090",
      "accent-foreground": "#FFFFFF",
      border: "#D3D3D3",
      input: "#D3D3D3",
      ring: "#36454F",
      radius: "8px",

      "bd-app-bg": "#F5F5F5",
      "bd-surface": "#FFFFFF",
      "bd-surface-muted": "#F0F0F0",
      "bd-border": "#D3D3D3",
      "bd-border-strong": "#36454F",
      "bd-text": "#36454F",
      "bd-text-muted": "#708090",
      "bd-text-soft": "#94A3B8",
      "bd-input-bg": "#FFFFFF",
      "bd-input-border": "#D3D3D3",
      "bd-input-focus": "#36454F",
      "bd-card-bg": "#FFFFFF",
      "bd-card-border": "#D3D3D3",
      "bd-button-primary-bg": "#36454F",
      "bd-button-primary-text": "#FFFFFF",
      "bd-button-primary-hover-bg": "#2A363E",
      "bd-nav-active-bg": "#F0F0F0",
      "bd-nav-active-text": "#36454F",
      "bd-nav-active-icon": "#36454F",
      "bd-surface-action": "#FFFFFF",
      "bd-surface-action-hover": "#F5F5F5",
      "bd-surface-action-border": "#D3D3D3",
      "bd-surface-action-text": "#36454F",
      "bd-surface-action-muted": "#708090",
      "bd-action-icon-bg": "#36454F",
      "bd-action-icon-text": "#FFFFFF",
      "bd-fab-bg": "#36454F",
      "bd-fab-text": "#FFFFFF",

      "bd-status-success-bg": "#ECFDF5",
      "bd-status-success-text": "#065F46",
      "bd-status-success-border": "#A7F3D0",
      "bd-status-warning-bg": "#FFFBEB",
      "bd-status-warning-text": "#92400E",
      "bd-status-warning-border": "#FDE68A",
      "bd-status-danger-bg": "#FEF2F2",
      "bd-status-danger-text": "#991B1B",
      "bd-status-danger-border": "#FECACA",
      "bd-status-info-bg": "#F0F9FF",
      "bd-status-info-text": "#075985",
      "bd-status-info-border": "#BAE6FD",

      "bd-radius-sm": "4px",
      "bd-radius-md": "8px",
      "bd-radius-lg": "16px",
      "bd-font-family": "'Inter', sans-serif",
      "bd-font-display-family": "'Inter', sans-serif",
      "bd-font-h1-family": "'Inter', sans-serif",
      "bd-font-label-family": "'Inter', sans-serif",
      "bd-font-body-size": "0.9rem",
      "bd-font-body-line-height": "1.6",
      "bd-font-display-size": "3.5rem",
      "bd-font-display-weight": "300",
      "bd-font-display-spacing": "-0.03em",
      "bd-font-h1-size": "1.875rem",
      "bd-font-h1-weight": "500",
      "bd-font-label-weight": "600",
      "bd-label-letter-spacing": "0.1em",

      "bd-space-sm": "8px",
      "bd-space-md": "16px",
      "bd-space-lg": "32px",
      "bd-card-padding": "24px",
    },
  },
}

export const THEME_PRESETS: ThemePresetDefinition[] = FIXED_THEME_PRESET_IDS.map((id) => {
  const preset = PRESET_SOURCE[id]
  return {
    id,
    label: preset.label,
    description: preset.description,
    preview: preset.preview,
    bundle: normalizeThemeTokenBundle(preset.tokens, { allowRadius: true }),
  }
})

export function isFixedThemePresetId(value: unknown): value is FixedThemePresetId {
  return typeof value === "string" && FIXED_THEME_PRESET_IDS.includes(value as FixedThemePresetId)
}

export function getThemePreset(id: unknown): ThemePresetDefinition | null {
  if (!isFixedThemePresetId(id)) return null
  return THEME_PRESETS.find((preset) => preset.id === id) ?? null
}

export function resolveThemeMode(
  settings: {
    app_theme_preset_id?: unknown
    app_background_color?: unknown
    app_card_color?: unknown
    app_theme_tokens?: unknown
  } | null | undefined,
): ThemeMode {
  const presetId = settings?.app_theme_preset_id
  if (presetId === "custom" || isFixedThemePresetId(presetId)) return presetId

  // Backwards compatibility: explicit manual values should still behave as custom mode.
  if (settings?.app_background_color || settings?.app_card_color || settings?.app_theme_tokens) {
    return "custom"
  }

  return BASE_THEME_MODE
}
