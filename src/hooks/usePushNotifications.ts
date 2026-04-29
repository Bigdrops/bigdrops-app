import { useEffect } from 'react'
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { registerPushToken } from '@/domain/notifications/pushRegistration'

export function usePushNotifications(
  userId?: string | null,
  onRoute?: (route: string) => void
) {
  useEffect(() => {
    if (!userId) return
    if (!Capacitor.isNativePlatform()) return

    let registrationListener: any
    let errorListener: any
    let actionListener: any

    const init = async () => {
      try {
        const permission = await PushNotifications.requestPermissions()

        if (permission.receive !== 'granted') {
          console.warn('[push] permission not granted')
          return
        }

        await PushNotifications.register()

        registrationListener = await PushNotifications.addListener('registration', async (token) => {
          try {
            await registerPushToken({
              userId,
              token: token.value,
              platform: Capacitor.getPlatform(),
            })
          } catch (err) {
            console.error('[push] token save failed', err)
          }
        })

        errorListener = await PushNotifications.addListener('registrationError', (err) => {
          console.error('[push] registration error', err)
        })

        actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
          const route = event.notification.data?.route
          if (route && onRoute) {
            onRoute(route)
          }
        })
      } catch (e) {
        console.error('[push] init failed', e)
      }
    }

    void init()

    return () => {
      if (registrationListener) registrationListener.remove()
      if (errorListener) errorListener.remove()
      if (actionListener) actionListener.remove()
    }
  }, [userId, onRoute])
}