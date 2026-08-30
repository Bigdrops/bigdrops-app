import { createContext, useContext, type ReactNode } from 'react'
import type { UserThemePreference } from '@/hooks/useUserThemePreferences'

export type ThemePreferenceContextValue = {
  preference: UserThemePreference
  loading: boolean
  save: (updates: Partial<UserThemePreference>) => Promise<void>
  refresh: () => Promise<void>
}

export const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null)

export function ThemePreferenceProvider({
  value,
  children,
}: {
  value: ThemePreferenceContextValue
  children: ReactNode
}) {
  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  )
}

export function useThemePreferenceContext(): ThemePreferenceContextValue {
  const ctx = useContext(ThemePreferenceContext)
  if (!ctx) {
    throw new Error(
      'useThemePreferenceContext must be used within a ThemePreferenceProvider. ' +
      'The provider is mounted in AppShell.',
    )
  }
  return ctx
}
