import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  TeamSettingsSection,
  DeviceSettingsSection,
  AppThemeSettingsSection,
  SecuritySettingsSection,
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
import { useWorkspace } from '@/lib/tenant/contexts'

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

  const { workspace } = useWorkspace()
  const isOwner = workspace?.role === 'owner'
  const groups = buildGroups(isOwner, isOperator)

  const showToast = useCallback((msg: string) => {
    feedback.success(msg)
  }, [])

  const renderSection = () => {
    const resolved = active === 'admin' ? 'team' : active
    switch (resolved) {
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
      case 'team':
        return <TeamSettingsSection session={session} />
      case 'devices':
        return <DeviceSettingsSection />
      case 'security':
        return <SecuritySettingsSection />
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
        activeSection={active === 'admin' ? 'team' : active}
        setActiveSection={handleSelectSection}
        renderContent={renderSection}
        isAdmin={isOwner}
      />
    </Layout>
  )
}
