'use client';

/**
 * REPRISE — GOLDEN-HOUR FINANCE DASHBOARD (standalone showcase template)
 * Spec: docs/TEMPLATES/Designsdotmds/reprise.md
 *
 * Self-contained: mock data only, no app imports, no Supabase, no routing.
 * Light warm-paper theme by default; optional dark-mode toggle (moon icon).
 *
 * ── Tailwind v4 consumers ─────────────────────────────────────────────
 * The design tokens live in the REPRISE_THEME @theme block below. Drop it
 * into your CSS entry (e.g. src/index.css) so Tailwind v4 generates the
 * semantic utilities (bg-card, text-ink, border-line, rounded-card, …):
 *
 *   @theme inline { …see REPRISE_THEME… }
 *
 * This component ALSO injects the same tokens scoped to `.reprise-dashboard`
 * (see REPRISE_CSS), so it renders standalone — using var() utilities such
 * as `bg-[var(--color-surface-card)]` — in any Tailwind version, v3 or v4.
 *
 * ── Fonts ─────────────────────────────────────────────────────────────
 * The host app should load JetBrains Mono (brand/data voice) and Inter
 * (UI/body voice). The stacks below fall back to ui-monospace / system-ui
 * if the fonts are not loaded.
 */

// ============================================================
// THEME — Tailwind v4 @theme pattern (mirrors reprise.md Quick Start)
// ============================================================
const REPRISE_THEME = `
@theme inline {
  --font-sans: "Inter", "SF Pro", "Geist", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Space Mono", "IBM Plex Mono", ui-monospace, monospace;

  --color-canvas: #FAFAF9;
  --color-card: #FFFFFF;
  --color-inset: #F7F5F1;
  --color-line: #E8E5DF;
  --color-line-strong: #DBD7CF;
  --color-dash: #E4E1DA;
  --color-ink: #18181B;
  --color-ink-2: #5C5A55;
  --color-ink-3: #71717A;
  --color-ink-4: #8B8781;
  --color-gold-700: #B4770F;
  --color-gold-500: #D9962B;
  --color-gold-400: #E8B33C;
  --color-inkbtn: #18181B;
  --color-ok: #22C55E;
  --color-ok-text: #16A34A;
  --color-lime: #84CC16;
  --color-red: #EF4444;
  --color-bar: #E5E7EB;
  --color-chip: #EFEDE8;

  --radius-frame: 22px;
  --radius-hero: 18px;
  --radius-card: 16px;
  --radius-panel: 11px;
  --radius-control: 9px;
  --radius-chip: 6px;

  --spacing: 4px;
}
`.trim();

// ============================================================
// TOKENS — scoped CSS custom properties (single source of hex,
// copied from reprise.md "Quick Start"), injected by the component.
// ============================================================
const REPRISE_CSS = `
.reprise-dashboard {
  --color-canvas: #FAFAF9;
  --color-surface-card: #FFFFFF;
  --color-surface-inset: #F7F5F1;
  --color-border-subtle: #E8E5DF;
  --color-border-strong: #DBD7CF;
  --color-divider-dashed: #E4E1DA;
  --color-ink-900: #18181B;
  --color-ink-600: #5C5A55;
  --color-ink-500: #71717A;
  --color-ink-400: #8B8781;
  --color-gold-700: #B4770F;
  --color-gold-500: #D9962B;
  --color-gold-400: #E8B33C;
  --color-ink-button: #18181B;
  --color-success-500: #22C55E;
  --color-success-600: #16A34A;
  --color-lime-500: #84CC16;
  --color-danger-500: #EF4444;
  --color-chart-neutral: #E5E7EB;
  --color-chip-bg: #EFEDE8;

  --font-sans: "Inter", "SF Pro", "Geist", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Space Mono", "IBM Plex Mono", ui-monospace, monospace;

  --radius-frame: 22px; --radius-hero: 18px; --radius-card: 16px;
  --radius-panel: 11px; --radius-control: 9px; --radius-chip: 6px;
  --radius-full: 999px;

  --gradient-gold-tile: linear-gradient(135deg, #F3BD48, #D9962B);
  --gradient-hero: linear-gradient(90deg, #B4770F 0%, #D9962B 45%, rgba(217,150,43,0) 100%);
  --micro-tracking: .06em;

  --shadow-card: 0 1px 2px rgba(24, 24, 27, .04), 0 4px 14px rgba(24, 24, 27, .04);

  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.45;
  color: var(--color-ink-600);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;

  /* dark paper overrides (optional dark mode) */
  --dark-canvas: #1B1A18;
  --dark-card: #24221F;
  --dark-inset: #2A2824;
  --dark-border-subtle: #35332E;
  --dark-border-strong: #47443D;
  --dark-dash: #3A3731;
  --dark-ink-900: #F4F1EA;
  --dark-ink-600: #B8B2A6;
  --dark-ink-500: #948E82;
  --dark-ink-400: #6F6A60;
  --dark-chip-bg: #302E29;
  --dark-chart-neutral: #37342F;
}

.reprise-dashboard.dark {
  --color-canvas: var(--dark-canvas);
  --color-surface-card: var(--dark-card);
  --color-surface-inset: var(--dark-inset);
  --color-border-subtle: var(--dark-border-subtle);
  --color-border-strong: var(--dark-border-strong);
  --color-divider-dashed: var(--dark-dash);
  --color-ink-900: var(--dark-ink-900);
  --color-ink-600: var(--dark-ink-600);
  --color-ink-500: var(--dark-ink-500);
  --color-ink-400: var(--dark-ink-400);
  --color-chip-bg: var(--dark-chip-bg);
  --color-chart-neutral: var(--dark-chart-neutral);
  --shadow-card: 0 1px 2px rgba(0, 0, 0, .4);
}

/* gradient helpers (background-image via var is ambiguous in Tailwind) */
.reprise-dashboard .r-gold-tile { background: var(--gradient-gold-tile); }
.reprise-dashboard .r-hero-overlay { background: var(--gradient-hero); }
.reprise-dashboard .r-hero-fill {
  background:
    linear-gradient(180deg, rgba(214, 148, 51, .18), rgba(120, 70, 12, .28)),
    var(--gradient-gold-tile);
}

/* hairline scrollbars inside the frame */
.reprise-dashboard .r-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.reprise-dashboard .r-scroll::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 8px; }
.reprise-dashboard .r-scroll::-webkit-scrollbar-track { background: transparent; }

/* keyboard focus */
.reprise-dashboard :focus-visible {
  outline: 2px solid var(--color-gold-500);
  outline-offset: 2px;
  border-radius: 4px;
}
.reprise-dashboard.dark :focus-visible { outline-color: var(--color-gold-400); }

@media (prefers-reduced-motion: reduce) {
  .reprise-dashboard *, .reprise-dashboard *::before, .reprise-dashboard *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`.trim();

