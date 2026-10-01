import { useState } from 'react'
import {
  ArrowLeft,
  Archive,
  Briefcase,
  Check,
  Download,
  Edit3,
  FileJson,
  Home,
  MoreHorizontal,
  Palette,
  Share2,
  Trash2,
  Users,
} from 'lucide-react'

import type { CpsViewData, CpsViewRow } from '@/domain/cps/viewData'

import './cost-pricing-sheet-view.css'

type ViewActions = {
  onBack: () => void
  onEdit: () => void
}

type Formatters = {
  money: (value: number) => string
  percent: (value: number) => string
}

type ViewProps = {
  data: CpsViewData
  status: string
  formatters: Formatters
} & ViewActions

type ItemViewRow = Extract<CpsViewRow, { type: 'item' }>
type GroupViewRow = Extract<CpsViewRow, { type: 'group' }>
type ViewSegment =
  | { type: 'item'; row: ItemViewRow }
  | { type: 'group'; row: GroupViewRow; items: ItemViewRow[] }

function monogram(name: string) {
  return (name || 'Cost & Pricing Sheet')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CP'
}

function groupSegments(rows: CpsViewRow[]) {
  const segments: ViewSegment[] = []
  let currentGroup: Extract<ViewSegment, { type: 'group' }> | null = null

  rows.forEach((row) => {
    if (row.type === 'group') {
      currentGroup = { type: 'group', row, items: [] }
      segments.push(currentGroup)
      return
    }
    if (currentGroup) {
      currentGroup.items.push(row)
      return
    }
    segments.push({ type: 'item', row })
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

function DesktopEntry({ row, formatters }: { row: Extract<CpsViewRow, { type: 'item' }>; formatters: Formatters }) {
  return (
    <article className={`cps-entry ${row.imageUrl ? 'has-photo' : ''}`}>
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

function MobileEntry({ row, formatters }: { row: Extract<CpsViewRow, { type: 'item' }>; formatters: Formatters }) {
  return (
    <article className={`cps-entry ${row.imageUrl ? '' : 'no-photo'}`}>
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

function GroupPipe() {
  return (
    <svg className="cps-pipe" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect className="tube" x="3" y="3" width="94" height="94" rx="5" />
      <rect className="chan" x="3" y="3" width="94" height="94" rx="5" />
      <rect className="halo" x="3" y="3" width="94" height="94" rx="5" />
      <rect className="core" x="3" y="3" width="94" height="94" rx="5" />
    </svg>
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

function DocumentSurface({
  data,
  formatters,
  mobile,
}: {
  data: CpsViewData
  formatters: Formatters
  mobile?: boolean
}) {
  const segments = groupSegments(data.rows)
  const Entry = mobile ? MobileEntry : DesktopEntry
  return (
    <section className="cps-doc">
      <div className="cps-doc-in">
        {segments.map((segment, index) => {
          if (segment.type === 'item') {
            return <Entry key={segment.row.key} row={segment.row} formatters={formatters} />
          }
          const groupId = String.fromCharCode(65 + index)
          const groupTotal = segment.items.reduce((sum, item) => sum + item.selling, 0)
          return (
            <section key={segment.row.key} id={`grp-${groupId}`} className="cps-grp" aria-label={`Group ${groupId}: ${segment.row.title}`}>
              <GroupPipe />
              <div className="cps-ghead" role="heading" aria-level={mobile ? 3 : 2}>
                <span className="ghost" aria-hidden="true">{groupId}</span>
                <div>
                  <div className="kicker">Group {groupId}</div>
                  {mobile ? <h3>{segment.row.title}</h3> : <h2>{segment.row.title}</h2>}
                  <div className="count">{segment.items.length} {segment.items.length === 1 ? 'item' : 'items'}</div>
                </div>
              </div>
              {segment.items.map((item) => <Entry key={item.key} row={item} formatters={formatters} />)}
              <div className="cps-gsub"><span className="k">Group total</span><span className="mono">{formatters.money(groupTotal)}</span></div>
            </section>
          )
        })}
        <CloseOut data={data} formatters={formatters} mobile={mobile} />
      </div>
    </section>
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

function MoreSheet({ open, onClose, onEdit }: { open: boolean; onClose: () => void; onEdit: () => void }) {
  const [customOpen, setCustomOpen] = useState(false)
  if (!open && !customOpen) return null
  return (
    <>
      <div className="cps-sheet-backdrop" onClick={() => { onClose(); setCustomOpen(false) }} />
      {customOpen ? (
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
      ) : (
        <section className="cps-view-sheet" role="dialog" aria-modal="true" aria-label="More actions">
          <div className="cps-sheet-head">
            <b>Actions</b>
            <button type="button" onClick={onClose} aria-label="Close actions">Close</button>
          </div>
          <button type="button" className="cps-sheet-row" onClick={onEdit}><span>Edit</span><Edit3 size={16} /></button>
          <button type="button" className="cps-sheet-row"><span>Download</span><Download size={16} /></button>
          <button type="button" className="cps-sheet-row" onClick={() => setCustomOpen(true)}><span>Customize</span><Palette size={16} /></button>
          <button type="button" className="cps-sheet-row"><span>Export CSV</span><FileJson size={16} /></button>
          <button type="button" className="cps-sheet-row"><span>Archive</span><Archive size={16} /></button>
          <button type="button" className="cps-sheet-row" style={{ color: 'var(--danger)' }}><span>Delete</span><Trash2 size={16} /></button>
        </section>
      )}
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
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} onEdit={props.onEdit} />
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
      <button type="button" className="cps-view-fab" aria-label="Download Cost & Pricing Sheet"><Download size={20} /></button>
      <nav className="cps-bottom-nav" aria-label="Mobile navigation">
        <button type="button"><Home size={16} /> Home</button>
        <button type="button"><Briefcase size={16} /> Jobs</button>
        <button type="button" className="active"><Download size={16} /> Sales</button>
        <button type="button"><Users size={16} /> Clients</button>
        <button type="button"><MoreHorizontal size={16} /> More</button>
      </nav>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} onEdit={props.onEdit} />
    </div>
  )
}
