import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { cn } from '@/lib/utils'
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
  SettingsToast,
  SignatoriesSettingsSection,
  UserSettingsSection,
} from './settings/index'
import {
  ArchiveRestore,
  Building2,
  ChevronRight,
  CreditCard,
  FileText,
  FolderKanban,
  ImageIcon,
  LayoutDashboard,
  Palette,
  Shield,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import type { SettingsSession } from './settings/settings-types'

const ADMIN_EMAILS = ['jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com']

type ActiveSectionId =
  | 'user'
  | 'theme'
  | 'company'
  | 'branding'
  | 'banking'
  | 'documents'
  | 'signatories'
  | 'dashboard'
  | 'archives'
  | 'admin'

type GroupUIConfig = {
  label: string
  icon: string
  hover: string
  border: string
}

type GroupId = 'account' | 'workspace' | 'operations' | 'interface' | 'system'

type SettingsItem = {
  id: ActiveSectionId
  label: string
  icon: LucideIcon
  desc: string
  adminOnly?: boolean
}

type SettingsGroup = {
  id: GroupId
  label: string
  items: SettingsItem[]
  variant?: 'system'
}

// Group visual identities
const GROUP_UI: Record<GroupId, GroupUIConfig> = {
  account: {
    label: 'text-[hsl(var(--bd-status-info-text))]',
    icon: 'bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]',
    hover: 'hover:bg-[hsl(var(--bd-surface-muted))]',
    border: 'border-[hsl(var(--bd-border))]',
  },
  workspace: {
    label: 'text-[hsl(var(--bd-status-success-text))]',
    icon: 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))]',
    hover: 'hover:bg-[hsl(var(--bd-surface-muted))]',
    border: 'border-[hsl(var(--bd-border))]',
  },
  operations: {
    label: 'text-[hsl(var(--bd-status-warning-text))]',
    icon: 'bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]',
    hover: 'hover:bg-[hsl(var(--bd-surface-muted))]',
    border: 'border-[hsl(var(--bd-border))]',
  },
  interface: {
    label: 'text-[hsl(var(--bd-status-info-text))]',
    icon: 'bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]',
    hover: 'hover:bg-[hsl(var(--bd-surface-muted))]',
    border: 'border-[hsl(var(--bd-border))]',
  },
  system: {
    label: 'text-[hsl(var(--bd-status-danger-text))]',
    icon: 'bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]',
    hover: 'hover:bg-[hsl(var(--bd-surface-muted))]',
    border: 'border-[hsl(var(--bd-border))]',
  },
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'account',
    label: 'Account',
    items: [
      {
        id: 'user',
        label: 'User Settings',
        icon: FileText,
        desc: 'Profile, password, and notifications',
      },
      {
        id: 'theme',
        label: 'Theme & Appearance',
        icon: Palette,
        desc: 'Colors, cards, and display preferences',
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        id: 'company',
        label: 'Company Info',
        icon: Building2,
        desc: 'Business name, address, and tax details',
      },
      {
        id: 'branding',
        label: 'Logo & Branding',
        icon: ImageIcon,
        desc: 'Logo and document branding',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        id: 'banking',
        label: 'Banking',
        icon: CreditCard,
        desc: 'Bank accounts for documents and payments',
      },
      {
        id: 'documents',
        label: 'Document Controls',
        icon: FolderKanban,
        desc: 'Invoice, quotation, and PDF defaults',
      },
      {
        id: 'signatories',
        label: 'Signatories',
        icon: UserCheck,
        desc: 'People who can sign documents',
      },
    ],
  },
  {
    id: 'interface',
    label: 'Interface',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard Layout',
        icon: LayoutDashboard,
        desc: 'Quick tiles on your dashboard',
      },
    ],
  },
]

const SYSTEM_GROUP: SettingsGroup = {
  id: 'system',
  label: 'System',
  variant: 'system',
  items: [
    {
      id: 'archives',
      label: 'Archives',
      icon: ArchiveRestore,
      desc: 'Restore or remove archived records',
    },
    {
      id: 'admin',
      label: 'Admin Panel',
      icon: Shield,
      desc: 'Users, devices, and admin controls',
      adminOnly: true,
    },
  ],
}

function buildGroups(isAdmin: boolean): SettingsGroup[] {
  const systemItems = SYSTEM_GROUP.items.filter((item) =>
    item.adminOnly ? isAdmin : true
  )

  return [
    ...SETTINGS_GROUPS,
    {
      ...SYSTEM_GROUP,
      items: systemItems,
    },
  ].filter((group) => group.items.length > 0)
}

function getSectionSummary(
  id: ActiveSectionId,
  session: SettingsSession,
  isAdmin: boolean
): string | null {
  void session
  switch (id) {
    case 'banking':
      return 'Accounts'
    case 'signatories':
      return 'Authorized'
    case 'dashboard':
      return 'Quick tiles'
    case 'admin':
      return isAdmin ? 'Restricted' : null
    default:
      return null
  }
}

