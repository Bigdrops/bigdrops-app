import React from 'react'
import { normalizeInvoicePdfTemplateId } from '@/domain/invoice/types'
import { registerPdfFonts } from '@/lib/pdfFontRegistry'
import {
  DefaultPdfGenerator, CompositePdfDelivery, WebPdfDelivery, NativePdfDelivery, DefaultFeedbackBus,
  type PdfDocumentType,
} from '@/lib/pdf'
import { adaptCommercialDocumentData } from './industryAdapter'
import { buildPdfRowCells, buildPdfTableColumns, interpretPdfTableSettings } from './table'
import type { InvoicePdfModel, PdfDocumentModel, QuotationPdfModel } from './types'
import type { PdfTemplateRenderer } from './renderers/PdfRenderer'

export type PdfGenerationResult = {
  status: 'generated'
  filename: string
  /** Persisted file URI (native Documents or web object URL) for Open/Share. */
  uri?: string
}

export type PdfGenerationRequest<TModel extends PdfDocumentModel> = {
  model: TModel
  documentNumber?: string | null
  templateId?: string | null
  compact?: boolean
  engine?: 'forme' | 'react-pdf'
}

type CpsPdfStage = 'forme-init' | 'render' | 'bytes' | 'delivery'
type ErrorWithCause = Error & { cause?: unknown }

class CpsPdfStageError extends Error {
  readonly stage: CpsPdfStage

  constructor(stage: CpsPdfStage, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause)
    super(`CPS PDF ${stage} failed: ${causeMessage}`)
    this.name = 'CpsPdfStageError'
    this.stage = stage
    ;(this as ErrorWithCause).cause = cause
  }
}

async function cpsPdfStage<T>(stage: CpsPdfStage, operation: () => Promise<T> | T): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw new CpsPdfStageError(stage, error)
  }
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function resolveFilename(model: PdfDocumentModel, fallbackNumber?: string | null) {
  const number = String(model.identity.number || fallbackNumber || model.identity.kind).trim() || model.identity.kind
  return `${sanitizeFilename(number)}.pdf`
}

export type CommercialPdfRoute =
  | 'industrial-forme'
  | 'industry-forme'
  | 'landscape-forme'
  | 'minimal-forme'
  | 'react-pdf'

/**
 * Resolve which renderer handles a commercial template identifier.
 *
 * - 'industrial' always uses the Forme Industrial renderer.
 * - 'industry' uses the Forme Industry renderer unless the caller forces react-pdf.
 * - 'landscape' and 'minimal' always use their Forme renderers.
 * - Explicit 'industry-forme' normalizes to 'industry' and therefore also uses Forme.
 * - Retired 'modern-minimal' normalizes to 'minimal'.
 * - Everything else keeps the retained React-PDF renderers.
 */
export function resolveCommercialPdfRoute(
  templateId: string | null | undefined,
  engine?: 'forme' | 'react-pdf',
): CommercialPdfRoute {
  const activeTemplateId = normalizeInvoicePdfTemplateId(templateId) || 'industry'
  if (activeTemplateId === 'industrial') return 'industrial-forme'
  if (activeTemplateId === 'landscape') return 'landscape-forme'
  if (activeTemplateId === 'minimal') return 'minimal-forme'
  if (activeTemplateId === 'industry' && engine !== 'react-pdf') return 'industry-forme'
  return 'react-pdf'
}

