import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2, Check, ExternalLink, X } from 'lucide-react';
import { feedback } from '@/lib/feedback';

interface RfqImagePreviewGridProps {
  images: string[];
  rfqNumber: string;
  onClose: () => void;
  onDownloadAll: () => void;
}

/**
 * Modern modal for viewing segmented export images.
 * Users can review the segments before final action.
 */
export const RfqImagePreviewGrid: React.FC<RfqImagePreviewGridProps> = ({ images, rfqNumber, onClose, onDownloadAll }) => {
  const handleShare = async () => {
    const toastId = 'rfq-image-sharing';
    try {
      if (typeof navigator.share === 'undefined') {
        feedback.info('Sharing not supported', {
          description: 'Your browser does not support native sharing.',
        });
        return;
      }
      
      // Browser sharing for first image or blob conversion
      feedback.loading('Sharing...', {
        description: 'Preparing images for sharing.',
        id: toastId,
      });
      
      // Simple blob download as fallback/step
      onDownloadAll();
      feedback.dismiss(toastId);
    } catch (e) {
      feedback.dismiss(toastId);
      feedback.error('Sharing failed', {
        description: e instanceof Error ? e.message : 'Could not prepare the shared output.',
      });
      console.error('Sharing failed', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-xl flex flex-col pt-safe px-4 pb-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <header className="h-16 flex items-center justify-between border-b border-border/50 px-2 shrink-0">
         <div>
            <h3 className="text-xl font-black tracking-tight uppercase">Segmented Ready</h3>
            <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em]">{images.length} {images.length === 1 ? 'Segment' : 'Segments'}</p>
         </div>
         <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-muted/30">
            <X className="h-5 w-5" />
         </Button>
      </header>

      <main className="flex-1 overflow-y-auto py-8">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {images.map((src, i) => (
               <div key={i} className="group relative rounded-[28px] overflow-hidden border border-border/50 shadow-2xl transition-transform hover:scale-[1.02]">
                  <img src={src} className="w-full h-auto block" alt={`Segment ${i+1}`} />
                  <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md">
                     PG {i+1}
                  </div>
               </div>
            ))}
         </div>
      </main>

      <footer className="shrink-0 p-4 bg-muted/30 rounded-[32px] border border-border/50 flex flex-col md:flex-row gap-3 items-center justify-between max-w-sm mx-auto w-full">
         <Button 
            className="w-full flex-1 h-14 bg-slate-950 text-white rounded-[20px] font-black gap-2 text-base shadow-xl"
            onClick={onDownloadAll}
         >
            <Download className="h-5 w-5" />
            Download {images.length > 1 ? 'Combined' : 'Image'}
         </Button>
         <Button 
            variant="outline"
            className="w-full flex-1 h-14 border-slate-200 bg-white text-slate-900 rounded-[20px] font-black gap-2 text-base"
            onClick={handleShare}
         >
            <Share2 className="h-5 w-5" />
            Share Output
         </Button>
      </footer>
    </div>
  );
};
