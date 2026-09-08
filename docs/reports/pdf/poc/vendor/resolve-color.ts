/**
 * POC VENDOR FILE — verbatim logic from pdfcn upstream.
 * Source: https://pdfcn.dev/r/takumi/utils.json
 * Item: takumi/utils, file registry/bases/takumi/lib/resolve-color.ts
 * Retrieved: 2026-09-07. Only the type import path was rewritten.
 */
import type { ColorTokens } from "./pdf-theme-types.ts";

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
