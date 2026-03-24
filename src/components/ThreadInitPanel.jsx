/**
 * ThreadInitPanel.jsx
 * 
 * Shown inside NewInvoice when creating the FIRST invoice in a thread.
 * Lets user mark this as an Advance invoice and set the total contract value.
 * 
 * If the invoice is standalone (no thread), this panel stays collapsed.
 * 
 * Props:
 *   isAdvance          - bool
 *   setIsAdvance       - fn
 *   contractTotal      - number
 *   setContractTotal   - fn
 *   invoiceTotal       - number (the current invoice's calculated total — for % display)
 */

import { useState } from 'react'
import { fmtN } from '../hooks/useInvoiceThread'
import { Link2, ChevronDown, ChevronUp } from 'lucide-react'

export default function ThreadInitPanel({ isAdvance, setIsAdvance, contractTotal, setContractTotal, invoiceTotal }) {
  const [open, setOpen] = useState(false)

  const pct = contractTotal > 0 && invoiceTotal > 0
    ? ((invoiceTotal / contractTotal) * 100).toFixed(1)
    : null

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Link2 size={14} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Job Thread</p>
            <p className="text-[11px] text-muted-foreground">
              {isAdvance && contractTotal > 0
                ? `Advance invoice · ₦${fmtN(contractTotal)} contract${pct ? ` · ${pct}%` : ''}`
                : 'Link this invoice to a larger job'}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border">
          {/* Is Advance toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Mark as Advance Invoice</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">This is the first payment in a multi-invoice job</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAdvance(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isAdvance ? 'bg-slate-900' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isAdvance ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Contract total — only visible when isAdvance */}
          {isAdvance && (
            <div>
              <label className="block text-[11px] font-black text-muted-foreground uppercase tracking-wider mb-1.5">
                Total Contract Value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">₦</span>
                <input
                  type="number"
                  value={contractTotal || ''}
                  onChange={e => setContractTotal(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 1000000"
                  className="w-full pl-8 pr-4 py-3 border border-input rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/10 focus:border-slate-400 transition-colors"
                />
              </div>
              {contractTotal > 0 && invoiceTotal > 0 && (
                <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-blue-700 font-bold">
                    This invoice = {pct}% of ₦{fmtN(contractTotal)} contract
                    {invoiceTotal > contractTotal && (
                      <span className="text-red-600 ml-2">⚠ Invoice exceeds contract total</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {!isAdvance && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Toggle "Advance Invoice" on to set the total contract value and start a job thread. Future invoices can be linked to this thread.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
