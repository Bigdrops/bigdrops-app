/**
 * bolu-commercial-language.ts — reusable commercial description intelligence.
 *
 * Bolu's contract with the user is UNDERSTAND -> STANDARDIZE -> SUGGEST ->
 * PREPARE. This module holds the deterministic half of that contract:
 *
 * - It parses what the user actually wrote (pasted WhatsApp-style lists, list
 *   markers, `15k` amounts, description lines, separate price lines).
 * - It standardizes presentation only: unit notation where the supplied text
 *   already establishes the measurement, capitalisation, whitespace, a small
 *   set of spelling corrections (`elbo` -> `elbow`) and compound words
 *   (`change over switch` -> `Changeover Switch`).
 * - It suggests improvements without ever applying a change the user did not
 *   supply.
 *
 * Hard rule: it never invents a specification. No brand, manufacturer, grade,
 * packaging, core count, product class, voltage, model, material or dimension
 * is added here. `1.5mm green` becomes `1.5mm² green` at most: every supplied
 * word survives and nothing about the product is guessed.
 *
 * Scope: invoices and quotations. Nothing in this module writes to the
 * database or mutates inventory.
 */

export interface CommercialListEntry {
  /** The description exactly as the user supplied it, before standardization. */
  rawDescription: string
  /** Standardized description suitable for a document line. */
  description: string
  /** Quantity parsed from the same line, or 1 when the user supplied none. */
  quantity: number
  /** Amount supplied on the same line (`15k`, `₦32,000`), or null. */
  amount: number | null
  /** True when the line only carried an amount, so pairing is positional. */
  amountOnly: boolean
}

export interface CommercialListParse {
  entries: CommercialListEntry[]
  /** Description lines that carry no amount, in order. */
  descriptions: CommercialListEntry[]
  /** Amount-only lines, in order. */
  amounts: number[]
  /** `paired` when every description has an amount, `mismatch` otherwise. */
  status: 'empty' | 'paired' | 'mismatch'
  /** Amount lines that could not be matched to a description, in order. */
  unpairedAmounts: number[]
}

const COLOUR_WORDS =
  'green|red|black|blue|yellow|brown|white|grey|gray|orange|purple|pink'

/** `1.5mm green`, `2.5 mm black`, `1.5mm2 red`: a measured size with a cable colour. */
const CABLE_SHORTHAND = new RegExp(
  `^(\\d+(?:\\.\\d+)?)\\s*mm\\s*(?:²|2|\\^2)?\\s*[-–,]?\\s*(${COLOUR_WORDS})$`,
  'i',
)

/**
 * A measured size followed by a cable colour, anywhere in the text. This is
 * the only measurement context in which a bare `mm` is read as a conductor
 * cross-section.
 */
const MEASURED_CONDUCTOR = new RegExp(
  `(?:^|\\s)\\d+(?:\\.\\d+)?\\s*mm\\s*(?:²|2|\\^2)?\\s*[-–,]?\\s*(?:${COLOUR_WORDS})\\b`,
  'i',
)

/** A word that names the conductor itself. */
const CONDUCTOR_WORD = /\b(?:cables?|wires?|conductors?)\b/i

/**
 * Spelling and compound-word corrections that change no product attribute.
 * Ordered: longer forms first so a shorter rule cannot pre-empt them.
 */
const SAFE_WORD_CORRECTIONS: Array<[RegExp, string]> = [
  [/\belbos\b/gi, 'elbows'],
  [/\belbo\b/gi, 'elbow'],
  [/\bchange\s*over\s+switches\b/gi, 'Changeover Switches'],
  [/\bchange\s*over\s+switch\b/gi, 'Changeover Switch'],
]

/**
 * True only when the supplied words themselves place the measurement on a
 * conductor: a cable or wire word, or a measured size carrying a cable colour.
 * Without that signal `mm` is ambiguous (a pipe wall, a rod, a sheet), so the
 * unit is left exactly as the user wrote it.
 */
function establishesConductorMeasurement(text: string): boolean {
  return CONDUCTOR_WORD.test(text) || MEASURED_CONDUCTOR.test(text)
}

