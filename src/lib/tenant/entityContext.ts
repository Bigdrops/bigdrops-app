import { createContext } from 'react'

import type { TenantClient } from '@/lib/tenantClient'
import type { ProvisioningStatus } from '@/domain/tenant/tenantGate'

/**
 * The entity context value and context object.
 *
 * This module holds no data-layer imports, so a consumer that only needs to
 * *provide* an entity value (the Design Lab previews, which mount production
 * presentation components with an inert, network-free client) does not pull the
 * Supabase client into its module graph. `contexts.tsx` owns the production
 * provider and reads this context through `useEntity()`.
 */

export interface ActiveEntity {
  id: string
  slug: string | null
  name: string | null
}

export type SchemaResolutionSource =
  | 'startup'
  | 'cache'
  | 'refresh'
  | 'workspace-change'
  | 'entity-change'

export type EntityContextValue = {
  entity: ActiveEntity | null
  /** All active entities within the current workspace. */
  entities: ActiveEntity[]
  entityCount: number
  /** Switch the active entity. Updates schema resolution automatically. */
  selectEntity: (id: string) => void
  isLoading: boolean
  error: string | null
  expectedSchema: string | null
  schemaName: string | null
  schemaSource: SchemaResolutionSource | null
  /**
   * PostgREST exposure probe result for expectedSchema. true = served,
   * false = not yet served, null = unchecked (probe pending or N/A).
   * Consumed by TenantGate so provisioning-ready alone never renders
   * the app as usable before exposure is confirmed.
   */
  schemaExposed: boolean | null
  provisioningStatus: ProvisioningStatus | null
  provisioningError: string | null
  tenantClient: TenantClient
  recheckProvisioning: () => void
  refresh: () => void
}

export const EntityContext = createContext<EntityContextValue | null>(null)
