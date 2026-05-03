import { useState, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase'
import Layout from '@/components/Layout'
import { NotificationSettingsPanel } from '@/components/notifications/settings/NotificationSettingsPanel'
import { SettingsToast } from './SettingsToast'
import type { SettingsSession } from './settings-types'

export default function NotificationSettingsPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<SettingsSession>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  const showToast = (msg: string) => setToast(msg)

  return (
    <Layout title="Notification Settings" session={session} contentClassName="bg-[hsl(var(--bd-surface))]">
      {toast && <SettingsToast message={toast} onDone={() => setToast(null)} />}

      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6 px-4 md:px-0">
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-xl bg-[hsl(var(--bd-card-bg))] border border-[hsl(var(--bd-border))] flex items-center justify-center text-[hsl(var(--bd-text))] hover:bg-[hsl(var(--bd-surface-muted))] transition-all active:scale-95 shadow-sm"
            aria-label="Back to settings"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))]">
              Settings
            </p>
            <h2 className="text-lg font-black tracking-tight text-[hsl(var(--bd-text))] truncate">
              Notifications
            </h2>
          </div>
        </div>

        <div className="bg-[hsl(var(--bd-card-bg))] rounded-2xl border border-[hsl(var(--bd-border))] shadow-sm p-4 sm:p-6">
          <NotificationSettingsPanel userId={session?.user?.id} onToast={showToast} />
        </div>

        <p className="text-center text-[10px] text-[hsl(var(--bd-text-muted))] font-black uppercase tracking-[0.3em] mt-10 pb-6 opacity-40">
          BIGDROPS ERP
        </p>
      </div>
    </Layout>
  )
}
