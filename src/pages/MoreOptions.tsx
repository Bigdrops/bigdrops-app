import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Landmark,
  NotebookPen,
  Receipt,
  Settings,
  ShieldCheck,
  UserRound,
  LogOut,
} from 'lucide-react'
import Layout from '@/components/Layout'
import NotificationBell from '@/components/notifications/NotificationBell'
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
import { useEntity, useAuthorization } from '@/lib/tenant/contexts'
import { supabase } from '@/supabase'
import { cn } from '@/lib/utils'

interface MoreLink {
  key: string
  label: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
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
      className="flex w-full items-center gap-3 rounded-[var(--bd-radius-md)] border border-transparent px-3 py-3 text-left transition-colors hover:border-bd-border hover:bg-bd-surface-muted active:scale-[0.99]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bd-surface-muted text-bd-text">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-bd-text">{item.label}</span>
        <span className="block truncate text-xs text-bd-text-muted">{item.subtitle}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-bd-text-muted" />
    </button>
  )
}

export default function MoreOptions() {
  const navigate = useNavigate()
  const { entity } = useEntity()
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
                key: 'accounting-overview',
                label: 'Accounting Overview',
                subtitle: entity?.name ? `Books for ${entity.name}` : 'Entity books and posting status',
                icon: Landmark,
                path: '/accounting',
              },
              {
                key: 'chart-of-accounts',
                label: 'Chart of Accounts',
                subtitle: 'All accounts in this entity book',
                icon: BookOpenText,
                path: '/accounting/accounts',
              },
              {
                key: 'accounting-periods',
                label: 'Accounting Periods',
                subtitle: 'Open, close, and track periods',
                icon: CalendarDays,
                path: '/accounting/periods',
              },
              {
                key: 'journal',
                label: 'Journal',
                subtitle: 'Posted entries and lines',
                icon: NotebookPen,
                path: '/accounting/journal',
              },
              {
                key: 'journal-new',
                label: 'Create Journal Entry',
                subtitle: 'Post a balanced entry',
                icon: CircleDollarSign,
                path: '/accounting/journal/new',
              },
            ],
          } satisfies MoreGroup,
        ]
      : []),
    {
      group: 'Finance & reporting',
      items: [
        {
          key: 'letters',
          label: 'Letters',
          subtitle: 'Official correspondence and notices',
          icon: FileText,
          path: '/letters',
        },
        {
          key: 'reports',
          label: 'Reports',
          subtitle: 'Revenue, collections, workload, and trends',
          icon: ClipboardList,
          path: '/reports',
        },
        {
          key: 'compliance',
          label: 'Compliance Hub',
          subtitle: 'Approvals, policy logs, and audit trail',
          icon: ShieldCheck,
          path: '/compliance',
        },
        {
          key: 'receipts',
          label: 'Receipts',
          subtitle: 'Payment receipts and PDFs',
          icon: Receipt,
          path: '/receipts',
        },
        {
          key: 'item-library',
          label: 'Item Library',
          subtitle: 'Price history and master items',
          icon: BookOpenText,
          path: '/item-library',
        },
      ],
    },
    {
      group: 'Workspace',
      items: [
        {
          key: 'settings',
          label: 'Settings',
          subtitle: 'Roles, preferences, notifications, and controls',
          icon: Settings,
          path: '/settings',
        },
        {
          key: 'signout',
          label: 'Sign Out',
          subtitle: 'Exit this workspace securely',
          icon: LogOut,
          action: () => setSignOutOpen(true),
        },
      ],
    },
  ]

  return (
    <Layout title="More Options" hidePageHeader>
      <div className="mx-auto w-full max-w-[var(--bd-layout-content-max,1200px)] px-4 pt-3 md:px-[var(--bd-layout-padding,1.5rem)]">
        <div className="flex items-center gap-2 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border)_/_0.8)] bg-[hsl(var(--bd-surface)_/_0.95)] px-[var(--bd-space-md)] py-3 shadow-sm">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-bd-border bg-transparent transition-colors hover:bg-bd-surface-muted"
          >
            <ArrowLeft className="h-4 w-4 text-bd-text" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[16px] font-semibold leading-tight tracking-[-0.03em] text-bd-text">
              More Options
            </div>
            <div className="mt-px truncate text-[11px] text-bd-text-muted">
              Secondary capabilities for this workspace
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell />
            <button
              type="button"
              onClick={() => navigate('/settings')}
              aria-label="Profile and settings"
              className="grid h-9 w-9 place-items-center rounded-lg border border-bd-border bg-transparent transition-colors hover:bg-bd-surface-muted"
            >
              <UserRound className="h-4 w-4 text-bd-text" />
            </button>
          </div>
        </div>

        <div className={cn('mt-4 space-y-5 pb-4')}>
          {groups.map((group) => (
            <section key={group.group} aria-label={group.group}>
              <h2 className="px-1 text-[10px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-bd-text-muted">
                {group.group}
              </h2>
              <div className="mt-2 divide-y divide-bd-border/60 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border)_/_0.8)] bg-[hsl(var(--bd-surface)_/_0.95)] p-1.5 shadow-sm">
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
