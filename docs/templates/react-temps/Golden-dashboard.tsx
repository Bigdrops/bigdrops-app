import React, { useEffect, useState } from 'react';
import {
  Menu,
  Search,
  RotateCw,
  Moon,
  Sun,
  Bell,
  X,
  ChevronDown,
  Plus,
  Home,
  Receipt,
  FolderKanban,
  PieChart,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ArrowUpRight,
  FileCheck2,
  ArrowRight,
  History,
  Building2,
  ChevronRight,
  Wallet,
  FilePlus,
  HeartHandshake,
  Users,
  FileSignature,
  Settings,
  Truck,
  FileWarning,
  Check,
  Shield,
  Layers,
  Info,
  CheckCircle,
  Briefcase,
  Sliders,
  LogOut,
  ExternalLink,
  Zap,
  Globe,
  BarChart3,
  MessageSquare,
  Filter
} from 'lucide-react';

export interface Company {
  id: string;
  workspaceId: string;
  name: string;
  code: string;
  type: string;
  currency: string;
  taxId: string;
  color: string;
  activeStatus: string;
}

export interface Workspace {
  id: string;
  name: string;
  code: string;
  plan: 'Enterprise' | 'Professional' | 'Starter';
  region: string;
  membersCount: number;
  companiesCount: number;
}

export interface CompanyKPIs {
  cashReceived: string;
  cashReceivedTrend: string;
  outstanding: string;
  unpaidCount: number;
  createdTodayCount: number;
  overdueQuotesAmount: string;
  overdueQuotesCount: number;
}

export interface AlertItem {
  id: string;
  companyId: string;
  workspaceId: string;
  type: 'amber' | 'red' | 'green' | 'reminder';
  title: string;
  subtitle: string;
  time: string;
  actionText?: string;
}

export interface NotificationFeedItem {
  id: string;
  workspaceId: string;
  companyId?: string;
  title: string;
  detail: string;
  time: string;
  type: 'quote' | 'invoice' | 'system' | 'action';
  priority: 'high' | 'medium' | 'normal';
  read: boolean;
}

export interface DocumentItem {
  id: string;
  companyId: string;
  workspaceId: string;
  ref: string;
  client: string;
  date: string;
  amount: string;
  currency: string;
  status: 'paid' | 'pending' | 'overdue';
}

export interface AuditEvent {
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
  {
    id: 'w1',
    name: 'Big Drops Enterprise Group',
    code: 'BDE',
    plan: 'Enterprise',
    region: 'NG-Lagos (HQ)',
    membersCount: 42,
    companiesCount: 3
  },
  {
    id: 'w2',
    name: 'Apex Syndicate Holdings',
    code: 'ASH',
    plan: 'Professional',
    region: 'UK-London',
    membersCount: 14,
    companiesCount: 2
  }
];

const INITIAL_COMPANIES: Company[] = [
  {
    id: 'c11',
    workspaceId: 'w1',
    name: 'Sun & Shield Power',
    code: 'SSP',
    type: 'Energy & Renewables',
    currency: '₦',
    taxId: 'TIN-9042811-SSP',
    color: 'from-amber-500 to-amber-700',
    activeStatus: 'Active Operational'
  },
  {
    id: 'c12',
    workspaceId: 'w1',
    name: 'Pygar Logistics & Trade',
    code: 'PYG',
    type: 'Freight & Supply Chain',
    currency: '₦',
    taxId: 'TIN-4019283-PYG',
    color: 'from-amber-700 to-amber-900',
    activeStatus: 'Active Operational'
  },
  {
    id: 'c13',
    workspaceId: 'w1',
    name: 'Century Mining Co.',
    code: 'CMC',
    type: 'Heavy Resources & Extraction',
    currency: '₦',
    taxId: 'TIN-1102934-CMC',
    color: 'from-slate-700 to-slate-900',
    activeStatus: 'Active Operational'
  },
  {
    id: 'c21',
    workspaceId: 'w2',
    name: 'Helios Clean Energy UK',
    code: 'HCE',
    type: 'Solar Infrastructure',
    currency: '£',
    taxId: 'GB-9920192-HCE',
    color: 'from-amber-600 to-yellow-600',
    activeStatus: 'Active Operational'
  },
  {
    id: 'c22',
    workspaceId: 'w2',
    name: 'Zenith Global Shipping',
    code: 'ZGS',
    type: 'Maritime Freight',
    currency: '$',
    taxId: 'US-8819201-ZGS',
    color: 'from-blue-700 to-slate-900',
    activeStatus: 'Active Operational'
  }
];

