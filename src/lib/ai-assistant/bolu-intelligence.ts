/**
 * bolu-intelligence.ts — Operational Intelligence, Lifecycle Verification & Attachment Helpers
 *
 * Provides grounded, context-aware business observations, quotation expiry tracking,
 * document readiness diagnostics, lifecycle transition integrity checks, and reference
 * link attachment helpers.
 *
 * Follows strict BOUXRE governance:
 *   - No model-invented facts or figures.
 *   - Clear distinction between factual observations and suggestions.
 *   - Never presents suggestions as accomplished actions.
 *   - Never modifies documents automatically.
 *   - No internal system, RPC, table, or schema names in user-facing text.
 */

export interface BoluDocumentIntelligence {
  observations: string[]
  suggestions: string[]
  readinessIssues: string[]
  expiryWarning?: string | null
  lifecycleGuidance?: string | null
}

export interface BoluAttachmentItem {
  label: string
  url: string
  [key: string]: unknown
}

export interface BoluAttachmentOp {
  op: 'add' | 'remove'
  label?: string
  url?: string
  match?: {
    label?: string
    url?: string
  }
}

export interface BoluAttachmentsChange {
  ops: BoluAttachmentOp[]
  fingerprint: string
}

export interface BoluLifecycleChange {
  action: 'archive' | 'restore' | 'convert_to_invoice' | 'update_status'
  targetStatus?: string
  currentStatus: string
  isArchived: boolean
  explanation: string
  fromStatus?: string
  toStatus?: string
  reason?: string
}

/**
 * Analyzes document state and produces grounded operational intelligence.
 * Strictly separates observations (facts) from suggestions (optional next steps).
 */
