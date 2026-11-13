import type React from 'react'
import type { PdfDesignPreset } from '@/lib/pdfDesignPreset'
import { isFormeSupportedFamily } from '../../forme/fonts'
import type { PdfcnDocumentEnvelope } from '@/domain/pdf/resolver'
import type { CanonicalPreparedCsr } from '@/domain/pdf/resolver/csr/csrPreparedContract'

/**
 * Shared helpers for the three CSR Forme ports (Industry, Zinc, Minimal).
 * The existing Blueprint Landscape / Portrait Reference templates keep their
 * own look and don't consume this kit.
 */

/** Mirrors resolvePdfFontFamily after mapping unregistered choices to Caveat/Inter. */
export function resolveInkFonts(designPreset?: PdfDesignPreset | null) {
  const ink = designPreset?.fillableColor || '#0f172a'
  const rawChoice = designPreset?.fillableFont || 'Caveat'
  const fillableFont = isFormeSupportedFamily(rawChoice) ? rawChoice : 'Caveat'
  const bodyFont = designPreset?.bodyFont && isFormeSupportedFamily(designPreset.bodyFont) ? designPreset.bodyFont : 'Inter'
  return { ink, fillableFont, bodyFont }
}

export interface CsrRenderOptions {
  density: 'comfortable' | 'compact' | 'tight'
  showOperationalReadings: boolean
  designPreset: PdfDesignPreset | null
}

/** Reads render-time options threaded through the envelope. */
export function getCsrRenderOptions(envelope: PdfcnDocumentEnvelope<CanonicalPreparedCsr>): CsrRenderOptions {
  const metadata = (envelope.metadata ?? {}) as { showOperationalReadings?: boolean; designPreset?: PdfDesignPreset | null }
  const density = (envelope.pageConfig?.density as CsrRenderOptions['density']) ?? 'comfortable'
  const showOperationalReadings = metadata.showOperationalReadings !== false
  const designPreset = (metadata.designPreset as PdfDesignPreset | undefined) ?? null
  return { density, showOperationalReadings, designPreset }
}
