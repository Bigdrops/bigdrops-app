/*
 * BIGDROPS - Cost & Pricing Sheet - mobile/fold form template.
 * Converted 1:1 from:
 *   docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/
 *   cost-price-sheet-form-candidate-v1-mobile-fold.html
 *
 * Shared types, column constants, formatters, row helpers, and the
 * prototype sample model.
 *
 * PROTOTYPE MATH NOTE (carried from the source prototype): the display
 * math in this template uses float math rounded to 2dp. Production MUST
 * use the authoritative Decimal path before ship.
 */

/* ------------------------------------------------------------------ */
/* Column contract                                                     */
/* ------------------------------------------------------------------ */

export type CpsColumnKey =
  | 'description'
  | 'specification'
  | 'unit'
  | 'quantity'
  | 'make'
  | 'cp'
  | 'sp';

export interface CpsColumn {
  key: CpsColumnKey;
  label: string;
  visible: boolean;
}

export const CPS_CANONICAL_ORDER: CpsColumnKey[] = [
  'description',
  'specification',
  'unit',
  'quantity',
  'make',
  'cp',
  'sp',
];

export const CPS_DEFAULT_VISIBLE: Record<CpsColumnKey, boolean> = {
  description: true,
  specification: false,
  unit: true,
  quantity: true,
  make: true,
  cp: true,
  sp: true,
};

export const CPS_LABELS: Record<CpsColumnKey, string> = {
  description: 'Description',
  specification: 'Sub Description',
  unit: 'Unit',
  quantity: 'Qty',
  make: 'Make / Brand',
  cp: 'CP (Cost Price)',
  sp: 'SP (Selling Price)',
};

export const CPS_TYPE: Record<CpsColumnKey, 'text' | 'num'> = {
  description: 'text',
  specification: 'text',
  unit: 'text',
  quantity: 'num',
  make: 'text',
  cp: 'num',
  sp: 'num',
};

export function defaultCpsColumns(): CpsColumn[] {
  return CPS_CANONICAL_ORDER.map((k) => ({
    key: k,
    label: CPS_LABELS[k],
    visible: CPS_DEFAULT_VISIBLE[k],
  }));
}

/** Port of resolveCpsColumns() from the prototype. */
export function resolveCpsColumns(saved: Array<CpsColumn | null | undefined> | null | undefined): CpsColumn[] {
  if (!Array.isArray(saved) || !saved.length) return defaultCpsColumns();
  const out: CpsColumn[] = [];
  const seen = new Set<CpsColumnKey>();
  saved.forEach((c) => {
    const k = c && c.key;
    if (!k || CPS_CANONICAL_ORDER.indexOf(k) < 0 || seen.has(k)) return;
    seen.add(k);
    out.push({
      key: k,
      label: typeof c!.label === 'string' && c!.label.trim() ? c!.label : CPS_LABELS[k],
      visible: c!.visible !== false,
    });
  });
  CPS_CANONICAL_ORDER.forEach((k) => {
    if (!seen.has(k)) out.push({ key: k, label: CPS_LABELS[k], visible: CPS_DEFAULT_VISIBLE[k] });
  });
  const di = out.findIndex((c) => c.key === 'description');
  if (di > 0) {
    const d = out.splice(di, 1)[0];
    out.unshift(d);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Client contract                                                     */
/* ------------------------------------------------------------------ */

export interface CpsClient {
  id: string;
  name: string;
  person?: string;
  phone?: string;
  email?: string;
  addr?: string;
}

/* ------------------------------------------------------------------ */
/* Row contract                                                        */
/* ------------------------------------------------------------------ */

export interface CpsItemRow {
  id: number;
  type: 'item';
  gid: number | null;
  desc: string;
  sub: string;
  subOpen: boolean;
  qty: number;
  unit: string;
  make: string;
  cp: number;
  sp: number;
  image?: string | null;
}

export interface CpsGroupRow {
  id: number;
  type: 'group';
  title: string;
}

export type CpsRow = CpsItemRow | CpsGroupRow;

export function isItemRow(r: CpsRow): r is CpsItemRow {
  return r.type === 'item';
}

/* ------------------------------------------------------------------ */
/* Document contract                                                   */
/* ------------------------------------------------------------------ */

export interface CpsDocumentFields {
  title: string;
  sheetNumber: string;
  issueDate: string;
  site: string;
  notes: string;
}

export interface CpsSavePayload extends CpsDocumentFields {
  client: CpsClient | null;
  rows: CpsRow[];
  columns: CpsColumn[];
}

/** Result contract for the JSON import callback (logic stays in the host). */
export type CpsImportResult =
  | { ok: true; rows: CpsRow[]; title?: string }
  | { ok: false; error: string };

export type CpsSheetId = 'columns' | 'import' | 'client' | 'markup' | 'clear' | 'colreset';

export type CpsMarkupMode = 'pct' | 'val';

export interface CpsMarkupChange {
  id: number;
  sp: number;
}

/* ------------------------------------------------------------------ */
/* Formatters (prototype float math, rounded to 2dp)                   */
/* ------------------------------------------------------------------ */

export const naira = (n: number | null | undefined): string =>
  '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const naira0 = (n: number | null | undefined): string =>
  '₦' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });

export const fmtGroup = (n: number): string =>
  Number(n).toLocaleString('en-US', { maximumFractionDigits: 20 });

export const fmtMoney = (n: number): string => fmtGroup(Math.round((Number(n) || 0) * 100) / 100);

export const fmtQty = (n: number): string => fmtGroup(Number(n));

/** Port of words() from the prototype. */
export function words(num: number): string {
  if (!num) return 'ZERO NAIRA ONLY';
  const a = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const c = (x: number): string =>
    x < 20
      ? a[x]
      : x < 100
        ? b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '')
        : x < 1000
          ? a[Math.floor(x / 100)] + ' HUNDRED' + (x % 100 ? ' ' + c(x % 100) : '')
          : x < 1e6
            ? c(Math.floor(x / 1000)) + ' THOUSAND' + (x % 1000 ? ' ' + c(x % 1000) : '')
            : x < 1e9
              ? c(Math.floor(x / 1e6)) + ' MILLION' + (x % 1e6 ? ' ' + c(x % 1e6) : '')
              : c(Math.floor(x / 1e9)) + ' BILLION' + (x % 1e9 ? ' ' + c(x % 1e9) : '');
  const w = Math.floor(num);
  const k = Math.round((num - w) * 100);
  return c(w) + ' NAIRA' + (k ? ' AND ' + c(k) + ' KOBO' : '') + ' ONLY';
}

/* ------------------------------------------------------------------ */
/* Row financial helpers (row display math)                           */
/* ------------------------------------------------------------------ */

export const tcpOf = (r: CpsItemRow): number => Number(r.cp || 0) * Number(r.qty || 0);
export const tspOf = (r: CpsItemRow): number => Number(r.sp || 0) * Number(r.qty || 0);
export const profitOf = (r: CpsItemRow): number => tspOf(r) - tcpOf(r);

export const marginOf = (r: CpsItemRow): number | null => {
  const tsp = tspOf(r);
  return tsp ? (profitOf(r) / tsp) * 100 : null;
};

/** Items that belong to a group, in rows order. */
export const membersOf = (rows: CpsRow[], gid: number): CpsItemRow[] =>
  rows.filter((r): r is CpsItemRow => r.type === 'item' && r.gid === gid);

/**
 * Sibling set used by move up/down and the disabled rail states.
 * Port of siblings() from the prototype (ungrouped items share their
 * list with groups).
 */
export const siblingsOf = (rows: CpsRow[], r: CpsItemRow): CpsRow[] =>
  r.gid != null
    ? rows.filter((x): x is CpsItemRow => x.type === 'item' && x.gid === r.gid)
    : rows.filter((x) => x.type === 'group' || x.gid == null);

/** Items whose group no longer exists become ungrouped. */
export function sanitizeRows(rs: CpsRow[]): CpsRow[] {
  return rs.map((r) => {
    if (r.type === 'item' && r.gid != null && !rs.some((g) => g.type === 'group' && g.id === r.gid)) {
      return { ...r, gid: null };
    }
    return r;
  });
}

/** Port of blank() from the prototype. */
export function makeBlankRow(seq: number, gid: number | null): CpsItemRow {
  return { id: seq, type: 'item', gid, desc: '', sub: '', subOpen: false, qty: 1, unit: '', make: '', cp: 0, sp: 0 };
}

/** Port of bp() from the prototype: Phone / Large phone / Fold. */
export function layoutBreakpoint(): 'Phone' | 'Large phone' | 'Fold' {
  if (typeof window === 'undefined') return 'Phone';
  const w = window.innerWidth;
  return w < 430 ? 'Phone' : w < 600 ? 'Large phone' : 'Fold';
}

/* ------------------------------------------------------------------ */
/* Prototype sample model (fictional, internally consistent)           */
/* ------------------------------------------------------------------ */

export const SAMPLE_CLIENTS: CpsClient[] = [
  { id: 'wellspring', name: 'Wellspring Homes Ltd', person: 'Adaeze Okonkwo', phone: '0803 555 0192', email: 'adaeze@wellspring.ng', addr: 'Plot 14, Lekki Phase 1, Lagos' },
  { id: 'pinnacle', name: 'Pinnacle Towers Ltd', person: 'Tunde Bello', phone: '0805 441 2077', email: 't.bello@pinnacle.ng', addr: 'Ozumba Mbadiwe, VI, Lagos' },
  { id: 'cordelia', name: 'Cordelia Electricals Ltd', person: 'Ngozi Eze', phone: '0702 118 8845', email: 'sales@cordelia.ng', addr: 'Alausa, Ikeja, Lagos' },
];

