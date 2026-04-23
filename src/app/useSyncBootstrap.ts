import { useEffect, useRef } from 'react'

import { canUseAndroidNativeSqlite } from '@/lib/native/capacitor'

type RefreshOfflineAccessState = () => Promise<{
  allowed: boolean
}>

type RecoverAppState = (
  reason: string,
  options?: { force?: boolean },
) => Promise<void>

type DebugLog = (...args: unknown[]) => void

type UseSyncBootstrapArgs = {
  refreshOfflineAccessState: RefreshOfflineAccessState
  recoverAppState: RecoverAppState
  debug?: DebugLog
}

type SyncBootstrapApi = {
  runSyncBootstrap: (reason: string) => Promise<void>
}

let waybillSyncModulePromise: Promise<typeof import('@/lib/native/waybillSync')> | null = null
let csrSyncModulePromise: Promise<typeof import('@/lib/native/csrSync')> | null = null
let quotationSyncModulePromise: Promise<typeof import('@/lib/native/quotationSync')> | null = null

const loadWaybillSyncModule = () => {
  if (!waybillSyncModulePromise) {
    waybillSyncModulePromise = import('@/lib/native/waybillSync')
  }
  return waybillSyncModulePromise
}

const loadCsrSyncModule = () => {
  if (!csrSyncModulePromise) {
    csrSyncModulePromise = import('@/lib/native/csrSync')
  }
  return csrSyncModulePromise
}

const loadQuotationSyncModule = () => {
  if (!quotationSyncModulePromise) {
    quotationSyncModulePromise = import('@/lib/native/quotationSync')
  }
  return quotationSyncModulePromise
}

export function useSyncBootstrap({
  refreshOfflineAccessState,
  recoverAppState,
  debug,
}: UseSyncBootstrapArgs): SyncBootstrapApi {
  const refreshOfflineAccessStateRef = useRef(refreshOfflineAccessState)
  const recoverAppStateRef = useRef(recoverAppState)
  const debugRef = useRef<DebugLog | undefined>(debug)
  const hiddenAtRef = useRef<number | null>(null)
  const waybillSyncingRef = useRef(false)
  const csrSyncingRef = useRef(false)
  const quotationSyncingRef = useRef(false)

  useEffect(() => {
    refreshOfflineAccessStateRef.current = refreshOfflineAccessState
  }, [refreshOfflineAccessState])

  useEffect(() => {
    recoverAppStateRef.current = recoverAppState
  }, [recoverAppState])

  useEffect(() => {
    debugRef.current = debug
  }, [debug])

  const processOnePendingWaybillCreateSync = async (reason: string) => {
    if (!canUseAndroidNativeSqlite()) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    if (waybillSyncingRef.current) return

    waybillSyncingRef.current = true

    try {
      const { processNextPendingWaybillCreate } = await loadWaybillSyncModule()
      const result = await processNextPendingWaybillCreate()

      if (result.status === 'synced') {
        debugRef.current?.('waybillSync:oneShotSynced', {
          reason,
          queueItemId: result.queueItemId || null,
          localWaybillId: result.localWaybillId || null,
          remoteWaybillId: result.remoteWaybillId || null,
        })
      }

      if (result.status === 'failed') {
        console.warn('One-shot waybill sync failed:', {
          reason,
          queueItemId: result.queueItemId || null,
          localWaybillId: result.localWaybillId || null,
          error: result.error || null,
        })
      }
    } catch (error) {
      console.warn(`One-shot waybill sync crashed during ${reason}:`, error)
    } finally {
      waybillSyncingRef.current = false
    }
  }

  const processOnePendingCsrCreateSync = async (reason: string) => {
    if (!canUseAndroidNativeSqlite()) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    if (csrSyncingRef.current) return

    csrSyncingRef.current = true

    try {
      const { processNextPendingCsrCreate } = await loadCsrSyncModule()
      const result = await processNextPendingCsrCreate()

      if (result.status === 'synced') {
        debugRef.current?.('csrSync:oneShotSynced', {
          reason,
          queueItemId: result.queueItemId || null,
          localCsrId: result.localCsrId || null,
          remoteCsrId: result.remoteCsrId || null,
        })
      }

      if (result.status === 'failed') {
        console.warn('One-shot CSR sync failed:', {
          reason,
          queueItemId: result.queueItemId || null,
          localCsrId: result.localCsrId || null,
          error: result.error || null,
        })
      }
    } catch (error) {
      console.warn(`One-shot CSR sync crashed during ${reason}:`, error)
    } finally {
      csrSyncingRef.current = false
    }
  }

  const processOnePendingQuotationCreateSync = async (reason: string) => {
    if (!canUseAndroidNativeSqlite()) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    if (quotationSyncingRef.current) return

    quotationSyncingRef.current = true

    try {
      const { processNextPendingQuotationCreate } = await loadQuotationSyncModule()
      const result = await processNextPendingQuotationCreate()

      if (result.status === 'synced') {
        debugRef.current?.('quotationSync:oneShotSynced', {
          reason,
          queueItemId: result.queueItemId || null,
          localQuotationId: result.localQuotationId || null,
          remoteQuotationId: result.remoteQuotationId || null,
        })
      }

      if (result.status === 'failed') {
        console.warn('One-shot quotation sync failed:', {
          reason,
          queueItemId: result.queueItemId || null,
          localQuotationId: result.localQuotationId || null,
          error: result.error || null,
        })
      }
    } catch (error) {
      console.warn(`One-shot quotation sync crashed during ${reason}:`, error)
    } finally {
      quotationSyncingRef.current = false
    }
  }

  const runSyncBootstrap = async (reason: string) => {
    await processOnePendingWaybillCreateSync(reason)
    await processOnePendingCsrCreateSync(reason)
    await processOnePendingQuotationCreateSync(reason)
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
        return
      }

      if (!hiddenAtRef.current) return

      void refreshOfflineAccessStateRef.current().then((nextAccessState) => {
        if (nextAccessState.allowed) {
          void recoverAppStateRef.current('visibility').then(() => {
            void runSyncBootstrap('visibility')
          })
        }
        hiddenAtRef.current = null
      })
    }

    const handleOnline = () => {
      void refreshOfflineAccessStateRef.current().then((nextAccessState) => {
        if (nextAccessState.allowed) {
          void recoverAppStateRef.current('online', { force: true }).then(() => {
            void runSyncBootstrap('online')
          })
        }
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return { runSyncBootstrap }
}
