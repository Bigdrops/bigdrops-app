import { useNavigate } from 'react-router-dom'
import { BookOpenText, CalendarDays, ChevronRight, CircleDollarSign, Landmark, NotebookPen } from 'lucide-react'
import Layout from '@/components/Layout'
import { useEntity, useAuthorization } from '@/lib/tenant/contexts'

const links = [
  { key: 'accounts', label: 'Chart of Accounts', subtitle: 'All accounts in this entity book', icon: BookOpenText, path: '/accounting/accounts', permission: ['account', 'view'] as const },
  { key: 'periods', label: 'Accounting Periods', subtitle: 'Open, close, and track periods', icon: CalendarDays, path: '/accounting/periods', permission: ['period', 'view'] as const },
  { key: 'journal', label: 'Journal', subtitle: 'Posted entries and lines', icon: NotebookPen, path: '/accounting/journal', permission: ['journal', 'view'] as const },
  { key: 'journal-new', label: 'Create Journal Entry', subtitle: 'Post a balanced entry', icon: CircleDollarSign, path: '/accounting/journal/new', permission: ['journal', 'create'] as const },
]

export default function AccountingOverview() {
  const navigate = useNavigate()
  const { entity, tenantClient } = useEntity()
  const { hasAuthorization } = useAuthorization()

  const visible = links.filter((link) => hasAuthorization(link.permission[0], link.permission[1]))

  return (
    <Layout title="Accounting">
      <div className="mx-auto w-full max-w-[var(--bd-layout-content-max,1200px)] px-4 pt-3 md:px-[var(--bd-layout-padding,1.5rem)]">
        <div className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border)_/_0.8)] bg-[hsl(var(--bd-surface)_/_0.95)] px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bd-surface-muted text-bd-text">
              <Landmark className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[16px] font-semibold text-bd-text">
                {entity?.name ?? 'Entity books'}
              </div>
              <div className="truncate text-[11px] text-bd-text-muted">
                {tenantClient.isReady
                  ? 'Books are scoped to the active entity. Postings are immutable once posted.'
                  : 'Entity schema is still provisioning. Accounting unlocks when it is ready.'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2 pb-4">
          {visible.map((link) => {
            const Icon = link.icon
            return (
              <button
                key={link.key}
                type="button"
                onClick={() => navigate(link.path)}
                className="flex w-full items-center gap-3 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border)_/_0.8)] bg-[hsl(var(--bd-surface)_/_0.95)] px-4 py-3.5 text-left shadow-sm transition-colors hover:bg-bd-surface-muted active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bd-surface-muted text-bd-text">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-bd-text">{link.label}</span>
                  <span className="block truncate text-xs text-bd-text-muted">{link.subtitle}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-bd-text-muted" />
              </button>
            )
          })}
          {visible.length === 0 && (
            <div className="rounded-[var(--bd-radius-lg)] border border-dashed border-bd-border px-4 py-10 text-center text-sm text-bd-text-muted">
              Your role has no accounting access for this entity.
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
