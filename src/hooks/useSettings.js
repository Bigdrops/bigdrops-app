import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useSafeAsyncTask } from './useSafeAsyncTask'

let cachedSettings = null
let listeners = []
let lastLocalUpdateAt = 0

export async function fetchSettings() {
  const requestStartedAt = Date.now()
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
  if (lastLocalUpdateAt > requestStartedAt) {
    return cachedSettings || {}
  }
  cachedSettings = data || {}
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
      void runLatest(fetchSettings, {
        onSuccess: (nextSettings) => setSettings(nextSettings),
        onError: () => setSettings({}),
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
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function saveSettings(updates) {
  // Always upsert with id=1. If RLS blocks this, you need to run the SQL below in Supabase.
  const previousSettings = cachedSettings || {}
  const nextSettings = { ...previousSettings, ...updates }
  lastLocalUpdateAt = Date.now()
  cachedSettings = nextSettings
  listeners.forEach(fn => fn(cachedSettings))

  const { error } = await supabase
    .from('settings')
    .upsert({ id: 1, ...updates }, { onConflict: 'id' })
  if (error) {
    cachedSettings = previousSettings
    listeners.forEach(fn => fn(cachedSettings))
    throw error
  }
}
