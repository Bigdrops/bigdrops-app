import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, FolderOpen, FolderPlus, GitBranchPlus, Loader2, Pencil, Plus, RefreshCw, Trash2, Truck, Workflow } from 'lucide-react'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { formatWaybillDate, getStatusMeta, getTypeMeta, mapDbWaybill } from '../components/waybill/waybillUtils'
import type { Waybill } from '../components/waybill/waybillUtils'
import MobileFab from '../components/layout/MobileFab'
import MobileSegmentedControl from '../components/layout/MobileSegmentedControl'
import ListActionSheet from '../components/layout/ListActionSheet'
import MobileListPageShell from '../components/layout/MobileListPageShell'
import AttachExistingDocumentSheet from '@/components/document/AttachExistingDocumentSheet'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import { Button } from '@/components/ui/button'
import { getDocumentActionState, getProjectActionState } from '@/domain/document/documentActionState'
import { fetchInvoiceSummary, fetchProjectSummary } from '@/domain/documentRelationships'
import { useToast } from '@/hooks/use-toast'
import { canUseNativeSqlite } from '@/lib/native/capacitor'
import {
  listPendingOrFailedWaybillCreateQueueItems,
  processWaybillCreateQueueItem,
  type WaybillCreateQueueItem,
} from '@/lib/native/waybillSync'

type FilterTab = 'all' | 'internal' | 'external'

