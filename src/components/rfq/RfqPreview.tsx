import React, { useMemo } from 'react';
import { Rfq, RfqItem, RFQ_PALETTES } from '@/domain/rfq/types'
import { cn } from '@/lib/utils'

interface RfqPreviewProps {
  rfq: Rfq;
  items: RfqItem[];
}

export const RfqPreview: React.FC<RfqPreviewProps> = ({ rfq, items }) => {
  const displayItems = useMemo(() => {
    // Implement reshuffle logic based on seed
    if (!rfq.export_order_seed) return items;
    
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    return [...items].sort((a, b) => {
      const seedA = rfq.export_order_seed + (a.sort_order || 0);
      const seedB = rfq.export_order_seed + (b.sort_order || 0);
      return seededRandom(seedA) - seededRandom(seedB);
    });
  }, [items, rfq.export_order_seed]);

  const backgroundStyle = useMemo(() => {
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
      className="w-full min-h-[700px] shadow-sm flex flex-col p-8 font-sans overflow-hidden transition-all duration-300"
      style={backgroundStyle}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-12 border-b-2 pb-6 border-current/10">
        <div>
          {rfq.show_brand_name && (
            <h1 className="text-2xl font-black tracking-tight uppercase mb-2">
              {rfq.brand_name_override || 'BIGDROPS'}
            </h1>
          )}
          <div className="text-sm font-bold opacity-60 uppercase tracking-widest">{rfq.title || 'REQUEST FOR QUOTE'}</div>
          <div className="text-xs font-mono mt-1 opacity-50 tabular-nums">#{rfq.rfq_number || '---'}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold opacity-40 uppercase mb-1">Prepared For</div>
          <div className="text-lg font-black uppercase tracking-tight">{rfq.vendor_name || 'GUEST VENDOR'}</div>
          <div className="text-sm font-medium opacity-60">{rfq.vendor_contact}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        {displayItems.length === 0 ? (
          <div className="h-40 flex items-center justify-center border-2 border-dashed border-current/10 rounded-2xl opacity-30 italic text-sm">
            No items added yet
          </div>
        ) : (
          <div className="grid gap-3">
            {displayItems.map((item, idx) => (
              <div 
                key={item.id || item._uiKey}
                className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex flex-col gap-1 transition-all hover:scale-[1.01]"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="text-xs font-mono opacity-30 mb-1">0{idx + 1}</div>
                    <div className="text-base font-bold leading-tight">{item.description || 'Untitled Item'}</div>
                    {item.specification && (
                        <div className="text-[11px] font-medium opacity-60 mt-1 leading-relaxed whitespace-pre-wrap">{item.specification}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-black tabular-nums">{item.quantity}</div>
                    <div className="text-[10px] font-bold uppercase opacity-40">{item.unit || 'UNITS'}</div>
                  </div>
                </div>
                {item.notes && (
                  <div className="mt-3 pt-3 border-t border-current/5">
                    <div className="text-[10px] font-bold uppercase opacity-30 mb-1 flex items-center gap-1.5">
                      <div className="h-1 w-1 bg-current rounded-full" /> NOTES
                    </div>
                    <div className="text-[11px] opacity-70 italic leading-snug">{item.notes}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {(rfq.issue_date || rfq.expiry_date || rfq.notes) && (
        <div className="mt-12 pt-8 border-t-2 border-current/10 grid grid-cols-2 gap-8">
          <div className="space-y-4">
             {rfq.notes && (
               <div>
                  <div className="text-[10px] font-bold uppercase opacity-30 mb-1">General Notes</div>
                  <div className="text-xs opacity-70 leading-relaxed whitespace-pre-wrap">{rfq.notes}</div>
               </div>
             )}
          </div>
          <div className="flex flex-col gap-4 text-right">
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <div className="text-[10px] font-bold uppercase opacity-30 mb-0.5">Issue Date</div>
                   <div className="text-sm font-bold tabular-nums">{rfq.issue_date}</div>
                </div>
                <div>
                   <div className="text-[10px] font-bold uppercase opacity-30 mb-0.5">Expiry Date</div>
                   <div className="text-sm font-bold tabular-nums">{rfq.expiry_date || 'N/A'}</div>
                </div>
             </div>
             <div className="mt-auto opacity-20 text-[10px] font-mono leading-none">
                Bigdrops Protocol v1.2 / Internal Document
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
