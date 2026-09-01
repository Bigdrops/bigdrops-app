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
  CompanyManageSection,
  CompanySettingsSection,
  DashboardSettingsSection,
  DocumentPrefixesSettingsSection,
  DocumentsSettingsSection,
  NotificationSettingsPage,
  SignatoriesSettingsSection,
  UserSettingsSection,
  WorkspaceSwitchSection,
} from './settings/index'
import {
  ActiveSectionId,
  buildGroups,
} from './settings/settings-config'
import type { SettingsSession } from './settings/settings-types'
import { SettingsShell } from '@/components/settings/SettingsShell'
import { feedback } from '@/lib/feedback'
import { useWorkspace, useEntity } from '@/lib/tenant/contexts'

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
  const { entity } = useEntity()
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
      case 'workspace-switch':
        return <WorkspaceSwitchSection />
      case 'company-manage':
        return <CompanyManageSection />
      case 'company':
        return <CompanySettingsSection />
      case 'branding':
        return <BrandingSettingsSection />
      case 'banking':
        return <BankingSettingsSection />
      case 'signatories':
        return <SignatoriesSettingsSection />
      case 'theme':
        return <AppThemeSettingsSection userId={session?.user?.id} />
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

  const wsName = String(workspace?.name || '').trim() || '—'
  const coName = entity?.name || '—'

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
        workspaceContext={
          <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface px-3.5 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))] text-[11px] font-[800]">
                {wsName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-[800] text-bd-text">{wsName}</div>
                <div className="truncate text-[10px] font-[600] text-bd-text-muted">{coName}</div>
              </div>
            </div>
          </div>
        }
      />
    </Layout>
  )
}
