import * as React from 'react'
import { Hash, MoreHorizontal, Save } from 'lucide-react'

import { supabase } from '@/supabase'
import ClientSelector from '@/components/ClientSelector'
import UnitInput from '@/components/UnitInput'
import CsrImportSheet from '@/components/csr/CsrImportSheet'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ParsedCsrImport } from '@/components/csr/csrImport'

type SignatoryRow = {
  id: string
  name: string
  role?: string | null
  signature_url?: string | null
}

type MaterialRow = {
  item: string
  quantity: string
  unit: string
}

type CsrMeta = {
  showOperationalReadings?: boolean
  modelLabel?: string
  serialLabel?: string
  showAcknowledgement?: boolean
  recipientTitle?: string
  recipientRole?: string
  technicianName?: string
  showTechnicianSignLine?: boolean
  materialsOutputStyle?: 'list' | 'comma'
}

type CsrRecord = Record<string, any>

type Props = {
  mode: 'new' | 'edit'
  csr: CsrRecord
  csrMeta: CsrMeta
  materialsRows: MaterialRow[]
  saving: boolean
  onUpdate: (field: string, value: any) => void
  onUpdateMeta: (field: string, value: any) => void
  onUpdateMaterialRow: (index: number, field: string, value: string) => void
  onAddMaterialRow: () => void
  onRemoveMaterialRow: (index: number) => void
  onApplyImport: (result: ParsedCsrImport) => void
  onSave: () => void
}

const STATUS_OPTIONS = [
  'Operational',
  'Running with observation',
  'Pending parts',
  'Temporarily restored',
  'Not running',
]

const CALL_TYPE_OPTIONS = ['Warranty', 'AMC', 'Paid Service']
const YES_NO_OPTIONS = ['Yes', 'No']

