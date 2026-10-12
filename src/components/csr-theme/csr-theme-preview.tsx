/**
 * CSR Form Theme Experiment — Design Lab preview.
 *
 * An isolated evaluation of the Customer Service Report form under the real
 * Design Lab theme engine. The experiment root carries the scoped token layer
 * from `useExperimentThemeStyle` (atmosphere + production-format tokens), so
 * every surface, control, and dialog below resolves Design Lab values. No
 * document-root write, no global stylesheet rule, no saved-preference write.
 *
 * Isolation contract:
 *  - Preview-local mock state only. Save, cancel, import, client, signature,
 *    and dialog actions resolve to preview notices or preview-only dialogs.
 *    No CSR record is created or modified, no Supabase request can start
 *    from this route (this file imports no data layer).
 *  - Production CSR files are never imported here: no CsrFormScreen,
 *    CsrFormPresentations, CsrFormPage, MobileFab, or ClientSelector. The
 *    approved compact header direction and the two decorative motifs are
 *    re-expressed with lab tokens inside the experiment scope.
 *  - No `h1` element is rendered: the global production heading rule
 *    (`formTheme.css`) cannot override preview typography it never matches.
 */

import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Moon,
  Palette,
  Plus,
  SaveAll,
  Sun,
  X,
} from 'lucide-react'

