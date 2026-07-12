let _cachedTenantId: string | null = null

export async function getCurrentTenantId(): Promise<string> {
  if (_cachedTenantId) return _cachedTenantId

  const id = import.meta.env.VITE_TENANT_ID
  if (!id) throw new Error("VITE_TENANT_ID is not set — add it to .env (single-tenant UUID)")
  _cachedTenantId = id
  return _cachedTenantId
}
