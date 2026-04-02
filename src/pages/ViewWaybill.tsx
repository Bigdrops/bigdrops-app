import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, FolderOpen, FolderPlus, GitBranchPlus, MoreHorizontal, Pencil, Truck, Workflow } from 'lucide-react'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  formatWaybillDate,
  formatWaybillTime,
  getStatusMeta,
  getTypeMeta,
  getWaybillSignature,
  getWaybillTypeContent,
  mapDbWaybill,
} from '../components/waybill/waybillUtils'
import type { Waybill, WaybillStatus } from '../components/waybill/waybillUtils'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { useSettings } from '../hooks/useSettings'
import { getDocumentActionState, getProjectActionState } from '@/domain/document/documentActionState'

function Badge({ className, label }: { className: string; label: string }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${className}`}>{label}</span>
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('waybills').select('*').eq('id', id).single().then(({ data }) => {
      const mapped = data ? mapDbWaybill(data as Record<string, unknown>) : null
      setWaybill(mapped)
      setLoading(false)

      if (mapped?.invoice_id) {
        supabase.from('invoices').select('id, invoice_number').eq('id', mapped.invoice_id).single().then(({ data: invoice }) => {
          if (invoice) setLinkedInvoice(invoice as { id: string; invoice_number: string })
        })
      }

      if (mapped?.project_id) {
        supabase.from('projects').select('id, name').eq('id', mapped.project_id).single().then(({ data: project }) => {
          if (project) setLinkedProject(project as { id: string; name: string })
        })
      }
    })
  }, [id])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) setShowMore(false)
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
      const blob = await pdf(WaybillPDF({ waybill, settings: settings ?? {} })).toBlob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${waybill.waybill_number || 'waybill'}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      toast({ title: 'PDF failed', description: 'Failed to generate PDF.', variant: 'destructive' })
    }
    setPdfLoading(false)
  }

  const handleStatusChange = async (next: WaybillStatus) => {
    if (!waybill) return
    setShowMore(false)
    await supabase.from('waybills').update({ status: next }).eq('id', id)
    setWaybill((current) => (current ? { ...current, status: next } : current))
  }

  const handleDelete = async () => {
    setShowMore(false)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    setShowDeleteConfirm(false)
    await supabase.from('waybills').delete().eq('id', id)
    navigate('/waybills')
  }

  if (loading) return <Layout title="Waybill"><div className="py-16 text-center text-sm text-muted-foreground">Loading…</div></Layout>
  if (!waybill) return <Layout title="Waybill"><div className="py-16 text-center text-sm text-red-600">Waybill not found.</div></Layout>

  const items = Array.isArray(waybill.items) ? waybill.items : []
  const statusMeta = getStatusMeta(waybill.status)
  const typeMeta = getTypeMeta(waybill.type)
  const typeContent = getWaybillTypeContent(waybill.type)
  const customFields = typeof waybill.custom_fields === 'string' ? mapDbWaybill(waybill).custom_fields : waybill.custom_fields || {}
  const customColumns = customFields?.customColumns || []
  const senderSignature = getWaybillSignature(waybill, 'sender')
  const receiverSignature = getWaybillSignature(waybill, 'receiver')
  const projectReferenceName = linkedProject?.name || customFields?.references?.linkedProjectName || ''
  const invoiceReference = linkedInvoice?.invoice_number || customFields?.references?.linkedInvoiceNumber || ''
  const projectActionState = getProjectActionState({ projectId: waybill?.project_id, project: linkedProject })
  const documentActionState = getDocumentActionState({
    sourceDocument: linkedInvoice,
    relatedDocuments: [],
  })
  const hasLinkedDocuments = documentActionState.hasLinkedDocuments
  const linkedDocumentsSections = [
    {
      key: 'source',
      title: 'Source',
      description: 'Documents this waybill is linked to.',
      items: linkedInvoice
        ? [{
            key: `invoice-${linkedInvoice.id}`,
            label: `Invoice ${linkedInvoice.invoice_number}`,
            subtitle: 'Open linked invoice',
            onClick: () => navigate(`/invoices/${linkedInvoice.id}`),
          }]
        : [],
    },
    {
      key: 'project',
      title: 'Project',
      description: 'Project connected to this waybill.',
      items: linkedProject
        ? [{
            key: `project-${linkedProject.id}`,
            label: linkedProject.name || linkedProject.id,
            subtitle: 'Open linked project',
            onClick: () => navigate(`/projects/${linkedProject.id}`),
          }]
        : [],
    },
  ]

  return (
    <Layout title={waybill.waybill_number || 'Waybill'} hidePageHeader>
      <div className="w-full pb-32">
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-3 py-2 backdrop-blur">
          <button type="button" onClick={() => navigate('/waybills')} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted/50">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-foreground">{waybill.waybill_number}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className={typeMeta.className} label={typeMeta.label} />
            <Badge className={statusMeta.className} label={statusMeta.label} />
          </div>
          <button type="button" onClick={() => navigate(`/waybills/${id}/edit`)} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted/50">
            <Pencil className="h-4 w-4" />
          </button>
          <div className="relative" ref={moreRef}>
            <button type="button" onClick={() => setShowMore((open) => !open)} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted/50">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMore ? (
              <div className="absolute right-0 top-11 z-30 w-52 rounded-2xl border border-border bg-card shadow-xl">
                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMore(false)
                      if (waybill.project_id) {
                        navigate(`/projects/${waybill.project_id}`)
                        return
                      }
                      setShowProjectLinkDialog(true)
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {projectActionState.hasProject ? <FolderOpen className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />}
                    <span>{projectActionState.label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMore(false)
                      setShowLinkedDocuments(true)
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {hasLinkedDocuments ? <Workflow className="h-4 w-4" /> : <GitBranchPlus className="h-4 w-4" />}
                    <span>{documentActionState.label}</span>
                  </button>
                  <div className="my-1 h-px bg-border" />
                  {waybill.status === 'draft' ? <button type="button" onClick={() => void handleStatusChange('dispatched')} className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-blue-600 hover:bg-blue-50">Mark as Dispatched</button> : null}
                  {waybill.status === 'dispatched' ? <button type="button" onClick={() => void handleStatusChange('delivered')} className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-emerald-600 hover:bg-emerald-50">Mark as Delivered</button> : null}
                  <div className="my-1 h-px bg-border" />
                  <button type="button" onClick={handleDelete} className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">Delete Waybill</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 px-3 pt-4">
          {(waybill.status === 'draft' || waybill.status === 'dispatched') ? (
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${waybill.status === 'draft' ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <Truck className={`h-5 w-5 ${waybill.status === 'draft' ? 'text-blue-500' : 'text-emerald-500'}`} />
              <div className="flex-1 text-sm font-medium text-foreground">{waybill.status === 'draft' ? 'Ready to dispatch?' : 'Acknowledgement completed?'}</div>
              <Button type="button" size="sm" onClick={() => void handleStatusChange(waybill.status === 'draft' ? 'dispatched' : 'delivered')} className={`rounded-xl ${waybill.status === 'draft' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}>
                {waybill.status === 'draft' ? 'Mark Dispatched' : 'Mark Delivered'}
              </Button>
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="text-lg font-black text-foreground">{settings?.company_name || 'Company'}</div>
                {settings?.company_address ? <div className="text-xs text-muted-foreground">{settings.company_address}</div> : null}
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{typeContent.pdfTitle}</div>
                <div className="text-base font-bold text-foreground">{waybill.waybill_number}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Date', value: formatWaybillDate(waybill.date) },
                { label: 'Time', value: formatWaybillTime(waybill.time) },
                { label: 'Vehicle Plate', value: waybill.vehicle_plate || '—' },
                { label: typeContent.locationLabel, value: waybill.delivery_location || '—' },
                { label: typeContent.clientLabel, value: waybill.client_name || '—' },
                { label: 'P.O. Number', value: waybill.po_number || '—' },
                { label: 'Invoice Reference', value: invoiceReference || '—' },
                { label: 'Project Reference', value: projectReferenceName || '—' },
              ].map((entry) => (
                <div key={entry.label} className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{entry.label}</div>
                  <div className="mt-0.5 text-sm font-medium text-foreground">{entry.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">{typeContent.senderPdfLabel}</div>
                <div className="mt-1 text-sm font-bold text-foreground">{waybill.sender_name || '—'}</div>
                {customFields?.partyNotes?.sender ? <div className="mt-2 text-xs text-blue-900">{customFields.partyNotes.sender}</div> : null}
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">{typeContent.receiverPdfLabel}</div>
                <div className="mt-1 text-sm font-bold text-foreground">{waybill.receiver_name || '—'}</div>
                {customFields?.partyNotes?.receiver ? <div className="mt-2 text-xs text-emerald-900">{customFields.partyNotes.receiver}</div> : null}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-900 text-xs text-white">
                    <th className="px-3 py-2 text-left font-semibold">#</th>
                    <th className="px-3 py-2 text-left font-semibold">Description</th>
                    <th className="px-3 py-2 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2 text-left font-semibold">Unit</th>
                    <th className="px-3 py-2 text-left font-semibold">Condition</th>
                    {customColumns.map((column) => (
                      <th key={column.key} className="px-3 py-2 text-left font-semibold">{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? <tr><td colSpan={5 + customColumns.length} className="px-3 py-4 text-center text-xs text-muted-foreground">No items</td></tr> : null}
                  {items.map((item, index) => (
                    <tr key={`${item.description}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{index + 1}</td>
                      <td className="px-3 py-2.5 text-sm text-foreground">{item.description || '—'}</td>
                      <td className="px-3 py-2.5 text-right text-sm font-medium text-foreground">{item.quantity ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.unit || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.condition || '—'}</td>
                      {customColumns.map((column) => (
                        <td key={column.key} className="px-3 py-2.5 text-xs text-muted-foreground">{String(item.custom_data?.[column.key] || '—')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {waybill.notes ? <div className="mt-4 rounded-xl border border-border bg-slate-50 px-3 py-3 text-sm text-foreground">{waybill.notes}</div> : null}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[{ title: typeContent.senderSignatureLabel, signature: senderSignature, fallbackName: waybill.sender_name || '—' }, { title: typeContent.receiverSignatureLabel, signature: receiverSignature, fallbackName: waybill.receiver_name || 'Acknowledgement pending' }].map((entry) => (
                <div key={entry.title} className="rounded-xl border border-border bg-slate-50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{entry.title}</div>
                  {entry.signature.image_url || entry.signature.drawn_data_url ? <img src={entry.signature.image_url || entry.signature.drawn_data_url} alt={entry.title} className="mt-3 max-h-24 rounded-xl border border-border bg-white object-contain" /> : null}
                  <div className="mt-3 text-sm font-medium text-foreground">
                    {entry.signature.present === false ? 'Pending acknowledgement' : entry.fallbackName}
                  </div>
                  {entry.signature.description ? <div className="mt-1 text-xs text-muted-foreground">{entry.signature.description}</div> : null}
                  {entry.signature.confidence ? <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Confidence: {entry.signature.confidence}</div> : null}
                </div>
              ))}
            </div>
          </div>

          {linkedInvoice || linkedProject ? (
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-600">Linked Documents</div>
              <div className="space-y-2">
                {linkedInvoice ? <button type="button" onClick={() => navigate(`/invoices/${linkedInvoice.id}`)} className="flex w-full items-center justify-between rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-left hover:bg-purple-50"><div className="text-sm font-semibold text-foreground">Invoice: {linkedInvoice.invoice_number}</div><ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" /></button> : null}
                {linkedProject ? <button type="button" onClick={() => navigate(`/projects/${linkedProject.id}`)} className="flex w-full items-center justify-between rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-left hover:bg-purple-50"><div className="text-sm font-semibold text-foreground">Project: {linkedProject.name}</div><ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" /></button> : null}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-semibold">Project link still pending</div>
              <div className="mt-1">Copy the waybill number from this record and attach it from the Project page when the project team is ready.</div>
              <Button
                type="button"
                variant="outline"
                className="mt-3 rounded-xl"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(waybill.waybill_number)
                    toast({ title: 'Copied', description: 'Waybill number copied.' })
                  } catch {
                    toast({ title: 'Copy failed', description: 'Could not copy waybill number.', variant: 'destructive' })
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Waybill Number
              </Button>
            </div>
          )}

          <Button type="button" onClick={() => void handleDownloadPDF()} disabled={pdfLoading} className="w-full rounded-2xl bg-blue-600 py-3 text-base font-bold text-white hover:bg-blue-700">
            {pdfLoading ? 'Generating PDF…' : 'Download PDF'}
          </Button>
        </div>
      </div>
      <ConfirmActionDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete this waybill?"
        description="This cannot be undone."
        confirmLabel="Delete Waybill"
        onConfirm={() => void confirmDelete()}
      />
      <LinkedDocumentsSheet
        open={showLinkedDocuments}
        onOpenChange={setShowLinkedDocuments}
        title="Linked Documents"
        subtitle={waybill.waybill_number || 'Waybill'}
        sections={linkedDocumentsSections}
      />
      <ProjectLinkDialog
        open={showProjectLinkDialog}
        onOpenChange={setShowProjectLinkDialog}
        tableName="waybills"
        recordId={id}
        documentLabel="Waybill"
        onLinked={async () => {
          const { data } = await supabase.from('waybills').select('*').eq('id', id).single()
          if (!data) return
          const mapped = mapDbWaybill(data as Record<string, unknown>)
          setWaybill(mapped)
          if (mapped.project_id) {
            const { data: project } = await supabase.from('projects').select('id, name').eq('id', mapped.project_id).single()
            setLinkedProject(project as { id: string; name: string } | null)
          }
        }}
      />
    </Layout>
  )
}
