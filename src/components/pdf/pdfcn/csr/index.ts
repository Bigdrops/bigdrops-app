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
import { CsrZincFormeDocument } from './CsrZincFormeDocument'
import { CsrMinimalFormeDocument } from './CsrMinimalFormeDocument'
import { CsrIndustryFormeDocument } from './CsrIndustryFormeDocument'

export { CsrLandscapeBlueprintTemplate } from './CsrLandscapeBlueprintTemplate'
export { CsrPortraitReferenceTemplate } from './CsrPortraitReferenceTemplate'
export { CsrZincFormeDocument } from './CsrZincFormeDocument'
export { CsrMinimalFormeDocument } from './CsrMinimalFormeDocument'
export { CsrIndustryFormeDocument } from './CsrIndustryFormeDocument'
export {
  getAdaptiveMaterialColumns,
  BrandLogo,
  SignatureStage,
} from './csrPdfcnUtils'
export { distributePortraitMaterialColumns } from './csrPortraitMaterialsLayout'

export const CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID = 'csr-blueprint-landscape'
export const CSR_PORTRAIT_REFERENCE_TEMPLATE_ID = 'csr-reference-portrait'
export const CSR_INDUSTRY_TEMPLATE_ID = 'csr-industry'
export const CSR_ZINC_TEMPLATE_ID = 'csr-zinc'
export const CSR_MINIMAL_TEMPLATE_ID = 'csr-minimal'

// Legacy React-PDF template identifiers, kept working so saved selections
// (localStorage csr_view_template and in-document customization) survive.
export const CSR_INDUSTRY_LEGACY_TEMPLATE_ID = '8'
export const CSR_ZINC_LEGACY_TEMPLATE_ID = '3'
export const CSR_MINIMAL_LEGACY_TEMPLATE_ID = '6'

const INDUSTRY_ALIAS_IDS = [CSR_INDUSTRY_TEMPLATE_ID, CSR_INDUSTRY_LEGACY_TEMPLATE_ID]
const ZINC_ALIAS_IDS = [CSR_ZINC_TEMPLATE_ID, CSR_ZINC_LEGACY_TEMPLATE_ID]
const MINIMAL_ALIAS_IDS = [CSR_MINIMAL_TEMPLATE_ID, CSR_MINIMAL_LEGACY_TEMPLATE_ID]
const BLUEPRINT_ALIAS_IDS = [CSR_LANDSCAPE_BLUEPRINT_TEMPLATE_ID, 'csr-blueprint-technical-drawinglandscape.html']
const REFERENCE_ALIAS_IDS = [CSR_PORTRAIT_REFERENCE_TEMPLATE_ID, 'csr-final-pdfcn-reference.html']

/**
 * Checks whether a template ID targets the PDFCN (Forme) engine. All CSR
 * templates render through Forme — this is the single gate.
 */
export function isPdfcnCsrTemplate(templateId: string | null | undefined): boolean {
  if (!templateId) return false
  return (
    INDUSTRY_ALIAS_IDS.includes(templateId) ||
    ZINC_ALIAS_IDS.includes(templateId) ||
    MINIMAL_ALIAS_IDS.includes(templateId) ||
    BLUEPRINT_ALIAS_IDS.includes(templateId) ||
    REFERENCE_ALIAS_IDS.includes(templateId)
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

export const csrIndustryDefinition: PdfcnTemplateDefinition<any, CanonicalPreparedCsr> = {
  documentType: 'csr',
  templateId: CSR_INDUSTRY_TEMPLATE_ID,
  templateName: 'CSR Industry',
  templateVersion: '1.0.0',
  defaultPageConfig: {
    orientation: 'portrait',
    size: 'A4',
  },
  prepare: prepareCsrDocument,
  validate: validateCsrDocument,
  render: (envelope) => React.createElement(CsrIndustryFormeDocument, { envelope }),
}

export const csrZincDefinition: PdfcnTemplateDefinition<any, CanonicalPreparedCsr> = {
  documentType: 'csr',
  templateId: CSR_ZINC_TEMPLATE_ID,
  templateName: 'CSR Zinc',
  templateVersion: '1.0.0',
  defaultPageConfig: {
    orientation: 'portrait',
    size: 'A4',
  },
  prepare: prepareCsrDocument,
  validate: validateCsrDocument,
  render: (envelope) => React.createElement(CsrZincFormeDocument, { envelope }),
}

export const csrMinimalDefinition: PdfcnTemplateDefinition<any, CanonicalPreparedCsr> = {
  documentType: 'csr',
  templateId: CSR_MINIMAL_TEMPLATE_ID,
  templateName: 'CSR Minimal',
  templateVersion: '1.0.0',
  defaultPageConfig: {
    orientation: 'portrait',
    size: 'A4',
  },
  prepare: prepareCsrDocument,
  validate: validateCsrDocument,
  render: (envelope) => React.createElement(CsrMinimalFormeDocument, { envelope }),
}

/**
 * Register all CSR templates into the master PDFCN registry.
 */
export function registerAllCsrPdfcnTemplates(): void {
  registerPdfcnTemplate(csrLandscapeBlueprintDefinition)
  registerPdfcnTemplate(csrPortraitReferenceDefinition)
  registerPdfcnTemplate(csrIndustryDefinition)
  registerPdfcnTemplate(csrZincDefinition)
  registerPdfcnTemplate(csrMinimalDefinition)

  // Convenient aliases matching prompt references
  registerPdfcnTemplate({
    ...csrLandscapeBlueprintDefinition,
    templateId: 'csr-blueprint-technical-drawinglandscape.html',
  })
  registerPdfcnTemplate({
    ...csrPortraitReferenceDefinition,
    templateId: 'csr-final-pdfcn-reference.html',
  })

  // Legacy React-PDF identifiers resolve to the Forme implementations
  registerPdfcnTemplate({
    ...csrIndustryDefinition,
    templateId: CSR_INDUSTRY_LEGACY_TEMPLATE_ID,
    templateName: 'CSR Industry (legacy)',
  })
  registerPdfcnTemplate({
    ...csrZincDefinition,
    templateId: CSR_ZINC_LEGACY_TEMPLATE_ID,
    templateName: 'CSR Zinc Light (legacy)',
  })
  registerPdfcnTemplate({
    ...csrMinimalDefinition,
    templateId: CSR_MINIMAL_LEGACY_TEMPLATE_ID,
    templateName: 'CSR Minimal (legacy)',
  })
}

// Auto-register upon module evaluation
registerAllCsrPdfcnTemplates()
