import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useEntity } from '@/lib/tenant/contexts'
import { feedback } from '@/lib/feedback'

// Domain & Utils
import {
  ClientRecord,
  InvoiceRecord,
  QuotationRecord,
  CsrRecord,
  WaybillRecord,
  ProjectRecord,
} from '@/domain/clientWorkspace'

// Components
import { ClientIdentityBar } from '@/components/client/workspace/ClientIdentityBar'
import { MoneyPositionStrip } from '@/components/client/workspace/MoneyPositionStrip'
import { NeedsAttentionGroup } from '@/components/client/workspace/NeedsAttentionGroup'
import { ClientCreateFab } from '@/components/client/workspace/ClientCreateFab'
import { ClientContactSection } from '@/components/client/workspace/ClientContactSection'
import {
  CsrList,
  DOC_ICONS,
  HistoryGroup,
  InvoiceList,
  ProjectList,
  QuotationList,
  WaybillList,
} from '@/components/client/workspace/GroupedHistory'
import { CenteredSpinner, SkeletonCard, SkeletonRow } from '@/components/loading/AppLoadingStates'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenantClient } = useEntity()
  const [client, setClient] = useState<ClientRecord | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [csrs, setCsrs] = useState<CsrRecord[]>([])
  const [waybills, setWaybills] = useState<WaybillRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [counts, setCounts] = useState({ quotations: 0, csrs: 0, waybills: 0, projects: 0 })

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
    setClient(null)
    setInvoices([])
    setQuotations([])
    setCsrs([])
    setWaybills([])
    setProjects([])
    setCounts({ quotations: 0, csrs: 0, waybills: 0, projects: 0 })
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
        tenantClient
          .from('invoices')
          .select('id, invoice_number, invoice_title, status, total, issue_date, due_date, document_type, custom_fields')
          .eq('client_id', id)
          .is('archived_at', null)
          .order('issue_date', { ascending: false }),
        tenantClient
          .from('quotations')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', id),
        tenantClient
          .from('csrs')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', id),
        tenantClient
          .from('waybills')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', id),
        tenantClient
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', id),
        tenantClient
          .from('quotations')
          .select('id, quotation_number, status, total, issue_date')
          .eq('client_id', id)
          .order('issue_date', { ascending: false })
          .limit(10),
        tenantClient
          .from('csrs')
          .select('id, csr_number, title, status, created_at, date')
          .eq('client_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
        tenantClient
          .from('waybills')
          .select('id, waybill_number, status, date, created_at, type')
          .eq('client_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
        tenantClient
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
        const { data: financials } = await tenantClient
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
      setQuotations(overviewQuotations)
      setCsrs(overviewCsrs)
      setWaybills(overviewWaybills)
      setProjects(overviewProjects)
      setCounts({
        quotations: Number(quotationCountRes.count || 0),
        csrs: Number(csrCountRes.count || 0),
        waybills: Number(waybillCountRes.count || 0),
        projects: Number(projectCountRes.count || 0),
      })
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
    if (!id || !tenantClient.isReady) return

    const requestId = ++requestIds.current.projects
    setLoading((current) => ({ ...current, projects: true }))
    setError((current) => ({ ...current, projects: '' }))

    const projectRes = await tenantClient
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
  }, [id, tenantClient])

  const loadQuotations = useCallback(async () => {
    if (!id || !tenantClient.isReady) return

    const requestId = ++requestIds.current.quotations
    setLoading((current) => ({ ...current, quotations: true }))
    setError((current) => ({ ...current, quotations: '' }))

    const quotationRes = await tenantClient
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
  }, [id, tenantClient])

  const loadCsrs = useCallback(async () => {
    if (!id || !tenantClient.isReady) return

    const requestId = ++requestIds.current.csrs
    setLoading((current) => ({ ...current, csrs: true }))
    setError((current) => ({ ...current, csrs: '' }))

    const csrRes = await tenantClient
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
  }, [id, tenantClient])

  const loadWaybills = useCallback(async () => {
    if (!id || !tenantClient.isReady) return

    const requestId = ++requestIds.current.waybills
    setLoading((current) => ({ ...current, waybills: true }))
    setError((current) => ({ ...current, waybills: '' }))

    const waybillRes = await tenantClient
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
  }, [id, tenantClient])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const overviewError = error.overview

  const summary = useMemo(() => {
    return invoices.reduce(
      (acc, inv) => {
        acc.total += Number(inv.total || 0)
        acc.collected += Number(inv.cash_received || 0)
        acc.outstanding += Number(inv.balance_due || 0)
        return acc
      },
      { total: 0, collected: 0, outstanding: 0 },
    )
  }, [invoices])

  const overdue = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return invoices.filter((inv) => {
      const balance = Number(inv.balance_due || 0)
      if (balance <= 0) return false
      if (String(inv.computed_status || '').toLowerCase() === 'overdue') return true
      if (!inv.due_date) return false
      const dueDate = new Date(inv.due_date)
      if (Number.isNaN(dueDate.getTime())) return false
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < today
    })
  }, [invoices])

  const statusLine = useMemo(() => {
    if (overdue.length > 0) return `${overdue.length} overdue`
    if (summary.outstanding > 0) return 'Has outstanding balance'
    if (invoices.length > 0) return 'Settled'
    return null
  }, [overdue.length, summary.outstanding, invoices.length])

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
          <div className="rounded-2xl border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] p-4 text-sm text-[hsl(var(--bd-status-danger-text))]">
            {overviewError || 'Client not found.'}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      title={client.name || 'Client Workspace'}
      session={null}
      hidePageHeader
      contentClassName="w-full max-w-none bg-background p-0 pb-24 md:px-4 md:pb-10"
    >
      <ClientIdentityBar
        clientName={client.name || 'Client Workspace'}
        statusLine={statusLine}
        onEdit={() => navigate(`/clients/edit/${id}`)}
      />

      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_320px] md:gap-6 md:py-6">
        <div className="min-w-0 space-y-4">
          <MoneyPositionStrip
            total={summary.total}
            collected={summary.collected}
            outstanding={summary.outstanding}
          />

          <NeedsAttentionGroup overdue={overdue} />

          <HistoryGroup
            title="Invoices"
            icon={DOC_ICONS.invoice}
            count={invoices.length}
            loading={false}
            error=""
            onRetry={() => {}}
          >
            <InvoiceList invoices={invoices} />
          </HistoryGroup>

          <HistoryGroup
            title="Quotations"
            icon={DOC_ICONS.quotation}
            count={loaded.quotations ? quotations.length : counts.quotations}
            loading={false}
            error={error.quotations}
            onRetry={() => void loadQuotations()}
          >
            <QuotationList
              quotations={quotations}
              totalCount={loaded.quotations ? quotations.length : counts.quotations}
              allLoaded={loaded.quotations}
              loadingAll={loading.quotations}
              onLoadAll={() => void loadQuotations()}
            />
          </HistoryGroup>

          <HistoryGroup
            title="Service reports"
            icon={DOC_ICONS.csr}
            count={loaded.csrs ? csrs.length : counts.csrs}
            loading={false}
            error={error.csrs}
            onRetry={() => void loadCsrs()}
          >
            <CsrList
              csrs={csrs}
              totalCount={loaded.csrs ? csrs.length : counts.csrs}
              allLoaded={loaded.csrs}
              loadingAll={loading.csrs}
              onLoadAll={() => void loadCsrs()}
            />
          </HistoryGroup>

          <HistoryGroup
            title="Waybills"
            icon={DOC_ICONS.waybill}
            count={loaded.waybills ? waybills.length : counts.waybills}
            loading={false}
            error={error.waybills}
            onRetry={() => void loadWaybills()}
          >
            <WaybillList
              waybills={waybills}
              totalCount={loaded.waybills ? waybills.length : counts.waybills}
              allLoaded={loaded.waybills}
              loadingAll={loading.waybills}
              onLoadAll={() => void loadWaybills()}
            />
          </HistoryGroup>

          <HistoryGroup
            title="Projects"
            icon={DOC_ICONS.project}
            count={loaded.projects ? projects.length : counts.projects}
            loading={false}
            error={error.projects}
            onRetry={() => void loadProjects()}
          >
            <ProjectList
              projects={projects}
              totalCount={loaded.projects ? projects.length : counts.projects}
              allLoaded={loaded.projects}
              loadingAll={loading.projects}
              onLoadAll={() => void loadProjects()}
            />
          </HistoryGroup>
        </div>

        <div className="min-w-0 space-y-4 md:pt-0">
          <ClientContactSection client={client} />
        </div>
      </div>

      <ClientCreateFab clientId={client.id} clientName={client.name} />
    </Layout>
  )
}
