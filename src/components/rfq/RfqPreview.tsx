import React, { useMemo } from 'react';
import { Rfq, RfqItem } from '@/domain/rfq/types'

interface RfqPreviewProps {
  rfq: Rfq;
  items: RfqItem[];
}

export const RfqPreview: React.FC<RfqPreviewProps> = ({ rfq, items }) => {
  const displayItems = useMemo(() => {
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

  const styles = {
    container: {
      backgroundColor: rfq.background_color,
      color: rfq.text_color,
    },
    border: {
      borderColor: rfq.border_color,
    },
    accent: {
      color: rfq.accent_color,
    },
    accentBg: {
      backgroundColor: rfq.accent_color,
    }
  };

  return (
    <div 
      className="w-full min-h-[700px] shadow-sm flex flex-col p-8 font-sans overflow-hidden transition-all duration-300 border"
      style={{ ...styles.container, ...styles.border }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b" style={styles.border}>
        <div>
          {rfq.show_brand_name && (
            <h1 className="text-xl font-black tracking-tighter uppercase mb-1" style={styles.accent}>
              {rfq.brand_name_override || 'BIGDROPS'}
            </h1>
          )}
          <div className="text-2xl font-black uppercase tracking-tight">{rfq.title || 'REQUEST FOR QUOTE'}</div>
          <div className="text-xs font-mono mt-1 opacity-60 tabular-nums">NO. {rfq.rfq_number || '---'}</div>
        </div>
        
        {rfq.show_vendor_identity && (
          <div className="text-right animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="text-[10px] font-bold opacity-40 uppercase mb-1 tracking-widest">To Vendor</div>
            <div className="text-base font-black uppercase tracking-tight">{rfq.vendor_name || 'GUEST VENDOR'}</div>
            <div className="text-xs font-medium opacity-60">{rfq.vendor_contact}</div>
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {rfq.issue_date && (
          <div>
            <div className="text-[10px] font-bold opacity-40 uppercase mb-0.5 tracking-widest">Issue Date</div>
            <div className="text-sm font-bold tabular-nums">{rfq.issue_date}</div>
          </div>
        )}
        {rfq.notes && (
          <div className="col-span-2">
            <div className="text-[10px] font-bold opacity-40 uppercase mb-1 tracking-widest">Project Notes</div>
            <div className="text-xs opacity-80 leading-relaxed whitespace-pre-wrap max-w-2xl">{rfq.notes}</div>
          </div>
        )}
      </div>

      {/* Table Body */}
      <div className="flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2" style={styles.border}>
              <th className="py-2 px-1 text-[10px] font-black uppercase tracking-widest opacity-40 w-8">#</th>
              <th className="py-2 px-2 text-[10px] font-black uppercase tracking-widest opacity-40">Item / Description</th>
              <th className="py-2 px-2 text-[10px] font-black uppercase tracking-widest opacity-40">Specification</th>
              <th className="py-2 px-2 text-[10px] font-black uppercase tracking-widest opacity-40 text-right w-16">Qty</th>
              <th className="py-2 px-2 text-[10px] font-black uppercase tracking-widest opacity-40 w-16">Unit</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center italic opacity-30 text-sm">No items added yet</td>
              </tr>
            ) : (
              displayItems.map((item, idx) => (
                <React.Fragment key={item.id || item._uiKey}>
                  <tr className="border-b" style={styles.border}>
                    <td className="py-4 px-1 align-top font-mono text-[11px] opacity-40">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="py-4 px-2 align-top">
                      <div className="text-sm font-bold leading-tight">{item.description || 'Untitled Item'}</div>
                    </td>
                    <td className="py-4 px-2 align-top">
                      {item.specification && (
                        <div className="text-[11px] font-medium leading-relaxed opacity-80 whitespace-pre-wrap">{item.specification}</div>
                      )}
                    </td>
                    <td className="py-4 px-2 align-top text-right font-black tabular-nums text-sm">{item.quantity}</td>
                    <td className="py-4 px-2 align-top text-[10px] font-bold uppercase opacity-60">{item.unit || '-'}</td>
                  </tr>
                  {item.notes && (
                    <tr className="border-b group" style={styles.border}>
                      <td className="py-2 px-1"></td>
                      <td colSpan={4} className="py-2 px-2 pb-4">
                        <div className="flex items-start gap-2">
                           <div className="h-4 w-0.5 rounded-full mt-0.5" style={styles.accentBg} />
                           <div className="text-[11px] opacity-60 italic leading-snug">{item.notes}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Branding - Minimal */}
      <div className="mt-12 pt-6 border-t opacity-20 flex justify-between items-center" style={styles.border}>
        <div className="text-[9px] font-mono tracking-tighter uppercase">Bigdrops Procurement Protocol</div>
        <div className="text-[9px] font-mono tabular-nums uppercase">Generated {new Date().toLocaleDateString()}</div>
      </div>
    </div>
  );
};
