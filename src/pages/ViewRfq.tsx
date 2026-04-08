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
import { RfqExportController } from '@/components/rfq/RfqExportController'
import { RfqImagePreviewGrid } from '@/components/rfq/RfqImagePreviewGrid'
import { pdf } from '@react-pdf/renderer'
import { RfqPdfDocument } from '@/components/rfq/RfqPdfDocument'

export default function ViewRfq() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [exportState, setExportState] = useState<'idle' | 'capturing' | 'reviewing'>('idle');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [pdfGenerating, setPdfGenerating] = useState(false);

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
    setShowActions(false);
    setExportState('capturing');
  };

  const handleExportPdf = async () => {
    if (!rfq || pdfGenerating) return;
    setShowActions(false);
    setPdfGenerating(true);
    toast({ title: 'Exporting...', description: 'Generating PDF document.' });

    try {
      const blob = await pdf(<RfqPdfDocument rfq={rfq} items={rfq.items || []} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RFQ_${rfq.rfq_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'PDF Ready', description: 'Document downloaded successfully.' });
    } catch (e) {
      console.error('PDF generation failed', e);
      toast({ title: 'Export failed', description: 'Could not generate PDF.', variant: 'destructive' });
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleDownloadAllImages = () => {
    if (capturedImages.length === 0) return;
    
    // Download each segment (browser standard behavior)
    capturedImages.forEach((src, idx) => {
      const a = document.createElement('a');
      a.href = src;
      a.download = `RFQ_${rfq?.rfq_number}_Segment_${idx + 1}.png`;
      document.body.appendChild(a);
      setTimeout(() => {
        a.click();
        document.body.removeChild(a);
      }, idx * 250); // Stagger downloads to avoid browser blocking
    });
    
    toast({ title: 'Download Started', description: `Downloading ${capturedImages.length} image segments.` });
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
        <main className="flex-1 overflow-y-auto px-4 py-12 flex flex-col items-center bg-slate-50/50">
           <div className="w-full max-w-4xl bg-white shadow-2xl shadow-slate-200/60 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <RfqPreview rfq={rfq} items={rfq.items || []} />
           </div>
           
           <div className="mt-12 mb-32 w-full max-w-md space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Share & Export</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  className="h-16 bg-slate-950 text-white rounded-2xl font-bold gap-3 text-sm shadow-xl shadow-slate-200 hover:scale-[1.02] transition-all"
                  onClick={handleExportImage}
                >
                  <Share2 className="h-5 w-5" />
                  Image
                </Button>
                <Button 
                  variant="outline"
                  className="h-16 border-slate-200 bg-white text-slate-900 rounded-2xl font-bold gap-3 text-sm shadow-sm hover:bg-slate-50 hover:scale-[1.02] transition-all"
                  onClick={handleExportPdf}
                >
                  <Download className="h-5 w-5" />
                  PDF
                </Button>
              </div>

              <Button 
                variant="ghost"
                className="w-full h-12 text-slate-500 font-bold gap-2 text-xs uppercase tracking-widest"
                onClick={() => navigate(`/rfqs/edit/${id}`)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Document
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

      {exportState === 'capturing' && (
        <RfqExportController 
          rfq={rfq}
          items={rfq.items || []}
          onDone={(images) => {
            setCapturedImages(images);
            setExportState('reviewing');
          }}
          onCancel={() => setExportState('idle')}
        />
      )}

      {exportState === 'reviewing' && (
        <RfqImagePreviewGrid 
          images={capturedImages}
          rfqNumber={rfq.rfq_number}
          onClose={() => setExportState('idle')}
          onDownloadAll={handleDownloadAllImages}
        />
      )}
    </Layout>
  );
}
