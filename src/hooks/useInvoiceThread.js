/**
 * useInvoiceThread.js
 *
 * Hook for all job thread (advance/progress/final chain) logic.
 * A "thread" is a group of invoices tied to one job via a shared thread_id UUID.
 *
 * Architecture rules (DO NOT BREAK):
 *  - Thread totals are ALWAYS derived from invoice data. Never stored.
 *  - advance_mode / advance_value belong only to the advance invoice.
 *  - Follow-up invoices inherit thread_id, job_title, client info, position only.
 *  - thread_role constraint: 'advance' | 'progress' | 'final' | null
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// ─── Format helper ────────────────────────────────────────────────────────────

export function fmtN(n) {
  if (!n && n !== 0) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.?0+$/, '') + 'k'
  return Number(n).toLocaleString()
}

// ─── Pure calculation helpers ─────────────────────────────────────────────────

/**
 * Derives the complete financial summary of a thread from raw invoice data.
 * All numbers calculated here — nothing stored on a thread table.
 */
export function calcThreadSummary(threadInvoices) {
  if (!threadInvoices || threadInvoices.length === 0) {
    return {
      contractTotal:      0,
      totalInvoiced:      0,
      totalReceived:      0,
      outstanding:        0,
      remainingToInvoice: 0,
      billingPct:         0,
      paymentPct:         0,
      isClosed:           false,
    }
  }

  const contractTotal = Number(threadInvoices[0]?.total_contract_value || 0)

  const totalInvoiced = threadInvoices
    .filter(inv => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + Number(inv.total || 0), 0)

  const totalReceived = threadInvoices
    .reduce((sum, inv) => sum + Number(inv.amount_received || 0), 0)

  const outstanding        = Math.max(0, totalInvoiced - totalReceived)
  const remainingToInvoice = Math.max(0, contractTotal - totalInvoiced)

  const billingPct = contractTotal > 0
    ? Math.min(100, Math.round((totalInvoiced / contractTotal) * 100))
    : 0
  const paymentPct = totalInvoiced > 0
    ? Math.min(100, Math.round((totalReceived / totalInvoiced) * 100))
    : 0

  const hasFinal = threadInvoices.some(inv => inv.thread_role === 'final')
  const isClosed = hasFinal || remainingToInvoice === 0

  return {
    contractTotal,
    totalInvoiced,
    totalReceived,
    outstanding,
    remainingToInvoice,
    billingPct,
    paymentPct,
    isClosed,
  }
}

/**
 * Payment status for a single invoice.
 */
export function getInvoicePaymentStatus(invoice) {
  const invoiced = Number(invoice.total || 0)
  const received = Number(invoice.amount_received || 0)
  if (received <= 0)        return { label: 'Unpaid',  color: 'red' }
  if (received >= invoiced) return { label: 'Paid',    color: 'green' }
  return { label: `Partial — ₦${fmtN(received)}`, color: 'amber', shortfall: invoiced - received }
}

/**
 * Display label + Tailwind classes for a thread_role.
 */
export function getRoleLabel(role) {
  switch (role) {
    case 'advance':  return { label: 'ADVANCE',  bg: 'bg-blue-100',    text: 'text-blue-700' }
    case 'progress': return { label: 'PROGRESS', bg: 'bg-amber-100',   text: 'text-amber-700' }
    case 'final':    return { label: 'FINAL',    bg: 'bg-emerald-100', text: 'text-emerald-700' }
    default:         return { label: 'STANDARD', bg: 'bg-zinc-100',    text: 'text-zinc-500' }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInvoiceThread(threadId) {
  const [invoices, setInvoices] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const fetchThread = useCallback(async () => {
    if (!threadId) { setInvoices([]); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_title, job_title, total, amount_received, status, thread_position, thread_role, total_contract_value, advance_mode, advance_value, issue_date, is_advance, client_id, client_name')
        .eq('thread_id', threadId)
        .is('archived_at', null)
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

  const recordPayment = async (invoiceId, amountReceived) => {
    const inv = invoices.find(i => i.id === invoiceId)
    if (!inv) return
    const newStatus = amountReceived >= Number(inv.total || 0) ? 'paid' : 'sent'
    const { error: e } = await supabase
      .from('invoices')
      .update({ amount_received: amountReceived, status: newStatus })
      .eq('id', invoiceId)
    if (e) throw e
    await fetchThread()
  }

  /**
   * Builds prefill state for the next invoice in this thread.
   * Inherits: thread_id, job_title, client, total_contract_value, position
   * Does NOT inherit: advance_mode, advance_value (advance invoice only)
   */
  const buildNextInvoiceDefaults = () => {
    if (invoices.length === 0) return null
    const first = invoices[0]
    const { remainingToInvoice, contractTotal } = summary
    return {
      thread_id:            threadId,
      thread_position:      invoices.length + 1,
      thread_role:          'progress',
      total_contract_value: contractTotal,
      is_advance:           false,
      job_title:            first.job_title   || '',
      client_id:            first.client_id   || null,
      client_name:          first.client_name || '',
      _suggestedAmount:     remainingToInvoice,
      _isFinalSuggested:    remainingToInvoice <= 0,
      _threadInvoiceCount:  invoices.length,
    }
  }

  return { invoices, loading, error, summary, refetch: fetchThread, recordPayment, buildNextInvoiceDefaults }
}

export function generateThreadId() {
  return crypto.randomUUID()
}
