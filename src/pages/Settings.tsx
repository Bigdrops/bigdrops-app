import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  DocumentPrefixesSettingsSection,
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
  const [isOperator, setIsOperator] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    let cancelled = false

    async function probeOperator() {
      try {
        const { data } = await supabase.rpc('is_platform_operator', { p_user_id: userId })
        if (!cancelled && data === true) setIsOperator(true)
      } catch {
        // Fail closed: leave isOperator false on any error.
      }
    }

    void probeOperator()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')
  const groups = buildGroups(isAdmin, isOperator)

  const showToast = useCallback((msg: string) => {
    feedback.success(msg)
  }, [])

  const renderSection = () => {
    switch (active) {
      case 'user':
        return <UserSettingsSection session={session} onToast={showToast} />
      case 'company':
        return <CompanySettingsSection />
      case 'branding':
        return <BrandingSettingsSection />
      case 'banking':
        return <BankingSettingsSection />
      case 'signatories':
        return <SignatoriesSettingsSection />
      case 'theme':
        return <AppThemeSettingsSection />
      case 'notifications':
        return <NotificationSettingsPage />
      case 'dashboard':
        return <DashboardSettingsSection />
      case 'documents':
        return <DocumentsSettingsSection />
      case 'prefixes':
        return <DocumentPrefixesSettingsSection />
      case 'archives':
        return <ArchivesSettingsSection />
      case 'admin':
        return <AdminSettingsSection session={session} />
      case 'tenant-debug':
        return null
      default:
        return null
    }
  }

  const handleSelectSection = useCallback((id: ActiveSectionId) => {
    if (id === 'tenant-debug') {
      navigate('/debug/tenant')
      return
    }
    setActive(id)
  }, [navigate])

  return (
    <Layout 
      title="Settings" 
      session={session} 
      hidePageHeader 
      contentClassName="bg-bd-surface"
    >
      <SettingsShell
        groups={groups}
        activeSection={active}
        setActiveSection={handleSelectSection}
        renderContent={renderSection}
        isAdmin={isAdmin}
      />
    </Layout>
  )
}
