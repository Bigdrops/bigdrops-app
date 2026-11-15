import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useEntity, useAuthorization } from '@/lib/tenant/contexts'
import { buildBoluPageContext, type BoluLauncherSource } from '@/lib/ai-assistant/bolu-context'
import { createBoluRuntime, type BoluRuntimeState } from '@/lib/ai-assistant/bolu-runtime'
import { sendBoluProviderRequest } from '@/lib/ai-assistant/bolu-transport'
import { BoluChatWorkspace } from '@/components/ai-assistant/chat'
import { BoluFloatingActionButton } from '@/components/ai-assistant/BoluFloatingActionButton'
import { useLocation } from 'react-router-dom'

export interface BoluAssistantContextValue {
  open: (launcher?: BoluLauncherSource) => void
  isOpen: boolean
  close: () => void
  runtime: ReturnType<typeof createBoluRuntime>
  state: BoluRuntimeState | null
}

const BoluContext = createContext<BoluAssistantContextValue | null>(null)

export function BoluAssistantProvider({ children }: { children: ReactNode }) {
  const { tenantClient, entity } = useEntity()
  const { hasAuthorization } = useAuthorization()
  const location = useLocation()
  const previousPathname = useRef(location.pathname)
  const [open, setOpen] = useState(false)
  const authorizationRef = useRef(hasAuthorization)
  authorizationRef.current = hasAuthorization
  const entityId = entity?.id ?? null
  const runtime = useMemo(() => createBoluRuntime({
    tenantClient,
    entityId,
    canRead: (resource, action) => authorizationRef.current(resource, action),
    canWrite: (resource, action) => authorizationRef.current(resource, action),
    providerAvailable: true,
    providerSend: sendBoluProviderRequest,
  }), [tenantClient.schemaName, entityId])
  const state = useSyncExternalStore(
    runtime.subscribe,
    runtime.getState,
    runtime.getState,
  )

  const summon = useCallback((launcher: BoluLauncherSource = 'contextual') => {
    const context = buildBoluPageContext(window.location.pathname, launcher)
    runtime.open(context)
    setOpen(true)
  }, [runtime])

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    if (previousPathname.current === location.pathname) return
    previousPathname.current = location.pathname
    if (open) runtime.open(buildBoluPageContext(location.pathname, 'contextual'))
  }, [location.pathname, open, runtime])

  const value = useMemo(() => ({
    open: summon,
    isOpen: open,
    close,
    runtime,
    state,
  }), [summon, open, close, runtime, state])

  return (
    <BoluContext.Provider value={value}>
      {children}
      <BoluFloatingActionButton />
      <BoluChatWorkspace
        open={open}
        onClose={close}
        tenantId={entity?.id}
        pageContext={buildBoluPageContext(location.pathname, 'contextual')}
      />
    </BoluContext.Provider>
  )
}

export function useBoluAssistant() {
  const context = useContext(BoluContext)
  if (!context) throw new Error('useBoluAssistant must be used within BoluAssistantProvider')
  return context
}
