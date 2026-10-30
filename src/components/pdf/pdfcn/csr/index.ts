import React from 'react'
import type { PdfcnTemplateDefinition } from '@/domain/pdf/resolver'
import { registerPdfcnTemplate } from '@/domain/pdf/resolver'
import type { CanonicalPreparedCsr } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import {
  prepareCsrDocument,
  validateCsrDocument,
} from '@/domain/pdf/resolver/csr/prepareCsrDocument'
import { CsrLandscapeBlueprintTemplate } from './CsrLandscapeBlueprintTemplate'
import { CsrPortraitReferenceTemplate } from './CsrPortraitReferenceTemplate'

export { CsrLandscapeBlueprintTemplate } from './CsrLandscapeBlueprintTemplate'
export { CsrPortraitReferenceTemplate } from './CsrPortraitReferenceTemplate'
export {
  getAdaptiveMaterialColumns,
  BrandLogo,
  SignatureStage,
} from './csrPdfcnUtils'
export { distributePortraitMaterialColumns } from './csrPortraitMaterialsLayout'

export const CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID = 'csr-blueprint-landscape'
export const CSR_PORTRAIT_REFERENCE_TEMPLATE_ID = 'csr-reference-portrait'

/**
 * Checks whether a template ID targets the PDFCN engine.
 */
export function isPdfcnCsrTemplate(templateId: string | null | undefined): boolean {
  if (!templateId) return false
  return (
    templateId === CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID ||
    templateId === CSR_PORTRAIT_REFERENCE_TEMPLATE_ID ||
    templateId === 'csr-blueprint-technical-drawinglandscape.html' ||
    templateId === 'csr-final-pdfcn-reference.html'
  )
}

export const csrLandscapeBlueprintDefinition: PdfcnTemplateDefinition<any, CanonicalPreparedCsr> = {
  documentType: 'csr',
  templateId: CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID,
  templateName: 'CSR Landscape Blueprint (Technical Drawing)',
  templateVersion: '1.0.0',
  defaultPageConfig: {
    orientation: 'landscape',
    size: { width: 841.89, height: 595.28 },
  },
  prepare: prepareCsrDocument,
  validate: validateCsrDocument,
  render: (envelope) => React.createElement(CsrLandscapeBlueprintTemplate, { envelope }),
}

export const csrPortraitReferenceDefinition: PdfcnTemplateDefinition<any, CanonicalPreparedCsr> = {
  documentType: 'csr',
  templateId: CSR_PORTRAIT_REFERENCE_TEMPLATE_ID,
  templateName: 'CSR Portrait Reference',
  templateVersion: '1.0.0',
  defaultPageConfig: {
    orientation: 'portrait',
    size: 'A4',
  },
  prepare: prepareCsrDocument,
  validate: validateCsrDocument,
  render: (envelope) => React.createElement(CsrPortraitReferenceTemplate, { envelope }),
}

/**
 * Register all CSR templates into the master PDFCN registry.
 */
export function registerAllCsrPdfcnTemplates(): void {
  registerPdfcnTemplate(csrLandscapeBlueprintDefinition)
  registerPdfcnTemplate(csrPortraitReferenceDefinition)

  // Convenient aliases matching prompt references
  registerPdfcnTemplate({
    ...csrLandscapeBlueprintDefinition,
    templateId: 'csr-blueprint-technical-drawinglandscape.html',
  })
  registerPdfcnTemplate({
    ...csrPortraitReferenceDefinition,
    templateId: 'csr-final-pdfcn-reference.html',
  })
}

// Auto-register upon module evaluation
registerAllCsrPdfcnTemplates()
