import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/supabase'
import type { ThemePresetId, ThemeMode } from '@/lib/themePresets'
import { isThemePresetId } from '@/lib/themePresets'
import { useSafeAsyncTask } from './useSafeAsyncTask'

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export type UserThemePreference = {
  themePresetId: ThemePresetId | null
  themeMode: 'light' | 'dark' | 'system'
}

// ────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────

const DEFAULT_PREFERENCE: UserThemePreference = {
  themePresetId: 'slate-navy',
  themeMode: 'system',
}

const LOCAL_STORAGE_PREFIX = 'bigdrops_user_theme_'
const LOCAL_STORAGE_GRACE_MS = 3000

// ────────────────────────────────────────────────────────────────────
// Helpers — user-scoped localStorage
// ────────────────────────────────────────────────────────────────────

function localStorageKey(userId: string): string {
  return `${LOCAL_STORAGE_PREFIX}${userId}`
}

function readLocalCache(userId: string): UserThemePreference | null {
  try {
    const raw = localStorage.getItem(localStorageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const presetId = parsed.themePresetId
      const mode = parsed.themeMode
      return {
        themePresetId: isThemePresetId(presetId) ? presetId : null,
        themeMode: (mode === 'light' || mode === 'dark' || mode === 'system') ? mode : 'system',
      }
    }
  } catch {
    // corrupted cache — ignore
  }
  return null
}

function writeLocalCache(userId: string, pref: UserThemePreference): void {
  try {
    localStorage.setItem(localStorageKey(userId), JSON.stringify(pref))
  } catch {
    // localStorage full or unavailable — ignore
  }
}

function removeLocalCache(userId: string): void {
  try {
    localStorage.removeItem(localStorageKey(userId))
  } catch {
    // ignore
  }
}

/**
 * Remove any stale theme caches from OTHER users to prevent cross-user
 * leakage on shared devices. This is a best-effort cleanup on login.
 */
export function cleanupStaleThemeCaches(currentUserIds: string[]): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(LOCAL_STORAGE_PREFIX)) {
        const cachedUserId = key.slice(LOCAL_STORAGE_PREFIX.length)
        if (!currentUserIds.includes(cachedUserId)) {
          keysToRemove.push(key)
        }
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    // ignore
  }
}

// ────────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────────

/**
 * User-scoped theme preference hook.
 *
 * Reads from the `user_preferences` table (public schema, RLS-scoped by user_id).
 * Uses user-scoped localStorage as a fast startup cache.
 *
 * The authoritative source is always the database.
 * localStorage is a performance cache that can never cause cross-user leakage
 * because it is keyed by user ID.
 */
export function useUserThemePreferences(userId: string | undefined | null) {
  const [preference, setPreference] = useState<UserThemePreference>(DEFAULT_PREFERENCE)
  const [loading, setLoading] = useState(Boolean(userId))
  // Use a ref for lastWriteAt instead of state to avoid triggering
  // unnecessary re-fetches when the write timestamp changes.
  const lastWriteAtRef = useRef(0)
  const { runLatest, cancel } = useSafeAsyncTask()
  const mountedRef = useRef(true)

  // Fetch from database, merge with local cache
  const refresh = useCallback(async () => {
    if (!userId) {
      setPreference(DEFAULT_PREFERENCE)
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('user_preferences')
      .select('theme_preset_id, theme_mode')
      .eq('user_id', userId)
      .single()

    if (!mountedRef.current) return

    if (error || !data) {
      // No row exists yet — use local cache or default
      const cached = readLocalCache(userId)
      setPreference(cached ?? DEFAULT_PREFERENCE)
      setLoading(false)
      return
    }

    const dbPresetId = data.theme_preset_id
    const dbMode = data.theme_mode
    const dbPref: UserThemePreference = {
      themePresetId: isThemePresetId(dbPresetId) ? dbPresetId : null,
      themeMode: (dbMode === 'light' || dbMode === 'dark' || dbMode === 'system') ? dbMode : 'system',
    }

    // Merge: if a local write happened very recently, prefer it
    // (avoids flicker when DB read is slightly behind a recent save)
    const cached = readLocalCache(userId)
    if (cached && Date.now() - lastWriteAtRef.current < LOCAL_STORAGE_GRACE_MS) {
      setPreference(cached)
    } else {
      setPreference(dbPref)
      writeLocalCache(userId, dbPref)
    }

    setLoading(false)
  }, [userId])

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true
    void runLatest(refresh, {
      onSuccess: () => {},
      onError: () => setLoading(false),
    })
    return () => {
      mountedRef.current = false
      cancel()
    }
  }, [runLatest, cancel, refresh])

  // Save preference to database + local cache
  const save = useCallback(
    async (updates: Partial<UserThemePreference>) => {
      if (!userId) return

      const nextPref: UserThemePreference = {
        ...preference,
        ...updates,
      }

      // Optimistic local update
      setPreference(nextPref)
      writeLocalCache(userId, nextPref)
      lastWriteAtRef.current = Date.now()

      // Persist to database
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: userId,
            theme_preset_id: nextPref.themePresetId,
            theme_mode: nextPref.themeMode,
          },
          { onConflict: 'user_id' },
        )

      if (error) {
        console.error('[useUserThemePreferences] Save failed:', error)
        // Don't revert optimistic update — the local cache is still valid
        // and the next refresh will reconcile
      }
    },
    [userId, preference],
  )

  return {
    preference,
    loading,
    save,
    refresh,
  }
}
