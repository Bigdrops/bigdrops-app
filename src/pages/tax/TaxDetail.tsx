import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Layout from '@/components/Layout'
import { useEntity } from '@/lib/tenant/contexts'

interface ComputationResult {
  id: string
  accounting_period_id: string
  computation_input_id: string
  assessment_profit: string
  chargeable_income: string
  tax_payable: string
  tax_credits: string
  status: string
  created_at: string
  input_snapshot: Record<string, unknown> | null
}

const statusBadge = (status: string) =>
  status === 'finalized'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'

export default function TaxDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { tenantClient } = useEntity()
  const [row, setRow] = React.useState<ComputationResult | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!tenantClient?.isReady || !id) return
    setLoading(true)
    tenantClient
      .from('tax_computation_results')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: dbError }) => {
        if (dbError) {
          setError(dbError.message)
        } else {
          setRow(data as ComputationResult)
        }
        setLoading(false)
      })
  }, [tenantClient, id])

  const snapshot = row?.input_snapshot as Record<string, unknown> | undefined
  const developmentLevy = (snapshot?.development_levy as string) || '0'
  const classification = snapshot?.classification as Record<string, string> | undefined
  const trace = snapshot?.trace as Array<{ step: string; amount: string; note?: string }> | undefined

  return (
    <Layout title="Tax Computation" hidePageHeader>
      <div className="mx-auto w-full max-w-[var(--bd-layout-content-max,800px)] px-4 pt-2 md:px-[var(--bd-layout-padding,1.5rem)]">
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
            Tax Computation
          </h1>
          {row && (
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadge(row.status)}`}>
              {row.status}
            </span>
          )}
        </div>

        <div className="mt-3 space-y-6 pb-4">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-bd-border px-4 py-10 text-center text-sm text-bd-text-muted">
              Loading...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center text-sm text-red-700">
              {error}
            </div>
          ) : row ? (
            <>
              {/* ── Core Results ──────────────────────── */}
              <section className="rounded-2xl border border-bd-border/60 bg-bd-surface p-4">
                <h2 className="mb-3 text-[13px] font-bold text-bd-text">Results</h2>
                <div className="space-y-2">
                  <ResultRow label="Assessment Profit" value={row.assessment_profit} />
                  <ResultRow label="Chargeable Income" value={row.chargeable_income} />
                  <ResultRow label="CIT Payable" value={row.tax_payable} />
                  <ResultRow label="Tax Credits" value={row.tax_credits} />
                  {developmentLevy !== '0' && (
                    <ResultRow label="Development Levy" value={developmentLevy} />
                  )}
                </div>
              </section>

              {/* ── Classification ────────────────────── */}
              {classification && (
                <section className="rounded-2xl border border-bd-border/60 bg-bd-surface p-4">
                  <h2 className="mb-3 text-[13px] font-bold text-bd-text">Classification</h2>
                  <div className="space-y-2">
                    <ResultRow label="Entity Type" value={classification.entity_type || '—'} />
                    <ResultRow label="Company Type" value={classification.company_type || '—'} />
                  </div>
                </section>
              )}

              {/* ── Computation Trace ─────────────────── */}
              {trace && trace.length > 0 && (
                <section className="rounded-2xl border border-bd-border/60 bg-bd-surface p-4">
                  <h2 className="mb-3 text-[13px] font-bold text-bd-text">Computation Trace</h2>
                  <div className="space-y-2">
                    {trace.map((step, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl bg-bd-surface-muted px-3 py-2">
                        <span className="text-[12px] text-bd-text-muted">{step.step}</span>
                        <span className="font-mono text-[13px] font-bold text-bd-text">{step.amount}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Meta ─────────────────────────────── */}
              <section className="rounded-2xl border border-bd-border/60 bg-bd-surface p-4">
                <h2 className="mb-3 text-[13px] font-bold text-bd-text">Details</h2>
                <div className="space-y-2">
                  <ResultRow label="Computation ID" value={row.id} />
                  <ResultRow label="Period" value={row.accounting_period_id} />
                  <ResultRow label="Created" value={new Date(row.created_at).toLocaleDateString()} />
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </Layout>
  )
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-bd-surface-muted px-3 py-2">
      <span className="text-[12px] text-bd-text-muted">{label}</span>
      <span className="font-mono text-[13px] font-bold text-bd-text">{value}</span>
    </div>
  )
}
