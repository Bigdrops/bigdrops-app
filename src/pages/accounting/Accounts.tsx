import * as React from 'react'
import { BookOpenText } from 'lucide-react'
import Layout from '@/components/Layout'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import { useEntity } from '@/lib/tenant/contexts'
import { feedback } from '@/lib/feedback'
import { listAccounts, type AccountingAccount } from '@/modules/accounting/accountingService'

export default function Accounts() {
  const { tenantClient } = useEntity()
  const [accounts, setAccounts] = React.useState<AccountingAccount[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      if (!tenantClient.isReady) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const rows = await listAccounts(tenantClient)
        if (!cancelled) setAccounts(rows)
      } catch (e) {
        if (!cancelled) feedback.error(e as Error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [tenantClient])

  const filtered = accounts.filter((account) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return account.code.includes(query) || account.name.toLowerCase().includes(query)
  })

  return (
    <Layout title="Chart of Accounts">
      <div className="px-4 pt-3 md:px-[var(--bd-layout-padding,1.5rem)]">
        <ModuleShell
          eyebrow="Accounting"
          title="Chart of Accounts"
          summary={loading ? 'Loading accounts…' : `${filtered.length} accounts`}
          tone="blue"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search code or name…"
          records={filtered}
          renderRow={(account: AccountingAccount) => (
            <ModuleRowCard
              key={account.id}
              title={`${account.code} · ${account.name}`}
              subtitle={`${account.type} · normal ${account.normal_balance}`}
              statusLabel={account.active ? 'ACTIVE' : 'INACTIVE'}
              statusClassName={
                account.active
                  ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400'
              }
            />
          )}
          emptyState={
            <div className="rounded-[24px] border border-dashed border-bd-border bg-bd-surface/50 py-16 text-center shadow-inner">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bd-surface-muted text-bd-text-muted">
                <BookOpenText className="h-6 w-6" />
              </div>
              <div className="mt-4 text-sm font-bold text-bd-text">No Accounts Found</div>
              <div className="mx-auto mt-1 max-w-[280px] text-xs text-bd-text-muted">
                {tenantClient.isReady
                  ? 'No accounts match this search, or the chart has not been seeded for this entity.'
                  : 'The entity schema is still provisioning.'}
              </div>
            </div>
          }
        />
      </div>
    </Layout>
  )
}
