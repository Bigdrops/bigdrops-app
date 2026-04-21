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
    if (column in nextUpdates) {
      console.warn(`>>> [useSettings:persistSettings] STRIPPING unsupported column: ${column}`)
      delete nextUpdates[column]
    }
  }

  return nextUpdates
}

async function persistSettings(updates) {
  const persistableUpdates = getPersistableUpdates(updates)
  
  // If we are saving company_logo_url, we also try to CLEAR the legacy logo_url column
  // to avoid ghost migrations on next refresh.
  // CRITICAL: We only do this if logo_url is NOT already marked as unsupported to avoid infinite retry loops.
  const shouldClearLegacyLogo = 
    'company_logo_url' in persistableUpdates && 
    !('logo_url' in persistableUpdates) && 
    !unsupportedSettingsColumns.has('logo_url')

  if (shouldClearLegacyLogo) {
    persistableUpdates.logo_url = null
  }

  const finalPayload = { id: 1, ...persistableUpdates }
  console.log('>>> [useSettings:persistSettings] FINAL PAYLOAD:', JSON.stringify(finalPayload, null, 2))

  const { data: upsertData, error, status, statusText } = await supabase
    .from('settings')
    .upsert(finalPayload, { onConflict: 'id' })
    .select()

  console.log('>>> [useSettings:persistSettings] SUPABASE RESPONSE:', {
    status,
    statusText,
    data: upsertData,
    error: error ? {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    } : null
  })

  if (!error) {
    if (!upsertData || upsertData.length === 0) {
      console.error('>>> [useSettings:persistSettings] CRITICAL FAILURE: Upsert returned SUCCESS status but ZERO rows.', {
        status,
        statusText,
        payload: finalPayload
      })
      throw new Error('Database persistence failed: Success reported but no rows were updated. Check RLS policies.')
    }
    console.log('>>> [useSettings:persistSettings] VERIFIED SUCCESS:', upsertData[0])
    return
  }

  console.error('[useSettings] Persistence error:', error)

  // Retry logic for missing columns
  const retryColumns = ['app_theme_tokens', 'logo_url']
  for (const column of retryColumns) {
    if (column in persistableUpdates && shouldRetryWithoutColumn(error, column)) {
      console.warn(`[useSettings] Retrying persistence without ${column}`)
      unsupportedSettingsColumns.add(column)
      const fallbackUpdates = { ...persistableUpdates }
      delete fallbackUpdates[column]
      
      try {
        await persistSettings(fallbackUpdates)
        return
      } catch (retryError) {
        throw retryError
      }
    }
  }

  throw error
}

export function normalizeSettings(data) {
  if (!data || typeof data !== 'object') return {}
  console.log('[useSettings] Normalizing raw settings data:', data)
  const nextData = normalizeThemeSettings(data)

  /**
   * LEGACY COMPATIBILITY SHIM (logo_url -> company_logo_url)
   * This is the ONLY place in the app where 'logo_url' should be referenced.
   * We migrate it to the canonical 'company_logo_url' field.
   * We only migrate if company_logo_url is null or missing, ensuring an empty string (intended removal) is respected.
   */
  const hasLegacyLogo = nextData.logo_url && String(nextData.logo_url).trim().length > 0
  const hasCompanyLogo = nextData.company_logo_url !== null && nextData.company_logo_url !== undefined
  
  if (hasLegacyLogo && !hasCompanyLogo) {
    console.log('[useSettings] Migrating legacy logo_url to company_logo_url:', nextData.logo_url)
    nextData.company_logo_url = nextData.logo_url
  }
  
  // ALWAYS discard logo_url to prevent it from leaking into the app state or back into DB during save
  if ('logo_url' in nextData) {
    console.log('[useSettings] Discarding legacy logo_url field from app state')
    delete nextData.logo_url
  }
  
  console.log('[useSettings] Final normalized settings:', nextData)
  return nextData
}

export async function fetchSettings(options = {}) {
  const { force = false } = options
  const requestStartedAt = Date.now()
  console.log('[useSettings] fetchSettings start (force:', force, ')')
  
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single()
  
  if (error) {
    console.error('[useSettings] Fetch error from Supabase:', error)
  } else {
    console.log('[useSettings] Fetch success from Supabase, raw data:', data)
  }

  if (!force && lastLocalUpdateAt > requestStartedAt) {
    console.log('[useSettings] Returning cached settings due to recent local update (Cache wins over Stale Fetch)')
    return cachedSettings || {}
  }
  
  const nextData = normalizeSettings(data || {})

  const hasLocalTheme = THEME_KEYS.some((key) => cachedSettings?.[key] != null)
  const withinThemeGrace = Date.now() - lastLocalUpdateAt < LOCAL_THEME_GRACE_MS
  const merged = { ...nextData }

  if (!force && cachedSettings && (hasLocalTheme || withinThemeGrace)) {
    console.log('[useSettings] Merging local theme/grace settings into fetched data')
    THEME_KEYS.forEach((key) => {
      const cachedValue = cachedSettings?.[key]
      const incomingValue = nextData?.[key]
      if (cachedValue != null && (incomingValue == null || withinThemeGrace)) {
        merged[key] = cachedValue
      }
    })
  }

  cachedSettings = normalizeThemeSettings(merged)
  console.log('[useSettings] Update listeners with:', cachedSettings)
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
  console.log('>>> [useSettings:saveSettings] START:', JSON.stringify(updates, null, 2))
  const previousSettings = cachedSettings || {}
  
  // We NO LONGER update the cache before persistence (Optimistic UI disabled for better debugging)
  // We will update it only after persistSettings succeeds.

  try {
    console.log('>>> [useSettings:saveSettings] Attempting persistence...')
    await persistSettings(updates)
    console.log('>>> [useSettings:saveSettings] Persistence confirmed. Updating local state.')
    
    const nextSettings = normalizeSettings({ ...previousSettings, ...updates })
    lastLocalUpdateAt = Date.now()
    cachedSettings = nextSettings
    listeners.forEach(fn => fn(cachedSettings))
    
    return cachedSettings
  } catch (error) {
    console.error('>>> [useSettings:saveSettings] FAILURE:', error)
    // No need to revert cachedSettings as we didn't update it yet
    throw error
  }
}
