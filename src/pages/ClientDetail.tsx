import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { useEntity } from '@/lib/tenant/contexts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { feedback } from '@/lib/feedback'

// Domain & Utils
import {
  ClientRecord,
  InvoiceRecord,
  QuotationRecord,
  CsrRecord,
  WaybillRecord,
  ProjectRecord,
  UnifiedActivityEvent,
  mergeActivity,
} from '@/domain/clientWorkspace'

// Components
import { ClientActionHeader } from '@/components/client/workspace/ClientActionHeader'
import { ClientOverviewTab } from '@/components/client/workspace/ClientOverviewTab'
import { ClientProjectsTab } from '@/components/client/workspace/ClientProjectsTab'
import { ClientDocumentsTab } from '@/components/client/workspace/ClientDocumentsTab'
import { CenteredSpinner, SkeletonCard, SkeletonRow } from '@/components/loading/AppLoadingStates'

type ClientWorkspaceTab = 'overview' | 'projects' | 'invoices' | 'quotations' | 'csrs' | 'waybills'

function padActivityCount(activity: UnifiedActivityEvent[], totalCount: number) {
  if (activity.length >= totalCount) return activity

  const placeholders = Array.from({ length: totalCount - activity.length }, (_, index) => ({
    id: `activity-placeholder-${index}`,
    type: 'invoice' as const,
    number: null,
    title: null,
    date: '1900-01-01T00:00:00.000Z',
    status: null,
    total: null,
  }))

  return [...activity, ...placeholders]
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenantClient } = useEntity()
  const [tab, setTab] = useState<ClientWorkspaceTab>('overview')

  const [client, setClient] = useState<ClientRecord | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [csrs, setCsrs] = useState<CsrRecord[]>([])
  const [waybills, setWaybills] = useState<WaybillRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [overviewActivity, setOverviewActivity] = useState<UnifiedActivityEvent[]>([])

  const [loading, setLoading] = useState({
    overview: true,
    projects: false,
    invoices: false,
    quotations: false,
    csrs: false,
    waybills: false,
  })
  const [loaded, setLoaded] = useState({
    overview: false,
    projects: false,
    invoices: false,
    quotations: false,
    csrs: false,
    waybills: false,
  })
  const [error, setError] = useState({
    overview: '',
    projects: '',
    invoices: '',
    quotations: '',
    csrs: '',
    waybills: '',
  })
  const requestIds = useRef({
    overview: 0,
    projects: 0,
    invoices: 0,
    quotations: 0,
    csrs: 0,
    waybills: 0,
  })

  useEffect(() => {
    setTab('overview')
    setClient(null)
    setInvoices([])
    setQuotations([])
    setCsrs([])
    setWaybills([])
    setProjects([])
    setOverviewActivity([])
    setLoading({
      overview: true,
      projects: false,
      invoices: false,
      quotations: false,
      csrs: false,
      waybills: false,
    })
    setLoaded({
      overview: false,
      projects: false,
      invoices: false,
      quotations: false,
      csrs: false,
      waybills: false,
    })
    setError({
      overview: '',
      projects: '',
      invoices: '',
      quotations: '',
      csrs: '',
      waybills: '',
    })
  }, [id])

  const loadOverview = useCallback(async () => {
    if (!id) {
      setLoading((current) => ({ ...current, overview: false }))
      setError((current) => ({ ...current, overview: 'Client not found' }))
      return
    }

    const requestId = ++requestIds.current.overview
    setLoading((current) => ({ ...current, overview: true }))
    setError((current) => ({ ...current, overview: '' }))

    if (!tenantClient.isReady) return

    try {
      const [
        clientRes,
        invoiceRes,
        quotationCountRes,
        csrCountRes,
        waybillCountRes,
        projectCountRes,
        quotationRecentRes,
        csrRecentRes,
        waybillRecentRes,
        projectRecentRes,
      ] = await Promise.all([
        tenantClient.from('clients').select('*').eq('id', id).single(),
        supabase
          .from('invoices')
          .select('id, invoice_number, invoice_title, status, total, issue_date, due_date, document_type, custom_fields')
          .eq('client_id', id)
          .is('archived_at', null)
          .order('issue_date', { ascending: false }),
        supabase
          .from('quotations')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', id),
        supabase
          .from('csrs')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', id),
        supabase
          .from('waybills')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', id),
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', id),
        supabase
          .from('quotations')
          .select('id, quotation_number, status, total, issue_date')
          .eq('client_id', id)
          .order('issue_date', { ascending: false })
          .limit(10),
        supabase
          .from('csrs')
          .select('id, csr_number, title, status, created_at, date')
          .eq('client_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('waybills')
          .select('id, waybill_number, status, date, created_at, type')
          .eq('client_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('projects')
          .select('id, name, project_code, status, start_date')
          .eq('client_id', id)
          .order('start_date', { ascending: false })
          .limit(10),
      ])

      if (requestIds.current.overview !== requestId) return

      if (clientRes.error || !clientRes.data) {
        setError((current) => ({ ...current, overview: clientRes.error?.message || 'Client not found' }))
        setLoading((current) => ({ ...current, overview: false }))
        return
      }

      setClient(clientRes.data as ClientRecord)

      const invoiceRows = invoiceRes.data || []
      const invoiceIds = invoiceRows.map((inv) => inv.id)

      let invoiceFinancialsById: Record<string, any> = {}
      if (invoiceIds.length > 0) {
        const { data: financials } = await supabase
          .from('invoice_financials_v')
          .select('id, balance_due, computed_status, cash_received')
          .in('id', invoiceIds)

        if (requestIds.current.overview !== requestId) return

        invoiceFinancialsById = (financials || []).reduce((acc, row) => {
          acc[row.id] = row
          return acc
        }, {})
      }

      const enrichedInvoices = invoiceRows.map((inv) => ({
        ...inv,
        ...invoiceFinancialsById[inv.id],
      })) as InvoiceRecord[]

      setInvoices(enrichedInvoices)
      setLoaded((current) => ({ ...current, invoices: true }))

      const overviewQuotations = ((quotationRecentRes.data || []) as QuotationRecord[]).slice(0, 10)
      const overviewCsrs = ((csrRecentRes.data || []) as CsrRecord[]).slice(0, 10)
      const overviewWaybills = ((waybillRecentRes.data || []) as WaybillRecord[]).slice(0, 10)
      const overviewProjects = ((projectRecentRes.data || []) as ProjectRecord[]).map((project) => ({
        ...project,
        project_value: null,
      }))
      const totalActivityCount =
        enrichedInvoices.length +
        Number(quotationCountRes.count || 0) +
        Number(csrCountRes.count || 0) +
        Number(waybillCountRes.count || 0) +
        Number(projectCountRes.count || 0)

      setOverviewActivity(
        padActivityCount(
          mergeActivity(
            enrichedInvoices,
            overviewQuotations,
            overviewCsrs,
            overviewWaybills,
            overviewProjects,
          ),
          totalActivityCount,
        ),
      )
      setLoaded((current) => ({ ...current, overview: true }))
      setLoading((current) => ({ ...current, overview: false }))
    } catch (err) {
      if (requestIds.current.overview !== requestId) return

      console.error('[ClientDetail] Error:', err)
      setError((current) => ({ ...current, overview: 'An error occurred loading client data' }))
      feedback.error('Error', { description: 'Could not load client details' })
      setLoading((current) => ({ ...current, overview: false }))
    }
  }, [id, tenantClient])

  const loadProjects = useCallback(async () => {
    if (!id) return

    const requestId = ++requestIds.current.projects
    setLoading((current) => ({ ...current, projects: true }))
    setError((current) => ({ ...current, projects: '' }))

    const projectRes = await supabase
      .from('projects')
      .select('id, name, project_code, status, project_value, start_date')
      .eq('client_id', id)
      .order('start_date', { ascending: false })

    if (requestIds.current.projects !== requestId) return

    setProjects((projectRes.data || []) as ProjectRecord[])
    setLoading((current) => ({ ...current, projects: false }))
    setError((current) => ({ ...current, projects: projectRes.error?.message || '' }))
    if (!projectRes.error) {
      setLoaded((current) => ({ ...current, projects: true }))
    }
  }, [id])

  const loadQuotations = useCallback(async () => {
    if (!id) return

    const requestId = ++requestIds.current.quotations
    setLoading((current) => ({ ...current, quotations: true }))
    setError((current) => ({ ...current, quotations: '' }))

    const quotationRes = await supabase
      .from('quotations')
      .select('id, quotation_number, status, total, issue_date')
      .eq('client_id', id)
      .order('issue_date', { ascending: false })

    if (requestIds.current.quotations !== requestId) return

    setQuotations((quotationRes.data || []) as QuotationRecord[])
    setLoading((current) => ({ ...current, quotations: false }))
    setError((current) => ({ ...current, quotations: quotationRes.error?.message || '' }))
    if (!quotationRes.error) {
      setLoaded((current) => ({ ...current, quotations: true }))
    }
  }, [id])

  const loadCsrs = useCallback(async () => {
    if (!id) return

    const requestId = ++requestIds.current.csrs
    setLoading((current) => ({ ...current, csrs: true }))
    setError((current) => ({ ...current, csrs: '' }))

    const csrRes = await supabase
      .from('csrs')
      .select('id, csr_number, title, status, created_at, date')
      .eq('client_id', id)
      .order('created_at', { ascending: false })

    if (requestIds.current.csrs !== requestId) return

    setCsrs((csrRes.data || []) as CsrRecord[])
    setLoading((current) => ({ ...current, csrs: false }))
    setError((current) => ({ ...current, csrs: csrRes.error?.message || '' }))
    if (!csrRes.error) {
      setLoaded((current) => ({ ...current, csrs: true }))
    }
  }, [id])

  const loadWaybills = useCallback(async () => {
    if (!id) return

    const requestId = ++requestIds.current.waybills
    setLoading((current) => ({ ...current, waybills: true }))
    setError((current) => ({ ...current, waybills: '' }))

    const waybillRes = await supabase
      .from('waybills')
      .select('id, waybill_number, status, date, created_at, type')
      .eq('client_id', id)
      .order('created_at', { ascending: false })

    if (requestIds.current.waybills !== requestId) return

    setWaybills((waybillRes.data || []) as WaybillRecord[])
    setLoading((current) => ({ ...current, waybills: false }))
    setError((current) => ({ ...current, waybills: waybillRes.error?.message || '' }))
    if (!waybillRes.error) {
      setLoaded((current) => ({ ...current, waybills: true }))
    }
  }, [id])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    if (tab === 'projects' && !loaded.projects && !loading.projects) {
      void loadProjects()
    }
    if (tab === 'quotations' && !loaded.quotations && !loading.quotations) {
      void loadQuotations()
    }
    if (tab === 'csrs' && !loaded.csrs && !loading.csrs) {
      void loadCsrs()
    }
    if (tab === 'waybills' && !loaded.waybills && !loading.waybills) {
      void loadWaybills()
    }
  }, [
    tab,
    loaded.projects,
    loaded.quotations,
    loaded.csrs,
    loaded.waybills,
    loading.projects,
    loading.quotations,
    loading.csrs,
    loading.waybills,
    loadProjects,
    loadQuotations,
    loadCsrs,
    loadWaybills,
  ])

  const overviewError = error.overview
  const isProjectsLoading = loading.projects || (tab === 'projects' && !loaded.projects)
  const isQuotationsLoading = loading.quotations || (tab === 'quotations' && !loaded.quotations)
  const isCsrsLoading = loading.csrs || (tab === 'csrs' && !loaded.csrs)
  const isWaybillsLoading = loading.waybills || (tab === 'waybills' && !loaded.waybills)

  if (loading.overview) {
    return (
      <Layout title="Client Workspace" session={null}>
        <div className="space-y-3 px-4 py-4">
          <SkeletonCard className="h-[116px]" />
          <SkeletonRow />
          <SkeletonRow />
          <CenteredSpinner />
        </div>
      </Layout>
    )
  }

  if (!client) {
    return (
      <Layout title="Client Workspace" session={null}>
        <div className="px-6 py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {overviewError || 'Client not found.'}
          </div>
        </div>
      </Layout>
    )
  }

  const TABS = [
    { label: 'Overview', value: 'overview' },
    { label: 'Projects', value: 'projects' },
    { label: 'Invoices', value: 'invoices' },
    { label: 'Quotations', value: 'quotations' },
    { label: 'CSRs', value: 'csrs' },
    { label: 'Waybills', value: 'waybills' },
  ]

  return (
    <Layout
      title={client.name || 'Client Workspace'}
      session={null}
      hidePageHeader
      contentClassName="w-full max-w-none p-0 pb-24 md:px-4 md:pb-10"
    >
      <ClientActionHeader client={client} onEdit={() => navigate(`/clients/edit/${id}`)} />

      <div className="mx-auto max-w-5xl px-4 py-6">
        <Tabs value={tab} onValueChange={(value) => setTab(value as ClientWorkspaceTab)} className="w-full">
          <TabsList className="mb-6 h-auto w-full gap-5 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 no-scrollbar">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent px-1 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:text-black transition-all"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-0 outline-none">
             <ClientOverviewTab client={client} invoices={invoices} activity={overviewActivity} />
          </TabsContent>

          <TabsContent value="projects" className="mt-0 outline-none">
             {isProjectsLoading ? (
              <div className="space-y-3">
                <SkeletonRow />
                <SkeletonRow />
                <CenteredSpinner />
              </div>
            ) : error.projects ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error.projects}</div>
            ) : (
              <ClientProjectsTab projects={projects} />
            )}
          </TabsContent>

          <TabsContent value="invoices" className="mt-0 outline-none">
             <ClientDocumentsTab
                type="invoice"
                documents={invoices.map(inv => ({ ...inv, number: inv.invoice_number, title: inv.invoice_title }))}
             />
          </TabsContent>

          <TabsContent value="quotations" className="mt-0 outline-none">
             {isQuotationsLoading ? (
              <div className="space-y-3">
                <SkeletonRow />
                <SkeletonRow />
                <CenteredSpinner />
              </div>
            ) : error.quotations ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error.quotations}</div>
            ) : (
              <ClientDocumentsTab
                type="quotation"
                documents={quotations.map(q => ({ ...q, number: q.quotation_number }))}
             />
            )}
          </TabsContent>

          <TabsContent value="csrs" className="mt-0 outline-none">
             {isCsrsLoading ? (
              <div className="space-y-3">
                <SkeletonRow />
                <SkeletonRow />
                <CenteredSpinner />
              </div>
            ) : error.csrs ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error.csrs}</div>
            ) : (
              <ClientDocumentsTab
                type="csr"
                documents={csrs.map(c => ({ ...c, number: c.csr_number }))}
             />
            )}
          </TabsContent>

          <TabsContent value="waybills" className="mt-0 outline-none">
             {isWaybillsLoading ? (
              <div className="space-y-3">
                <SkeletonRow />
                <SkeletonRow />
                <CenteredSpinner />
              </div>
            ) : error.waybills ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error.waybills}</div>
            ) : (
              <ClientDocumentsTab
                type="waybill"
                documents={waybills.map(w => ({ ...w, number: w.waybill_number }))}
             />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
