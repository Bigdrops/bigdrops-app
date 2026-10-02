/*
 * BIGDROPS - Cost & Pricing Sheet - mobile/fold form template.
 * Overlay presentation components converted 1:1 from the prototype
 * (cost-price-sheet-form-candidate-v1-mobile-fold.html).
 *
 * Every overlay stays mounted in the DOM and toggles the prototype
 * .show class, exactly like the source. Sheet visibility, focus
 * return, and Escape handling are owned by CostPricingSheetForm.
 *
 * The Instant Markup sheet keeps its presentational workflow and the
 * prototype's float math. Production must route derived SP values
 * through the authoritative Decimal path before ship.
 */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CPS_TYPE,
  isItemRow,
  naira0,
  type CpsClient,
  type CpsColumn,
  type CpsColumnKey,
  type CpsItemRow,
  type CpsMarkupChange,
  type CpsMarkupMode,
  type CpsRow,
} from './cost-pricing-sheet-shared';
import {
  IconCheck,
  IconClose,
  IconDown,
  IconGrip,
  IconMarkup,
  IconNaira,
  IconUp,
} from './CostPricingSheetIcons';

/* ------------------------------------------------------------------ */
/* Generic bits                                                        */
/* ------------------------------------------------------------------ */

export interface ToastViewProps {
  show: boolean;
  message: string;
  isError: boolean;
}

export function ToastView({ show, message, isError }: ToastViewProps) {
  return <div className={`toast${show ? ' show' : ''}${isError ? ' err' : ''}`}>{message}</div>;
}