export function analyzeDocumentIntelligence(
  document: Record<string, unknown>,
  items: Array<Record<string, unknown>> = [],
  family: 'invoice' | 'quotation' = 'invoice',
  referenceDate: Date = new Date(),
): BoluDocumentIntelligence {
  const observations: string[] = []
  const suggestions: string[] = []
  const readinessIssues: string[] = []
  let expiryWarning: string | null = null
  let lifecycleGuidance: string | null = null

  const isQuotation = family === 'quotation'
  const isArchived = Boolean(document.archived_at)
  const status = String(document.status || (isQuotation ? 'open' : 'unpaid')).toLowerCase()
  const clientName = typeof document.client_name === 'string' ? document.client_name.trim() : ''

  // 1. Client presence
  if (!clientName) {
    readinessIssues.push('Client information is missing.')
    suggestions.push('Specify a customer name to complete document details.')
  }

  // 2. Line items & commercial completeness
  const activeItems = items.filter((item) => (item.row_type ?? 'standard') === 'standard')
  if (activeItems.length === 0) {
    readinessIssues.push('Document contains no commercial line items.')
    suggestions.push('Add at least one line item with quantity and unit price.')
  }

  // 3. Custom fields inspections (attachments, presentation)
  let customFields: Record<string, unknown> = {}
  try {
    if (typeof document.custom_fields === 'string') {
      customFields = JSON.parse(document.custom_fields)
    } else if (typeof document.custom_fields === 'object' && document.custom_fields !== null) {
      customFields = document.custom_fields as Record<string, unknown>
    }
  } catch {
    // Treat invalid custom fields as empty
  }

  const rawAttachments = customFields.attachments
  if (Array.isArray(rawAttachments) && rawAttachments.length > 0) {
    const validCount = rawAttachments.filter(
      (a) => a && typeof a === 'object' && typeof a.label === 'string' && a.label.trim(),
    ).length
    if (validCount > 0) {
      observations.push(`${validCount} reference document link(s) attached.`)
    }
  }

  // Reference date normalized to start of day
  const refDay = new Date(referenceDate)
  refDay.setHours(0, 0, 0, 0)

  if (isQuotation) {
    // --- QUOTATION SPECIFIC INTELLIGENCE ---
    const validUntilStr = typeof document.valid_until === 'string' ? document.valid_until.trim() : ''

    if (validUntilStr) {
      const validUntilDate = new Date(validUntilStr)
      validUntilDate.setHours(0, 0, 0, 0)

      if (!isNaN(validUntilDate.getTime())) {
        const diffMs = validUntilDate.getTime() - refDay.getTime()
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
          const daysAgo = Math.abs(diffDays)
          const dayLabel = daysAgo === 1 ? '1 day' : `${daysAgo} days`
          observations.push(`This quotation expired on ${validUntilStr} (${dayLabel} ago).`)
          expiryWarning = `Expired on ${validUntilStr}`
          if (status === 'open' && !isArchived) {
            suggestions.push('Update the quotation validity date or review terms with the customer.')
          }
        } else if (diffDays <= 7) {
          const dayLabel =
            diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`
          observations.push(`This quotation validity expires ${dayLabel} (on ${validUntilStr}).`)
          expiryWarning = `Expires ${dayLabel}`
          if (status === 'open' && !isArchived) {
            suggestions.push('Follow up with the customer before quotation validity expires.')
          }
        } else {
          observations.push(`Quotation is valid until ${validUntilStr}.`)
        }
      }
    } else {
      readinessIssues.push('No quotation validity date is specified.')
      suggestions.push('Set a validity period (e.g. 14 or 30 days) to lock quoted terms.')
    }

    // Quotation Lifecycle state
    if (isArchived) {
      observations.push('Quotation is currently archived.')
      lifecycleGuidance = 'Archived quotations are read-only until restored.'
      suggestions.push('Restore this quotation to active status if further edits are required.')
    } else if (status === 'converted') {
      observations.push('Quotation has been converted to an invoice.')
      lifecycleGuidance = 'Converted quotations preserve commercial lineage and should not be modified.'
    } else if (status === 'open') {
      if (activeItems.length > 0 && clientName) {
        suggestions.push('Once the customer accepts, convert this quotation into an invoice.')
      }
    }
  } else {
    // --- INVOICE SPECIFIC INTELLIGENCE ---
    const dueDateStr = typeof document.due_date === 'string' ? document.due_date.trim() : ''

    if (dueDateStr) {
      const dueDate = new Date(dueDateStr)
      dueDate.setHours(0, 0, 0, 0)

      if (!isNaN(dueDate.getTime())) {
        const diffMs = dueDate.getTime() - refDay.getTime()
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

        if (status !== 'paid') {
          if (diffDays < 0) {
            const daysOverdue = Math.abs(diffDays)
            const dayLabel = daysOverdue === 1 ? '1 day' : `${daysOverdue} days`
            observations.push(`This invoice is ${dayLabel} past due date (${dueDateStr}).`)
            suggestions.push('Follow up on outstanding payment or confirm whether payment was received.')
          } else if (diffDays <= 5) {
            const dayLabel =
              diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`
            observations.push(`Payment is due ${dayLabel} (on ${dueDateStr}).`)
          }
        }
      }
    } else {
      readinessIssues.push('No payment due date is set.')
      suggestions.push('Specify a payment due date to establish clear settlement expectations.')
    }

    // Payment terms check
    const paymentTerms = typeof document.payment_terms === 'string' ? document.payment_terms.trim() : ''
    if (!paymentTerms) {
      suggestions.push('Specify payment terms (e.g. Net 30 or Due on Receipt) for billing clarity.')
    }

    // Invoice Lifecycle state
    if (isArchived) {
      observations.push('Invoice is currently archived.')
      lifecycleGuidance = 'Archived invoices are retained for compliance records.'
      suggestions.push('Restore this invoice if active billing or payment operations are needed.')
    } else if (status === 'paid') {
      observations.push('This invoice is fully paid and settled.')
      lifecycleGuidance = 'Settled invoices do not require payment follow-up.'
    } else if (status === 'partially_paid') {
      observations.push('This invoice is partially paid with an outstanding balance.')
      suggestions.push('Record additional payments through the payment sheet when received.')
    } else {
      suggestions.push('Record customer payments through the invoice payment sheet when settled.')
    }
  }

  return {
    observations,
    suggestions,
    readinessIssues,
    expiryWarning,
    lifecycleGuidance,
  }
}

