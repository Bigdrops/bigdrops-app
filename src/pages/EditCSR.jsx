import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import ClientSelector from '../components/ClientSelector'
import {
  createDefaultCsr,
  DEFAULT_CSR_META,
  DEFAULT_MATERIAL_ROW,
  parseCsrMaterials,
  serializeCsrMaterials,
} from '../components/csr/csrUtils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusOptions = [
  'Complete',
  'Incomplete',
  'Pending for spares',
  'Under observation',
  'Working solution provided',
  'Field Entry Pending',
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return isMobile
}

function SectionCard({ title, description, children }) {
  return (
    <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-[28px] sm:shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
      <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-red-50/50 px-4 pb-4 pt-4 sm:px-6">
        <CardTitle className="text-base font-semibold text-slate-950">{title}</CardTitle>
        {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">{children}</CardContent>
    </Card>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600">{label}</Label>
      {children}
    </div>
  )
}

function ToggleRow({ title, description, checked, onCheckedChange }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCheckedChange(!checked)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onCheckedChange(!checked)
        }
      }}
      className="flex min-h-12 cursor-pointer flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="text-xs leading-5 text-slate-600">{description}</div>
      </div>
      <div className="flex justify-end sm:justify-start" onClick={(event) => event.stopPropagation()}>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  )
}

