import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Download, Eye, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Rfq, RfqItem } from '@/domain/rfq/types'
import { normalizeDbRfq, denormalizeToDbRfq, denormalizeToDbRfqItem, getNextRfqNumber } from '@/domain/rfq/normalize'
import { loadRfqsFromSupabase, archiveRfq, deleteRfq } from '@/domain/rfq/rfqService'
import MobileFab from '@/components/layout/MobileFab'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import { feedback } from '@/lib/feedback'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import { readListCache, writeListCache, isListCacheFresh, invalidateListCache } from '@/lib/cache/listCache'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import QueryFilterOverlay from '@/components/query/QueryFilterOverlay'
import { useDocumentQuery } from '@/context/DocumentQueryContext'
import { ContextualExportSheet } from '@/components/export/ContextualExportSheet'
import type { InheritedExportContext } from '@/types/exportHub'

const formatCompactDate = (value?: string) => {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

const getRfqStatusMeta = (expiryDate?: string) => {
  if (!expiryDate) {
    return {
      label: 'Open',
      className: 'bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]',
    }
  }

  const expiry = new Date(expiryDate)
  if (Number.isNaN(expiry.getTime())) {
    return {
      label: 'Open',
      className: 'bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]',
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)

  const diffInDays = Math.round((expiry.getTime() - today.getTime()) / 86400000)

  if (diffInDays < 0) {
    return {
      label: 'Expired',
      className: 'bg-destructive/10 text-destructive',
    }
  }

  if (diffInDays <= 7) {
    return {
      label: 'Due soon',
      className: 'bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]',
    }
  }

  return {
    label: 'Open',
    className: 'bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]',
  }
}

const RFQ_CACHE_KEY = "bd:list:rfqs:v1:all"
const RFQ_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const RfqList: React.FC = () => {
  const navigate = useNavigate();
  const { state, patchUpdate, reset, results, loading } = useDocumentQuery("rfqs");
  const rfqs = results as Rfq[];
  const [activeRfq, setActiveRfq] = useState<Rfq | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFilterOverlay, setShowFilterOverlay] = useState(false);
  const [isExportSheetOpen, setIsExportSheetOpen] = useState(false);

  const handleArchive = async (id: string) => {
    setIsArchiving(true);
    try {
      await archiveRfq(id);
      feedback.success('RFQ archived');
      invalidateListCache(RFQ_CACHE_KEY);
      setArchiveId(null);
      setActiveRfq(null);
      patchUpdate({ search: state.search } as any);
    } catch (error: any) {
      feedback.error('Archive failed', { description: error.message });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteRfq(id);
      feedback.success('RFQ deleted');
      invalidateListCache(RFQ_CACHE_KEY);
      setDeleteId(null);
      setActiveRfq(null);
      patchUpdate({ search: state.search } as any);
    } catch (error: any) {
      feedback.error('Delete failed', { description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const rfqExportContext: InheritedExportContext = {
    clientId: null,
    statuses: state.statuses,
    dateRange: { start: state.dateRange.from, end: state.dateRange.to },
    amountRange: null,
    searchTokens: state.search ? state.search.split(' ') : [],
    sortBy: 'created_at',
    sortDirection: 'desc',
  };


  return (
    <>
      <ModuleShell
      eyebrow="Inventory"
      title="Request for Quotes"
      summary={`${rfqs.length} documents`}
      tone="blue"
      onPrimaryAction={() => navigate('/rfqs/new')}
      searchValue={state.search}
      onSearchChange={(value) => patchUpdate({ search: value } as any)}
      searchPlaceholder="Search RFQs..."
      hasActiveFilters={Boolean(state.statuses.length > 0 || state.dateRange.from || state.dateRange.to)}
      onResetFilters={reset}
      onFilterClick={() => setShowFilterOverlay(true)}
      records={loading ? [] : rfqs}
      filterOverlay={
        <QueryFilterOverlay open={showFilterOverlay} onClose={() => setShowFilterOverlay(false)} module="rfqs" />
      }
      renderRow={(rfq: Rfq) => {
        const statusMeta = getRfqStatusMeta(rfq.expiry_date)
        const expiryDate = formatCompactDate(rfq.expiry_date)
        
        return (
          <ModuleRowCard
            key={rfq.id}
            title={rfq.title || 'Untitled RFQ'}
            subtitle={rfq.rfq_number}
            tertiary={rfq.vendor_name || 'Guest vendor'}
            statusLabel={statusMeta.label}
            statusClassName={statusMeta.className}
            amount={expiryDate ? `Due ${expiryDate}` : undefined}
            onClick={() => navigate(`/rfqs/${rfq.id}`)}
            onActionClick={() => setActiveRfq(rfq)}
          />
        )
      }}
    >
      {loading && (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

    </ModuleShell>
    <MobileFab onClick={() => navigate('/rfqs/new')} ariaLabel="Create RFQ" />

    <InvoiceListActionSheet
      open={Boolean(activeRfq)}
      onOpenChange={(open) => !open && setActiveRfq(null)}
      eyebrow={`RFQ ${activeRfq?.rfq_number}`}
      title={activeRfq?.title || 'Untitled RFQ'}
      subtitle={
        activeRfq
          ? `${activeRfq.vendor_name || 'Guest vendor'}${activeRfq.expiry_date ? ` · Due ${formatCompactDate(activeRfq.expiry_date)}` : ''}`
          : undefined
      }
      actions={activeRfq ? [
        {
          key: 'view',
          label: 'View / Export',
          icon: <Eye className="h-6 w-6" />,
          onClick: () => navigate(`/rfqs/${activeRfq.id}`),
        },
        {
          key: 'edit',
          label: 'Edit RFQ',
          icon: <Pencil className="h-6 w-6" />,
          onClick: () => navigate(`/rfqs/edit/${activeRfq.id}`),
        },
        {
          key: 'archive',
          label: isArchiving ? 'Archiving...' : 'Archive',
          icon: isArchiving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Archive className="h-6 w-6" />,
          onClick: () => setArchiveId(activeRfq.id!),
          closeOnClick: false,
        },
      ] : []}
      deleteAction={activeRfq ? {
        key: 'delete',
        label: isDeleting ? 'Deleting...' : 'Delete RFQ',
        icon: isDeleting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Trash2 className="h-6 w-6" />,
        onClick: () => setDeleteId(activeRfq.id!),
        closeOnClick: false,
      } : undefined}
    />

    <ConfirmActionDialog
      open={archiveId !== null}
      onOpenChange={(open) => !open && setArchiveId(null)}
      title="Archive this RFQ?"
      description="This will move the RFQ to the archive. You can restore it later from Settings."
      confirmLabel="Archive"
      loading={isArchiving}
      onConfirm={() => archiveId && handleArchive(archiveId)}
    />

    <ConfirmActionDialog
      open={deleteId !== null}
      onOpenChange={(open) => !open && setDeleteId(null)}
      title="Delete this RFQ?"
      description="This action is permanent and cannot be undone."
      confirmLabel="Delete"
      variant="destructive"
      loading={isDeleting}
      onConfirm={() => deleteId && handleDelete(deleteId)}
    />
    <ContextualExportSheet isOpen={isExportSheetOpen} onClose={() => setIsExportSheetOpen(false)} domain="RFQS" activeContext={rfqExportContext} supportedFormats={['CSV_SUMMARY', 'JSON_RAW']} />
  </>
  );
}
