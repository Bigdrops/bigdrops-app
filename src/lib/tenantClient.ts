import type { SupabaseClient } from '@supabase/supabase-js'

export interface TenantClient {
  schemaName: string | null
  version: string
  isReady: boolean
  from: (table: string) => ReturnType<SupabaseClient['from']>
  rpc: (fn: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => ReturnType<SupabaseClient['rpc']>
}

export function createTenantClient(client: SupabaseClient, schemaName: string | null): TenantClient {
  if (!schemaName) {
    return {
      schemaName: null,
      version: 'phase-1',
      isReady: false,
      from: () => {
        throw new Error('Tenant schema is not available yet.')
      },
      rpc: () => {
        throw new Error('Tenant schema is not available yet.')
      },
    }
  }

  return {
    schemaName,
    version: 'phase-1',
    isReady: true,
    from: (table: string) => client.schema(schemaName).from(table),
    rpc: (fn: string, params?: Record<string, unknown>, options?: Record<string, unknown>) =>
      client.schema(schemaName).rpc(fn, params as any, options as any),
  }
}
