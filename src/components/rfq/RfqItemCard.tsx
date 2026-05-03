import React from 'react';
import { Rfq, RfqItem } from '@/domain/rfq/types'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { pageFormLabelClassName } from '@/components/ui/form-page-styles'

interface RfqItemCardProps {
  item: RfqItem;
  index: number;
  onUpdate: (updates: Partial<RfqItem>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const RfqItemCard: React.FC<RfqItemCardProps> = ({
  item,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  return (
    <Card className="p-4 mb-4 relative bg-card border-border shadow-none">
      <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/40" />
          <span className="text-xs font-bold text-muted-foreground/60 tabular-nums">ITEM #{index + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onMoveUp}
            disabled={isFirst}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onMoveDown}
            disabled={isLast}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className={pageFormLabelClassName}>Description</Label>
          <Input
            value={item.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="What are you requesting?"
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className={pageFormLabelClassName}>Quantity</Label>
            <NumericInput
              value={item.quantity || 0}
              onChange={(val) => onUpdate({ quantity: val })}
              placeholder="0"
              className="mt-1"
            />
          </div>
          <div>
            <Label className={pageFormLabelClassName}>Unit</Label>
            <Input
              value={item.unit}
              onChange={(e) => onUpdate({ unit: e.target.value })}
              placeholder="e.g. PCS, KG"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label className={pageFormLabelClassName}>Specification</Label>
          <Textarea
            value={item.specification}
            onChange={(e) => onUpdate({ specification: e.target.value })}
            placeholder="Technical details, model, color, etc."
            className="mt-1 min-h-[80px]"
          />
        </div>

        <div>
          <Label className={pageFormLabelClassName}>Item Notes</Label>
          <Input
            value={item.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Special instructions for this item"
            className="mt-1"
          />
        </div>
      </div>
    </Card>
  );
};
