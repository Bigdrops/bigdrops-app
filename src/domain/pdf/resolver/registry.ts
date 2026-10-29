import type {
  PdfcnDocumentEnvelope,
  PdfcnDocumentType,
  PdfcnPageConfig,
  PdfcnResolutionRequest,
  PdfcnResolutionResult,
  PdfcnTemplateDefinition,
} from './types'

const templateRegistry = new Map<string, PdfcnTemplateDefinition<any, any>>()

function buildKey(documentType: string, templateId: string): string {
  return `${documentType.toLowerCase().trim()}:${templateId.toLowerCase().trim()}`
}

/**
 * Register a PDFCN template definition into the master deterministic registry.
 */
export function registerPdfcnTemplate<TRaw = any, TPrepared = any>(
  definition: PdfcnTemplateDefinition<TRaw, TPrepared>,
): void {
  if (!definition.documentType || !definition.templateId) {
    throw new Error('Template registration requires valid documentType and templateId')
  }
  const key = buildKey(definition.documentType, definition.templateId)
  templateRegistry.set(key, definition)
}

/**
 * Get a registered template definition by document type and template ID.
 */
export function getPdfcnTemplate<TRaw = any, TPrepared = any>(
  documentType: PdfcnDocumentType,
  templateId: string,
): PdfcnTemplateDefinition<TRaw, TPrepared> | undefined {
  const key = buildKey(documentType, templateId)
  return templateRegistry.get(key)
}

/**
 * List all registered templates, optionally filtered by document type.
 */
export function listPdfcnTemplates(documentType?: PdfcnDocumentType): PdfcnTemplateDefinition[] {
  const all = Array.from(templateRegistry.values())
  if (!documentType) return all
  const target = documentType.toLowerCase().trim()
  return all.filter((def) => def.documentType.toLowerCase().trim() === target)
}

/**
 * Reset template registry.
 */
export function resetPdfcnRegistry(): void {
  templateRegistry.clear()
}

/**
 * Master document resolver for the PDFCN rendering pipeline.
 *
 * Pipeline flow:
 * Raw Application Data
 *   → Deterministic Template Lookup
 *   → Canonical Data Preparation (prepare)
 *   → Data Contract Validation (validate)
 *   → Document Envelope Construction
 *   → Template Component Rendering (render)
 *   → Resolution Result (ready for PDFCN adapter)
 */
export function resolvePdfcnDocument<TRaw = any, TPrepared = any>(
  request: PdfcnResolutionRequest<TRaw>,
): PdfcnResolutionResult<TPrepared> {
  if (!request) {
    return {
      success: false,
      error: 'Resolution request cannot be null or undefined',
    }
  }

  const { documentType, templateId, rawDocument, options } = request

  if (!documentType || typeof documentType !== 'string' || !documentType.trim()) {
    return {
      success: false,
      error: 'Resolution request requires a non-empty documentType',
    }
  }

  if (!templateId || typeof templateId !== 'string' || !templateId.trim()) {
    return {
      success: false,
      error: `Resolution request for "${documentType}" requires an explicit templateId`,
    }
  }

  const template = getPdfcnTemplate<TRaw, TPrepared>(documentType, templateId)
  if (!template) {
    const registered = listPdfcnTemplates(documentType)
      .map((t) => `"${t.templateId}"`)
      .join(', ')
    return {
      success: false,
      error: `Unsupported template "${templateId}" for document family "${documentType}". Available templates: [${registered || 'none'}]`,
    }
  }

  if (rawDocument === null || rawDocument === undefined) {
    return {
      success: false,
      error: `Cannot prepare document "${templateId}": source data is missing or null`,
    }
  }

  let prepared: TPrepared
  try {
    prepared = template.prepare(rawDocument, options)
  } catch (prepError) {
    const msg = prepError instanceof Error ? prepError.message : String(prepError)
    return {
      success: false,
      error: `Data preparation failed for template "${templateId}": ${msg}`,
    }
  }

  const validation = template.validate(prepared)
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed for prepared "${documentType}" document (${templateId}): ${validation.errors.join('; ')}`,
      validationErrors: validation.errors,
    }
  }

  const overridePageConfig = options?.pageConfig as Partial<PdfcnPageConfig> | undefined
  const envelope: PdfcnDocumentEnvelope<TPrepared> = {
    documentType: template.documentType,
    templateId: template.templateId,
    templateVersion: template.templateVersion,
    pageConfig: {
      ...template.defaultPageConfig,
      ...overridePageConfig,
    },
    data: prepared,
    metadata: {
      resolvedAt: new Date().toISOString(),
      ...(options?.metadata as Record<string, unknown> || {}),
    },
  }

  try {
    const element = template.render(envelope)
    return {
      success: true,
      envelope,
      element,
    }
  } catch (renderError) {
    const msg = renderError instanceof Error ? renderError.message : String(renderError)
    return {
      success: false,
      envelope,
      error: `Template rendering failed for "${templateId}": ${msg}`,
    }
  }
}
