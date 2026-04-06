import React from 'react'
import { Link2, FileText, X } from 'lucide-react'
import { cardClassName } from '@/domain/projectDetailUtils'

export default function ProjectActionRail({
  project,
  financials,
  quickActions,
  actionsOpen,
  setActionsOpen,
  setShowLink,
  navigate,
}) {
  return (
    <>
      <div className="sticky top-6 hidden space-y-4 md:block">
        <div className={`${cardClassName} border-t-4 border-t-emerald-600 p-5`}>
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Record Control</div>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.path, { state: action.state })}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ring-1 ring-inset ring-transparent hover:ring-slate-100 ${action.className}`}
              >
                <action.icon size={16} className="shrink-0" />
                {action.label}
              </button>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowLink(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-center text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <Link2 size={16} />
              Link Existing
            </button>
          </div>
        </div>

        <div className={`${cardClassName} p-5`}>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Project Stats</div>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Health</div>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    project.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                ></div>
                <span className="text-xs font-bold capitalize text-slate-700">{project.status}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Financial Burn</div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (Number(financials?.cash_collected || 0) /
                        Math.max(1, Number(financials?.total_invoiced || 1))) *
                        100,
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-500">
                <span>COLLECTED</span>
                <span>
                  {Math.round(
                    (Number(financials?.cash_collected || 0) /
                      Math.max(1, Number(financials?.total_invoiced || 1))) *
                      100,
                  )}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Action Trigger ──────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <button
          type="button"
          onClick={() => setActionsOpen(!actionsOpen)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl transition hover:scale-110 active:scale-95"
        >
          {actionsOpen ? <X size={24} /> : <FileText size={24} />}
        </button>

        {actionsOpen && (
          <div className="absolute bottom-16 right-0 mb-4 flex w-56 flex-col gap-2 rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-slate-200 animate-in fade-in slide-in-from-bottom-5">
            <div className="mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Actions
            </div>
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  navigate(action.path, { state: action.state })
                  setActionsOpen(false)
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold ${action.className}`}
              >
                <action.icon size={14} className="shrink-0" />
                {action.label}
              </button>
            ))}
            <div className="mt-1 border-t border-slate-50 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowLink(true)
                  setActionsOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-left text-xs font-bold text-blue-700"
              >
                <Link2 size={14} />
                Link Existing
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