export interface ConfirmDialogProps {
  open: boolean;
  /** Matches the CpsSheetId so the form can focus the first control. */
  sheetId: string;
  ariaLabel: string;
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ open, sheetId, ariaLabel, title, body, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <div
      className={`ov center${open ? ' show' : ''}`}
      data-ov={sheetId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-label={ariaLabel}>
        <b>{title}</b>
        <p>{body}</p>
        <div className="acts">
          <button className="dbtn" onClick={onCancel}>Cancel</button>
          <button className="dbtn danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Client picker sheet                                                 */
/* ------------------------------------------------------------------ */

export interface ClientSheetProps {
  open: boolean;
  clients: CpsClient[];
  selectedId: string | null;
  onChoose: (clientId: string) => void;
  onAddNew: () => void;
  onClose: () => void;
}

export function ClientSheet({ open, clients, selectedId, onChoose, onAddNew, onClose }: ClientSheetProps) {
  const [query, setQuery] = useState('');
  const prevOpen = useRef(open);
  if (prevOpen.current !== open) {
    prevOpen.current = open;
    if (open) setQuery('');
  }

  const q = query.toLowerCase();
  const list = clients.filter(
    (c) => !q || c.name.toLowerCase().indexOf(q) >= 0 || (c.person || '').toLowerCase().indexOf(q) >= 0,
  );

  return (
    <div
      className={`ov${open ? ' show' : ''}`}
      data-ov="client"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Select client">
        <div className="grab" />
        <div className="shd">
          <div>
            <b>Select client</b>
            <small>Bill-to party for this sheet</small>
          </div>
          <button className="x" aria-label="Close" onClick={onClose}><IconClose /></button>
        </div>
        <input
          className="fld"
          placeholder="Search by name or contact..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="cl-list">
          {list.length ? (
            list.map((c) => {
              const active = selectedId === c.id;
              const initials = c.name
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();
              return (
                <button key={c.id} className={`crow${active ? ' sel' : ''}`} onClick={() => onChoose(c.id)}>
                  <span className="ci">{initials}</span>
                  <span className="ct">
                    <b>{c.name}</b>
                    <small>{[c.person, c.phone].filter(Boolean).join(' · ')}</small>
                  </span>
                  <span className="tick"><IconCheck /></span>
                </button>
              );
            })
          ) : (
            <p className="cmnote">No client matches this search.</p>
          )}
        </div>
        <button className="linkbtn" onClick={onAddNew}>+ Add new client</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Import JSON sheet                                                   */
/* ------------------------------------------------------------------ */

export interface ImportSheetProps {
  open: boolean;
  value: string;
  error: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function ImportSheet({ open, value, error, onValueChange, onSubmit, onClose }: ImportSheetProps) {
  return (
    <div
      className={`ov${open ? ' show' : ''}`}
      data-ov="import"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Import JSON">
        <div className="grab" />
        <div className="shd">
          <div>
            <b>Import JSON</b>
            <small>Replaces current groups and line items</small>
          </div>
          <button className="x" aria-label="Close" onClick={onClose}><IconClose /></button>
        </div>
        <textarea
          className="fld mono"
          rows={7}
          style={{ fontSize: '10.5px' }}
          placeholder={'{"items":[],"groups":[],"title":"Cost & Pricing Sheet"}'}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        />
        <div className={`imperr${error ? ' show' : ''}`}>{error}</div>
        <div className="impnote">Contract keys — items: <code>description</code> <code>sub_description</code> <code>quantity</code> <code>unit</code> <code>unit_price</code> <code>cost_price</code> <code>cp</code> <code>make</code> <code>group_id</code> · groups: <code>id</code> <code>name</code> <code>itemIds</code> · top level: <code>items</code> (required), <code>groups</code>, <code>title</code></div>
        <button className="cta" onClick={onSubmit}>Import &amp; replace</button>
        <button className="linkbtn" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Column settings sheet                                               */
/* ------------------------------------------------------------------ */

/** Label field that commits on blur/Enter, like the prototype's onchange. */
function LabelInput({
  value,
  className,
  ariaLabel,
  onCommit,
}: {
  value: string;
  className?: string;
  ariaLabel: string;
  onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(value);
  }, [value]);
  const commit = () => {
    if (text !== value) onCommit(text);
  };
  return (
    <input
      className={className}
      value={text}
      aria-label={ariaLabel}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
    />
  );
}

export interface ColumnsSheetProps {
  open: boolean;
  columns: CpsColumn[];
  onLabelChange: (key: CpsColumnKey, label: string) => void;
  onToggle: (key: CpsColumnKey) => void;
  onMove: (key: CpsColumnKey, targetIdx: number) => void;
  onRequestReset: () => void;
  onClose: () => void;
}

export function ColumnsSheet({ open, columns, onLabelChange, onToggle, onMove, onRequestReset, onClose }: ColumnsSheetProps) {
  const dragKeyRef = useRef<string | null>(null);
  const desc = columns.find((c) => c.key === 'description');
  const rest = columns.filter((c) => c.key !== 'description');

  return (
    <div
      className={`ov${open ? ' show' : ''}`}
      data-ov="columns"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Column Settings">
        <div className="grab" />
        <div className="shd">
          <div>
            <b>Column Settings</b>
            <small>Row fields, order, and labels</small>
          </div>
          <button className="x" aria-label="Close" onClick={onClose}><IconClose /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
          <div className="cm-sec">Description</div>
          <div className="cm-list">
            <div className="cm-row" data-key="description">
              <LabelInput
                className="cm-desc-in"
                value={desc ? desc.label : ''}
                ariaLabel="Description label"
                onCommit={(v) => onLabelChange('description', v)}
              />
              <span className="cm-badge">Fixed</span>
            </div>
          </div>
          <div className="cm-sec">Columns</div>
          <div className="cm-list">
            {rest.map((c) => {
              const i = columns.findIndex((x) => x.key === c.key);
              const type = CPS_TYPE[c.key] === 'num' ? 'NUM' : 'TEXT';
              return (
                <div className="cm-row" data-key={c.key} key={c.key}
                  onDragOver={(e) => {
                    if (dragKeyRef.current) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const key = e.dataTransfer.getData('text/plain') || dragKeyRef.current;
                    dragKeyRef.current = null;
                    if (!key || key === c.key) return;
                    onMove(key as CpsColumnKey, columns.findIndex((x) => x.key === c.key));
                  }}
                >
                  <div
                    className="cm-grip"
                    draggable
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                    onDragStart={(e) => {
                      dragKeyRef.current = c.key;
                      e.dataTransfer.setData('text/plain', c.key);
                    }}
                  >
                    <IconGrip />
                  </div>
                  <div className="cm-ord">
                    <button
                      title="Move up"
                      aria-label={`Move ${c.label} up`}
                      disabled={i <= 1}
                      onClick={() => onMove(c.key, i - 1)}
                    >
                      <IconUp />
                    </button>
                    <button
                      title="Move down"
                      aria-label={`Move ${c.label} down`}
                      disabled={i >= columns.length - 1}
                      onClick={() => onMove(c.key, i + 1)}
                    >
                      <IconDown />
                    </button>
                  </div>
                  <div className="cm-main">
                    <div className="cm-labrow">
                      <LabelInput className="cm-lab" value={c.label} ariaLabel={`${c.label} label`} onCommit={(v) => onLabelChange(c.key, v)} />
                      <span className="cm-badge">{type}</span>
                    </div>
                  </div>
                  <button
                    className={`cm-sw${c.visible ? ' on' : ''}`}
                    role="switch"
                    aria-checked={c.visible}
                    aria-label={`${c.visible ? 'Hide' : 'Show'} ${c.label}`}
                    onClick={() => onToggle(c.key)}
                  />
                </div>
              );
            })}
          </div>
          <button className="cm-reset" onClick={onRequestReset}>Reset to defaults</button>
        </div>
        <button className="cta" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Instant Markup sheet                                                */
/* ------------------------------------------------------------------ */

interface MkAff {
  row: CpsItemRow;
  prop: number;
  tsp: number;
  delta: number;
  lp: number;
  m: number | null;
  replaces: number;
}

interface MkCompute {
  val: number;
  aff: MkAff[];
  curSell: number;
  newSell: number;
  curP: number;
  newP: number;
}

const MK_HINT_STATIC = 'Cost-plus: SP = CP × (1 + %). Fixed mode adds a flat amount to unit CP.';
const MK_HINT_PCT = 'Cost-plus: SP = CP × (1 + %). Re-applying derives from CP again — never from the current SP.';
const MK_HINT_VAL = 'Fixed: SP = CP + value, applied per item unit. Not a document total, not a distribution, not a direct SP set.';

export interface MarkupSheetProps {
  open: boolean;
  rows: CpsRow[];
  /** Row ids excluded from markup. Defaults to the prototype sample [6, 8]. */
  initialExcluded?: number[];
  /** Fires with the proposed SP writes and the prototype undo summary. */
  onApply: (changes: CpsMarkupChange[], summary: string) => void;
  onClose: () => void;
}

export function MarkupSheet({ open, rows, initialExcluded, onApply, onClose }: MarkupSheetProps) {
  const [mode, setMode] = useState<CpsMarkupMode>('pct');
  const [modeTouched, setModeTouched] = useState(false);
  const [valText, setValText] = useState('20');
  const [view, setView] = useState<'setup' | 'preview'>('setup');
  const [preview, setPreview] = useState<MkCompute | null>(null);
  const [excluded, setExcluded] = useState<Record<number, true>>(() => {
    const init: Record<number, true> = {};
    (initialExcluded ?? [6, 8]).forEach((id) => {
      init[id] = true;
    });
    return init;
  });

  // Prototype openMarkup(): always reopen on the setup view.
  const prevOpen = useRef(open);
  if (prevOpen.current !== open) {
    prevOpen.current = open;
    if (open) {
      setView('setup');
      setPreview(null);
    }
  }

  const eligible = (r: CpsItemRow): boolean => {
    const cp = Number(r.cp);
    return Number.isFinite(cp) && cp > 0;
  };
  const included = (r: CpsItemRow): boolean => eligible(r) && !excluded[r.id];

  const readVal = (): { ok: true; val: number } | { ok: false; msg: string } => {
    const raw = valText.trim().replace(/,/g, '');
    if (raw === '') return { ok: false, msg: 'Enter a markup value to continue.' };
    const v = Number(raw);
    if (!Number.isFinite(v)) return { ok: false, msg: 'That value is not a number. Enter 0 or more.' };
    if (v < 0) return { ok: false, msg: 'Negative markup is not allowed. Markup adds to cost — it never discounts.' };
    return { ok: true, val: v };
  };
  const parsed = readVal();
  const errMsg = parsed.ok === false ? parsed.msg : '';

  const proposed = (r: CpsItemRow, m: CpsMarkupMode, val: number): number => {
    const cp = Number(r.cp) || 0;
    const raw = m === 'pct' ? cp * (1 + val / 100) : cp + val;
    return Math.round(raw * 100) / 100;
  };

  const compute = (): MkCompute | null => {
    const p = readVal();
    if (!p.ok) return null;
    const val = p.val;
    const aff: MkAff[] = [];
    let curSell = 0;
    let newSell = 0;
    let curP = 0;
    let newP = 0;
    rows.forEach((r) => {
      if (!isItemRow(r)) return;
      const qty = Number(r.qty || 0);
      const cp = Number(r.cp || 0);
      const sp = Number(r.sp || 0);
      curSell += sp * qty;
      curP += (sp - cp) * qty;
      if (!included(r)) {
        newSell += sp * qty;
        newP += (sp - cp) * qty;
        return;
      }
      const prop = proposed(r, mode, val);
      const tsp = prop * qty;
      const tcp = cp * qty;
      const lp = tsp - tcp;
      const m = tsp ? (lp / tsp) * 100 : null;
      aff.push({ row: r, prop, tsp, delta: prop - sp, lp, m, replaces: sp });
      newSell += tsp;
      newP += lp;
    });
    return { val, aff, curSell, newSell, curP, newP };
  };

  const setAllIncluded = (on: boolean) => {
    setExcluded((prev) => {
      const next: Record<number, true> = { ...prev };
      rows.forEach((r) => {
        if (isItemRow(r) && eligible(r)) {
          if (on) delete next[r.id];
          else next[r.id] = true;
        }
      });
      return next;
    });
  };

  const toggleIncluded = (id: number) => {
    const r = rows.find((x) => x.id === id);
    if (!r || !isItemRow(r) || !eligible(r)) return;
    setExcluded((prev) => {
      const next: Record<number, true> = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const runPreview = () => {
    const c = compute();
    if (!c) return;
    setPreview(c);
    setView('preview');
  };

  const runApply = () => {
    const c = compute();
    if (!c || !c.aff.length) return;
    const changes: CpsMarkupChange[] = c.aff.map((a) => ({ id: a.row.id, sp: a.prop }));
    const unit = mode === 'pct' ? `${c.val}%` : `${naira0(c.val)} /unit`;
    onApply(changes, `${c.aff.length} rows (${unit})`);
  };

  /* --- prototype renderMkList() walk --- */
  const listNodes: ReactNode[] = [];
  let lastG = -1;
  let capSeq = 0;
  let affCount = 0;
  rows.forEach((r) => {
    if (r.type === 'group') {
      listNodes.push(<div className="mk-gcap" key={`cap-${capSeq++}`}>{r.title} — headers never participate</div>);
      lastG = r.id;
      return;
    }
    if (r.type !== 'item') return;
    if (r.gid == null && lastG !== 0) {
      listNodes.push(<div className="mk-gcap" key={`cap-${capSeq++}`}>Ungrouped rows</div>);
      lastG = 0;
    }
    const elig = eligible(r);
    const inc = included(r);
    if (inc) affCount++;
    const cls = elig ? (inc ? 'mk-row' : 'mk-row out') : 'mk-row nope';
    listNodes.push(
      <div className={cls} key={`row-${r.id}`}>
        <span className="mk-dot" />
        <span className="t">
          <b>{r.desc || '(untitled row)'}</b>
          {elig ? (
            <small>
              CP {naira0(Number(r.cp))} · SP now {naira0(Number(r.sp || 0))}
              {inc ? '' : ' · excluded, untouched'}
            </small>
          ) : (
            <small className="bad">Excluded — No cost price</small>
          )}
        </span>
        {elig ? (
          <button
            className={`mk-tog${inc ? ' on' : ''}`}
            aria-pressed={inc}
            onClick={() => toggleIncluded(r.id)}
          >
            {inc ? 'Included' : 'Excluded'}
          </button>
        ) : (
          <button className="mk-tog" disabled>No CP</button>
        )}
      </div>,
    );
  });
  const listContent: ReactNode = listNodes.length ? listNodes : <div className="mk-gcap">No rows yet.</div>;

  const hint = !modeTouched ? MK_HINT_STATIC : mode === 'pct' ? MK_HINT_PCT : MK_HINT_VAL;
  const valLabel = mode === 'pct' ? 'Markup percentage (%)' : 'Markup value per unit (₦)';

  return (
    <div
      className={`ov${open ? ' show' : ''}`}
      data-ov="markup"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Instant Markup">
        <div className="grab" />
        <div className="shd">
          <div>
            <b>Instant Markup</b>
            <small>Derive SP from CP · preview before apply</small>
          </div>
          <button className="x" aria-label="Close" onClick={onClose}><IconClose /></button>
        </div>

        <div style={{ display: view === 'setup' ? undefined : 'none' }}>
          <div className="mk-seg" role="group" aria-label="Markup mode">
            <button
              className={mode === 'pct' ? 'on' : undefined}
              onClick={() => {
                setMode('pct');
                setModeTouched(true);
              }}
            >
              <IconMarkup strokeWidth={2.4} />
              Percentage
            </button>
            <button
              className={mode === 'val' ? 'on' : undefined}
              onClick={() => {
                setMode('val');
                setModeTouched(true);
              }}
            >
              <IconNaira strokeWidth={2.4} />
              Fixed value
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="lb" htmlFor="mkVal" id="mkValLabel">{valLabel}</label>
            <div className="mk-valrow">
              <input
                className="fld mono"
                id="mkVal"
                inputMode="decimal"
                placeholder="e.g. 20"
                value={valText}
                onChange={(e) => setValText(e.target.value)}
              />
            </div>
          </div>
          <div className={`mk-err${errMsg ? ' show' : ''}`}>{errMsg}</div>
          <div className="impnote" id="mkHint" style={{ marginTop: 10 }}>{hint}</div>
          <div className="mk-tools" style={{ marginTop: 6 }}>
            <button className="linkbtn" onClick={() => setAllIncluded(true)}>Include all</button>
            <button className="linkbtn" onClick={() => setAllIncluded(false)}>Exclude all</button>
            <span className="cnt">{affCount} included</span>
          </div>
          <div className="mk-list" style={{ marginTop: 6 }}>{listContent}</div>
          <button className="cta" id="mkPreviewBtn" style={{ marginTop: 10 }} disabled={!!errMsg} onClick={runPreview}>
            Preview changes
          </button>
          <button className="linkbtn" onClick={onClose}>Cancel</button>
        </div>

        <div style={{ display: view === 'preview' ? undefined : 'none' }}>
          <div className="mk-agg">
            <div className="mk-cell">
              <small>Affected items</small>
              <b>{preview ? preview.aff.length : 0}</b>
            </div>
            <div className="mk-cell">
              <small>Selling total</small>
              <b>
                {naira0(preview ? preview.curSell : 0)} → <span className="up">{naira0(preview ? preview.newSell : 0)}</span>
              </b>
            </div>
            <div className="mk-cell">
              <small>Gross profit</small>
              <b>
                {naira0(preview ? preview.curP : 0)} → <span className="up">{naira0(preview ? preview.newP : 0)}</span>
              </b>
            </div>
            <div className="mk-cell">
              <small>Aggregate change</small>
              <b className="up">
                +{naira0(preview ? preview.newSell - preview.curSell : 0)} sell · +
                {naira0(preview ? preview.newP - preview.curP : 0)} profit
              </b>
            </div>
          </div>
          <div className="mk-prev" style={{ marginTop: 10 }}>
            {preview && preview.aff.length ? (
              preview.aff.map((a) => (
                <div className="mk-prow" key={a.row.id}>
                  <div className="d">{a.row.desc || '(untitled row)'}</div>
                  <div className="ln">
                    <span>CP {naira0(Number(a.row.cp))}</span>
                    <span>
                      {naira0(a.replaces)} → <span className="new">{naira0(a.prop)}</span>
                    </span>
                  </div>
                  <div className="ln">
                    <span>TSP <b>{naira0(a.tsp)}</b></span>
                    <span>
                      profit <b>{naira0(a.lp)}</b> · margin {a.m === null ? '—' : a.m.toFixed(1) + '%'}
                    </span>
                  </div>
                  <div className="ln">
                    <span>Δ {a.delta >= 0 ? '+' : '−'}{naira0(Math.abs(a.delta))} /unit</span>
                    <span>
                      {Number(a.replaces) > 0 ? (
                        <span className="rep">replaces {naira0(a.replaces)}</span>
                      ) : (
                        <span className="rep">no meaningful SP yet</span>
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="mk-prow">
                <div className="d">No included rows with a cost price. Nothing would change.</div>
              </div>
            )}
          </div>
          <div className="mk-note" style={{ marginTop: 10 }}>
            Apply writes the proposed SP onto included rows only. Excluded rows, CP, quantities, groups, and specs stay untouched. Production Apply emits an audit UPDATE with mode, value, row ids, and before/after SP sets.
          </div>
          <button
            className="cta"
            id="mkApplyBtn"
            style={{ marginTop: 10 }}
            disabled={!preview || !preview.aff.length}
            onClick={runApply}
          >
            Apply to form
          </button>
          <button className="linkbtn" onClick={() => setView('setup')}>Back</button>
        </div>
      </div>
    </div>
  );
}
