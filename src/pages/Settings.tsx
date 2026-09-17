import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { TeamSettingsSection } from './settings/AdminSettingsSection'
import { WorkspaceSwitchSection } from './settings/WorkspaceSwitchSection'
import { buildGroups, type LiveSettingsSection } from './settings/settings-config'
import type { SettingsSession } from './settings/settings-types'
import { SettingsShell } from '@/components/settings/SettingsShell'
import { useWorkspace, useEntity } from '@/lib/tenant/contexts'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import { feedback } from '@/lib/feedback'

import { UserSettingsSection } from './settings/UserSettingsSection'
import NotificationSettingsPage from './settings/NotificationSettingsPage'
import { DashboardSettingsSection } from './settings/DashboardSettingsSection'
import { DeviceSettingsSection } from './settings/DeviceSettingsSection'
import { CompanyManageSection } from './settings/CompanyManageSection'
import { CompanySettingsSection } from './settings/CompanySettingsSection'
import { BrandingSettingsSection } from './settings/BrandingSettingsSection'
import { BankingSettingsSection } from './settings/BankingSettingsSection'
import { SignatoriesSettingsSection } from './settings/SignatoriesSettingsSection'
import { DocumentPrefixesSettingsSection } from './settings/DocumentPrefixesSettingsSection'
import { DocumentsSettingsSection } from './settings/DocumentsSettingsSection'
import { ArchivesSettingsSection } from './settings/ArchivesSettingsSection'
import { AppThemeSettingsSection } from './settings/AppThemeSettingsSection'
import { SecuritySettingsSection } from './settings/SecuritySettingsSection'

export default function Settings() {
  const [session, setSession] = useState<SettingsSession>(null)
  const [active, setActive] = useState<LiveSettingsSection | null>(null)
  const [showRoles, setShowRoles] = useState(false)
  const { workspace } = useWorkspace()
  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => { mounted = false; data.subscription.unsubscribe() }
  }, [])
  return <Layout title="Settings" session={session} hidePageHeader contentClassName="!p-0">
    <SettingsContent key={workspace?.id ?? 'no-workspace'} session={session} active={active} setActive={setActive} showRoles={showRoles} setShowRoles={setShowRoles} />
  </Layout>
}

function SettingsContent({ session, active, setActive, showRoles, setShowRoles }: {
  session: SettingsSession
  active: LiveSettingsSection | null
  setActive: (id: LiveSettingsSection | null) => void
  showRoles: boolean
  setShowRoles: (open: boolean) => void
}) {
  const { workspace, activeWorkspaces, isLoading: workspaceLoading, error: workspaceError } = useWorkspace()
  const { entity, entities, isLoading: entityLoading, error: entityError } = useEntity()
  const team = useTeamMembers(workspace?.id ?? null, session?.user.id ?? null)
  const { preference, save } = useThemePreferenceContext()
  const dark = preference.themeMode === 'dark' || (preference.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const wsName = workspaceLoading ? 'Loading…' : workspaceError ? 'Unavailable' : workspace?.name ?? '—'
  const coName = entityLoading ? 'Loading…' : entityError ? 'Unavailable' : entity?.name ?? '—'
  
  // Note: For a real app, isAdmin and isOperator would be fetched from auth claims or context.
  // Passing true for now to preserve the full inventory explicitly as requested.
  const isAdmin = true
  const isOperator = true

  const groups = buildGroups(isAdmin, isOperator).map(group => ({ ...group, items: group.items.map(item => {
    if (item.id === 'workspace-switch') return { ...item, desc: `Current: ${wsName}`, count: workspaceLoading || workspaceError ? undefined : activeWorkspaces.length }
    if (item.id === 'company-manage') return { ...item, desc: `Current: ${coName}`, count: entityLoading || entityError ? undefined : entities.length }
    if (item.id === 'team') return { ...item, desc: team.loading ? 'Loading members…' : team.error ? 'Members unavailable' : `${team.members.length} members`, count: team.loading || team.error ? undefined : team.members.length }
    return item
  }) }))

  return <SettingsShell groups={groups} activeSection={active} setActiveSection={id => { setShowRoles(false); setActive(id) }} workspaceName={wsName} companyName={coName}
    detailTitle={active === 'team' && showRoles ? 'Roles & Access' : undefined}
    onBack={active === 'team' && showRoles ? () => setShowRoles(false) : undefined}
    dark={dark} onToggleTheme={() => { void save({ themeMode: dark ? 'light' : 'dark' }).catch(error => feedback.error(String(error))) }}>
    
    {active === 'user' && <UserSettingsSection session={session} onToast={(msg) => feedback.success(msg)} />}
    {active === 'notifications' && <NotificationSettingsPage />}
    {active === 'dashboard' && <DashboardSettingsSection />}
    {active === 'workspace-switch' && <WorkspaceSwitchSection />}
    {active === 'team' && <TeamSettingsSection key={entity?.id ?? 'no-company'} session={session} team={team} showRoles={showRoles} setShowRoles={setShowRoles} />}
    {active === 'devices' && <DeviceSettingsSection />}
    {active === 'company-manage' && <CompanyManageSection />}
    {active === 'company' && <CompanySettingsSection />}
    {active === 'branding' && <BrandingSettingsSection />}
    {active === 'banking' && <BankingSettingsSection />}
    {active === 'signatories' && <SignatoriesSettingsSection />}
    {active === 'prefixes' && <DocumentPrefixesSettingsSection />}
    {active === 'documents' && <DocumentsSettingsSection />}
    {active === 'archives' && <ArchivesSettingsSection />}
    {active === 'theme' && <AppThemeSettingsSection userId={session?.user?.id} />}
    {active === 'security' && <SecuritySettingsSection />}
    {active === 'tenant-debug' && <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Tenant Diagnostics Environment (Operator Only)</div>}
  </SettingsShell>
}
