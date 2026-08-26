import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, FolderOpen, FolderPlus, GitBranchPlus, Loader2, Pencil, Trash2, Truck, Workflow } from 'lucide-react'

import Layout from '../components/Layout'
import { formatWaybillDate, mapDbWaybill } from '../components/waybill/waybillUtils'
import type { Waybill } from '../components/waybill/waybillUtils'
import MobileFab from '@/components/layout/MobileFab'
import MobileSegmentedControl from '@/components/layout/MobileSegmentedControl'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import AttachExistingDocumentSheet from '@/components/document/AttachExistingDocumentSheet'
import ConfirmActionDialog from '../components/ConfirmActionDialog'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import { Button } from '@/components/ui/button'
import { getDocumentActionState, getProjectActionState } from '@/domain/document/documentActionState'
import { fetchInvoiceSummary, fetchProjectSummary } from '@/domain/documentRelationships'
import { formatStatusLabel } from '@/lib/formatters/status'
import { getStatusTone, getStatusClasses } from '@/lib/statusTheme'
import { feedback } from '@/lib/feedback'
import { DocumentQueryProvider, useDocumentQuery } from '@/context/DocumentQueryContext'
import QueryFilterOverlay from '@/components/query/QueryFilterOverlay'
import { ContextualExportDropdown } from '@/components/export/ContextualExportDropdown'
import { useEntity } from '@/lib/tenant/contexts'

type FilterTab = 'all' | 'internal' | 'external'

