'use client';

/**
 * BIGDROPS OPERATIONS DASHBOARD — rebuilt in the Reprise design language.
 * Spec: docs/TEMPLATES/Designsdotmds/reprise.md
 * Content/features preserved from Golden-dashboard.tsx: workspaces,
 * companies, KPI metrics, action items, ledger documents, activity trail,
 * company switcher, workspace settings modal, quick-create menu, the five
 * main sections (Dashboard/Invoices/Projects/Analytics/Settings), sidebar
 * nav, notifications. Light warm-paper theme by default; optional dark
 * toggle. Self-contained: mock data only, no Supabase, no app imports.
 *
 * ── Tailwind v4 consumers ─────────────────────────────────────────────
 * Drop REPRISE_THEME into your CSS entry (src/index.css) so Tailwind v4
 * generates the semantic utilities. The component ALSO injects the same
 * tokens scoped to .reprise-dashboard (REPRISE_CSS), so it renders
 * standalone with var() utilities in any Tailwind version.
 *
 * ── Fonts ─────────────────────────────────────────────────────────────
 * Host app should load JetBrains Mono (brand/data voice) + Inter
 * (UI/body voice); the stacks fall back to ui-monospace / system-ui.
 */

import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Menu,
  Search,
  RotateCw,
  Moon,
  Sun,
  Bell,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  Home,
  Receipt,
  FolderKanban,
  PieChart,
  TriangleAlert,
  FileCheck2,
  ArrowRight,
  History,
  Building2,
  Wallet,
  FilePlus,
  HeartHandshake,
  Users,
  FilePenLine,
  Settings,
  Truck,
  Check,
  Info,
} from 'lucide-react';

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
// TOKENS — scoped CSS custom properties + component helpers
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
.reprise-dashboard .r-tile-warn { background: linear-gradient(135deg, #E8A232, #B4770F); }
.reprise-dashboard .r-tile-bad { background: linear-gradient(135deg, #F87171, #B91C1C); }
.reprise-dashboard .r-hero-fill {
  background:
    linear-gradient(180deg, rgba(214, 148, 51, .18), rgba(120, 70, 12, .28)),
    var(--gradient-gold-tile);
}

/* status pills (microscopic semantic color per reprise.md) */
.reprise-dashboard .r-pill {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 999px;
  font-family: var(--font-mono); font-size: 9.5px; font-weight: 600;
  letter-spacing: .04em; text-transform: uppercase; white-space: nowrap;
}
.reprise-dashboard .r-pill-paid { background: color-mix(in srgb, var(--color-success-500) 14%, transparent); color: var(--color-success-600); }
.reprise-dashboard .r-pill-pending { background: color-mix(in srgb, var(--color-gold-500) 16%, transparent); color: var(--color-gold-700); }
.reprise-dashboard .r-pill-overdue { background: color-mix(in srgb, var(--color-danger-500) 12%, transparent); color: var(--color-danger-500); }

/* activity timeline */
.reprise-dashboard .r-tl { position: relative; padding-left: 18px; }
.reprise-dashboard .r-tl::before {
  content: ""; position: absolute; left: 4px; top: 6px; bottom: 6px;
  width: 1px; background: var(--color-border-subtle);
}
.reprise-dashboard .r-tl-item { position: relative; padding-bottom: 16px; }
.reprise-dashboard .r-tl-item:last-child { padding-bottom: 0; }
.reprise-dashboard .r-tl-item::before {
  content: ""; position: absolute; left: -18px; top: 4px;
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--color-gold-500);
  box-shadow: 0 0 0 3px var(--color-surface-card);
}

/* hairline scrollbars */
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
// MOCK DATA — mirrors Golden-dashboard.tsx exactly
// ============================================================
interface Workspace {
  id: string;
  name: string;
  code: string;
  plan: 'Enterprise' | 'Professional' | 'Starter';
  region: string;
  membersCount: number;
  companiesCount: number;
}

interface Company {
  id: string;
  workspaceId: string;
  name: string;
  code: string;
  type: string;
  currency: string;
  taxId: string;
  activeStatus: string;
}

interface CompanyKPIs {
  cashReceived: string;
  cashReceivedTrend: string;
  outstanding: string;
  unpaidCount: number;
  createdTodayCount: number;
  overdueQuotesAmount: string;
  overdueQuotesCount: number;
}

interface AlertItem {
  id: string;
  companyId: string;
  type: 'amber' | 'red' | 'green' | 'reminder';
  title: string;
  subtitle: string;
  time: string;
  actionText?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  read: boolean;
}

interface DocumentItem {
  id: string;
  companyId: string;
  ref: string;
  client: string;
  date: string;
  amount: string;
  currency: string;
  status: 'paid' | 'pending' | 'overdue';
}

interface AuditEvent {
  id: string;
  workspaceId: string;
  companyId?: string;
  scope: 'workspace' | 'company';
  companyCode?: string;
  title: string;
  desc: string;
  time: string;
  actor: string;
}

const INITIAL_WORKSPACES: Workspace[] = [
  { id: 'w1', name: 'Big Drops Enterprise Group', code: 'BDE', plan: 'Enterprise', region: 'NG-Lagos (HQ)', membersCount: 42, companiesCount: 3 },
  { id: 'w2', name: 'Apex Syndicate Holdings', code: 'ASH', plan: 'Professional', region: 'UK-London', membersCount: 14, companiesCount: 2 },
];

const INITIAL_COMPANIES: Company[] = [
  { id: 'c11', workspaceId: 'w1', name: 'Sun & Shield Power', code: 'SSP', type: 'Energy & Renewables', currency: '₦', taxId: 'TIN-9042811-SSP', activeStatus: 'Active Operational' },
  { id: 'c12', workspaceId: 'w1', name: 'Pygar Logistics & Trade', code: 'PYG', type: 'Freight & Supply Chain', currency: '₦', taxId: 'TIN-4019283-PYG', activeStatus: 'Active Operational' },
  { id: 'c13', workspaceId: 'w1', name: 'Century Mining Co.', code: 'CMC', type: 'Heavy Resources & Extraction', currency: '₦', taxId: 'TIN-1102934-CMC', activeStatus: 'Active Operational' },
  { id: 'c21', workspaceId: 'w2', name: 'Helios Clean Energy UK', code: 'HCE', type: 'Solar Infrastructure', currency: '£', taxId: 'GB-9920192-HCE', activeStatus: 'Active Operational' },
  { id: 'c22', workspaceId: 'w2', name: 'Zenith Global Shipping', code: 'ZGS', type: 'Maritime Freight', currency: '$', taxId: 'US-8819201-ZGS', activeStatus: 'Active Operational' },
];

const MOCK_KPIS: Record<string, CompanyKPIs> = {
  c11: { cashReceived: '14.2M', cashReceivedTrend: 'Cleared Today', outstanding: '8.5M', unpaidCount: 2, createdTodayCount: 3, overdueQuotesAmount: '12.5M', overdueQuotesCount: 3 },
  c12: { cashReceived: '38.9M', cashReceivedTrend: 'Cleared This Week', outstanding: '19.4M', unpaidCount: 5, createdTodayCount: 6, overdueQuotesAmount: '4.2M', overdueQuotesCount: 1 },
  c13: { cashReceived: '84.0M', cashReceivedTrend: 'Cleared Today', outstanding: '42.5M', unpaidCount: 8, createdTodayCount: 2, overdueQuotesAmount: '18.0M', overdueQuotesCount: 4 },
  c21: { cashReceived: '1.25M', cashReceivedTrend: 'Wire Confirmed', outstanding: '420K', unpaidCount: 1, createdTodayCount: 4, overdueQuotesAmount: '150K', overdueQuotesCount: 2 },
  c22: { cashReceived: '3.80M', cashReceivedTrend: 'L/C Settled', outstanding: '1.10M', unpaidCount: 3, createdTodayCount: 5, overdueQuotesAmount: '680K', overdueQuotesCount: 1 },
};

const INITIAL_ALERTS: AlertItem[] = [
  { id: 'a0', companyId: 'c11', type: 'reminder', title: "Have you recorded today's customer payments?", subtitle: 'Sun & Shield Power • Cash Ledger', time: 'Payment Action', actionText: 'Record Payment' },
  { id: 'a1', companyId: 'c11', type: 'amber', title: 'Invoice INV-204 has not received payment for 30 days', subtitle: 'Sun & Shield Power • ₦14,200,000 overdue', time: '30d Overdue' },
  { id: 'a2', companyId: 'c11', type: 'red', title: 'Payment of ₦8.5M from Zenith Logix is overdue', subtitle: 'SSP Legal notice generated & ready for dispatch', time: 'Action Req.' },
  { id: 'a3', companyId: 'c12', type: 'amber', title: 'Waybill #WAY-902 unconfirmed at Port Harcourt terminal', subtitle: 'Pygar Logistics • Customs clearance pending', time: 'Port Delay' },
  { id: 'a4', companyId: 'c12', type: 'red', title: 'Freight Invoice #PYG-881 unpaid (₦19.4M)', subtitle: 'Dangote Sub-contractor billing hold', time: 'Action Req.' },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', title: 'Invoice INV-204 Payment Warning', detail: 'Overdue by 30 days. Client notified via automated email.', time: '10m ago', read: false },
  { id: 'n2', title: 'New Quote Approved', detail: 'Lagos Solar Grid approved SASQUO-322 for ₦3,923,750.', time: '45m ago', read: false },
  { id: 'n3', title: 'Workspace Backup Completed', detail: 'BDE Enterprise Group database state synced safely.', time: '2h ago', read: true },
];

const INITIAL_DOCUMENTS: DocumentItem[] = [
  { id: 'd1', companyId: 'c11', ref: 'SASQUO-322', client: 'Lagos Solar Grid Project', date: '8 Aug 2026', amount: '3,923,750', currency: '₦', status: 'pending' },
  { id: 'd2', companyId: 'c11', ref: 'SASINV076', client: 'Eko Atlantic Power Hub', date: '7 Aug 2026', amount: '5,251,375', currency: '₦', status: 'paid' },
  { id: 'd3', companyId: 'c11', ref: 'SASQUO-321', client: 'Ikeja Industrial Zone', date: '7 Aug 2026', amount: '145,125', currency: '₦', status: 'pending' },
  { id: 'd4', companyId: 'c11', ref: 'SASINV075', client: 'Lekki Free Zone Ltd', date: '7 Aug 2026', amount: '948,150', currency: '₦', status: 'paid' },
  { id: 'd5', companyId: 'c12', ref: 'PYGINV-801', client: 'Apapa Container Terminal', date: '8 Aug 2026', amount: '18,500,000', currency: '₦', status: 'overdue' },
  { id: 'd6', companyId: 'c12', ref: 'PYGQUO-119', client: 'Bags & Cargo Logistics', date: '6 Aug 2026', amount: '4,200,000', currency: '₦', status: 'pending' },
  { id: 'd7', companyId: 'c13', ref: 'CMCINV-004', client: 'Plateau Quarry Operator', date: '8 Aug 2026', amount: '42,500,000', currency: '₦', status: 'overdue' },
];

const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  { id: 'e0', workspaceId: 'w1', scope: 'workspace', title: 'New Company Provisioned in Workspace', desc: 'Century Mining Co. (CMC) added to Big Drops Enterprise Group.', time: '2h ago', actor: 'Workspace Admin (Milad A.)' },
  { id: 'e1', workspaceId: 'w1', companyId: 'c11', scope: 'company', companyCode: 'SSP', title: 'Invoice #SASINV076 Payment Cleared', desc: '₦5,251,375 wire confirmed via FirstBank Merchant portal for Sun & Shield Power.', time: '12m ago', actor: 'Sola Adebayo' },
  { id: 'e2', workspaceId: 'w1', companyId: 'c12', scope: 'company', companyCode: 'PYG', title: 'Waybill #WAY-902 Dispatched', desc: 'Container release notes authorized for Pygar Logistics at Port Harcourt.', time: '45m ago', actor: 'Tunde Bakare' },
];

const PROJECTS = [
  { title: 'Grid Substation Upgrade Phase 2', status: 'In Progress', progress: '68%' },
  { title: 'Port Harcourt Terminal Customs Clearance', status: 'Pending Review', progress: '30%' },
  { title: 'Quarry Machinery Procurement Sign-off', status: 'Completed', progress: '100%' },
];

const COMPANY_TYPES = [
  'Logistics & Services', 'Energy & Renewables', 'Freight & Supply Chain',
  'Heavy Resources & Extraction', 'Solar Infrastructure', 'Maritime Freight',
  'Agriculture & Processing', 'Technology & Media',
];

const RAIL_TABS = ['Overview', 'Ledger', 'Analytics', 'Activity', 'Alerts'];

type Tab = 'home' | 'invoices' | 'projects' | 'analytics' | 'settings';
type RailTab = 'overview' | 'ledger' | 'analytics' | 'activity' | 'alerts';

// PLACEHOLDER photos — swap for brand imagery. Warm gradient layers
// keep the ambience if the photos are unreachable offline.
const WALLPAPER_URL = 'https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=1800&q=80';
const HERO_PHOTO = 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1000&q=80';

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

// ============================================================
// COMPONENT
// ============================================================
export default function BigdropsRepriseDashboard() {
  const [workspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(INITIAL_WORKSPACES[0]);
  const workspaceCompanies = companies.filter((c) => c.workspaceId === activeWorkspace.id);
  const [activeCompany, setActiveCompany] = useState<Company>(INITIAL_COMPANIES[0]);

  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [railTab, setRailTab] = useState<RailTab>('overview');
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [companySwitcherOpen, setCompanySwitcherOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [newCompanyModalOpen, setNewCompanyModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [contextToast, setContextToast] = useState<string | null>(null);

  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCode, setNewCompanyCode] = useState('');
  const [newCompanyType, setNewCompanyType] = useState('Logistics & Services');

  // keep active company valid when workspace switches
  useEffect(() => {
    const valid = companies.filter((c) => c.workspaceId === activeWorkspace.id);
    if (valid.length > 0 && !valid.some((c) => c.id === activeCompany.id)) {
      setActiveCompany(valid[0]);
    }
  }, [activeWorkspace, companies]); // eslint-disable-line react-hooks/exhaustive-deps

  // close the mobile drawer on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (!contextToast) return;
    const t = setTimeout(() => setContextToast(null), 2800);
    return () => clearTimeout(t);
  }, [contextToast]);

  const triggerToast = (msg: string) => setContextToast(msg);

  const currentKPIs: CompanyKPIs =
    MOCK_KPIS[activeCompany.id] ?? {
      cashReceived: '0.00', cashReceivedTrend: 'No records', outstanding: '0.00',
      unpaidCount: 0, createdTodayCount: 0, overdueQuotesAmount: '0.00', overdueQuotesCount: 0,
    };

  const scopedAlerts = INITIAL_ALERTS.filter((a) => a.companyId === activeCompany.id);
  const scopedDocuments = INITIAL_DOCUMENTS.filter((d) => d.companyId === activeCompany.id);
  const scopedAudit = INITIAL_AUDIT_EVENTS.filter(
    (e) => e.companyId === activeCompany.id || e.workspaceId === activeWorkspace.id
  );
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ---------- actions ----------
  const closePopovers = () => {
    setNotifOpen(false);
    setQuickCreateOpen(false);
    setSearchOpen(false);
  };

  const selectCompany = (comp: Company) => {
    setActiveCompany(comp);
    setCompanySwitcherOpen(false);
    triggerToast(`Switched operating company to: ${comp.name} [${comp.code}]`);
  };

  const selectWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws);
    const first = companies.find((c) => c.workspaceId === ws.id);
    if (first) setActiveCompany(first);
    triggerToast(`Active workspace updated to: ${ws.name}`);
  };

  const navigateTo = (tab: Tab, label: string) => {
    setActiveTab(tab);
    setMobileOpen(false);
    triggerToast(`Navigated to ${label}`);
  };

  const createCompany = (e: FormEvent) => {
    e.preventDefault();
    const name = newCompanyName.trim();
    const code = newCompanyCode.trim().toUpperCase();
    if (!name || !code) return;
    const created: Company = {
      id: `c_${Date.now()}`,
      workspaceId: activeWorkspace.id,
      name,
      code,
      type: newCompanyType,
      currency: '₦',
      taxId: `TIN-${Math.floor(100000 + Math.random() * 900000)}-${code}`,
      activeStatus: 'Active Operational',
    };
    setCompanies((prev) => [...prev, created]);
    setActiveCompany(created);
    setNewCompanyModalOpen(false);
    setNewCompanyName('');
    setNewCompanyCode('');
    triggerToast(`Company "${created.name}" created under ${activeWorkspace.code}`);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      triggerToast('Data synchronized with cloud workspace');
    }, 600);
  };

  const clearNotifications = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    triggerToast('Marked all notifications as read');
  };

  const quickCreate = (label: string) => {
    closePopovers();
    triggerToast(`Generating ${label} for ${activeCompany.name}`);
  };

  // ============================================================
  // SHARED PIECES
  // ============================================================
  const mono = 'font-[family-name:var(--font-mono)]';
  const sans = 'font-[family-name:var(--font-sans)]';
  const micro = 'text-[11px] font-medium uppercase tracking-[0.06em]';
  const cardShell = 'rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]';

  const MicroHeader = ({ icon, children, right }: { icon?: ReactNode; children: ReactNode; right?: ReactNode }) => (
    <div className="flex items-center justify-between gap-3">
      <div className={classNames(mono, micro, 'text-[var(--color-ink-900)] flex items-center gap-2')}>
        {icon && <span className="text-[var(--color-ink-500)]">{icon}</span>}
        {children}
      </div>
      {right}
    </div>
  );

  const DashedRow = ({ children }: { children: ReactNode }) => (
    <div className="flex items-center gap-3 min-h-[44px] px-1 py-2 border-b border-dashed border-[var(--color-divider-dashed)] last:border-b-0 hover:bg-[var(--color-surface-inset)] transition-colors">
      {children}
    </div>
  );

  const StatusPill = ({ status }: { status: DocumentItem['status'] }) => (
    <span className={classNames('r-pill', status === 'paid' ? 'r-pill-paid' : status === 'pending' ? 'r-pill-pending' : 'r-pill-overdue')}>
      {status}
    </span>
  );

  const KvGrid = ({ rows }: { rows: Array<[string, string]> }) => (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-[11px] mt-3.5">
      {rows.map(([k, v]) => (
        <FragmentRow key={k} k={k} v={v} />
      ))}
    </dl>
  );

  const FragmentRow = ({ k, v }: { k: string; v: string }) => (
    <>
      <dt className={classNames(sans, 'text-[13px] text-[var(--color-ink-500)]')}>{k}</dt>
      <dd className={classNames(sans, 'm-0 font-semibold text-[13px] text-[var(--color-ink-900)] text-right whitespace-nowrap')}>{v}</dd>
    </>
  );

  const BarRow = ({ label, pct, gold }: { label: string; pct: string; gold: boolean }) => (
    <div className="mt-4">
      <div className={classNames(sans, 'flex justify-between text-[12px] text-[var(--color-ink-600)] mb-1.5')}>
        <span>{label}</span>
        <span className={classNames(mono, 'font-semibold text-[var(--color-ink-900)]')}>{pct}</span>
      </div>
      <div className="h-2.5 rounded-[var(--radius-full)] bg-[var(--color-surface-inset)] border border-[var(--color-border-subtle)] overflow-hidden">
        <div
          className={classNames(
            'h-full rounded-[inherit]',
            gold ? 'bg-gradient-to-r from-[#F3BD48] to-[#D9962B]' : 'bg-[var(--color-chart-neutral)]'
          )}
          style={{ width: pct }}
        />
      </div>
    </div>
  );

  const Timeline = () => (
    <div className="r-tl mt-3">
      {scopedAudit.slice(0, 3).map((evt) => (
        <div key={evt.id} className="r-tl-item">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-[var(--radius-chip)] bg-[var(--color-chip-bg)] font-[family-name:var(--font-mono)] text-[9px] font-semibold tracking-[0.04em] text-[var(--color-gold-700)]">
              {evt.companyCode || activeCompany.code}
            </span>
            <span className={classNames(mono, 'text-[10px] font-medium text-[var(--color-ink-400)]')}>{evt.time}</span>
          </div>
          <div className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] mt-1')}>{evt.title}</div>
          <div className={classNames(sans, 'text-[12px] text-[var(--color-ink-500)] mt-0.5 leading-[1.5]')}>{evt.desc}</div>
        </div>
      ))}
    </div>
  );

  const NotifItem = ({ n }: { n: NotificationItem }) => (
    <div className={classNames('p-2.5 rounded-[var(--radius-panel)] border mt-2', n.read ? 'border-[var(--color-border-subtle)]' : 'border-[var(--color-gold-500)] bg-[rgba(217,150,43,0.10)]')}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={classNames(sans, 'font-semibold text-[12.5px] leading-[1.35] text-[var(--color-ink-900)]')}>{n.title}</span>
        <span className={classNames(mono, 'text-[9.5px] text-[var(--color-ink-400)] whitespace-nowrap')}>{n.time}</span>
      </div>
      <div className={classNames(sans, 'text-[11.5px] text-[var(--color-ink-500)] mt-0.5 leading-[1.45]')}>{n.detail}</div>
    </div>
  );

  // ============================================================
  // SIDEBAR CONTENT
  // ============================================================
  const navGroups: Array<{ group: string; items: Array<{ label: string; tab: Tab; icon: LucideIcon; badge?: string; subs?: Array<{ label: string; tab: Tab; icon: LucideIcon }> }> }> = [
    {
      group: 'Operations',
      items: [
        { label: 'Dashboard', tab: 'home', icon: Home, subs: [{ label: 'Client Directory', tab: 'home', icon: Users }] },
        { label: 'Invoices', tab: 'invoices', icon: Receipt, subs: [{ label: 'Quotations & BOQ', tab: 'invoices', icon: FilePenLine }] },
        { label: 'Projects', tab: 'projects', icon: FolderKanban, subs: [{ label: 'Waybills & Shipping', tab: 'projects', icon: Truck }] },
        { label: 'Analytics', tab: 'analytics', icon: PieChart },
      ],
    },
    {
      group: 'System',
      items: [{ label: 'Settings', tab: 'settings', icon: Settings }],
    },
  ];

  const sidebarContent = (forceExpanded: boolean) => {
    const showLabels = !collapsed || forceExpanded;
    return (
      <>
        {/* Brand row */}
        <div className={classNames('flex items-center gap-2.5 px-1', !showLabels && 'justify-center')}>
          <span className="r-gold-tile w-[30px] h-[30px] rounded-[9px] grid place-items-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
            <span className="w-3 h-3 rounded-[4px] bg-white/90 [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]" />
          </span>
          {showLabels && <span className={classNames(sans, 'font-semibold text-[18px] leading-[1.2] tracking-[0.02em] text-[var(--color-ink-900)] whitespace-nowrap')}>BIGDROPS</span>}
          {showLabels && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="ml-auto w-8 h-8 grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-500)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors max-lg:hidden"
            >
              <PanelClose className={classNames('transition-transform', collapsed && 'rotate-180')} />
            </button>
          )}
        </div>

        {/* Search */}
        <div className={classNames('flex items-center gap-2 h-[38px] px-2.5 rounded-[var(--radius-panel)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] text-[var(--color-ink-400)] focus-within:border-[var(--color-border-strong)] transition-colors')} role="search">
          <Search size={16} aria-hidden="true" />
          {showLabels && (
            <input
              type="search"
              placeholder="Search docs, clients…"
              aria-label="Search"
              className="flex-1 min-w-0 bg-transparent border-0 outline-none font-[family-name:var(--font-sans)] text-[13px] text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)]"
            />
          )}
          {showLabels && (
            <span className={classNames(mono, 'text-[10px] font-medium tracking-[0.02em] text-[var(--color-ink-500)] bg-[var(--color-chip-bg)] border border-[var(--color-border-subtle)] rounded-[var(--radius-chip)] px-1.5 py-0.5 whitespace-nowrap')}>
              ⌘F
            </span>
          )}
        </div>

        {/* Nav groups */}
        {navGroups.map((group) => (
          <nav key={group.group} aria-label={group.group}>
            {showLabels && (
              <p className={classNames(mono, micro, 'px-2.5 pb-1.5 text-[var(--color-ink-400)] m-0')}>{group.group}</p>
            )}
            <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.tab;
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => navigateTo(item.tab, item.label)}
                      aria-expanded={item.subs ? active : undefined}
                      className={classNames(
                        'flex items-center gap-2.5 w-full p-2 rounded-[var(--radius-control)] text-left transition-colors',
                        sans, 'font-medium text-[14px] leading-[1.4]',
                        active ? 'bg-[var(--color-surface-inset)] text-[var(--color-ink-900)]' : 'text-[var(--color-ink-600)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)]'
                      )}
                    >
                      <span
                        className={classNames(
                          'flex-shrink-0',
                          active && 'w-[34px] h-[34px] -my-[7px] -ml-[7px] -mr-[2px] p-[7px] rounded-[9px] bg-[var(--color-ink-button)] text-white'
                        )}
                      >
                        <Icon size={active ? 20 : 18} aria-hidden="true" />
                      </span>
                      {showLabels && <span>{item.label}</span>}
                      {showLabels && item.badge && (
                        <span className="ml-auto min-w-5 h-5 px-1.5 grid place-items-center rounded-[var(--radius-full)] bg-[var(--color-chip-bg)] text-[var(--color-ink-600)] font-[family-name:var(--font-mono)] text-[10px] font-medium">
                          {item.badge}
                        </span>
                      )}
                      {showLabels && item.subs && <ChevronDown size={14} className="ml-auto opacity-60" aria-hidden="true" />}
                    </button>
                    {showLabels && item.subs && (
                      <ul className="ml-[23px] mt-0.5 mb-0.5 pl-3.5 border-l border-[var(--color-border-subtle)] list-none p-0 m-0 flex flex-col gap-0.5">
                        {item.subs.map((sub) => {
                          const SubIcon = sub.icon;
                          const subActive = activeTab === sub.tab;
                          return (
                            <li key={sub.label}>
                              <button
                                type="button"
                                onClick={() => navigateTo(sub.tab, sub.label)}
                                className={classNames(
                                  'relative flex items-center gap-2 w-full p-1.5 pl-2 rounded-[var(--radius-control)] text-left transition-colors',
                                  sans, 'font-medium text-[13px]',
                                  subActive ? 'text-[var(--color-ink-900)]' : 'text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]'
                                )}
                              >
                                <span className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[var(--color-gold-500)]" aria-hidden="true" />
                                <SubIcon size={13} className="text-[var(--color-ink-400)]" aria-hidden="true" />
                                {sub.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}

        {/* Workspace context card */}
        {showLabels && (
          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className={classNames(cardShell, 'p-4 text-left flex flex-col gap-2.5 hover:border-[var(--color-border-strong)] transition-colors')}
          >
            <span className="flex items-center gap-2.5">
              <span className="r-gold-tile w-[34px] h-[34px] rounded-[10px] grid place-items-center text-white font-[family-name:var(--font-mono)] font-semibold text-[11px] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                {activeWorkspace.code}
              </span>
              <span className="ml-auto text-[var(--color-ink-400)]"><Building2 size={16} aria-hidden="true" /></span>
            </span>
            <span>
              <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] block')}>{activeWorkspace.name}</span>
              <span className={classNames(sans, 'text-[12px] leading-[1.5] text-[var(--color-ink-500)] block')}>
                {activeWorkspace.plan} • {activeWorkspace.region} • {activeWorkspace.membersCount} members
              </span>
            </span>
            <span className={classNames('inline-flex items-center justify-center gap-2 h-9 px-4 rounded-[var(--radius-control)] bg-[var(--color-ink-button)] text-white', sans, 'font-semibold text-[13px]')}>
              Manage workspace
            </span>
          </button>
        )}

        {/* Footer */}
        <div className="mt-auto flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => navigateTo('settings', 'Preferences')}
            className={classNames(
              'flex items-center gap-2.5 w-full p-2 rounded-[var(--radius-control)] text-left transition-colors',
              sans, 'font-medium text-[14px] leading-[1.4] text-[var(--color-ink-600)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)]'
            )}
          >
            <span className="w-5 h-5 flex-shrink-0 text-[var(--color-ink-500)]"><Settings size={18} aria-hidden="true" /></span>
            {showLabels && <span>Preferences</span>}
          </button>
          <div className="flex items-center gap-2.5 mt-2 pt-2.5 px-2 rounded-[var(--radius-panel)] border-t border-[var(--color-border-subtle)]">
            <span className="r-gold-tile w-8 h-8 rounded-[var(--radius-full)] grid place-items-center text-white font-[family-name:var(--font-sans)] font-semibold text-[12px] flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
              MA
            </span>
            {showLabels && (
              <span className="min-w-0">
                <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] block truncate')}>Milad A.</span>
                <span className={classNames(sans, 'text-[11px] text-[var(--color-ink-400)] block truncate')}>Workspace Admin</span>
              </span>
            )}
            {showLabels && <ChevronDown size={16} className="ml-auto text-[var(--color-ink-400)] flex-shrink-0" aria-hidden="true" />}
          </div>
        </div>
      </>
    );
  };

  // lucide's PanelLeftClose is renamed in some versions; use a local alias
  const PanelClose = ({ className }: { className?: string }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M15 3v18" />
      <path d="m8 9-3 3 3 3" />
    </svg>
  );

  // ============================================================
  // HOME: CENTER COLUMN
  // ============================================================
  const hero = (
    <div className="relative h-[208px] max-sm:h-[264px] rounded-[var(--radius-hero)] overflow-hidden border border-white/35 shadow-[var(--shadow-card)] isolate">
      {/* PLACEHOLDER: golden-hour photograph for the active operating company */}
      <img src={HERO_PHOTO} alt={`${activeCompany.name} company imagery`} className="absolute inset-0 w-full h-full object-cover object-center" />
      <div className="r-hero-overlay absolute inset-0 z-[1]" aria-hidden="true" />
      <div className="relative z-[2] h-full flex flex-col justify-center gap-2 px-8 py-6 max-sm:px-5 max-w-[62%] max-sm:max-w-full">
        <h1 className={classNames(mono, 'm-0 font-bold text-[27px] max-sm:text-[23px] leading-[1.15] tracking-[-0.02em] text-white')}>
          {activeCompany.name}
        </h1>
        <p className={classNames(mono, micro, 'm-0 text-white/85')}>
          {activeCompany.type} · {activeWorkspace.name}
        </p>
      </div>
      <div className="absolute left-7 bottom-4 max-sm:left-5 z-[2] flex flex-wrap gap-2 max-w-[80%] max-sm:max-w-[calc(100%-40px)]">
        {[activeCompany.activeStatus, activeCompany.taxId, `Currency ${activeCompany.currency}`].map((t) => (
          <span
            key={t}
            className="inline-flex items-center px-3 py-1.5 rounded-[var(--radius-full)] bg-white/15 border border-white/35 backdrop-blur-md font-[family-name:var(--font-mono)] text-[11px] font-medium uppercase tracking-[0.04em] text-white whitespace-nowrap"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );

  const kpiStrip = (
    <div className="grid grid-cols-4 max-[1220px]:grid-cols-2 max-sm:grid-cols-2 rounded-[var(--radius-card)] bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]" role="group" aria-label="Company key figures">
      {[
        { label: 'Cash received', value: `${activeCompany.currency}${currentKPIs.cashReceived}`, sub: <span className="text-[var(--color-success-600)]">{currentKPIs.cashReceivedTrend}</span> },
        { label: 'Outstanding', value: `${activeCompany.currency}${currentKPIs.outstanding}`, sub: <span className="text-[var(--color-danger-500)]">{currentKPIs.unpaidCount} unpaid invoices</span> },
        { label: 'Created today', value: `${currentKPIs.createdTodayCount} docs`, sub: `${activeCompany.code} invoices & quotes` },
        { label: 'Expired quotes', value: `${activeCompany.currency}${currentKPIs.overdueQuotesAmount}`, sub: <span className="text-[var(--color-gold-700)]">{currentKPIs.overdueQuotesCount} pending sign-off</span> },
      ].map((k, i) => (
        <div
          key={k.label}
          className={classNames(
            'flex flex-col gap-1.5 px-5 py-4 min-w-0 max-sm:px-4',
            i > 0 && 'border-l border-[var(--color-border-subtle)] max-[1220px]:border-l-0 max-sm:border-l-0',
            i % 2 === 1 && 'max-[1220px]:border-l max-[1220px]:border-[var(--color-border-subtle)]',
            i >= 2 && 'max-[1220px]:border-t max-[1220px]:border-[var(--color-border-subtle)]'
          )}
        >
          <span className={classNames(mono, micro, 'text-[var(--color-ink-400)]')}>{k.label}</span>
          <span className={classNames(mono, 'font-bold text-[22px] leading-[1.15] tracking-[-0.01em] text-[var(--color-ink-900)] whitespace-nowrap')}>{k.value}</span>
          <span className={classNames(sans, 'text-[11px] font-medium text-[var(--color-ink-500)]')}>{k.sub}</span>
        </div>
      ))}
    </div>
  );

  const actionCard = (
    <div className={classNames(cardShell, 'p-5')}>
      <MicroHeader
        icon={<TriangleAlert size={14} aria-hidden="true" />}
        right={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[var(--color-chip-bg)] border border-[var(--color-border-subtle)] font-[family-name:var(--font-mono)] text-[10px] font-semibold text-[var(--color-ink-600)] whitespace-nowrap">
            {scopedAlerts.length} active
          </span>
        }
      >
        Action items
      </MicroHeader>
      <div className="mt-2">
        {scopedAlerts.length === 0 ? (
          <p className={classNames(sans, 'text-[12px] text-[var(--color-ink-500)] px-1 py-3.5 m-0')}>
            No pending action items for {activeCompany.name}.
          </p>
        ) : (
          scopedAlerts.map((a) => {
            const Reminder = a.type === 'reminder';
            const Bad = a.type === 'red';
            return (
              <DashedRow key={a.id}>
                <span className={classNames('w-9 h-9 flex-shrink-0 rounded-[10px] grid place-items-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]', Reminder ? 'r-gold-tile' : Bad ? 'r-tile-bad' : 'r-tile-warn')}>
                  {Reminder ? <Wallet size={16} aria-hidden="true" /> : <TriangleAlert size={16} aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] block truncate')}>{a.title}</span>
                  <span className={classNames(sans, 'text-[11.5px] text-[var(--color-ink-500)] block truncate')}>{a.subtitle}</span>
                </span>
                <span className="text-right flex-shrink-0">
                  <span className={classNames(mono, 'text-[10px] font-medium text-[var(--color-ink-400)] block whitespace-nowrap')}>{a.time}</span>
                  <button type="button" className="inline-flex items-center gap-1 mt-1 font-[family-name:var(--font-sans)] font-semibold text-[11px] text-[var(--color-gold-700)] hover:text-[var(--color-ink-900)] transition-colors">
                    {a.actionText || 'Review'} <ArrowRight size={12} aria-hidden="true" />
                  </button>
                </span>
              </DashedRow>
            );
          })
        )}
      </div>
    </div>
  );

  const documentsCard = (
    <div className={classNames(cardShell, 'p-5')}>
      <MicroHeader
        icon={<FileCheck2 size={14} aria-hidden="true" />}
        right={
          <button type="button" onClick={() => navigateTo('invoices', 'Invoices')} className="inline-flex items-center gap-1 font-[family-name:var(--font-sans)] font-semibold text-[11px] text-[var(--color-gold-700)] hover:text-[var(--color-ink-900)] transition-colors">
            View all
          </button>
        }
      >
        Recent ledger documents
      </MicroHeader>
      <div className="mt-2">
        {scopedDocuments.length === 0 ? (
          <p className={classNames(sans, 'text-[12px] text-[var(--color-ink-500)] px-1 py-3.5 m-0')}>
            No recent documents for {activeCompany.code}.
          </p>
        ) : (
          scopedDocuments.map((d) => (
            <DashedRow key={d.id}>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] truncate')}>{d.ref}</span>
                  <StatusPill status={d.status} />
                </span>
                <span className={classNames(sans, 'text-[11.5px] text-[var(--color-ink-500)] block truncate')}>
                  {d.client} • {d.date}
                </span>
              </span>
              <span className={classNames(mono, 'font-bold text-[14px] tracking-[-0.01em] text-[var(--color-ink-900)] whitespace-nowrap')}>
                {d.currency}{d.amount}
              </span>
            </DashedRow>
          ))
        )}
      </div>
    </div>
  );

  const activityCard = (
    <div className={classNames(cardShell, 'p-5')}>
      <MicroHeader
        icon={<History size={14} aria-hidden="true" />}
        right={<span className={classNames(mono, micro, 'text-[var(--color-ink-400)]')}>{activeCompany.code} log</span>}
      >
        Activity trail
      </MicroHeader>
      <Timeline />
    </div>
  );

  const revenueCard = (
    <div className={classNames(cardShell, 'p-5')}>
      <MicroHeader icon={<PieChart size={14} aria-hidden="true" />} right={<span className={classNames(mono, micro, 'text-[var(--color-ink-400)]')}>{activeCompany.code}</span>}>
        Revenue distribution
      </MicroHeader>
      <BarRow label="Cash inflow" pct="82%" gold />
      <BarRow label="Pending receivables" pct="18%" gold={false} />
    </div>
  );

  // ============================================================
  // RAIL
  // ============================================================
  const railTabs = (
    <div className="flex gap-0.5 p-1 rounded-[var(--radius-panel)] bg-[var(--color-surface-inset)] border border-[var(--color-border-subtle)] overflow-x-auto r-scroll max-[900px]:col-span-2 max-sm:col-span-1" role="tablist" aria-label="Company insights">
      {RAIL_TABS.map((t) => {
        const key = t.toLowerCase() as RailTab;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={railTab === key}
            onClick={() => setRailTab(key)}
            className={classNames(
              'flex-1 min-w-max px-2.5 py-[7px] rounded-lg transition-all',
              mono, 'text-[10.5px] font-medium uppercase tracking-[0.04em]',
              railTab === key
                ? 'bg-[var(--color-surface-card)] text-[var(--color-ink-900)] shadow-[0_1px_2px_rgba(24,24,27,0.06)] underline underline-offset-4 decoration-[1.5px]'
                : 'text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]'
            )}
          >
            {t}
          </button>
        );
      })}
    </div>
  );

  const railPanel = () => {
    if (railTab === 'ledger') {
      return (
        <div className={classNames(cardShell, 'p-5')}>
          <MicroHeader icon={<FileCheck2 size={14} aria-hidden="true" />}>Recent ledger documents</MicroHeader>
          <div className="mt-2">
            {scopedDocuments.length === 0 ? (
              <p className={classNames(sans, 'text-[12px] text-[var(--color-ink-500)] px-1 py-3.5 m-0')}>No recent documents for {activeCompany.code}.</p>
            ) : (
              scopedDocuments.map((d) => (
                <DashedRow key={d.id}>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] truncate')}>{d.ref}</span>
                      <StatusPill status={d.status} />
                    </span>
                    <span className={classNames(sans, 'text-[11.5px] text-[var(--color-ink-500)] block truncate')}>{d.client} • {d.date}</span>
                  </span>
                  <span className={classNames(mono, 'font-bold text-[14px] tracking-[-0.01em] text-[var(--color-ink-900)] whitespace-nowrap')}>{d.currency}{d.amount}</span>
                </DashedRow>
              ))
            )}
          </div>
        </div>
      );
    }
    if (railTab === 'analytics') {
      return (
        <div className={classNames(cardShell, 'p-5')}>
          <MicroHeader icon={<PieChart size={14} aria-hidden="true" />}>Financial analytics</MicroHeader>
          <KvGrid
            rows={[
              ['Cash received', `${activeCompany.currency}${currentKPIs.cashReceived}`],
              ['Outstanding', `${activeCompany.currency}${currentKPIs.outstanding}`],
              ['Created today', `${currentKPIs.createdTodayCount} docs`],
              ['Expired quotes', `${activeCompany.currency}${currentKPIs.overdueQuotesAmount}`],
            ]}
          />
          <BarRow label="Cash inflow" pct="82%" gold />
          <BarRow label="Pending receivables" pct="18%" gold={false} />
        </div>
      );
    }
    if (railTab === 'activity') {
      return (
        <div className={classNames(cardShell, 'p-5')}>
          <MicroHeader icon={<History size={14} aria-hidden="true" />}>Activity trail</MicroHeader>
          <Timeline />
        </div>
      );
    }
    if (railTab === 'alerts') {
      return (
        <div className={classNames(cardShell, 'p-5')}>
          <MicroHeader icon={<Bell size={14} aria-hidden="true" />} right={
            <button type="button" onClick={clearNotifications} className="inline-flex items-center font-[family-name:var(--font-sans)] font-semibold text-[11px] text-[var(--color-gold-700)] hover:text-[var(--color-ink-900)] transition-colors">
              Clear unread
            </button>
          }>
            Alerts & notifications
          </MicroHeader>
          <div>
            {notifications.length === 0 ? (
              <p className={classNames(sans, 'text-[12px] text-[var(--color-ink-500)] px-1 py-3.5 m-0')}>No notifications right now.</p>
            ) : (
              notifications.map((n) => <NotifItem key={n.id} n={n} />)
            )}
          </div>
        </div>
      );
    }
    // overview (default)
    return (
      <div className="flex flex-col gap-4 min-w-0">
        <div className={classNames(cardShell, 'p-5')}>
          <MicroHeader icon={<Building2 size={14} aria-hidden="true" />}>Workspace context</MicroHeader>
          <KvGrid
            rows={[
              ['Workspace', activeWorkspace.name],
              ['Code', activeWorkspace.code],
              ['Plan', activeWorkspace.plan],
              ['Region', activeWorkspace.region],
              ['Members', String(activeWorkspace.membersCount)],
              ['Companies', String(activeWorkspace.companiesCount)],
            ]}
          />
        </div>
        <div className={classNames(cardShell, 'p-5')}>
          <MicroHeader icon={<Building2 size={14} aria-hidden="true" />}>Operating entity</MicroHeader>
          <KvGrid
            rows={[
              ['Company', activeCompany.name],
              ['Code', activeCompany.code],
              ['Type', activeCompany.type],
              ['Currency', activeCompany.currency],
              ['Tax ID', activeCompany.taxId],
              ['Status', activeCompany.activeStatus],
            ]}
          />
        </div>
        <div className={classNames(cardShell, 'p-5')}>
          <div className="flex gap-2.5">
            <button type="button" onClick={() => setQuickCreateOpen(true)} className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--radius-control)] bg-[var(--color-ink-button)] text-white font-[family-name:var(--font-sans)] font-semibold text-[13px] hover:opacity-90 transition-opacity">
              <FilePlus size={15} aria-hidden="true" /> Create document
            </button>
            <button type="button" onClick={() => setNewCompanyModalOpen(true)} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-[var(--radius-control)] bg-[var(--color-surface-card)] border border-[var(--color-border-strong)] text-[var(--color-ink-900)] font-[family-name:var(--font-sans)] font-semibold text-[13px] whitespace-nowrap hover:bg-[var(--color-surface-inset)] transition-colors">
              <Building2 size={15} className="text-[var(--color-gold-500)]" aria-hidden="true" /> New company
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // NON-HOME SECTIONS
  // ============================================================
  const sectionHead = (title: string, sub: string) => (
    <div className="mb-1">
      <h2 className={classNames(mono, 'm-0 font-bold text-[20px] leading-[1.1] tracking-[-0.01em] text-[var(--color-ink-900)]')}>{title}</h2>
      <p className={classNames(sans, 'text-[12.5px] text-[var(--color-ink-500)] mt-0.5 m-0')}>{sub}</p>
    </div>
  );

  const docList = (docs: DocumentItem[]) => (
    <div className={classNames(cardShell, 'p-5')}>
      <div className="mt-0">
        {docs.length === 0 ? (
          <p className={classNames(sans, 'text-[12px] text-[var(--color-ink-500)] px-1 py-3.5 m-0')}>No recent documents for {activeCompany.code}.</p>
        ) : (
          docs.map((d) => (
            <DashedRow key={d.id}>
              <span className="r-gold-tile w-9 h-9 flex-shrink-0 rounded-[10px] grid place-items-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                <Receipt size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] truncate')}>{d.ref}</span>
                  <StatusPill status={d.status} />
                </span>
                <span className={classNames(sans, 'text-[11.5px] text-[var(--color-ink-500)] block truncate')}>{d.client} • {d.date}</span>
              </span>
              <span className={classNames(mono, 'font-bold text-[14px] tracking-[-0.01em] text-[var(--color-ink-900)] whitespace-nowrap')}>{d.currency}{d.amount}</span>
            </DashedRow>
          ))
        )}
      </div>
    </div>
  );

  const section = () => {
    if (activeTab === 'invoices') {
      return (
        <>
          {sectionHead('Invoices & billing', `Scoped to ${activeCompany.name}`)}
          <div className="flex justify-end mb-3">
            <button type="button" onClick={() => triggerToast(`Creating new invoice for ${activeCompany.name}`)} className="inline-flex items-center justify-center gap-2 h-[38px] px-3.5 rounded-[var(--radius-control)] bg-[var(--color-surface-card)] border border-[var(--color-border-strong)] text-[var(--color-ink-900)] font-[family-name:var(--font-sans)] font-semibold text-[13px] whitespace-nowrap hover:bg-[var(--color-surface-inset)] transition-colors">
              <FilePlus size={15} className="text-[var(--color-gold-500)]" aria-hidden="true" /> New invoice
            </button>
          </div>
          {docList(scopedDocuments)}
        </>
      );
    }
    if (activeTab === 'projects') {
      return (
        <>
          {sectionHead('Projects & tasks', `${activeCompany.name} operations`)}
          <div className="flex justify-end mb-3">
            <button type="button" onClick={() => triggerToast(`Creating new project for ${activeCompany.name}`)} className="inline-flex items-center justify-center gap-2 h-[38px] px-3.5 rounded-[var(--radius-control)] bg-[var(--color-surface-card)] border border-[var(--color-border-strong)] text-[var(--color-ink-900)] font-[family-name:var(--font-sans)] font-semibold text-[13px] whitespace-nowrap hover:bg-[var(--color-surface-inset)] transition-colors">
              <FilePlus size={15} className="text-[var(--color-gold-500)]" aria-hidden="true" /> Add task
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {PROJECTS.map((p) => (
              <div key={p.title} className={classNames(cardShell, 'p-4')}>
                <div className="flex items-center justify-between gap-3">
                  <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)]')}>{p.title}</span>
                  <span className="r-pill r-pill-pending">{p.status}</span>
                </div>
                <div className="mt-3 h-2 rounded-[var(--radius-full)] bg-[var(--color-surface-inset)] border border-[var(--color-border-subtle)] overflow-hidden">
                  <div className="h-full rounded-[inherit] bg-gradient-to-r from-[#F3BD48] to-[#D9962B]" style={{ width: p.progress }} />
                </div>
                <div className={classNames(mono, 'flex justify-between mt-1.5 text-[10px] text-[var(--color-ink-400)]')}>
                  <span>Progress</span>
                  <span>{p.progress}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }
    if (activeTab === 'analytics') {
      return (
        <>
          {sectionHead('Financial analytics', `Company overview for ${activeCompany.code}`)}
          <div className={classNames(cardShell, 'p-5')}>
            <MicroHeader icon={<PieChart size={14} aria-hidden="true" />}>Revenue distribution</MicroHeader>
            <BarRow label="Cash inflow" pct="82%" gold />
            <BarRow label="Pending receivables" pct="18%" gold={false} />
            <KvGrid
              rows={[
                ['Cash received', `${activeCompany.currency}${currentKPIs.cashReceived}`],
                ['Outstanding', `${activeCompany.currency}${currentKPIs.outstanding}`],
                ['Created today', `${currentKPIs.createdTodayCount} docs`],
                ['Expired quotes', `${activeCompany.currency}${currentKPIs.overdueQuotesAmount}`],
              ]}
            />
          </div>
        </>
      );
    }
    // settings
    return (
      <>
        {sectionHead('Workspace & preferences', 'System configuration')}
        <div className={classNames(cardShell, 'p-5')}>
          <DashedRow>
            <span className="min-w-0 flex-1">
              <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] block')}>Current workspace</span>
              <span className={classNames(sans, 'text-[11.5px] text-[var(--color-ink-500)] block')}>
                {activeWorkspace.name} ({activeWorkspace.code})
              </span>
            </span>
            <button type="button" onClick={() => setSettingsModalOpen(true)} className="inline-flex items-center justify-center h-[34px] px-3 rounded-[var(--radius-control)] bg-[var(--color-surface-card)] border border-[var(--color-border-strong)] text-[var(--color-ink-900)] font-[family-name:var(--font-sans)] font-semibold text-[12px] whitespace-nowrap hover:bg-[var(--color-surface-inset)] transition-colors">
              Manage
            </button>
          </DashedRow>
          <DashedRow>
            <span className="min-w-0 flex-1">
              <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] block')}>Theme</span>
              <span className={classNames(sans, 'text-[11.5px] text-[var(--color-ink-500)] block')}>{dark ? 'Dark mode' : 'Light mode'}</span>
            </span>
            <button type="button" onClick={() => setDark(!dark)} className="inline-flex items-center justify-center h-[34px] px-3 rounded-[var(--radius-control)] bg-[var(--color-surface-card)] border border-[var(--color-border-strong)] text-[var(--color-ink-900)] font-[family-name:var(--font-sans)] font-semibold text-[12px] whitespace-nowrap hover:bg-[var(--color-surface-inset)] transition-colors">
              Toggle
            </button>
          </DashedRow>
        </div>
      </>
    );
  };

  // ============================================================
  // MODALS / POPOVERS
  // ============================================================
  const overlay = 'fixed inset-0 z-[70] bg-black/40 flex items-start justify-center px-4 pt-12 pb-4';

  const companyModal = companySwitcherOpen && (
    <div className={overlay} onClick={(e) => { if (e.target === e.currentTarget) setCompanySwitcherOpen(false); }}>
      <div className="relative w-full max-w-[400px] rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] shadow-[0_24px_60px_rgba(24,24,27,0.22)] p-5">
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[var(--color-border-subtle)]">
          <div>
            <h3 className={classNames(sans, 'm-0 font-semibold text-[15px] text-[var(--color-ink-900)] flex items-center gap-2')}>
              <Building2 size={17} className="text-[var(--color-gold-500)]" aria-hidden="true" /> Switch operating entity
            </h3>
            <p className={classNames(sans, 'text-[12px] text-[var(--color-ink-500)] mt-0.5 m-0')}>
              Workspace: <strong>{activeWorkspace.name}</strong>
            </p>
          </div>
          <button type="button" onClick={() => setCompanySwitcherOpen(false)} aria-label="Close" className="w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-400)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="pt-3.5">
          {workspaceCompanies.map((comp) => {
            const sel = comp.id === activeCompany.id;
            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => selectCompany(comp)}
                className={classNames(
                  'flex items-center justify-between gap-3 w-full p-3 rounded-[var(--radius-panel)] border mb-2 text-left transition-colors',
                  sel
                    ? 'border-[var(--color-gold-500)] bg-[rgba(217,150,43,0.10)]'
                    : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-inset)]'
                )}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="r-gold-tile w-8 h-8 rounded-[9px] grid place-items-center text-white font-[family-name:var(--font-mono)] font-semibold text-[11px] flex-shrink-0">
                    {comp.code}
                  </span>
                  <span className="min-w-0">
                    <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] block truncate')}>{comp.name}</span>
                    <span className={classNames(sans, 'text-[11.5px] text-[var(--color-ink-500)] block truncate')}>{comp.type} • Currency: {comp.currency}</span>
                  </span>
                </span>
                {sel ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-full)] bg-[var(--color-ink-button)] text-white font-[family-name:var(--font-mono)] text-[9px] font-semibold uppercase tracking-[0.04em] whitespace-nowrap">
                    Active
                  </span>
                ) : (
                  <ChevronRight size={16} className="text-[var(--color-ink-400)] flex-shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
        <div className="pt-3 border-t border-[var(--color-border-subtle)]">
          <button type="button" onClick={() => { setCompanySwitcherOpen(false); setNewCompanyModalOpen(true); }} className="inline-flex items-center gap-1 font-[family-name:var(--font-sans)] font-semibold text-[12px] text-[var(--color-gold-700)] hover:text-[var(--color-ink-900)] transition-colors">
            <Plus size={14} aria-hidden="true" /> Provision new company
          </button>
        </div>
      </div>
    </div>
  );

  const settingsModal = settingsModalOpen && (
    <div className={classNames(overlay, 'items-center pt-4')} onClick={(e) => { if (e.target === e.currentTarget) setSettingsModalOpen(false); }}>
      <div className="relative w-full max-w-[400px] rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] shadow-[0_24px_60px_rgba(24,24,27,0.22)] p-5">
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[var(--color-border-subtle)]">
          <div>
            <h3 className={classNames(sans, 'm-0 font-semibold text-[15px] text-[var(--color-ink-900)] flex items-center gap-2')}>
              <Settings size={17} className="text-[var(--color-gold-500)]" aria-hidden="true" /> Workspace configuration
            </h3>
            <p className={classNames(sans, 'text-[12px] text-[var(--color-ink-500)] mt-0.5 m-0')}>Select an active organizational workspace context.</p>
          </div>
          <button type="button" onClick={() => setSettingsModalOpen(false)} aria-label="Close" className="w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-400)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="pt-3.5">
          <div className="p-2.5 rounded-[var(--radius-panel)] bg-[var(--color-surface-inset)] border border-[var(--color-border-subtle)] font-[family-name:var(--font-sans)] text-[12px] text-[var(--color-ink-600)]">
            Select an active organizational workspace context. Switching updates the operating entities available below.
          </div>
          <div className="mt-3">
            {workspaces.map((ws) => {
              const sel = ws.id === activeWorkspace.id;
              const count = companies.filter((c) => c.workspaceId === ws.id).length;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => { selectWorkspace(ws); setSettingsModalOpen(false); }}
                  className={classNames(
                    'flex items-center justify-between gap-3 w-full p-3 rounded-[var(--radius-panel)] border mb-2 text-left transition-colors',                  sel
                    ? 'border-[var(--color-gold-500)] bg-[rgba(217,150,43,0.10)]'
                    : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-inset)]'
                  )}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="r-gold-tile w-7 h-7 rounded-lg grid place-items-center text-white font-[family-name:var(--font-mono)] font-semibold text-[10px] flex-shrink-0">
                      {ws.code}
                    </span>
                    <span className="min-w-0">
                      <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] block truncate')}>{ws.name}</span>
                      <span className={classNames(sans, 'text-[11px] text-[var(--color-ink-500)] block truncate')}>{ws.plan} • {ws.region} • {count} companies</span>
                    </span>
                  </span>
                  {sel && <Check size={16} className="text-[var(--color-gold-500)] flex-shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="pt-3.5">
          <button type="button" onClick={() => setSettingsModalOpen(false)} className="w-full inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-control)] bg-[var(--color-ink-button)] text-white font-[family-name:var(--font-sans)] font-semibold text-[13px] hover:opacity-90 transition-opacity">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  const newCompanyModal = newCompanyModalOpen && (
    <div className={classNames(overlay, 'items-center pt-4')} onClick={(e) => { if (e.target === e.currentTarget) setNewCompanyModalOpen(false); }}>
      <div className="relative w-full max-w-[400px] rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] shadow-[0_24px_60px_rgba(24,24,27,0.22)] p-5">
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[var(--color-border-subtle)]">
          <div>
            <h3 className={classNames(sans, 'm-0 font-semibold text-[15px] text-[var(--color-ink-900)] flex items-center gap-2')}>
              <Plus size={17} className="text-[var(--color-gold-500)]" aria-hidden="true" /> Provision new company
            </h3>
            <p className={classNames(sans, 'text-[12px] text-[var(--color-ink-500)] mt-0.5 m-0')}>
              Added to <strong>{activeWorkspace.name}</strong>
            </p>
          </div>
          <button type="button" onClick={() => setNewCompanyModalOpen(false)} aria-label="Close" className="w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-400)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <form className="pt-3.5" onSubmit={createCompany}>
          <label className="block mb-1.5 font-[family-name:var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--color-ink-400)]" htmlFor="nc-name">
            Company name
          </label>
          <input
            id="nc-name"
            type="text"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            placeholder="e.g. Sahara Freight Co."
            required
            className="w-full h-10 px-3 mb-3 rounded-[var(--radius-panel)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] font-[family-name:var(--font-sans)] text-[13px] text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] focus:outline-none focus:border-[var(--color-gold-500)]"
          />
          <label className="block mb-1.5 font-[family-name:var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--color-ink-400)]" htmlFor="nc-code">
            Company code
          </label>
          <input
            id="nc-code"
            type="text"
            value={newCompanyCode}
            onChange={(e) => setNewCompanyCode(e.target.value)}
            placeholder="e.g. SFC"
            maxLength={5}
            required
            className="w-full h-10 px-3 mb-3 rounded-[var(--radius-panel)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] font-[family-name:var(--font-sans)] text-[13px] text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] focus:outline-none focus:border-[var(--color-gold-500)]"
          />
          <label className="block mb-1.5 font-[family-name:var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--color-ink-400)]" htmlFor="nc-type">
            Company type
          </label>
          <select
            id="nc-type"
            value={newCompanyType}
            onChange={(e) => setNewCompanyType(e.target.value)}
            className="w-full h-10 px-3 mb-4 rounded-[var(--radius-panel)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] font-[family-name:var(--font-sans)] text-[13px] text-[var(--color-ink-900)] focus:outline-none focus:border-[var(--color-gold-500)]"
          >
            {COMPANY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button type="submit" className="w-full inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-control)] bg-[var(--color-ink-button)] text-white font-[family-name:var(--font-sans)] font-semibold text-[13px] hover:opacity-90 transition-opacity">
            Create company
          </button>
        </form>
      </div>
    </div>
  );

  const notificationsPopover = notifOpen && (
    <div className="absolute right-4 top-14 z-[60] w-80 max-w-[calc(100vw-32px)] rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] shadow-[0_24px_60px_rgba(24,24,27,0.18)] p-3.5">
      <div className="flex items-center justify-between pb-2.5 border-b border-[var(--color-border-subtle)]">
        <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] flex items-center gap-1.5')}>
          <Bell size={15} className="text-[var(--color-gold-500)]" aria-hidden="true" /> Notifications
        </span>
        <button type="button" onClick={clearNotifications} className="inline-flex items-center font-[family-name:var(--font-sans)] font-semibold text-[11px] text-[var(--color-gold-700)] hover:text-[var(--color-ink-900)] transition-colors">
          Clear unread
        </button>
      </div>
      <div className="max-h-[240px] overflow-y-auto r-scroll pr-1">
        {notifications.length === 0 ? (
          <p className={classNames(sans, 'text-[12px] text-[var(--color-ink-500)] py-4 text-center m-0')}>No notifications right now.</p>
        ) : (
          notifications.map((n) => <NotifItem key={n.id} n={n} />)
        )}
      </div>
    </div>
  );

  const quickCreatePopover = quickCreateOpen && (
    <div className="absolute right-4 top-14 z-[60] w-64 rounded-[var(--radius-card)] border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] shadow-[0_24px_60px_rgba(24,24,27,0.18)] p-3.5">
      <div className="pb-2.5 border-b border-[var(--color-border-subtle)]">
        <p className={classNames(mono, micro, 'text-[var(--color-ink-400)] m-0 mb-1')}>Action entity</p>
        <p className={classNames(sans, 'font-semibold text-[12.5px] text-[var(--color-ink-900)] m-0 truncate')}>
          {activeCompany.name} ({activeCompany.code})
        </p>
      </div>
      {[
        { label: 'New Invoice', icon: Receipt },
        { label: 'New Quotation', icon: FilePlus },
        { label: 'New Waybill', icon: Truck },
        { label: 'New CSR Record', icon: HeartHandshake },
      ].map(({ label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => quickCreate(label)}
          className="flex items-center gap-2.5 w-full p-2.5 mt-1.5 rounded-[var(--radius-panel)] border border-[var(--color-border-subtle)] font-[family-name:var(--font-sans)] font-semibold text-[13px] text-[var(--color-ink-900)] text-left hover:border-[var(--color-gold-500)] hover:bg-[var(--color-surface-inset)] transition-colors"
        >
          <Icon size={16} className="text-[var(--color-gold-500)] flex-shrink-0" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );

  // ============================================================
  // ROOT
  // ============================================================
  const frameClass = classNames(
    'relative flex mx-auto mb-6 max-sm:mb-[10px]',
    'w-[calc(100%-48px)] max-sm:w-[calc(100%-20px)]',
    'h-[calc(100vh-48px)] max-sm:h-[calc(100vh-20px)] min-h-[640px] max-sm:min-h-0',
    'max-w-[1480px] rounded-[var(--radius-frame)] max-sm:rounded-[16px]',
    'overflow-hidden border border-white/55',
    'bg-gradient-to-b from-[var(--color-canvas)] to-[#F8F7F4]',
    'shadow-[0_24px_60px_rgba(90,60,10,0.28),0_4px_16px_rgba(90,60,10,0.12)]'
  );

  return (
    <div className={classNames('reprise-dashboard relative min-h-screen bg-[#B97A2E] pt-6 max-sm:pt-[10px]', dark && 'dark')}>
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
        {/* Desktop sidebar */}
        <aside
          className={classNames(
            'hidden lg:flex flex-col flex-shrink-0 border-r border-[var(--color-border-subtle)] overflow-y-auto r-scroll transition-[width] duration-200',
            collapsed ? 'w-[76px] px-2' : 'w-[264px] px-4'
          )}
          aria-label="Primary"
        >
          <div className="flex flex-col gap-8 py-5">{sidebarContent(false)}</div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div className="lg:hidden fixed inset-0 z-[80] bg-black/30" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <aside
              className="lg:hidden fixed left-0 top-0 bottom-0 z-[80] w-[264px] overflow-y-auto r-scroll bg-[var(--color-canvas)] shadow-[24px_0_60px_rgba(90,60,10,0.2)]"
              aria-label="Primary"
            >
              <div className="flex flex-col gap-8 py-5 px-4">{sidebarContent(true)}</div>
            </aside>
          </>
        )}

        {/* Main */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar */}
          <header className="h-14 flex-shrink-0 flex items-center justify-between gap-3 px-5 max-sm:px-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-canvas)]/90 backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                className="lg:hidden w-[34px] h-[34px] grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-500)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors"
              >
                <Menu size={18} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setCompanySwitcherOpen(true)} aria-label="Switch operating company" className="flex items-center gap-2.5 p-1 pr-2 rounded-[var(--radius-panel)] min-w-0 hover:bg-[var(--color-surface-inset)] transition-colors">
                <span className="r-gold-tile w-8 h-8 rounded-[9px] grid place-items-center text-white font-[family-name:var(--font-mono)] font-semibold text-[11px] flex-shrink-0">
                  {activeCompany.code}
                </span>
                <span className="min-w-0 text-left">
                  <span className={classNames(sans, 'font-semibold text-[13px] text-[var(--color-ink-900)] block truncate')}>{activeCompany.name}</span>
                  <span className={classNames(mono, 'text-[9.5px] font-medium uppercase tracking-[0.04em] text-[var(--color-ink-400)] block max-sm:hidden')}>
                    {activeWorkspace.code} Workspace
                  </span>
                </span>
                <ChevronDown size={14} className="text-[var(--color-ink-400)] flex-shrink-0" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button type="button" onClick={handleRefresh} aria-label="Refresh data" title="Refresh data" className="w-[34px] h-[34px] grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-500)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors">
                <RotateCw size={18} className={isRefreshing ? 'animate-spin text-[var(--color-gold-500)]' : ''} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark} className="w-[34px] h-[34px] grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-500)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors">
                {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              </button>
              <button type="button" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search" className="w-[34px] h-[34px] grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-500)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors">
                <Search size={18} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => { setNotifOpen(!notifOpen); setQuickCreateOpen(false); }} aria-label="Notifications" className="relative w-[34px] h-[34px] grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-500)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors">
                <Bell size={18} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 grid place-items-center rounded-full bg-[var(--color-gold-500)] text-white border-[1.5px] border-[var(--color-canvas)] font-[family-name:var(--font-mono)] text-[9px] font-semibold">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setQuickCreateOpen(!quickCreateOpen); setNotifOpen(false); }}
                className="inline-flex items-center gap-[7px] h-9 px-3.5 ml-1 rounded-[var(--radius-full)] bg-[var(--color-ink-button)] text-white font-[family-name:var(--font-sans)] font-semibold text-[13px] whitespace-nowrap hover:opacity-90 transition-opacity max-sm:px-3"
              >
                <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
                <span className="max-sm:hidden">New document</span>
              </button>
            </div>
          </header>

          {/* Search overlay */}
          {searchOpen && (
            <div className="flex items-center gap-2.5 px-5 py-2.5 bg-[var(--color-surface-card)] border-b border-[var(--color-border-subtle)]">
              <Search size={16} className="text-[var(--color-ink-400)] flex-shrink-0" aria-hidden="true" />
              <input
                type="text"
                autoFocus
                placeholder={`Search in ${activeCompany.name}…`}
                aria-label="Search"
                className="flex-1 min-w-0 bg-transparent border-0 outline-none font-[family-name:var(--font-sans)] text-[13px] font-medium text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)]"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="w-[30px] h-[30px] grid place-items-center rounded-[var(--radius-panel)] text-[var(--color-ink-400)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-ink-900)] transition-colors">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Workspace */}
          <div className="r-scroll flex-1 min-h-0 overflow-y-auto grid gap-5 p-5 max-sm:p-3 max-sm:gap-3 grid-cols-[minmax(0,1fr)_316px] max-xl:grid-cols-[minmax(0,1fr)_292px] max-[900px]:grid-cols-[minmax(0,1fr)]">
            {activeTab === 'home' ? (
              <>
                <section className="flex flex-col gap-5 max-sm:gap-3 min-w-0" aria-label="Company overview">
                  {hero}
                  {kpiStrip}
                  <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-5 max-sm:gap-3">
                    {actionCard}
                    {documentsCard}
                  </div>
                  <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-5 max-sm:gap-3">
                    {activityCard}
                    {revenueCard}
                  </div>
                </section>
                <aside className="flex flex-col gap-4 min-w-0 max-[900px]:grid max-[900px]:grid-cols-2 max-sm:grid-cols-1 max-[900px]:gap-4" aria-label="Company insights">
                  {railTabs}
                  {railPanel()}
                </aside>
              </>
            ) : (
              <section className="flex flex-col gap-4 min-w-0 max-w-[900px]">{section()}</section>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FAB (quick-create) */}
      <button
        type="button"
        onClick={() => { setQuickCreateOpen(!quickCreateOpen); setNotifOpen(false); }}
        aria-label="Create new item"
        className="lg:hidden fixed bottom-4 right-4 z-[60] w-12 h-12 rounded-full r-gold-tile text-white grid place-items-center shadow-[0_12px_28px_rgba(180,119,15,0.4),inset_0_1px_0_rgba(255,255,255,0.5)]"
      >
        <Plus size={22} strokeWidth={2.5} className={classNames('transition-transform duration-200', quickCreateOpen && 'rotate-45')} aria-hidden="true" />
      </button>

      {notificationsPopover}
      {quickCreatePopover}
      {companyModal}
      {settingsModal}
      {newCompanyModal}

      {/* Toast */}
      {contextToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--color-ink-button)] text-white font-[family-name:var(--font-sans)] text-[12px] font-medium shadow-[0_12px_32px_rgba(24,24,27,0.3)] max-w-[calc(100vw-32px)]">
          <Info size={15} className="text-[var(--color-gold-400)] flex-shrink-0" aria-hidden="true" />
          <span>{contextToast}</span>
        </div>
      )}
    </div>
  );
}
