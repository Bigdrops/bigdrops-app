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
} from 'lucide-react'

const ADMIN_EMAILS = ['jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com']

// Group visual identities
const GROUP_UI = {
  account: {
    label: 'text-slate-500',
    icon: 'bg-slate-100 text-slate-600',
    hover: 'hover:bg-slate-50',
    border: 'border-slate-200/80',
  },
  workspace: {
    label: 'text-indigo-600/80',
    icon: 'bg-indigo-100 text-indigo-700',
    hover: 'hover:bg-indigo-50/60',
    border: 'border-slate-200/80',
  },
  operations: {
    label: 'text-amber-700/80',
    icon: 'bg-amber-100 text-amber-700',
    hover: 'hover:bg-amber-50/60',
    border: 'border-slate-200/80',
  },
  interface: {
    label: 'text-violet-700/80',
    icon: 'bg-violet-100 text-violet-700',
    hover: 'hover:bg-violet-50/60',
    border: 'border-slate-200/80',
  },
  system: {
    label: 'text-rose-600/80',
    icon: 'bg-rose-100 text-rose-700',
    hover: 'hover:bg-rose-50/60',
    border: 'border-rose-100',
  },
}

const SETTINGS_GROUPS = [
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

const SYSTEM_GROUP = {
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

function buildGroups(isAdmin) {
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

function getSectionSummary(id, session, isAdmin) {
  // Only show summaries for sections where they add value
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
  const [active, setActive] = useState(null)
  const [session, setSession] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email)
  const groups = buildGroups(isAdmin)
  const allSections = groups.flatMap((group) => group.items)

  const showToast = useCallback((msg) => setToast(msg), [])

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
    <Layout title="Settings" session={session}>
      {toast && <SettingsToast message={toast} onDone={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto pb-4">
        {!active ? (
          <div className="space-y-5">
            {groups.map((group) => {
              const isSingle = group.items.length === 1
              const ui = GROUP_UI[group.id] || GROUP_UI.system

              return (
                <section key={group.id} className="space-y-1.5">
                  <div className="px-1">
                    <p
                      className={`text-[12px] font-extrabold tracking-[0.14em] uppercase ${ui.label}`}
                    >
                      {group.label}
                    </p>
                  </div>

                  <div
                    className={`overflow-hidden bg-card border shadow-sm ${
                      isSingle ? 'rounded-xl' : 'rounded-2xl'
                    } ${ui.border}`}
                  >
                    {group.items.map(({ id, label, icon: Icon, desc }) => {
                      const summary = getSectionSummary(id, session, isAdmin)
                      const isSystemItem = group.variant === 'system'
                      const isAdminItem = id === 'admin'

                      return (
                        <button
                          key={id}
                          onClick={() => setActive(id)}
                          className={`group w-full flex items-center gap-2.5 px-4 ${
                            isSingle ? 'py-3' : 'py-3.5'
                          } text-left transition-colors border-b last:border-b-0 ${
                            isSystemItem ? 'border-red-50' : 'border-slate-200/80'
                          } ${ui.hover}`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isAdminItem
                                ? 'bg-red-100/80 text-red-600'
                                : isSystemItem
                                ? 'bg-amber-100/80 text-amber-700'
                                : ui.icon
                            }`}
                          >
                            <Icon size={16} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-bold ${
                                isAdminItem ? 'text-red-700' : 'text-slate-800'
                              }`}
                            >
                              {label}
                            </p>
                            <p className="mt-0 text-[12px] leading-5 text-muted-foreground">
                              {desc}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {summary ? (
                              <span
                                className={`hidden sm:inline text-[11px] font-semibold rounded-full px-2.5 py-1 ${
                                  isAdminItem
                                    ? 'bg-red-50 text-red-700'
                                    : isSystemItem
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {summary}
                              </span>
                            ) : null}
                            <ChevronRight
                              size={14}
                              className="text-slate-200 group-hover:text-slate-300 transition-colors"
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
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setActive(null)}
                className="w-9 h-9 rounded-xl bg-card border border-slate-200/80 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
                aria-label="Back to settings"
              >
                ←
              </button>

              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                  Settings
                </p>
                <h2 className="text-base font-extrabold text-slate-900 truncate">
                  {activeSection?.label}
                </h2>
              </div>
            </div>

            {/* Lighter outer card */}
            <div className="bg-card rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
              {renderSection()}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-300 font-bold uppercase tracking-widest mt-6 pb-3">
          BIGDROPS ERP
        </p>
      </div>
    </Layout>
  )
}