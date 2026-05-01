import { supabase } from '@/supabase'

type SendPushArgs = {
  userId: string
  title: string
  message: string
  route?: string
  notificationId: string
}

/**
 * Sends a push notification to all active devices of a user.
 * This should be called asynchronously to avoid blocking the main flow.
 */
export async function sendPushForNotification({
  userId,
  title,
  message,
  route,
  notificationId,
}: SendPushArgs) {
  try {
    // 1. Fetch active device tokens
    const { data: devices, error: deviceError } = await supabase
      .from('push_device_tokens')
      .select('token')
      .eq('user_id', userId)
      .is('revoked_at', null)

    if (deviceError) {
      console.error('[push] Failed to fetch device tokens:', deviceError)
      return
    }

    if (!devices || devices.length === 0) {
      // No active tokens, nothing to do
      return
    }

    const tokens = devices.map((d) => d.token)

    // 2. Invoke send-push Edge Function
    const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-push', {
      body: {
        tokens,
        title,
        message,
        data: {
          route,
          notification_id: notificationId,
        },
      },
    })

    // 3. Log the delivery attempt
    const { error: logError } = await supabase.from('push_delivery_logs').insert({
      notification_id: notificationId,
      user_id: userId,
      tokens,
      status: pushError ? 'failed' : 'sent',
      error_message: pushError?.message || null,
      raw_response: pushResult || null,
    })

    if (logError) {
      console.error('[push] Failed to log push delivery:', logError)
    }

    if (pushError) {
      console.error('[push] Edge Function invocation failed:', pushError)
    }
  } catch (err) {
    console.error('[push] Unexpected error in sendPushForNotification:', err)
  }
}
