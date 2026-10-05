import { useState } from 'react'
import {
  Archive,
  ArrowLeft,
  Copy,
  Download,
  FileOutput,
  MoreHorizontal,
  Palette,
  Pencil,
  Package,
  Share2,
  Trash2,
  Zap,
} from 'lucide-react'

import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentCustomizeCard from '@/components/document-view/shared/DocumentCustomizeCard'
import DocumentMoreSheet from '@/components/document-view/shared/DocumentMoreSheet'
import DocumentSheet from '@/components/document-view/shared/DocumentSheet'
import TemplatePickerCarousel, { type TemplatePickerOption } from '@/components/document-view/shared/TemplatePickerCarousel'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'
import { buildCpsViewSegments, type CpsViewData, type CpsViewRow } from '@/domain/cps/viewData'
import { CpsConversionOptionsSheet } from '@/components/cps/CpsConversionOptionsSheet'
import { CpsActivityHistory } from '@/components/cps/CpsActivityHistory'
import { DEFAULT_CONVERSION_OPTIONS, type CpsConversionOptions } from '@/domain/cps/conversion'
import { resolveCanonicalLogoUrl } from '@/domain/documentMedia'
import { usePdfCustomization } from '@/domain/pdf/customization/hooks'
import { CPS_CAPABILITIES, CPS_POLICY, CPS_TEMPLATE_DEFAULTS } from '@/domain/pdf/customization/cps'
import { PDF_ACCENT_SWATCHES } from '@/lib/pdfDesignPreset'
import {
  readCpsPdfDisplayPreferences,
  writeCpsPdfDisplayPreferences,
  type CpsPdfTemplateId,
} from '@/domain/cps/pdfPreferences'
import { useSettings } from '@/hooks/useSettings'
import { feedback } from '@/lib/feedback'

import './cost-pricing-sheet-view.css'

type ViewActions = {
  onBack: () => void
  onEdit: () => void
  onDownload: () => void
  downloading: boolean
}

type CpsDocActions = {
  onConvertToQuotation: (options?: CpsConversionOptions) => Promise<void>
  onDuplicate: () => Promise<void>
  onArchive: () => Promise<void>
  onDelete: () => Promise<void>
}

type Formatters = {
  money: (value: number) => string
  percent: (value: number) => string
}

type ViewProps = {
  data: CpsViewData
  status: string
  formatters: Formatters
  actions: CpsDocActions
} & ViewActions

type ItemViewRow = Extract<CpsViewRow, { type: 'item' }>

function monogram(name: string) {
  return (name || 'Cost & Pricing Sheet')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CP'
}

// Brand mark authority: the configured tenant/company logo, else company
// initials, else the neutral module mark. Client identity must never
// stand in for company branding.
function BrandMark({ logoUrl, companyName }: { logoUrl: string | null; companyName: string }) {
  if (logoUrl) {
    return <img className="cps-brandlogo" src={logoUrl} alt={companyName || 'Company logo'} />
  }
  return <div className="cps-monogram">{monogram(companyName)}</div>
}

type CpsClientSnapshot = {
  name?: unknown
  contact_person?: unknown
} | null | undefined

function clientSnapshot(document: CpsViewData['document']): CpsClientSnapshot {
  const customFields = (document as { custom_fields?: Record<string, unknown> }).custom_fields
  const snapshot = customFields?.client_snapshot
  return (snapshot && typeof snapshot === 'object' ? snapshot : null) as CpsClientSnapshot
}

// Saved snapshot first (document-time context), then the display name,
// then the established empty fallback. Never fetched live: history must
// not rewrite itself when the master client record changes.
function clientDisplayName(document: CpsViewData['document']): string {
  const snapshot = clientSnapshot(document)
  const snapshotName = snapshot && typeof snapshot.name === 'string' ? snapshot.name.trim() : ''
  const displayName = document.client_name?.trim() ? document.client_name.trim() : ''
  return snapshotName || displayName || 'No client'
}

