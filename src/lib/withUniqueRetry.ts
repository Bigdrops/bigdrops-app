import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Wraps a Supabase insert/upsert with automatic retry on unique constraint violations.
 *
 * Identity contract: a caller-supplied `initialValue` is a USER-SUPPLIED
 * identifier and is authoritative. If it collides (23505), the duplicate
 * error is returned immediately — it is NEVER silently replaced with an
 * automatically generated value. Automatic retry applies only to
 * SYSTEM-GENERATED candidates produced by `regenerateValue()`.
 * On any other error, returns immediately without retry.
 */
export async function withUniqueRetry<T>(
  insertFn: (candidateValue: string) => Promise<{ data: T | null; error: PostgrestError | null }>,
  regenerateValue: () => Promise<string>,
  initialValue?: string,
  maxRetries = 3,
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const hasManualCandidate = initialValue !== undefined && initialValue !== ''
  let candidate = hasManualCandidate ? initialValue : await regenerateValue()

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await insertFn(candidate)

    if (!result.error) {
      return result
    }

    if (result.error.code === '23505') {
      // Manual identifiers are authoritative: surface the duplicate error.
      if (hasManualCandidate) {
        return result
      }
      if (attempt < maxRetries) {
        candidate = await regenerateValue()
        continue
      }
    }

    return result
  }

  return { data: null, error: null as unknown as PostgrestError }
}
