export function resolveTextAlignment(
  align?: string | null
): { textAlign: 'left' | 'center' | 'right' } | null {
  if (align === 'right') return { textAlign: 'right' }
  if (align === 'center') return { textAlign: 'center' }
  return null
}
