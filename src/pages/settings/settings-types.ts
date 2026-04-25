import type { Session } from '@supabase/supabase-js'

export type SettingsToastFn = (message: string) => void

export type SettingsSession = Session | null
