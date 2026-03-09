import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

let cachedSettings = null
let listeners = []

export async function fetchSettings() {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
  cachedSettings = data || {}
  listeners.forEach(fn => fn(cachedSettings))
  return cachedSettings
}

export function useSettings() {
  const [settings, setSettings] = useState(cachedSettings || {})
  const [loading, setLoading] = useState(!cachedSettings)

  useEffect(() => {
    if (cachedSettings) { setSettings(cachedSettings); setLoading(false); return }
    fetchSettings().then(s => { setSettings(s); setLoading(false) })
    listeners.push(setSettings)
    return () => { listeners = listeners.filter(fn => fn !== setSettings) }
  }, [])

  return { settings, loading }
}

export async function uploadFile(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function saveSettings(updates) {
  const { error } = await supabase.from('settings').upsert({ id: 1, ...updates })
  if (error) throw error
  cachedSettings = { ...(cachedSettings || {}), ...updates }
  listeners.forEach(fn => fn(cachedSettings))
}
