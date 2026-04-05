import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, MapPin, Pencil, Phone, User } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type ClientRecord = {
  id: string
  name?: string | null
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  category?: string | null
}

type InvoiceRecord = {
  id: string
  invoice_number?: string | null
  issue_date?: string | null
  total?: number | string | null
  status?: string | null
}

type QuotationRecord = {
  id: string
  quotation_number?: string | null
  issue_date?: string | null
  total?: number | string | null
  status?: string | null
}

type CsrRecord = {
  id: string
  csr_number?: string | null
  date?: string | null
  created_at?: string | null
  status?: string | null
}

type SummaryMetricProps = {
  label: string
  value: string | number
  tone?: 'default' | 'danger'
}

type ContactRowProps = {
  icon: typeof Phone
  label: string
  value: string
}

type DocumentRowProps = {
  number: string
  date: string
  amount: number | string | null
  status: string | null | undefined
  onClick: () => void
}

const formatMoney = (value: number | string | null | undefined) => `₦${Number(value || 0).toLocaleString()}`

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'No date'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const getStatusClasses = (status: string | null | undefined) => {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
      return 'bg-green-100 text-green-700'
    case 'sent':
      return 'bg-blue-100 text-blue-700'
    case 'overdue':
      return 'bg-red-100 text-red-600'
    case 'cancelled':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-muted text-zinc-600'
  }
}

