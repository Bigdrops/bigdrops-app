/**
 * Tenant Resolution Abstraction
 *
 * Central entry point for resolving the current tenant ID.
 * Isolates tenant resolution behind a single function so that
 * future multi-tenancy strategies (JWT claims, subdomain, org lookup)
 * require changing only this module.
 *
 * TODO: single-tenant placeholder — replace with real tenant resolution
 * when multi-tenancy is implemented.
 */

let _cachedTenantId: string | null = null

export async function getCurrentTenantId(): Promise<string> {
  if (_cachedTenantId) return _cachedTenantId

  // ponytail: single-tenant stub — hardcoded env var with fallback
  _cachedTenantId = import.meta.env.VITE_TENANT_ID ?? 'default'
  return _cachedTenantId
}