/**
 * Formats operational intelligence into clear, professional business prose.
 * Strictly separates observations from suggestions.
 */
export function formatDocumentIntelligence(intel: BoluDocumentIntelligence): string {
  const sections: string[] = []

  if (intel.observations.length > 0) {
    sections.push('Observations:\n' + intel.observations.map((item) => `• ${item}`).join('\n'))
  }

  if (intel.readinessIssues.length > 0) {
    sections.push('Document readiness:\n' + intel.readinessIssues.map((item) => `• ${item}`).join('\n'))
  }

  if (intel.suggestions.length > 0) {
    sections.push('Suggestions:\n' + intel.suggestions.map((item) => `• ${item}`).join('\n'))
  }

  if (intel.lifecycleGuidance) {
    sections.push(`Note: ${intel.lifecycleGuidance}`)
  }

  return sections.join('\n\n')
}

// ============================================================================
// ATTACHMENT VALIDATION & PERSISTENCE HELPERS
// ============================================================================

const PROHIBITED_URL_SCHEMES = /^(blob:|file:|javascript:|data:)/i
const LOCAL_PATH_PATTERN = /^(?:[a-zA-Z]:[\\/]|(?:\.{1,2}[\\/])|[\\/])/
const CREDENTIALS_IN_URL_PATTERN = /^https?:\/\/[^@/\s]+:[^@/\s]+@/i

/**
 * Validates a reference link URL for security and correctness.
 * Rejects blob:, file:, javascript:, local paths, and embedded credentials.
 */
export function validateAttachmentUrl(url: unknown): { valid: boolean; error?: string } {
  if (typeof url !== 'string' || !url.trim()) {
    return { valid: false, error: 'Attachment URL is required.' }
  }

  const trimmed = url.trim()

  if (trimmed.length > 2048) {
    return { valid: false, error: 'Attachment URL must be 2048 characters or fewer.' }
  }

  if (PROHIBITED_URL_SCHEMES.test(trimmed)) {
    return { valid: false, error: 'Temporary device paths and local file/blob URLs cannot be attached.' }
  }

  if (LOCAL_PATH_PATTERN.test(trimmed)) {
    return { valid: false, error: 'Local filesystem paths cannot be stored as document attachments.' }
  }

  if (CREDENTIALS_IN_URL_PATTERN.test(trimmed)) {
    return { valid: false, error: 'Attachment URLs containing credentials or access keys are prohibited.' }
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Attachment URL must use http or https protocol.' }
    }
    const PRIVATE_HOST_PATTERN = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|0\.0\.0\.0|::1)$/i
    if (PRIVATE_HOST_PATTERN.test(parsed.hostname)) {
      return { valid: false, error: 'Localhost and private network addresses cannot be attached.' }
    }
  } catch {
    return { valid: false, error: 'Attachment URL must be a valid, well-formed web address.' }
  }

  return { valid: true }
}

/**
 * Validates an attachment label.
 */
export function validateAttachmentLabel(label: unknown): { valid: boolean; error?: string; value?: string } {
  if (typeof label !== 'string' || !label.trim()) {
    return { valid: false, error: 'Attachment label is required.' }
  }
  const trimmed = label.trim()
  if (trimmed.length > 120) {
    return { valid: false, error: 'Attachment label must be 120 characters or fewer.' }
  }
  return { valid: true, value: trimmed }
}

/**
 * Generates an order-significant fingerprint for document attachments.
 */
export function fingerprintAttachments(attachments: Array<{ label?: string; url?: string }> = []): string {
  if (!Array.isArray(attachments) || attachments.length === 0) return 'att:none'
  return 'att:' + attachments
    .map((item) => `${String(item?.label ?? '').trim().toLowerCase()}|${String(item?.url ?? '').trim()}`)
    .join('::')
}

export interface AttachmentApplyResult {
  attachments: BoluAttachmentItem[]
  errors: string[]
  rows: Array<{ label: string; url: string; action: 'added' | 'removed' }>
}

/**
 * Applies deterministic attachment operations against a persisted attachment set.
 */
