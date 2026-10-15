import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Icons } from '@/lib/iconRegistry'
import { SupplierForm } from '@/components/supplier/SupplierForm'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'
import { invalidateListCache, supplierListCacheKey } from '@/lib/cache/listCache'
import { supplierFormFromClient, type SupplierFormValues } from '@/domain/supplier/types'
import { createSupplierAndLinkForClient } from '@/modules/supplier/supplierService'
import { getLinkedSupplierForClient, unlinkParties } from '@/modules/party/partyLinkService'
import type { ClientRecord } from '@/domain/clientWorkspace'

/**
 * Supplier role card for the Client workspace (Commercial Party Foundation,
 * OPTION B — linked role directories).
 *
 * The client record stays authoritative for the client role. This card only
 * reads and writes the supplier authority:
 *   * It never modifies the client record.
 *   * It never rewrites a document, a party snapshot, or an accounting row.
 *   * A link is always an explicit user action. Nothing is inferred from a name.
 *   * Contact values are copied once, on creation, after review. There is no
 *     ongoing synchronization in either direction.
 */
export function ClientSupplierRoleCard({ client }: { client: ClientRecord }) {
  const navigate = useNavigate()
  const { tenantClient } = useEntity()

  const [linkedSupplier, setLinkedSupplier] = useState<{
    linkId: string
    supplierId: string
    supplierName: string | null
  } | null>(null)
  const [addSupplierRoleOpen, setAddSupplierRoleOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState(false)

  const clientId = client.id

  const load = useCallback(async () => {
    if (!clientId || !tenantClient.isReady) return
    const { data } = await getLinkedSupplierForClient(tenantClient, clientId)
    setLinkedSupplier(
      data
        ? { linkId: data.link.id, supplierId: data.supplier.id, supplierName: data.supplier.name }
        : null,
    )
  }, [clientId, tenantClient.isReady])

  useEffect(() => {
    void load()
  }, [load])

  const handleAddSupplierRole = async (values: SupplierFormValues) => {
    if (!clientId) return
    setSaving(true)
    const { data, error } = await createSupplierAndLinkForClient(tenantClient, clientId, values)
    setSaving(false)

    if (error || !data) {
      feedback.error('Could not add supplier role', { description: error || undefined })
      return
    }

    setLinkedSupplier({
      linkId: data.link.id,
      supplierId: data.supplier.id,
      supplierName: data.supplier.name,
    })
    setAddSupplierRoleOpen(false)
    if (tenantClient.schemaName) invalidateListCache(supplierListCacheKey(tenantClient.schemaName))
    feedback.success('Supplier role added and linked')
  }

  const handleUnlink = async () => {
    if (!linkedSupplier) return
    const { error } = await unlinkParties(tenantClient, linkedSupplier.linkId)
    if (error) {
      feedback.error('Unlink failed', { description: error })
      return
    }
    // Unlinking removes only the relationship. Both role records survive.
    setLinkedSupplier(null)
    setConfirmUnlink(false)
    feedback.success('Link removed. Both records are kept.')
  }

  return (
    <>
      <div className="min-w-0 rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-bd-text-muted">
              <Icons.suppliers className="h-3.5 w-3.5" aria-hidden="true" />
              Supplier Role
            </div>
            <p className="mt-1 text-sm text-bd-text">
              {linkedSupplier
                ? linkedSupplier.supplierName || 'Linked supplier'
                : 'This client has no supplier role.'}
            </p>
            <p className="mt-0.5 text-xs text-bd-text-muted">
              {linkedSupplier
                ? 'The same business is recorded as a supplier. Client and supplier details are edited independently.'
                : 'Add a supplier role if BOURXE also buys from this business.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {linkedSupplier ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => navigate(`/suppliers/${linkedSupplier.supplierId}`)}
                >
                  View Supplier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl text-destructive"
                  onClick={() => setConfirmUnlink(true)}
                >
                  Unlink
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => setAddSupplierRoleOpen(true)}
              >
                Add Supplier Role
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={addSupplierRoleOpen} onOpenChange={setAddSupplierRoleOpen}>
        <DialogContent className="max-w-2xl border-bd-border bg-bd-surface p-0 sm:max-w-2xl">
          <div className="max-h-[var(--bd-overlay-dialog-max-height)] overflow-y-auto p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>Add Supplier Role</DialogTitle>
            </DialogHeader>
            <p className="mb-4 rounded-xl border border-bd-border bg-bd-surface-muted/40 px-3 py-2 text-xs text-bd-text-muted">
              Client details are offered as a starting point. Review and correct them first.
              Client and supplier details are then edited independently.
            </p>
            <SupplierForm
              mode="create"
              initialData={supplierFormFromClient(client)}
              onSave={handleAddSupplierRole}
              onCancel={() => setAddSupplierRoleOpen(false)}
              saving={saving}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmUnlink}
        onOpenChange={setConfirmUnlink}
        title="Remove this link?"
        description="The client record and the supplier record are both kept. Only the relationship is removed. No document or accounting entry changes."
        confirmLabel="Remove Link"
        onConfirm={() => void handleUnlink()}
      />
    </>
  )
}

export default ClientSupplierRoleCard
