/**
 * useInvoiceThread.js
 * 
 * Hook for all thread (Advance/Balance chain) logic.
 * A "thread" is a group of invoices tied to one job via a shared thread_id UUID.
 * 
 * Responsibilities:
 *  - Fetch all invoices in a thread
 *  - Calculate contract total, total received, and suggested next amount
 *  - Record amount_received on a specific invoice
 *  - Start a new thread (first invoice in a chain)
 *  - Generate the next linked invoice pre-filled with suggested balance
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// ─── Pure calculation helpers (no Supabase, easy to unit test) ───────────────

/**
 * Given all invoices in a thread, returns the financial summary.
 * 
 * @param {Array} threadInvoices - all invoices with same thread_id, sorted by thread_position
 * @returns {Object} summary
 */
export function calcThreadSummary(threadInvoices) {
  if (!threadInvoices || threadInvoices.length === 0) {
    return { contractTotal: 0, totalInvoiced: 0, totalReceived: 0, outstanding: 0, suggestedNext: 0 }
  }

  // Contract total lives on the first invoice in the thread
  const contractTotal = threadInvoices[0]?.total_contract_value || 0

  // Sum all invoice totals that aren't cancelled
  const totalInvoiced = threadInvoices
    .filter(inv => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + (inv.total || 0), 0)

  // Sum all amounts actually received across the thread
  const totalReceived = threadInvoices
    .reduce((sum, inv) => sum + (inv.amount_received || 0), 0)

  // What's still owed = contract - received
  const outstanding = Math.max(0, contractTotal - totalReceived)

  // Suggested next invoice amount = contract - already invoiced (not cancelled)
  const suggestedNext = Math.max(0, contractTotal - totalInvoiced)

  return { contractTotal, totalInvoiced, totalReceived, outstanding, suggestedNext }
}

/**
 * Determines the payment status label for a single invoice.
 */
export function getInvoicePaymentStatus(invoice) {
  const invoiced = invoice.total || 0
  const received = invoice.amount_received || 0

  if (received <= 0) return { label: 'Unpaid', color: 'red' }
  if (received >= invoiced) return { label: 'Paid', color: 'green' }
  return {
    label: `Partially Paid (₦${fmtN(received)} of ₦${fmtN(invoiced)})`,
    color: 'amber',
    shortfall: invoiced - received
  }
}

// ─── Format helper ────────────────────────────────────────────────────────────

export function fmtN(n) {
  if (!n && n !== 0) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.?0+$/, '') + 'k'
  return n.toLocaleString()
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useInvoiceThread
 * 
 * Pass in a threadId (or null). Returns the full thread state + actions.
 */
export function useInvoiceThread(threadId) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchThread = useCallback(async () => {
    if (!threadId) { setInvoices([]); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_title, total, amount_received, status, thread_position, total_contract_value, issue_date, is_advance')
        .eq('thread_id', threadId)
        .order('thread_position', { ascending: true })
      if (e) throw e
      setInvoices(data || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [threadId])

  useEffect(() => { fetchThread() }, [fetchThread])

  const summary = calcThreadSummary(invoices)

  /**
   * Record a payment against a specific invoice.
   * Updates amount_received and status accordingly.
   */
  const recordPayment = async (invoiceId, amountReceived) => {
    const inv = invoices.find(i => i.id === invoiceId)
    if (!inv) return

    const newStatus = amountReceived >= (inv.total || 0) ? 'paid' : 'partial'

    const { error: e } = await supabase
      .from('invoices')
      .update({ amount_received: amountReceived, status: newStatus })
      .eq('id', invoiceId)

    if (e) throw e
    await fetchThread()
  }

  /**
   * Build the initial data for the NEXT invoice in this thread.
   * Returns a pre-filled object ready to pass into NewInvoice state.
   */
  const buildNextInvoiceDefaults = () => {
    if (invoices.length === 0) return null
    const first = invoices[0]
    const { suggestedNext, contractTotal, totalReceived } = summary

    return {
      thread_id: threadId,
      total_contract_value: contractTotal,
      thread_position: invoices.length + 1,
      is_advance: false,
      // Carry client info from first invoice
      client_id: first.client_id,
      client_name: first.client_name,
      // Suggested amount — user can override
      _suggestedAmount: suggestedNext,
      _totalReceived: totalReceived,
      _previousInvoices: invoices.map(i => ({
        invoice_number: i.invoice_number,
        total: i.total,
        amount_received: i.amount_received,
        status: i.status,
      }))
    }
  }

  return {
    invoices,
    loading,
    error,
    summary,
    refetch: fetchThread,
    recordPayment,
    buildNextInvoiceDefaults,
  }
}

/**
 * generateThreadId
 * Call this when creating the FIRST invoice in a new thread.
 * Returns a UUID.
 */
export function generateThreadId() {
  return crypto.randomUUID()
}