/** A bare trailing integer after a measured description is a quantity. */
const MEASURED_DESCRIPTION = /\b\d+(?:\.\d+)?\s*(?:mm|cm|m|kg|g|ml|l|pcs|bags?|rolls?|packs?)\b/i

const LIST_MARKER = /^\s*(?:\d{1,3}[.)]|[-•*·])\s+/
const WHATSAPP_STAMP = /^\s*\[?\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?,?\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:[APap][Mm])?\]?\s*(?:-\s*)?(?:[^:]{1,40}:)?\s*/

/**
 * Matches citation and search span artifacts emitted by LLM search grounding or external pastes
 * (e.g. `[span_0](start_span)`, `[span_1](end_span)`, `[span0](start_span)`).
 * Preserves legitimate Markdown links `[Label](url)` and technical bracket notation `[PN16]`.
 */
export const CITATION_SPAN_ARTIFACT = /\[span_?\w+\]\((?:start_span|end_span)\)/gi

export function stripCitationSpanArtifacts(text: string): string {
  if (!text) return ''
  return text.replace(CITATION_SPAN_ARTIFACT, '').replace(/[ \t]{2,}/g, ' ')
}

/**
 * Parses a supplied amount.
 *
 * Accepts `32000`, `32,000`, `₦32,000`, `32,000.50`, `15k`, `15 K`, `2.5m`.
 * Returns null when the token is not an amount at all.
 */
