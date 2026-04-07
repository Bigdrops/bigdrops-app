import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout'
import { RfqPreview } from '@/components/rfq/RfqPreview'
import { Rfq, RfqItem } from '@/domain/rfq/types'
import { normalizeDbRfq } from '@/domain/rfq/normalize'
import { supabase } from '@/supabase'
import { Button } from '@/components/ui/button'
import { Pencil, ArrowLeft, Download, Share2, Trash2, MoreVertical, FileOutput } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import ListActionSheet from '@/components/layout/ListActionSheet'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'

export default function ViewRfq() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [rfqResult, itemsResult] = await Promise.all([
        supabase.from('rfqs').select('*').eq('id', id).single(),
        supabase.from('rfq_items').select('*').eq('rfq_id', id).order('sort_order'),
      ]);

      if (rfqResult.data) {
        setRfq(normalizeDbRfq(rfqResult.data, itemsResult.data || []));
      } else {
        toast({ title: 'RFQ not found', variant: 'destructive' });
        navigate('/rfqs');
      }
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    const { error } = await supabase.from('rfqs').delete().eq('id', id);
    if (error) {
       toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
       toast({ title: 'RFQ deleted' });
       navigate('/rfqs');
    }
  };

  const handleExportImage = () => {
     toast({ title: 'Exporting...', description: 'Preparing segmented mobile image.' });
     // Placeholder for future segmented image export
  };

  const handleExportPdf = () => {
     toast({ title: 'Exporting...', description: 'Generating PDF document.' });
     // Placeholder for future PDF export using @react-pdf/renderer
  };

  if (loading || !rfq) {
    return <Layout title="Loading..." session={null} hidePageHeader><div className="p-12 text-center text-muted-foreground">Loading Document...</div></Layout>;
  }

  return (
    <Layout title={rfq.rfq_number} session={null} hidePageHeader contentClassName="p-0">
      <div className="flex flex-col min-h-screen bg-slate-100">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 h-16 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rfqs')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col items-center">
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Document Detail</span>
             <span className="text-sm font-black text-slate-900">{rfq.rfq_number}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowActions(true)}>
            <MoreVertical className="h-5 w-5" />
          </Button>
        </header>

        {/* Scrollable Preview Area */}
        <main className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center">
           <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <RfqPreview rfq={rfq} items={rfq.items || []} />
           </div>
           
           <div className="mt-8 mb-24 w-full max-w-sm space-y-3">
              <Button 
                className="w-full h-14 bg-slate-950 text-white rounded-2xl font-bold gap-2 text-base shadow-lg shadow-slate-200"
                onClick={handleExportImage}
              >
                <Share2 className="h-5 w-5" />
                Share as Image
              </Button>
              <Button 
                variant="outline"
                className="w-full h-14 border-slate-200 bg-white text-slate-900 rounded-2xl font-bold gap-2 text-base shadow-sm"
                onClick={handleExportPdf}
              >
                <Download className="h-5 w-5" />
                Download PDF
              </Button>
           </div>
        </main>

        {/* Bottom Shortcut bar */}
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/60 backdrop-blur-lg border-t border-slate-100 flex gap-3 md:hidden">
           <Button 
             variant="outline" 
             className="flex-1 h-12 rounded-xl font-bold border-slate-200 gap-2"
             onClick={() => navigate(`/rfqs/edit/${id}`)}
           >
              <Pencil className="h-4 w-4" />
              Edit
           </Button>
           <Button 
             className="flex-1 h-12 rounded-xl font-bold bg-slate-900 text-white gap-2"
             onClick={handleExportImage}
           >
              <Share2 className="h-4 w-4" />
              Share
           </Button>
        </footer>
      </div>

      <ListActionSheet
        open={showActions}
        onOpenChange={setShowActions}
        eyebrow={`RFQ ${rfq.rfq_number}`}
        title={rfq.vendor_name || 'Guest'}
        actions={[
          {
            key: 'edit',
            label: 'Edit Document',
            icon: <Pencil className="h-6 w-6" />,
            onClick: () => navigate(`/rfqs/edit/${id}`),
          },
          {
            key: 'convert',
            label: 'Convert to Quotation',
            icon: <FileOutput className="h-6 w-6" />,
            onClick: () => {
              toast({ title: 'Scaffolding Conversion...', description: 'This feature will map items to a new quotation.' });
            },
          },
          {
            key: 'share',
            label: 'Share Image',
            icon: <Share2 className="h-6 w-6" />,
            onClick: handleExportImage,
          },
          {
            key: 'pdf',
            label: 'Export PDF',
            icon: <Download className="h-6 w-6" />,
            onClick: handleExportPdf,
          },
        ]}
        deleteAction={{
          label: 'Delete RFQ',
          icon: <Trash2 className="h-6 w-6" />,
          onClick: () => setShowDeleteConfirm(true),
        }}
      />

      <ConfirmActionDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete this RFQ?"
        description="This action is permanent and cannot be undone."
        confirmLabel="Delete RFQ"
        onConfirm={handleDelete}
      />
    </Layout>
  );
}
