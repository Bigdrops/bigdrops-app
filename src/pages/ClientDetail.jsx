import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, MapPin, PencilLine, Phone } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const formatMoney = (value) => `₦${Number(value || 0).toLocaleString()}`

const formatDate = (value) => {
  if (!value) return 'No date'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SummaryMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</div>
      <div className="mt-2 text-lg font-bold text-zinc-950">{value}</div>
    </div>
  )
}

function DocumentRow({ title, subtitle, amount, status, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-zinc-950">{title}</div>
        <div className="mt-1 truncate text-xs text-zinc-500">{subtitle}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {amount != null ? <div className="whitespace-nowrap text-sm font-semibold text-zinc-950">{formatMoney(amount)}</div> : null}
        <Badge variant="outline" className="whitespace-nowrap text-[10px] font-semibold capitalize text-zinc-600">
          {status || 'draft'}
        </Badge>
      </div>
    </button>
  )
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [quotations, setQuotations] = useState([])
  const [csrs, setCsrs] = useState([])
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

      setClient(clientResult.data)
      setInvoices(invoiceResult.data || [])
      setQuotations(quotationResult.data || [])
      setCsrs(csrResult.data || [])

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
      <Layout title="Client">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 text-sm text-zinc-500">Loading client...</div>
      </Layout>
    )
  }

  if (!client) {
    return (
      <Layout title="Client">
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {error || 'Client not found'}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={client.name || 'Client'}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4 sm:py-6">
        <div className="flex items-start justify-between gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/clients')} className="shrink-0">
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/clients/edit/${id}`)} className="shrink-0">
            <PencilLine className="size-3.5" />
            Edit
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">{client.name}</h1>
          {client.contact_person ? <p className="mt-1 text-sm text-zinc-500">{client.contact_person}</p> : null}
          {error ? <p className="mt-2 text-xs text-amber-600">{error}</p> : null}
        </div>

        <Card className="border border-zinc-200 shadow-none">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle>Contact info</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4">
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <Phone className="size-4 text-zinc-400" />
              <span>{client.phone || 'No phone'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <Mail className="size-4 text-zinc-400" />
              <span>{client.email || 'No email'}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-zinc-700">
              <MapPin className="mt-0.5 size-4 text-zinc-400" />
              <span>{addressLine || 'No address'}</span>
            </div>
            {client.category ? (
              <div>
                <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                  {client.category}
                </Badge>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 shadow-none">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle>Financial summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
            <SummaryMetric label="Total Invoiced" value={formatMoney(totalInvoiced)} />
            <SummaryMetric label="Outstanding" value={formatMoney(outstanding)} />
            <SummaryMetric label="Total Quotations" value={quotations.length} />
            <SummaryMetric label="Total CSRs" value={csrs.length} />
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 shadow-none">
          <CardHeader className="border-b border-zinc-100">
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs defaultValue="invoices" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="quotations">Quotations</TabsTrigger>
                <TabsTrigger value="csrs">CSRs</TabsTrigger>
              </TabsList>

              <TabsContent value="invoices" className="space-y-3">
                {invoices.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500">No invoices yet.</div>
                ) : (
                  invoices.map((invoice) => (
                    <DocumentRow
                      key={invoice.id}
                      title={invoice.invoice_number || 'Invoice'}
                      subtitle={formatDate(invoice.issue_date)}
                      amount={invoice.total}
                      status={invoice.status}
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="quotations" className="space-y-3">
                {quotations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500">No quotations yet.</div>
                ) : (
                  quotations.map((quotation) => (
                    <DocumentRow
                      key={quotation.id}
                      title={quotation.quotation_number || 'Quotation'}
                      subtitle={formatDate(quotation.issue_date)}
                      amount={quotation.total}
                      status={quotation.status}
                      onClick={() => navigate(`/quotations/${quotation.id}`)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="csrs" className="space-y-3">
                {csrs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500">No CSRs yet.</div>
                ) : (
                  csrs.map((csr) => (
                    <DocumentRow
                      key={csr.id}
                      title={csr.csr_number || 'CSR'}
                      subtitle={formatDate(csr.date || csr.created_at)}
                      amount={null}
                      status={csr.status}
                      onClick={() => navigate(`/csr/${csr.id}`)}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
