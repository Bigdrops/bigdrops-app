import ClientSelector from '@/components/ClientSelector'
import type { PartySelectorSlotProps } from './documentDescriptor'

/**
 * Default party-picker slot for the shared document form.
 *
 * `ClientSelector` speaks in client-specific prop names (`clientId`,
 * `onClientChange`). The shared form speaks in party-neutral names
 * (`partyId`, `onPartyChange`) so a future Supplier PO can drop in a
 * supplier-backed picker without teaching the form the word "client".
 *
 * This adapter is that boundary. A future purchase-order form passes its own
 * component to `SharedDocumentForm`'s `partySelector` prop, shaped exactly like
 * `PartySelectorSlotProps`.
 *
 * The presentational flags below are the shared form's own choices and are
 * identical for every family: the picker is headless (`hideHeader`,
 * `hideTrigger`) because the form renders its own party button, and clearing is
 * owned by the form, so the picker must not offer a second clear affordance.
 */
export default function ClientPartySelector({
  partyId,
  partyName,
  open,
  onOpenChange,
  onPartyChange,
}: PartySelectorSlotProps) {
  return (
    <ClientSelector
      clientId={partyId}
      clientName={partyName}
      compact
      dense
      hideHeader
      hideTrigger
      allowClear={false}
      open={open}
      onOpenChange={onOpenChange}
      onClientChange={(id, name) => onPartyChange(id, name)}
    />
  )
}
