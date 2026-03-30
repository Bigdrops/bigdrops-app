import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, MoreHorizontal, Pencil, Plus, Search, Truck } from 'lucide-react'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { formatWaybillDate, getStatusMeta, getTypeMeta, getWaybillTypeContent, mapDbWaybill } from '../components/waybill/waybillUtils'
import type { Waybill } from '../components/waybill/waybillUtils'
import PageIntro from '../components/layout/PageIntro'
import { PageShell } from '../components/layout/PageShell'
import { Button } from '../components/ui/button'
import MobileFab from '../components/layout/MobileFab'
import MobileSegmentedControl from '../components/layout/MobileSegmentedControl'
import ListActionSheet from '../components/layout/ListActionSheet'

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
  const [activeWaybill, setActiveWaybill] = useState<Waybill | null>(null)

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

              <MobileSegmentedControl options={tabs} value={tab} onChange={(value) => setTab(value as FilterTab)} />
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
                  style={{ position: 'relative', background: '#fff', border: '1px solid hsl(214,32%,91%)', borderRadius: 22, boxShadow: '0 1px 2px rgba(15,23,42,.05)', padding: 16, cursor: 'pointer' }}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setActiveWaybill(w)
                    }}
                    className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-[14px] border border-slate-200 bg-white text-slate-900"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
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

      <MobileFab onClick={() => navigate('/waybills/new')} ariaLabel="Create waybill">
        <Plus className="h-6 w-6" />
      </MobileFab>
      <ListActionSheet
        open={Boolean(activeWaybill)}
        onOpenChange={(open) => {
          if (!open) setActiveWaybill(null)
        }}
        eyebrow={activeWaybill ? `Waybill ${activeWaybill.waybill_number || ''}`.trim() : 'Waybill'}
        title={activeWaybill?.client_name || 'No client / internal movement'}
        actions={activeWaybill ? [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-6 w-6" />,
            onClick: () => navigate(`/waybills/${activeWaybill.id}`),
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <Pencil className="h-6 w-6" />,
            onClick: () => navigate(`/waybills/${activeWaybill.id}/edit`),
          },
        ] : []}
      />
      </PageShell>
    </Layout>
  )
}
