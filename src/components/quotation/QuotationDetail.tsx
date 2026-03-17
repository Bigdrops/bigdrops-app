import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/supabase'
import { calcTotals } from '@/components/useInvoiceColumns.jsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DbQuotation, DbQuotationItem, Quotation } from '@/domain/quotation'
import { buildQuotationFormState } from '@/domain/quotation'
import { QUOTATION_STATUSES, formatQuotationStatus, quotationStatusTone } from './quotationStatus'

function renderRichText(value?: string) {
  if (!value) return <span className="text-slate-400">Not provided</span>
  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: value }} />
}

export default function QuotationDetail({ quotationId }: { quotationId: string }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [headerFields, setHeaderFields] = useState<any[]>([])
  const [bottomFields, setBottomFields] = useState<any[]>([])
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountTiming, setDiscountTiming] = useState<'before' | 'after'>('after')
  const [whtType, setWhtType] = useState<'fixed' | 'percent'>('percent')
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms and Conditions')

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
      setLoading(false)
    }
    load()
  }, [quotationId])

  const totals = useMemo(() => {
    if (!quotation) return null
    return calcTotals({ items, columns, invoice: quotation, discountType, discountTiming, whtType })
  }, [columns, discountTiming, discountType, items, quotation, whtType])

  const visibleCustomColumns = columns.filter((column: any) => column.key.startsWith('custom_') && column.visible)

  const handleStatusChange = async (status: string) => {
    if (!quotation || quotation.status === status) return
    const { error } = await supabase.from('quotations').update({ status }).eq('id', quotationId)
    if (!error) setQuotation((current) => (current ? { ...current, status: status as Quotation['status'] } : current))
  }

  if (loading) return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">Loading quotation...</div>
  if (!quotation) return <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">Quotation not found.</div>

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${quotationStatusTone(quotation.status)}`}>{formatQuotationStatus(quotation.status)}</span>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Quotation</span>
          </div>
          <h2 className="m-0 text-[28px] font-extrabold text-slate-900">{quotation.quotation_number}</h2>
          {quotation.quotation_title ? <p className="mt-2 text-sm text-slate-500">{quotation.quotation_title}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/quotations')}>Back</Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/quotations/edit/${quotationId}`)}>Edit</Button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {QUOTATION_STATUSES.map((status) => <Button key={status} type="button" variant={quotation.status === status ? 'default' : 'outline'} onClick={() => handleStatusChange(status)}>Mark {formatQuotationStatus(status)}</Button>)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card className="rounded-2xl border-zinc-200">
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
              <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Client</div><div className="mt-2 text-base font-semibold text-slate-900">{quotation.client_name || 'Unassigned'}</div></div>
              <div><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Timeline</div><div className="mt-2 space-y-1 text-sm text-slate-600"><div>Issued: {quotation.issue_date || 'Not set'}</div><div>Valid until: {quotation.valid_until || 'Not set'}</div></div></div>
            </CardContent>
          </Card>

          {headerFields.length > 0 && (
            <Card className="rounded-2xl border-zinc-200">
              <CardHeader><CardTitle className="text-base">Document Fields</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">{headerFields.map((field) => <div key={field.id}><div className="text-xs font-bold uppercase tracking-wide text-slate-400">{field.label}</div><div className="mt-1 text-sm text-slate-800">{field.value}</div></div>)}</CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border-zinc-200">
            <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-2 py-3">#</th>
                    <th className="px-2 py-3">Description</th>
                    {columns.find((column: any) => column.key === 'make')?.visible && <th className="px-2 py-3">Make</th>}
                    <th className="px-2 py-3">Qty</th>
                    {columns.find((column: any) => column.key === 'unit')?.visible && <th className="px-2 py-3">Unit</th>}
                    <th className="px-2 py-3">Rate</th>
                    {columns.find((column: any) => column.key === 'install_rate')?.visible && <th className="px-2 py-3">Install</th>}
                    {columns.find((column: any) => column.key === 'vat_rate')?.visible && <th className="px-2 py-3">VAT %</th>}
                    {columns.find((column: any) => column.key === 'discount_rate')?.visible && <th className="px-2 py-3">Disc %</th>}
                    {visibleCustomColumns.map((column: any) => <th key={column.key} className="px-2 py-3">{column.label}</th>)}
                    <th className="px-2 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item._uiKey || item.id || index} className="border-b border-zinc-100 align-top">
                      <td className="px-2 py-3 text-sm font-semibold text-zinc-500">{index + 1}</td>
                      <td className="px-2 py-3"><div className="font-semibold text-slate-900">{item.description}</div>{item.sub_description ? <div className="mt-1 text-sm text-slate-500">{item.sub_description}</div> : null}</td>
                      {columns.find((column: any) => column.key === 'make')?.visible && <td className="px-2 py-3 text-sm text-slate-600">{item.make || '—'}</td>}
                      <td className="px-2 py-3 text-sm text-slate-600">{item.quantity || 0}</td>
                      {columns.find((column: any) => column.key === 'unit')?.visible && <td className="px-2 py-3 text-sm text-slate-600">{item.unit || '—'}</td>}
                      <td className="px-2 py-3 text-sm text-slate-600">₦{Number(item.unit_price || 0).toLocaleString()}</td>
                      {columns.find((column: any) => column.key === 'install_rate')?.visible && <td className="px-2 py-3 text-sm text-slate-600">{item.install_rate ?? '—'}</td>}
                      {columns.find((column: any) => column.key === 'vat_rate')?.visible && <td className="px-2 py-3 text-sm text-slate-600">{item.vat_rate ?? '—'}</td>}
                      {columns.find((column: any) => column.key === 'discount_rate')?.visible && <td className="px-2 py-3 text-sm text-slate-600">{item.discount_rate ?? '—'}</td>}
                      {visibleCustomColumns.map((column: any) => <td key={column.key} className="px-2 py-3 text-sm text-slate-600">{(item.custom_data || {})[column.key] || '—'}</td>)}
                      <td className="px-2 py-3 text-sm font-bold text-slate-900">₦{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200"><CardHeader><CardTitle className="text-base">{notesTitle}</CardTitle></CardHeader><CardContent>{renderRichText(quotation.notes)}</CardContent></Card>
          <Card className="rounded-2xl border-zinc-200"><CardHeader><CardTitle className="text-base">{termsTitle}</CardTitle></CardHeader><CardContent>{renderRichText(quotation.terms)}</CardContent></Card>
          {bottomFields.length > 0 && <Card className="rounded-2xl border-zinc-200"><CardHeader><CardTitle className="text-base">Additional Notes</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-slate-600">{bottomFields.map((field) => <div key={field.id}>{field.text}</div>)}</CardContent></Card>}
        </div>

        <div className="space-y-5">
          <Card className="rounded-2xl border-zinc-200">
            <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {totals && [['Subtotal', totals.rawSubtotal], ['Install Rate Total', totals.installRateTotal], ['VAT', totals.vatAmount], ['Discount', totals.discountAmount], ['WHT', totals.whtAmount], ['Total', totals.totalPayable]].map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm"><span className="font-medium text-zinc-600">{label}</span><span className="font-bold text-zinc-900">₦{Number(value || 0).toLocaleString()}</span></div>)}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
