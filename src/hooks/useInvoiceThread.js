/**
 * useInvoiceThread.js
 *
 * Thread engine for Advance / Progress invoice chains.
 */

import { useState, useEffect, useCallback } from "react"
import { supabase } from "../supabase"

// ─────────────────────────────────────────────────────────
// Calculation helpers
// ─────────────────────────────────────────────────────────

export function calcThreadSummary(threadInvoices) {
  if (!threadInvoices || threadInvoices.length === 0) {
    return {
      contractTotal: 0,
      totalInvoiced: 0,
      totalReceived: 0,
      outstanding: 0,
      suggestedNext: 0,
    }
  }

  const contractTotal = threadInvoices[0]?.total_contract_value || 0

  const totalInvoiced = threadInvoices
    .filter((inv) => inv.status !== "cancelled")
    .reduce((sum, inv) => sum + (inv.total || 0), 0)

  const totalReceived = threadInvoices.reduce(
    (sum, inv) => sum + (inv.amount_received || 0),
    0
  )

  const outstanding = Math.max(0, contractTotal - totalReceived)

  const suggestedNext = Math.max(0, contractTotal - totalInvoiced)

  return {
    contractTotal,
    totalInvoiced,
    totalReceived,
    outstanding,
    suggestedNext,
  }
}

// ─────────────────────────────────────────────────────────
// Payment status helper
// ─────────────────────────────────────────────────────────

export function getInvoicePaymentStatus(invoice) {
  const invoiced = invoice.total || 0
  const received = invoice.amount_received || 0

  if (received <= 0)
    return { label: "Unpaid", color: "red" }

  if (received >= invoiced)
    return { label: "Paid", color: "green" }

  return {
    label: `Partially Paid (₦${fmtN(received)} of ₦${fmtN(invoiced)})`,
    color: "amber",
    shortfall: invoiced - received,
  }
}

// ─────────────────────────────────────────────────────────
// Number formatter
// ─────────────────────────────────────────────────────────

export function fmtN(n) {
  if (!n && n !== 0) return "0"

  if (n >= 1_000_000)
    return (
      (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M"
    )

  if (n >= 1_000)
    return (
      (n / 1_000).toFixed(1).replace(/\.?0+$/, "") + "k"
    )

  return Number(n).toLocaleString()
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export function useInvoiceThread(threadId) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchThread = useCallback(async () => {
    if (!threadId) {
      setInvoices([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          invoice_title,
          total,
          amount_received,
          status,
          thread_role,
          thread_position,
          total_contract_value,
          issue_date,
          client_id,
          client_name
        `)
        .eq("thread_id", threadId)
        .is("archived_at", null)
        .order("thread_position", { ascending: true })

      if (error) throw error

      setInvoices(data || [])
    } catch (e) {
      setError(e.message)
    }

    setLoading(false)
  }, [threadId])

  useEffect(() => {
    fetchThread()
  }, [fetchThread])

  const summary = calcThreadSummary(invoices)

  // ─────────────────────────────────────────────────────────
  // Record payment
  // ─────────────────────────────────────────────────────────

  const recordPayment = async (invoiceId, amountReceived) => {
    const inv = invoices.find((i) => i.id === invoiceId)
    if (!inv) return

    const newStatus =
      amountReceived >= (inv.total || 0) ? "paid" : "sent"

    const { error } = await supabase
      .from("invoices")
      .update({
        amount_received: amountReceived,
        status: newStatus,
      })
      .eq("id", invoiceId)

    if (error) throw error

    await fetchThread()
  }

  // ─────────────────────────────────────────────────────────
  // Build next invoice defaults
  // ─────────────────────────────────────────────────────────

  const buildNextInvoiceDefaults = () => {
    if (!invoices.length) return null

    const first = invoices[0]

    const { suggestedNext, contractTotal, totalReceived } =
      summary

    return {
      thread_id: threadId,
      thread_role: "progress",
      thread_position: invoices.length + 1,
      total_contract_value: contractTotal,

      client_id: first.client_id,
      client_name: first.client_name,

      is_advance: false,

      _suggestedAmount: suggestedNext,
      _totalReceived: totalReceived,

      _previousInvoices: invoices.map((i) => ({
        invoice_number: i.invoice_number,
        total: i.total,
        amount_received: i.amount_received,
        status: i.status,
      })),
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

// ─────────────────────────────────────────────────────────
// UUID generator for new thread
// ─────────────────────────────────────────────────────────

export function generateThreadId() {
  return crypto.randomUUID()
}