// ============================================================
// MOCK DATA — spec example content, checkable against reprise.md
// ============================================================
const COUPONS = [
  { date: 'Aug 15, 2025', note: 'next', amount: '$172.50' },
  { date: 'Nov 15, 2025', note: '', amount: '$172.50' },
  { date: 'Feb 15, 2026', note: '', amount: '$172.50' },
  { date: 'May 15, 2026', note: '', amount: '$172.50' },
  { date: 'Aug 15, 2026', note: '', amount: '$172.50' },
];

const ROYALTY_TILES = [
  { icon: 'music', label: 'Streaming', pct: '38%' },
  { icon: 'download', label: 'Downloads', pct: '24%' },
  { icon: 'sync', label: 'Sync licensing', pct: '21%' },
  { icon: 'live', label: 'Live & other', pct: '17%' },
];

const HISTOGRAM = [
  { year: '2019', h: '42%', featured: false },
  { year: '2020', h: '58%', featured: false },
  { year: '2021', h: '36%', featured: false },
  { year: '2022', h: '74%', featured: false },
  { year: '2023', h: '100%', featured: true },
];

const FUNDS = [
  { label: 'Catalog acquisition', pct: 40, color: '#F3BD48' },
  { label: 'Marketing & playlist', pct: 25, color: '#D9962B' },
  { label: 'Touring', pct: 15, color: '#C98A1E' },
  { label: 'Sync licensing', pct: 12, color: '#B4770F' },
  { label: 'Reserve', pct: 8, color: '#8A5A0B' },
];

const KPIS = [
  { label: 'Yield', value: '5.2%' },
  { label: 'Rating', value: 'A+' },
  { label: 'Coupon', value: '8.5%' },
  { label: 'Maturity', value: '2030' },
  { label: 'Min. investment', value: '$5,000' },
];

const BOND_DETAILS: Array<[string, string]> = [
  ['Issuer', 'Aurora Lane IP Ltd.'],
  ['Bond type', 'Catalog royalty'],
  ['Seniority', 'Senior secured'],
  ['Payment freq.', 'Semi-annual'],
  ['Day count', '30/360'],
  ['Governing law', 'England & Wales'],
];

const RISK_ROWS: Array<[string, string]> = [
  ['Default risk', 'Low'],
  ['Market risk', 'Medium'],
  ['Liquidity risk', 'Medium'],
  ['Volatility', 'Low'],
];

const DRIVERS = ['Royalty quality', 'Diversification', 'Growth', 'Management'];

const TABS = ['Overview', 'Cashflow', 'Financials', 'Risks', 'Documents'];

const FINANCIALS_ROWS: Array<[string, string]> = [
  ['Royalty revenue', '$2.4M'],
  ['Operating margin', '41%'],
  ['Net income', '$612K'],
  ['Leverage', '2.1x'],
];

const DOCS = ['Offering circular', 'Trust deed', 'Financial statements', 'Due diligence report'];

// PLACEHOLDER: swap the Unsplash golden-hour portrait for the brand's
// amber-washed artist photo. The gradient fill shows if it is offline.
const HERO_PHOTO =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1000&q=80';

// PLACEHOLDER: swap the golden-hour field photo for the brand's painterly
// golden field-and-sky illustration. Warm gradient fallback layers below.
const WALLPAPER_URL =
  'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=1800&q=80';