// Optional second line from saved context only. Absent parts vanish;
// absence is never announced with placeholder noise.
function clientContextLine(document: CpsViewData['document']): string {
  const snapshot = clientSnapshot(document)
  const contact =
    snapshot && typeof snapshot.contact_person === 'string' ? snapshot.contact_person.trim() : ''
  const site = document.project_name?.trim() ? document.project_name.trim() : ''
  return [contact, site].filter(Boolean).join(' · ')
}

function CommercialColumn({ row, formatters }: { row: Extract<CpsViewRow, { type: 'item' }>; formatters: Formatters }) {
  return (
    <div className="cps-comm" aria-label={`Commercial breakdown, item ${row.number}`}>
      <div className="cps-crow cost">
        <span className="k">Cost</span>
        <span className="basis">{row.quantity} {row.unit} x {formatters.money(row.cp)}</span>
        <span className="amt">{formatters.money(row.cost)}</span>
      </div>
      <div className="cps-crow sell">
        <span className="k">Sell</span>
        <span className="basis">{row.quantity} {row.unit} x {formatters.money(row.sp)}</span>
        <span className="amt">{formatters.money(row.selling)}</span>
      </div>
      <div className="cps-crow profit">
        <span className="k">Profit</span>
        <span className="basis">margin {formatters.percent(row.marginPercent)}</span>
        <span className="amt">{row.profit >= 0 ? '+' : ''}{formatters.money(row.profit)}</span>
      </div>
    </div>
  )
}

function PhotoButton({ row }: { row: Extract<CpsViewRow, { type: 'item' }> }) {
  if (!row.imageUrl) return null
  return (
    <button type="button" className="cps-thumb" aria-label={`Preview photo for item ${row.number}`}>
      <img src={row.imageUrl} alt="" />
    </button>
  )
}

function MemberNote({ membership }: { membership?: string | null }) {
  if (membership === undefined) return null
  return (
    <span className="cps-sr">
      {membership ? 'Grouped item' : 'Grouped item without matching header'}
    </span>
  )
}

function DesktopEntry({ row, formatters, membership }: { row: Extract<CpsViewRow, { type: 'item' }>; formatters: Formatters; membership?: string | null }) {
  return (
    <article
      className={`cps-entry ${row.imageUrl ? 'has-photo' : ''}${membership === undefined ? '' : ' in-group'}`}
      data-group={membership === undefined ? undefined : membership || 'ungrouped'}
    >
      <MemberNote membership={membership} />
      <span className="cps-idx">{row.number}</span>
      <div className="cps-entry-text">
        <h3>{row.description || 'Untitled item'}</h3>
        {row.specification ? <p className="spec">{row.specification}</p> : null}
        <p className="meta"><b>{row.makeBrand || 'No make specified'}</b> · {row.quantity} {row.unit}</p>
        {row.notes ? <p className="meta">{row.notes}</p> : null}
      </div>
      <PhotoButton row={row} />
      <CommercialColumn row={row} formatters={formatters} />
    </article>
  )
}

function MobileEntry({ row, formatters, membership }: { row: Extract<CpsViewRow, { type: 'item' }>; formatters: Formatters; membership?: string | null }) {
  return (
    <article
      className={`cps-entry ${row.imageUrl ? '' : 'no-photo'}${membership === undefined ? '' : ' in-group'}`}
      data-group={membership === undefined ? undefined : membership || 'ungrouped'}
    >
      <MemberNote membership={membership} />
      <div className="cps-entry-cols">
        <div className="cps-entry-main">
          <div className="cps-entry-top">
            <span className="cps-idx">{row.number}</span>
            <div className="cps-entry-text">
              <h4>{row.description || 'Untitled item'}</h4>
              {row.specification ? <p className="spec">{row.specification}</p> : null}
              <p className="meta"><b>{row.makeBrand || 'No make specified'}</b> · {row.quantity} {row.unit}</p>
              {row.notes ? <p className="meta">{row.notes}</p> : null}
            </div>
          </div>
          {row.imageUrl ? (
            <div className="cps-thumbrow">
              <PhotoButton row={row} />
              <span className="cps-thumbcap">Site reference · tap to preview</span>
            </div>
          ) : null}
        </div>
        <CommercialColumn row={row} formatters={formatters} />
      </div>
    </article>
  )
}

