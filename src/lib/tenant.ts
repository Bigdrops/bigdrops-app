import { supabase } from '@/supabase'

let _cachedTenantId: string | null = null

export async function getCurrentTenantId(): Promise<string> {
  if (_cachedTenantId) return _cachedTenantId

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('getCurrentTenantId: not authenticated')
  _cachedTenantId = user.id
  return _cachedTenantId
}
