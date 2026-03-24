import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Pencil, Truck } from 'lucide-react'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  formatWaybillDate,
  getStatusMeta,
  getTypeMeta,
} from '../components/waybill/waybillUtils'
import type { Waybill, WaybillStatus } from '../components/waybill/waybillUtils'
import { Button } from '@/components/ui/button'
import { useSettings } from '../hooks/useSettings'

function Badge({ className, label }: { className: string; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {label}
    </span>
  )
}

function conditionLabel(c: string) {
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : '—'
}

const CONDITION_COLOR: Record<string, string> = {
  good:    'bg-emerald-100 text-emerald-700',
  damaged: 'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-700',
}

export default function ViewWaybill() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [waybill, setWaybill] = useState<Waybill | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMore, setShowMore] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [linkedInvoice, setLinkedInvoice] = useState<{ id: string; invoice_number: string } | null>(null)
  const [linkedProject, setLinkedProject] = useState<{ id: string; name: string } | null>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('waybills').select('*').eq('id', id).single().then(({ data }) => {
      const w = data as Waybill
      setWaybill(w)
      setLoading(false)
      if (w?.invoice_id) {
        supabase.from('invoices').select('id, invoice_number').eq('id', w.invoice_id).single()
          .then(({ data: inv }) => { if (inv) setLinkedInvoice(inv as { id: string; invoice_number: string }) })
      }
      if (w?.project_id) {
        supabase.from('projects').select('id, name').eq('id', w.project_id).single()
          .then(({ data: proj }) => { if (proj) setLinkedProject(proj as { id: string; name: string }) })
      }
    })
  }, [id])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDownloadPDF = async () => {
    if (!waybill) return
    setPdfLoading(true)
    try {
      const [{ pdf }, { default: WaybillPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/waybill/WaybillPDF'),
      ])
      const blob = await pdf(
        WaybillPDF({ waybill, settings: settings ?? {} })
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${waybill.waybill_number || 'waybill'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Failed to generate PDF')
    }
    setPdfLoading(false)
  }

  const handleStatusChange = async (next: WaybillStatus) => {
    if (!waybill) return
    setShowMore(false)
    await supabase.from('waybills').update({ status: next }).eq('id', id)
    setWaybill((prev) => prev ? { ...prev, status: next } : prev)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this waybill? This cannot be undone.')) return
    setShowMore(false)
    await supabase.from('waybills').delete().eq('id', id)
    navigate('/waybills')
  }

  if (loading) return <Layout title="Waybill"><div className="py-16 text-center text-sm text-muted-foreground">Loading…</div></Layout>
  if (!waybill) return <Layout title="Waybill"><div className="py-16 text-center text-sm text-red-600">Waybill not found.</div></Layout>

  const items = Array.isArray(waybill.items) ? waybill.items : []
  const statusMeta = getStatusMeta(waybill.status)
  const typeMeta = getTypeMeta(waybill.type)

  return (
    <Layout title={waybill.waybill_number || 'Waybill'} hidePageHeader>
      <div className="w-full pb-32">

        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-3 py-2 backdrop-blur">
          <button
            type="button"
            onClick={() => navigate('/waybills')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-foreground">{waybill.waybill_number}</div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Badge className={typeMeta.className} label={typeMeta.label} />
            <Badge className={statusMeta.className} label={statusMeta.label} />
          </div>

          <button
            type="button"
            onClick={() => navigate(`/waybills/${id}/edit`)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted/50"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted/50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMore && (
              <div className="absolute right-0 top-11 z-30 w-52 rounded-2xl border border-border bg-card shadow-xl">
                <div className="p-1.5">
                  {waybill.status === 'draft' && (
                    <button type="button" onClick={() => void handleStatusChange('dispatched')} className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-blue-600 hover:bg-blue-50">
                      Mark as Dispatched
                    </button>
                  )}
                  {waybill.status === 'dispatched' && (
                    <button type="button" onClick={() => void handleStatusChange('delivered')} className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-emerald-600 hover:bg-emerald-50">
                      Mark as Delivered
                    </button>
                  )}
                  <div className="my-1 h-px bg-border" />
                  <button type="button" onClick={handleDelete} className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                    Delete Waybill
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 px-3 pt-4">

          {(waybill.status === 'draft' || waybill.status === 'dispatched') && (
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${waybill.status === 'draft' ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <Truck className={`h-5 w-5 ${waybill.status === 'draft' ? 'text-blue-500' : 'text-emerald-500'}`} />
              <div className="flex-1 text-sm font-medium text-foreground">
                {waybill.status === 'draft' ? 'Ready to dispatch?' : 'Delivered?'}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleStatusChange(waybill.status === 'draft' ? 'dispatched' : 'delivered')}
                className={`rounded-xl ${waybill.status === 'draft' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}
              >
                {waybill.status === 'draft' ? 'Mark Dispatched' : 'Mark Delivered'}
              </Button>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 border-b border-border pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-black text-foreground">{settings?.company_name || 'Company'}</div>
                  {settings?.company_address && <div className="text-xs text-muted-foreground">{settings.company_address}</div>}
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Waybill</div>
                  <div className="text-base font-bold text-foreground">{waybill.waybill_number}</div>
                  <div className="mt-1 flex justify-end gap-1.5">
                    <Badge className={typeMeta.className} label={typeMeta.label} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: 'Date', value: formatWaybillDate(waybill.date) },
                { label: 'Time', value: waybill.time || '—' },
                { label: 'Vehicle', value: waybill.vehicle_plate || '—' },
                { label: 'Delivery Location', value: waybill.delivery_location || '—' },
                { label: 'Client', value: waybill.client_name || '—' },
                ...(waybill.po_number ? [{ label: 'PO Number', value: waybill.po_number }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
                </div>
              ))}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">Sender</div>
                <div className="mt-1 text-sm font-bold text-foreground">{waybill.sender_name || '—'}</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Receiver</div>
                <div className="mt-1 text-sm font-bold text-foreground">{waybill.receiver_name || '—'}</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-slate-900 text-xs text-white">
                      <th className="px-3 py-2 text-left font-semibold w-8">#</th>
                      <th className="px-3 py-2 text-left font-semibold">Description</th>
                      <th className="px-3 py-2 text-right font-semibold w-12">Qty</th>
                      <th className="px-3 py-2 text-left font-semibold w-16">Unit</th>
                      <th className="px-3 py-2 text-left font-semibold w-24">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.length === 0 ? (
                      <tr><td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground">No items</td></tr>
                    ) : items.map((item, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2.5 text-sm text-foreground">{item.description || '—'}</td>
                        <td className="px-3 py-2.5 text-right text-sm font-medium text-foreground">{item.quantity ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.unit || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CONDITION_COLOR[item.condition] || 'bg-slate-100 text-slate-700'}`}>
                            {conditionLabel(item.condition)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {waybill.notes && (
              <div className="mb-4 rounded-xl border border-border bg-slate-50 px-3 py-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</div>
                <div className="text-sm text-foreground">{waybill.notes}</div>
              </div>
            )}

            {(waybill.receiver_signature_url || waybill.receiver_description) && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receiver Acknowledgement</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {waybill.receiver_signature_url && (
                      <img
                        src={waybill.receiver_signature_url}
                        alt="Receiver signature"
                        className="mb-2 max-h-24 rounded-xl border border-border object-contain"
                      />
                    )}
                    {waybill.receiver_description && (
                      <div className="text-xs text-foreground">{waybill.receiver_description}</div>
                    )}
                    <div className="mt-2 border-t border-border pt-1 text-[10px] text-muted-foreground">Receiver Signature</div>
                  </div>
                  <div>
                    <div className="mt-16 border-t border-border pt-1 text-[10px] text-muted-foreground">Authorised Signature</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(linkedInvoice || linkedProject) && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-600">Linked Documents</div>
              <div className="space-y-2">
                {linkedInvoice && (
                  <button
                    type="button"
                    onClick={() => navigate(`/invoices/${linkedInvoice.id}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-left hover:bg-purple-50"
                  >
                    <div className="text-sm font-semibold text-foreground">Invoice: {linkedInvoice.invoice_number}</div>
                    <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                  </button>
                )}
                {linkedProject && (
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${linkedProject.id}`)}
                    className="flex w-full items-center justify-between rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-left hover:bg-purple-50"
                  >
                    <div className="text-sm font-semibold text-foreground">Project: {linkedProject.name}</div>
                    <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={() => void handleDownloadPDF()}
            disabled={pdfLoading}
            className="w-full rounded-2xl bg-blue-600 py-3 text-base font-bold text-white hover:bg-blue-700"
          >
            {pdfLoading ? 'Generating PDF…' : '↓ Download PDF'}
          </Button>
        </div>
      </div>
    </Layout>
  )
}
