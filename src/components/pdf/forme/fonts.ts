import { Font } from '@formepdf/react'
import { getRegisteredSharedFontConfig } from '@/lib/pdfSharedFonts'

const FALLBACK_FAMILY = 'Helvetica'
const FORME_SUPPORTED_FONT_EXTENSIONS = ['.ttf', '.otf']

let registeredFamilies = new Set<string>()

export function resolveFormeFontFamily(choice: unknown): string {
  if (typeof choice === 'string' && getRegisteredSharedFontConfig(choice)) {
    return choice
  }
  return FALLBACK_FAMILY
}

function toBytes(value: string | Uint8Array): Uint8Array | null {
  if (value instanceof Uint8Array) return value
  return null
}

function isFormeSupportedFontSource(value: string | Uint8Array): boolean {
  if (value instanceof Uint8Array) return false
  const clean = value.split('?')[0]?.toLowerCase() || ''
  return FORME_SUPPORTED_FONT_EXTENSIONS.some((extension) => clean.endsWith(extension))
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const buffer = await response.arrayBuffer()
    return new Uint8Array(buffer)
  } catch {
    return null
  }
}

export async function ensureFormeFontFamily(choice: unknown): Promise<string> {
  const family = resolveFormeFontFamily(choice)
  if (family === FALLBACK_FAMILY || registeredFamilies.has(family)) {
    return family
  }
  try {
    const config = getRegisteredSharedFontConfig(family)
    if (!config) return FALLBACK_FAMILY
    if (!isFormeSupportedFontSource(config.regularSrc)) return FALLBACK_FAMILY
    const regular = toBytes(config.regularSrc) || await fetchBytes(config.regularSrc)
    const boldSrc = config.boldSrc && isFormeSupportedFontSource(config.boldSrc) ? config.boldSrc : null
    const bold = toBytes(boldSrc || '') || (boldSrc ? await fetchBytes(boldSrc) : null)
    if (!regular) return FALLBACK_FAMILY
    Font.register({ family, src: regular, fontWeight: 400 })
    if (bold) Font.register({ family, src: bold, fontWeight: 700 })
    registeredFamilies.add(family)
    return family
  } catch {
    return FALLBACK_FAMILY
  }
}

export function resetFormeFontCache(): void {
  registeredFamilies = new Set<string>()
}
