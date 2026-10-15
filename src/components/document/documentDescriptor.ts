import type { ComponentType } from 'react'

/**
 * Document family descriptor.
 *
 * The shared document form (`SharedDocumentForm` and its sections) used to
 * decide every label from a single `isQuotation: boolean`. That binary is what
 * makes a third document family render as an Invoice.
 *
 * This module replaces the binary with a typed descriptor. A descriptor carries
 * *presentation* vocabulary only — titles, field labels, placeholders and party
 * terminology. It deliberately carries no calculation inputs, no persistence
 * keys for document numbers or dates, and no authorization decisions:
 *
 *   - Financial values keep flowing in as props resolved by the page's save
 *     strategy (`buildCalculationInputs` → `computeDocument`).
 *   - Document number and date columns (`invoice_number`, `issue_date`,
 *     `due_date`) are part of the persistence contract shared by every sales
 *     family and stay hardcoded in the form.
 *   - Only *party* field names are declared here, because a future Supplier PO
 *     must store `supplier_id` / `supplier_name` without reusing `client_id`.
 *
 * This file must stay free of JSX and of component imports. The critical test
 * harness loads it directly under Node, which does not transpile JSX.
 */

/** Document families that render through the shared form today. */
export type DocumentFamily = 'invoice' | 'quotation'

/**
 * Neutral party-picker contract.
 *
 * Deliberately field-name-agnostic: it says `partyId`, not `clientId`. A future
 * Supplier PO supplies a `SupplierSelector` adapter with the same shape, so the
 * shared form never learns the word "client".
 *
 * The picker itself is injected into `SharedDocumentForm` through its
 * `partySelector` slot; it is not part of the descriptor, so a descriptor stays
 * a plain data object that tests can import without React.
 */
export type PartySelectorSlotProps = {
  /** Current party record id, or null when nothing is selected. */
  partyId: string | null
  /** Current party display name, or an empty string. */
  partyName: string
  /** Controlled open state for the picker sheet/popover. */
  open: boolean
  /** Controlled open-state setter. */
  onOpenChange: (open: boolean) => void
  /** Emits the chosen party id and display name. */
  onPartyChange: (id: string, name: string) => void
}

/** A component that can fill the shared form's party-picker slot. */
export type PartySelectorComponent = ComponentType<PartySelectorSlotProps>

/**
 * Party terminology and record binding for a document family.
 *
 * `idField` / `nameField` are the only persistence keys a descriptor owns. They
 * exist so the form writes `supplier_id` for a purchase order instead of
 * forcing a client-shaped field name into a supplier-facing contract.
 */
export type DocumentPartyDescriptor = {
  /** User-facing noun for the party role, e.g. `Client`. */
  term: string
  /** Secondary line under the selected party button, e.g. `Bill to · Client`. */
  roleHint: string
  /** Button copy when no party is selected. */
  emptyLabel: string
  /** Rail/readout copy when no party has been chosen yet. */
  noneLabel: string
  /** aria-label prefix used on the selected-party button. */
  selectedAriaPrefix: string
  /** aria-label for the clear affordance. */
  clearAriaLabel: string
  /** Form-state key holding the party id. */
  idField: string
  /** Form-state key holding the party display name. */
  nameField: string
}

/** Presentation contract shared by every document family. */
export type DocumentDescriptor = {
  /** Machine-readable family identifier. */
  family: DocumentFamily
  /** Top-bar title and desktop action-rail heading, e.g. `Invoice`. */
  title: string
  /** Document title field label, e.g. `Invoice Title`. */
  titleFieldLabel: string
  /** Document title field placeholder. */
  titleFieldPlaceholder: string
  /** Document number field label, e.g. `Invoice No.`. */
  numberLabel: string
  /** Meta shown before a number exists, e.g. `New invoice`. */
  unsavedMeta: string
  /** Issue-date field label, e.g. `Issue Date`. */
  issueDateLabel: string
  /** Second date field label, e.g. `Due Date` / `Valid Until`. */
  dueDateLabel: string
  /** Headline on the payment stage, e.g. `When this invoice is due`. */
  paymentHeadline: string
  /** Placeholder for the free-text payment / validity note. */
  paymentNotePlaceholder: string
  /** Party terminology and record binding. */
  party: DocumentPartyDescriptor
}

/**
 * Sales families (invoice and quotation) are client-facing, so both bind the
 * `client_id` / `client_name` columns. They are declared separately per family
 * so that changing one family's vocabulary cannot silently change the other.
 */
const CLIENT_PARTY_TERMINOLOGY: DocumentPartyDescriptor = {
  term: 'Client',
  roleHint: 'Bill to · Client',
  emptyLabel: 'Select a client',
  noneLabel: 'No client selected',
  selectedAriaPrefix: 'Client',
  clearAriaLabel: 'Clear client',
  idField: 'client_id',
  nameField: 'client_name',
}

export const INVOICE_DESCRIPTOR: DocumentDescriptor = {
  family: 'invoice',
  title: 'Invoice',
  titleFieldLabel: 'Invoice Title',
  titleFieldPlaceholder: 'e.g. Monthly Maintenance',
  numberLabel: 'Invoice No.',
  unsavedMeta: 'New invoice',
  issueDateLabel: 'Issue Date',
  dueDateLabel: 'Due Date',
  paymentHeadline: 'When this invoice is due',
  paymentNotePlaceholder: 'e.g. Due in 14 days',
  party: { ...CLIENT_PARTY_TERMINOLOGY },
}

export const QUOTATION_DESCRIPTOR: DocumentDescriptor = {
  family: 'quotation',
  title: 'Quotation',
  titleFieldLabel: 'Quotation Title',
  titleFieldPlaceholder: 'e.g. Website Overhaul',
  numberLabel: 'Quotation No.',
  unsavedMeta: 'New quotation',
  issueDateLabel: 'Quotation Date',
  dueDateLabel: 'Valid Until',
  paymentHeadline: 'When this quotation is due',
  paymentNotePlaceholder: 'e.g. 14 days validity',
  party: { ...CLIENT_PARTY_TERMINOLOGY },
}

/** Inputs the old `isQuotation` boolean was derived from. */
export type DocumentDescriptorInput = {
  /** `invoice.document_type` — e.g. `quotation` / `invoice`. */
  documentType?: unknown
  /** Page title, e.g. `New Quotation`. */
  title?: unknown
  /** Mode/status label, e.g. `Open` or `Draft`. */
  modeLabel?: unknown
}

/**
 * Resolve a family descriptor from the same inputs the old boolean used.
 *
 * The classification rule is preserved verbatim so Invoice and Quotation keep
 * resolving exactly as before: an explicit `QUOT` document type, or the word
 * "quotation" appearing in the page title or mode label.
 */
export function resolveDocumentDescriptor(input: DocumentDescriptorInput): DocumentDescriptor {
  const documentType = String(input.documentType || '').toUpperCase()
  const isQuotationFamily =
    documentType.includes('QUOT') ||
    /quotation/i.test(String(input.title ?? '')) ||
    /quotation/i.test(String(input.modeLabel ?? ''))
  return isQuotationFamily ? QUOTATION_DESCRIPTOR : INVOICE_DESCRIPTOR
}
