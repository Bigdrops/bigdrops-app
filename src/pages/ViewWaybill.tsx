import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Copy, FolderOpen, FolderPlus, GitBranchPlus, Pencil, Truck, Workflow } from 'lucide-react'

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
import AttachExistingDocumentSheet from '@/components/document/AttachExistingDocumentSheet'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import {
  DocumentActionGrid,
  DocumentActionSheet,
  DocumentBottomBar,
  DocumentDesignPanel,
  DocumentFillableWritingEditor,
  DocumentSection,
  DocumentStatusStrip,
  DocumentTopBar,
} from '@/components/document/DocumentViewShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  documentDetailMetaGridClassName,
  documentDetailMetaItemClassName,
  documentDetailMetaLabelClassName,
  documentDetailMetaValueClassName,
  documentDetailShellClassName,
} from '@/components/ui/document-detail-styles'
import {
  mobileDetailCardClassName,
  mobileDetailLabelClassName,
  mobileDetailNumberBadgeClassName,
  mobileDetailRowClassName,
  mobileDetailTwoColumnGridClassName,
  mobileDetailValueClassName,
  operationalEmptyStateClassName,
} from '@/components/ui/operational-card-styles'
import { toast } from '@/hooks/use-toast'
import { useSettings } from '../hooks/useSettings'
import { getDocumentActionState, getProjectActionState } from '@/domain/document/documentActionState'
import { getPdfDesignPreset, getEffectiveFillableFont, resolvePdfWebFontFamily, setPdfDesignPreset } from '@/lib/pdfDesignPreset'
import { isDocumentFillableEnabled } from '@/lib/documentFillableSettings'
import { ensureFillableWebFontsLoaded } from '@/lib/pdfFontRegistry'

