/**
 * =============================================================================
 * ADVANCE INVOICE ARCHITECTURAL INVARIANTS
 * =============================================================================
 *
 * CORE PRINCIPLE:
 * The parent invoice is the ONLY financial and structural source of truth.
 * Everything else is a PURE PRESENTATION DERIVATION.
 *
 * DEFINITION:
 * Advance Invoice is a STRICT READ-ONLY PRESENTATION VARIANT of a parent invoice.
 * It is NOT a separate entity. NOT a financial model. NOT a projection output.
 *
 * ALLOWED DIFFERENCES ONLY:
 *   1. invoice_number (suffix/prefix)
 *   2. invoice_title (presentation label)
 *   3. Footer rendering (advance-specific summary)
 *
 * FORBIDDEN DIFFERENCES:
 *   - Modify invoice.items
 *   - Reconstruct invoice.items
 *   - Omit invoice.items
 *   - Recalculate totals
 *   - Transform financial values
 *   - Generate synthetic line items
 *   - Introduce derived "advance item arrays"
 *   - Exist as a separate database entity
 *
 * LIFECYCLE RULE:
 * Once an invoice object is created or fetched, it MUST NOT be structurally
 * modified by ANY downstream system (PDF generator, preview model, UI
 * components, helper functions, adapters, financial calculators).
 *
 * CONTEXT GATING:
 *   const isAdvanceContext = invoice?.isVirtualProjection === true
 *   - If false: NO advance UI, NO advance footer, NO advance summary
 *   - If true: ONLY UI modifications (labels + footer display)
 *
 * CREATION PATTERN:
 *   const advanceInvoice = {
 *     ...invoice,                    // SHALLOW READ-ONLY CLONE
 *     invoice_number: `${invoice.invoice_number}${suffix}`,
 *     invoice_title: metadata?.primaryLabel || "Advance Invoice",
 *     isVirtualProjection: true,
 *   };
 *
 * =============================================================================
 */

export const ADVANCE_INVOICE_INVARIANTS = {
  /** Parent invoice is the ONLY source of truth */
  SINGLE_SOURCE_OF_TRUTH: true,
  /** Advance invoices must NEVER be queried from the database */
  NO_DATABASE_QUERIES: true,
  /** Advance invoice is a singleton (one per parent) or null */
  SINGLETON_ONLY: true,
  /** No synthetic IDs are permitted */
  NO_ENTITY_IDENTITY: true,
  /** No local React state for advance invoice data */
  NO_LOCAL_STATE: true,
  /** Items are NEVER carried on the projection — always sourced from parent */
  NO_SYNTHETIC_ITEMS: true,
  /** PDF layer must NEVER transform data structures */
  PDF_IS_READ_ONLY_INPUT: true,
  /** Main invoice must NEVER show advance UI regardless of config */
  MAIN_INVOICE_ISOLATION: true,
  /** Invoice object is immutable after creation/fetch */
  IMMUTABLE_AFTER_CREATION: true,
  /** No derived invoice models or secondary recalculation layers */
  NO_DERIVED_MODELS: true,
} as const;
