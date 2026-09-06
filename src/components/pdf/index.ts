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

export type PdfGenerationResult = {
  status: 'generated'
  filename: string
}

type PdfGenerationRequest<TModel extends PdfDocumentModel> = {
  model: TModel
  documentNumber?: string | null
  templateId?: string | null
  compact?: boolean
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function resolveFilename(model: PdfDocumentModel, fallbackNumber?: string | null) {
  const number = String(model.identity.number || fallbackNumber || model.identity.kind).trim() || model.identity.kind
  return `${sanitizeFilename(number)}.pdf`
}

async function generatePdf<TModel extends PdfDocumentModel>(request: PdfGenerationRequest<TModel>): Promise<PdfGenerationResult> {
  const [
    { PdfRenderer },
    IndustryModule,
    LedgerModule,
    CrestModule,
    MinimalModule,
    EvergreenModule,
    BoltModule,
    EmberModule,
  ] = await Promise.all([
    import('./renderers/PdfRenderer'),
    import('./templates/Industry'),
    import('./templates/Ledger'),
    import('./templates/Crest'),
    import('./templates/Minimal'),
    import('./templates/Evergreen'),
    import('./templates/Bolt'),
    import('./templates/Ember'),
  ])

  const Industry = IndustryModule.default
  const Ledger = LedgerModule.default
  const Crest = CrestModule.default
  const Minimal = MinimalModule.default
  const Evergreen = EvergreenModule.default
  const Bolt = BoltModule.default
  const Ember = EmberModule.default

  registerPdfFonts()

  const activeTemplateId = normalizeInvoicePdfTemplateId(request.templateId) || 'industry'

  let Template: React.ComponentType<any> = Industry as React.ComponentType<any>

  switch (activeTemplateId) {
    case 'ledger':
      Template = Ledger
      break
    case 'crest':
      Template = Crest
      break
    case 'minimal':
      Template = Minimal
      break
    case 'ember':
      Template = Ember
      break
    case 'bolt':
      Template = Bolt
      break
    case 'evergreen':
      Template = Evergreen
      break
    case 'industry':
    default:
      Template = Industry
      break
  }

  const filename = resolveFilename(request.model, request.documentNumber)
  const docType = request.model.identity.kind as PdfDocumentType

  const generator = new DefaultPdfGenerator(
    (model) => React.createElement(PdfRenderer, {
      data: adaptCommercialDocumentData(model as PdfDocumentModel),
      Template,
      compact: request.compact,
    }) as any,
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

  return { status: 'generated', filename }
}

export async function generateInvoicePdf(request: PdfGenerationRequest<InvoicePdfModel>): Promise<PdfGenerationResult> {
  return generatePdf(request)
}

export async function generateQuotationPdf(request: PdfGenerationRequest<QuotationPdfModel>): Promise<PdfGenerationResult> {
  return generatePdf(request)
}

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
