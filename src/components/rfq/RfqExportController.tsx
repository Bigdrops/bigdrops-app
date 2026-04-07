import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Rfq, RfqItem } from '@/domain/rfq/types';
import { chunkRfqItems, getReshuffledItems } from '@/domain/rfq/exportHelpers';
import { RfqExportSegment } from './RfqExportView';
import { toPng } from 'html-to-image';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface RfqExportControllerProps {
  rfq: Rfq | null;
  items: RfqItem[];
  onDone: (images: string[]) => void;
  onCancel: () => void;
}

/**
 * Controller that renders segments in a hidden area,
 * captures them as individual images using html-to-image,
 * and provides them to the parent.
 */
export const RfqExportController: React.FC<RfqExportControllerProps> = ({ rfq, items, onDone, onCancel }) => {
  const [capturing, setCapturing] = useState(false);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const displayItems = useMemo(() => {
    if (!rfq) return [];
    return getReshuffledItems(rfq, items);
  }, [rfq, items]);

  const chunks = useMemo(() => chunkRfqItems(displayItems, 6), [displayItems]);

  const captureAll = useCallback(async () => {
    if (!rfq || chunks.length === 0) return;
    setCapturing(true);
    
    // Wait for a few ticks to ensure all segments are mounted and rendered
    await new Promise(r => setTimeout(r, 800));

    try {
      const images: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const el = segmentRefs.current[i];
        if (el) {
          // Increase quality and resolution for perfect export
          const dataUrl = await toPng(el, { 
            pixelRatio: 2, 
            quality: 0.95,
            skipFonts: false 
          });
          images.push(dataUrl);
        }
      }
      onDone(images);
    } catch (e) {
      console.error('Capture failed', e);
      toast({ title: 'Export failed', description: 'Could not capture segments.', variant: 'destructive' });
      onCancel();
    } finally {
      setCapturing(false);
    }
  }, [rfq, chunks, onDone, onCancel]);

  useEffect(() => {
    if (rfq && chunks.length > 0) {
      captureAll();
    }
  }, [rfq, chunks, captureAll]);

  if (!rfq) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center">
       <div className="text-center p-8 bg-card rounded-[32px] border border-border/50 shadow-2xl flex flex-col items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-full animate-spin-slow">
             <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight">Generating Output</h3>
            <p className="text-sm text-muted-foreground mt-1">Preparing {chunks.length} segmented {chunks.length === 1 ? 'image' : 'images'}...</p>
          </div>
       </div>

       {/* Hidden area to render segments for capture */}
       <div className="fixed left-[-9999px] top-[-9999px] pointer-events-none opacity-0">
          {chunks.map((chunk, idx) => (
             <RfqExportSegment 
                key={`raw_seg_${idx}`}
                rfq={rfq}
                items={chunk}
                pageIndex={idx}
                totalPages={chunks.length}
                isFirstPage={idx === 0}
                isLastPage={idx === chunks.length - 1}
                onRef={(el) => { segmentRefs.current[idx] = el; }}
             />
          ))}
       </div>
    </div>
  );
};
