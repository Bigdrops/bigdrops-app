import React from 'react';
import { Rfq, RfqItem } from '@/domain/rfq/types'
import { createEmptyRfqItem } from '@/domain/rfq/factories'
import { RfqItemCard } from './RfqItemCard'
import { RfqStyleControls } from './RfqStyleControls'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Shuffle, FileText, Layout, List } from 'lucide-react'
import { pageFormLabelClassName } from '@/components/ui/form-page-styles'

interface RfqFormProps {
  rfq: Rfq;
  items: RfqItem[];
  onUpdateRfq: (updates: Partial<Rfq>) => void;
  onUpdateItems: (items: RfqItem[]) => void;
}

export const RfqForm: React.FC<RfqFormProps> = ({
  rfq,
  items,
  onUpdateRfq,
  onUpdateItems,
}) => {
  const addItem = () => {
    onUpdateItems([...items, createEmptyRfqItem(items.length)]);
  };

  const updateItem = (index: number, updates: Partial<RfqItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onUpdateItems(newItems);
  };

  const removeItem = (index: number) => {
    onUpdateItems(items.filter((_, i) => i !== index));
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    
    // Refresh sort orders
    const normalized = newItems.map((item, idx) => ({ ...item, sort_order: idx }));
    onUpdateItems(normalized);
  };

  const reshuffle = () => {
    onUpdateRfq({ export_order_seed: Math.floor(Math.random() * 1000000) });
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid grid-cols-3 mb-6 bg-muted/30">
          <TabsTrigger value="details">
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
          <TabsTrigger value="items">
            <List className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Items</span>
          </TabsTrigger>
          <TabsTrigger value="style">
            <Layout className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Style</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 animate-in slide-in-from-left-2 duration-300">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className={pageFormLabelClassName}>RFQ Title</Label>
                <Input
                  value={rfq.title}
                  onChange={(e) => onUpdateRfq({ title: e.target.value })}
                  placeholder="e.g. Q2 Raw Materials Supply"
                  className="mt-1 font-bold h-12 text-lg"
                />
              </div>
              <div>
                <Label className={pageFormLabelClassName}>RFQ Number</Label>
                <Input
                  value={rfq.rfq_number}
                  onChange={(e) => onUpdateRfq({ rfq_number: e.target.value })}
                  placeholder="RFQ-2024-001"
                  className="mt-1 font-mono uppercase"
                />
              </div>
              <div>
                <Label className={pageFormLabelClassName}>Issue Date</Label>
                <Input
                  type="date"
                  value={rfq.issue_date}
                  onChange={(e) => onUpdateRfq({ issue_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div>
                <Label className={pageFormLabelClassName}>Vendor/Guest Name</Label>
                <Input
                  value={rfq.vendor_name}
                  onChange={(e) => onUpdateRfq({ vendor_name: e.target.value })}
                  placeholder="Who are you requesting from?"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className={pageFormLabelClassName}>Vendor Contact Info</Label>
                <Input
                  value={rfq.vendor_contact}
                  onChange={(e) => onUpdateRfq({ vendor_contact: e.target.value })}
                  placeholder="Email, Phone, or Person"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className={pageFormLabelClassName}>Show Brand Name</Label>
                  <p className="text-[10px] text-muted-foreground">Toggle "BIGDROPS" or custom header</p>
                </div>
                <Switch
                  checked={rfq.show_brand_name}
                  onCheckedChange={(checked) => onUpdateRfq({ show_brand_name: checked })}
                />
              </div>
              {rfq.show_brand_name && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <Label className={pageFormLabelClassName}>Brand Name Override</Label>
                  <Input
                    value={rfq.brand_name_override}
                    onChange={(e) => onUpdateRfq({ brand_name_override: e.target.value })}
                    placeholder="e.g. PREMIUM SUPPLY CO."
                    className="mt-1 font-black uppercase tracking-tight"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <Label className={pageFormLabelClassName}>General Notes / Conditions</Label>
              <Textarea
                value={rfq.notes}
                onChange={(e) => onUpdateRfq({ notes: e.target.value })}
                placeholder="Deadline, shipping terms, etc."
                className="mt-1 min-h-[100px]"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-4 animate-in slide-in-from-right-2 duration-300">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
              {items.length} items listed
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={reshuffle}
              className="h-8 gap-1.5 text-[10px] font-bold uppercase"
            >
              <Shuffle className="h-3 w-3" />
              Reshuffle View
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <RfqItemCard
                key={item.id || item._uiKey}
                item={item}
                index={index}
                onUpdate={(updates) => updateItem(index, updates)}
                onRemove={() => removeItem(index)}
                onMoveUp={() => moveItem(index, index - 1)}
                onMoveDown={() => moveItem(index, index + 1)}
                isFirst={index === 0}
                isLast={index === items.length - 1}
              />
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full h-14 border-2 rounded-xl group hover:border-primary/50"
            onClick={addItem}
          >
            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
              <div className="h-6 w-6 rounded-full border border-current flex items-center justify-center">
                <Plus className="h-3 w-3" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Add Item</span>
            </div>
          </Button>
        </TabsContent>

        <TabsContent value="style" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <RfqStyleControls rfq={rfq} onUpdate={onUpdateRfq} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