const MOCK_KPIS: Record<string, CompanyKPIs> = {
  c11: {
    cashReceived: '14.2M',
    cashReceivedTrend: 'Cleared Today',
    outstanding: '8.5M',
    unpaidCount: 2,
    createdTodayCount: 3,
    overdueQuotesAmount: '12.5M',
    overdueQuotesCount: 3
  },
  c12: {
    cashReceived: '38.9M',
    cashReceivedTrend: 'Cleared This Week',
    outstanding: '19.4M',
    unpaidCount: 5,
    createdTodayCount: 6,
    overdueQuotesAmount: '4.2M',
    overdueQuotesCount: 1
  },
  c13: {
    cashReceived: '84.0M',
    cashReceivedTrend: 'Cleared Today',
    outstanding: '42.5M',
    unpaidCount: 8,
    createdTodayCount: 2,
    overdueQuotesAmount: '18.0M',
    overdueQuotesCount: 4
  },
  c21: {
    cashReceived: '1.25M',
    cashReceivedTrend: 'Wire Confirmed',
    outstanding: '420K',
    unpaidCount: 1,
    createdTodayCount: 4,
    overdueQuotesAmount: '150K',
    overdueQuotesCount: 2
  },
  c22: {
    cashReceived: '3.80M',
    cashReceivedTrend: 'L/C Settled',
    outstanding: '1.10M',
    unpaidCount: 3,
    createdTodayCount: 5,
    overdueQuotesAmount: '680K',
    overdueQuotesCount: 1
  }
};

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'a0',
    companyId: 'c11',
    workspaceId: 'w1',
    type: 'reminder',
    title: "Have you recorded today's customer payments?",
    subtitle: 'Sun & Shield Power • Cash Ledger',
    time: 'Payment Action',
    actionText: 'Record Payment'
  },
  {
    id: 'a1',
    companyId: 'c11',
    workspaceId: 'w1',
    type: 'amber',
    title: 'Invoice INV-204 has not received payment for 30 days',
    subtitle: 'Sun & Shield Power • ₦14,200,000 overdue',
    time: '30d Overdue'
  },
  {
    id: 'a2',
    companyId: 'c11',
    workspaceId: 'w1',
    type: 'red',
    title: 'Payment of ₦8.5M from Zenith Logix is overdue',
    subtitle: 'SSP Legal notice generated & ready for dispatch',
    time: 'Action Req.'
  },
  {
    id: 'a3',
    companyId: 'c12',
    workspaceId: 'w1',
    type: 'amber',
    title: 'Waybill #WAY-902 unconfirmed at Port Harcourt terminal',
    subtitle: 'Pygar Logistics • Customs clearance pending',
    time: 'Port Delay'
  },
  {
    id: 'a4',
    companyId: 'c12',
    workspaceId: 'w1',
    type: 'red',
    title: 'Freight Invoice #PYG-881 unpaid (₦19.4M)',
    subtitle: 'Dangote Sub-contractor billing hold',
    time: 'Action Req.'
  }
];

const INITIAL_NOTIFICATIONS: NotificationFeedItem[] = [
  {
    id: 'n1',
    workspaceId: 'w1',
    companyId: 'c11',
    title: 'Invoice INV-204 Payment Warning',
    detail: 'Overdue by 30 days. Client notified via automated email.',
    time: '10m ago',
    type: 'invoice',
    priority: 'high',
    read: false
  },
  {
    id: 'n2',
    workspaceId: 'w1',
    companyId: 'c11',
    title: 'New Quote Approved',
    detail: 'Lagos Solar Grid approved SASQUO-322 for ₦3,923,750.',
    time: '45m ago',
    type: 'quote',
    priority: 'normal',
    read: false
  },
  {
    id: 'n3',
    workspaceId: 'w1',
    title: 'Workspace Backup Completed',
    detail: 'BDE Enterprise Group database state synced safely.',
    time: '2h ago',
    type: 'system',
    priority: 'normal',
    read: true
  }
];

const INITIAL_DOCUMENTS: DocumentItem[] = [
  { id: 'd1', companyId: 'c11', workspaceId: 'w1', ref: 'SASQUO-322', client: 'Lagos Solar Grid Project', date: '8 Aug 2026', amount: '3,923,750', currency: '₦', status: 'pending' },
  { id: 'd2', companyId: 'c11', workspaceId: 'w1', ref: 'SASINV076', client: 'Eko Atlantic Power Hub', date: '7 Aug 2026', amount: '5,251,375', currency: '₦', status: 'paid' },
  { id: 'd3', companyId: 'c11', workspaceId: 'w1', ref: 'SASQUO-321', client: 'Ikeja Industrial Zone', date: '7 Aug 2026', amount: '145,125', currency: '₦', status: 'pending' },
  { id: 'd4', companyId: 'c11', workspaceId: 'w1', ref: 'SASINV075', client: 'Lekki Free Zone Ltd', date: '7 Aug 2026', amount: '948,150', currency: '₦', status: 'paid' },
  { id: 'd5', companyId: 'c12', workspaceId: 'w1', ref: 'PYGINV-801', client: 'Apapa Container Terminal', date: '8 Aug 2026', amount: '18,500,000', currency: '₦', status: 'overdue' },
  { id: 'd6', companyId: 'c12', workspaceId: 'w1', ref: 'PYGQUO-119', client: 'Bags & Cargo Logistics', date: '6 Aug 2026', amount: '4,200,000', currency: '₦', status: 'pending' },
  { id: 'd7', companyId: 'c13', workspaceId: 'w1', ref: 'CMCINV-004', client: 'Plateau Quarry Operator', date: '8 Aug 2026', amount: '42,500,000', currency: '₦', status: 'overdue' }
];

const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'e0',
    workspaceId: 'w1',
    scope: 'workspace',
    title: 'New Company Provisioned in Workspace',
    desc: 'Century Mining Co. (CMC) added to Big Drops Enterprise Group.',
    time: '2h ago',
    actor: 'Workspace Admin (Milad A.)'
  },
  {
    id: 'e1',
    workspaceId: 'w1',
    companyId: 'c11',
    scope: 'company',
    companyCode: 'SSP',
    title: 'Invoice #SASINV076 Payment Cleared',
    desc: '₦5,251,375 wire confirmed via FirstBank Merchant portal for Sun & Shield Power.',
    time: '12m ago',
    actor: 'Sola Adebayo'
  },
  {
    id: 'e2',
    workspaceId: 'w1',
    companyId: 'c12',
    scope: 'company',
    companyCode: 'PYG',
    title: 'Waybill #WAY-902 Dispatched',
    desc: 'Container release notes authorized for Pygar Logistics at Port Harcourt.',
    time: '45m ago',
    actor: 'Tunde Bakare'
  }
];