export default function EditCSR() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isMobile = useIsMobile()

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [csr, setCsr] = useState(() => createDefaultCsr(false))
  const [csrMeta, setCsrMeta] = useState(() => ({ ...DEFAULT_CSR_META }))
  const [materialsRows, setMaterialsRows] = useState([{ ...DEFAULT_MATERIAL_ROW }])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from('csrs')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          alert('Error loading CSR: ' + error.message)
          navigate('/csr')
          return
        }

        const parsed = parseCsrMaterials(data.materials_used, data)
        setCsr((current) => ({ ...current, ...data }))
        setCsrMeta(parsed.meta)
        setMaterialsRows(parsed.materialsRows.length > 0 ? parsed.materialsRows : [{ ...DEFAULT_MATERIAL_ROW }])
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadData()
    }
  }, [id, navigate])

  const update = (field, value) => {
    setCsr((current) => ({ ...current, [field]: value }))
  }

  const updateMeta = (field, value) => {
    setCsrMeta((current) => ({ ...current, [field]: value }))
  }

  const updateMaterialRow = (index, field, value) => {
    setMaterialsRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    )
  }

  const addMaterialRow = () => {
    setMaterialsRows((current) => [...current, { ...DEFAULT_MATERIAL_ROW }])
  }

  const removeMaterialRow = (index) => {
    setMaterialsRows((current) =>
      current.length === 1 ? [{ ...DEFAULT_MATERIAL_ROW }] : current.filter((_, rowIndex) => rowIndex !== index)
    )
  }

  const handleSave = async () => {
    if (!csr.client_id) {
      alert('Please select a client before saving')
      return
    }

    const csrData = {
      ...csr,
      client_id: csr.client_id || null,
      linked_invoice_id: csr.linked_invoice_id || null,
      materials_used: serializeCsrMaterials(materialsRows, csrMeta),
    }

    const { data: existing } = await supabase
      .from('csrs')
      .select('id')
      .eq('csr_number', csrData.csr_number)

    if ((existing || []).some((item) => String(item.id) !== String(id))) {
      alert('CSR number already exists. Please use a different number.')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('csrs')
      .update(csrData)
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    navigate('/csr')
  }

  const modelFieldTitle = csrMeta.modelLabel || 'Model'
  const serialFieldTitle = csrMeta.serialLabel || 'Serial No.'
  const handleClientChange = (clientId, clientName, client) => {
    update('client_id', clientId)
    update('client_name', clientName)
    update('address', client?.address || '')
  }

  if (loading) {
    return (
      <Layout title="Edit CSR">
        <div className="mx-auto max-w-5xl">
          <Card className="rounded-xl border-zinc-200 shadow-sm sm:rounded-3xl">
            <CardContent className="p-6 text-sm text-zinc-500">Loading CSR...</CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Edit CSR">
      <div className="mx-auto max-w-5xl p-0 sm:rounded-[32px] sm:border sm:border-slate-200 sm:bg-gradient-to-b sm:from-slate-100/90 sm:via-slate-50 sm:to-white sm:p-5 sm:shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="space-y-5">
        <SectionCard title="Customer Details" description="Update the customer, date, and reference number for this service report.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="CSR Number">
              <Input
                value={csr.csr_number}
                onChange={(event) => update('csr_number', event.target.value)}
                className="font-semibold text-red-700"
              />
            </Field>
            <Field label="Date">
              <Input type="date" value={csr.date} onChange={(event) => update('date', event.target.value)} />
            </Field>
          </div>

          <ClientSelector
            clientId={csr.client_id}
            clientName={csr.client_name}
            onClientChange={handleClientChange}
            isMobile={isMobile}
          />

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Field label="Customer Name">
              <Input value={csr.client_name} onChange={(event) => update('client_name', event.target.value)} />
            </Field>
            <Field label="Address">
              <Input value={csr.address} onChange={(event) => update('address', event.target.value)} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="PO Number" description="Keep the purchase order reference visible only when it applies to this record.">
          <ToggleRow
            title="Include PO Number"
            description="Turn this on to show a purchase order reference on this CSR."
            checked={!!csr.show_po}
            onCheckedChange={(checked) => update('show_po', checked)}
          />

          {csr.show_po && (
            <Field label="PO Number">
              <Input value={csr.po_number} onChange={(event) => update('po_number', event.target.value)} />
            </Field>
          )}
        </SectionCard>

        <SectionCard title="Nature of Problem" description="Update the issue originally reported before service work started.">
          <Field label="Problem Reported">
            <Textarea className="min-h-28" value={csr.problem_reported} onChange={(event) => update('problem_reported', event.target.value)} />
          </Field>
        </SectionCard>

        <SectionCard title="Equipment Details" description="Capture the equipment details and tune the visible field titles when needed.">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Equipment Type">
              <Input value={csr.equipment_type} onChange={(event) => update('equipment_type', event.target.value)} />
            </Field>
            <Field label="Equipment Location">
              <Input value={csr.equipment_location} onChange={(event) => update('equipment_location', event.target.value)} />
            </Field>
            <Field label="Make">
              <Input value={csr.make} onChange={(event) => update('make', event.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Model Field Title">
              <Input value={csrMeta.modelLabel} onChange={(event) => updateMeta('modelLabel', event.target.value)} />
            </Field>
            <Field label="Serial Field Title">
              <Input value={csrMeta.serialLabel} onChange={(event) => updateMeta('serialLabel', event.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label={modelFieldTitle}>
              <Input value={csr.model} onChange={(event) => update('model', event.target.value)} />
            </Field>
            <Field label={serialFieldTitle}>
              <Input value={csr.serial_no} onChange={(event) => update('serial_no', event.target.value)} />
            </Field>
            <Field label="Capacity">
              <Input value={csr.capacity} onChange={(event) => update('capacity', event.target.value)} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Operational Readings" description="Enable this section only when the equipment actually uses operational readings.">
          <ToggleRow
            title="Include operational readings"
            description="Hide the readings block entirely when it does not apply."
            checked={csrMeta.showOperationalReadings}
            onCheckedChange={(checked) => updateMeta('showOperationalReadings', checked)}
          />

          {csrMeta.showOperationalReadings && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Voltage">
                  <Input value={csr.voltage} onChange={(event) => update('voltage', event.target.value)} />
                </Field>
                <Field label="Frequency">
                  <Input value={csr.frequency} onChange={(event) => update('frequency', event.target.value)} />
                </Field>
                <Field label="Battery">
                  <Input value={csr.battery} onChange={(event) => update('battery', event.target.value)} />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Temperature">
                  <Input value={csr.temperature} onChange={(event) => update('temperature', event.target.value)} />
                </Field>
                <Field label="Pressure">
                  <Input value={csr.pressure} onChange={(event) => update('pressure', event.target.value)} />
                </Field>
                <Field label="Hours">
                  <Input value={csr.hours} onChange={(event) => update('hours', event.target.value)} />
                </Field>
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="Materials Used" description="Keep the materials list structured while controlling how it appears in output.">
          <div className="rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-white p-4 sm:rounded-2xl">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
              <div>
                <div className="text-sm font-semibold text-slate-900">Materials Output</div>
                <div className="mt-1 text-xs leading-5 text-slate-600">
                  Choose how materials should appear in the final CSR output.
                </div>
              </div>
              <Field label="Output Style">
                <Select value={csrMeta.materialsOutputStyle} onValueChange={(value) => updateMeta('materialsOutputStyle', value)}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-sky-200 bg-white px-3 text-sm shadow-sm">
                    <SelectValue placeholder="Select output style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">Enumerated List</SelectItem>
                    <SelectItem value="comma">Comma-separated Text</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          {isMobile ? (
            <div className="space-y-3">
              {materialsRows.map((row, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-2xl">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    Material Row {index + 1}
                  </div>
                  <div className="space-y-3">
                    <Field label="Material / Item">
                      <Input value={row.item} onChange={(event) => updateMaterialRow(index, 'item', event.target.value)} />
                    </Field>
                    <div className="grid gap-3 grid-cols-2">
                      <Field label="Quantity">
                        <Input value={row.quantity} onChange={(event) => updateMaterialRow(index, 'quantity', event.target.value)} />
                      </Field>
                      <Field label="Unit">
                        <Input value={row.unit} onChange={(event) => updateMaterialRow(index, 'unit', event.target.value)} />
                      </Field>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => removeMaterialRow(index)} className="w-full">
                      Remove Row
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead>Material / Item</TableHead>
                    <TableHead className="w-[160px]">Quantity</TableHead>
                    <TableHead className="w-[160px]">Unit</TableHead>
                    <TableHead className="w-[92px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialsRows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input value={row.item} onChange={(event) => updateMaterialRow(index, 'item', event.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input value={row.quantity} onChange={(event) => updateMaterialRow(index, 'quantity', event.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input value={row.unit} onChange={(event) => updateMaterialRow(index, 'unit', event.target.value)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeMaterialRow(index)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Button type="button" variant="outline" onClick={addMaterialRow}>
            Add Material Row
          </Button>
        </SectionCard>

        <SectionCard title="Service Execution" description="Update service timing, completion status, and technician details without changing the workflow.">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Start Date">
              <Input type="date" value={csr.start_date} onChange={(event) => update('start_date', event.target.value)} />
            </Field>
            <Field label="Start Time">
              <Input type="time" value={csr.start_time} onChange={(event) => update('start_time', event.target.value)} />
            </Field>
            <Field label="End Date">
              <Input type="date" value={csr.end_date} onChange={(event) => update('end_date', event.target.value)} />
            </Field>
            <Field label="End Time">
              <Input type="time" value={csr.end_time} onChange={(event) => update('end_time', event.target.value)} />
            </Field>
          </div>

          <Field label="Status">
            <Select value={csr.status} onValueChange={(value) => update('status', value)}>
              <SelectTrigger className="h-10 w-full rounded-xl border-zinc-200 bg-white px-3 text-sm">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Service Rendered">
            <Textarea className="min-h-28" value={csr.service_rendered} onChange={(event) => update('service_rendered', event.target.value)} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Technician Name">
              <Input value={csrMeta.technicianName} onChange={(event) => updateMeta('technicianName', event.target.value)} />
            </Field>
            <div className="flex items-end">
              <div className="w-full">
                <ToggleRow
                  title="Technician sign line"
                  description="Show an optional technician sign line in the PDF."
                  checked={csrMeta.showTechnicianSignLine}
                  onCheckedChange={(checked) => updateMeta('showTechnicianSignLine', checked)}
                />
              </div>
            </div>
          </div>

          <Field label="Technician Remarks">
            <Textarea className="min-h-28" value={csr.engineer_remarks} onChange={(event) => update('engineer_remarks', event.target.value)} />
          </Field>

          <Field label="Customer Feedback">
            <Textarea className="min-h-28" value={csr.customer_feedback} onChange={(event) => update('customer_feedback', event.target.value)} />
          </Field>
        </SectionCard>

        <SectionCard title="Acknowledgement" description="Keep sign-off optional and only show the recipient block when it is required.">
          <ToggleRow
            title="Include acknowledgement section"
            description="Hide the full acknowledgement block when this report does not need sign-off."
            checked={csrMeta.showAcknowledgement}
            onCheckedChange={(checked) => updateMeta('showAcknowledgement', checked)}
          />

          {csrMeta.showAcknowledgement && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Section Title">
                  <Input value={csrMeta.recipientTitle} onChange={(event) => updateMeta('recipientTitle', event.target.value)} />
                </Field>
                <Field label="Recipient / Witness Role">
                  <Input value={csrMeta.recipientRole} onChange={(event) => updateMeta('recipientRole', event.target.value)} />
                </Field>
              </div>

              <Field label="Recipient / Witness Name">
                <Input value={csr.acknowledgement_name} onChange={(event) => update('acknowledgement_name', event.target.value)} />
              </Field>
            </>
          )}
        </SectionCard>

        <Separator />

        <div className="flex flex-col-reverse gap-3 pb-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/csr/' + id)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
        </div>
      </div>
    </Layout>
  )
}
