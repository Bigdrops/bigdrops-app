import { useState } from "react"
import { Link } from "react-router-dom"
import { useInvoiceThread, fmtN, getInvoicePaymentStatus } from "../hooks/useInvoiceThread"
import { Loader2, ChevronRight, PlusCircle, TrendingUp } from "lucide-react"
import RecordPaymentModal from "./RecordPaymentModal"

export default function ThreadSummaryCard({ threadId, onCreateNext, currentInvoiceId }) {
  const { invoices, loading, error, summary, refetch } = useInvoiceThread(threadId)

  const [payTarget, setPayTarget] = useState(null)

  if (!threadId) return null

  if (loading)
    return (
      <div className="flex items-center gap-2 py-4 text-slate-400 text-xs font-bold">
        <Loader2 size={14} className="animate-spin" /> Loading thread…
      </div>
    )

  if (error)
    return (
      <p className="text-xs text-red-500 font-bold py-2">
        Thread error: {error}
      </p>
    )

  const { contractTotal, totalReceived, outstanding, suggestedNext } = summary

  const pctReceived =
    contractTotal > 0
      ? Math.min(100, (totalReceived / contractTotal) * 100)
      : 0

  const canCreateNext = suggestedNext > 0

  const colorMap = {
    green: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    red: "text-red-500 bg-red-50",
  }

  const roleBadge = (role) => {
    if (role === "advance")
      return (
        <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
          ADVANCE
        </span>
      )

    if (role === "final")
      return (
        <span className="text-[9px] font-black bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">
          FINAL
        </span>
      )

    if (role === "progress")
      return (
        <span className="text-[9px] font-black bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
          PROGRESS
        </span>
      )

    return null
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}

      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            Job Thread
          </span>

          <TrendingUp size={14} className="text-slate-300" />
        </div>

        <div className="flex items-end justify-between gap-4 mt-3">
          <div>
            <p className="text-[11px] text-slate-400 font-bold">
              Contract Total
            </p>

            <p className="text-2xl font-black text-slate-900 tracking-tight">
              ₦{fmtN(contractTotal)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[11px] text-slate-400 font-bold">
              Outstanding
            </p>

            <p
              className={`text-xl font-black tracking-tight ${
                outstanding > 0
                  ? "text-red-600"
                  : "text-emerald-600"
              }`}
            >
              ₦{fmtN(outstanding)}
            </p>
          </div>
        </div>

        {/* Progress */}

        <div className="mt-4">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
            <span>Received ₦{fmtN(totalReceived)}</span>
            <span>{pctReceived.toFixed(0)}%</span>
          </div>

          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${pctReceived}%` }}
            />
          </div>
        </div>
      </div>

      {/* Invoice timeline */}

      <div className="divide-y divide-slate-100">
        {invoices.map((inv, i) => {
          const ps = getInvoicePaymentStatus(inv)

          const isCurrent = inv.id === currentInvoiceId

          const color = colorMap[ps.color] || "text-slate-600 bg-slate-100"

          return (
            <div
              key={inv.id}
              className={`px-5 py-3 flex items-center gap-3 ${
                isCurrent ? "bg-slate-50" : ""
              }`}
            >
              {/* Position */}

              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {inv.invoice_number}
                  </p>

                  {isCurrent && (
                    <span className="text-[9px] font-black bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                      CURRENT
                    </span>
                  )}

                  {roleBadge(inv.thread_role)}
                </div>

                <p className="text-[11px] text-slate-400 mt-0.5">
                  Invoiced: ₦{fmtN(inv.total)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${color}`}
                >
                  {ps.label}
                </span>

                {ps.color !== "green" && (
                  <button
                    onClick={() => setPayTarget(inv)}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Record
                  </button>
                )}

                <Link
                  to={`/invoices/${inv.id}`}
                  className="text-slate-300 hover:text-slate-500"
                >
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create next invoice */}

      {canCreateNext && onCreateNext && (
        <div className="px-5 py-4 border-t border-slate-100">
          <button
            onClick={onCreateNext}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-xs font-bold text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
          >
            <PlusCircle size={14} />
            Create Next Invoice — ₦{fmtN(suggestedNext)} suggested
          </button>
        </div>
      )}

      {/* Payment modal */}

      {payTarget && (
        <RecordPaymentModal
          invoice={payTarget}
          onClose={() => setPayTarget(null)}
          onSaved={async () => {
            setPayTarget(null)
            await refetch()
          }}
        />
      )}
    </div>
  )
}