function DocumentSurface({
  data,
  formatters,
  mobile,
}: {
  data: CpsViewData
  formatters: Formatters
  mobile?: boolean
}) {
  const segments = buildCpsViewSegments(data.rows)
  const Entry = mobile ? MobileEntry : DesktopEntry
  return (
    <section className="cps-doc" aria-label="Cost and pricing schedule">
      <div className="cps-doc-in">
        {segments.map((segment) => {
          if (segment.type === 'item') {
            return <Entry key={segment.row.key} row={segment.row} formatters={formatters} membership={segment.membership} />
          }
          return (
            <section key={segment.row.key} id={`grp-${segment.row.key}`} className="cps-grp" aria-label={segment.row.title || 'Cost and pricing group'}>
              <div className="cps-ghead" role="heading" aria-level={mobile ? 3 : 2}>
                <span className="cps-gicon" aria-hidden="true"><Package size={22} /></span>
                <div className="ghead-main">
                  {mobile ? <h3>{segment.row.title}</h3> : <h2>{segment.row.title}</h2>}
                  <div className="count">{segment.count} {segment.count === 1 ? 'item' : 'items'} · {formatters.money(segment.total)}</div>
                </div>
              </div>
              <div className="cps-gitems">
                {segment.items.map((item) => <Entry key={item.key} row={item} formatters={formatters} membership={segment.membership} />)}
              </div>
              <div className="cps-gsub" aria-label={`${segment.row.title || 'Group'} subtotal ${formatters.money(segment.total)}`}>
                <span className="k">Group Subtotal <span>({segment.count} {segment.count === 1 ? 'item' : 'items'})</span></span>
                <span className="mono">{formatters.money(segment.total)}</span>
              </div>
            </section>
          )
        })}
        <CloseOut data={data} formatters={formatters} mobile={mobile} />
      </div>
    </section>
  )
}

function Summary({ data, formatters, mobile }: { data: CpsViewData; formatters: Formatters; mobile?: boolean }) {
  return (
    <section className="cps-summary">
      <div className="sgrid">
        <div className="cps-stat cost"><div className="k">Total Cost</div><div className="v">{formatters.money(data.totals.total_cost)}</div></div>
        <div className="cps-stat sell"><div className="k">Selling Total</div><div className="v">{formatters.money(data.totals.total_selling_price)}</div></div>
        <div className="cps-stat grand"><div className="k">Gross Profit</div><div className="v">{formatters.money(data.totals.gross_profit)}</div></div>
        <div className="cps-stat"><div className="k">Margin</div><span className="mgn">{formatters.percent(data.totals.margin_percent)}</span></div>
      </div>
      {mobile ? <div className="shint">CP is internal. SP is the selling rate.</div> : null}
    </section>
  )
}

function Dossier({ data, status, formatters, mobile }: ViewProps & { mobile?: boolean }) {
  const document = data.document
  const { settings } = useSettings()
  const companyName = settings?.company_name?.trim() ? String(settings.company_name).trim() : ''
  const logoUrl = resolveCanonicalLogoUrl(settings)
  const contextLine = clientContextLine(document)
  const clientName = clientDisplayName(document)
  const title = document.title?.trim() ? document.title.trim() : ''
  return (
    <>
      <section className="cps-dossier" aria-label="Cost and pricing sheet identity">
        <div className="cps-issuer">
          <BrandMark logoUrl={logoUrl} companyName={companyName} />
          <div className="min-w-0">
            <div className="cps-id-label">Company</div>
            {companyName ? <div className="company">{companyName}</div> : null}
          </div>
        </div>
      </section>
      <section className="cps-context" aria-label="Document context">
        <div className="cps-context-title">Document context</div>
        <div className="cps-context-strip">
          <div className="cps-context-chip">
            <span>Client</span>
            <b>{clientName}</b>
          </div>
          {title ? (
            <div className="cps-context-chip">
              <span>Title</span>
              <b>{title}</b>
            </div>
          ) : null}
          {contextLine ? (
            <div className="cps-context-chip">
              <span>Context</span>
              <b>{contextLine}</b>
            </div>
          ) : null}
        </div>
        <details>
          <summary>More details</summary>
          <dl>
            <dt>Number</dt><dd>{document.cps_number}</dd>
            <dt>Status</dt><dd>{status}</dd>
            <dt>Issue Date</dt><dd>{document.issue_date || '-'}</dd>
            <dt>{mobile ? 'Selling' : 'Items'}</dt>
            <dd>{mobile ? formatters.money(data.totals.total_selling_price) : data.rows.filter((row) => row.type === 'item').length}</dd>
          </dl>
        </details>
      </section>
    </>
  )
}

