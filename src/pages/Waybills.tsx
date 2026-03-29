import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Truck } from 'lucide-react'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { formatWaybillDate, getStatusMeta, getTypeMeta, getWaybillTypeContent, mapDbWaybill } from '../components/waybill/waybillUtils'
import type { Waybill } from '../components/waybill/waybillUtils'
import PageIntro from '../components/layout/PageIntro'
import { PageShell } from '../components/layout/PageShell'
import { Button } from '../components/ui/button'

type FilterTab = 'all' | 'internal' | 'external'

function Badge({ className, label }: { className: string; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  )
}

export default function Waybills() {
  const navigate = useNavigate()
  const [waybills, setWaybills] = useState<Waybill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<FilterTab>('all')
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      supabase
        .from('waybills')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setWaybills(((data as Record<string, unknown>[]) || []).map((row) => mapDbWaybill(row)) as Waybill[])
          setLoading(false)
        })
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => {
    let list = waybills
    if (tab !== 'all') list = list.filter((w) => w.type === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (w) =>
          w.waybill_number?.toLowerCase().includes(q) ||
          w.client_name?.toLowerCase().includes(q) ||
          w.vehicle_plate?.toLowerCase().includes(q) ||
          w.delivery_location?.toLowerCase().includes(q) ||
          w.sender_name?.toLowerCase().includes(q) ||
          w.receiver_name?.toLowerCase().includes(q),
      )
    }
    return list
  }, [waybills, tab, search])

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'internal', label: 'Internal' },
    { key: 'external', label: 'External' },
  ]

  return (
    <Layout title="Waybills" hidePageHeader>
      <PageShell className="pb-32">
        <PageIntro
          eyebrow="Logistics"
          title="Waybills"
          description="Keep dispatch records easy to scan, split internal and external movement quickly, and leave route details readable on smaller screens."
          meta={`${filtered.length} of ${waybills.length} waybill${waybills.length === 1 ? '' : 's'}`}
          tone="cyan"
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                className="rounded-2xl bg-white/90"
                onClick={() => setShowSearch((v) => !v)}
                aria-label="Toggle search"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                className="hidden h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold sm:inline-flex"
                onClick={() => navigate('/waybills/new')}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Waybill
              </Button>
            </>
          }
          toolbar={
            <div className="space-y-3">
              {showSearch ? (
                <input
                  autoFocus
                  type="text"
                  placeholder="Search waybill number, client, plate..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              ) : null}

              <div className="grid grid-cols-3 gap-1 rounded-[18px] border border-zinc-200 bg-zinc-100/80 p-1">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`rounded-[14px] px-3 py-2 text-sm font-semibold transition ${
                      tab === t.key
                        ? 'bg-white text-foreground shadow-[0_8px_16px_-12px_rgba(15,23,42,0.5)]'
                        : 'text-muted-foreground hover:bg-white/60'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-5 flex flex-col items-center justify-center gap-4 rounded-[26px] border border-dashed border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] py-16 text-center shadow-[0_18px_36px_-30px_rgba(15,23,42,0.45)]">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <Truck className="h-7 w-7" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">No waybills found</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {search ? 'Try a different search term' : 'Create your first waybill to get started'}
              </div>
            </div>
            {!search && (
              <button
                type="button"
                onClick={() => navigate('/waybills/new')}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                New Waybill
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {filtered.map((w) => {
              const statusMeta = getStatusMeta(w.status)
              const typeMeta = getTypeMeta(w.type)
              const typeContent = getWaybillTypeContent(w.type)
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => navigate(`/waybills/${w.id}`)}
                  className="w-full rounded-[24px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(247,249,252,1))] p-4 text-left shadow-[0_16px_34px_-30px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_40px_-32px_rgba(15,23,42,0.42)]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-700">Waybill</div>
                      <div className="mt-1 truncate text-base font-extrabold tracking-[-0.03em] text-foreground">{w.waybill_number || '—'}</div>
                      <div className="mt-1 truncate text-sm text-muted-foreground">{w.client_name || 'No client / internal movement'}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge className={typeMeta.className} label={typeMeta.label} />
                      <Badge className={statusMeta.className} label={statusMeta.label} />
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{formatWaybillDate(w.date)}</span>
                    {w.vehicle_plate && (
                      <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-medium text-blue-700">{w.vehicle_plate}</span>
                    )}
                  </div>

                  <div className="mb-3 text-sm text-muted-foreground">
                    {typeContent.locationLabel}: {w.delivery_location || '—'}
                  </div>

                  <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{w.sender_name || '—'}</span>
                    <span>→</span>
                    <span className="font-medium text-slate-700">{w.receiver_name || '—'}</span>
                  </div>
                  {!w.project_id ? (
                    <div className="mt-2 text-[11px] font-medium text-amber-700">Project link pending</div>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}

      <button
        type="button"
        onClick={() => navigate('/waybills/new')}
        className="fixed bottom-28 right-5 z-30 flex h-16 w-16 items-center justify-center rounded-[20px] bg-slate-950 text-white shadow-[0_22px_40px_-18px_rgba(15,23,42,0.65)] transition hover:bg-slate-900 active:scale-95 sm:hidden"
        aria-label="New Waybill"
      >
        <Plus className="h-6 w-6" />
      </button>
      </PageShell>
    </Layout>
  )
}