export function applyAttachmentOperations(
  persisted: Array<{ label?: string; url?: string }> = [],
  ops: BoluAttachmentOp[] = [],
): AttachmentApplyResult {
  const errors: string[] = []
  const rows: Array<{ label: string; url: string; action: 'added' | 'removed' }> = []
  let current: BoluAttachmentItem[] = (Array.isArray(persisted) ? persisted : []).map((item) => ({
    label: String(item.label ?? '').trim(),
    url: String(item.url ?? '').trim(),
  })).filter((item) => item.label && item.url)

  for (const op of ops) {
    if (op.op === 'add') {
      const labelCheck = validateAttachmentLabel(op.label)
      if (!labelCheck.valid) {
        errors.push(labelCheck.error!)
        continue
      }
      const urlCheck = validateAttachmentUrl(op.url)
      if (!urlCheck.valid) {
        errors.push(urlCheck.error!)
        continue
      }

      const label = labelCheck.value!
      const url = op.url!.trim()

      // Check if duplicate
      const exists = current.some(
        (entry) => entry.label.toLowerCase() === label.toLowerCase() && entry.url === url,
      )
      if (exists) {
        errors.push(`An attachment with label "${label}" and URL "${url}" already exists.`)
        continue
      }

      current.push({ label, url })
      rows.push({ label, url, action: 'added' })
    } else if (op.op === 'remove') {
      const matchLabel = op.match?.label?.trim().toLowerCase()
      const matchUrl = op.match?.url?.trim()

      if (!matchLabel && !matchUrl) {
        errors.push('Remove attachment operation must specify either a label or a URL to match.')
        continue
      }

      const initialLen = current.length
      const removed: BoluAttachmentItem[] = []
      current = current.filter((entry) => {
        const matchesLabel = matchLabel ? entry.label.toLowerCase() === matchLabel : true
        const matchesUrl = matchUrl ? entry.url === matchUrl : true
        if (matchesLabel && matchesUrl) {
          removed.push(entry)
          return false
        }
        return true
      })

      if (current.length === initialLen) {
        const target = matchLabel ? `label "${op.match?.label}"` : `URL "${op.match?.url}"`
        errors.push(`No matching attachment found with ${target} to remove.`)
      } else {
        for (const item of removed) {
          rows.push({ label: item.label, url: item.url, action: 'removed' })
        }
      }
    } else {
      errors.push(`Unsupported attachment operation "${(op as any).op}".`)
    }
  }

  return {
    attachments: current,
    errors,
    rows,
  }
}

// ============================================================================
// LIFECYCLE TRANSITION VALIDATOR
// ============================================================================

export interface LifecycleValidationResult {
  valid: boolean
  error?: string
  action: BoluLifecycleChange['action']
  currentStatus: string
  isArchived: boolean
  targetStatus?: string
  explanation: string
}

/**
 * Validates requested document lifecycle transitions against authorized application capabilities.
 * Strictly prevents treating status as an arbitrary scalar or bypassing dedicated workflows.
 */
