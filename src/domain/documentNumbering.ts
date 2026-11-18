import type { TenantClient } from '@/lib/tenantClient'

import { AUTO_CURSOR_KEY, DEFAULT_PREFIXES, mergeAutoCursor, readAutoCursor } from '@/domain/prefixConstants'

/**
 * Persistence protocol for automatic number cursors (see the prefix-engine
 * standard §5). Cursors live in `settings.document_prefixes.__auto_seq`.
 * They are advisory: the uniqueness constraint plus skip-scan over
 * ground-truth rows arbitrate every allocation, so stale or missing
 * cursors cost retries at most, never duplicates.
 */

/**
 * Explicit result type that distinguishes a successful settings read from
 * a retrieval failure. This is the D4 fix: a failed read must never be
 * silently collapsed into `undefined`, because `resolvePrefix(undefined)`
 * returns the global `INV`/`QTN` default and the document is numbered from
 * the wrong sequence family.
 *
 * Uses a string-literal `status` discriminant (not a boolean `ok`) so the
 * union narrows correctly even with `strict: false` in tsconfig.json, where
 * boolean literals are widened to `boolean` and cannot serve as discriminants.
 *
 * - `{ status: 'ok', prefixes }` — the settings row was read. `prefixes` may be
 *   an empty/partial object; `resolvePrefix` will apply the established
 *   default for any family the tenant has not configured.
 * - `{ status: 'error', reason }` — the read failed (network, RLS, malformed
 *   data, missing tenant context). The caller MUST abort document creation
 *   with a user-facing error.
 */
export type PrefixFetchResult =
  | { status: 'ok'; prefixes: Record<string, string> | undefined }
  | { status: 'error'; reason: string }

/**
 * Validates that a raw `document_prefixes` value is a well-formed map of
 * prefix keys to valid prefix strings. Returns an error reason if the
 * structure is malformed; returns `undefined` if the value is a legitimate
 * absence (null or undefined); returns the validated map if all present
 * prefix values pass the `resolvePrefix` validation pattern.
 *
 * This is the D4 correction: malformed settings data must NOT be treated as
 * confirmed absence. A string, number, array, or object containing invalid
 * prefix values is a data integrity problem that must abort document creation.
 */
function validatePrefixes(
  raw: unknown,
): { status: 'ok'; prefixes: Record<string, string> | undefined } | { status: 'error'; reason: string } {
  // null/undefined: legitimate absence — the settings row exists but no
  // document_prefixes column value was set. This is NOT malformed.
  if (raw === null || raw === undefined) {
    return { status: 'ok', prefixes: undefined }
  }

  // Non-object types are malformed. A string like "INV" or a number cannot
  // be a prefix map and indicates a data corruption or schema mismatch.
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      status: 'error',
      reason: `Document numbering settings are malformed: expected an object, got ${typeof raw}${Array.isArray(raw) ? ' (array)' : ''}. Document creation aborted to prevent wrong-sequence numbering.`,
    }
  }

  const obj = raw as Record<string, unknown>

  // Validate each prefix value. Unknown keys (e.g. __auto_seq) are allowed
  // and passed through; only string-typed prefix values are checked against
  // the established pattern. Non-string values for known prefix keys are
  // malformed.
  const PREFIX_PATTERN = /^[A-Z0-9]{2,6}$/
  const KNOWN_PREFIX_KEYS = new Set(Object.keys(DEFAULT_PREFIXES))

  for (const [key, value] of Object.entries(obj)) {
    // Skip the reserved cursor key — it holds a nested object, not a prefix.
    if (key === AUTO_CURSOR_KEY) continue

    if (KNOWN_PREFIX_KEYS.has(key)) {
      if (value !== null && value !== undefined) {
        if (typeof value !== 'string') {
          return {
            status: 'error',
            reason: `Document numbering settings are malformed: prefix "${key}" has a non-string value (type: ${typeof value}). Document creation aborted.`,
          }
        }
        if (!PREFIX_PATTERN.test(value)) {
          return {
            status: 'error',
            reason: `Document numbering settings are malformed: prefix "${key}" value "${value}" does not match the required pattern (2-6 uppercase alphanumeric characters). Document creation aborted.`,
          }
        }
      }
    }
    // Unknown string keys are allowed (forward-compatible).
  }

  return { status: 'ok', prefixes: obj as Record<string, string> }
}

