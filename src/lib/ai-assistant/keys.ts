import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'

import { AI_PROVIDER_ROWS } from './providerCatalog'

const KEYS_PATH = 'ai-assistant/keys.json'

/**
 * Keys live in an app private file on a native build. A browser build has no
 * private directory, so keys stay in memory for the session and are never
 * written to localStorage.
 */
let memoryKeys: Record<string, string> = {}

export function isPersistentKeyStoreAvailable(): boolean {
  return Capacitor.isNativePlatform()
}

async function readAll(): Promise<Record<string, string>> {
  if (!isPersistentKeyStoreAvailable()) return { ...memoryKeys }
  try {
    const result = await Filesystem.readFile({
      path: KEYS_PATH,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    const raw = typeof result.data === 'string' ? result.data : ''
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const keys: Record<string, string> = {}
    Object.entries(parsed as Record<string, unknown>).forEach(([id, value]) => {
      if (typeof value === 'string' && value) keys[id] = value
    })
    return keys
  } catch {
    return {}
  }
}

async function writeAll(keys: Record<string, string>): Promise<void> {
  memoryKeys = { ...keys }
  if (!isPersistentKeyStoreAvailable()) return
  await Filesystem.writeFile({
    path: KEYS_PATH,
    data: JSON.stringify(keys),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  })
}

export async function listConfiguredProviders(): Promise<string[]> {
  const keys = await readAll()
  return AI_PROVIDER_ROWS.filter((row) => Boolean(keys[row.id])).map((row) => row.id)
}

export async function hasAnyProviderKey(): Promise<boolean> {
  const keys = await readAll()
  return Object.values(keys).some(Boolean)
}

export async function getProviderKey(providerId: string): Promise<string | null> {
  const keys = await readAll()
  return keys[providerId] || null
}

export async function setProviderKey(providerId: string, key: string): Promise<void> {
  const trimmed = key.trim()
  if (!trimmed) return
  const keys = await readAll()
  keys[providerId] = trimmed
  await writeAll(keys)
}

export async function removeProviderKey(providerId: string): Promise<void> {
  const keys = await readAll()
  delete keys[providerId]
  await writeAll(keys)
}
