import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/supabase'
import { applyParentInvoiceFilter } from '@/domain/invoice/isParentInvoiceFilter'
import { feedback } from '@/lib/feedback'

export interface Project {
  id: string
  name: string
  status: string
  project_value: number | null
  po_number: string | null
  start_date: string | null
  notes: string | null
  location: string | null
  project_code: string | null
  client_id: string | null
  client_name: string | null
  [key: string]: any
}

export interface Financials {
  total_invoiced: number
  cash_collected: number
  wht_collected: number
  outstanding: number
  invoice_count: number
}

export interface Invoice {
  id: string
  invoice_number: string
  invoice_title: string | null
  status: string
  total: number
  issue_date: string
  document_type: string
  custom_fields: any
  invoiceFinancials: {
    balance_due: number
    computed_status: string
    cash_received: number
  } | null
}

export interface CSR {
  id: string
  csr_number: string
  title: string | null
  status: string
  created_at: string
}

export interface Quotation {
  id: string
  quotation_number: string
  status: string
  total: number
  issue_date: string
}

export interface Waybill {
  id: string
  waybill_number: string
  status: string
  date: string | null
  created_at: string
  type: string | null
}

export interface ProjectDoc {
  id: string
  name: string
  url: string
  created_at: string
}

export interface TimelineItem {
  _type: 'invoice' | 'csr' | 'quotation' | 'waybill'
  _date: string
  id: string
  [key: string]: any
}

export interface UseProjectDocumentFetchResult {
  project: Project | null
  financials: Financials | null
  invoices: Invoice[]
  csrs: CSR[]
  quotations: Quotation[]
  waybills: Waybill[]
  projectDocs: ProjectDoc[]
  timeline: TimelineItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useProjectDocumentFetch(projectId: string | undefined): UseProjectDocumentFetchResult {
  const [project, setProject] = useState<Project | null>(null)
  const [financials, setFinancials] = useState<Financials | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [csrs, setCsrs] = useState<CSR[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [waybills, setWaybills] = useState<Waybill[]>([])
  const [projectDocs, setProjectDocs] = useState<ProjectDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    setError(null)

    try {
      const [projectRes, invoiceRes, csrRes, quotationRes, waybillRes, financialsRes, projectDocsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        applyParentInvoiceFilter(supabase
          .from('invoices')
          .select('id, invoice_number, invoice_title, status, total, issue_date, document_type, custom_fields')
          .eq('project_id', projectId)
          .is('archived_at', null))
          .order('issue_date', { ascending: false }),
        supabase
          .from('csrs')
          .select('id, csr_number, title, status, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('quotations')
          .select('id, quotation_number, status, total, issue_date')
          .eq('project_id', projectId)
          .order('issue_date', { ascending: false }),
        supabase
          .from('waybills')
          .select('id, waybill_number, status, date, created_at, type')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase.from('project_financials_v').select('*').eq('project_id', projectId).single(),
        supabase.from('project_documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      ])

      const projectData = projectRes.data
      const invoiceRows = invoiceRes.data || []
      const invoiceIds = invoiceRows.map((invoice) => invoice.id)

      let invoiceFinancialsById: Record<string, any> = {}
      if (invoiceIds.length > 0) {
        const { data: invoiceFinancialsRows } = await supabase
          .from('invoice_financials_v')
          .select('id, balance_due, computed_status, cash_received')
          .in('id', invoiceIds)

        invoiceFinancialsById = (invoiceFinancialsRows || []).reduce((acc: Record<string, any>, row) => {
          acc[row.id] = row
          return acc
        }, {})
      }

      const enrichedInvoices: Invoice[] = invoiceRows.map((invoice) => ({
        ...invoice,
        invoiceFinancials: invoiceFinancialsById[invoice.id] || null,
      }))

      setProject(projectData)
      setFinancials(financialsRes.data || null)
      setInvoices(enrichedInvoices)
      setCsrs(csrRes.data || [])
      setQuotations(quotationRes.data || [])
      setWaybills(waybillRes.data || [])
      setProjectDocs(projectDocsRes.data || [])
    } catch (err) {
      console.error('[useProjectDocumentFetch] fetchAll error:', err)
      setError('Failed to load project')
      feedback.error('Failed to load project', {
        description: 'Please refresh and try again.',
      })
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      fetchAll()
    }
  }, [projectId, fetchAll])

  const timeline: TimelineItem[] = [
    ...invoices.map((invoice) => ({
      ...invoice,
      _type: 'invoice' as const,
      _date: invoice.issue_date,
    })),
    ...csrs.map((csr) => ({
      ...csr,
      _type: 'csr' as const,
      _date: csr.created_at,
    })),
    ...quotations.map((quotation) => ({
      ...quotation,
      _type: 'quotation' as const,
      _date: quotation.issue_date,
    })),
    ...waybills.map((waybill) => ({
      ...waybill,
      _type: 'waybill' as const,
      _date: waybill.date || waybill.created_at,
    })),
  ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime())

  return {
    project,
    financials,
    invoices,
    csrs,
    quotations,
    waybills,
    projectDocs,
    timeline,
    loading,
    error,
    refresh: fetchAll,
  }
}