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
        `Status: ${escapePromptValue(record.status)}`,
        `Total: ${formatRecordAmount(record.total)}`,
        `Balance due: ${formatRecordAmount(record.balanceDue)}`,
        `Route: ${record.route}`,
      ].join('\n'),
    )
    .join('\n\n')
}

export function buildProviderMessages(transcript: BoluMessage[]) {
  return transcript
    .filter((item) => item.role === 'user' || item.role === 'assistant')
    .slice(-12)
    .map(({ role, content }) => ({ role, content }))
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
