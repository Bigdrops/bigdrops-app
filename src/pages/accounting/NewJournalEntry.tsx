import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronsUpDown, Minus, Plus } from 'lucide-react'
import Layout from '@/components/Layout'
import { Combobox } from '@/components/ui/combobox'
import { useEntity } from '@/lib/tenant/contexts'
import { feedback } from '@/lib/feedback'
import {
  buildIdempotencyKey,
  listAccounts,
  listPeriods,
  postJournalEntry,
  validatePostingLines,
  type AccountingAccount,
  type AccountingPeriod,
  type PostingLineInput,
} from '@/modules/accounting/accountingService'

const inputClass =
  'h-11 w-full rounded-xl border border-bd-border bg-transparent px-3 text-sm text-bd-text outline-none'

const labelClass =
  'mb-1 block text-[10px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-bd-text-muted'

interface FormLine extends PostingLineInput {
  key: number
}

export default function NewJournalEntry() {
  const navigate = useNavigate()
  const { entity, tenantClient } = useEntity()
  const [accounts, setAccounts] = React.useState<AccountingAccount[]>([])
  const [periods, setPeriods] = React.useState<AccountingPeriod[]>([])
  const [periodCode, setPeriodCode] = React.useState('')
  const [transactionDate, setTransactionDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [sourceType, setSourceType] = React.useState('manual')
  const [sourceId, setSourceId] = React.useState('')
  const [memo, setMemo] = React.useState('')
  const [lines, setLines] = React.useState<FormLine[]>([
    { key: 1, accountCode: '', side: 'debit', amount: '', memo: null },
    { key: 2, accountCode: '', side: 'credit', amount: '', memo: null },
  ])
  const [submitting, setSubmitting] = React.useState(false)
  const [balanceHint, setBalanceHint] = React.useState<string | null>(null)

  const periodOptions = React.useMemo(
    () =>
      periods.map((period) => ({
        value: period.code,
        label: period.code,
        description: `${period.start_date} → ${period.end_date}`,
      })),
    [periods],
  )

  const accountOptions = React.useMemo(
    () =>
      accounts.map((account) => ({
        value: account.code,
        label: `${account.code} · ${account.name}`,
        description: account.type,
      })),
    [accounts],
  )

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      if (!tenantClient.isReady) return
      try {
        const [accountRows, periodRows] = await Promise.all([listAccounts(tenantClient), listPeriods(tenantClient)])
        if (cancelled) return
        setAccounts(accountRows.filter((a) => a.active))
        const open = periodRows.filter((p) => p.state === 'open')
        setPeriods(open)
        if (open.length === 1) setPeriodCode(open[0].code)
      } catch (e) {
        if (!cancelled) feedback.error(e as Error)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [tenantClient])

  const updateLine = (key: number, patch: Partial<FormLine>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)))
    setBalanceHint(null)
  }

  const addLine = (side: 'debit' | 'credit') => {
    setLines((prev) => [...prev, { key: Math.max(...prev.map((l) => l.key)) + 1, accountCode: '', side, amount: '', memo: null }])
  }

  const removeLine = (key: number) => {
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((line) => line.key !== key)))
  }

  const checkBalance = () => {
    try {
      const totals = validatePostingLines(lines)
      setBalanceHint(`Balanced at ${totals.debits}. Ready to post.`)
    } catch (e) {
      setBalanceHint((e as Error).message)
    }
  }

  const handleSubmit = async () => {
    if (!entity) {
      feedback.error('No active entity selected.')
      return
    }
    setSubmitting(true)
    try {
      const result = await postJournalEntry(
        entity.id,
        {
          periodCode,
          transactionDate,
          sourceType,
          sourceId: sourceId.trim(),
          idempotencyKey: buildIdempotencyKey(sourceType.trim() || 'manual', sourceId.trim() || 'entry', 'post'),
          memo: memo.trim() || undefined,
        },
        lines,
      )
      feedback.success(`Entry posted. Debits equal credits at ${result.total_debits}.`)
      navigate('/accounting/journal')
    } catch (e) {
      feedback.error(e as Error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout title="Create Journal Entry">
      <div className="mx-auto w-full max-w-[var(--bd-layout-content-max,1200px)] space-y-3 px-4 pb-4 pt-3 md:px-[var(--bd-layout-padding,1.5rem)]">
        <div className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border)_/_0.8)] bg-[hsl(var(--bd-surface)_/_0.95)] p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="je-period">Open period</label>
              <Combobox
                options={periodOptions}
                value={periodCode}
                onChange={setPeriodCode}
                title="Open period"
                placeholder="Select period…"
                searchPlaceholder="Search period…"
                emptyText="No open periods available."
                mobileBehavior="drawer"
                desktopBehavior="popover"
                trigger={
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Open period"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click()
                    }}
                    className={`${inputClass} flex cursor-pointer items-center justify-between gap-2 text-left`}
                  >
                    <span
                      className={`min-w-0 flex-1 truncate ${periodCode ? '' : 'text-bd-text-muted'}`}
                    >
                      {periodOptions.find((o) => o.value === periodCode)?.label ??
                        'Select period…'}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-bd-text-muted" />
                  </div>
                }
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="je-date">Transaction date</label>
              <input
                id="je-date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="je-source-type">Source type</label>
              <input
                id="je-source-type"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                placeholder="manual"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="je-source-id">Source reference</label>
              <input
                id="je-source-id"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                placeholder="e.g. memo-001"
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelClass} htmlFor="je-memo">Memo (optional)</label>
            <input
              id="je-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="What is this entry for?"
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          {lines.map((line, index) => (
            <div
              key={line.key}
              className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border)_/_0.8)] bg-[hsl(var(--bd-surface)_/_0.95)] p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-bd-text-muted">
                  Line {index + 1} · {line.side}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  aria-label={`Remove line ${index + 1}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-bd-text-muted hover:bg-bd-surface-muted"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Combobox
                  options={accountOptions}
                  value={line.accountCode}
                  onChange={(next) => updateLine(line.key, { accountCode: next })}
                  title={`Line ${index + 1} account`}
                  placeholder="Select account…"
                  searchPlaceholder="Search code or name…"
                  emptyText="No accounts match this search."
                  mobileBehavior="drawer"
                  desktopBehavior="popover"
                  trigger={
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`Line ${index + 1} account`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click()
                      }}
                      className={`${inputClass} flex cursor-pointer items-center justify-between gap-2 text-left`}
                    >
                      <span
                        className={`min-w-0 flex-1 truncate ${line.accountCode ? '' : 'text-bd-text-muted'}`}
                      >
                        {accountOptions.find((o) => o.value === line.accountCode)?.label ??
                          'Select account…'}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 text-bd-text-muted" />
                    </div>
                  }
                />
                <input
                  value={line.amount}
                  onChange={(e) => updateLine(line.key, { amount: e.target.value })}
                  placeholder="0.00"
                  inputMode="decimal"
                  aria-label={`Line ${index + 1} amount`}
                  className={inputClass}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(['debit', 'credit'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => updateLine(line.key, { side })}
                    className={
                      line.side === side
                        ? 'h-10 rounded-xl bg-[hsl(var(--bd-nav-active-bg))] text-sm font-bold text-[hsl(var(--bd-nav-active-text))]'
                        : 'h-10 rounded-xl border border-bd-border text-sm font-bold text-bd-text-muted'
                    }
                  >
                    {side === 'debit' ? 'Debit' : 'Credit'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => addLine('debit')}
              className="flex h-11 items-center justify-center gap-1 rounded-xl border border-bd-border text-sm font-bold text-bd-text"
            >
              <Plus className="h-4 w-4" /> Debit line
            </button>
            <button
              type="button"
              onClick={() => addLine('credit')}
              className="flex h-11 items-center justify-center gap-1 rounded-xl border border-bd-border text-sm font-bold text-bd-text"
            >
              <Plus className="h-4 w-4" /> Credit line
            </button>
          </div>
        </div>

        {balanceHint && (
          <div className="rounded-xl border border-bd-border bg-bd-surface-muted px-3 py-2.5 text-xs font-semibold text-bd-text">
            {balanceHint}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={checkBalance}
            className="h-12 rounded-xl border border-bd-border text-sm font-bold text-bd-text"
          >
            Check Balance
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="h-12 rounded-xl bg-[hsl(var(--bd-nav-active-bg))] text-sm font-bold text-[hsl(var(--bd-nav-active-text))] disabled:opacity-50"
          >
            {submitting ? 'Posting…' : 'Post Entry'}
          </button>
        </div>
        <p className="text-center text-[11px] leading-snug text-bd-text-muted">
          Posted entries are immutable. Corrections use reversal entries, never edits.
        </p>
      </div>
    </Layout>
  )
}
