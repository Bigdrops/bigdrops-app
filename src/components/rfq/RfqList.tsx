import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Eye, Trash2, Search, FileText } from 'lucide-react'
import { supabase } from '@/supabase'
import { Rfq } from '@/domain/rfq/types'
import { normalizeDbRfq } from '@/domain/rfq/normalize'
import MobileListPageShell from '@/components/layout/MobileListPageShell'
import { EmptyState } from '@/components/layout/EmptyState'
import MobileFab from '@/components/layout/MobileFab'
import ListActionSheet from '@/components/layout/ListActionSheet'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { toast } from '@/hooks/use-toast'

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
  const hasActiveSearch = Boolean(search.trim())

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
      <div className="grid gap-3 px-1">
        {loading && rfqs.length === 0 ? (
          <div className="p-12 flex justify-center italic text-muted-foreground opacity-50">Loading RFQs...</div>
        ) : filteredRfqs.length === 0 ? (
          <EmptyState
            title={hasActiveSearch ? 'No results found' : 'No RFQs yet'}
            description={
              hasActiveSearch
                ? 'Try a different search term.'
                : 'Create your first RFQ to request vendor pricing.'
            }
            actionLabel={hasActiveSearch ? 'Clear search' : 'Create RFQ'}
            onAction={hasActiveSearch ? () => setSearch('') : () => navigate('/rfqs/new')}
          />
        ) : (
          filteredRfqs.map((rfq) => (
            <div
              key={rfq.id}
              onClick={() => navigate(`/rfqs/${rfq.id}`)}
              className="cursor-pointer rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-xl font-black text-blue-600">
                  R
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">RFQ</div>
                  <div className="mt-0.5 text-lg font-black tracking-tight text-slate-950 truncate">{rfq.title || 'Untitled RFQ'}</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-500 truncate">{rfq.vendor_name || 'Guest Vendor'}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveRfq(rfq);
                  }}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold shadow-sm"
                >
                  <span className="mb-1">⋯</span>
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
                 <div className="flex items-center gap-2">
                    <span className="font-mono">{rfq.rfq_number}</span>
                    <span className="opacity-30">•</span>
                    <span>{rfq.issue_date}</span>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      <MobileFab onClick={() => navigate('/rfqs/new')} ariaLabel="Create RFQ">
        <Plus className="h-7 w-7" />
      </MobileFab>

      <ListActionSheet
        open={Boolean(activeRfq)}
        onOpenChange={(open) => !open && setActiveRfq(null)}
        eyebrow={`RFQ ${activeRfq?.rfq_number}`}
        title={activeRfq?.vendor_name || 'Guest'}
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
