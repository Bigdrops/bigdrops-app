import { useState, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Camera,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  FileJson,
  Loader2,
  Percent,
  Plus,
  Save,
  Trash2,
  UserRound,
  Wand2,
  X,
} from 'lucide-react'

import type { Cps } from '@/domain/cps/types'
import type { TableDocumentRow } from '@/domain/table-document/types'
import type { CpsRowEconomics, CpsTotals } from '@/domain/cps/calculateCpsTotals'
import { findCpsGroupInsertIndex, getCpsSectionGroupId } from '@/domain/cps/row-operations'
import { IMAGE_ACCEPT_ATTRIBUTE } from '@/lib/documentImageUploadPolicy'

import './cost-pricing-sheet-form.css'

type Formatters = {
  money: (value: number) => string
  percent: (value: number) => string
}

type CustomColumn = {
  key: string
  label?: string
  type?: string
}

export type CostPricingSheetFormProps = {
  cps: Cps
  mode: 'create' | 'edit'
  rows: TableDocumentRow[]
  itemNumbers: string[]
  rowEconomics: Record<number, CpsRowEconomics>
  totals: CpsTotals
  eligibleCount: number
  uploadingRow: number | null
  saving: boolean
  onCancel?: () => void
  onSave: () => void
  onPatchCps: (patch: Partial<Cps>) => void
  onUpdateRow: (index: number, patch: Partial<TableDocumentRow>) => void
  onAddRow: (rowType: 'item' | 'section') => void
  onInsertRow: (index: number, rowType: 'item' | 'section', groupId?: string | null) => void
  onRemoveRow: (index: number) => void
  onMoveRow: (index: number, direction: -1 | 1) => void
  onOpenImport: () => void
  onOpenColumns: () => void
  onOpenClientPicker: () => void
  onClearClient: () => void
  onOpenMarkup: () => void
  onUndoMarkup: () => void
  hasUndo: boolean
  isColumnVisible: (key: string) => boolean
  onPhotoUpload: (index: number, file: File) => void
  formatters: Formatters
  customColumns: CustomColumn[]
}

type Segment =
  | { type: 'item'; row: TableDocumentRow; index: number }
  | { type: 'group'; row: TableDocumentRow; index: number; groupId: string | null; itemCount: number }

function groupSegments(rows: TableDocumentRow[]): Segment[] {
  const itemCounts = new Map<string, number>()

  rows.forEach((row) => {
    if (row.row_type === 'item' && row.group_id) {
      itemCounts.set(row.group_id, (itemCounts.get(row.group_id) || 0) + 1)
    }
  })

  return rows.map((row, index) => {
    if (row.row_type === 'section') {
      const groupId = getCpsSectionGroupId(row)
      return { type: 'group', row, index, groupId, itemCount: groupId ? itemCounts.get(groupId) || 0 : 0 }
    }
    return { type: 'item', row, index }
  })
}

function SectionHead({ number, title, meta }: { number: string; title: string; meta?: string }) {
  return (
    <div className="cps-sec-head">
      <span className="cps-secno">{number}</span>
      <h2>{title}</h2>
      <span className="rule" />
      {meta ? <span className="meta">{meta}</span> : null}
    </div>
  )
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={className}>
      <span className="cps-label">{label}</span>
      {children}
    </label>
  )
}

function TopBar({
  saving,
  onCancel,
  onSave,
  mobile,
}: Pick<CostPricingSheetFormProps, 'saving' | 'onCancel' | 'onSave'> & { mobile?: boolean }) {
  const title = 'Cost & Pricing Sheet'
  const content = (
    <>
      <button type="button" className="cps-tb-btn" onClick={onCancel} aria-label="Back to Cost & Pricing Sheets">
        <ArrowLeft size={17} />
      </button>
      <div className="cps-tb-title">
        <h1>{title}</h1>
      </div>
      <button type="button" className="cps-save cps-tb-save" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
        Save
      </button>
    </>
  )

  if (mobile) return <header className="cps-form-topbar">{content}</header>
  return <header className="cps-form-topbar"><div className="cps-form-topbar-inner">{content}</div></header>
}

