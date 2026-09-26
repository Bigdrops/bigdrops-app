import type { TenantClient } from '@/lib/tenantClient'

import { mergeAutoCursor, readAutoCursor } from '@/domain/prefixConstants'

/**
 * Persistence protocol for automatic number cursors (see the prefix-engine
 * standard §5). Cursors live in `settings.document_prefixes.__auto_seq`.
 * They are advisory: the uniqueness constraint plus skip-scan over
 * ground-truth rows arbitrate every allocation, so stale or missing
 * cursors cost retries at most, never duplicates.
 */

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