function WaybillsContent() {
  const navigate = useNavigate()
  const { tenantClient } = useEntity()

  const { state, patchUpdate, reset, results } = useDocumentQuery("waybills")

  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [activeWaybill, setActiveWaybill] = useState<Waybill | null>(null)
  const [activeWaybillInvoice, setActiveWaybillInvoice] = useState<{ id: string; invoice_number?: string | null } | null>(null)
  const [activeWaybillProject, setActiveWaybillProject] = useState<{ id: string; name?: string | null } | null>(null)
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const [showAttachInvoice, setShowAttachInvoice] = useState(false)
  const [showFilterOverlay, setShowFilterOverlay] = useState(false)
  const [pendingAttachInvoice, setPendingAttachInvoice] = useState<{ id: string; invoice_number?: string | null } | null>(null)

  const waybills = results as Waybill[]

  const filteredWaybills = useMemo(() => {
    return filterTab === 'all' ? waybills : waybills.filter(w => w.type === filterTab)
  }, [waybills, filterTab])

  useEffect(() => {
    let cancelled = false

    const loadRelationships = async () => {
      if (!activeWaybill) {
        setActiveWaybillInvoice(null)
        setActiveWaybillProject(null)
        return
      }

      const [invoice, project] = await Promise.all([
        activeWaybill.invoice_id ? fetchInvoiceSummary(activeWaybill.invoice_id) : Promise.resolve(null),
        activeWaybill.project_id ? fetchProjectSummary(activeWaybill.project_id, tenantClient) : Promise.resolve(null),
      ])

      if (cancelled) return
      setActiveWaybillInvoice(invoice)
      setActiveWaybillProject(project)
    }

    void loadRelationships()
    return () => { cancelled = true }
  }, [activeWaybill?.id, activeWaybill?.invoice_id, activeWaybill?.project_id])

  const hasActiveFilters = Boolean(
    state.statuses.length > 0 ||
      state.dateRange.from ||
      state.dateRange.to
  )

  const handleArchiveWaybill = async () => {
    if (!archiveId) return
    setIsArchiving(true)
    try {
      const { error } = await tenantClient.from('waybills').update({ archived_at: new Date().toISOString() }).eq('id', archiveId)
      if (error) {
        feedback.error('Archive failed', { description: error.message })
        return
      }
      feedback.success('Waybill archived')
      setArchiveId(null)
      setActiveWaybill(null)
      patchUpdate({ search: state.search } as any)
    } catch (e) {
      feedback.error('Archive failed', { description: e instanceof Error ? e.message : 'Tenant schema unavailable' })
    } finally {
      setIsArchiving(false)
    }
  }

  const handleDeleteWaybill = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const { error } = await tenantClient.from('waybills').delete().eq('id', deleteId)
      if (error) {
        feedback.error('Delete failed', { description: error.message })
        return
      }
      feedback.success('Waybill deleted')
      setDeleteId(null)
      setActiveWaybill(null)
      patchUpdate({ search: state.search } as any)
    } catch (e) {
      feedback.error('Delete failed', { description: e instanceof Error ? e.message : 'Tenant schema unavailable' })
    } finally {
      setIsDeleting(false)
    }
  }

  const waybillProjectState = getProjectActionState({ projectId: activeWaybill?.project_id, project: activeWaybillProject })
  const waybillDocumentState = getDocumentActionState({ sourceDocument: activeWaybillInvoice, relatedDocuments: [] })
  const activeWaybillHasLinkedDocuments = waybillDocumentState.hasLinkedDocuments
  const activeWaybillLinkedSections = activeWaybill ? [
    {
      key: 'source', title: 'Source', description: 'Documents this waybill is linked to.',
      items: [
        { key: 'attach-invoice', label: 'Attach to Invoice', subtitle: 'Search and link an invoice', onClick: () => { setShowLinkedDocuments(false); setShowAttachInvoice(true) } },
        ...(activeWaybillInvoice ? [{ key: `invoice-${activeWaybillInvoice.id}`, label: `Invoice ${activeWaybillInvoice.invoice_number || activeWaybillInvoice.id}`, subtitle: 'Open linked invoice', onClick: () => navigate(`/invoices/${activeWaybillInvoice.id}`) }] : []),
      ],
    },
    {
      key: 'project', title: 'Project', description: 'Project connected to this waybill.',
      items: activeWaybillProject ? [{ key: `project-${activeWaybillProject.id}`, label: activeWaybillProject.name || activeWaybillProject.id, subtitle: 'Open linked project', onClick: () => navigate(`/projects/${activeWaybillProject.id}`) }] : [],
    },
  ] : []

  const attachInvoice = async (invoice: { id: string }) => {
    if (!activeWaybill?.id || !invoice?.id) return
    try {
      await tenantClient.from('waybills').update({ invoice_id: invoice.id }).eq('id', activeWaybill.id)
      patchUpdate({ search: state.search } as any)
      if (activeWaybill?.id) {
        const { data } = await tenantClient.from('waybills').select('*').eq('id', activeWaybill.id).single()
        if (data) {
          setActiveWaybill(mapDbWaybill(data))
          setActiveWaybillInvoice(data.invoice_id ? await fetchInvoiceSummary(data.invoice_id) : null)
        }
      }
    } catch {
      // Tenant schema unavailable — no public fallback for business data.
    }
    setShowAttachInvoice(false)
  }

  const handleAttachInvoice = (invoice: { id: string }) => {
    if (!activeWaybill?.id || !invoice?.id) return
    if (activeWaybill.invoice_id && activeWaybill.invoice_id !== invoice.id) {
      setPendingAttachInvoice(invoice)
      return
    }
    void attachInvoice(invoice)
  }

  return (
    <>
      <ModuleShell
        eyebrow="Logistics" title="Waybills"
        summary={`${filteredWaybills.length} waybill${filteredWaybills.length === 1 ? '' : 's'}`}
        tone="cyan"
        onPrimaryAction={() => navigate('/waybills/new')} primaryActionLabel="New Waybill"
        searchValue={state.search}
        onSearchChange={(value) => patchUpdate({ search: value } as any)}
        searchPlaceholder="Search waybills..."
        hasActiveFilters={hasActiveFilters}
        onResetFilters={reset}
        onFilterClick={() => setShowFilterOverlay(prev => !prev)}
        headerActions={
          <ContextualExportDropdown
            domain="WAYBILLS"
            data={waybills as unknown as Record<string, unknown>[]}
            supportedFormats={['CSV_SUMMARY', 'JSON_RAW']}
            recordCount={waybills.length}
          />
        }
        filterOverlay={
          <QueryFilterOverlay open={showFilterOverlay} onClose={() => setShowFilterOverlay(false)} module="waybills" />
        }
        beforeListContent={
          <MobileSegmentedControl
            value={filterTab}
            onChange={setFilterTab as (v: string) => void}
            options={[
              { key: 'all', label: 'All' },
              { key: 'external', label: 'External' },
              { key: 'internal', label: 'Internal' },
            ]}
          />
        }
        records={filteredWaybills}
        renderRow={(w) => {
          const tone = getStatusTone(w.status)
          const statusClasses = getStatusClasses(tone)
          return (
            <ModuleRowCard
              key={w.id}
              title={w.client_name || 'No client / internal movement'}
              subtitle={`${w.waybill_number || '—'} · ${w.delivery_location || 'No location'}`}
              tertiary={
                <div className="flex flex-col gap-0.5">
                  <div>{formatWaybillDate(w.date)}{w.vehicle_plate ? ` · ${w.vehicle_plate}` : ''}</div>
                  {!w.project_id && <div className="font-bold text-primary">Project link pending</div>}
                </div>
              }
              statusLabel={formatStatusLabel(w.status, { fallback: 'open' })}
              statusClassName={statusClasses}
              onClick={() => navigate(`/waybills/${w.id}`)}
              onActionClick={() => setActiveWaybill(w)}
            />
          )
        }}
        emptyState={
          <div className="rounded-[var(--bd-overlay-radius)] border border-dashed border-bd-border bg-bd-surface/50 p-16 text-center shadow-inner">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[var(--bd-radius-lg)] bg-bd-surface-muted text-bd-text-muted"><Truck className="h-7 w-7" /></div>
            <div className="mt-4 text-base font-bold text-bd-text">{hasActiveFilters ? 'No waybills found' : 'No waybills yet'}</div>
            <div className="mt-1 text-sm text-bd-text-muted">{hasActiveFilters ? 'Try a different search or filter.' : 'Create your first waybill to start tracking logistics.'}</div>
            {!hasActiveFilters && <Button onClick={() => navigate('/waybills/new')} className="mt-6 rounded-xl px-6">New Waybill</Button>}
          </div>
        }
      />

      <MobileFab onClick={() => navigate('/waybills/new')} ariaLabel="Create waybill" />
      <InvoiceListActionSheet
        open={Boolean(activeWaybill) && !archiveId && !deleteId} onOpenChange={(open) => { if (!open) setActiveWaybill(null) }}
        eyebrow={activeWaybill ? (activeWaybill.type === 'internal' ? 'Internal Waybill' : 'External Waybill') : 'Waybill'}
        title={activeWaybill?.waybill_number || ''}
        subtitle={activeWaybill ? `${activeWaybill.client_name || 'No client / internal movement'}${activeWaybill.delivery_location ? ` · ${activeWaybill.delivery_location}` : ''}` : undefined}
        actions={activeWaybill ? [
          { key: 'view', label: 'View', icon: <Eye size={20} />, onClick: () => navigate(`/waybills/${activeWaybill.id}`) },
          { key: 'edit', label: 'Edit', icon: <Pencil size={20} />, onClick: () => navigate(`/waybills/${activeWaybill.id}/edit`) },
          { key: 'project', label: waybillProjectState.label, icon: waybillProjectState.hasProject ? <FolderOpen size={20} /> : <FolderPlus size={20} />, onClick: () => { if (activeWaybill.project_id) { navigate(`/projects/${activeWaybill.project_id}`); return } setShowProjectLinkDialog(true) }, closeOnClick: waybillProjectState.hasProject },
          { key: 'documents', label: waybillDocumentState.label, icon: activeWaybillHasLinkedDocuments ? <Workflow size={20} /> : <GitBranchPlus size={20} />, onClick: () => setShowLinkedDocuments(true), closeOnClick: false },
          { key: 'archive', label: isArchiving ? 'Archiving...' : 'Archive', icon: isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />, onClick: () => setArchiveId(activeWaybill.id), closeOnClick: false },
        ] : []}
        deleteAction={activeWaybill ? { key: 'delete', label: isDeleting ? 'Deleting...' : 'Delete Waybill', icon: isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={20} />, onClick: () => setDeleteId(activeWaybill.id), closeOnClick: false } : undefined}
      />
      <ConfirmActionDialog open={archiveId !== null} onOpenChange={(open) => !open && setArchiveId(null)} title="Archive Waybill?" description="This will move the waybill to the archive section. You can restore it later if needed." confirmLabel="Archive" loading={isArchiving} onConfirm={handleArchiveWaybill} />
      <ConfirmActionDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete Waybill?" description="Are you sure you want to delete this waybill? This action cannot be undone." confirmLabel="Delete" variant="destructive" loading={isDeleting} onConfirm={handleDeleteWaybill} />
      <LinkedDocumentsSheet open={showLinkedDocuments} onOpenChange={setShowLinkedDocuments} title="Linked Documents" subtitle={activeWaybill?.waybill_number || 'Waybill'} sections={activeWaybillLinkedSections} />
      <AttachExistingDocumentSheet open={showAttachInvoice} onOpenChange={setShowAttachInvoice} title="Attach to Invoice" description={activeWaybill?.waybill_number || 'Waybill'} table="invoices" numberField="invoice_number" clientField="client_name" poField="po_number" linkedInvoiceField={null} currentInvoiceId={null} currentClientName={activeWaybill?.client_name} searchPlaceholder="Search invoice number, client, or PO" onAttach={handleAttachInvoice} />
      <ConfirmActionDialog open={Boolean(pendingAttachInvoice)} onOpenChange={(nextOpen) => { if (!nextOpen) setPendingAttachInvoice(null) }} title="Reassign linked waybill?" description="This waybill is already linked to a different invoice. Reassigning will detach it from the previous invoice." confirmLabel="Reassign" onConfirm={() => { const invoice = pendingAttachInvoice; setPendingAttachInvoice(null); if (invoice) void attachInvoice(invoice) }} />
      <ProjectLinkDialog open={showProjectLinkDialog} onOpenChange={setShowProjectLinkDialog} tableName="waybills" recordId={activeWaybill?.id || null} documentLabel="Waybill" onLinked={async () => { patchUpdate({ search: state.search } as any); setActiveWaybill(null) }} />
    </>
  )
}

export default function Waybills() {
  return (
    <Layout title="Waybills" hidePageHeader session={null}>
      <DocumentQueryProvider module="waybills">
        <WaybillsContent />
      </DocumentQueryProvider>
    </Layout>
  )
}