function CloseOut({ data, formatters, mobile }: { data: CpsViewData; formatters: Formatters; mobile?: boolean }) {
  return (
    <section className="cps-close">
      <div className="eyebrow">Commercial Close-Out</div>
      {mobile ? <h3>Schedule total</h3> : <h2>Schedule total</h2>}
      <div className="cps-trow cost"><span>Total Cost</span><span className="mono">{formatters.money(data.totals.total_cost)}</span></div>
      <div className="cps-trow grand"><span>Total Selling Price</span><span className="mono">{formatters.money(data.totals.total_selling_price)}</span></div>
      <div className="cps-trow profit"><span>Gross Profit</span><span className="mono">{formatters.money(data.totals.gross_profit)}</span></div>
      <div className="cps-trow"><span>Margin</span><span className="mono">{formatters.percent(data.totals.margin_percent)}</span></div>
      <div className="cps-words">Amount shown from authoritative Cost & Pricing Sheet costing totals.</div>
      {data.document.notes ? <div className="cps-notes"><b>Notes</b>{data.document.notes}</div> : null}
      <div className="cps-endrule">END</div>
    </section>
  )
}

type SheetConfirm = 'convert' | 'archive' | 'delete' | null

function DocumentActionRow({
  onEdit,
  onConvert,
  onDownload,
  downloading,
}: {
  onEdit: () => void
  onConvert: () => void
  onDownload: () => void
  downloading: boolean
}) {
  return (
    <section className="cps-doc-actions" aria-label="Cost and pricing sheet actions">
      <button type="button" className="cps-view-btn convert" onClick={onConvert}>
        <span className="cps-action-icon" aria-hidden="true"><FileOutput size={15} /></span>
        <span>Convert to Quote</span>
      </button>
      <button type="button" className="cps-view-btn soft" onClick={onEdit}>
        <span className="cps-action-icon" aria-hidden="true"><Pencil size={15} /></span>
        <span>Edit</span>
      </button>
      <button type="button" className="cps-view-btn soft" onClick={onDownload} disabled={downloading}>
        <span className="cps-action-icon" aria-hidden="true"><Download size={15} /></span>
        <span>Download</span>
      </button>
    </section>
  )
}

const CPS_TEMPLATE_OPTIONS: TemplatePickerOption[] = [
  {
    id: 'ledger',
    label: 'Ledger',
    blurb: 'Grouped cost schedule',
    layout: 'commercial',
    theme: {
      pageBg: '#ffffff',
      headerBg: '#183b52',
      headerFg: '#ffffff',
      accent: '#183b52',
      border: '#dce2e6',
      mutedBg: '#edf0f2',
    },
  },
  {
    id: 'industry',
    label: 'Industry',
    blurb: 'Industrial schedule',
    layout: 'commercial',
    theme: {
      pageBg: '#ffffff',
      headerBg: '#7d8a88',
      headerFg: '#ffffff',
      accent: '#7d8a88',
      border: '#e5e7eb',
      mutedBg: '#e8e8e8',
    },
  },
]

function CpsCustomizeSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const {
    customization,
    setDocumentFont,
    setInkFont,
    setInkColour,
    setAccentColor,
    setAccentEnabled,
  } = usePdfCustomization({
    documentFamily: 'cps_sheets',
    capabilities: CPS_CAPABILITIES,
    policy: CPS_POLICY,
    templateDefaults: CPS_TEMPLATE_DEFAULTS,
  })
  const [prefs, setPrefs] = useState(() => readCpsPdfDisplayPreferences())

  const handleTemplateChange = (templateId: CpsPdfTemplateId) => {
    const next = { ...prefs, templateId }
    setPrefs(next)
    writeCpsPdfDisplayPreferences(next)
  }

  const handleLandscapeChange = (landscape: boolean) => {
    const next = { ...prefs, orientation: landscape ? 'landscape' : 'portrait' } as typeof prefs
    setPrefs(next)
    writeCpsPdfDisplayPreferences(next)
  }

  return (
    <DocumentSheet
      open={open}
      onClose={onClose}
      title="Customize CPS PDF"
      subtitle="Adjust output appearance for Cost & Pricing Sheet exports."
    >
      <DocumentCustomizeCard
        customization={customization}
        setDocumentFont={setDocumentFont}
        setInkFont={setInkFont}
        setInkColour={setInkColour}
        templatePicker={
          <TemplatePickerCarousel
            value={prefs.templateId}
            onChange={(id) => handleTemplateChange(id as CpsPdfTemplateId)}
            options={CPS_TEMPLATE_OPTIONS}
          />
        }
        colorSwatches={[]}
        customColor="auto"
        onCustomColorChange={() => {}}
        handwritingFonts={[]}
        customFont="auto"
        onCustomFontChange={() => {}}
        showAccentColor
        accentColor={customization.accentColor}
        accentEnabled={customization.accentEnabled}
        onAccentColorChange={setAccentColor}
        onAccentEnabledChange={setAccentEnabled}
        accentColorSwatches={[...PDF_ACCENT_SWATCHES]}
        showLandscape
        landscape={prefs.orientation === 'landscape'}
        onLandscapeChange={handleLandscapeChange}
        onSave={() => {
          onClose()
          feedback.success('Customization saved', { description: 'CPS PDF appearance settings updated.' })
        }}
      />
    </DocumentSheet>
  )
}

