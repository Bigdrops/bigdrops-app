import { useSyncExternalStore } from 'react'

export type UiSoundSettings = {
  enabled: boolean
  /** 0–1 master volume multiplier. */
  volume: number
}

const STORAGE_KEY = 'bd-ui-sound'
const DEFAULT_SETTINGS: UiSoundSettings = { enabled: true, volume: 0.35 }

function clampVolume(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.volume
  return Math.min(1, Math.max(0, n))
}

function readStored(): UiSoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS
    const record = parsed as Record<string, unknown>
    return {
      enabled: record.enabled !== false,
      volume: clampVolume(record.volume),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function writeStored(settings: UiSoundSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // private mode / full storage: keep in-memory value
  }
}

let state: UiSoundSettings = readStored()
const listeners = new Set<() => void>()

export function getUiSoundSettings(): UiSoundSettings {
  return state
}

export function setUiSoundSettings(next: UiSoundSettings): void {
  state = {
    enabled: next.enabled,
    volume: clampVolume(next.volume),
  }
  writeStored(state)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useUiSoundSettings(): UiSoundSettings {
  return useSyncExternalStore(subscribe, getUiSoundSettings, () => DEFAULT_SETTINGS)
}
