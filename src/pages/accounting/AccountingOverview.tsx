import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Landmark } from 'lucide-react'
import Layout from '@/components/Layout'
import { useEntity, useAuthorization } from '@/lib/tenant/contexts'

const links = [
  { key: 'accounts', label: 'Chart of Accounts', subtitle: 'All accounts like Cash, Sales, Expenses', icon: Landmark, path: '/accounting/accounts', permission: ['account', 'view'] as const },
  { key: 'periods', label: 'Accounting Periods', subtitle: 'Open or close months and years', icon: Landmark, path: '/accounting/periods', permission: ['period', 'view'] as const },
  { key: 'journal', label: 'Journal', subtitle: 'View all posted transactions', icon: Landmark, path: '/accounting/journal', permission: ['journal', 'view'] as const },
  { key: 'journal-new', label: 'Create Journal Entry', subtitle: 'Record a new transaction', icon: Landmark, path: '/accounting/journal/new', permission: ['journal', 'create'] as const },
]

export default function AccountingOverview() {
  const navigate = useNavigate()
  const { entity } = useEntity()
  const { hasAuthorization } = useAuthorization()

  const visible = links.filter((link) => hasAuthorization(link.permission[0], link.permission[1]))

  return (
    <Layout title="Accounting" hidePageHeader>
      <div className="mx-auto w-full max-w-[var(--bd-layout-content-max,1200px)] px-4 pt-2 md:px-[var(--bd-layout-padding,1.5rem)]">
        <div className="flex items-center gap-1 py-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-bd-text transition-colors outline-none active:bg-bd-surface-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-[-0.02em] text-bd-text">
            Accounting
          </h1>
        </div>

        <div className="mt-3 space-y-5 pb-4">
          <section aria-label="Accounting">
            <div className="divide-y divide-bd-border/60 overflow-hidden rounded-2xl border border-bd-border/60 bg-bd-surface">
              {visible.map((link) => (
                <button
                  key={link.key}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors outline-none active:bg-bd-surface-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-bd-text">{link.label}</span>
                    {link.subtitle && (
                      <span className="block truncate text-[12px] text-bd-text-muted">{link.subtitle}</span>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-bd-text-muted" />
                </button>
              ))}
            </div>
            {visible.length === 0 && (
              <div className="rounded-2xl border border-dashed border-bd-border px-4 py-10 text-center text-sm text-bd-text-muted">
                Your role has no accounting access for this entity.
              </div>
            )}
          </section>
        </div>

        {entity?.name && (
          <p className="pt-2 pb-4 text-center text-[11px] text-bd-text-muted">{entity.name}</p>
        )}
      </div>
    </Layout>
  )
}
