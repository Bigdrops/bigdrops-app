import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import Decimal from 'decimal.js'
import { NotebookPen } from 'lucide-react'
import Layout from '@/components/Layout'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import MobileFab from '@/components/layout/MobileFab'
import { useEntity, useAuthorization } from '@/lib/tenant/contexts'
import { feedback } from '@/lib/feedback'
import { formatNaira } from '@/lib/formatters/money'
import {
  listAccounts,
  listEntries,
  listEntryLines,
  type AccountingAccount,
  type JournalEntryRow,
  type JournalLineRow,
} from '@/modules/accounting/accountingService'

export default function Journal() {
  const navigate = useNavigate()
  const { tenantClient } = useEntity()
  const { hasAuthorization } = useAuthorization()
  const [entries, setEntries] = React.useState<JournalEntryRow[]>([])
  const [accountsById, setAccountsById] = React.useState<Record<string, AccountingAccount>>({})
  const [linesByEntry, setLinesByEntry] = React.useState<Record<string, JournalLineRow[]>>({})
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')

  const canCreate = hasAuthorization('journal', 'create')

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      if (!tenantClient.isReady) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [rows, accounts] = await Promise.all([listEntries(tenantClient), listAccounts(tenantClient)])
        if (cancelled) return
        setEntries(rows)
        const map: Record<string, AccountingAccount> = {}
        for (const account of accounts) map[account.id] = account
        setAccountsById(map)
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

  const toggleExpand = async (entryId: string) => {
    if (expandedId === entryId) {
      setExpandedId(null)
      return
    }
    setExpandedId(entryId)
    if (!linesByEntry[entryId]) {
      try {
        const lines = await listEntryLines(tenantClient, entryId)
        setLinesByEntry((prev) => ({ ...prev, [entryId]: lines }))
      } catch (e) {
        feedback.error(e as Error)
      }
    }
  }

  const filtered = entries.filter((entry) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      entry.source_id.toLowerCase().includes(query) ||
      entry.source_type.toLowerCase().includes(query) ||
      (entry.memo ?? '').toLowerCase().includes(query)
    )
  })

  const renderRow = (entry: JournalEntryRow) => {
    const lines = linesByEntry[entry.id] ?? []
    // Display-only totals; never persisted.
    const debitTotal = lines
      .filter((l) => l.side === 'debit')
      .reduce((sum, l) => sum.plus(new Decimal(l.amount)), new Decimal(0))
      .toFixed(2)
    const isOpen = expandedId === entry.id
    return (
      <div key={entry.id}>
        <ModuleRowCard
          title={`${entry.source_type} · ${entry.source_id}`}
          subtitle={`${entry.transaction_date}${entry.memo ? ` · ${entry.memo}` : ''}`}
          tertiary={entry.reversal_of_entry_id ? 'Reversal entry' : undefined}
          amount={lines.length > 0 ? formatNaira(debitTotal) : undefined}
          statusLabel={entry.status.toUpperCase()}
          statusClassName={
            entry.status === 'posted'
              ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400'
          }
          onClick={() => toggleExpand(entry.id)}
        />
        {isOpen && (
          <div className="mx-1 -mt-1 mb-2 rounded-b-[var(--bd-radius-md)] border border-t-0 border-bd-border bg-bd-surface px-3 py-2">
            {lines.length === 0 ? (
              <div className="py-2 text-xs text-bd-text-muted">Loading lines…</div>
            ) : (
              lines.map((line) => {
                const account = accountsById[line.account_id]
                return (
                  <div key={line.id} className="flex items-center justify-between gap-2 border-b border-bd-border/50 py-2 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-bd-text">
                        {account ? `${account.code} · ${account.name}` : 'Unknown account'}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-bd-text-muted">{line.side}</div>
                    </div>
                    <div className="shrink-0 text-sm font-black text-bd-text">{formatNaira(line.amount)}</div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Layout title="Journal" hidePageHeader>
        <div className="px-4 pt-3 md:px-[var(--bd-layout-padding,1.5rem)]">
          <ModuleShell
            eyebrow="Accounting"
            title="Journal"
            summary={loading ? 'Loading entries…' : `${filtered.length} entries`}
            tone="blue"
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search source or memo…"
            onPrimaryAction={() => navigate('/accounting/journal/new')}
            primaryActionLabel="New entry"
            records={filtered}
            renderRow={renderRow}
            emptyState={
              <div className="rounded-[24px] border border-dashed border-bd-border bg-bd-surface/50 py-16 text-center shadow-inner">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bd-surface-muted text-bd-text-muted">
                  <NotebookPen className="h-6 w-6" />
                </div>
                <div className="mt-4 text-sm font-bold text-bd-text">No Journal Entries</div>
                <div className="mx-auto mt-1 max-w-[280px] text-xs text-bd-text-muted">
                  Posted entries appear here. Tap an entry to inspect its lines.
                </div>
              </div>
            }
          />
        </div>
      </Layout>
      {canCreate && (
        <MobileFab onClick={() => navigate('/accounting/journal/new')} ariaLabel="Create journal entry" />
      )}
    </>
  )
}
