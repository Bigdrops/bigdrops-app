import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/supabase'
import { useEntity } from '@/lib/tenant/contexts'
import { canUseNativeSqlite } from '@/lib/native/capacitor'
import {
  cacheInvoiceDetail,
  cacheInvoicePayments,
  getCachedInvoiceDetail,
  getCachedInvoicePayments,
} from '@/lib/native/invoiceCache'
import { fetchInvoiceChildDocuments, fetchProjectSummary } from '@/domain/documentRelationships'
import { fetchSettings, normalizeSettings } from '@/hooks/useSettings'
import { healLegacyCalculationOverrides, mapDbInvoiceItem } from '@/domain/invoice'
import { deriveAdvanceInvoiceProjection } from '@/domain/invoice/advanceProjection.rules'
import { calculateInvoiceFinancialState } from '@/domain/invoice/financialState'

function canUseInvoiceCacheFallback() {
  return (
    canUseNativeSqlite() &&
    typeof navigator !== 'undefined' &&
    navigator.onLine === false
  )
}

function canWriteInvoiceCache() {
  return (
    canUseNativeSqlite() &&
    (typeof navigator === 'undefined' || navigator.onLine !== false)
  )
}

function buildCachedInvoiceFinancials(invoiceRow, paymentRows) {
  const financialState = calculateInvoiceFinancialState({
    invoiceTotal: Number(invoiceRow?.total || 0),
    status: invoiceRow?.status || 'unpaid',
    payments: paymentRows || [],
  })

  return {
    id: invoiceRow?.id || null,
    cash_received: financialState.settledAmount,
    settled_total: financialState.settledAmount,
    balance_due: financialState.balanceDue,
    computed_status: financialState.paymentState,
  }
}

