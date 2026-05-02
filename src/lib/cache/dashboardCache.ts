export type DashboardCacheData = {
  recentDocs: any[]
  recentProjects: any[]
  priorityItems: any[]
  heroStats: any
  summary: any
}

export type DashboardCacheEntry = {
  data: DashboardCacheData
  fetchedAt: number
  version: 1
}

const DASHBOARD_CACHE_VERSION = 1

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function readDashboardCache(key: string): DashboardCacheEntry | null {
  if (!canUseStorage()) return null

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<DashboardCacheEntry>
    if (!parsed || parsed.version !== DASHBOARD_CACHE_VERSION) return null
    if (!parsed.data || typeof parsed.fetchedAt !== "number") return null

    return {
      data: parsed.data as DashboardCacheData,
      fetchedAt: parsed.fetchedAt,
      version: DASHBOARD_CACHE_VERSION,
    }
  } catch {
    return null
  }
}

export function writeDashboardCache(
  key: string,
  data: DashboardCacheData,
): DashboardCacheEntry | null {
  if (!canUseStorage()) return null

  const entry: DashboardCacheEntry = {
    data,
    fetchedAt: Date.now(),
    version: DASHBOARD_CACHE_VERSION,
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(entry))
    return entry
  } catch {
    return null
  }
}

export function isDashboardCacheFresh(
  entry: DashboardCacheEntry | null | undefined,
  ttlMs: number,
): boolean {
  if (!entry) return false
  return Date.now() - entry.fetchedAt < ttlMs
}

export function invalidateDashboardCache(key: string) {
  if (!canUseStorage()) return

  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage cleanup failures.
  }
}
