import type { ThemeTokenBundle } from "@/lib/themeTokens"
import { normalizeThemeTokenBundle } from "@/lib/themeTokens"

export const FIXED_THEME_PRESET_IDS = [
  "ivory-ledger",
  "industrial-fog",
  "brutalist-concrete",
  "sage-retreat",
  "deep-onyx",
  "nordic-abyss",
  "obsidian",
  "emerald-vault",
  "ruby-ledger",
  "midnight-indigo",
  "scandi-pine",
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
  "ivory-ledger": {
    label: "Ivory Ledger",
    description: "Warm paper, burgundy ink, editorial finance.",
    preview: {
      background: "#F4F1EA",
      card: "#FCFAF5",
      primary: "#6B2C39",
      accent: "#D4A85D",
    },
    tokens: {
      background: "#F4F1EA",
      foreground: "#2C2825",
      card: "#FCFAF5",
      "card-foreground": "#2C2825",
      popover: "#FCFAF5",
      "popover-foreground": "#2C2825",
      primary: "#6B2C39",
      "primary-foreground": "#FCFAF5",
      secondary: "#F3E8E9",
      "secondary-foreground": "#6B2C39",
      muted: "#E5E0D8",
      "muted-foreground": "#8C8477",
      accent: "#D4A85D",
      "accent-foreground": "#2C2825",
      border: "#E5E0D8",
      input: "#E5E0D8",
      ring: "#6B2C39",
    },
  },
  "industrial-fog": {
    label: "Industrial Fog",
    description: "Cool steel neutrals with strong graphite anchors.",
    preview: {
      background: "#E2E8F0",
      card: "#F8FAFC",
      primary: "#1E293B",
      accent: "#334155",
    },
    tokens: {
      background: "#E2E8F0",
      foreground: "#0F172A",
      card: "#F8FAFC",
      "card-foreground": "#0F172A",
      popover: "#F8FAFC",
      "popover-foreground": "#0F172A",
      primary: "#1E293B",
      "primary-foreground": "#FFFFFF",
      secondary: "#CBD5E1",
      "secondary-foreground": "#1E293B",
      muted: "#E2E8F0",
      "muted-foreground": "#64748B",
      accent: "#334155",
      "accent-foreground": "#FFFFFF",
      border: "#CBD5E1",
      input: "#CBD5E1",
      ring: "#1E293B",
    },
  },
  "brutalist-concrete": {
    label: "Brutalist Concrete",
    description: "Concrete slabs, hard edges, no softness.",
    preview: {
      background: "#C2C2C2",
      card: "#D4D4D4",
      primary: "#000000",
      accent: "#000000",
    },
    tokens: {
      background: "#C2C2C2",
      foreground: "#000000",
      card: "#D4D4D4",
      "card-foreground": "#000000",
      popover: "#D4D4D4",
      "popover-foreground": "#000000",
      primary: "#000000",
      "primary-foreground": "#FFFFFF",
      secondary: "#A3A3A3",
      "secondary-foreground": "#000000",
      muted: "#A3A3A3",
      "muted-foreground": "#525252",
      accent: "#000000",
      "accent-foreground": "#FFFFFF",
      border: "#A3A3A3",
      input: "#A3A3A3",
      ring: "#000000",
      radius: "0rem",
    },
  },
  "sage-retreat": {
    label: "Sage Retreat",
    description: "Muted botanical surfaces with soft olive contrast.",
    preview: {
      background: "#DFE2D9",
      card: "#E9EBE4",
      primary: "#3F4D33",
      accent: "#556246",
    },
    tokens: {
      background: "#DFE2D9",
      foreground: "#2B3024",
      card: "#E9EBE4",
      "card-foreground": "#2B3024",
      popover: "#E9EBE4",
      "popover-foreground": "#2B3024",
      primary: "#3F4D33",
      "primary-foreground": "#E9EBE4",
      secondary: "#D2D6CB",
      "secondary-foreground": "#3F4D33",
      muted: "#D2D6CB",
      "muted-foreground": "#6B7062",
      accent: "#556246",
      "accent-foreground": "#F4F6EF",
      border: "#C5C9BE",
      input: "#C5C9BE",
      ring: "#3F4D33",
    },
  },
  "deep-onyx": {
    label: "Deep Onyx",
    description: "Warm black stone with gilded emphasis.",
    preview: {
      background: "#121110",
      card: "#1C1A19",
      primary: "#CFA16D",
      accent: "#CFA16D",
    },
    tokens: {
      background: "#121110",
      foreground: "#F0EBE1",
      card: "#1C1A19",
      "card-foreground": "#F0EBE1",
      popover: "#1C1A19",
      "popover-foreground": "#F0EBE1",
      primary: "#CFA16D",
      "primary-foreground": "#121110",
      secondary: "#2E2A28",
      "secondary-foreground": "#CFA16D",
      muted: "#2E2A28",
      "muted-foreground": "#8A847E",
      accent: "#CFA16D",
      "accent-foreground": "#121110",
      border: "#2E2A28",
      input: "#403B38",
      ring: "#CFA16D",
    },
  },
  "nordic-abyss": {
    label: "Nordic Abyss",
    description: "Cold navy depth with polar blue focus.",
    preview: {
      background: "#070B14",
      card: "#0D1322",
      primary: "#81A1C1",
      accent: "#81A1C1",
    },
    tokens: {
      background: "#070B14",
      foreground: "#F8FAFC",
      card: "#0D1322",
      "card-foreground": "#F8FAFC",
      popover: "#0D1322",
      "popover-foreground": "#F8FAFC",
      primary: "#81A1C1",
      "primary-foreground": "#070B14",
      secondary: "#1C263B",
      "secondary-foreground": "#81A1C1",
      muted: "#1C263B",
      "muted-foreground": "#64748B",
      accent: "#81A1C1",
      "accent-foreground": "#070B14",
      border: "#1C263B",
      input: "#1C263B",
      ring: "#81A1C1",
    },
  },
  "obsidian": {
    label: "Obsidian",
    description: "Clean monochrome with sharp neutral contrast.",
    preview: {
      background: "#F5F5F4",
      card: "#FFFFFF",
      primary: "#171717",
      accent: "#171717",
    },
    tokens: {
      background: "#F5F5F4",
      foreground: "#171717",
      card: "#FFFFFF",
      "card-foreground": "#171717",
      popover: "#FFFFFF",
      "popover-foreground": "#171717",
      primary: "#171717",
      "primary-foreground": "#FFFFFF",
      secondary: "#F5F5F5",
      "secondary-foreground": "#171717",
      muted: "#F5F5F5",
      "muted-foreground": "#737373",
      accent: "#171717",
      "accent-foreground": "#FFFFFF",
      border: "#E5E5E5",
      input: "#E5E5E5",
      ring: "#171717",
    },
  },
  "emerald-vault": {
    label: "Emerald Vault",
    description: "Dark green treasury with bright mint signals.",
    preview: {
      background: "#022C22",
      card: "#064E3B",
      primary: "#6EE7B7",
      accent: "#10B981",
    },
    tokens: {
      background: "#022C22",
      foreground: "#ECFDF5",
      card: "#064E3B",
      "card-foreground": "#ECFDF5",
      popover: "#064E3B",
      "popover-foreground": "#ECFDF5",
      primary: "#6EE7B7",
      "primary-foreground": "#022C22",
      secondary: "#065F46",
      "secondary-foreground": "#D1FAE5",
      muted: "#065F46",
      "muted-foreground": "#A7F3D0",
      accent: "#10B981",
      "accent-foreground": "#022C22",
      border: "#065F46",
      input: "#065F46",
      ring: "#6EE7B7",
    },
  },
  "ruby-ledger": {
    label: "Ruby Ledger",
    description: "Bright paper with strong rose finance accents.",
    preview: {
      background: "#FFF7F7",
      card: "#FFFFFF",
      primary: "#E11D48",
      accent: "#F43F5E",
    },
    tokens: {
      background: "#FFF7F7",
      foreground: "#171717",
      card: "#FFFFFF",
      "card-foreground": "#171717",
      popover: "#FFFFFF",
      "popover-foreground": "#171717",
      primary: "#E11D48",
      "primary-foreground": "#FFFFFF",
      secondary: "#FFE4E6",
      "secondary-foreground": "#9F1239",
      muted: "#FFE4E6",
      "muted-foreground": "#E11D48",
      accent: "#F43F5E",
      "accent-foreground": "#FFFFFF",
      border: "#FECDD3",
      input: "#FECDD3",
      ring: "#E11D48",
    },
  },
  "midnight-indigo": {
    label: "Midnight Indigo",
    description: "Inky control room with electric cyan accents.",
    preview: {
      background: "#111827",
      card: "#111827",
      primary: "#6366F1",
      accent: "#22D3EE",
    },
    tokens: {
      background: "#111827",
      foreground: "#FFFFFF",
      card: "#111827",
      "card-foreground": "#FFFFFF",
      popover: "#111827",
      "popover-foreground": "#FFFFFF",
      primary: "#6366F1",
      "primary-foreground": "#FFFFFF",
      secondary: "#1E293B",
      "secondary-foreground": "#E0E7FF",
      muted: "#1E293B",
      "muted-foreground": "#94A3B8",
      accent: "#22D3EE",
      "accent-foreground": "#0F172A",
      border: "#312E81",
      input: "#312E81",
      ring: "#6366F1",
    },
  },
  "scandi-pine": {
    label: "Scandi Pine",
    description: "Scandi interior: birch, oat, one forest pine.",
    preview: {
      background: "#F0EADD",
      card: "#FBF5E8",
      primary: "#1B1B1A",
      accent: "#4C7A55",
    },
    tokens: {
      // Semantic Bridge
      background: "#F0EADD",
      foreground: "#1B1B1A",
      card: "#FBF5E8",
      "card-foreground": "#1B1B1A",
      popover: "#FBF5E8",
      "popover-foreground": "#1B1B1A",
      primary: "#1B1B1A",
      "primary-foreground": "#FBF5E8",
      secondary: "#8A8578",
      "secondary-foreground": "#1B1B1A",
      muted: "#F0EADD",
      "muted-foreground": "#8A8578",
      accent: "#4C7A55",
      "accent-foreground": "#FBF5E8",
      border: "#8A8578",
      input: "#8A8578",
      ring: "#4C7A55",

      // BigDrops Specific Tokens
      "bd-app-bg": "#F0EADD",
      "bd-surface": "#FBF5E8",
      "bd-surface-muted": "#F0EADD",
      "bd-border": "#8A8578",
      "bd-border-strong": "#1B1B1A",
      "bd-text": "#1B1B1A",
      "bd-text-muted": "#8A8578",
      "bd-input-bg": "#FBF5E8",
      "bd-input-border": "#8A8578",
      "bd-input-focus": "#4C7A55",
      "bd-card-bg": "#FBF5E8",
      "bd-card-border": "#8A8578",
      "bd-button-primary-bg": "#4C7A55",
      "bd-button-primary-text": "#FBF5E8",
      "bd-button-primary-hover-bg": "#3D6244", // Darker pine
      "bd-nav-active-bg": "#F0EADD",
      "bd-nav-active-text": "#1B1B1A",
      "bd-nav-active-icon": "#4C7A55",
      "bd-surface-action": "#FBF5E8",
      "bd-surface-action-hover": "#F0EADD",
      "bd-surface-action-border": "#8A8578",
      "bd-surface-action-text": "#1B1B1A",
      "bd-surface-action-muted": "#8A8578",
      "bd-action-icon-bg": "#4C7A55",
      "bd-action-icon-text": "#FBF5E8",
      "bd-fab-bg": "#4C7A55",
      "bd-fab-text": "#FBF5E8",

      // Status Fallbacks (Ensuring safety as per rule 4)
      "bd-status-success-bg": "#E9F2EB",
      "bd-status-success-text": "#2D5A3C",
      "bd-status-success-border": "#C9DBCF",
      "bd-status-warning-bg": "#F9F4E8",
      "bd-status-warning-text": "#856404",
      "bd-status-warning-border": "#FFEBA0",
      "bd-status-danger-bg": "#FBEAEB",
      "bd-status-danger-text": "#721C24",
      "bd-status-danger-border": "#F5C6CB",

      // Non-color
      radius: "10px",
      "bd-radius-sm": "3px",
      "bd-radius-md": "6px",
      "bd-radius-lg": "10px",
      "bd-layout-density": "comfortable",
      "bd-layout-padding": "32px",
      "bd-font-family": "'Manrope', 'Inter', ui-sans-serif, system-ui, sans-serif",
      "bd-font-body-size": "0.98rem",
      "bd-label-letter-spacing": "0.2em",
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
