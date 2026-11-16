/**
 * bolu-narration.ts — device Text-to-Speech narration for Bolu responses.
 *
 * Scope: the device TTS engine speaks the written response. There is no AI
 * audio generation, no cloud voice provider, no audio storage and no API key.
 *
 * Engine selection (2026-11-16):
 * - Android uses the native `BoluSpeech` bridge (Android TextToSpeech). Android
 *   System WebView, which hosts the Capacitor web layer, does not reliably
 *   implement the Web Speech synthesis API, so the native engine is preferred
 *   there. See `BoluSpeechPlugin.java` and `src/lib/native/boluSpeech.ts`.
 * - Every other environment keeps browser `speechSynthesis` as the fallback.
 * - When neither engine is usable the action reports "unavailable" and never
 *   crashes the thread.
 */

export type BoluNarrationEngine = 'native' | 'browser' | 'none'

/**
 * Chooses the narration implementation from real capability, never from the
 * platform name alone. Native wins only when its bridge reports a working
 * engine; otherwise the browser engine is used; otherwise narration is off.
 */
export function selectNarrationEngine(input: {
  nativeBridgeAvailable: boolean
  nativeCapable: boolean
  webSpeechAvailable: boolean
}): BoluNarrationEngine {
  if (input.nativeBridgeAvailable && input.nativeCapable) return 'native'
  if (input.webSpeechAvailable) return 'browser'
  return 'none'
}

/**
 * Splits prepared narration into sentence-sized chunks.
 *
 * The native bridge speaks one chunk per call, which is what makes pause and
 * resume possible: a pause stops the engine and a resume re-sends the current
 * chunk, so at most one sentence repeats.
 */
export function splitNarrationChunks(text: string, maxLength = 280): string[] {
  const limit = Math.max(120, Math.min(1000, Math.floor(maxLength || 280)))
  const normalized = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return []

  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [normalized]
  const chunks: string[] = []
  let current = ''

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim()
    if (!sentence) continue

    if (!current) {
      current = sentence
      continue
    }

    if (current.length + 1 + sentence.length <= limit) {
      current = `${current} ${sentence}`
      continue
    }

    chunks.push(current)
    current = sentence
  }

  if (current) chunks.push(current)

  return chunks.flatMap((chunk) => splitOversizedChunk(chunk, limit))
}

function splitOversizedChunk(chunk: string, limit: number): string[] {
  if (chunk.length <= limit) return [chunk]

  const parts: string[] = []
  let current = ''

  for (const word of chunk.split(' ')) {
    if (!current) {
      current = word
      continue
    }
    if (current.length + 1 + word.length <= limit) {
      current = `${current} ${word}`
      continue
    }
    parts.push(current)
    current = word
  }

  if (current) parts.push(current)
  return parts
}

export type BoluNarrationStatus =
  | 'idle'
  | 'speaking'
  | 'paused'
  | 'stopped'
  | 'completed'
  | 'error'
  | 'unavailable'

const FENCE_LINE = /^\s{0,3}(`{3,}|~{3,})/
const RULE_LINE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/
const HEADING_LINE = /^\s{0,3}(#{1,6})\s+(.*)$/
const QUOTE_LINE = /^\s{0,3}>\s?(.*)$/
const LIST_LINE = /^\s*([-*+]|\d{1,9}[.)])\s+(.*)$/
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/
const SENTENCE_END = /[.!?:;]$/

/**
 * Removes Markdown syntax from one line so the device reads words, not symbols.
 * Link text is kept, the URL is dropped. Bare URLs become "link".
 */
export function spokenInlineText(text: string): string {
  return String(text ?? '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/(^|[^\w])_([^_\n]+)_/g, '$1$2')
    .replace(/https?:\/\/\S+/gi, 'link')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function asSentence(text: string): string {
  return SENTENCE_END.test(text) ? text : `${text}.`
}

function spokenTableRow(line: string): string {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => spokenInlineText(cell))
    .filter(Boolean)
    .join(', ')
}

/**
 * Converts an assistant Markdown response into speech-ready plain text.
 *
 * - Headings, paragraphs and list items become sentences with pauses.
 * - Table rows are read cell by cell in row order.
 * - Inline code is read as words.
 * - Fenced code is not read line by line; a short indication is spoken instead.
 * - Markdown symbols are never read aloud.
 */
export function prepareNarrationText(markdown: string): string {
  const source = String(markdown ?? '').replace(/\r\n?/g, '\n')
  if (!source.trim()) return ''

  const spoken: string[] = []
  let inFence = false

  const pushLine = (raw: string) => {
    const clean = spokenInlineText(raw)
    if (clean) spoken.push(asSentence(clean))
  }

  for (const line of source.split('\n')) {
    const fence = FENCE_LINE.exec(line)
    if (fence) {
      if (inFence) {
        inFence = false
      } else {
        inFence = true
        spoken.push('There is a code block in this response.')
      }
      continue
    }
    if (inFence) continue

    if (!line.trim()) {
      if (spoken.length > 0 && spoken[spoken.length - 1] !== '') spoken.push('')
      continue
    }
    if (RULE_LINE.test(line)) continue
    if (line.includes('|') && TABLE_SEPARATOR.test(line)) continue

    const heading = HEADING_LINE.exec(line)
    if (heading) {
      pushLine(heading[2])
      continue
    }
    const quote = QUOTE_LINE.exec(line)
    if (quote) {
      pushLine(quote[1])
      continue
    }
    const list = LIST_LINE.exec(line)
    if (list) {
      pushLine(list[2])
      continue
    }
    if (line.includes('|')) {
      const row = spokenTableRow(line)
      if (row) spoken.push(asSentence(row))
      continue
    }
    pushLine(line)
  }

  return spoken.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Full narration text for one assistant message.
 * The artifact card is summarised, never read as raw payload, and attachments
 * are not described as if their contents had been read.
 */
export function buildNarrationText(input: { prose: string; hasProposal?: boolean }): string {
  const body = prepareNarrationText(input.prose)
  const proposalNote = input.hasProposal
    ? 'A document proposal is shown with this response. Review it before you save anything.'
    : ''
  return [body, proposalNote].filter(Boolean).join('\n\n')
}

export function isNarrationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  )
}

/** Error codes a cancel or a new utterance produces; these are not failures. */
export function isNarrationCancelCode(code: string | undefined): boolean {
  return code === 'canceled' || code === 'cancelled' || code === 'interrupted'
}