function MetadataSection({
  cps,
  onPatchCps,
  onOpenClientPicker,
  onClearClient,
}: Pick<CostPricingSheetFormProps, 'cps' | 'onPatchCps' | 'onOpenClientPicker' | 'onClearClient'>) {
  const snapshot = cps.custom_fields?.client_snapshot || null
  const clientName = cps.client_name || snapshot?.name || ''
  const clientSummary = [
    snapshot?.contact_person,
    snapshot?.phone,
    snapshot?.email,
    snapshot?.city,
  ].filter(Boolean).join(' · ')

  return (
    <section className="cps-sec">
      <SectionHead number="1." title="Document details" meta={cps.cps_number || undefined} />
      <div className="cps-dgrid">
        <Field label="Sheet title" className="full">
          <input className="cps-field" value={cps.title || ''} onChange={(event) => onPatchCps({ title: event.target.value })} placeholder="Cost & Pricing Sheet title" />
        </Field>
        <Field label="Sheet number">
          <input className="cps-field mono" value={cps.cps_number || ''} onChange={(event) => onPatchCps({ cps_number: event.target.value })} />
        </Field>
        <Field label="Issue date">
          <input className="cps-field" type="date" value={cps.issue_date || ''} onChange={(event) => onPatchCps({ issue_date: event.target.value })} />
        </Field>
        <div className="full">
          <span className="cps-label">Client <span className="cps-req">*</span></span>
          <button
            type="button"
            className={`cps-clientpick ${clientName ? 'filled' : ''}`}
            onClick={onOpenClientPicker}
            aria-label={clientName ? `Change client, currently ${clientName}` : 'Select a client'}
          >
            <span className="ci"><UserRound size={16} /></span>
            <span className="ct">
              <b>{clientName || 'Select a client'}</b>
              <small>{clientSummary || 'Bill to · Client'}</small>
            </span>
            {clientName ? (
              <span
                role="button"
                tabIndex={0}
                className="cx"
                aria-label="Clear client"
                onClick={(event) => {
                  event.stopPropagation()
                  onClearClient()
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    onClearClient()
                  }
                }}
              >
                <X size={13} />
              </span>
            ) : null}
            <span className="chev"><ChevronDown size={15} /></span>
          </button>
        </div>
        <Field label="Site / Project">
          <input className="cps-field" value={cps.project_name || ''} onChange={(event) => onPatchCps({ project_name: event.target.value })} />
        </Field>
      </div>
    </section>
  )
}

function NotesSection({
  cps,
  onPatchCps,
}: Pick<CostPricingSheetFormProps, 'cps' | 'onPatchCps'>) {
  return (
    <section className="cps-sec cps-notes-sec">
      <SectionHead number="4." title="Notes" />
      <Field label="Sheet notes">
        <textarea
          className="cps-field cps-notes-field"
          value={cps.notes || ''}
          onChange={(event) => onPatchCps({ notes: event.target.value })}
          placeholder="Optional sheet notes"
        />
      </Field>
    </section>
  )
}

function ItemTools({
  onOpenImport,
  onOpenColumns,
  onOpenMarkup,
  onClear,
}: Pick<CostPricingSheetFormProps, 'onOpenImport' | 'onOpenColumns' | 'onOpenMarkup'> & { onClear: () => void }) {
  return (
    <div className="cps-tools">
      <button type="button" className="cps-tool" onClick={onOpenColumns}><Columns3 size={12} /> Columns</button>
      <button type="button" className="cps-tool" onClick={onOpenImport}><FileJson size={12} /> Import</button>
      <button type="button" className="cps-tool hot" onClick={onOpenMarkup}><Wand2 size={12} /> Markup</button>
      <button type="button" className="cps-tool danger" onClick={onClear}><Trash2 size={12} /> Clear all</button>
    </div>
  )
}

