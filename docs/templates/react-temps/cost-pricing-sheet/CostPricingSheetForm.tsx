/*
 * BIGDROPS - Cost & Pricing Sheet - mobile/fold form template.
 * Converted 1:1 from cost-price-sheet-form-candidate-v1-mobile-fold.html
 * (design-direction prototype). This is a fidelity conversion:
 * layout, spacing, typography, controls, field order, group/row
 * presentation, CP/SP, TCP/TSP/Profit, sub-descriptions, toolbar,
 * header, and responsive behavior match the source.
 *
 * Application logic (save/persistence, JSON import, client picker
 * backend, photo upload, routing) is exposed through typed callback
 * props on CostPricingSheetFormProps. Prototype-only demo behaviors
 * (toasts, badge flip) run when a callback is absent.
 *
 * PROTOTYPE MATH NOTE: row and total displays use float math rounded
 * to 2dp, exactly like the source. Production MUST use the
 * authoritative Decimal path before ship.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import './cost-pricing-sheet-form.css';
import {
  CPS_LABELS,
  SAMPLE_CLIENTS,
  SAMPLE_DOCUMENT,
  SAMPLE_MARKUP_EXCLUDED,
  SAMPLE_ROWS,
  fmtMoney,
  fmtQty,
  isItemRow,
  layoutBreakpoint,
  makeBlankRow,
  marginOf,
  membersOf,
  naira,
  profitOf,
  resolveCpsColumns,
  sanitizeRows,
  siblingsOf,
  tcpOf,
  tspOf,
  words,
  type CpsClient,
  type CpsColumn,
  type CpsColumnKey,
  type CpsDocumentFields,
  type CpsGroupRow,
  type CpsItemRow,
  type CpsRow,
  type CpsSavePayload,
  type CpsSheetId,
  type CostPricingSheetFormProps,
} from './cost-pricing-sheet-shared';
import {
  IconCamera,
  IconChevronDown,
  IconChevronDownSmall,
  IconChevronLeft,
  IconColumns,
  IconClose,
  IconCopy,
  IconDown,
  IconImport,
  IconMarkup,
  IconMoon,
  IconNote,
  IconPlus,
  IconSave,
  IconSun,
  IconTrash,
  IconUp,
  IconUser,
  IconMoneyIn,
  IconMoneyOut,
} from './CostPricingSheetIcons';
import {
  ClientSheet,
  ColumnsSheet,
  ConfirmDialog,
  ImportSheet,
  MarkupSheet,
  ToastView,
} from './CostPricingSheetOverlays';

/* ------------------------------------------------------------------ */
/* Numeric input with the prototype's live reformat + caret restore    */
/* ------------------------------------------------------------------ */

interface NumFieldProps {
  value: number;
  onCommit: (value: number) => void;
  format: (value: number) => string;
  className?: string;
  inputMode?: 'decimal' | 'text';
  placeholder?: string;
}

