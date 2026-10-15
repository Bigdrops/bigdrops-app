import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Archive, Link2, Link2Off, Pencil, RotateCcw, UserPlus } from 'lucide-react'

import Layout from '../components/Layout'
import ConfirmActionDialog from '../components/ConfirmActionDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SkeletonCard } from '@/components/loading/AppLoadingStates'
import ClientSelector from '@/components/ClientSelector'
import { ClientForm, type ClientFormData } from '@/components/client/ClientForm'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { useEntity } from '@/lib/tenant/contexts'
import { invalidateListCache, supplierListCacheKey } from '@/lib/cache/listCache'
import { archiveSupplier, getSupplier, restoreSupplier } from '@/modules/supplier/supplierService'
import {
  createClientAndLinkForSupplier,
  getLinkedClientForSupplier,
  linkExistingSupplierToClient,
  unlinkParties,
} from '@/modules/party/partyLinkService'
import { formatSupplierLocation, isArchivedSupplier, type SupplierRecord } from '@/domain/supplier/types'

interface LinkedClient {
  linkId: string
  clientId: string
  clientName: string | null
}

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tenantClient } = useEntity()

  const [supplier, setSupplier] = useState<SupplierRecord | null>(null)
  const [linkedClient, setLinkedClient] = useState<LinkedClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const [linkClientOpen, setLinkClientOpen] = useState(false)
  const [addClientRoleOpen, setAddClientRoleOpen] = useState(false)
  const [pendingClientId, setPendingClientId] = useState<string>('')
  const [pendingClientName, setPendingClientName] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [mutating, setMutating] = useState(false)

  const load = useCallback(async () => {
    if (!id || !tenantClient.isReady) return
    setLoading(true)

    const supplierResult = await getSupplier(tenantClient, id)
    if (supplierResult.error || !supplierResult.data) {
      setLoadError(supplierResult.error || 'Supplier not found')
      setLoading(false)
      return
    }
    setSupplier(supplierResult.data)

    const linkResult = await getLinkedClientForSupplier(tenantClient, id)
    setLinkedClient(
      linkResult.data
        ? {
            linkId: linkResult.data.link.id,
            clientId: linkResult.data.client.id,
            clientName: linkResult.data.client.name,
          }
        : null,
    )

    setLoadError(null)
    setLoading(false)
  }, [id, tenantClient.isReady])

  useEffect(() => {
    void load()
  }, [load])

  const invalidateSuppliersCache = () => {
    if (tenantClient.schemaName) invalidateListCache(supplierListCacheKey(tenantClient.schemaName))
  }

  const handleArchive = async () => {
    if (!id) return
    setMutating(true)
    const { data, error } = await archiveSupplier(tenantClient, id)
    setMutating(false)
    if (error || !data) {
      feedback.error('Archive failed', { description: error || undefined })
      return
    }
    // Archiving is role-scoped: the linked client, if any, is untouched.
    setSupplier(data)
    setConfirmArchive(false)
    invalidateSuppliersCache()
    feedback.success('Supplier archived')
  }

  const handleRestore = async () => {
    if (!id) return
    setMutating(true)
    const { data, error } = await restoreSupplier(tenantClient, id)
    setMutating(false)
    if (error || !data) {
      feedback.error('Restore failed', { description: error || undefined })
      return
    }
    setSupplier(data)
    setConfirmRestore(false)
    invalidateSuppliersCache()
    feedback.success('Supplier restored')
  }

  const handleLinkExistingClient = async () => {
    if (!id || !pendingClientId) return
    setSaving(true)
    const { data, error } = await linkExistingSupplierToClient(tenantClient, pendingClientId, id)
    setSaving(false)
    if (error || !data) {
      feedback.error('Link failed', { description: error || undefined })
      return
    }
    setLinkedClient({ linkId: data.id, clientId: pendingClientId, clientName: pendingClientName || null })
    setLinkClientOpen(false)
    setPendingClientId('')
    setPendingClientName('')
    feedback.success('Client linked to this supplier')
  }

  const handleAddClientRole = async (values: Omit<ClientFormData, 'address2'> & { address: string }) => {
    if (!id) return
    setSaving(true)
    const { data, error } = await createClientAndLinkForSupplier(tenantClient, id, {
      name: values.name,
      contact_person: values.contact_person,
      email: values.email,
      phone: values.phone,
      address: values.address,
      city: values.city,
      state: values.state,
    })
    setSaving(false)
    if (error || !data) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'create' }))
      return
    }
    setLinkedClient({ linkId: data.link.id, clientId: data.client.id, clientName: data.client.name })
    setAddClientRoleOpen(false)
    feedback.success('Client role created and linked')
  }

  const handleUnlink = async () => {
    if (!linkedClient) return
    setMutating(true)
    const { error } = await unlinkParties(tenantClient, linkedClient.linkId)
    setMutating(false)
    if (error) {
      feedback.error('Unlink failed', { description: error })
      return
    }
    // Unlinking removes only the relationship. Both records survive.
    setLinkedClient(null)
    setConfirmUnlink(false)
    feedback.success('Link removed. Both records are kept.')
  }

  if (loading) {
    return (
      <Layout title="Supplier" session={null}>
        <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </Layout>
    )
  }

  if (!supplier) {
    return (
      <Layout title="Supplier" session={null}>
        <div className="mx-auto w-full max-w-3xl p-4">
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {loadError || 'Supplier not found'}
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  const archived = isArchivedSupplier(supplier)

  return (
    <Layout title="Supplier" session={null}>
      <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
        {/* Identity */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="min-w-0">
              <CardTitle className="truncate text-lg font-semibold">{supplier.name}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatSupplierLocation(supplier)}
              </p>
            </div>
            <Badge
              variant="outline"
              className={archived ? 'shrink-0 text-muted-foreground' : 'shrink-0'}
            >
              {archived ? 'Archived' : 'Active'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Contact person" value={supplier.contact_person} />
            <DetailRow label="Phone" value={supplier.phone} />
            <DetailRow label="Email" value={supplier.email} />
            <DetailRow label="Address" value={supplier.address} />
            <DetailRow label="Notes" value={supplier.notes} />
          </CardContent>
        </Card>

        {/* Role / link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Link2 className="h-4 w-4" aria-hidden="true" />
              Client role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkedClient ? (
              <>
                <p className="text-sm text-muted-foreground">
                  This supplier is the same business as the client{' '}
                  <span className="font-medium text-foreground">
                    {linkedClient.clientName || 'Unnamed client'}
                  </span>
                  .
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => navigate(`/clients/${linkedClient.clientId}`)}
                  >
                    View Client
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl text-destructive"
                    onClick={() => setConfirmUnlink(true)}
                  >
                    <Link2Off className="mr-2 h-4 w-4" aria-hidden="true" />
                    Unlink
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Unlinking removes only the link. Both records are kept.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  This is a supplier-only record. Link it to an existing client, or create a client
                  role for it.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => {
                      setPendingClientId('')
                      setPendingClientName('')
                      setLinkClientOpen(true)
                    }}
                  >
                    <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Link Existing Client
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => setAddClientRoleOpen(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Add Client Role
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nothing is linked automatically. Two businesses may share a name.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Lifecycle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Supplier lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => navigate(`/suppliers/edit/${supplier.id}`)}
            >
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
            {archived ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => setConfirmRestore(true)}
              >
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Restore
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => setConfirmArchive(true)}
              >
                <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                Archive
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmActionDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archive this supplier?"
        description="The supplier is hidden from active pickers. The record is kept and can be restored."
        confirmLabel="Archive Supplier"
        onConfirm={() => void handleArchive()}
        loading={mutating}
      />

      <ConfirmActionDialog
        open={confirmRestore}
        onOpenChange={setConfirmRestore}
        title="Restore this supplier?"
        description="The supplier returns to active pickers."
        confirmLabel="Restore Supplier"
        onConfirm={() => void handleRestore()}
        loading={mutating}
      />

      <ConfirmActionDialog
        open={confirmUnlink}
        onOpenChange={setConfirmUnlink}
        title="Remove this link?"
        description="The client record and the supplier record are both kept. Only the relationship is removed. No document or accounting entry changes."
        confirmLabel="Remove Link"
        onConfirm={() => void handleUnlink()}
        loading={mutating}
      />

      {/* Link an existing client */}
      <Dialog open={linkClientOpen} onOpenChange={setLinkClientOpen}>
        <DialogContent className="max-w-lg border-bd-border bg-bd-surface">
          <DialogHeader>
            <DialogTitle>Link an existing client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ClientSelector
              clientId={pendingClientId}
              clientName={pendingClientName}
              onClientChange={(clientId, clientName) => {
                setPendingClientId(clientId)
                setPendingClientName(clientName)
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => setLinkClientOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 rounded-xl"
                disabled={!pendingClientId || saving}
                loading={saving}
                onClick={() => void handleLinkExistingClient()}
              >
                Link Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add a client role */}
      <Dialog open={addClientRoleOpen} onOpenChange={setAddClientRoleOpen}>
        <DialogContent className="max-w-2xl border-bd-border bg-bd-surface p-0 sm:max-w-2xl">
          <div className="max-h-[var(--bd-overlay-dialog-max-height)] overflow-y-auto p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>Add Client Role</DialogTitle>
            </DialogHeader>
            <p className="mb-4 rounded-xl border border-bd-border bg-bd-surface-muted/40 px-3 py-2 text-xs text-bd-text-muted">
              Supplier details are offered as a starting point. Review and correct them first.
              Client and supplier details are then edited independently.
            </p>
            <ClientForm
              mode="create"
              initialData={{
                name: supplier.name || '',
                contact_person: supplier.contact_person || '',
                category: '',
                email: supplier.email || '',
                phone: supplier.phone || '',
                address: supplier.address || '',
                city: supplier.city || '',
                state: supplier.state || '',
              }}
              onSave={handleAddClientRole}
              onCancel={() => setAddClientRoleOpen(false)}
              saving={saving}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground sm:w-36 sm:shrink-0">
        {label}
      </span>
      <span className="text-sm text-foreground">{value?.trim() ? value : '—'}</span>
    </div>
  )
}