function RowActions({
  index,
  max,
  onMoveRow,
}: Pick<CostPricingSheetFormProps, 'onMoveRow'> & { index: number; max: number }) {
  return (
    <div className="cps-rmid">
      <button type="button" className="cps-rbtn" onClick={() => onMoveRow(index, -1)} disabled={index <= 0} aria-label="Move row up"><ArrowUp size={12} /></button>
      <button type="button" className="cps-rbtn" onClick={() => onMoveRow(index, 1)} disabled={index >= max - 1} aria-label="Move row down"><ArrowDown size={12} /></button>
      <button type="button" className="cps-rbtn" disabled aria-label="Duplicate row placeholder"><Copy size={12} /></button>
    </div>
  )
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
    </svg>
  )
}

function PhotoControl({
  row,
  index,
  uploadingRow,
  onPhotoUpload,
  onUpdateRow,
}: Pick<CostPricingSheetFormProps, 'uploadingRow' | 'onPhotoUpload' | 'onUpdateRow'> & { row: TableDocumentRow; index: number }) {
  return (
    <div className="cps-photo-row">
      {row.image_url ? (
        <div className="cps-thumb">
          <img src={row.image_url} alt="" />
          <button type="button" className="cps-photo-x" onClick={() => onUpdateRow(index, { image_url: null })} aria-label="Remove row photo">
            <X size={8} />
          </button>
        </div>
      ) : null}
      <label className="cps-cam">
        {uploadingRow === index ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        {row.image_url ? 'Replace photo' : 'Add photo'}
        <input
          type="file"
          accept={IMAGE_ACCEPT_ATTRIBUTE}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onPhotoUpload(index, file)
            event.currentTarget.value = ''
          }}
        />
      </label>
    </div>
  )
}

