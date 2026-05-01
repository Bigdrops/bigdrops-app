import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Check, ChevronsUpDown, UserPlus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import type { ClientRecord } from '@/domain/clientWorkspace'
import { cn } from '@/lib/utils'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { supabase } from '../supabase'

type ClientDraft = {
  name: string
  email: string
  phone: string
  address: string
  address2: string
  city: string
  state: string
  contact_person: string
  category: string
}

type ClientSelectorClient = ClientRecord

export type ClientSelectorProps = {
  clientId?: string | null
  clientName?: string | null
  onClientChange: (clientId: string, clientName: string, client: ClientSelectorClient | null) => void
  isMobile?: boolean
  compact?: boolean
  hideHeader?: boolean
  dense?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  allowClear?: boolean
}

const CATEGORIES = ['Residential', 'Commercial', 'Industrial', 'Government', 'NGO', 'Other'] as const

const emptyClient: ClientDraft = {
  name: '',
  email: '',
  phone: '',
  address: '',
  address2: '',
  city: '',
  state: '',
  contact_person: '',
  category: '',
}

export default function ClientSelector({
  clientId,
  clientName,
  onClientChange,
  isMobile,
  compact = false,
  hideHeader = false,
  dense = false,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  allowClear = true,
}: ClientSelectorProps) {
  const [clients, setClients] = useState<ClientSelectorClient[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientSelectorClient | null>(null)
  const [internalOpen, setInternalOpen] = useState<boolean>(false)
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [newClient, setNewClient] = useState<ClientDraft>({ ...emptyClient })
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

  const updateNew = (field: keyof ClientDraft, value: string) => setNewClient((client) => ({ ...client, [field]: value }))

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

  const handleSaveNewClient = async (): Promise<void> => {
    if (!newClient.name.trim()) {
      feedback.error('Client name is required')
      return
    }

    setSaving(true)
    const { data, error } = await supabase
      .from('clients')
      .insert([
        {
          name: newClient.name.trim(),
          email: newClient.email.trim(),
          phone: newClient.phone.trim(),
          address: newClient.address2.trim()
            ? `${newClient.address.trim()}, ${newClient.address2.trim()}`
            : newClient.address.trim(),
          city: newClient.city.trim(),
          state: newClient.state.trim(),
          contact_person: newClient.contact_person.trim(),
          category: newClient.category,
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
    const savedClient = (data || null) as ClientSelectorClient | null
    setSelectedClient(savedClient)
    onClientChange(savedClient?.id || '', savedClient?.name || '', savedClient)
    setNewClient({ ...emptyClient })
    setShowAddModal(false)
    setOpen(false)
    setSaving(false)
    feedback.success('Client created and selected')
  }

  const selectedSummary = selectedClient || (clientId ? { name: clientName } : null)

  const handleDraftChange = (field: keyof ClientDraft) => (event: ChangeEvent<HTMLInputElement>) => {
    updateNew(field, event.target.value)
  }

  const triggerContent = (
    <div className={cn(
      "flex w-full items-center justify-between gap-3 rounded-xl border border-input bg-background px-3 transition-all",
      compact ? "h-10" : "h-12 px-4 py-2"
    )}>
      <div className="flex-1 min-w-0 text-left">
        <span className={cn(
          "block truncate font-medium",
          !selectedSummary?.name && "text-muted-foreground"
        )}>
          {selectedSummary?.name || 'Select client...'}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
        {selectedSummary?.name && allowClear && (
          <button 
            type="button" 
            onClick={clearSelection}
            className="hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <ChevronsUpDown className="h-4 w-4" />
      </div>
    </div>
  )

  const pickerContent = (
    <div className="space-y-4">
      <Combobox
        options={options}
        value={clientId || ''}
        onChange={selectClient}
        placeholder="Search clients..."
        searchPlaceholder="Search by name or contact..."
      />
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2 h-11 border-dashed rounded-xl border-muted-foreground/30 hover:border-primary/50"
        onClick={() => {
          setOpen(false)
          setShowAddModal(true)
        }}
      >
        <UserPlus className="h-4 w-4" />
        <span>Add New Client</span>
      </Button>
    </div>
  )

  return (
    <>
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl bg-card p-0 sm:max-w-2xl">
          <div className="max-h-[85vh] overflow-y-auto p-6">
            <DialogHeader className="mb-4">
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Company / Client Name *</Label>
                <Input
                  className="mt-2 bg-background"
                  value={newClient.name}
                  onChange={handleDraftChange('name')}
                  placeholder="e.g. Coronation Power & Gas Ltd"
                  autoFocus
                />
              </div>

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div>
                  <Label>Contact Person</Label>
                  <Input className="mt-2 bg-background" value={newClient.contact_person} onChange={handleDraftChange('contact_person')} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newClient.category || '__none__'} onValueChange={(value) => updateNew('category', value === '__none__' ? '' : value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Select category</SelectItem>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div>
                  <Label>Phone</Label>
                  <Input className="mt-2 bg-background" value={newClient.phone} onChange={handleDraftChange('phone')} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input className="mt-2 bg-background" type="email" value={newClient.email} onChange={handleDraftChange('email')} />
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label>Address Line 1</Label>
                  <Input className="mt-2 bg-background" value={newClient.address} onChange={handleDraftChange('address')} />
                </div>
                <div>
                  <Label>Address Line 2</Label>
                  <Input className="mt-2 bg-background" value={newClient.address2} onChange={handleDraftChange('address2')} />
                </div>
              </div>

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div>
                  <Label>City</Label>
                  <Input className="mt-2 bg-background" value={newClient.city} onChange={handleDraftChange('city')} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input className="mt-2 bg-background" value={newClient.state} onChange={handleDraftChange('state')} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="button" className="flex-[1.3]" onClick={handleSaveNewClient} loading={saving}>
                  Save Client
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className={cn("space-y-1.5", compact ? "" : "space-y-3")}>
        {!hideHeader && (
          <div className="flex items-center justify-between gap-2">
            <Label className={cn(compact && "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground")}>
              Client
            </Label>
          </div>
        )}

        {!hideTrigger && (
          isMobile ? (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button type="button" className="w-full">{triggerContent}</button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[28px] px-5 pb-10 pt-2">
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
                <SheetHeader className="mb-6 text-left">
                  <SheetTitle className="text-xl font-bold">Select Client</SheetTitle>
                </SheetHeader>
                {pickerContent}
              </SheetContent>
            </Sheet>
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="w-full">{triggerContent}</button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-4" align="start">
                {pickerContent}
              </PopoverContent>
            </Popover>
          )
        )}

        {!compact && selectedClient && (
          <Card className="border-border bg-muted/30 p-4 shadow-none">
            <div className="space-y-1">
              <div className="text-sm font-bold text-foreground">{selectedClient.name}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
