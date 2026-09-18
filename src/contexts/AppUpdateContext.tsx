import { createContext, useContext, type ReactNode } from 'react'
import type { UseAppUpdateResult } from '@/hooks/useAppUpdate'

const Ctx = createContext<UseAppUpdateResult | null>(null)

export function AppUpdateProvider({ value, children }: { value: UseAppUpdateResult; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppUpdateContext(): UseAppUpdateResult {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppUpdateContext: no provider')
  return v
}