export function validateLifecycleTransition(
  document: Record<string, unknown>,
  action: string,
  targetStatus?: string,
  family: 'invoice' | 'quotation' = 'invoice',
): LifecycleValidationResult {
  const isQuotation = family === 'quotation'
  const isArchived = Boolean(document.archived_at)
  const currentStatus = String(document.status || (isQuotation ? 'open' : 'unpaid')).toLowerCase()

  const safeAction = action as BoluLifecycleChange['action']

  if (safeAction === 'archive') {
    if (isArchived) {
      return {
        valid: false,
        error: `This ${family} is already archived.`,
        action: 'archive',
        currentStatus,
        isArchived,
        explanation: 'Archive requested on already archived document.',
      }
    }
    return {
      valid: true,
      action: 'archive',
      currentStatus,
      isArchived,
      explanation: `Archive this ${family} (retaining record for compliance).`,
    }
  }

  if (safeAction === 'restore') {
    if (!isArchived) {
      return {
        valid: false,
        error: `This ${family} is not archived and is already active.`,
        action: 'restore',
        currentStatus,
        isArchived,
        explanation: 'Restore requested on active document.',
      }
    }
    return {
      valid: true,
      action: 'restore',
      currentStatus,
      isArchived,
      explanation: `Restore this ${family} to active status.`,
    }
  }

  if (safeAction === 'convert_to_invoice') {
    if (!isQuotation) {
      return {
        valid: false,
        error: 'Conversion to invoice applies only to quotations.',
        action: 'convert_to_invoice',
        currentStatus,
        isArchived,
        explanation: 'Invalid conversion target.',
      }
    }
    if (isArchived) {
      return {
        valid: false,
        error: 'Archived quotations cannot be converted. Restore the quotation first.',
        action: 'convert_to_invoice',
        currentStatus,
        isArchived,
        explanation: 'Archived quotation conversion rejected.',
      }
    }
    if (currentStatus === 'converted') {
      return {
        valid: false,
        error: 'This quotation has already been converted to an invoice.',
        action: 'convert_to_invoice',
        currentStatus,
        isArchived,
        explanation: 'Duplicate quotation conversion rejected.',
      }
    }
    return {
      valid: true,
      action: 'convert_to_invoice',
      currentStatus,
      isArchived,
      explanation: 'Convert this quotation into an authorized invoice and link the commercial chain.',
    }
  }

  if (safeAction === 'update_status') {
    const rawTarget = String(targetStatus || '').trim().toLowerCase()

    // BOURXE does not use legacy statuses: draft, sent, accepted, rejected
    const LEGACY_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'void', 'cancelled']
    if (LEGACY_STATUSES.includes(rawTarget)) {
      if (isQuotation && (rawTarget === 'accepted' || rawTarget === 'approved')) {
        return {
          valid: false,
          error: 'In BOUXRE, accepted quotations are converted into invoices. Propose converting this quotation to an invoice instead.',
          action: 'update_status',
          currentStatus,
          isArchived,
          explanation: 'Legacy status transition redirected to conversion.',
        }
      }
      return {
        valid: false,
        error: `"${rawTarget}" is not a supported status in BOUXRE. Active statuses: ${isQuotation ? 'open, converted, archived' : 'unpaid, partially_paid, paid, archived'}.`,
        action: 'update_status',
        currentStatus,
        isArchived,
        explanation: 'Legacy status rejected.',
      }
    }

    if (isQuotation) {
      const VALID_QUOTATION_STATUSES = ['open', 'converted', 'archived']
      if (!VALID_QUOTATION_STATUSES.includes(rawTarget)) {
        return {
          valid: false,
          error: `Invalid quotation status "${targetStatus}". Supported statuses: open, converted, archived.`,
          action: 'update_status',
          currentStatus,
          isArchived,
          explanation: 'Invalid quotation status.',
        }
      }
      if (rawTarget === currentStatus) {
        return {
          valid: false,
          error: `Quotation is already in "${currentStatus}" status.`,
          action: 'update_status',
          currentStatus,
          isArchived,
          explanation: 'No-op status update rejected.',
        }
      }
      return {
        valid: true,
        action: 'update_status',
        targetStatus: rawTarget,
        currentStatus,
        isArchived,
        explanation: `Update quotation status from ${currentStatus} to ${rawTarget}.`,
      }
    } else {
      // Invoices: Status is system-derived from payments!
      if (rawTarget === 'paid' || rawTarget === 'partially_paid' || rawTarget === 'unpaid') {
        return {
          valid: false,
          error: 'Invoice payment status is derived from recorded payments. To change payment status, please record a payment through the payment sheet.',
          action: 'update_status',
          currentStatus,
          isArchived,
          explanation: 'Direct invoice status scalar edit rejected in favor of payment ledger.',
        }
      }
      return {
        valid: false,
        error: `Direct status changes to "${targetStatus}" are not permitted on invoices. Invoices derive status from recorded payments.`,
        action: 'update_status',
        currentStatus,
        isArchived,
        explanation: 'Unsupported invoice status change.',
      }
    }
  }

  return {
    valid: false,
    error: `Unsupported lifecycle action "${action}".`,
    action: safeAction,
    currentStatus,
    isArchived,
    explanation: 'Unsupported action.',
  }
}
