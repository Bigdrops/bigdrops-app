export type SettingsToastFn = (message: string) => void

export type SettingsSession = {
  user?: {
    id?: string
    email?: string
  }
} | null
