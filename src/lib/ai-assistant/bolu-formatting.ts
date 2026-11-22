/**
 * bolu-formatting.ts — Pure Prompt and Fact Formatting Helpers for Bolu
 */

import { readBoluContextFacts } from './bolu-data'
import type { BoluMessage } from './bolu-runtime'

export function escapePromptValue(value: string | null | undefined): string {
  return String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, 240)
}

export function formatRecordAmount(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return 'not retrieved'
  return `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`
}

export function factsAsPrompt(facts: Awaited<ReturnType<typeof readBoluContextFacts>>): string {
  if (facts.kind === 'message') return facts.text
  if (facts.records.length === 0) return 'No matching records were found in the authorized business data.'
  return facts.records
    .map((record) =>
      [
        `Type: ${record.kind}`,
        `Number: ${escapePromptValue(record.number)}`,
        `Client: ${escapePromptValue(record.clientName)}`,
        `Date: ${escapePromptValue(record.date)}`,
        record.validUntil ? `Valid until: ${escapePromptValue(record.validUntil)}` : null,
        `Status: ${escapePromptValue(record.status)}`,
        `Total: ${formatRecordAmount(record.total)}`,
        `Balance due: ${formatRecordAmount(record.balanceDue)}`,
        `Route: ${record.route}`,
      ].filter(Boolean).join('\n'),
    )
    .join('\n\n')
}

/**
 * Assembles bounded provider messages from the conversation transcript.
 * Deterministically preserves the latest turn in full, then includes prior
 * turns backwards until the aggregate character budget or 12-turn window is reached.
 */
export function buildProviderMessages(
  transcript: BoluMessage[],
  maxAggregateChars = 64000,
): { role: 'user' | 'assistant'; content: string }[] {
  const filtered = transcript.filter((item) => item.role === 'user' || item.role === 'assistant')
  if (filtered.length === 0) return []

  const latestTurn = filtered[filtered.length - 1]
  const result: { role: 'user' | 'assistant'; content: string }[] = [
    { role: latestTurn.role, content: latestTurn.content },
  ]
  let currentTotal = latestTurn.content.length

  const priorTurns = filtered.slice(0, -1).slice(-11)
  for (let i = priorTurns.length - 1; i >= 0; i--) {
    const turn = priorTurns[i]
    if (currentTotal + turn.content.length <= maxAggregateChars) {
      result.unshift({ role: turn.role, content: turn.content })
      currentTotal += turn.content.length
    } else {
      break
    }
  }

  return result
}

export function formatFactAnswer(facts: Awaited<ReturnType<typeof readBoluContextFacts>>, userText: string): string {
  if (facts.kind === 'message') return facts.text
  if (!facts.records.length) return 'I could not find matching records in the information available to you.'

  const overdueOnly = /\b(overdue|past due)\b/i.test(userText)
  if (overdueOnly && !facts.records.some((row) => row.status === 'overdue')) {
    return 'I found no overdue invoices in the retrieved records.'
  }

  return facts.records
    .slice(0, 10)
    .map((record) => {
      const label = `${record.number}${record.clientName ? ` · ${record.clientName}` : ''}`
      const detail = [
        record.status,
        record.total == null ? null : `total ${formatRecordAmount(record.total)}`,
        record.balanceDue == null ? null : `balance ${formatRecordAmount(record.balanceDue)}`,
      ]
        .filter(Boolean)
        .join(' · ')
      return `• ${label}${detail ? ` — ${detail}` : ''} (${record.route})`
    })
    .join('\n')
}
