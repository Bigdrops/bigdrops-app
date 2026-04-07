import React, { useMemo } from 'react';
import { Rfq, RfqItem, RFQ_PALETTES } from '@/domain/rfq/types'
import { cn } from '@/lib/utils'

interface RfqExportSegmentProps {
  rfq: Rfq;
  items: RfqItem[];
  pageIndex: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  onRef?: (el: HTMLDivElement | null) => void;
}

/**
 * Single segmented view for RFQ export.
 * This should match the styling of RfqPreview but be optimized for reliable image/PDF export.
 * Dimensions are kept stable (iPhone-ish screen aspect ratio) for mobile sharing compatibility.
 */
export const RfqExportSegment: React.FC<RfqExportSegmentProps> = ({ 
    rfq, 
    items, 
    pageIndex, 
    totalPages, 
    isFirstPage, 
    isLastPage,
    onRef
}) => {
  const bgStyle = useMemo(() => {
    if (rfq.background_mode === 'palette') {
      const palette = RFQ_PALETTES.find(p => p.name === rfq.palette_name) || RFQ_PALETTES[0];
      return {
        background: `linear-gradient(135deg, ${palette.colors[0]} 0%, ${palette.colors[1]} 100%)`,
        color: rfq.text_color || palette.colors[3]
      };
    }
    if (rfq.background_mode === 'gradient') {
      return {
        background: `linear-gradient(135deg, ${rfq.background_primary} 0%, ${rfq.background_secondary} 100%)`,
        color: rfq.text_color
      };
    }
    return {
      backgroundColor: rfq.background_primary,
      color: rfq.text_color
    };
  }, [rfq.background_mode, rfq.palette_name, rfq.background_primary, rfq.background_secondary, rfq.text_color]);

  return (
    <div 
      ref={onRef}
      className="w-[375px] min-h-[700px] flex flex-col p-8 font-sans overflow-hidden box-border shadow-none"
      style={bgStyle}
    >
      {/* Header - Only on first page or as a mini header? Let's do mini on other pages. */}
      <div className="flex justify-between items-start mb-8 border-b-2 pb-4 border-current/10">
        <div>
          {isFirstPage ? (
              <>
                {rfq.show_brand_name && (
                    <h1 className="text-xl font-black tracking-tight uppercase mb-1 leading-none">
                    {rfq.brand_name_override || 'BIGDROPS'}
                    </h1>
                )}
                <div className="text-[11px] font-bold opacity-60 uppercase tracking-[0.2em]">{rfq.title || 'REQUEST FOR QUOTE'}</div>
                <div className="text-[9px] font-mono mt-0.5 opacity-40 tabular-nums">#{rfq.rfq_number || '---'}</div>
              </>
          ) : (
             <div className="flex flex-col">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em]">{rfq.rfq_number}</div>
                <div className="text-[9px] opacity-40 uppercase">CONTINUED — PAGE {pageIndex + 1} OF {totalPages}</div>
             </div>
          )}
        </div>
        <div className="text-right">
           <div className="text-[9px] font-bold opacity-40 uppercase mb-0.5">Prepared For</div>
           <div className="text-sm font-black uppercase tracking-tight">{rfq.vendor_name || 'GUEST VENDOR'}</div>
           <div className="text-[10px] font-medium opacity-50">{rfq.issue_date}</div>
        </div>
      </div>

      {/* Segment Items */}
      <div className="flex-1 space-y-3">
        {items.map((item, idx) => (
          <div 
            key={item.id || item._uiKey}
            className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold leading-tight truncate">{item.description || 'Untitled Item'}</div>
                {item.specification && (
                  <div className="text-[10px] font-medium opacity-60 mt-0.5 leading-snug whitespace-pre-wrap line-clamp-3 italic">{item.specification}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-black tabular-nums leading-none">{item.quantity}</div>
                <div className="text-[8px] font-bold uppercase opacity-40 mt-0.5">{item.unit || 'UNITS'}</div>
              </div>
            </div>
            {item.notes && (
                <div className="mt-2 pt-2 border-t border-current/5">
                    <div className="text-[10px] opacity-60 italic leading-snug">{item.notes}</div>
                </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer - Only on last page */}
      <div className="mt-8 pt-6 border-t-2 border-current/10 flex justify-between items-end">
        <div className="text-[9px] font-mono opacity-20 uppercase tracking-widest">
           Bigdrops RFQ-EXP v1.0
        </div>
        <div className="text-[10px] font-black opacity-40 uppercase tracking-widest tabular-nums">
           {pageIndex + 1} / {totalPages}
        </div>
      </div>
    </div>
  );
};