// ============================================================
// COMPONENT
// ============================================================
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Search,
  Bell,
  CircleHelp,
  Sparkles,
  Home,
  PieChart,
  CandlestickChart,
  MessageSquare,
  Newspaper,
  Settings,
  ChevronDown,
  Calendar,
  Info,
  Shield,
  Star,
  Music,
  Download,
  RadioTower,
  Mic,
  Zap,
  Sun,
  Moon,
  PanelLeftClose,
  Menu,
  ArrowUpRight,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  music: Music,
  download: Download,
  sync: RadioTower,
  live: Mic,
};

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export default function RepriseDashboard() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const frameClass = classNames(
    'relative flex mx-auto my-6 max-sm:my-[10px] max-sm:mx-[10px]',
    'w-[calc(100%-48px)] max-sm:w-[calc(100%-20px)]',
    'h-[calc(100vh-48px)] max-sm:h-[calc(100vh-20px)] min-h-[640px] max-sm:min-h-0',
    'max-w-[1480px] rounded-[var(--radius-frame)] max-sm:rounded-[16px]',
    'overflow-hidden border border-white/55',
    'bg-gradient-to-b from-[var(--color-canvas)] to-[#F8F7F4]',
    'shadow-[0_24px_60px_rgba(90,60,10,0.28),0_4px_16px_rgba(90,60,10,0.12)]'
  );

  const workspace = (
    <div className="r-scroll flex-1 min-h-0 overflow-y-auto grid gap-5 p-5 max-sm:p-3 max-sm:gap-3 grid-cols-[minmax(0,1fr)_316px] max-xl:grid-cols-[minmax(0,1fr)_292px] max-[900px]:grid-cols-[minmax(0,1fr)]">
      {/* ---------- CENTER COLUMN ---------- */}
      <section className="flex flex-col gap-5 max-sm:gap-3 min-w-0" aria-label="Bond overview">
        {renderHero()}
        {renderKpiStrip()}
        <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-5 max-sm:gap-3">
          {renderRoyaltyCalendar()}
          {renderCoupons()}
        </div>
        <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-5 max-sm:gap-3">
          {renderPerformance()}
          {renderFunds()}
        </div>
      </section>

      {/* ---------- RIGHT INSIGHT RAIL ---------- */}
      <aside
        className="flex flex-col gap-4 min-w-0 max-[900px]:grid max-[900px]:grid-cols-2 max-sm:grid-cols-1 max-[900px]:gap-4"
        aria-label="Bond insights"
      >
        {renderTabBar()}
        {renderTabPanel()}
      </aside>
    </div>
  );

  function renderHero() {
    return (
      <div
        className="relative h-[232px] max-sm:h-[300px] rounded-[var(--radius-hero)] overflow-hidden border border-white/35 shadow-[var(--shadow-card)] isolate"
        data-part="hero"
      >
        {/* right-anchored golden-hour portrait (placeholder) */}
        <img
          src={HERO_PHOTO}
          alt="Golden-hour portrait of the Aurora Lane artist"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="r-hero-overlay absolute inset-0 z-[1]" aria-hidden="true" />
        <div className="relative z-[2] h-full flex flex-col justify-center gap-2 px-8 py-7 max-sm:px-5 max-w-[58%] max-sm:max-w-full">
          <h1 className="m-0 font-[family-name:var(--font-mono)] font-bold text-[28px] max-sm:text-[24px] leading-[1.15] tracking-[-0.02em] text-white">
            Aurora Lane
          </h1>
          <p className="m-0 font-[family-name:var(--font-mono)] font-medium text-[11px] uppercase tracking-[0.06em] text-white/85">
            Debut master royalty bond 2030
          </p>
        </div>
        <div className="absolute left-7 bottom-[18px] max-sm:left-5 max-sm:bottom-4 z-[2] flex flex-wrap gap-2 max-w-[78%] max-sm:max-w-[calc(100%-40px)]">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-full)] bg-white/15 border border-white/35 backdrop-blur-md font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.04em] text-white whitespace-nowrap">
            <Music size={12} aria-hidden="true" /> Artist catalog
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-[var(--radius-full)] bg-white/15 border border-white/35 backdrop-blur-md font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.04em] text-white whitespace-nowrap">
            Debut era [2018–2023]
          </span>
          <span className="inline-flex items-center px-3 py-1.5 rounded-[var(--radius-full)] bg-white/15 border border-white/35 backdrop-blur-md font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.04em] text-white whitespace-nowrap">
            Issued May 2025
          </span>
        </div>
      </div>
    );
  }

  function renderKpiStrip() {
    return (
      <div
        className="grid grid-cols-6 max-[1220px]:grid-cols-3 max-sm:grid-cols-2 rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]"
        role="group"
        aria-label="Bond key figures"
      >
        {KPIS.map((k, i) => (
          <div
            key={k.label}
            className={classNames(
              'flex flex-col gap-1.5 px-5 py-4 min-w-0 max-sm:px-4',
              'max-[1220px]:border-t max-[1220px]:border-[var(--color-border-subtle)]',
              i > 0 && 'border-l border-[var(--color-border-subtle)] max-[1220px]:border-l-0 max-sm:border-l-0',
              i === 0 && 'max-[1220px]:border-t-0',
              i === 3 && 'max-[1220px]:border-l max-[1220px]:border-[var(--color-border-subtle)] max-sm:border-l-0',
              i >= 2 && 'max-sm:border-t max-sm:border-[var(--color-border-subtle)]',
              i === 2 && 'max-sm:border-t-0'
            )}
          >
            <span className="font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-400)]">
              {k.label}
            </span>
            {k.label === 'Bond status' ? (
              <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] font-bold text-[20px] leading-[1.15] tracking-[-0.01em] text-[var(--color-ink-900)] whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-[var(--color-success-500)] shadow-[0_0_0_3px_rgba(34,197,94,0.18)]" aria-hidden="true" />
                Open
              </span>
            ) : (
              <span className="font-[family-name:var(--font-mono)] font-bold text-[20px] leading-[1.15] tracking-[-0.01em] text-[var(--color-ink-900)] whitespace-nowrap">
                {k.value}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  function renderRoyaltyCalendar() {
    return (
      <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-5">
        <h2 className="m-0 font-[family-name:var(--font-sans)] font-semibold text-[15px] leading-[1.4] text-[var(--color-ink-900)]">
          Royalty calendar
        </h2>
        <div className="flex items-baseline justify-between gap-3 mt-2.5">
          <span className="font-[family-name:var(--font-mono)] font-bold text-[22px] leading-[1.15] tracking-[-0.01em] text-[var(--color-ink-900)]">
            $172.50
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-400)] whitespace-nowrap">
            Per $5,000 invested
          </span>
        </div>
        <div className="mt-[18px] grid grid-cols-2 gap-3">
          {ROYALTY_TILES.map((t) => {
            const Icon = ICONS[t.icon];
            return (
              <div
                key={t.label}
                className="flex items-center gap-2.5 p-3 rounded-[var(--radius-panel)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-card)] transition-all"
              >
                <span className="r-gold-tile w-9 h-9 flex-shrink-0 rounded-[10px] grid place-items-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="font-[family-name:var(--font-sans)] font-medium text-[13px] text-[var(--color-ink-900)] truncate">
                  {t.label}
                </span>
                <span className="ml-auto font-[family-name:var(--font-mono)] font-semibold text-[13px] text-[var(--color-ink-600)] whitespace-nowrap">
                  {t.pct}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderCoupons() {
    return (
      <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-5">
        <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-900)]">
          <Calendar size={14} className="text-[var(--color-ink-500)]" aria-hidden="true" />
          Upcoming coupons
        </div>
        <ul className="mt-2 list-none p-0 m-0">
          {COUPONS.map((c) => (
            <li
              key={c.date}
              className="flex items-center justify-between gap-3 min-h-[44px] px-1 py-2 border-b border-dashed border-[var(--color-divider-dashed)] last:border-b-0 hover:bg-[var(--color-surface-inset)]"
            >
              <span className="font-[family-name:var(--font-sans)] font-medium text-[13px] text-[var(--color-ink-600)]">
                {c.date}
                {c.note && <span className="font-normal text-[var(--color-ink-400)]"> · {c.note}</span>}
              </span>
              <span className="font-[family-name:var(--font-mono)] font-bold text-[14px] tracking-[-0.01em] text-[var(--color-ink-900)] whitespace-nowrap">
                {c.amount}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function renderPerformance() {
    return (
      <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 font-[family-name:var(--font-sans)] font-semibold text-[15px] leading-[1.4] text-[var(--color-ink-900)]">
            Catalog performance
          </h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--color-lime-500)]/15 text-[var(--color-success-600)] font-[family-name:var(--font-mono)] text-[11px] font-semibold">
            <ArrowUpRight size={11} strokeWidth={2.5} aria-hidden="true" />18.6%
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2.5">
          <span className="font-[family-name:var(--font-mono)] font-bold text-[26px] leading-[1.1] tracking-[-0.01em] text-[var(--color-ink-900)]">
            $12.4M
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-400)]">
            Lifetime royalties
          </span>
        </div>
        <div
          className="mt-[22px] flex items-end justify-between gap-2.5 h-[108px]"
          role="img"
          aria-label="Histogram of catalog royalties by year, 2019 to 2023, with 2023 featured at the highest value"
        >
          {HISTOGRAM.map((b) => (
            <div key={b.year} className="flex-1 flex flex-col items-center gap-2 h-full">
              <div
                className={classNames(
                  'w-full max-w-[44px] rounded-[6px_6px_3px_3px] hover:brightness-95 transition-all',
                  b.featured
                    ? 'bg-gradient-to-b from-[#F3BD48] to-[#D9962B] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]'
                    : 'bg-[var(--color-chart-neutral)]'
                )}
                style={{ height: b.h }}
              />
              <span
                className={classNames(
                  'font-[family-name:var(--font-mono)] text-[10px] font-medium text-[var(--color-ink-400)]',
                  b.featured && 'text-[var(--color-gold-700)]'
                )}
              >
                {b.year}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderFunds() {
    return (
      <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-5">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="m-0 font-[family-name:var(--font-sans)] font-semibold text-[15px] leading-[1.4] text-[var(--color-ink-900)]">
            Use of funds
          </h2>
          <span className="font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-400)]">
            Allocation 100%
          </span>
        </div>
        <div
          className="flex gap-[3px] h-3 rounded-[var(--radius-full)] overflow-hidden"
          role="img"
          aria-label="Allocation: catalog acquisition 40 percent, marketing and playlist 25 percent, touring 15 percent, sync licensing 12 percent, reserve 8 percent"
        >
          {FUNDS.map((f) => (
            <span key={f.label} style={{ width: `${f.pct}%`, background: `linear-gradient(180deg, ${f.color}, ${f.color})` }} className="h-full" />
          ))}
        </div>
        <ul className="mt-4 list-none p-0 m-0">
          {FUNDS.map((f) => (
            <li
              key={f.label}
              className="flex items-center gap-2.5 min-h-[34px] border-b border-dashed border-[var(--color-divider-dashed)] last:border-b-0"
            >
              <span className="w-2 h-2 rounded-[3px] flex-shrink-0" style={{ background: f.color }} aria-hidden="true" />
              <span className="font-[family-name:var(--font-sans)] text-[13px] text-[var(--color-ink-600)]">{f.label}</span>
              <span className="ml-auto font-[family-name:var(--font-mono)] font-semibold text-[13px] text-[var(--color-ink-900)] whitespace-nowrap">
                {f.pct}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function renderTabBar() {
    return (
      <div
        className="flex gap-0.5 p-1 rounded-[var(--radius-panel)] bg-[var(--color-surface-inset)] border border-[var(--color-border-subtle)] overflow-x-auto r-scroll max-[900px]:col-span-2 max-sm:col-span-1"
        role="tablist"
        aria-label="Bond insights"
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`reprise-tab-${t.toLowerCase()}`}
            aria-selected={activeTab === t}
            aria-controls={`reprise-panel-${t.toLowerCase()}`}
            onClick={() => setActiveTab(t)}
            className={classNames(
              'flex-1 min-w-max px-2.5 py-[7px] rounded-lg transition-all',
              'font-[family-name:var(--font-mono)] text-[10.5px] font-medium uppercase tracking-[0.04em]',
              activeTab === t
                ? 'bg-[var(--color-surface-card)] text-[var(--color-ink-900)] shadow-[0_1px_2px_rgba(24,24,27,0.06)] underline underline-offset-4 decoration-[1.5px]'
                : 'text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]'
            )}
          >
            {t}
          </button>
        ))}
      </div>
    );
  }

  function renderKvGrid(rows: Array<[string, string]>) {
    return (
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-[11px] mt-3.5 m-0">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-[family-name:var(--font-sans)] text-[13px] text-[var(--color-ink-500)]">{k}</dt>
            <dd className="m-0 font-[family-name:var(--font-sans)] font-semibold text-[13px] text-[var(--color-ink-900)] text-right whitespace-nowrap">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  function renderTabPanel() {
    const panelId = `reprise-panel-${activeTab.toLowerCase()}`;
    const common = {
      role: 'tabpanel' as const,
      id: panelId,
      'aria-labelledby': `reprise-tab-${activeTab.toLowerCase()}`,
      'data-panel': activeTab.toLowerCase(),
    };

    if (activeTab === 'Overview') {
      return (
        <div {...common} className="flex flex-col gap-4 min-w-0">
          <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-5">
            <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-900)]">
              <Info size={14} className="text-[var(--color-ink-500)]" aria-hidden="true" />
              Bond details
            </div>
            {renderKvGrid(BOND_DETAILS)}
          </div>

          <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-5">
            <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-900)]">
              <Shield size={14} className="text-[var(--color-ink-500)]" aria-hidden="true" />
              Risk overview
            </div>
            <p className="mt-3.5 mb-0 font-[family-name:var(--font-sans)] font-semibold text-[15px] text-[var(--color-ink-900)]">
              Low-medium risk
            </p>
            {renderKvGrid(RISK_ROWS)}
          </div>

          <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-5">
            <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-900)]">
              <Sparkles size={14} className="text-[var(--color-ink-500)]" aria-hidden="true" />
              AI credit signal
            </div>
            <div className="flex items-baseline gap-2 mt-3.5">
              <span className="font-[family-name:var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-400)]">
                Very strong
              </span>
              <span className="font-[family-name:var(--font-mono)] font-bold text-[18px] leading-[1.15] tracking-[-0.01em] text-[var(--color-ink-900)]">
                82%
              </span>
            </div>
            <div className="mt-2.5 h-2 rounded-[var(--radius-full)] bg-[var(--color-surface-inset)] border border-[var(--color-border-subtle)] overflow-hidden">
              <span className="block h-full w-[82%] rounded-[inherit] bg-[var(--color-lime-500)]" />
            </div>
            <span className="block mt-3.5 font-[family-name:var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-400)]">
              Key drivers
            </span>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {DRIVERS.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--color-chip-bg)] border border-[var(--color-border-subtle)] font-[family-name:var(--font-sans)] text-[12px] font-medium text-[var(--color-ink-600)] whitespace-nowrap"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-5">
            <span className="font-[family-name:var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-400)]">
              Streaming royalties (last 5 years)
            </span>
            <div className="flex items-baseline gap-2 mt-1.5 flex-wrap">
              <span className="font-[family-name:var(--font-mono)] font-bold text-[26px] leading-[1.1] tracking-[-0.01em] text-[var(--color-ink-900)]">
                $360
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-400)]">
                of $5,000
              </span>
            </div>
            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-control)] bg-[var(--color-ink-button)] text-white font-[family-name:var(--font-sans)] font-semibold text-[13px] hover:opacity-90 transition-opacity"
              >
                Buy bond
              </button>
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-[var(--radius-control)] bg-[var(--color-surface-card)] border border-[var(--color-border-strong)] text-[var(--color-ink-900)] font-[family-name:var(--font-sans)] font-semibold text-[13px] whitespace-nowrap hover:bg-[var(--color-surface-inset)] transition-colors"
              >
                <Star size={15} className="text-[var(--color-gold-500)]" aria-hidden="true" />
                Add to watchlist
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'Cashflow') {
      return (
        <div {...common} className="flex flex-col gap-4 min-w-0">
          <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-5">
            <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-900)]">
              <Calendar size={14} className="text-[var(--color-ink-500)]" aria-hidden="true" />
              Coupon schedule
            </div>
            <ul className="mt-2 list-none p-0 m-0">
              {COUPONS.slice(0, 4).map((c) => (
                <li
                  key={c.date}
                  className="flex items-center justify-between gap-3 min-h-[44px] px-1 py-2 border-b border-dashed border-[var(--color-divider-dashed)] last:border-b-0 hover:bg-[var(--color-surface-inset)]"
                >
                  <span className="font-[family-name:var(--font-sans)] font-medium text-[13px] text-[var(--color-ink-600)]">
                    {c.date}
                    {c.note && <span className="font-normal text-[var(--color-ink-400)]"> · {c.note}</span>}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] font-bold text-[14px] tracking-[-0.01em] text-[var(--color-ink-900)] whitespace-nowrap">
                    {c.amount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    if (activeTab === 'Financials') {
      return (
        <div {...common} className="flex flex-col gap-4 min-w-0">
          <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-5">
            <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-900)]">
              <PieChart size={14} className="text-[var(--color-ink-500)]" aria-hidden="true" />
              Key metrics
            </div>
            {renderKvGrid(FINANCIALS_ROWS)}
          </div>
        </div>
      );
    }

    if (activeTab === 'Risks') {
      return (
        <div {...common} className="flex flex-col gap-4 min-w-0">
          <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-5">
            <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-900)]">
              <Shield size={14} className="text-[var(--color-ink-500)]" aria-hidden="true" />
              Risk overview
            </div>
            <p className="mt-3.5 mb-0 font-[family-name:var(--font-sans)] font-semibold text-[15px] text-[var(--color-ink-900)]">
              Low-medium risk
            </p>
            {renderKvGrid(RISK_ROWS)}
          </div>
        </div>
      );
    }

    // Documents
    return (
      <div {...common} className="flex flex-col gap-4 min-w-0">
        <div className="rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] p-5">
          <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-900)]">
            <Download size={14} className="text-[var(--color-ink-500)]" aria-hidden="true" />
            Documents
          </div>
          <ul className="mt-2 list-none p-0 m-0">
            {DOCS.map((d) => (
              <li
                key={d}
                className="flex items-center justify-between gap-3 min-h-[44px] px-1 py-2 border-b border-dashed border-[var(--color-divider-dashed)] last:border-b-0 hover:bg-[var(--color-surface-inset)]"
              >
                <span className="font-[family-name:var(--font-sans)] font-medium text-[13px] text-[var(--color-ink-600)]">{d}</span>
                <span className="font-[family-name:var(--font-mono)] font-medium text-[12px] text-[var(--color-ink-400)]">PDF</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ---------- Sidebar content (shared by desktop rail + mobile drawer) ----------
  const sidebarContent = (
    <>
      {/* Brand row */}
      <div className={classNames('flex items-center gap-2.5 px-1', collapsed && 'justify-center max-lg:justify-start')}>
        <span className="r-gold-tile w-[30px] h-[30px] rounded-[9px] grid place-items-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
          <span className="w-3 h-3 rounded-[4px] bg-white/90 [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]" />
        </span>
        {!collapsed && <span className="font-[family-name:var(--font-sans)] font-semibold text-[18px] leading-[1.2] text-[var(--color-ink-900)] whitespace-nowrap">Reprise</span>}
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="ml-auto w-8 h-8 grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-500)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors hidden max-lg:grid"
          >
            <PanelLeftClose size={18} className={classNames('transition-transform', collapsed && 'rotate-180')} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Search */}
      <div
        className={classNames(
          'flex items-center gap-2 h-[38px] px-2.5 rounded-[var(--radius-panel)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] text-[var(--color-ink-400)] focus-within:border-[var(--color-border-strong)] transition-colors',
          collapsed && 'max-lg:flex max-lg:justify-start max-lg:px-2.5 max-lg:border max-lg:border-[var(--color-border-subtle)]'
        )}
        role="search"
      >
        <Search size={16} aria-hidden="true" />
        {!collapsed && (
          <input
            type="search"
            placeholder="Search bonds, artists…"
            aria-label="Search"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none font-[family-name:var(--font-sans)] text-[13px] text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)]"
          />
        )}
        {!collapsed && (
          <span className="font-[family-name:var(--font-mono)] text-[10px] font-medium tracking-[0.02em] text-[var(--color-ink-500)] bg-[var(--color-chip-bg)] border border-[var(--color-border-subtle)] rounded-[var(--radius-chip)] px-1.5 py-0.5 whitespace-nowrap">
            ⌘F
          </span>
        )}
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation">
        <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
          <NavRow icon={Home} label="Home" />
          <NavRow icon={PieChart} label="Portfolios" />
          <li>
            <button
              type="button"
              aria-expanded="true"
              className={classNames(
                'flex items-center gap-2.5 w-full p-2 rounded-[var(--radius-control)] text-left transition-colors',
                'font-[family-name:var(--font-sans)] font-medium text-[14px] leading-[1.4]',
                'bg-[var(--color-surface-inset)] text-[var(--color-ink-900)]',
                collapsed && 'max-lg:justify-start'
              )}
            >
              <span className="w-[34px] h-[34px] -my-[7px] -ml-[7px] -mr-[2px] p-[7px] rounded-[9px] bg-[var(--color-ink-button)] text-white flex-shrink-0">
                <CandlestickChart size={20} aria-hidden="true" />
              </span>
              {!collapsed && <span>Markets</span>}
              {!collapsed && (
                <ChevronDown size={14} className="ml-auto opacity-60" aria-hidden="true" />
              )}
            </button>
            {!collapsed && (
              <ul className="ml-[23px] mt-0.5 mb-0.5 pl-3.5 border-l border-[var(--color-border-subtle)] list-none p-0 m-0 flex flex-col gap-0.5">
                <SubItem label="Equities" />
                <SubItem label="Bonds" active />
              </ul>
            )}
          </li>
          <NavRow icon={MessageSquare} label="Chats" badge="3" />
          <NavRow icon={Newspaper} label="News" />
        </ul>
      </nav>

      {/* Trial card */}
      {!collapsed && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="r-gold-tile w-[34px] h-[34px] rounded-[10px] grid place-items-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
              <Zap size={16} aria-hidden="true" />
            </span>
            <span className="ml-auto flex items-center gap-[3px] h-[18px]" aria-hidden="true">
              {[8, 13, 17, 11, 15, 9].map((h, i) => (
                <span key={i} className="r-gold-tile w-[3px] rounded-[2px]" style={{ height: h }} />
              ))}
            </span>
          </div>
          <div>
            <p className="m-0 mb-0.5 font-[family-name:var(--font-sans)] font-semibold text-[13px] text-[var(--color-ink-900)]">
              7-days free trial
            </p>
            <p className="m-0 font-[family-name:var(--font-sans)] text-[12px] leading-[1.5] text-[var(--color-ink-500)]">
              Unlock ReprAI signals and full portfolio analytics.
            </p>
          </div>
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-control)] bg-[var(--color-ink-button)] text-white font-[family-name:var(--font-sans)] font-semibold text-[13px] hover:opacity-90 transition-opacity"
          >
            Upgrade
          </button>
        </div>
      )}

      {/* Footer: settings / help / user */}
      <div className="mt-auto flex flex-col gap-0.5">
        <NavRow icon={Settings} label="Settings" />
        <NavRow icon={CircleHelp} label="Help" />
        <div className="flex items-center gap-2.5 mt-2 pt-2.5 px-2 rounded-[var(--radius-panel)] border-t border-[var(--color-border-subtle)]">
          <span className="r-gold-tile w-8 h-8 rounded-[var(--radius-full)] grid place-items-center text-white font-[family-name:var(--font-sans)] font-semibold text-[12px] flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            AO
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-[family-name:var(--font-sans)] font-semibold text-[13px] text-[var(--color-ink-900)] truncate">Amara Obi</div>
              <div className="font-[family-name:var(--font-sans)] text-[11px] text-[var(--color-ink-400)] truncate">amara@reprise.fm</div>
            </div>
          )}
          {!collapsed && <ChevronDown size={16} className="ml-auto text-[var(--color-ink-400)] flex-shrink-0" aria-hidden="true" />}
        </div>
      </div>
    </>
  );

  function NavRow({ icon: Icon, label, badge }: { icon: LucideIcon; label: string; badge?: string }) {
    return (
      <li>
        <button
          type="button"
          className={classNames(
            'flex items-center gap-2.5 w-full p-2 rounded-[var(--radius-control)] text-left transition-colors',
            'font-[family-name:var(--font-sans)] font-medium text-[14px] leading-[1.4] text-[var(--color-ink-600)]',
            'hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)]',
            collapsed && 'max-lg:justify-start'
          )}
        >
          <span className="w-5 h-5 flex-shrink-0 text-[var(--color-ink-500)] group-hover:text-[var(--color-ink-900)]">
            <Icon size={20} aria-hidden="true" />
          </span>
          {!collapsed && <span>{label}</span>}
          {!collapsed && badge && (
            <span className="ml-auto min-w-5 h-5 px-1.5 grid place-items-center rounded-[var(--radius-full)] bg-[var(--color-chip-bg)] text-[var(--color-ink-600)] font-[family-name:var(--font-mono)] text-[10px] font-medium">
              {badge}
            </span>
          )}
        </button>
      </li>
    );
  }

  function SubItem({ label, active }: { label: string; active?: boolean }) {
    return (
      <li>
        <button
          type="button"
          className={classNames(
            'relative flex items-center gap-2 w-full p-1.5 pl-2 rounded-[var(--radius-control)] text-left transition-colors',
            'font-[family-name:var(--font-sans)] font-medium text-[13px]',
            active ? 'text-[var(--color-ink-900)]' : 'text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]'
          )}
        >
          <span
            className={classNames(
              'absolute -left-[14px] top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full',
              active ? 'bg-[var(--color-gold-500)]' : 'bg-[var(--color-border-strong)] group-hover:bg-[var(--color-gold-500)]'
            )}
            aria-hidden="true"
          />
          {label}
        </button>
      </li>
    );
  }

  return (
    <div className={classNames('reprise-dashboard relative min-h-screen bg-[#B97A2E]', dark && 'dark')}>
      {/* inject scoped design tokens */}
      <style>{REPRISE_CSS}</style>

      {/* Full-bleed golden-hour wallpaper */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(232,179,60,.34) 0%, rgba(217,150,43,.18) 45%, rgba(120,70,12,.40) 100%), url("' +
            WALLPAPER_URL +
            '")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: dark ? 'brightness(.72) saturate(1.05)' : undefined,
        }}
      />

      <div className={frameClass}>
        {/* Desktop sidebar (in-flow, collapse-able) */}
        <aside
          className={classNames(
            'hidden max-lg:flex flex-col flex-shrink-0 border-r border-[var(--color-border-subtle)] overflow-y-auto r-scroll transition-[width] duration-200',
            collapsed ? 'w-[76px] px-2' : 'w-[264px] px-4'
          )}
          aria-label="Primary"
        >
          <div className="flex flex-col gap-8 py-5">{sidebarContent}</div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <aside
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[264px] overflow-y-auto r-scroll bg-[var(--color-canvas)] shadow-[24px_0_60px_rgba(90,60,10,0.2)]"
              aria-label="Primary"
            >
              <div className="flex flex-col gap-8 py-5 px-4">{sidebarContent}</div>
            </aside>
          </>
        )}

        {/* Main */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar */}
          <header className="h-14 flex-shrink-0 flex items-center justify-between gap-3 px-5 max-sm:px-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-canvas)]/90 backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0 font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-400)] whitespace-nowrap">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                className="hidden max-lg:grid w-[34px] h-[34px] place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-500)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors"
              >
                <Menu size={18} aria-hidden="true" />
              </button>
              <span className="hidden max-sm:inline">MARKETS&nbsp;/</span>
              <span className="hidden max-sm:inline px-2.5 py-1 border border-[var(--color-border-strong)] rounded-[var(--radius-full)] text-[var(--color-ink-900)] truncate max-w-[38vw]">
                Catalog royalty bond
              </span>
              <span className="max-sm:hidden">MARKETS&nbsp;/</span>
              <span className="max-sm:hidden px-2.5 py-1 border border-[var(--color-border-strong)] rounded-[var(--radius-full)] text-[var(--color-ink-900)]">
                Catalog royalty bond
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setDark(!dark)}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-pressed={dark}
                className="w-[34px] h-[34px] grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-500)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors"
              >
                {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              </button>
              <button
                type="button"
                aria-label="Notifications"
                className="relative w-[34px] h-[34px] grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-500)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors"
              >
                <Bell size={18} aria-hidden="true" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[var(--color-danger-500)] border-[1.5px] border-[var(--color-canvas)]" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Help"
                className="w-[34px] h-[34px] grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-500)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors"
              >
                <CircleHelp size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-[7px] h-9 px-3.5 ml-1 rounded-[var(--radius-full)] bg-[var(--color-ink-button)] text-white font-[family-name:var(--font-sans)] font-semibold text-[13px] whitespace-nowrap hover:opacity-90 transition-opacity max-sm:px-3"
              >
                <Sparkles size={15} aria-hidden="true" />
                <span className="max-sm:hidden">Ask ReprAI</span>
              </button>
            </div>
          </header>

          {workspace}
        </div>
      </div>
    </div>
  );
}
