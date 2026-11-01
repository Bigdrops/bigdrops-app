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

async function generatePdf<TModel extends PdfDocumentModel>(request: PdfGenerationRequest<TModel>): Promise<PdfGenerationResult> {
  const activeTemplateId = normalizeInvoicePdfTemplateId(request.templateId) || 'industry'
  const filename = resolveFilename(request.model, request.documentNumber)
  const docType = request.model.identity.kind as PdfDocumentType

  // Determine rendering engine:
  // 1. Explicit 'industrial' routes directly to Forme IndustrialFormeDocument (HTML-based industrial layout).
  // 2. Explicit 'industry-react-pdf' forces React-PDF IndustryTemplate (cannot be overridden by request.engine).
  // 3. Explicit 'industry-forme' forces Forme IndustryFormeDocument (cannot be overridden by request.engine).
  // 4. 'industry' defaults to Forme IndustryFormeDocument, falling back to React-PDF only when request.engine === 'react-pdf'.
  // 5. Retained templates 'crest', 'minimal', 'evergreen' route to React-PDF.
  const isIndustrial = activeTemplateId === 'industrial'
  const isExplicitReactPdf = activeTemplateId === 'industry-react-pdf'
  const isExplicitForme = activeTemplateId === 'industry-forme'
  const shouldUseForme = isIndustrial || (!isExplicitReactPdf && (isExplicitForme || (activeTemplateId === 'industry' && request.engine !== 'react-pdf')))

  // Forme Commercial Rendering Path (Industrial & Industry)
  if (shouldUseForme) {
    const [
      IndustrialDocModule,
      IndustryDocModule,
      { renderPdfcnToBytes },
      { ensureFormeFontFamily },
    ] = await Promise.all([
      import('./forme/IndustrialFormeDocument'),
      import('./forme/IndustryFormeDocument'),
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
    const element = isIndustrial
      ? React.createElement(IndustrialDocModule.IndustrialFormeDocument, {
          data: adaptedData,
          compact: request.compact,
        })
      : React.createElement(IndustryDocModule.IndustryFormeDocument, {
          data: adaptedData,
          compact: request.compact,
        })

    const bytes = await renderPdfcnToBytes(element)
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })

    const asset = {
      blob,
      filename,
      mimeType: 'application/pdf',
      sizeBytes: blob.size,
      documentType: docType,
      metadata: {},
    }

    const delivery = new CompositePdfDelivery(new WebPdfDelivery(), new NativePdfDelivery())
    const result = await delivery.deliver({ asset, mode: 'download' })

    const feedbackBus = new DefaultFeedbackBus()
    if (!result.success) {
      feedbackBus.emit({ kind: 'failed', documentType: docType, timestamp: Date.now(), fileName: filename, error: result.error })
      throw new Error(result.error ?? 'PDF delivery failed')
    }

    feedbackBus.emit({ kind: 'downloaded', documentType: docType, timestamp: Date.now(), fileName: filename })

    return { status: 'generated', filename, uri: result.uri }
  }

  // Retained React-PDF Rendering Path (Minimal, Evergreen, Crest, and Industry React-PDF comparison)
  const [
    { PdfRenderer },
    IndustryModule,
    CrestModule,
    MinimalModule,
    EvergreenModule,
  ] = await Promise.all([
    import('./renderers/PdfRenderer'),
    import('./templates/Industry'),
    import('./templates/Crest'),
    import('./templates/Minimal'),
    import('./templates/Evergreen'),
  ])

  const Industry = IndustryModule.default
  const Crest = CrestModule.default
  const Minimal = MinimalModule.default
  const Evergreen = EvergreenModule.default

  registerPdfFonts()

  let Template: PdfTemplateRenderer = Industry as PdfTemplateRenderer

  switch (activeTemplateId) {
    case 'crest':
      Template = Crest
      break
    case 'minimal':
      Template = Minimal
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

  const delivery = new CompositePdfDelivery(new WebPdfDelivery(), new NativePdfDelivery())
  const result = await delivery.deliver({ asset, mode: 'download' })

  const feedbackBus = new DefaultFeedbackBus()
  if (!result.success) {
    feedbackBus.emit({ kind: 'failed', documentType: docType, timestamp: Date.now(), fileName: filename, error: result.error })
    throw new Error(result.error ?? 'PDF delivery failed')
  }

  feedbackBus.emit({ kind: 'downloaded', documentType: docType, timestamp: Date.now(), fileName: filename })

  return { status: 'generated', filename, uri: result.uri }
}

export async function generateInvoicePdf(request: PdfGenerationRequest<InvoicePdfModel>): Promise<PdfGenerationResult> {
  return generatePdf(request)
}

export async function generateQuotationPdf(request: PdfGenerationRequest<QuotationPdfModel>): Promise<PdfGenerationResult> {
  return generatePdf(request)
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
