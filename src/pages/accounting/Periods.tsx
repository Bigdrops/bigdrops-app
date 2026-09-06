import * as React from 'react'
import { CalendarDays } from 'lucide-react'
import Layout from '@/components/Layout'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import { useEntity, useAuthorization } from '@/lib/tenant/contexts'
import { feedback } from '@/lib/feedback'
import { createPeriod, listPeriods, openPeriod, type AccountingPeriod } from '@/modules/accounting/accountingService'

const stateTone: Record<AccountingPeriod['state'], string> = {
  planned: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  open: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  closed: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  locked: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
}

export default function Periods() {
  const { tenantClient } = useEntity()
  const { hasAuthorization } = useAuthorization()
  const [periods, setPeriods] = React.useState<AccountingPeriod[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [code, setCode] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const canCreate = hasAuthorization('period', 'create')
  const canEdit = hasAuthorization('period', 'edit')

  const refresh = React.useCallback(async () => {
    if (!tenantClient.isReady) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setPeriods(await listPeriods(tenantClient))
    } catch (e) {
      feedback.error(e as Error)
    } finally {
      setLoading(false)
    }
  }, [tenantClient])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const handleCreate = async () => {
    setSaving(true)
    try {
      await createPeriod(tenantClient, { code, startDate, endDate })
      setCode('')
      setStartDate('')
      setEndDate('')
      feedback.success('Period created as planned.')
      await refresh()
    } catch (e) {
      feedback.error(e as Error)
    } finally {
      setSaving(false)
    }
  }

  const handleOpen = async (periodId: string) => {
    try {
      await openPeriod(tenantClient, periodId)
      feedback.success('Period opened for posting.')
      await refresh()
    } catch (e) {
      feedback.error(e as Error)
    }
  }

  const filtered = periods.filter((period) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return period.code.toLowerCase().includes(query)
  })

  return (
    <Layout title="Accounting Periods" hidePageHeader>
      <div className="px-4 pt-3 md:px-[var(--bd-layout-padding,1.5rem)]">
        {canCreate && (
          <div className="mx-auto mb-3 w-full max-w-[var(--bd-layout-content-max,1200px)] rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border)_/_0.8)] bg-[hsl(var(--bd-surface)_/_0.95)] p-4 shadow-sm">
            <div className="text-sm font-bold text-bd-text">New period</div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code e.g. 2026-09"
                className="h-11 rounded-xl border border-bd-border bg-transparent px-3 text-sm text-bd-text outline-none"
              />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Start date"
                className="h-11 rounded-xl border border-bd-border bg-transparent px-3 text-sm text-bd-text outline-none"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="End date"
                className="h-11 rounded-xl border border-bd-border bg-transparent px-3 text-sm text-bd-text outline-none"
              />
              <button
                type="button"
                disabled={saving}
                onClick={handleCreate}
                className="h-11 rounded-xl bg-[hsl(var(--bd-nav-active-bg))] px-4 text-sm font-bold text-[hsl(var(--bd-nav-active-text))] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        )}
        <ModuleShell
          eyebrow="Accounting"
          title="Accounting Periods"
          summary={loading ? 'Loading periods…' : `${filtered.length} periods`}
          tone="blue"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search period code…"
          records={filtered}
          renderRow={(period: AccountingPeriod) => (
            <ModuleRowCard
              key={period.id}
              title={period.code}
              subtitle={`${period.start_date} → ${period.end_date}`}
              statusLabel={period.state.toUpperCase()}
              statusClassName={stateTone[period.state]}
              onActionClick={period.state === 'planned' && canEdit ? () => handleOpen(period.id) : undefined}
              actionAriaLabel={period.state === 'planned' && canEdit ? 'Open period' : undefined}
            />
          )}
          emptyState={
            <div className="rounded-[24px] border border-dashed border-bd-border bg-bd-surface/50 py-16 text-center shadow-inner">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bd-surface-muted text-bd-text-muted">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div className="mt-4 text-sm font-bold text-bd-text">No Periods Found</div>
              <div className="mx-auto mt-1 max-w-[280px] text-xs text-bd-text-muted">
                Create a planned period above, then open it to accept postings.
              </div>
            </div>
          }
        />
      </div>
    </Layout>
  )
}
