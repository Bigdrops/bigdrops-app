export interface ErrorRegistryEntry {
  id: string
  timestamp: number
  route: string
  title: string
  diagnostic: string
}

const MAX_ENTRIES = 200
const STORAGE_KEY = 'bd-error-registry'

let entries: ErrorRegistryEntry[] = []
let hydrated = false

function hydrate(): void {
  if (hydrated) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        entries = parsed.slice(0, MAX_ENTRIES)
      }
    }
  } catch {
    /* ignore corrupt data */
  }
  hydrated = true
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    /* storage full — silently drop */
  }
}

function generateId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const errorRegistry = {
  add(title: string, diagnostic: string): string {
    hydrate()
    const entry: ErrorRegistryEntry = {
      id: generateId(),
      timestamp: Date.now(),
      route: window.location.pathname,
      title,
      diagnostic,
    }
    entries.unshift(entry)
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(0, MAX_ENTRIES)
    }
    persist()
    return entry.id
  },

  getAll(): ErrorRegistryEntry[] {
    hydrate()
    return [...entries]
  },

  getById(id: string): ErrorRegistryEntry | undefined {
    hydrate()
    return entries.find((e) => e.id === id)
  },

  clear(): void {
    entries = []
    persist()
  },
}
