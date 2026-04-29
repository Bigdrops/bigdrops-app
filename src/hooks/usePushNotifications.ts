import { useEffect } from 'react'
import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { useNavigate } from 'react-router-dom'
import { registerPushToken } from '@/domain/notifications/pushRegistration'

export function usePushNotifications(userId?: string | null) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!userId) return
    if (Capacitor.getPlatform() !== 'android') return

    const init = async () => {
      const permission = await PushNotifications.requestPermissions()

      if (permission.receive !== 'granted') {
        console.warn('[push] permission not granted')
        return
      }

      await PushNotifications.register()

      PushNotifications.addListener('registration', async (token) => {
        try {
          await registerPushToken({
            userId,
            token: token.value,
            platform: 'android',
          })
        } catch (err) {
          console.error('[push] token save failed', err)
        }
      })

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[push] registration error', err)
      })

      PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
        const route = event.notification.data?.route
        if (route) {
          navigate(route)
        }
      })
    }

    void init()
  }, [userId, navigate])
}