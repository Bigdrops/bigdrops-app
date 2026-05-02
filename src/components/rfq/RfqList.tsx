import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Eye, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/supabase'
import { Rfq, RfqItem } from '@/domain/rfq/types'
import { normalizeDbRfq, denormalizeToDbRfq, denormalizeToDbRfqItem, getNextRfqNumber } from '@/domain/rfq/normalize'
import MobileFab from '@/components/layout/MobileFab'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import { feedback } from '@/lib/feedback'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import { readListCache, writeListCache, isListCacheFresh, invalidateListCache } from '@/lib/cache/listCache'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'

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
      className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    }
  }

  const expiry = new Date(expiryDate)
  if (Number.isNaN(expiry.getTime())) {
    return {
      label: 'Open',
      className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
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
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    }
  }

  return {
    label: 'Open',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  }
}

const RFQ_CACHE_KEY = "bd:list:rfqs:v1:all"
const RFQ_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const RfqList: React.FC = () => {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeRfq, setActiveRfq] = useState<Rfq | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadRfqs = async () => {
    setLoading(true)

    const cached = readListCache<Rfq>(RFQ_CACHE_KEY)
    const fresh = isListCacheFresh(cached, RFQ_CACHE_TTL)

    if (fresh && cached.rows.length > 0) {
      setRfqs(cached.rows.map(row => normalizeDbRfq(row)))
      setLoading(false)
      return
    }

    if (cached && !fresh) {
      setRfqs(cached.rows.map(row => normalizeDbRfq(row)))
      setLoading(true)
      setTimeout(async () => {
        await supabaseFetchAndCache()
      }, 0)
      return
    }

    await supabaseFetchAndCache()
  }

  const supabaseFetchAndCache = async () => {
    const { data, error } = await supabase
      .from('rfqs')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      feedback.error('Error loading RFQs', { description: error.message })
    } else {
      const rows = (data || [])
      setRfqs(rows.map(row => normalizeDbRfq(row)))
      if (rows.length > 0) {
        writeListCache(RFQ_CACHE_KEY, rows)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRfqs();
  }, []);

  const handleArchive = async (id: string) => {
    setIsArchiving(true);
    const { error } = await supabase.from('rfqs').update({ archived_at: new Date().toISOString() }).eq('id', id);
    setIsArchiving(false);
    if (error) {
      feedback.error('Archive failed', { description: error.message });
    } else {
      feedback.success('RFQ archived');
      setRfqs(prev => prev.filter(r => r.id !== id));
      invalidateListCache(RFQ_CACHE_KEY);
      setArchiveId(null);
      setActiveRfq(null);
    }
  };


  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    const { error: itemsError } = await supabase.from('rfq_items').delete().eq('rfq_id', id);
    if (itemsError) {
      setIsDeleting(false);
      feedback.error('Delete failed', { description: itemsError.message });
      return;
    }
    const { error } = await supabase.from('rfqs').delete().eq('id', id);
    setIsDeleting(false);
    if (error) {
       feedback.error('Delete failed', { description: error.message });
    } else {
       feedback.success('RFQ deleted');
       setRfqs(prev => prev.filter(r => r.id !== id))
       invalidateListCache(RFQ_CACHE_KEY);
       setDeleteId(null);
       setActiveRfq(null);
    }
  };

  const filteredRfqs = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return rfqs;
    return rfqs.filter(r => 
      r.rfq_number.toLowerCase().includes(query) || 
      r.vendor_name.toLowerCase().includes(query) ||
      r.title.toLowerCase().includes(query)
    );
  }, [rfqs, search]);

  return (
    <>
      <ModuleShell
      eyebrow="Inventory"
      title="Request for Quotes"
      summary={`${rfqs.length} documents`}
      tone="blue"
      onPrimaryAction={() => navigate('/rfqs/new')}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search RFQs..."
      records={loading ? [] : filteredRfqs}
      renderRow={(rfq) => {
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
  </>
  );
}
