import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useSafeAsyncTask } from './useSafeAsyncTask'

let cachedSettings = null
let listeners = []
let lastLocalUpdateAt = 0
const THEME_KEYS = ['app_theme_preset_id', 'app_background_color', 'app_card_color', 'app_theme_tokens']
const LOCAL_THEME_GRACE_MS = 6000
const unsupportedSettingsColumns = new Set()

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeThemeTokens(value) {
  if (value == null) return null
  if (isPlainObject(value)) return value
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed)
    return isPlainObject(parsed) ? parsed : null
  } catch {
    return null
  }
}

function normalizeThemeSettings(settings) {
  if (!settings || typeof settings !== 'object') return {}

  return {
    ...settings,
    app_theme_preset_id:
      typeof settings.app_theme_preset_id === 'string' ? settings.app_theme_preset_id : null,
    app_background_color:
      typeof settings.app_background_color === 'string' ? settings.app_background_color : null,
    app_card_color:
      typeof settings.app_card_color === 'string' ? settings.app_card_color : null,
    app_theme_tokens: normalizeThemeTokens(settings.app_theme_tokens),
  }
}

function getErrorText(error) {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object') {
    if (typeof error.message === 'string') return error.message
    if (typeof error.error_description === 'string') return error.error_description
    if (typeof error.details === 'string') return error.details
    if (typeof error.hint === 'string') return error.hint
  }
  return ''
}

function shouldRetryWithoutColumn(error, column) {
  const text = getErrorText(error).toLowerCase()
  if (!text) return false

  return (
    text.includes(column.toLowerCase()) &&
    (text.includes('does not exist') ||
      text.includes('could not find the') ||
      text.includes('schema cache') ||
      text.includes('invalid input syntax') ||
      text.includes('type'))
  )
}

function getPersistableUpdates(updates) {
  const nextUpdates = { ...updates }

  if (nextUpdates.app_theme_tokens != null) {
    nextUpdates.app_theme_tokens = normalizeThemeTokens(nextUpdates.app_theme_tokens)
  }

  for (const column of unsupportedSettingsColumns) {
    delete nextUpdates[column]
  }

  return nextUpdates
}

async function persistSettings(updates) {
  const persistableUpdates = getPersistableUpdates(updates)
  console.log('[useSettings] Persisting updates to DB:', persistableUpdates)

  const { error } = await supabase
    .from('settings')
    .upsert({ id: 1, ...persistableUpdates }, { onConflict: 'id' })

  if (!error) {
    console.log('[useSettings] Persistence successful')
    return
  }

  console.error('[useSettings] Persistence error:', error)

  if ('app_theme_tokens' in persistableUpdates && shouldRetryWithoutColumn(error, 'app_theme_tokens')) {
    console.warn('[useSettings] Retrying persistence without app_theme_tokens')
    unsupportedSettingsColumns.add('app_theme_tokens')
    const fallbackUpdates = { ...persistableUpdates }
    delete fallbackUpdates.app_theme_tokens
    const retry = await supabase
      .from('settings')
      .upsert({ id: 1, ...fallbackUpdates }, { onConflict: 'id' })
    if (!retry.error) return
    throw retry.error
  }

  throw error
}

export async function fetchSettings(options = {}) {
  const { force = false } = options
  const requestStartedAt = Date.now()
  console.log('[useSettings] Fetching settings from DB (force:', force, ')')
  
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single()
  
  if (error) {
    console.error('[useSettings] Fetch error:', error)
  } else {
    console.log('[useSettings] Fetch success, data:', data)
  }

  if (!force && lastLocalUpdateAt > requestStartedAt) {
    console.log('[useSettings] Returning cached settings due to recent local update')
    return cachedSettings || {}
  }
  
  const nextData = normalizeThemeSettings(data || {})
  
  // Standardize on company_logo_url, migrating logo_url if it exists in the data
  if (nextData.logo_url && !nextData.company_logo_url) {
    console.log('[useSettings] Migrating logo_url to company_logo_url')
    nextData.company_logo_url = nextData.logo_url
  }
  delete nextData.logo_url

  const hasLocalTheme = THEME_KEYS.some((key) => cachedSettings?.[key] != null)
  const withinThemeGrace = Date.now() - lastLocalUpdateAt < LOCAL_THEME_GRACE_MS
  const merged = { ...nextData }

  if (!force && cachedSettings && (hasLocalTheme || withinThemeGrace)) {
    THEME_KEYS.forEach((key) => {
      const cachedValue = cachedSettings?.[key]
      const incomingValue = nextData?.[key]
      if (cachedValue != null && (incomingValue == null || withinThemeGrace)) {
        merged[key] = cachedValue
      }
    })
  }

  cachedSettings = normalizeThemeSettings(merged)
  listeners.forEach(fn => fn(cachedSettings))
  return cachedSettings
}

export function useSettings() {
  const [settings, setSettings] = useState(cachedSettings || {})
  const [loading, setLoading] = useState(!cachedSettings)
  const { runLatest, cancel } = useSafeAsyncTask()

  useEffect(() => {
    listeners.push(setSettings)
    if (cachedSettings) {
      setSettings(cachedSettings)
      setLoading(false)
    } else {
      void runLatest(() => fetchSettings(), {
        onSuccess: (nextSettings) => setSettings(nextSettings),
        onError: () => setSettings(cachedSettings || {}),
        onSettled: () => setLoading(false),
      })
    }

    return () => {
      cancel()
      listeners = listeners.filter(fn => fn !== setSettings)
    }
  }, [runLatest, cancel])

  return { settings, loading }
}

export async function uploadFile(bucket, path, file) {
  console.log(`[useSettings] Starting upload...`)
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) {
    console.error('[useSettings] Upload error:', error)
    throw error
  }
  console.log('[useSettings] Upload success, fetching public URL')
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  
  if (!data?.publicUrl) {
    console.error('[useSettings] Failed to get public URL for path:', path)
    throw new Error('Failed to get public URL')
  }
  
  console.log('[useSettings] Public URL:', data.publicUrl)
  return data.publicUrl
}

export async function saveSettings(updates) {
  console.log('[useSettings] saveSettings called with:', updates)
  const previousSettings = cachedSettings || {}
  const nextSettings = normalizeThemeSettings({ ...previousSettings, ...updates })
  
  lastLocalUpdateAt = Date.now()
  cachedSettings = nextSettings
  listeners.forEach(fn => fn(cachedSettings))

  try {
    await persistSettings(updates)
    console.log('[useSettings] saveSettings: Persistence successful')
  } catch (error) {
    console.error('[useSettings] saveSettings: Persistence failed, reverting cache:', error)
    cachedSettings = previousSettings
    listeners.forEach(fn => fn(cachedSettings))
    throw error
  }
}