export default function Waybills() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [waybills, setWaybills] = useState<Waybill[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<FilterTab>('all')
  const [activeWaybill, setActiveWaybill] = useState<Waybill | null>(null)
  const [activeWaybillInvoice, setActiveWaybillInvoice] = useState<{ id: string; invoice_number?: string | null } | null>(null)
  const [activeWaybillProject, setActiveWaybillProject] = useState<{ id: string; name?: string | null } | null>(null)
  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const [showAttachInvoice, setShowAttachInvoice] = useState(false)
  const [pendingAttachInvoice, setPendingAttachInvoice] = useState<{ id: string; invoice_number?: string | null } | null>(null)
  const [syncQueueItems, setSyncQueueItems] = useState<WaybillCreateQueueItem[]>([])
  const [syncQueueLoading, setSyncQueueLoading] = useState(() => canUseNativeSqlite())
  const [retryingQueueItemId, setRetryingQueueItemId] = useState<string | null>(null)
  const showWaybillSyncRecovery = useMemo(() => canUseNativeSqlite(), [])

  const loadWaybills = async () => {
    const { data } = await supabase
      .from('waybills')
      .select('*')
      .order('created_at', { ascending: false })

    setWaybills(((data as Record<string, unknown>[]) || []).map((row) => mapDbWaybill(row)) as Waybill[])
    setLoading(false)
  }

  const loadWaybillSyncQueue = async () => {
    if (!showWaybillSyncRecovery) return

    setSyncQueueLoading(true)
    const items = await listPendingOrFailedWaybillCreateQueueItems()
    setSyncQueueItems(items)
    setSyncQueueLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadWaybills()
      void loadWaybillSyncQueue()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

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
        activeWaybill.project_id ? fetchProjectSummary(activeWaybill.project_id) : Promise.resolve(null),
      ])

      if (cancelled) return
      setActiveWaybillInvoice(invoice)
      setActiveWaybillProject(project)
    }

    void loadRelationships()

    return () => {
      cancelled = true
    }
  }, [activeWaybill?.id, activeWaybill?.invoice_id, activeWaybill?.project_id])

  const filtered = useMemo(() => {
    let list = waybills
    if (tab !== 'all') list = list.filter((w) => w.type === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (w) =>
          w.waybill_number?.toLowerCase().includes(q) ||
          w.client_name?.toLowerCase().includes(q) ||
          w.vehicle_plate?.toLowerCase().includes(q) ||
          w.delivery_location?.toLowerCase().includes(q) ||
          w.sender_name?.toLowerCase().includes(q) ||
          w.receiver_name?.toLowerCase().includes(q),
      )
    }
    return list
  }, [waybills, tab, search])

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'internal', label: 'Internal' },
    { key: 'external', label: 'External' },
  ]

  const handleDeleteWaybill = async () => {
    if (!activeWaybill?.id) return
    await supabase.from('waybills').delete().eq('id', activeWaybill.id)
    setWaybills((prev) => prev.filter((w) => w.id !== activeWaybill.id))
    setActiveWaybill(null)
  }

  const handleRetryQueueItem = async (queueItemId: string) => {
    setRetryingQueueItemId(queueItemId)

    const result = await processWaybillCreateQueueItem(queueItemId)

    if (result.status === 'synced') {
      toast({
        title: 'Waybill synced',
        description: 'The offline waybill was uploaded successfully.',
      })
      await Promise.all([loadWaybills(), loadWaybillSyncQueue()])
    } else if (result.status === 'failed') {
      toast({
        title: 'Retry failed',
        description: result.error || 'Unable to sync this waybill right now.',
        variant: 'destructive',
      })
      await loadWaybillSyncQueue()
    } else {
      toast({
        title: 'Retry skipped',
        description: 'Connect to the internet before retrying this waybill sync.',
      })
    }

    setRetryingQueueItemId(null)
  }

  const waybillProjectState = getProjectActionState({ projectId: activeWaybill?.project_id, project: activeWaybillProject })
  const waybillDocumentState = getDocumentActionState({
    sourceDocument: activeWaybillInvoice,
    relatedDocuments: [],
  })
  const activeWaybillHasLinkedDocuments = waybillDocumentState.hasLinkedDocuments
  const activeWaybillLinkedSections = activeWaybill ? [
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
        ...(activeWaybillInvoice
          ? [{
              key: `invoice-${activeWaybillInvoice.id}`,
              label: `Invoice ${activeWaybillInvoice.invoice_number || activeWaybillInvoice.id}`,
              subtitle: 'Open linked invoice',
              onClick: () => navigate(`/invoices/${activeWaybillInvoice.id}`),
            }]
          : []),
      ],
    },
    {
      key: 'project',
      title: 'Project',
      description: 'Project connected to this waybill.',
      items: activeWaybillProject
        ? [{
            key: `project-${activeWaybillProject.id}`,
            label: activeWaybillProject.name || activeWaybillProject.id,
            subtitle: 'Open linked project',
            onClick: () => navigate(`/projects/${activeWaybillProject.id}`),
          }]
        : [],
    },
  ] : []

  const attachInvoice = async (invoice: { id: string }) => {
    if (!activeWaybill?.id || !invoice?.id) return
    await supabase.from('waybills').update({ invoice_id: invoice.id }).eq('id', activeWaybill.id)
    await loadWaybills()
    if (activeWaybill?.id) {
      const { data } = await supabase.from('waybills').select('*').eq('id', activeWaybill.id).single()
      if (data) {
        setActiveWaybill(mapDbWaybill(data))
        setActiveWaybillInvoice(data.invoice_id ? await fetchInvoiceSummary(data.invoice_id) : null)
      }
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
    <Layout title="Waybills" hidePageHeader session={null}>
      <MobileListPageShell
          eyebrow="Logistics"
          title="Waybills"
          summary={`${waybills.length} waybill${waybills.length === 1 ? '' : 's'}`}
          tone="cyan"
          onPrimaryAction={() => navigate('/waybills/new')}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search waybills..."
          segmentedControl={<MobileSegmentedControl options={tabs} value={tab} onChange={(value) => setTab(value as FilterTab)} />}
      >
        {showWaybillSyncRecovery && (syncQueueLoading || syncQueueItems.length > 0) ? (
          <div className="mb-4 rounded-[22px] border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                  Offline sync recovery
                </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Retry pending or failed waybill uploads from this device.
              </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                onClick={loadWaybillSyncQueue}
                disabled={syncQueueLoading || retryingQueueItemId != null}
                className="h-10 w-10 rounded-2xl border-amber-200 bg-background text-amber-700 hover:bg-amber-100"
                aria-label="Refresh waybill sync queue"
              >
                {syncQueueLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>

            {syncQueueItems.length > 0 ? (
              <div className="mt-4 space-y-2">
                {syncQueueItems.map((item) => {
                  const isRetrying = retryingQueueItemId === item.id

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-amber-200 bg-background p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-bold text-foreground">
                              {item.waybillNumber || item.localWaybillId || `Queue #${item.id}`}
                            </div>
                            <span
                              className={`inline-flex h-6 items-center rounded-full px-2 text-[10px] font-black uppercase tracking-[0.12em] ${
                                item.status === 'failed'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {item.clientName || 'No client / internal movement'} · Attempts {item.attempts}
                          </div>

                          {item.error ? (
                            <div className="mt-2 text-xs leading-5 text-red-600">
                              {item.error}
                            </div>
                          ) : null}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryQueueItem(item.id)}
                          disabled={retryingQueueItemId != null}
                          className="h-9 rounded-xl border-amber-200 bg-background px-3 text-xs font-bold text-amber-700 hover:bg-amber-50"
                        >
                          {isRetrying ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Retry
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[22px] border border-border bg-card px-5 py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[26px] border border-dashed border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,252,0.98))] py-16 text-center shadow-[0_18px_36px_-30px_rgba(15,23,42,0.45)]">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Truck className="h-7 w-7" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">No waybills found</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {search ? 'Try a different search term' : 'Create your first waybill to get started'}
              </div>
            </div>
            {!search && (
              <button
                type="button"
                onClick={() => navigate('/waybills/new')}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                New Waybill
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((w) => {
              const statusMeta = getStatusMeta(w.status)
              const typeMeta = getTypeMeta(w.type)
              return (
                <div
                  key={w.id}
                  onClick={() => navigate(`/waybills/${w.id}`)}
                  className="cursor-pointer rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                >
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-100 bg-cyan-50 text-lg font-extrabold text-cyan-500">W</div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Waybill</div>
                      <div className="mt-1 text-lg font-bold tracking-[-0.03em] text-foreground">{w.waybill_number || '—'}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{w.client_name || 'No client / internal movement'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveWaybill(w)
                      }}
                      className="grid h-10 w-10 place-items-center rounded-[14px] border border-border bg-background text-[20px] leading-none text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                      aria-label={`Open actions for ${w.waybill_number || 'waybill'}`}
                    >
                      ⋯
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${statusMeta.label.toLowerCase() === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                      {statusMeta.label}
                    </span>
                    <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${w.type === 'internal' ? 'bg-cyan-100 text-cyan-700' : 'border border-border bg-muted text-muted-foreground'}`}>
                      {typeMeta.label}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] leading-[1.45] text-muted-foreground">
                    <span>{formatWaybillDate(w.date)}</span>
                    {w.vehicle_plate ? (
                      <>
                        <span>•</span>
                        <span>{w.vehicle_plate}</span>
                      </>
                    ) : null}
                  </div>

                  <div className="my-[14px] h-px bg-border" />

                  <div className="text-sm text-muted-foreground">Route: {w.delivery_location || '—'}</div>
                  {!w.project_id ? <div className="mt-2 text-sm font-medium text-amber-700">Project link pending</div> : null}
                </div>
              )
            })}
          </div>
        )}

      <MobileFab onClick={() => navigate('/waybills/new')} ariaLabel="Create waybill">
        <Plus className="h-6 w-6" />
      </MobileFab>
      <ListActionSheet
        open={Boolean(activeWaybill)}
        onOpenChange={(open) => {
          if (!open) setActiveWaybill(null)
        }}
        eyebrow={activeWaybill ? (activeWaybill.type === 'internal' ? 'Internal Waybill' : 'External Waybill') : 'Waybill'}
        title={activeWaybill?.waybill_number || ''}
        actions={activeWaybill ? [
          {
            key: 'view',
            label: 'View',
            icon: <Eye size={20} />,
            onClick: () => navigate(`/waybills/${activeWaybill.id}`),
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <Pencil size={20} />,
            onClick: () => navigate(`/waybills/${activeWaybill.id}/edit`),
          },
          {
            key: 'project',
            label: waybillProjectState.label,
            icon: waybillProjectState.hasProject ? <FolderOpen size={20} /> : <FolderPlus size={20} />,
            onClick: () => {
              if (activeWaybill.project_id) {
                navigate(`/projects/${activeWaybill.project_id}`)
                return
              }
              setShowProjectLinkDialog(true)
            },
            closeOnClick: waybillProjectState.hasProject,
          },
          {
            key: 'documents',
            label: waybillDocumentState.label,
            icon: activeWaybillHasLinkedDocuments ? <Workflow size={20} /> : <GitBranchPlus size={20} />,
            onClick: () => setShowLinkedDocuments(true),
            closeOnClick: false,
          },
        ] : []}
        deleteAction={activeWaybill ? {
          label: 'Delete Waybill',
          icon: <Trash2 size={20} />,
          onClick: handleDeleteWaybill,
        } : undefined}
      />
      <LinkedDocumentsSheet
        open={showLinkedDocuments}
        onOpenChange={setShowLinkedDocuments}
        title="Linked Documents"
        subtitle={activeWaybill?.waybill_number || 'Waybill'}
        sections={activeWaybillLinkedSections}
      />
      <AttachExistingDocumentSheet
        open={showAttachInvoice}
        onOpenChange={setShowAttachInvoice}
        title="Attach to Invoice"
        description={activeWaybill?.waybill_number || 'Waybill'}
        table="invoices"
        numberField="invoice_number"
        clientField="client_name"
        poField="po_number"
        linkedInvoiceField={null}
        currentInvoiceId={null}
        currentClientName={activeWaybill?.client_name}
        searchPlaceholder="Search invoice number, client, or PO"
        onAttach={handleAttachInvoice}
      />
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
      <ProjectLinkDialog
        open={showProjectLinkDialog}
        onOpenChange={setShowProjectLinkDialog}
        tableName="waybills"
        recordId={activeWaybill?.id || null}
        documentLabel="Waybill"
        onLinked={async () => {
          await loadWaybills()
          setActiveWaybill(null)
        }}
      />
      </MobileListPageShell>
    </Layout>
  )
}
