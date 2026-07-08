/**
 * PDF Customization Engine — React Hook
 *
 * Manages user settings persistence (localStorage) and exposes
 * resolved state + setters. Thin wrapper over resolver.
 */

'use client'

import { useCallback, useMemo, useState } from 'react'

import type {
  PdfCustomizationCapabilities,
  PdfCustomizationPolicy,
  PdfCustomizationSettings,
  PdfTemplateDefaults,
  PdfCustomizationDocumentFamily,
  ResolvedPdfCustomization,
  ResolvedPdfCustomizationSettings,
} from './types'
import { DEFAULT_CAPABILITIES, DEFAULT_POLICY, FALLBACK_TEMPLATE_DEFAULTS } from './types'
import { resolveSettings, resolvePdfCustomization } from './resolver'

const STORAGE_PREFIX = 'bigdrops_pdf_customization_'

function storageKey(documentFamily: PdfCustomizationDocumentFamily): string {
  return `${STORAGE_PREFIX}${documentFamily}`
}

function loadSettings(documentFamily: PdfCustomizationDocumentFamily): PdfCustomizationSettings | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(storageKey(documentFamily))
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.version === 1) return parsed
  } catch { /* corrupt entry — ignore */ }
  return undefined
}

function saveSettings(documentFamily: PdfCustomizationDocumentFamily, settings: PdfCustomizationSettings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(documentFamily), JSON.stringify(settings))
  } catch { /* quota — silent */ }
}

export interface UsePdfCustomizationOptions {
  documentFamily: PdfCustomizationDocumentFamily
  templateDefaults?: PdfTemplateDefaults
  capabilities?: PdfCustomizationCapabilities
  policy?: PdfCustomizationPolicy
}

export interface UsePdfCustomizationReturn {
  customization: ResolvedPdfCustomization
  settings: ResolvedPdfCustomizationSettings
  setAccentColor: (color: string) => void
  setDocumentFont: (font: string) => void
  setInkFont: (font: string) => void
  setInkColour: (color: string) => void
  reset: () => void
}

/**
 * Hook for consuming the PDF Customization Engine.
 *
 * Usage:
 * ```tsx
 * const { customization, setAccentColor } = usePdfCustomization({
 *   documentFamily: 'invoice',
 *   templateDefaults: { ... },
 * })
 * ```
 */
export function usePdfCustomization({
  documentFamily,
  templateDefaults = FALLBACK_TEMPLATE_DEFAULTS,
  capabilities = DEFAULT_CAPABILITIES,
  policy = DEFAULT_POLICY,
}: UsePdfCustomizationOptions): UsePdfCustomizationReturn {
  const [rawSettings, setRawSettings] = useState<PdfCustomizationSettings | undefined>(
    () => loadSettings(documentFamily),
  )

  const settings = useMemo(
    () => resolveSettings(capabilities, policy, rawSettings, templateDefaults),
    [capabilities, policy, rawSettings, templateDefaults],
  )

  const customization = useMemo(
    () => resolvePdfCustomization(templateDefaults, settings),
    [templateDefaults, settings],
  )

  const update = useCallback(
    (patch: Partial<PdfCustomizationSettings>) => {
      setRawSettings((prev) => {
        const next: PdfCustomizationSettings = { version: 1, ...prev, ...patch }
        saveSettings(documentFamily, next)
        return next
      })
    },
    [documentFamily],
  )

  const setAccentColor = useCallback((color: string) => update({ accentColor: color }), [update])
  const setDocumentFont = useCallback((font: string) => update({ documentFont: font }), [update])
  const setInkFont = useCallback((font: string) => update({ inkFont: font }), [update])
  const setInkColour = useCallback((color: string) => update({ inkColour: color }), [update])

  const reset = useCallback(() => {
    setRawSettings(undefined)
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem(storageKey(documentFamily)) } catch { /* silent */ }
    }
  }, [documentFamily])

  return {
    customization,
    settings,
    setAccentColor,
    setDocumentFont,
    setInkFont,
    setInkColour,
    reset,
  }
}
