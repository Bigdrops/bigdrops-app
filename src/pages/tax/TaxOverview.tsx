import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react'
import Layout from '@/components/Layout'
import { useEntity } from '@/lib/tenant/contexts'

interface ComputationRow {
  id: string
  accounting_period_id: string
  assessment_profit: string
  chargeable_income: string
  tax_payable: string
  status: string
  created_at: string
}

const statusBadge = (status: string) =>
  status === 'finalized'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'

export default function TaxOverview() {
  const navigate = useNavigate()
  const { entity, tenantClient } = useEntity()
  const [rows, setRows] = React.useState<ComputationRow[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!tenantClient?.isReady) return
    setLoading(true)
    tenantClient
      .from('tax_computation_results')
      .select('id, accounting_period_id, assessment_profit, chargeable_income, tax_payable, status, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setRows(data as ComputationRow[])
        setLoading(false)
      })
  }, [tenantClient])

  return (
    <Layout title="Tax" hidePageHeader>
      <div className="mx-auto w-full max-w-[var(--bd-layout-content-max,1200px)] px-4 pt-2 md:px-[var(--bd-layout-padding,1.5rem)]">
        <div className="flex items-center gap-1 py-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-bd-text transition-colors outline-none active:bg-bd-surface-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-[-0.02em] text-bd-text">
            Tax
          </h1>
          <button
            type="button"
            onClick={() => navigate('/tax/new')}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-3 text-[13px] font-semibold text-white shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>

        <div className="mt-3 pb-4">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-bd-border px-4 py-10 text-center text-sm text-bd-text-muted">
              Loading...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-bd-border px-4 py-10 text-center text-sm text-bd-text-muted">
              No tax computations yet. Tap New to run one.
            </div>
          ) : (
            <div className="divide-y divide-bd-border/60 overflow-hidden rounded-2xl border border-bd-border/60 bg-bd-surface">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => navigate(`/tax/${row.id}`)}
                  className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors outline-none active:bg-bd-surface-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-bd-text">
                      Period {row.accounting_period_id.slice(0, 8)}
                    </span>
                    <span className="block truncate text-[12px] text-bd-text-muted">
                      Tax payable: {row.tax_payable || '—'} · {row.status}
                    </span>
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadge(row.status)}`}>
                    {row.status}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-bd-text-muted" />
                </button>
              ))}
            </div>
          )}
        </div>

        {entity?.name && (
          <p className="pt-2 pb-4 text-center text-[11px] text-bd-text-muted">{entity.name}</p>
        )}
      </div>
    </Layout>
  )
}
