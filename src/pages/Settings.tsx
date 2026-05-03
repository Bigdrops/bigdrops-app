import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  AdminSettingsSection,
  AppThemeSettingsSection,
  ArchivesSettingsSection,
  BankingSettingsSection,
  BrandingSettingsSection,
  CompanySettingsSection,
  DashboardSettingsSection,
  DocumentsSettingsSection,
  NotificationSettingsPage,
  SignatoriesSettingsSection,
  UserSettingsSection,
} from './settings/index'
import {
  ActiveSectionId,
  buildGroups,
} from './settings/settings-config'
import type { SettingsSession } from './settings/settings-types'
import { SettingsShell } from '@/components/settings/SettingsShell'
import { feedback } from '@/lib/feedback'

const ADMIN_EMAILS = ['jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com']

export default function Settings() {
  const [active, setActive] = useState<ActiveSectionId | null>(null)
  const [session, setSession] = useState<SettingsSession>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')
  const groups = buildGroups(isAdmin)

  const showToast = useCallback((msg: string) => {
    feedback.success(msg)
  }, [])

  const renderSection = () => {
    switch (active) {
      case 'user':
        return <UserSettingsSection session={session} onToast={showToast} />
      case 'company':
        return <CompanySettingsSection onToast={showToast} />
      case 'branding':
        return <BrandingSettingsSection onToast={showToast} />
      case 'banking':
        return <BankingSettingsSection onToast={showToast} />
      case 'signatories':
        return <SignatoriesSettingsSection onToast={showToast} />
      case 'theme':
        return <AppThemeSettingsSection onToast={showToast} />
      case 'notifications':
        return <NotificationSettingsPage />
      case 'dashboard':
        return <DashboardSettingsSection />
      case 'documents':
        return <DocumentsSettingsSection onToast={showToast} />
      case 'archives':
        return <ArchivesSettingsSection onToast={showToast} />
      case 'admin':
        return <AdminSettingsSection onToast={showToast} session={session} />
      default:
        return null
    }
  }

  return (
    <Layout 
      title="Settings" 
      session={session} 
      hidePageHeader 
      contentClassName="bg-[hsl(var(--bd-surface))]"
    >
      <SettingsShell
        groups={groups}
        activeSection={active}
        setActiveSection={setActive}
        renderContent={renderSection}
        isAdmin={isAdmin}
      />
    </Layout>
  )
}
