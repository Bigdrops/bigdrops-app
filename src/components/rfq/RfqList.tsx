import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/supabase'
import { Rfq } from '@/domain/rfq/types'
import { normalizeDbRfq } from '@/domain/rfq/normalize'
import MobileListPageShell from '@/components/layout/MobileListPageShell'
import MobileFab from '@/components/layout/MobileFab'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import { toast } from '@/hooks/use-toast'

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
    <MobileListPageShell
      eyebrow="Inventory"
      title="Request for Quotes"
      summary={`${rfqs.length} documents`}
      tone="blue"
      onPrimaryAction={() => navigate('/rfqs/new')}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search RFQs..."
    >
      <div className="px-1">
        {loading && rfqs.length === 0 ? (
          <div className="p-12 flex justify-center italic text-muted-foreground opacity-50">Loading RFQs...</div>
        ) : filteredRfqs.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-muted-foreground">
            {search ? 'No matches found' : 'No RFQs yet. Create one to request prices from vendors.'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            {filteredRfqs.map((rfq, index) => {
              const statusMeta = getRfqStatusMeta(rfq.expiry_date)
              const issueDate = formatCompactDate(rfq.issue_date)
              const expiryDate = formatCompactDate(rfq.expiry_date)

              return (
                <div
                  key={rfq.id}
                  onClick={() => navigate(`/rfqs/${rfq.id}`)}
                  className={`cursor-pointer px-4 py-4 transition hover:bg-muted/20 ${index === 0 ? '' : 'border-t border-border/80'}`}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">RFQ</div>
                        <div className="mt-1 truncate text-[15px] font-extrabold leading-5 tracking-[-0.02em] text-foreground">
                          {rfq.title || 'Untitled RFQ'}
                        </div>
                        <div className="mt-1 truncate text-[13px] leading-5 text-muted-foreground">
                          {rfq.vendor_name || 'Guest vendor'}
                        </div>
                        <div className="mt-1 truncate text-[12px] leading-5 text-muted-foreground">
                          {rfq.rfq_number}
                          {issueDate ? ` · Issued ${issueDate}` : ''}
                          {expiryDate ? ` · Due ${expiryDate}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="min-w-[86px] text-right">
                        <div className={`inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-bold ${statusMeta.className}`}>
                          {statusMeta.label}
                        </div>
                        <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          {expiryDate ? `Due ${expiryDate}` : 'Draft'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveRfq(rfq);
                        }}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-background text-foreground shadow-sm"
                        aria-label={`Open actions for ${rfq.rfq_number || 'RFQ'}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <MobileFab onClick={() => navigate('/rfqs/new')} ariaLabel="Create RFQ">
        <Plus className="h-7 w-7" />
      </MobileFab>

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
    </MobileListPageShell>
  );
};
