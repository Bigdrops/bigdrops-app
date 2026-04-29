import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface PushNotificationRuntimeProps {
  userId?: string | null
}

/**
 * PushNotificationRuntime
 * 
 * This component runs inside the Router context to allow navigate() calls.
 * It initializes push notification listeners and handles routing on action.
 */
export function PushNotificationRuntime({ userId }: PushNotificationRuntimeProps) {
  const navigate = useNavigate()

  usePushNotifications(userId, (route) => {
    if (route) {
      navigate(route)
    }
  })

  return null
}
