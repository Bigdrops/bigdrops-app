// Entity-keyed settings cache primitives (no React, no Supabase imports,
// so this module stays unit-testable and cannot leak tenant context).
//
// Every entry is namespaced by tenant schema name. A null key means "no
// usable tenant context" — it never reads another entity's entry and never
// stores one. There is no cross-tenant fallback anywhere in this module.

export type SettingsCacheEntry = {
  key: string
  // any (not unknown): useSettings.js is untyped and its consumers rely on
  // the previous evolving-any inference. unknown would fail typecheck
  // across dozens of untouched settings consumers.
  data: Record<string, any>
}

type SettingsCacheListener = (entry: SettingsCacheEntry) => void

const entries = new Map<string, Record<string, any>>()
const listeners = new Set<SettingsCacheListener>()
const updatedAt = new Map<string, number>()

/** Derive the cache namespace for a tenant schema. Null = no context. */
export function settingsCacheKey(schemaName: string | null | undefined): string | null {
  return typeof schemaName === 'string' && schemaName ? schemaName : null
}

/** Read one entity's entry. Null key always misses. */
export function readSettingsEntry(key: string | null): Record<string, any> | undefined {
  if (!key) return undefined
  return entries.get(key)
}

/** Store one entity's entry and notify subscribers. Null key is refused. */
export function writeSettingsEntry(key: string | null, data: Record<string, any>): void {
  if (!key) return
  entries.set(key, data)
  listeners.forEach((fn) => fn({ key, data }))
}

export function subscribeSettingsEntries(fn: SettingsCacheListener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** True only when the broadcast entry belongs to the active tenant key. */
export function isEntryForKey(entry: SettingsCacheEntry, activeKey: string | null): boolean {
  return !!activeKey && entry.key === activeKey
}

export function getSettingsUpdatedAt(key: string | null): number {
  if (!key) return 0
  return updatedAt.get(key) || 0
}

export function touchSettingsUpdatedAt(key: string | null, value: number): void {
  if (!key) return
  updatedAt.set(key, value)
}

/** Test/support hook: drop all entries. Never called in production paths. */
export function clearSettingsEntries(): void {
  entries.clear()
  updatedAt.clear()
}