export default function App() {
  // Default to Dark Mode for superior contrast and aesthetic
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // Active Main Navigation Tab
  const [activeTab, setActiveTab] = useState<'home' | 'invoices' | 'projects' | 'analytics' | 'settings'>('home');
  
  // Settings & Company Switcher State
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'company' | 'workspace' | 'general'>('workspace');
  const [companySwitcherOpen, setCompanySwitcherOpen] = useState(false);
  const [newCompanyModalOpen, setNewCompanyModalOpen] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Multi-tenancy State
  const [workspaces, setWorkspaces] = useState<Workspace[]>(INITIAL_WORKSPACES);
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(INITIAL_WORKSPACES[0]);

  const workspaceCompanies = companies.filter((c) => c.workspaceId === activeWorkspace.id);
  const [activeCompany, setActiveCompany] = useState<Company>(
    workspaceCompanies[0] || INITIAL_COMPANIES[0]
  );

  const [notifications, setNotifications] = useState<NotificationFeedItem[]>(INITIAL_NOTIFICATIONS);
  const [contextToast, setContextToast] = useState<string | null>(null);

  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCode, setNewCompanyCode] = useState('');
  const [newCompanyType, setNewCompanyType] = useState('Logistics & Services');

  useEffect(() => {
    const validInWorkspace = companies.filter((c) => c.workspaceId === activeWorkspace.id);
    if (!validInWorkspace.some((c) => c.id === activeCompany.id)) {
      if (validInWorkspace.length > 0) {
        setActiveCompany(validInWorkspace[0]);
      }
    }
  }, [activeWorkspace, companies]);

  const triggerToast = (msg: string) => {
    setContextToast(msg);
    setTimeout(() => setContextToast(null), 2800);
  };

  const handleSelectCompany = (comp: Company) => {
    setActiveCompany(comp);
    setCompanySwitcherOpen(false);
    triggerToast(`Switched operating company to: ${comp.name} [${comp.code}]`);
  };

  const handleSelectWorkspaceFromSettings = (ws: Workspace) => {
    setActiveWorkspace(ws);
    const firstComp = companies.find((c) => c.workspaceId === ws.id);
    if (firstComp) {
      setActiveCompany(firstComp);
      triggerToast(`Active Workspace updated to: ${ws.name}`);
    } else {
      triggerToast(`Switched Workspace to: ${ws.name}`);
    }
  };

  const handleCreateNewCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !newCompanyCode.trim()) return;

    const created: Company = {
      id: `c_${Date.now()}`,
      workspaceId: activeWorkspace.id,
      name: newCompanyName,
      code: newCompanyCode.toUpperCase(),
      type: newCompanyType,
      currency: '₦',
      taxId: `TIN-${Math.floor(100000 + Math.random() * 900000)}-${newCompanyCode.toUpperCase()}`,
      color: 'from-amber-600 to-amber-800',
      activeStatus: 'Active Operational'
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

  const toggleTheme = () => setDarkMode((prev) => !prev);

  // Scoped Data Queries
  const currentKPIs = MOCK_KPIS[activeCompany.id] || {
    cashReceived: '0.00',
    cashReceivedTrend: 'No records',
    outstanding: '0.00',
    unpaidCount: 0,
    createdTodayCount: 0,
    overdueQuotesAmount: '0.00',
    overdueQuotesCount: 0
  };

  const scopedAlerts = INITIAL_ALERTS.filter((a) => a.companyId === activeCompany.id);
  const scopedDocuments = INITIAL_DOCUMENTS.filter((d) => d.companyId === activeCompany.id);
  const scopedAuditTrail = INITIAL_AUDIT_EVENTS.filter((e) => e.companyId === activeCompany.id || e.workspaceId === activeWorkspace.id);
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className={`${
        darkMode
          ? 'dark bg-[#0A0A0E] text-slate-100'
          : 'bg-[#F2ECE1] text-slate-900'
      } min-h-screen font-sans selection:bg-amber-600 selection:text-white transition-colors duration-200 flex justify-center items-start relative overflow-x-hidden`}
    >
      {/* INLINE ANIMATION STYLES */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.96) translateY(4px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .animate-slideInLeft { animation: slideInLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-scaleUp   { animation: scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fadeIn    { animation: fadeIn 0.15s ease-out; }
      `}</style>

      {/* CONTEXT TOAST BANNER */}
      {contextToast && (
        <div className="fixed top-3 z-50 px-4 py-2 rounded-xl bg-slate-900 text-amber-300 border border-amber-500/50 shadow-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{contextToast}</span>
        </div>
      )}

      {/* MAIN CONTAINER / MOBILE DEVICE FRAME */}
      <div className="relative z-10 max-w-[430px] w-full min-h-screen sm:min-h-[92vh] sm:my-4 sm:rounded-[36px] border border-[#DFCFA8] dark:border-neutral-800 bg-[#FAF6EF] dark:bg-[#121216] shadow-2xl flex flex-col justify-between overflow-hidden">

        {/* ─── TOP NAVIGATION SHELL ─── */}
        {}
        <header className="px-3.5 py-3 border-b border-[#E6D7B8] dark:border-neutral-800 bg-[#FAF6EF] dark:bg-[#121216] flex items-center justify-between shrink-0 relative z-20">
          <div className="flex items-center gap-2 min-w-0">
            {/* SIDEBAR NAVIGATION TRIGGER (RE-ENTERED SIDE DRAWER ICON) */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 rounded-xl bg-[#EFE6D5] dark:bg-neutral-800 border border-[#DFCFA8] dark:border-neutral-700 flex items-center justify-center text-slate-900 dark:text-amber-100 active:scale-95 transition shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* PRIMARY CONTEXT SWITCHER: COMPANY SELECTOR */}
            <button
              onClick={() => setCompanySwitcherOpen(true)}
              className="flex items-center gap-2 text-left p-1 rounded-xl hover:bg-[#EFE6D5]/80 dark:hover:bg-neutral-800/80 transition min-w-0"
            >
              <div className={`w-7.5 h-7.5 rounded-lg bg-gradient-to-br ${activeCompany.color} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                {activeCompany.code}
              </div>
              <div className="min-w-0 flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-serif font-black text-sm tracking-tight text-slate-900 dark:text-white truncate leading-none">
                    {activeCompany.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
                </div>
                <span className="text-[9px] font-bold text-amber-900/70 dark:text-neutral-400 truncate mt-0.5">
                  {activeWorkspace.code} Workspace
                </span>
              </div>
            </button>
          </div>

          {/* UTILITY CONTROLS */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleRefresh}
              className="w-8 h-8 rounded-full bg-[#EFE6D5] dark:bg-neutral-800 border border-[#DFCFA8] dark:border-neutral-700 flex items-center justify-center text-amber-950 dark:text-amber-200 transition"
              title="Refresh Data"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            </button>

            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-[#E2BF7D]/30 border border-[#B8860B]/60 flex items-center justify-center text-[#8B6508] dark:text-amber-300 transition"
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* NOTIFICATIONS BELL */}
            <button
              type="button"
              onClick={() => setNotifDrawerOpen((prev) => !prev)}
              className="relative w-8 h-8 rounded-full bg-[#EFE6D5] dark:bg-neutral-800 border border-[#DFCFA8] dark:border-neutral-700 flex items-center justify-center text-amber-950 dark:text-amber-100 active:scale-95 transition"
            >
              <Bell className="w-4 h-4 stroke-[2]" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-600 text-white font-black text-[9px] px-1 rounded-full border border-white dark:border-neutral-900 min-w-[16px] h-[16px] flex items-center justify-center">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="w-8 h-8 rounded-full bg-[#EFE6D5] dark:bg-neutral-800 border border-[#DFCFA8] dark:border-neutral-700 flex items-center justify-center text-amber-950 dark:text-amber-100 active:scale-95 transition"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ─── CRISP NOTIFICATIONS DROPDOWN PANEL (NO BLUR) ─── */}
        {}
        {notifDrawerOpen && (
          <div className="absolute top-14 right-3 z-40 w-80 bg-[#FFFDFA] dark:bg-neutral-900 border-2 border-[#B8860B] rounded-2xl p-3 shadow-2xl space-y-2 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-[#EADBB8] dark:border-neutral-800">
              <div className="flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#B8860B]" />
                <h4 className="font-serif font-bold text-xs text-slate-900 dark:text-white">Notifications</h4>
              </div>
              <button
                onClick={() => {
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                  triggerToast('Marked all notifications as read');
                }}
                className="text-[9px] font-bold text-[#8B6508] dark:text-amber-300 hover:underline"
              >
                Clear Unread
              </button>
            </div>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No notifications right now.</p>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border text-xs transition ${
                      !item.read
                        ? 'bg-[#FAF0DC] dark:bg-neutral-800 border-[#B8860B]/60'
                        : 'bg-[#FAF6EF] dark:bg-neutral-800/40 border-[#EADBB8]/60 dark:border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-slate-900 dark:text-white leading-tight">{item.title}</p>
                      <span className="text-[9px] text-slate-400 font-medium shrink-0">{item.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">{item.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SEARCH BAR OVERLAY */}
        {}
        {searchOpen && (
          <div className="px-3.5 py-2.5 bg-[#F5EAD4] dark:bg-neutral-900 border-b border-[#E2CFAB] dark:border-neutral-800 flex items-center gap-2 animate-fadeIn shrink-0 z-20">
            <Search className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
            <input
              type="text"
              placeholder={`Search in ${activeCompany.name}...`}
              className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-500"
              autoFocus
            />
            <button onClick={() => setSearchOpen(false)}>
              <X className="w-4 h-4 text-amber-700 dark:text-amber-300" />
            </button>
          </div>
        )}

        {/* ─── MAIN CONTENT VIEW (SWITCHED BY BOTTOM NAV TABS) ─── */}
        {}
        <main className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 scrollbar-none relative">

          {/* TAB 1: DASHBOARD / HOME */}
          {activeTab === 'home' && (
            <>
              {/* 1. DYNAMIC COMPANY KPIS */}
              {}
              <section className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1E1810] via-[#140F09] to-[#1E1810] border border-[#B8860B]/60 text-white shadow-md">
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-amber-300">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-amber-400" /> Cash Received
                    </span>
                  </div>
                  <p className="font-serif text-2xl font-bold mt-1 text-white">
                    <span className="text-xs font-sans font-medium text-amber-400 mr-0.5">{activeCompany.currency}</span>
                    {currentKPIs.cashReceived}
                  </p>
                  <p className="text-[9px] font-bold text-emerald-400 mt-1">{currentKPIs.cashReceivedTrend}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFFDFA] dark:bg-neutral-900 border border-[#EADBB8] dark:border-neutral-800 shadow-xs">
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#B8860B]" /> Outstanding
                    </span>
                  </div>
                  <p className="font-serif text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                    <span className="text-xs font-sans font-medium text-slate-400 mr-0.5">{activeCompany.currency}</span>
                    {currentKPIs.outstanding}
                  </p>
                  <p className="text-[9px] font-bold text-red-600 dark:text-red-400 mt-1">
                    {currentKPIs.unpaidCount} Unpaid Invoices
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFFDFA] dark:bg-neutral-900 border border-[#EADBB8] dark:border-neutral-800 shadow-xs">
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-[#B8860B]" /> Created Today
                    </span>
                  </div>
                  <p className="font-serif text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                    {currentKPIs.createdTodayCount} Docs
                  </p>
                  <p className="text-[9px] font-bold text-amber-800 dark:text-amber-400 mt-1">
                    {activeCompany.code} Invoices & Quotes
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFFDFA] dark:bg-neutral-900 border border-[#EADBB8] dark:border-neutral-800 shadow-xs">
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <FileWarning className="w-3 h-3 text-[#B8860B]" /> Expired Quotes
                    </span>
                  </div>
                  <p className="font-serif text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                    <span className="text-xs font-sans font-medium text-slate-400 mr-0.5">{activeCompany.currency}</span>
                    {currentKPIs.overdueQuotesAmount}
                  </p>
                  <p className="text-[9px] font-bold text-[#B8860B] dark:text-amber-400 mt-1">
                    {currentKPIs.overdueQuotesCount} Pending Sign-off
                  </p>
                </div>
              </section>

              {/* 2. ACTION ITEMS */}
              {}
              <section className="bg-[#FFFDFA] dark:bg-neutral-900 rounded-2xl p-3.5 border border-[#EADBB8] dark:border-neutral-800 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif font-semibold text-sm text-slate-900 dark:text-white">
                    Action Items ({activeCompany.code})
                  </h3>
                  <span className="text-[9px] font-bold text-amber-900 dark:text-amber-300 bg-[#F3E7CF] dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-[#DFCFA8] dark:border-amber-900/40">
                    {scopedAlerts.length} Active
                  </span>
                </div>

                {scopedAlerts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No pending action items for {activeCompany.name}.</p>
                ) : (
                  <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scrollbar-none py-1">
                    {scopedAlerts.map((item) => (
                      <div
                        key={item.id}
                        className={`snap-start shrink-0 w-[80%] sm:w-[230px] rounded-2xl p-3 flex flex-col justify-between transition shadow-xs ${
                          item.type === 'reminder'
                            ? 'bg-[#FAF0DC] dark:bg-neutral-800 border-2 border-[#B8860B]'
                            : 'bg-[#FAF5EC] dark:bg-neutral-800/80 border border-[#E2CFAB] dark:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="p-1 rounded-lg bg-[#B8860B]/20 text-[#8B6508] dark:text-amber-300 shrink-0">
                            {item.type === 'reminder' ? <Wallet className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 truncate font-medium">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#E5D5B0] dark:border-neutral-700 flex items-center justify-between text-[9px]">
                          <span className="font-bold text-slate-500 uppercase">{item.time}</span>
                          <button className="font-extrabold text-[#8B6508] dark:text-amber-300 flex items-center gap-0.5">
                            {item.actionText || 'Review'} <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 3. RECENT DOCUMENTS LEDGER */}
              {}
              <section className="bg-[#FFFDFA] dark:bg-neutral-900 rounded-2xl p-3.5 border border-[#EADBB8] dark:border-neutral-800 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-serif font-semibold text-sm text-slate-900 dark:text-white">
                    Recent Ledger Documents
                  </h3>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className="text-[10px] font-bold text-[#8B6508] dark:text-amber-300 hover:underline"
                  >
                    View All
                  </button>
                </div>

                {scopedDocuments.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No recent documents for {activeCompany.code}.</p>
                ) : (
                  <div className="divide-y divide-[#EADBB8]/60 dark:divide-neutral-800">
                    {scopedDocuments.map((doc) => (
                      <div key={doc.id} className="py-2.5 flex items-center justify-between gap-2 transition px-1 rounded-lg hover:bg-[#FAF5EC]/60 dark:hover:bg-neutral-800/50">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#FAF5EC] dark:bg-neutral-800 border border-[#E0D0AB] dark:border-neutral-700 flex items-center justify-center text-[#B8860B] shrink-0">
                            <FileCheck2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{doc.ref}</span>
                              <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                                doc.status === 'paid' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' :
                                doc.status === 'pending' ? 'bg-[#E2BF7D]/30 text-[#8B6508] dark:text-amber-300' :
                                'bg-red-500/15 text-red-600 dark:text-red-400'
                              }`}>
                                {doc.status}
                              </span>
                            </div>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {doc.client} • {doc.date}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-serif font-bold text-sm text-slate-900 dark:text-white">
                            <span className="font-sans text-xs text-slate-400 mr-0.5">{doc.currency}</span>{doc.amount}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 4. ACTIVITY TRAIL */}
              {}
              <section className="bg-[#FFFDFA] dark:bg-neutral-900 rounded-2xl p-3.5 border border-[#EADBB8] dark:border-neutral-800 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#B8860B]" />
                    <h3 className="font-serif font-semibold text-sm text-slate-900 dark:text-white">
                      Activity Trail
                    </h3>
                  </div>
                  <span className="text-[9px] font-extrabold text-[#8B6508] dark:text-amber-300 uppercase">
                    {activeCompany.code} Log
                  </span>
                </div>

                <div className="relative pl-3.5 border-l-2 border-[#EADBB8] dark:border-neutral-800 space-y-3 my-2">
                  {scopedAuditTrail.slice(0, 3).map((evt) => (
                    <div key={evt.id} className="relative">
                      <span className="absolute -left-[18px] top-1 w-2 h-2 rounded-full bg-[#B8860B] ring-2 ring-[#FFFDFA] dark:ring-neutral-900" />
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300">
                          {evt.companyCode || activeCompany.code}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400">• {evt.time}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight mt-0.5">{evt.title}</p>
                      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-0.5">{evt.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* TAB 2: INVOICES & LEDGER */}
          {}
          {activeTab === 'invoices' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif font-bold text-lg text-slate-900 dark:text-white">Invoices & Billing</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Scoped to {activeCompany.name}</p>
                </div>
                <button
                  onClick={() => triggerToast(`Creating new invoice for ${activeCompany.name}`)}
                  className="px-3 py-1.5 rounded-xl bg-[#B8860B] text-white font-extrabold text-xs flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> New Invoice
                </button>
              </div>

              <div className="bg-[#FFFDFA] dark:bg-neutral-900 rounded-2xl p-3 border border-[#EADBB8] dark:border-neutral-800 space-y-2">
                {scopedDocuments.map((doc) => (
                  <div key={doc.id} className="p-2.5 rounded-xl bg-[#FAF6EF] dark:bg-neutral-800/60 border border-[#E0D0AB] dark:border-neutral-700/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{doc.ref}</span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300">
                          {doc.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{doc.client} • {doc.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif font-bold text-sm text-slate-900 dark:text-white">{doc.currency}{doc.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PROJECTS */}
          {}
          {activeTab === 'projects' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif font-bold text-lg text-slate-900 dark:text-white">Projects & Tasks</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{activeCompany.name} Operations</p>
                </div>
                <button
                  onClick={() => triggerToast(`Creating new project for ${activeCompany.name}`)}
                  className="px-3 py-1.5 rounded-xl bg-[#B8860B] text-white font-extrabold text-xs flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Task
                </button>
              </div>

              <div className="space-y-2">
                {[
                  { title: 'Grid Substation Upgrade Phase 2', status: 'In Progress', progress: '68%' },
                  { title: 'Port Harcourt Terminal Customs Clearance', status: 'Pending Review', progress: '30%' },
                  { title: 'Quarry Machinery Procurement Sign-off', status: 'Completed', progress: '100%' }
                ].map((p, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-[#FFFDFA] dark:bg-neutral-900 border border-[#EADBB8] dark:border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{p.title}</span>
                      <span className="text-[9px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full">{p.status}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-[#B8860B]" style={{ width: p.progress }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ANALYTICS */}
          {}
          {activeTab === 'analytics' && (
            <div className="space-y-3">
              <div>
                <h2 className="font-serif font-bold text-lg text-slate-900 dark:text-white">Financial Analytics</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Company Overview for {activeCompany.code}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FFFDFA] dark:bg-neutral-900 border border-[#EADBB8] dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span>Revenue Distribution</span>
                  <BarChart3 className="w-4 h-4 text-[#B8860B]" />
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                      <span>Cash Inflow</span>
                      <span>82%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '82%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                      <span>Pending Receivables</span>
                      <span>18%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: '18%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS & CONFIG */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              <div>
                <h2 className="font-serif font-bold text-lg text-slate-900 dark:text-white">Workspace & Preferences</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">System Configuration</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FFFDFA] dark:bg-neutral-900 border border-[#EADBB8] dark:border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">Current Workspace</p>
                    <p className="text-[10px] text-slate-500">{activeWorkspace.name} ({activeWorkspace.code})</p>
                  </div>
                  <button
                    onClick={() => {
                      setSettingsTab('workspace');
                      setSettingsModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#EFE6D5] dark:bg-neutral-800 text-[10px] font-bold text-[#8B6508] dark:text-amber-300"
                  >
                    Manage
                  </button>
                </div>

                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">Theme</p>
                    <p className="text-[10px] text-slate-500">{darkMode ? 'Dark Mode' : 'Light Mode'}</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="px-2.5 py-1 rounded-xl bg-[#EFE6D5] dark:bg-neutral-800 text-[10px] font-bold text-[#8B6508] dark:text-amber-300"
                  >
                    Toggle
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* ─── RESTORED STANDARD MOBILE BOTTOM NAVIGATION BAR ─── */}
        {}
        <nav className="relative z-20 px-2 py-2.5 bg-[#FAF6EF] dark:bg-neutral-900 border-t border-[#EADBB8] dark:border-neutral-800 flex justify-around items-center shrink-0">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-wider transition ${
              activeTab === 'home' ? 'text-[#8B6508] dark:text-amber-300' : 'text-slate-400 dark:text-neutral-500'
            }`}
          >
            <Home className="w-4.5 h-4.5 stroke-[2.2]" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-wider transition ${
              activeTab === 'invoices' ? 'text-[#8B6508] dark:text-amber-300' : 'text-slate-400 dark:text-neutral-500'
            }`}
          >
            <Receipt className="w-4.5 h-4.5 stroke-[2.2]" />
            <span>Invoices</span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-wider transition ${
              activeTab === 'projects' ? 'text-[#8B6508] dark:text-amber-300' : 'text-slate-400 dark:text-neutral-500'
            }`}
          >
            <FolderKanban className="w-4.5 h-4.5 stroke-[2.2]" />
            <span>Projects</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-wider transition ${
              activeTab === 'analytics' ? 'text-[#8B6508] dark:text-amber-300' : 'text-slate-400 dark:text-neutral-500'
            }`}
          >
            <PieChart className="w-4.5 h-4.5 stroke-[2.2]" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 text-[9px] font-black uppercase tracking-wider transition ${
              activeTab === 'settings' ? 'text-[#8B6508] dark:text-amber-300' : 'text-slate-400 dark:text-neutral-500'
            }`}
          >
            <Settings className="w-4.5 h-4.5 stroke-[2.2]" />
            <span>Settings</span>
          </button>
        </nav>

        {/* ─── FLOATING ACTION BUTTON (FAB) - CLEARED OF BLUR ─── */}
        {}
        <button
          type="button"
          onClick={() => setQuickCreateOpen((prev) => !prev)}
          className="absolute bottom-16 right-4 z-40 w-11 h-11 rounded-full bg-gradient-to-tr from-[#8B6508] via-[#B8860B] to-[#D4A843] text-white flex items-center justify-center font-bold shadow-2xl active:scale-90 transition border-2 border-amber-200/50"
          aria-label="Create New Item"
        >
          <Plus className={`w-5 h-5 transition-transform duration-200 ${quickCreateOpen ? 'rotate-45' : ''}`} />
        </button>

        {/* QUICK ACTION MENU POPOVER (CLEAN & SHARP, NO MUDDY BLUR) */}
        {quickCreateOpen && (
          <div className="absolute bottom-28 right-4 z-50 w-60 bg-[#FFFDFA] dark:bg-neutral-900 rounded-2xl border-2 border-[#B8860B] p-3 shadow-2xl space-y-1.5 animate-scaleUp">
            <div className="pb-1.5 border-b border-[#EADBB8] dark:border-neutral-800">
              <p className="text-[10px] font-black uppercase text-[#8B6508] dark:text-amber-400">
                Action Entity:
              </p>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {activeCompany.name} ({activeCompany.code})
              </p>
            </div>

            {[
              { label: 'New Invoice', icon: Receipt },
              { label: 'New Quotation', icon: FilePlus },
              { label: 'New Waybill', icon: Truck },
              { label: 'New CSR Record', icon: HeartHandshake }
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => {
                  setQuickCreateOpen(false);
                  triggerToast(`Generating ${label} for ${activeCompany.name}`);
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF6EF] dark:bg-neutral-800 border border-[#EADBB8] dark:border-neutral-700 flex items-center gap-2 hover:border-[#B8860B] transition"
              >
                <Icon className="w-4 h-4 text-[#8B6508] dark:text-amber-300" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ─── RESTORED COMPREHENSIVE SIDEBAR DRAWER ─── */}
        {}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-slate-950/60" onClick={() => setSidebarOpen(false)} />
            <aside className="relative z-10 w-[290px] bg-[#FAF6EF] dark:bg-neutral-900 h-full p-4 flex flex-col justify-between border-r border-[#EADBB8] dark:border-neutral-800 shadow-2xl overflow-y-auto animate-slideInLeft">
              <div>
                {/* BRAND HEADER */}
                <div className="flex items-center justify-between pb-3 border-b border-[#EADBB8] dark:border-neutral-800">
                  <span className="font-serif font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">
                    BIG<span className="text-[#B8860B]">DROPS</span>
                  </span>
                  <button onClick={() => setSidebarOpen(false)}>
                    <X className="w-5 h-5 text-slate-400 hover:text-slate-900 dark:hover:text-white" />
                  </button>
                </div>

                {/* CURRENT OPERATING COMPANY SUMMARY */}
                <div className="mt-4 p-3 rounded-2xl bg-[#EFE6D5] dark:bg-neutral-800 border border-[#DFCFA8] dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-amber-900/70 dark:text-amber-400">
                      Operating Company
                    </span>
                    <button
                      onClick={() => {
                        setSidebarOpen(false);
                        setCompanySwitcherOpen(true);
                      }}
                      className="text-[9px] font-black text-[#8B6508] dark:text-amber-300 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  <p className="font-bold text-xs text-slate-900 dark:text-white mt-1 truncate">
                    {activeCompany.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                    Tax ID: {activeCompany.taxId}
                  </p>
                </div>

                {/* WORK MODULES NAV */}
                <div className="mt-4">
                  <p className="px-2 mb-1.5 text-[9px] font-black uppercase tracking-wider text-amber-800/80 dark:text-amber-400">
                    Work Operations
                  </p>
                  <div className="space-y-1">
                    {[
                      { label: 'Dashboard Home', icon: Home, tab: 'home' },
                      { label: 'Invoices & Billing', icon: Receipt, tab: 'invoices' },
                      { label: 'Quotations & BOQ', icon: FileSignature, tab: 'invoices' },
                      { label: 'Waybills & Shipping', icon: Truck, tab: 'projects' },
                      { label: 'Projects & Tasks', icon: FolderKanban, tab: 'projects' },
                      { label: 'Analytics & Reports', icon: PieChart, tab: 'analytics' },
                      { label: 'Client Directory', icon: Users, tab: 'home' }
                    ].map(({ label, icon: Icon, tab }) => (
                      <button
                        key={label}
                        onClick={() => {
                          setActiveTab(tab as any);
                          setSidebarOpen(false);
                          triggerToast(`Navigated to ${label}`);
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-neutral-300 hover:bg-[#F2E8D5] dark:hover:bg-neutral-800 text-xs font-semibold"
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-amber-700 dark:text-amber-400" /> {label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* SYSTEM & SETTINGS NAV */}
                <div className="mt-4 pt-3 border-t border-[#EADBB8] dark:border-neutral-800">
                  <p className="px-2 mb-1.5 text-[9px] font-black uppercase tracking-wider text-amber-800/80 dark:text-amber-400">
                    System & Settings
                  </p>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setSidebarOpen(false);
                        setSettingsTab('workspace');
                        setSettingsModalOpen(true);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-neutral-300 hover:bg-[#F2E8D5] dark:hover:bg-neutral-800 text-xs font-semibold"
                    >
                      <span className="flex items-center gap-2.5">
                        <Layers className="w-4 h-4 text-[#B8860B]" /> Workspace Context
                      </span>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#E2BF7D]/30 text-[#8B6508] dark:text-amber-300">
                        {activeWorkspace.code}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setSidebarOpen(false);
                        setActiveTab('settings');
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-neutral-300 hover:bg-[#F2E8D5] dark:hover:bg-neutral-800 text-xs font-semibold"
                    >
                      <span className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-amber-700 dark:text-amber-400" /> Preferences
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="pt-3 border-t border-[#EADBB8] dark:border-neutral-800 text-[10px] font-extrabold text-amber-900/60 dark:text-neutral-500 text-center">
                Workspace: {activeWorkspace.name}
              </div>
            </aside>
          </div>
        )}

        {/* ─── COMPANY SWITCHER MODAL (CLEAN OVERLAY, NO BLUR) ─── */}
        {}
        {companySwitcherOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 px-4">
            <div
              className="fixed inset-0 bg-slate-950/60"
              onClick={() => setCompanySwitcherOpen(false)}
            />

            <div className="relative z-10 w-full max-w-[380px] bg-[#FFFDFA] dark:bg-neutral-900 border-2 border-[#B8860B] rounded-3xl p-4 shadow-2xl space-y-3 animate-scaleUp">
              <div className="flex items-center justify-between pb-2 border-b border-[#EADBB8] dark:border-neutral-800">
                <div>
                  <h3 className="font-serif font-black text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#B8860B]" /> Switch Operating Entity
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Workspace: <strong>{activeWorkspace.name}</strong>
                  </p>
                </div>
                <button onClick={() => setCompanySwitcherOpen(false)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {workspaceCompanies.map((comp) => {
                  const isSelected = comp.id === activeCompany.id;
                  return (
                    <div
                      key={comp.id}
                      onClick={() => handleSelectCompany(comp)}
                      className={`p-3 rounded-2xl cursor-pointer transition flex items-center justify-between border ${
                        isSelected
                          ? 'bg-[#FAF0DC] dark:bg-neutral-800 border-2 border-[#B8860B] font-bold shadow-xs'
                          : 'bg-[#FFFDFA] dark:bg-neutral-800/40 border-[#EADBB8]/70 dark:border-neutral-800 hover:bg-[#FAF5EC]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${comp.color} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                          {comp.code}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                            {comp.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                            {comp.type} • Currency: {comp.currency}
                          </p>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#B8860B] text-white">
                          Active
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#EADBB8] dark:border-neutral-800 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    setCompanySwitcherOpen(false);
                    setNewCompanyModalOpen(true);
                  }}
                  className="font-extrabold text-[#8B6508] dark:text-amber-300 flex items-center gap-1 hover:underline text-[11px]"
                >
                  <Plus className="w-3.5 h-3.5" /> Provision New Company
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── SETTINGS MODAL ─── */}
        {}
        {settingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="fixed inset-0 bg-slate-950/60" onClick={() => setSettingsModalOpen(false)} />
            <div className="relative z-10 w-full max-w-[370px] bg-[#FFFDFA] dark:bg-neutral-900 border-2 border-[#B8860B] rounded-3xl p-4 shadow-2xl space-y-3 animate-scaleUp">
              <div className="flex items-center justify-between pb-2 border-b border-[#EADBB8] dark:border-neutral-800">
                <h3 className="font-serif font-black text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-[#B8860B]" /> Workspace Configuration
                </h3>
                <button onClick={() => setSettingsModalOpen(false)}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl bg-[#F3E7CF]/60 dark:bg-neutral-800 border border-[#DFCFA8] dark:border-neutral-700 text-[10px] text-slate-800 dark:text-amber-200">
                  Select an active organizational workspace context.
                </div>

                <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                  {workspaces.map((ws) => {
                    const isCurrent = ws.id === activeWorkspace.id;
                    return (
                      <div
                        key={ws.id}
                        onClick={() => handleSelectWorkspaceFromSettings(ws)}
                        className={`p-2.5 rounded-2xl cursor-pointer transition flex items-center justify-between border ${
                          isCurrent
                            ? 'bg-[#E2BF7D]/20 border-[#B8860B] text-slate-900 dark:text-white font-bold'
                            : 'bg-[#FFFDFA] dark:bg-neutral-800/60 border-[#EADBB8] dark:border-neutral-800 hover:bg-[#FAF5EC]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-amber-400 text-amber-300 dark:text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                            {ws.code}
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight">{ws.name}</p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                              {ws.plan} • {ws.region}
                            </p>
                          </div>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-[#B8860B]" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setSettingsModalOpen(false)}
                className="w-full py-2 rounded-xl bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 font-extrabold text-xs shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}