function ItemRow(props: CostPricingSheetFormProps & { row: TableDocumentRow; index: number; itemNumber: string }) {
  const { row, index, itemNumber, rows, onUpdateRow, isColumnVisible, formatters, customColumns } = props
  const line = props.rowEconomics[index]
  const marginText = line.total_selling_price > 0 ? formatters.percent(line.margin_percent) : '—'
  const [subOpen, setSubOpen] = useState(Boolean(row.specification))
  const hasSpecification = Boolean(row.specification?.trim())

  return (
    <article className={`cps-item ${row.image_url ? 'has-photo' : ''}`}>
      <button type="button" className="cps-ear" onClick={() => props.onRemoveRow(index)} aria-label={`Remove item ${itemNumber}`}><X size={11} /></button>
      <div className="cps-ihead">
        <div className="cps-row-rail">
          <span className="cps-idx">{itemNumber}</span>
          <RowActions index={index} max={rows.length} onMoveRow={props.onMoveRow} />
        </div>
        <div>
          <textarea
            className="cps-field cps-desc"
            value={row.description || ''}
            onChange={(event) => onUpdateRow(index, { description: event.target.value })}
            placeholder="Description"
            aria-label={`Description for item ${itemNumber}`}
          />
          <div className={`cps-subrow ${hasSpecification ? 'has' : ''} ${subOpen ? 'open' : ''}`}>
            <button
              type="button"
              className={`cps-subtog ${!hasSpecification ? 'sub-add' : ''}`}
              onClick={() => setSubOpen((open) => !open)}
              aria-expanded={subOpen}
            >
              <span className="stog-icon">{hasSpecification ? <NoteIcon /> : <Plus size={12} />}</span>
              <span className="stog-label">
                {hasSpecification ? <span className="sub-prev-text">{row.specification?.trim()}</span> : 'Add sub description'}
              </span>
              <span className="stog-chev"><ChevronDown size={12} /></span>
            </button>
            {subOpen ? (
              <textarea
                className="cps-field cps-subfield"
                value={row.specification || ''}
                onChange={(event) => onUpdateRow(index, { specification: event.target.value })}
                placeholder="Sub description - extra detail..."
                aria-label={`Specification for item ${itemNumber}`}
              />
            ) : null}
          </div>
          {isColumnVisible('make_brand') ? (
            <input
              className="cps-field"
              placeholder="Make / brand"
              value={row.make_brand || ''}
              onChange={(event) => onUpdateRow(index, { make_brand: event.target.value })}
              aria-label={`Make or brand for item ${itemNumber}`}
            />
          ) : null}
          <PhotoControl {...props} row={row} index={index} />
        </div>
      </div>
      <div className="cps-idata">
        <div className="cps-fgrid">
          {isColumnVisible('quantity') ? <input aria-label={`Quantity for item ${itemNumber}`} placeholder="Qty *" className="cps-field mono" inputMode="decimal" value={String(row.quantity ?? '')} onChange={(event) => onUpdateRow(index, { quantity: Number(event.target.value || 0) })} /> : null}
          {isColumnVisible('unit') ? <input aria-label={`Unit for item ${itemNumber}`} placeholder="Unit" className="cps-field" value={row.unit || ''} onChange={(event) => onUpdateRow(index, { unit: event.target.value })} /> : null}
        </div>
        <div className="cps-comm-grid">
          {isColumnVisible('cp') ? (
            <label className="cps-cfield cost">
              <span className="cf-lab"><ArrowDown size={10} /> CP</span>
              <input aria-label={`Cost price for item ${itemNumber}`} className="cps-field mono" inputMode="decimal" value={String(row.cp ?? '')} onChange={(event) => onUpdateRow(index, { cp: event.target.value })} />
            </label>
          ) : null}
          {isColumnVisible('sp') ? (
            <label className="cps-cfield sell">
              <span className="cf-lab"><ArrowUp size={10} /> SP</span>
              <input aria-label={`Selling price for item ${itemNumber}`} className="cps-field mono" inputMode="decimal" value={String(row.sp ?? '')} onChange={(event) => onUpdateRow(index, { sp: event.target.value })} />
            </label>
          ) : null}
        </div>
        <div className="cps-fin3">
          <div className="cps-fcell tcp"><small>Total cost · TCP</small><b>{formatters.money(line.total_cost_price)}</b></div>
          <div className="cps-fcell tsp"><small>Total selling · TSP</small><b>{formatters.money(line.total_selling_price)}</b></div>
          <div className={`cps-fcell pf ${line.profit < 0 ? 'loss' : 'gain'}`}><small>Profit</small><b>{formatters.money(line.profit)}</b></div>
        </div>
        <div className="cps-finm">Margin {marginText} on TSP · {line.quantity} x {formatters.money(line.unit_profit)} /unit</div>
        {customColumns.length > 0 ? (
          <div className="cps-fgrid">
            {customColumns.map((column) => (
              <Field key={column.key} label={column.label || 'Custom'}>
                <input
                  className="cps-field"
                  inputMode={column.type === 'number' ? 'decimal' : undefined}
                  value={String(row.custom_data?.[column.key] ?? '')}
                  onChange={(event) => onUpdateRow(index, { custom_data: { ...(row.custom_data || {}), [column.key]: event.target.value } })}
                />
              </Field>
            ))}
          </div>
        ) : null}
      </div>
      <button type="button" className="cps-ins" onClick={() => props.onInsertRow(index + 1, 'item', row.group_id ?? null)}>+ Insert below</button>
    </article>
  )
}

