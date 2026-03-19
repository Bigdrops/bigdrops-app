import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase'
import { calcTotals } from '@/components/useInvoiceColumns.jsx'
import { computeDocument } from '@/lib/Calculations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toDbItem, type InvoiceItem } from '@/domain/invoice'
import {
  appendDerivedTrail,
  buildTrailLink,
  getNextInvoiceNumber,
  parseDocumentCustomFields,
  withSourceTrail,
} from '@/domain/documentConversion'
import type { DbQuotation, DbQuotationItem, Quotation } from '@/domain/quotation'
import { buildQuotationFormState } from '@/domain/quotation'
import { buildQuotationCsv, downloadQuotationCsv } from './exportQuotationCsv'
import { QUOTATION_STATUSES, formatQuotationStatus, quotationStatusTone } from './quotationStatus'

function renderRichText(value?: string) {
  if (!value) return <span className="text-slate-400">Not provided</span>
  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: value }} />
}

function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  useEffect(() => {
    const handleResize = () => setIsNarrow(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isNarrow
}

function formatMoney(value: number | string | null | undefined) {
  const parsed =
    typeof value === 'string'
      ? Number(value.replace(/[^0-9.-]/g, '') || 0)
      : Number(value || 0)
  const safe = Number.isFinite(parsed) ? parsed : 0
  return `₦${safe.toLocaleString('en-NG', {
    minimumFractionDigits: Math.abs(safe % 1) > 0.000001 ? 2 : 0,
    maximumFractionDigits: Math.abs(safe % 1) > 0.000001 ? 2 : 0,
  })}`
}

export default function QuotationDetail({ quotationId }: { quotationId: string }) {
  const navigate = useNavigate()
  const isNarrow = useIsNarrow()
  const [loading, setLoading] = useState(true)
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [headerFields, setHeaderFields] = useState<any[]>([])
  const [bottomFields, setBottomFields] = useState<any[]>([])
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountTiming, setDiscountTiming] = useState<'before' | 'after'>('after')
  const [whtType, setWhtType] = useState<'fixed' | 'percent'>('percent')
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms and Conditions')
  const [client, setClient] = useState<Record<string, unknown> | null>(null)
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [converting, setConverting] = useState(false)
  const hasText = (value: unknown) => String(value || '').trim().length > 0

  useEffect(() => {
    const load = async () => {
      const [{ data: quotationRow, error }, { data: itemRows }] = await Promise.all([
        supabase.from('quotations').select('*').eq('id', quotationId).single(),
        supabase.from('quotation_items').select('*').eq('quotation_id', quotationId).order('sort_order'),
      ])
      if (error || !quotationRow) {
        setQuotation(null)
        setLoading(false)
        return
      }
      const state = buildQuotationFormState(quotationRow as DbQuotation, (itemRows || []) as DbQuotationItem[])
      setQuotation(state.quotation)
      setItems(state.items)
      setColumns(state.columns)
      setHeaderFields(state.headerFields)
      setBottomFields(state.bottomFields)
      setDiscountType(state.discountType)
      setDiscountTiming(state.discountTiming)
      setWhtType(state.whtType)
      setNotesTitle(state.notesTitle)
      setTermsTitle(state.termsTitle)

      const [clientResponse, settingsResponse] = await Promise.all([
        state.quotation.client_id
          ? supabase.from('clients').select('*').eq('id', state.quotation.client_id).single()
          : Promise.resolve({ data: null }),
        supabase.from('settings').select('*').eq('id', 1).single(),
      ])

      setClient((clientResponse.data as Record<string, unknown> | null) || null)
      setSettings((settingsResponse.data as Record<string, unknown> | null) || null)
      setLoading(false)
    }

    load()
  }, [quotationId])

  const totals = useMemo(() => {
    if (!quotation) return null
    return calcTotals({ items, columns, invoice: quotation, discountType, discountTiming, whtType })
  }, [columns, discountTiming, discountType, items, quotation, whtType])

  const visibleCustomColumns = columns.filter((column: any) => column.key.startsWith('custom_') && column.visible)
  const topHeaderFields = headerFields.filter((field: any) => field.label && field.value)
  const poNumber = String(quotation?.po_number || '').trim()
  const conversionTrail = (quotation?.custom_fields?.conversionTrail || {}) as {
    source?: { id?: string | null; type?: 'invoice' | 'quotation'; number?: string }
    derived?: Array<{ id?: string | null; type?: 'invoice' | 'quotation'; number?: string }>
  }
  const derivedInvoices = (conversionTrail.derived || []).filter((entry) => entry.type === 'invoice' && entry.id)

  const companyIdentity = useMemo(() => {
    const companyName = String(settings?.company_name || '')
    const companyTagline = String(settings?.company_tagline || '')
    const companyAddress = String(settings?.company_address || '')
    const companyCity = String(settings?.company_city || '')
    const companyPhone = String(settings?.company_phone || '')
    const companyEmail = String(settings?.company_email || '')

    return {
      companyName,
      companyTagline,
      lines: [companyAddress, companyCity, companyPhone, companyEmail].filter(Boolean),
    }
  }, [settings])

  const handleStatusChange = async (status: string) => {
    if (!quotation || quotation.status === status) return
    const { error } = await supabase.from('quotations').update({ status }).eq('id', quotationId)
    if (!error) {
      setQuotation((current) => (current ? { ...current, status: status as Quotation['status'] } : current))
    }
  }

  const handleDownloadPdf = async () => {
    if (!quotation || pdfGenerating) return
    setPdfGenerating(true)
    try {
      const computedResult = computeDocument({
        items,
        document: quotation,
        cf: quotation.custom_fields || {},
      })
      const [{ pdf }, { default: QuotationPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./QuotationPDF'),
      ])
      const blob = await pdf(
        <QuotationPDF document={quotation} items={items} client={client} settings={settings} computedResult={computedResult} />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${quotation.quotation_number || 'quotation'}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      setTimeout(() => {
        document.body.removeChild(anchor)
        URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      alert(`PDF generation failed: ${message}`)
    } finally {
      setPdfGenerating(false)
    }
  }

  const handleDownloadCsv = () => {
    if (!quotation) return
    const csv = buildQuotationCsv({ quotation, items, totals })
    downloadQuotationCsv(`${quotation.quotation_number || 'quotation'}.csv`, csv)
  }

  const handleCopy = async (value: string, label: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const input = document.createElement('textarea')
      input.value = value
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    alert(`${label} copied.`)
  }

  const handleArchive = async () => {
    if (!quotation) return
    if (!window.confirm('This quotation will be hidden from your list until you restore it from Settings > Archives.')) return
    const { error } = await supabase
      .from('quotations')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', quotationId)
    if (error) {
      alert(`Archive failed: ${error.message}`)
      return
    }
    navigate('/quotations')
  }

  const handleDelete = async () => {
    if (!quotation) return
    if (!window.confirm('Deleting this quotation is permanent and cannot be undone.')) return
    const { error: itemError } = await supabase.from('quotation_items').delete().eq('quotation_id', quotationId)
    if (itemError) {
      alert(`Delete failed: ${itemError.message}`)
      return
    }
    const { error } = await supabase.from('quotations').delete().eq('id', quotationId)
    if (error) {
      alert(`Delete failed: ${error.message}`)
      return
    }
    navigate('/quotations')
  }

  const handleConvertToInvoice = async () => {
    if (!quotation || converting) return
    setConverting(true)
    try {
      const [{ data: invoiceRows }, { data: latestQuotation }] = await Promise.all([
        supabase.from('invoices').select('invoice_number'),
        supabase.from('quotations').select('custom_fields').eq('id', quotationId).single(),
      ])

      const nextInvoiceNumber = getNextInvoiceNumber((invoiceRows || []) as Array<{ invoice_number?: string | null }>)
      const quotationCustomFields = parseDocumentCustomFields(latestQuotation?.custom_fields || quotation.custom_fields)
      const sourceLink = buildTrailLink({
        id: quotation.id,
        type: 'quotation',
        number: quotation.quotation_number,
        project_id: quotation.project_id ?? null,
        po_number: poNumber || null,
      })

      const invoiceCustomFields = withSourceTrail(quotationCustomFields, sourceLink)
      const invoicePayload = {
        invoice_number: nextInvoiceNumber,
        po_number: poNumber || null,
        invoice_title: quotation.quotation_title || null,
        client_id: quotation.client_id || null,
        client_name: quotation.client_name || '',
        project_id: quotation.project_id || null,
        issue_date: quotation.issue_date || new Date().toISOString().split('T')[0],
        due_date: quotation.valid_until || null,
        status: 'draft',
        document_type: 'INVOICE',
        payment_terms: null,
        notes: quotation.notes || '',
        terms: quotation.terms || '',
        workmanship: Number(quotation.workmanship || 0),
        transportation: Number(quotation.transportation || 0),
        shipping: Number(quotation.shipping || 0),
        discount: Number(quotation.discount || 0),
        vat: Number(quotation.vat || 0),
        wht: Number(quotation.wht || 0),
        subtotal: Number(quotation.subtotal || 0),
        install_rate_total: Number(quotation.install_rate_total || 0),
        total: Number(quotation.total || 0),
        amount_in_words: quotation.amount_in_words || '',
        custom_fields: JSON.stringify(invoiceCustomFields),
      }

      const { data: createdInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoicePayload])
        .select()
        .single()

      if (invoiceError || !createdInvoice) throw new Error(invoiceError?.message || 'Failed to create invoice')

      const itemRows = items
        .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
        .map((item, index) => toDbItem(item, createdInvoice.id, index))

      if (itemRows.length > 0) {
        const { error: itemError } = await supabase.from('invoice_items').insert(itemRows)
        if (itemError) {
          await supabase.from('invoices').delete().eq('id', createdInvoice.id)
          throw new Error(itemError.message)
        }
      }

      const derivedLink = buildTrailLink({
        id: createdInvoice.id,
        type: 'invoice',
        number: createdInvoice.invoice_number,
        project_id: createdInvoice.project_id ?? quotation.project_id ?? null,
        po_number: createdInvoice.po_number ?? poNumber ?? null,
      })
      const updatedQuotationFields = appendDerivedTrail(quotationCustomFields, derivedLink)
      const { error: trailError } = await supabase
        .from('quotations')
        .update({ custom_fields: JSON.stringify(updatedQuotationFields) })
        .eq('id', quotationId)

      if (trailError) {
        await supabase.from('invoice_items').delete().eq('invoice_id', createdInvoice.id)
        await supabase.from('invoices').delete().eq('id', createdInvoice.id)
        throw new Error(trailError.message)
      }

      navigate(`/invoices/${createdInvoice.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Conversion failed'
      alert(`Convert to invoice failed: ${message}`)
    } finally {
      setConverting(false)
    }
  }

  if (loading) return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">Loading quotation...</div>
  if (!quotation) return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">Quotation not found.</div>

  return (
    <div className="mx-auto max-w-6xl px-3 pb-24 pt-4 sm:px-4 sm:pt-6">
      <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className={`h-auto px-3 py-1 text-[11px] font-bold uppercase ${quotationStatusTone(quotation.status)}`}>
                {formatQuotationStatus(quotation.status)}
              </Badge>
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Quotation</span>
            </div>
            <h2 className="m-0 break-words text-[24px] font-extrabold tracking-tight text-slate-900 sm:text-[30px]">
              {quotation.quotation_number}
            </h2>
            {quotation.quotation_title ? (
              <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-[15px]">{quotation.quotation_title}</p>
            ) : null}
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-[repeat(4,minmax(0,1fr))]">
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/quotations')}>
              Back to Quotations
            </Button>
            <Button type="button" variant="default" className="w-full" onClick={handleDownloadPdf} disabled={pdfGenerating}>
              {pdfGenerating ? 'Generating PDF...' : 'Download PDF'}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate(`/quotations/edit/${quotationId}`)}>
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="w-full">
                  More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Quotation Actions</DropdownMenuLabel>
                <DropdownMenuItem onSelect={handleDownloadCsv}>Export CSV</DropdownMenuItem>
                <DropdownMenuItem onSelect={handleConvertToInvoice} disabled={converting}>
                  {converting ? 'Converting...' : 'Convert to Invoice'}
                </DropdownMenuItem>
                {quotation.status === 'draft' ? (
                  <DropdownMenuItem onSelect={() => handleStatusChange('sent')}>
                    Mark Sent
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleCopy(quotation.quotation_number || '', 'Quotation number')}>
                  Copy quotation number
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleCopy(quotation.client_name || '', 'Client name')}>
                  Copy client name
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleArchive}>Archive Quotation</DropdownMenuItem>
                <DropdownMenuItem onSelect={handleDelete} className="text-red-700 focus:text-red-700">
                  Delete Quotation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Client</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{quotation.client_name || 'Unassigned'}</div>
              {hasText(client?.contact_person) ? <div className="mt-1 text-sm text-slate-500">{String(client?.contact_person)}</div> : null}
              {hasText(client?.email) ? <div className="text-sm text-slate-500">{String(client?.email)}</div> : null}
              {hasText(client?.phone) ? <div className="text-sm text-slate-500">{String(client?.phone)}</div> : null}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Quotation Summary</div>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <div>Status: {formatQuotationStatus(quotation.status)}</div>
                <div>Issued: {quotation.issue_date || 'Not set'}</div>
                <div>Valid until: {quotation.valid_until || 'Not set'}</div>
                {poNumber ? <div>P.O. Number: {poNumber}</div> : null}
              </div>
            </div>
            {topHeaderFields.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Reference Fields</div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {topHeaderFields.map((field: any) => (
                    <div key={field.id || field.label}>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{field.label}</div>
                      <div className="mt-1 break-words text-sm text-slate-800">{field.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {(conversionTrail.source?.number || derivedInvoices.length > 0) ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Conversion Trail</div>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  {conversionTrail.source?.number ? (
                    <div>
                      Source: {conversionTrail.source.type === 'invoice' ? 'Invoice' : 'Quotation'} {conversionTrail.source.number}
                    </div>
                  ) : null}
                  {derivedInvoices.length > 0 ? (
                    <div className="space-y-1">
                      <div>Created invoices:</div>
                      {derivedInvoices.map((entry) => (
                        <button
                          key={entry.id || entry.number}
                          type="button"
                          onClick={() => navigate(`/invoices/${entry.id}`)}
                          className="block text-left text-sm font-medium text-blue-700 hover:underline"
                        >
                          {entry.number || 'Open invoice'}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 text-white">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Document Identity</div>
            <div className="mt-2 text-lg font-bold">{companyIdentity.companyName || 'Quotation'}</div>
            {companyIdentity.companyTagline ? <div className="mt-1 text-sm text-slate-300">{companyIdentity.companyTagline}</div> : null}
            {companyIdentity.lines.length > 0 ? (
              <div className="mt-3 space-y-1 text-xs text-slate-300">
                {companyIdentity.lines.map((line) => <div key={line}>{line}</div>)}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {QUOTATION_STATUSES.map((status) => (
          <Button
            key={status}
            type="button"
            size={isNarrow ? 'sm' : 'default'}
            variant={quotation.status === status ? 'default' : 'outline'}
            onClick={() => handleStatusChange(status)}
          >
            Mark {formatQuotationStatus(status)}
          </Button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card className="rounded-2xl border-zinc-200">
            <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
            <CardContent className="px-3 pb-4 sm:px-6">
              {isNarrow ? (
                <div className="space-y-3">
                  {(() => {
                    let itemNumber = 0
                    return items.map((item, index) => {
                      if (item.row_type === 'group_header') {
                        return (
                          <div key={item._uiKey || item.id || index} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                            {item.group_name || `Group ${index + 1}`}
                          </div>
                        )
                      }
                      itemNumber += 1
                      return (
                        <div key={item._uiKey || item.id || index} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Item {itemNumber}</div>
                              <div className="mt-1 break-words font-semibold text-slate-900">{item.description || 'Untitled item'}</div>
                              {item.sub_description ? <div className="mt-1 break-words text-sm text-slate-500">{item.sub_description}</div> : null}
                            </div>
                            <div className="shrink-0 text-right text-sm font-bold text-slate-900">
                              {formatMoney(Number(item.quantity || 0) * Number(item.unit_price || 0))}
                            </div>
                          </div>
                          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                            <div>Qty: {item.quantity || 0}</div>
                            <div>Rate: {formatMoney(item.unit_price || 0)}</div>
                            {columns.find((column: any) => column.key === 'unit')?.visible ? <div>Unit: {item.unit || '-'}</div> : null}
                            {columns.find((column: any) => column.key === 'make')?.visible ? <div>Make: {item.make || '-'}</div> : null}
                            {columns.find((column: any) => column.key === 'install_rate')?.visible ? <div>Install: {item.install_rate ?? '-'}</div> : null}
                            {columns.find((column: any) => column.key === 'vat_rate')?.visible ? <div>VAT %: {item.vat_rate ?? '-'}</div> : null}
                            {columns.find((column: any) => column.key === 'discount_rate')?.visible ? <div>Disc %: {item.discount_rate ?? '-'}</div> : null}
                            {visibleCustomColumns.map((column: any) => (
                              <div key={column.key}>
                                {column.label}: {(item.custom_data || {})[column.key] || '-'}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 hover:bg-transparent">
                      <TableHead>#</TableHead>
                      <TableHead>Description</TableHead>
                      {columns.find((column: any) => column.key === 'make')?.visible && <TableHead>Make</TableHead>}
                      <TableHead>Qty</TableHead>
                      {columns.find((column: any) => column.key === 'unit')?.visible && <TableHead>Unit</TableHead>}
                      <TableHead>Rate</TableHead>
                      {columns.find((column: any) => column.key === 'install_rate')?.visible && <TableHead>Install</TableHead>}
                      {columns.find((column: any) => column.key === 'vat_rate')?.visible && <TableHead>VAT %</TableHead>}
                      {columns.find((column: any) => column.key === 'discount_rate')?.visible && <TableHead>Disc %</TableHead>}
                      {visibleCustomColumns.map((column: any) => <TableHead key={column.key}>{column.label}</TableHead>)}
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                    {(() => {
                      let itemNumber = 0
                      return items.map((item, index) => {
                        if (item.row_type === 'group_header') {
                          return (
                            <TableRow key={item._uiKey || item.id || index} className="bg-slate-900 hover:bg-slate-900">
                              <TableCell className="font-semibold text-slate-400">-</TableCell>
                              <TableCell colSpan={6 + (columns.find((column: any) => column.key === 'make')?.visible ? 1 : 0) + (columns.find((column: any) => column.key === 'unit')?.visible ? 1 : 0) + (columns.find((column: any) => column.key === 'install_rate')?.visible ? 1 : 0) + (columns.find((column: any) => column.key === 'vat_rate')?.visible ? 1 : 0) + (columns.find((column: any) => column.key === 'discount_rate')?.visible ? 1 : 0) + visibleCustomColumns.length} className="font-bold text-white">
                                {item.group_name || `Group ${index + 1}`}
                              </TableCell>
                            </TableRow>
                          )
                        }
                        itemNumber += 1
                        return (
                          <TableRow key={item._uiKey || item.id || index} className="align-top">
                            <TableCell className="font-semibold text-zinc-500">{itemNumber}</TableCell>
                            <TableCell className="whitespace-normal">
                              <div className="font-semibold text-slate-900">{item.description}</div>
                              {item.sub_description ? <div className="mt-1 text-sm text-slate-500">{item.sub_description}</div> : null}
                            </TableCell>
                            {columns.find((column: any) => column.key === 'make')?.visible && <TableCell>{item.make || '-'}</TableCell>}
                            <TableCell>{item.quantity || 0}</TableCell>
                            {columns.find((column: any) => column.key === 'unit')?.visible && <TableCell>{item.unit || '-'}</TableCell>}
                            <TableCell>{formatMoney(item.unit_price || 0)}</TableCell>
                            {columns.find((column: any) => column.key === 'install_rate')?.visible && <TableCell>{item.install_rate ?? '-'}</TableCell>}
                            {columns.find((column: any) => column.key === 'vat_rate')?.visible && <TableCell>{item.vat_rate ?? '-'}</TableCell>}
                            {columns.find((column: any) => column.key === 'discount_rate')?.visible && <TableCell>{item.discount_rate ?? '-'}</TableCell>}
                            {visibleCustomColumns.map((column: any) => <TableCell key={column.key}>{(item.custom_data || {})[column.key] || '-'}</TableCell>)}
                            <TableCell className="font-bold text-slate-900">
                              {formatMoney(Number(item.quantity || 0) * Number(item.unit_price || 0))}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    })()}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200">
            <CardHeader><CardTitle className="text-base">{notesTitle}</CardTitle></CardHeader>
            <CardContent>{renderRichText(quotation.notes)}</CardContent>
          </Card>
          <Card className="rounded-2xl border-zinc-200">
            <CardHeader><CardTitle className="text-base">{termsTitle}</CardTitle></CardHeader>
            <CardContent>{renderRichText(quotation.terms)}</CardContent>
          </Card>
          {bottomFields.length > 0 && (
            <Card className="rounded-2xl border-zinc-200">
              <CardHeader><CardTitle className="text-base">Additional Notes</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                {bottomFields.map((field) => <div key={field.id}>{field.text}</div>)}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card className="rounded-2xl border-zinc-200">
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {totals && [['Subtotal', totals.rawSubtotal], ['Install Rate Total', totals.installRateTotal], ['VAT', totals.vatAmount], ['Discount', totals.discountAmount], ['WHT', totals.whtAmount], ['Total Payable', totals.totalPayable]].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                  <span className="font-medium text-zinc-600">{label}</span>
                  <span className="font-bold text-zinc-900">{formatMoney(value as number)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
