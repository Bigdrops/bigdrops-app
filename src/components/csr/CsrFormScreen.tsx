import * as React from 'react'
import { Download, Hash, Lock, MoreHorizontal, Save } from 'lucide-react'

import { supabase } from '@/supabase'
import ClientSelector from '@/components/ClientSelector'
import UnitInput from '@/components/UnitInput'
import CsrImportSheet from '@/components/csr/CsrImportSheet'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ParsedCsrImport } from '@/components/csr/csrImport'
import MobileFab from '@/components/layout/MobileFab'
import { NumericInput } from '@/components/ui/numeric-input'
import { IMAGE_ACCEPT_ATTRIBUTE, isSupportedImageFile, getUnsupportedImageErrorMessage } from '@/lib/documentImageUploadPolicy'
import { feedback } from '@/lib/feedback'

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
}

type CsrRecord = Record<string, any>

type Props = {
  mode: 'new' | 'edit'
  csr: CsrRecord
  csrMeta: CsrMeta
  materialsRows: MaterialRow[]
  saving: boolean
  csrNumberReady?: boolean
  onUpdate: (field: string, value: any) => void
  onUpdateMeta: (field: string, value: any) => void
  onUpdateMaterialRow: (index: number, field: string, value: string) => void
  onAddMaterialRow: () => void
  onRemoveMaterialRow: (index: number) => void
  onApplyImport: (result: ParsedCsrImport) => void
  onSave: () => void
  onDownloadBlank?: () => void
  onLockedFieldClick?: (field: 'client' | 'csr_number') => void
}

const STATUS_OPTIONS = [
  'Complete',
  'Incomplete',
  'Pending for spares',
  'Under observation',
  'Working solution provided',
]

