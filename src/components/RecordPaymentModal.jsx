/**
 * RecordPaymentModal.jsx
 * 
 * 2-step modal to record amount_received on an invoice.
 * 
 * Step 1: Show invoice total, existing received, input new amount
 * Step 2: Confirm — shows the math clearly before saving
 * 
 * Props:
 *   invoice  - the invoice object { id, invoice_number, total, amount_received }
 *   onClose  - () => void
 *   onSaved  - () => void  — called after successful save
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { fmtN } from '../hooks/useInvoiceThread'
import { Loader2, Check, AlertTriangle } from 'lucide-react'

export default function RecordPaymentModal({ invoice, onClose, onSaved }) {
  const [step, setStep] = useState(1) // 1 = input, 2 = confirm
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  const invoiced = invoice.total || 0
  const alreadyReceived = invoice.amount_received || 0
  const remaining = Math.max(0, invoiced - alreadyReceived)

  // Esc to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Auto focus input
  useEffect(() => { inputRef.current?.focus() }, [])

  const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0
  const newTotal = alreadyReceived + parsedAmount
  const isOverpayment = newTotal > invoiced
  const newStatus = newTotal >= invoiced ? 'paid' : 'partial'

  const handleNext = () => {
    setError('')
    if (parsedAmount <= 0) { setError('Enter an amount greater than 0'); return }
    setStep(2)
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const { error: e } = await supabase
        .from('invoices')
        .update({
          amount_received: newTotal,
          status: newStatus,
        })
        .eq('id', invoice.id)
      if (e) throw e
      await onSaved()
    } catch (e) {
      setError(e.message)
      setSaving(false)
      setStep(1)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Record Payment</p>
          <p className="text-base font-black text-slate-900">{invoice.invoice_number}</p>
        </div>

        {step === 1 ? (
          <>
            {/* Financial context */}
            <div className="px-5 py-4 space-y-3">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <Row label="Invoice Total" value={`₦${fmtN(invoiced)}`} />
                {alreadyReceived > 0 && (
                  <Row label="Already Received" value={`₦${fmtN(alreadyReceived)}`} valueClass="text-emerald-600" />
                )}
                <div className="border-t border-slate-200 pt-2">
                  <Row label="Still Outstanding" value={`₦${fmtN(remaining)}`} valueClass="font-black text-red-600" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Amount Received Now
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₦</span>
                  <input
                    ref={inputRef}
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleNext() }}
                    placeholder={fmtN(remaining)}
                    className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                  />
                </div>
                {isOverpayment && parsedAmount > 0 && (
                  <div className="mt-2 flex gap-1.5 items-center">
                    <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                    <p className="text-[11px] text-amber-600 font-bold">
                      This exceeds the invoice total by ₦{fmtN(newTotal - invoiced)}
                    </p>
                  </div>
                )}
                {error && <p className="text-[11px] text-red-500 font-bold mt-1.5">{error}</p>}
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleNext} className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
                Review →
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step 2 — confirm */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-slate-600">Confirm this payment recording:</p>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <Row label="Payment Being Recorded" value={`₦${fmtN(parsedAmount)}`} valueClass="font-black text-slate-900 text-base" />
                <div className="border-t border-slate-200 pt-2 space-y-1.5">
                  <Row label="Total Received After" value={`₦${fmtN(newTotal)}`} />
                  <Row label="Invoice Total" value={`₦${fmtN(invoiced)}`} />
                  <Row
                    label="New Status"
                    value={newStatus === 'paid' ? '✓ Paid' : 'Partially Paid'}
                    valueClass={newStatus === 'paid' ? 'text-emerald-600 font-black' : 'text-amber-600 font-black'}
                  />
                  {newStatus === 'partial' && (
                    <Row label="Still Owed" value={`₦${fmtN(invoiced - newTotal)}`} valueClass="text-red-500 font-black" />
                  )}
                </div>
              </div>

              {isOverpayment && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2">
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 font-semibold">You are recording more than the invoice amount. This will mark the invoice as Paid.</p>
                </div>
              )}

              {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setStep(1)} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                ← Back
              </button>
              <button onClick={handleConfirm} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'Saving…' : 'Confirm Payment'}
              </button>
            </div>
          </>
        )}

        <p className="text-center text-[10px] text-slate-300 font-bold pb-3">Press Esc to cancel</p>
      </div>
    </div>
  )
}

function Row({ label, value, valueClass = 'text-slate-700' }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-slate-500 font-semibold">{label}</span>
      <span className={`text-xs font-bold ${valueClass}`}>{value}</span>
    </div>
  )
}
