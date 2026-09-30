import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit3, Palette, Printer, Share2 } from 'lucide-react'

import Layout from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { normalizeDbBoq } from '@/domain/boq/normalize'
import type { Boq } from '@/domain/boq/types'
import { buildBoqViewData } from '@/domain/boq/viewData'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'
import { cn } from '@/lib/utils'

const moneyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})

function formatMoney(value: number) {
  return moneyFormatter.format(value || 0)
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`
}

export default function ViewBoq() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenantClient } = useEntity()
  const [boq, setBoq] = useState<Boq | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantClient.isReady) return
    let active = true

    async function load() {
      if (!id) {
        navigate('/boqs')
        return
      }

      setLoading(true)
      const [boqResult, rowsResult] = await Promise.all([
        tenantClient.from('boqs').select('*').eq('id', id).single(),
        tenantClient.from('boq_rows').select('*').eq('boq_id', id).order('sort_order'),
      ])

      if (!active) return
      if (boqResult.error || !boqResult.data) {
        feedback.error('Cost & Pricing Sheet not found')
        navigate('/boqs')
        return
      }

      setBoq(normalizeDbBoq(boqResult.data, rowsResult.data || []))
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [id, navigate, tenantClient, tenantClient.isReady])

  const viewData = useMemo(() => (boq ? buildBoqViewData(boq) : null), [boq])

  if (loading || !boq || !viewData) {
    return (
      <Layout title="Cost & Pricing Sheet" session={null} hidePageHeader immersive>
        <div className="min-h-[60vh] p-12 text-center text-sm text-bd-text-muted">Loading Cost & Pricing Sheet...</div>
      </Layout>
    )
  }

  const status = String((boq as any).status || 'Draft')

  return (
    <Layout title="Cost & Pricing Sheet" session={null} hidePageHeader immersive>
      <div className="min-h-screen bg-bd-surface-muted text-bd-text">
        <header className="sticky top-0 z-30 border-b border-bd-border bg-bd-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('/boqs')} aria-label="Back to Cost & Pricing Sheets">
                <ArrowLeft />
              </Button>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-bd-text-muted">Cost & Pricing Sheet</p>
                <h1 className="truncate text-lg font-semibold">{boq.title || boq.boq_number}</h1>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              <Button type="button" variant="outline" onClick={() => navigate(`/boqs/edit/${boq.id}`)} className="shrink-0">
                <Edit3 />
                Edit
              </Button>
              <Button type="button" variant="outline" disabled className="shrink-0">
                <Palette />
                Customize
              </Button>
              <Button type="button" variant="outline" disabled className="shrink-0">
                <Printer />
                Export
              </Button>
              <Button type="button" variant="outline" disabled className="shrink-0">
                <Share2 />
                Share
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-[1600px] gap-4 px-3 py-4 pb-24 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-4">
          <section className="space-y-4">
            <div className="rounded-lg border border-bd-border bg-bd-surface p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-bd-border bg-bd-surface-muted px-2.5 py-1 text-xs font-semibold text-bd-text-muted">
                      {boq.boq_number}
                    </span>
                    <span className="rounded-full border border-bd-status-info-border bg-bd-status-info-bg px-2.5 py-1 text-xs font-semibold text-bd-status-info-text">
                      {status}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">{boq.title || 'Untitled Cost & Pricing Sheet'}</h2>
                  <div className="mt-3 grid gap-2 text-sm text-bd-text-muted sm:grid-cols-3">
                    <Meta label="Client / project" value={boq.vendor_name || '-'} />
                    <Meta label="Site / reference" value={boq.vendor_contact || '-'} />
                    <Meta label="Issue date" value={boq.issue_date || '-'} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-bd-border bg-bd-surface shadow-sm">
              <div className="border-b border-bd-border p-3">
                <h2 className="text-sm font-semibold">Pricing schedule</h2>
                <p className="text-xs text-bd-text-muted">CP remains internal to this Cost & Pricing Sheet. SP is the selling rate.</p>
              </div>
              <div className="divide-y divide-bd-border">
                {viewData.rows.map((row) => {
                  if (row.type === 'group') {
                    return (
                      <div key={row.key} className="bg-bd-surface-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-bd-text-muted">
                        {row.title}
                      </div>
                    )
                  }

                  return (
                    <article key={row.key} className="grid gap-3 p-3 xl:grid-cols-[48px_minmax(220px,1.5fr)_repeat(7,minmax(84px,0.6fr))] xl:items-start">
                      <div className="rounded-md bg-bd-surface-muted px-2 py-1 text-center font-mono text-xs font-semibold text-bd-text-muted">{row.number}</div>
                      <div className="min-w-0">
                        <div className="font-medium">{row.description || '-'}</div>
                        {row.specification ? <div className="mt-1 text-sm text-bd-text-muted">{row.specification}</div> : null}
                        {row.makeBrand ? <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-bd-text-muted">{row.makeBrand}</div> : null}
                        {row.notes ? <div className="mt-2 text-xs text-bd-text-muted">{row.notes}</div> : null}
                        {row.imageUrl ? (
                          <img src={row.imageUrl} alt="" className="mt-3 h-20 w-20 rounded-lg border border-bd-border object-cover" />
                        ) : null}
                      </div>
                      <ViewCell label="Qty" value={`${row.quantity} ${row.unit}`.trim()} />
                      <ViewCell label="CP" value={formatMoney(row.cp)} mono />
                      <ViewCell label="SP" value={formatMoney(row.sp)} mono />
                      <ViewCell label="Cost" value={formatMoney(row.cost)} mono />
                      <ViewCell label="Selling" value={formatMoney(row.selling)} mono />
                      <ViewCell label="Profit" value={formatMoney(row.profit)} mono tone={row.profit >= 0 ? 'good' : 'bad'} />
                      <ViewCell label="Margin" value={formatPercent(row.marginPercent)} mono tone={row.marginPercent >= 0 ? 'good' : 'bad'} />
                    </article>
                  )
                })}
              </div>
            </div>

            {boq.notes ? (
              <div className="rounded-lg border border-bd-border bg-bd-surface p-4 shadow-sm">
                <h2 className="text-sm font-semibold">Notes</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-bd-text-muted">{boq.notes}</p>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-lg border border-bd-border bg-bd-surface p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Totals</h2>
              <div className="mt-3 space-y-2 text-sm">
                <SummaryLine label="Total Cost" value={formatMoney(viewData.totals.total_cost)} />
                <SummaryLine label="Total Selling" value={formatMoney(viewData.totals.total_selling_price)} />
                <SummaryLine label="Gross Profit" value={formatMoney(viewData.totals.gross_profit)} tone={viewData.totals.gross_profit >= 0 ? 'good' : 'bad'} />
                <SummaryLine label="Margin" value={formatPercent(viewData.totals.margin_percent)} tone={viewData.totals.margin_percent >= 0 ? 'good' : 'bad'} />
              </div>
            </div>
          </aside>
        </main>
      </div>
    </Layout>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-bd-text-muted">{label}</div>
      <div className="mt-1 font-medium text-bd-text">{value}</div>
    </div>
  )
}

function ViewCell({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: 'good' | 'bad' }) {
  return (
    <div>
      <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-bd-text-muted xl:hidden">{label}</div>
      <div className={cn('text-sm font-semibold', mono && 'font-mono', tone === 'good' && 'text-bd-status-success-text', tone === 'bad' && 'text-destructive')}>
        {value}
      </div>
    </div>
  )
}

function SummaryLine({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-bd-border/60 py-2 last:border-0">
      <span className="text-bd-text-muted">{label}</span>
      <span className={cn('font-mono font-semibold', tone === 'good' && 'text-bd-status-success-text', tone === 'bad' && 'text-destructive')}>
        {value}
      </span>
    </div>
  )
}