const CALL_TYPE_OPTIONS = ['Breakdown', 'Preventive Maintenance', 'Installation', 'Commissioning', 'Inspection', 'Emergency Repair', 'Other']
const SERVICE_BASIS_OPTIONS = ['Paid Service', 'AMC', 'Warranty']
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
        <div className="flex min-w-0 items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-bd-text-muted">
          <span className={`h-2 w-2 rounded-full ${dotClassName}`} />
          <span className="truncate">{title}</span>
        </div>
        {action}
      </div>

      <div className="rounded-[20px] border border-bd-border bg-bd-surface p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]">
        {children}
      </div>
    </section>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.15em] text-bd-text-muted">{children}</label>
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-[12px] border-[1.5px] border-bd-border bg-bd-surface-muted px-3 text-[14px] text-bd-text outline-none ${props.className || ''}`}
    />
  )
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[84px] w-full rounded-[12px] border-[1.5px] border-bd-border bg-bd-surface-muted px-3 py-3 text-[14px] text-bd-text outline-none ${props.className || ''}`}
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
      <SelectTrigger className="h-11 w-full rounded-[12px] border-[1.5px] border-bd-border bg-bd-surface-muted px-3 text-[14px] text-bd-text shadow-none focus:ring-0 focus:ring-offset-0">
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
      className="inline-flex h-8 items-center gap-2 rounded-full border-[1.5px] border-bd-border bg-bd-surface px-[13px] text-[12px] font-bold text-bd-text disabled:opacity-60"
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
  csrNumberReady = true,
  onUpdate,
  onUpdateMeta,
  onUpdateMaterialRow,
  onAddMaterialRow,
  onRemoveMaterialRow,
  onApplyImport,
  onSave,
  onDownloadBlank,
  onLockedFieldClick,
}: Props) {
  const [signatories, setSignatories] = React.useState<SignatoryRow[]>([])
  const [signatorySheetOpen, setSignatorySheetOpen] = React.useState(false)
  const [importSheetOpen, setImportSheetOpen] = React.useState(false)
  const [clientPickerOpen, setClientPickerOpen] = React.useState(false)
  const [materialsTitle, setMaterialsTitle] = React.useState('Materials Used')
  const [recipientSignatureName, setRecipientSignatureName] = React.useState('')
  const recipientSignatureInputRef = React.useRef<HTMLInputElement | null>(null)

  // Track online/offline status
  const [isOnline, setIsOnline] = React.useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Store the last known good CSR number for auto-restore
  const lastGoodCsrNumber = React.useRef<string>(String(csr.csr_number || ''))

  React.useEffect(() => {
    const current = String(csr.csr_number || '').trim()
    if (current) {
      lastGoodCsrNumber.current = current
    }
  }, [csr.csr_number])

  const handleCsrNumberBlur = () => {
    const current = String(csr.csr_number || '').trim()
    if (!current && lastGoodCsrNumber.current) {
      onUpdate('csr_number', lastGoodCsrNumber.current)
    }
  }

  const saveDisabled = saving || !isOnline || !csrNumberReady || !String(csr.csr_number || '').trim()

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
    <div className="mx-auto min-h-screen max-w-md bg-bd-app-bg px-3 pb-[200px] pt-4 sm:px-4">
      <div className="space-y-5">
        <Section title="Document Details" dotClassName="bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-bd-text-muted">
                {mode === 'new' ? 'New CSR' : 'Edit CSR'}
              </div>
              <h1 className="mt-1 text-[28px] font-black leading-none tracking-[-0.04em] text-bd-text">
                {mode === 'new' ? 'Create CSR' : 'Update CSR'}
              </h1>
            </div>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border-[1.5px] border-bd-border bg-bd-surface text-bd-text-muted"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 rounded-[16px] border-2 border-dashed border-bd-border-strong bg-bd-surface-muted p-3">
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={() => onLockedFieldClick?.('client')}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-bd-surface text-bd-text-muted">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-bd-text-muted">Client</div>
                  <div className="mt-0.5 truncate text-[14px] font-bold text-bd-text">
                    {csr.client_name || 'No client selected'}
                  </div>
                </div>
              </button>
            ) : (
              <ClientSelector
                clientId={String(csr.client_id || '')}
                clientName={String(csr.client_name || '')}
                open={clientPickerOpen}
                onOpenChange={setClientPickerOpen}
                onClientChange={(clientId: string, clientName: string, client: { address?: string | null; city?: string | null; state?: string | null } | null) => {
                  onUpdate('client_id', clientId || '')
                  onUpdate('client_name', clientName || '')
                  if (client) {
                    const fullAddress = [client.address, client.city, client.state]
                      .filter((part) => part && part.trim() !== '')
                      .join(', ')
                    onUpdate('address', fullAddress)
                  } else {
                    onUpdate('address', '')
                  }
                }}
              />
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <FieldLabel>CSR Number</FieldLabel>
              <div className="relative">
                {mode === 'edit' ? (
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bd-text-muted" />
                ) : (
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bd-text-muted" />
                )}
                {mode === 'edit' ? (
                  <span
                    onClick={() => onLockedFieldClick?.('csr_number')}
                    className="inline-flex h-11 w-full cursor-default items-center rounded-[12px] border-[1.5px] border-bd-border bg-bd-surface-muted pl-9 font-mono text-[14px] font-bold text-bd-text opacity-70"
                  >
                    {csr.csr_number || ''}
                  </span>
                ) : (
                  <TextInput
                    value={String(csr.csr_number || '')}
                    onChange={(event) => onUpdate('csr_number', event.target.value)}
                    onBlur={handleCsrNumberBlur}
                    className="bg-bd-surface-muted pl-9 font-mono font-bold"
                  />
                )}
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
                {mode === 'edit' ? (
                  <div
                    onClick={() => onLockedFieldClick?.('client')}
                    className="flex h-11 cursor-default items-center gap-2 rounded-[12px] border-[1.5px] border-bd-border bg-bd-surface-muted px-3 text-[14px] font-bold text-bd-text opacity-70"
                  >
                    <Lock className="h-4 w-4 shrink-0 text-bd-text-muted" />
                    <span className="truncate">{csr.client_name || ''}</span>
                  </div>
                ) : (
                  <TextInput
                    value={String(csr.client_name || '')}
                    onChange={(event) => onUpdate('client_name', event.target.value)}
                  />
                )}
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

        <Section title="Item Controls" dotClassName="bg-slate-700">
          <button
            type="button"
            onClick={() => setImportSheetOpen(true)}
            className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-bd-border bg-bd-surface px-3 text-[13px] font-bold text-bd-text"
          >
            Import
          </button>
        </Section>

        <Section title="Main Details" dotClassName="bg-bd-violet">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Call Type</FieldLabel>
              <SelectField
                value={String(csr.call_type || '')}
                onChange={(value) => onUpdate('call_type', value)}
                options={CALL_TYPE_OPTIONS}
                placeholder="Select..."
              />
            </div>
            <div>
              <FieldLabel>Service Basis</FieldLabel>
              <SelectField
                value={String(csr.service_basis || '')}
                onChange={(value) => onUpdate('service_basis', value)}
                options={SERVICE_BASIS_OPTIONS}
                placeholder="Select..."
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

        <Section title="Equipment" dotClassName="bg-slate-600">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Engine No</FieldLabel>
                <TextInput
                  value={String(csr.engine_no || '')}
                  onChange={(event) => onUpdate('engine_no', event.target.value)}
                />
              </div>
              <div />
            </div>
          </div>
        </Section>

        <Section title="Problem & Service" dotClassName="bg-bd-rose">
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

        <Section title="Service Execution" dotClassName="bg-slate-900">
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
          dotClassName="bg-amber-500"
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
              className="w-32 bg-transparent text-[11px] font-extrabold uppercase tracking-[0.18em] text-bd-text-muted outline-none"
            />
          }
          dotClassName="bg-bd-emerald"
          action={
            <span className="inline-flex h-8 items-center rounded-full border border-bd-status-success-border bg-bd-status-success-bg px-3 text-[12px] font-bold text-bd-status-success-text">
              {materialCount} item{materialCount === 1 ? '' : 's'}
            </span>
          }
        >
          <div className="space-y-3">
            <div className="space-y-3">
              {materialsRows.map((row, index) => (
                <div key={index} className="rounded-[16px] border border-bd-border bg-bd-surface-muted p-3">
                  <div className="grid grid-cols-[minmax(0,1.4fr)_88px_86px] gap-3">
                    <TextInput
                      value={row.item}
                      onChange={(event) => onUpdateMaterialRow(index, 'item', event.target.value)}
                      placeholder="Material"
                      className="bg-bd-surface"
                    />

                    <NumericInput
                      value={row.quantity}
                      onChange={(val) => onUpdateMaterialRow(index, 'quantity', String(val))}
                      placeholder="Qty"
                      className="bg-bd-surface text-center"
                    />

                    <div className="[&>div>input]:h-11 [&>div>input]:rounded-[12px] [&>div>input]:border-[1.5px] [&>div>input]:border-bd-border [&>div>input]:bg-bd-surface [&>div>input]:px-3 [&>div>input]:text-[14px]">
                      <UnitInput value={row.unit || ''} onChange={(value) => onUpdateMaterialRow(index, 'unit', value)} />
                    </div>
                  </div>

                  {materialsRows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onRemoveMaterialRow(index)}
                      className="mt-3 text-[12px] font-bold text-bd-status-danger-text"
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
              className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-bd-border px-3 text-[13px] font-bold text-bd-text"
            >
              Add material
            </button>
          </div>
        </Section>

        <Section
          title="Technician"
          dotClassName="bg-sky-500"
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
              <div className="rounded-[16px] border border-bd-border bg-bd-surface-muted p-3">
                <div className="text-[13px] font-bold text-bd-text">Technician Signature</div>
                <div className="mt-1 text-[11px] text-bd-text-muted">
                  {selectedSignatory ? selectedSignatory.name : 'Leave blank for offline sign.'}
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => setSignatorySheetOpen(true)}
                    className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-bd-button-primary-bg bg-bd-button-primary-bg px-[13px] text-[12px] font-bold text-bd-button-primary-text"
                  >
                    {selectedSignatory ? 'Change signatory' : 'Choose signatory'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate('technician_signatory_id', null)}
                    className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-bd-border bg-bd-surface px-[13px] text-[12px] font-bold text-bd-text"
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
          dotClassName="bg-slate-900 dark:bg-slate-100"
          action={
            <HeaderActionButton onClick={() => onUpdateMeta('showAcknowledgement', !csrMeta.showAcknowledgement)}>
              {csrMeta.showAcknowledgement ? 'Included' : 'Include'}
            </HeaderActionButton>
          }
        >
          {csrMeta.showAcknowledgement ? (
            <div className="space-y-3">
              <div>
                <FieldLabel>Recipient name/title</FieldLabel>
                <TextInput
                  value={String(csr.acknowledgement_name || '')}
                  onChange={(event) => onUpdate('acknowledgement_name', event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Comment</FieldLabel>
                <TextArea
                  value={String(csr.customer_feedback || '')}
                  onChange={(event) => onUpdate('customer_feedback', event.target.value)}
                />
              </div>

              <div className="rounded-[16px] border border-bd-border bg-bd-surface-muted p-3">
                <div className="text-[13px] font-bold text-bd-text">Recipient Signature</div>
                <div className="mt-1 text-[11px] text-bd-text-muted">
                  {recipientSignatureName || 'Leave blank for offline sign.'}
                </div>
                <input
                  ref={recipientSignatureInputRef}
                  type="file"
                  accept={IMAGE_ACCEPT_ATTRIBUTE}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file && !isSupportedImageFile(file)) {
                      feedback.error('Unsupported file', { description: getUnsupportedImageErrorMessage(file.name) })
                      event.target.value = ''
                      return
                    }
                    setRecipientSignatureName(file?.name || '')
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = () => {
                        onUpdate('recipient_signature_uri', reader.result as string)
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => recipientSignatureInputRef.current?.click()}
                    className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-bd-button-primary-bg bg-bd-button-primary-bg px-[13px] text-[12px] font-bold text-bd-button-primary-text"
                  >
                    Upload signature
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientSignatureName('')
                      onUpdate('recipient_signature_uri', '')
                      if (recipientSignatureInputRef.current) {
                        recipientSignatureInputRef.current.value = ''
                      }
                    }}
                    className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-bd-border bg-bd-surface px-[13px] text-[12px] font-bold text-bd-text"
                  >
                    Leave blank
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </Section>
      </div>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-[13px] font-bold text-white sm:bottom-auto sm:top-0">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          You are offline — save is disabled
        </div>
      )}

      {/* Floating Save Button */}
      <div className="hidden sm:block fixed bottom-6 right-6 z-30 flex items-center gap-3">
        {onDownloadBlank && (
          <button
            onClick={onDownloadBlank}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-bd-button-primary-bg shadow-lg transition-transform hover:scale-105 active:scale-95 border border-bd-separator"
            title="Download blank CSR"
          >
            <Download className="h-6 w-6" />
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saveDisabled}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bd-button-primary-bg text-bd-button-primary-text shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <Save className="h-6 w-6" />
        </button>
      </div>

      <div className="sm:hidden">
        <MobileFab 
          onClick={onSave} 
          icon={Save} 
          ariaLabel="Save CSR" 
          disabled={saveDisabled}
        />
      </div>

      <Sheet open={signatorySheetOpen} onOpenChange={setSignatorySheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[24px]">
          <SheetHeader className="text-left">
            <SheetTitle>Choose Signatory</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2 pb-4">
            {signatories.length === 0 ? (
              <div className="rounded-[16px] border border-bd-border bg-bd-surface-muted px-4 py-6 text-center text-[13px] text-bd-text-muted">
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
                      active ? 'border-bd-button-primary-bg bg-bd-button-primary-bg text-bd-button-primary-text' : 'border-bd-border bg-bd-surface text-bd-text'
                    }`}
                  >
                    <div className="text-[14px] font-bold">{signatory.name}</div>
                    {signatory.role ? (
                      <div className={`mt-1 text-[12px] ${active ? 'text-bd-text-muted' : 'text-bd-text-muted'}`}>
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
