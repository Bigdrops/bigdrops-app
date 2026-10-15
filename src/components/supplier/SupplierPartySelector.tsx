import SupplierSelector from '@/components/supplier/SupplierSelector'
import type { PartySelectorSlotProps } from '@/components/document/documentDescriptor'

/**
 * Supplier party-picker slot for the shared document form.
 *
 * `SupplierSelector` speaks in supplier-specific prop names (`supplierId`,
 * `onSupplierChange`). The shared form speaks in party-neutral names
 * (`partyId`, `onPartyChange`), so the form never learns the word
 * "supplier" and a supplier id never travels in a client-named prop.
 *
 * Presentation flags mirror `ClientPartySelector`: the picker is headless
 * (`hideHeader`, `hideTrigger`) because the form renders its own party
 * button, and clearing is owned by the form.
 */
export default function SupplierPartySelector({
  partyId,
  partyName,
  open,
  onOpenChange,
  onPartyChange,
}: PartySelectorSlotProps) {
  return (
    <SupplierSelector
      supplierId={partyId}
      supplierName={partyName}
      compact
      dense
      hideHeader
      hideTrigger
      allowClear={false}
      open={open}
      onOpenChange={onOpenChange}
      onSupplierChange={(id, name) => onPartyChange(id, name)}
    />
  )
}
