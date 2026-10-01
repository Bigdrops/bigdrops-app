import { useState } from 'react'
import {
  Archive,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  Home,
  MoreHorizontal,
  Palette,
  Share2,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'

import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentMoreSheet from '@/components/document-view/shared/DocumentMoreSheet'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'
import type { CpsViewData, CpsViewRow } from '@/domain/cps/viewData'
import { feedback } from '@/lib/feedback'

import './cost-pricing-sheet-view.css'

type ViewActions = {
  onBack: () => void
  onEdit: () => void
}

type CpsDocActions = {
  onConvertToQuotation: () => Promise<void>
  onDuplicate: () => Promise<void>
  onToggleStatus: () => Promise<void>
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
type GroupViewRow = Extract<CpsViewRow, { type: 'group' }>
type ViewSegment =
  | { type: 'item'; row: ItemViewRow; membership: string | null | undefined }
  | { type: 'group'; row: GroupViewRow; letter: string; items: ItemViewRow[]; total: number; count: number }

function monogram(name: string) {
  return (name || 'Cost & Pricing Sheet')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CP'
}

// Group identity derives from row.group_id, never from physical adjacency.
// Sections own the group_id that member items reference, so members stay
// attached to their group even when rows are not contiguous. Row order is
// never changed to satisfy presentation.
function groupLetter(index: number) {
  return String.fromCharCode(65 + index)
}

function resolveGroupLetters(rows: CpsViewRow[]) {
  const letters = new Map<string, string>()
  let index = 0
  rows.forEach((row) => {
    if (row.type !== 'group') return
    const letter = groupLetter(index)
    index += 1
    letters.set(row.key, letter)
    if (row.groupId) letters.set(row.groupId, letter)
  })
  return letters
}

// Standalone items return undefined. Members of a known group return its
// letter. Items that carry a group_id with no matching section return null.
function membershipOf(row: ItemViewRow, letters: Map<string, string>): string | null | undefined {
  if (!row.groupId) return undefined
  const letter = letters.get(row.groupId)
  return letter === undefined ? null : letter
}

function buildSegments(rows: CpsViewRow[]) {
  const letters = resolveGroupLetters(rows)
  const aggregates = new Map<string, { total: number; count: number }>()
  rows.forEach((row) => {
    if (row.type !== 'item') return
    const membership = membershipOf(row, letters)
    if (typeof membership !== 'string') return
    const entry = aggregates.get(membership) || { total: 0, count: 0 }
    entry.total += row.selling
    entry.count += 1
    aggregates.set(membership, entry)
  })

  const segments: ViewSegment[] = []
  let open: Extract<ViewSegment, { type: 'group' }> | null = null
  rows.forEach((row) => {
    if (row.type === 'group') {
      const letter = letters.get(row.key) || groupLetter(segments.length)
      const aggregate = aggregates.get(letter) || { total: 0, count: 0 }
      open = { type: 'group', row, letter, items: [], total: aggregate.total, count: aggregate.count }
      segments.push(open)
      return
    }
    const membership = membershipOf(row, letters)
    if (open && typeof membership === 'string' && membership === open.letter) {
      open.items.push(row)
      return
    }
    open = null
    segments.push({ type: 'item', row, membership })
  })

  return segments
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
      {membership ? `Member of Group ${membership}` : 'Grouped item'}
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
  const segments = buildSegments(data.rows)
  const Entry = mobile ? MobileEntry : DesktopEntry
  return (
    <section className="cps-doc" aria-label="Cost and pricing schedule">
      <div className="cps-doc-in">
        {segments.map((segment) => {
          if (segment.type === 'item') {
            return <Entry key={segment.row.key} row={segment.row} formatters={formatters} membership={segment.membership} />
          }
          return (
            <section key={segment.row.key} id={`grp-${segment.letter}`} className="cps-grp" aria-label={`Group ${segment.letter}: ${segment.row.title}`}>
              <div className="cps-ghead" role="heading" aria-level={mobile ? 3 : 2}>
                <span className="ghost" aria-hidden="true">{segment.letter}</span>
                <div className="ghead-main">
                  <div className="kicker">Group {segment.letter}</div>
                  {mobile ? <h3>{segment.row.title}</h3> : <h2>{segment.row.title}</h2>}
                  <div className="count">{segment.count} {segment.count === 1 ? 'item' : 'items'} · {formatters.money(segment.total)}</div>
                </div>
              </div>
              {segment.items.map((item) => <Entry key={item.key} row={item} formatters={formatters} membership={segment.letter} />)}
              <div className="cps-gsub" aria-label={`End of Group ${segment.letter}, subtotal ${formatters.money(segment.total)}`}>
                <span className="k">End of Group {segment.letter}</span>
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

function Dossier({ data, status, onEdit, formatters, mobile }: ViewProps & { mobile?: boolean }) {
  const document = data.document
  return (
    <>
      <section className="cps-dossier">
        <div className="cps-monogram">{monogram(document.client_name)}</div>
        <div className="min-w-0 flex-1">
          {mobile ? <h2>{document.title || 'Untitled Cost & Pricing Sheet'}</h2> : <h1>{document.title || 'Untitled Cost & Pricing Sheet'}</h1>}
          <div className="client">{document.client_name || 'No client'} · {document.project_name || 'No site'}</div>
          {!mobile ? (
            <div className="cps-context">
              <details>
                <summary>Document context</summary>
                <dl>
                  <dt>Number</dt><dd>{document.cps_number}</dd>
                  <dt>Status</dt><dd>{status}</dd>
                  <dt>Issue Date</dt><dd>{document.issue_date || '-'}</dd>
                  <dt>Items</dt><dd>{data.rows.filter((row) => row.type === 'item').length}</dd>
                </dl>
              </details>
            </div>
          ) : null}
        </div>
        {mobile ? (
          <div className="dossier-actions">
            <button type="button" className="cps-view-btn ghost" onClick={onEdit}><Edit3 size={14} /> Edit</button>
            <button type="button" className="cps-view-btn primary"><Download size={14} /> Download</button>
          </div>
        ) : null}
      </section>
      {mobile ? (
        <div className="cps-context">
          <details>
            <summary>Document context</summary>
            <dl>
              <dt>Number</dt><dd>{document.cps_number}</dd>
              <dt>Status</dt><dd>{status}</dd>
              <dt>Issue Date</dt><dd>{document.issue_date || '-'}</dd>
              <dt>Selling</dt><dd>{formatters.money(data.totals.total_selling_price)}</dd>
            </dl>
          </details>
        </div>
      ) : null}
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

function MoreSheet({ open, onClose, status, actions }: { open: boolean; onClose: () => void; status: string; actions: CpsDocActions }) {
  const [customOpen, setCustomOpen] = useState(false)
  const [confirm, setConfirm] = useState<SheetConfirm>(null)
  const [busy, setBusy] = useState<string | null>(null)
  if (!open && !customOpen && !confirm) return null

  const approved = status.toLowerCase() === 'approved'

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
          onClick: () => setConfirm('convert'),
        },
        {
          id: 'duplicate',
          label: 'Duplicate',
          description: 'Copy as a new draft sheet',
          icon: <Copy size={18} />,
          disabled: busy !== null,
          onClick: () => void run('duplicate', actions.onDuplicate),
        },
        {
          id: 'customize',
          label: 'Customize PDF',
          description: 'Template, font and text colour',
          icon: <Palette size={18} />,
          disabled: busy !== null,
          onClick: () => setCustomOpen(true),
        },
      ],
    },
    {
      title: 'Status',
      items: [
        {
          id: 'status',
          label: approved ? 'Reopen sheet' : 'Approve sheet',
          description: approved ? 'Move back to open' : 'Mark this sheet as approved',
          icon: <CheckCircle2 size={18} />,
          disabled: busy !== null,
          selected: approved,
          statusLabel: status,
          onClick: () => void run('status', actions.onToggleStatus),
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
        open={confirm === 'convert'}
        title="Convert to Quotation?"
        description="This will create a new open quotation from this Cost & Pricing Sheet. Selling rates carry over as quotation prices."
        cancelLabel="Cancel"
        confirmLabel={busy === 'convert' ? 'Converting…' : 'Convert to Quotation'}
        loading={busy === 'convert'}
        onConfirm={() => void run('convert', actions.onConvertToQuotation)}
        onCancel={() => setConfirm(null)}
      />
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
      {customOpen ? (
        <>
          <div className="cps-sheet-backdrop" onClick={() => setCustomOpen(false)} />
          <section className="cps-view-sheet" role="dialog" aria-modal="true" aria-label="Customize PDF">
            <div className="cps-sheet-head">
              <b>Customize PDF</b>
              <button type="button" onClick={() => setCustomOpen(false)} aria-label="Close customization">Close</button>
            </div>
          <p className="mt-3 text-xs font-semibold" style={{ color: 'var(--faint)' }}>Active template: <b style={{ color: 'var(--body)' }}>Modern Minimal</b>. Choices apply to generated PDF only.</p>
          <div className="cps-tz-sec">
            <h4>Template</h4>
            <div className="cps-tz-rail">
              {['Classic Ledger', 'Modern Minimal', 'Bold Commercial', 'Compact Schedule'].map((name, index) => (
                <button key={name} type="button" className={`cps-tz-card ${index === 1 ? 'on' : ''}`}>
                  <span className="cps-mini"><h6>Cost & Pricing Sheet</h6><i><span>Reinforced concrete</span><em>₦2,870,000</em></i><i><span>Y12 bars</span><em>₦1,512,000</em></i><b>₦8,597,500</b></span>
                  <span className="mt-2 block text-xs font-bold">{name} {index === 1 ? '· Active' : ''}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="cps-tz-sec"><h4>Font</h4><div className="cps-tz-fonts"><button className="cps-tz-font on">Ag System Sans</button><button className="cps-tz-font">Ag Georgia Serif</button><button className="cps-tz-font">Ag Mono</button></div></div>
          <div className="cps-tz-sec"><h4>Text colour</h4><div className="cps-tz-swatches"><button className="cps-tz-sw on" style={{ background: '#101828' }} aria-label="Text colour ink" /><button className="cps-tz-sw" style={{ background: '#1e3a5f' }} aria-label="Text colour navy" /><button className="cps-tz-sw" style={{ background: '#475569' }} aria-label="Text colour slate" /></div></div>
        </section>
        </>
      ) : null}
    </>
  )
}

function DesktopRail({ data, formatters, onEdit }: Pick<ViewProps, 'data' | 'formatters' | 'onEdit'>) {
  const groups = data.rows.filter((row) => row.type === 'group') as Array<Extract<CpsViewRow, { type: 'group' }>>
  return (
    <aside className="cps-view-rail">
      <div className="cps-view-panel cps-position">
        <h3>Commercial Position</h3>
        <div className="sell">{formatters.money(data.totals.total_selling_price)}</div>
        <span className="mgn">{formatters.percent(data.totals.margin_percent)} margin</span>
        <div className="prow cost"><span>Total cost</span><span className="mono">{formatters.money(data.totals.total_cost)}</span></div>
        <div className="prow profit"><span>Profit</span><span className="mono">{formatters.money(data.totals.gross_profit)}</span></div>
        <button type="button" className="cps-view-btn primary w-full justify-center" onClick={onEdit}><Edit3 size={15} /> Edit</button>
      </div>
      <div className="cps-view-panel">
        <h3>Document Facts</h3>
        <div className="cps-facts"><span>Items</span><b>{data.rows.filter((row) => row.type === 'item').length}</b></div>
        <div className="cps-facts"><span>Groups</span><b>{groups.length}</b></div>
      </div>
      {groups.length > 0 ? (
        <div className="cps-view-panel cps-toc">
          <h3>Groups</h3>
          {groups.map((group, index) => <a key={group.key} href={`#grp-${String.fromCharCode(65 + index)}`}><span>{String.fromCharCode(65 + index)} · {group.title}</span><span className="mono">View</span></a>)}
        </div>
      ) : null}
    </aside>
  )
}

export function CostPricingSheetDesktopView(props: ViewProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  return (
    <div className="cps-view">
      <header className="cps-view-topbar">
        <div className="cps-view-topbar-inner">
          <button type="button" className="cps-view-iconbtn" onClick={props.onBack} aria-label="Back to Cost & Pricing Sheets"><ArrowLeft size={17} /></button>
          <div className="cps-tb-id"><span className="num">{props.data.document.cps_number}</span><span className="cps-status" data-s={props.status.toLowerCase()}>{props.status}</span></div>
          <button type="button" className="cps-view-btn primary"><Download size={15} /> Download</button>
          <button type="button" className="cps-view-btn ghost" onClick={props.onEdit}><Edit3 size={15} /> Edit</button>
          <button type="button" className="cps-view-iconbtn" aria-label="Share"><Share2 size={17} /></button>
          <button type="button" className="cps-view-iconbtn" aria-label="Customize PDF" onClick={() => setMoreOpen(true)}><Palette size={17} /></button>
          <button type="button" className="cps-view-iconbtn" aria-label="More actions" onClick={() => setMoreOpen(true)}><MoreHorizontal size={17} /></button>
        </div>
      </header>
      <main className="cps-view-room">
        <section>
          <Dossier {...props} />
          <Summary data={props.data} formatters={props.formatters} />
          <DocumentSurface data={props.data} formatters={props.formatters} />
        </section>
        <DesktopRail data={props.data} formatters={props.formatters} onEdit={props.onEdit} />
      </main>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} status={props.status} actions={props.actions} />
    </div>
  )
}

export function CostPricingSheetMobileFoldView(props: ViewProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  return (
    <div className="cps-view">
      <div className="cps-view-wrap">
        <header className="cps-view-appbar">
          <button type="button" className="cps-view-iconbtn" onClick={props.onBack} aria-label="Back to Cost & Pricing Sheets"><ArrowLeft size={18} /></button>
          <div className="cps-appbar-id"><span className="num">{props.data.document.cps_number}</span><span className="cps-status" data-s={props.status.toLowerCase()}>{props.status}</span></div>
          <button type="button" className="cps-view-iconbtn" aria-label="Share"><Share2 size={18} /></button>
          <button type="button" className="cps-view-iconbtn" aria-label="Customize PDF" onClick={() => setMoreOpen(true)}><Palette size={18} /></button>
          <button type="button" className="cps-view-iconbtn" aria-label="More actions" onClick={() => setMoreOpen(true)}><MoreHorizontal size={18} /></button>
        </header>
        <Dossier {...props} mobile />
        <Summary data={props.data} formatters={props.formatters} mobile />
        <DocumentSurface data={props.data} formatters={props.formatters} mobile />
      </div>
      {/* Download FAB. Geometry, icon, motion, and interaction states are owned
          by the canonical FloatingDownloadButton. This wrapper only carries the
          CPS contextual offset that clears the mobile bottom navigation. */}
      <div className="cps-fab-slot">
        <FloatingDownloadButton label="Download Cost & Pricing Sheet" />
      </div>
      <nav className="cps-bottom-nav" aria-label="Mobile navigation">
        <button type="button"><Home size={16} /> Home</button>
        <button type="button"><Briefcase size={16} /> Jobs</button>
        <button type="button" className="active"><Download size={16} /> Sales</button>
        <button type="button"><Users size={16} /> Clients</button>
        <button type="button"><MoreHorizontal size={16} /> More</button>
      </nav>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} status={props.status} actions={props.actions} />
    </div>
  )
}
