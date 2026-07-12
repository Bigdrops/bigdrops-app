import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronsUpDown, UserPlus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import type { ClientRecord } from '@/domain/clientWorkspace'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { cn } from '@/lib/utils'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { supabase } from '../supabase'
import { ClientForm, type ClientFormData } from '@/components/client/ClientForm'

type ClientSelectorClient = ClientRecord

export type ClientSelectorProps = {
  clientId?: string | null
  clientName?: string | null
  onClientChange: (clientId: string, clientName: string, client: ClientSelectorClient | null) => void
  compact?: boolean
  hideHeader?: boolean
  dense?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  allowClear?: boolean
}

export default function ClientSelector({
  clientId,
  clientName,
  onClientChange,
  compact = false,
  hideHeader = false,
  dense = false,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  allowClear = true,
}: ClientSelectorProps) {
  const { isMobile } = useLayoutMode()
  const [clients, setClients] = useState<ClientSelectorClient[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientSelectorClient | null>(null)
  const [internalOpen, setInternalOpen] = useState<boolean>(false)
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  void dense

  useEffect(() => {
    void fetchClients()
  }, [])

  const open = controlledOpen ?? internalOpen
  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  useEffect(() => {
    if (clientId && clients.length > 0) {
      const found = clients.find((client) => String(client.id) === String(clientId))
      setSelectedClient(found || null)
    } else if (!clientId) {
      setSelectedClient(null)
    }
  }, [clientId, clients])

  const fetchClients = async (): Promise<void> => {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients((data || []) as ClientSelectorClient[])
  }

  const options: ComboboxOption[] = useMemo(() => {
    return clients.map((client) => ({
      value: client.id,
      label: client.name,
      description: [client.contact_person, client.city].filter(Boolean).join(' • '),
    }))
  }, [clients])

  const selectClient = (id: string) => {
    const client = clients.find((c) => c.id === id) || null
    setSelectedClient(client)
    onClientChange(client?.id || '', client?.name || '', client)
    setOpen(false)
  }

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedClient(null)
    onClientChange('', '', null)
    setOpen(false)
  }

  const handleSaveNewClient = async (data: Omit<ClientFormData, 'address2'> & { address: string }): Promise<void> => {
    setSaving(true)
    const { data: savedData, error } = await supabase
      .from('clients')
      .insert([
        {
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          address: data.address.trim(),
          city: data.city.trim(),
          state: data.state.trim(),
          contact_person: data.contact_person.trim(),
          category: data.category,
        },
      ])
      .select()
      .single()

    if (error) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'create' }))
      setSaving(false)
      return
    }

    await fetchClients()
    const savedClient = (savedData || null) as ClientSelectorClient | null
    setSelectedClient(savedClient)
    onClientChange(savedClient?.id || '', savedClient?.name || '', savedClient)
    setShowAddModal(false)
    setOpen(false)
    setSaving(false)
    feedback.success('Client created and selected')
  }

  const selectedSummary = selectedClient || (clientId ? { name: clientName } : null)

  const triggerContent = (
    <div className={cn(
      "flex w-full items-center justify-between gap-3 rounded-xl border border-bd-border bg-bd-surface px-3 transition-all",
      compact ? "h-10" : "h-12 px-4 py-2"
    )}>
      <div className="flex-1 min-w-0 text-left">
        <span className={cn(
          "block truncate font-medium",
          !selectedSummary?.name && "text-bd-text-muted"
        )}>
          {selectedSummary?.name || 'Select client...'}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-bd-text-muted">
        {selectedSummary?.name && allowClear && (
          <button 
            type="button" 
            onClick={clearSelection}
            className="hover:text-bd-text transition-colors p-1 rounded-full hover:bg-bd-surface-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <ChevronsUpDown className="h-4 w-4" />
      </div>
    </div>
  )

  return (
    <>
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl border-bd-border bg-bd-surface p-0 sm:max-w-2xl">
          <div className="max-h-[var(--bd-overlay-dialog-max-height)] overflow-y-auto p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <ClientForm
              mode="create"
              onSave={handleSaveNewClient}
              onCancel={() => setShowAddModal(false)}
              saving={saving}
              compact
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className={cn("space-y-1.5", compact ? "" : "space-y-3")}>
        {!hideHeader && (
          <div className="flex items-center justify-between gap-2">
            <Label className={cn(compact ? "text-[10px] font-semibold uppercase tracking-[0.16em] text-bd-text-muted" : "text-[11px] font-black uppercase tracking-widest text-bd-text-muted")}>
              Client
            </Label>
          </div>
        )}

        <Combobox
          options={options}
          value={clientId || ''}
          onChange={selectClient}
          title="Select Client"
          placeholder="Search clients..."
          searchPlaceholder="Search by name or contact..."
          trigger={triggerContent}
          hideTrigger={hideTrigger}
          open={open}
          onOpenChange={setOpen}
          strategy={hideTrigger ? "drawer" : "auto"}
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
              <UserPlus className="h-4 w-4" />
              <span className="text-xs font-bold">Add New Client</span>
            </Button>
          }
        />

        {!compact && selectedClient && (
          <Card className="border-bd-border bg-bd-surface-muted/30 p-4 shadow-none">
            <div className="space-y-1">
              <div className="text-sm font-bold text-bd-text">{selectedClient.name}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-bd-text-muted">
                {selectedClient.contact_person && <span>{selectedClient.contact_person}</span>}
                {selectedClient.phone && <span>{selectedClient.phone}</span>}
                {selectedClient.email && <span>{selectedClient.email}</span>}
                {(selectedClient.address || selectedClient.city) && (
                  <span>{[selectedClient.address, selectedClient.city, selectedClient.state].filter(Boolean).join(', ')}</span>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
