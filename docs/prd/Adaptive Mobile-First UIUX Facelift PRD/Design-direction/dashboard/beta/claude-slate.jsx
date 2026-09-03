import { useState } from "react";
import {
  PanelLeft, Moon, Sun, Bell, Search, Sparkles, X, Plus, ArrowRight,
  CircleDotDashed, TriangleAlert, CircleCheck, Receipt, ReceiptText,
  FileSignature, Truck, ClipboardCheck, House, FolderKanban,
  ChartNoAxesCombined, ContactRound, Ellipsis, FolderPlus, FileSearch,
  Mail, MailPlus, FileChartColumn, ShieldCheck, Library, Settings2,
  LogOut, Palette, RotateCcw, LayoutDashboard, ChevronRight, BellRing,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

function hexToRgba(hex, alpha) {
  let h = (hex || "#1e3a5f").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const NAV_TABS = [
  { id: "home", label: "Home", icon: House },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "sales", label: "Sales", icon: ChartNoAxesCombined },
  { id: "clients", label: "Clients", icon: ContactRound },
  { id: "more", label: "More", icon: Ellipsis },
];

const ACTIVITY = [
  { id: "INV-0045", icon: ReceiptText, tone: "primary", status: "Pending", client: "Lagos Steel Works", value: "\u20a6120,000", date: "Aug 15" },
  { id: "QTN-0109", icon: FileSignature, tone: "secondary", status: "Draft", client: "Westfield Corp", value: "\u20a6340,000", date: "Aug 14" },
  { id: "WB-0028", icon: Truck, tone: "neutral", status: "Delivered", client: "Site Alpha", value: "Delivered", date: "Aug 13" },
];

const ALERTS = [
  { icon: TriangleAlert, warn: true, overline: "Alert", title: "INV-0042 is overdue", body: "7 days past due. Open to record payment or follow up.", time: "2h ago", state: "Unread" },
  { icon: CircleCheck, warn: false, overline: "Update", title: "QTN-0108 accepted", body: "Acme Ltd accepted. Ready to convert to invoice.", time: "5h ago", state: "Unread" },
  { icon: Receipt, warn: false, overline: "Payment", title: "Payment for INV-0039", body: "\u20a645,000 received. Reconcile against invoice.", time: "Yesterday", state: "Read" },
];

const AUDIT = [
  { tone: "primary", text: "INV-0045 created by Milad", meta: "Today, 10:32 AM" },
  { tone: "secondary", text: "INV-0042 overdue reminder sent", meta: "Today, 09:15 AM" },
  { tone: "primary", text: "QTN-0108 accepted by client", meta: "Yesterday, 4:20 PM" },
];

const CREATE_ACTIONS = [
  { icon: ReceiptText, tone: "primary", title: "New Invoice", copy: "Create and send a sales invoice" },
  { icon: FolderPlus, tone: "neutral", title: "New Project", copy: "Start a new project workspace" },
  { icon: FileSearch, tone: "secondary", title: "New RFQ", copy: "Create a request for quotation" },
  { icon: FileSignature, tone: "secondary", title: "New Quotation", copy: "Build a quotation for a client" },
  { icon: ClipboardCheck, tone: "neutral", title: "New CSR", copy: "Log a customer service report" },
  { icon: Truck, tone: "neutral", title: "New Waybill", copy: "Create a dispatch or delivery waybill" },
  { icon: MailPlus, tone: "secondary", title: "New Letter", copy: "Draft official correspondence" },
];

const SALES_ACTIONS = [
  { icon: ReceiptText, tone: "primary", title: "Invoices", copy: "Create, send, collect, and reconcile." },
  { icon: FileSignature, tone: "secondary", title: "Quotations", copy: "Prepare pricing and convert when approved." },
  { icon: ClipboardCheck, tone: "neutral", title: "CSR", copy: "Track service reports and client sign-off." },
  { icon: Truck, tone: "neutral", title: "Waybills", copy: "Manage dispatch and proof of delivery." },
];

const AI_PROMPTS = [
  { icon: TriangleAlert, tone: "primary", title: "What's overdue?", copy: "Summarize overdue invoices and amounts", prompt: "Which invoices are overdue right now?" },
  { icon: MailPlus, tone: "secondary", title: "Draft a reminder", copy: "Write a follow-up for a slow-paying client", prompt: "Draft a payment reminder for Lagos Steel Works." },
  { icon: ChartNoAxesCombined, tone: "neutral", title: "Explain this month", copy: "Plain-language read on your collections", prompt: "How did collections trend this month?" },
];

const DRAWER_SECTIONS = [
  { label: "Workspace", items: [
    { icon: LayoutDashboard, title: "Dashboard" },
    { icon: FolderKanban, title: "Projects" },
    { icon: ContactRound, title: "Clients" },
  ]},
  { label: "Sales", items: [
    { icon: ReceiptText, title: "Invoices", chevron: true },
    { icon: FileSignature, title: "Quotations", chevron: true },
    { icon: ClipboardCheck, title: "CSR", chevron: true },
    { icon: Truck, title: "Waybills", chevron: true },
  ]},
  { label: "Workspace tools", items: [
    { icon: FileChartColumn, title: "Reports" },
    { icon: ShieldCheck, title: "Compliance Hub" },
    { icon: Library, title: "Item Library" },
    { icon: Settings2, title: "Settings" },
  ]},
];

export default function BigDropsDashboard() {
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerActive, setDrawerActive] = useState("Dashboard");
  const [sheetOpen, setSheetOpen] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [reminderVisible, setReminderVisible] = useState(true);
  const [toastMsg, setToastMsg] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e3a5f");
  const [secondaryColor, setSecondaryColor] = useState("#334155");
  const [primaryInput, setPrimaryInput] = useState("#1e3a5f");
  const [secondaryInput, setSecondaryInput] = useState("#334155");

  const say = (msg) => {
    setToastMsg(msg);
    window.clearTimeout(say._t);
    say._t = window.setTimeout(() => setToastMsg(""), 1900);
  };

  const closeSheet = () => setSheetOpen(null);
  const handleTabClick = (id) => {
    setActiveTab(id);
    if (id === "sales") setSheetOpen("sales");
    else if (id === "more") setSheetOpen("more");
    else setSheetOpen(null);
  };

  const t = isDark
    ? { bg: "#0e131d", surface: "#171f2c", raised: "#1d2635", variant: "#232e40", ink: "#eef2f8", ink2: "#b6c1d1", ink3: "#7b8aa0", line: "rgba(238,242,248,0.09)", lineStrong: "rgba(238,242,248,0.16)" }
    : { bg: "#eef2f6", surface: "#ffffff", raised: "#f7f9fc", variant: "#e7ecf3", ink: "#101826", ink2: "#4b5768", ink3: "#8b96a5", line: "rgba(16,24,38,0.08)", lineStrong: "rgba(16,24,38,0.14)" };

  const toneColor = (tone) => tone === "primary" ? primaryColor : tone === "secondary" ? secondaryColor : t.ink2;
  const gradient = `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`;

  const applyHex = (which, value) => {
    if (which === "primary") { setPrimaryInput(value); if (HEX_RE.test(value)) setPrimaryColor(value); }
    else { setSecondaryInput(value); if (HEX_RE.test(value)) setSecondaryColor(value); }
  };
  const resetTheme = () => {
    setPrimaryColor("#1e3a5f"); setSecondaryColor("#334155");
    setPrimaryInput("#1e3a5f"); setSecondaryInput("#334155");
    say("Theme reset to default");
  };

  const IconTile = ({ icon: Icon, tone, size = 34, iconSize = 16, gradientFill }) => (
    <span
      className="flex items-center justify-center rounded-2xl shrink-0"
      style={{
        width: size, height: size,
        background: gradientFill ? gradient : hexToRgba(toneColor(tone), isDark ? 0.26 : 0.13),
        color: gradientFill ? "#fff" : toneColor(tone),
      }}
    >
      <Icon size={iconSize} strokeWidth={1.9} />
    </span>
  );

  const TopIconButton = ({ children, onClick, filled, label }) => (
    <button
      onClick={onClick}
      aria-label={label}
      className="relative h-9 w-9 rounded-2xl flex items-center justify-center transition-transform active:scale-95"
      style={filled ? { background: gradient, color: "#fff" } : { background: t.raised, border: `1px solid ${t.line}`, color: t.ink }}
    >
      {children}
    </button>
  );

  const metrics = [
    { id: "total", label: "Total invoiced", value: "\u20a61,240,000", trend: "+12% vs last month", tone: "primary", filled: false },
    { id: "collected", label: "Collected this month", value: "\u20a689,000", trend: "+18% vs last month", tone: "primary", filled: true },
    { id: "outstanding", label: "Outstanding receivables", value: "\u20a6340,000", trend: "28% of total invoiced", tone: "secondary", filled: false },
    { id: "overdue", label: "Overdue balance", value: "\u20a686,000", trend: "25% of outstanding", tone: "error", filled: false },
  ];

  const SheetListItem = ({ icon: Icon, tone, title, copy, onClick, chevron }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors active:scale-[0.99]" style={{ background: "transparent" }}>
      <IconTile icon={Icon} tone={tone} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold" style={{ color: t.ink }}>{title}</span>
        {copy && <span className="block text-[11px] mt-0.5 leading-snug" style={{ color: t.ink2 }}>{copy}</span>}
      </span>
      {chevron && <ChevronRight size={16} style={{ color: t.ink3 }} />}
    </button>
  );

  return (
    <div className="w-full flex items-start justify-center font-roboto" style={{ background: isDark ? "#05070c" : "#dbe3ec", padding: "0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Roboto+Mono:wght@400;500&display=swap');
        .font-roboto { font-family: 'Roboto', system-ui, sans-serif; }
        .font-roboto-mono { font-family: 'Roboto Mono', ui-monospace, monospace; }
      `}</style>

      <div
        className="relative w-full max-w-[412px] h-[860px] overflow-hidden flex flex-col sm:rounded-[36px] sm:border sm:mt-6 sm:mb-6 sm:shadow-2xl"
        style={{ background: t.bg, color: t.ink, borderColor: t.lineStrong }}
      >
        {/* Top App Bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-3 pt-3 pb-2" style={{ background: t.bg }}>
          <div className="flex items-center gap-2 min-w-0">
            <TopIconButton onClick={() => setDrawerOpen(true)} label="Open navigation">
              <PanelLeft size={17} strokeWidth={1.9} />
            </TopIconButton>
            <div className="min-w-0 ml-0.5">
              <div className="text-[7px] font-extrabold tracking-widest uppercase" style={{ color: t.ink3 }}>Bigdrops Workspace</div>
              <div className="text-[13px] font-extrabold tracking-tight truncate">Milad A.</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TopIconButton onClick={() => setIsDark((d) => !d)} label="Toggle theme">
              {isDark ? <Sun size={16} strokeWidth={1.9} /> : <Moon size={16} strokeWidth={1.9} />}
            </TopIconButton>
            <TopIconButton onClick={() => setSheetOpen("notifications")} label="Notifications">
              <Bell size={16} strokeWidth={1.9} />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "#ef4444", boxShadow: `0 0 0 1.5px ${t.raised}` }} />
            </TopIconButton>
            <TopIconButton onClick={() => setSearchOpen(true)} label="Search">
              <Search size={16} strokeWidth={1.9} />
            </TopIconButton>
            <button
              onClick={() => setSheetOpen("ai")}
              className="h-9 px-3 rounded-2xl flex items-center gap-1.5 text-[10px] font-extrabold tracking-wide transition-transform active:scale-95"
              style={{ background: gradient, color: "#fff" }}
            >
              <Sparkles size={13} /> AI
            </button>
          </div>
        </header>

        {/* Scroll content */}
        <main className="flex-1 overflow-y-auto px-3 pb-28" style={{ scrollbarWidth: "none" }}>
          {activeTab === "home" && (
            <>
              <div className="flex items-center justify-between mt-1 mb-2 px-0.5">
                <span className="text-[8px] font-extrabold tracking-widest uppercase" style={{ color: t.ink3 }}>Finance pulse &middot; August 2026</span>
                <button onClick={() => say("Dashboard metrics settings opened")} className="text-[9px] font-extrabold" style={{ color: primaryColor }}>Edit metrics</button>
              </div>

              <section className="grid grid-cols-2 gap-2">
                {metrics.map((m) => {
                  const accent = m.tone === "error" ? "#ef4444" : toneColor(m.tone);
                  return (
                    <button
                      key={m.id}
                      onClick={() => say(m.label + " opened")}
                      className="relative overflow-hidden rounded-[22px] p-3 min-h-[108px] flex flex-col text-left"
                      style={m.filled
                        ? { background: gradient, color: "#fff" }
                        : { background: t.surface, border: `1px solid ${t.line}`, boxShadow: isDark ? "0 8px 20px rgba(0,0,0,0.35)" : "0 8px 20px rgba(16,24,38,0.06)" }}
                    >
                      <span
                        className="absolute -right-8 -bottom-9 h-20 w-20 rounded-full"
                        style={{ background: m.filled ? "rgba(255,255,255,0.18)" : hexToRgba(accent, 0.18) }}
                      />
                      <span className="relative text-[8px] font-extrabold uppercase tracking-wide" style={{ color: m.filled ? "rgba(255,255,255,0.8)" : t.ink2 }}>{m.label}</span>
                      <span className="relative font-roboto-mono text-[17px] font-medium tracking-tight mt-2" style={{ color: m.filled ? "#fff" : t.ink }}>{m.value}</span>
                      <span className="relative text-[8px] mt-auto pt-1" style={{ color: m.filled ? "rgba(255,255,255,0.8)" : t.ink3 }}>
                        <b style={{ color: m.filled ? "#fff" : accent }}>{m.trend}</b>
                      </span>
                    </button>
                  );
                })}
              </section>

              <section className="mt-4">
                <h2 className="text-[9px] font-extrabold tracking-widest uppercase mb-2 px-0.5" style={{ color: t.ink3 }}>Recent activity</h2>
                <div className="rounded-3xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.line}` }}>
                  {ACTIVITY.map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => say("Document detail opened")}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                      style={i > 0 ? { borderTop: `1px solid ${t.line}` } : {}}
                    >
                      <IconTile icon={a.icon} tone={a.tone === "neutral" ? "neutral" : a.tone} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-tight">
                          {a.id}
                          <Badge
                            variant="outline"
                            className="text-[6px] px-1.5 py-0 h-4 font-extrabold uppercase tracking-wide border-0"
                            style={{
                              background: a.status === "Draft" ? hexToRgba(primaryColor, 0.14) : a.status === "Delivered" ? t.variant : hexToRgba(secondaryColor, 0.14),
                              color: a.status === "Draft" ? primaryColor : a.status === "Delivered" ? t.ink2 : secondaryColor,
                            }}
                          >
                            {a.status}
                          </Badge>
                        </span>
                        <span className="block text-[8px] mt-0.5 truncate" style={{ color: t.ink2 }}>{a.client} &middot; {a.date}</span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block font-roboto-mono text-[10px] font-medium tracking-tight">{a.value}</span>
                        <span className="block text-[7px] mt-0.5" style={{ color: t.ink3 }}>{a.date}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {reminderVisible && (
                <section className="mt-4">
                  <h2 className="text-[9px] font-extrabold tracking-widest uppercase mb-2 px-0.5" style={{ color: t.ink3 }}>Payment reminder</h2>
                  <div
                    className="relative overflow-hidden rounded-3xl p-3"
                    style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, isDark ? 0.22 : 0.1)}, ${hexToRgba(secondaryColor, isDark ? 0.22 : 0.1)})`, border: `1px solid ${t.line}` }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="h-9 w-9 shrink-0 rounded-2xl flex items-center justify-center" style={{ background: gradient, color: "#fff" }}>
                        <BellRing size={16} strokeWidth={1.9} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[7px] font-extrabold uppercase tracking-widest" style={{ color: t.ink3 }}>Smart banner</div>
                        <h3 className="text-[12px] font-extrabold tracking-tight mt-0.5 mb-0.5">Keep payments recorded as they land</h3>
                        <p className="text-[9px] leading-relaxed" style={{ color: t.ink2 }}>Record each invoice payment promptly so your books stay accurate.</p>
                        <div className="flex items-center gap-2.5 mt-2">
                          <Button
                            size="sm"
                            onClick={() => say("Opening payment recording")}
                            className="h-7 rounded-xl px-3 text-[8px] font-extrabold uppercase tracking-wide gap-1.5 border-0"
                            style={{ background: gradient, color: "#fff" }}
                          >
                            Record payments <ArrowRight size={11} />
                          </Button>
                          <span className="flex items-center gap-1 text-[7px] font-bold" style={{ color: t.ink2 }}>
                            <CircleDotDashed size={11} /> Evergreen
                          </span>
                        </div>
                      </div>
                      <button onClick={() => { setReminderVisible(false); say("Reminder dismissed"); }} className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ color: t.ink3 }}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </section>
              )}

              <section className="mt-4">
                <div className="px-0.5 mb-2">
                  <h2 className="text-[9px] font-extrabold tracking-widest uppercase" style={{ color: t.ink3 }}>Recent alerts</h2>
                  <p className="text-[9px] mt-0.5" style={{ color: t.ink2 }}>What needs a response, not just a read.</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {ALERTS.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => say("Notification marked for review")}
                      className="min-w-[190px] w-[190px] text-left rounded-3xl p-2.5 shrink-0"
                      style={{ background: t.raised, border: `1px solid ${t.line}` }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="h-8 w-8 shrink-0 rounded-2xl flex items-center justify-center" style={{ background: a.warn ? "rgba(239,68,68,0.14)" : hexToRgba(primaryColor, isDark ? 0.26 : 0.13), color: a.warn ? "#ef4444" : primaryColor }}>
                          <a.icon size={14} strokeWidth={1.9} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[6px] font-extrabold uppercase tracking-widest" style={{ color: t.ink3 }}>{a.overline}</div>
                          <div className="text-[10px] font-extrabold leading-tight mt-0.5">{a.title}</div>
                        </div>
                      </div>
                      <p className="text-[8px] leading-relaxed mt-1.5 mb-2" style={{ color: t.ink2 }}>{a.body}</p>
                      <div className="flex justify-between text-[7px] font-bold" style={{ color: t.ink3 }}>
                        <span>{a.time}</span><span>{a.state}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-4">
                <h2 className="text-[9px] font-extrabold tracking-widest uppercase mb-2 px-0.5" style={{ color: t.ink3 }}>Audit trail</h2>
                <div className="rounded-3xl px-3" style={{ background: t.surface, border: `1px solid ${t.line}` }}>
                  {AUDIT.map((row, i) => (
                    <div key={i} className="flex gap-2.5 py-2.5" style={i > 0 ? { borderTop: `1px solid ${t.line}` } : {}}>
                      <span className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: toneColor(row.tone), boxShadow: `0 0 0 3px ${hexToRgba(toneColor(row.tone), 0.16)}` }} />
                      <div>
                        <div className="text-[9px] font-bold leading-snug">{row.text}</div>
                        <div className="text-[7px] mt-0.5" style={{ color: t.ink3 }}>{row.meta}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <div className="h-2" />
            </>
          )}

          {activeTab !== "home" && (
            <div className="pt-16 text-center">
              <div className="h-14 w-14 mx-auto mb-3 rounded-3xl flex items-center justify-center" style={{ background: hexToRgba(primaryColor, isDark ? 0.26 : 0.13), color: primaryColor }}>
                {(() => { const Icon = NAV_TABS.find((tb) => tb.id === activeTab)?.icon || House; return <Icon size={24} strokeWidth={1.9} />; })()}
              </div>
              <h2 className="text-[16px] font-extrabold tracking-tight capitalize">{activeTab}</h2>
              <p className="text-[10px] leading-relaxed mt-1 max-w-[210px] mx-auto" style={{ color: t.ink2 }}>
                {activeTab === "projects" && "Your project workspaces and live updates open here."}
                {activeTab === "clients" && "Your client records, activity, and commercial history open here."}
              </p>
            </div>
          )}
        </main>

        {/* FAB */}
        <button
          onClick={() => setSheetOpen(sheetOpen === "create" ? null : "create")}
          className="absolute z-30 right-4 bottom-24 h-14 w-14 rounded-2xl flex items-center justify-center transition-transform active:scale-95"
          style={{ background: gradient, color: "#fff", boxShadow: `0 10px 24px ${hexToRgba(primaryColor, 0.4)}` }}
        >
          <Plus size={22} className="transition-transform duration-200" style={{ transform: sheetOpen === "create" ? "rotate(45deg)" : "none" }} />
        </button>

        {/* Bottom navigation */}
        <nav
          className="absolute z-20 left-2.5 right-2.5 bottom-2.5 h-[62px] rounded-[22px] flex items-center justify-around px-1"
          style={{ background: isDark ? "rgba(23,31,44,0.92)" : "rgba(255,255,255,0.92)", border: `1px solid ${t.lineStrong}`, backdropFilter: "blur(10px)", boxShadow: isDark ? "0 12px 28px rgba(0,0,0,0.4)" : "0 12px 28px rgba(16,24,38,0.12)" }}
        >
          {NAV_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => handleTabClick(tab.id)} className="relative flex flex-col items-center justify-center gap-0.5 h-[52px] w-14 rounded-2xl transition-colors">
                <span className="flex items-center justify-center h-7 w-11 rounded-full transition-colors" style={active ? { background: gradient } : {}}>
                  <tab.icon size={18} strokeWidth={1.9} style={{ color: active ? "#fff" : t.ink3 }} />
                </span>
                <span className="text-[7px] font-extrabold" style={{ color: active ? primaryColor : t.ink3 }}>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Snackbar */}
        <div
          className="absolute left-4 right-4 z-40 flex items-center rounded-2xl px-4 py-3 transition-all duration-300"
          style={{
            bottom: "94px",
            background: isDark ? "#e7edf6" : "#182233",
            color: isDark ? "#101826" : "#f4f7fb",
            boxShadow: "0 14px 30px rgba(0,0,0,0.28)",
            opacity: toastMsg ? 1 : 0,
            transform: toastMsg ? "translateY(0)" : "translateY(10px)",
            pointerEvents: "none",
          }}
        >
          <span className="text-[10px] font-extrabold">{toastMsg}</span>
        </div>

        {/* Search overlay */}
        <div
          className="absolute inset-0 z-40 flex flex-col px-3.5 pt-3.5 transition-transform duration-300"
          style={{ background: t.bg, transform: searchOpen ? "translateY(0)" : "translateY(-100%)" }}
        >
          <div className="flex items-center gap-2">
            <div className="h-10 flex-1 flex items-center gap-2 rounded-2xl px-3" style={{ background: t.variant }}>
              <Search size={16} style={{ color: t.ink2 }} />
              <input placeholder="Search documents, clients, projects" className="w-full bg-transparent outline-none text-[12px]" style={{ color: t.ink }} />
            </div>
            <button onClick={() => setSearchOpen(false)} className="text-[10px] font-extrabold px-1" style={{ color: primaryColor }}>Cancel</button>
          </div>
          <div className="mt-6">
            <h3 className="text-[8px] font-extrabold uppercase tracking-widest mb-2 px-0.5" style={{ color: t.ink3 }}>Recent searches</h3>
            {[
              { title: "INV-0045", copy: "Lagos Steel Works \u00b7 Invoice" },
              { title: "QTN-0108", copy: "Acme Ltd \u00b7 Quotation" },
              { title: "Site Alpha", copy: "Project \u00b7 Waybill activity" },
            ].map((s, i) => (
              <button key={i} onClick={() => { setSearchOpen(false); say(s.title + " opened"); }} className="w-full text-left py-2.5" style={{ borderTop: i > 0 ? `1px solid ${t.line}` : "none" }}>
                <div className="text-[11px] font-extrabold">{s.title}</div>
                <div className="text-[8px] mt-0.5" style={{ color: t.ink2 }}>{s.copy}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-[84%] max-w-[320px] p-0 flex flex-col rounded-r-[24px]" style={{ background: t.surface, color: t.ink, borderColor: t.line }}>
            <div className="flex items-center gap-2.5 px-4 py-4" style={{ borderBottom: `1px solid ${t.line}` }}>
              <span className="h-9 w-9 rounded-2xl flex items-center justify-center" style={{ background: gradient, color: "#fff" }}><Sparkles size={16} /></span>
              <div>
                <div className="text-[13px] font-extrabold tracking-tight">BIGDROPS</div>
                <div className="text-[7px] uppercase tracking-widest font-extrabold" style={{ color: t.ink3 }}>Project finance workspace</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2.5 py-2.5">
              {DRAWER_SECTIONS.map((sec, si) => (
                <div key={sec.label} className={si > 0 ? "mt-2" : ""}>
                  <div className="px-2 py-1.5 text-[7px] font-extrabold uppercase tracking-widest" style={{ color: t.ink3 }}>{sec.label}</div>
                  {sec.items.map((item) => {
                    const active = drawerActive === item.title;
                    return (
                      <button
                        key={item.title}
                        onClick={() => { setDrawerActive(item.title); setDrawerOpen(false); say(item.title + " selected"); }}
                        className="w-full flex items-center gap-2.5 rounded-2xl px-2.5 py-2.5 text-left"
                        style={active ? { background: hexToRgba(primaryColor, isDark ? 0.28 : 0.12), color: primaryColor } : { color: t.ink2 }}
                      >
                        <item.icon size={16} strokeWidth={1.9} />
                        <span className="text-[11px] font-extrabold flex-1">{item.title}</span>
                        {item.chevron && <ChevronRight size={13} style={{ color: t.ink3 }} />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderTop: `1px solid ${t.line}` }}>
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[8px] font-extrabold" style={{ background: hexToRgba(primaryColor, 0.16), color: primaryColor }}>MA</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-[10px] font-extrabold">Milad A.</div>
                <div className="text-[8px]" style={{ color: t.ink3 }}>Operator</div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* AI assistant sheet */}
        <Sheet open={sheetOpen === "ai"} onOpenChange={(v) => !v && closeSheet()}>
          <SheetContent side="bottom" className="rounded-t-[26px] max-h-[80%] overflow-y-auto p-4" style={{ background: t.surface, color: t.ink }}>
            <SheetHeader className="text-left mb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-2xl flex items-center justify-center" style={{ background: gradient, color: "#fff" }}><Sparkles size={15} /></span>
                <div>
                  <SheetTitle className="text-[14px]" style={{ color: t.ink }}>BIGDROPS Assistant</SheetTitle>
                  <SheetDescription className="text-[9px]" style={{ color: t.ink2 }}>Ask about invoices, clients, or your numbers.</SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <div className="flex flex-col gap-1">
              {AI_PROMPTS.map((p) => (
                <SheetListItem key={p.title} icon={p.icon} tone={p.tone} title={p.title} copy={p.copy} onClick={() => { closeSheet(); say("Asking the assistant\u2026"); }} />
              ))}
            </div>
            <Separator className="my-3" style={{ background: t.line }} />
            <div className="h-10 flex items-center gap-2 rounded-2xl px-3" style={{ background: t.variant }}>
              <Sparkles size={15} style={{ color: t.ink2 }} />
              <input placeholder="Ask the assistant anything\u2026" className="w-full bg-transparent outline-none text-[12px]" style={{ color: t.ink }} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Create action sheet */}
        <Sheet open={sheetOpen === "create"} onOpenChange={(v) => !v && closeSheet()}>
          <SheetContent side="bottom" className="rounded-t-[26px] max-h-[80%] overflow-y-auto p-4" style={{ background: t.surface, color: t.ink }}>
            <SheetHeader className="text-left mb-2">
              <SheetTitle className="text-[14px]" style={{ color: t.ink }}>Create</SheetTitle>
              <SheetDescription className="text-[9px]" style={{ color: t.ink2 }}>Start a record in the correct BIGDROPS workspace.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-1">
              {CREATE_ACTIONS.map((a) => (
                <SheetListItem key={a.title} icon={a.icon} tone={a.tone} title={a.title} copy={a.copy} onClick={() => { closeSheet(); say(a.title + " opened"); }} />
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Sales sheet */}
        <Sheet open={sheetOpen === "sales"} onOpenChange={(v) => !v && closeSheet()}>
          <SheetContent side="bottom" className="rounded-t-[26px] max-h-[80%] overflow-y-auto p-4" style={{ background: t.surface, color: t.ink }}>
            <SheetHeader className="text-left mb-2">
              <SheetTitle className="text-[14px]" style={{ color: t.ink }}>Sales</SheetTitle>
              <SheetDescription className="text-[9px]" style={{ color: t.ink2 }}>Create, send, collect, and reconcile commercial documents.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-1">
              {SALES_ACTIONS.map((a) => (
                <SheetListItem key={a.title} icon={a.icon} tone={a.tone} title={a.title} copy={a.copy} onClick={() => { closeSheet(); say(a.title + " opened"); }} />
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* More sheet */}
        <Sheet open={sheetOpen === "more"} onOpenChange={(v) => !v && closeSheet()}>
          <SheetContent side="bottom" className="rounded-t-[26px] max-h-[80%] overflow-y-auto p-4" style={{ background: t.surface, color: t.ink }}>
            <SheetHeader className="text-left mb-2">
              <SheetTitle className="text-[14px]" style={{ color: t.ink }}>More</SheetTitle>
              <SheetDescription className="text-[9px]" style={{ color: t.ink2 }}>Admin, reporting, and workspace utilities.</SheetDescription>
            </SheetHeader>

            <div className="text-[7px] font-extrabold uppercase tracking-widest px-2 mb-1 mt-1" style={{ color: t.ink3 }}>Correspondence</div>
            <SheetListItem icon={Mail} tone="neutral" title="Letters" copy="Official correspondence and notices." onClick={() => { closeSheet(); say("Letters opened"); }} />

            <Separator className="my-2" style={{ background: t.line }} />
            <div className="text-[7px] font-extrabold uppercase tracking-widest px-2 mb-1" style={{ color: t.ink3 }}>Finance &amp; reporting</div>
            <div className="flex flex-col gap-1">
              <SheetListItem icon={FileChartColumn} tone="neutral" title="Reports" copy="Revenue, collections, workload, and trends." onClick={() => { closeSheet(); say("Reports opened"); }} />
              <SheetListItem icon={ShieldCheck} tone="neutral" title="Compliance Hub" copy="Approvals, policy logs, and audit trail." onClick={() => { closeSheet(); say("Compliance Hub opened"); }} />
              <SheetListItem icon={Receipt} tone="neutral" title="Receipts" copy="View payment receipts and download PDFs." onClick={() => { closeSheet(); say("Receipts opened"); }} />
              <SheetListItem icon={Library} tone="neutral" title="Item Library" copy="Review price history and master item usage." onClick={() => { closeSheet(); say("Item Library opened"); }} />
            </div>

            <Separator className="my-2" style={{ background: t.line }} />
            <div className="text-[7px] font-extrabold uppercase tracking-widest px-2 mb-1" style={{ color: t.ink3 }}>Workspace</div>
            <div className="flex flex-col gap-1">
              <SheetListItem icon={Palette} tone="primary" title="Theme colors" copy="Set your own primary and secondary colors" onClick={() => setSheetOpen("theme")} />
              <SheetListItem icon={Settings2} tone="neutral" title="Settings" copy="Roles, preferences, notifications, and workspace controls." onClick={() => { closeSheet(); say("Settings opened"); }} />
              <SheetListItem icon={LogOut} tone="secondary" title="Sign out" copy="Exit this workspace securely." onClick={() => { closeSheet(); say("Sign out selected"); }} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Theme sheet */}
        <Sheet open={sheetOpen === "theme"} onOpenChange={(v) => !v && closeSheet()}>
          <SheetContent side="bottom" className="rounded-t-[26px] max-h-[80%] overflow-y-auto p-4" style={{ background: t.surface, color: t.ink }}>
            <SheetHeader className="text-left mb-3">
              <SheetTitle className="text-[14px]" style={{ color: t.ink }}>Theme colors</SheetTitle>
              <SheetDescription className="text-[9px]" style={{ color: t.ink2 }}>Type any hex code &mdash; the whole app updates live.</SheetDescription>
            </SheetHeader>
            <div className="h-14 rounded-2xl mb-4" style={{ background: gradient }} />
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2.5">
                <span className="h-9 w-9 shrink-0 rounded-xl" style={{ background: primaryColor, border: `1px solid ${t.lineStrong}` }} />
                <span className="flex-1">
                  <span className="block text-[8px] font-extrabold uppercase tracking-wide mb-1" style={{ color: t.ink3 }}>Primary</span>
                  <input
                    value={primaryInput}
                    onChange={(e) => applyHex("primary", e.target.value)}
                    maxLength={7}
                    placeholder="#1e3a5f"
                    className="w-full h-9 rounded-xl px-2.5 text-[12px] outline-none font-roboto-mono"
                    style={{ background: t.raised, border: `1px solid ${t.lineStrong}`, color: t.ink }}
                  />
                </span>
              </label>
              <label className="flex items-center gap-2.5">
                <span className="h-9 w-9 shrink-0 rounded-xl" style={{ background: secondaryColor, border: `1px solid ${t.lineStrong}` }} />
                <span className="flex-1">
                  <span className="block text-[8px] font-extrabold uppercase tracking-wide mb-1" style={{ color: t.ink3 }}>Secondary</span>
                  <input
                    value={secondaryInput}
                    onChange={(e) => applyHex("secondary", e.target.value)}
                    maxLength={7}
                    placeholder="#334155"
                    className="w-full h-9 rounded-xl px-2.5 text-[12px] outline-none font-roboto-mono"
                    style={{ background: t.raised, border: `1px solid ${t.lineStrong}`, color: t.ink }}
                  />
                </span>
              </label>
            </div>
            <Separator className="my-3" style={{ background: t.line }} />
            <SheetListItem icon={RotateCcw} tone="neutral" title="Reset to default" copy="Back to the original slate navy" onClick={resetTheme} />
          </SheetContent>
        </Sheet>

        {/* Notifications sheet */}
        <Sheet open={sheetOpen === "notifications"} onOpenChange={(v) => !v && closeSheet()}>
          <SheetContent side="bottom" className="rounded-t-[26px] max-h-[80%] overflow-y-auto p-4" style={{ background: t.surface, color: t.ink }}>
            <SheetHeader className="text-left mb-2">
              <SheetTitle className="text-[14px]" style={{ color: t.ink }}>Notifications</SheetTitle>
              <SheetDescription className="text-[9px]" style={{ color: t.ink2 }}>Live activity from your BIGDROPS workspace.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-1">
              {ALERTS.map((a, i) => (
                <SheetListItem
                  key={i}
                  icon={a.icon}
                  tone={a.warn ? "secondary" : "primary"}
                  title={a.title}
                  copy={a.body}
                  onClick={() => { closeSheet(); say("Notification marked for review"); }}
                />
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