export const SAMPLE_DOCUMENT: CpsDocumentFields = {
  title: 'Duplex Build — Cost & Pricing',
  sheetNumber: 'CPS-2026-0001',
  issueDate: '2026-09-17',
  site: 'Lekki Phase 1 — Plot 14',
  notes: 'Rates include supply to site. Labour priced separately on request.',
};

export const SAMPLE_ROWS: CpsRow[] = [
  { id: 8, type: 'item', gid: null, desc: 'Preliminaries, site supervision and setting out', sub: 'Site establishment, setting out of works, site supervision and general preliminaries for the duration of the works.', subOpen: false, qty: 1, unit: 'lot', make: '', cp: 150000, sp: 185000 },
  { id: 1, type: 'group', title: 'Group A — Civil Works' },
  { id: 2, type: 'item', gid: 1, desc: 'Portland cement, grade 42.5R', sub: '', subOpen: false, qty: 400, unit: 'bags', make: 'Dangote 3X', cp: 5200, sp: 6100 },
  { id: 3, type: 'item', gid: 1, desc: 'Reinforcement steel, high yield T12', sub: '', subOpen: false, qty: 120, unit: 'lengths', make: 'African Foundries', cp: 9800.75, sp: 11500 },
  { id: 4, type: 'item', gid: 1, desc: 'Sharp sand, river dredged', sub: 'Delivered, tested and compacted in approved layers per engineer’s instruction, including waste allowance and carting away of surplus material.', subOpen: false, qty: 30, unit: 'trips', make: 'Local', cp: 28000, sp: 0 },
  { id: 5, type: 'group', title: 'Group B — Finishes' },
  { id: 6, type: 'item', gid: 5, desc: 'Emulsion paint, 20L pail', sub: 'Two coats over prepared surface.', subOpen: false, qty: 18, unit: 'pails', make: 'Dulux', cp: 41000, sp: 48500 },
  { id: 7, type: 'item', gid: null, desc: 'Provisional sum — drainage works (rates pending)', sub: '', subOpen: false, qty: 1, unit: 'sum', make: '', cp: 0, sp: 0 },
];

/** Default Instant Markup exclusions, matching the prototype demo rows. */
export const SAMPLE_MARKUP_EXCLUDED: number[] = [6, 8];

/* ------------------------------------------------------------------ */
/* Component props contract                                            */
/* ------------------------------------------------------------------ */

export interface CostPricingSheetFormProps {
  /** Header title. Prototype default: "Cost & Pricing Sheet". */
  title?: string;
  /**
   * Draft badge text. When omitted, the prototype demo behavior applies:
   * the badge reads "Draft" and flips to "Saved" on a passing save.
   * Pass a value to control the badge from the host application.
   */
  modeLabel?: string;
  /** Controlled light/dark theme. Sets data-theme on documentElement. */
  theme?: 'light' | 'dark';
  /** Initial theme when the theme prop is omitted. Default: light. */
  defaultTheme?: 'light' | 'dark';
  /** Notified on every theme tap with the resulting theme. */
  onToggleTheme?: (theme: 'light' | 'dark') => void;
  /** Top-bar Back button. Without it, the prototype demo toast shows. */
  onBack?: () => void;
  /** Save CTA (top bar, section CTA, FAB). Runs prototype validation first. */
  onSave?: (payload: CpsSavePayload) => void;
  /** Initial document fields. Defaults to the prototype sample. */
  initialDocument?: Partial<CpsDocumentFields>;
  /** Initial rows. Defaults to the prototype sample. */
  initialRows?: CpsRow[];
  /** Client picker options. Defaults to the prototype sample clients. */
  clients?: CpsClient[];
  /** Initially selected client. Defaults to the first entry of clients. Pass null for none. */
  initialClient?: CpsClient | null;
  /** Fires whenever the selected client changes (including clear). */
  onClientChange?: (client: CpsClient | null) => void;
  /** "+ Add new client" affordance in the client sheet. */
  onAddNewClient?: () => void;
  /** Initial column configuration. Defaults to prototype defaults. */
  initialColumns?: CpsColumn[];
  /** Fires after any column toggle, label edit, move, or reset. */
  onColumnsChange?: (columns: CpsColumn[]) => void;
  /**
   * JSON import callback. The host parses and validates the raw text.
   * Return rows on success or an inline error message on failure.
   * The Import CTA is inert without this callback.
   */
  onImport?: (jsonText: string) => CpsImportResult;
  /**
   * Photo attach callback (Cloudinary/upload logic lives in the host).
   * Resolve with an image URL to attach it to the row.
   */
  onRequestPhoto?: (rowId: number) => void | Promise<string | null | undefined>;
  /**
   * Row ids excluded from Instant Markup on first open.
   * Defaults to [6, 8], matching the prototype sample rows.
   */
  initialMarkupExcluded?: number[];
}
