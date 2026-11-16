import { useCallback, useSyncExternalStore } from 'react'

import {
  DEFAULT_BOLU_INTERACTION_PREFERENCES,
  readBoluInteractionPreferences,
  subscribeBoluInteractionPreferences,
  writeBoluInteractionPreferences,
  type BoluInteractionPreferences,
} from '@/lib/ai-assistant/bolu-preferences'

/**
 * useBoluInteractionPreferences — React binding for the Bolu interaction store.
 * Kept separate from the theme preference hook because these settings are
 * device-scoped, not account-scoped.
 */
export function useBoluInteractionPreferences() {
  const preferences = useSyncExternalStore(
    subscribeBoluInteractionPreferences,
    readBoluInteractionPreferences,
    () => DEFAULT_BOLU_INTERACTION_PREFERENCES,
  )

  const update = useCallback((patch: Partial<BoluInteractionPreferences>) => {
    writeBoluInteractionPreferences(patch)
  }, [])

  return { preferences, update }
}
