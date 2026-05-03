import { useEffect, useState } from 'react'
import { supabase } from '@/supabase'
import { NotificationSettingsPanel } from '@/components/notifications/settings/NotificationSettingsPanel'
import { feedback } from '@/lib/feedback'
import type { SettingsSession } from './settings-types'

export default function NotificationSettingsPage() {
  const [session, setSession] = useState<SettingsSession>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  const showToast = (msg: string) => feedback.success(msg)

  return (
    <div className="w-full">
      <NotificationSettingsPanel userId={session?.user?.id} onToast={showToast} />
    </div>
  )
}
