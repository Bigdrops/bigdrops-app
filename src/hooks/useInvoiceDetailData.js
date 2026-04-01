import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/supabase'
import { fetchInvoiceChildDocuments, fetchProjectSummary } from '@/domain/documentRelationships'

export function useInvoiceDetailData(id) {
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [payments, setPayments] = useState([])
  const [invoiceFinancials, setInvoiceFinancials] = useState(null)
  const [client, setClient] = useState(null)
  const [settings, setSettings] = useState({})
  const [bankAccounts, setBankAccounts] = useState([])
  const [signatories, setSignatories] = useState([])
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
      return
    }
    setInvoice(data)
    setLinkedProject(data?.project_id ? await fetchProjectSummary(data.project_id) : null)
    if (data?.client_id) {
      const { data: c } = await supabase.from('clients').select('*').eq('id', data.client_id).single()
      setClient(c || null)
    } else {
      setClient(null)
    }
  }, [id])

  const fetchInvoiceRelationships = useCallback(async () => {
    const related = await fetchInvoiceChildDocuments(id)
    setRelatedCsrs(related.csrs || [])
    setRelatedWaybills(related.waybills || [])
  }, [id])

  const fetchPayments = useCallback(async () => {
    const [{ data: activePayments }, { data: voidedPayments }] = await Promise.all([
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
    const { data } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order')

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
        .then(({ data }) => {
          setSignatories(data || [])
        }),
      supabase
        .from('bank_accounts')
        .select('*')
        .order('is_default', { ascending: false })
        .then(({ data }) => {
          setBankAccounts(data || [])
        }),
      supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single()
        .then(({ data }) => {
          if (data) setSettings(data)
        }),
    ])

    setLoading(false)
  }, [fetchInvoice, fetchInvoiceFinancials, fetchInvoiceRelationships, fetchItems, fetchPayments, id])

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
    session,
    linkedProject,
    loading,
    error,
    refresh,
    setInvoice,
    setPayments,
  }
}