function SummaryMetric({ label, value, tone = 'default' }: SummaryMetricProps) {
  return (
    <div className={`aspect-square rounded-xl p-4 ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-muted/50 text-foreground'}`}>
      <div className="flex h-full flex-col justify-between">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${tone === 'danger' ? 'text-red-500' : 'text-muted-foreground'}`}>
          {label}
        </div>
        <div className="text-lg font-black tracking-tighter">{value}</div>
      </div>
    </div>
  )
}

function ContactRow({ icon: Icon, label, value }: ContactRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-muted p-2 text-zinc-600">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 break-words text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  )
}

function DocumentRow({ number, date, amount, status, onClick }: DocumentRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-xl bg-muted/50 p-4 text-left transition hover:bg-muted"
    >
      <div className="min-w-0">
        <div className="truncate text-xs font-bold text-muted-foreground">{number}</div>
        <div className="mt-1 text-[10px] text-muted-foreground">{date}</div>
        {amount != null ? <div className="mt-2 text-base font-bold text-foreground">{formatMoney(amount)}</div> : null}
      </div>
      <Badge className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest ${getStatusClasses(status)}`}>
        {status || 'draft'}
      </Badge>
    </button>
  )
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientRecord | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [quotations, setQuotations] = useState<QuotationRecord[]>([])
  const [csrs, setCsrs] = useState<CsrRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')

      const [clientResult, invoiceResult, quotationResult, csrResult] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('invoices').select('*').eq('client_id', id).is('archived_at', null).order('issue_date', { ascending: false }),
        supabase.from('quotations').select('*').eq('client_id', id).order('issue_date', { ascending: false }),
        supabase.from('csrs').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      ])

      if (cancelled) return

      if (clientResult.error || !clientResult.data) {
        setError(clientResult.error?.message || 'Client not found')
        setLoading(false)
        return
      }

      setClient(clientResult.data as ClientRecord)
      setInvoices((invoiceResult.data || []) as InvoiceRecord[])
      setQuotations((quotationResult.data || []) as QuotationRecord[])
      setCsrs((csrResult.data || []) as CsrRecord[])

      const relatedError = invoiceResult.error || quotationResult.error || csrResult.error
      if (relatedError) setError(relatedError.message)
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [id])

  const totalInvoiced = useMemo(
    () => invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    [invoices],
  )

  const outstanding = useMemo(
    () => invoices.reduce((sum, invoice) => sum + (String(invoice.status || '').toLowerCase() === 'paid' ? 0 : Number(invoice.total || 0)), 0),
    [invoices],
  )

  const addressLine = [client?.address, client?.city, client?.state].filter(Boolean).join(', ')

  if (loading) {
    return (
      <Layout title="Client" session={null} hidePageHeader contentClassName="w-full max-w-none p-0 pb-24 md:max-w-2xl md:px-4 md:pb-10">
        <div className="w-full px-4 py-8 text-sm text-muted-foreground">Loading client...</div>
      </Layout>
    )
  }

  if (!client) {
    return (
      <Layout title="Client" session={null} hidePageHeader contentClassName="w-full max-w-none p-0 pb-24 md:max-w-2xl md:px-4 md:pb-10">
        <div className="w-full px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {error || 'Client not found'}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={client.name || 'Client'} session={null} hidePageHeader contentClassName="w-full max-w-none p-0 pb-24 md:max-w-2xl md:px-4 md:pb-10">
      <div className="w-full">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background px-4 py-3">
          <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" onClick={() => navigate('/clients')}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="truncate text-sm font-bold text-foreground">Client</div>
          <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" onClick={() => navigate(`/clients/edit/${id}`)}>
            <Pencil className="size-4" />
          </Button>
        </div>

        <div className="space-y-6 px-4 py-5">
          <section>
            {client.category ? (
              <div className="mb-3">
                <Badge className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-600">
                  {client.category}
                </Badge>
              </div>
            ) : null}
            <h1 className="text-2xl font-black tracking-tighter text-zinc-950">{client.name}</h1>
            {client.contact_person ? <div className="mt-2 text-sm font-medium text-muted-foreground">{client.contact_person}</div> : null}
            {error ? <div className="mt-2 text-xs text-amber-600">{error}</div> : null}
          </section>

          <section className="rounded-xl bg-muted/50 p-5">
            <div className="space-y-4">
              <ContactRow icon={User} label="Contact Person" value={client.contact_person || 'No contact person'} />
              <ContactRow icon={Phone} label="Phone" value={client.phone || 'No phone'} />
              <ContactRow icon={Mail} label="Email" value={client.email || 'No email'} />
              <ContactRow icon={MapPin} label="Address" value={addressLine || 'No address'} />
            </div>
          </section>

          <section>
            <div className="grid grid-cols-2 gap-3">
              <SummaryMetric label="Total Invoiced" value={formatMoney(totalInvoiced)} />
              <SummaryMetric label="Outstanding" value={formatMoney(outstanding)} tone={outstanding > 0 ? 'danger' : 'default'} />
              <SummaryMetric label="Total Quotations" value={quotations.length} />
              <SummaryMetric label="Total CSRs" value={csrs.length} />
            </div>
          </section>

          <section>
            <Tabs defaultValue="invoices" className="w-full">
              <TabsList className="flex h-auto w-full rounded-none border-b border-border bg-transparent p-0">
                <TabsTrigger value="invoices" className="flex-1 rounded-none border-b-2 border-transparent px-0 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900">
                  Invoices
                </TabsTrigger>
                <TabsTrigger value="quotations" className="flex-1 rounded-none border-b-2 border-transparent px-0 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900">
                  Quotations
                </TabsTrigger>
                <TabsTrigger value="csrs" className="flex-1 rounded-none border-b-2 border-transparent px-0 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:text-zinc-900">
                  CSRs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="invoices" className="space-y-3 pt-4">
                {invoices.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No invoices yet</div>
                ) : (
                  invoices.map((invoice) => (
                    <DocumentRow
                      key={invoice.id}
                      number={invoice.invoice_number || 'Invoice'}
                      date={formatDate(invoice.issue_date)}
                      amount={invoice.total}
                      status={invoice.status}
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="quotations" className="space-y-3 pt-4">
                {quotations.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No quotations yet</div>
                ) : (
                  quotations.map((quotation) => (
                    <DocumentRow
                      key={quotation.id}
                      number={quotation.quotation_number || 'Quotation'}
                      date={formatDate(quotation.issue_date)}
                      amount={quotation.total}
                      status={quotation.status}
                      onClick={() => navigate(`/quotations/${quotation.id}`)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="csrs" className="space-y-3 pt-4">
                {csrs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No CSRs yet</div>
                ) : (
                  csrs.map((csr) => (
                    <DocumentRow
                      key={csr.id}
                      number={csr.csr_number || 'CSR'}
                      date={formatDate(csr.date || csr.created_at)}
                      amount={null}
                      status={csr.status}
                      onClick={() => navigate(`/csr/${csr.id}`)}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </Layout>
  )
}
