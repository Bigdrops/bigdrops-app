export * from '@/domain/pdf/resolver'
export * from '@/domain/pdf/resolver/csr/csrPreparedContract'
export * from '@/domain/pdf/resolver/csr/prepareCsrDocument'

export {
  renderPdfcnToBytes,
  renderPdfcnToBlob,
  generatePdfcnPdf,
  PdfcnRenderError,
  type PdfcnGenerationResult,
  type PdfcnRenderStage,
} from './adapter'

export {
  Document,
  Page,
  View,
  Text,
  Table,
  Row,
  Cell,
  Image,
  Fixed,
  Svg,
  mergeStyles,
  type Style,
} from './primitives'

export {
  CsrLandscapeBlueprintTemplate,
  CsrPortraitReferenceTemplate,
  CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID,
  CSR_PORTRAIT_REFERENCE_TEMPLATE_ID,
  isPdfcnCsrTemplate,
  getAdaptiveMaterialColumns,
  distributePortraitMaterialColumns,
  BrandLogo,
  SignatureStage,
  csrLandscapeBlueprintDefinition,
  csrPortraitReferenceDefinition,
  registerAllCsrPdfcnTemplates,
} from './csr'
