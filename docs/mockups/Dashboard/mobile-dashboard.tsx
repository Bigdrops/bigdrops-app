import React, { useState, useEffect } from "react";
import {
  PanelLeft,
  Moon,
  Sun,
  Bell,
  Search,
  Sparkles,
  Plus,
  House,
  FolderKanban,
  ChartNoAxesCombined,
  ContactRound,
  Ellipsis,
  ReceiptText,
  FileSignature,
  Truck,
  BellRing,
  ArrowRight,
  CircleDotDashed,
  TriangleAlert,
  CircleCheck,
  Receipt,
  X,
  Folders,
  UsersRound,
  FileSearch,
  ClipboardCheck,
  MailPlus,
  FolderPlus,
  Mail,
  FileChartColumn,
  ShieldCheck,
  Library,
  Settings,
  LogOut,
  Palette,
  RotateCcw,
  ChevronRight,
} from "lucide-react";

// Types
type TabType = "home" | "projects" | "sales" | "clients" | "more";
type ThemeMode = "light" | "dark";

interface ColorPreset {
  name: string;
  primary: string;
  secondary: string;
}

const PRESETS: ColorPreset[] = [
  { name: "Crimson & Gold", primary: "#8B0000", secondary: "#d4af37" },
  { name: "Emerald", primary: "#8B0000", secondary: "#d4af37" },
  { name: "Indigo", primary: "#4f46e5", secondary: "#8b5cf6" },
  { name: "Sapphire", primary: "#0284c7", secondary: "#6366f1" },
];

