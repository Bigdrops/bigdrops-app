import { ZodError } from 'zod'

import { buildImportSchema } from './schema'
import type { ImportMode, ParseError, ParsedImportRoot } from './types'
import { MAX_IMPORT_BYTES } from './utils'

export function parseImportText(
  text: string,
  mode: ImportMode,
): { ok: true; data: ParsedImportRoot } | { ok: false; error: ParseError } {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      error: {
        stage: 'parse',
        message: `Import payload is too large. Keep it under ${MAX_IMPORT_BYTES.toLocaleString()} bytes.`,
      },
    }
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    return {
      ok: false,
      error: { stage: 'parse', message: 'Invalid JSON.' },
    }
  }

  try {
    const data = buildImportSchema(mode).parse(parsed)
    return { ok: true, data }
  } catch (error) {
    const message =
      error instanceof ZodError ? error.issues[0]?.message || 'Invalid import payload.' : 'Invalid import payload.'

    return {
      ok: false,
      error: { stage: 'parse', message },
    }
  }
}
