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
          meta={`${waybills.length} waybill${waybills.length === 1 ? '' : 's'}`}
          tone="cyan"
          actions={
            <Button
              type="button"
              className="h-11 rounded-[14px] bg-slate-950 px-4 text-sm font-semibold"
              onClick={() => navigate('/waybills/new')}
            >
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          }
          toolbar={
            <div className="space-y-3">
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, height: 44, borderRadius: 14, border: '1px solid hsl(214,32%,91%)', background: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', color: 'hsl(215,16%,47%)' }}>
                <Search className="h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search waybills..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                    style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: 14, color: '#0f172a' }}
                />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, padding: 4, borderRadius: 16, background: 'hsl(210,40%,96%)', border: '1px solid hsl(214,32%,91%)', marginTop: 14 }}>
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    style={tab === t.key
                      ? { height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#fff', color: '#0f172a', boxShadow: '0 1px 2px rgba(15,23,42,.05)', border: 'none' }
                      : { height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'hsl(215,16%,47%)', background: 'transparent', border: 'none' }}
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
          <div className="mt-4 space-y-3">
            {filtered.map((w) => {
              const statusMeta = getStatusMeta(w.status)
              const typeMeta = getTypeMeta(w.type)
              return (
                <div
                  key={w.id}
                  onClick={() => navigate(`/waybills/${w.id}`)}
                  style={{ background: '#fff', border: '1px solid hsl(214,32%,91%)', borderRadius: 22, boxShadow: '0 1px 2px rgba(15,23,42,.05)', padding: 16, cursor: 'pointer' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 800, background: '#06b6d41f', color: '#06b6d4' }}>
                      W
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', color: 'hsl(215,16%,47%)' }}>Waybill</div>
                      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700, letterSpacing: '-.03em', color: '#0f172a' }}>{w.waybill_number || '—'}</div>
                      <div style={{ marginTop: 4, fontSize: 14, color: 'hsl(215,16%,47%)' }}>{w.client_name || 'No client / internal movement'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    <Badge className={statusMeta.className} label={statusMeta.label} />
                    <Badge className={typeMeta.className} label={typeMeta.label} />
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 12, color: 'hsl(215,16%,47%)', fontSize: 13, lineHeight: 1.45 }}>
                    <span>{formatWaybillDate(w.date)}</span>
                    {w.vehicle_plate ? <span>•</span> : null}
                    {w.vehicle_plate ? <span>{w.vehicle_plate}</span> : null}
                  </div>

                  <div style={{ height: 1, background: 'hsl(214,32%,91%)', margin: '14px 0' }} />
                  <div style={{ fontSize: 14, color: 'hsl(215,16%,47%)' }}>{w.delivery_location || '—'}</div>
                  {!w.project_id ? <div style={{ marginTop: 8, color: 'hsl(35 76% 34%)', fontSize: 14 }}>Project link pending</div> : null}
                </div>
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
