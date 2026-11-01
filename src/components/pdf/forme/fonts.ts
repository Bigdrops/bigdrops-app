import { Font } from '@formepdf/react'

const FALLBACK_FAMILY = 'Helvetica'

export const FORME_SUPPORTED_FAMILIES = [
  'Inter',
  'Archivo Black',
  'Caveat',
  'Noto Sans',
] as const
export type FormeSupportedFamily = (typeof FORME_SUPPORTED_FAMILIES)[number]

let registeredFamilies = new Set<string>()

export function isFormeSupportedFamily(choice: unknown): choice is FormeSupportedFamily {
  return typeof choice === 'string' && (FORME_SUPPORTED_FAMILIES as readonly string[]).includes(choice)
}

export function resolveFormeFontFamily(choice: unknown): string {
  if (isFormeSupportedFamily(choice)) {
    return choice
  }
  if (choice != null) {
    console.warn(`[forme/fonts] Unregistered or retired font family requested: "${choice}". Falling back to ${FALLBACK_FAMILY}.`)
  }
  return FALLBACK_FAMILY
}

function getFormeFontSrc(filename: string): string {
  return typeof window === 'undefined'
    ? `public/fonts/${filename}`
    : `/fonts/${filename}`
}

async function resolveFontSource(filename: string): Promise<string | Uint8Array> {
  const src = getFormeFontSrc(filename)
  if (typeof window === 'undefined') {
    return src
  }
  try {
    const res = await fetch(src)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  } catch (err) {
    console.error(`[forme/fonts] Failed to fetch font asset "${src}":`, err)
    throw err
  }
}

export async function ensureFormeFontFamily(choice: unknown): Promise<string> {
  const family = resolveFormeFontFamily(choice)
  if (family === FALLBACK_FAMILY || registeredFamilies.has(family)) {
    return family
  }

  try {
    if (family === 'Archivo Black') {
      const src = await resolveFontSource('ArchivoBlack-Regular.ttf')
      Font.register({ family, src, fontWeight: 400 })
      Font.register({ family, src, fontWeight: 700 })
      registeredFamilies.add(family)
      return family
    }

    if (family === 'Inter') {
      const regular = await resolveFontSource('Inter-Regular.ttf')
      const bold = await resolveFontSource('Inter-Bold.ttf')
      Font.register({ family, src: regular, fontWeight: 400 })
      Font.register({ family, src: bold, fontWeight: 700 })
      registeredFamilies.add(family)
      return family
    }

    if (family === 'Caveat') {
      const regular = await resolveFontSource('Caveat-Regular.ttf')
      const bold = await resolveFontSource('Caveat-Bold.ttf')
      Font.register({ family, src: regular, fontWeight: 400 })
      Font.register({ family, src: bold, fontWeight: 700 })
      registeredFamilies.add(family)
      return family
    }

    if (family === 'Noto Sans') {
      const regular = await resolveFontSource('NotoSans-Regular.ttf')
      const bold = await resolveFontSource('NotoSans-Bold.ttf')
      Font.register({ family, src: regular, fontWeight: 400 })
      Font.register({ family, src: bold, fontWeight: 700 })
      registeredFamilies.add(family)
      return family
    }

    console.error(`[forme/fonts] Unsupported font requested: "${family}". Observable fallback to ${FALLBACK_FAMILY}.`)
    return FALLBACK_FAMILY
  } catch (err) {
    console.error(`[forme/fonts] Unexpected error registering font "${family}":`, err)
    return FALLBACK_FAMILY
  }
}

export function resetFormeFontCache(): void {
  registeredFamilies = new Set<string>()
}
