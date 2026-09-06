import * as React from 'react'
import { ChevronDown, ChevronUp, Download, Hash, Lock, Loader2, MoreHorizontal, SaveAll, X } from 'lucide-react'

import { useEntity } from '@/lib/tenant/contexts'
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

/* ── Types ────────────────────────────────────────────────────────────── */

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
  isFieldMode?: boolean
  onToggleFieldMode?: () => void
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

/* ── Constants ────────────────────────────────────────────────────────── */

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

/* ── Scoped styles ────────────────────────────────────────────────────── */

const scopedStyles = `
  @keyframes csrFieldErrorPulse {
    0%, 100% {
      box-shadow: 0 0 0 0 hsl(var(--bd-status-danger-text) / 0.5);
      border-color: hsl(var(--bd-status-danger-text));
    }
    50% {
      box-shadow: 0 0 0 6px hsl(var(--bd-status-danger-text) / 0.2);
      border-color: hsl(var(--bd-status-danger-text));
    }
  }
  .csr-error-highlight {
    animation: csrFieldErrorPulse 1.2s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .csr-error-highlight { animation: none !important; }
    .csr-fab-float { animation: none !important; }
    .csr-fab-halo { animation: none !important; }
    .csr-ambient-drift { animation: none !important; }
  }
`

/* ── Primitives ───────────────────────────────────────────────────────── */

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block text-[8px] font-extrabold uppercase tracking-[0.07em] text-bd-text-muted">
      {children}
      {required && <span className="ml-0.5 text-bd-status-danger-text">*</span>}
    </label>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  const { error, className, ...rest } = props
  return (
    <input
      {...rest}
      className={`h-10 w-full rounded-[10px] border border-bd-border bg-bd-surface px-2.5 text-[11px] font-semibold text-bd-text shadow-xs focus:outline-none focus:ring-1 focus:ring-bd-button-primary-bg ${error ? 'csr-error-highlight' : ''} ${className || ''}`}
    />
  )
}

function TextInputMono(props: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  const { error, className, ...rest } = props
  return (
    <input
      {...rest}
      className={`h-10 w-full rounded-[10px] border border-bd-border bg-bd-surface px-2.5 text-[10px] font-medium text-bd-text shadow-xs focus:outline-none focus:ring-1 focus:ring-bd-button-primary-bg ${error ? 'csr-error-highlight' : ''} ${className || ''}`}
      style={{ fontFamily: '"DM Mono", monospace' }}
    />
  )
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[80px] w-full rounded-[10px] border border-bd-border bg-bd-surface p-2 text-[10px] font-semibold text-bd-text shadow-xs focus:outline-none focus:ring-1 focus:ring-bd-button-primary-bg resize-none ${props.className || ''}`}
    />
  )
}

function TextAreaCompact(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-[10px] border border-bd-border bg-bd-surface p-2 text-[10px] font-medium text-bd-text shadow-xs focus:outline-none resize-none ${props.className || ''}`}
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
      <SelectTrigger className="h-10 w-full rounded-[10px] border border-bd-border bg-bd-surface px-2 text-[10px] font-semibold text-bd-text shadow-xs focus:ring-1 focus:ring-bd-button-primary-bg">
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

/* ── Main Component ───────────────────────────────────────────────────── */

