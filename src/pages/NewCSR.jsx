import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { pdf } from '@react-pdf/renderer'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import ClientSelector from '../components/ClientSelector'
import {
  buildCsrPreviewData,
  createDefaultCsr,
  DEFAULT_CSR_META,
  DEFAULT_MATERIAL_ROW,
  getNextCsrNumber,
  serializeCsrMaterials,
} from '../components/csr/csrUtils'
import { getCsrPdfDocument } from '../components/csr/CSRPreviewTemplates'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const EMPTY_BRANDING = {
  companyName: '',
  companyTagline: '',
  contactLine: '',
  footerText: '',
}

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
    <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border bg-muted/50 px-4 py-4 sm:px-6">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">{children}</CardContent>
    </Card>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
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
      className={`flex min-h-12 cursor-pointer flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm transition-colors sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl ${
        checked
          ? 'border-red-200 bg-gradient-to-r from-red-50 via-white to-amber-50'
          : 'border-slate-200 bg-gradient-to-r from-slate-50 to-white'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${checked ? 'bg-red-500' : 'bg-slate-300'}`} />
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${checked ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
            {checked ? 'On' : 'Off'}
          </span>
        </div>
        <div className="text-xs leading-5 text-muted-foreground">{description}</div>
      </div>
      <div className="flex justify-end sm:justify-start" onClick={(event) => event.stopPropagation()}>
      <div className={`rounded-full border px-2 py-1 ${checked ? 'border-red-200 bg-background shadow-[0_0_0_4px_rgba(254,226,226,0.8)]' : 'border-slate-200 bg-background'}`}>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
    </div>
  )
}

export default function NewCSR() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type')
  const isField = type === 'field'
  const isMobile = useIsMobile()

  const [saving, setSaving] = useState(false)
  const [csr, setCsr] = useState(() => createDefaultCsr(isField))
  const [csrMeta, setCsrMeta] = useState(() => ({ ...DEFAULT_CSR_META }))
  const [materialsRows, setMaterialsRows] = useState([{ ...DEFAULT_MATERIAL_ROW }])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data: latestRows } = await supabase
        .from('csrs')
        .select('csr_number')
        .order('created_at', { ascending: false })
        .order('csr_number', { ascending: false })
        .limit(1)

      const latestNumber = latestRows?.[0]?.csr_number || ''
      const nextNumber = getNextCsrNumber(latestNumber)

      if (mounted) {
        setCsr((current) => ({
          ...current,
          csr_number: current.csr_number || nextNumber,
          status: isField ? 'Field Entry Pending' : current.status,
        }))
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [isField])

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
    if (!isField && !csr.client_id) {
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

    if (existing && existing.length > 0) {
      alert('CSR number already exists. Please use a different number.')
      return
    }

    setSaving(true)
    const { data: savedCsr, error } = await supabase
      .from('csrs')
      .insert([csrData])
      .select('id, csr_number')
      .single()

    if (error) {
      alert('Error: ' + error.message)
      setSaving(false)
      return
    }

    setSaving(false)

    if (isField) {
      try {
        const previewData = buildCsrPreviewData(csrData)
        const blob = await pdf(
          getCsrPdfDocument({ csr: previewData, branding: EMPTY_BRANDING, template: '3' })
        ).toBlob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = (csrData.csr_number || 'csr') + '.pdf'
        a.click()
      } catch (error) {
        console.error('Failed to generate PDF', error)
      }
    }

    navigate('/csr/' + savedCsr.id)
  }

  const modelFieldTitle = csrMeta.modelLabel || 'Model'
  const serialFieldTitle = csrMeta.serialLabel || 'Serial No.'
  const handleClientChange = (clientId, clientName, client) => {
    update('client_id', clientId)
    update('client_name', clientName)
    update('address', client?.address || '')
  }

  return (
    <Layout title="New CSR">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
        <SectionCard title="Customer Details" description="Identify the customer, date, and reference number for this service report.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="CSR Number">
              <Input
                value={csr.csr_number}
                onChange={(event) => update('csr_number', event.target.value)}
                className="font-semibold text-red-700"
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={csr.date}
                onChange={(event) => update('date', event.target.value)}
              />
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
              <Input
                value={csr.client_name}
                onChange={(event) => update('client_name', event.target.value)}
              />
            </Field>
            <Field label="Address">
              <Input
                value={csr.address}
                onChange={(event) => update('address', event.target.value)}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="PO Number" description="Include a purchase order reference only when it applies to this job.">
          <ToggleRow
            title="Include PO Number"
            description="Turn this on to capture a purchase order reference."
            checked={!!csr.show_po}
            onCheckedChange={(checked) => update('show_po', checked)}
          />

          {csr.show_po && (
            <Field label="PO Number">
              <Input
                value={csr.po_number}
                onChange={(event) => update('po_number', event.target.value)}
              />
            </Field>
          )}
        </SectionCard>

        <SectionCard title="Nature of Problem" description="Describe the issue reported before service work began.">
          <Field label="Problem Reported">
            <Textarea
              className="min-h-28"
              value={csr.problem_reported}
              onChange={(event) => update('problem_reported', event.target.value)}
            />
          </Field>
        </SectionCard>

        <SectionCard title="Equipment Details" description="Capture the equipment identity and adapt the field titles when needed.">
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

        <SectionCard title="Operational Readings" description="Enable this only for equipment that uses measurable readings.">
          <ToggleRow
            title="Include operational readings"
            description="Hide the readings section entirely when it does not apply."
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

        <SectionCard title="Materials Used" description="Capture materials in a structured table and choose how they should appear in output.">
          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
              <div>
                <div className="text-sm font-semibold text-foreground">Materials Output</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  Choose how materials should appear in the final CSR output.
                </div>
              </div>
              <Field label="Output Style">
                <Select
                  value={csrMeta.materialsOutputStyle}
                  onValueChange={(value) => updateMeta('materialsOutputStyle', value)}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-border bg-background px-3 text-sm shadow-sm">
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
                <div key={index} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
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
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50">
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

        <SectionCard title="Service Execution" description="Record timing, status, service details, and technician information.">
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
              <SelectTrigger className="h-10 w-full rounded-xl border-border bg-background px-3 text-sm">
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
            <Textarea
              className="min-h-28"
              value={csr.service_rendered}
              onChange={(event) => update('service_rendered', event.target.value)}
            />
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
            <Textarea
              className="min-h-28"
              value={csr.engineer_remarks}
              onChange={(event) => update('engineer_remarks', event.target.value)}
            />
          </Field>

          <Field label="Customer Feedback">
            <Textarea
              className="min-h-28"
              value={csr.customer_feedback}
              onChange={(event) => update('customer_feedback', event.target.value)}
            />
          </Field>
        </SectionCard>

        <SectionCard title="Acknowledgement" description="Include a recipient or witness block only when this report needs sign-off.">
          <ToggleRow
            title="Include acknowledgement section"
            description="Hide the entire acknowledgement block when sign-off is not required."
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

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/csr')}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save CSR'}
          </Button>
        </div>
        </div>
      </div>
    </Layout>
  )
}
