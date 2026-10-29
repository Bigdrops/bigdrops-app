import type React from 'react'

/**
 * Supported document families on the new PDFCN rendering path.
 * Extensible for future document types without CSR-specific branching.
 */
export type PdfcnDocumentType = 'csr' | 'invoice' | 'quotation' | 'waybill' | 'cps' | (string & {})

export type PdfcnPageOrientation = 'portrait' | 'landscape'

export interface PdfcnPageMargin {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

export interface PdfcnPageConfig {
  orientation: PdfcnPageOrientation
  size: 'A4' | { width: number; height: number }
  margin?: number | [number, number, number, number] | PdfcnPageMargin
  density?: 'comfortable' | 'compact' | 'tight'
}

export interface PdfcnDocumentEnvelope<TData = unknown> {
  documentType: PdfcnDocumentType
  templateId: string
  templateVersion: string
  pageConfig: PdfcnPageConfig
  data: TData
  metadata: Record<string, unknown>
}

export interface PdfcnValidationResult {
  valid: boolean
  errors: string[]
}

export interface PdfcnTemplateDefinition<TRaw = any, TPrepared = any> {
  documentType: PdfcnDocumentType
  templateId: string
  templateName: string
  templateVersion: string
  defaultPageConfig: PdfcnPageConfig
  prepare: (raw: TRaw, options?: Record<string, unknown>) => TPrepared
  validate: (prepared: TPrepared) => PdfcnValidationResult
  render: (envelope: PdfcnDocumentEnvelope<TPrepared>) => React.ReactElement
}

export interface PdfcnResolutionRequest<TRaw = any> {
  documentType: PdfcnDocumentType
  templateId: string
  rawDocument: TRaw
  options?: Record<string, unknown>
}

export interface PdfcnResolutionResult<TPrepared = any> {
  success: boolean
  envelope?: PdfcnDocumentEnvelope<TPrepared>
  element?: React.ReactElement
  error?: string
  validationErrors?: string[]
}