export default function CsrFormScreen({
  mode,
  csr,
  csrMeta,
  materialsRows,
  saving,
  csrNumberReady = true,
  isFieldMode = false,
  onToggleFieldMode,
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
  const { tenantClient } = useEntity()
  const [signatories, setSignatories] = React.useState<SignatoryRow[]>([])
  const [signatorySheetOpen, setSignatorySheetOpen] = React.useState(false)
  const [importSheetOpen, setImportSheetOpen] = React.useState(false)
  const [clientPickerOpen, setClientPickerOpen] = React.useState(false)
  const [materialsTitle, setMaterialsTitle] = React.useState('Materials Used')
  const [recipientSignatureName, setRecipientSignatureName] = React.useState(() => {
    // Initialize from existing CSR data if available
    return (csr as any).recipient_signature_name || ''
  })
  const recipientSignatureInputRef = React.useRef<HTMLInputElement | null>(null)

  // Validation highlight state
  const [highlightedField, setHighlightedField] = React.useState<string | null>(null)
  const clientSelectorRef = React.useRef<HTMLDivElement>(null)
  const csrNumberRef = React.useRef<HTMLDivElement>(null)

  const triggerValidationHighlight = (fieldId: string) => {
    setHighlightedField(fieldId)
    const ref = fieldId === 'clientSelector' ? clientSelectorRef : csrNumberRef
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => setHighlightedField(null), 2800)
  }

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

  const lastGoodCsrNumber = React.useRef<string>(String(csr.csr_number || ''))

  React.useEffect(() => {
    const current = String(csr.csr_number || '').trim()
    if (current) lastGoodCsrNumber.current = current
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
      const { data } = await tenantClient.from('signatories').select('*').order('name')
      if (!mounted) return
      setSignatories((data || []) as SignatoryRow[])
    }
    load()
    return () => { mounted = false }
  }, [])

  const selectedSignatory =
    signatories.find((entry) => String(entry.id) === String(csr.technician_signatory_id || '')) || null
  const materialCount = materialsRows.filter((row) => row.item || row.quantity || row.unit).length

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bd-app-bg px-4 pb-28 pt-4 sm:px-5">
      <style>{scopedStyles}</style>

      {/* ── Top Minimal Toolbar ──────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between border-b border-bd-border pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-[13px] font-extrabold tracking-tight text-bd-text">
            Customer Service Report
          </h1>
          <span className="rounded-[4px] bg-bd-surface-muted px-1.5 py-0.5 font-mono text-[7px] font-bold text-bd-text-muted">
            {mode === 'new' ? 'CREATE' : 'EDIT'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleFieldMode && (
            <button
              type="button"
              onClick={onToggleFieldMode}
              className={`h-8 px-2 rounded-[4px] text-[8px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                isFieldMode
                  ? 'bg-bd-button-primary-bg/14 text-bd-button-primary-bg'
                  : 'bg-bd-surface-muted text-bd-text-muted'
              }`}
            >
              {isFieldMode ? 'Field' : 'Standard'}
            </button>
          )}
          {mode === 'new' && onDownloadBlank && (
            <button
              type="button"
              onClick={onDownloadBlank}
              className="flex h-11 w-11 items-center justify-center rounded-[8px] text-bd-text-muted transition-colors hover:text-bd-text active:scale-95"
              title="Download Blank"
              aria-label="Download blank CSR"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-[8px] text-bd-text-muted transition-colors hover:text-bd-text active:scale-95"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── CONTINUOUS FORM FLOW ─────────────────────────────────────── */}
      <div className="divide-y divide-bd-border space-y-5">

        {/* ── 01. DOCUMENT DETAILS ──────────────────────────────────── */}
        <section className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.11em] text-bd-text-muted">
              01. Document Details
            </span>
            <span
              className="text-[9px] font-mono font-bold text-bd-button-primary-bg"
              style={{ fontFamily: '"DM Mono", monospace' }}
            >
              {csr.csr_number || '—'}
            </span>
          </div>

          {/* Client Account Selector */}
          <div ref={clientSelectorRef}>
            <FieldLabel required>Client Account</FieldLabel>
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={() => onLockedFieldClick?.('client')}
                className="w-full flex items-center justify-between p-2.5 min-h-[44px] rounded-[10px] bg-bd-surface border border-bd-border cursor-pointer shadow-xs active:scale-[0.98] transition-transform duration-150"
              >
                <div className="truncate pr-2">
                  <div className="text-[11px] font-bold text-bd-text truncate">
                    {csr.client_name || 'No client selected'}
                  </div>
                  {csr.address && (
                    <div className="text-[9px] text-bd-text-muted truncate mt-0.5">
                      {String(csr.address)}
                    </div>
                  )}
                </div>
                <Lock className="h-3 w-3 text-bd-text-muted shrink-0" />
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

          {/* CSR Number & Date */}
          <div className="grid grid-cols-2 gap-2">
            <div ref={csrNumberRef}>
              <FieldLabel required>CSR Number</FieldLabel>
              {mode === 'edit' ? (
                <button
                  type="button"
                  onClick={() => onLockedFieldClick?.('csr_number')}
                  className="w-full h-10 px-2.5 rounded-[10px] bg-bd-surface border border-bd-border flex items-center justify-between font-mono font-medium text-[11px] text-bd-text cursor-pointer shadow-xs"
                >
                  <span style={{ fontFamily: '"DM Mono", monospace' }}>{csr.csr_number || ''}</span>
                  <Lock className="h-3 w-3 text-bd-text-muted" />
                </button>
              ) : (
                <TextInputMono
                  value={String(csr.csr_number || '')}
                  onChange={(e) => onUpdate('csr_number', e.target.value)}
                  onBlur={handleCsrNumberBlur}
                  error={highlightedField === 'csrNumber'}
                />
              )}
            </div>
            <div>
              <FieldLabel>Report Date</FieldLabel>
              <TextInputMono
                type="date"
                value={String(csr.date || '')}
                onChange={(e) => onUpdate('date', e.target.value)}
              />
            </div>
          </div>

          {/* Customer Contact & PO Number */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Customer Contact</FieldLabel>
              {mode === 'edit' ? (
                <button
                  type="button"
                  onClick={() => onLockedFieldClick?.('client')}
                  className="w-full h-10 px-2.5 rounded-[10px] bg-bd-surface border border-bd-border flex items-center justify-between text-[11px] font-semibold text-bd-text cursor-pointer truncate shadow-xs"
                >
                  <span className="truncate">{csr.client_name || ''}</span>
                  <Lock className="h-3 w-3 text-bd-text-muted shrink-0" />
                </button>
              ) : (
                <TextInput
                  placeholder="Contact person"
                  value={String(csr.client_name || '')}
                  onChange={(e) => onUpdate('client_name', e.target.value)}
                />
              )}
            </div>
            <div>
              <FieldLabel>P.O. Number</FieldLabel>
              <TextInput
                placeholder="PO #"
                value={String(csr.po_number || '')}
                onChange={(e) => {
                  onUpdate('po_number', e.target.value)
                  onUpdate('show_po', Boolean(e.target.value.trim()))
                }}
              />
            </div>
          </div>
        </section>

        {/* ── 02. ITEM CONTROLS ─────────────────────────────────────── */}
        <section className="pt-4 flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-[0.11em] text-bd-text-muted">
            02. Item Controls
          </span>              <button
                type="button"
                onClick={() => setImportSheetOpen(true)}
                className="h-10 px-3 rounded-[8px] bg-bd-surface hover:bg-bd-surface-muted text-bd-text text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition border border-bd-border shadow-xs"
              >
            Import
          </button>
        </section>

        {/* ── 03. SERVICE PARAMETERS ────────────────────────────────── */}
        <section className="pt-4 space-y-3">
          <span className="text-[9px] font-black uppercase tracking-[0.11em] text-bd-text-muted block">
            03. Service Parameters
          </span>
          <div className="grid grid-cols-3 gap-2">
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
              <FieldLabel>System Down?</FieldLabel>
              <SelectField
                value={csr.system_down === true ? 'Yes' : csr.system_down === false ? 'No' : ''}
                onChange={(value) => {
                  if (!value) { onUpdate('system_down', null); return }
                  onUpdate('system_down', value === 'Yes')
                }}
                options={YES_NO_OPTIONS}
                placeholder="Select"
              />
            </div>
          </div>
        </section>

        {/* ── 04. EQUIPMENT SPECIFICATIONS ──────────────────────────── */}
        <section className="pt-4 space-y-3">
          <span className="text-[9px] font-black uppercase tracking-[0.11em] text-bd-text-muted block">
            04. Equipment Specifications
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Equipment Type</FieldLabel>
              <TextInput
                value={String(csr.equipment_type || '')}
                onChange={(e) => onUpdate('equipment_type', e.target.value)}
                placeholder="e.g. Diesel Generator"
              />
            </div>
            <div>
              <FieldLabel>Equipment Location</FieldLabel>
              <TextInput
                value={String(csr.equipment_location || '')}
                onChange={(e) => onUpdate('equipment_location', e.target.value)}
                placeholder="e.g. Bay 2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Make</FieldLabel>
              <TextInput
                value={String(csr.make || '')}
                onChange={(e) => onUpdate('make', e.target.value)}
                placeholder="Manufacturer"
              />
            </div>
            <div>
              <FieldLabel>Capacity</FieldLabel>
              <TextInput
                value={String(csr.capacity || '')}
                onChange={(e) => onUpdate('capacity', e.target.value)}
                placeholder="e.g. 500 kVA"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel>{csrMeta.modelLabel || 'Model'}</FieldLabel>
              <TextInput
                value={String(csr.model || '')}
                onChange={(e) => onUpdate('model', e.target.value)}
                placeholder="Model ID"
              />
            </div>
            <div>
              <FieldLabel>{csrMeta.serialLabel || 'Serial No.'}</FieldLabel>
              <TextInputMono
                value={String(csr.serial_no || '')}
                onChange={(e) => onUpdate('serial_no', e.target.value)}
                placeholder="Serial #"
              />
            </div>
            <div>
              <FieldLabel>Engine No</FieldLabel>
              <TextInputMono
                value={String(csr.engine_no || '')}
                onChange={(e) => onUpdate('engine_no', e.target.value)}
                placeholder="Engine #"
              />
            </div>
          </div>
        </section>

        {/* ── 05. PROBLEM & SERVICE ─────────────────────────────────── */}
        <section className="pt-4 space-y-3">
          <span className="text-[9px] font-black uppercase tracking-[0.11em] text-bd-text-muted block">
            05. Problem & Service Details
          </span>
          <div>
            <FieldLabel>Problem Reported</FieldLabel>
            <TextArea
              value={String(csr.problem_reported || '')}
              onChange={(e) => onUpdate('problem_reported', e.target.value)}
              placeholder="Client complaint or initial defect description..."
            />
          </div>
          <div>
            <FieldLabel>Service Rendered</FieldLabel>
            <TextArea
              className="min-h-[88px]"
              value={String(csr.service_rendered || '')}
              onChange={(e) => onUpdate('service_rendered', e.target.value)}
              placeholder="Corrective actions taken by engineer..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Defects Found</FieldLabel>
              <TextAreaCompact
                rows={2}
                value={String(csr.defects_found || '')}
                onChange={(e) => onUpdate('defects_found', e.target.value)}
                placeholder="Root causes..."
              />
            </div>
            <div>
              <FieldLabel>Engineer Remarks</FieldLabel>
              <TextAreaCompact
                rows={2}
                value={String(csr.engineer_remarks || '')}
                onChange={(e) => onUpdate('engineer_remarks', e.target.value)}
                placeholder="Recommendations..."
              />
            </div>
          </div>
        </section>

        {/* ── 06. EXECUTION TIMELINE & STATUS ────────────────────────── */}
        <section className="pt-4 space-y-3">
          <span className="text-[9px] font-black uppercase tracking-[0.11em] text-bd-text-muted block">
            06. Execution Timeline & Status
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Start Date & Time</FieldLabel>
              <div className="flex gap-1.5">
                <TextInputMono
                  type="date"
                  value={String(csr.start_date || '')}
                  onChange={(e) => onUpdate('start_date', e.target.value)}
                  className="w-3/5"
                />
                <TextInputMono
                  type="time"
                  value={String(csr.start_time || '')}
                  onChange={(e) => onUpdate('start_time', e.target.value)}
                  className="w-2/5"
                />
              </div>
            </div>
            <div>
              <FieldLabel>End Date & Time</FieldLabel>
              <div className="flex gap-1.5">
                <TextInputMono
                  type="date"
                  value={String(csr.end_date || '')}
                  onChange={(e) => onUpdate('end_date', e.target.value)}
                  className="w-3/5"
                />
                <TextInputMono
                  type="time"
                  value={String(csr.end_time || '')}
                  onChange={(e) => onUpdate('end_time', e.target.value)}
                  className="w-2/5"
                />
              </div>
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
        </section>

        {/* ── 07. OPERATIONAL READINGS ──────────────────────────────── */}
        <section className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.11em] text-bd-text-muted">
              07. Operational Readings
            </span>
            <button
              type="button"
              onClick={() => onUpdateMeta('showOperationalReadings', !csrMeta.showOperationalReadings)}
              className={`px-2 py-0.5 rounded-[6px] text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition active:scale-95 border ${
                csrMeta.showOperationalReadings
                  ? 'bg-bd-surface border-bd-button-primary-bg/30 text-bd-button-primary-bg'
                  : 'bg-bd-surface border-bd-border text-bd-text-muted'
              }`}
            >
              {csrMeta.showOperationalReadings ? (
                <><ChevronUp className="h-3 w-3" /> Included</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> Excluded</>
              )}
            </button>
          </div>

          {csrMeta.showOperationalReadings && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Voltage', field: 'voltage', placeholder: '415 V' },
                { label: 'Frequency', field: 'frequency', placeholder: '50 Hz' },
                { label: 'Battery', field: 'battery', placeholder: '24 VDC' },
                { label: 'Temperature', field: 'temperature', placeholder: '85 °C' },
                { label: 'Pressure', field: 'pressure', placeholder: '4.5 Bar' },
                { label: 'Hours', field: 'hours', placeholder: 'Running Hrs' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <FieldLabel>{label}</FieldLabel>
                  <TextInputMono
                    value={String((csr as any)[field] || '')}
                    onChange={(e) => onUpdate(field, e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 08. MATERIALS USED ────────────────────────────────────── */}
        <section className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={materialsTitle}
              onChange={(e) => setMaterialsTitle(e.target.value)}
              className="text-[9px] font-black uppercase tracking-[0.11em] text-bd-text-muted bg-transparent focus:outline-none focus:text-bd-text"
            />
            <span
              className="font-mono text-[8px] font-medium text-bd-text-muted"
              style={{ fontFamily: '"DM Mono", monospace' }}
            >
              {materialCount} items
            </span>
          </div>

          <div className="divide-y divide-bd-border">
            {materialsRows.map((row, index) => (
              <div key={index} className="py-2 flex items-center gap-2 first:pt-0 last:pb-0">
                {/* Row number */}
                <span
                  className="w-5 h-5 rounded-[4px] bg-bd-surface-muted text-bd-text font-mono font-bold text-[9px] flex items-center justify-center shrink-0"
                  style={{ fontFamily: '"DM Mono", monospace' }}
                >
                  {index + 1}
                </span>

                {/* Fields: 12-col grid (6+3+3) */}
                <div className="flex-1 grid grid-cols-12 gap-1.5">
                  <div className="col-span-6">
                    <TextInput
                      placeholder="Material specification"
                      value={row.item}
                      onChange={(e) => onUpdateMaterialRow(index, 'item', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <TextInputMono
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) => onUpdateMaterialRow(index, 'quantity', e.target.value)}
                      className="text-center"
                    />
                  </div>
                  <div className="col-span-3">
                    <TextInput
                      placeholder="Unit"
                      value={row.unit}
                      onChange={(e) => onUpdateMaterialRow(index, 'unit', e.target.value)}
                      className="text-center font-semibold"
                    />
                  </div>
                </div>

                {/* Remove button */}
                {materialsRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveMaterialRow(index)}
                    className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full hover:bg-bd-status-danger-bg text-bd-text-muted hover:text-bd-status-danger-text flex items-center justify-center active:scale-90 transition shrink-0"
                    title="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onAddMaterialRow}
            className="w-full h-10 rounded-[8px] bg-bd-surface hover:bg-bd-surface-muted text-bd-text font-extrabold text-[8px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition border border-bd-border shadow-xs"
          >
            + Add material row
          </button>
        </section>

        {/* ── 09. TECHNICIAN ENDORSEMENT ────────────────────────────── */}
        <section className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.11em] text-bd-text-muted">
              09. Technician Endorsement
            </span>
            <button
              type="button"
              onClick={() => onUpdateMeta('showTechnicianSignLine', !csrMeta.showTechnicianSignLine)}
              className={`px-2 py-0.5 rounded-[6px] text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition active:scale-95 border ${
                csrMeta.showTechnicianSignLine
                  ? 'bg-bd-surface border-bd-status-success-border text-bd-status-success-text'
                  : 'bg-bd-surface border-bd-status-danger-border text-bd-status-danger-text'
              }`}
            >
              {csrMeta.showTechnicianSignLine ? (
                <><ChevronUp className="h-3 w-3" /> Included</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> Excluded</>
              )}
            </button>
          </div>

          {csrMeta.showTechnicianSignLine && (
            <div className="space-y-2">
              <div>
                <FieldLabel>Technician Name</FieldLabel>
                <TextInput
                  value={String(csrMeta.technicianName || '')}
                  onChange={(e) => onUpdateMeta('technicianName', e.target.value)}
                />
              </div>

              {/* Inline signatory card */}
              <div className="p-2.5 rounded-[10px] bg-bd-surface border border-bd-border flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[7px] font-mono uppercase text-bd-text-muted block">Technician Signature</span>
                  <p className="text-[10px] font-bold text-bd-text mt-0.5">
                    {selectedSignatory ? selectedSignatory.name : 'Leave blank for offline sign.'}
                  </p>
                  {selectedSignatory && selectedSignatory.role && (
                    <span className="text-[8px] text-bd-text-muted">{selectedSignatory.role}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">                    <button
                      type="button"
                      onClick={() => setSignatorySheetOpen(true)}
                      className="h-10 px-3 rounded-[6px] text-bd-button-primary-text text-[8px] font-bold uppercase tracking-wider shadow-xs active:scale-95 transition bg-bd-button-primary-bg"
                    >
                    {selectedSignatory ? 'Change' : 'Choose'}
                  </button>
                  {selectedSignatory && (
                    <button
                      type="button"
                      onClick={() => onUpdate('technician_signatory_id', null)}
                      className="h-10 px-3 rounded-[6px] bg-bd-surface text-bd-text-muted text-[8px] font-bold uppercase border border-bd-border active:scale-95"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── 10. CUSTOMER ACKNOWLEDGEMENT ──────────────────────────── */}
        <section className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.11em] text-bd-text-muted">
              10. Customer Acknowledgement
            </span>
            <button
              type="button"
              onClick={() => onUpdateMeta('showAcknowledgement', !csrMeta.showAcknowledgement)}
              className={`px-2 py-0.5 rounded-[6px] text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition active:scale-95 border ${
                csrMeta.showAcknowledgement
                  ? 'bg-bd-surface border-bd-status-success-border text-bd-status-success-text'
                  : 'bg-bd-surface border-bd-status-danger-border text-bd-status-danger-text'
              }`}
            >
              {csrMeta.showAcknowledgement ? (
                <><ChevronUp className="h-3 w-3" /> Included</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> Excluded</>
              )}
            </button>
          </div>

          {csrMeta.showAcknowledgement && (
            <div className="space-y-2">
              <div>
                <FieldLabel>Recipient Name & Title</FieldLabel>
                <TextInput
                  placeholder="e.g. John Doe (Plant Manager)"
                  value={String(csr.acknowledgement_name || '')}
                  onChange={(e) => onUpdate('acknowledgement_name', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Feedback / Endorsement Note</FieldLabel>
                <TextAreaCompact
                  rows={2}
                  value={String(csr.customer_feedback || '')}
                  onChange={(e) => onUpdate('customer_feedback', e.target.value)}
                  placeholder="Client feedback notes..."
                />
              </div>

              {/* Signature area */}
              <div className="p-2.5 rounded-[10px] bg-bd-surface border border-bd-border space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-extrabold uppercase text-bd-text-muted">
                    Recipient Signature
                  </span>
                  <span className="text-[7px] font-mono text-bd-text-muted">
                    {recipientSignatureName ? 'Attached' : 'Offline Blank'}
                  </span>
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

                {recipientSignatureName || csr.recipient_signature_uri ? (
                  <div className="h-16 rounded-[8px] bg-bd-surface-muted flex items-center justify-center p-1 relative border border-bd-border">
                    {csr.recipient_signature_uri ? (
                      <img src={String(csr.recipient_signature_uri)} alt="Recipient signature" className="max-h-full object-contain" />
                    ) : (
                      <span className="text-[9px] text-bd-text-muted font-medium">{recipientSignatureName}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setRecipientSignatureName('')
                        onUpdate('recipient_signature_uri', '')
                        if (recipientSignatureInputRef.current) recipientSignatureInputRef.current.value = ''
                      }}
                      className="absolute top-1 right-1 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-bd-surface text-bd-text-muted hover:text-bd-status-danger-text flex items-center justify-center shadow-xs"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="h-10 rounded-[8px] bg-bd-surface-muted flex items-center justify-center text-[9px] text-bd-text-muted font-medium border border-dashed border-bd-border">
                    No signature attached (leave blank for physical sign)
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => recipientSignatureInputRef.current?.click()}
                  className="w-full h-10 px-2.5 rounded-[8px] bg-bd-surface text-bd-text font-bold text-[8px] uppercase tracking-wider hover:bg-bd-surface-muted flex items-center justify-center gap-1.5 active:scale-95 transition border border-bd-border shadow-xs"
                >
                  Upload Signature Image
                </button>
              </div>
            </div>
          )}
        </section>

      </div>

      {/* ── Offline Indicator ───────────────────────────────────────── */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 bg-bd-status-warning-bg text-bd-status-warning-text px-3 py-1 text-[8px] font-bold text-center z-50">
          Offline Mode Active: Draft saved locally for synchronization.
        </div>
      )}

      {/* ── Mobile FAB ─────────────────────────────────────────────── */}
      <div className="sm:hidden">
        <MobileFab
          onClick={onSave}
          icon={saving ? Loader2 : SaveAll}
          ariaLabel="Save CSR"
          disabled={saveDisabled}
        />
      </div>

      {/* ── Desktop Save Buttons ────────────────────────────────────── */}
      <div className="hidden sm:block fixed bottom-6 right-6 z-30 flex items-center gap-3">
        {onDownloadBlank && (
          <button
            onClick={onDownloadBlank}
            className="flex h-[50px] w-[50px] items-center justify-center rounded-[18px] bg-bd-surface text-bd-button-primary-bg shadow-lg transition-transform hover:scale-105 active:scale-95 border border-bd-border"
            title="Download blank CSR"
          >
            <Download className="h-6 w-6" />
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saveDisabled}
          className="flex h-[50px] w-[50px] items-center justify-center rounded-[18px] bg-bd-button-primary-bg text-bd-button-primary-text shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <SaveAll className="h-6 w-6" />}
        </button>
      </div>

      {/* ── Signatory Sheet ─────────────────────────────────────────── */}
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
                    className={`w-full rounded-[16px] border p-4 text-left active:scale-[0.98] transition-transform duration-150 ${
                      active ? 'border-bd-button-primary-bg bg-bd-button-primary-bg text-bd-button-primary-text' : 'border-bd-border bg-bd-surface text-bd-text'
                    }`}
                  >
                    <div className="text-[14px] font-bold">{signatory.name}</div>
                    {signatory.role ? (
                      <div className="mt-1 text-[12px] text-bd-text-muted">{signatory.role}</div>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Import Sheet ────────────────────────────────────────────── */}
      <CsrImportSheet
        open={importSheetOpen}
        onOpenChange={setImportSheetOpen}
        onApplyImport={onApplyImport}
      />
    </div>
  )
}
