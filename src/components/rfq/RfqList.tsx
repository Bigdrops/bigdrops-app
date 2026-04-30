import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/supabase'
import { Rfq } from '@/domain/rfq/types'
import { normalizeDbRfq } from '@/domain/rfq/normalize'
import MobileFab from '@/components/layout/MobileFab'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import { toast } from '@/hooks/use-toast'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'

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

export const RfqList: React.FC = () => {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeRfq, setActiveRfq] = useState<Rfq | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadRfqs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rfqs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading RFQs', description: error.message, variant: 'destructive' });
    } else {
      setRfqs((data || []).map(row => normalizeDbRfq(row)));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRfqs();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleteId(null);
    const { error } = await supabase.from('rfqs').delete().eq('id', id);
    if (error) {
       toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
       toast({ title: 'RFQ deleted' });
       loadRfqs();
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
        ] : []}
        deleteAction={activeRfq ? {
          key: 'delete',
          label: 'Delete RFQ',
          icon: <Trash2 className="h-6 w-6" />,
          onClick: () => setDeleteId(activeRfq.id!),
        } : undefined}
      />

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this RFQ?"
        description="This action is permanent and cannot be undone."
        confirmLabel="Delete RFQ"
        onConfirm={() => deleteId && handleDelete(deleteId)}
      />
    </ModuleShell>
  );
};