function NumField({ value, onCommit, format, className, inputMode = 'decimal', placeholder }: NumFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => format(value));
  const pendingSel = useRef<number | null>(null);
  const formatRef = useRef(format);
  useEffect(() => {
    formatRef.current = format;
  });
  // Sync from state while the field is not being edited.
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el) setText(formatRef.current(value));
  }, [value]);
  useLayoutEffect(() => {
    if (pendingSel.current != null && ref.current) {
      const pos = pendingSel.current;
      pendingSel.current = null;
      try {
        ref.current.setSelectionRange(pos, pos);
      } catch {
        /* selection unsupported for this input type */
      }
    }
  });

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const raw = el.value.replace(/,/g, '');
    const n = Number(raw);
    const next = Number.isFinite(n) ? n : 0;
    onCommit(next);
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const hadSel = start !== el.value.length || end !== el.value.length;
    const inProgress = raw === '' || raw === '.' || /\.$/.test(raw);
    const digitsBefore = el.value.slice(0, start).replace(/[^0-9]/g, '').length;
    const formatted = inProgress ? raw : formatRef.current(next);
    setText(formatted);
    if (hadSel) {
      let pos = 0;
      let seen = 0;
      while (pos < formatted.length && seen < digitsBefore) {
        if (/[0-9]/.test(formatted[pos])) seen++;
        pos++;
      }
      pendingSel.current = pos;
    }
  };

  return (
    <input
      ref={ref}
      className={className}
      inputMode={inputMode}
      placeholder={placeholder}
      value={text}
      onChange={handleInput}
      onBlur={() => setText(formatRef.current(value))}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Row presentation                                                    */
/* ------------------------------------------------------------------ */

interface ItemRowProps {
  row: CpsItemRow;
  num: number;
  upDisabled: boolean;
  downDisabled: boolean;
  isError: boolean;
  showMake: boolean;
  showCp: boolean;
  showSp: boolean;
  onDesc: (value: string) => void;
  onUnit: (value: string) => void;
  onMake: (value: string) => void;
  onQty: (value: number) => void;
  onCp: (value: number) => void;
  onSp: (value: number) => void;
  onSubInput: (value: string) => void;
  onSubBlur: (value: string) => void;
  onToggleSub: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onInsertBelow: () => void;
  onAttachPhoto: () => void;
  onRemovePhoto: () => void;
}

function ItemRow(props: ItemRowProps) {
  const { row, num } = props;
  const hasSub = !!(row.sub && row.sub.trim());
  const tcp = tcpOf(row);
  const tsp = tspOf(row);
  const profit = profitOf(row);
  const margin = marginOf(row);
  const pfCls = `fcell pf ${profit > 0 ? 'pos' : profit === 0 ? '' : 'neg'}`;

  return (
    <article className={`item${props.isError ? ' err' : ''}${row.image ? ' has-photo' : ''}`} data-id={row.id}>
      <button className="ear" title="Remove item" aria-label="Remove item" onClick={props.onRemove}>
        <IconClose strokeWidth={2.8} />
      </button>

      <div className="ihead">
        <div className="rail">
          <span className="idx">{String(num).padStart(2, '0')}</span>
          <div className="rmid">
            <button
              className="rbtn"
              title="Move up"
              aria-label="Move up"
              disabled={props.upDisabled}
              onClick={() => props.onMove(-1)}
            >
              <IconUp />
            </button>
            <button
              className="rbtn"
              title="Move down"
              aria-label="Move down"
              disabled={props.downDisabled}
              onClick={() => props.onMove(1)}
            >
              <IconDown />
            </button>
          </div>
          <button className="rbtn" title="Duplicate item" aria-label="Duplicate item" onClick={props.onDuplicate}>
            <IconCopy />
          </button>
        </div>

        <div className="idesc">
          <textarea
            className="fld desc"
            rows={2}
            placeholder="Item description *"
            value={row.desc}
            onChange={(e) => props.onDesc(e.target.value)}
          />
          <div className={`subrow${hasSub ? ' has' : ''}${row.subOpen ? ' open' : ''}`} data-sub={row.id}>
            <button
              className={`subtog${hasSub ? '' : ' sub-add'}`}
              aria-expanded={row.subOpen}
              onClick={props.onToggleSub}
            >
              <span className="stog-icon">{hasSub ? <IconNote /> : <IconPlus />}</span>
              {hasSub ? (
                <span className="stog-label">
                  <span className="sub-prev-text">{row.sub.trim()}</span>
                </span>
              ) : (
                <span className="stog-label">Add sub description</span>
              )}
              <span className="stog-chev"><IconChevronDown /></span>
            </button>
            {row.subOpen ? (
              <textarea
                className="fld subfield"
                rows={2}
                autoFocus
                placeholder="Sub description — extra detail under the main description..."
                value={row.sub}
                onChange={(e) => props.onSubInput(e.target.value)}
                onBlur={(e) => props.onSubBlur(e.target.value)}
              />
            ) : null}
          </div>
          {props.showMake ? (
            <input
              className="fld"
              placeholder="Make / brand"
              value={row.make}
              onChange={(e) => props.onMake(e.target.value)}
            />
          ) : null}
          {row.image ? (
            <span className="foldthumb">
              <img src={row.image} alt="Item photo" />
              <button
                type="button"
                className="px"
                title="Remove photo"
                aria-label="Remove photo"
                onClick={props.onRemovePhoto}
              >
                <IconClose strokeWidth={2.8} />
              </button>
            </span>
          ) : (
            <button type="button" className="cam" title="Attach a photo" aria-label="Attach a photo" onClick={props.onAttachPhoto}>
              <IconCamera />
              Photo
            </button>
          )}
        </div>
      </div>

      <div className="idata">
        <div className="meta-stack">
          <div className="fgrid">
            <NumField
              className="fld mono"
              placeholder="Qty *"
              value={row.qty}
              format={fmtQty}
              onCommit={props.onQty}
            />
            <input
              className="fld"
              placeholder="Unit"
              value={row.unit}
              onChange={(e) => props.onUnit(e.target.value)}
            />
          </div>
        </div>

        {props.showCp || props.showSp ? (
          <div className="comm-grid">
            {props.showCp ? (
              <label className="cfield cost">
                <span className="cf-lab">
                  <IconMoneyOut />
                  CP
                  <span className="cf-hint">money out</span>
                </span>
                <NumField className="fld mono" value={row.cp} format={fmtMoney} onCommit={props.onCp} />
              </label>
            ) : null}
            {props.showSp ? (
              <label className="cfield sell">
                <span className="cf-lab">
                  <IconMoneyIn />
                  SP
                  <span className="cf-hint">money in</span>
                </span>
                <NumField className="fld mono" value={row.sp} format={fmtMoney} onCommit={props.onSp} />
              </label>
            ) : null}
          </div>
        ) : null}

        {row.image ? (
          <span className="thumb">
            <img src={row.image} alt="Item photo" />
            <button
              type="button"
              className="px"
              title="Remove photo"
              aria-label="Remove photo"
              onClick={props.onRemovePhoto}
            >
              <IconClose strokeWidth={2.8} />
            </button>
          </span>
        ) : null}

        <div className="fin3" data-fin={row.id}>
          <div className="fcell tcp">
            <small>Total cost · TCP</small>
            <b>{naira(tcp)}</b>
          </div>
          <div className="fcell tsp">
            <small>Total selling · TSP</small>
            <b>{naira(tsp)}</b>
          </div>
          <div className={pfCls}>
            <small>Profit</small>
            <b>{naira(profit)}</b>
          </div>
        </div>
        <div className="finm" data-finm={row.id}>
          Margin {margin === null ? '—' : margin.toFixed(1) + '%'} on TSP · {row.qty} × {naira(Number(row.sp || 0) - Number(row.cp || 0))} /unit
        </div>
      </div>

      <button className="ins" onClick={props.onInsertBelow}>+ Insert below</button>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Group presentation                                                  */
/* ------------------------------------------------------------------ */

interface GroupBlockProps {
  group: CpsGroupRow;
  members: CpsItemRow[];
  renderItem: (row: CpsItemRow) => ReactNode;
  onTitleChange: (value: string) => void;
  onRemove: () => void;
  onAddItem: () => void;
}

function GroupBlock({ group, members, renderItem, onTitleChange, onRemove, onAddItem }: GroupBlockProps) {
  const label = members.length + ' item' + (members.length === 1 ? '' : 's');
  return (
    <section className="gwrap" data-gwrap={group.id}>
      <header className="ghdr">
        <button className="gbtn danger" title="Remove group (items are kept)" aria-label="Remove group" onClick={onRemove}>
          <IconClose strokeWidth={2.8} />
        </button>
        <input
          className="gtitle"
          value={group.title}
          placeholder="Group title"
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <span className="gcount">{label}</span>
      </header>
      <div className="gbody">
        {members.length ? (
          members.map((m) => renderItem(m))
        ) : (
          <div className="gempty">
            No items in this group yet.
            <br />
            Use the button below to add the first one.
          </div>
        )}
      </div>
      <div className="gfoot">
        <button className="gadd" onClick={onAddItem}>
          <IconPlus /> Add item to this group
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section head                                                        */
/* ------------------------------------------------------------------ */

function SectionHead({ no, title, meta }: { no: string; title: string; meta?: ReactNode }) {
  return (
    <div className="sec-head">
      <span className="secno">{no}</span>
      <h2>{title}</h2>
      <span className="rule" />
      {meta != null ? <span className="meta">{meta}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main form                                                           */
/* ------------------------------------------------------------------ */

export function CostPricingSheetForm({
  title = 'Cost & Pricing Sheet',
  modeLabel,
  theme: controlledTheme,
  defaultTheme = 'light',
  onToggleTheme,
  onBack,
  onSave,
  initialDocument,
  initialRows,
  clients = SAMPLE_CLIENTS,
  initialClient,
  onClientChange,
  onAddNewClient,
  initialColumns,
  onColumnsChange,
  onImport,
  onRequestPhoto,
  initialMarkupExcluded,
}: CostPricingSheetFormProps) {
  /* --- document state ------------------------------------------- */
  const [rowsRaw, setRowsRaw] = useState<CpsRow[]>(() => sanitizeRows(initialRows ?? SAMPLE_ROWS));
  const setRows = useCallback((next: CpsRow[] | ((prev: CpsRow[]) => CpsRow[])) => {
    setRowsRaw((prev) => sanitizeRows(typeof next === 'function' ? next(prev) : next));
  }, []);
  const seqRef = useRef<number>(Math.max(100, ...(initialRows ?? SAMPLE_ROWS).map((r) => r.id)));

  const [doc, setDoc] = useState<CpsDocumentFields>(() => ({ ...SAMPLE_DOCUMENT, ...initialDocument }));
  const setDocField = <K extends keyof CpsDocumentFields>(key: K, value: CpsDocumentFields[K]) =>
    setDoc((prev) => ({ ...prev, [key]: value }));

  const [columns, setColumns] = useState<CpsColumn[]>(() => resolveCpsColumns(initialColumns ?? null));
  const [client, setClient] = useState<CpsClient | null>(() =>
    propsInitialClient(initialClient, clients),
  );

  /* --- chrome state --------------------------------------------- */
  const [badge, setBadge] = useState('Draft');
  const [errId, setErrId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; isErr: boolean } | null>(null);
  const [openIds, setOpenIds] = useState<CpsSheetId[]>([]);
  const [undo, setUndo] = useState<{ label: string; snap: Record<number, number> } | null>(null);
  const [bp, setBp] = useState<'Phone' | 'Large phone' | 'Fold'>(() => layoutBreakpoint());
  const [internalTheme, setInternalTheme] = useState<'light' | 'dark'>(defaultTheme);
  const [themeIcon, setThemeIcon] = useState<'sun' | 'moon'>('sun');
  const [impText, setImpText] = useState('');
  const [impErr, setImpErr] = useState('');
  const [pendingScroll, setPendingScroll] = useState<{ id: number; key: number } | null>(null);

  const theme = controlledTheme ?? internalTheme;
  const badgeText = modeLabel ?? badge;

  /* --- refs and timers ------------------------------------------ */
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef<CpsSheetId[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollKeyRef = useRef(0);

  const showToast = useCallback((msg: string, isErr = false) => {
    setToast({ msg, isErr });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (errTimer.current) clearTimeout(errTimer.current);
    },
    [],
  );

  /* --- theme ----------------------------------------------------- */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const wasDark = theme === 'dark';
    const next = wasDark ? 'light' : 'dark';
    setInternalTheme(next);
    setThemeIcon(wasDark ? 'moon' : 'sun');
    onToggleTheme?.(next);
  };

  /* --- layout chip ------------------------------------------------ */
  useEffect(() => {
    const onResize = () => setBp(layoutBreakpoint());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* --- sheet open/close + focus management (prototype openSheet) --- */
  const openSheet = useCallback((id: CpsSheetId) => {
    if (id === 'import') setImpErr('');
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.focus === 'function' && !(active.closest && active.closest('.ov'))) {
      focusReturnRef.current = active;
    }
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const closeSheet = useCallback((id: CpsSheetId) => {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev));
  }, []);

  useLayoutEffect(() => {
    const prev = prevOpenRef.current;
    const added = openIds.filter((id) => !prev.includes(id));
    const removed = prev.filter((id) => !openIds.includes(id));
    prevOpenRef.current = openIds;
    added.forEach((id) => {
      const root = document.querySelector(`[data-ov="${id}"]`);
      const first = root
        ? root.querySelector('input, textarea, button:not(.x):not(.linkbtn)')
        : null;
      if (first instanceof HTMLElement) first.focus();
    });
    if (removed.length && focusReturnRef.current && document.contains(focusReturnRef.current)) {
      focusReturnRef.current.focus();
    }
  }, [openIds]);

  useEffect(() => {
    if (!openIds.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpenIds([]);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openIds.length]);

  /* --- row operations (prototype ports) --------------------------- */
  const editItem = <K extends keyof CpsItemRow>(id: number, key: K, value: CpsItemRow[K]) => {
    setRows((prev) => prev.map((r) => (isItemRow(r) && r.id === id ? { ...r, [key]: value } : r)));
  };

  const editGroupTitle = (id: number, value: string) => {
    setRows((prev) => prev.map((r) => (r.type === 'group' && r.id === id ? { ...r, title: value } : r)));
  };

  const collapseSubIfEmpty = (id: number, value: string) => {
    if (value && value.trim()) return;
    const r = rowsRaw.find((x) => x.id === id);
    if (!r || !isItemRow(r) || r.subOpen !== true) return;
    setRows((prev) => prev.map((x) => (isItemRow(x) && x.id === id ? { ...x, sub: '', subOpen: false } : x)));
  };

  const toggleSub = (id: number) => {
    setRows((prev) => prev.map((r) => (isItemRow(r) && r.id === id ? { ...r, subOpen: !r.subOpen } : r)));
  };

  const moveRow = (id: number, dir: -1 | 1) => {
    const r = rowsRaw.find((x) => x.id === id);
    if (!r || !isItemRow(r)) return;
    const sib = siblingsOf(rowsRaw, r);
    const k = sib.findIndex((x) => x.id === r.id);
    const target = sib[k + dir];
    if (!target) return;
    const next = rowsRaw.slice();
    next.splice(
      next.findIndex((x) => x.id === r.id),
      1,
    );
    const t = next.findIndex((x) => x.id === target.id);
    next.splice(dir > 0 ? t + 1 : t, 0, r);
    setRows(next);
  };

  const dupRow = (id: number) => {
    const i = rowsRaw.findIndex((x) => x.id === id);
    if (i < 0) return;
    const src = rowsRaw[i];
    if (!isItemRow(src)) return;
    seqRef.current += 1;
    const copy: CpsItemRow = { ...src, id: seqRef.current, desc: (src.desc || '') + ' (copy)', subOpen: false };
    const next = rowsRaw.slice();
    next.splice(i + 1, 0, copy);
    setRows(next);
    showToast('Item duplicated');
  };

  const insertBelow = (id: number) => {
    const i = rowsRaw.findIndex((x) => x.id === id);
    if (i < 0) return;
    const src = rowsRaw[i];
    seqRef.current += 1;
    const row = makeBlankRow(seqRef.current, isItemRow(src) ? src.gid : null);
    const next = rowsRaw.slice();
    next.splice(i + 1, 0, row);
    setRows(next);
    showToast('Row inserted');
    scrollKeyRef.current += 1;
    setPendingScroll({ id: row.id, key: scrollKeyRef.current });
  };

  const addItem = () => {
    seqRef.current += 1;
    const row = makeBlankRow(seqRef.current, null);
    setRows((prev) => [...prev, row]);
    showToast('Line item added');
  };

  const addItemTo = (gid: number) => {
    const mem = membersOf(rowsRaw, gid);
    const last = mem[mem.length - 1];
    let at = last
      ? rowsRaw.findIndex((x) => x.id === last.id) + 1
      : rowsRaw.findIndex((x) => x.type === 'group' && x.id === gid) + 1;
    if (at < 0) at = rowsRaw.length;
    seqRef.current += 1;
    const row = makeBlankRow(seqRef.current, gid);
    const next = rowsRaw.slice();
    next.splice(at, 0, row);
    setRows(next);
    showToast('Item added to group');
  };

  const addGroup = () => {
    seqRef.current += 1;
    const row: CpsGroupRow = { id: seqRef.current, type: 'group', title: 'New Group' };
    setRows((prev) => [...prev, row]);
    showToast('Group added');
  };

  const removeRow = (id: number) => {
    const r = rowsRaw.find((x) => x.id === id);
    if (!r) return;
    if (r.type === 'group') {
      setRows((prev) =>
        prev
          .map((x) => (x.type === 'item' && x.gid === id ? { ...x, gid: null } : x))
          .filter((x) => x.id !== id),
      );
      showToast('Group removed — its items kept');
    } else {
      setRows((prev) => prev.filter((x) => x.id !== id));
      showToast((r.desc && r.desc.trim()) || Number(r.sp) > 0 ? 'Row deleted' : 'Row removed');
    }
  };

  const doClearAll = () => {
    setRows([]);
    closeSheet('clear');
    showToast('All rows cleared');
  };

  /* --- photo ------------------------------------------------------- */
  const attachPhoto = (id: number) => {
    if (!onRequestPhoto) return;
    void Promise.resolve(onRequestPhoto(id)).then((url) => {
      if (url) {
        editItem(id, 'image', url);
        showToast('Photo attached');
      }
    });
  };

  /* --- client picker ------------------------------------------------ */
  const chooseClient = (id: string) => {
    const c = clients.find((x) => x.id === id) ?? null;
    setClient(c);
    closeSheet('client');
    if (c) showToast('Client set to ' + c.name);
    onClientChange?.(c);
  };

  const clearClient = () => {
    setClient(null);
    showToast('Client cleared');
    onClientChange?.(null);
  };

  const addNewClient = () => {
    if (onAddNewClient) onAddNewClient();
    else showToast('New-client form opens in the live app');
  };

  /* --- columns ------------------------------------------------------ */
  const commitColumns = (next: CpsColumn[]) => {
    setColumns(next);
    onColumnsChange?.(next);
  };

  const toggleColumn = (key: CpsColumnKey) => {
    const c = columns.find((x) => x.key === key);
    if (!c || key === 'description') return;
    commitColumns(columns.map((x) => (x.key === key ? { ...x, visible: !x.visible } : x)));
    showToast(c.label + (c.visible ? ' shown on rows' : ' hidden from rows'));
  };

  const changeColumnLabel = (key: CpsColumnKey, label: string) => {
    const v = String(label || '').trim();
    commitColumns(columns.map((x) => (x.key === key ? { ...x, label: v || CPS_LABELS[key] } : x)));
  };

  // Port of cmMove() from the prototype.
  const moveColumn = (key: CpsColumnKey, targetIdx: number) => {
    if (key === 'description') return;
    const from = columns.findIndex((c) => c.key === key);
    if (from < 0 || targetIdx === from) return;
    if (targetIdx < 0 || targetIdx >= columns.length) return;
    const next = columns.slice();
    const moved = next.splice(from, 1)[0];
    next.splice(Math.max(1, targetIdx), 0, moved);
    commitColumns(next);
  };

  const resetColumns = () => {
    commitColumns(resolveCpsColumns(null));
    closeSheet('colreset');
    showToast('Columns reset to defaults');
  };

  /* --- import ------------------------------------------------------- */
  const doImport = () => {
    const raw = impText.trim();
    if (!raw) {
      setImpErr('Paste JSON first.');
      return;
    }
    if (!onImport) return;
    const res = onImport(raw);
    if (res.ok === false) {
      setImpErr(res.error);
      showToast('Import failed — see errors', true);
      return;
    }
    setRows(res.rows);
    if (typeof res.title === 'string' && res.title.trim()) setDocField('title', res.title);
    closeSheet('import');
    const nItems = res.rows.filter((r) => r.type === 'item').length;
    const nGroups = res.rows.filter((r) => r.type === 'group').length;
    showToast(`Imported ${nItems} items · ${nGroups} groups`);
  };

  /* --- markup ------------------------------------------------------- */
  const openMarkup = () => {
    setUndo(null);
    openSheet('markup');
  };

  const handleMarkupApply = (changes: { id: number; sp: number }[], summary: string) => {
    const snap: Record<number, number> = {};
    changes.forEach((ch) => {
      const r = rowsRaw.find((x) => x.id === ch.id);
      if (r && isItemRow(r)) snap[ch.id] = Number(r.sp || 0);
    });
    setRows((prev) =>
      prev.map((r) => {
        const ch = changes.find((c) => c.id === r.id);
        return ch && isItemRow(r) ? { ...r, sp: ch.sp } : r;
      }),
    );
    closeSheet('markup');
    setUndo({
      label: `Markup applied to ${summary}. SP values materialized; CP, quantities, and groups untouched.`,
      snap,
    });
    showToast(`Markup applied to ${changes.length} rows — totals recomputed`);
  };

  const undoMarkup = () => {
    if (!undo) return;
    setRows((prev) =>
      prev.map((r) => {
        const s = undo.snap[r.id];
        return isItemRow(r) && s !== undefined ? { ...r, sp: s } : r;
      }),
    );
    setUndo(null);
    showToast('Markup undone — previous SP values restored');
  };

  /* --- save (prototype validation, host persistence) --------------- */
  const save = () => {
    if (!doc.sheetNumber.trim()) {
      showToast('Save blocked: sheet number is required', true);
      return;
    }
    if (!client) {
      showToast('Save blocked: pick a client before saving', true);
      openSheet('client');
      return;
    }
    const bad = rowsRaw.find(
      (r) => isItemRow(r) && (!r.desc.trim() || Number(r.qty) <= 0 || Number(r.sp) <= 0),
    );
    if (bad) {
      setErrId(bad.id);
      showToast('Save blocked: an item is missing a description, qty, or SP', true);
      scrollKeyRef.current += 1;
      setPendingScroll({ id: bad.id, key: scrollKeyRef.current });
      if (errTimer.current) clearTimeout(errTimer.current);
      errTimer.current = setTimeout(() => setErrId(null), 2600);
      return;
    }
    setBadge('Saved');
    showToast('Cost & Pricing Sheet saved');
    const payload: CpsSavePayload = { ...doc, client, rows: rowsRaw, columns };
    onSave?.(payload);
  };

  const handleBack = () => {
    if (onBack) onBack();
    else showToast('Back to sheets');
  };

  /* --- scroll targets ---------------------------------------------- */
  useEffect(() => {
    if (!pendingScroll) return;
    const el = document.querySelector(`[data-id="${pendingScroll.id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setPendingScroll(null);
  }, [pendingScroll, rowsRaw]);

  /* --- derived display data ----------------------------------------- */
  const vis = (k: CpsColumnKey): boolean => {
    const c = columns.find((x) => x.key === k);
    return !c || c.visible;
  };

  const totals = useMemo(() => {
    let cost = 0;
    let sell = 0;
    rowsRaw.forEach((r) => {
      if (isItemRow(r)) {
        cost += tcpOf(r);
        sell += tspOf(r);
      }
    });
    const profit = sell - cost;
    return {
      cost,
      sell,
      profit,
      tone: profit > 0 ? 'pos' : profit === 0 ? 'zero' : 'neg',
      margin: sell ? Math.round((profit / sell) * 100) + '%' : '0%',
      words: words(sell),
    };
  }, [rowsRaw]);

  const nItems = rowsRaw.filter((r) => r.type === 'item').length;
  const nGroups = rowsRaw.filter((r) => r.type === 'group').length;
  const countLabel = `${nItems} items · ${nGroups} groups`;

  const nums: Record<number, number> = {};
  let numSeq = 0;
  rowsRaw.forEach((r) => {
    if (r.type === 'group') membersOf(rowsRaw, r.id).forEach((m) => { nums[m.id] = ++numSeq; });
    else if (r.gid == null) nums[r.id] = ++numSeq;
  });

  const itemNode = (r: CpsItemRow, sib: CpsRow[]): ReactNode => {
    const k = sib.findIndex((x) => x.id === r.id);
    return (
      <ItemRow
        key={r.id}
        row={r}
        num={nums[r.id] || 0}
        upDisabled={k <= 0}
        downDisabled={k >= sib.length - 1}
        isError={errId === r.id}
        showMake={vis('make')}
        showCp={vis('cp')}
        showSp={vis('sp')}
        onDesc={(v) => editItem(r.id, 'desc', v)}
        onUnit={(v) => editItem(r.id, 'unit', v)}
        onMake={(v) => editItem(r.id, 'make', v)}
        onQty={(v) => editItem(r.id, 'qty', v)}
        onCp={(v) => editItem(r.id, 'cp', v)}
        onSp={(v) => editItem(r.id, 'sp', v)}
        onSubInput={(v) => editItem(r.id, 'sub', v)}
        onSubBlur={(v) => collapseSubIfEmpty(r.id, v)}
        onToggleSub={() => toggleSub(r.id)}
        onMove={(dir) => moveRow(r.id, dir)}
        onDuplicate={() => dupRow(r.id)}
        onRemove={() => removeRow(r.id)}
        onInsertBelow={() => insertBelow(r.id)}
        onAttachPhoto={() => attachPhoto(r.id)}
        onRemovePhoto={() => editItem(r.id, 'image', null)}
      />
    );
  };

  const walk: ReactNode[] = [];
  rowsRaw.forEach((r) => {
    if (r.type === 'group') {
      const mem = membersOf(rowsRaw, r.id);
      walk.push(
        <GroupBlock
          key={r.id}
          group={r}
          members={mem}
          renderItem={(m) => itemNode(m, mem)}
          onTitleChange={(v) => editGroupTitle(r.id, v)}
          onRemove={() => removeRow(r.id)}
          onAddItem={() => addItemTo(r.id)}
        />,
      );
    } else if (r.gid == null) {
      walk.push(itemNode(r, siblingsOf(rowsRaw, r)));
    }
  });

  const clientSub = client
    ? [client.person, client.phone, client.email].filter(Boolean).join(' · ')
    : 'Bill to · Client';

  /* --- render ---------------------------------------------------------- */
  return (
    <>
      <div className="wrap">
        <header className="topbar">
          <button className="tb-btn" title="Back to sheets" aria-label="Back to sheets" onClick={handleBack}>
            <IconChevronLeft />
          </button>
          <div className="tb-title">
            <h1>{title}</h1>
            <div className="tb-meta">
              <span className="badge" id="modeBadge">{badgeText}</span>
              <span className="sep">·</span>
              <span id="layoutChip">{bp}</span>
            </div>
          </div>
          <button
            className="tb-save"
            title="Save Cost & Pricing Sheet"
            aria-label="Save Cost & Pricing Sheet"
            onClick={save}
          >
            <IconSave />
            Save CPS
          </button>
          <button className="tb-btn" id="themeBtn" title="Toggle dark mode" aria-label="Toggle dark mode" onClick={toggleTheme}>
            {themeIcon === 'sun' ? <IconSun /> : <IconMoon />}
          </button>
        </header>

        <section className="sec" style={{ marginTop: 14 }}>
          <SectionHead no="1." title="Document details" meta={<span id="cpsNoLabel">{doc.sheetNumber}</span>} />
          <div className="dgrid">
            <div className="full">
              <label className="lb" htmlFor="fTitle">Sheet Title</label>
              <input
                className="fld"
                id="fTitle"
                value={doc.title}
                placeholder="Sheet title"
                onChange={(e) => setDocField('title', e.target.value)}
              />
            </div>
            <div>
              <label className="lb" htmlFor="fNo">
                Sheet Number <span className="req">*</span>
              </label>
              <input
                className="fld mono"
                id="fNo"
                value={doc.sheetNumber}
                onChange={(e) => setDocField('sheetNumber', e.target.value)}
              />
            </div>
            <div>
              <label className="lb" htmlFor="fDate">Issue Date</label>
              <input
                className="fld mono"
                id="fDate"
                type="date"
                value={doc.issueDate}
                onChange={(e) => setDocField('issueDate', e.target.value)}
              />
            </div>
            <div className="full">
              <label className="lb" id="fClientLabel">
                Client <span className="req">*</span>
              </label>
              <div
                className={`clientpick${client ? ' filled' : ''}`}
                role="button"
                tabIndex={0}
                title={client ? `Change client (currently ${client.name})` : 'Select a client'}
                aria-labelledby="fClientLabel clientName"
                onClick={() => openSheet('client')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openSheet('client');
                  }
                }}
              >
                <span className="ci" id="clientIcon"><IconUser /></span>
                <span className="ct">
                  <b id="clientName">{client ? client.name : 'Select a client'}</b>
                  <small id="clientSub">{clientSub}</small>
                </span>
                {client ? (
                  <button
                    className="cx"
                    id="clientClear"
                    title="Clear client"
                    aria-label="Clear client"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearClient();
                    }}
                  >
                    <IconClose />
                  </button>
                ) : null}
                <span className="chev"><IconChevronDownSmall /></span>
              </div>
            </div>
            <div className="full">
              <label className="lb" htmlFor="fSite">Site / Project</label>
              <input
                className="fld"
                id="fSite"
                value={doc.site}
                placeholder="Site or project"
                onChange={(e) => setDocField('site', e.target.value)}
              />
            </div>
            <div className="full">
              <label className="lb" htmlFor="fNotes">Notes</label>
              <textarea
                className="fld"
                id="fNotes"
                rows={2}
                placeholder="Optional sheet notes"
                value={doc.notes}
                onChange={(e) => setDocField('notes', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="sec">
          <SectionHead no="2." title="Line items" meta={countLabel} />

          <div className="itemtools">
            <button
              className="itbn"
              title="Choose which fields show on rows and the PDF"
              onClick={() => openSheet('columns')}
            >
              <IconColumns />
              Columns
            </button>
            <button
              className="itbn"
              title="Replace groups and line items from JSON"
              onClick={() => openSheet('import')}
            >
              <IconImport />
              Import
            </button>
            <button
              className="itbn hot"
              id="markupBtn"
              title="Derive selling prices from cost prices"
              onClick={openMarkup}
            >
              <IconMarkup />
              Markup
            </button>
            <button
              className="itbn danger"
              title="Remove every group and item row"
              onClick={() => openSheet('clear')}
            >
              <IconTrash />
              Clear all
            </button>
          </div>

          <div className={`mk-undo${undo ? ' show' : ''}`}>
            <span>{undo ? undo.label : ''}</span>
            <button onClick={undoMarkup}>Undo</button>
          </div>

          <div id="items">
            {rowsRaw.length ? walk : <div className="empty">No rows yet — add a line item or a group.</div>}
          </div>

          <div className="createpair">
            <button className="cbtn primary" title="Adds an ungrouped line item" onClick={addItem}>
              <IconPlus />
              Add line item
            </button>
            <button className="cbtn ghost" title="Adds an empty group" onClick={addGroup}>
              <IconNote />
              Add group
            </button>
          </div>
        </section>

        <section className="sec">
          <SectionHead no="3." title="Totals" meta={<>No VAT · no WHT</>} />
          <div className="gateway" aria-hidden="true"><b>End of schedule · Commercial close-out</b></div>
          <div className="totals">
            <div className="close-top" aria-hidden="true"><i /></div>
            <div className="close-eyebrow">
              Cost &amp; Pricing Summary <span id="closeDocNo">{doc.sheetNumber}</span>
            </div>
            <div className="totals-grid">
              <div className="t-lines">
                <div className="sumline cost">
                  <span>Total cost (CP × Qty)</span>
                  <b id="tCost">{naira(totals.cost)}</b>
                </div>
                <div className="sumline sell">
                  <span>Schedule selling total (SP × Qty)</span>
                  <b id="tSell">{naira(totals.sell)}</b>
                </div>
              </div>
              <div className="mathnote">Schedule selling − Total cost = Gross profit · Margin on selling</div>
              <div className="sumtotal">
                <div>
                  <small>Gross profit</small>
                  <b id="tProfit" className={totals.tone}>{naira(totals.profit)}</b>
                </div>
                <div className="right">
                  <small>Margin</small>
                  <b id="tMargin" className={totals.tone}>{totals.margin}</b>
                </div>
              </div>
            </div>
            <div className="words" id="tWords">{totals.words}</div>
          </div>

          <div className="savebar">
            <button
              className="cbtn primary save-cta"
              title="Save Cost & Pricing Sheet"
              aria-label="Save Cost & Pricing Sheet"
              onClick={save}
            >
              <IconSave />
              Save CPS
            </button>
          </div>
        </section>
      </div>

      <button
        className="fab"
        title="Save Cost & Pricing Sheet"
        aria-label="Save Cost & Pricing Sheet"
        onClick={save}
      >
        <IconSave />
      </button>

      <ColumnsSheet
        open={openIds.includes('columns')}
        columns={columns}
        onLabelChange={changeColumnLabel}
        onToggle={toggleColumn}
        onMove={moveColumn}
        onRequestReset={() => openSheet('colreset')}
        onClose={() => closeSheet('columns')}
      />

      <ImportSheet
        open={openIds.includes('import')}
        value={impText}
        error={impErr}
        onValueChange={setImpText}
        onSubmit={doImport}
        onClose={() => closeSheet('import')}
      />

      <ClientSheet
        open={openIds.includes('client')}
        clients={clients}
        selectedId={client ? client.id : null}
        onChoose={chooseClient}
        onAddNew={addNewClient}
        onClose={() => closeSheet('client')}
      />

      <MarkupSheet
        open={openIds.includes('markup')}
        rows={rowsRaw}
        initialExcluded={initialMarkupExcluded ?? SAMPLE_MARKUP_EXCLUDED}
        onApply={handleMarkupApply}
        onClose={() => closeSheet('markup')}
      />

      <ConfirmDialog
        open={openIds.includes('clear')}
        sheetId="clear"
        ariaLabel="Clear all line items"
        title="Clear all line items?"
        body="This removes every group and item row from this sheet."
        confirmLabel="Clear all"
        onCancel={() => closeSheet('clear')}
        onConfirm={doClearAll}
      />

      <ConfirmDialog
        open={openIds.includes('colreset')}
        sheetId="colreset"
        ariaLabel="Reset columns to defaults"
        title="Reset columns to defaults?"
        body="This restores the default column order, labels, and visibility. Items are not removed."
        confirmLabel="Reset"
        onCancel={() => closeSheet('colreset')}
        onConfirm={resetColumns}
      />

      <ToastView show={!!toast} message={toast ? toast.msg : ''} isError={toast ? toast.isErr : false} />
    </>
  );
}

/** initialClient: explicit null means "no client"; omitted means first of clients. */
function propsInitialClient(initialClient: CpsClient | null | undefined, clients: CpsClient[]): CpsClient | null {
  if (initialClient !== undefined) return initialClient;
  return clients.length ? clients[0] : null;
}

export default CostPricingSheetForm;