function GroupSegment(props: CostPricingSheetFormProps & { segment: Extract<Segment, { type: 'group' }> }) {
  const { segment, rows, onUpdateRow, onInsertRow, onRemoveRow } = props
  const insertAt = findCpsGroupInsertIndex(rows, segment.groupId, segment.index)
  return (
    <section className="cps-gwrap">
      <div className="cps-ghdr">
        <button type="button" className="cps-gbtn danger" onClick={() => onRemoveRow(segment.index)} aria-label="Remove group"><X size={13} /></button>
        <input
          className="cps-gtitle"
          value={segment.row.section_title || ''}
          onChange={(event) => onUpdateRow(segment.index, { section_title: event.target.value })}
          placeholder="Group title"
          aria-label="Group title"
        />
        <span className="cps-gcount">{segment.itemCount} items</span>
      </div>
      <div className="cps-gbody">
        {segment.itemCount === 0 ? (
          <div className="cps-gempty">
            No items in this group yet.<br />
            Use the button below to add the first one.
          </div>
        ) : null}
      </div>
      <div className="cps-gfoot">
        <button type="button" className="cps-gadd" onClick={() => onInsertRow(insertAt, 'item', segment.groupId)}><Plus size={11} /> Add item to this group</button>
      </div>
    </section>
  )
}

export function CpsClearAllDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="cps-overlay center" onClick={onCancel}>
      <div className="cps-dialog" role="dialog" aria-modal="true" aria-labelledby="cps-clear-dialog-title" onClick={(event) => event.stopPropagation()}>
        <b id="cps-clear-dialog-title">Clear all line items?</b>
        <p>This removes every group and item row from this sheet.</p>
        <div className="acts">
          <button type="button" className="cps-dbtn" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="cps-dbtn danger"
            onClick={onConfirm}
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemsSection(props: CostPricingSheetFormProps) {
  const [clearOpen, setClearOpen] = useState(false)
  const segments = groupSegments(props.rows)
  return (
    <section className="cps-sec">
      <SectionHead
        number="2."
        title="Line items"
        meta={`${props.rows.filter((row) => row.row_type === 'item').length} items · ${props.rows.filter((row) => row.row_type === 'section').length} groups`}
      />
      <ItemTools
        onOpenImport={props.onOpenImport}
        onOpenColumns={props.onOpenColumns}
        onOpenMarkup={props.onOpenMarkup}
        onClear={() => setClearOpen(true)}
      />
      <div className="cps-items">
        {segments.length > 0 ? segments.map((segment) => {
          if (segment.type === 'group') {
            return <GroupSegment key={segment.row._uiKey || segment.row.id || segment.index} {...props} segment={segment} />
          }
          return <ItemRow key={segment.row._uiKey || segment.row.id || segment.index} {...props} row={segment.row} index={segment.index} itemNumber={props.itemNumbers[segment.index]} />
        }) : <div className="cps-empty">No rows yet. Add an item, create a group, or import JSON.</div>}
      </div>
      <div className="cps-createpair">
        <button type="button" className="cps-cbtn primary" onClick={() => props.onAddRow('item')}><Plus size={12} /> Add line item</button>
        <button type="button" className="cps-cbtn ghost" onClick={() => props.onAddRow('section')}><Plus size={12} /> Add group</button>
      </div>
      <CpsClearAllDialog
        open={clearOpen}
        onCancel={() => setClearOpen(false)}
        onConfirm={() => {
          props.onPatchCps({ table_rows: [] })
          setClearOpen(false)
        }}
      />
    </section>
  )
}

function TotalsBlock({
  totals,
  formatters,
}: {
  totals: CpsTotals
  formatters: Formatters
}) {
  return (
    <section className="cps-sec">
      <SectionHead number="3." title="Totals" meta="No VAT · no WHT" />
      <div className="cps-gateway" aria-hidden="true"><b>End of schedule · Commercial close-out</b></div>
      <div className="cps-totals">
        <div className="cps-close-top" aria-hidden="true"><i /></div>
        <div className="cps-close-eyebrow">Cost & Pricing Summary <span>{totals.total_selling_price >= 0 ? '' : ''}</span></div>
        <div className="cps-totals-grid">
          <div>
            <div className="cps-sumline"><span>Total cost (CP x Qty)</span><b>{formatters.money(totals.total_cost)}</b></div>
            <div className="cps-sumline"><span>Schedule selling total (SP x Qty)</span><b>{formatters.money(totals.total_selling_price)}</b></div>
          </div>
          <div>
            <div className="cps-sumline"><span>Gross Profit</span><b>{formatters.money(totals.gross_profit)}</b></div>
            <div className="cps-sumline"><span>Margin</span><b>{formatters.percent(totals.margin_percent)}</b></div>
          </div>
        </div>
        <div className="cps-sumtotal">
          <span><small>Schedule Selling Total</small><b>{formatters.money(totals.total_selling_price)}</b></span>
          <span className="right"><small>Margin</small><b>{formatters.percent(totals.margin_percent)}</b></span>
        </div>
      </div>
    </section>
  )
}