/**
 * Reads the tenant's configured `settings.document_prefixes` map.
 *
 * Every numbering path must resolve its prefix through this map, exactly as the
 * document forms do via `useSettings()`. A caller that passes `undefined` to
 * `resolvePrefix` silently falls back to the global default (`INV`), which is
 * a different sequence family from the tenant's configured prefix.
 *
 * Returns an explicit {@link PrefixFetchResult} so the caller can distinguish:
 *
 * - **Confirmed absence** (`status: 'ok'`, `prefixes: undefined`): The settings
 *   row does not exist, or exists with a null/undefined `document_prefixes`
 *   column. The global default is legitimate.
 * - **Valid configured prefixes** (`status: 'ok'`, `prefixes`): The settings
 *   row was read and `document_prefixes` is a valid object. Individual
 *   unconfigured families still fall back to defaults via `resolvePrefix`.
 * - **Error** (`status: 'error'`, `reason`): The read failed (network, RLS,
 *   tenant not ready) OR the `document_prefixes` data is malformed (non-object,
 *   invalid prefix values). The caller MUST abort document creation.
 *
 * Malformed data is NOT treated as confirmed absence. A string, array, number,
 * or object with invalid prefix values indicates data corruption and must
 * abort — it must never silently fall back to `INV`/`QTN`.
 */
export async function fetchDocumentPrefixesSafe(
  tenantClient: TenantClient,
): Promise<PrefixFetchResult> {
  try {
    if (!tenantClient || !tenantClient.isReady) {
      return { status: 'error', reason: 'Tenant context is not ready.' }
    }
    const { data, error } = await tenantClient
      .from('settings')
      .select('document_prefixes')
      .limit(1)
      .single()
    if (error) {
      return {
        status: 'error',
        reason: `Could not read document numbering settings: ${error.message || error.code || 'unknown error'}`,
      }
    }
    if (!data) {
      // No settings row exists at all. Per the established missing-row
      // policy, a tenant with no settings row is allowed to use the global
      // default. This is a confirmed absence, not a failure.
      return { status: 'ok', prefixes: undefined }
    }
    const raw = (data as { document_prefixes?: unknown })?.document_prefixes
    const validation = validatePrefixes(raw)
    if (validation.status === 'error') {
      return { status: 'error', reason: validation.reason }
    }
    return { status: 'ok', prefixes: validation.prefixes }
  } catch (err) {
    return {
      status: 'error',
      reason: `Document numbering settings read failed: ${err instanceof Error ? err.message : 'unexpected error'}`,
    }
  }
}

/**
 * Reads the tenant's configured `settings.document_prefixes` map.
 *
 * @deprecated Use {@link fetchDocumentPrefixesSafe} instead. This function
 *   collapses every failure into `undefined`, which causes `resolvePrefix`
 *   to silently fall back to the global default. It is retained for
 *   callers that have not yet been updated to handle the explicit result
 *   type (e.g. the cursor-advance path, where a failed read is
 *   non-critical).
 */
export async function fetchDocumentPrefixes(
  tenantClient: TenantClient,
): Promise<Record<string, string> | undefined> {
  try {
    const { data, error } = await tenantClient
      .from('settings')
      .select('document_prefixes')
      .limit(1)
      .single()
    if (error || !data) return undefined
    const raw = (data as { document_prefixes?: unknown })?.document_prefixes
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
    return raw as Record<string, string>
  } catch {
    return undefined
  }
}

export async function fetchAutoCursor(
  tenantClient: TenantClient,
  family: string,
): Promise<number | undefined> {
  try {
    const { data, error } = await tenantClient
      .from('settings')
      .select('document_prefixes')
      .limit(1)
      .single()
    if (error || !data) return undefined
    return readAutoCursor((data as { document_prefixes?: unknown })?.document_prefixes, family)
  } catch {
    return undefined
  }
}

/**
 * Records automatic allocation progress. Monotonic and best-effort:
 * failures warn and never block the document creation they follow.
 */
export async function advanceAutoCursor(
  tenantClient: TenantClient,
  family: string,
  usedSeq: number,
): Promise<void> {
  try {
    const { data, error } = await tenantClient
      .from('settings')
      .select('id, document_prefixes')
      .limit(1)
      .single()
    if (error || !data) return
    const row = data as { id?: unknown; document_prefixes?: unknown }
    if (row.id === undefined || row.id === null) return
    const merged = mergeAutoCursor(row.document_prefixes, family, usedSeq + 1)
    const { error: updateError } = await (tenantClient.from('settings') as any)
      .update({ document_prefixes: merged })
      .eq('id', row.id)
    if (updateError) {
      console.warn('[numbering] cursor bump failed:', updateError.message)
    }
  } catch (err) {
    console.warn('[numbering] cursor bump failed:', err instanceof Error ? err.message : err)
  }
}
