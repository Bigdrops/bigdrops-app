import React, { useEffect, useState } from 'react'
import { Archive, Eye, Pencil, Trash2, Loader2, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import MobileFab from '@/components/layout/MobileFab'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import { feedback } from '@/lib/feedback'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'
import { supabase } from '@/supabase'
import { readListCache, writeListCache, isListCacheFresh, invalidateListCache } from '@/lib/cache/listCache'
import { getNextBoqNumber } from '@/domain/boq/storage'
import QueryFilterOverlay from '@/components/query/QueryFilterOverlay'
import { useDocumentQuery } from '@/context/DocumentQueryContext'
import { ContextualExportDropdown } from '@/components/export/ContextualExportDropdown'

const BOQ_CACHE_KEY = 'bd:list:boqs:v1:all'
const BOQ_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function BoqList() {
  const navigate = useNavigate()
  const { state, patchUpdate, reset, results: boqs, loading } = useDocumentQuery("boqs")
  const [activeBoq, setActiveBoq] = useState<any | null>(null)
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showFilterOverlay, setShowFilterOverlay] = useState(false)

  const handleArchive = async () => {
    if (!archiveId) return
    setIsArchiving(true)
    const { error } = await supabase.from('boqs').update({ archived_at: new Date().toISOString() }).eq('id', archiveId)
    setIsArchiving(false)
    if (error) {
      feedback.error('Archive failed', { description: error.message })
      return
    }
    feedback.success('BOQ archived')
    setArchiveId(null)
    setActiveBoq(null)
    invalidateListCache(BOQ_CACHE_KEY)
    patchUpdate({ search: state.search } as any)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    
    // Delete items first
    const { error: itemsError } = await supabase.from('boq_items').delete().eq('boq_id', deleteId)
    if (itemsError) {
      setIsDeleting(false)
      feedback.error('Delete failed', { description: itemsError.message })
      return
    }

    const { error } = await supabase.from('boqs').delete().eq('id', deleteId)
    setIsDeleting(false)
    if (error) {
      feedback.error('Delete failed', { description: error.message })
      return
    }
    feedback.success('BOQ deleted')
    setDeleteId(null)
    setActiveBoq(null)
    invalidateListCache(BOQ_CACHE_KEY)
    patchUpdate({ search: state.search } as any)
  }

  return (
    <>
      <ModuleShell
      eyebrow="Documents"
      title="BOQs"
      summary={`${boqs.length} documents total`}
      tone="blue"
      onPrimaryAction={() => navigate('/boqs/new')}
      searchValue={state.search}
      onSearchChange={(value) => patchUpdate({ search: value } as any)}
      searchPlaceholder="Search BOQs..."
      hasActiveFilters={Boolean(state.statuses.length > 0 || state.dateRange.from || state.dateRange.to)}
      onResetFilters={reset}
      onFilterClick={() => setShowFilterOverlay(prev => !prev)}
      headerActions={
        <ContextualExportDropdown
          domain="BOQS"
          data={boqs as unknown as Record<string, unknown>[]}
          supportedFormats={['CSV_SUMMARY', 'CSV_FLATTENED_LINE_ITEMS', 'JSON_RAW']}
          recordCount={boqs.length}
        />
      }
      records={loading ? [] : boqs}
      filterOverlay={
        <QueryFilterOverlay open={showFilterOverlay} onClose={() => setShowFilterOverlay(false)} module="boqs" />
      }
      renderRow={(boq) => (
        <ModuleRowCard
          key={boq.id}
          title={boq.client_name || boq.title || 'Untitled BOQ'}
          subtitle={boq.boq_number || 'BOQ'}
          tertiary={boq.status || 'open'}
          statusLabel={boq.status || 'open'}
          statusClassName={boq.status === 'approved' ? 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))]' : 'bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]'}
          onClick={() => navigate(`/boqs/${boq.id}`)}
          onActionClick={() => setActiveBoq(boq)}
        />
      )}
    >
      {loading && (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

    </ModuleShell>
    <MobileFab onClick={() => navigate('/boqs/new')} ariaLabel="Create BOQ" />
 
    <InvoiceListActionSheet
      open={Boolean(activeBoq)}
      onOpenChange={(open) => !open && setActiveBoq(null)}
      eyebrow={`BOQ ${activeBoq?.boq_number}`}
      title={activeBoq?.title || 'Untitled BOQ'}
      subtitle={activeBoq?.client_name || undefined}
      actions={activeBoq ? [
        { key: 'view', label: 'View / Export', icon: <Eye className="h-6 w-6" />, onClick: () => navigate(`/boqs/${activeBoq.id}`) },
        { key: 'edit', label: 'Edit BOQ', icon: <Pencil className="h-6 w-6" />, onClick: () => navigate(`/boqs/edit/${activeBoq.id}`) },
        { 
          key: 'archive', 
          label: isArchiving ? 'Archiving...' : 'Archive', 
          icon: isArchiving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Archive className="h-6 w-6" />, 
          onClick: () => setArchiveId(activeBoq.id),
          closeOnClick: false
        },
      ] : []}
      deleteAction={activeBoq ? {
        key: 'delete',
        label: isDeleting ? 'Deleting...' : 'Delete BOQ',
        icon: isDeleting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Trash2 className="h-6 w-6" />,
        onClick: () => setDeleteId(activeBoq.id),
        closeOnClick: false
      } : undefined}
    />

    <ConfirmActionDialog
      open={archiveId !== null}
      onOpenChange={(open) => !open && setArchiveId(null)}
      title="Archive this BOQ?"
      description="This will move the BOQ to the archive. You can restore it later from Settings."
      confirmLabel="Archive"
      loading={isArchiving}
      onConfirm={handleArchive}
    />

    <ConfirmActionDialog
      open={deleteId !== null}
      onOpenChange={(open) => !open && setDeleteId(null)}
      title="Delete this BOQ?"
      description="This action is permanent and cannot be undone."
      confirmLabel="Delete"
      variant="destructive"
      loading={isDeleting}
      onConfirm={handleDelete}
    />

  </>
)
}
