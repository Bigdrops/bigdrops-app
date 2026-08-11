import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/supabase'
import { useSafeAsyncTask } from '@/hooks/useSafeAsyncTask'
import { useEntity } from '@/lib/tenant/contexts'

export type SearchResult = {
  id: string
  type: 'client' | 'project' | 'invoice' | 'quotation' | 'csr' | 'waybill'
  title: string
  subtitle: string
  status?: string
  amount?: number
  date?: string
}

export function useGlobalSearch(query: string) {
  const { tenantClient } = useEntity()
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const { runLatest } = useSafeAsyncTask()

  const cleanQuery = useMemo(() => query.trim().toLowerCase(), [query])

  useEffect(() => {
    if (!tenantClient.isReady) return

    if (!cleanQuery || cleanQuery.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    const search = async (signal: AbortSignal) => {
      setLoading(true)
      
      try {
        const [
          clients,
          projects,
          invoices,
          quotations,
          csrs,
          waybills
        ] = await Promise.all([
          tenantClient.from('clients').select('id, name').ilike('name', `%${cleanQuery}%`).limit(3).abortSignal(signal),
          tenantClient.from('projects').select('id, name, client_name').ilike('name', `%${cleanQuery}%`).limit(3).abortSignal(signal),
          tenantClient.from('invoices').select('id, invoice_number, client_name, total, status, created_at').ilike('invoice_number', `%${cleanQuery}%`).is('archived_at', null).limit(3).abortSignal(signal),
          tenantClient.from('quotations').select('id, quotation_number, client_name, total, status, created_at').ilike('quotation_number', `%${cleanQuery}%`).limit(3).abortSignal(signal),
          supabase.from('csrs').select('id, csr_number, client_name, status, created_at').ilike('csr_number', `%${cleanQuery}%`).limit(3).abortSignal(signal),
          tenantClient.from('waybills').select('id, waybill_number, client_name, status, created_at').ilike('waybill_number', `%${cleanQuery}%`).limit(3).abortSignal(signal),
        ])

        const allResults: SearchResult[] = [
          ...(clients.data || []).map(r => ({
            id: r.id,
            type: 'client' as const,
            title: r.name,
            subtitle: 'Client'
          })),
          ...(projects.data || []).map(r => ({
            id: r.id,
            type: 'project' as const,
            title: r.name,
            subtitle: r.client_name || 'Project'
          })),
          ...(invoices.data || []).map(r => ({
            id: r.id,
            type: 'invoice' as const,
            title: r.invoice_number,
            subtitle: r.client_name || 'Invoice',
            amount: r.total,
            status: r.status,
            date: r.created_at
          })),
          ...(quotations.data || []).map(r => ({
            id: r.id,
            type: 'quotation' as const,
            title: r.quotation_number,
            subtitle: r.client_name || 'Quotation',
            amount: r.total,
            status: r.status,
            date: r.created_at
          })),
          ...(csrs.data || []).map(r => ({
            id: r.id,
            type: 'csr' as const,
            title: r.csr_number,
            subtitle: r.client_name || 'CSR',
            status: r.status,
            date: r.created_at
          })),
          ...(waybills.data || []).map(r => ({
            id: r.id,
            type: 'waybill' as const,
            title: r.waybill_number || 'Waybill',
            subtitle: r.client_name || 'Waybill',
            status: r.status,
            date: r.created_at
          })),
        ]

        setResults(allResults)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(() => {
      runLatest(search)
    }, 300)

    return () => clearTimeout(timer)
  }, [cleanQuery, runLatest, tenantClient.isReady])

  return { results, loading }
}
