import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'

// Domain & Utils
import {
  ClientRecord,
  InvoiceRecord,
  QuotationRecord,
  CsrRecord,
  WaybillRecord,
  ProjectRecord,
  mergeActivity,
} from '@/domain/clientWorkspace'

// Components
import { ClientActionHeader } from '@/components/client/workspace/ClientActionHeader'
import { ClientOverviewTab } from '@/components/client/workspace/ClientOverviewTab'
import { ClientProjectsTab } from '@/components/client/workspace/ClientProjectsTab'
import { ClientDocumentsTab } from '@/components/client/workspace/ClientDocumentsTab'
import { CenteredSpinner, SkeletonCard, SkeletonRow } from '@/components/loading/AppLoadingStates'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [client, setClient] = useState<ClientRecord | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [csrs, setCsrs] = useState<CsrRecord[]>([])
  const [waybills, setWaybills] = useState<WaybillRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAll()
  }, [id])

  const fetchAll = async () => {
    setLoading(true)
    setError('')

    try {
      const [
        clientRes,
        invoiceRes,
        quotationRes,
        csrRes,
        waybillRes,
        projectRes,
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase
          .from('invoices')
          .select('id, invoice_number, invoice_title, status, total, issue_date, document_type')
          .eq('client_id', id)
          .is('archived_at', null)
          .or('thread_role.is.null,thread_role.neq.advance')
          .or('is_advance.is.null,is_advance.eq.false')
          .order('issue_date', { ascending: false }),
        supabase
          .from('quotations')
          .select('id, quotation_number, status, total, issue_date')
          .eq('client_id', id)
          .order('issue_date', { ascending: false }),
        supabase
          .from('csrs')
          .select('id, csr_number, title, status, created_at, date')
          .eq('client_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('waybills')
          .select('id, waybill_number, status, date, created_at, type')
          .eq('client_id', id)
          .order('created_at', { ascending: false }),
        supabase
          .from('projects')
          .select('id, name, project_code, status, project_value, start_date')
          .eq('client_id', id)
          .order('start_date', { ascending: false }),
      ])

      if (clientRes.error || !clientRes.data) {
         setError(clientRes.error?.message || 'Client not found')
         setLoading(false)
         return
      }

      setClient(clientRes.data as ClientRecord)
      setQuotations(quotationRes.data || [])
      setCsrs(csrRes.data || [])
      setWaybills(waybillRes.data || [])
      setProjects(projectRes.data || [])

      const invoiceRows = invoiceRes.data || []
      const invoiceIds = invoiceRows.map((inv) => inv.id)

      let invoiceFinancialsById: Record<string, any> = {}
      if (invoiceIds.length > 0) {
        const { data: financials } = await supabase
          .from('invoice_financials_v')
          .select('id, balance_due, computed_status, cash_received')
          .in('id', invoiceIds)

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
      setLoading(false)
    } catch (err) {
      console.error('[ClientDetail] Error:', err)
      setError('An error occurred loading client data')
      toast({ title: 'Error', description: 'Could not load client details', variant: 'destructive' })
      setLoading(false)
    }
  }

  const activity = mergeActivity(invoices, quotations, csrs, waybills, projects)

  if (loading) {
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
            {error || 'Client not found.'}
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
        <Tabs defaultValue="overview" className="w-full">
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
             <ClientOverviewTab client={client} invoices={invoices} activity={activity} />
          </TabsContent>

          <TabsContent value="projects" className="mt-0 outline-none">
             <ClientProjectsTab projects={projects} />
          </TabsContent>

          <TabsContent value="invoices" className="mt-0 outline-none">
             <ClientDocumentsTab
                type="invoice"
                documents={invoices.map(inv => ({ ...inv, number: inv.invoice_number, title: inv.invoice_title }))}
             />
          </TabsContent>

          <TabsContent value="quotations" className="mt-0 outline-none">
             <ClientDocumentsTab
                type="quotation"
                documents={quotations.map(q => ({ ...q, number: q.quotation_number }))}
             />
          </TabsContent>

          <TabsContent value="csrs" className="mt-0 outline-none">
             <ClientDocumentsTab
                type="csr"
                documents={csrs.map(c => ({ ...c, number: c.csr_number }))}
             />
          </TabsContent>

          <TabsContent value="waybills" className="mt-0 outline-none">
             <ClientDocumentsTab
                type="waybill"
                documents={waybills.map(w => ({ ...w, number: w.waybill_number }))}
             />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