function Section({
  title,
  dotClassName,
  action,
  children,
}: {
  title: React.ReactNode
  dotClassName: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
        <div className="flex min-w-0 items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#64748b]">
          <span className={`h-2 w-2 rounded-full ${dotClassName}`} />
          <span className="truncate">{title}</span>
        </div>
        {action}
      </div>
      <div className="rounded-[20px] border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]">
        {children}
      </div>
    </section>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">{children}</label>
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 text-[14px] text-[#0f172a] outline-none ${props.className || ''}`}
    />
  )
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[84px] w-full rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 py-3 text-[14px] text-[#0f172a] outline-none ${props.className || ''}`}
    />
  )
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
}) {
  const safeValue = value && options.includes(value) ? value : '__placeholder__'

  return (
    <Select value={safeValue} onValueChange={(next) => onChange(next === '__placeholder__' ? '' : next)}>
      <SelectTrigger className="h-11 w-full rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 text-[14px] text-[#0f172a] shadow-none focus:ring-0 focus:ring-offset-0">
        <SelectValue placeholder={placeholder || 'Select'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__placeholder__">{placeholder || 'Select'}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function HeaderActionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 items-center gap-2 rounded-full border-[1.5px] border-[#e2e8f0] bg-white px-[13px] text-[12px] font-bold text-[#334155] disabled:opacity-60"
    >
      {children}
    </button>
  )
}

export default function CsrFormScreen({
  mode,
  csr,
  csrMeta,
  materialsRows,
  saving,
  onUpdate,
  onUpdateMeta,
  onUpdateMaterialRow,
  onAddMaterialRow,
  onRemoveMaterialRow,
  onApplyImport,
  onSave,
}: Props) {
  const [signatories, setSignatories] = React.useState<SignatoryRow[]>([])
  const [signatorySheetOpen, setSignatorySheetOpen] = React.useState(false)
  const [importSheetOpen, setImportSheetOpen] = React.useState(false)
  const [materialsTitle, setMaterialsTitle] = React.useState('Materials Used')
  const [recipientSignatureName, setRecipientSignatureName] = React.useState('')
  const recipientSignatureInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data } = await supabase.from('signatories').select('*').order('name')

      if (!mounted) return
      setSignatories((data || []) as SignatoryRow[])
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const selectedSignatory =
    signatories.find((entry) => String(entry.id) === String(csr.technician_signatory_id || '')) || null
  const materialCount = materialsRows.filter((row) => row.item || row.quantity || row.unit).length

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#f2f4f8] px-3 pb-[200px] pt-4 sm:px-4">
      <div className="space-y-5">
        <Section title="Document Details" dotClassName="bg-[#0f172a]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">
                {mode === 'new' ? 'New CSR' : 'Edit CSR'}
              </div>
              <h1 className="mt-1 text-[28px] font-black leading-none tracking-[-0.04em] text-[#0f172a]">
                {mode === 'new' ? 'Create CSR' : 'Update CSR'}
              </h1>
            </div>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border-[1.5px] border-[#e2e8f0] bg-white text-[#475569]"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 rounded-[16px] border-2 border-dashed border-[#d8e1ec] bg-[#f8fafc] p-3">
            <ClientSelector
              clientId={String(csr.client_id || '')}
              clientName={String(csr.client_name || '')}
              isMobile
              onClientChange={(clientId: string, clientName: string, client: { address?: string | null } | null) => {
                onUpdate('client_id', clientId || '')
                onUpdate('client_name', clientName || '')
                onUpdate('address', client?.address || '')
              }}
            />
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <FieldLabel>CSR Number</FieldLabel>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <TextInput
                  value={String(csr.csr_number || '')}
                  onChange={(event) => onUpdate('csr_number', event.target.value)}
                  className="bg-[#f8fafc] pl-9 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Date</FieldLabel>
                <TextInput
                  type="date"
                  value={String(csr.date || '')}
                  onChange={(event) => onUpdate('date', event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Customer Name</FieldLabel>
                <TextInput
                  value={String(csr.client_name || '')}
                  onChange={(event) => onUpdate('client_name', event.target.value)}
                />
              </div>
            </div>

            <div>
              <FieldLabel>PO Number</FieldLabel>
              <TextInput
                value={String(csr.po_number || '')}
                placeholder="Optional"
                onChange={(event) => {
                  onUpdate('po_number', event.target.value)
                  onUpdate('show_po', Boolean(event.target.value.trim()))
                }}
              />
            </div>
          </div>
        </Section>

        <Section title="Item Controls" dotClassName="bg-[#475569]">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setImportSheetOpen(true)}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[#e2e8f0] bg-white px-3 text-[13px] font-bold text-[#334155]"
            >
              Import
            </button>
            <button
              type="button"
              disabled
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[#e2e8f0] bg-white px-3 text-[13px] font-bold text-[#334155] opacity-70"
            >
              Settings
            </button>
          </div>
        </Section>

        <Section title="Main Details" dotClassName="bg-[#8b5cf6]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Call Type</FieldLabel>
              <SelectField
                value={String(csr.call_type || '')}
                onChange={(value) => onUpdate('call_type', value)}
                options={CALL_TYPE_OPTIONS}
                placeholder="Select"
              />
            </div>
            <div>
              <FieldLabel>System Down</FieldLabel>
              <SelectField
                value={csr.system_down === true ? 'Yes' : csr.system_down === false ? 'No' : ''}
                onChange={(value) => {
                  if (!value) {
                    onUpdate('system_down', null)
                    return
                  }
                  onUpdate('system_down', value === 'Yes')
                }}
                options={YES_NO_OPTIONS}
                placeholder="Select"
              />
            </div>
          </div>
        </Section>

        <Section title="Equipment" dotClassName="bg-[#475569]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Equipment Type</FieldLabel>
                <TextInput
                  value={String(csr.equipment_type || '')}
                  onChange={(event) => onUpdate('equipment_type', event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Equipment Location</FieldLabel>
                <TextInput
                  value={String(csr.equipment_location || '')}
                  onChange={(event) => onUpdate('equipment_location', event.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Make</FieldLabel>
                <TextInput value={String(csr.make || '')} onChange={(event) => onUpdate('make', event.target.value)} />
              </div>
              <div>
                <FieldLabel>Capacity</FieldLabel>
                <TextInput
                  value={String(csr.capacity || '')}
                  onChange={(event) => onUpdate('capacity', event.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>{csrMeta.modelLabel || 'Model'}</FieldLabel>
                <TextInput value={String(csr.model || '')} onChange={(event) => onUpdate('model', event.target.value)} />
              </div>
              <div>
                <FieldLabel>{csrMeta.serialLabel || 'Serial No.'}</FieldLabel>
                <TextInput
                  value={String(csr.serial_no || '')}
                  onChange={(event) => onUpdate('serial_no', event.target.value)}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Problem & Service" dotClassName="bg-[#ef4444]">
          <div className="space-y-3">
            <div>
              <FieldLabel>Problem Reported</FieldLabel>
              <TextArea
                value={String(csr.problem_reported || '')}
                onChange={(event) => onUpdate('problem_reported', event.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Service Rendered</FieldLabel>
              <TextArea
                className="min-h-[96px]"
                value={String(csr.service_rendered || '')}
                onChange={(event) => onUpdate('service_rendered', event.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Defects Found</FieldLabel>
              <TextArea
                value={String(csr.defects_found || '')}
                onChange={(event) => onUpdate('defects_found', event.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Engineer Remarks</FieldLabel>
              <TextArea
                value={String(csr.engineer_remarks || '')}
                onChange={(event) => onUpdate('engineer_remarks', event.target.value)}
              />
            </div>
          </div>
        </Section>

        <Section title="Service Execution" dotClassName="bg-[#0f172a]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Start Date</FieldLabel>
                <TextInput
                  type="date"
                  value={String(csr.start_date || '')}
                  onChange={(event) => onUpdate('start_date', event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Start Time</FieldLabel>
                <TextInput
                  type="time"
                  value={String(csr.start_time || '')}
                  onChange={(event) => onUpdate('start_time', event.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>End Date</FieldLabel>
                <TextInput
                  type="date"
                  value={String(csr.end_date || '')}
                  onChange={(event) => onUpdate('end_date', event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>End Time</FieldLabel>
                <TextInput
                  type="time"
                  value={String(csr.end_time || '')}
                  onChange={(event) => onUpdate('end_time', event.target.value)}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Status After Service</FieldLabel>
              <SelectField
                value={String(csr.status || '')}
                onChange={(value) => onUpdate('status', value)}
                options={STATUS_OPTIONS}
                placeholder="Select"
              />
            </div>
          </div>
        </Section>

        <Section
          title="Operational Readings"
          dotClassName="bg-[#f59e0b]"
          action={
            <HeaderActionButton onClick={() => onUpdateMeta('showOperationalReadings', !csrMeta.showOperationalReadings)}>
              {csrMeta.showOperationalReadings ? 'Hide section' : 'Show section'}
            </HeaderActionButton>
          }
        >
          {csrMeta.showOperationalReadings ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Voltage</FieldLabel>
                <TextInput value={String(csr.voltage || '')} onChange={(event) => onUpdate('voltage', event.target.value)} />
              </div>
              <div>
                <FieldLabel>Frequency</FieldLabel>
                <TextInput
                  value={String(csr.frequency || '')}
                  onChange={(event) => onUpdate('frequency', event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Battery</FieldLabel>
                <TextInput value={String(csr.battery || '')} onChange={(event) => onUpdate('battery', event.target.value)} />
              </div>
              <div>
                <FieldLabel>Temperature</FieldLabel>
                <TextInput
                  value={String(csr.temperature || '')}
                  onChange={(event) => onUpdate('temperature', event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Pressure</FieldLabel>
                <TextInput
                  value={String(csr.pressure || '')}
                  onChange={(event) => onUpdate('pressure', event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Hours</FieldLabel>
                <TextInput value={String(csr.hours || '')} onChange={(event) => onUpdate('hours', event.target.value)} />
              </div>
            </div>
          ) : null}
        </Section>

        <Section
          title={
            <input
              value={materialsTitle}
              onChange={(event) => setMaterialsTitle(event.target.value)}
              className="w-32 bg-transparent text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#64748b] outline-none"
            />
          }
          dotClassName="bg-[#059669]"
          action={
            <span className="inline-flex h-8 items-center rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 text-[12px] font-bold text-[#16a34a]">
              {materialCount} item{materialCount === 1 ? '' : 's'}
            </span>
          }
        >
          <div className="space-y-3">
            <div className="flex gap-[3px] rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] p-[3px]">
              <button
                type="button"
                onClick={() => onUpdateMeta('materialsOutputStyle', 'comma')}
                className={`h-9 flex-1 rounded-[9px] px-3 text-[12px] font-extrabold ${
                  csrMeta.materialsOutputStyle === 'comma' ? 'bg-[#0f172a] text-white' : 'text-[#64748b]'
                }`}
              >
                Comma
              </button>
              <button
                type="button"
                onClick={() => onUpdateMeta('materialsOutputStyle', 'list')}
                className={`h-9 flex-1 rounded-[9px] px-3 text-[12px] font-extrabold ${
                  csrMeta.materialsOutputStyle !== 'comma' ? 'bg-[#0f172a] text-white' : 'text-[#64748b]'
                }`}
              >
                Enumerate
              </button>
            </div>

            <div className="space-y-3">
              {materialsRows.map((row, index) => (
                <div key={index} className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
                  <div className="grid grid-cols-[minmax(0,1.4fr)_88px_86px] gap-3">
                    <TextInput
                      value={row.item}
                      onChange={(event) => onUpdateMaterialRow(index, 'item', event.target.value)}
                      placeholder="Material"
                      className="bg-white"
                    />

                    <TextInput
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={row.quantity}
                      onChange={(event) => {
                        const next = event.target.value
                        if (next === '' || /^\d*\.?\d*$/.test(next)) {
                          onUpdateMaterialRow(index, 'quantity', next)
                        }
                      }}
                      placeholder="Qty"
                      className="bg-white text-center"
                    />

                    <div className="[&>div>input]:h-11 [&>div>input]:rounded-[12px] [&>div>input]:border-[1.5px] [&>div>input]:border-[#e2e8f0] [&>div>input]:bg-white [&>div>input]:px-3 [&>div>input]:text-[14px]">
                      <UnitInput value={row.unit || ''} onChange={(value) => onUpdateMaterialRow(index, 'unit', value)} />
                    </div>
                  </div>

                  {materialsRows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onRemoveMaterialRow(index)}
                      className="mt-3 text-[12px] font-bold text-[#ef4444]"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onAddMaterialRow}
              className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[#e2e8f0] px-3 text-[13px] font-bold text-[#334155]"
            >
              Add material
            </button>
          </div>
        </Section>

        <Section
          title="Technician"
          dotClassName="bg-[#0ea5e9]"
          action={
            <HeaderActionButton onClick={() => onUpdateMeta('showTechnicianSignLine', !csrMeta.showTechnicianSignLine)}>
              {csrMeta.showTechnicianSignLine ? 'Included' : 'Include'}
            </HeaderActionButton>
          }
        >
          {csrMeta.showTechnicianSignLine ? (
            <div className="space-y-3">
              <div>
                <FieldLabel>Technician Name</FieldLabel>
                <TextInput
                  value={String(csrMeta.technicianName || '')}
                  onChange={(event) => onUpdateMeta('technicianName', event.target.value)}
                />
              </div>
              <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <div className="text-[13px] font-bold text-[#0f172a]">Technician Signature</div>
                <div className="mt-1 text-[11px] text-[#94a3b8]">
                  {selectedSignatory ? selectedSignatory.name : 'Leave blank for offline sign.'}
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => setSignatorySheetOpen(true)}
                    className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-[#0f172a] bg-[#0f172a] px-[13px] text-[12px] font-bold text-white"
                  >
                    {selectedSignatory ? 'Change signatory' : 'Choose signatory'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate('technician_signatory_id', null)}
                    className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-[#e2e8f0] bg-white px-[13px] text-[12px] font-bold text-[#334155]"
                  >
                    Leave blank
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </Section>

        <Section
          title="Acknowledgement"
          dotClassName="bg-[#0f172a]"
          action={
            <HeaderActionButton onClick={() => onUpdateMeta('showAcknowledgement', !csrMeta.showAcknowledgement)}>
              {csrMeta.showAcknowledgement ? 'Included' : 'Include'}
            </HeaderActionButton>
          }
        >
          {csrMeta.showAcknowledgement ? (
            <div className="space-y-3">
              <div>
                <FieldLabel>Name</FieldLabel>
                <TextInput
                  value={String(csr.acknowledgement_name || '')}
                  onChange={(event) => onUpdate('acknowledgement_name', event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Recipient / Witness Role</FieldLabel>
                <TextInput
                  value={String(csrMeta.recipientRole || '')}
                  onChange={(event) => onUpdateMeta('recipientRole', event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Customer Feedback</FieldLabel>
                <TextArea
                  value={String(csr.customer_feedback || '')}
                  onChange={(event) => onUpdate('customer_feedback', event.target.value)}
                />
              </div>

              <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <div className="text-[13px] font-bold text-[#0f172a]">Recipient Signature</div>
                <div className="mt-1 text-[11px] text-[#94a3b8]">
                  {recipientSignatureName || 'Leave blank for offline sign.'}
                </div>
                <input
                  ref={recipientSignatureInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    setRecipientSignatureName(file?.name || '')
                  }}
                />
                <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => recipientSignatureInputRef.current?.click()}
                    className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-[#0f172a] bg-[#0f172a] px-[13px] text-[12px] font-bold text-white"
                  >
                    Upload signature
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientSignatureName('')
                      if (recipientSignatureInputRef.current) {
                        recipientSignatureInputRef.current.value = ''
                      }
                    }}
                    className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-[#e2e8f0] bg-white px-[13px] text-[12px] font-bold text-[#334155]"
                  >
                    Leave blank
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </Section>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="fixed bottom-[108px] right-5 z-[70] flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#0f172a] text-white shadow-[0_10px_28px_rgba(15,23,42,0.24)] disabled:opacity-60"
        aria-label={saving ? 'Saving CSR' : 'Save CSR'}
      >
        <Save className="h-7 w-7" />
      </button>

      <Sheet open={signatorySheetOpen} onOpenChange={setSignatorySheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[24px]">
          <SheetHeader className="text-left">
            <SheetTitle>Choose Signatory</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2 pb-4">
            {signatories.length === 0 ? (
              <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-6 text-center text-[13px] text-[#64748b]">
                No signatories found.
              </div>
            ) : (
              signatories.map((signatory) => {
                const active = String(signatory.id) === String(csr.technician_signatory_id || '')
                return (
                  <button
                    key={signatory.id}
                    type="button"
                    onClick={() => {
                      onUpdate('technician_signatory_id', signatory.id)
                      setSignatorySheetOpen(false)
                    }}
                    className={`w-full rounded-[16px] border p-4 text-left ${
                      active ? 'border-[#0f172a] bg-[#0f172a] text-white' : 'border-[#e2e8f0] bg-white text-[#0f172a]'
                    }`}
                  >
                    <div className="text-[14px] font-bold">{signatory.name}</div>
                    {signatory.role ? (
                      <div className={`mt-1 text-[12px] ${active ? 'text-slate-300' : 'text-[#64748b]'}`}>
                        {signatory.role}
                      </div>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <CsrImportSheet
        open={importSheetOpen}
        onOpenChange={setImportSheetOpen}
        onApplyImport={onApplyImport}
      />
    </div>
  )
}
