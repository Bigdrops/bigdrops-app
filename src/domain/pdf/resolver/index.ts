export type {
  PdfcnDocumentEnvelope,
  PdfcnDocumentType,
  PdfcnPageConfig,
  PdfcnPageMargin,
  PdfcnPageOrientation,
  PdfcnResolutionRequest,
  PdfcnResolutionResult,
  PdfcnTemplateDefinition,
  PdfcnValidationResult,
} from './types'

export {
  getPdfcnTemplate,
  listPdfcnTemplates,
  registerPdfcnTemplate,
  resetPdfcnRegistry,
  resolvePdfcnDocument,
} from './registry'
