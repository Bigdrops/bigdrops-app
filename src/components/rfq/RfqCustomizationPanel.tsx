import React from 'react'
import { Eye, Shuffle } from 'lucide-react'

import { Rfq } from '@/domain/rfq/types'
import { RfqStyleControls } from '@/components/rfq/RfqStyleControls'
import { TableColumnControls } from '@/components/table-document/TableColumnControls'
import { Button } from '@/components/ui/button'
import { DocumentTemplatePicker } from '@/components/document/DocumentViewShell'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { pageFormLabelClassName } from '@/components/ui/form-page-styles'
import { SHARED_TABLE_TEMPLATES } from '@/domain/table-document/templateRegistry'

type RfqCustomizationPanelProps = {
  rfq: Rfq
  onUpdateRfq: (updates: Partial<Rfq>) => void
  onReshuffle: () => void
  showOpenFinalView?: boolean
  showBrandOverride?: boolean
}

export const RfqCustomizationPanel: React.FC<RfqCustomizationPanelProps> = ({
  rfq,
  onUpdateRfq,
  onReshuffle,
  showOpenFinalView = false,
  showBrandOverride = true,
}) => {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className={pageFormLabelClassName}>Vendor Identity</Label>
            <p className="text-[10px] text-muted-foreground">Show vendor name and contact</p>
          </div>
          <Switch
            checked={rfq.show_vendor_identity}
            onCheckedChange={(checked) => onUpdateRfq({ show_vendor_identity: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className={pageFormLabelClassName}>Brand Identity</Label>
            <p className="text-[10px] text-muted-foreground">Show "BIGDROPS" or custom header</p>
          </div>
          <Switch
            checked={rfq.show_brand_name}
            onCheckedChange={(checked) => onUpdateRfq({ show_brand_name: checked })}
          />
        </div>

        {showBrandOverride && rfq.show_brand_name ? (
          <div className="border-l-2 border-border pl-4">
            <Label className={pageFormLabelClassName}>Brand Name Override</Label>
            <Input
              value={rfq.brand_name_override}
              onChange={(e) => onUpdateRfq({ brand_name_override: e.target.value })}
              placeholder="e.g. PREMIUM SUPPLY CO."
              className="mt-1 font-black uppercase tracking-tight"
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div className="space-y-0.5">
            <Label className={pageFormLabelClassName}>Reshuffle Order</Label>
            <p className="text-[10px] text-muted-foreground">Randomize item presentation</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onReshuffle}
            className="h-8 gap-1.5 text-[10px] font-bold uppercase"
          >
            <Shuffle className="h-3 w-3" />
            Reshuffle
          </Button>
        </div>
      </div>

      <RfqStyleControls rfq={rfq} onUpdate={onUpdateRfq} />

      <div className="space-y-4 border-t border-border pt-6">
        <div>
          <Label className={pageFormLabelClassName}>Template</Label>
          <div className="mt-2">
            <DocumentTemplatePicker
              value={rfq.template_id || 'modern'}
              onChange={(templateId) => onUpdateRfq({ template_id: templateId })}
              templates={SHARED_TABLE_TEMPLATES}
            />
          </div>
        </div>

        {Array.isArray(rfq.table_columns) ? (
          <div>
            <Label className={pageFormLabelClassName}>Columns</Label>
            <div className="mt-2">
              <TableColumnControls
                columns={rfq.table_columns}
                onChange={(table_columns) => onUpdateRfq({ table_columns })}
              />
            </div>
          </div>
        ) : null}
      </div>

      {showOpenFinalView && rfq.id ? (
        <div className="border-t border-border pt-6">
          <Button
            variant="secondary"
            className="h-12 w-full gap-2 font-bold uppercase tracking-widest"
            onClick={() => window.open(`/rfqs/${rfq.id}`, '_blank')}
          >
            <Eye className="h-4 w-4" />
            Open Final View
          </Button>
        </div>
      ) : null}
    </div>
  )
}
