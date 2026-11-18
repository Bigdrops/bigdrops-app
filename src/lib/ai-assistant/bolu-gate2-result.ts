/**
 * bolu-gate2-result.ts — pure Gate 2 execution-result helpers.
 *
 * The persisted assistant execution message is the durable surface for a
 * completed (or failed) Gate 2 save. Warnings produced by the executor ride
 * `metadata.warnings` verbatim; nothing is invented beyond the factual
 * outcome, and the proposal that was approved is never rebuilt here.
 */

import type { BoluOperationExecutionResult } from './bolu-document-service'

export type GateTwoExecutionMessage = {
  content: string
  status: 'completed' | 'failed'
  /** Normalized warnings: strings only, verbatim, order preserved. */
  warnings: string[]
}

export type GateTwoAdvanceIntent = 'configure' | 'update' | 'remove'

export function executionWarnings(
  result: Pick<BoluOperationExecutionResult, 'warnings'> | null | undefined,
): string[] {
  if (!result || !Array.isArray(result.warnings)) return []
  return result.warnings.filter((warning) => typeof warning === 'string' && warning.trim().length > 0)
}

export function gateTwoExecutionMessage(input: {
  result: BoluOperationExecutionResult
  advanceInvoice?: { intent: GateTwoAdvanceIntent } | null
}): GateTwoExecutionMessage {
  const { result, advanceInvoice } = input
  const warnings = executionWarnings(result)
  const docNum = result.documentNumber || result.documentId || 'the document'

  if (result.success) {
    if (advanceInvoice) {
      const verb =
        advanceInvoice.intent === 'configure'
          ? 'configured on'
          : advanceInvoice.intent === 'update'
            ? 'updated on'
            : 'removed from'
      return { content: `✓ Advance Invoice ${verb} ${docNum}.`, status: 'completed', warnings }
    }
    return { content: `✓ Successfully saved ${docNum} to your business records.`, status: 'completed', warnings }
  }

  return {
    content: `Save failed: ${result.error ?? 'Unknown error'}`,
    status: 'failed',
    warnings,
  }
}
