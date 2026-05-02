import React, { useState } from 'react';
import { Rfq, RfqItem } from '@/domain/rfq/types'
import { createEmptyRfq, createEmptyRfqItem } from '@/domain/rfq/factories'
import { RfqForm } from './RfqForm'
import { RfqPreview } from './RfqPreview'
import { RfqImportSheet } from './RfqImportSheet'
import { Button } from '@/components/ui/button'
import { Wand2, Save, Eye, EyeOff, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RfqEditorProps {
  initialRfq?: Rfq;
  initialItems?: RfqItem[];
  onSave: (rfq: Rfq, items: RfqItem[]) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
}

export const RfqEditor: React.FC<RfqEditorProps> = ({
  initialRfq,
  initialItems,
  onSave,
  onCancel,
  saving = false,
}) => {
  const [rfq, setRfq] = useState<Rfq>(initialRfq || createEmptyRfq());
  const [items, setItems] = useState<RfqItem[]>(initialItems || [createEmptyRfqItem(0)]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const updateRfq = (updates: Partial<Rfq>) => {
    setRfq((prev) => ({ ...prev, ...updates }));
  };

  const handleApplyImport = (importedRfq: Rfq, importedItems: RfqItem[]) => {
    setRfq(prev => ({ ...prev, ...importedRfq, id: prev.id })); // Keep ID
    setItems(importedItems);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[hsl(var(--bd-surface-muted))]">
      {/* Header Sticky */}
      <header className="sticky top-0 z-20 bg-[hsl(var(--bd-surface))]/80 backdrop-blur-md border-b border-[hsl(var(--bd-border))]/50 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel} className="h-9 w-9 rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-3 ml-1">
          <Button 
             variant="ghost" 
             size="sm" 
             className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
             onClick={() => setIsImportOpen(true)}
          >
             <Wand2 className="h-3 w-3 mr-1.5" />
             AI Import
          </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-9 gap-1.5 text-xs font-bold uppercase tracking-wider"
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button
            onClick={() => onSave(rfq, items)}
            disabled={saving}
            size="sm"
            className="h-9 gap-1.5 bg-[hsl(var(--bd-button-primary-bg))] hover:bg-[hsl(var(--bd-button-primary-bg))]/90 text-[hsl(var(--bd-button-primary-text))] font-bold uppercase tracking-wider shadow-sm transition-all active:scale-[0.98]"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save RFQ
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
        {/* Form Panel */}
        <div className={cn(
          "flex-1 overflow-y-auto px-4 py-8 md:px-8",
          showPreview ? "hidden md:block md:w-1/2" : "w-full"
        )}>
          <div className="max-w-xl mx-auto pb-24">
             <RfqForm 
               rfq={rfq} 
               items={items} 
               onUpdateRfq={updateRfq} 
               onUpdateItems={setItems} 
             />
          </div>
        </div>

        {/* Preview Panel */}
        <div className={cn(
          "flex-1 overflow-y-auto bg-[hsl(var(--bd-surface-muted))] p-4 md:p-8 flex items-start justify-center",
          showPreview ? "block md:w-1/2" : "hidden"
        )}>
          <div className="w-full max-w-sm sticky top-0 animate-in fade-in zoom-in-95 duration-300">
             <RfqPreview
               rfq={rfq}
               items={items}
               rows={rfq.table_rows}
               columns={rfq.table_columns}
             />
             <div className="mt-8 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mobile Layout Preview</p>
             </div>
          </div>
        </div>
      </main>

      <RfqImportSheet 
        open={isImportOpen} 
        onOpenChange={setIsImportOpen} 
        onApply={handleApplyImport}
      />
    </div>
  );
};
