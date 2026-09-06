export function getAccentTint(accentColor: string | null, fallback: string) {
  if (!accentColor) return fallback
  if (/^#[\da-f]{6}$/i.test(accentColor)) return `${accentColor}1A`
  return fallback
}
