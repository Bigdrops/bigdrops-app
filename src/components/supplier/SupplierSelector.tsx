import { useEffect, useMemo, useState } from 'react'
import { ChevronsUpDown, Factory, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import type { SupplierRecord } from '@/domain/supplier/types'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { cn } from '@/lib/utils'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { useEntity } from '@/lib/tenant/contexts'
import { createSupplier } from '@/modules/supplier/supplierService'
import { SupplierForm } from '@/components/supplier/SupplierForm'
import type { SupplierFormValues } from '@/domain/supplier/types'

export type SupplierSelectorProps = {
  supplierId?: string | null
  supplierName?: string | null
  onSupplierChange: (supplierId: string, supplierName: string, supplier: SupplierRecord | null) => void
  compact?: boolean
  hideHeader?: boolean
  dense?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  allowClear?: boolean
  /** Include archived suppliers in the option list. Defaults to false. */
  includeArchived?: boolean
}

/**
 * Supplier party picker.
 *
 * Behavioural reference: `src/components/ClientSelector.tsx`.
 * It reads the `suppliers` table only. It never reads `clients`, and it never
 * uses a client id as a supplier id.
 *
 * The component is self-contained and free of document-form concerns, so future
 * RFQ and Supplier PO forms can reuse it unchanged. It is deliberately NOT
 * wired into those forms yet.
 */
export default function SupplierSelector({
  supplierId,
  supplierName,
  onSupplierChange,
  compact = false,
  hideHeader = false,
  dense = false,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  allowClear = true,
  includeArchived = false,
}: SupplierSelectorProps) {
  const { isMobile } = useLayoutMode()
  const { tenantClient } = useEntity()
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRecord | null>(null)
  const [internalOpen, setInternalOpen] = useState<boolean>(false)
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  void dense

  useEffect(() => {
    if (!tenantClient.isReady) return
    void fetchSuppliers()
  }, [tenantClient.isReady, includeArchived])

  const open = controlledOpen ?? internalOpen
  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  useEffect(() => {
    if (supplierId && suppliers.length > 0) {
      const found = suppliers.find((supplier) => String(supplier.id) === String(supplierId))
      setSelectedSupplier(found || null)
    } else if (!supplierId) {
      setSelectedSupplier(null)
    }
  }, [supplierId, suppliers])

  const fetchSuppliers = async (): Promise<void> => {
    let query = tenantClient
      .from('suppliers')
      .select('id, name, contact_person, phone, email, address, city, state, notes, created_at, updated_at, archived_at')
      .order('name')
    if (!includeArchived) query = query.is('archived_at', null)
    const { data } = await query
    setSuppliers((data || []) as SupplierRecord[])
  }

  const options: ComboboxOption[] = useMemo(() => {
    return suppliers.map((supplier) => ({
      value: supplier.id,
      label: supplier.name,
      description: [supplier.contact_person, supplier.city].filter(Boolean).join(' • '),
    }))
  }, [suppliers])

  const selectSupplier = (id: string) => {
    const supplier = suppliers.find((c) => c.id === id) || null
    setSelectedSupplier(supplier)
    onSupplierChange(supplier?.id || '', supplier?.name || '', supplier)
    setOpen(false)
  }

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedSupplier(null)
    onSupplierChange('', '', null)
    setOpen(false)
  }

  const handleSaveNewSupplier = async (values: SupplierFormValues): Promise<void> => {
    setSaving(true)
    const { data: savedSupplier, error } = await createSupplier(tenantClient, values)

    if (error || !savedSupplier) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'create' }))
      setSaving(false)
      return
    }

    await fetchSuppliers()
    setSelectedSupplier(savedSupplier)
    onSupplierChange(savedSupplier.id, savedSupplier.name, savedSupplier)
    setShowAddModal(false)
    setOpen(false)
    setSaving(false)
    feedback.success('Supplier created and selected')
  }

  const selectedSummary = selectedSupplier || (supplierId ? { name: supplierName } : null)

  const triggerContent = (
    <div className={cn(
      'flex w-full items-center justify-between gap-3 rounded-xl border border-bd-border bg-bd-surface px-3 transition-all',
      compact ? 'h-10' : 'h-12 px-4 py-2',
    )}>
      <div className="flex-1 min-w-0 text-left">
        <span className={cn(
          'block truncate font-medium',
          !selectedSummary?.name && 'text-bd-text-muted',
        )}>
          {selectedSummary?.name || 'Select supplier...'}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-bd-text-muted">
        {selectedSummary?.name && allowClear && (
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Clear supplier selection"
            className="hover:text-bd-text transition-colors p-1 rounded-full hover:bg-bd-surface-muted"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
      </div>
    </div>
  )

  return (
    <>
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl border-bd-border bg-bd-surface p-0 sm:max-w-2xl">
          <div className="max-h-[var(--bd-overlay-dialog-max-height)] overflow-y-auto p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>Add New Supplier</DialogTitle>
            </DialogHeader>
            <SupplierForm
              mode="create"
              onSave={handleSaveNewSupplier}
              onCancel={() => setShowAddModal(false)}
              saving={saving}
              compact
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className={cn('space-y-1.5', compact ? '' : 'space-y-3')}>
        {!hideHeader && (
          <div className="flex items-center justify-between gap-2">
            <Label className={cn(
              isMobile ? 'text-[10px] font-semibold uppercase tracking-[0.16em] text-bd-text-muted' : 'text-[11px] font-black uppercase tracking-widest text-bd-text-muted',
            )}>
              Supplier
            </Label>
          </div>
        )}

        <Combobox
          options={options}
          value={supplierId || ''}
          onChange={selectSupplier}
          title="Select Supplier"
          placeholder="Search suppliers..."
          searchPlaceholder="Search by name or contact..."
          trigger={triggerContent}
          hideTrigger={hideTrigger}
          open={open}
          onOpenChange={setOpen}
          strategy={hideTrigger ? 'drawer' : 'auto'}
          mobileBehavior="drawer"
          desktopBehavior="popover"
          contentClassName="p-3"
          footer={
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full justify-start gap-2 rounded-xl border-dashed border-bd-border bg-bd-surface hover:border-bd-button-primary-bg/50"
              onClick={() => {
                setOpen(false)
                setShowAddModal(true)
              }}
            >
              <Factory className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-bold">Add New Supplier</span>
            </Button>
          }
        />

        {!compact && selectedSupplier && (
          <Card className="border-bd-border bg-bd-surface-muted/30 p-4 shadow-none">
            <div className="space-y-1">
              <div className="text-sm font-bold text-bd-text">{selectedSupplier.name}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-bd-text-muted">
                {selectedSupplier.contact_person && <span>{selectedSupplier.contact_person}</span>}
                {selectedSupplier.phone && <span>{selectedSupplier.phone}</span>}
                {selectedSupplier.email && <span>{selectedSupplier.email}</span>}
                {(selectedSupplier.address || selectedSupplier.city) && (
                  <span>
                    {[selectedSupplier.address, selectedSupplier.city, selectedSupplier.state]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