export function useInvoiceDetailData(id) {
  const { tenantClient } = useEntity()
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [payments, setPayments] = useState([])
  const [invoiceFinancials, setInvoiceFinancials] = useState(null)
  const [client, setClient] = useState(null)
  const [settings, setSettings] = useState({})
  const [bankAccounts, setBankAccounts] = useState([])
  const [signatories, setSignatories] = useState([])
  const [creatorProfile, setCreatorProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [linkedProject, setLinkedProject] = useState(null)
  const [relatedCsrs, setRelatedCsrs] = useState([])
  const [relatedWaybills, setRelatedWaybills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const advanceInvoiceProjection = useMemo(() => deriveAdvanceInvoiceProjection(invoice), [invoice])

  const fetchInvoice = useCallback(async () => {
    const { data, error: invoiceError } = await tenantClient.from('invoices').select('*').eq('id', id).single()
    if (invoiceError) {
      setError(invoiceError)
      setInvoice(null)
      setLinkedProject(null)
      setClient(null)
      if (canUseInvoiceCacheFallback()) throw invoiceError
      return
    }
    setInvoice(data)
    setLinkedProject(data?.project_id ? await fetchProjectSummary(data.project_id, tenantClient) : null)
    const [clientResponse, creatorResponse] = await Promise.all([
      data?.client_id
        ? tenantClient.from('clients').select('*').eq('id', data.client_id).single()
        : Promise.resolve({ data: null }),
      data?.created_by
        ? supabase.from('profiles').select('*').eq('id', data.created_by).single()
        : Promise.resolve({ data: null }),
    ])
    setClient(clientResponse.data || null)
    setCreatorProfile(creatorResponse.data || null)
  }, [id, tenantClient])

  const fetchInvoiceRelationships = useCallback(async () => {
    const related = await fetchInvoiceChildDocuments(id)
    setRelatedCsrs(related.csrs || [])
    setRelatedWaybills(related.waybills || [])
  }, [id])

  const fetchPayments = useCallback(async () => {
    const [
      { data: activePayments, error: activePaymentsError },
      { data: voidedPayments, error: voidedPaymentsError },
    ] = await Promise.all([
      tenantClient
        .from('payments')
        .select('*')
        .eq('invoice_id', id)
        .is('voided_at', null)
        .order('date', { ascending: true }),
      tenantClient
        .from('payments')
        .select('*')
        .eq('invoice_id', id)
        .not('voided_at', 'is', null)
        .order('date', { ascending: true }),
    ])

    const paymentError = activePaymentsError || voidedPaymentsError
    if (paymentError && canUseInvoiceCacheFallback()) {
      throw paymentError
    }

    const mergedPayments = [...(activePayments || []), ...(voidedPayments || [])].sort((a, b) => {
      const dateCompare = String(a.date || '').localeCompare(String(b.date || ''))
      if (dateCompare !== 0) return dateCompare
      return String(a.created_at || '').localeCompare(String(b.created_at || ''))
    })
    setPayments(mergedPayments)
  }, [id, tenantClient])

  const fetchInvoiceFinancials = useCallback(async () => {
    const { data } = await tenantClient
      .from('invoice_financials_v')
      .select('*')
      .eq('id', id)
      .single()
    setInvoiceFinancials(data || null)
    if (data?.computed_status) {
      setInvoice((current) => (current ? { ...current, status: data.computed_status } : current))
    }
  }, [id, tenantClient])

  const fetchItems = useCallback(async () => {
    const { data, error: itemsError } = await tenantClient
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order')

    if (itemsError && canUseInvoiceCacheFallback()) {
      throw itemsError
    }

    // Heal rows stored as discount_rate 0, mirroring the edit-form hydration
    // (healLegacyCalculationOverrides). Invoices saved through the composite
    // RPC before 2026-08-14 coerced NULL to 0 for inheriting rows, which the
    // engine reads as explicit zero overrides. Healing makes the rows inherit
    // the global discount so the view, PDF, and CSV match the quotation path.
    const loaded = (data || []).map((item) => ({
      ...healLegacyCalculationOverrides(mapDbInvoiceItem(item), true),
    }))
    setItems(loaded)
  }, [id, tenantClient])

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { data: currentSession } = await supabase.auth.getSession()
      setSession(currentSession.session || null)

      await Promise.all([
        fetchInvoice(),
        fetchItems(),
        fetchPayments(),
        fetchInvoiceRelationships(),
        fetchInvoiceFinancials(),
        supabase
          .from('signatories')
          .select('*')
          .order('name')
          .then(({ data, error: signatoriesError }) => {
            if (signatoriesError) throw signatoriesError
            setSignatories(data || [])
          }),
        supabase
          .from('bank_accounts')
          .select('*')
          .order('is_default', { ascending: false })
          .then(({ data, error: bankAccountsError }) => {
            if (bankAccountsError) throw bankAccountsError
            setBankAccounts(data || [])
          }),
        tenantClient
          .from('settings')
          .select('*')
          .eq('id', 1)
          .single()
          .then(({ data, error: settingsError }) => {
            if (settingsError) throw settingsError
            if (data) setSettings(normalizeSettings(data))
          }),
      ])
    } catch (refreshError) {
      if (!canUseInvoiceCacheFallback()) {
        setError(refreshError)
        setInvoice(null)
        setItems([])
        setPayments([])
        setInvoiceFinancials(null)
        setClient(null)
        setLinkedProject(null)
        setRelatedCsrs([])
        setRelatedWaybills([])
        setCreatorProfile(null)
        console.warn('Invoice detail fetch failed:', refreshError)
        setLoading(false)
        return
      }

      try {
        const cachedDetail = await getCachedInvoiceDetail(id)
        const cachedPayments = await getCachedInvoicePayments(id)

        setInvoice(cachedDetail.invoice)
        setItems(cachedDetail.items)
        setPayments(cachedPayments)
        setInvoiceFinancials(
          cachedDetail.invoice
            ? buildCachedInvoiceFinancials(cachedDetail.invoice, cachedPayments)
            : null,
        )
        setClient(null)
        setSettings({})
        setBankAccounts([])
        setSignatories([])
        setLinkedProject(null)
        setRelatedCsrs([])
        setRelatedWaybills([])
        setCreatorProfile(null)
        setSession(null)
        setError(null)
      } catch (cacheError) {
        console.warn('Invoice detail cache fallback failed:', cacheError)
        setError(cacheError)
        setInvoice(null)
        setItems([])
      }
    } finally {
      setLoading(false)
    }
  }, [fetchInvoice, fetchInvoiceFinancials, fetchInvoiceRelationships, fetchItems, fetchPayments, id, tenantClient])

  useEffect(() => {
    if (loading || !invoice?.id || !canWriteInvoiceCache()) return

    void cacheInvoiceDetail(invoice, items).catch((cacheError) => {
      console.warn('Invoice detail cache write failed:', cacheError)
    })
  }, [invoice, items, loading])

  useEffect(() => {
    if (loading || error || !id || !canWriteInvoiceCache()) return

    void cacheInvoicePayments(id, payments).catch((cacheError) => {
      console.warn('Invoice payment cache write failed:', cacheError)
    })
  }, [error, id, loading, payments])

  // refresh identity changes when tenantClient resolves, so the effect re-runs
  // once the tenant schema becomes ready. When the tenant is not ready the
  // targeted reads throw and the existing error/offline-cache fallback applies.
  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    invoice,
    items,
    payments,
    advanceInvoiceProjection,
    relatedCsrs,
    relatedWaybills,
    invoiceFinancials,
    client,
    settings,
    bankAccounts,
    signatories,
    creatorProfile,
    session,
    linkedProject,
    loading,
    error,
    refresh,
    setInvoice,
    setPayments,
  }
}
