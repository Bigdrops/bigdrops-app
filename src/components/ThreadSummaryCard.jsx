/**
 * ThreadSummaryCard.jsx
 *
 * Three-layer project billing dashboard shown on ViewInvoice
 * whenever an invoice belongs to a thread.
 *
 * Layer 1 — Contract context
 * Layer 2 — Billing progress (what has been invoiced)
 * Layer 3 — Payment progress (what has been received)
 * + Invoice timeline with role badges
 * + Action buttons (create progress / final invoice)
 *
 * Props:
 *   threadId          — UUID
 *   currentInvoiceId  — highlights current invoice in timeline
 *   onCreateNext      — (defaults) => void — called with buildNextInvoiceDefaults()
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useInvoiceThread,
  fmtN,
  getInvoicePaymentStatus,
  getRoleLabel,
} from '../hooks/useInvoiceThread'
import { Loader2, ChevronRight, TrendingUp, AlertTriangle } from 'lucide-react'
import RecordPaymentModal from './RecordPaymentModal'

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = 'bg-emerald-500' }) {
  return (
    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">
      {children}
    </p>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ThreadSummaryCard({ threadId, currentInvoiceId, onCreateNext }) {
  const { invoices, loading, error, summary, refetch, buildNextInvoiceDefaults } = useInvoiceThread(threadId)
  const [payTarget, setPayTarget] = useState(null)

  if (!threadId) return null

  if (loading) return (
    <div className="flex items-center gap-2 py-4 text-zinc-400 text-xs font-bold">
      <Loader2 size={14} className="animate-spin" /> Loading thread…
    </div>
  )

  if (error) return (
    <div className="text-xs text-red-500 font-bold py-2">Thread error: {error}</div>
  )

  const {
    contractTotal,
    totalInvoiced,
    totalReceived,
    outstanding,
    remainingToInvoice,
    billingPct,
    paymentPct,
    isClosed,
  } = summary

  const advanceInvoice = invoices.find(i => i.thread_role === 'advance')
  const jobTitle = advanceInvoice?.job_title || advanceInvoice?.invoice_title || ''
  const isOverInvoiced = totalInvoiced > contractTotal && contractTotal > 0

  const handleCreateProgress = () => {
    if (onCreateNext) onCreateNext(buildNextInvoiceDefaults())
  }

  const handleCreateFinal = () => {
    const defaults = buildNextInvoiceDefaults()
    if (defaults && onCreateNext) onCreateNext({ ...defaults, thread_role: 'final' })
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-6">

      {/* ── Layer 1: Contract context ── */}
      <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-zinc-400" />
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Job Thread</span>
          </div>
          {isClosed && (
            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Closed
            </span>
          )}
        </div>

        {jobTitle && (
          <h3 className="text-sm font-black text-zinc-950 mb-1 truncate">{jobTitle}</h3>
        )}

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] text-zinc-400 font-bold">Contract Value</p>
            <p className="text-2xl font-black text-zinc-950 tracking-tight">₦{fmtN(contractTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-400 font-bold">Invoices</p>
            <p className="text-2xl font-black text-zinc-950">{invoices.length}</p>
          </div>
        </div>

        {/* Over-invoiced warning */}
        {isOverInvoiced && (
          <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertTriangle size={13} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600 font-bold">
              Invoiced amount exceeds contract value by ₦{fmtN(totalInvoiced - contractTotal)}
            </p>
          </div>
        )}
      </div>

      {/* ── Layer 2: Billing progress ── */}
      <div className="px-5 py-4 border-b border-zinc-100">
        <SectionLabel>Billing Progress</SectionLabel>

        {/* Per-invoice billing rows */}
        <div className="space-y-2 mb-3">
          {invoices.map(inv => {
            const role = getRoleLabel(inv.thread_role)
            const pct  = contractTotal > 0
              ? ((Number(inv.total || 0) / contractTotal) * 100).toFixed(1)
              : '0'
            return (
              <div key={inv.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${role.bg} ${role.text}`}>
                    {role.label}
                  </span>
                  <span className="text-zinc-500 font-bold truncate">{inv.invoice_number}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-zinc-400 font-bold">{pct}%</span>
                  <span className="font-black text-zinc-950">₦{fmtN(inv.total)}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-zinc-100 pt-3 space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-zinc-500">Total Invoiced</span>
            <span className="text-zinc-950">₦{fmtN(totalInvoiced)} ({billingPct}%)</span>
          </div>
          <ProgressBar pct={billingPct} color="bg-blue-500" />
          <div className="flex justify-between text-[10px] font-bold text-zinc-400 pt-1">
            <span>Remaining to Invoice</span>
            <span>₦{fmtN(remainingToInvoice)}</span>
          </div>
        </div>
      </div>

      {/* ── Layer 3: Payment progress ── */}
      <div className="px-5 py-4 border-b border-zinc-100">
        <SectionLabel>Payment Progress</SectionLabel>

        <div className="space-y-2 mb-3">
          {invoices.map(inv => {
            const received = Number(inv.amount_received || 0)
            if (received <= 0) return null
            return (
              <div key={inv.id} className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-bold">{inv.invoice_number}</span>
                <span className="font-black text-emerald-700">₦{fmtN(received)}</span>
              </div>
            )
          })}
          {invoices.every(inv => Number(inv.amount_received || 0) === 0) && (
            <p className="text-xs text-zinc-400 font-bold">No payments recorded yet</p>
          )}
        </div>

        <div className="border-t border-zinc-100 pt-3 space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-zinc-500">Total Received</span>
            <span className="text-emerald-700">₦{fmtN(totalReceived)} ({paymentPct}%)</span>
          </div>
          <ProgressBar pct={paymentPct} color="bg-emerald-500" />
          <div className="flex justify-between text-[10px] font-bold text-zinc-400 pt-1">
            <span>Outstanding</span>
            <span className={outstanding > 0 ? 'text-red-500' : 'text-emerald-600'}>
              ₦{fmtN(outstanding)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Invoice timeline ── */}
      <div className="divide-y divide-zinc-50">
        {invoices.map((inv, i) => {
          const ps      = getInvoicePaymentStatus(inv)
          const role    = getRoleLabel(inv.thread_role)
          const isCurr  = inv.id === currentInvoiceId
          const colorMap = {
            green: 'text-emerald-600 bg-emerald-50',
            amber: 'text-amber-600 bg-amber-50',
            red:   'text-red-500 bg-red-50',
          }

          return (
            <div key={inv.id} className={`px-5 py-3 flex items-center gap-3 ${isCurr ? 'bg-zinc-50' : ''}`}>
              <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-500 text-[10px] font-black flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${role.bg} ${role.text}`}>
                    {role.label}
                  </span>
                  <span className="text-xs font-bold text-zinc-800 truncate">{inv.invoice_number}</span>
                  {isCurr && (
                    <span className="text-[8px] font-black bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full">
                      CURRENT
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5">₦{fmtN(inv.total)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${colorMap[ps.color]}`}>
                  {ps.label}
                </span>
                {ps.color !== 'green' && (
                  <button
                    onClick={() => setPayTarget(inv)}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Record
                  </button>
                )}
                <Link to={`/invoices/${inv.id}`} className="text-zinc-300 hover:text-zinc-500">
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Action buttons ── */}
      {!isClosed && (
        <div className="px-5 py-4 border-t border-zinc-100 space-y-2">
          {remainingToInvoice > 0 && (
            <p className="text-[10px] text-zinc-400 font-bold mb-2">
              Suggested next: ₦{fmtN(remainingToInvoice)}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleCreateProgress}
              className="flex-1 py-2.5 rounded-xl border-2 border-dashed border-zinc-200 text-xs font-bold text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-all"
            >
              + Progress Invoice
            </button>
            <button
              onClick={handleCreateFinal}
              className="flex-1 py-2.5 rounded-xl border-2 border-dashed border-emerald-200 text-xs font-bold text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-all"
            >
              + Final Invoice
            </button>
          </div>
        </div>
      )}

      {isClosed && (
        <div className="px-5 py-3 border-t border-zinc-100 bg-emerald-50">
          <p className="text-xs font-black text-emerald-700 text-center uppercase tracking-wider">
            Thread Closed · All billing complete
          </p>
        </div>
      )}

      {/* Record payment modal */}
      {payTarget && (
        <RecordPaymentModal
          invoice={payTarget}
          onClose={() => setPayTarget(null)}
          onSaved={async () => { setPayTarget(null); await refetch() }}
        />
      )}
    </div>
  )
}