// Dark mode should never reuse the exact same hex as light mode — a dark crimson on a
// near-black background disappears. This derives a lighter, less-saturated variant of
// whatever hex the person picks, so ONE color choice adapts to both modes automatically
// instead of needing a separate "dark mode color" field.
function hexToHsl(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let hh = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hh = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        hh = (b - r) / d + 2;
        break;
      default:
        hh = (r - g) / d + 4;
    }
    hh /= 6;
  }
  return [hh * 360, s * 100, l * 100];
}
function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function darkVariant(hex: string): string {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return hex;
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, Math.max(s - 12, 30), Math.min(l + 26, 82));
}

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [paymentReminderVisible, setPaymentReminderVisible] = useState(true);
  const [aiInputValue, setAiInputValue] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Color theme states
  const [primaryHex, setPrimaryHex] = useState("#8B0000");
  const [secondaryHex, setSecondaryHex] = useState("#d4af37");
  const [hexWarning, setHexWarning] = useState(false);

  // Helper Toast trigger
  const say = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 1900);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load initial theme from localStorage
  useEffect(() => {
    const savedTheme = (localStorage.getItem("bigdrops-real-theme") as ThemeMode) || "light";
    setThemeMode(savedTheme);

    const savedPrimary = localStorage.getItem("bigdrops-primary-hex");
    const savedSecondary = localStorage.getItem("bigdrops-secondary-hex");

    if (savedPrimary) setPrimaryHex(savedPrimary);
    if (savedSecondary) setSecondaryHex(savedSecondary);
  }, []);

  // Update root element dataset and injected dynamic styles
  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    localStorage.setItem("bigdrops-real-theme", themeMode);
  }, [themeMode]);

  // Inject CSS Variables dynamically
  useEffect(() => {
    let styleEl = document.getElementById("customThemeStyle");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "customThemeStyle";
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      :root:not([data-theme="dark"]) { 
        --primary: ${primaryHex}; 
        --secondary: ${secondaryHex}; 
      }
      [data-theme="dark"] { 
        --primary: ${darkVariant(primaryHex)}; 
        --secondary: ${darkVariant(secondaryHex)}; 
      }
    `;

    localStorage.setItem("bigdrops-primary-hex", primaryHex);
    localStorage.setItem("bigdrops-secondary-hex", secondaryHex);
  }, [primaryHex, secondaryHex]);

  const closeAll = () => {
    setDrawerOpen(false);
    setActiveSheet(null);
  };

  const toggleTheme = () => {
    const next = themeMode === "light" ? "dark" : "light";
    setThemeMode(next);
    say(`${next === "light" ? "Light" : "Dark"} appearance selected`);
  };

  const applyPreset = (p: ColorPreset) => {
    setPrimaryHex(p.primary);
    setSecondaryHex(p.secondary);
    setHexWarning(false);
    say(`Theme set to ${p.name}`);
  };

  const resetTheme = () => {
    setPrimaryHex("#8B0000");
    setSecondaryHex("#d4af37");
    setHexWarning(false);
    say("Theme reset to Crimson & Gold");
  };

  const handleTabClick = (tab: TabType) => {
    if (tab === "sales") {
      setActiveTab("sales");
      closeAll();
      setActiveSheet("sales");
    } else if (tab === "more") {
      setActiveTab("more");
      closeAll();
      setActiveSheet("more");
    } else {
      closeAll();
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-0 sm:p-4 font-sans antialiased">
      {/* APP CONTAINER */}
      <div className="app-shell relative w-full max-w-[430px] h-[100dvh] sm:h-[880px] sm:border sm:border-slate-300/20 sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col transition-colors duration-300 bg-[var(--bg,#effcf6)] text-[var(--ink,#062c22)] dark:bg-[var(--bg,#071915)] dark:text-[var(--ink,#f0fdf9)]">
        
        {/* Grain Overlay */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.035] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] mix-blend-multiply" />

        {/* TOPBAR */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-3.5 pt-2 pb-2 backdrop-blur-md bg-gradient-to-b from-[var(--bg,#effcf6)] via-[var(--bg,#effcf6)] to-transparent dark:from-[var(--bg,#071915)] dark:via-[var(--bg,#071915)]">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={() => {
                closeAll();
                setDrawerOpen(true);
              }}
              className="w-9 h-9 grid place-items-center rounded-xl border border-slate-400/20 bg-white/70 dark:bg-slate-800/70 shadow-sm active:scale-95 transition-transform"
              aria-label="Open navigation"
            >
              <PanelLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>
            <div className="min-w-0 ml-0.5">
              <div className="text-[7px] font-extrabold tracking-widest uppercase text-emerald-800/60 dark:text-emerald-300/60 leading-tight">
                BIGDROPS WORKSPACE
              </div>
              <div className="text-xs font-extrabold tracking-tight truncate">Milad A.</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 grid place-items-center rounded-xl border border-slate-400/20 bg-white/70 dark:bg-slate-800/70 shadow-sm active:scale-95 transition-transform"
            >
              {themeMode === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                closeAll();
                setActiveSheet("notification");
              }}
              className="relative w-9 h-9 grid place-items-center rounded-xl border border-slate-400/20 bg-white/70 dark:bg-slate-800/70 shadow-sm active:scale-95 transition-transform"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-800" />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 grid place-items-center rounded-xl border border-slate-400/20 bg-white/70 dark:bg-slate-800/70 shadow-sm active:scale-95 transition-transform"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                closeAll();
                setActiveSheet("ai");
              }}
              className="h-9 px-3 grid place-items-center rounded-xl bg-gradient-to-r from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] text-white text-[10px] font-extrabold tracking-wider shadow-sm active:scale-95 transition-transform"
            >
              AI
            </button>
          </div>
        </header>

        {/* SCROLLABLE MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3.5 pb-24 pt-1">
          {/* DASHBOARD PAGE */}
          {activeTab === "home" && (
            <main className="space-y-3.5 animate-fadeIn">
              <div className="flex justify-between items-center px-0.5">
                <span className="text-[8px] font-extrabold tracking-widest uppercase text-slate-500 dark:text-slate-400">
                  Finance pulse · August 2026
                </span>
                <button
                  onClick={() => say("Dashboard metrics settings opened")}
                  className="text-[9px] font-extrabold text-[var(--primary,#8B0000)]"
                >
                  Edit metrics
                </button>
              </div>

              {/* METRIC GRID */}
              <section className="grid grid-cols-2 gap-2">
                {/* Collected */}
                <button
                  onClick={() => say("Collections report opened")}
                  className="relative overflow-hidden text-left p-3 rounded-2xl bg-gradient-to-br from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] text-white shadow-md active:scale-[0.98] transition-transform"
                >
                  <span className="text-[8px] uppercase tracking-wider font-extrabold opacity-90 block">
                    Collected this month
                  </span>
                  <div className="flex items-center gap-[2.5px] h-2.5 my-2">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <i
                        key={i}
                        className={`block w-[3px] h-2.5 rounded-[1.5px] ${
                          i < 15 ? "bg-white" : "bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="font-mono text-[17px] font-medium tracking-tight">₦89,000</div>
                  <div className="mt-1 text-[8px] opacity-90">
                    <b className="font-bold">+18%</b> vs last month
                  </div>
                </button>

                {/* Overdue */}
                <button
                  onClick={() => say("Opening overdue invoices")}
                  className="relative overflow-hidden text-left p-3 rounded-2xl border border-slate-300/40 dark:border-slate-700/40 bg-white dark:bg-slate-900/60 shadow-sm active:scale-[0.98] transition-transform"
                >
                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 block">
                    Overdue balance
                  </span>
                  <div className="flex items-center gap-[2.5px] h-2.5 my-2">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <i
                        key={i}
                        className={`block w-[3px] h-2.5 rounded-[1.5px] ${
                          i < 7 ? "bg-rose-500" : "bg-slate-300/50 dark:bg-slate-700/50"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="font-mono text-[17px] font-medium tracking-tight">₦56,000</div>
                  <div className="mt-1 text-[8px] text-slate-500 dark:text-slate-400">
                    <b className="font-bold text-rose-500">Past due</b> awaiting collection
                  </div>
                </button>

                {/* Awaiting */}
                <button
                  onClick={() => say("Opening invoices awaiting payment")}
                  className="relative overflow-hidden text-left p-3 rounded-2xl border border-slate-300/40 dark:border-slate-700/40 bg-white dark:bg-slate-900/60 shadow-sm active:scale-[0.98] transition-transform"
                >
                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 block">
                    Awaiting payment
                  </span>
                  <div className="flex items-center gap-[2.5px] h-2.5 my-2">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <i
                        key={i}
                        className={`block w-[3px] h-2.5 rounded-[1.5px] ${
                          i < 11
                            ? "bg-[var(--secondary,#d4af37)]"
                            : "bg-slate-300/50 dark:bg-slate-700/50"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="font-mono text-[17px] font-medium tracking-tight">12</div>
                  <div className="mt-1 text-[8px] text-slate-500 dark:text-slate-400">
                    <b className="font-bold text-slate-700 dark:text-slate-300">Invoices</b> still unpaid
                  </div>
                </button>

                {/* Due this week */}
                <button
                  onClick={() => say("Opening items due this week")}
                  className="relative overflow-hidden text-left p-3 rounded-2xl border border-slate-300/40 dark:border-slate-700/40 bg-white dark:bg-slate-900/60 shadow-sm active:scale-[0.98] transition-transform"
                >
                  <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 block">
                    Due this week
                  </span>
                  <div className="flex items-center gap-[2.5px] h-2.5 my-2">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <i
                        key={i}
                        className={`block w-[3px] h-2.5 rounded-[1.5px] ${
                          i < 6
                            ? "bg-teal-600 dark:bg-teal-400"
                            : "bg-slate-300/50 dark:bg-slate-700/50"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="font-mono text-[17px] font-medium tracking-tight">₦120,000</div>
                  <div className="mt-1 text-[8px] text-slate-500 dark:text-slate-400">
                    <b className="font-bold text-slate-700 dark:text-slate-300">7 days</b> upcoming due date
                  </div>
                </button>
              </section>

              {/* RECENT ACTIVITY */}
              <section className="mt-3.5">
                <h2 className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-2 px-0.5">
                  Recent activity
                </h2>
                <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/40 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  <button
                    onClick={() => say("Document detail opened")}
                    className="w-full flex items-center gap-2.5 p-2.5 text-left active:bg-slate-50 dark:active:bg-slate-800/40"
                  >
                    <span className="w-8 h-8 rounded-xl grid place-items-center bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary,#8B0000)] border border-[color-mix(in_srgb,var(--primary)_20%,transparent)]">
                      <ReceiptText className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5 text-xs font-extrabold tracking-tight">
                        INV-0045{" "}
                        <span className="px-1.5 py-0.5 rounded text-[6px] uppercase tracking-wider font-extrabold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                          Pending
                        </span>
                      </span>
                      <span className="block text-[8px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Lagos Steel Works · Aug 15
                      </span>
                    </span>
                    <span className="text-right flex-shrink-0">
                      <span className="font-mono text-xs font-medium block">₦120,000</span>
                      <span className="text-[7px] text-slate-400 block mt-0.5">Aug 15</span>
                    </span>
                  </button>

                  <button
                    onClick={() => say("Document detail opened")}
                    className="w-full flex items-center gap-2.5 p-2.5 text-left active:bg-slate-50 dark:active:bg-slate-800/40"
                  >
                    <span className="w-8 h-8 rounded-xl grid place-items-center bg-[color-mix(in_srgb,var(--secondary)_10%,transparent)] text-[var(--secondary,#d4af37)] border border-[color-mix(in_srgb,var(--secondary)_20%,transparent)]">
                      <FileSignature className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5 text-xs font-extrabold tracking-tight">
                        QTN-0109{" "}
                        <span className="px-1.5 py-0.5 rounded text-[6px] uppercase tracking-wider font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Draft
                        </span>
                      </span>
                      <span className="block text-[8px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Westfield Corp · Aug 14
                      </span>
                    </span>
                    <span className="text-right flex-shrink-0">
                      <span className="font-mono text-xs font-medium block">₦340,000</span>
                      <span className="text-[7px] text-slate-400 block mt-0.5">Aug 14</span>
                    </span>
                  </button>

                  <button
                    onClick={() => say("Document detail opened")}
                    className="w-full flex items-center gap-2.5 p-2.5 text-left active:bg-slate-50 dark:active:bg-slate-800/40"
                  >
                    <span className="w-8 h-8 rounded-xl grid place-items-center bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                      <Truck className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5 text-xs font-extrabold tracking-tight">
                        WB-0028{" "}
                        <span className="px-1.5 py-0.5 rounded text-[6px] uppercase tracking-wider font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Delivered
                        </span>
                      </span>
                      <span className="block text-[8px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Site Alpha · Aug 13
                      </span>
                    </span>
                    <span className="text-right flex-shrink-0">
                      <span className="font-mono text-xs font-medium block">Delivered</span>
                      <span className="text-[7px] text-slate-400 block mt-0.5">Aug 13</span>
                    </span>
                  </button>
                </div>
              </section>

              {/* PAYMENT REMINDER */}
              {paymentReminderVisible && (
                <section className="mt-3.5">
                  <h2 className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-2 px-0.5">
                    Payment reminder
                  </h2>
                  <div className="relative overflow-hidden p-3 rounded-2xl border border-slate-300/40 dark:border-slate-700/40 bg-white dark:bg-slate-900/60 shadow-sm">
                    <div className="flex items-start gap-2.5 relative z-10">
                      <div className="w-8 h-8 rounded-xl grid place-items-center bg-gradient-to-r from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] text-white flex-shrink-0">
                        <BellRing className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[7px] font-extrabold tracking-wider uppercase text-slate-400">
                          Smart banner
                        </div>
                        <h2 className="text-xs font-extrabold tracking-tight mt-0.5">
                          Keep payments recorded as they land
                        </h2>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                          Record each invoice payment promptly so your books stay accurate.
                        </p>
                        <div className="flex items-center gap-2 mt-2.5">
                          <button
                            onClick={() => say("Opening payment recording")}
                            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] text-white text-[8px] font-extrabold tracking-wider uppercase flex items-center gap-1"
                          >
                            Record payments <ArrowRight className="w-3 h-3" />
                          </button>
                          <span className="text-[7px] text-slate-400 font-bold flex items-center gap-1">
                            <CircleDotDashed className="w-2.5 h-2.5" /> Evergreen
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setPaymentReminderVisible(false);
                          say("Reminder dismissed");
                        }}
                        className="w-7 h-7 grid place-items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* ALERTS CAROUSEL */}
              <section className="mt-3.5">
                <h2 className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-2 px-0.5">
                  Recent alerts
                </h2>
                <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/40 bg-white dark:bg-slate-900/60 p-3 shadow-sm">
                  <div className="mb-2">
                    <div className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
                      Notifications feed
                    </div>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400">
                      What needs a response, not just a read.
                    </p>
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
                    <button
                      onClick={() => say("Notification marked for review")}
                      className="w-[200px] flex-shrink-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-left"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg grid place-items-center bg-rose-500/10 text-rose-500 flex-shrink-0">
                          <TriangleAlert className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[6px] font-extrabold uppercase tracking-wider text-slate-400">
                            Alert
                          </div>
                          <div className="text-[10px] font-extrabold leading-tight">
                            INV-0042 is overdue
                          </div>
                        </div>
                      </div>
                      <p className="text-[8px] text-slate-500 dark:text-slate-400 my-1.5 leading-relaxed">
                        7 days past due. Open to record payment or follow-up.
                      </p>
                      <div className="flex justify-between text-[7px] text-slate-400 font-semibold">
                        <span>2h ago</span>
                        <span>Unread</span>
                      </div>
                    </button>

                    <button
                      onClick={() => say("Notification marked for review")}
                      className="w-[200px] flex-shrink-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-left"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg grid place-items-center bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary,#8B0000)] flex-shrink-0">
                          <CircleCheck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[6px] font-extrabold uppercase tracking-wider text-slate-400">
                            Update
                          </div>
                          <div className="text-[10px] font-extrabold leading-tight">
                            QTN-0108 accepted
                          </div>
                        </div>
                      </div>
                      <p className="text-[8px] text-slate-500 dark:text-slate-400 my-1.5 leading-relaxed">
                        Acme Ltd accepted. Ready to convert to invoice.
                      </p>
                      <div className="flex justify-between text-[7px] text-slate-400 font-semibold">
                        <span>5h ago</span>
                        <span>Unread</span>
                      </div>
                    </button>

                    <button
                      onClick={() => say("Notification marked for review")}
                      className="w-[200px] flex-shrink-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-left"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg grid place-items-center bg-slate-500/10 text-slate-500 flex-shrink-0">
                          <Receipt className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-[6px] font-extrabold uppercase tracking-wider text-slate-400">
                            Payment
                          </div>
                          <div className="text-[10px] font-extrabold leading-tight">
                            Payment for INV-0039
                          </div>
                        </div>
                      </div>
                      <p className="text-[8px] text-slate-500 dark:text-slate-400 my-1.5 leading-relaxed">
                        ₦45,000 received. Reconcile against invoice.
                      </p>
                      <div className="flex justify-between text-[7px] text-slate-400 font-semibold">
                        <span>Yesterday</span>
                        <span>Read</span>
                      </div>
                    </button>
                  </div>
                </div>
              </section>

              {/* AUDIT TRAIL */}
              <section className="mt-3.5">
                <h2 className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-2 px-0.5">
                  Audit trail
                </h2>
                <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/40 bg-white dark:bg-slate-900/60 p-3 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex gap-2 py-2 first:pt-0 last:pb-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary,#8B0000)] ring-4 ring-[color-mix(in_srgb,var(--primary)_10%,transparent)] mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-[9px] font-bold leading-tight">INV-0045 created by Milad</div>
                      <div className="text-[7px] text-slate-400 mt-0.5">Today, 10:32 AM</div>
                    </div>
                  </div>
                  <div className="flex gap-2 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary,#d4af37)] ring-4 ring-[color-mix(in_srgb,var(--secondary)_10%,transparent)] mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-[9px] font-bold leading-tight">INV-0042 overdue reminder sent</div>
                      <div className="text-[7px] text-slate-400 mt-0.5">Today, 09:15 AM</div>
                    </div>
                  </div>
                  <div className="flex gap-2 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary,#8B0000)] ring-4 ring-[color-mix(in_srgb,var(--primary)_10%,transparent)] mt-1 flex-shrink-0" />
                    <div>
                      <div className="text-[9px] font-bold leading-tight">QTN-0108 accepted by client</div>
                      <div className="text-[7px] text-slate-400 mt-0.5">Yesterday, 4:20 PM</div>
                    </div>
                  </div>
                </div>
              </section>
            </main>
          )}

          {/* EMPTY STATE PAGES */}
          {activeTab === "projects" && (
            <div className="pt-16 text-center animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl grid place-items-center bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary,#8B0000)] mx-auto mb-3">
                <Folders className="w-6 h-6" />
              </div>
              <h2 className="text-base font-extrabold tracking-tight">Projects</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto mt-1 leading-relaxed">
                Your project workspaces and live updates open here.
              </p>
            </div>
          )}

          {activeTab === "clients" && (
            <div className="pt-16 text-center animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl grid place-items-center bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary,#8B0000)] mx-auto mb-3">
                <UsersRound className="w-6 h-6" />
              </div>
              <h2 className="text-base font-extrabold tracking-tight">Clients</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto mt-1 leading-relaxed">
                Your client records, activity, and commercial history open here.
              </p>
            </div>
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => {
            if (activeSheet === "action") closeAll();
            else {
              closeAll();
              setActiveSheet("action");
            }
          }}
          className={`absolute z-30 right-4 bottom-[calc(82px+env(safe-area-inset-bottom))] w-12 h-12 rounded-2xl bg-gradient-to-r from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] text-white grid place-items-center shadow-lg active:scale-95 transition-all ${
            activeSheet === "action" ? "rotate-45" : ""
          }`}
          aria-label="Create new"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* BOTTOM NAV */}
        <nav className="absolute z-30 left-2.5 right-2.5 bottom-2 h-[62px] p-1 grid grid-cols-5 border border-slate-400/20 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl">
          <button
            onClick={() => handleTabClick("home")}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl text-[7px] font-extrabold ${
              activeTab === "home"
                ? "bg-gradient-to-r from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <House className="w-4 h-4" />
            <span>Home</span>
          </button>
          <button
            onClick={() => handleTabClick("projects")}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl text-[7px] font-extrabold ${
              activeTab === "projects"
                ? "bg-gradient-to-r from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Projects</span>
          </button>
          <button
            onClick={() => handleTabClick("sales")}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl text-[7px] font-extrabold ${
              activeTab === "sales"
                ? "bg-gradient-to-r from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <ChartNoAxesCombined className="w-4 h-4" />
            <span>Sales</span>
          </button>
          <button
            onClick={() => handleTabClick("clients")}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl text-[7px] font-extrabold ${
              activeTab === "clients"
                ? "bg-gradient-to-r from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <ContactRound className="w-4 h-4" />
            <span>Clients</span>
          </button>
          <button
            onClick={() => handleTabClick("more")}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl text-[7px] font-extrabold ${
              activeTab === "more"
                ? "bg-gradient-to-r from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <Ellipsis className="w-4 h-4" />
            <span>More</span>
          </button>
        </nav>

        {/* SCRIM BACKDROP */}
        {(drawerOpen || activeSheet) && (
          <div
            onClick={closeAll}
            className="absolute inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn"
          />
        )}

        {/* NAVIGATION DRAWER */}
        <aside
          className={`absolute z-42 top-0 bottom-0 left-0 w-[84%] max-w-[340px] flex flex-col bg-white dark:bg-slate-900 shadow-2xl rounded-r-3xl transition-transform duration-300 ease-out ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-3.5 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-xl grid place-items-center bg-gradient-to-r from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold tracking-tight">BIGDROPS</div>
              <div className="text-[7px] font-extrabold tracking-widest uppercase text-slate-400">
                Project finance workspace
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
            <div className="text-[7px] font-extrabold uppercase tracking-widest text-slate-400 px-2 pt-2">
              Workspace
            </div>
            <button
              onClick={() => {
                closeAll();
                setActiveTab("home");
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-left text-xs font-bold bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary,#8B0000)]"
            >
              <House className="w-4 h-4" /> Dashboard
            </button>
            <button
              onClick={() => {
                closeAll();
                setActiveTab("projects");
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-left text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FolderKanban className="w-4 h-4" /> Projects
            </button>
            <button
              onClick={() => {
                closeAll();
                setActiveTab("clients");
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-left text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ContactRound className="w-4 h-4" /> Clients
            </button>
            <div className="text-[7px] font-extrabold uppercase tracking-widest text-slate-400 px-2 pt-3">
              Sales
            </div>
            <button
              onClick={() => {
                closeAll();
                say("Invoices selected");
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="flex items-center gap-2">
                <ReceiptText className="w-4 h-4" /> Invoices
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => {
                closeAll();
                say("Quotations selected");
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl text-left text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="flex items-center gap-2">
                <FileSignature className="w-4 h-4" /> Quotations
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full grid place-items-center bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary,#8B0000)] text-[8px] font-extrabold">
              MA
            </div>
            <div>
              <div className="text-[10px] font-extrabold">Milad A.</div>
              <div className="text-[8px] text-slate-400">Operator</div>
            </div>
          </div>
        </aside>

        {/* ACTION SHEET (CREATE) */}
        <section
          className={`absolute z-43 left-0 right-0 bottom-0 max-h-[78%] rounded-t-3xl bg-white dark:bg-slate-900 shadow-2xl p-3 pb-6 overflow-y-auto transition-transform duration-300 ease-out ${
            activeSheet === "action" ? "translate-y-0" : "translate-y-[106%]"
          }`}
        >
          <div className="w-8 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3" />
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Create</h2>
              <p className="text-[9px] text-slate-500 dark:text-slate-400">
                Start a record in the correct BIGDROPS workspace.
              </p>
            </div>
            <button onClick={closeAll} className="w-7 h-7 grid place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            {[
              { title: "New Invoice", desc: "Create and send a sales invoice", icon: ReceiptText, copper: false },
              { title: "New Project", desc: "Start a new project workspace", icon: FolderPlus, copper: false },
              { title: "New RFQ", desc: "Create a request for quotation", icon: FileSearch, copper: true },
              { title: "New Quotation", desc: "Build a quotation for a client", icon: FileSignature, copper: true },
              { title: "New CSR", desc: "Log a customer service report", icon: ClipboardCheck, copper: false },
              { title: "New Waybill", desc: "Create a dispatch or delivery waybill", icon: Truck, copper: false },
              { title: "New Letter", desc: "Draft official correspondence", icon: MailPlus, copper: true },
            ].map((act, i) => (
              <button
                key={i}
                onClick={() => {
                  closeAll();
                  say(`${act.title} opened`);
                }}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/50"
              >
                <span
                  className={`w-8 h-8 rounded-xl grid place-items-center flex-shrink-0 ${
                    act.copper
                      ? "bg-[color-mix(in_srgb,var(--secondary)_14%,transparent)] text-[var(--secondary,#d4af37)]"
                      : "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary,#8B0000)]"
                  }`}
                >
                  <act.icon className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-[11px] font-extrabold leading-tight">{act.title}</div>
                  <div className="text-[8px] text-slate-500 dark:text-slate-400 leading-tight">
                    {act.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* MORE SHEET & THEME SETTINGS */}
        <section
          className={`absolute z-43 left-0 right-0 bottom-0 max-h-[78%] rounded-t-3xl bg-white dark:bg-slate-900 shadow-2xl p-3 pb-6 overflow-y-auto transition-transform duration-300 ease-out ${
            activeSheet === "more" ? "translate-y-0" : "translate-y-[106%]"
          }`}
        >
          <div className="w-8 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3" />
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-base font-extrabold tracking-tight">More & Settings</h2>
              <p className="text-[9px] text-slate-500 dark:text-slate-400">
                Admin, dynamic theme colors, and workspace utilities.
              </p>
            </div>
            <button onClick={closeAll} className="w-7 h-7 grid place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setActiveSheet("theme")}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-left mb-3"
          >
            <span className="w-8 h-8 rounded-xl grid place-items-center bg-gradient-to-r from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] text-white">
              <Palette className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-extrabold">Theme Color Customizer</div>
              <div className="text-[8px] text-slate-500 dark:text-slate-400">
                Change primary & secondary colors globally
              </div>
            </div>
          </button>
        </section>

        {/* THEME CUSTOMIZER SHEET */}
        <section
          className={`absolute z-43 left-0 right-0 bottom-0 max-h-[78%] rounded-t-3xl bg-white dark:bg-slate-900 shadow-2xl p-3 pb-6 overflow-y-auto transition-transform duration-300 ease-out ${
            activeSheet === "theme" ? "translate-y-0" : "translate-y-[106%]"
          }`}
        >
          <div className="w-8 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3" />
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Theme colors</h2>
              <p className="text-[9px] text-slate-500 dark:text-slate-400">
                Backgrounds & dark mode adapt dynamically.
              </p>
            </div>
            <button onClick={closeAll} className="w-7 h-7 grid place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* PRESETS */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => applyPreset(p)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center gap-1 active:scale-95 transition-transform"
              >
                <div
                  className="w-full h-5 rounded-md"
                  style={{
                    background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})`,
                  }}
                />
                <span className="text-[7px] font-extrabold uppercase tracking-wider text-slate-500">
                  {p.name}
                </span>
              </button>
            ))}
          </div>

          <div className="h-10 rounded-xl bg-gradient-to-r from-[var(--primary,#8B0000)] to-[var(--secondary,#d4af37)] mb-3 shadow-sm" />

          {/* HEX INPUTS */}
          <div className="space-y-2">
            <label className="flex items-center gap-2.5">
              <span
                className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 flex-shrink-0"
                style={{ background: primaryHex }}
              />
              <span className="flex-1">
                <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">
                  Primary
                </span>
                <input
                  type="text"
                  maxLength={7}
                  value={primaryHex}
                  onChange={(e) => setPrimaryHex(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-[var(--primary,#8B0000)]"
                />
              </span>
            </label>

            <label className="flex items-center gap-2.5">
              <span
                className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 flex-shrink-0"
                style={{ background: secondaryHex }}
              />
              <span className="flex-1">
                <span className="block text-[8px] font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">
                  Secondary
                </span>
                <input
                  type="text"
                  maxLength={7}
                  value={secondaryHex}
                  onChange={(e) => setSecondaryHex(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-[var(--secondary,#d4af37)]"
                />
              </span>
            </label>
          </div>

          <button
            onClick={resetTheme}
            className="w-full mt-3 p-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Reset to Crimson & Gold
          </button>
        </section>

        {/* SEARCH OVERLAY */}
        <div
          className={`absolute z-50 inset-0 bg-[var(--bg,#effcf6)] dark:bg-[var(--bg,#071915)] p-3 pt-3.5 transition-transform duration-300 ease-out ${
            searchOpen ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents, clients, projects"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    say(`Searching ${searchInput}`);
                    setSearchOpen(false);
                  }
                }}
                className="w-full bg-transparent text-xs outline-none"
              />
            </div>
            <button
              onClick={() => setSearchOpen(false)}
              className="text-xs font-extrabold text-[var(--primary,#8B0000)]"
            >
              Cancel
            </button>
          </div>
          <div className="mt-5">
            <h3 className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 mb-2">
              Recent searches
            </h3>
            {["INV-0045 · Lagos Steel Works", "QTN-0108 · Acme Ltd", "Site Alpha · Project"].map(
              (s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSearchOpen(false);
                    say(`${s} selected`);
                  }}
                  className="w-full py-2.5 border-b border-slate-200 dark:border-slate-800 text-left text-xs font-bold block"
                >
                  {s}
                </button>
              )
            )}
          </div>
        </div>

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="absolute z-60 top-3 left-1/2 -translate-x-1/2 px-3 py-2 rounded-xl bg-slate-900 text-white text-[9px] font-extrabold shadow-xl whitespace-nowrap animate-fadeIn">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}