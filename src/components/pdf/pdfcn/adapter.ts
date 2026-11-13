import type React from 'react'
import type { PdfcnDocumentEnvelope } from '@/domain/pdf/resolver'
import { ensureFormeFontFamily } from '../forme/fonts'
import { CURRENCY_GLYPH_FONT, SYMBOL_GLYPH_FONT } from '../forme/glyphs'
import { uiSound } from '@/lib/uiSoundEvent'
import {
  CompositePdfDelivery,
  NativePdfDelivery,
  WebPdfDelivery,
  DefaultFeedbackBus,
} from '@/lib/pdf'

export type PdfcnRenderStage = 'init' | 'render' | 'bytes' | 'delivery'

export class PdfcnRenderError extends Error {
  readonly stage: PdfcnRenderStage
  readonly cause?: unknown

  constructor(stage: PdfcnRenderStage, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause)
    super(`PDFCN ${stage} failed: ${causeMessage}`)
    this.name = 'PdfcnRenderError'
    this.stage = stage
    this.cause = cause
  }
}

/**
 * Dynamically resolves the Forme core rendering function.
 * Uses @formepdf/core/browser in browser runtimes, and @formepdf/core in Node/Bun runtimes.
 */
async function loadFormeRenderDocument(): Promise<(element: React.ReactElement) => Promise<Uint8Array>> {
  try {
    if (typeof window !== 'undefined') {
      const browserModule = await import('@formepdf/core/browser')
      if (typeof browserModule.renderDocument === 'function') {
        return browserModule.renderDocument
      }
    }
  } catch {
    // Fall back to universal core module
  }

  const coreModule = await import('@formepdf/core')
  if (typeof coreModule.renderDocument !== 'function') {
    throw new Error('Could not locate renderDocument function in @formepdf/core or @formepdf/core/browser')
  }
  return coreModule.renderDocument
}

/**
 * Locked-coverage families used by per-glyph fallback (Naira, Greek letters,
 * superscripts, fractions). Registering them here means every render path — app,
 * previews and tests — has them, so a fallback run can never land on Helvetica.
 */
async function ensureGlyphCoverageFonts(): Promise<void> {
  await Promise.all([
    ensureFormeFontFamily('Inter'),
    // Registering Noto Sans also registers the Greek subset used for Ω.
    ensureFormeFontFamily('Noto Sans'),
    ensureFormeFontFamily(CURRENCY_GLYPH_FONT),
    ensureFormeFontFamily(SYMBOL_GLYPH_FONT),
  ])
}

/**
 * Render a Forme React document element directly into raw PDF bytes.
 */
export async function renderPdfcnToBytes(element: React.ReactElement): Promise<Uint8Array> {
  await ensureGlyphCoverageFonts()
  const renderDocument = await loadFormeRenderDocument()
  try {
    const bytes = await renderDocument(element)
    if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
      throw new Error('Forme returned empty or invalid PDF byte array.')
    }
    return bytes
  } catch (error) {
    throw new PdfcnRenderError('render', error)
  }
}

/**
 * Render a Forme React document element into a standard application/pdf Blob.
 */
export async function renderPdfcnToBlob(element: React.ReactElement): Promise<Blob> {
  const bytes = await renderPdfcnToBytes(element)
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
}

export interface PdfcnGenerationResult {
  status: 'generated'
  filename: string
  uri?: string
  bytes?: Uint8Array
  blob?: Blob
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

/**
 * High-level PDF generation and delivery for a resolved PDFCN document envelope and rendered element.
 */
export async function generatePdfcnPdf(
  envelope: PdfcnDocumentEnvelope<any>,
  element: React.ReactElement,
  options?: { deliver?: boolean; filename?: string },
): Promise<PdfcnGenerationResult> {
  const bytes = await renderPdfcnToBytes(element)
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })

  const rawName = options?.filename || (envelope.data?.csrNumber ? `CSR_${envelope.data.csrNumber}` : `${envelope.documentType}_${envelope.templateId}`)
  const filename = `${sanitizeFilename(rawName)}.pdf`

  if (options?.deliver === false) {
    return {
      status: 'generated',
      filename,
      bytes,
      blob,
    }
  }

  // Delivery via CompositePdfDelivery
  const asset = {
    blob,
    filename,
    mimeType: 'application/pdf',
    sizeBytes: blob.size,
    documentType: envelope.documentType as any,
    metadata: envelope.metadata,
  }

  const delivery = new CompositePdfDelivery(new WebPdfDelivery(), new NativePdfDelivery())
  const result = await delivery.deliver({ asset, mode: 'download' })

  const feedbackBus = new DefaultFeedbackBus()
  if (!result.success) {
    feedbackBus.emit({
      kind: 'failed',
      documentType: envelope.documentType as any,
      timestamp: Date.now(),
      fileName: filename,
      error: result.error,
    })
    throw new PdfcnRenderError('delivery', result.error ?? 'PDF delivery failed')
  }

  feedbackBus.emit({
    kind: 'downloaded',
    documentType: envelope.documentType as any,
    timestamp: Date.now(),
    fileName: filename,
  })
  uiSound('hero.complete')

  return {
    status: 'generated',
    filename,
    uri: result.uri,
    bytes,
    blob,
  }
}
