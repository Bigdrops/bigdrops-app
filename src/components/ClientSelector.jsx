import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/hooks/use-toast'
import { X } from 'lucide-react'

const CATEGORIES = ['Residential', 'Commercial', 'Industrial', 'Government', 'NGO', 'Other']

const emptyClient = {
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

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
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
}) {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [internalOpen, setInternalOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newClient, setNewClient] = useState({ ...emptyClient })
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    fetchClients()
  }, [])

  const open = controlledOpen ?? internalOpen
  const setOpen = (nextOpen) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }

  useEffect(() => {
    if (clientId && clients.length > 0) {
      const found = clients.find((client) => String(client.id) === String(clientId))
      setSelectedClient(found || null)
      if (!open) setSearchTerm('')
    } else if (!clientId) {
      setSelectedClient(null)
      if (!open) setSearchTerm('')
    }
  }, [clientId, clients, open])

  useEffect(() => {
    if (isMobile) return undefined

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isMobile])

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data || [])
  }

  const updateNew = (field, value) => setNewClient((client) => ({ ...client, [field]: value }))

  const filteredClients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return clients
    return clients.filter((client) => {
      const haystack = [
        client.name,
        client.city,
        client.state,
        client.phone,
        client.email,
        client.contact_person,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [clients, searchTerm])

  const openPicker = () => {
    setSearchTerm('')
    setOpen(true)
  }

  const selectClient = (client) => {
    setSelectedClient(client)
    onClientChange(client?.id || '', client?.name || '', client || null)
    setSearchTerm('')
    setOpen(false)
  }

  const clearSelection = () => {
    setSelectedClient(null)
    setSearchTerm('')
    setOpen(false)
    onClientChange('', '', null)
  }

  const closePicker = (nextOpen) => {
    setOpen(nextOpen)
    if (!nextOpen) setSearchTerm('')
  }

  const handleSaveNewClient = async () => {
    if (!newClient.name.trim()) {
      toast({ title: 'Client name required', description: 'Client name is required', variant: 'destructive' })
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
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' })
      setSaving(false)
      return
    }

    await fetchClients()
    setSelectedClient(data)
    onClientChange(data?.id || '', data?.name || '', data || null)
    setSearchTerm('')
    setNewClient({ ...emptyClient })
    setShowAddModal(false)
    setOpen(false)
    setSaving(false)
  }

  const selectedSummary = selectedClient || (clientId ? { name: clientName } : null)
  const useMobileSheet = isMobile && compact

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
                  onChange={(e) => updateNew('name', e.target.value)}
                  placeholder="e.g. Coronation Power & Gas Ltd"
                  autoFocus
                />
              </div>

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div>
                  <Label>Contact Person</Label>
                  <Input className="mt-2 bg-background" value={newClient.contact_person} onChange={(e) => updateNew('contact_person', e.target.value)} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newClient.category || '__none__'} onValueChange={(value) => updateNew('category', value === '__none__' ? '' : value)}>
                    <SelectTrigger className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
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
                  <Input className="mt-2 bg-background" value={newClient.phone} onChange={(e) => updateNew('phone', e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input className="mt-2 bg-background" type="email" value={newClient.email} onChange={(e) => updateNew('email', e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Address Line 1</Label>
                <Input className="mt-2 bg-background" value={newClient.address} onChange={(e) => updateNew('address', e.target.value)} />
              </div>
              <div>
                <Label>Address Line 2</Label>
                <Input className="mt-2 bg-background" value={newClient.address2} onChange={(e) => updateNew('address2', e.target.value)} />
              </div>

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div>
                  <Label>City</Label>
                  <Input className="mt-2 bg-background" value={newClient.city} onChange={(e) => updateNew('city', e.target.value)} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input className="mt-2 bg-background" value={newClient.state} onChange={(e) => updateNew('state', e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 bg-card" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="button" className="flex-[1.3]" onClick={handleSaveNewClient} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Client'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div ref={containerRef} className={compact ? 'space-y-1.5' : 'space-y-3'}>
        {!hideHeader ? (
          <div className="flex items-center justify-between gap-2">
            <Label className={compact ? 'text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500' : ''}>Client</Label>
            <Button
              type="button"
              variant={compact ? 'outline' : 'link'}
              className={compact ? 'h-7 rounded-xl border-zinc-200 bg-card px-2 text-[10px] font-semibold text-zinc-700' : 'h-auto p-0 text-sm font-semibold'}
              onClick={() => setShowAddModal(true)}
            >
              + New Client
            </Button>
          </div>
        ) : null}

        {isMobile ? (
          <>
            {!hideTrigger ? (
              <div className="space-y-0">
                <button
                  type="button"
                  onClick={openPicker}
                  className="w-full rounded-[18px] border-[1.5px] border-[#e2e8f0] bg-white px-[18px] py-0 shadow-[0_2px_6px_rgba(0,0,0,0.02)] transition-[border-color,box-shadow] duration-150 hover:border-[#94a3b8] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex h-[52px] items-center">
                    <span className="block w-full truncate text-left text-[16px] font-medium text-[#0f1a24]">
                      {selectedSummary?.name || 'Search or select client…'}
                    </span>
                  </div>
                </button>
              </div>
            ) : null}

            {useMobileSheet ? (
              <Sheet open={open} onOpenChange={closePicker}>
                <SheetContent
                  side="bottom"
                  className="max-h-[85dvh] rounded-t-[28px] border-none bg-white p-0 sm:mx-auto sm:max-w-[520px]"
                >
                  <div className="mx-auto mt-3 h-[5px] w-10 rounded-full bg-[#d0d9e2]" />
                  <SheetHeader className="border-b border-[#edf2f7] px-5 pb-4 pt-2 text-left">
                    <SheetTitle className="text-[20px] font-bold tracking-[-0.02em] text-[#0f1a24]">
                      Select client
                    </SheetTitle>
                  </SheetHeader>

                  <div className="border-b border-[#edf2f7] px-5 py-4">
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, contact, city…"
                      className="h-12 rounded-[24px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-4 text-[16px] text-[#0f1a24] placeholder:text-[#8a9aac] focus:border-[#94a3b8] focus:bg-white"
                      autoFocus
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto px-2 pb-4 pt-2">
                    {filteredClients.length === 0 ? (
                      <div className="px-5 py-10 text-center text-[15px] text-[#68788c]">
                        No clients match your search
                      </div>
                    ) : (
                      filteredClients.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          className="flex w-full items-start gap-[14px] rounded-[18px] px-4 py-[14px] text-left transition-colors duration-150 hover:bg-[#f5f9ff]"
                          onClick={() => selectClient(client)}
                        >
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] bg-[#eaf6ef] text-[16px] font-bold uppercase text-[#0e7b4e]">
                            {getInitials(client.name)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-1 text-[16px] font-[650] leading-[1.3] text-[#0f1a24]">
                              {client.name}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-[#5e7180]">
                              {client.contact_person ? <span>{client.contact_person}</span> : null}
                              {client.city ? <span>{client.city}</span> : null}
                              {client.phone ? <span>{client.phone}</span> : null}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="border-t border-[#edf2f7] px-5 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        closePicker(false)
                        setShowAddModal(true)
                      }}
                      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[#b9c7d4] bg-white text-[16px] font-semibold text-[#1e3b5c] transition-colors duration-150 hover:bg-[#f5f9ff] hover:border-[#7f9ab3]"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      New client
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <Dialog open={open} onOpenChange={closePicker}>
                <DialogContent className="max-w-[calc(100%-1rem)] rounded-2xl bg-white p-0 sm:max-w-lg">
                  <div className="max-h-[85vh] overflow-y-auto p-4">
                    <DialogHeader className="mb-3">
                      <DialogTitle>Select Client</DialogTitle>
                    </DialogHeader>
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={`Search ${clients.length} clients`}
                      className="h-11 bg-background"
                      autoFocus
                    />
                    <div className="mt-3 space-y-1">
                      {filteredClients.length === 0 ? (
                        <div className="rounded-xl border border-border bg-muted/50 px-3 py-6 text-center text-sm text-muted-foreground">
                          No clients match &quot;{searchTerm}&quot;.
                        </div>
                      ) : (
                        filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            className="flex w-full flex-col border-b border-zinc-200 px-1 py-2.5 text-left"
                            onClick={() => selectClient(client)}
                          >
                            <span className="truncate text-sm font-semibold text-foreground">{client.name}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {[client.contact_person, client.city, client.phone].filter(Boolean).join(' • ') || 'No extra details'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </>
        ) : (
          <div className="relative">
            <Input
              value={open ? searchTerm : selectedSummary?.name || ''}
              onFocus={openPicker}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setOpen(true)
              }}
              placeholder={`Search ${clients.length} clients`}
              className="h-10 bg-background pr-24"
            />
            <div className="pointer-events-none absolute inset-y-0 right-14 flex items-center text-xs text-muted-foreground">
              Search
            </div>
            {selectedSummary && allowClear ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={clearSelection}
              >
                Clear
              </Button>
            ) : null}

            {open && (
              <Card className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[1000] max-h-72 overflow-hidden border border-border bg-background shadow-xl">
                <div className="max-h-72 overflow-y-auto p-2">
                  {filteredClients.length === 0 ? (
                    <div className="rounded-md px-3 py-6 text-center text-sm text-muted-foreground">
                      No clients match &quot;{searchTerm}&quot;.
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-muted/50"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectClient(client)}
                      >
                        <span className="truncate text-sm font-semibold text-foreground">{client.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {[client.contact_person, client.city, client.phone].filter(Boolean).join(' • ') || 'No extra details'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {!compact && selectedSummary ? (
          <Card className="border-border bg-muted/50 p-4">
            <div>
              <div className="text-sm font-semibold text-foreground">{selectedSummary.name}</div>
              {selectedClient?.contact_person ? <div className="mt-1 text-sm text-muted-foreground">{selectedClient.contact_person}</div> : null}
              {selectedClient?.phone ? <div className="text-sm text-muted-foreground">{selectedClient.phone}</div> : null}
              {selectedClient?.email ? <div className="text-sm text-muted-foreground">{selectedClient.email}</div> : null}
              {selectedClient?.address ? (
                <div className="text-sm text-muted-foreground">
                  {[selectedClient.address, selectedClient.city, selectedClient.state].filter(Boolean).join(', ')}
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>
    </>
  )
}