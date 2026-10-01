import React, { useState, useEffect, useRef, useMemo } from 'react';

const DEFAULT_COLUMNS = [
  { key: 'description', label: 'Description', visible: true },
  { key: 'specification', label: 'Sub Description', visible: false },
  { key: 'unit', label: 'Unit', visible: true },
  { key: 'quantity', label: 'Qty', visible: true },
  { key: 'make', label: 'Make / Brand', visible: true },
  { key: 'cp', label: 'CP (Cost Price)', visible: true },
  { key: 'sp', label: 'SP (Selling Price)', visible: true }
];

const DEFAULT_CLIENTS = [
  { id: 'wellspring', name: 'Wellspring Homes Ltd', person: 'Adaeze Okonkwo', phone: '0803 555 0192', email: 'adaeze@wellspring.ng', addr: 'Plot 14, Lekki Phase 1, Lagos' },
  { id: 'pinnacle', name: 'Pinnacle Towers Ltd', person: 'Tunde Bello', phone: '0805 441 2077', email: 't.bello@pinnacle.ng', addr: 'Ozumba Mbadiwe, VI, Lagos' },
  { id: 'cordelia', name: 'Cordelia Electricals Ltd', person: 'Ngozi Eze', phone: '0702 118 8845', email: 'sales@cordelia.ng', addr: 'Alausa, Ikeja, Lagos' }
];

const DEFAULT_ROWS = [
  { id: 8, type: 'item', gid: null, desc: 'Preliminaries, site supervision and setting out', sub: 'Site establishment, setting out of works, site supervision and general preliminaries for the duration of the works.', subOpen: false, qty: 1, unit: 'lot', make: '', cp: 150000, sp: 185000 },
  { id: 1, type: 'group', title: 'Group A — Civil Works' },
  { id: 2, type: 'item', gid: 1, desc: 'Portland cement, grade 42.5R', sub: '', subOpen: false, qty: 400, unit: 'bags', make: 'Dangote 3X', cp: 5200, sp: 6100 },
  { id: 3, type: 'item', gid: 1, desc: 'Reinforcement steel, high yield T12', sub: '', subOpen: false, qty: 120, unit: 'lengths', make: 'African Foundries', cp: 9800.75, sp: 11500 },
  { id: 4, type: 'item', gid: 1, desc: 'Sharp sand, river dredged', sub: 'Delivered, tested and compacted in approved layers per engineer’s instruction, including waste allowance and carting away of surplus material.', subOpen: false, qty: 30, unit: 'trips', make: 'Local', cp: 28000, sp: 0 },
  { id: 5, type: 'group', title: 'Group B — Finishes' },
  { id: 6, type: 'item', gid: 5, desc: 'Emulsion paint, 20L pail', sub: 'Two coats over prepared surface.', subOpen: false, qty: 18, unit: 'pails', make: 'Dulux', cp: 41000, sp: 48500 },
  { id: 7, type: 'item', gid: null, desc: 'Provisional sum — drainage works (rates pending)', sub: '', subOpen: false, qty: 1, unit: 'sum', make: '', cp: 0, sp: 0 }
];

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const naira0 = (n) => '₦' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });

const numberToWords = (num) => {
  if (!num) return 'ZERO NAIRA ONLY';
  const a = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  const convert = (x) => {
    return x < 20
      ? a[x]
      : x < 100
      ? b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '')
      : x < 1000
      ? a[Math.floor(x / 100)] + ' HUNDRED' + (x % 100 ? ' ' + convert(x % 100) : '')
      : x < 1e6
      ? convert(Math.floor(x / 1000)) + ' THOUSAND' + (x % 1000 ? ' ' + convert(x % 1000) : '')
      : x < 1e9
      ? convert(Math.floor(x / 1e6)) + ' MILLION' + (x % 1e6 ? ' ' + convert(x % 1e6) : '')
      : convert(Math.floor(x / 1e9)) + ' BILLION' + (x % 1e9 ? ' ' + convert(x % 1e9) : '');
  };

  const w = Math.floor(num);
  const k = Math.round((num - w) * 100);
  return convert(w) + ' NAIRA' + (k ? ' AND ' + convert(k) + ' KOBO' : '') + ' ONLY';
};

const Icons = {
  Up: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>,
  Down: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>,
  Copy: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  Chev: () => <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/></svg>,
  Grip: () => <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path strokeLinecap="round" d="M12 4v16m8-8H4"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
  Out: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-5-5m5 5l5-5"/></svg>,
  Inn: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-5 5m5-5l5 5"/></svg>,
  Note: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7"/></svg>,
  Cam: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.5"/></svg>,
  Save: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 2v3a1 1 0 0 0 1 1h5"/><path strokeLinecap="round" stroke-linejoin="round" d="M18 18v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6"/><path strokeLinecap="round" stroke-linejoin="round" d="M18 22H4a2 2 0 0 1-2-2V6"/><path strokeLinecap="round" stroke-linejoin="round" d="M8 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9.172a2 2 0 0 1 1.414.586l2.828 2.828A2 2 0 0 1 22 6.828V16a2 2 0 0 1-2.01 2z"/></svg>,
  Back: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>,
  Columns: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path strokeLinecap="round" d="M9 4v16M15 4v16"/></svg>,
  Import: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5"/></svg>,
  Markup: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13"/></svg>,
  User: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
};

