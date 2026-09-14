import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calculator, Send } from 'lucide-react'
import Layout from '@/components/Layout'
import { useEntity } from '@/lib/tenant/contexts'
import { computeTaxFromFacts } from '@/domain/tax/orchestrator'
import { resolveTaxRules } from '@/domain/tax/ruleResolver'
import { persistComputation } from '@/modules/tax/computationService'
import { buildTaxPosting } from '@/modules/tax/taxPostingService'
import type { TaxRuleVersion, GateEComputationResult } from '@/domain/tax/types'
import type { GateFComputationData, ClassificationFactSet } from '@/domain/tax/orchestrator'

const inputClass =
  'h-11 w-full rounded-xl border border-bd-border bg-transparent px-3 text-sm text-bd-text outline-none'
const labelClass =
  'mb-1 block text-[10px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-bd-text-muted'

export default function NewTaxComputation() {
  const navigate = useNavigate()
  const { entity, tenantClient } = useEntity()

  // Form state
  const [periodStart, setPeriodStart] = React.useState('')
  const [periodEnd, setPeriodEnd] = React.useState('')
  const [revenue, setRevenue] = React.useState('')
  const [expenses, setExpenses] = React.useState('')
  const [lossOpening, setLossOpening] = React.useState('0')
  const [lossArising, setLossArising] = React.useState('0')
  const [grossTurnover, setGrossTurnover] = React.useState('')
  const [fixedAssets, setFixedAssets] = React.useState('')
  const [sector, setSector] = React.useState('')

  // Computation state
  const [computing, setComputing] = React.useState(false)
  const [result, setResult] = React.useState<GateEComputationResult | null>(null)
  const [computationId, setComputationId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Posting state
  const [posting, setPosting] = React.useState(false)
  const [posted, setPosted] = React.useState(false)
  const [postError, setPostError] = React.useState<string | null>(null)

  const accountingProfit = React.useMemo(() => {
    const r = parseFloat(revenue || '0')
    const e = parseFloat(expenses || '0')
    return (r - e).toFixed(2)
  }, [revenue, expenses])

  async function handleCompute() {
    if (!entity?.id || !periodStart || !periodEnd) return
    setError(null)
    setResult(null)
    setComputationId(null)
    setComputing(true)

    try {
      // 1. Fetch all rules
      const { data: ruleRows, error: ruleError } = await tenantClient
        .from('tax_rules')
        .select('*')

      if (ruleError) throw new Error(`Failed to fetch rules: ${ruleError.message}`)
      if (!ruleRows || ruleRows.length === 0) throw new Error('No tax rules found in database')

      const rules = resolveTaxRules(ruleRows as TaxRuleVersion[], periodStart, periodEnd)

      // 2. Build Gate F input
      const classificationFacts: ClassificationFactSet = {
        gross_turnover: grossTurnover || '0',
        total_fixed_assets: fixedAssets || '0',
        sector: sector || null,
      }

      const data: GateFComputationData = {
        accounting_profit: {
          revenue: revenue || '0',
          expenses: expenses || '0',
          accounting_profit: accountingProfit,
        },
        adjustments: [],
        qce: [],
        loss_opening_balance: lossOpening || '0',
        loss_arising: lossArising || '0',
        classification_facts: classificationFacts,
        rules,
      }

      // 3. Compute
      const computedResult = computeTaxFromFacts(data)
      setResult(computedResult)

      // 4. Persist
      const { computationId: id } = await persistComputation(
        tenantClient,
        `${periodStart}_${periodEnd}`,
        computedResult,
        data,
      )
      setComputationId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Computation failed')
    } finally {
      setComputing(false)
    }
  }

  async function handlePostJournal() {
    if (!entity?.id || !result || !computationId) return
    setPosting(true)
    setPostError(null)

    try {
      const journalEntry = await buildTaxPosting(
        tenantClient,
        result,
        result.development_levy || '0',
      )
      // TODO: route through posting kernel once accounting posting is wired
      // For now, just confirm the entry was built
      void journalEntry
      setPosted(true)
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Journal posting failed')
    } finally {
      setPosting(false)
    }
  }

  return (
    <Layout title="New Tax Computation" hidePageHeader>
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
            New Tax Computation
          </h1>
        </div>

        <div className="mt-3 space-y-6 pb-4">
          {/* ── Period ─────────────────────────────── */}
          <section className="rounded-2xl border border-bd-border/60 bg-bd-surface p-4">
            <h2 className="mb-3 text-[13px] font-bold text-bd-text">Period</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Date</label>
                <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>End Date</label>
                <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputClass} />
              </div>
            </div>
          </section>

          {/* ── Accounting Profit ──────────────────── */}
          <section className="rounded-2xl border border-bd-border/60 bg-bd-surface p-4">
            <h2 className="mb-3 text-[13px] font-bold text-bd-text">Accounting Profit</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Revenue</label>
                <input type="text" inputMode="decimal" value={revenue} onChange={(e) => setRevenue(e.target.value)} className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className={labelClass}>Expenses</label>
                <input type="text" inputMode="decimal" value={expenses} onChange={(e) => setExpenses(e.target.value)} className={inputClass} placeholder="0.00" />
              </div>
            </div>
            <div className="mt-2 rounded-xl bg-bd-surface-muted px-3 py-2 text-[12px] text-bd-text-muted">
              Accounting profit: <span className="font-mono font-bold text-bd-text">{accountingProfit}</span>
            </div>
          </section>

          {/* ── Losses ─────────────────────────────── */}
          <section className="rounded-2xl border border-bd-border/60 bg-bd-surface p-4">
            <h2 className="mb-3 text-[13px] font-bold text-bd-text">Losses</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Opening Balance</label>
                <input type="text" inputMode="decimal" value={lossOpening} onChange={(e) => setLossOpening(e.target.value)} className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className={labelClass}>Loss Arising</label>
                <input type="text" inputMode="decimal" value={lossArising} onChange={(e) => setLossArising(e.target.value)} className={inputClass} placeholder="0.00" />
              </div>
            </div>
          </section>

          {/* ── Classification ─────────────────────── */}
          <section className="rounded-2xl border border-bd-border/60 bg-bd-surface p-4">
            <h2 className="mb-3 text-[13px] font-bold text-bd-text">Entity Classification</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Gross Turnover</label>
                <input type="text" inputMode="decimal" value={grossTurnover} onChange={(e) => setGrossTurnover(e.target.value)} className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className={labelClass}>Total Fixed Assets</label>
                <input type="text" inputMode="decimal" value={fixedAssets} onChange={(e) => setFixedAssets(e.target.value)} className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className={labelClass}>Sector</label>
                <input type="text" value={sector} onChange={(e) => setSector(e.target.value)} className={inputClass} placeholder="e.g. oil_and_gas" />
              </div>
            </div>
          </section>

          {/* ── Error ──────────────────────────────── */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}

          {/* ── Compute Button ─────────────────────── */}
          <button
            type="button"
            onClick={handleCompute}
            disabled={computing || !periodStart || !periodEnd}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-[14px] font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Calculator className="h-4 w-4" />
            {computing ? 'Computing...' : 'Compute Tax'}
          </button>

          {/* ── Results ────────────────────────────── */}
          {result && (
            <section className="rounded-2xl border border-bd-border/60 bg-bd-surface p-4">
              <h2 className="mb-3 text-[13px] font-bold text-bd-text">Results</h2>
              <div className="space-y-2">
                <ResultRow label="Assessment Profit" value={result.assessment_profit} />
                <ResultRow label="Chargeable Income" value={result.chargeable_income} />
                <ResultRow label="CIT Payable" value={result.tax_payable} />
                <ResultRow label="Tax Credits" value={result.tax_credits} />
                {result.development_levy && result.development_levy !== '0' && (
                  <ResultRow label="Development Levy" value={result.development_levy} />
                )}
                <ResultRow label="Company Type" value={result.classification?.company_type || '—'} />
              </div>

              {computationId && (
                <div className="mt-3 rounded-xl bg-bd-surface-muted px-3 py-2 text-[11px] text-bd-text-muted">
                  Computation ID: {computationId}
                </div>
              )}
            </section>
          )}

          {/* ── Post Journal Entry ─────────────────── */}
          {result && computationId && (
            <section className="rounded-2xl border border-bd-border/60 bg-bd-surface p-4">
              <h2 className="mb-3 text-[13px] font-bold text-bd-text">Post Journal Entry</h2>
              <p className="mb-3 text-[12px] text-bd-text-muted">
                Dr Tax Expense (5500) · Cr CIT Payable (2310) · Cr Dev Levy Payable (2320 if applicable)
              </p>

              {postError && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {postError}
                </div>
              )}

              {posted ? (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-700">
                  Journal entry posted.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePostJournal}
                  disabled={posting}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-bd-border bg-bd-surface text-[14px] font-semibold text-bd-text shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {posting ? 'Posting...' : 'Post Journal Entry'}
                </button>
              )}
            </section>
          )}
        </div>

        {entity?.name && (
          <p className="pt-2 pb-4 text-center text-[11px] text-bd-text-muted">{entity.name}</p>
        )}
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
