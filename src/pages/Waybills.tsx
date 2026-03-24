import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Truck } from 'lucide-react'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { formatWaybillDate, getStatusMeta, getTypeMeta } from '../components/waybill/waybillUtils'
import type { Waybill } from '../components/waybill/waybillUtils'

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
          setWaybills((data as Waybill[]) || [])
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
          w.delivery_location?.toLowerCase().includes(q),
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
      <div className="w-full py-4 pb-32">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Waybills</h2>
            <p className="text-xs text-muted-foreground">{waybills.length} total</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSearch((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-muted/50"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/waybills/new')}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              New Waybill
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="mb-4">
            <input
              autoFocus
              type="text"
              placeholder="Search waybill number, client, plate…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="mb-4 flex gap-1.5 rounded-xl border border-border bg-card p-1 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
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
          <div className="space-y-3">
            {filtered.map((w) => {
              const statusMeta = getStatusMeta(w.status)
              const typeMeta = getTypeMeta(w.type)
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => navigate(`/waybills/${w.id}`)}
                  className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:shadow-md hover:border-slate-300"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-foreground">{w.waybill_number || '—'}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{w.client_name || 'No client'}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge className={typeMeta.className} label={typeMeta.label} />
                      <Badge className={statusMeta.className} label={statusMeta.label} />
                    </div>
                  </div>

                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{formatWaybillDate(w.date)}</span>
                    {w.vehicle_plate && (
                      <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-medium text-blue-700">{w.vehicle_plate}</span>
                    )}
                  </div>

                  {w.delivery_location && (
                    <div className="mb-2 text-xs text-muted-foreground">
                      📍 {w.delivery_location}
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{w.sender_name || '—'}</span>
                    <span>→</span>
                    <span className="font-medium text-slate-700">{w.receiver_name || '—'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate('/waybills/new')}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg text-white transition hover:bg-emerald-700 active:scale-95"
        aria-label="New Waybill"
      >
        <Plus className="h-6 w-6" />
      </button>
    </Layout>
  )
}
