import type { InvoicePdfModel, PdfDocumentModel, QuotationPdfModel } from './types'

export type PdfGenerationResult = {
  status: 'not-implemented'
}

type PdfGenerationRequest<TModel extends PdfDocumentModel> = {
  model?: TModel
  documentNumber?: string | null
  variant?: 'standard' | 'advance'
}

function warnPdfGeneration(kind: 'invoice' | 'quotation', request?: PdfGenerationRequest<PdfDocumentModel>) {
  const documentNumber = String(request?.documentNumber || request?.model?.identity.number || '').trim()
  const variant = request?.variant === 'advance' ? ' advance' : ''
  const identifier = documentNumber ? ` (${documentNumber})` : ''

  console.warn(`New ${kind}${variant} PDF system not implemented yet${identifier}`)
}

async function createNotImplementedResult<TModel extends PdfDocumentModel>(
  kind: 'invoice' | 'quotation',
  request?: PdfGenerationRequest<TModel>,
): Promise<PdfGenerationResult> {
  warnPdfGeneration(kind, request as PdfGenerationRequest<PdfDocumentModel> | undefined)
  return { status: 'not-implemented' }
}

export async function generateInvoicePdf(
  request?: PdfGenerationRequest<InvoicePdfModel>,
): Promise<PdfGenerationResult> {
  return createNotImplementedResult('invoice', request)
}

export async function generateQuotationPdf(
  request?: PdfGenerationRequest<QuotationPdfModel>,
): Promise<PdfGenerationResult> {
  return createNotImplementedResult('quotation', request)
}

export type {
  InvoicePdfModel,
  PdfAdvanceSummary,
  PdfAttachmentReference,
  PdfBankDetails,
  PdfBaseDocumentModel,
  PdfDocumentIdentity,
  PdfDocumentKind,
  PdfDocumentModel,
  PdfLineItem,
  PdfLogo,
  PdfParty,
  PdfReferenceLink,
  PdfSignature,
  PdfTextSection,
  PdfTotalRow,
  PdfTotals,
  QuotationPdfModel,
} from './types'
