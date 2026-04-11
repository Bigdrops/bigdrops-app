import React from 'react';
import { Rfq, RfqItem } from '@/domain/rfq/types'
import { RfqCustomizationPanel } from './RfqCustomizationPanel'
import { TableRowsEditor } from '@/components/table-document/TableRowsEditor'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Layout, List } from 'lucide-react'
import { pageFormLabelClassName } from '@/components/ui/form-page-styles'
import { createEmptyTableRow } from '@/domain/table-document/rows'
import { getDefaultColumnsForDocument } from '@/domain/table-document/templateRegistry'
import type { TableDocumentRow } from '@/domain/table-document/types'

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
  const reshuffle = () => {
    onUpdateRfq({ export_order_seed: Math.floor(Math.random() * 1000000) });
  };

  const tableRows: TableDocumentRow[] = rfq.table_rows && rfq.table_rows.length > 0
    ? rfq.table_rows
    : items.map((item, index) => ({
        id: item.id,
        _uiKey: item._uiKey,
        row_type: 'item',
        sort_order: item.sort_order ?? index,
        section_title: '',
        description: item.description || '',
        specification: item.specification || '',
        quantity: Number(item.quantity || 0),
        unit: item.unit || '',
        notes: item.notes || '',
        make_brand: '',
        cp: '',
        sp: '',
      }))

  const tableColumns = rfq.table_columns && rfq.table_columns.length > 0
    ? rfq.table_columns
    : getDefaultColumnsForDocument('rfq')

  const handleRowsChange = (nextRows: TableDocumentRow[]) => {
    onUpdateRfq({ table_rows: nextRows })
    const legacyItems: RfqItem[] = nextRows
      .filter((row) => row.row_type === 'item')
      .map((row, index) => ({
        _uiKey: row._uiKey || `rfq-item-${index}`,
        sort_order: index,
        description: row.description || '',
        quantity: Number(row.quantity || 0),
        unit: row.unit || '',
        specification: row.specification || '',
        notes: row.notes || '',
      }))
    onUpdateItems(legacyItems.length > 0 ? legacyItems : [{
      _uiKey: createEmptyTableRow(0, 'item')._uiKey,
      sort_order: 0,
      description: '',
      quantity: 0,
      unit: '',
      specification: '',
      notes: '',
    }])
  }

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
          <TabsTrigger value="output">
            <Layout className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Output</span>
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
              {tableRows.length} rows listed
            </h3>
          </div>

          <TableRowsEditor
            rows={tableRows}
            columns={tableColumns}
            onChange={handleRowsChange}
            addItemLabel="Add Item Row"
          />
        </TabsContent>

        <TabsContent value="output" className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
          <div className="px-1">
            <RfqCustomizationPanel
              rfq={rfq}
              onUpdateRfq={onUpdateRfq}
              onReshuffle={reshuffle}
              showOpenFinalView
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
