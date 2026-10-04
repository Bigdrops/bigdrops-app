import React, { useEffect, useState } from 'react'
import { Archive, Eye, Pencil, Trash2, Loader2, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import MobileFab from '@/components/layout/MobileFab'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import { feedback } from '@/lib/feedback'
import { formatDisplayDate } from '@/lib/formatters/date'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'
import { useEntity } from '@/lib/tenant/contexts'
import { readListCache, writeListCache, isListCacheFresh, invalidateListCache } from '@/lib/cache/listCache'
import QueryFilterOverlay from '@/components/query/QueryFilterOverlay'
import { useDocumentQuery } from '@/context/DocumentQueryContext'
import { ContextualExportDropdown } from '@/components/export/ContextualExportDropdown'

const CPS_CACHE_KEY = 'bd:list:cps_sheets:v2:all'
const CPS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const formatCpsDate = (value: string | null | undefined) => formatDisplayDate(value, {
  fallback: "", invalidFallback: "", locale: "en-GB",
  dateOptions: { day: "2-digit", month: "short", year: "numeric" },
})

export function CpsList() {
  const navigate = useNavigate()
  const { tenantClient } = useEntity()
  const { state, patchUpdate, reset, results: cps_sheets, loading } = useDocumentQuery("cps_sheets")
  const [activeCps, setActiveCps] = useState<any | null>(null)
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showFilterOverlay, setShowFilterOverlay] = useState(false)

  const handleArchive = async () => {
    if (!archiveId) return
    setIsArchiving(true)
    const { error } = await tenantClient.from('cps_sheets').update({ archived_at: new Date().toISOString() }).eq('id', archiveId)
    setIsArchiving(false)
    if (error) {
      feedback.error('Archive failed', { description: error.message })
      return
    }
    feedback.success('Cost & Pricing Sheet archived')
    setArchiveId(null)
    setActiveCps(null)
    invalidateListCache(CPS_CACHE_KEY)
    patchUpdate({ search: state.search } as any)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    
    // Delete items first
    const { error: itemsError } = await tenantClient.from('cps_rows').delete().eq('cps_sheet_id', deleteId)
    if (itemsError) {
      setIsDeleting(false)
      feedback.error('Delete failed', { description: itemsError.message })
      return
    }

    const { error } = await tenantClient.from('cps_sheets').delete().eq('id', deleteId)
    setIsDeleting(false)
    if (error) {
      feedback.error('Delete failed', { description: error.message })
      return
    }
    feedback.success('Cost & Pricing Sheet deleted')
    setDeleteId(null)
    setActiveCps(null)
    invalidateListCache(CPS_CACHE_KEY)
    patchUpdate({ search: state.search } as any)
  }

  return (
    <>
      <ModuleShell
      eyebrow="Documents"
      title="Cost & Pricing Sheets"
      summary={`${cps_sheets.length} documents total`}
      tone="blue"
      onPrimaryAction={() => navigate('/cost-pricing-sheets/new')}
      searchValue={state.search}
      onSearchChange={(value) => patchUpdate({ search: value } as any)}
      searchPlaceholder="Search Cost & Pricing Sheets..."
      hasActiveFilters={Boolean(state.statuses.length > 0 || state.dateRange.from || state.dateRange.to)}
      onResetFilters={reset}
      onFilterClick={() => setShowFilterOverlay(prev => !prev)}
      headerActions={
        <ContextualExportDropdown
          domain="CPS_SHEETS"
          data={cps_sheets as unknown as Record<string, unknown>[]}
          supportedFormats={['CSV_SUMMARY', 'CSV_FLATTENED_LINE_ITEMS', 'JSON_RAW']}
          recordCount={cps_sheets.length}
        />
      }
      records={loading ? [] : cps_sheets}
      filterOverlay={
        <QueryFilterOverlay open={showFilterOverlay} onClose={() => setShowFilterOverlay(false)} module="cps_sheets" />
      }
      renderRow={(cps) => (
        <ModuleRowCard
          key={cps.id}
          title={cps.client_name || cps.title || 'Untitled Cost & Pricing Sheet'}
          subtitle={cps.cps_number || 'Cost & Pricing Sheet'}
          tertiary={formatCpsDate(cps.issue_date) || 'No date'}
          statusLabel={cps.status || 'open'}
          statusClassName={cps.status === 'approved' ? 'bg-bd-status-success-bg text-bd-status-success-text' : 'bg-bd-status-warning-bg text-bd-status-warning-text'}
          onClick={() => navigate(`/cost-pricing-sheets/${cps.id}`)}
          onActionClick={() => setActiveCps(cps)}
        />
      )}
    >
      {loading && (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

    </ModuleShell>
    <MobileFab onClick={() => navigate('/cost-pricing-sheets/new')} ariaLabel="Create Cost & Pricing Sheet" />
 
    <InvoiceListActionSheet
      open={Boolean(activeCps)}
      onOpenChange={(open) => !open && setActiveCps(null)}
      eyebrow={`Cost & Pricing Sheet ${activeCps?.cps_number}`}
      title={activeCps?.title || 'Untitled Cost & Pricing Sheet'}
      subtitle={activeCps?.client_name || undefined}
      actions={activeCps ? [
        { key: 'view', label: 'View / Export', icon: <Eye className="h-6 w-6" />, onClick: () => navigate(`/cost-pricing-sheets/${activeCps.id}`) },
        { key: 'edit', label: 'Edit Cost & Pricing Sheet', icon: <Pencil className="h-6 w-6" />, onClick: () => navigate(`/cost-pricing-sheets/edit/${activeCps.id}`) },
        { 
          key: 'archive', 
          label: isArchiving ? 'Archiving...' : 'Archive', 
          icon: isArchiving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Archive className="h-6 w-6" />, 
          onClick: () => setArchiveId(activeCps.id),
          closeOnClick: false
        },
      ] : []}
      deleteAction={activeCps ? {
        key: 'delete',
        label: isDeleting ? 'Deleting...' : 'Delete Cost & Pricing Sheet',
        icon: isDeleting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Trash2 className="h-6 w-6" />,
        onClick: () => setDeleteId(activeCps.id),
        closeOnClick: false
      } : undefined}
    />

    <ConfirmActionDialog
      open={archiveId !== null}
      onOpenChange={(open) => !open && setArchiveId(null)}
      title="Archive this Cost & Pricing Sheet?"
      description="This will move the Cost & Pricing Sheet to the archive. You can restore it later from Settings."
      confirmLabel="Archive"
      loading={isArchiving}
      onConfirm={handleArchive}
    />

    <ConfirmActionDialog
      open={deleteId !== null}
      onOpenChange={(open) => !open && setDeleteId(null)}
      title="Delete this Cost & Pricing Sheet?"
      description="This action is permanent and cannot be undone."
      confirmLabel="Delete"
      variant="destructive"
      loading={isDeleting}
      onConfirm={handleDelete}
    />

  </>
)
}
