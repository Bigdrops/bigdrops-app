```react
import React, { useState, useRef, useEffect } from 'react';

// --- Vector Icons (Lucide-style, 1.9 stroke width, theme-compliant) ---
const Icons = {
  Back: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  Close: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Add: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Up: () => (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ),
  Down: () => (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  ChevronUp: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ),
  Search: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Save: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
  Camera: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Draw: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  Person: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  EyeOff: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
    </svg>
  ),
  Import: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
};

// --- BIGDROPS Mock Databases ---
const CLIENTS_DB = [
  { id: 'c1', name: 'Acme Corp Plc', sub: 'Lagos Island Port Depot, Lagos' },
  { id: 'c2', name: 'Beta Industrial Solutions', sub: 'Trans-Amadi Layout, Port Harcourt' },
  { id: 'c3', name: 'Zenith Telecom Services', sub: 'Central Business District, Abuja' },
  { id: 'c4', name: 'Sterling Pharma Logistics', sub: 'Ikeja Cargo Terminal, Lagos' }
];

const INVOICES_DB = [
  { id: 'inv1', number: 'INV-2026-0042', client: 'Acme Corp Plc', po: 'PO-NG-9921' },
  { id: 'inv2', number: 'INV-2026-0043', client: 'Acme Corp Plc', po: 'PO-NG-9924' },
  { id: 'inv3', number: 'INV-2026-0088', client: 'Beta Industrial Solutions', po: 'PO-PH-1044' }
];

const SIGNATORIES_DB = [
  { id: 's1', name: 'Babatunde Adeleke', role: 'Head of Fleet & Dispatch' },
  { id: 's2', name: 'Ngozi Okonjo', role: 'Senior Warehouse Officer' },
  { id: 's3', name: 'Emeka Nwosu', role: 'Logistics Supervisor' }
];

export default function App() {
  // Document State
  const [docType, setDocType] = useState(null); // 'external' | 'internal' | null
  const [waybillNo, setWaybillNo] = useState('WB-004821');
  const [poNumber, setPoNumber] = useState('');
  const [date, setDate] = useState('2026-09-02');
  const [time, setTime] = useState('09:30');
  const [client, setClient] = useState(null);
  const [linkedInvoice, setLinkedInvoice] = useState(null);

  // Transport Details
  const [transportMode, setTransportMode] = useState('By Vehicle');
  const [purpose, setPurpose] = useState('Supply');
  const [plate, setPlate] = useState('LAG-842-XY');
  const [driverName, setDriverName] = useState('');

  // Custody Details
  const [deliveredBy, setDeliveredBy] = useState('Babatunde Adeleke');
  const [receivedBy, setReceivedBy] = useState('');
  const [location, setLocation] = useState('');

  // Table Column Manager State
  const [columns, setColumns] = useState({ make: false, partNo: false, condition: true });
  const [customColumns, setCustomColumns] = useState([]);

  // Line Items
  const [items, setItems] = useState([
    {
      id: 'item-1',
      description: 'Industrial Heavy-Duty Air Filter Replacement (Pack of 4)',
      quantity: 12,
      unit: 'Units',
      make: '',
      partNo: '',
      condition: 'good',
      custom_data: {}
    },
    {
      id: 'item-2',
      description: 'Synthetic Compressor Oil 15W-40 (20L Drum)',
      quantity: 5,
      unit: 'Drums',
      make: '',
      partNo: '',
      condition: 'good',
      custom_data: {}
    }
  ]);

  // Signatures
  const [signatures, setSignatures] = useState({
    sender: { captured: false, url: null, visible: true, name: 'Babatunde Adeleke' },
    receiver: { captured: false, url: null, visible: true, name: '' }
  });

  // Notes & Terms
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesTitle, setNotesTitle] = useState('Special Handling & Notes');
  const [notesText, setNotesText] = useState('Security seals intact on dispatch. Handled under dry cargo conditions.');
  const [termsOpen, setTermsOpen] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsText, setTermsText] = useState('1. Title and risk of goods pass to consignee upon physical receipt.\n2. Discrepancies must be endorsed on this delivery note within 24 hours of arrival.');

  // Sheets and Overlays
  const [clientOverlay, setClientOverlay] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [invoiceOverlay, setInvoiceOverlay] = useState(false);
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [importOverlay, setImportOverlay] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [moreSettingsOpen, setMoreSettingsOpen] = useState(false);
  const [signatorySheetRole, setSignatorySheetRole] = useState(null);
  const [activeDrawRole, setActiveDrawRole] = useState(null);
  const [clearAlertOpen, setClearAlertOpen] = useState(false);
  const [invalidRowId, setInvalidRowId] = useState(null);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);

  const fileInputRef = useRef(null);
  const activeUploadRoleRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(prev => (prev === msg ? null : prev)), 2600);
  };

  const handleSelectGatewayType = (type) => {
    setDocType(type);
    if (type === 'external') {
      setWaybillNo('WB-E-004821');
      setPurpose('Supply');
      setLocation(client ? client.sub : '');
    } else {
      setWaybillNo('WB-I-004821');
      setPurpose('Transfer');
      setLocation('Depot Transit Route');
    }
  };

  const createDefaultItem = (idx = items.length + 1) => ({
    id: `item-${Date.now()}-${idx}`,
    description: '',
    quantity: 1,
    unit: 'Units',
    make: '',
    partNo: '',
    condition: 'good',
    custom_data: {}
  });

  const addItem = (afterIdx = null) => {
    const newItem = createDefaultItem();
    if (afterIdx === null) {
      setItems([...items, newItem]);
    } else {
      const copy = [...items];
      copy.splice(afterIdx + 1, 0, newItem);
      setItems(copy);
    }
    showToast('Row added');
  };

  const updateItem = (index, field, value) => {
    const copy = [...items];
    copy[index][field] = value;
    setItems(copy);
  };

  const updateItemCustomData = (index, key, value) => {
    const copy = [...items];
    copy[index].custom_data = { ...copy[index].custom_data, [key]: value };
    setItems(copy);
  };

  const removeItem = (index) => {
    if (items.length <= 1) {
      setItems([createDefaultItem(1)]);
      showToast('Item reset to blank');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const duplicateItem = (index) => {
    const clone = {
      ...items[index],
      id: `item-${Date.now()}`,
      custom_data: { ...items[index].custom_data }
    };
    const copy = [...items];
    copy.splice(index + 1, 0, clone);
    setItems(copy);
    showToast('Item duplicated');
  };

  const moveItem = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const copy = [...items];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setItems(copy);
  };

  const handleClearAll = () => {
    setItems([createDefaultItem(1)]);
    setClearAlertOpen(false);
    showToast('All items cleared');
  };

  const handleTriggerUpload = (role) => {
    activeUploadRoleRef.current = role;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    const role = activeUploadRoleRef.current;
    if (file && role) {
      const reader = new FileReader();
      reader.onload = () => {
        setSignatures(prev => ({
          ...prev,
          [role]: { ...prev[role], captured: true, url: reader.result }
        }));
        showToast('Signature attached');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePickSignatory = (person) => {
    if (!signatorySheetRole) return;
    const canvas = document.createElement('canvas');
    canvas.width = 260;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 15px Manrope, sans-serif';
    ctx.fillStyle = '#1e3a5f';
    ctx.fillText(person.name, 12, 36);
    ctx.font = '10px "DM Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(person.role.toUpperCase(), 12, 56);

    setSignatures(prev => ({
      ...prev,
      [signatorySheetRole]: {
        ...prev[signatorySheetRole],
        captured: true,
        url: canvas.toDataURL('image/png'),
        name: person.name
      }
    }));
    setSignatorySheetRole(null);
    showToast(`Assigned ${person.name}`);
  };

  useEffect(() => {
    if (!activeDrawRole || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#1e3a5f';
  }, [activeDrawRole]);

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - rect.left, y: cy - rect.top };
  };

  const startDraw = (e) => {
    isDrawing.current = true;
    lastPos.current = getCanvasPos(e);
  };

  const moveDraw = (e) => {
    if (!isDrawing.current || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const resetCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const saveDrawing = () => {
    if (!canvasRef.current || !activeDrawRole) return;
    const url = canvasRef.current.toDataURL('image/png');
    setSignatures(prev => ({
      ...prev,
      [activeDrawRole]: { ...prev[activeDrawRole], captured: true, url }
    }));
    setActiveDrawRole(null);
    showToast('Signature drawing saved');
  };

  const handleSave = (statusLabel = 'dispatched') => {
    if (!waybillNo.trim()) {
      showToast('Waybill number is missing or invalid.');
      return;
    }
    if (docType === 'external' && !client) {
      showToast('Client account must be selected for external waybills.');
      return;
    }
    if (docType === 'internal' && !receivedBy.trim()) {
      showToast('Recipient name is required for internal waybills.');
      return;
    }
    if (!date) {
      showToast('Date is required.');
      return;
    }
    if (items.length === 0) {
      showToast('Line items list cannot be empty.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].description.trim() || Number(items[i].quantity) <= 0) {
        setInvalidRowId(items[i].id);
        setTimeout(() => setInvalidRowId(null), 2500);
        showToast(`Item ${i + 1} is missing a description or has quantity ≤ 0.`);
        return;
      }
    }

    showToast(`Waybill ${waybillNo} saved (${statusLabel})!`);
  };

  const handleApplyImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      if (parsed.items && Array.isArray(parsed.items)) {
        setItems(parsed.items.map((it, idx) => ({ ...createDefaultItem(idx), ...it })));
      }
      if (parsed.waybillNo) setWaybillNo(parsed.waybillNo);
      if (parsed.driverName) setDriverName(parsed.driverName);
      if (parsed.plate) setPlate(parsed.plate);
      if (parsed.location) setLocation(parsed.location);
      setImportOverlay(false);
      showToast('Waybill payload imported');
    } catch {
      showToast('Import Failed: Invalid JSON schema');
    }
  };

  // ==========================================
  // GATEWAY DIALOG (BIGDROPS Light Theme)
  // ==========================================
  if (docType === null) {
    return (
      <div className="min-h-screen bg-[#0f172a]/80 backdrop-blur-xs flex items-center justify-center p-3 font-sans selection:bg-[#e2e8f0]">
        <div
          className="w-full max-w-sm bg-white rounded-[18px] p-4 shadow-[0_18px_40px_rgba(30,58,95,0.18)] border border-[rgba(15,23,42,0.08)] space-y-3.5"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          <div>
            <span className="text-[7px] font-extrabold uppercase tracking-[0.075em] text-[#94a3b8] block">
              Document Gateway
            </span>
            <h1 className="text-[17px] font-extrabold text-[#0f172a] tracking-[-0.05em] mt-0.5">
              New Waybill
            </h1>
            <p className="text-[9px] text-[#475569] mt-0.5 leading-tight">
              Select movement category to initialize
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleSelectGatewayType('external')}
              className="w-full p-3 rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] hover:bg-white hover:border-[#1e3a5f] text-left transition active:scale-[0.965]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[6px] font-extrabold uppercase tracking-[0.07em] text-[#1e3a5f] bg-[rgba(30,58,95,0.14)] px-1.5 py-0.5 rounded-[5px]">
                  Type 01 / Outbound
                </span>
                <span className="text-[#94a3b8]"><Icons.ChevronRight /></span>
              </div>
              <p className="text-[11px] font-extrabold text-[#0f172a] mt-1 tracking-[-0.025em]">
                External Delivery Note
              </p>
              <p className="text-[8px] text-[#475569] mt-0.5 leading-snug">
                Client deliveries, vendor dispatches, and billed invoice linking.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectGatewayType('internal')}
              className="w-full p-3 rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] hover:bg-white hover:border-[#1e3a5f] text-left transition active:scale-[0.965]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[6px] font-extrabold uppercase tracking-[0.07em] text-[#0f172a] bg-[#e2e8f0] px-1.5 py-0.5 rounded-[5px]">
                  Type 02 / Internal
                </span>
                <span className="text-[#94a3b8]"><Icons.ChevronRight /></span>
              </div>
              <p className="text-[11px] font-extrabold text-[#0f172a] mt-1 tracking-[-0.025em]">
                Internal Transfer Note
              </p>
              <p className="text-[8px] text-[#475569] mt-0.5 leading-snug">
                Inter-depot stock transit, workshop replenishment, and site movement.
              </p>
            </button>
          </div>

          <div className="flex items-center gap-2 py-0.5">
            <div className="flex-1 h-px bg-[rgba(15,23,42,0.07)]"></div>
            <span className="text-[7px] font-mono font-bold uppercase tracking-[0.075em] text-[#94a3b8]">or download blank</span>
            <div className="flex-1 h-px bg-[rgba(15,23,42,0.07)]"></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => showToast('Blank External PDF generated')}
              className="p-2 rounded-[10px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] hover:bg-white text-left active:scale-[0.965] transition"
            >
              <span className="text-[6px] font-mono font-bold uppercase text-[#94a3b8] block">Blank Template</span>
              <span className="text-[9px] font-extrabold text-[#0f172a]">External (PDF)</span>
            </button>
            <button
              type="button"
              onClick={() => showToast('Blank Internal PDF generated')}
              className="p-2 rounded-[10px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] hover:bg-white text-left active:scale-[0.965] transition"
            >
              <span className="text-[6px] font-mono font-bold uppercase text-[#94a3b8] block">Blank Template</span>
              <span className="text-[9px] font-extrabold text-[#0f172a]">Internal (PDF)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // BIGDROPS LIVE FORM (Authoritative Design System)
  // ==========================================
  return (
    <div
      className="min-h-screen bg-[#f0f4f8] text-[#0f172a] antialiased selection:bg-[#e2e8f0]"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {/* Hidden File Input for Native Camera Snap / Gallery Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* NATURAL SCROLL CONTAINER (Compact Spacing: 14px Margins) */}
      <div className="max-w-[430px] mx-auto px-[14px] pt-3 pb-[106px] space-y-[12px]">

        {/* Top Operational Bar (Scrolls with page) */}
        <div className="flex items-center justify-between pb-0.5">
          <button
            type="button"
            onClick={() => setDocType(null)}
            className="flex items-center gap-1 text-[#475569] hover:text-[#0f172a] text-[10px] font-extrabold active:scale-[0.965] transition"
          >
            <Icons.Back />
            <span>Switch Type</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave('draft')}
              className="px-2.5 py-1 rounded-[10px] bg-[#e2e8f0] text-[#0f172a] text-[8px] font-extrabold uppercase tracking-[0.065em] hover:bg-[#cbd5e1] active:scale-[0.965] transition"
            >
              Draft
            </button>
            <span className="text-[8px] font-mono font-semibold text-[#94a3b8] uppercase tracking-[0.07em]">
              {docType === 'external' ? 'Type 01: Outbound' : 'Type 02: Internal'}
            </span>
          </div>
        </div>

        {/* --- 1. WAYBILL HEADER --- */}
        <section className="bg-white rounded-[18px] border border-[rgba(15,23,42,0.07)] p-[12px] space-y-[10px] shadow-[0_12px_28px_rgba(30,58,95,0.08),0_2px_6px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]"></span>
              <h2 className="text-[9px] font-extrabold uppercase tracking-[0.105em] text-[#0f172a]">
                1. Waybill Header
              </h2>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded-[5px] text-[6px] font-extrabold uppercase tracking-[0.07em] ${
                docType === 'external'
                  ? 'bg-[rgba(30,58,95,0.14)] text-[#1e3a5f]'
                  : 'bg-[rgba(15,23,42,0.13)] text-[#0f172a]'
              }`}
            >
              {docType === 'external' ? 'EXTERNAL DELIVERY NOTE' : 'INTERNAL TRANSFER NOTE'}
            </span>
          </div>

          {/* Client Selector (External Only) */}
          {docType === 'external' && (
            <div>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                Client Account <span className="text-[#ef4444]">*</span>
              </label>
              <button
                type="button"
                onClick={() => setClientOverlay(true)}
                className="w-full flex items-center justify-between p-2.5 rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] hover:bg-white text-left transition active:scale-[0.965]"
              >
                <div className="truncate pr-2">
                  <div className="text-[11px] font-extrabold text-[#0f172a] truncate tracking-[-0.025em]">
                    {client ? client.name : 'Select a client'}
                  </div>
                  <div className="text-[8px] text-[#475569] truncate mt-0.5">
                    {client ? client.sub : 'Tap to search client registry'}
                  </div>
                </div>
                <div className="text-[#94a3b8]"><Icons.ChevronRight /></div>
              </button>
            </div>
          )}

          {/* Number & PO */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                WAYBILL NO
              </label>
              <input
                type="text"
                value={waybillNo}
                onChange={(e) => setWaybillNo(e.target.value)}
                className="w-full h-[40px] px-2.5 rounded-[12px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] font-mono font-medium text-[11px] text-[#0f172a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                style={{ fontFamily: '"DM Mono", monospace' }}
              />
            </div>
            {docType === 'external' && (
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                  P.O. NUMBER
                </label>
                <input
                  type="text"
                  placeholder="PO #"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full h-[40px] px-2.5 rounded-[12px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] text-[11px] font-semibold text-[#0f172a] placeholder:text-[#94a3b8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                DATE
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-[40px] px-2.5 rounded-[12px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] text-[11px] font-medium text-[#0f172a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                style={{ fontFamily: '"DM Mono", monospace' }}
              />
            </div>
            <div>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                TIME
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-[40px] px-2.5 rounded-[12px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] text-[11px] font-medium text-[#0f172a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                style={{ fontFamily: '"DM Mono", monospace' }}
              />
            </div>
          </div>

          {/* Linked Invoice (External Only) */}
          {docType === 'external' && (
            <div className="pt-1 border-t border-[rgba(15,23,42,0.07)]">
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                LINKED INVOICE
              </label>
              {linkedInvoice ? (
                <div className="flex items-center justify-between p-2 rounded-[12px] border border-[rgba(30,58,95,0.2)] bg-[rgba(30,58,95,0.04)]">
                  <div className="truncate">
                    <span
                      className="font-mono font-medium text-[10px] text-[#1e3a5f] block"
                      style={{ fontFamily: '"DM Mono", monospace' }}
                    >
                      {linkedInvoice.number}
                    </span>
                    <span className="text-[8px] text-[#475569] truncate block">
                      {linkedInvoice.client} • {linkedInvoice.po}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLinkedInvoice(null);
                      showToast('Invoice unlinked');
                    }}
                    className="w-6 h-6 rounded-[50%] bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#475569] hover:text-[#ef4444] flex items-center justify-center active:scale-[0.965] transition"
                  >
                    <Icons.Close />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!client}
                  onClick={() => setInvoiceOverlay(true)}
                  className={`w-full py-2 px-2.5 rounded-[12px] border border-dashed text-left flex items-center justify-between transition ${
                    client
                      ? 'border-[rgba(15,23,42,0.14)] hover:border-[#1e3a5f] bg-[#f8fafc] hover:bg-white text-[#0f172a] cursor-pointer active:scale-[0.965]'
                      : 'border-[rgba(15,23,42,0.08)] text-[#94a3b8] bg-[#f8fafc] cursor-not-allowed opacity-40'
                  }`}
                >
                  <span className="text-[9px] font-bold">
                    {client ? 'Tap to link invoice on record' : 'Select client account first'}
                  </span>
                  <Icons.ChevronRight />
                </button>
              )}
            </div>
          )}
        </section>

        {/* --- 2. TRANSPORT DETAILS --- */}
        <section className="bg-white rounded-[18px] border border-[rgba(15,23,42,0.07)] p-[12px] space-y-[10px] shadow-[0_12px_28px_rgba(30,58,95,0.08),0_2px_6px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#64748b]"></span>
            <h2 className="text-[9px] font-extrabold uppercase tracking-[0.105em] text-[#0f172a]">
              2. Transport Details
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                Transport Mode
              </label>
              <select
                value={transportMode}
                onChange={(e) => {
                  setTransportMode(e.target.value);
                  if (e.target.value === 'By Hand' || e.target.value === 'Courier') {
                    setPlate('');
                  }
                }}
                className="w-full h-[40px] px-2.5 rounded-[12px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] font-semibold text-[11px] text-[#0f172a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              >
                <option value="By Vehicle">By Vehicle</option>
                <option value="By Hand">By Hand</option>
                <option value="Courier">Courier</option>
                <option value="Blank">Blank</option>
              </select>
            </div>
            <div>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                Purpose
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full h-[40px] px-2.5 rounded-[12px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] font-semibold text-[11px] text-[#0f172a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              >
                <option value="">Blank</option>
                {docType === 'external' ? (
                  <>
                    <option value="Supply">Supply</option>
                    <option value="Return">Return</option>
                    <option value="Repair">Repair</option>
                    <option value="Other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="Transfer">Transfer</option>
                    <option value="Repair">Repair</option>
                    <option value="Other">Other</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {transportMode !== 'By Hand' && transportMode !== 'Courier' && (
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                  Vehicle Plate
                </label>
                <input
                  type="text"
                  placeholder="LAG-000-XX"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  className="w-full h-[40px] px-2.5 rounded-[12px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] font-mono font-medium text-[11px] text-[#0f172a] uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  style={{ fontFamily: '"DM Mono", monospace' }}
                />
              </div>
            )}
            <div className={transportMode === 'By Hand' || transportMode === 'Courier' ? 'col-span-2' : ''}>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                Driver Legal Name
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Driver full name"
                className="w-full h-[40px] px-2.5 rounded-[12px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] font-semibold text-[11px] text-[#0f172a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
          </div>
        </section>

        {/* --- 3. LINE ITEMS (EXPOSED STRIP & HANGING EAR DELETE) --- */}
        <section className="bg-white rounded-[18px] border border-[rgba(15,23,42,0.07)] p-[12px] space-y-[10px] shadow-[0_12px_28px_rgba(30,58,95,0.08),0_2px_6px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></span>
              <h2 className="text-[9px] font-extrabold uppercase tracking-[0.105em] text-[#0f172a]">
                3. Line Items
              </h2>
            </div>
            <span
              className="font-mono text-[8px] font-medium text-[#94a3b8]"
              style={{ fontFamily: '"DM Mono", monospace' }}
            >
              {items.length} {items.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {/* EXPOSED COMPACT TOOLBAR */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5 pb-1 border-b border-[rgba(15,23,42,0.07)]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setImportOverlay(true)}
                className="h-[28px] px-2.5 rounded-[10px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] text-[#0f172a] text-[8px] font-extrabold uppercase tracking-[0.065em] hover:bg-[#e2e8f0] flex items-center gap-1 active:scale-[0.965] transition"
              >
                <Icons.Import /> Import
              </button>
              <button
                type="button"
                onClick={() => setColumnManagerOpen(true)}
                className="h-[28px] px-2.5 rounded-[10px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] text-[#0f172a] text-[8px] font-extrabold uppercase tracking-[0.065em] hover:bg-[#e2e8f0] flex items-center gap-1 active:scale-[0.965] transition"
              >
                <Icons.Settings /> Columns
              </button>
            </div>

            <button
              type="button"
              onClick={() => setClearAlertOpen(true)}
              className="h-[28px] px-2 rounded-[10px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] text-[#ef4444] text-[8px] font-extrabold uppercase tracking-[0.065em] hover:bg-[rgba(239,68,68,0.16)] flex items-center gap-1 active:scale-[0.965] transition"
            >
              <Icons.Close /> Clear All
            </button>
          </div>

          {/* ITEM CARDS */}
          <div className="space-y-[10px] pt-1">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`p-2.5 rounded-[16px] border bg-[#ffffff] relative transition ${
                  invalidRowId === item.id
                    ? 'border-[#ef4444] ring-2 ring-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.02)]'
                    : 'border-[rgba(15,23,42,0.09)]'
                }`}
              >
                {/* ZERO-SPACE HANGING 'X' EAR BUTTON */}
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-[50%] bg-[#0f172a] hover:bg-[#ef4444] text-white shadow-md flex items-center justify-center active:scale-[0.90] transition z-20 border-2 border-white"
                  title="Remove Item"
                >
                  <Icons.Close />
                </button>

                <div className="flex gap-2 items-start">
                  
                  {/* LHS ENUMERATION COLUMN: INDEX + COMPACT REORDER & DUPLICATE STACK */}
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
                    <span
                      className="w-5 h-5 rounded-[6px] bg-[#e2e8f0] text-[#0f172a] font-mono font-bold text-[9px] flex items-center justify-center"
                      style={{ fontFamily: '"DM Mono", monospace' }}
                    >
                      {idx + 1}
                    </span>

                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, -1)}
                        className="w-5 h-5 rounded-[6px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] flex items-center justify-center text-[#475569] disabled:opacity-30 active:scale-[0.90]"
                        title="Move Up"
                      >
                        <Icons.Up />
                      </button>
                      <button
                        type="button"
                        disabled={idx === items.length - 1}
                        onClick={() => moveItem(idx, 1)}
                        className="w-5 h-5 rounded-[6px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] flex items-center justify-center text-[#475569] disabled:opacity-30 active:scale-[0.90]"
                        title="Move Down"
                      >
                        <Icons.Down />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateItem(idx)}
                        className="w-5 h-5 rounded-[6px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc] flex items-center justify-center text-[#475569] active:scale-[0.90]"
                        title="Duplicate"
                      >
                        <Icons.Copy />
                      </button>
                    </div>
                  </div>

                  {/* ITEM INPUTS AREA */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <textarea
                      rows={2}
                      placeholder="Item description / specification... *"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="w-full p-2 text-[10px] font-bold text-[#0f172a] rounded-[10px] border border-[rgba(15,23,42,0.12)] bg-[#f8fafc] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] resize-none"
                    />

                    {/* Numeric Quantity + Unit */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty *"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full h-[36px] px-1 text-center font-mono font-medium text-[11px] text-[#0f172a] rounded-[10px] border border-[rgba(15,23,42,0.12)] bg-[#f8fafc] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                          style={{ fontFamily: '"DM Mono", monospace' }}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Unit"
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          className="w-full h-[36px] px-1 text-center font-semibold text-[10px] text-[#0f172a] rounded-[10px] border border-[rgba(15,23,42,0.12)] bg-[#f8fafc] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                        />
                      </div>
                      {columns.condition ? (
                        <div>
                          <select
                            value={item.condition}
                            onChange={(e) => updateItem(idx, 'condition', e.target.value)}
                            className="w-full h-[36px] px-1 font-semibold text-[9px] text-[#0f172a] rounded-[10px] border border-[rgba(15,23,42,0.12)] bg-[#f8fafc] focus:bg-white focus:outline-none"
                          >
                            <option value="good">Good</option>
                            <option value="damaged">Damaged</option>
                            <option value="partial">Partial</option>
                          </select>
                        </div>
                      ) : (
                        <div
                          className="text-[8px] text-[#94a3b8] flex items-center justify-center font-mono"
                          style={{ fontFamily: '"DM Mono", monospace' }}
                        >
                          Standard
                        </div>
                      )}
                    </div>

                    {/* Make & Part No */}
                    {(columns.make || columns.partNo) && (
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        {columns.make && (
                          <input
                            type="text"
                            placeholder="Make / Brand"
                            value={item.make}
                            onChange={(e) => updateItem(idx, 'make', e.target.value)}
                            className="w-full h-[36px] px-2 text-[10px] rounded-[10px] border border-[rgba(15,23,42,0.12)] bg-[#f8fafc] focus:bg-white focus:outline-none"
                          />
                        )}
                        {columns.partNo && (
                          <input
                            type="text"
                            placeholder="Part No"
                            value={item.partNo}
                            onChange={(e) => updateItem(idx, 'partNo', e.target.value)}
                            className="w-full h-[36px] px-2 text-[10px] font-mono rounded-[10px] border border-[rgba(15,23,42,0.12)] bg-[#f8fafc] focus:bg-white focus:outline-none"
                            style={{ fontFamily: '"DM Mono", monospace' }}
                          />
                        )}
                      </div>
                    )}

                    {/* Custom Columns */}
                    {customColumns.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        {customColumns.map(col => (
                          <input
                            key={col.key}
                            type="text"
                            placeholder={col.label}
                            value={item.custom_data?.[col.key] || ''}
                            onChange={(e) => updateItemCustomData(idx, col.key, e.target.value)}
                            className="w-full h-[36px] px-2 text-[10px] rounded-[10px] border border-[rgba(15,23,42,0.12)] bg-[#f8fafc] focus:bg-white focus:outline-none"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Insert Below Link */}
                <div className="pl-7 pt-1">
                  <button
                    type="button"
                    onClick={() => addItem(idx)}
                    className="text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] hover:text-[#1e3a5f] transition active:scale-[0.965]"
                  >
                    + Insert below
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addItem()}
            className="w-full h-[38px] rounded-[10px] border border-dashed border-[rgba(15,23,42,0.14)] hover:border-[#1e3a5f] hover:bg-[#f8fafc] text-[#0f172a] font-extrabold text-[8px] uppercase tracking-[0.065em] flex items-center justify-center gap-1.5 transition active:scale-[0.965]"
          >
            <Icons.Add /> Add line item
          </button>
        </section>

        {/* --- 4. CUSTODY DETAILS --- */}
        <section className="bg-white rounded-[18px] border border-[rgba(15,23,42,0.07)] p-[12px] space-y-[10px] shadow-[0_12px_28px_rgba(30,58,95,0.08),0_2px_6px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]"></span>
            <h2 className="text-[9px] font-extrabold uppercase tracking-[0.105em] text-[#0f172a]">
              4. Custody Details
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                DELIVERED BY
              </label>
              <input
                type="text"
                value={deliveredBy}
                onChange={(e) => setDeliveredBy(e.target.value)}
                placeholder="Sender officer"
                className="w-full h-[40px] px-2.5 rounded-[12px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] font-semibold text-[11px] text-[#0f172a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                RECEIVED BY {docType === 'internal' && <span className="text-[#ef4444]">*</span>}
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Recipient name"
                className="w-full h-[40px] px-2.5 rounded-[12px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] font-semibold text-[11px] text-[#0f172a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
              {docType === 'external' ? 'DELIVERY LOCATION' : 'MOVEMENT ROUTE / DESTINATION'}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={
                docType === 'external'
                  ? 'Client site, address, or terminal drop-off'
                  : 'Where items are moving within operations'
              }
              className="w-full h-[40px] px-2.5 rounded-[12px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] font-semibold text-[11px] text-[#0f172a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        </section>

        {/* --- 5. SIGNATURES (MOBILE-FIRST PICK & CAMERA) --- */}
        <section className="bg-white rounded-[18px] border border-[rgba(15,23,42,0.07)] p-[12px] space-y-[10px] shadow-[0_12px_28px_rgba(30,58,95,0.08),0_2px_6px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"></span>
              <h2 className="text-[9px] font-extrabold uppercase tracking-[0.105em] text-[#0f172a]">
                5. Signatures
              </h2>
            </div>
            <span
              className="text-[8px] font-mono font-medium text-[#94a3b8]"
              style={{ fontFamily: '"DM Mono", monospace' }}
            >
              {(signatures.sender.captured ? 1 : 0) + (signatures.receiver.captured ? 1 : 0)} of 2 captured
            </span>
          </div>

          {/* Delivered By Signature Card */}
          <div className="border border-[rgba(15,23,42,0.08)] rounded-[14px] overflow-hidden bg-[#f8fafc]">
            <div className="p-2.5 border-b border-[rgba(15,23,42,0.07)] flex items-center justify-between bg-white">
              <span className="font-extrabold text-[10px] text-[#0f172a]">Delivered By (Sender)</span>
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded-[5px] text-[6px] font-extrabold uppercase tracking-[0.07em] ${
                    signatures.sender.captured
                      ? 'bg-[rgba(22,163,74,0.12)] text-[#16a34a]'
                      : 'bg-[#e2e8f0] text-[#94a3b8]'
                  }`}
                >
                  {signatures.sender.captured ? 'Captured' : 'Empty'}
                </span>
                <button
                  type="button"
                  onClick={() => setSignatures(prev => ({
                    ...prev,
                    sender: { ...prev.sender, visible: !prev.sender.visible }
                  }))}
                  className="p-0.5 text-[#94a3b8] hover:text-[#0f172a]"
                >
                  {signatures.sender.visible ? <Icons.Eye /> : <Icons.EyeOff />}
                </button>
              </div>
            </div>

            {signatures.sender.visible && (
              <div className="p-2.5 space-y-2">
                {signatures.sender.captured && signatures.sender.url ? (
                  <div className="h-16 rounded-[10px] border border-[rgba(15,23,42,0.08)] bg-white flex items-center justify-center p-1.5 relative">
                    <img src={signatures.sender.url} alt="Sender Sign" className="max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setSignatures(prev => ({
                        ...prev,
                        sender: { ...prev.sender, captured: false, url: null }
                      }))}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-[50%] bg-[#e2e8f0] hover:bg-[#ef4444] text-[#475569] hover:text-white flex items-center justify-center active:scale-[0.965] transition"
                    >
                      <Icons.Close />
                    </button>
                  </div>
                ) : (
                  <div className="h-12 rounded-[10px] border border-dashed border-[rgba(15,23,42,0.14)] bg-white flex items-center justify-center text-[9px] text-[#94a3b8] font-semibold">
                    No signature attached
                  </div>
                )}

                {/* Primary Mobile Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSignatorySheetRole('sender')}
                    className="flex-1 h-[34px] px-2.5 rounded-[10px] text-white font-extrabold text-[8px] uppercase tracking-[0.065em] flex items-center justify-center gap-1 active:scale-[0.965] transition shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)' }}
                  >
                    <Icons.Person /> Pick Saved
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerUpload('sender')}
                    className="flex-1 h-[34px] px-2.5 rounded-[10px] border border-[rgba(15,23,42,0.14)] bg-white text-[#0f172a] font-extrabold text-[8px] uppercase tracking-[0.065em] hover:bg-[#f8fafc] flex items-center justify-center gap-1 active:scale-[0.965] transition"
                  >
                    <Icons.Camera /> Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDrawRole('sender')}
                    className="w-[34px] h-[34px] rounded-[10px] border border-[rgba(15,23,42,0.14)] bg-white text-[#94a3b8] hover:text-[#0f172a] flex items-center justify-center active:scale-[0.965] transition flex-shrink-0"
                    title="Manual Canvas Draw"
                  >
                    <Icons.Draw />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Collected By Signature Card */}
          <div className="border border-[rgba(15,23,42,0.08)] rounded-[14px] overflow-hidden bg-[#f8fafc]">
            <div className="p-2.5 border-b border-[rgba(15,23,42,0.07)] flex items-center justify-between bg-white">
              <span className="font-extrabold text-[10px] text-[#0f172a]">Collected By (Receiver)</span>
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded-[5px] text-[6px] font-extrabold uppercase tracking-[0.07em] ${
                    signatures.receiver.captured
                      ? 'bg-[rgba(22,163,74,0.12)] text-[#16a34a]'
                      : 'bg-[#e2e8f0] text-[#94a3b8]'
                  }`}
                >
                  {signatures.receiver.captured ? 'Captured' : 'Empty'}
                </span>
                <button
                  type="button"
                  onClick={() => setSignatures(prev => ({
                    ...prev,
                    receiver: { ...prev.receiver, visible: !prev.receiver.visible }
                  }))}
                  className="p-0.5 text-[#94a3b8] hover:text-[#0f172a]"
                >
                  {signatures.receiver.visible ? <Icons.Eye /> : <Icons.EyeOff />}
                </button>
              </div>
            </div>

            {signatures.receiver.visible && (
              <div className="p-2.5 space-y-2">
                {signatures.receiver.captured && signatures.receiver.url ? (
                  <div className="h-16 rounded-[10px] border border-[rgba(15,23,42,0.08)] bg-white flex items-center justify-center p-1.5 relative">
                    <img src={signatures.receiver.url} alt="Receiver Sign" className="max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setSignatures(prev => ({
                        ...prev,
                        receiver: { ...prev.receiver, captured: false, url: null }
                      }))}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-[50%] bg-[#e2e8f0] hover:bg-[#ef4444] text-[#475569] hover:text-white flex items-center justify-center active:scale-[0.965] transition"
                    >
                      <Icons.Close />
                    </button>
                  </div>
                ) : (
                  <div className="h-12 rounded-[10px] border border-dashed border-[rgba(15,23,42,0.14)] bg-white flex items-center justify-center text-[9px] text-[#94a3b8] font-semibold">
                    No signature attached
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTriggerUpload('receiver')}
                    className="flex-1 h-[34px] px-2.5 rounded-[10px] text-white font-extrabold text-[8px] uppercase tracking-[0.065em] flex items-center justify-center gap-1 active:scale-[0.965] transition shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)' }}
                  >
                    <Icons.Camera /> Snap / Camera Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDrawRole('receiver')}
                    className="w-[34px] h-[34px] rounded-[10px] border border-[rgba(15,23,42,0.14)] bg-white text-[#94a3b8] hover:text-[#0f172a] flex items-center justify-center active:scale-[0.965] transition flex-shrink-0"
                    title="Manual Canvas Draw"
                  >
                    <Icons.Draw />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* --- 6. NOTES (COLLAPSIBLE) --- */}
        <section className="bg-white rounded-[18px] border border-[rgba(15,23,42,0.07)] overflow-hidden shadow-[0_12px_28px_rgba(30,58,95,0.08),0_2px_6px_rgba(15,23,42,0.04)]">
          <button
            type="button"
            onClick={() => setNotesOpen(!notesOpen)}
            className="w-full p-[12px] flex items-center justify-between text-left hover:bg-[#f8fafc] transition"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]"></span>
              <span className="text-[10px] font-extrabold text-[#0f172a]">{notesTitle || 'Notes'}</span>
            </div>
            <div className="text-[#94a3b8]">
              {notesOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
            </div>
          </button>

          {notesOpen && (
            <div className="p-[12px] pt-0 space-y-2 border-t border-[rgba(15,23,42,0.07)]">
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                  Section Title
                </label>
                <input
                  type="text"
                  value={notesTitle}
                  onChange={(e) => setNotesTitle(e.target.value)}
                  className="w-full h-[36px] px-2.5 rounded-[10px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] text-[10px] font-bold text-[#0f172a] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#94a3b8] mb-1">
                  Remarks / Endorsements
                </label>
                <textarea
                  rows={3}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Security seals, cargo remarks..."
                  className="w-full p-2 text-[10px] font-medium rounded-[10px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] focus:bg-white focus:outline-none resize-none"
                />
              </div>
            </div>
          )}
        </section>

        {/* --- 7. TERMS & CONDITIONS (CONDITIONAL COLLAPSIBLE) --- */}
        {showTerms && (
          <section className="bg-white rounded-[18px] border border-[rgba(15,23,42,0.07)] overflow-hidden shadow-[0_12px_28px_rgba(30,58,95,0.08),0_2px_6px_rgba(15,23,42,0.04)]">
            <button
              type="button"
              onClick={() => setTermsOpen(!termsOpen)}
              className="w-full p-[12px] flex items-center justify-between text-left hover:bg-[#f8fafc] transition"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]"></span>
                <span className="text-[10px] font-extrabold text-[#0f172a]">Terms & Conditions</span>
              </div>
              <div className="text-[#94a3b8]">
                {termsOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
              </div>
            </button>

            {termsOpen && (
              <div className="p-[12px] pt-0 border-t border-[rgba(15,23,42,0.07)]">
                <textarea
                  rows={4}
                  value={termsText}
                  onChange={(e) => setTermsText(e.target.value)}
                  className="w-full p-2 text-[9px] font-mono leading-relaxed rounded-[10px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] focus:bg-white focus:outline-none resize-none"
                  style={{ fontFamily: '"DM Mono", monospace' }}
                />
              </div>
            )}
          </section>
        )}

      </div>

      {/* --- BIGDROPS FLOATING ACTION BUTTON (50x50px, 18px Radius, 135° Gradient) --- */}
      <button
        type="button"
        onClick={() => handleSave('dispatched')}
        className="fixed bottom-[calc(20px+env(safe-area-inset-bottom,0px))] right-[14px] z-40 w-[50px] h-[50px] rounded-[18px] text-white shadow-[0_18px_40px_rgba(30,58,95,0.28),0_3px_9px_rgba(15,23,42,0.12)] flex items-center justify-center active:scale-[0.965] transition"
        style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)' }}
        title="Save Waybill"
      >
        <Icons.Save />
      </button>

      {/* --- BIGDROPS BOTTOM SHEET: CLIENT SELECTOR (24px Top Radius) --- */}
      {clientOverlay && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/60 backdrop-blur-xs flex items-end">
          <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[24px] max-h-[78vh] flex flex-col p-4 space-y-3 shadow-[0_-16px_40px_rgba(0,0,0,0.24)] animate-in slide-in-from-bottom duration-150">
            {/* Grab Handle */}
            <div className="w-[34px] h-[3px] rounded-full bg-[#cbd5e1] mx-auto -mt-1 mb-1"></div>

            <div className="flex items-center justify-between pb-1 border-b border-[rgba(15,23,42,0.07)]">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.075em] text-[#0f172a]">
                Select Client Account
              </span>
              <button
                onClick={() => setClientOverlay(false)}
                className="w-6 h-6 rounded-[50%] bg-[#e2e8f0] flex items-center justify-center text-[#475569]"
              >
                <Icons.Close />
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search clients..."
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                className="w-full h-[38px] pl-8 pr-3 rounded-[12px] bg-[#e2e8f0] border-none text-[10px] font-semibold focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                autoFocus
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <Icons.Search />
              </div>
            </div>

            <div className="space-y-1 overflow-y-auto flex-1">
              {CLIENTS_DB.filter(c => c.name.toLowerCase().includes(clientQuery.toLowerCase())).map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    setClient(c);
                    setLocation(c.sub);
                    setClientOverlay(false);
                    showToast(`Assigned ${c.name}`);
                  }}
                  className="p-2.5 rounded-[12px] border border-[rgba(15,23,42,0.07)] hover:bg-[#f8fafc] cursor-pointer active:scale-[0.965] transition flex items-center justify-between"
                >
                  <div>
                    <p className="font-extrabold text-[11px] text-[#0f172a] tracking-[-0.025em]">{c.name}</p>
                    <p className="text-[8px] text-[#475569] mt-0.5">{c.sub}</p>
                  </div>
                  <Icons.ChevronRight />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- BIGDROPS BOTTOM SHEET: INVOICE LINKER --- */}
      {invoiceOverlay && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/60 backdrop-blur-xs flex items-end">
          <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[24px] max-h-[78vh] flex flex-col p-4 space-y-3 shadow-[0_-16px_40px_rgba(0,0,0,0.24)] animate-in slide-in-from-bottom duration-150">
            <div className="w-[34px] h-[3px] rounded-full bg-[#cbd5e1] mx-auto -mt-1 mb-1"></div>

            <div className="flex items-center justify-between pb-1 border-b border-[rgba(15,23,42,0.07)]">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.075em] text-[#0f172a] block">
                  Link Invoice
                </span>
                <span className="text-[8px] text-[#475569]">Search billed commercial invoices</span>
              </div>
              <button
                onClick={() => setInvoiceOverlay(false)}
                className="w-6 h-6 rounded-[50%] bg-[#e2e8f0] flex items-center justify-center text-[#475569]"
              >
                <Icons.Close />
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search by invoice # or PO..."
                value={invoiceQuery}
                onChange={(e) => setInvoiceQuery(e.target.value)}
                className="w-full h-[38px] pl-8 pr-3 rounded-[12px] bg-[#e2e8f0] border-none text-[10px] font-semibold focus:ring-2 focus:ring-[#1e3a5f] outline-none"
                autoFocus
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <Icons.Search />
              </div>
            </div>

            <div className="space-y-1 overflow-y-auto flex-1">
              {INVOICES_DB.filter(inv =>
                inv.number.toLowerCase().includes(invoiceQuery.toLowerCase()) ||
                inv.client.toLowerCase().includes(invoiceQuery.toLowerCase()) ||
                inv.po.toLowerCase().includes(invoiceQuery.toLowerCase())
              ).map(inv => (
                <div
                  key={inv.id}
                  onClick={() => {
                    setLinkedInvoice(inv);
                    if (!poNumber) setPoNumber(inv.po);
                    setInvoiceOverlay(false);
                    showToast(`Linked ${inv.number}`);
                  }}
                  className="p-2.5 rounded-[12px] border border-[rgba(15,23,42,0.07)] hover:bg-[#f8fafc] cursor-pointer active:scale-[0.965] transition flex items-center justify-between"
                >
                  <div>
                    <span
                      className="font-mono font-medium text-[10px] text-[#1e3a5f] block"
                      style={{ fontFamily: '"DM Mono", monospace' }}
                    >
                      {inv.number}
                    </span>
                    <span className="text-[8px] text-[#475569]">{inv.client} • {inv.po}</span>
                  </div>
                  <Icons.ChevronRight />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- BIGDROPS BOTTOM SHEET: SIGNATORY PICKER --- */}
      {signatorySheetRole && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/60 backdrop-blur-xs flex items-end">
          <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-[24px] max-h-[78vh] flex flex-col p-4 space-y-3 shadow-[0_-16px_40px_rgba(0,0,0,0.24)] animate-in slide-in-from-bottom duration-150">
            <div className="w-[34px] h-[3px] rounded-full bg-[#cbd5e1] mx-auto -mt-1 mb-1"></div>

            <div className="flex items-center justify-between pb-1 border-b border-[rgba(15,23,42,0.07)]">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.075em] text-[#0f172a] block">
                  Pick Registered Signatory
                </span>
                <span className="text-[8px] text-[#475569]">Select saved dispatch officer</span>
              </div>
              <button
                onClick={() => setSignatorySheetRole(null)}
                className="w-6 h-6 rounded-[50%] bg-[#e2e8f0] flex items-center justify-center text-[#475569]"
              >
                <Icons.Close />
              </button>
            </div>

            <div className="space-y-1.5 overflow-y-auto flex-1">
              {SIGNATORIES_DB.map(person => (
                <div
                  key={person.id}
                  onClick={() => handlePickSignatory(person)}
                  className="p-2.5 rounded-[12px] border border-[rgba(15,23,42,0.07)] hover:bg-[#f8fafc] cursor-pointer flex items-center justify-between active:scale-[0.965] transition"
                >
                  <div>
                    <p className="font-extrabold text-[11px] text-[#0f172a]">{person.name}</p>
                    <p className="text-[8px] text-[#475569]">{person.role}</p>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase text-[#1e3a5f]">Select</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- SECONDARY CANVAS DRAW MODAL --- */}
      {activeDrawRole && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/75 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-sm bg-white rounded-[18px] p-4 space-y-3 shadow-[0_18px_40px_rgba(30,58,95,0.2)] border border-[rgba(15,23,42,0.08)] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-[rgba(15,23,42,0.07)]">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.075em] text-[#0f172a]">
                Manual Canvas Signature
              </span>
              <button
                onClick={() => setActiveDrawRole(null)}
                className="w-6 h-6 rounded-[50%] bg-[#e2e8f0] flex items-center justify-center text-[#475569]"
              >
                <Icons.Close />
              </button>
            </div>

            <div className="border border-[rgba(15,23,42,0.14)] rounded-[12px] bg-[#f8fafc] overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                onMouseDown={startDraw}
                onMouseMove={moveDraw}
                onMouseUp={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={moveDraw}
                onTouchEnd={stopDraw}
                className="w-full h-36 block cursor-crosshair bg-white"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={resetCanvas}
                className="px-2.5 py-1.5 rounded-[10px] border border-[rgba(15,23,42,0.14)] text-[9px] font-extrabold text-[#475569] active:scale-[0.965]"
              >
                Reset
              </button>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveDrawRole(null)}
                  className="px-2.5 py-1.5 text-[9px] font-extrabold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveDrawing}
                  className="px-3.5 py-1.5 rounded-[10px] text-white text-[9px] font-extrabold uppercase tracking-[0.065em] active:scale-[0.965] shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)' }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: COLUMN MANAGER & SETTINGS --- */}
      {columnManagerOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-sm bg-white rounded-[18px] p-4 space-y-3.5 shadow-[0_18px_40px_rgba(30,58,95,0.2)] border border-[rgba(15,23,42,0.08)] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-[rgba(15,23,42,0.07)]">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.075em] text-[#0f172a]">
                Table Column Settings
              </span>
              <button
                onClick={() => setColumnManagerOpen(false)}
                className="w-6 h-6 rounded-[50%] bg-[#e2e8f0] flex items-center justify-center text-[#475569]"
              >
                <Icons.Close />
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[8px] font-extrabold uppercase text-[#94a3b8] block">Standard Columns</span>
              <label className="flex items-center justify-between p-2 rounded-[10px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc]">
                <span className="text-[10px] font-bold">Make / Brand</span>
                <input
                  type="checkbox"
                  checked={columns.make}
                  onChange={(e) => setColumns({ ...columns, make: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1e3a5f]"
                />
              </label>
              <label className="flex items-center justify-between p-2 rounded-[10px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc]">
                <span className="text-[10px] font-bold">Part Number</span>
                <input
                  type="checkbox"
                  checked={columns.partNo}
                  onChange={(e) => setColumns({ ...columns, partNo: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1e3a5f]"
                />
              </label>
              <label className="flex items-center justify-between p-2 rounded-[10px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc]">
                <span className="text-[10px] font-bold">Condition State</span>
                <input
                  type="checkbox"
                  checked={columns.condition}
                  onChange={(e) => setColumns({ ...columns, condition: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1e3a5f]"
                />
              </label>
            </div>

            <div className="pt-2 border-t border-[rgba(15,23,42,0.07)]">
              <button
                type="button"
                onClick={() => setMoreSettingsOpen(true)}
                className="w-full py-2 rounded-[10px] border border-[rgba(15,23,42,0.14)] font-extrabold text-[8px] uppercase tracking-[0.065em] text-[#0f172a] hover:bg-[#f8fafc]"
              >
                More Settings (Terms & Conditions)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setColumnManagerOpen(false)}
              className="w-full h-[38px] rounded-[10px] text-white font-extrabold text-[9px] uppercase tracking-[0.065em] active:scale-[0.965]"
              style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL: MORE SETTINGS --- */}
      {moreSettingsOpen && (
        <div className="fixed inset-0 z-60 bg-[#0f172a]/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-xs bg-white rounded-[18px] p-4 space-y-3 shadow-[0_18px_40px_rgba(30,58,95,0.2)] border border-[rgba(15,23,42,0.08)] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-[rgba(15,23,42,0.07)]">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.075em] text-[#0f172a]">
                More Settings
              </span>
              <button
                onClick={() => setMoreSettingsOpen(false)}
                className="w-6 h-6 rounded-[50%] bg-[#e2e8f0] flex items-center justify-center text-[#475569]"
              >
                <Icons.Close />
              </button>
            </div>

            <label className="flex items-center justify-between p-2.5 rounded-[10px] border border-[rgba(15,23,42,0.08)] bg-[#f8fafc]">
              <span className="text-[10px] font-bold">Show Terms & Conditions</span>
              <input
                type="checkbox"
                checked={showTerms}
                onChange={(e) => setShowTerms(e.target.checked)}
                className="w-4 h-4 rounded text-[#1e3a5f]"
              />
            </label>

            <button
              type="button"
              onClick={() => setMoreSettingsOpen(false)}
              className="w-full h-[36px] rounded-[10px] text-white font-extrabold text-[8px] uppercase tracking-[0.065em]"
              style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL: IMPORT SHEET --- */}
      {importOverlay && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-sm bg-white rounded-[18px] p-4 space-y-3 shadow-[0_18px_40px_rgba(30,58,95,0.2)] border border-[rgba(15,23,42,0.08)] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-[rgba(15,23,42,0.07)]">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.075em] text-[#0f172a] block">
                  Import Waybill Payload
                </span>
                <span className="text-[8px] text-[#475569]">Paste structured document JSON</span>
              </div>
              <button
                onClick={() => setImportOverlay(false)}
                className="w-6 h-6 rounded-[50%] bg-[#e2e8f0] flex items-center justify-center text-[#475569]"
              >
                <Icons.Close />
              </button>
            </div>

            <textarea
              rows={5}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Paste JSON structure here..."
              className="w-full p-2 text-[9px] font-mono rounded-[10px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] focus:bg-white outline-none resize-none"
              style={{ fontFamily: '"DM Mono", monospace' }}
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleApplyImport}
                className="flex-1 h-[36px] rounded-[10px] border border-[rgba(15,23,42,0.14)] bg-[#f8fafc] font-extrabold text-[8px] uppercase tracking-[0.065em] text-[#0f172a] active:scale-[0.965]"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={handleApplyImport}
                className="flex-1 h-[36px] rounded-[10px] text-white font-extrabold text-[8px] uppercase tracking-[0.065em] active:scale-[0.965]"
                style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DIALOG: CLEAR CONFIRMATION --- */}
      {clearAlertOpen && (
        <div className="fixed inset-0 z-60 bg-[#0f172a]/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-xs bg-white rounded-[18px] p-4 space-y-3 shadow-[0_18px_40px_rgba(30,58,95,0.2)] border border-[rgba(15,23,42,0.08)] animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-[12px] font-extrabold text-[#0f172a] tracking-[-0.025em]">
                Clear All Line Items?
              </h3>
              <p className="text-[9px] text-[#475569] mt-1 leading-snug">
                This will remove all {items.length} items from this waybill manifest.
              </p>
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setClearAlertOpen(false)}
                className="px-3 py-1.5 text-[9px] font-extrabold text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3.5 py-1.5 rounded-[10px] bg-[#ef4444] text-white text-[8px] font-extrabold uppercase tracking-[0.065em] active:scale-[0.965]"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TOAST NOTIFICATION (BIGDROPS Style: var(--ink) bg, var(--bg) text) --- */}
      {toastMessage && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-50 bg-[#0f172a] text-[#f0f4f8] text-[9px] font-bold px-3.5 py-2 rounded-[12px] shadow-[0_18px_40px_rgba(0,0,0,0.3)] max-w-[85vw] truncate animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMessage}
        </div>
      )}

    </div>
  );
}
```