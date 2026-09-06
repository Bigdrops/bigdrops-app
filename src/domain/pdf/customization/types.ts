/**
 * PDF Customization Engine — Type Definitions
 *
 * Architecture layer: types only. No React, no storage, no side effects.
 * All downstream engines consume ResolvedPdfCustomization.
 */

// ── Capabilities ──────────────────────────────────────────────────

/** What a document/template supports. Extensible via declaration merging. */
export interface PdfCustomizationCapabilities {
  accentColor: boolean
  documentFont: boolean
  handwritingFont: boolean
  handwritingColor: boolean
}

/** Default capabilities — all enabled. */
export const DEFAULT_CAPABILITIES: PdfCustomizationCapabilities = {
  accentColor: true,
  documentFont: true,
  handwritingFont: true,
  handwritingColor: true,
}

// ── Policy ────────────────────────────────────────────────────────

/** Which supported capabilities are exposed to users. Declarative only. */
export interface PdfCustomizationPolicy {
  accentColor: boolean
  documentFont: boolean
  handwritingFont: boolean
  handwritingColor: boolean
}

/** Default policy — all exposed. */
export const DEFAULT_POLICY: PdfCustomizationPolicy = {
  accentColor: true,
  documentFont: true,
  handwritingFont: true,
  handwritingColor: true,
}

// ── Template Defaults ─────────────────────────────────────────────

/** Immutable template-owned defaults. Do not migrate existing templates. */
export interface PdfTemplateDefaults {
  accentColor: string
  documentFont: string
  handwritingFont: string
  handwritingColor: string
}

/** Fallback defaults when no template provides its own. */
export const FALLBACK_TEMPLATE_DEFAULTS: PdfTemplateDefaults = {
  accentColor: '#0f172a',
  documentFont: 'Inter',
  handwritingFont: 'Patrick Hand',
  handwritingColor: '#0f172a',
}

// ── User Settings (versioned) ─────────────────────────────────────

export interface PdfCustomizationSettings {
  version: 1
  accentColor?: string
  /** False disables custom accent coloring (template default renders). */
  accentEnabled?: boolean
  documentFont?: string
  inkFont?: string
  inkColour?: string
}

/** Settings with all fields resolved to concrete values. */
export interface ResolvedPdfCustomizationSettings {
  version: 1
  accentColor: string
  accentEnabled: boolean
  documentFont: string
  inkFont: string
  inkColour: string
}

// ── Resolved Output ───────────────────────────────────────────────

/**
 * Fully resolved immutable customization object.
 * Downstream document engines consume this. No template should need
 * to perform fallback logic.
 */
export interface ResolvedPdfCustomization {
  accentColor: string
  /** False means the template's canonical default accent renders. */
  accentEnabled: boolean
  documentFont: string
  handwritingFont: string
  handwritingColor: string
}

// ── Document Family ───────────────────────────────────────────────

export type PdfCustomizationDocumentFamily = 'invoice' | 'quotation' | 'csr' | 'waybill' | 'boq'