function DesktopRail(props: CostPricingSheetFormProps) {
  return (
    <aside className="cps-railside">
      <div className="cps-panel">
        <h3>Schedule Selling Total</h3>
        <div className="big">{props.formatters.money(props.totals.total_selling_price)}</div>
        <div className="mrow"><span>Total cost</span><b>{props.formatters.money(props.totals.total_cost)}</b></div>
        <div className="mrow"><span>Gross profit</span><b>{props.formatters.money(props.totals.gross_profit)}</b></div>
        <div className="mrow"><span>Margin</span><b>{props.formatters.percent(props.totals.margin_percent)}</b></div>
      </div>
      <div className="cps-panel">
        <h3>Instant Markup</h3>
        <button type="button" className="cps-cbtn primary" onClick={props.onOpenMarkup}><Percent size={12} /> Open Markup</button>
        {props.hasUndo ? (
          <div className="cps-undo">
            <span>Markup applied. SP values materialized; CP, quantities, and groups untouched.</span>
            <button type="button" className="cps-cbtn primary" onClick={props.onUndoMarkup}>Undo</button>
          </div>
        ) : null}
      </div>
      <div className="cps-panel">
        <h3>Save</h3>
        <button type="button" className="cps-cbtn primary" onClick={props.onSave} disabled={props.saving}><Save size={12} /> Save</button>
      </div>
    </aside>
  )
}

export function CostPricingSheetDesktopForm(props: CostPricingSheetFormProps) {
  return (
    <div className="cps-form">
      <TopBar {...props} />
      <main className="cps-desktop-room">
        <div>
          <MetadataSection cps={props.cps} onPatchCps={props.onPatchCps} onOpenClientPicker={props.onOpenClientPicker} onClearClient={props.onClearClient} />
          <ItemsSection {...props} />
          <TotalsBlock totals={props.totals} formatters={props.formatters} />
          <NotesSection cps={props.cps} onPatchCps={props.onPatchCps} />
        </div>
        <DesktopRail {...props} />
      </main>
    </div>
  )
}

export function CostPricingSheetMobileFoldForm(props: CostPricingSheetFormProps) {
  return (
    <div className="cps-form">
      <div className="cps-mobile-wrap">
        <TopBar {...props} mobile />
        <MetadataSection cps={props.cps} onPatchCps={props.onPatchCps} onOpenClientPicker={props.onOpenClientPicker} onClearClient={props.onClearClient} />
        <ItemsSection {...props} />
        {props.hasUndo ? (
          <div className="cps-undo">
            <span>Markup applied. SP values materialized; CP, quantities, and groups untouched.</span>
            <button type="button" className="cps-cbtn primary" onClick={props.onUndoMarkup}>Undo Markup</button>
          </div>
        ) : null}
        <TotalsBlock totals={props.totals} formatters={props.formatters} />
        <NotesSection cps={props.cps} onPatchCps={props.onPatchCps} />
      </div>
      <button type="button" className="cps-phone-fab" onClick={props.onSave} disabled={props.saving} aria-label="Save Cost & Pricing Sheet">
        {props.saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
      </button>
    </div>
  )
}

export function CopySummaryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="cps-tool" onClick={onClick}>
      <Copy size={12} /> Duplicate Row
    </button>
  )
}

export function CheckIcon() {
  return <Check size={12} />
}
