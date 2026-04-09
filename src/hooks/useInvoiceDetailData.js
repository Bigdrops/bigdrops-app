import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/supabase'
import { canUseNativeSqlite } from '@/lib/native/capacitor'
import {
  cacheInvoiceDetail,
  cacheInvoicePayments,
  getCachedInvoiceDetail,
  getCachedInvoicePayments,
} from '@/lib/native/invoiceCache'
import { fetchInvoiceChildDocuments, fetchProjectSummary } from '@/domain/documentRelationships'

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
  const invoiceTotal = Number(invoiceRow?.total || 0)
  const settledTotal = (paymentRows || []).reduce((sum, payment) => {
    if (payment?.voided_at) return sum
    return sum + Number(payment?.cash_amount || 0) + Number(payment?.wht_amount || 0)
  }, 0)
  const balanceDue = Math.max(0, invoiceTotal - settledTotal)

  return {
    id: invoiceRow?.id || null,
    cash_received: settledTotal,
    settled_total: settledTotal,
    balance_due: balanceDue,
    computed_status:
      balanceDue <= 0 && invoiceTotal > 0
        ? 'paid'
        : settledTotal > 0
          ? 'partial'
          : invoiceRow?.status || 'draft',
  }
}

export function useInvoiceDetailData(id) {
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

  const fetchInvoice = useCallback(async () => {
    const { data, error: invoiceError } = await supabase.from('invoices').select('*').eq('id', id).single()
    if (invoiceError) {
      setError(invoiceError)
      setInvoice(null)
      setLinkedProject(null)
      setClient(null)
      if (canUseInvoiceCacheFallback()) throw invoiceError
      return
    }
    setInvoice(data)
    setLinkedProject(data?.project_id ? await fetchProjectSummary(data.project_id) : null)
    const [clientResponse, creatorResponse] = await Promise.all([
      data?.client_id
        ? supabase.from('clients').select('*').eq('id', data.client_id).single()
        : Promise.resolve({ data: null }),
      data?.created_by
        ? supabase.from('profiles').select('*').eq('id', data.created_by).single()
        : Promise.resolve({ data: null }),
    ])
    setClient(clientResponse.data || null)
    setCreatorProfile(creatorResponse.data || null)
  }, [id])

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
      supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', id)
        .is('voided_at', null)
        .order('date', { ascending: true }),
      supabase
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
  }, [id])

  const fetchInvoiceFinancials = useCallback(async () => {
    const { data } = await supabase
      .from('invoice_financials_v')
      .select('*')
      .eq('id', id)
      .single()
    setInvoiceFinancials(data || null)
    if (data?.computed_status) {
      setInvoice((current) => (current ? { ...current, status: data.computed_status } : current))
    }
  }, [id])

  const fetchItems = useCallback(async () => {
    const { data, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order')

    if (itemsError && canUseInvoiceCacheFallback()) {
      throw itemsError
    }

    const loaded = (data || []).map((item) => ({
      ...item,
      custom_data: typeof item.custom_data === 'string' ? JSON.parse(item.custom_data || '{}') : item.custom_data || {},
      install_rate_override: item.install_rate_override === true,
      install_rate: item.install_rate === undefined ? null : item.install_rate,
      vat_rate: item.vat_rate === undefined ? null : item.vat_rate,
      discount_rate: item.discount_rate === undefined ? null : item.discount_rate,
      image_url: item.image_url || null,
    }))
    setItems(loaded)
  }, [id])

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
        supabase
          .from('settings')
          .select('*')
          .eq('id', 1)
          .single()
          .then(({ data, error: settingsError }) => {
            if (settingsError) throw settingsError
            if (data) setSettings(data)
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
  }, [fetchInvoice, fetchInvoiceFinancials, fetchInvoiceRelationships, fetchItems, fetchPayments, id])

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

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    invoice,
    items,
    payments,
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