function ConvertConfirm({
  open,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <DocumentConfirmDialog
      open={open}
      title="Convert to Quotation?"
      description="This will create a new open quotation from this Cost & Pricing Sheet. Selling rates carry over as quotation prices."
      cancelLabel="Cancel"
      confirmLabel={busy ? 'Converting...' : 'Convert to Quotation'}
      loading={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}

function MoreSheet({
  open,
  onClose,
  actions,
  onRequestConvert,
}: {
  open: boolean
  onClose: () => void
  actions: CpsDocActions
  onRequestConvert: () => void
}) {
  const [confirm, setConfirm] = useState<SheetConfirm>(null)
  const [busy, setBusy] = useState<string | null>(null)
  if (!open && !confirm) return null

  async function run(id: string, fn: () => Promise<void>) {
    if (busy) return
    setBusy(id)
    try {
      await fn()
    } catch (error) {
      feedback.error('Action failed', { description: error instanceof Error ? error.message : 'Could not complete this action.' })
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  const sections = [
    {
      title: 'Document',
      items: [
        {
          id: 'convert',
          label: 'Convert to Quotation',
          description: 'Create a quotation from this sheet',
          icon: <Zap size={18} />,
          disabled: busy !== null,
          closeOnClick: false,
          onClick: onRequestConvert,
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          description: 'Copy as a new draft sheet',
          icon: <Copy size={18} />,
          disabled: busy !== null,
          onClick: () => void run('duplicate', actions.onDuplicate),
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          id: 'archive',
          label: 'Archive sheet',
          description: 'Hide from active lists',
          icon: <Archive size={18} />,
          disabled: busy !== null,
          closeOnClick: false,
          onClick: () => setConfirm('archive'),
        },
        {
          id: 'delete',
          label: 'Delete sheet',
          description: 'Permanent, with confirm',
          icon: <Trash2 size={18} />,
          destructive: true,
          disabled: busy !== null,
          closeOnClick: false,
          onClick: () => setConfirm('delete'),
        },
      ],
    },
  ]

  return (
    <>
      <DocumentMoreSheet open={open} onClose={onClose} title="Cost & Pricing Sheet actions" sections={sections} />
      <DocumentConfirmDialog
        open={confirm === 'archive'}
        title="Archive this Cost & Pricing Sheet?"
        description="This will move the sheet to the archive. You can restore it later from Settings."
        cancelLabel="Cancel"
        confirmLabel={busy === 'archive' ? 'Archiving…' : 'Archive'}
        loading={busy === 'archive'}
        onConfirm={() => void run('archive', actions.onArchive)}
        onCancel={() => setConfirm(null)}
      />
      <DocumentConfirmDialog
        open={confirm === 'delete'}
        title="Delete this Cost & Pricing Sheet?"
        description="This action is permanent and cannot be undone."
        cancelLabel="Cancel"
        confirmLabel={busy === 'delete' ? 'Deleting…' : 'Delete'}
        destructive
        loading={busy === 'delete'}
        onConfirm={() => void run('delete', actions.onDelete)}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}

function DesktopRail({ data, formatters }: Pick<ViewProps, 'data' | 'formatters'>) {
  const groups = data.rows.filter((row) => row.type === 'group') as Array<Extract<CpsViewRow, { type: 'group' }>>
  return (
    <aside className="cps-view-rail">
      <div className="cps-view-panel cps-position">
        <h3>Commercial Position</h3>
        <div className="sell">{formatters.money(data.totals.total_selling_price)}</div>
        <span className="mgn">{formatters.percent(data.totals.margin_percent)} margin</span>
        <div className="prow cost"><span>Total cost</span><span className="mono">{formatters.money(data.totals.total_cost)}</span></div>
        <div className="prow profit"><span>Profit</span><span className="mono">{formatters.money(data.totals.gross_profit)}</span></div>
      </div>
      <div className="cps-view-panel">
        <h3>Document Facts</h3>
        <div className="cps-facts"><span>Items</span><b>{data.rows.filter((row) => row.type === 'item').length}</b></div>
        <div className="cps-facts"><span>Groups</span><b>{groups.length}</b></div>
      </div>
      {groups.length > 0 ? (
        <div className="cps-view-panel cps-toc">
          <h3>Groups</h3>
          {groups.map((group) => <a key={group.key} href={`#grp-${group.key}`}><span>{group.title}</span><span className="mono">View</span></a>)}
        </div>
      ) : null}
    </aside>
  )
}

export function CostPricingSheetDesktopView(props: ViewProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertBusy, setConvertBusy] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [conversionOptions, setConversionOptions] = useState<CpsConversionOptions>(DEFAULT_CONVERSION_OPTIONS)

  async function runConvert() {
    if (convertBusy) return
    setConvertBusy(true)
    try {
      await props.actions.onConvertToQuotation(conversionOptions)
    } catch (error) {
      feedback.error('Action failed', { description: error instanceof Error ? error.message : 'Could not complete this action.' })
    } finally {
      setConvertBusy(false)
      setConvertOpen(false)
    }
  }

  return (
    <div className="cps-view">
      <header className="cps-view-topbar">
        <div className="cps-view-topbar-inner">
          <button type="button" className="cps-view-iconbtn" onClick={props.onBack} aria-label="Back to Cost & Pricing Sheets"><ArrowLeft size={17} /></button>
          <div className="cps-tb-id"><span className="num">{props.data.document.cps_number}</span><span className="cps-status" data-s={props.status.toLowerCase()}>{props.status}</span></div>
          <button type="button" className="cps-view-iconbtn" aria-label="Share"><Share2 size={17} /></button>
          <button type="button" className="cps-view-iconbtn" aria-label="Customize PDF" onClick={() => setCustomizeOpen(true)}><Palette size={17} /></button>
          <button type="button" className="cps-view-iconbtn" aria-label="More actions" onClick={() => setMoreOpen(true)}><MoreHorizontal size={17} /></button>
        </div>
      </header>
      <main className="cps-view-room">
        <section>
          <DocumentActionRow onEdit={props.onEdit} onConvert={() => setOptionsOpen(true)} onDownload={props.onDownload} downloading={props.downloading} />
          <Dossier {...props} />
          <Summary data={props.data} formatters={props.formatters} />
          <DocumentSurface data={props.data} formatters={props.formatters} />
          <CpsActivityHistory documentId={props.data.document.id} />
        </section>
        <DesktopRail data={props.data} formatters={props.formatters} />
      </main>
      <CpsCustomizeSheet open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} actions={props.actions} onRequestConvert={() => setOptionsOpen(true)} />
      <CpsConversionOptionsSheet
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        onContinue={(options) => {
          setConversionOptions(options)
          setOptionsOpen(false)
          setConvertOpen(true)
        }}
      />
      <ConvertConfirm open={convertOpen} busy={convertBusy} onConfirm={() => void runConvert()} onCancel={() => setConvertOpen(false)} />
    </div>
  )
}

export function CostPricingSheetMobileFoldView(props: ViewProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertBusy, setConvertBusy] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [conversionOptions, setConversionOptions] = useState<CpsConversionOptions>(DEFAULT_CONVERSION_OPTIONS)

  async function runConvert() {
    if (convertBusy) return
    setConvertBusy(true)
    try {
      await props.actions.onConvertToQuotation(conversionOptions)
    } catch (error) {
      feedback.error('Action failed', { description: error instanceof Error ? error.message : 'Could not complete this action.' })
    } finally {
      setConvertBusy(false)
      setConvertOpen(false)
    }
  }

  return (
    <div className="cps-view">
      <div className="cps-view-wrap">
        <header className="cps-view-appbar">
          <button type="button" className="cps-view-iconbtn" onClick={props.onBack} aria-label="Back to Cost & Pricing Sheets"><ArrowLeft size={18} /></button>
          <div className="cps-appbar-id"><span className="num">{props.data.document.cps_number}</span><span className="cps-status" data-s={props.status.toLowerCase()}>{props.status}</span></div>
          <button type="button" className="cps-view-iconbtn" aria-label="Share"><Share2 size={18} /></button>
          <button type="button" className="cps-view-iconbtn" aria-label="Customize PDF" onClick={() => setCustomizeOpen(true)}><Palette size={18} /></button>
          <button type="button" className="cps-view-iconbtn" aria-label="More actions" onClick={() => setMoreOpen(true)}><MoreHorizontal size={18} /></button>
        </header>
        <DocumentActionRow onEdit={props.onEdit} onConvert={() => setOptionsOpen(true)} onDownload={props.onDownload} downloading={props.downloading} />
        <Dossier {...props} mobile />
        <Summary data={props.data} formatters={props.formatters} mobile />
        <DocumentSurface data={props.data} formatters={props.formatters} mobile />
        <CpsActivityHistory documentId={props.data.document.id} />
      </div>
      {/* Download FAB. Geometry, icon, motion, and interaction states are owned
          by the canonical FloatingDownloadButton. This wrapper only carries the
          app bottom-nav token offset. */}
      <div className="cps-fab-slot">
        <FloatingDownloadButton label="Download Cost & Pricing Sheet" onClick={props.onDownload} disabled={props.downloading} />
      </div>
      <CpsCustomizeSheet open={customizeOpen} onClose={() => setCustomizeOpen(false)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} actions={props.actions} onRequestConvert={() => setOptionsOpen(true)} />
      <CpsConversionOptionsSheet
        open={optionsOpen}
        onOpenChange={setOptionsOpen}
        onContinue={(options) => {
          setConversionOptions(options)
          setOptionsOpen(false)
          setConvertOpen(true)
        }}
      />
      <ConvertConfirm open={convertOpen} busy={convertBusy} onConfirm={() => void runConvert()} onCancel={() => setConvertOpen(false)} />
    </div>
  )
}