export default function Settings() {
  const [active, setActive] = useState<ActiveSectionId | null>(null)
  const [session, setSession] = useState<SettingsSession>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')
  const groups = buildGroups(isAdmin)
  const allSections = groups.flatMap((group) => group.items)

  const showToast = useCallback((msg: string) => setToast(msg), [])

  const renderSection = () => {
    switch (active) {
      case 'company':
        return <CompanySettingsSection onToast={showToast} />
      case 'banking':
        return <BankingSettingsSection onToast={showToast} />
      case 'branding':
        return <BrandingSettingsSection onToast={showToast} />
      case 'theme':
        return <AppThemeSettingsSection onToast={showToast} />
      case 'documents':
        return <DocumentsSettingsSection onToast={showToast} />
      case 'signatories':
        return <SignatoriesSettingsSection onToast={showToast} />
      case 'dashboard':
        return <DashboardSettingsSection />
      case 'archives':
        return <ArchivesSettingsSection onToast={showToast} />
      case 'user':
        return <UserSettingsSection session={session} onToast={showToast} />
      case 'admin':
        return <AdminSettingsSection onToast={showToast} session={session} />
      default:
        return null
    }
  }

  const activeSection = allSections.find((section) => section.id === active)

  return (
    <Layout title="Settings" session={session} contentClassName="bg-[hsl(var(--bd-surface))]">
      {toast && <SettingsToast message={toast} onDone={() => setToast(null)} />}

      <div className="w-full">
        {!active ? (
          <div className="space-y-5">
            {groups.map((group) => {
              const isSingle = group.items.length === 1
              const ui = GROUP_UI[group.id] || GROUP_UI.system

              return (
                <section key={group.id} className="space-y-1">
                  <div className="px-4 md:px-0">
                    <p
                      className={cn("text-[10px] font-black uppercase tracking-widest opacity-60", ui.label)}
                    >
                      {group.label}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "overflow-hidden bg-[hsl(var(--bd-card-bg))] border-[hsl(var(--bd-border))] shadow-sm",
                      isSingle ? 'rounded-xl' : 'rounded-2xl'
                    )}
                  >
                    {group.items.map(({ id, label, icon: Icon, desc }) => {
                      const summary = getSectionSummary(id, session, isAdmin)
                      const isSystemItem = group.variant === 'system'
                      const isAdminItem = id === 'admin'

                      return (
                        <button
                          key={id}
                          onClick={() => setActive(id)}
                          className={cn(
                            "group w-full flex items-center gap-3 px-4 transition-colors border-b border-[hsl(var(--bd-border))]/40 last:border-b-0",
                            isSingle ? 'py-3' : 'py-3.5',
                            ui.hover
                          )}
                        >
                          <div
                            className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105",
                              isAdminItem
                                ? 'bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]'
                                : isSystemItem
                                ? 'bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]'
                                : ui.icon
                            )}
                          >
                            <Icon size={16} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-sm font-bold",
                                isAdminItem ? 'text-[hsl(var(--bd-status-danger-text))]' : 'text-[hsl(var(--bd-text))]'
                              )}
                            >
                              {label}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-tight text-[hsl(var(--bd-text-muted))]">
                              {desc}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {summary ? (
                              <span
                                className={cn(
                                  "hidden sm:inline text-[10px] font-black uppercase tracking-widest rounded-full px-2.5 py-1",
                                  isAdminItem
                                    ? 'bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]'
                                    : isSystemItem
                                    ? 'bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]'
                                    : 'bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]'
                                )}
                              >
                                {summary}
                              </span>
                            ) : null}
                            <ChevronRight
                              size={14}
                              className="text-[hsl(var(--bd-text-muted))] opacity-20 group-hover:opacity-100 transition-all"
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <div>
            {/* Refined header */}
            <div className="flex items-center gap-3 mb-6 px-4 md:px-0">
              <button
                onClick={() => setActive(null)}
                className="w-10 h-10 rounded-xl bg-[hsl(var(--bd-card-bg))] border border-[hsl(var(--bd-border))] flex items-center justify-center text-[hsl(var(--bd-text))] hover:bg-[hsl(var(--bd-surface-muted))] transition-all active:scale-95 shadow-sm"
                aria-label="Back to settings"
              >
                ←
              </button>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))]">
                  Settings
                </p>
                <h2 className="text-lg font-black tracking-tight text-[hsl(var(--bd-text))] truncate">
                  {activeSection?.label}
                </h2>
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-[hsl(var(--bd-card-bg))] rounded-2xl border border-[hsl(var(--bd-border))] shadow-sm p-4 sm:p-6">
              {renderSection()}
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-[hsl(var(--bd-text-muted))] font-black uppercase tracking-[0.3em] mt-10 pb-6 opacity-40">
          BIGDROPS ERP
        </p>
      </div>
    </Layout>
  )
}
