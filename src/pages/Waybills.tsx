import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Plus, Truck } from 'lucide-react'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { formatWaybillDate, getStatusMeta, getTypeMeta, mapDbWaybill } from '../components/waybill/waybillUtils'
import type { Waybill } from '../components/waybill/waybillUtils'
import MobileFab from '../components/layout/MobileFab'
import MobileSegmentedControl from '../components/layout/MobileSegmentedControl'
import ListActionSheet from '../components/layout/ListActionSheet'
import MobileListPageShell from '../components/layout/MobileListPageShell'
import EntityListCard from '../components/list/EntityListCard'

type FilterTab = 'all' | 'internal' | 'external'

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
      <MobileListPageShell
          eyebrow="Logistics"
          title="Waybills"
          summary={`${waybills.length} waybill${waybills.length === 1 ? '' : 's'}`}
          tone="cyan"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search waybills..."
          segmentedControl={<MobileSegmentedControl options={tabs} value={tab} onChange={(value) => setTab(value as FilterTab)} />}
      >

        {loading ? (
          <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[26px] border border-dashed border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] py-16 text-center shadow-[0_18px_36px_-30px_rgba(15,23,42,0.45)]">
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
                <EntityListCard
                  key={w.id}
                  leading={<div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-100 bg-cyan-50 text-lg font-extrabold text-cyan-500">W</div>}
                  kicker="Waybill"
                  title={w.waybill_number || '—'}
                  subtitle={w.client_name || 'No client / internal movement'}
                  chips={[
                    { label: statusMeta.label, tone: statusMeta.label.toLowerCase() === 'delivered' ? 'delivered' : 'dispatched' },
                    { label: typeMeta.label, tone: w.type === 'internal' ? 'scope' : 'tag' },
                  ]}
                  metadata={[
                    formatWaybillDate(w.date),
                    ...(w.vehicle_plate ? [w.vehicle_plate] : []),
                  ]}
                  footer={
                    <div className="space-y-2 border-t border-slate-200 pt-3">
                      <div className="text-sm text-slate-600">{w.delivery_location || '—'}</div>
                      {!w.project_id ? <div className="text-sm font-medium text-amber-700">Project link pending</div> : null}
                    </div>
                  }
                  onClick={() => navigate(`/waybills/${w.id}`)}
                  onAction={() => setActiveWaybill(w)}
                />
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
      </MobileListPageShell>
    </Layout>
  )
}
