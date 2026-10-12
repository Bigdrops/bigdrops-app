import * as React from 'react'

import { EntityContext } from '@/lib/tenant/entityContext'
import { previewTenantClient } from './preview-tenant-client'

/**
 * Mounts the inert entity value for a Design Lab experiment.
 *
 * Reads and renders only the context module, so the production entity provider
 * (and with it the Supabase client) stays out of the experiment's module graph.
 * `useEntity()` therefore resolves for the mounted production presentation
 * components without a tenant session.
 */
export function PreviewEntityProvider({ children }: { children: React.ReactNode }) {
  const value = React.useMemo(
    () => ({
      entity: null,
      entities: [],
      entityCount: 0,
      selectEntity: () => {},
      isLoading: false,
      error: null,
      expectedSchema: null,
      schemaName: null,
      schemaSource: null,
      schemaExposed: null,
      provisioningStatus: null,
      provisioningError: null,
      tenantClient: previewTenantClient,
      recheckProvisioning: () => {},
      refresh: () => {},
    }),
    [],
  )

  return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>
}