export default function App() {
  const [title, setTitle] = useState('Duplex Build — Cost & Pricing');
  const [sheetNumber, setSheetNumber] = useState('CPS-2026-0001');
  const [issueDate, setIssueDate] = useState('2026-09-17');
  const [client, setClient] = useState(DEFAULT_CLIENTS[0]);
  const [site, setSite] = useState('Lekki Phase 1 — Plot 14');
  const [notes, setNotes] = useState('Rates include supply to site. Labour priced separately on request.');
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [isSaved, setIsSaved] = useState(false);

  // Layout & Modals
  const [theme, setTheme] = useState('light');
  const [layoutChip, setLayoutChip] = useState('Phone');
  const [activeOverlay, setActiveOverlay] = useState(null);
  const [errId, setErrId] = useState(null);
  const [toast, setToast] = useState({ msg: '', isErr: false, visible: false });

  // Search & Modals internal state
  const [clientSearch, setClientSearch] = useState('');
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');

  // Markup Modal State
  const [mkMode, setMkMode] = useState('pct');
  const [mkVal, setMkVal] = useState('20');
  const [mkExcl, setMkExcl] = useState({ 8: true, 6: true });
  const [mkStep, setMkStep] = useState('setup');
  const [mkUndoSnap, setMkUndoSnap] = useState(null);
  const [mkLastSummary, setMkLastSummary] = useState('');
  const [mkErr, setMkErr] = useState('');

  const seqRef = useRef(100);
  const fileInputRef = useRef(null);
  const photoTargetId = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setLayoutChip(w < 430 ? 'Phone' : w < 600 ? 'Large phone' : 'Fold');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const triggerToast = (msg, isErr = false) => {
    setToast({ msg, isErr, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2600);
  };

  const isColVisible = (key) => {
    const col = columns.find(c => c.key === key);
    return !col || col.visible;
  };

  const rowIndices = useMemo(() => {
    const map = {};
    let count = 0;
    rows.forEach(r => {
      if (r.type === 'group') {
        const members = rows.filter(m => m.type === 'item' && m.gid === r.id);
        members.forEach(m => {
          map[m.id] = ++count;
        });
      } else if (r.gid == null) {
        map[r.id] = ++count;
      }
    });
    return map;
  }, [rows]);

  const totals = useMemo(() => {
    let cost = 0;
    let sell = 0;
    rows.forEach(r => {
      if (r.type === 'item') {
        cost += (r.cp || 0) * (r.qty || 0);
        sell += (r.sp || 0) * (r.qty || 0);
      }
    });
    const grossProfit = sell - cost;
    const marginPercent = sell ? Math.round((grossProfit / sell) * 100) : 0;
    return { totalCost: cost, totalSelling: sell, grossProfit, marginPercent };
  }, [rows]);

  const updateItemField = (id, key, val) => {
    setIsSaved(false);
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [key]: val } : r)));
  };

  const updateGroupTitle = (id, title) => {
    setIsSaved(false);
    setRows(prev => prev.map(r => (r.id === id ? { ...r, title } : r)));
  };

  const removeRow = (id) => {
    setIsSaved(false);
    const target = rows.find(r => r.id === id);
    if (!target) return;
    if (target.type === 'group') {
      setRows(prev =>
        prev
          .map(x => (x.type === 'item' && x.gid === id ? { ...x, gid: null } : x))
          .filter(x => x.id !== id)
      );
      triggerToast('Group removed — its items kept');
    } else {
      setRows(prev => prev.filter(x => x.id !== id));
      triggerToast(target.desc.trim() || target.sp > 0 ? 'Row deleted' : 'Row removed');
    }
  };

  const moveRow = (id, dir) => {
    setIsSaved(false);
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx < 0) return prev;
      const r = prev[idx];
      const siblings = r.type === 'item' && r.gid != null
        ? prev.filter(x => x.type === 'item' && x.gid === r.gid)
        : prev.filter(x => x.type === 'group' || x.gid == null);
      const sibIdx = siblings.indexOf(r);
      const targetSib = siblings[sibIdx + dir];
      if (!targetSib) return prev;

      const newRows = [...prev];
      newRows.splice(idx, 1);
      const targetIdx = newRows.indexOf(targetSib);
      newRows.splice(dir > 0 ? targetIdx + 1 : targetIdx, 0, r);
      return newRows;
    });
  };

  const dupRow = (id) => {
    setIsSaved(false);
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx < 0) return prev;
      const src = prev[idx];
      const newId = ++seqRef.current;
      const copy = {
        ...src,
        id: newId,
        desc: (src.desc || '') + ' (copy)',
        subOpen: false
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    triggerToast('Item duplicated');
  };

  const insertBelow = (id) => {
    setIsSaved(false);
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx < 0) return prev;
      const gid = prev[idx].type === 'item' ? prev[idx].gid : null;
      const newId = ++seqRef.current;
      const newItem = {
        id: newId,
        type: 'item',
        gid,
        desc: '',
        sub: '',
        subOpen: false,
        qty: 1,
        unit: '',
        make: '',
        cp: 0,
        sp: 0
      };
      const next = [...prev];
      next.splice(idx + 1, 0, newItem);
      return next;
    });
    triggerToast('Row inserted');
  };

  const addItem = (gid = null) => {
    setIsSaved(false);
    const newId = ++seqRef.current;
    const newItem = {
      id: newId,
      type: 'item',
      gid,
      desc: '',
      sub: '',
      subOpen: false,
      qty: 1,
      unit: '',
      make: '',
      cp: 0,
      sp: 0
    };
    if (gid == null) {
      setRows(prev => [...prev, newItem]);
      triggerToast('Line item added');
    } else {
      setRows(prev => {
        const mem = prev.filter(x => x.type === 'item' && x.gid === gid);
        const last = mem[mem.length - 1];
        const at = last ? prev.indexOf(last) + 1 : prev.findIndex(x => x.type === 'group' && x.id === gid) + 1;
        const next = [...prev];
        next.splice(at >= 0 ? at : next.length, 0, newItem);
        return next;
      });
      triggerToast('Item added to group');
    }
  };

  const addGroup = () => {
    setIsSaved(false);
    const newId = ++seqRef.current;
    const newGrp = { id: newId, type: 'group', title: 'New Group' };
    setRows(prev => [...prev, newGrp]);
    triggerToast('Group added');
  };

  const handlePhotoClick = (id) => {
    photoTargetId.current = id;
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    const id = photoTargetId.current;
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file || id == null) return;
    if (!/^image\//.test(file.type)) {
      triggerToast('Choose an image file', true);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => triggerToast('Could not read that image', true);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => triggerToast('Could not read that image', true);
      img.onload = () => {
        const max = 720;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          updateItemField(id, 'image', canvas.toDataURL('image/jpeg', 0.8));
          triggerToast('Photo attached');
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!sheetNumber.trim()) {
      triggerToast('Save blocked: sheet number is required', true);
      return;
    }
    if (!client) {
      triggerToast('Save blocked: pick a client before saving', true);
      setActiveOverlay('client');
      return;
    }
    const invalidItem = rows.find(
      r => r.type === 'item' && (!r.desc.trim() || Number(r.qty) <= 0 || Number(r.sp) <= 0)
    );
    if (invalidItem) {
      setErrId(invalidItem.id);
      triggerToast('Save blocked: an item is missing a description, qty, or SP', true);
      setTimeout(() => setErrId(null), 2600);
      return;
    }
    setIsSaved(true);
    triggerToast('Cost & Pricing Sheet saved');
  };

  const mkIsEligible = (r) => r.type === 'item' && Number.isFinite(Number(r.cp)) && Number(r.cp) > 0;
  const mkIsIncluded = (r) => mkIsEligible(r) && !mkExcl[r.id];

  const handleMkValidate = (valStr) => {
    const raw = valStr.trim().replace(/,/g, '');
    if (raw === '') return { ok: false, msg: 'Enter a markup value to continue.' };
    const v = Number(raw);
    if (!Number.isFinite(v)) return { ok: false, msg: 'That value is not a number. Enter 0 or more.' };
    if (v < 0) return { ok: false, msg: 'Negative markup is not allowed. Markup adds to cost — it never discounts.' };
    return { ok: true, val: v };
  };

  const computeMarkup = () => {
    const valRes = handleMkValidate(mkVal);
    if (!valRes.ok) return null;
    const val = valRes.val;
    const aff = [];
    let curSell = 0;
    let newSell = 0;
    let curP = 0;
    let newP = 0;

    rows.forEach(r => {
      if (r.type !== 'item') return;
      const qty = Number(r.qty || 0);
      const cp = Number(r.cp || 0);
      const sp = Number(r.sp || 0);
      curSell += sp * qty;
      curP += (sp - cp) * qty;

      if (!mkIsIncluded(r)) {
        newSell += sp * qty;
        newP += (sp - cp) * qty;
        return;
      }

      const rawProp = mkMode === 'pct' ? cp * (1 + val / 100) : cp + val;
      const prop = Math.round(rawProp * 100) / 100;
      const tsp = prop * qty;
      const tcp = cp * qty;
      const lp = tsp - tcp;
      const m = tsp ? (lp / tsp) * 100 : null;

      aff.push({ r, prop, tsp, delta: prop - sp, lp, m, replaces: sp });
      newSell += tsp;
      newP += lp;
    });

    return { val, aff, curSell, newSell, curP, newP };
  };

  const handleMkApply = () => {
    const res = computeMarkup();
    if (!res || !res.aff.length) return;

    const undoMap = {};
    setRows(prev =>
      prev.map(r => {
        if (r.type === 'item') {
          const matched = res.aff.find(a => a.r.id === r.id);
          if (matched) {
            undoMap[r.id] = Number(r.sp || 0);
            return { ...r, sp: matched.prop };
          }
        }
        return r;
      })
    );

    setMkUndoSnap(undoMap);
    setActiveOverlay(null);
    setMkStep('setup');
    triggerToast(`Markup applied to ${res.aff.length} rows — totals recomputed`);
  };

  const handleUndoMarkup = () => {
    if (!mkUndoSnap) return;
    setRows(prev =>
      prev.map(r => {
        if (r.type === 'item' && mkUndoSnap[r.id] !== undefined) {
          return { ...r, sp: mkUndoSnap[r.id] };
        }
        return r;
      })
    );
    setMkUndoSnap(null);
    triggerToast('Markup undone — previous SP values restored');
  };

  const filteredClients = DEFAULT_CLIENTS.filter(
    c =>
      !clientSearch ||
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.person.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const numItems = rows.filter(r => r.type === 'item').length;
  const numGroups = rows.filter(r => r.type === 'group').length;

  return (
    <div className="cps-app-wrapper">
      <style>{`
        :root {
          --ink:#0f172a; --sub:#475569; --faint:#8b9ab0;
          --line:rgba(15,23,42,.10); --line-strong:rgba(15,23,42,.20);
          --bg:#eef2f7; --card:#ffffff; --soft:#f6f9fc;
          --accent:#1e3a5f; --accent-soft:rgba(30,58,95,.13); --accent-ink:#ffffff;
          --red:#dc2626; --red-soft:rgba(220,38,38,.09);
          --green:#15803d; --green-soft:rgba(21,128,61,.10);
          --rail:rgba(15,23,42,.22);
          --mono:'DM Mono',monospace;
          --cost:#b45309; --cost-soft:rgba(180,83,9,.10);
          --sell:#15803d; --sell-soft:rgba(21,128,61,.10);
          --loss:#b91c1c;
          --group-line:rgba(30,58,95,.38); --group-spine:#1e3a5f; --group-soft:rgba(30,58,95,.07);
          --group-head:linear-gradient(115deg,#0f172a,#1e3a5f 58%,#334155);
          --group-on:#f8fafc;
          --shadow-ear:0 3px 9px rgba(15,23,42,.16);
          --shadow-sheet:0 -18px 44px rgba(0,0,0,.28);
          --bg-bd-button-primary-bg:#1e3a5f;
          --bd-button-primary-text:#f1f5f9;
          --gutter:14px;
        }
        [data-theme="dark"] {
          --ink:#f1f5f9; --sub:#cbd5e1; --faint:#7d8da5;
          --line:rgba(148,163,184,.18); --line-strong:rgba(148,163,184,.32);
          --bg:#0b1220; --card:#16233a; --soft:#111d31;
          --accent:#38bdf8; --accent-soft:rgba(56,189,248,.16); --accent-ink:#06131f;
          --red:#f87171; --red-soft:rgba(248,113,113,.13);
          --green:#34d399; --green-soft:rgba(52,211,153,.14);
          --rail:rgba(148,163,184,.32);
          --cost:#fbbf24; --cost-soft:rgba(251,191,36,.14);
          --sell:#34d399; --sell-soft:rgba(52,211,153,.14);
          --loss:#f87171;
          --group-line:rgba(56,189,248,.34); --group-spine:#38bdf8; --group-soft:rgba(56,189,248,.10);
          --group-head:linear-gradient(115deg,#16233a,#1c3550);
          --group-on:#e2e8f0;
          --shadow-ear:0 3px 9px rgba(0,0,0,.45);
          --shadow-sheet:0 -18px 44px rgba(0,0,0,.5);
          --bg-bd-button-primary-bg:#2563eb;
          --bd-button-primary-text:#f8fafc;
        }
        .cps-app-wrapper {
          background: var(--bg);
          color: var(--ink);
          font-family: 'Manrope', sans-serif;
          min-height: 100vh;
        }
        .cps-app-wrapper * { box-sizing: border-box; margin: 0; padding: 0; }
        .mono { font-family: var(--mono); }
        .wrap { max-width: 430px; margin: 0 auto; padding: 8px var(--gutter) calc(112px + env(safe-area-inset-bottom)); }
        .topbar { position: sticky; top: 0; z-index: 40; display: flex; align-items: center; gap: 6px; padding: 6px 0 8px; background: var(--bg); border-bottom: 1px solid var(--line); }
        .tb-btn { width: 40px; height: 40px; border-radius: 11px; border: 1px solid var(--line); background: var(--card); color: var(--sub); display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; }
        .tb-btn:active { transform: scale(.93); }
        .tb-btn svg { width: 17px; height: 17px; }
        .tb-title { flex: 1; min-width: 0; padding: 0 2px; }
        .tb-title h1 { font-size: 13.5px; font-weight: 800; letter-spacing: -.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tb-meta { display: flex; align-items: center; gap: 5px; margin-top: 2px; font-size: 8px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: var(--faint); }
        .tb-meta .badge { color: var(--accent); }
        .tb-meta .sep { opacity: .55; }
        .sec { margin-top: 20px; }
        .sec + .sec { margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--line); }
        .sec-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .secno { font-family: var(--mono); font-size: 10.5px; font-weight: 700; color: var(--accent); flex-shrink: 0; }
        .sec-head h2 { font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
        .sec-head .rule { flex: 1; height: 1px; background: var(--line); min-width: 12px; }
        .sec-head .meta { font-family: var(--mono); font-size: 8.5px; font-weight: 500; color: var(--faint); white-space: nowrap; }
        .lb { display: block; font-size: 8.5px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: var(--faint); margin-bottom: 5px; }
        .req { color: var(--red); }
        .fld { width: 100%; min-height: 42px; padding: 0 12px; border-radius: 11px; border: 1px solid var(--line); background: var(--card); font-size: 12px; font-weight: 600; color: var(--ink); outline: none; }
        .fld::placeholder { color: var(--faint); font-weight: 600; }
        .fld:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
        textarea.fld { min-height: 60px; padding: 10px 12px; resize: none; font-weight: 600; font-size: 12.5px; line-height: 1.45; }
        .dgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .dgrid .full { grid-column: 1/-1; }
        .clientpick { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 52px; padding: 8px 12px; border-radius: 12px; border: 1px dashed var(--line-strong); background: var(--card); text-align: left; cursor: pointer; }
        .clientpick.filled { border-style: solid; }
        .clientpick .ci { width: 34px; height: 34px; border-radius: 9px; background: var(--soft); color: var(--sub); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--line); }
        .clientpick .ci svg { width: 16px; height: 16px; }
        .clientpick .ct { flex: 1; min-width: 0; }
        .clientpick .ct b { display: block; font-size: 12.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink); }
        .clientpick .ct small { display: block; margin-top: 1px; font-size: 8px; font-weight: 800; letter-spacing: .06em; color: var(--faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .clientpick .cx { flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--faint); background: none; border: 0; cursor: pointer; }
        .clientpick .cx svg { width: 13px; height: 13px; }
        .clientpick .chev { flex-shrink: 0; color: var(--faint); display: flex; }
        .clientpick .chev svg { width: 15px; height: 15px; }
        .cl-list { display: flex; flex-direction: column; min-height: 0; overflow-y: auto; max-height: 34vh; }
        .crow { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px; border: 1px solid var(--line); border-radius: 11px; background: var(--card); text-align: left; margin-top: 8px; cursor: pointer; }
        .crow:first-child { margin-top: 0; }
        .crow .ci { width: 34px; height: 34px; border-radius: 9px; background: var(--soft); color: var(--sub); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--line); font-size: 11px; font-weight: 800; }
        .crow .ct { flex: 1; min-width: 0; }
        .crow .ct b { display: block; font-size: 11.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink); }
        .crow .ct small { display: block; margin-top: 1px; font-size: 9px; color: var(--sub); }
        .crow .tick { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--line-strong); display: flex; align-items: center; justify-content: center; color: transparent; }
        .crow .tick svg { width: 12px; height: 12px; }
        .crow.sel { border-color: var(--accent); }
        .crow.sel .tick { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
        .itemtools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; row-gap: 8px; margin-bottom: 14px; }
        .itbn { height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); font-size: 8.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; display: flex; align-items: center; gap: 6px; color: var(--sub); cursor: pointer; }
        .itbn svg { width: 11px; height: 11px; }
        .itbn:active { transform: scale(.96); }
        .itbn.hot { border-color: var(--accent); color: var(--accent); }
        .itbn.danger { margin-left: auto; border-color: transparent; background: none; color: var(--red); padding: 0 8px; }
        #items { display: flex; flex-direction: column; }
        #items > .item, #items > .gwrap { margin-top: 18px; }
        #items > .item:first-child, #items > .gwrap:first-child { margin-top: 0; }
        .item { position: relative; padding-top: 14px; }
        .item::before { content:''; position: absolute; top: 0; left: 0; right: 26px; height: 1px; background: var(--line); }
        #items > .item:first-child::before, .gbody > .item:first-child::before { display: none; }
        .item.err { background: var(--red-soft); border-radius: 12px; }
        .ear { position: absolute; top: 0; right: 0; width: 26px; height: 26px; border-radius: 8px 3px 8px 8px; background: var(--card); border: 1px solid var(--line-strong); color: var(--sub); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-ear); z-index: 6; cursor: pointer; }
        .ear svg { width: 11px; height: 11px; }
        .ihead { display: grid; grid-template-columns: 34px minmax(0, 1fr); column-gap: 10px; align-items: stretch; }
        .rail { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 0; }
        .rail::before { content:''; position: absolute; left: 50%; top: 17px; bottom: 17px; width: 1px; background: var(--rail); transform: translateX(-50%); z-index: 0; }
        .rail > * { position: relative; z-index: 1; flex-shrink: 0; }
        .idx { width: 34px; height: 34px; border-radius: 10px; background: var(--card); border: 1px solid var(--line); color: var(--ink); font-family: var(--mono); font-size: 10.5px; font-weight: 500; display: flex; align-items: center; justify-content: center; }
        .rmid { display: flex; flex-direction: column; gap: 8px; }
        .rbtn { position: relative; width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--card); color: var(--sub); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .rbtn svg { width: 12px; height: 12px; }
        .rbtn:disabled { opacity: .32; pointer-events: none; }
        .idesc { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
        .desc { min-height: 64px; }
        .subrow { display: flex; flex-direction: column; gap: 6px; padding-left: 10px; border-left: 2px solid var(--line); }
        .subrow.has { border-left-color: var(--accent); }
        .subtog { display: flex; align-items: flex-start; gap: 6px; width: 100%; min-height: 34px; padding: 7px 0; text-align: left; font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: var(--faint); background: none; border: 0; cursor: pointer; }
        .stog-icon { width: 15px; height: 15px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stog-icon svg { width: 12px; height: 12px; }
        .stog-label { flex: 1; min-width: 0; text-transform: none; letter-spacing: 0; }
        .stog-chev { width: 12px; height: 12px; flex-shrink: 0; color: var(--faint); transition: transform .2s; }
        .subrow.open .stog-chev { transform: rotate(180deg); }
        .sub-prev-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 10.5px; font-weight: 600; line-height: 1.45; color: var(--sub); }
        .subfield { min-height: 58px; }
        .idata { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
        .fgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .comm-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .cfield { display: block; min-width: 0; }
        .cf-lab { display: flex; align-items: center; gap: 4px; margin: 0 0 5px 2px; font-size: 8.5px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
        .cf-lab svg { width: 10px; height: 10px; }
        .cfield.cost .cf-lab { color: var(--cost); }
        .cfield.sell .cf-lab { color: var(--sell); }
        .cfield.cost .fld { border-left: 3px solid var(--cost); }
        .cfield.sell .fld { border-left: 3px solid var(--sell); }
        .fin3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
        .fcell { border: 1px solid var(--line); border-radius: 10px; background: var(--card); padding: 7px 8px; min-width: 0; }
        .fcell small { display: block; font-size: 7.5px; font-weight: 800; letter-spacing: .08em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--faint); }
        .fcell.tcp small { color: var(--cost); }
        .fcell.tsp small { color: var(--sell); }
        .fcell b { display: block; margin-top: 2px; font-family: var(--mono); font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fcell.pf.pos { background: var(--green-soft); }
        .fcell.pf.neg { background: var(--red-soft); }
        .finm { margin-top: 6px; font-family: var(--mono); font-size: 9px; color: var(--sub); text-align: right; }
        .ins { position: relative; display: flex; align-items: center; gap: 6px; height: 20px; margin-top: 10px; color: var(--faint); font-size: 8.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; background: none; border: 0; cursor: pointer; }
        .cam { position: relative; align-self: flex-start; display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px 0 11px; border-radius: 11px; border: 1px dashed var(--line-strong); background: var(--card); color: var(--faint); font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
        .cam svg { width: 16px; height: 16px; }
        .has-photo .cam { display: none; }
        .thumb, .foldthumb { display: none; }
        .has-photo .thumb { display: flex; position: relative; align-self: flex-end; width: 60px; height: 60px; border-radius: 12px; overflow: hidden; background: var(--soft); border: 1px solid var(--line); }
        .thumb img, .foldthumb img { width: 100%; height: 100%; object-fit: cover; }
        .thumb .px, .foldthumb .px { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: var(--red); color: #fff; display: flex; align-items: center; justify-content: center; border: 0; cursor: pointer; }
        .thumb .px svg, .foldthumb .px svg { width: 8px; height: 8px; }
        @media (min-width:600px){
          .has-photo .thumb { display: none; }
          .has-photo .foldthumb { display: flex; position: relative; width: 64px; height: 64px; margin-top: 2px; border-radius: 12px; overflow: hidden; background: var(--soft); border: 1px solid var(--line); }
        }
        .gwrap { display: flex; flex-direction: column; width: calc(100% + 2*var(--gutter)); margin-left: calc(-1*var(--gutter)); margin-right: calc(-1*var(--gutter)); border-top: 1px solid var(--group-line); border-bottom: 1px solid var(--group-line); border-left: 6px solid var(--group-spine); background: var(--card); }
        .ghdr { display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 8px var(--gutter); background: var(--group-head); }
        .gtitle { flex: 1; min-width: 0; background: none; border: 0; padding: 0; color: var(--group-on); font-size: 12.5px; font-weight: 700; outline: none; }
        .gtitle::placeholder { color: rgba(248,250,252,.55); }
        .gcount { font-family: var(--mono); font-size: 8.5px; color: rgba(248,250,252,.75); white-space: nowrap; flex-shrink: 0; }
        .gbtn { position: relative; width: 34px; height: 34px; border-radius: 10px; border: 1px solid rgba(255,255,255,.24); background: rgba(255,255,255,.12); color: var(--group-on); display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; }
        .gbtn svg { width: 13px; height: 13px; }
        .gbody { display: flex; flex-direction: column; padding: 0 var(--gutter); }
        .gbody > .item { padding-top: 14px; margin-top: 6px; }
        .gbody > .item:first-child { margin-top: 0; padding-top: 14px; }
        .gempty { margin: 14px 0 2px; padding: 16px 12px; text-align: center; font-size: 10px; font-weight: 700; line-height: 1.5; color: var(--faint); border: 1px dashed var(--group-line); border-radius: 11px; }
        .gfoot { margin-top: 8px; padding: 8px var(--gutter) 12px; border-top: 2px solid var(--group-soft); }
        .gadd { width: 100%; min-height: 42px; border-radius: 11px; border: 1px dashed var(--group-line); background: transparent; color: var(--accent); font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
        .gadd svg { width: 11px; height: 11px; }
        .createpair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
        .cbtn { min-height: 46px; border-radius: 12px; font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border: 0; }
        .cbtn svg { width: 12px; height: 12px; }
        .cbtn.primary { background: var(--accent); border: 1px solid var(--accent); color: var(--accent-ink); }
        .cbtn.ghost { background: var(--card); border: 1px dashed var(--line-strong); color: var(--ink); }
        .empty { margin-top: 2px; padding: 20px 16px; text-align: center; font-size: 10px; font-weight: 700; line-height: 1.6; color: var(--faint); border: 1px dashed var(--line); border-radius: 12px; }
        .totals { position: relative; border: 1px solid var(--line-strong); border-radius: 16px; background: linear-gradient(180deg,var(--accent-soft),rgba(0,0,0,0) 42%),var(--card); padding: 0 12px 12px; overflow: hidden; }
        .close-top { height: 3px; background: var(--accent); margin: 0 -12px 2px; position: relative; overflow: hidden; }
        .close-top i { position: absolute; top: 0; bottom: 0; width: 90px; background: linear-gradient(90deg,rgba(0,0,0,0),rgba(255,255,255,.8),rgba(0,0,0,0)); animation: sheen 14s linear infinite; }
        @keyframes sheen { from { left: -90px; } to { left: 100%; } }
        .close-eyebrow { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding: 8px 0 2px; font-size: 8.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
        .close-eyebrow span { font-family: var(--mono); font-weight: 500; color: var(--faint); letter-spacing: 0; }
        .sumline { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 0; font-size: 11px; font-weight: 600; color: var(--sub); border-bottom: 1px solid var(--line); }
        .sumline b { font-family: var(--mono); font-size: 11.5px; font-weight: 500; color: var(--ink); }
        .sumtotal { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 10px; padding-top: 10px; border-top: 2px solid var(--line-strong); }
        .sumtotal small { display: block; font-size: 8px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--faint); }
        .sumtotal b { font-family: var(--mono); font-size: 22px; font-weight: 500; color: var(--accent); }
        .sumtotal .right { text-align: right; }
        #tProfit.neg, #tMargin.neg { color: var(--loss); }
        #tProfit.pos, #tMargin.pos { color: var(--sell); }
        .words { margin-top: 10px; padding: 9px 11px; border: 1px dashed var(--line); border-radius: 10px; background: var(--soft); font-size: 9.5px; font-style: italic; color: var(--sub); line-height: 1.55; }
        .savebar { margin-top: 18px; }
        .save-cta { min-height: 50px; font-size: 10px; width: 100%; }
        .tb-save { display: none; height: 36px; padding: 0 14px; border-radius: 11px; background: var(--bg-bd-button-primary-bg); color: var(--bd-button-primary-text); font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; align-items: center; gap: 6px; flex-shrink: 0; border: 0; cursor: pointer; }
        .tb-save svg { width: 13px; height: 13px; }
        .fab { position: fixed; right: 16px; bottom: calc(82px + env(safe-area-inset-bottom)); width: 50px; height: 50px; border-radius: 18px; border: 0; background: var(--bg-bd-button-primary-bg); color: var(--bd-button-primary-text); box-shadow: 0 10px 15px -3px rgb(0 0 0/.1); display: flex; align-items: center; justify-content: center; z-index: 50; cursor: pointer; }
        .fab svg { width: 20px; height: 20px; }
        .ov { position: fixed; inset: 0; background: rgba(8,15,28,.62); backdrop-filter: blur(3px); display: none; align-items: flex-end; justify-content: center; z-index: 60; }
        .ov.show { display: flex; }
        .ov.center { align-items: center; }
        .sheet { width: 100%; max-width: 430px; background: var(--card); border-radius: 22px 22px 0 0; max-height: 82vh; display: flex; flex-direction: column; gap: 10px; padding: 12px 14px calc(16px + env(safe-area-inset-bottom)); box-shadow: var(--shadow-sheet); }
        .grab { width: 36px; height: 3px; border-radius: 99px; background: var(--line-strong); margin: 2px auto 0; }
        .shd { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
        .shd b { font-size: 11.5px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: var(--ink); }
        .shd small { display: block; margin-top: 2px; font-size: 9px; font-weight: 600; color: var(--sub); text-transform: none; letter-spacing: 0; }
        .x { width: 38px; height: 38px; border-radius: 11px; background: var(--soft); border: 1px solid var(--line); color: var(--sub); display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; }
        .x svg { width: 12px; height: 12px; }
        .cta { width: 100%; min-height: 46px; border-radius: 12px; border: 0; background: var(--accent); color: var(--accent-ink); font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; cursor: pointer; }
        .cta:disabled { opacity: .45; }
        .linkbtn { width: 100%; min-height: 44px; border: 0; background: none; color: var(--sub); font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; cursor: pointer; }
        .dialog { width: min(88%, 320px); background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px; box-shadow: var(--shadow-ear); }
        .dialog b { font-size: 12.5px; font-weight: 800; color: var(--ink); }
        .dialog p { margin-top: 6px; font-size: 10px; font-weight: 600; line-height: 1.55; color: var(--sub); }
        .dialog .acts { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
        .dbtn { min-height: 40px; padding: 0 14px; border-radius: 11px; border: 1px solid var(--line); background: var(--soft); font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: var(--ink); cursor: pointer; }
        .dbtn.danger { border-color: var(--red); background: var(--red-soft); color: var(--red); }
        .cm-list { border: 1px solid var(--line); border-radius: 11px; background: var(--soft); overflow: hidden; }
        .cm-row { display: flex; align-items: center; gap: 2px; min-height: 44px; padding: 5px 4px; border-bottom: 1px solid var(--line); }
        .cm-row:last-child { border-bottom: 0; }
        .cm-grip { display: flex; align-items: center; justify-content: center; width: 26px; height: 100%; color: var(--faint); flex-shrink: 0; }
        .cm-grip svg { width: 13px; height: 13px; }
        .cm-ord { display: flex; flex-direction: column; flex-shrink: 0; }
        .cm-ord button { display: flex; align-items: center; justify-content: center; width: 26px; height: 20px; color: var(--faint); background: none; border: 0; cursor: pointer; }
        .cm-ord button:disabled { opacity: .2; pointer-events: none; }
        .cm-ord svg { width: 12px; height: 12px; }
        .cm-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; padding: 0 2px; }
        .cm-labrow { display: flex; align-items: center; gap: 5px; min-width: 0; }
        .cm-lab { flex: 1; min-width: 0; height: 30px; padding: 0 8px; border: 1px solid transparent; border-radius: 8px; background: transparent; font-size: 11.5px; font-weight: 700; color: var(--ink); outline: none; }
        .cm-badge { flex-shrink: 0; padding: 2px 6px; border-radius: 6px; border: 1px solid var(--line); background: var(--card); font-size: 7.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--faint); }
        .cm-sw { position: relative; width: 40px; height: 28px; border-radius: 99px; border: 0; background: var(--line-strong); flex-shrink: 0; cursor: pointer; }
        .cm-sw::after { content:''; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.28); transition: transform .2s; }
        .cm-sw.on { background: var(--accent); }
        .cm-sw.on::after { transform: translateX(12px); }
        .cm-sec { margin: 12px 0 6px; font-size: 8.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--faint); }
        .cm-reset { width: 100%; margin-top: 2px; padding: 6px 0; border: 0; background: none; color: var(--sub); font-size: 9px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }
        .impnote { font-size: 8.5px; line-height: 1.65; color: var(--sub); background: var(--soft); border: 1px dashed var(--line); border-radius: 9px; padding: 8px 10px; }
        .impnote code { font-family: var(--mono); font-size: 8px; color: var(--accent); }
        .mk-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .mk-seg button { min-height: 44px; border-radius: 11px; border: 1px solid var(--line); background: var(--soft); font-size: 9px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: var(--sub); display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
        .mk-seg button.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
        .mk-seg button svg { width: 13px; height: 13px; }
        .mk-valrow { display: flex; gap: 8px; }
        .mk-valrow .fld { font-family: var(--mono); font-size: 15px; font-weight: 700; }
        .mk-err { display: none; font-size: 9.5px; font-weight: 700; color: var(--red); background: var(--red-soft); border: 1px solid var(--red); border-radius: 9px; padding: 8px 10px; line-height: 1.5; }
        .mk-err.show { display: block; }
        .mk-tools { display: flex; align-items: center; gap: 4px; }
        .mk-tools .cnt { margin-left: auto; font-family: var(--mono); font-size: 9px; color: var(--faint); }
        .mk-list { display: flex; flex-direction: column; min-height: 0; overflow-y: auto; border: 1px solid var(--line); border-radius: 11px; background: var(--soft); max-height: 30vh; }
        .mk-gcap { padding: 8px 10px 4px; font-size: 8px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--faint); }
        .mk-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-top: 1px solid var(--line); background: var(--card); }
        .mk-row:first-child { border-top: 0; }
        .mk-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: var(--green); }
        .mk-row.out .mk-dot { background: var(--line-strong); }
        .mk-row.nope .mk-dot { background: var(--red); }
        .mk-row .t { flex: 1; min-width: 0; }
        .mk-row .t b { display: block; font-size: 10.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink); }
        .mk-row .t small { display: block; margin-top: 1px; font-family: var(--mono); font-size: 8.5px; color: var(--sub); }
        .mk-row .t small.bad { color: var(--red); font-weight: 700; }
        .mk-tog { flex-shrink: 0; min-width: 64px; min-height: 34px; padding: 0 10px; border-radius: 9px; border: 1px solid var(--line-strong); font-size: 8px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: var(--sub); background: none; cursor: pointer; }
        .mk-tog.on { border-color: var(--green); color: var(--green); background: var(--green-soft); }
        .mk-tog:disabled { opacity: .4; pointer-events: none; }
        .mk-agg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .mk-cell { border: 1px solid var(--line); border-radius: 11px; background: var(--soft); padding: 9px 10px; }
        .mk-cell small { display: block; font-size: 8px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--faint); }
        .mk-cell b { display: block; margin-top: 3px; font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink); }
        .mk-cell b.up { color: var(--sell); }
        .mk-prev { display: flex; flex-direction: column; min-height: 0; overflow-y: auto; border: 1px solid var(--line); border-radius: 11px; max-height: 32vh; }
        .mk-prow { padding: 9px 10px; border-top: 1px solid var(--line); background: var(--card); }
        .mk-prow:first-child { border-top: 0; }
        .mk-prow .d { font-size: 10.5px; font-weight: 700; color: var(--ink); }
        .mk-prow .ln { display: flex; justify-content: space-between; gap: 8px; margin-top: 3px; font-family: var(--mono); font-size: 9.5px; color: var(--sub); }
        .mk-prow .ln b { color: var(--ink); }
        .mk-prow .ln .new { color: var(--sell); font-weight: 700; }
        .mk-prow .ln .rep { color: var(--red); font-weight: 700; }
        .mk-note { font-size: 8.5px; line-height: 1.6; color: var(--sub); background: var(--soft); border: 1px dashed var(--line); border-radius: 9px; padding: 8px 10px; }
        .mk-undo { display: none; align-items: center; gap: 8px; margin-top: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--accent); background: var(--accent-soft); font-size: 9.5px; font-weight: 700; color: var(--ink); }
        .mk-undo.show { display: flex; }
        .mk-undo span { flex: 1; min-width: 0; }
        .mk-undo button { flex-shrink: 0; min-height: 36px; padding: 0 14px; border-radius: 9px; background: var(--accent); color: var(--accent-ink); font-size: 8.5px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; border: 0; cursor: pointer; }
        .toast { position: fixed; bottom: 148px; left: 50%; transform: translateX(-50%); z-index: 70; max-width: 86vw; padding: 9px 14px; border-radius: 12px; background: var(--ink); color: var(--bg); font-size: 9.5px; font-weight: 700; box-shadow: 0 18px 40px rgba(0,0,0,.3); display: none; }
        .toast.show { display: block; }
        .toast.err { border: 1px solid var(--red); }
        @media (min-width:430px){
          :root { --gutter: 18px; }
          .wrap { max-width: 560px; padding: 10px var(--gutter) calc(112px + env(safe-area-inset-bottom)); }
          .desc { min-height: 72px; }
          .createpair { gap: 12px; }
        }
        @media (min-width:600px){
          :root { --gutter: 24px; }
          .wrap { max-width: 820px; padding: 14px var(--gutter) calc(112px + env(safe-area-inset-bottom)); }
          .tb-save { display: flex; }
          .fab { display: none; }
          .dgrid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
          .item { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(280px, 1fr); column-gap: 20px; }
          .ihead { grid-column: 1; grid-row: 1; }
          .idata { grid-column: 2; grid-row: 1; margin-top: 0; padding-left: 18px; border-left: 1px solid var(--line); }
          .ins { grid-column: 1/-1; grid-row: 2; }
          .desc { min-height: 92px; }
          .totals-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 22px; }
          .sumtotal { margin-top: 0; }
          .sheet { max-width: 560px; border-radius: 22px; margin-bottom: 18px; }
        }
      `}</style>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoUpload}
      />

      <div className="wrap">
        {}
        <header className="topbar">
          <button
            className="tb-btn"
            title="Back to sheets"
            aria-label="Back to sheets"
            onClick={() => triggerToast('Back to sheets')}
          >
            <Icons.Back />
          </button>

          <div className="tb-title">
            <h1>Cost &amp; Pricing Sheet</h1>
            <div className="tb-meta">
              <span className="badge">{isSaved ? 'Saved' : 'Draft'}</span>
              <span className="sep">&middot;</span>
              <span>{layoutChip}</span>
            </div>
          </div>

          <button
            className="tb-save"
            onClick={handleSave}
            title="Save Cost &amp; Pricing Sheet"
            aria-label="Save Cost &amp; Pricing Sheet"
          >
            <Icons.Save />
            Save CPS
          </button>

          <button
            className="tb-btn"
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
            onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="4" />
                <path strokeLinecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </header>

        {}
        <section className="sec" style={{ marginTop: '14px' }}>
          <div className="sec-head">
            <span className="secno">1.</span>
            <h2>Document details</h2>
            <span className="rule"></span>
            <span className="meta">{sheetNumber}</span>
          </div>

          <div className="dgrid">
            <div className="full">
              <label className="lb" htmlFor="fTitle">Sheet Title</label>
              <input
                className="fld"
                id="fTitle"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Sheet title"
              />
            </div>

            <div>
              <label className="lb" htmlFor="fNo">
                Sheet Number <span className="req">*</span>
              </label>
              <input
                className="fld mono"
                id="fNo"
                value={sheetNumber}
                onChange={e => setSheetNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="lb" htmlFor="fDate">Issue Date</label>
              <input
                className="fld mono"
                id="fDate"
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
              />
            </div>

            <div className="full">
              <label className="lb" id="fClientLabel">
                Client <span className="req">*</span>
              </label>
              <div
                className={`clientpick ${client ? 'filled' : ''}`}
                role="button"
                tabIndex={0}
                title={client ? `Change client (currently ${client.name})` : 'Select a client'}
                onClick={() => setActiveOverlay('client')}
              >
                <span className="ci"><Icons.User /></span>
                <span className="ct">
                  <b>{client ? client.name : 'Select a client'}</b>
                  <small>
                    {client
                      ? [client.person, client.phone, client.email].filter(Boolean).join(' · ')
                      : 'Bill to · Client'}
                  </small>
                </span>
                {client && (
                  <button
                    type="button"
                    className="cx"
                    title="Clear client"
                    onClick={(e) => { e.stopPropagation(); setClient(null); }}
                  >
                    <Icons.X />
                  </button>
                )}
                <span className="chev"><Icons.Chev /></span>
              </div>
            </div>

            <div className="full">
              <label className="lb" htmlFor="fSite">Site / Project</label>
              <input
                className="fld"
                id="fSite"
                value={site}
                onChange={e => setSite(e.target.value)}
                placeholder="Site or project"
              />
            </div>

            <div className="full">
              <label className="lb" htmlFor="fNotes">Notes</label>
              <textarea
                className="fld"
                id="fNotes"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional sheet notes"
              />
            </div>
          </div>
        </section>

        {}
        <section className="sec">
          <div className="sec-head">
            <span className="secno">2.</span>
            <h2>Line items</h2>
            <span className="rule"></span>
            <span className="meta">{numItems} items · {numGroups} groups</span>
          </div>

          <div className="itemtools">
            <button className="itbn" onClick={() => setActiveOverlay('columns')}>
              <Icons.Columns /> Columns
            </button>
            <button className="itbn" onClick={() => setActiveOverlay('import')}>
              <Icons.Import /> Import
            </button>
            <button className="itbn hot" onClick={() => setActiveOverlay('markup')}>
              <Icons.Markup /> Markup
            </button>
            <button className="itbn danger" onClick={() => setActiveOverlay('clear')}>
              <Icons.Trash /> Clear all
            </button>
          </div>

          {mkUndoSnap && (
            <div className="mk-undo show">
              <span>Markup applied to {mkLastSummary}. SP values materialized; CP, quantities, and groups untouched.</span>
              <button onClick={handleUndoMarkup}>Undo</button>
            </div>
          )}

          <div id="items">
            {!rows.length ? (
              <div className="empty">No rows yet — add a line item or a group.</div>
            ) : (
              rows.map(r => {
                if (r.type === 'group') {
                  const members = rows.filter(x => x.type === 'item' && x.gid === r.id);
                  const label = `${members.length} item${members.length === 1 ? '' : 's'}`;
                  return (
                    <section className="gwrap" key={r.id}>
                      <header className="ghdr">
                        <button
                          type="button"
                          className="gbtn danger"
                          onClick={() => removeRow(r.id)}
                        >
                          <Icons.X />
                        </button>
                        <input
                          className="gtitle"
                          value={r.title}
                          placeholder="Group title"
                          onChange={e => updateGroupTitle(r.id, e.target.value)}
                        />
                        <span className="gcount">{label}</span>
                      </header>

                      <div className="gbody">
                        {!members.length ? (
                          <div className="gempty">
                            No items in this group yet.<br />
                            Use the button below to add the first one.
                          </div>
                        ) : (
                          members.map(m => (
                            <ItemRowView
                              key={m.id}
                              item={m}
                              siblings={members}
                              rowNumber={rowIndices[m.id] || 0}
                              hasErr={errId === m.id}
                              isColVisible={isColVisible}
                              onUpdate={(key, val) => updateItemField(m.id, key, val)}
                              onRemove={() => removeRow(m.id)}
                              onMove={dir => moveRow(m.id, dir)}
                              onDup={() => dupRow(m.id)}
                              onInsertBelow={() => insertBelow(m.id)}
                              onPhotoClick={() => handlePhotoClick(m.id)}
                              onPhotoRemove={() => updateItemField(m.id, 'image', null)}
                            />
                          ))
                        )}
                      </div>

                      <div className="gfoot">
                        <button type="button" className="gadd" onClick={() => addItem(r.id)}>
                          <Icons.Plus /> Add item to this group
                        </button>
                      </div>
                    </section>
                  );
                }

                if (r.gid == null) {
                  const standaloneSiblings = rows.filter(x => x.type === 'group' || x.gid == null);
                  return (
                    <ItemRowView
                      key={r.id}
                      item={r}
                      siblings={standaloneSiblings}
                      rowNumber={rowIndices[r.id] || 0}
                      hasErr={errId === r.id}
                      isColVisible={isColVisible}
                      onUpdate={(key, val) => updateItemField(r.id, key, val)}
                      onRemove={() => removeRow(r.id)}
                      onMove={dir => moveRow(r.id, dir)}
                      onDup={() => dupRow(r.id)}
                      onInsertBelow={() => insertBelow(r.id)}
                      onPhotoClick={() => handlePhotoClick(r.id)}
                      onPhotoRemove={() => updateItemField(r.id, 'image', null)}
                    />
                  );
                }

                return null;
              })
            )}
          </div>

          <div className="createpair">
            <button type="button" className="cbtn primary" onClick={() => addItem(null)}>
              <Icons.Plus /> Add line item
            </button>
            <button type="button" className="cbtn ghost" onClick={addGroup}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" d="M4 7h16M4 12h10M4 17h7" />
              </svg>
              Add group
            </button>
          </div>
        </section>

        {}
        <section className="sec">
          <div className="sec-head">
            <span className="secno">3.</span>
            <h2>Totals</h2>
            <span className="rule"></span>
            <span className="meta">No VAT &middot; no WHT</span>
          </div>

          <div className="totals">
            <div className="close-top" aria-hidden="true"><i></i></div>
            <div className="close-eyebrow">
              Cost &amp; Pricing Summary <span>{sheetNumber}</span>
            </div>

            <div className="totals-grid">
              <div className="t-lines">
                <div className="sumline">
                  <span>Total cost (CP &times; Qty)</span>
                  <b>{naira(totals.totalCost)}</b>
                </div>
                <div className="sumline">
                  <span>Schedule selling total (SP &times; Qty)</span>
                  <b>{naira(totals.totalSelling)}</b>
                </div>
              </div>

              <div className="sumtotal">
                <div>
                  <small>Gross profit</small>
                  <b id="tProfit" className={totals.grossProfit > 0 ? 'pos' : totals.grossProfit === 0 ? '' : 'neg'}>
                    {naira(totals.grossProfit)}
                  </b>
                </div>
                <div className="right">
                  <small>Margin</small>
                  <b id="tMargin" className={totals.grossProfit > 0 ? 'pos' : totals.grossProfit === 0 ? '' : 'neg'}>
                    {totals.marginPercent}%
                  </b>
                </div>
              </div>
            </div>

            <div className="words">{numberToWords(totals.totalSelling)}</div>
          </div>

          <div className="savebar">
            <button
              type="button"
              className="cbtn primary save-cta"
              onClick={handleSave}
            >
              <Icons.Save /> Save CPS
            </button>
          </div>
        </section>
      </div>

      <button type="button" className="fab" onClick={handleSave}>
        <Icons.Save />
      </button>

      {}

      {/* Columns Modal */}
      <div className={`ov ${activeOverlay === 'columns' ? 'show' : ''}`} onClick={() => setActiveOverlay(null)}>
        <div className="sheet" onClick={e => e.stopPropagation()}>
          <div className="grab"></div>
          <div className="shd">
            <div><b>Column Settings</b><small>Row fields, order, and labels</small></div>
            <button type="button" className="x" onClick={() => setActiveOverlay(null)}><Icons.X /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
            <div className="cm-sec">Description</div>
            <div className="cm-list">
              <div className="cm-row">
                <input
                  className="cm-lab"
                  value={columns.find(c => c.key === 'description')?.label || 'Description'}
                  onChange={e => setColumns(cols => cols.map(c => c.key === 'description' ? { ...c, label: e.target.value } : c))}
                />
                <span className="cm-badge">Fixed</span>
              </div>
            </div>

            <div className="cm-sec">Columns</div>
            <div className="cm-list">
              {columns.filter(c => c.key !== 'description').map((c, idx) => {
                return (
                  <div className="cm-row" key={c.key}>
                    <div className="cm-grip"><Icons.Grip /></div>
                    <div className="cm-main">
                      <div className="cm-labrow">
                        <input
                          className="cm-lab"
                          value={c.label}
                          onChange={e => setColumns(cols => cols.map(x => x.key === c.key ? { ...x, label: e.target.value } : x))}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`cm-sw ${c.visible ? 'on' : ''}`}
                      onClick={() => setColumns(cols => cols.map(x => x.key === c.key ? { ...x, visible: !x.visible } : x))}
                    />
                  </div>
                );
              })}
            </div>
            <button type="button" className="cm-reset" onClick={() => { setColumns(DEFAULT_COLUMNS); setActiveOverlay(null); }}>
              Reset to defaults
            </button>
          </div>
          <button type="button" className="cta" onClick={() => setActiveOverlay(null)}>Done</button>
        </div>
      </div>

      {/* Import Modal */}
      <div className={`ov ${activeOverlay === 'import' ? 'show' : ''}`} onClick={() => setActiveOverlay(null)}>
        <div className="sheet" onClick={e => e.stopPropagation()}>
          <div className="grab"></div>
          <div className="shd">
            <div><b>Import JSON</b><small>Replaces current groups and line items</small></div>
            <button type="button" className="x" onClick={() => setActiveOverlay(null)}><Icons.X /></button>
          </div>
          <textarea
            className="fld mono"
            rows={7}
            style={{ fontSize: '10.5px' }}
            placeholder='{"items":[],"groups":[],"title":"Cost & Pricing Sheet"}'
            value={importJsonText}
            onChange={e => setImportJsonText(e.target.value)}
          />
          {importError && <div className="mk-err show">{importError}</div>}
          <button
            type="button"
            className="cta"
            onClick={() => {
              try {
                const parsed = JSON.parse(importJsonText);
                if (parsed.items) {
                  setRows(parsed.items);
                  setActiveOverlay(null);
                  triggerToast('JSON imported successfully');
                }
              } catch (e) {
                setImportError('Invalid JSON format');
              }
            }}
          >
            Import &amp; replace
          </button>
          <button type="button" className="linkbtn" onClick={() => setActiveOverlay(null)}>Cancel</button>
        </div>
      </div>

      {/* Client Modal */}
      <div className={`ov ${activeOverlay === 'client' ? 'show' : ''}`} onClick={() => setActiveOverlay(null)}>
        <div className="sheet" onClick={e => e.stopPropagation()}>
          <div className="grab"></div>
          <div className="shd">
            <div><b>Select client</b><small>Bill-to party for this sheet</small></div>
            <button type="button" className="x" onClick={() => setActiveOverlay(null)}><Icons.X /></button>
          </div>
          <input
            className="fld"
            placeholder="Search by name or contact..."
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
          />
          <div className="cl-list">
            {filteredClients.map(c => (
              <button
                key={c.id}
                type="button"
                className={`crow ${client?.id === c.id ? 'sel' : ''}`}
                onClick={() => { setClient(c); setActiveOverlay(null); triggerToast(`Client set to ${c.name}`); }}
              >
                <span className="ci">{c.name.charAt(0)}</span>
                <span className="ct">
                  <b>{c.name}</b>
                  <small>{c.person} · {c.phone}</small>
                </span>
                <span className="tick"><Icons.Check /></span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Instant Markup Modal */}
      <div className={`ov ${activeOverlay === 'markup' ? 'show' : ''}`} onClick={() => setActiveOverlay(null)}>
        <div className="sheet" onClick={e => e.stopPropagation()}>
          <div className="grab"></div>
          <div className="shd">
            <div><b>Instant Markup</b><small>Derive SP from CP &middot; preview before apply</small></div>
            <button type="button" className="x" onClick={() => setActiveOverlay(null)}><Icons.X /></button>
          </div>

          {mkStep === 'setup' ? (
            <div>
              <div className="mk-seg">
                <button type="button" className={mkMode === 'pct' ? 'on' : ''} onClick={() => setMkMode('pct')}>
                  <Icons.Markup /> Percentage
                </button>
                <button type="button" className={mkMode === 'val' ? 'on' : ''} onClick={() => setMkMode('val')}>
                  Fixed value
                </button>
              </div>

              <div style={{ marginTop: '10px' }}>
                <label className="lb">Markup value</label>
                <input
                  className="fld mono"
                  value={mkVal}
                  onChange={e => setMkVal(e.target.value)}
                />
              </div>

              <div className="mk-list" style={{ marginTop: '10px' }}>
                {rows.map(r => r.type === 'item' && (
                  <div className="mk-row" key={r.id}>
                    <span className="mk-dot"></span>
                    <span className="t">
                      <b>{r.desc || '(untitled row)'}</b>
                      <small>CP {naira0(r.cp)} · SP now {naira0(r.sp)}</small>
                    </span>
                    <button
                      type="button"
                      className={`mk-tog ${!mkExcl[r.id] ? 'on' : ''}`}
                      onClick={() => setMkExcl(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                    >
                      {!mkExcl[r.id] ? 'Included' : 'Excluded'}
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="cta"
                style={{ marginTop: '10px' }}
                onClick={() => setMkStep('preview')}
              >
                Preview changes
              </button>
            </div>
          ) : (
            <div>
              <div className="mk-note">
                Apply writes the proposed SP onto included rows only.
              </div>
              <button
                type="button"
                className="cta"
                style={{ marginTop: '10px' }}
                onClick={handleMkApply}
              >
                Apply to form
              </button>
              <button type="button" className="linkbtn" onClick={() => setMkStep('setup')}>Back</button>
            </div>
          )}
        </div>
      </div>

      {/* Clear All Confirmation Dialog */}
      <div className={`ov center ${activeOverlay === 'clear' ? 'show' : ''}`} onClick={() => setActiveOverlay(null)}>
        <div className="dialog" onClick={e => e.stopPropagation()}>
          <b>Clear all line items?</b>
          <p>This removes every group and item row from this sheet.</p>
          <div className="acts">
            <button type="button" className="dbtn" onClick={() => setActiveOverlay(null)}>Cancel</button>
            <button type="button" className="dbtn danger" onClick={() => { setRows([]); setActiveOverlay(null); triggerToast('All rows cleared'); }}>Clear all</button>
          </div>
        </div>
      </div>

      <div className={`toast ${toast.visible ? 'show' : ''} ${toast.isErr ? 'err' : ''}`}>
        {toast.msg}
      </div>
    </div>
  );
}

function ItemRowView({
  item,
  siblings,
  rowNumber,
  hasErr,
  isColVisible,
  onUpdate,
  onRemove,
  onMove,
  onDup,
  onInsertBelow,
  onPhotoClick,
  onPhotoRemove
}) {
  const k = siblings.findIndex(x => x.id === item.id);
  const tcp = (item.cp || 0) * (item.qty || 0);
  const tsp = (item.sp || 0) * (item.qty || 0);
  const rowProfit = tsp - tcp;
  const rowMargin = tsp ? (rowProfit / tsp) * 100 : null;

  return (
    <article className={`item ${hasErr ? 'err' : ''} ${item.image ? 'has-photo' : ''}`}>
      <button type="button" className="ear" onClick={onRemove}>
        <Icons.X />
      </button>

      <div className="ihead">
        <div className="rail">
          <span className="idx">{String(rowNumber).padStart(2, '0')}</span>
          <div className="rmid">
            <button type="button" className="rbtn" disabled={k <= 0} onClick={() => onMove(-1)}>
              <Icons.Up />
            </button>
            <button type="button" className="rbtn" disabled={k >= siblings.length - 1} onClick={() => onMove(1)}>
              <Icons.Down />
            </button>
          </div>
          <button type="button" className="rbtn" onClick={onDup}>
            <Icons.Copy />
          </button>
        </div>

        <div className="idesc">
          <textarea
            className="fld desc"
            rows={2}
            placeholder="Item description *"
            value={item.desc}
            onChange={e => onUpdate('desc', e.target.value)}
          />

          <div className={`subrow ${item.sub?.trim() ? 'has' : ''} ${item.subOpen ? 'open' : ''}`}>
            <button
              type="button"
              className={`subtog ${!item.sub?.trim() ? 'sub-add' : ''}`}
              onClick={() => onUpdate('subOpen', !item.subOpen)}
            >
              <span className="stog-icon">
                {item.sub?.trim() ? <Icons.Note /> : <Icons.Plus />}
              </span>
              <span className="stog-label">
                {item.sub?.trim() ? (
                  <span className="sub-prev-text">{item.sub.trim()}</span>
                ) : (
                  'Add sub description'
                )}
              </span>
              <span className="stog-chev"><Icons.Chev /></span>
            </button>

            {item.subOpen && (
              <textarea
                className="fld subfield"
                rows={2}
                placeholder="Sub description — extra detail..."
                value={item.sub}
                onChange={e => onUpdate('sub', e.target.value)}
              />
            )}
          </div>

          {isColVisible('make') && (
            <input
              className="fld"
              placeholder="Make / brand"
              value={item.make}
              onChange={e => onUpdate('make', e.target.value)}
            />
          )}

          {!item.image ? (
            <button type="button" className="cam" onClick={onPhotoClick}>
              <Icons.Cam /> Photo
            </button>
          ) : (
            <span className="foldthumb">
              <img src={item.image} alt="Attachment" />
              <button type="button" className="px" onClick={onPhotoRemove}>
                <Icons.X />
              </button>
            </span>
          )}
        </div>
      </div>

      <div className="idata">
        <div className="fgrid">
          {isColVisible('quantity') && (
            <input
              className="fld mono"
              placeholder="Qty *"
              value={item.qty || ''}
              onChange={e => onUpdate('qty', Number(e.target.value.replace(/,/g, '')) || 0)}
            />
          )}
          {isColVisible('unit') && (
            <input
              className="fld"
              placeholder="Unit"
              value={item.unit}
              onChange={e => onUpdate('unit', e.target.value)}
            />
          )}
        </div>

        <div className="comm-grid">
          {isColVisible('cp') && (
            <label className="cfield cost">
              <span className="cf-lab"><Icons.Out /> CP</span>
              <input
                className="fld mono"
                value={item.cp || ''}
                onChange={e => onUpdate('cp', Number(e.target.value.replace(/,/g, '')) || 0)}
              />
            </label>
          )}

          {isColVisible('sp') && (
            <label className="cfield sell">
              <span className="cf-lab"><Icons.Inn /> SP</span>
              <input
                className="fld mono"
                value={item.sp || ''}
                onChange={e => onUpdate('sp', Number(e.target.value.replace(/,/g, '')) || 0)}
              />
            </label>
          )}
        </div>

        <div className="fin3">
          <div className="fcell tcp">
            <small>Total cost · TCP</small>
            <b>{naira(tcp)}</b>
          </div>
          <div className="fcell tsp">
            <small>Total selling · TSP</small>
            <b>{naira(tsp)}</b>
          </div>
          <div className={`fcell pf ${rowProfit > 0 ? 'pos' : rowProfit === 0 ? '' : 'neg'}`}>
            <small>Profit</small>
            <b>{naira(rowProfit)}</b>
          </div>
        </div>

        <div className="finm">
          Margin {rowMargin === null ? '—' : rowMargin.toFixed(1) + '%'} on TSP &middot; {item.qty} &times; {naira(item.sp - item.cp)} /unit
        </div>
      </div>

      <button type="button" className="ins" onClick={onInsertBelow}>+ Insert below</button>
    </article>
  );
}