import React, { useState, useEffect, useRef } from 'react';
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
  MoreHorizontal,
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
  Truck,
  HeartHandshake,
  FolderPlus,
  FileWarning,
  CheckCheck
} from 'lucide-react';

// --- TYPES ---
interface AlertItem {
  id: string;
  type: 'amber' | 'red' | 'green' | 'reminder';
  title: string;
  subtitle: string;
  time: string;
  actionText?: string;
  actionFlow?: string;
}

interface NotificationFeedItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  type: 'alert' | 'success' | 'warning';
  read: boolean;
}

interface DocumentItem {
  id: string;
  ref: string;
  client: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending' | 'overdue';
}

interface AuditEvent {
  id: string;
  title: string;
  desc: string;
  time: string;
  actor: string;
}

// --- MOCK DATA ---
const NOTIFICATION_LIST: NotificationFeedItem[] = [
  {
    id: 'n1',
    title: 'Payment Cleared — ₦39.3M',
    detail: 'FirstBank wire transfer cleared for Invoice #SASQUO-287 by Pygar Intl.',
    time: '10m ago',
    type: 'success',
    read: false
  },
  {
    id: 'n2',
    title: 'Quotation Awaiting Approval',
    detail: 'Proposal #QUO-9042 for Dangote Sub-Contract has been pending for 14 days.',
    time: '1h ago',
    type: 'warning',
    read: false
  },
  {
    id: 'n3',
    title: 'Overdue Collection Escalation',
    detail: 'Zenith Logix (Invoice #INV-4029) is 15 days overdue. Legal notice ready.',
    time: '3h ago',
    type: 'alert',
    read: false
  },
  {
    id: 'n4',
    title: 'New PO Approved',
    detail: 'PO-9042 for Diesel Generator equipment (₦12.5M) approved by MD.',
    time: '5h ago',
    type: 'success',
    read: true
  },
  {
    id: 'n5',
    title: 'System Compliance Check',
    detail: 'Monthly VAT & WHT filing due in 4 days. Please verify invoices.',
    time: 'Yesterday',
    type: 'warning',
    read: true
  }
];

const ALERT_ITEMS: AlertItem[] = [
  {
    id: 'a0',
    type: 'reminder',
    title: "Have you recorded today's customer payments?",
    subtitle: 'Keep cash flow & balances accurate',
    time: 'Payment Action',
    actionText: 'Record Payment',
    actionFlow: 'Record Payment'
  },
  {
    id: 'a1',
    type: 'amber',
    title: 'Invoice INV-204 has not received payment for 30 days',
    subtitle: 'Pygar International • ₦14,200,000 overdue',
    time: '30d Overdue'
  },
  {
    id: 'a2',
    type: 'amber',
    title: 'Quotation QUO-892 unconverted for 14 days',
    subtitle: 'Dangote Logistics • ₦45,000,000 proposal',
    time: '14d Stale'
  },
  {
    id: 'a3',
    type: 'red',
    title: 'Payment of ₦8.5M from Zenith Logix is overdue',
    subtitle: 'Legal notice generated & ready for dispatch',
    time: 'Action Req.'
  }
];

const RECENT_DOCUMENTS: DocumentItem[] = [
  {
    id: 'd1',
    ref: 'SASQUO-287',
    client: 'Pygar International Ltd',
    date: 'Today • 10:14 AM',
    amount: '39.3M',
    status: 'paid'
  },
  {
    id: 'd2',
    ref: 'QUO-9042',
    client: 'Dangote Logistics Sub-Contract',
    date: 'Yesterday • 4:30 PM',
    amount: '45.0M',
    status: 'pending'
  },
  {
    id: 'd3',
    ref: 'INV-4029',
    client: 'Zenith Logix Nigeria',
    date: '15 Jul 2026',
    amount: '8.5M',
    status: 'overdue'
  },
  {
    id: 'd4',
    ref: 'REC-1082',
    client: 'PZ Cussons Nigeria Plc',
    date: '21 Jul 2026',
    amount: '29.4M',
    status: 'paid'
  }
];

const AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'e1',
    title: 'Invoice #SASQUO-287 Payment Cleared',
    desc: '₦39,398,750 wire confirmed via FirstBank Merchant portal.',
    time: '12m ago',
    actor: 'Sola Adebayo'
  },
  {
    id: 'e2',
    title: 'Quotation #QUO-9042 Dispatched',
    desc: 'Sent to Dangote Sub-Contract procurement portal for review.',
    time: '1h ago',
    actor: 'Tunde Bakare'
  },
  {
    id: 'e3',
    title: 'PO #PO-9042 Approved',
    desc: '₦12,500,000 Diesel Generator purchase order signed off.',
    time: '3h ago',
    actor: 'Managing Director'
  },
  {
    id: 'e4',
    title: 'Overdue Notice Dispatched',
    desc: 'Automated legal escalation delivered to Zenith Logix (INV-4029).',
    time: '5h ago',
    actor: 'System Automation'
  },
  {
    id: 'e5',
    title: 'Project Milestone Signed Off',
    desc: 'Lekki Commercial Complex Phase 2 inspection verified.',
    time: 'Yesterday',
    actor: 'Engr. Bassey'
  }
];

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATION_LIST);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'sales' | 'projects' | 'analytics' | 'more'>('home');

  // ─── BADGE ANIMATION STATE ──────────────────────────────────────────
  const [badgePulseKey, setBadgePulseKey] = useState(0);
  const prevUnreadRef = useRef<number | null>(null);
  const pulseTimeoutRef = useRef<number | null>(null);

  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleStartFlow = (flowName: string) => {
    setQuickCreateOpen(false);
    alert(`Starting: ${flowName}`);
  };

  const markAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (prevUnreadRef.current === null) {
      prevUnreadRef.current = unreadCount;
      return;
    }
    if (prevUnreadRef.current !== unreadCount) {
      prevUnreadRef.current = unreadCount;
      setBadgePulseKey((k) => k + 1);
      if (pulseTimeoutRef.current !== null) {
        window.clearTimeout(pulseTimeoutRef.current);
      }
      pulseTimeoutRef.current = window.setTimeout(() => {
        setBadgePulseKey((k) => k + 1);
      }, 750);
    }
  }, [unreadCount]);

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current !== null) {
        window.clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, []);

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <div
      className={`${
        darkMode
          ? 'dark bg-[#0A0A0C] text-amber-50'
          : 'bg-[#F7F2E8] text-slate-900'
      } min-h-screen font-sans selection:bg-amber-600 selection:text-white transition-colors duration-300 flex justify-center items-start relative`}
    >
      {/* INLINE KEYFRAMES */}
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.92) translateY(8px); opacity: 0; }
          to   { transform: scale(1)    translateY(0);   opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes badgePop {
          0%   { transform: scale(0);    opacity: 0; }
          60%  { transform: scale(1.25); opacity: 1; }
          80%  { transform: scale(0.95); }
          100% { transform: scale(1);    opacity: 1; }
        }

        @keyframes badgePulse {
          0%   { transform: scale(1);    box-shadow: 0 0 0 0 rgba(184, 134, 11, 0.65); }
          40%  { transform: scale(1.35); box-shadow: 0 0 0 6px rgba(184, 134, 11, 0); }
          100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(184, 134, 11, 0); }
        }

        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          20%      { transform: rotate(-12deg); }
          40%      { transform: rotate(10deg); }
          60%      { transform: rotate(-8deg); }
          80%      { transform: rotate(6deg); }
        }

        .animate-slideDown { animation: slideDown 0.32s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-scaleUp   { animation: scaleUp   0.22s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: bottom right; }
        .animate-fadeIn    { animation: fadeIn    0.18s ease-out; }

        .animate-badgePop   { animation: badgePop   0.45s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-badgePulse { animation: badgePulse 0.6s  cubic-bezier(0.22, 1, 0.36, 1); }
        .animate-bellShake  { animation: bellShake  0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97); transform-origin: top center; }

        @media (prefers-reduced-motion: reduce) {
          .animate-slideDown,
          .animate-scaleUp,
          .animate-fadeIn,
          .animate-badgePop,
          .animate-badgePulse,
          .animate-bellShake {
            animation: none !important;
          }
        }
      `}</style>

      {/* AMBIENT GOLD GLOW BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-40 dark:opacity-20 transition-opacity duration-1000">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-amber-200 via-amber-400 to-amber-600 blur-[120px]" />
      </div>

      {/* PHONE-FRAME CONTAINER */}
      <div className="relative z-10 max-w-[420px] w-full min-h-screen sm:min-h-[92vh] sm:my-4 sm:rounded-[36px] border border-[#E5D7BC] dark:border-neutral-800 bg-[#FAF6EF]/95 dark:bg-[#121216]/95 backdrop-blur-2xl shadow-2xl flex flex-col justify-between overflow-hidden">

        {/* HEADER */}
        <header className="px-5 py-3.5 border-b border-[#EADBB8] dark:border-neutral-800 bg-[#FAF6EF]/80 dark:bg-[#121216]/80 flex items-center justify-between shrink-0 relative z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 -ml-1 rounded-xl text-amber-950 dark:text-amber-200 hover:bg-amber-200/40 dark:hover:bg-neutral-800 transition"
              aria-label="Open navigation drawer"
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-[#B8860B] bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 flex items-center justify-center text-white font-serif font-bold text-sm shadow-md shadow-amber-500/20">
                BD
              </div>
              <span className="font-serif font-semibold text-lg tracking-tight text-slate-900 dark:text-white">
                Big <span className="text-[#B8860B] dark:text-amber-400 font-bold">Drops</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="w-8 h-8 rounded-full bg-[#EFE6D5] dark:bg-neutral-800/90 border border-[#DFCFA8] dark:border-neutral-700/80 flex items-center justify-center text-amber-900 dark:text-amber-200 hover:text-amber-600 transition shadow-sm"
              aria-label="Search"
            >
              <Search className="w-4 h-4 stroke-[2]" />
            </button>

            <button
              onClick={handleRefresh}
              className="w-8 h-8 rounded-full bg-[#EFE6D5] dark:bg-neutral-800/90 border border-[#DFCFA8] dark:border-neutral-700/80 flex items-center justify-center text-amber-900 dark:text-amber-200 hover:text-amber-600 transition shadow-sm"
              aria-label="Refresh data"
            >
              <RotateCw className={`w-4 h-4 stroke-[2] ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
            </button>

            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-[#E2BF7D]/30 border border-[#B8860B]/60 flex items-center justify-center text-[#8B6508] dark:text-amber-300 transition shadow-sm"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4 stroke-[2]" /> : <Moon className="w-4 h-4 stroke-[2]" />}
            </button>

            {/* NOTIFICATION BELL */}
            <button
              onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
              className="px-2.5 h-8 rounded-full bg-[#EFE6D5] dark:bg-neutral-800/90 border border-[#DFCFA8] dark:border-neutral-700/80 flex items-center text-amber-900 dark:text-amber-200 hover:text-amber-600 transition shadow-sm font-bold"
              aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : 'Open notifications'}
            >
              <span key={`bell-${badgePulseKey}`} className="inline-flex">
                <Bell
                  className={`w-3.5 h-3.5 stroke-[2.2] ${
                    unreadCount > 0 ? 'animate-bellShake' : ''
                  }`}
                />
              </span>

              {unreadCount > 0 && (
                <sup
                  key={`badge-${badgePulseKey}`}
                  className={`
                    ml-px text-[9px] font-extrabold leading-none
                    text-[#8B6508] dark:text-amber-400
                    inline-flex items-center justify-center
                    min-w-[14px] h-[14px] px-1 rounded-full
                    bg-[#FFFDFA] dark:bg-neutral-900
                    border border-[#B8860B]/60
                    ${badgePulseKey === 0 ? 'animate-badgePop' : 'animate-badgePulse'}
                  `}
                  aria-hidden="true"
                >
                  {badgeLabel}
                </sup>
              )}
            </button>

            <div className="w-8 h-8 rounded-full bg-[#D4A843]/20 border-2 border-[#B8860B] flex items-center justify-center text-amber-950 dark:text-amber-100 font-bold text-xs ml-0.5 shadow-sm">
              JD
            </div>
          </div>
        </header>

        {/* TOP NOTIFICATION DRAWER */}
        {notifDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-start">
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
              onClick={() => setNotifDrawerOpen(false)}
            />

            <div className="relative z-10 w-full max-w-[420px] mx-auto bg-[#FAF6EF]/98 dark:bg-neutral-900/98 backdrop-blur-2xl rounded-b-[28px] border-b border-x border-[#EADBB8] dark:border-neutral-800 p-4 shadow-2xl space-y-3 animate-slideDown">

              <div className="flex items-center justify-between pb-2 border-b border-[#EADBB8]/80 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#E2BF7D]/30 border border-[#B8860B]/40 flex items-center justify-center text-[#8B6508] dark:text-amber-300">
                    <Bell className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-slate-900 dark:text-white leading-tight">Notification Center</h3>
                    <p className="text-[10px] text-amber-900/60 dark:text-amber-400 font-medium">{unreadCount} Unread Messages</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={markAllNotifsRead}
                    className="text-[10px] font-bold text-[#8B6508] dark:text-amber-300 flex items-center gap-1 hover:underline"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark read
                  </button>
                  <button onClick={() => setNotifDrawerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-none pr-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition ${
                      n.read
                        ? 'bg-[#FAF5EC]/50 dark:bg-neutral-800/40 border-[#EADBB8]/50 dark:border-neutral-800 opacity-75'
                        : 'bg-[#FFFDFA] dark:bg-neutral-800/90 border-[#E0D0AB] dark:border-neutral-700 shadow-sm'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      n.type === 'alert' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                      n.type === 'warning' ? 'bg-[#E2BF7D]/30 text-[#8B6508] dark:text-amber-300' :
                      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {n.type === 'alert' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                       n.type === 'warning' ? <Clock className="w-3.5 h-3.5" /> :
                       <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{n.title}</p>
                        <span className="text-[9px] font-medium text-slate-400 shrink-0">{n.time}</span>
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{n.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#EADBB8]/60 dark:border-neutral-800 flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-medium">Showing 5 latest system logs</span>
                <button
                  className="px-2 py-1 rounded-md font-bold text-[#8B6508] dark:text-amber-300 hover:bg-[#F2E8D5] dark:hover:bg-neutral-800 transition"
                  onClick={() => {
                    setNotifications((prev) => [
                      {
                        id: `live-${Date.now()}`,
                        title: 'Live Update Arrived',
                        detail: 'A new event just came in to verify the badge animation.',
                        time: 'Just now',
                        type: 'warning',
                        read: false
                      },
                      ...prev
                    ]);
                  }}
                >
                  Simulate incoming
                </button>
              </div>

            </div>
          </div>
        )}

        {/* SEARCH OVERLAY BAR */}
        {searchOpen && (
          <div className="px-5 py-2.5 bg-[#F5EAD4] dark:bg-amber-950/40 border-b border-[#E2CFAB] dark:border-amber-900/60 flex items-center gap-2 animate-fadeIn shrink-0">
            <Search className="w-4 h-4 text-amber-700 shrink-0" />
            <input
              type="text"
              placeholder="Search invoices, clients, or receipts..."
              className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none placeholder:text-amber-800/60 dark:placeholder:text-amber-300/50"
              autoFocus
            />
            <button onClick={() => setSearchOpen(false)}>
              <X className="w-4 h-4 text-amber-700 hover:text-amber-900" />
            </button>
          </div>
        )}

        {/* SIDE NAVIGATION DRAWER */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-md" onClick={() => setSidebarOpen(false)} />
            <aside className="relative z-10 w-[280px] bg-[#FAF6EF] dark:bg-neutral-900 h-full p-5 flex flex-col justify-between border-r border-[#EADBB8] dark:border-neutral-800 shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#EADBB8] dark:border-neutral-800">
                  <span className="font-serif font-semibold text-xl text-slate-900 dark:text-white">
                    Big <span className="text-[#B8860B] dark:text-amber-400 font-bold">Drops</span>
                  </span>
                  <button onClick={() => setSidebarOpen(false)} className="text-amber-900/60 dark:text-slate-400 hover:text-slate-900">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-[#FFFDFA] dark:bg-neutral-800/60 border border-[#EADBB8] dark:border-neutral-700/60 shadow-sm">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800/70 dark:text-amber-400/80 block mb-0.5">Organization</span>
                  <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-600" />
                      Sun &amp; Shield Power
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                </div>

                <nav className="mt-6 space-y-1.5">
                  <a href="#" className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#E2BF7D]/20 text-[#8B6508] dark:text-amber-300 font-bold text-xs border border-[#B8860B]/30">
                    <span className="flex items-center gap-3">
                      <Home className="w-4 h-4 text-amber-600" /> Home HQ
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
                  </a>
                  <a href="#" className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-neutral-300 hover:bg-[#F2E8D5] dark:hover:bg-neutral-800 font-semibold text-xs transition">
                    <span className="flex items-center gap-3">
                      <Receipt className="w-4 h-4 text-amber-700/70" /> Sales &amp; Invoicing
                    </span>
                  </a>
                  <a href="#" className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-neutral-300 hover:bg-[#F2E8D5] dark:hover:bg-neutral-800 font-semibold text-xs transition">
                    <span className="flex items-center gap-3">
                      <FolderKanban className="w-4 h-4 text-amber-700/70" /> Active Projects
                    </span>
                  </a>
                  <a href="#" className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-neutral-300 hover:bg-[#F2E8D5] dark:hover:bg-neutral-800 font-semibold text-xs transition">
                    <span className="flex items-center gap-3">
                      <PieChart className="w-4 h-4 text-amber-700/70" /> Analytics
                    </span>
                  </a>
                  <a href="#" className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-neutral-300 hover:bg-[#F2E8D5] dark:hover:bg-neutral-800 font-semibold text-xs transition">
                    <span className="flex items-center gap-3">
                      <History className="w-4 h-4 text-amber-700/70" /> Audit Trail
                    </span>
                  </a>
                </nav>
              </div>

              <div className="pt-4 border-t border-[#EADBB8] dark:border-neutral-800 text-[10px] font-bold text-amber-900/60 dark:text-neutral-500 text-center uppercase tracking-wider">
                Big Drops Operating System v2.5
              </div>
            </aside>
          </div>
        )}

        {/* MAIN OPERATIONAL CONTENT AREA */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-none relative">

          {/* 1. DATA-BACKED KPI CARDS */}
          <section className="grid grid-cols-2 gap-2.5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1F1911] via-[#14100B] to-[#1F1911] border border-[#B8860B]/60 text-white shadow-lg shadow-amber-950/10">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-300">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-amber-400" /> Cash Received
                </span>
              </div>
              <p className="font-serif text-2xl font-bold mt-1.5 text-white">
                <span className="text-sm font-sans font-medium text-amber-400 mr-0.5">₦</span>14.2M
              </p>
              <p className="text-[10px] font-bold text-emerald-400 mt-1">Cleared Today</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFFDFA] dark:bg-neutral-900 border border-[#EADBB8] dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-900/60 dark:text-neutral-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#B8860B]" /> Outstanding
                </span>
              </div>
              <p className="font-serif text-2xl font-bold mt-1.5 text-slate-900 dark:text-white">
                <span className="text-sm font-sans font-medium text-slate-400 mr-0.5">₦</span>8.5M
              </p>
              <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">2 Unpaid Invoices</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFFDFA] dark:bg-neutral-900 border border-[#EADBB8] dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-900/60 dark:text-neutral-400">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#B8860B]" /> Created Today
                </span>
              </div>
              <p className="font-serif text-2xl font-bold mt-1.5 text-slate-900 dark:text-white">
                3 Docs
              </p>
              <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 mt-1">Invoices &amp; Quotes</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFFDFA] dark:bg-neutral-900 border border-[#EADBB8] dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-900/60 dark:text-neutral-400">
                <span className="flex items-center gap-1">
                  <FileWarning className="w-3 h-3 text-[#B8860B]" /> Overdue Quotes
                </span>
              </div>
              <p className="font-serif text-2xl font-bold mt-1.5 text-slate-900 dark:text-white">
                <span className="text-sm font-sans font-medium text-slate-400 mr-0.5">₦</span>12.5M
              </p>
              <p className="text-[10px] font-bold text-[#B8860B] dark:text-amber-400 mt-1">3 Expired Proposals</p>
            </div>
          </section>

          {/* 2. ACTIVITY & ALERTS */}
          <section className="bg-[#FFFDFA] dark:bg-neutral-900 rounded-2xl p-4 border border-[#EADBB8] dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-serif font-semibold text-sm text-slate-900 dark:text-white tracking-tight">
                Activity &amp; Alerts
              </h3>
              <span className="text-[10px] font-bold text-amber-900/70 dark:text-amber-300 bg-[#F3E7CF] dark:bg-amber-950/60 border border-[#DFCFA8] dark:border-amber-800/60 px-2 py-0.5 rounded-md">
                4 Items
              </span>
            </div>

            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none py-1 -mx-1 px-1">
              {ALERT_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className={`snap-start shrink-0 w-[72%] sm:w-[230px] rounded-xl p-3 flex flex-col justify-between transition active:scale-[0.98] shadow-sm ${
                    item.type === 'reminder'
                      ? 'bg-gradient-to-br from-[#FAF0DC] via-[#FAF5EC] to-[#F5E6CF] dark:from-neutral-800 dark:to-neutral-900 border-2 border-[#B8860B]'
                      : 'bg-[#FAF5EC] dark:bg-neutral-800/80 border border-[#E2CFAB] dark:border-neutral-700/80 hover:border-[#B8860B]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      item.type === 'reminder' ? 'bg-[#B8860B]/20 text-[#8B6508] dark:text-amber-300' :
                      item.type === 'red' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                      item.type === 'amber' ? 'bg-[#E2BF7D]/30 text-[#8B6508] dark:text-amber-300' :
                      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {item.type === 'reminder' ? <Wallet className="w-4 h-4" /> :
                       item.type === 'red' ? <AlertTriangle className="w-4 h-4" /> :
                       item.type === 'amber' ? <Clock className="w-4 h-4" /> :
                       <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-amber-900/70 dark:text-slate-400 mt-1 truncate font-medium">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#E5D5B0] dark:border-neutral-700/60 flex items-center justify-between text-[9px]">
                    <span className="font-bold text-amber-800/60 dark:text-slate-400 uppercase tracking-wider">{item.time}</span>
                    <button
                      onClick={() => handleStartFlow(item.actionFlow || "Review")}
                      className={`font-extrabold flex items-center gap-0.5 ${
                        item.type === 'reminder'
                          ? 'px-2 py-1 rounded-md bg-[#B8860B] text-white shadow-sm'
                          : 'text-[#8B6508] dark:text-amber-300'
                      }`}
                    >
                      {item.actionText || 'Review'} <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. RECENT DOCUMENTS FEED */}
          <section className="bg-[#FFFDFA] dark:bg-neutral-900 rounded-2xl p-4 border border-[#EADBB8] dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif font-semibold text-sm text-slate-900 dark:text-white tracking-tight">
                Recent Documents
              </h3>
              <span className="text-[10px] font-bold text-amber-900/60 dark:text-neutral-400 bg-[#F5EAD4] dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-[#E0D0AB] dark:border-neutral-700">
                Latest 4
              </span>
            </div>

            <div className="divide-y divide-[#EADBB8]/60 dark:divide-neutral-800">
              {RECENT_DOCUMENTS.map((doc) => (
                <div key={doc.id} className="py-3 flex items-center justify-between gap-3 group cursor-pointer hover:bg-[#FAF5EC]/60 transition px-1 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-[2.125rem] h-[2.125rem] rounded-full bg-[#FAF5EC] dark:bg-neutral-800 border border-[#E0D0AB] dark:border-neutral-700 flex items-center justify-center text-[#B8860B] dark:text-amber-400 shrink-0">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{doc.ref}</span>
                        <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          doc.status === 'paid' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' :
                          doc.status === 'pending' ? 'bg-[#E2BF7D]/30 text-[#8B6508] dark:text-amber-300' :
                          'bg-red-500/15 text-red-600 dark:text-red-400'
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate mt-0.5">{doc.client}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif font-bold text-sm text-slate-900 dark:text-white">
                      <span className="font-sans text-xs text-slate-400 mr-0.5">₦</span>{doc.amount}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{doc.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. AUDIT TRAIL SECTION */}
          <section className="bg-[#FFFDFA] dark:bg-neutral-900 rounded-2xl p-4 border border-[#EADBB8] dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#B8860B]" />
                <h3 className="font-serif font-semibold text-sm text-slate-900 dark:text-white tracking-tight">
                  Audit Trail
                </h3>
              </div>
              <span className="text-[10px] font-bold text-amber-900/60 dark:text-neutral-400">5 Latest Events</span>
            </div>

            <div className="relative pl-3.5 border-l-2 border-[#EADBB8] dark:border-neutral-800 space-y-3.5 my-3">
              {AUDIT_EVENTS.map((evt) => (
                <div key={evt.id} className="relative">
                  <span className="absolute -left-[18px] top-1 w-2 h-2 rounded-full bg-[#B8860B] ring-2 ring-[#FFFDFA] dark:ring-neutral-900" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{evt.title}</p>
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-0.5">{evt.desc}</p>
                  <p className="text-[9px] font-semibold text-slate-400 mt-1">
                    {evt.time} • <span className="text-[#8B6508] dark:text-amber-300 font-bold">{evt.actor}</span>
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => alert("Navigating to Full Audit Ledger")}
              className="w-full mt-2 py-2.5 px-3 rounded-xl bg-[#FAF5EC] dark:bg-neutral-800/80 hover:bg-[#F3E7CF] border border-[#E0D0AB] dark:border-neutral-700/80 text-[#8B6508] dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-sm"
            >
              <span>View Full Audit Trail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </section>

        </main>

        {/* MOBILE NAVIGATION BAR */}
        <nav className="relative z-20 px-3 py-2 bg-[#FAF6EF]/95 dark:bg-neutral-900/95 border-t border-[#EADBB8] dark:border-neutral-800 backdrop-blur-lg flex justify-around items-center shrink-0">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider transition ${
              activeTab === 'home' ? 'text-[#8B6508] dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <Home className="w-[1.125rem] h-[1.125rem] stroke-[2]" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider transition ${
              activeTab === 'sales' ? 'text-[#8B6508] dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <Receipt className="w-[1.125rem] h-[1.125rem] stroke-[2]" />
            <span>Sales</span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider transition ${
              activeTab === 'projects' ? 'text-[#8B6508] dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <FolderKanban className="w-[1.125rem] h-[1.125rem] stroke-[2]" />
            <span>Projects</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider transition ${
              activeTab === 'analytics' ? 'text-[#8B6508] dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <PieChart className="w-[1.125rem] h-[1.125rem] stroke-[2]" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('more')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider transition ${
              activeTab === 'more' ? 'text-[#8B6508] dark:text-amber-300' : 'text-slate-400 dark:text-slate-[#500]'
            }`}
          >
            <MoreHorizontal className="w-[1.125rem] h-[1.125rem] stroke-[2]" />
            <span>More</span>
          </button>
        </nav>

        {/* FLOATING ACTION BUTTON */}
        <button
          onClick={() => setQuickCreateOpen(!quickCreateOpen)}
          className="absolute bottom-16 right-4 z-50 w-12 h-12 rounded-full bg-gradient-to-tr from-[#9A6B1F] via-[#B8860B] to-[#D4A843] text-white flex items-center justify-center text-xl font-bold shadow-2xl shadow-amber-900/50 active:scale-90 transition-all transform border-2 border-amber-200/50"
          aria-label="Quick Create"
        >
          <Plus className={`w-6 h-6 stroke-[2.5] transition-transform duration-300 ${quickCreateOpen ? 'rotate-45' : ''}`} />
        </button>

        {/* QUICK-CREATE POPOVER */}
        {quickCreateOpen && (
          <>
            <div
              className="absolute inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity"
              onClick={() => setQuickCreateOpen(false)}
            />
            <div className="absolute bottom-[8rem] right-4 z-50 w-64 bg-[#FAF6EF]/98 dark:bg-neutral-900/98 backdrop-blur-xl rounded-2xl border border-[#D4A843]/40 dark:border-neutral-700 p-2.5 shadow-2xl space-y-1 animate-scaleUp">

              <div className="px-2.5 py-1 border-b border-[#EADBB8]/80 dark:border-neutral-800 mb-1 flex items-center justify-between">
                <p className="text-[10px] font-extrabold text-[#8B6508] dark:text-amber-400 uppercase tracking-wider">Quick Create</p>
                <button onClick={() => setQuickCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {[
                { label: 'New Invoice', icon: Receipt },
                { label: 'New Quotation', icon: FilePlus },
                { label: 'New CSR', icon: HeartHandshake },
                { label: 'New Waybill', icon: Truck },
                { label: 'New Project', icon: FolderPlus }
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => handleStartFlow(label)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FFFDFA] dark:bg-neutral-800/90 border border-[#EADBB8]/70 dark:border-neutral-700/80 flex items-center gap-2.5 hover:border-[#B8860B] transition active:scale-[0.97]"
                >
                  <Icon className="w-4 h-4 text-[#8B6508] dark:text-amber-300 shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{label}</span>
                </button>
              ))}

            </div>
          </>
        )}

      </div>
    </div>
  );
}