async function generatePdfAsset<TModel extends PdfDocumentModel>(request: PdfGenerationRequest<TModel>) {
  const activeTemplateId = normalizeInvoicePdfTemplateId(request.templateId) || 'industry'
  const filename = resolveFilename(request.model, request.documentNumber)
  const docType = request.model.identity.kind as PdfDocumentType

  // Determine rendering engine:
  // 1. Explicit 'industrial' routes directly to Forme IndustrialFormeDocument (HTML-based industrial layout).
  // 2. Explicit 'industry-react-pdf' forces React-PDF IndustryTemplate (cannot be overridden by request.engine).
  // 3. Explicit 'industry-forme' forces Forme IndustryFormeDocument (cannot be overridden by request.engine).
  // 4. 'industry' defaults to Forme IndustryFormeDocument, falling back to React-PDF only when request.engine === 'react-pdf'.
  // 5. Retained templates 'crest' and 'evergreen' route to React-PDF.
  const route = resolveCommercialPdfRoute(request.templateId, request.engine)
  const shouldUseForme = route !== 'react-pdf'

  // Forme Commercial Rendering Path (Industrial, Industry, Landscape, Minimal)
  if (shouldUseForme) {
    const [
      IndustrialDocModule,
      IndustryDocModule,
      LandscapeDocModule,
      MinimalDocModule,
      { renderPdfcnToBytes },
      { ensureFormeFontFamily },
    ] = await Promise.all([
      import('./forme/IndustrialFormeDocument'),
      import('./forme/IndustryFormeDocument'),
      import('./forme/LandscapeFormeDocument'),
      import('./forme/MinimalFormeDocument'),
      import('./pdfcn/adapter'),
      import('./forme/fonts'),
    ])

    await Promise.all([
      ensureFormeFontFamily('Inter'),
      ensureFormeFontFamily('Archivo Black'),
      ensureFormeFontFamily('Caveat'),
      ensureFormeFontFamily('Noto Sans'),
    ])

    const adaptedData = adaptCommercialDocumentData(request.model as PdfDocumentModel)
    let element: React.ReactElement
    if (route === 'industrial-forme') {
      element = React.createElement(IndustrialDocModule.IndustrialFormeDocument, {
        data: adaptedData,
        compact: request.compact,
      })
    } else if (route === 'landscape-forme') {
      element = React.createElement(LandscapeDocModule.LandscapeFormeDocument, {
        data: adaptedData,
        compact: request.compact,
      })
    } else if (route === 'minimal-forme') {
      element = React.createElement(MinimalDocModule.MinimalFormeDocument, {
        data: adaptedData,
        compact: request.compact,
      })
    } else {
      element = React.createElement(IndustryDocModule.IndustryFormeDocument, {
        data: adaptedData,
        compact: request.compact,
      })
    }

    const bytes = await renderPdfcnToBytes(element)
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })

    return {
      blob,
      filename,
      mimeType: 'application/pdf',
      sizeBytes: blob.size,
      documentType: docType,
      metadata: {},
    }
  }

  // Retained React-PDF Rendering Path (Evergreen, Crest, and Industry React-PDF comparison)
  const [
    { PdfRenderer },
    IndustryModule,
    CrestModule,
    EvergreenModule,
  ] = await Promise.all([
    import('./renderers/PdfRenderer'),
    import('./templates/Industry'),
    import('./templates/Crest'),
    import('./templates/Evergreen'),
  ])

  const Industry = IndustryModule.default
  const Crest = CrestModule.default
  const Evergreen = EvergreenModule.default

  registerPdfFonts()

  let Template: PdfTemplateRenderer = Industry as PdfTemplateRenderer

  switch (activeTemplateId) {
    case 'crest':
      Template = Crest
      break
    case 'evergreen':
      Template = Evergreen
      break
    case 'industry-react-pdf':
    case 'industry':
    default:
      Template = Industry
      break
  }

  const generator = new DefaultPdfGenerator(
    (model) => React.createElement(PdfRenderer, {
      data: adaptCommercialDocumentData(model as PdfDocumentModel),
      Template,
      compact: request.compact,
    }),
  )

  const asset = await generator.generate({
    template: activeTemplateId,
    model: request.model,
    filename,
    documentType: docType,
    options: { compact: request.compact },
  })

  return asset
}

export async function generatePdfBlob<TModel extends PdfDocumentModel>(
  request: PdfGenerationRequest<TModel>,
): Promise<{ blob: Blob; filename: string }> {
  const asset = await generatePdfAsset(request)
  return { blob: asset.blob, filename: asset.filename }
}

async function generatePdf<TModel extends PdfDocumentModel>(request: PdfGenerationRequest<TModel>): Promise<PdfGenerationResult> {
  const asset = await generatePdfAsset(request)
  const delivery = new CompositePdfDelivery(new WebPdfDelivery(), new NativePdfDelivery())
  const result = await delivery.deliver({ asset, mode: 'download' })

  const feedbackBus = new DefaultFeedbackBus()
  if (!result.success) {
    feedbackBus.emit({ kind: 'failed', documentType: asset.documentType, timestamp: Date.now(), fileName: asset.filename, error: result.error })
    throw new Error(result.error ?? 'PDF delivery failed')
  }

  feedbackBus.emit({ kind: 'downloaded', documentType: asset.documentType, timestamp: Date.now(), fileName: asset.filename })

  return { status: 'generated', filename: asset.filename, uri: result.uri }
}

export async function generateInvoicePdf(request: PdfGenerationRequest<InvoicePdfModel>): Promise<PdfGenerationResult> {
  return generatePdf(request)
}

export async function generateInvoicePdfBlob(request: PdfGenerationRequest<InvoicePdfModel>): Promise<{ blob: Blob; filename: string }> {
  return generatePdfBlob(request)
}

