export type ListCacheEntry<T> = {
  rows: T[]
  fetchedAt: number
  version: 1
  meta?: Record<string, unknown>
}

const LIST_CACHE_VERSION = 1

/**
 * Entity-scoped cache key for the Client List.
 * Each active entity/schema gets its own entry; entities never share rows.
 */
export function clientListCacheKey(schemaName: string): string {
  return `bd:list:clients:v1:${schemaName}`
}

/**
 * Entity-scoped cache key for the Item Library summary list.
 * A null key means no usable tenant context — callers must not read or
 * write any entry (fail-closed). The previous global key
 * ("bd:item-library:summary:v1") is deliberately abandoned: it served one
 * entity's rows under every other entity.
 */
export function itemLibraryCacheKey(schemaName: string | null | undefined): string | null {
  return typeof schemaName === 'string' && schemaName ? `bd:list:item-library:v1:${schemaName}` : null
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function readListCache<T>(key: string): ListCacheEntry<T> | null {
  if (!canUseStorage()) return null

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<ListCacheEntry<T>>
    if (!parsed || parsed.version !== LIST_CACHE_VERSION) return null
    if (!Array.isArray(parsed.rows) || typeof parsed.fetchedAt !== "number") return null

    return {
      rows: parsed.rows,
      fetchedAt: parsed.fetchedAt,
      version: LIST_CACHE_VERSION,
      meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : undefined,
    }
  } catch {
    return null
  }
}

export function writeListCache<T>(
  key: string,
  rows: T[],
  meta?: Record<string, unknown>,
): ListCacheEntry<T> | null {
  if (!canUseStorage()) return null

  const entry: ListCacheEntry<T> = {
    rows,
    fetchedAt: Date.now(),
    version: LIST_CACHE_VERSION,
    ...(meta ? { meta } : {}),
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(entry))
    return entry
  } catch {
    return null
  }
}

export function isListCacheFresh<T>(
  entry: ListCacheEntry<T> | null | undefined,
  ttlMs: number,
): boolean {
  if (!entry) return false
  return Date.now() - entry.fetchedAt < ttlMs
}

export function invalidateListCache(key: string) {
  if (!canUseStorage()) return

  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage cleanup failures.
  }
}
