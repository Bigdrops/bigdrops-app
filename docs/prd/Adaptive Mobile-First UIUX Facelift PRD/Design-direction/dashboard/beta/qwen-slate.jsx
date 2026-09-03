import React, { useState, useEffect } from 'react';
import { 
  PanelLeft, Moon, Sun, Bell, Search, ReceiptText, FileSignature, 
  Truck, BellRing, ArrowRight, CircleDotDashed, X, TriangleAlert, 
  CircleCheck, Receipt, Folders, ChartNoAxesCombined, UsersRound, 
  Ellipsis, House, FolderKanban, ContactRound, Sparkles, MailPlus, 
  FolderPlus, FileSearch, ClipboardCheck, Mail, FileChartColumn, 
  ShieldCheck, Library, Settings2, LogOut, Palette, RotateCcw, Plus, ChevronRight
} from 'lucide-react';

export default function BigDropsDashboard() {
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [primaryHex, setPrimaryHex] = useState('#1e3a5f');
  const [secondaryHex, setSecondaryHex] = useState('#0f172a');
  const [customCss, setCustomCss] = useState('');
  const [hexWarning, setHexWarning] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState('Dashboard');

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(''), 1900);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('bigdrops-real-theme', theme);
  }, [theme]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('bigdrops-real-theme') || 'light';
    setTheme(savedTheme);
    const sp = localStorage.getItem('bigdrops-primary-hex');
    const ss = localStorage.getItem('bigdrops-secondary-hex');
    if (sp || ss) {
      updateCustomTheme(sp || '#1e3a5f', ss || '#0f172a');
    }
  }, []);

  const showToast = (msg) => setToastMsg(msg);

  const closeAll = () => {
    setIsDrawerOpen(false);
    setActiveSheet(null);
    setIsSearchOpen(false);
    setIsFabOpen(false);
  };

  const openSheet = (sheetName) => {
    closeAll();
    setActiveSheet(sheetName);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    showToast(newTheme === 'dark' ? 'Dark appearance selected' : 'Light appearance selected');
  };

  const hexToHsl = (hex) => {
    if (hex.length === 4) hex = '#' + [...hex.slice(1)].map(c => c + c).join('');
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; } 
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  };

  const hslToHex = (h, s, l) => {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) { r = g = b = l; } 
    else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
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
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
  };

  const darkVariant = (hex) => {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(h, Math.max(s - 12, 30), Math.min(l + 26, 82));
  };

  const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

  const updateCustomTheme = (p, s) => {
    const pp = p || (theme === 'dark' ? '#60a5fa' : '#1e3a5f');
    const ss = s || (theme === 'dark' ? '#94a3b8' : '#0f172a');
    setCustomCss(`
      :root:not([data-theme="dark"]) { --primary: ${pp}; --secondary: ${ss}; }
      [data-theme="dark"] { --primary: ${darkVariant(pp)}; --secondary: ${darkVariant(ss)}; }
    `);
    setPrimaryHex(pp);
    setSecondaryHex(ss);
  };

  const handleHexInput = (value, isPrimary) => {
    if (HEX_RE.test(value)) {
      setHexWarning(false);
      if (isPrimary) {
        localStorage.setItem('bigdrops-primary-hex', value);
        updateCustomTheme(value, secondaryHex);
      } else {
        localStorage.setItem('bigdrops-secondary-hex', value);
        updateCustomTheme(primaryHex, value);
      }
    } else if (value.length > 0) {
      setHexWarning(true);
    } else {
      setHexWarning(false);
    }
  };

  const setTab = (t) => {
    setActiveTab(t);
    if (t === 'sales') {
      openSheet('sales');
    } else if (t === 'more') {
      openSheet('more');
    } else {
      closeAll();
    }
    const scrollEl = document.getElementById('scroll');
    if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDestinationClick = (dest) => {
    closeAll();
    setIsSearchOpen(false);
    showToast(`${dest} opened`);
  };

  return (
    <>
      <style>{`
        :root {  
          --bg: #f0f4f8;  
          --surface: #ffffff;  
          --surface-raised: #f8fafc;  
          --surface-muted: #e2e8f0;  
          --surface-strong: #cbd5e1;  
          --ink: #0f172a;  
          --ink-2: #475569;  
          --ink-3: #94a3b8;  
          --primary: #1e3a5f;  
          --primary-bright: #3b82f6;  
          --primary-soft: color-mix(in srgb, var(--primary) 14%, transparent);  
          --secondary: #0f172a;  
          --secondary-bright: #64748b;  
          --secondary-soft: color-mix(in srgb, var(--secondary) 13%, transparent);  
          --attention: #ef4444;  
          --attention-soft: #fee2e2;  
          --sage: #64748b;  
          --sage-soft: #f1f5f9;  
          --line: rgba(15, 23, 42, .07);  
          --line-strong: rgba(15, 23, 42, .14);  
          --shadow: 0 12px 28px color-mix(in srgb, var(--primary) 8%, transparent), 0 2px 6px rgba(15, 23, 42, .04);  
          --shadow-float: 0 18px 40px color-mix(in srgb, var(--primary) 18%, transparent), 0 3px 9px rgba(15, 23, 42, .07);  
          --nav: rgba(255, 255, 255, .88);  
          --gradient: linear-gradient(135deg, var(--primary), var(--secondary));  
          --font: Manrope, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;  
          --number: "DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace;  
        }  
        [data-theme="dark"] {  
          --bg: #0f172a;  
          --surface: #1e293b;  
          --surface-raised: #253448;  
          --surface-muted: #334155;  
          --surface-strong: #475569;  
          --ink: #f1f5f9;  
          --ink-2: #cbd5e1;  
          --ink-3: #64748b;  
          --primary: #60a5fa;  
          --primary-bright: #93c5fd;  
          --primary-soft: color-mix(in srgb, var(--primary) 20%, transparent);  
          --secondary: #94a3b8;  
          --secondary-bright: #cbd5e1;  
          --secondary-soft: color-mix(in srgb, var(--secondary) 18%, transparent);  
          --attention: #f87171;  
          --attention-soft: #3b1518;  
          --sage: #94a3b8;  
          --sage-soft: #1e293b;  
          --line: rgba(241, 245, 249, .08);  
          --line-strong: rgba(241, 245, 249, .15);  
          --shadow: 0 12px 28px rgba(0, 0, 0, .38), 0 2px 6px rgba(0, 0, 0, .26);  
          --shadow-float: 0 18px 44px rgba(0, 0, 0, .52), 0 3px 10px rgba(0, 0, 0, .34);  
          --nav: rgba(15, 23, 42, .88);  
        }  
        [data-theme="dark"] body {  
          background: radial-gradient(ellipse at top, color-mix(in srgb, var(--secondary) 30%, #121e1e), color-mix(in srgb, var(--primary) 35%, #0a1212) 60%, color-mix(in srgb, var(--primary) 14%, black));  
        }  
        * { box-sizing: border-box; }  
        html, body { height: 100%; }  
        body { margin: 0; background: radial-gradient(ellipse at top, color-mix(in srgb, var(--secondary) 18%, #f0fafa), color-mix(in srgb, var(--secondary) 40%, white) 60%, color-mix(in srgb, var(--primary) 48%, white)); color: var(--ink); font-family: var(--font); -webkit-font-smoothing: antialiased; transition: background .36s ease; }  
        button { font: inherit; color: inherit; border: 0; background: none; cursor: pointer; -webkit-tap-highlight-color: transparent; }  
        button:active { transform: scale(.965); }  
        button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }  
        .app { width: 100%; max-width: 430px; height: 100dvh; position: relative; margin: 0 auto; overflow: hidden; background: var(--bg); transition: background .34s ease, color .34s ease; }  
        .grain { pointer-events: none; position: absolute; inset: 0; z-index: 0; opacity: .035; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 140 140' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E"); mix-blend-mode: multiply; }  
        .shell { height: 100%; position: relative; z-index: 1; }  
        .scroll { height: 100%; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; padding: 0 14px calc(106px + env(safe-area-inset-bottom)); }  
        .scroll::-webkit-scrollbar { display: none; }  
        .topbar { position: sticky; top: 0; z-index: 10; height: calc(58px + env(safe-area-inset-top)); padding: calc(8px + env(safe-area-inset-top)) 0 8px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(180deg, var(--bg) 72%, color-mix(in srgb, var(--bg) 0%, transparent)); transition: background .34s ease; }  
        .top-left, .top-right { display: flex; align-items: center; gap: 5px; min-width: 0; }  
        .top-right { gap: 4px; }  
        .top-btn, .avatar-btn { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 12px; border: 1px solid var(--line); background: var(--surface-raised); box-shadow: 0 2px 6px rgba(30,28,24,.05), inset 0 1px rgba(255,255,255,.35); position: relative; }  
        .top-btn svg { width: 17px; height: 17px; }  
        .top-btn.active { background: var(--gradient); color: #fff; border-color: transparent; }  
        .identity { min-width: 0; margin-left: 1px; }  
        .workspace { color: var(--ink-3); text-transform: uppercase; letter-spacing: .075em; font-size: 7px; font-weight: 800; white-space: nowrap; }  
        .owner { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; font-size: 13px; font-weight: 800; letter-spacing: -.045em; }  
        .notif-pip { position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; border-radius: 50%; background: var(--attention); border: 1.5px solid var(--surface-raised); }  
        .avatar-btn { border-radius: 50%; color: var(--primary); font-size: 9px; font-weight: 800; }  
        .page { display: none; }  
        .page.active { display: block; animation: page-in .2s ease-out both; }  
        @keyframes page-in { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }  
        .dashboard { padding-top: 6px; }  
        .eyebrow { display: flex; justify-content: space-between; align-items: center; margin: 0 2px 8px; }  
        .eyebrow span { font-size: 8px; font-weight: 800; letter-spacing: .11em; text-transform: uppercase; color: var(--ink-3); }  
        .eyebrow button { font-size: 9px; color: var(--primary); font-weight: 800; }  
        .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }  
        .metric { min-height: 108px; padding: 11px 12px 10px; border: 1px solid var(--line); border-radius: 18px; background: var(--surface); box-shadow: var(--shadow); display: flex; flex-direction: column; position: relative; overflow: hidden; text-align: left; }  
        .metric:after { content: ""; width: 84px; height: 84px; position: absolute; right: -36px; bottom: -42px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, var(--metric-soft), var(--metric) 140%); opacity: .5; }  
        .metric:before { content: ""; width: 34px; height: 34px; position: absolute; right: 10px; top: -14px; border-radius: 50%; border: 2px solid var(--metric-soft); opacity: .55; }  
        .metric > * { position: relative; z-index: 1; }  
        .metric.collect { --metric: var(--primary); --metric-soft: var(--primary-soft); background: var(--gradient); border-color: transparent; }  
        .metric.collect .metric-label, .metric.collect .metric-trend { color: rgba(255,255,255,.78); }  
        .metric.collect .metric-value { color: #fff; }  
        .metric.collect .metric-trend b { color: #fff; }  
        .metric.collect:after { background: radial-gradient(circle at 35% 35%, rgba(255,255,255,.35), rgba(255,255,255,0) 140%); opacity: 1; }  
        .metric.collect:before { border-color: rgba(255,255,255,.4); }  
        .metric.overdue { --metric: var(--attention); --metric-soft: var(--attention-soft); }  
        .metric.awaiting { --metric: var(--secondary); --metric-soft: var(--secondary-soft); }  
        .metric.due { --metric: var(--sage); --metric-soft: var(--sage-soft); }  
        .metric-label { font-size: 8px; line-height: 1.2; text-transform: uppercase; letter-spacing: .07em; font-weight: 800; color: var(--ink-2); }  
        .tickbar { display: flex; align-items: center; gap: 2.5px; height: 9px; margin: 8px 0 7px; }  
        .tickbar i { display: block; flex: 0 0 3px; width: 3px; height: 9px; border-radius: 1.5px; background: var(--line-strong); }  
        .tickbar i.on { background: var(--metric); }  
        .metric.collect .tickbar i { background: rgba(255,255,255,.3); }  
        .metric.collect .tickbar i.on { background: #fff; }  
        .metric-value { font-family: var(--number); font-size: 17px; font-weight: 500; letter-spacing: -.075em; color: var(--ink); white-space: nowrap; }  
        .metric-trend { margin-top: auto; font-size: 8px; color: var(--ink-3); line-height: 1.3; }  
        .metric-trend b { color: var(--metric); font-weight: 800; }  
        .metric-trend:not(.neutral) b:before { content: "▲"; display: inline-block; font-size: 6px; color: #16a34a; margin-right: 3px; transform: translateY(-1px); }  
        .metric.collect .metric-trend:not(.neutral) b:before { color: #fff; }  
        .metric-trend.neutral b { color: var(--ink-2); }  
        .section { margin-top: 14px; }  
        .section-title { margin: 0 2px 8px; font-size: 9px; letter-spacing: .105em; text-transform: uppercase; color: var(--ink-3); font-weight: 800; }  
        .card { border: 1px solid var(--line); background: var(--surface); border-radius: 18px; box-shadow: var(--shadow); overflow: hidden; }  
        .activity-row { width: 100%; display: flex; align-items: center; gap: 9px; padding: 9px 11px; text-align: left; border-top: 1px solid var(--line); }  
        .activity-row:first-child { border-top: 0; }  
        .activity-icon { height: 32px; width: 32px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 32px; background: var(--icon-bg); color: var(--icon); border: 1px solid color-mix(in srgb, var(--icon) 12%, transparent); }  
        .activity-icon svg { height: 15px; width: 15px; }  
        .invoice { --icon: var(--primary); --icon-bg: var(--primary-soft); }  
        .quote { --icon: var(--secondary); --icon-bg: var(--secondary-soft); }  
        .waybill { --icon: var(--sage); --icon-bg: var(--sage-soft); }  
        .act-copy { min-width: 0; flex: 1; }  
        .act-primary { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 800; letter-spacing: -.025em; }  
        .act-meta { font-size: 8px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }  
        .act-value { text-align: right; flex-shrink: 0; font-family: var(--number); font-size: 10px; font-weight: 500; letter-spacing: -.045em; }  
        .act-date { font-family: var(--font); font-size: 7px; color: var(--ink-3); margin-top: 3px; }  
        .status { border-radius: 5px; font-size: 6px; letter-spacing: .07em; text-transform: uppercase; padding: 2px 5px; background: var(--secondary-soft); color: var(--secondary); font-weight: 800; }  
        .status.draft { background: var(--primary-soft); color: var(--primary); }  
        .status.delivered { background: var(--surface-muted); color: var(--ink-2); }  
        .reminder { padding: 12px; position: relative; overflow: hidden; }  
        .reminder:after { content: ""; position: absolute; right: -36px; top: -48px; width: 120px; height: 120px; border: 18px solid transparent; background: conic-gradient(from 180deg, var(--primary-soft), var(--secondary-soft), var(--primary-soft)) border-box; -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 18px)); mask: radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 18px)); opacity: .85; border-radius: 50%; }  
        .reminder-row { display: flex; align-items: flex-start; gap: 9px; position: relative; z-index: 1; }  
        .reminder-icon { height: 34px; width: 34px; flex: 0 0 34px; display: grid; place-items: center; border-radius: 12px; background: var(--gradient); color: #fff; }  
        .reminder-icon svg { width: 16px; height: 16px; }  
        .reminder-copy { min-width: 0; flex: 1; }  
        .reminder-kicker { font-size: 7px; font-weight: 800; letter-spacing: .11em; text-transform: uppercase; color: var(--ink-3); }  
        .reminder h2 { font-size: 12px; letter-spacing: -.04em; margin: 3px 0 2px; }  
        .reminder p { font-size: 9px; line-height: 1.4; color: var(--ink-2); margin: 0; }  
        .reminder-actions { display: flex; gap: 6px; align-items: center; margin-top: 9px; position: relative; z-index: 1; }  
        .primary-sm { border-radius: 10px; padding: 7px 10px; background: var(--gradient); color: #fff; font-size: 8px; text-transform: uppercase; letter-spacing: .065em; font-weight: 800; display: flex; align-items: center; gap: 6px; }  
        .primary-sm svg { width: 12px; height: 12px; }  
        .evergreen { font-size: 7px; color: var(--ink-2); font-weight: 700; display: flex; align-items: center; gap: 3px; }  
        .evergreen svg { width: 11px; height: 11px; }  
        .dismiss { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; color: var(--ink-3); position: relative; z-index: 1; }  
        .dismiss svg { width: 14px; height: 14px; }  
        .alerts { padding: 11px 0 11px 11px; }  
        .alerts-head { margin-right: 11px; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }  
        .alerts-head .section-title { margin: 0; }  
        .alerts-sub { font-size: 9px; line-height: 1.3; color: var(--ink-2); margin-top: 3px; }  
        .alerts-scroll { display: flex; gap: 8px; overflow-x: auto; padding: 9px 11px 1px 0; scrollbar-width: none; }  
        .alerts-scroll::-webkit-scrollbar { display: none; }  
        .alert-item { min-width: 200px; width: 200px; text-align: left; padding: 10px; border-radius: 16px; border: 1px solid var(--line); background: var(--surface-raised); }  
        .alert-head { display: flex; gap: 7px; align-items: flex-start; }  
        .alert-symbol { width: 29px; height: 29px; display: grid; place-items: center; border-radius: 10px; background: var(--primary-soft); color: var(--primary); flex-shrink: 0; }  
        .alert-symbol.warn { background: var(--attention-soft); color: var(--attention); }  
        .alert-symbol svg { width: 14px; height: 14px; }  
        .alert-overline { font-size: 6px; letter-spacing: .13em; text-transform: uppercase; color: var(--ink-3); font-weight: 800; }  
        .alert-name { font-size: 10px; line-height: 1.25; font-weight: 800; margin-top: 2px; }  
        .alert-body { margin: 6px 0 8px; font-size: 8px; line-height: 1.4; color: var(--ink-2); }  
        .alert-foot { display: flex; justify-content: space-between; color: var(--ink-3); font-size: 7px; font-weight: 700; }  
        .audit { padding: 0 11px; }  
        .audit-row { display: flex; gap: 8px; padding: 9px 0; border-top: 1px solid var(--line); }  
        .audit-row:first-child { border-top: 0; }  
        .audit-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 3px; background: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); flex: 0 0 6px; }  
        .audit-dot.copper { background: var(--secondary); box-shadow: 0 0 0 3px var(--secondary-soft); }  
        .audit-main { font-size: 9px; font-weight: 700; line-height: 1.25; }  
        .audit-meta { font-size: 7px; color: var(--ink-3); margin-top: 2px; }  
        .bottom { position: absolute; z-index: 30; left: 10px; right: 10px; bottom: max(8px, env(safe-area-inset-bottom)); height: 62px; padding: 4px; display: grid; grid-template-columns: repeat(5, 1fr); border: 1px solid var(--line-strong); border-radius: 20px; background: var(--nav); box-shadow: var(--shadow-float); }  
        .tab { color: var(--ink-3); border-radius: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 7px; font-weight: 800; }  
        .tab svg { height: 17px; width: 17px; }  
        .tab.active { color: #fff; background: var(--gradient); box-shadow: 0 5px 12px color-mix(in srgb, var(--primary) 35%, transparent); }  
        .fab { position: absolute; z-index: 31; right: 16px; bottom: calc(82px + env(safe-area-inset-bottom)); width: 50px; height: 50px; border-radius: 18px; background: var(--gradient); color: #fff; display: grid; place-items: center; box-shadow: 0 10px 24px color-mix(in srgb, var(--primary) 40%, transparent); }  
        .fab:after { content: ""; position: absolute; inset: -5px; border-radius: 21px; border: 1.5px solid var(--secondary-bright); opacity: 0; transition: opacity .25s, transform .25s; transform: scale(.85); }  
        .fab.open:after { opacity: .55; transform: scale(1); animation: fab-pulse 1.6s ease-out infinite; }  
        .fab svg { width: 21px; height: 21px; transition: transform .3s; }  
        .fab.open svg { transform: rotate(45deg); }  
        @keyframes fab-pulse { 0% { opacity: .55; transform: scale(1); } 70% { opacity: 0; transform: scale(1.35); } 100% { opacity: 0; transform: scale(1.35); } }  
        .scrim { position: absolute; inset: 0; z-index: 40; background: rgba(14,12,10,.38); opacity: 0; pointer-events: none; backdrop-filter: blur(2px); transition: opacity .2s; }  
        .scrim.show { opacity: 1; pointer-events: auto; }  
        .drawer { position: absolute; z-index: 42; top: 0; bottom: 0; left: 0; width: min(84%, 340px); display: flex; flex-direction: column; background: var(--surface); box-shadow: var(--shadow-float); border-radius: 0 24px 24px 0; transform: translateX(-105%); transition: transform .3s cubic-bezier(.2,.9,.24,1); padding-top: env(safe-area-inset-top); }  
        .drawer.show { transform: translateX(0); }  
        .drawer-head { padding: 14px 14px 12px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--line); }  
        .brand-mark { height: 32px; width: 32px; border-radius: 11px; display: grid; place-items: center; background: var(--gradient); color: #fff; }  
        .brand-mark svg { width: 17px; height: 17px; }  
        .brand-name { font-size: 13px; font-weight: 800; letter-spacing: -.05em; }  
        .brand-sub { font-size: 7px; text-transform: uppercase; letter-spacing: .09em; color: var(--ink-3); margin-top: 1px; }  
        .drawer-list { overflow-y: auto; flex: 1; padding: 10px 8px 14px; scrollbar-width: none; }  
        .drawer-label { padding: 6px 8px 3px; color: var(--ink-3); font-size: 7px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }  
        .drawer-row { width: 100%; padding: 9px 8px; border-radius: 12px; display: flex; align-items: center; gap: 8px; text-align: left; color: var(--ink-2); font-size: 11px; font-weight: 700; }  
        .drawer-row svg { width: 16px; height: 16px; }  
        .drawer-row.active { color: var(--primary); background: var(--primary-soft); }  
        .drawer-row .chev { margin-left: auto; width: 13px; height: 13px; }  
        .drawer-foot { padding: 12px 14px calc(12px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); display: flex; align-items: center; gap: 8px; }  
        .user-avatar { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); font-size: 8px; font-weight: 800; }  
        .user-name { font-size: 10px; font-weight: 800; }  
        .user-role { font-size: 8px; color: var(--ink-3); margin-top: 1px; }  
        .sheet { position: absolute; z-index: 43; left: 0; right: 0; bottom: 0; max-height: 78%; border-radius: 24px 24px 0 0; background: var(--surface); box-shadow: 0 -16px 40px rgba(0,0,0,.24); transform: translateY(106%); transition: transform .3s cubic-bezier(.2,.9,.24,1); padding: 8px 13px calc(16px + env(safe-area-inset-bottom)); overflow-y: auto; }  
        .sheet.show { transform: translateY(0); }  
        .grab { width: 34px; height: 3px; background: var(--surface-strong); border-radius: 4px; margin: 0 auto 11px; }  
        .sheet-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin: 0 2px 10px; }  
        .sheet-head h2 { margin: 0; font-size: 17px; letter-spacing: -.05em; }  
        .sheet-head p { margin: 3px 0 0; color: var(--ink-2); font-size: 9px; line-height: 1.35; }  
        .sheet-close { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; color: var(--ink-2); background: var(--surface-muted); }  
        .sheet-close svg { width: 13px; height: 13px; }  
        .action-list { display: flex; flex-direction: column; gap: 4px; }  
        .sheet-action { padding: 8px 8px 8px 10px; display: flex; gap: 9px; align-items: center; text-align: left; border-radius: 14px; }  
        .sheet-action:active { background: var(--surface-muted); }  
        .sheet-action-icon { width: 34px; height: 34px; flex: 0 0 34px; border-radius: 12px; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); }  
        .sheet-action-icon.copper { background: var(--secondary-soft); color: var(--secondary); }  
        .sheet-action-icon.muted { background: var(--surface-muted); color: var(--ink-2); }  
        .sheet-action-icon svg { width: 16px; height: 16px; }  
        .sheet-action-title { font-size: 11px; font-weight: 800; }  
        .sheet-action-copy { font-size: 8px; color: var(--ink-2); margin-top: 1px; line-height: 1.3; }  
        .split { height: 1px; background: var(--line); margin: 9px 2px; }  
        .sheet-group { margin: 8px 2px 5px; color: var(--ink-3); font-size: 7px; text-transform: uppercase; letter-spacing: .1em; font-weight: 800; }  
        .search-layer { position: absolute; z-index: 50; inset: 0; background: var(--bg); padding: calc(9px + env(safe-area-inset-top)) 14px 14px; transform: translateY(-104%); transition: transform .24s cubic-bezier(.2,.9,.24,1); }  
        .search-layer.show { transform: translateY(0); }  
        .search-row { display: flex; gap: 6px; align-items: center; }  
        .search-box { height: 40px; display: flex; flex: 1; align-items: center; gap: 6px; padding: 0 10px; border-radius: 13px; background: var(--surface-muted); color: var(--ink-2); }  
        .search-box svg { width: 16px; height: 16px; }  
        .search-box input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--ink); font-size: 12px; }  
        .cancel { font-size: 10px; color: var(--primary); font-weight: 800; padding: 5px 1px; }  
        .search-suggestions { padding-top: 22px; }  
        .search-suggestions h3 { font-size: 8px; text-transform: uppercase; letter-spacing: .1em; color: var(--ink-3); margin: 0 2px 10px; }  
        .suggestion { width: 100%; padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 11px; font-weight: 700; text-align: left; background: none; }  
        .suggestion span { display: block; font-size: 8px; color: var(--ink-2); font-weight: 500; margin-top: 2px; }  
        .toast { position: absolute; z-index: 60; top: calc(10px + env(safe-area-inset-top)); left: 50%; transform: translate(-50%, -12px); padding: 8px 12px; border-radius: 12px; background: var(--ink); color: var(--bg); box-shadow: var(--shadow-float); font-size: 9px; font-weight: 800; opacity: 0; pointer-events: none; white-space: nowrap; transition: opacity .18s, transform .18s; }  
        .toast.show { opacity: 1; transform: translate(-50%, 0); }  
        .empty-tab { padding-top: 60px; text-align: center; }  
        .empty-symbol { height: 58px; width: 58px; border-radius: 20px; margin: 0 auto 12px; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); }  
        .empty-symbol svg { width: 25px; height: 25px; }  
        .empty-tab h2 { margin: 0; font-size: 16px; letter-spacing: -.05em; }  
        .empty-tab p { max-width: 200px; margin: 5px auto 0; color: var(--ink-2); font-size: 10px; line-height: 1.45; }  
        @media(min-width: 560px) { .app { height: 880px; margin-top: 22px; border: 1px solid rgba(30,28,24,.13); border-radius: 40px; box-shadow: 0 28px 68px rgba(30,28,24,.26); } body { min-height: 100%; } }  
        @media(prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; } }  
      `}</style>
      {customCss && <style>{customCss}</style>}
      
      <div className="app" id="app">
        <div className="grain" />
        <div className="shell">
          <div className="scroll" id="scroll">
            <header className="topbar">
              <div className="top-left">
                <button className={`top-btn ${isDrawerOpen ? 'active' : ''}`} onClick={() => { closeAll(); setIsDrawerOpen(true); }} aria-label="Open navigation">
                  <PanelLeft size={17} strokeWidth={1.9} />
                </button>
                <div className="identity">
                  <div className="workspace">BIGDROPS WORKSPACE</div>
                  <div className="owner">Milad A.</div>
                </div>
              </div>
              <div className="top-right">
                <button className="top-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                  {theme === 'dark' ? <Sun size={17} strokeWidth={1.9} /> : <Moon size={17} strokeWidth={1.9} />}
                </button>
                <button className="top-btn" onClick={() => openSheet('notification')} aria-label="Open notifications">
                  <Bell size={17} strokeWidth={1.9} />
                  <i className="notif-pip" />
                </button>
                <button className="top-btn" onClick={() => setIsSearchOpen(true)} aria-label="Search">
                  <Search size={17} strokeWidth={1.9} />
                </button>
                <button className="top-btn" onClick={() => openSheet('ai')} aria-label="Ask AI assistant" style={{ background: 'var(--gradient)', borderColor: 'transparent', color: '#fff', fontSize: '10px', fontWeight: 800, letterSpacing: '.01em' }}>
                  AI
                </button>
              </div>
            </header>

            <main className={`page ${activeTab === 'home' ? 'active' : ''} dashboard`} id="home-page">
              <div className="eyebrow">
                <span>Finance pulse · August 2026</span>
                <button onClick={() => showToast('Dashboard metrics settings opened')}>Edit metrics</button>
              </div>
              <section className="metric-grid" aria-label="Dashboard metrics">
                <button className="metric" onClick={() => showToast('Opening total invoiced')}>
                  <span className="metric-label">Total invoiced</span>
                  <div className="tickbar">
                    {[...Array(20)].map((_, i) => <i key={i} className={i < 12 ? 'on' : ''} />)}
                  </div>
                  <span className="metric-value">₦1,240,000</span>
                  <span className="metric-trend"><b>+12%</b> vs last month</span>
                </button>
                <button className="metric collect" onClick={() => showToast('Collections report opened')}>
                  <span className="metric-label">Collected this month</span>
                  <div className="tickbar">
                    {[...Array(20)].map((_, i) => <i key={i} className={i < 15 ? 'on' : ''} />)}
                  </div>
                  <span className="metric-value">₦89,000</span>
                  <span className="metric-trend"><b>+18%</b> vs last month</span>
                </button>
                <button className="metric awaiting" onClick={() => showToast('Opening outstanding receivables')}>
                  <span className="metric-label">Outstanding receivables</span>
                  <div className="tickbar">
                    {[...Array(20)].map((_, i) => <i key={i} className={i < 11 ? 'on' : ''} />)}
                  </div>
                  <span className="metric-value">₦340,000</span>
                  <span className="metric-trend neutral"><b>28%</b> of total invoiced</span>
                </button>
                <button className="metric overdue" onClick={() => showToast('Opening overdue invoices')}>
                  <span className="metric-label">Overdue balance</span>
                  <div className="tickbar">
                    {[...Array(20)].map((_, i) => <i key={i} className={i < 7 ? 'on' : ''} />)}
                  </div>
                  <span className="metric-value">₦86,000</span>
                  <span className="metric-trend neutral"><b>25%</b> of outstanding</span>
                </button>
              </section>

              <section className="section">
                <h2 className="section-title">Recent activity</h2>
                <div className="card" id="activityList">
                  <button className="activity-row" onClick={() => showToast('Document detail opened')}>
                    <span className="activity-icon invoice"><ReceiptText size={15} strokeWidth={1.9} /></span>
                    <span className="act-copy">
                      <span className="act-primary">INV-0045 <i className="status">Pending</i></span>
                      <span className="act-meta">Lagos Steel Works · Aug 15</span>
                    </span>
                    <span>
                      <span className="act-value">₦120,000</span>
                      <span className="act-date">Aug 15</span>
                    </span>
                  </button>
                  <button className="activity-row" onClick={() => showToast('Document detail opened')}>
                    <span className="activity-icon quote"><FileSignature size={15} strokeWidth={1.9} /></span>
                    <span className="act-copy">
                      <span className="act-primary">QTN-0109 <i className="status draft">Draft</i></span>
                      <span className="act-meta">Westfield Corp · Aug 14</span>
                    </span>
                    <span>
                      <span className="act-value">₦340,000</span>
                      <span className="act-date">Aug 14</span>
                    </span>
                  </button>
                  <button className="activity-row" onClick={() => showToast('Document detail opened')}>
                    <span className="activity-icon waybill"><Truck size={15} strokeWidth={1.9} /></span>
                    <span className="act-copy">
                      <span className="act-primary">WB-0028 <i className="status delivered">Delivered</i></span>
                      <span className="act-meta">Site Alpha · Aug 13</span>
                    </span>
                    <span>
                      <span className="act-value">Delivered</span>
                      <span className="act-date">Aug 13</span>
                    </span>
                  </button>
                </div>
              </section>

              <section className="section" id="paymentReminder">
                <h2 className="section-title">Payment reminder</h2>
                <div className="card reminder">
                  <div className="reminder-row">
                    <div className="reminder-icon"><BellRing size={16} strokeWidth={1.9} /></div>
                    <div className="reminder-copy">
                      <div className="reminder-kicker">Smart banner</div>
                      <h2>Keep payments recorded as they land</h2>
                      <p>Record each invoice payment promptly so your books stay accurate.</p>
                      <div className="reminder-actions">
                        <button className="primary-sm" onClick={() => showToast('Opening payment recording')}>
                          Record payments <ArrowRight size={12} strokeWidth={1.9} />
                        </button>
                        <span className="evergreen"><CircleDotDashed size={11} strokeWidth={1.9} /> Evergreen</span>
                      </div>
                    </div>
                    <button className="dismiss" onClick={() => { document.getElementById('paymentReminder').style.display = 'none'; showToast('Reminder dismissed'); }} aria-label="Dismiss">
                      <X size={14} strokeWidth={1.9} />
                    </button>
                  </div>
                </div>
              </section>

              <section className="section">
                <h2 className="section-title">Recent alerts</h2>
                <div className="card alerts">
                  <div className="alerts-head">
                    <div>
                      <div className="section-title">Notifications feed</div>
                      <p className="alerts-sub">What needs a response, not just a read.</p>
                    </div>
                  </div>
                  <div className="alerts-scroll" id="alertsScroll">
                    <button className="alert-item" onClick={() => { closeAll(); showToast('Notification marked for review'); }}>
                      <div className="alert-head">
                        <div className="alert-symbol warn"><TriangleAlert size={14} strokeWidth={1.9} /></div>
                        <div>
                          <div className="alert-overline">Alert</div>
                          <div className="alert-name">INV-0042 is overdue</div>
                        </div>
                      </div>
                      <p className="alert-body">7 days past due. Open to record payment or follow-up.</p>
                      <div className="alert-foot"><span>2h ago</span><span>Unread</span></div>
                    </button>
                    <button className="alert-item" onClick={() => { closeAll(); showToast('Notification marked for review'); }}>
                      <div className="alert-head">
                        <div className="alert-symbol"><CircleCheck size={14} strokeWidth={1.9} /></div>
                        <div>
                          <div className="alert-overline">Update</div>
                          <div className="alert-name">QTN-0108 accepted</div>
                        </div>
                      </div>
                      <p className="alert-body">Acme Ltd accepted. Ready to convert to invoice.</p>
                      <div className="alert-foot"><span>5h ago</span><span>Unread</span></div>
                    </button>
                    <button className="alert-item" onClick={() => { closeAll(); showToast('Notification marked for review'); }}>
                      <div className="alert-head">
                        <div className="alert-symbol"><Receipt size={14} strokeWidth={1.9} /></div>
                        <div>
                          <div className="alert-overline">Payment</div>
                          <div className="alert-name">Payment for INV-0039</div>
                        </div>
                      </div>
                      <p className="alert-body">₦45,000 received. Reconcile against invoice.</p>
                      <div className="alert-foot"><span>Yesterday</span><span>Read</span></div>
                    </button>
                  </div>
                </div>
              </section>

              <section className="section">
                <h2 className="section-title">Audit trail</h2>
                <div className="card audit">
                  <div className="audit-row">
                    <i className="audit-dot" />
                    <div>
                      <div className="audit-main">INV-0045 created by Milad</div>
                      <div className="audit-meta">Today, 10:32 AM</div>
                    </div>
                  </div>
                  <div className="audit-row">
                    <i className="audit-dot copper" />
                    <div>
                      <div className="audit-main">INV-0042 overdue reminder sent</div>
                      <div className="audit-meta">Today, 09:15 AM</div>
                    </div>
                  </div>
                  <div className="audit-row">
                    <i className="audit-dot" />
                    <div>
                      <div className="audit-main">QTN-0108 accepted by client</div>
                      <div className="audit-meta">Yesterday, 4:20 PM</div>
                    </div>
                  </div>
                </div>
              </section>
              <div style={{ height: '6px' }} />
            </main>

            <section className={`page ${activeTab === 'projects' ? 'active' : ''} empty-tab`} id="projects-page">
              <div className="empty-symbol"><Folders size={25} strokeWidth={1.9} /></div>
              <h2>Projects</h2>
              <p>Your project workspaces and live updates open here.</p>
            </section>
            <section className={`page ${activeTab === 'sales' ? 'active' : ''} empty-tab`} id="sales-page">
              <div className="empty-symbol"><ChartNoAxesCombined size={25} strokeWidth={1.9} /></div>
              <h2>Sales</h2>
              <p>Select the sales tab again to choose invoices, quotations, CSR, or waybills.</p>
            </section>
            <section className={`page ${activeTab === 'clients' ? 'active' : ''} empty-tab`} id="clients-page">
              <div className="empty-symbol"><UsersRound size={25} strokeWidth={1.9} /></div>
              <h2>Clients</h2>
              <p>Your client records, activity, and commercial history open here.</p>
            </section>
            <section className={`page ${activeTab === 'more' ? 'active' : ''} empty-tab`} id="more-page">
              <div className="empty-symbol"><Ellipsis size={25} strokeWidth={1.9} /></div>
              <h2>More</h2>
              <p>Reports, compliance, receipts, and workspace tools are grouped here.</p>
            </section>
          </div>

          <button className={`fab ${isFabOpen ? 'open' : ''}`} onClick={() => {
            if (activeSheet === 'action') closeAll();
            else { openSheet('action'); setIsFabOpen(true); }
          }} aria-label="Create new">
            <Plus size={21} strokeWidth={1.9} />
          </button>

          <nav className="bottom" aria-label="Main navigation">
            <button className={`tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}><House size={17} strokeWidth={1.9} /><span>Home</span></button>
            <button className={`tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}><FolderKanban size={17} strokeWidth={1.9} /><span>Projects</span></button>
            <button className={`tab ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setTab('sales')}><ChartNoAxesCombined size={17} strokeWidth={1.9} /><span>Sales</span></button>
            <button className={`tab ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => setTab('clients')}><ContactRound size={17} strokeWidth={1.9} /><span>Clients</span></button>
            <button className={`tab ${activeTab === 'more' ? 'active' : ''}`} onClick={() => setTab('more')}><Ellipsis size={17} strokeWidth={1.9} /><span>More</span></button>
          </nav>

          <div className={`scrim ${isDrawerOpen || activeSheet || isSearchOpen ? 'show' : ''}`} onClick={closeAll} />

          <aside className={`drawer ${isDrawerOpen ? 'show' : ''}`} aria-label="Navigation drawer">
            <div className="drawer-head">
              <div className="brand-mark"><Sparkles size={17} strokeWidth={1.9} /></div>
              <div>
                <div className="brand-name">BIGDROPS</div>
                <div className="brand-sub">Project finance workspace</div>
              </div>
            </div>
            <div className="drawer-list">
              <div className="drawer-label">Workspace</div>
              {['Dashboard', 'Projects', 'Clients'].map(dest => (
                <button key={dest} className={`drawer-row ${activeDrawer === dest ? 'active' : ''}`} onClick={() => { setActiveDrawer(dest); closeAll(); showToast(`${dest} selected`); }}>
                  {dest === 'Dashboard' && <FolderKanban size={16} strokeWidth={1.9} />}
                  {dest === 'Projects' && <FolderKanban size={16} strokeWidth={1.9} />}
                  {dest === 'Clients' && <ContactRound size={16} strokeWidth={1.9} />}
                  {dest}
                </button>
              ))}
              <div className="drawer-label">Sales</div>
              {[
                { name: 'Invoices', icon: ReceiptText },
                { name: 'Quotations', icon: FileSignature },
                { name: 'CSR', icon: ClipboardCheck },
                { name: 'Waybills', icon: Truck }
              ].map(item => (
                <button key={item.name} className={`drawer-row ${activeDrawer === item.name ? 'active' : ''}`} onClick={() => { setActiveDrawer(item.name); closeAll(); showToast(`${item.name} selected`); }}>
                  <item.icon size={16} strokeWidth={1.9} />
                  {item.name}
                  <ChevronRight className="chev" size={13} strokeWidth={1.9} />
                </button>
              ))}
              <div className="drawer-label">Workspace tools</div>
              {[
                { name: 'Reports', icon: FileChartColumn },
                { name: 'Compliance Hub', icon: ShieldCheck },
                { name: 'Item Library', icon: Library },
                { name: 'Settings', icon: Settings2 }
              ].map(item => (
                <button key={item.name} className={`drawer-row ${activeDrawer === item.name ? 'active' : ''}`} onClick={() => { setActiveDrawer(item.name); closeAll(); showToast(`${item.name} selected`); }}>
                  <item.icon size={16} strokeWidth={1.9} />
                  {item.name}
                </button>
              ))}
            </div>
            <div className="drawer-foot">
              <div className="user-avatar">MA</div>
              <div>
                <div className="user-name">Milad A.</div>
                <div className="user-role">Operator</div>
              </div>
            </div>
          </aside>

          <section className={`sheet ${activeSheet === 'ai' ? 'show' : ''}`} aria-hidden={activeSheet !== 'ai'}>
            <div className="grab" />
            <div className="sheet-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{ width: '34px', height: '34px', flex: '0 0 34px', borderRadius: '12px', display: 'grid', placeItems: 'center', background: 'var(--gradient)', color: '#fff' }}>
                  <Sparkles size={16} strokeWidth={1.9} />
                </span>
                <div>
                  <h2 style={{ fontSize: '14px' }}>BIGDROPS Assistant</h2>
                  <p>Ask about invoices, clients, or your numbers.</p>
                </div>
              </div>
              <button className="sheet-close" onClick={closeAll} aria-label="Close"><X size={13} strokeWidth={1.9} /></button>
            </div>
            <div className="action-list">
              {[
                { prompt: "Which invoices are overdue right now?", title: "What's overdue?", copy: "Summarize overdue invoices and amounts", icon: TriangleAlert },
                { prompt: "Draft a payment reminder for Lagos Steel Works.", title: "Draft a reminder", copy: "Write a follow-up for a slow-paying client", icon: MailPlus, copper: true },
                { prompt: "How did collections trend this month?", title: "Explain this month", copy: "Plain-language read on your collections", icon: ChartNoAxesCombined, muted: true }
              ].map((action, idx) => (
                <button key={idx} className="sheet-action" onClick={() => { document.getElementById('aiInput').value = action.prompt; closeAll(); showToast('Asking the assistant…'); }}>
                  <span className={`sheet-action-icon ${action.copper ? 'copper' : action.muted ? 'muted' : ''}`}>
                    <action.icon size={16} strokeWidth={1.9} />
                  </span>
                  <span>
                    <span className="sheet-action-title">{action.title}</span>
                    <span className="sheet-action-copy">{action.copy}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="split" />
            <label className="search-box" style={{ marginTop: '2px' }}>
              <Sparkles size={16} strokeWidth={1.9} />
              <input 
                id="aiInput" 
                placeholder="Ask the assistant anything…" 
                autoComplete="off" 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    closeAll();
                    showToast('Asking the assistant…');
                  }
                }}
              />
            </label>
          </section>

          <section className={`sheet ${activeSheet === 'action' ? 'show' : ''}`} aria-hidden={activeSheet !== 'action'}>
            <div className="grab" />
            <div className="sheet-head">
              <div>
                <h2>Create</h2>
                <p>Start a record in the correct BIGDROPS workspace.</p>
              </div>
              <button className="sheet-close" onClick={closeAll} aria-label="Close"><X size={13} strokeWidth={1.9} /></button>
            </div>
            <div className="action-list">
              {[
                { dest: 'New Invoice', title: 'New Invoice', copy: 'Create and send a sales invoice', icon: ReceiptText },
                { dest: 'New Project', title: 'New Project', copy: 'Start a new project workspace', icon: FolderPlus, muted: true },
                { dest: 'New RFQ', title: 'New RFQ', copy: 'Create a request for quotation', icon: FileSearch, copper: true },
                { dest: 'New Quotation', title: 'New Quotation', copy: 'Build a quotation for a client', icon: FileSignature, copper: true },
                { dest: 'New CSR', title: 'New CSR', copy: 'Log a customer service report', icon: ClipboardCheck, muted: true },
                { dest: 'New Waybill', title: 'New Waybill', copy: 'Create a dispatch or delivery waybill', icon: Truck, muted: true },
                { dest: 'New Letter', title: 'New Letter', copy: 'Draft official correspondence', icon: MailPlus, copper: true }
              ].map((action, idx) => (
                <button key={idx} className="sheet-action" onClick={() => handleDestinationClick(action.dest)}>
                  <span className={`sheet-action-icon ${action.copper ? 'copper' : action.muted ? 'muted' : ''}`}>
                    <action.icon size={16} strokeWidth={1.9} />
                  </span>
                  <span>
                    <span className="sheet-action-title">{action.title}</span>
                    <span className="sheet-action-copy">{action.copy}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className={`sheet ${activeSheet === 'sales' ? 'show' : ''}`} aria-hidden={activeSheet !== 'sales'}>
            <div className="grab" />
            <div className="sheet-head">
              <div>
                <h2>Sales</h2>
                <p>Create, send, collect, and reconcile commercial documents.</p>
              </div>
              <button className="sheet-close" onClick={closeAll} aria-label="Close"><X size={13} strokeWidth={1.9} /></button>
            </div>
            <div className="action-list">
              {[
                { dest: 'Invoices', title: 'Invoices', copy: 'Create, send, collect, and reconcile.', icon: ReceiptText },
                { dest: 'Quotations', title: 'Quotations', copy: 'Prepare pricing and convert when approved.', icon: FileSignature, copper: true },
                { dest: 'CSR', title: 'CSR', copy: 'Track service reports and client sign-off.', icon: ClipboardCheck, muted: true },
                { dest: 'Waybills', title: 'Waybills', copy: 'Manage dispatch and proof of delivery.', icon: Truck, muted: true }
              ].map((action, idx) => (
                <button key={idx} className="sheet-action" onClick={() => handleDestinationClick(action.dest)}>
                  <span className={`sheet-action-icon ${action.copper ? 'copper' : action.muted ? 'muted' : ''}`}>
                    <action.icon size={16} strokeWidth={1.9} />
                  </span>
                  <span>
                    <span className="sheet-action-title">{action.title}</span>
                    <span className="sheet-action-copy">{action.copy}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className={`sheet ${activeSheet === 'more' ? 'show' : ''}`} aria-hidden={activeSheet !== 'more'}>
            <div className="grab" />
            <div className="sheet-head">
              <div>
                <h2>More</h2>
                <p>Admin, reporting, and workspace utilities.</p>
              </div>
              <button className="sheet-close" onClick={closeAll} aria-label="Close"><X size={13} strokeWidth={1.9} /></button>
            </div>
            <div className="sheet-group">Correspondence</div>
            <div className="action-list">
              <button className="sheet-action" onClick={() => handleDestinationClick('Letters')}>
                <span className="sheet-action-icon muted"><Mail size={16} strokeWidth={1.9} /></span>
                <span><span className="sheet-action-title">Letters</span><span className="sheet-action-copy">Official correspondence and notices.</span></span>
              </button>
            </div>
            <div className="split" />
            <div className="sheet-group">Finance & reporting</div>
            <div className="action-list">
              {[
                { dest: 'Reports', title: 'Reports', copy: 'Revenue, collections, workload, and trends.', icon: FileChartColumn },
                { dest: 'Compliance Hub', title: 'Compliance Hub', copy: 'Approvals, policy logs, and audit trail.', icon: ShieldCheck },
                { dest: 'Receipts', title: 'Receipts', copy: 'View payment receipts and download PDFs.', icon: Receipt },
                { dest: 'Item Library', title: 'Item Library', copy: 'Review price history and master item usage.', icon: Library }
              ].map((action, idx) => (
                <button key={idx} className="sheet-action" onClick={() => handleDestinationClick(action.dest)}>
                  <span className="sheet-action-icon muted"><action.icon size={16} strokeWidth={1.9} /></span>
                  <span><span className="sheet-action-title">{action.title}</span><span className="sheet-action-copy">{action.copy}</span></span>
                </button>
              ))}
            </div>
            <div className="split" />
            <div className="sheet-group">Workspace</div>
            <div className="action-list">
              <button className="sheet-action" onClick={() => {
                openSheet('theme');
                const lp = localStorage.getItem('bigdrops-primary-hex') || (theme === 'dark' ? '#60a5fa' : '#1e3a5f');
                const ls = localStorage.getItem('bigdrops-secondary-hex') || (theme === 'dark' ? '#94a3b8' : '#0f172a');
                setPrimaryHex(lp);
                setSecondaryHex(ls);
              }}>
                <span className="sheet-action-icon" style={{ background: 'var(--gradient)', color: '#fff' }}><Palette size={16} strokeWidth={1.9} /></span>
                <span><span className="sheet-action-title">Theme colors</span><span className="sheet-action-copy">Set your own primary and secondary colors</span></span>
              </button>
              <button className="sheet-action" onClick={() => handleDestinationClick('Settings')}>
                <span className="sheet-action-icon muted"><Settings2 size={16} strokeWidth={1.9} /></span>
                <span><span className="sheet-action-title">Settings</span><span className="sheet-action-copy">Roles, preferences, notifications, and workspace controls.</span></span>
              </button>
              <button className="sheet-action" onClick={() => handleDestinationClick('Sign Out')}>
                <span className="sheet-action-icon copper"><LogOut size={16} strokeWidth={1.9} /></span>
                <span><span className="sheet-action-title">Sign out</span><span className="sheet-action-copy">Exit this workspace securely.</span></span>
              </button>
            </div>
          </section>

          <section className={`sheet ${activeSheet === 'theme' ? 'show' : ''}`} aria-hidden={activeSheet !== 'theme'}>
            <div className="grab" />
            <div className="sheet-head">
              <div>
                <h2>Theme colors</h2>
                <p>Type any hex code — the whole app updates live.</p>
              </div>
              <button className="sheet-close" onClick={closeAll} aria-label="Close"><X size={13} strokeWidth={1.9} /></button>
            </div>
            <div style={{ height: '56px', borderRadius: '16px', background: 'var(--gradient)', margin: '2px 2px 14px', boxShadow: 'var(--shadow)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 2px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span id="primarySwatch" style={{ width: '36px', height: '36px', flex: '0 0 36px', borderRadius: '10px', border: '1px solid var(--line-strong)', background: primaryHex }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '8px', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '3px' }}>Primary</span>
                  <input 
                    id="primaryHex" 
                    type="text" 
                    maxLength={7} 
                    placeholder="#1e3a5f" 
                    value={primaryHex}
                    onChange={(e) => {
                      setPrimaryHex(e.target.value);
                      handleHexInput(e.target.value, true);
                    }}
                    style={{ width: '100%', height: '38px', borderRadius: '10px', border: '1px solid var(--line-strong)', background: 'var(--surface-raised)', color: 'var(--ink)', fontFamily: 'var(--number)', fontSize: '12px', padding: '0 10px', outline: 0 }} 
                  />
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span id="secondarySwatch" style={{ width: '36px', height: '36px', flex: '0 0 36px', borderRadius: '10px', border: '1px solid var(--line-strong)', background: secondaryHex }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '8px', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '3px' }}>Secondary</span>
                  <input 
                    id="secondaryHex" 
                    type="text" 
                    maxLength={7} 
                    placeholder="#0f172a" 
                    value={secondaryHex}
                    onChange={(e) => {
                      setSecondaryHex(e.target.value);
                      handleHexInput(e.target.value, false);
                    }}
                    style={{ width: '100%', height: '38px', borderRadius: '10px', border: '1px solid var(--line-strong)', background: 'var(--surface-raised)', color: 'var(--ink)', fontFamily: 'var(--number)', fontSize: '12px', padding: '0 10px', outline: 0 }} 
                  />
                </span>
              </label>
              <p id="hexWarning" style={{ display: hexWarning ? 'block' : 'none', color: 'var(--attention)', fontSize: '8px', margin: '0 2px' }}>Enter a valid hex code, e.g. #0d9488</p>
            </div>
            <div className="split" />
            <button className="sheet-action" onClick={() => {
              setCustomCss('');
              localStorage.removeItem('bigdrops-primary-hex');
              localStorage.removeItem('bigdrops-secondary-hex');
              const lp = theme === 'dark' ? '#60a5fa' : '#1e3a5f';
              const ls = theme === 'dark' ? '#94a3b8' : '#0f172a';
              setPrimaryHex(lp);
              setSecondaryHex(ls);
              setHexWarning(false);
              showToast('Theme reset to default');
            }}>
              <span className="sheet-action-icon muted"><RotateCcw size={16} strokeWidth={1.9} /></span>
              <span><span className="sheet-action-title">Reset to default</span><span className="sheet-action-copy">Back to the original slate navy</span></span>
            </button>
          </section>

          <section className={`sheet ${activeSheet === 'notification' ? 'show' : ''}`} aria-hidden={activeSheet !== 'notification'}>
            <div className="grab" />
            <div className="sheet-head">
              <div>
                <h2>Notifications</h2>
                <p>Live activity from your BIGDROPS workspace.</p>
              </div>
              <button className="sheet-close" onClick={closeAll} aria-label="Close"><X size={13} strokeWidth={1.9} /></button>
            </div>
            <div className="action-list">
              {[
                { title: 'INV-0042 is overdue', copy: '7 days past due. Follow up or record payment.', icon: TriangleAlert, copper: true },
                { title: 'Quotation accepted', copy: 'QTN-0108 is ready to become an invoice.', icon: CircleCheck },
                { title: 'Payment received', copy: '₦45,000 needs reconciliation against INV-0039.', icon: Receipt, muted: true }
              ].map((action, idx) => (
                <button key={idx} className="sheet-action" onClick={() => { closeAll(); showToast('Notification marked for review'); }}>
                  <span className={`sheet-action-icon ${action.copper ? 'copper' : action.muted ? 'muted' : ''}`}>
                    <action.icon size={16} strokeWidth={1.9} />
                  </span>
                  <span>
                    <span className="sheet-action-title">{action.title}</span>
                    <span className="sheet-action-copy">{action.copy}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className={`search-layer ${isSearchOpen ? 'show' : ''}`}>
            <div className="search-row">
              <label className="search-box">
                <Search size={16} strokeWidth={1.9} />
                <input 
                  id="searchInput" 
                  placeholder="Search documents, clients, projects" 
                  autoComplete="off" 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      showToast('Searching ' + e.target.value);
                      setIsSearchOpen(false);
                    }
                  }}
                />
              </label>
              <button className="cancel" onClick={() => setIsSearchOpen(false)}>Cancel</button>
            </div>
            <div className="search-suggestions">
              <h3>Recent searches</h3>
              {[
                { dest: 'INV-0045', sub: 'Lagos Steel Works · Invoice' },
                { dest: 'QTN-0108', sub: 'Acme Ltd · Quotation' },
                { dest: 'Site Alpha', sub: 'Project · Waybill activity' }
              ].map((sugg, idx) => (
                <button key={idx} className="suggestion" onClick={() => handleDestinationClick(sugg.dest)}>
                  {sugg.dest}
                  <span>{sugg.sub}</span>
                </button>
              ))}
            </div>
          </section>

          <div className={`toast ${toastMsg ? 'show' : ''}`} id="toast">{toastMsg}</div>
        </div>
      </div>
    </>
  );
}