import {
  resolveAppearance,
  useExperimentThemeStyle,
} from '@/components/design-lab/design-lab-theme'
import { ViewportStage, ViewportSwitcher } from '@/components/design-lab/viewport-stage'
import {
  PHOTO_HERO_FAMILY_META,
  isPhotoHeroFamilyId,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import { useDesignLabViewport } from '@/lib/designLabViewports'
import {
  CALL_TYPE_OPTIONS,
  OPERATIONAL_READING_FIELDS,
  PREVIEW_CLIENTS,
  PREVIEW_CSR,
  PREVIEW_CSR_META,
  PREVIEW_MATERIALS,
  PREVIEW_SIGNATORIES,
  SERVICE_BASIS_OPTIONS,
  STATUS_OPTIONS,
  YES_NO_OPTIONS,
  type PreviewMaterialRow,
} from './preview-csr-data'

const BLANK_MATERIAL_ROW: PreviewMaterialRow = { item: '', quantity: '', unit: '' }

function useActualWide(): boolean {
  const [wide, setWide] = React.useState(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 768px)').matches,
  )
  React.useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const onChange = () => setWide(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return wide
}

export default function CsrThemePreview() {
  const navigate = useNavigate()
  const { preference } = useThemePreferenceContext()
  const actualWide = useActualWide()

  // Seed from the persisted preference once; the preview then owns its own
  // family and appearance and never writes back.
  const [family, setFamily] = React.useState<PhotoHeroFamilyId>(() =>
    isPhotoHeroFamilyId(preference.themePresetId) ? preference.themePresetId : 'slate-navy',
  )
  const [appearance, setAppearance] = React.useState<PhotoHeroAppearance>(() =>
    resolveAppearance(preference.themeMode),
  )
  const { viewportId, viewport, setViewportId } = useDesignLabViewport()
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [optionsOpen, setOptionsOpen] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [exitOpen, setExitOpen] = React.useState(false)
  const [saveOpen, setSaveOpen] = React.useState(false)
  const [fieldMode, setFieldMode] = React.useState(false)

  // Preview-local form state. Representative seed values; every control
  // below reads and writes this state only.
  const [form, setForm] = React.useState<Record<string, string>>({ ...PREVIEW_CSR })
  const [meta, setMeta] = React.useState({ ...PREVIEW_CSR_META })
  const [materials, setMaterials] = React.useState<PreviewMaterialRow[]>(
    PREVIEW_MATERIALS.map((row) => ({ ...row })),
  )
  const [signatoryId, setSignatoryId] = React.useState<string>(PREVIEW_SIGNATORIES[0].id)
  const [dirty, setDirty] = React.useState(false)

  const noticeTimer = React.useRef<number | null>(null)
  const paletteRef = React.useRef<HTMLButtonElement | null>(null)
  const popoverRef = React.useRef<HTMLDivElement | null>(null)

  // Shared Design Lab theme layer, scoped to this experiment root.
  const { rootStyle } = useExperimentThemeStyle(family, appearance)

  const familyLabel = PHOTO_HERO_FAMILY_META.find((item) => item.id === family)?.label ?? family
  const familySwatch = PHOTO_HERO_FAMILY_META.find((item) => item.id === family)?.swatch ?? '#ffffff'

  const notify = React.useCallback((message: string) => {
    setNotice(message)
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2600)
  }, [])

  React.useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    },
    [],
  )

  // Popover dismissal: Escape returns focus to the trigger, outside taps close.
  React.useEffect(() => {
    if (!paletteOpen) return
    popoverRef.current?.querySelector('button')?.focus()

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (popoverRef.current?.contains(target) || paletteRef.current?.contains(target)) return
      setPaletteOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setPaletteOpen(false)
      paletteRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [paletteOpen])

  /* ── Preview-local updaters (mock state; nothing persists) ── */

  const update = React.useCallback((field: string, value: string) => {
    setDirty(true)
    setForm((current) => ({ ...current, [field]: value }))
  }, [])

  const updateMeta = React.useCallback((field: string, value: unknown) => {
    setDirty(true)
    setMeta((current) => ({ ...current, [field]: value }))
  }, [])

  const updateMaterialRow = React.useCallback((index: number, field: keyof PreviewMaterialRow, value: string) => {
    setDirty(true)
    setMaterials((current) => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }, [])

  const addMaterialRow = React.useCallback(() => {
    setDirty(true)
    setMaterials((current) => [...current, { ...BLANK_MATERIAL_ROW }])
  }, [])

  const removeMaterialRow = React.useCallback((index: number) => {
    setDirty(true)
    setMaterials((current) =>
      current.length === 1 ? [{ ...BLANK_MATERIAL_ROW }] : current.filter((_, i) => i !== index),
    )
  }, [])

  const previewOnly = React.useCallback((message: string) => () => notify(message), [notify])

  const handleSave = React.useCallback(() => setSaveOpen(true), [])
  const handleCancel = React.useCallback(() => {
    if (dirty) setExitOpen(true)
    else notify('Preview only — nothing to discard, no CSR was closed.')
  }, [dirty, notify])

  const handleDiscard = React.useCallback(() => {
    setExitOpen(false)
    setDirty(false)
    notify('Preview only — mock edits abandoned, no CSR was touched.')
  }, [notify])

  // Tier-driven presentation: phone viewports (mobile, fold closed, fold
  // open) use the purpose-built mobile/fold composition; tablet, desktop,
  // and actual-width devices use the desktop/tablet composition.
  const useMobile = viewport.tier === 'phone' || (!viewport.width && !actualWide)
  const isFoldOpen = viewportId === 'fold-open'

  const signatory = PREVIEW_SIGNATORIES.find((entry) => entry.id === signatoryId) ?? null
  const materialCount = materials.filter((row) => row.item || row.quantity || row.unit).length

  const field = (name: string, label: string, node: React.ReactNode, wide?: boolean) => (
    <div key={name} className={wide ? 'cte-field cte-span' : 'cte-field'}>
      <span className="cte-label">{label}</span>
      {node}
    </div>
  )

  const textInput = (name: string, placeholder?: string, mono?: boolean, type = 'text') => (
    <input
      type={type}
      aria-label={name}
      value={form[name] ?? ''}
      placeholder={placeholder}
      onChange={(e) => update(name, e.target.value)}
      className={mono ? 'cte-input cte-mono' : 'cte-input'}
    />
  )

  const selectInput = (name: string, options: readonly string[], placeholder = 'Select') => (
    <span className="cte-select">
      <select aria-label={name} value={form[name] ?? ''} onChange={(e) => update(name, e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="cte-select-icon" aria-hidden="true" />
    </span>
  )

  const textArea = (name: string, placeholder?: string, rows = 3) => (
    <textarea
      aria-label={name}
      value={form[name] ?? ''}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => update(name, e.target.value)}
      className="cte-area"
    />
  )

  const inclusionToggle = (label: string, included: boolean, onToggle: () => void) => (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={included}
      className="cte-include"
    >
      {included ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
      {included ? 'Included' : 'Excluded'}
      <span className="cte-vh">{label}</span>
    </button>
  )

  const sectionHead = (index: string, title: string, control?: React.ReactNode) => (
    <div className="cte-sec-head">
      <p className="cte-sec-title">
        <span className="cte-sec-index">{index}</span>
        {title}
      </p>
      {control}
    </div>
  )

  return (
    <div
      className="cte-root"
      style={rootStyle}
      data-cte-root="csr-theme-experiment"
      data-cte-family={family}
      data-cte-appearance={appearance}
    >
      <style>{PREVIEW_CSS}</style>

      <div className="cte-vh">
        <p>Customer Service Report theme experiment.</p>
        <p role="status">{`${familyLabel} in ${appearance} mode. Preview only — no CSR is saved.`}</p>
      </div>

      {/* Approved decorative motifs, re-expressed with lab tokens. */}
      <div className="cte-motifs" aria-hidden="true">
        <svg className="cte-motif-clip" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
          <path d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" />
          <path d="M9 12h6M9 16h4" />
        </svg>
        <svg className="cte-motif-ring" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
          <path d="M2 15h20" />
          <path d="M6 15v-1a6 6 0 0112 0v1" />
          <path d="M12 4v4" />
          <path d="M4 15a8 8 0 0116 0" />
        </svg>
      </div>

      <ViewportStage viewport={viewport}>
        <div className={useMobile ? `cte-doc${isFoldOpen ? ' cte-fold-open' : ''}` : 'cte-doc cte-wide'}>
          {/* ── Compact document header (approved direction: no hero title) ── */}
          <header className="cte-header">
            <div className="cte-header-main">
              <p className="cte-eyebrow">{fieldMode ? 'Field CSR · Preview' : 'Create CSR · Preview'}</p>
              <p className="cte-title">Customer Service Report</p>
              <p className="cte-meta">{form.csr_number || 'Pending number'}</p>
            </div>
            <div className="cte-header-actions">
              <span className="cte-preview-pill">Preview</span>
              <button
                type="button"
                className="cte-icon-btn"
                aria-label="CSR form options"
                aria-expanded={optionsOpen}
                onClick={() => setOptionsOpen((open) => !open)}
              >
                <ClipboardList aria-hidden="true" />
              </button>
            </div>
          </header>

          {optionsOpen ? (
            <div className="cte-options" role="dialog" aria-label="CSR form options">
              <button
                type="button"
                onClick={() => {
                  setFieldMode((mode) => !mode)
                  setDirty(true)
                  setOptionsOpen(false)
                }}
              >
                <span>{fieldMode ? 'Use standard CSR mode' : 'Use field CSR mode'}</span>
                <span className="cte-options-hint">Document mode</span>
              </button>
              <button type="button" className="cte-options-close" onClick={() => setOptionsOpen(false)}>
                Close
              </button>
            </div>
          ) : null}

          {/* ── 01 · Document details ── */}
          <section className="cte-sec" aria-label="Document details">
            {sectionHead('01', 'Document Details')}
            <div className="cte-grid">
              <div className="cte-field cte-span">
                <span className="cte-label">Client account *</span>
                <span className="cte-select">
                  <select
                    aria-label="Client account"
                    value={form.client_id}
                    onChange={(e) => {
                      const client = PREVIEW_CLIENTS.find((entry) => entry.id === e.target.value)
                      update('client_id', e.target.value)
                      update('client_name', client?.name ?? '')
                    }}
                  >
                    {PREVIEW_CLIENTS.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="cte-select-icon" aria-hidden="true" />
                </span>
              </div>
              {field('CSR number', 'CSR number *', textInput('csr_number', undefined, true))}
              {field('Report date', 'Report date', textInput('date', undefined, true, 'date'))}
              {field('Customer contact', 'Customer contact', textInput('client_name', 'Contact person'))}
              {field('PO number', 'P.O. number', textInput('po_number', 'PO #'))}
            </div>
          </section>

          {/* ── 02 · Item controls ── */}
          <section className="cte-sec" aria-label="Item controls">
            {sectionHead('02', 'Item Controls')}
            <button type="button" className="cte-ghost-btn" onClick={previewOnly('Preview only — no items were imported.')}>
              <Plus aria-hidden="true" /> Import
            </button>
          </section>

          {/* ── 03 · Service parameters ── */}
          <section className="cte-sec" aria-label="Service parameters">
            {sectionHead('03', 'Service Parameters')}
            <div className="cte-grid cte-grid-3">
              {field('Call type', 'Call type', selectInput('call_type', CALL_TYPE_OPTIONS, 'Select…'))}
              {field('Service basis', 'Service basis', selectInput('service_basis', SERVICE_BASIS_OPTIONS, 'Select…'))}
              {field('System down', 'System down?', selectInput('system_down', YES_NO_OPTIONS, 'Select'))}
            </div>
          </section>

          {/* ── 04 · Equipment specifications ── */}
          <section className="cte-sec" aria-label="Equipment specifications">
            {sectionHead('04', 'Equipment Specifications')}
            <div className="cte-grid">
              {field('Equipment type', 'Equipment type', textInput('equipment_type', 'e.g. Diesel Generator'))}
              {field('Equipment location', 'Equipment location', textInput('equipment_location', 'e.g. Bay 2'))}
              {field('Make', 'Make', textInput('make', 'Manufacturer'))}
              {field('Capacity', 'Capacity', textInput('capacity', 'e.g. 500 kVA'))}
              {field(meta.modelLabel, meta.modelLabel, textInput('model', 'Model ID'))}
              {field(meta.serialLabel, meta.serialLabel, textInput('serial_no', 'Serial #', true))}
              {field('Engine number', 'Engine No', textInput('engine_no', 'Engine #', true))}
            </div>
          </section>

          {/* ── 05 · Problem & service ── */}
          <section className="cte-sec" aria-label="Problem and service details">
            {sectionHead('05', 'Problem & Service Details')}
            <div className="cte-stack">
              {field('Problem reported', 'Problem reported', textArea('problem_reported', 'Client complaint…', 3), true)}
              {field('Service rendered', 'Service rendered', textArea('service_rendered', 'Corrective actions…', 3), true)}
              <div className="cte-grid">
                {field('Defects found', 'Defects found', textArea('defects_found', 'Root causes…', 2))}
                {field('Engineer remarks', 'Engineer remarks', textArea('engineer_remarks', 'Recommendations…', 2))}
              </div>
            </div>
          </section>

          {/* ── 06 · Execution timeline & status ── */}
          <section className="cte-sec" aria-label="Execution timeline and status">
            {sectionHead('06', 'Execution Timeline & Status')}
            <div className="cte-grid">
              {field('Start date', 'Start date', textInput('start_date', undefined, true, 'date'))}
              {field('Start time', 'Start time', textInput('start_time', undefined, true, 'time'))}
              {field('End date', 'End date', textInput('end_date', undefined, true, 'date'))}
              {field('End time', 'End time', textInput('end_time', undefined, true, 'time'))}
              {field('Status after service', 'Status after service', selectInput('status', STATUS_OPTIONS, 'Select'))}
            </div>
          </section>

          {/* ── 07 · Operational readings ── */}
          <section className="cte-sec" aria-label="Operational readings">
            {sectionHead(
              '07',
              'Operational Readings',
              inclusionToggle('Operational readings', meta.showOperationalReadings, () =>
                updateMeta('showOperationalReadings', !meta.showOperationalReadings),
              ),
            )}
            {meta.showOperationalReadings ? (
              <div className="cte-grid cte-grid-3">
                {OPERATIONAL_READING_FIELDS.map(({ label, field: name }) => (
                  <React.Fragment key={name}>{field(label, label, textInput(name, undefined, true))}</React.Fragment>
                ))}
              </div>
            ) : null}
          </section>

          {/* ── 08 · Materials used ── */}
          <section className="cte-sec" aria-label="Materials used">
            <div className="cte-sec-head">
              <p className="cte-sec-title">
                <span className="cte-sec-index">08</span>
                Materials Used
              </p>
              <span className="cte-count">{materialCount} items</span>
            </div>
            <ol className="cte-materials">
              {materials.map((row, index) => (
                <li key={index} className="cte-material-row">
                  <span className="cte-material-num" aria-hidden="true">{index + 1}</span>
                  <input
                    aria-label={`Material ${index + 1} specification`}
                    value={row.item}
                    placeholder="Material specification"
                    onChange={(e) => updateMaterialRow(index, 'item', e.target.value)}
                    className="cte-input"
                  />
                  <input
                    aria-label={`Material ${index + 1} quantity`}
                    value={row.quantity}
                    placeholder="Qty"
                    onChange={(e) => updateMaterialRow(index, 'quantity', e.target.value)}
                    className="cte-input cte-mono cte-center"
                  />
                  <input
                    aria-label={`Material ${index + 1} unit`}
                    value={row.unit}
                    placeholder="Unit"
                    onChange={(e) => updateMaterialRow(index, 'unit', e.target.value)}
                    className="cte-input cte-center"
                  />
                  {materials.length > 1 ? (
                    <button
                      type="button"
                      className="cte-row-remove"
                      aria-label={`Remove material row ${index + 1}`}
                      onClick={() => removeMaterialRow(index)}
                    >
                      <X aria-hidden="true" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ol>
            <button type="button" className="cte-ghost-btn cte-block" onClick={addMaterialRow}>
              <Plus aria-hidden="true" /> Add material row
            </button>
          </section>

          {/* ── 09 · Technician endorsement ── */}
          <section className="cte-sec" aria-label="Technician endorsement">
            {sectionHead(
              '09',
              'Technician Endorsement',
              inclusionToggle('Technician sign line', meta.showTechnicianSignLine, () =>
                updateMeta('showTechnicianSignLine', !meta.showTechnicianSignLine),
              ),
            )}
            {meta.showTechnicianSignLine ? (
              <div className="cte-stack">
                <div className="cte-field">
                  <span className="cte-label">Technician name</span>
                  <input
                    aria-label="Technician name"
                    value={String(meta.technicianName ?? '')}
                    onChange={(e) => updateMeta('technicianName', e.target.value)}
                    className="cte-input"
                  />
                </div>
                <div className="cte-sign-card">
                  <div>
                    <span className="cte-sign-cap">Technician signature</span>
                    <p className="cte-sign-name">{signatory ? signatory.name : 'Leave blank for offline sign.'}</p>
                    {signatory?.role ? <span className="cte-sign-role">{signatory.role}</span> : null}
                  </div>
                  <span className="cte-select cte-sign-pick">
                    <select
                      aria-label="Technician signatory"
                      value={signatoryId}
                      onChange={(e) => {
                        setSignatoryId(e.target.value)
                        setDirty(true)
                      }}
                    >
                      {PREVIEW_SIGNATORIES.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="cte-select-icon" aria-hidden="true" />
                  </span>
                </div>
              </div>
            ) : null}
          </section>

          {/* ── 10 · Customer acknowledgement ── */}
          <section className="cte-sec" aria-label="Customer acknowledgement">
            {sectionHead(
              '10',
              'Customer Acknowledgement',
              inclusionToggle('Customer acknowledgement', meta.showAcknowledgement, () =>
                updateMeta('showAcknowledgement', !meta.showAcknowledgement),
              ),
            )}
            {meta.showAcknowledgement ? (
              <div className="cte-stack">
                {field(
                  'Recipient name',
                  'Recipient name & title',
                  textInput('acknowledgement_name', 'e.g. John Doe (Plant Manager)'),
                  true,
                )}
                {field(
                  'Customer feedback',
                  'Feedback / endorsement note',
                  textArea('customer_feedback', 'Client feedback notes…', 2),
                  true,
                )}
                <div className="cte-sign-card">
                  <div>
                    <span className="cte-sign-cap">Recipient signature</span>
                    <p className="cte-sign-name">Preview placeholder</p>
                    <span className="cte-sign-role">Uploads are disabled in this experiment.</span>
                  </div>
                  <button
                    type="button"
                    className="cte-secondary-btn"
                    onClick={previewOnly('Preview only — signature upload is disabled.')}
                  >
                    Upload Signature
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          {/* ── Bottom actions (preview-safe) ── */}
          <footer className="cte-actions" aria-label="CSR form actions">
            <button type="button" className="cte-secondary-btn" onClick={handleCancel}>
              Cancel
            </button>
            <button type="button" className="cte-primary-btn" onClick={handleSave}>
              <SaveAll aria-hidden="true" /> Save CSR
            </button>
          </footer>

          {/* ── Floating save (mobile/fold presentation only) ── */}
          {useMobile ? (
            <button
              type="button"
              className="cte-fab"
              aria-label="Save CSR (preview)"
              onClick={handleSave}
            >
              <SaveAll aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </ViewportStage>

      {/* ── Unsaved-changes preview dialog ── */}
      {exitOpen ? (
        <div className="cte-dialog-veil" onClick={() => setExitOpen(false)}>
          <div
            className="cte-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cte-exit-title"
            aria-describedby="cte-exit-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="cte-exit-title" className="cte-dialog-title">Unsaved Changes</p>
            <p id="cte-exit-desc" className="cte-dialog-desc">
              You have unsaved changes to this Customer Service Report. What would you like to do?
              Preview only — nothing is saved or discarded for real.
            </p>
            <div className="cte-dialog-actions">
              <button type="button" autoFocus className="cte-primary-btn" onClick={() => { setExitOpen(false); setSaveOpen(true) }}>
                Save &amp; Exit
              </button>
              <button type="button" className="cte-secondary-btn" onClick={() => setExitOpen(false)}>
                Keep Editing
              </button>
              <button type="button" className="cte-danger-btn" onClick={handleDiscard}>
                Discard &amp; Exit
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Save-confirmation preview dialog ── */}
      {saveOpen ? (
        <div className="cte-dialog-veil" onClick={() => setSaveOpen(false)}>
          <div
            className="cte-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cte-save-title"
            aria-describedby="cte-save-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="cte-dialog-eyebrow">
              <Check aria-hidden="true" /> Preview confirmation
            </p>
            <p id="cte-save-title" className="cte-dialog-title">CSR Preview Saved</p>
            <p id="cte-save-desc" className="cte-dialog-desc">
              This is a simulated confirmation. No production CSR was created, updated, or numbered.
            </p>
            <div className="cte-dialog-actions">
              <button type="button" autoFocus className="cte-primary-btn" onClick={() => { setSaveOpen(false); navigate('/design-lab') }}>
                Back to Design Lab
              </button>
              <button type="button" className="cte-secondary-btn" onClick={() => setSaveOpen(false)}>
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Compact floating palette, outside the form scroll flow. */}
      <div className="cte-dock">
        <button
          ref={paletteRef}
          type="button"
          className="cte-dock-btn"
          aria-expanded={paletteOpen}
          aria-controls="cte-palette"
          aria-label={paletteOpen ? 'Close theme palette' : 'Open theme palette'}
          onClick={() => setPaletteOpen((open) => !open)}
        >
          <Palette aria-hidden="true" />
          <span className="cte-dock-dot" style={{ ['--swatch' as string]: familySwatch }} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="cte-dock-btn"
          aria-label="Close experiment and return to Design Lab"
          onClick={() => navigate('/design-lab')}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      {paletteOpen ? (
        <div ref={popoverRef} id="cte-palette" className="cte-pop" role="dialog" aria-label="Experiment theme palette">
          <div className="cte-pop-group" role="group" aria-label="Theme family">
            {PHOTO_HERO_FAMILY_META.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={family === item.id}
                aria-label={`Use ${item.label}`}
                onClick={() => setFamily(item.id)}
              >
                <span className="cte-pop-dot" style={{ ['--swatch' as string]: item.swatch }} aria-hidden="true" />
                {item.short}
              </button>
            ))}
          </div>

          <div className="cte-pop-group" role="group" aria-label="Appearance">
            <button
              type="button"
              aria-pressed={appearance === 'light'}
              aria-label="Use light appearance"
              onClick={() => setAppearance('light')}
            >
              <Sun aria-hidden="true" />
              Light
            </button>
            <button
              type="button"
              aria-pressed={appearance === 'dark'}
              aria-label="Use dark appearance"
              onClick={() => setAppearance('dark')}
            >
              <Moon aria-hidden="true" />
              Dark
            </button>
          </div>

          <div className="cte-pop-group cte-pop-group--viewport">
            <ViewportSwitcher viewportId={viewportId} onSelect={setViewportId} />
          </div>

          <button
            type="button"
            className="cte-pop-close"
            onClick={() => {
              setPaletteOpen(false)
              paletteRef.current?.focus()
            }}
          >
            Close
          </button>
        </div>
      ) : null}

      {notice ? (
        <p className="cte-notice" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  )
}

const PREVIEW_CSS = `
  /* Experiment scope. No rule here targets html, body, :root, or h1. */
  .cte-root{position:relative;min-height:100dvh}
  .cte-root[data-cte-appearance="dark"]{color-scheme:dark}
  .cte-root[data-cte-appearance="light"]{color-scheme:light}
  .cte-vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

  /* Design Lab canvas: the atmospheric scene replaces any flat form background. */
  .cte-root .dlv-stage{background-color:transparent;background-image:var(--scene-intro);background-attachment:fixed;background-size:cover}
  .cte-root .dlv-surface{container-type:inline-size}

  /* Decorative motifs: lab-ink at restrained opacity, never over content. */
  .cte-motifs{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;color:var(--chrome-ink);opacity:.10}
  .cte-motif-clip{position:absolute;right:-2.5rem;top:3.5rem;height:14rem;width:14rem}
  .cte-motif-ring{position:absolute;left:-3rem;top:44%;height:16rem;width:16rem}

  /* Document compositions. Mobile/fold is a narrow readable column; fold-open
     breathes wider without switching families. Desktop/tablet is multi-column. */
  .cte-doc{position:relative;z-index:1;width:100%;max-width:30rem;margin:0 auto;padding:12px 16px calc(120px + env(safe-area-inset-bottom,0px))}
  .cte-doc.cte-fold-open{max-width:42rem}
  .cte-doc.cte-wide{max-width:64rem;padding:20px 24px calc(96px + env(safe-area-inset-bottom,0px))}

  /* Compact document header (approved direction: no hero title). */
  .cte-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 2px 12px;border-bottom:1px solid var(--line)}
  .cte-eyebrow{margin:0;font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--eyebrow)}
  .cte-title{margin:2px 0 0;font-size:20px;line-height:1.15;font-weight:800;letter-spacing:-.02em;color:var(--chrome-ink)}
  .cte-wide .cte-title{font-size:22px}
  .cte-meta{margin:4px 0 0;font-family:"DM Mono",monospace;font-size:10px;font-weight:700;color:var(--hero-accent)}
  .cte-header-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
  .cte-preview-pill{border:1px solid var(--glass-line);border-radius:999px;padding:4px 10px;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--eyebrow);background:var(--glass-bg)}
  .cte-icon-btn{display:grid;place-items:center;width:44px;height:44px;border:1px solid var(--glass-line);border-radius:12px;background:var(--glass-bg);color:var(--glass-ink)}
  .cte-icon-btn svg{width:18px;height:18px}

  .cte-options{display:flex;flex-direction:column;gap:4px;margin:10px 0 0;padding:8px;border:1px solid var(--glass-line);border-radius:14px;background:var(--glass-bg);color:var(--glass-ink)}
  .cte-options button{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;padding:0 12px;border-radius:10px;font-size:12px;font-weight:700}
  .cte-options-hint{font-size:10px;font-weight:600;opacity:.7}
  .cte-options-close{justify-content:center;border-top:1px solid var(--glass-line);border-radius:0 0 10px 10px}

  /* Sections: document flow with dividers, not dashboard cards. */
  .cte-sec{padding:16px 2px;border-bottom:1px solid var(--line)}
  .cte-sec:last-of-type{border-bottom:none}
  .cte-sec-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px}
  .cte-sec-title{display:flex;align-items:center;gap:8px;margin:0;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--chrome-ink)}
  .cte-sec-index{display:grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:7px;background:var(--glass-bg);border:1px solid var(--glass-line);color:var(--hero-accent);font-size:10px;font-weight:900;letter-spacing:.04em}
  .cte-count{font-family:"DM Mono",monospace;font-size:10px;font-weight:700;color:var(--copy)}

  .cte-grid{display:grid;grid-template-columns:1fr;gap:10px}
  .cte-wide .cte-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .cte-wide .cte-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}
  .cte-stack{display:grid;gap:10px}
  .cte-span{grid-column:1/-1}
  .cte-field{display:grid;gap:5px;min-width:0}
  .cte-label{font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--eyebrow)}

  /* Controls: lab surfaces, lab lines, lab focus. */
  .cte-input,.cte-area,.cte-select select{
    width:100%;
    border:1px solid var(--line-strong);
    border-radius:10px;
    background:hsl(var(--surface));
    color:hsl(var(--ink));
    font-size:13px;
    font-weight:600;
  }
  .cte-input,.cte-select select{min-height:44px;padding:0 12px}
  .cte-area{min-height:76px;padding:10px 12px;resize:vertical;line-height:1.5}
  .cte-input::placeholder,.cte-area::placeholder{color:hsl(var(--ink-3));font-weight:500}
  .cte-mono{font-family:"DM Mono",monospace;font-size:12px}
  .cte-center{text-align:center}
  .cte-input:focus-visible,.cte-area:focus-visible,.cte-select select:focus-visible{outline:2px solid var(--hero-accent);outline-offset:1px}
  .cte-select{position:relative;display:block}
  .cte-select select{appearance:none;-webkit-appearance:none;padding-right:36px}
  .cte-select-icon{position:absolute;right:12px;top:50%;width:16px;height:16px;transform:translateY(-50%);pointer-events:none;color:hsl(var(--ink-3))}
  .cte-select option{background:hsl(var(--surface));color:hsl(var(--ink))}

  /* Inclusion controls and ghost buttons. */
  .cte-include{display:inline-flex;align-items:center;gap:5px;min-height:36px;padding:0 12px;border:1px solid var(--glass-line);border-radius:999px;background:var(--glass-bg);color:var(--glass-ink);font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
  .cte-include svg{width:14px;height:14px}
  .cte-ghost-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 16px;border:1px solid var(--glass-line);border-radius:10px;background:var(--glass-bg);color:var(--glass-ink);font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
  .cte-ghost-btn svg{width:15px;height:15px}
  .cte-block{width:100%}

  /* Materials. */
  .cte-materials{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:8px}
  .cte-material-row{display:grid;grid-template-columns:28px 1fr 76px 64px auto;gap:6px;align-items:center}
  .cte-material-num{display:grid;place-items:center;width:24px;height:24px;border-radius:7px;background:var(--glass-bg);border:1px solid var(--glass-line);color:var(--hero-accent);font-family:"DM Mono",monospace;font-size:10px;font-weight:700}
  .cte-row-remove{display:grid;place-items:center;width:44px;height:44px;border-radius:999px;color:hsl(var(--ink-3))}
  .cte-row-remove svg{width:15px;height:15px}
  .cte-row-remove:hover{color:var(--danger);background:var(--glass-bg)}

  /* Signature cards. */
  .cte-sign-card{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:hsl(var(--surface))}
  .cte-sign-cap{display:block;font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:hsl(var(--ink-3))}
  .cte-sign-name{margin:3px 0 0;font-size:13px;font-weight:700;color:hsl(var(--ink))}
  .cte-sign-role{display:block;margin-top:2px;font-size:10px;font-weight:600;color:hsl(var(--ink-3))}
  .cte-sign-pick{min-width:150px}

  /* Action hierarchy: primary Save, secondary Keep/Cancel, restrained danger. */
  .cte-actions{display:flex;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}
  .cte-actions .cte-primary-btn,.cte-actions .cte-secondary-btn{flex:1}
  .cte-wide .cte-actions{justify-content:flex-end}
  .cte-wide .cte-actions .cte-primary-btn,.cte-wide .cte-actions .cte-secondary-btn{flex:0 1 auto;min-width:11rem}
  .cte-primary-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 20px;border-radius:10px;background:var(--cta-bg);color:var(--cta-ink);font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
  .cte-primary-btn svg{width:16px;height:16px}
  .cte-secondary-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 20px;border-radius:10px;border:1px solid var(--glass-line);background:var(--glass-bg);color:var(--glass-ink);font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
  .cte-danger-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border-radius:10px;border:1px solid color-mix(in srgb,var(--danger) 45%,transparent);background:transparent;color:var(--danger);font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
  .cte-primary-btn:active,.cte-secondary-btn:active,.cte-danger-btn:active{transform:scale(.98)}

  /* Floating save: mobile/fold presentation only. */
  .cte-fab{position:fixed;z-index:60;right:16px;bottom:calc(24px + env(safe-area-inset-bottom,0px));display:grid;place-items:center;width:56px;height:56px;border-radius:18px;background:var(--cta-bg);color:var(--cta-ink);box-shadow:var(--shadow-float)}
  .cte-fab svg{width:22px;height:22px}

  /* Preview dialogs: lab glass, lab ink, production action hierarchy. */
  .cte-dialog-veil{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.5)}
  .cte-dialog{width:min(420px,100%);padding:20px;border:1px solid var(--glass-line);border-radius:18px;background:var(--glass-bg);color:var(--glass-ink);box-shadow:var(--shadow-float)}
  .cte-dialog-eyebrow{display:flex;align-items:center;gap:6px;margin:0 0 8px;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--hero-accent)}
  .cte-dialog-eyebrow svg{width:14px;height:14px}
  .cte-dialog-title{margin:0;font-size:17px;font-weight:800;letter-spacing:-.01em;color:var(--chrome-ink)}
  .cte-dialog-desc{margin:8px 0 0;font-size:13px;line-height:1.55;font-weight:600;color:var(--copy)}
  .cte-dialog-actions{display:grid;gap:8px;margin-top:16px}
  .cte-dialog-actions .cte-primary-btn,.cte-dialog-actions .cte-secondary-btn,.cte-dialog-actions .cte-danger-btn{width:100%}

  /* Compact floating palette + notice (Design Lab conventions). */
  .cte-dock{position:fixed;z-index:70;left:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:8px}
  .cte-dock-btn{position:relative;display:grid;width:44px;height:44px;place-items:center;border:1px solid var(--glass-line);border-radius:14px;background:var(--glass-bg);color:var(--glass-ink)}
  .cte-dock-btn svg{width:18px;height:18px}
  .cte-dock-dot{position:absolute;right:6px;bottom:6px;width:10px;height:10px;border-radius:999px;background:var(--swatch);box-shadow:0 0 0 2px var(--glass-bg)}
  .cte-pop{position:fixed;z-index:71;left:12px;bottom:calc(140px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:8px;width:min(340px,calc(100vw - 24px));max-height:calc(100dvh - 180px);overflow-y:auto;padding:8px;border:1px solid var(--glass-line);border-radius:18px;background:var(--glass-bg);color:var(--glass-ink)}
  .cte-pop-group{display:flex;align-items:center;flex-wrap:wrap;gap:4px}
  .cte-pop button{display:inline-flex;align-items:center;gap:7px;min-height:36px;padding:0 11px;border-radius:12px;color:var(--glass-ink);font-size:11px;font-weight:800;opacity:.78}
  .cte-pop button[aria-pressed="true"]{background:var(--chrome-ink);color:var(--primary-ink);opacity:1}
  .cte-pop-dot{width:10px;height:10px;border-radius:999px;background:var(--swatch);box-shadow:0 0 0 2px rgba(128,128,128,.25),0 0 18px var(--swatch)}
  .cte-pop svg{width:14px;height:14px}
  .cte-pop-close{justify-content:center;width:100%;border-top:1px solid var(--glass-line);border-radius:0 0 12px 12px}
  .cte-notice{position:fixed;z-index:72;right:12px;bottom:calc(140px + env(safe-area-inset-bottom,0px));max-width:min(78vw,360px);margin:0;padding:10px 14px;border:1px solid var(--glass-line);border-radius:14px;background:var(--glass-bg);color:var(--chrome-ink);font-size:12px;font-weight:700}

  .cte-root .cte-dock-btn:focus-visible,
  .cte-pop :focus-visible,
  .cte-input:focus-visible,
  .cte-dialog-actions :focus-visible{outline:2px solid var(--hero-accent);outline-offset:2px}

  /* Simulated tiers restate density against the shared dlv container. The
     presentation itself is chosen in JS from the viewport tier; these rules
     only tune gutters so simulated widths never overflow or miniaturize. */
  @container dlv (max-width: 767.9px){
    [data-dlv-sim] .cte-doc{padding-left:12px;padding-right:12px}
    [data-dlv-sim] .cte-material-row{grid-template-columns:24px 1fr 64px 56px auto}
  }
  @container dlv (min-width: 768px){
    [data-dlv-sim] .cte-doc{max-width:56rem}
  }
  @container dlv (min-width: 1024px){
    [data-dlv-sim] .cte-doc{max-width:64rem}
  }
  @media (min-width:768px){
    .cte-dock{left:calc(16rem + 16px);bottom:20px}
    .cte-pop{left:calc(16rem + 16px);bottom:76px}
    .cte-notice{bottom:96px}
  }
  @media (prefers-reduced-transparency:reduce){
    .cte-dock-btn,.cte-pop,.cte-notice,.cte-icon-btn,.cte-include,.cte-ghost-btn,.cte-preview-pill,.cte-options,.cte-sec-index,.cte-material-num{
      background:var(--panel);
      color:var(--chrome-ink);
    }
  }
  @media (prefers-reduced-motion:reduce){
    .cte-primary-btn:active,.cte-secondary-btn:active,.cte-danger-btn:active{transform:none}
  }
`
