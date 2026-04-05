import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  AdminSettingsSection,
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
  Shield,
  UserCheck,
} from 'lucide-react'

const ADMIN_EMAILS = ['jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com']

// ─── Main Settings Page ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'company',  label: 'Company Info',    icon: Building2,  desc: 'Name, address, contact' },
  { id: 'banking',  label: 'Banking',          icon: CreditCard, desc: 'Account & bank details' },
  { id: 'branding', label: 'Logo & Branding',  icon: ImageIcon,  desc: 'Logo and footer text' },
  { id: 'documents', label: 'Documents',       icon: FolderKanban, desc: 'Customize document control availability' },
  { id: 'signatories', label: 'Signatories', icon: UserCheck, desc: 'Manage document signatories' },
  { id: 'dashboard', label: 'Dashboard',       icon: LayoutDashboard, desc: 'Quick tiles on dashboard header' },
  { id: 'archives', label: 'Archives',         icon: ArchiveRestore, desc: 'Restore archived invoices, quotations, and projects' },
  { id: 'user',     label: 'User Settings',    icon: FileText,   desc: 'Change your password' },
]

const ADMIN_SECTION = { id: 'admin', label: 'Admin Panel', icon: Shield, desc: 'Users & device codes' }

export default function Settings() {
  const [active, setActive] = useState(null)
  const [session, setSession] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email)
  const sections = isAdmin ? [...SECTIONS, ADMIN_SECTION] : SECTIONS

  const showToast = useCallback((msg) => setToast(msg), [])

  const renderSection = () => {
    switch (active) {
      case 'company':  return <CompanySettingsSection onToast={showToast} />
      case 'banking':  return <BankingSettingsSection onToast={showToast} />
      case 'branding': return <BrandingSettingsSection onToast={showToast} />
      case 'documents': return <DocumentsSettingsSection onToast={showToast} />
      case 'signatories': return <SignatoriesSettingsSection onToast={showToast} />
      case 'dashboard': return <DashboardSettingsSection />
      case 'archives': return <ArchivesSettingsSection onToast={showToast} />
      case 'user':     return <UserSettingsSection session={session} onToast={showToast} />
      case 'admin':    return <AdminSettingsSection onToast={showToast} session={session} />
      default:         return null
    }
  }

  const activeSection = sections.find(s => s.id === active)

  return (
    <Layout title="Settings" session={session}>
      {toast && <SettingsToast message={toast} onDone={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto">
        {!active ? (
          // Home — section list
          <div className="space-y-2">
            {sections.map(({ id, label, icon: Icon, desc }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`w-full flex items-center gap-4 px-4 py-4 bg-card rounded-xl border border-border hover:border-border hover:shadow-sm transition-all group text-left
                  ${id === 'admin' ? 'border-red-100 hover:border-red-300' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                  ${id === 'admin' ? 'bg-red-50' : 'bg-slate-100'}`}>
                  <Icon size={17} className={id === 'admin' ? 'text-red-600' : 'text-muted-foreground'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${id === 'admin' ? 'text-red-600' : 'text-slate-800'}`}>{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <ChevronRight size={15} className="text-slate-300 group-hover:text-muted-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          // Active section
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setActive(null)}
                className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors shadow-sm"
                aria-label="Back to settings"
              >
                ←
              </button>
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider">
                {activeSection?.label}
              </h2>
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
