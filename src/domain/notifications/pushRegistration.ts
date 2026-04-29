import { supabase } from '@/supabase'

type RegisterPayload = {
  userId: string
  token: string
  platform: string
  deviceId?: string | null
  appVersion?: string | null
}

export async function registerPushToken(payload: RegisterPayload) {
  const { userId, token, platform, deviceId, appVersion } = payload

  const { error } = await supabase
    .from('push_device_tokens')
    .upsert(
      {
        user_id: userId,
        token,
        platform,
        device_id: deviceId ?? null,
        app_version: appVersion ?? null,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,token',
      },
    )

  if (error) {
    console.error('[push] register failed', error)
    throw error
  }
}