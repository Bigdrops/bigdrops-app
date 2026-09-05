import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ClipboardList,
  FileText,
  Landmark,
  NotebookPen,
  Receipt,
  Settings,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import Layout, { MobileChromeContext } from '@/components/Layout'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SidebarToggleIcon } from '@/components/unlumen-ui/sidebar-toggle-icon'
import { useAuthorization } from '@/lib/tenant/contexts'
import { supabase } from '@/supabase'

interface MoreLink {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>
  path?: string
  action?: () => void
}

interface MoreGroup {
  group: string
  items: MoreLink[]
}

function MoreRow({ item, onNavigate }: { item: MoreLink; onNavigate: (item: MoreLink) => void }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => onNavigate(item)}
      className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors outline-none active:bg-bd-surface-muted"
    >
      <Icon className="h-5 w-5 shrink-0 text-bd-text-muted" strokeWidth={1.9} />
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-bd-text">{item.label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-bd-text-muted" />
    </button>
  )
}

export default function MoreOptions() {
  const navigate = useNavigate()
  const { openSidebar } = React.useContext(MobileChromeContext)
  const { hasAuthorization } = useAuthorization()
  const [signOutOpen, setSignOutOpen] = React.useState(false)

  const canViewAccounting =
    hasAuthorization('journal', 'view') ||
    hasAuthorization('account', 'view') ||
    hasAuthorization('period', 'view')

  const handleNavigate = (item: MoreLink) => {
    if (item.action) {
      item.action()
      return
    }
    if (item.path) navigate(item.path)
  }

  const handleSignOut = async () => {
    setSignOutOpen(false)
    try {
      localStorage.removeItem('theme')
    } catch { /* ignore */ }
    await supabase.auth.signOut()
    navigate('/login')
  }

  const groups: MoreGroup[] = [
    ...(canViewAccounting
      ? [
          {
            group: 'Accounting',
            items: [
              {
                key: 'accounting',
                label: 'Accounting',
                icon: Landmark,
                path: '/accounting',
              },
            ],
          } satisfies MoreGroup,
        ]
      : []),
    {
      group: 'Finance & reporting',
      items: [
        { key: 'letters', label: 'Letters', icon: FileText, path: '/letters' },
        { key: 'reports', label: 'Reports', icon: ClipboardList, path: '/reports' },
        { key: 'compliance', label: 'Compliance Hub', icon: ShieldCheck, path: '/compliance' },
        { key: 'receipts', label: 'Receipts', icon: Receipt, path: '/receipts' },
        { key: 'item-library', label: 'Item Library', icon: NotebookPen, path: '/item-library' },
      ],
    },
    {
      group: 'Workspace',
      items: [
        { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
        {
          key: 'signout',
          label: 'Sign Out',
          icon: LogOut,
          action: () => setSignOutOpen(true),
        },
      ],
    },
  ]

  return (
    <Layout title="More Options" hidePageHeader>
      <div className="mx-auto w-full max-w-[var(--bd-layout-content-max,1200px)] px-4 pt-2 md:px-[var(--bd-layout-padding,1.5rem)]">
        <div className="flex items-center gap-1 py-1">
          <button
            type="button"
            onClick={openSidebar}
            aria-label="Open navigation menu"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-bd-text transition-colors outline-none active:bg-bd-surface-muted"
          >
            <SidebarToggleIcon isOpen={false} strokeWidth={2} className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-[-0.02em] text-bd-text">
            More Options
          </h1>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            aria-label="Settings"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-bd-text transition-colors outline-none active:bg-bd-surface-muted"
          >
            <Settings className="h-5 w-5" strokeWidth={1.9} />
          </button>
        </div>

        <div className="mt-1 space-y-5 pb-4">
          {groups.map((group) => (
            <section key={group.group} aria-label={group.group}>
              <h2 className="px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-bd-text-muted">
                {group.group}
              </h2>
              <div className="mt-1.5 divide-y divide-bd-border/60 overflow-hidden rounded-2xl border border-bd-border/60 bg-bd-surface">
                {group.items.map((item) => (
                  <MoreRow key={item.key} item={item} onNavigate={handleNavigate} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account. Any unsaved work may be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleSignOut}>
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}