export async function generateQuotationPdf(request: PdfGenerationRequest<QuotationPdfModel>): Promise<PdfGenerationResult> {
  return generatePdf(request)
}

export async function generateQuotationPdfBlob(request: PdfGenerationRequest<QuotationPdfModel>): Promise<{ blob: Blob; filename: string }> {
  return generatePdfBlob(request)
}

export async function generateCpsFormePdfBlob(request: {
  element: React.ReactElement
  filename: string
}): Promise<{ blob: Blob; filename: string }> {
  const { renderDocument } = await cpsPdfStage('forme-init', () => import('@formepdf/core/browser'))

  const bytes = await cpsPdfStage('render', () => renderDocument(request.element))

  const filename = request.filename
  const blob = await cpsPdfStage('bytes', () => {
    if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
      throw new Error('Forme returned empty or invalid PDF bytes.')
    }
    return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
  })

  return { blob, filename }
}

export async function generateCpsFormePdf(request: {
  element: React.ReactElement
  filename: string
}): Promise<PdfGenerationResult> {
  const { renderDocument } = await cpsPdfStage('forme-init', () => import('@formepdf/core/browser'))

  const bytes = await cpsPdfStage('render', () => renderDocument(request.element))

  const filename = request.filename
  const blob = await cpsPdfStage('bytes', () => {
    if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
      throw new Error('Forme returned empty or invalid PDF bytes.')
    }
    return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
  })
  const asset = {
    blob,
    filename,
    mimeType: 'application/pdf',
    sizeBytes: blob.size,
    documentType: 'cps_sheets' as const,
    metadata: {},
  }

  const delivery = new CompositePdfDelivery(new WebPdfDelivery(), new NativePdfDelivery())
  const result = await cpsPdfStage('delivery', () => delivery.deliver({ asset, mode: 'download' }))

  const feedbackBus = new DefaultFeedbackBus()
  if (!result.success) {
    feedbackBus.emit({ kind: 'failed', documentType: 'cps_sheets', timestamp: Date.now(), fileName: filename, error: result.error })
    throw new Error(result.error ?? 'PDF delivery failed')
  }

  feedbackBus.emit({ kind: 'downloaded', documentType: 'cps_sheets', timestamp: Date.now(), fileName: filename })

  return { status: 'generated', filename, uri: result.uri }
}

export async function generateCsrPdfcnPdf(request: {
  rawDocument: Record<string, any>
  templateId: string
  deliver?: boolean
  filename?: string
  options?: Record<string, unknown>
}): Promise<PdfGenerationResult> {
  const { resolvePdfcnDocument } = await import('./pdfcn')
  const { generatePdfcnPdf } = await import('./pdfcn/adapter')

  const resolution = resolvePdfcnDocument({
    documentType: 'csr',
    templateId: request.templateId,
    rawDocument: request.rawDocument,
    options: request.options,
  })

  if (!resolution.success || !resolution.envelope || !resolution.element) {
    throw new Error(`PDFCN CSR generation failed: ${resolution.error || 'Unknown resolution error'}`)
  }

  const result = await generatePdfcnPdf(resolution.envelope, resolution.element, {
    deliver: request.deliver !== false,
    filename: request.filename,
  })

  return { status: 'generated', filename: result.filename, uri: result.uri }
}

export { isPdfcnCsrTemplate } from './pdfcn'
export { IndustrialFormeDocument } from './forme/IndustrialFormeDocument'
export { IndustryFormeDocument } from './forme/IndustryFormeDocument'
export { LandscapeFormeDocument } from './forme/LandscapeFormeDocument'
export { MinimalFormeDocument } from './forme/MinimalFormeDocument'
export { default as IndustryTemplate } from './presentation/industry/IndustryTemplate'

export {
  buildPdfRowCells,
  buildPdfTableColumns,
  interpretPdfTableSettings,
}

export type {
  PdfTemplateRenderer,
  PdfTemplateRendererProps,
} from './renderers/PdfRenderer'

export type {
  InvoicePdfModel,
  PdfAdvanceSummary,
  PdfAttachmentReference,
  PdfBankDetails,
  PdfBaseDocumentModel,
  PdfColumnDefinition,
  PdfColumnKind,
  PdfColumnDataType,
  PdfDocumentIdentity,
  PdfDocumentKind,
  PdfDocumentModel,
  PdfHeaderField,
  PdfLineItem,
  PdfLogo,
  PdfParty,
  PdfReferenceLink,
  PdfResolvedTableSettings,
  PdfSignature,
  PdfTemplateConfig,
  PdfTextSection,
  PdfTotalRow,
  PdfTotals,
  PdfTotalsMode,
  QuotationPdfModel,
} from './types'
