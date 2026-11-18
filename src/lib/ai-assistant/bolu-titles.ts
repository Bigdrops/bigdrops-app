/**
 * bolu-titles.ts — Deterministic Topic Title Derivation for Bolu 2.0 Conversations
 *
 * Implements lightweight, deterministic title generation from the first meaningful user message:
 * - Normalizes whitespace and removes punctuation/code wrappers.
 * - Extracts clean business topics (e.g. "Tecno Power Quotation", "Outstanding Invoices", "Adding transport charge").
 * - Avoids generic labels such as "New Conversation" or "Untitled".
 * - Never exposes internal tool calls, JSON, or hidden metadata.
 * - Caps titles at 48 characters with word-boundary truncation.
 */

const GENERIC_TITLES = new Set([
  'new conversation',
  'new chat',
  'new thread',
  'conversation',
  'untitled',
  'untitled conversation',
  'bolu chat',
  'bolu assistant',
])

/**
 * Checks if a given title is empty or generic.
 */
export function isGenericTitle(title: string | null | undefined): boolean {
  if (!title) return true
  const normalized = title.trim().toLowerCase()
  return normalized.length === 0 || GENERIC_TITLES.has(normalized)
}

/**
 * Strips raw code fences, JSON envelopes, URLs, markdown symbols, and excess punctuation.
 */
function cleanMessageText(text: string): string {
  if (!text) return ''

  let cleaned = text
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`[^`]+`/g, ' ')
    // Remove JSON-like brackets
    .replace(/\{[\s\S]*?\}/g, ' ')
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove URLs
    .replace(/https?:\/\/\S+/gi, ' ')
    // Replace hyphens and em-dashes
    .replace(/[—–]/g, ' ')
    // Remove hashtags, asterisks, underscores, bullets
    .replace(/[#*_~>•]/g, ' ')
    // Collapse multiple whitespace
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned
}

/**
 * Derives a human-readable conversation topic title from user message text.
 */
export function deriveConversationTitle(userMessage: string): string {
  const clean = cleanMessageText(userMessage)
  if (!clean) return 'New Conversation'

  const lower = clean.toLowerCase()

  // 1. Invoices inquiry (e.g. "show me outstanding invoices", "check pending invoices")
  if (lower.includes('outstanding invoice') || lower.includes('unpaid invoice') || lower.includes('overdue invoice')) {
    return 'Outstanding Invoices'
  }
  if (lower.includes('all invoice') || lower.includes('list invoice') || lower.includes('show invoice') || lower.includes('show my invoice')) {
    return 'Invoice Overview'
  }

  // 2. Client balances (e.g. "check recent client balances", "customer balances")
  if (lower.includes('client balance') || lower.includes('customer balance') || lower.includes('debtor')) {
    return 'Client Balances'
  }

  // 3. Document Creation Intent: Quotation for [Client]
  const quoteMatch = clean.match(/(?:create|draft|make|new|generate)\s+(?:a\s+)?quotation\s+(?:for\s+)?([A-Za-z0-9&.\- ]+)/i)
  if (quoteMatch && quoteMatch[1]) {
    const client = quoteMatch[1].trim().replace(/\s+(with|having|including|and)\s+.*$/i, '')
    if (client.length > 2 && client.length < 32) {
      return `${capitalizeWords(client)} Quotation`
    }
    return 'New Quotation'
  }
  if (lower.startsWith('draft quotation') || lower.startsWith('create quotation') || lower === 'new quotation') {
    return 'New Quotation'
  }

  // 4. Document Creation Intent: Invoice for [Client]
  const invoiceMatch = clean.match(/(?:create|draft|make|new|generate)\s+(?:an?\s+)?invoice\s+(?:for\s+)?([A-Za-z0-9&.\- ]+)/i)
  if (invoiceMatch && invoiceMatch[1]) {
    const client = invoiceMatch[1].trim().replace(/\s+(with|having|including|and)\s+.*$/i, '')
    if (client.length > 2 && client.length < 32) {
      return `${capitalizeWords(client)} Invoice`
    }
    return 'New Invoice'
  }
  if (lower.startsWith('draft invoice') || lower.startsWith('create invoice') || lower === 'new invoice') {
    return 'New Invoice'
  }

  // 5. Modification: Transport / Delivery charges (e.g. "add transport 5670", "add delivery charge 2000")
  const transportMatch = clean.match(/^add\s+(transport|delivery|shipping|logistics)(?:\s+(?:fee|charge|cost))?(?:\s+(\d+[\d,.]*))?/i)
  if (transportMatch) {
    const feeName = transportMatch[1].toLowerCase()
    const amount = transportMatch[2]
    if (amount) {
      return `Add ${capitalizeWord(feeName)} ₦${amount}`
    }
    return `Adding ${feeName} charge`
  }

  // 6. Generic addition (e.g. "add 10 rolls of wire", "add transport")
  if (/^add\s+/i.test(clean)) {
    return truncateAtWord(clean, 44)
  }

  // 7. General clean statement: capitalize first letter and truncate nicely
  const sentence = clean.replace(/^[?.,!;: -]+/, '').replace(/[?.,!;: -]+$/, '')
  if (sentence.length <= 44) {
    return sentence.charAt(0).toUpperCase() + sentence.slice(1)
  }

  return truncateAtWord(sentence, 44)
}

function capitalizeWord(word: string): string {
  if (!word) return ''
  // Preserve acronyms / all-caps abbreviations (e.g. ABC, MTN, QTN)
  if (word.length >= 2 && word === word.toUpperCase()) {
    return word
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function capitalizeWords(phrase: string): string {
  return phrase
    .split(/\s+/)
    .map((w) => capitalizeWord(w))
    .join(' ')
}

function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  const truncated = text.slice(0, maxLen)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 16) {
    return truncated.slice(0, lastSpace).trim()
  }
  return truncated.trim()
}