export function parseCommercialAmount(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const text = String(raw).trim().replace(/[₦#]/g, '').replace(/\s+/g, ' ')
  if (!text) return null
  const match = text.match(/^(\d[\d,]*(?:\.\d+)?)\s*(k|m)?$/i)
  if (!match) return null
  const base = Number(match[1].replace(/,/g, ''))
  if (!Number.isFinite(base)) return null
  const suffix = (match[2] ?? '').toLowerCase()
  const value = suffix === 'k' ? base * 1_000 : suffix === 'm' ? base * 1_000_000 : base
  return Number.isFinite(value) ? value : null
}

/**
 * Standardizes a supplied description without adding a specification.
 *
 * Only presentation is normalized: whitespace, unit notation the text already
 * establishes, casing, and a safe spelling/compound-word correction. No word
 * the user did not write is appended and no product attribute is inferred.
 */
export function standardizeDescription(raw: string): string {
  let cleaned = stripCitationSpanArtifacts(String(raw ?? ''))
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return ''

  cleaned = SAFE_WORD_CORRECTIONS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    cleaned,
  )
    // An explicit squared form is already unambiguous and is only tidied.
    // The `2` must be attached to the measurement, so `1.5mm 2 core` is not
    // mistaken for a cross-section.
    .replace(/(\d)\s*mm\s*\^\s*2\b/gi, '$1mm²')
    .replace(/(\d)mm2\b/gi, '$1mm²')

  // A bare `mm` is a cross-section only where the supplied words establish a
  // conductor. `1.5mm 2 core` and any non-conductor measurement keep the
  // supplied unit, and `mm` is never reinterpreted as a core count or a size.
  if (establishesConductorMeasurement(cleaned)) {
    cleaned = cleaned.replace(/(\d)\s*mm(?!\s*(?:²|\^\s*2\b|2\b))/gi, '$1mm²')
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

/** True when the supplied text is a measured size with a cable colour. */
export function isCableShorthand(raw: string): boolean {
  return CABLE_SHORTHAND.test(String(raw ?? '').trim())
}

/** Splits one line into a description and an optional quantity/amount. */
function parseLine(rawLine: string): CommercialListEntry | null {
  let line = rawLine.replace(/\r/g, '').trim()
  if (!line) return null
  line = stripCitationSpanArtifacts(line).trim()
  line = line.replace(WHATSAPP_STAMP, '').trim()
  line = line.replace(LIST_MARKER, '').trim()
  if (!line || /^(?:invoice|quotation|write|make|create|draft)\b/i.test(line)) return null

  // A line that is only an amount is a positional price entry.
  const amountOnly = parseCommercialAmount(line)
  if (amountOnly !== null) {
    return { rawDescription: '', description: '', quantity: 0, amount: amountOnly, amountOnly: true }
  }

  // `Salt 15k`, `Cement ₦5,000`, `Cable 32,000`
  const trailing = line.match(/^(.*?)\s+([₦#]?\d[\d,]*(?:\.\d+)?\s*[kKmM]?)$/)
  if (trailing) {
    const tail = trailing[2].trim()
    const tailIsAmountShape = /[₦#]/i.test(tail) || /[kKmM]$/.test(tail) || /,/.test(tail)
    const description = trailing[1].trim()
    if (description && tailIsAmountShape) {
      const amount = parseCommercialAmount(tail)
      if (amount !== null) {
        return {
          rawDescription: description,
          description: standardizeDescription(description),
          quantity: 1,
          amount,
          amountOnly: false,
        }
      }
    }
    // `1.5mm green 1` — a bare integer after a measured description is a quantity.
    if (description && MEASURED_DESCRIPTION.test(description) && /^\d{1,4}$/.test(tail)) {
      return {
        rawDescription: description,
        description: standardizeDescription(description),
        quantity: Number(tail),
        amount: null,
        amountOnly: false,
      }
    }
  }

  return {
    rawDescription: line,
    description: standardizeDescription(line),
    quantity: 1,
    amount: null,
    amountOnly: false,
  }
}

/**
 * Parses pasted or typed commercial input into ordered entries.
 *
 * Multiple user messages may contribute to one document: callers concatenate
 * the user's turns before parsing. Descriptions and amounts are paired in
 * order when the counts agree; when they do not, `status` is `mismatch` and no
 * pairing is invented.
 */
export function parseCommercialList(text: string): CommercialListParse {
  const entries: CommercialListEntry[] = []
  for (const line of String(text ?? '').split('\n')) {
    const parsed = parseLine(line)
    if (parsed) entries.push(parsed)
  }

  const descriptions = entries.filter((entry) => !entry.amountOnly)
  const amounts = entries.filter((entry) => entry.amountOnly).map((entry) => entry.amount ?? 0)

  if (descriptions.length === 0) {
    return { entries, descriptions, amounts, status: amounts.length ? 'mismatch' : 'empty', unpairedAmounts: amounts }
  }

  const missing = descriptions.filter((entry) => entry.amount === null)
  if (amounts.length === 0) {
    return {
      entries,
      descriptions,
      amounts,
      status: missing.length === 0 ? 'paired' : 'empty',
      unpairedAmounts: [],
    }
  }

  // Positional pairing only when the lists line up exactly. A different count
  // is reported as a mismatch: a guessed price on the wrong line is worse than
  // one focused question.
  const paired = amounts.length === missing.length
  if (paired) {
    missing.forEach((entry, index) => {
      entry.amount = amounts[index]
    })
  }
  const stillMissing = missing.filter((entry) => entry.amount === null)

  return {
    entries,
    descriptions,
    amounts,
    status: paired && stillMissing.length === 0 ? 'paired' : 'mismatch',
    unpairedAmounts: paired ? [] : amounts,
  }
}

/**
 * True when the text carries commercial signal rather than ordinary prose:
 * a pasted list of lines, a price, or a measured/quantified item.
 *
 * This is a supporting signal only. Whether evidence belongs in a prompt is
 * decided per turn in `bolu-prompt.ts`; conversational text must never become
 * a line item on its own.
 */
export function hasCommercialListSignal(text: string): boolean {
  const parsed = parseCommercialList(text)
  if (parsed.amounts.length > 0) return true
  if (parsed.descriptions.length >= 2) return true
  return parsed.descriptions.some(
    (entry) => entry.amount != null || entry.quantity !== 1 || /\d/.test(entry.rawDescription),
  )
}

/** A request sentence that mentions a document but supplies no item detail. */
const CONVERSATIONAL_REQUEST =
  /^(?:please\s+)?(?:can|could|would|will)\s+you\b|\b(?:create|make|draft|prepare)\s+(?:an?\s+)?(?:invoice|quotation|quote)\b/i

/**
 * Renders parsed evidence for the provider prompt.
 *
 * This is evidence, not an instruction to the model to accept it blindly: the
 * model still has to produce the document, and the user still has to approve.
 * Request sentences and plain conversation are dropped; genuine list entries,
 * including incomplete ones without a price, are preserved.
 */
export function formatCommercialEvidence(parsed: CommercialListParse): string {
  if (parsed.status === 'empty' && parsed.entries.length === 0) return ''

  const ordered = parsed.descriptions.filter((entry) => {
    if (CONVERSATIONAL_REQUEST.test(entry.rawDescription.trim())) return false
    if (parsed.descriptions.length >= 2) return true
    return entry.amount != null || entry.quantity !== 1 || /\d/.test(entry.rawDescription)
  })
  if (ordered.length === 0 && parsed.amounts.length === 0) return ''

  const lines: string[] = [
    "PARSED COMMERCIAL EVIDENCE (deterministic parse of the user's own words, in order).",
    "Wording marked \"presentation-only wording\" is capitalisation, unit notation or a spelling correction applied to the user's line. It is not a catalogue name, a verified specification or an approved change.",
  ]

  ordered.forEach((entry, index) => {
    const amount = entry.amount == null ? 'not supplied' : String(entry.amount)
    // The supplied words stay verbatim. A normalised variant is only shown
    // when it actually differs, and it is labelled as presentation only.
    const presentation =
      entry.description && entry.description !== entry.rawDescription
        ? ` | presentation-only wording: "${entry.description}"`
        : ''
    lines.push(
      `${index + 1}. supplied: "${entry.rawDescription}" | quantity: ${entry.quantity} | amount: ${amount}${presentation}`,
    )
  })

  if (parsed.status === 'mismatch') {
    lines.push(
      `Amounts and descriptions do not line up (${parsed.descriptions.length} descriptions, ${parsed.amounts.length} standalone amounts). Do not guess the pairing: ask one focused question.`,
    )
  } else if (parsed.amounts.length > 0) {
    lines.push('The supplied amounts were matched to the descriptions in order.')
  }

  return lines.join('\n')
}

/**
 * Standardizes the model's line items deterministically.
 *
 * Applied after validation so a shorthand description cannot reach the preview
 * unresolved. Only the supplied description is rewritten; no value is added.
 */
export function standardizeCommercialItems<
  T extends { description: string; quantity: number; unit_price: number },
>(items: T[]): T[] {
  return items.map((item) => {
    const description = standardizeDescription(item.description)
    return description && description !== item.description ? { ...item, description } : item
  })
}

export interface CommercialSuggestionInput {
  items: Array<{ description: string; quantity: number; unit_price: number; unit?: string | null }>
  payment_terms?: string | null
  title?: string | null
  notes?: string | null
}

/**
 * Builds optional, grounded suggestions.
 *
 * Each suggestion names a fact about the supplied draft. None of them is
 * applied automatically and none of them blocks the proposal.
 */
export function buildCommercialSuggestions(input: CommercialSuggestionInput): string[] {
  const suggestions: string[] = []
  const items = input.items ?? []

  const shorthand = items.filter((item) => isCableShorthand(item.description))
  if (shorthand.length > 0) {
    const suggested = standardizeDescription(shorthand[0].description)
    // Only worth saying when the wording would actually change.
    if (suggested && suggested !== shorthand[0].description) {
      suggestions.push(
        `"${shorthand[0].description}" can be written as "${suggested}" so the measurement reads as a cross-section.`,
      )
    }
  }

  const unpriced = items.filter((item) => !item.unit_price)
  if (unpriced.length > 0) {
    suggestions.push(`No amount was supplied for ${unpriced[0].description}.`)
  }

  const unitless = items.filter((item) => !item.unit && /\d/.test(item.description))
  if (unitless.length > 0) {
    suggestions.push(`A unit (for example pcs, m or bags) would make ${unitless[0].description} clearer.`)
  }

  if (!input.payment_terms) {
    suggestions.push('Payment terms are not set on this draft.')
  }

  if (!input.title && items.length > 1) {
    suggestions.push('A short document title would make this invoice easier to identify later.')
  }

  return suggestions
}
