import React, { useMemo } from 'react';
import { Rfq, RfqItem } from '@/domain/rfq/types'

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
 * This matches the table-first styling of RfqPreview but is optimized for reliable image/PDF export.
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
      ref={onRef}
      className="w-[375px] min-h-[700px] flex flex-col p-6 font-sans overflow-hidden box-border shadow-none border"
      style={{ ...styles.container, ...styles.border }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b pb-4" style={styles.border}>
        <div>
          {isFirstPage ? (
              <>
                {rfq.show_brand_name && (
                    <h1 className="text-sm font-black tracking-tighter uppercase mb-0.5 leading-none" style={styles.accent}>
                      {rfq.brand_name_override || 'BIGDROPS'}
                    </h1>
                )}
                <div className="text-[12px] font-black uppercase tracking-tight leading-none mb-1">{rfq.title || 'REQUEST FOR QUOTE'}</div>
                <div className="text-[9px] font-mono opacity-40 tabular-nums">#{rfq.rfq_number || '---'}</div>
              </>
          ) : (
             <div className="flex flex-col">
                <div className="text-[11px] font-bold uppercase tracking-tight" style={styles.accent}>{rfq.rfq_number}</div>
                <div className="text-[8px] opacity-40 uppercase font-mono tracking-widest">CONTINUED — {pageIndex + 1} OF {totalPages}</div>
             </div>
          )}
        </div>
        
        {rfq.show_vendor_identity && (
          <div className="text-right">
             <div className="text-[8px] font-bold opacity-40 uppercase mb-0.5 tracking-widest">To Vendor</div>
             <div className="text-[10px] font-black uppercase tracking-tight leading-none mb-1">{rfq.vendor_name || 'GUEST VENDOR'}</div>
             <div className="text-[8px] font-medium opacity-50 tabular-nums">{rfq.issue_date}</div>
          </div>
        )}
      </div>

      {/* Segment Items - Table Structure */}
      <div className="flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b" style={styles.border}>
              <th className="py-1 px-0.5 text-[8px] font-black uppercase tracking-widest opacity-40 w-5">#</th>
              <th className="py-1 px-1 text-[8px] font-black uppercase tracking-widest opacity-40">Item</th>
              <th className="py-1 px-1 text-[8px] font-black uppercase tracking-widest opacity-40 text-right w-10">Qty</th>
              <th className="py-1 px-1 text-[8px] font-black uppercase tracking-widest opacity-40 w-10">Unit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <React.Fragment key={item.id || item._uiKey}>
                <tr className="border-b" style={styles.border}>
                  <td className="py-2 px-0.5 align-top font-mono text-[9px] opacity-30">{String(idx + 1 + (pageIndex * items.length)).padStart(2, '0')}</td>
                  <td className="py-2 px-1 align-top">
                    <div className="text-[11px] font-bold leading-tight line-clamp-2">{item.description || 'Untitled Item'}</div>
                    {item.specification && (
                      <div className="text-[9px] font-medium opacity-60 mt-0.5 leading-snug line-clamp-3">{item.specification}</div>
                    )}
                  </td>
                  <td className="py-2 px-1 align-top text-right font-black tabular-nums text-xs">{item.quantity}</td>
                  <td className="py-2 px-1 align-top text-[8px] font-bold uppercase opacity-50">{item.unit || '-'}</td>
                </tr>
                {item.notes && (
                  <tr className="border-b" style={styles.border}>
                    <td className="py-1 px-0.5"></td>
                    <td colSpan={3} className="py-1.5 px-1 pb-3">
                      <div className="flex items-start gap-1.5 border-l-2 pl-2" style={styles.border}>
                         <div className="text-[9px] opacity-60 italic leading-snug">{item.notes}</div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Branding - Only on last page */}
      <div className="mt-8 pt-4 border-t opacity-20 flex justify-between items-end border-current/10" style={styles.border}>
        <div className="text-[8px] font-mono tracking-tighter uppercase">Bigdrops Procurement Protocol</div>
        <div className="text-[9px] font-bold tabular-nums uppercase">
           {pageIndex + 1} / {totalPages}
        </div>
      </div>
    </div>
  );
};
