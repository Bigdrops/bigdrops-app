import React, { useState } from 'react';
import { JsonImportLayout } from '@/components/import/JsonImportLayout'
import { rfqImportAdapter } from '@/domain/rfq/importAdapter'
import { Rfq, RfqItem } from '@/domain/rfq/types'
import { RfqPreview } from './RfqPreview'
import { toast } from '@/hooks/use-toast'

interface RfqImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (rfq: Rfq, items: RfqItem[]) => void;
}

export const RfqImportSheet: React.FC<RfqImportSheetProps> = ({
  open,
  onOpenChange,
  onApply,
}) => {
  const [rawInput, setRawInput] = useState('');
  const [parsed, setParsed] = useState<{ rfq: Rfq; items: RfqItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = () => {
    setError(null);
    const result = rfqImportAdapter.parseJson(rawInput);
    if (!result || !result.items) {
      setError('Invalid JSON structure. Ensure it is a valid object with an items array.');
      return;
    }
    setParsed({
      rfq: result as Rfq,
      items: result.items as RfqItem[],
    });
  };

  const handleSave = () => {
    if (parsed) {
      onApply(parsed.rfq, parsed.items);
      toast({ title: 'RFQ imported successfully' });
      onOpenChange(false);
      setRawInput('');
      setParsed(null);
    }
  };

  return (
    <JsonImportLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Import RFQ Data"
      description="Paste RFQ JSON to populate the document"
      promptText={rfqImportAdapter.getPrompt()}
      rawInput={rawInput}
      onRawInputChange={setRawInput}
      onPreview={handlePreview}
      onSave={handleSave}
      isParsed={!!parsed}
      error={error}
      onEditJson={() => setParsed(null)}
      previewContent={
        parsed && (
          <div className="border rounded-2xl overflow-hidden scale-[0.8] origin-top border-border">
             <RfqPreview rfq={parsed.rfq} items={parsed.items} />
          </div>
        )
      }
    />
  );
};
