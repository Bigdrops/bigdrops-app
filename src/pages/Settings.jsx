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

const SETTINGS_GROUPS = [
  {
    id: 'account',
    label: 'Account',
    desc: 'Your personal preferences and appearance',
    items: [
      {
        id: 'user',
        label: 'User Settings',
        icon: FileText,
        desc: 'Name, email, password and notification preferences',
      },
      {
        id: 'theme',
        label: 'Theme & Appearance',
        icon: Palette,
        desc: 'Background, cards, and display preferences',
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    desc: 'Business identity and brand representation',
    items: [
      {
        id: 'company',
        label: 'Company Info',
        icon: Building2,
        desc: 'Name, address, contact details, tax numbers',
      },
      {
        id: 'branding',
        label: 'Logo & Branding',
        icon: ImageIcon,
        desc: 'Logo and footer text shown on documents',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    desc: 'Core system controls for documents and finance',
    items: [
      {
        id: 'banking',
        label: 'Banking',
        icon: CreditCard,
        desc: 'Accounts available for documents and payments',
      },
      {
        id: 'documents',
        label: 'Document Controls',
        icon: FolderKanban,
        desc: 'Defaults for invoices, quotations, and output settings',
      },
      {
        id: 'signatories',
        label: 'Signatories',
        icon: UserCheck,
        desc: 'People available to sign documents',
      },
    ],
  },
  {
    id: 'interface',
    label: 'Interface',
    desc: 'Customize how the app is laid out',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard Layout',
        icon: LayoutDashboard,
        desc: 'Quick tiles shown on the dashboard',
      },
    ],
  },
]

const SYSTEM_GROUP = {
  id: 'system',
  label: 'System',
  desc: 'Restricted actions — proceed with care',
  variant: 'system',
  items: [
    {
      id: 'archives',
      label: 'Archives',
      icon: ArchiveRestore,
      desc: 'Restore or permanently delete archived records',
    },
    {
      id: 'admin',
      label: 'Admin Panel',
      icon: Shield,
      desc: 'Users, device codes, and admin controls',
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
  switch (id) {
    case 'user':
      return session?.user?.email || null
    case 'theme':
      return 'Appearance'
    case 'company':
      return 'Business profile'
    case 'branding':
      return 'Logo & footer'
    case 'banking':
      return 'Accounts'
    case 'documents':
      return 'Defaults'
    case 'signatories':
      return 'Authorized'
    case 'dashboard':
      return 'Quick tiles'
    case 'archives':
      return 'Maintenance'
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

      <div className="max-w-2xl mx-auto">
        {!active ? (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.id} className="space-y-2">
                <div className="px-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {group.label}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border overflow-hidden bg-card shadow-sm ${
                    group.variant === 'system'
                      ? 'border-red-100'
                      : 'border-border'
                  }`}
                >
                  {group.items.map(({ id, label, icon: Icon, desc }) => {
                    const summary = getSectionSummary(id, session, isAdmin)
                    const isSystemItem = group.variant === 'system'
                    const isAdminItem = id === 'admin'

                    return (
                      <button
                        key={id}
                        onClick={() => setActive(id)}
                        className={`w-full flex items-center gap-4 px-4 py-4 text-left transition-colors border-b last:border-b-0 ${
                          isSystemItem
                            ? 'border-red-50 hover:bg-red-50/50'
                            : 'border-border hover:bg-muted/30'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isAdminItem
                              ? 'bg-red-50'
                              : isSystemItem
                              ? 'bg-amber-50'
                              : 'bg-slate-100'
                          }`}
                        >
                          <Icon
                            size={17}
                            className={
                              isAdminItem
                                ? 'text-red-600'
                                : isSystemItem
                                ? 'text-amber-700'
                                : 'text-muted-foreground'
                            }
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-bold ${
                              isAdminItem ? 'text-red-700' : 'text-slate-800'
                            }`}
                          >
                            {label}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {desc}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
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
                            size={15}
                            className="text-slate-300"
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setActive(null)}
                className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors shadow-sm"
                aria-label="Back to settings"
              >
                ←
              </button>

              <div>
                <h2 className="text-sm font-black text-foreground uppercase tracking-wider">
                  {activeSection?.label}
                </h2>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
              {renderSection()}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-300 font-bold uppercase tracking-widest mt-8 pb-4">
          BIGDROPS ERP
        </p>
      </div>
    </Layout>
  )
}