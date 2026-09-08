/**
 * POC VENDOR FILE — verbatim logic from pdfcn upstream.
 * Source: https://pdfcn.dev/r/forme/utils.json
 * Item: forme/utils, file registry/bases/forme/lib/resolve-color.ts
 * Retrieved: 2026-09-08. Only the type import path was rewritten.
 * (Content is identical to the Takumi base copy; kept separate for base fidelity.)
 */
import type { ColorTokens } from "./pdf-theme-types";

/** Theme color token keys that can be used for the color prop */
export const THEME_COLOR_KEYS = [
  "foreground",
  "background",
  "muted",
  "mutedForeground",
  "primary",
  "primaryForeground",
  "border",
  "accent",
  "destructive",
  "success",
  "warning",
  "info",
] as const satisfies (keyof ColorTokens)[];

/** Resolves a color value: theme token key → hex, or raw CSS color as-is. */
export const resolveColor = (value: string, colors: ColorTokens): string => {
  const key = value as (typeof THEME_COLOR_KEYS)[number];
  return THEME_COLOR_KEYS.includes(key) ? colors[key] : value;
};
