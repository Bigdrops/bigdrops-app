import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Upload, X } from 'lucide-react'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import ClientSelector from '../components/ClientSelector'
import { CONDITION_OPTIONS, createDefaultItem } from '../components/waybill/waybillUtils'
import type { Waybill, WaybillItem, WaybillStatus } from '../components/waybill/waybillUtils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
    </div>
  )
}

function SectionCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader className={`border-b border-border px-4 py-3 ${accent}`}>
        <CardTitle className="text-sm font-bold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">{children}</CardContent>
    </Card>
  )
}

export default function EditWaybill() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [waybill, setWaybill] = useState<Waybill | null>(null)
  const [items, setItems] = useState<WaybillItem[]>([createDefaultItem()])
  const [sigUploading, setSigUploading] = useState(false)
  const sigInputRef = useRef<HTMLInputElement>(null)

  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [invoiceSuggestions, setInvoiceSuggestions] = useState<{ id: string; invoice_number: string }[]>([])
  const [projectSearch, setProjectSearch] = useState('')
  const [projectSuggestions, setProjectSuggestions] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    supabase.from('waybills').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setWaybill(data as Waybill)
        setItems(Array.isArray(data.items) && data.items.length > 0 ? data.items : [createDefaultItem()])
      }
      setLoading(false)
    })
  }, [id])

  const update = (field: string, value: unknown) =>
    setWaybill((prev) => prev ? { ...prev, [field]: value } : prev)

  const updateItem = (index: number, field: keyof WaybillItem, value: unknown) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))

  const addItem = () => setItems((prev) => [...prev, createDefaultItem()])

  const removeItem = (index: number) =>
    setItems((prev) => (prev.length === 1 ? [createDefaultItem()] : prev.filter((_, i) => i !== index)))

  const handleSigUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSigUploading(true)
    const ext = file.name.split('.').pop()
    const path = `sig_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('signatures').upload(path, file, { upsert: true })
    if (upErr) {
      alert('Upload failed: ' + upErr.message)
      setSigUploading(false)
      return
    }
    const { data } = supabase.storage.from('signatures').getPublicUrl(path)
    update('receiver_signature_url', data.publicUrl)
    setSigUploading(false)
    e.target.value = ''
  }

  const searchInvoices = async (q: string) => {
    setInvoiceSearch(q)
    if (!q.trim()) { setInvoiceSuggestions([]); return }
    const { data } = await supabase.from('invoices').select('id, invoice_number').ilike('invoice_number', `%${q}%`).limit(6)
    setInvoiceSuggestions((data as { id: string; invoice_number: string }[]) || [])
  }

  const searchProjects = async (q: string) => {
    setProjectSearch(q)
    if (!q.trim()) { setProjectSuggestions([]); return }
    const { data } = await supabase.from('projects').select('id, name').ilike('name', `%${q}%`).limit(6)
    setProjectSuggestions((data as { id: string; name: string }[]) || [])
  }

  const handleSave = async () => {
    if (!waybill) return
    setError('')
    if (!waybill.date) { setError('Date is required.'); return }
    const validItems = items.filter((i) => i.description.trim())
    if (!validItems.length) { setError('At least one item with a description is required.'); return }

    setSaving(true)
    const { error: dbErr } = await supabase
      .from('waybills')
      .update({
        ...waybill,
        items,
        client_id: waybill.client_id || null,
        invoice_id: waybill.invoice_id || null,
        project_id: waybill.project_id || null,
      })
      .eq('id', id)

    if (dbErr) {
      setError(dbErr.message)
      setSaving(false)
      return
    }
    navigate(`/waybills/${id}`)
  }

  if (loading) return <Layout title="Edit Waybill"><div className="py-16 text-center text-sm text-muted-foreground">Loading…</div></Layout>
  if (!waybill) return <Layout title="Edit Waybill"><div className="py-16 text-center text-sm text-red-600">Waybill not found.</div></Layout>

  return (
    <Layout title="Edit Waybill">
      <div className="mx-auto max-w-2xl py-4 pb-28">
        <div className="space-y-4">

          <SectionCard title="Waybill Details" accent="bg-gradient-to-r from-emerald-50 to-white">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Type">
                  <div className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-semibold capitalize text-muted-foreground">
                    {waybill.type} (cannot change after creation)
                  </div>
                </Field>
              </div>
              <Field label="Waybill Number">
                <Input value={waybill.waybill_number} readOnly className="bg-muted/50 font-mono font-semibold text-emerald-700" />
              </Field>
              <Field label="Date" required>
                <Input type="date" value={waybill.date} onChange={(e) => update('date', e.target.value)} />
              </Field>
              <Field label="Time">
                <Input type="time" value={waybill.time || ''} onChange={(e) => update('time', e.target.value)} />
              </Field>
              <Field label="Status">
                <Select value={waybill.status} onValueChange={(v) => update('status', v as WaybillStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Parties & Delivery" accent="bg-gradient-to-r from-blue-50 to-white">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sender Name">
                <Input value={waybill.sender_name || ''} onChange={(e) => update('sender_name', e.target.value)} placeholder="From" />
              </Field>
              <Field label="Receiver Name">
                <Input value={waybill.receiver_name || ''} onChange={(e) => update('receiver_name', e.target.value)} placeholder="To" />
              </Field>
              <div className="col-span-2">
                <ClientSelector
                  clientId={waybill.client_id}
                  clientName={waybill.client_name}
                  onClientChange={(cid, name) => { update('client_id', cid); update('client_name', name) }}
                  isMobile={false}
                  compact
                />
              </div>
              <Field label="Vehicle Plate">
                <Input value={waybill.vehicle_plate || ''} onChange={(e) => update('vehicle_plate', e.target.value)} placeholder="e.g. ABC 1234" />
              </Field>
              <Field label="PO Number">
                <Input value={waybill.po_number || ''} onChange={(e) => update('po_number', e.target.value)} placeholder="Optional" />
              </Field>
              <div className="col-span-2">
                <Field label="Delivery Location">
                  <Input value={waybill.delivery_location || ''} onChange={(e) => update('delivery_location', e.target.value)} placeholder="Address or site name" />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Linked Documents" accent="bg-gradient-to-r from-purple-50 to-white">
            <div className="grid grid-cols-1 gap-3">
              <Field label="Link to Invoice">
                <div className="relative">
                  <Input
                    value={invoiceSearch || waybill.invoice_id || ''}
                    onChange={(e) => { update('invoice_id', ''); void searchInvoices(e.target.value) }}
                    placeholder="Search invoice number…"
                  />
                  {invoiceSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-lg">
                      {invoiceSuggestions.map((inv) => (
                        <button key={inv.id} type="button"
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50"
                          onClick={() => { update('invoice_id', inv.id); setInvoiceSearch(inv.invoice_number); setInvoiceSuggestions([]) }}
                        >{inv.invoice_number}</button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Link to Project">
                <div className="relative">
                  <Input
                    value={projectSearch || waybill.project_id || ''}
                    onChange={(e) => { update('project_id', ''); void searchProjects(e.target.value) }}
                    placeholder="Search project name…"
                  />
                  {projectSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card shadow-lg">
                      {projectSuggestions.map((proj) => (
                        <button key={proj.id} type="button"
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50"
                          onClick={() => { update('project_id', proj.id); setProjectSearch(proj.name); setProjectSuggestions([]) }}
                        >{proj.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Items" accent="bg-gradient-to-r from-amber-50 to-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-2 pr-2 text-left font-semibold">Description</th>
                    <th className="pb-2 pr-2 text-left font-semibold w-16">Qty</th>
                    <th className="pb-2 pr-2 text-left font-semibold w-20">Unit</th>
                    <th className="pb-2 pr-2 text-left font-semibold w-28">Condition</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-2">
                        <Input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="Item description" className="h-8 text-xs" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} className="h-8 w-16 text-xs" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Input value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} placeholder="pcs" className="h-8 w-20 text-xs" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <Select value={item.condition} onValueChange={(v) => updateItem(i, 'condition', v)}>
                          <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CONDITION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-1.5">
                        <button type="button" onClick={() => removeItem(i)} className="grid h-8 w-8 place-items-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-2 gap-2 rounded-xl border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
          </SectionCard>

          <SectionCard title="Additional Info" accent="bg-gradient-to-r from-slate-50 to-white">
            <Field label="Notes">
              <Textarea value={waybill.notes || ''} onChange={(e) => update('notes', e.target.value)} placeholder="Any notes about this delivery…" rows={3} />
            </Field>
            <Field label="Receiver Description">
              <Input value={waybill.receiver_description || ''} onChange={(e) => update('receiver_description', e.target.value)} placeholder="Name, role, witness notes" />
            </Field>
            <Field label="Receiver Signature">
              <div className="flex items-center gap-3">
                {waybill.receiver_signature_url ? (
                  <div className="relative">
                    <img src={waybill.receiver_signature_url} alt="Signature" className="h-16 rounded-lg border border-border object-contain" />
                    <button type="button" onClick={() => update('receiver_signature_url', '')} className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
                <Button type="button" variant="outline" size="sm" onClick={() => sigInputRef.current?.click()} disabled={sigUploading} className="gap-2 rounded-xl">
                  <Upload className="h-3.5 w-3.5" />
                  {sigUploading ? 'Uploading…' : 'Upload Signature'}
                </Button>
                <input ref={sigInputRef} type="file" accept="image/*" className="hidden" onChange={handleSigUpload} />
              </div>
            </Field>
          </SectionCard>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(`/waybills/${id}`)} className="flex-1 rounded-xl">Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