export default function ViewWaybill() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [waybill, setWaybill] = useState<Waybill | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMobileActions, setShowMobileActions] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [linkedInvoice, setLinkedInvoice] = useState<{ id: string; invoice_number: string } | null>(null)
  const [linkedProject, setLinkedProject] = useState<{ id: string; name: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showAttachInvoice, setShowAttachInvoice] = useState(false)
  const [pendingAttachInvoice, setPendingAttachInvoice] = useState<{ id: string; invoice_number?: string | null } | null>(null)
  const [pdfDesignPreset, setPdfDesignPresetState] = useState(() => getPdfDesignPreset('waybill'))

  useEffect(() => {
    void ensureFillableWebFontsLoaded()
  }, [])

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

  const handleDownloadPDF = async () => {
    if (!waybill) return
    setPdfLoading(true)
    try {
      const [{ pdf }, { default: WaybillPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/waybill/WaybillPDF'),
      ])
      const blob = await pdf(WaybillPDF({ waybill, settings: settings ?? {}, designPreset: pdfDesignPreset })).toBlob()
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
    setShowMobileActions(false)
    await supabase.from('waybills').update({ status: next }).eq('id', id)
    setWaybill((current) => (current ? { ...current, status: next } : current))
  }

  const handleDelete = async () => {
    setShowMobileActions(false)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    setShowDeleteConfirm(false)
    await supabase.from('waybills').delete().eq('id', id)
    navigate('/waybills')
  }

  const attachInvoice = async (invoice: { id: string }) => {
    if (!waybill?.id || !invoice?.id) return
    await supabase.from('waybills').update({ invoice_id: invoice.id }).eq('id', waybill.id)
    setWaybill((current) => (current ? { ...current, invoice_id: invoice.id } : current))
    const { data } = await supabase.from('invoices').select('id, invoice_number').eq('id', invoice.id).single()
    setLinkedInvoice((data as { id: string; invoice_number: string } | null) ?? null)
    setShowAttachInvoice(false)
  }

  const handleAttachInvoice = (invoice: { id: string }) => {
    if (!invoice?.id) return
    if (waybill?.invoice_id && waybill.invoice_id !== invoice.id) {
      setPendingAttachInvoice(invoice)
      return
    }
    void attachInvoice(invoice)
  }

  if (loading) {
    return (
      <Layout title="Waybill">
        <Card className={operationalEmptyStateClassName}>
          <CardContent className="p-0">Loading waybill...</CardContent>
        </Card>
      </Layout>
    )
  }
  if (!waybill) {
    return (
      <Layout title="Waybill">
        <Card className={operationalEmptyStateClassName}>
          <CardContent className="p-0">Waybill not found.</CardContent>
        </Card>
      </Layout>
    )
  }

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
  const showWaybillFillableControls = isDocumentFillableEnabled(settings?.document_fillable_settings, 'waybill')
  const fillablePreviewStyle = {
    fontFamily: resolvePdfWebFontFamily(getEffectiveFillableFont(pdfDesignPreset)),
    color: pdfDesignPreset.fillableColor,
  }
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
      items: [
        {
          key: 'attach-invoice',
          label: 'Attach to Invoice',
          subtitle: 'Search and link an invoice',
          onClick: () => {
            setShowLinkedDocuments(false)
            setShowAttachInvoice(true)
          },
        },
        ...(linkedInvoice
          ? [{
              key: `invoice-${linkedInvoice.id}`,
              label: `Invoice ${linkedInvoice.invoice_number}`,
              subtitle: 'Open linked invoice',
              onClick: () => navigate(`/invoices/${linkedInvoice.id}`),
            }]
          : []),
      ],
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

  const handlePdfDesignPresetChange = (nextPreset: typeof pdfDesignPreset) => {
    const resolvedPreset = {
      ...nextPreset,
      fillableFontMode: 'custom' as const,
    }
    setPdfDesignPresetState(resolvedPreset)
    setPdfDesignPreset('waybill', resolvedPreset)
  }

  const shellActionItems = [
    {
      label: projectActionState.label,
      subtitle: projectActionState.hasProject ? (linkedProject?.name || 'Open the linked project workspace') : 'Attach this waybill to a project',
      onClick: () => {
        if (waybill.project_id) {
          navigate(`/projects/${waybill.project_id}`)
          return
        }
        setShowProjectLinkDialog(true)
      },
      iconKey: projectActionState.hasProject ? 'projectView' : 'projectLink',
    },
    {
      label: documentActionState.label,
      subtitle: hasLinkedDocuments ? 'View linked invoice and related records' : 'Connect this waybill to an invoice',
      onClick: () => setShowLinkedDocuments(true),
      iconKey: hasLinkedDocuments ? 'documentsView' : 'documentsLink',
    },
    {
      label: 'Copy Waybill Number',
      subtitle: waybill.waybill_number || 'Copy the current document number',
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(waybill.waybill_number)
          toast({ title: 'Copied', description: 'Waybill number copied.' })
        } catch {
          toast({ title: 'Copy failed', description: 'Could not copy waybill number.', variant: 'destructive' })
        }
      },
      iconKey: 'copy',
    },
    ...(waybill.status === 'draft'
      ? [{ label: 'Mark as Dispatched', subtitle: 'Move this waybill to dispatched', onClick: () => void handleStatusChange('dispatched'), iconKey: 'convert' }]
      : []),
    ...(waybill.status === 'dispatched'
      ? [{ label: 'Mark as Delivered', subtitle: 'Confirm delivery acknowledgement', onClick: () => void handleStatusChange('delivered'), iconKey: 'convert' }]
      : []),
    { label: 'Delete Waybill', subtitle: 'Permanently remove this waybill', onClick: handleDelete, danger: true, iconKey: 'delete' },
  ]

  const shellStatusItems = (['draft', 'dispatched', 'delivered'] as WaybillStatus[]).map((status) => ({
    label: getStatusMeta(status).label,
    active: waybill.status === status,
    onClick: () => void handleStatusChange(status),
  }))

  return (
    <Layout
      title={waybill.waybill_number || 'Waybill'}
      hidePageHeader
      contentClassName="w-full px-4 pb-32 pt-4 md:px-6 md:pt-6"
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <DocumentTopBar
          title={waybill.waybill_number || 'Waybill'}
          subtitle={`${typeMeta.label} Waybill`}
          statusLabel={statusMeta.label}
          statusClassName={statusMeta.className}
          onBack={() => navigate('/waybills')}
          onMore={() => setShowMobileActions(true)}
        />

        <DocumentActionGrid
          actions={[
            { key: 'pdf', label: 'PDF', onClick: () => void handleDownloadPDF(), variant: 'dark', disabled: pdfLoading },
            { key: 'edit', label: 'Edit', onClick: () => navigate(`/waybills/${id}/edit`), variant: 'outline', icon: Pencil },
            {
              key: 'download',
              label: hasLinkedDocuments ? 'Links' : 'Link',
              onClick: () => setShowLinkedDocuments(true),
              variant: 'blue',
              icon: hasLinkedDocuments ? Workflow : GitBranchPlus,
            },
            { key: 'more', label: 'More', onClick: () => setShowMobileActions(true), variant: 'outline' },
          ]}
        />

        <DocumentStatusStrip items={shellStatusItems} />

        <div className="space-y-4">
          {(waybill.status === 'draft' || waybill.status === 'dispatched') ? (
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${waybill.status === 'draft' ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <Truck className={`h-5 w-5 ${waybill.status === 'draft' ? 'text-blue-500' : 'text-emerald-500'}`} />
              <div className="flex-1 text-sm font-medium text-foreground">{waybill.status === 'draft' ? 'Ready to dispatch?' : 'Acknowledgement completed?'}</div>
              <Button type="button" size="sm" onClick={() => void handleStatusChange(waybill.status === 'draft' ? 'dispatched' : 'delivered')} className={`rounded-xl ${waybill.status === 'draft' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}>
                {waybill.status === 'draft' ? 'Mark Dispatched' : 'Mark Delivered'}
              </Button>
            </div>
          ) : null}

          <div className={documentDetailShellClassName}>
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${typeMeta.className}`}>{typeMeta.label}</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusMeta.className}`}>{statusMeta.label}</span>
                </div>
                <div className="text-lg font-black text-foreground">{settings?.company_name || 'Company'}</div>
                {settings?.company_address ? <div className="text-xs text-muted-foreground">{settings.company_address}</div> : null}
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{typeContent.pdfTitle}</div>
                <div className="text-base font-bold text-foreground" style={fillablePreviewStyle}>{waybill.waybill_number}</div>
              </div>
            </div>

            <div className={documentDetailMetaGridClassName}>
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
                <div key={entry.label} className={documentDetailMetaItemClassName}>
                  <div className={documentDetailMetaLabelClassName}>{entry.label}</div>
                  <div className={documentDetailMetaValueClassName}>{entry.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3" style={fillablePreviewStyle}>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">{typeContent.senderPdfLabel}</div>
                <div className="mt-1 text-sm font-bold text-foreground">{waybill.sender_name || '—'}</div>
                {customFields?.partyNotes?.sender ? <div className="mt-2 text-xs text-blue-900">{customFields.partyNotes.sender}</div> : null}
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3" style={fillablePreviewStyle}>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">{typeContent.receiverPdfLabel}</div>
                <div className="mt-1 text-sm font-bold text-foreground">{waybill.receiver_name || '—'}</div>
                {customFields?.partyNotes?.receiver ? <div className="mt-2 text-xs text-emerald-900">{customFields.partyNotes.receiver}</div> : null}
              </div>
            </div>

            {items.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-slate-50 px-4 py-8 text-center text-sm text-muted-foreground">
                No items on this waybill yet.
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-3 md:hidden" style={fillablePreviewStyle}>
                  {items.map((item, index) => (
                    <div key={`${item.description}-${index}`} className={mobileDetailCardClassName}>
                      <div className="mb-3 flex items-start gap-3">
                        <div className={mobileDetailNumberBadgeClassName}>{index + 1}</div>
                        <div className="min-w-0 flex-1">
                          <div className="break-words font-semibold text-foreground">{item.description || '—'}</div>
                        </div>
                      </div>
                      <div className={mobileDetailTwoColumnGridClassName}>
                        <div>
                          <span className={mobileDetailLabelClassName}>Qty</span>
                          <div className={mobileDetailValueClassName}>{item.quantity ?? '—'}</div>
                        </div>
                        <div>
                          <span className={mobileDetailLabelClassName}>Unit</span>
                          <div className={mobileDetailValueClassName}>{item.unit || '—'}</div>
                        </div>
                      </div>
                      <div className={mobileDetailRowClassName}>
                        <span className={mobileDetailLabelClassName}>Condition</span>
                        <div className={mobileDetailValueClassName}>{item.condition || '—'}</div>
                      </div>
                      {customColumns.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {customColumns.map((column) => (
                            <div key={column.key}>
                              <span className={mobileDetailLabelClassName}>{column.label}</span>
                              <div className={mobileDetailValueClassName}>{String(item.custom_data?.[column.key] || '—')}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border md:block">
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
                    <tbody className="divide-y divide-border" style={fillablePreviewStyle}>
                      {items.map((item, index) => (
                        <tr key={`${item.description}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{index + 1}</td>
                          <td className="px-3 py-2.5 text-sm text-foreground">{item.description || '—'}</td>
                          <td className="px-3 py-2.5 text-right text-sm font-medium text-foreground">{item.quantity ?? '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{item.unit || '—'}</td>
                          <td className="px-3 py-2.5 text-xs capitalize text-muted-foreground">{item.condition || '—'}</td>
                          {customColumns.map((column) => (
                            <td key={column.key} className="px-3 py-2.5 text-xs text-muted-foreground">{String(item.custom_data?.[column.key] || '—')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {waybill.notes ? <div className="mt-4 rounded-xl border border-border bg-slate-50 px-3 py-3 text-sm text-foreground" style={fillablePreviewStyle}>{waybill.notes}</div> : null}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[{ title: typeContent.senderSignatureLabel, signature: senderSignature, fallbackName: waybill.sender_name || '—' }, { title: typeContent.receiverSignatureLabel, signature: receiverSignature, fallbackName: waybill.receiver_name || 'Acknowledgement pending' }].map((entry) => (
                <div key={entry.title} className="rounded-xl border border-border bg-slate-50 p-3" style={fillablePreviewStyle}>
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

          {showWaybillFillableControls ? (
            <DocumentSection title="Customize" defaultOpen>
              <DocumentDesignPanel
                title="Customize"
                subtitle="Fillable-writing controls for Waybill preview and PDF export."
                badge="Waybill"
                sections={[
                  {
                    key: 'fillable-writing',
                    title: 'Fillable Writing',
                    content: (
                      <DocumentFillableWritingEditor
                        value={pdfDesignPreset}
                        onChange={handlePdfDesignPresetChange}
                      />
                    ),
                  },
                ]}
              />
            </DocumentSection>
          ) : null}

          {linkedInvoice || linkedProject ? (
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-600">Linked Documents</div>
              <div className="space-y-2">
                {linkedInvoice ? <button type="button" onClick={() => navigate(`/invoices/${linkedInvoice.id}`)} className="flex w-full items-center justify-between rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-left transition hover:bg-purple-50"><div className="text-sm font-semibold text-foreground">Invoice: {linkedInvoice.invoice_number}</div><Workflow className="h-4 w-4 text-muted-foreground" /></button> : null}
                {linkedProject ? <button type="button" onClick={() => navigate(`/projects/${linkedProject.id}`)} className="flex w-full items-center justify-between rounded-xl border border-purple-200 bg-white px-3 py-2.5 text-left transition hover:bg-purple-50"><div className="text-sm font-semibold text-foreground">Project: {linkedProject.name}</div><FolderOpen className="h-4 w-4 text-muted-foreground" /></button> : null}
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

        </div>
        <DocumentActionSheet
          open={showMobileActions}
          onOpenChange={setShowMobileActions}
          title="Waybill Actions"
          subtitle={waybill.waybill_number || 'Waybill'}
          actions={shellActionItems}
        />

        <DocumentBottomBar
          actions={[
            { label: 'Back', onClick: () => navigate('/waybills'), variant: 'outline' },
            { label: 'Edit', onClick: () => navigate(`/waybills/${id}/edit`), variant: 'outline' },
            { label: pdfLoading ? 'Generating...' : 'Download PDF', onClick: () => void handleDownloadPDF(), className: 'bg-slate-950 text-white hover:bg-slate-800', disabled: pdfLoading },
          ]}
        />
      </div>
      <ConfirmActionDialog
        open={Boolean(pendingAttachInvoice)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingAttachInvoice(null)
        }}
        title="Reassign linked waybill?"
        description="This waybill is already linked to a different invoice. Reassigning will detach it from the previous invoice."
        confirmLabel="Reassign"
        onConfirm={() => {
          const invoice = pendingAttachInvoice
          setPendingAttachInvoice(null)
          if (invoice) void attachInvoice(invoice)
        }}
      />
      <AttachExistingDocumentSheet
        open={showAttachInvoice}
        onOpenChange={setShowAttachInvoice}
        title="Attach to Invoice"
        description={waybill.waybill_number || 'Waybill'}
        table="invoices"
        numberField="invoice_number"
        clientField="client_name"
        poField="po_number"
        currentClientName={waybill.client_name}
        searchPlaceholder="Search invoice number, client, or PO"
        onAttach={handleAttachInvoice}
      />
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
