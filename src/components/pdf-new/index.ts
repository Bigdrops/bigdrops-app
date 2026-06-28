import React from 'react'
import { normalizeInvoicePdfTemplateId } from '@/domain/invoice/types'
import { registerPdfFonts } from '@/lib/pdfFontRegistry'
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

function downloadBlob(blob: Blob, filename: string) {
  const anchor = document.createElement('a')
  const url = URL.createObjectURL(blob)
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
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
    { pdf },
    { PdfRenderer },
    IndustryModule,
    ApexModule,
    ObsidianModule,
    LedgerModule,
    CrestModule,
  ] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./renderers/PdfRenderer'),
    import('./templates/Industry'),
    import('./templates/Apex'),
    import('./templates/ObsidianReceipt'),
    import('./templates/Ledger'),
    import('./templates/Crest'),
  ])

  const Industry = IndustryModule.default
  const Apex = ApexModule.default
  const ObsidianReceipt = ObsidianModule.default
  const Ledger = LedgerModule.default
  const Crest = CrestModule.default

  registerPdfFonts()

  const activeTemplateId = normalizeInvoicePdfTemplateId(request.templateId) || 'industry'

  let Template: React.ComponentType<any> = Industry as React.ComponentType<any>
  let templateData: unknown = adaptCommercialDocumentData(request.model)

  switch (activeTemplateId) {
    case 'obsidian-receipt':
      Template = ObsidianReceipt
      templateData = adaptCommercialDocumentData(request.model)
      break
    case 'ledger':
      Template = Ledger
      templateData = adaptCommercialDocumentData(request.model)
      break
    case 'apex':
      Template = Apex
      templateData = adaptCommercialDocumentData(request.model)
      break
    case 'crest':
      Template = Crest
      templateData = adaptCommercialDocumentData(request.model)
      break
    case 'industry':
    default:
      Template = Industry
      templateData = adaptCommercialDocumentData(request.model)
      break
  }

  const blob = await pdf(
    React.createElement(PdfRenderer, { data: templateData, Template, compact: request.compact }) as any
  ).toBlob()

  const filename = resolveFilename(request.model, request.documentNumber)
  downloadBlob(blob, filename)
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
