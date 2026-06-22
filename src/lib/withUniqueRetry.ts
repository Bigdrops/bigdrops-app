import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Wraps a Supabase insert/upsert with automatic retry on unique constraint violations.
 * On error 23505, regenerates the candidate number and retries up to maxRetries times.
 * On any other error, returns immediately without retry.
 */
export async function withUniqueRetry<T>(
  insertFn: (candidateValue: string) => Promise<{ data: T | null; error: PostgrestError | null }>,
  regenerateValue: () => Promise<string>,
  initialValue?: string,
  maxRetries = 3,
): Promise<{ data: T | null; error: PostgrestError | null }> {
  let candidate = initialValue ?? await regenerateValue()

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await insertFn(candidate)

    if (!result.error) {
      return result
    }

    if (result.error.code === '23505') {
      if (attempt < maxRetries) {
        candidate = await regenerateValue()
        continue
      }
    }

    return result
  }

  return { data: null, error: null as unknown as PostgrestError }
}
