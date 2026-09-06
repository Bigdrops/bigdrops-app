import * as React from 'react'
import { CalendarDays, X } from 'lucide-react'
import Layout from '@/components/Layout'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import MobileFab from '@/components/layout/MobileFab'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
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
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [code, setCode] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const canCreate = hasAuthorization('period', 'create')
  const canEdit = hasAuthorization('period', 'edit')

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      if (!tenantClient.isReady) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        setPeriods(await listPeriods(tenantClient))
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

  const handleCreate = async () => {
    setSaving(true)
    try {
      await createPeriod(tenantClient, { code, startDate, endDate })
      setCode('')
      setStartDate('')
      setEndDate('')
      feedback.success('Period created as planned.')
      setSheetOpen(false)
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
    <>
      <Layout title="Accounting Periods" hidePageHeader>
        <div className="px-4 pt-3 md:px-[var(--bd-layout-padding,1.5rem)]">
          <ModuleShell
            eyebrow="Accounting"
            title="Accounting Periods"
            summary={loading ? 'Loading periods…' : `${filtered.length} periods`}
            tone="blue"
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search period code…"
            onPrimaryAction={() => setSheetOpen(true)}
            primaryActionLabel="New period"
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
                  Create a planned period below, then open it to accept postings.
                </div>
              </div>
            }
          />
        </div>
      </Layout>
      {canCreate && (
        <MobileFab onClick={() => setSheetOpen(true)} ariaLabel="Create period" />
      )}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="p-0">
          <SheetHeader className="px-5 pb-3 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-[17px] font-[800] tracking-[-0.05em] text-bd-overlay-text">
                  New period
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-[11px] font-[700] text-bd-overlay-muted">
                  Create a planned period, then open it to accept postings.
                </SheetDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setSheetOpen(false)}
                className="h-7 w-7"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </SheetHeader>
          <div className="px-5 pb-5 space-y-3">
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-bd-overlay-muted">
                Code
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code e.g. 2026-09"
                className="h-11 w-full rounded-xl border border-bd-overlay-border bg-bd-overlay-bg px-3 text-sm text-bd-overlay-text outline-none focus:ring-2 focus:ring-bd-overlay-ring"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-bd-overlay-muted">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Start date"
                className="h-11 w-full rounded-xl border border-bd-overlay-border bg-bd-overlay-bg px-3 text-sm text-bd-overlay-text outline-none focus:ring-2 focus:ring-bd-overlay-ring"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-bd-overlay-muted">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="End date"
                className="h-11 w-full rounded-xl border border-bd-overlay-border bg-bd-overlay-bg px-3 text-sm text-bd-overlay-text outline-none focus:ring-2 focus:ring-bd-overlay-ring"
              />
            </div>
          </div>
          <SheetFooter className="px-5 pb-5 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSheetOpen(false)}
              className="h-11 w-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || !code || !startDate || !endDate}
              onClick={handleCreate}
              className="h-11 w-full"
            >
              {saving ? 'Saving…' : 'Create'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )

  async function refresh() {
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
  }
}
