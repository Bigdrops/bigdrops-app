```react
import React, { useState, useRef, useEffect } from 'react';

// --- Pure Vector Icons (Lucide style, 1.9 stroke, theme compliant, zero external deps) ---
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
  ChevronRight: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  Search: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  SaveFloppy: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-8H7v8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v5h8" />
    </svg>
  ),
  Import: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-3 h-3 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Upload: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  Download: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Check: () => (
    <svg className="w-3.5 h-3.5 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  ToggleIncluded: () => (
    <svg className="w-3 h-3 text-[#16a34a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ),
  ToggleExcluded: () => (
    <svg className="w-3 h-3 text-[#dc2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg className="w-3.5 h-3.5 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
};

// --- Mock Datastores ---
const CLIENTS_DB = [
  { id: 'c1', name: 'Dangote Sugar Refinery Plc', address: 'Apapa Port Complex, Wharf Road, Lagos' },
  { id: 'c2', name: 'Flour Mills of Nigeria', address: 'Old Dock Road, Apapa, Lagos' },
  { id: 'c3', name: 'TotalEnergies Exploration E&P', address: 'Plot 25 Trans Amadi Ind. Layout, Port Harcourt' },
  { id: 'c4', name: 'Guinness Nigeria Brewery', address: '24 Oba Akran Avenue, Ikeja, Lagos' }
];

const SIGNATORIES_DB = [
  { id: 'sig1', name: 'Engr. Babatunde Lawal', role: 'Lead Field Service Engineer' },
  { id: 'sig2', name: 'Chukwuemeka Obi', role: 'Senior Electromechanical Specialist' },
  { id: 'sig3', name: 'Farouk Usman', role: 'Technical Services Supervisor' }
];

export default function App() {
  const [formMode, setFormMode] = useState('create');
  const [isFieldMode, setIsFieldMode] = useState(false);
  const isOnline = true;

  // 1. Document Details
  const [csrNumber, setCsrNumber] = useState('CSR-2026-0084');
  const [selectedClient, setSelectedClient] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [csrDate, setCsrDate] = useState('2026-09-02');
  const [poNumber, setPoNumber] = useState('');

  // 3. Main Details
  const [callType, setCallType] = useState('Breakdown');
  const [serviceBasis, setServiceBasis] = useState('Warranty');
  const [systemDown, setSystemDown] = useState('Yes');

  // 4. Equipment
  const [equipmentType, setEquipmentType] = useState('Diesel Generator Set');
  const [equipmentLocation, setEquipmentLocation] = useState('Main Powerhouse, Bay 2');
  const [make, setMake] = useState('Cummins Power');
  const [capacity, setCapacity] = useState('500 kVA');
  const [model, setModel] = useState('QSK19-G4');
  const [serialNo, setSerialNo] = useState('CU-8849201-NG');
  const [engineNo, setEngineNo] = useState('ENG-99420-X');

  // 5. Problem & Service
  const [problemReported, setProblemReported] = useState('Unit tripping intermittently on high coolant temperature alarm during peak plant load.');
  const [serviceRendered, setServiceRendered] = useState('Flushed closed-loop cooling system, replaced faulty thermostat assembly, and bled fuel rails. Conducted 45-minute step load testing at 80% capacity.');
  const [defectsFound, setDefectsFound] = useState('Debris build-up in radiator fins and degraded thermostat bypass gasket.');
  const [engineerRemarks, setEngineerRemarks] = useState('Operating temperatures stabilized at 86°C under full load. Recommended scheduled coolant replacement in 250 running hours.');

  // 6. Service Execution
  const [startDate, setStartDate] = useState('2026-09-02');
  const [startTime, setStartTime] = useState('08:30');
  const [endDate, setEndDate] = useState('2026-09-02');
  const [endTime, setEndTime] = useState('14:15');
  const [statusAfterService, setStatusAfterService] = useState('Complete');

  // 7. Operational Readings
  const [showOperationalReadings, setShowOperationalReadings] = useState(true);
  const [voltage, setVoltage] = useState('415 V');
  const [frequency, setFrequency] = useState('50.2 Hz');
  const [battery, setBattery] = useState('26.4 VDC');
  const [temperature, setTemperature] = useState('86 °C');
  const [pressure, setPressure] = useState('4.8 Bar');
  const [hours, setHours] = useState('4,821.5 Hrs');

  // 8. Materials Used
  const [materialsTitle, setMaterialsTitle] = useState('Materials Used');
  const [materials, setMaterials] = useState([
    { id: 'm1', item: 'Thermostat Assembly 82°C Kit', quantity: '1', unit: 'Set' },
    { id: 'm2', item: 'Heavy-Duty Coolant Concentrate (20L)', quantity: '2', unit: 'Cans' },
    { id: 'm3', item: 'High-Temp Bypass Silicone Gasket', quantity: '1', unit: 'Pcs' }
  ]);

  // 9. Technician Section
  const [showTechnicianSignLine, setShowTechnicianSignLine] = useState(true);
  const [technicianName, setTechnicianName] = useState('Engr. Babatunde Lawal');
  const [selectedSignatory, setSelectedSignatory] = useState(SIGNATORIES_DB[0]);

  // 10. Acknowledgement Section
  const [showAcknowledgement, setShowAcknowledgement] = useState(true);
  const [recipientName, setRecipientName] = useState('Adewale Balogun (Plant Engineer)');
  const [customerFeedback, setCustomerFeedback] = useState('Generator ran continuously through production shift without temperature deviation.');
  const [recipientSignatureUri, setRecipientSignatureUri] = useState(null);

  // Overlays & Validation Highlighting States
  const [clientOverlay, setClientOverlay] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [signatorySheetOpen, setSignatorySheetOpen] = useState(false);
  const [identityLockOpen, setIdentityLockOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Highlighted field ID for error pulsing
  const [highlightedField, setHighlightedField] = useState(null);

  // DOM Refs for Teleport Auto-Scroll
  const clientSelectorRef = useRef(null);
  const csrNumberRef = useRef(null);
  const signatureFileInputRef = useRef(null);

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(prev => (prev?.text === msg ? null : prev)), 3200);
  };

  // Teleport to target blocker and trigger visual warning ring
  const triggerValidationAlert = (ref, fieldId, errorText) => {
    showToast(errorText, true);
    setHighlightedField(fieldId);

    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setTimeout(() => {
      setHighlightedField(null);
    }, 2800);
  };

  useEffect(() => {
    if (isFieldMode) {
      setStatusAfterService('Field Entry Pending');
    } else if (statusAfterService === 'Field Entry Pending') {
      setStatusAfterService('Complete');
    }
  }, [isFieldMode]);

  const handleAddMaterial = () => {
    setMaterials([
      ...materials,
      { id: `mat-${Date.now()}`, item: '', quantity: '', unit: 'Units' }
    ]);
    showToast('Material row added');
  };

  const handleUpdateMaterial = (idx, field, val) => {
    const updated = [...materials];
    updated[idx][field] = val;
    setMaterials(updated);
  };

  const handleRemoveMaterial = (idx) => {
    if (materials.length <= 1) {
      setMaterials([{ id: `mat-${Date.now()}`, item: '', quantity: '', unit: 'Units' }]);
      showToast('Reset row to blank');
      return;
    }
    setMaterials(materials.filter((_, i) => i !== idx));
  };

  const handleSignatureFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Unsupported file format', true);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setRecipientSignatureUri(reader.result);
        showToast('Signature attached');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyImport = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (parsed.csrNumber) setCsrNumber(parsed.csrNumber);
      if (parsed.customerName) setCustomerName(parsed.customerName);
      if (parsed.callType) setCallType(parsed.callType);
      if (parsed.serviceBasis) setServiceBasis(parsed.serviceBasis);
      if (parsed.systemDown) setSystemDown(parsed.systemDown ? 'Yes' : 'No');
      if (parsed.equipmentType) setEquipmentType(parsed.equipmentType);
      if (parsed.location) setEquipmentLocation(parsed.location);
      if (parsed.make) setMake(parsed.make);
      if (parsed.capacity) setCapacity(parsed.capacity);
      if (parsed.model) setModel(parsed.model);
      if (parsed.serialNo) setSerialNo(parsed.serialNo);
      if (parsed.problemReported) setProblemReported(parsed.problemReported);
      if (parsed.serviceRendered) setServiceRendered(parsed.serviceRendered);
      if (parsed.defectsFound) setDefectsFound(parsed.defectsFound);
      if (parsed.engineerRemarks) setEngineerRemarks(parsed.engineerRemarks);

      if (parsed.readings) {
        setShowOperationalReadings(true);
        if (parsed.readings.voltage) setVoltage(parsed.readings.voltage);
        if (parsed.readings.frequency) setFrequency(parsed.readings.frequency);
        if (parsed.readings.battery) setBattery(parsed.readings.battery);
        if (parsed.readings.temperature) setTemperature(parsed.readings.temperature);
        if (parsed.readings.pressure) setPressure(parsed.readings.pressure);
        if (parsed.readings.hours) setHours(parsed.readings.hours);
      }

      if (parsed.materials && Array.isArray(parsed.materials)) {
        setMaterials(parsed.materials.map((m, i) => ({
          id: `mat-${Date.now()}-${i}`,
          item: m.item || '',
          quantity: String(m.quantity || ''),
          unit: m.unit || 'Units'
        })));
      }

      setImportSheetOpen(false);
      showToast('CSR imported');
    } catch {
      showToast('Import Failed: Invalid JSON schema', true);
    }
  };

  // Save Validation with Teleport to Save Blocker
  const handleSave = () => {
    // Check Requirement 1: CSR Number
    if (!csrNumber.trim()) {
      triggerValidationAlert(
        csrNumberRef,
        'csrNumber',
        'Save Requirement Missing: CSR Serial Number required'
      );
      return;
    }

    // Check Requirement 2: Selected Client (Required in non-field mode)
    if (!selectedClient && !isFieldMode) {
      triggerValidationAlert(
        clientSelectorRef,
        'clientSelector',
        'Save Requirement Missing: Client account must be selected'
      );
      return;
    }

    if (isFieldMode) {
      showToast(`CSR ${csrNumber} saved in Field Mode! Generating PDF...`);
    } else {
      showToast(`CSR ${csrNumber} saved successfully (${statusAfterService})`);
    }
  };

  const handleDuplicateDraft = () => {
    setFormMode('create');
    setCsrNumber(`CSR-${Date.now().toString().slice(-4)}`);
    setSelectedClient(null);
    setCustomerName('');
    setIdentityLockOpen(false);
    showToast('Duplicated to new draft');
  };

  return (
    <div
      className="min-h-screen relative overflow-x-hidden bg-[#f4f7fb] text-[#0f172a] antialiased selection:bg-[#e2e8f0]"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      <style>{`
        @keyframes fabLiveFloat {
          0%, 100% {
            transform: translateY(0px) scale(1);
            box-shadow: 0 18px 40px rgba(30, 58, 95, 0.32), 0 6px 14px rgba(15, 23, 42, 0.16);
          }
          50% {
            transform: translateY(-6px) scale(1.04);
            box-shadow: 0 26px 52px rgba(30, 58, 95, 0.42), 0 10px 22px rgba(15, 23, 42, 0.22);
          }
        }
        @keyframes fabHaloPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.22);
          }
        }
        @keyframes ambientDrift {
          0%, 100% {
            transform: translate(0px, 0px) rotate(0deg);
          }
          50% {
            transform: translate(14px, -12px) rotate(5deg);
          }
        }
        @keyframes errorPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6);
            border-color: #ef4444;
          }
          50% {
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.25);
            border-color: #dc2626;
          }
        }
        .live-fab-float {
          animation: fabLiveFloat 3.2s ease-in-out infinite;
        }
        .live-fab-halo {
          animation: fabHaloPulse 3.2s ease-in-out infinite;
        }
        .ambient-shape-drift {
          animation: ambientDrift 12s ease-in-out infinite;
        }
        .field-error-highlight {
          animation: errorPulse 1.2s ease-in-out infinite;
        }
      `}</style>

      {/* --- FACTORY & FIELD CONTEXT BACKGROUND ART & SHAPES --- */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
        <div
          className="absolute -top-20 -right-16 w-[420px] h-[420px] rounded-full ambient-shape-drift"
          style={{
            background: 'radial-gradient(circle, rgba(30, 58, 95, 0.14) 0%, rgba(15, 23, 42, 0) 70%)',
            filter: 'blur(28px)'
          }}
        />

        {/* Industrial Clipboard Art (Top-right canvas) */}
        <svg
          className="absolute top-10 -right-8 w-56 h-56 text-[rgba(30,58,95,0.06)] ambient-shape-drift"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
          <path d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" />
          <path d="M9 12h6M9 16h4" />
        </svg>

        {/* Hardhat / Safety Helmet Art (Mid-left canvas) */}
        <svg
          className="absolute top-[38%] -left-12 w-64 h-64 text-[rgba(15,23,42,0.05)] ambient-shape-drift"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        >
          <path d="M2 15h20" />
          <path d="M6 15v-1a6 6 0 0112 0v1" />
          <path d="M12 4v4" />
          <path d="M4 15a8 8 0 0116 0" />
        </svg>

        <div className="absolute bottom-32 -left-12 w-52 h-52 rounded-full border-2 border-dashed border-[rgba(30,58,95,0.08)]" />
        <div
          className="absolute bottom-28 -left-8 w-44 h-44 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(22, 163, 74, 0.08) 0%, rgba(240, 244, 248, 0) 70%)',
            filter: 'blur(20px)'
          }}
        />
      </div>

      <input
        type="file"
        ref={signatureFileInputRef}
        accept="image/*"
        onChange={handleSignatureFileChange}
        className="hidden"
      />

      {/* FULL-PAGE UNIFIED FORM CANVAS */}
      <div className="relative z-10 max-w-md mx-auto px-4 pt-4 pb-28">

        {/* Top Minimal Toolbar */}
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(15,23,42,0.1)]">
          <div className="flex items-center gap-2">
            <h1 className="text-[13px] font-extrabold text-[#0f172a] tracking-tight">
              Customer Service Report
            </h1>
            <button
              type="button"
              onClick={() => {
                const next = formMode === 'create' ? 'edit' : 'create';
                setFormMode(next);
                showToast(`Mode: ${next.toUpperCase()}`);
              }}
              className="px-1.5 py-0.5 rounded-[4px] text-[7px] font-mono font-bold bg-[#e2e8f0] text-[#334155]"
            >
              {formMode.toUpperCase()}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick unselect trigger to test auto-scroll validation */}
            {selectedClient && formMode === 'create' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClient(null);
                  showToast('Client cleared to demonstrate Save Blocker');
                }}
                className="px-1.5 py-0.5 rounded-[4px] text-[7px] font-extrabold uppercase bg-[#fee2e2] text-[#ef4444]"
              >
                Clear Client
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsFieldMode(!isFieldMode);
                showToast(!isFieldMode ? 'Field mode active' : 'Standard mode active');
              }}
              className={`px-2 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-wider transition ${
                isFieldMode
                  ? 'bg-[rgba(30,58,95,0.14)] text-[#1e3a5f]'
                  : 'bg-[#e2e8f0] text-[#64748b]'
              }`}
            >
              {isFieldMode ? 'Field' : 'Standard'}
            </button>

            {formMode === 'create' && (
              <button
                type="button"
                onClick={() => showToast('Blank CSR PDF downloaded')}
                className="p-1 rounded-[6px] text-[#475569] hover:text-[#0f172a] active:scale-95 transition"
                title="Download Blank"
              >
                <Icons.Download />
              </button>
            )}
          </div>
        </div>

        {/* CONTINUOUS FORM FLOW */}
        <div className="divide-y divide-[rgba(15,23,42,0.09)] space-y-5">

          {/* --- 01. DOCUMENT DETAILS --- */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.11em] text-[#475569]">
                01. Document Details
              </span>
              <span
                className="text-[9px] font-mono font-bold text-[#1e3a5f]"
                style={{ fontFamily: '"DM Mono", monospace' }}
              >
                {csrNumber}
              </span>
            </div>

            {/* Client Account Selector (Teleport Target 1) */}
            <div ref={clientSelectorRef}>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                Client Account {!isFieldMode && <span className="text-[#ef4444]">*</span>}
              </label>
              {formMode === 'edit' ? (
                <div
                  onClick={() => setIdentityLockOpen(true)}
                  className="w-full flex items-center justify-between p-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] cursor-pointer shadow-xs"
                >
                  <div className="truncate pr-2">
                    <div className="text-[11px] font-bold text-[#0f172a] truncate">
                      {selectedClient ? selectedClient.name : 'Dangote Sugar Refinery Plc'}
                    </div>
                    <div className="text-[9px] text-[#64748b] truncate mt-0.5">
                      {clientAddress || 'Apapa Port Complex, Wharf Road, Lagos'}
                    </div>
                  </div>
                  <Icons.Lock />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setClientOverlay(true)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-[10px] bg-white text-left transition active:scale-[0.98] shadow-xs border ${
                    highlightedField === 'clientSelector'
                      ? 'field-error-highlight bg-red-50/50'
                      : 'border-[rgba(15,23,42,0.08)]'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className={`text-[11px] font-bold truncate ${!selectedClient ? 'text-[#ef4444]' : 'text-[#0f172a]'}`}>
                      {selectedClient ? selectedClient.name : 'Select client account (Required)'}
                    </div>
                    <div className="text-[9px] text-[#64748b] truncate mt-0.5">
                      {clientAddress || (isFieldMode ? 'Optional in field mode' : 'Tap to search client records')}
                    </div>
                  </div>
                  <div className={!selectedClient ? 'text-[#ef4444]' : 'text-[#94a3b8]'}>
                    <Icons.ChevronRight />
                  </div>
                </button>
              )}
            </div>

            {/* CSR Number & Date (Teleport Target 2) */}
            <div className="grid grid-cols-2 gap-2">
              <div ref={csrNumberRef}>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  CSR NUMBER <span className="text-[#ef4444]">*</span>
                </label>
                {formMode === 'edit' ? (
                  <div
                    onClick={() => setIdentityLockOpen(true)}
                    className="w-full h-[38px] px-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] flex items-center justify-between font-mono font-medium text-[11px] text-[#0f172a] cursor-pointer shadow-xs"
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  >
                    <span>{csrNumber}</span>
                    <Icons.Lock />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={csrNumber}
                    onChange={(e) => setCsrNumber(e.target.value)}
                    className={`w-full h-[38px] px-2.5 rounded-[10px] bg-white font-mono font-medium text-[11px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs border ${
                      highlightedField === 'csrNumber'
                        ? 'field-error-highlight bg-red-50/50'
                        : 'border-[rgba(15,23,42,0.08)]'
                    }`}
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  />
                )}
              </div>
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  REPORT DATE
                </label>
                <input
                  type="date"
                  value={csrDate}
                  onChange={(e) => setCsrDate(e.target.value)}
                  className="w-full h-[38px] px-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] text-[11px] font-medium text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                  style={{ fontFamily: '"DM Mono", monospace' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  CUSTOMER CONTACT
                </label>
                {formMode === 'edit' ? (
                  <div
                    onClick={() => setIdentityLockOpen(true)}
                    className="w-full h-[38px] px-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] flex items-center justify-between text-[11px] font-semibold text-[#0f172a] cursor-pointer truncate shadow-xs"
                  >
                    <span className="truncate">{customerName || 'Dangote Sugar Port Ops'}</span>
                    <Icons.Lock />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Contact person"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full h-[38px] px-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] text-[11px] font-semibold text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                  />
                )}
              </div>
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  P.O. NUMBER
                </label>
                <input
                  type="text"
                  placeholder="PO #"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full h-[38px] px-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] text-[11px] font-semibold text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* --- 02. ITEM CONTROLS --- */}
          <div className="pt-4 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.11em] text-[#475569]">
              02. Item Controls
            </span>
            <button
              type="button"
              onClick={() => setImportSheetOpen(true)}
              className="h-[30px] px-3 rounded-[8px] bg-white hover:bg-[#f1f5f9] text-[#0f172a] text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition border border-[rgba(15,23,42,0.1)] shadow-xs"
            >
              <Icons.Import /> Import JSON Payload
            </button>
          </div>

          {/* --- 03. SERVICE PARAMETERS --- */}
          <div className="pt-4 space-y-3">
            <span className="text-[9px] font-black uppercase tracking-[0.11em] text-[#475569] block">
              03. Service Parameters
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  Call Type
                </label>
                <select
                  value={callType}
                  onChange={(e) => setCallType(e.target.value)}
                  className="w-full h-[38px] px-2 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-semibold text-[10px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                >
                  <option value="Breakdown">Breakdown</option>
                  <option value="Preventive Maintenance">PM</option>
                  <option value="Installation">Installation</option>
                  <option value="Commissioning">Commissioning</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Emergency Repair">Emergency</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  Service Basis
                </label>
                <select
                  value={serviceBasis}
                  onChange={(e) => setServiceBasis(e.target.value)}
                  className="w-full h-[38px] px-2 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-semibold text-[10px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                >
                  <option value="Paid Service">Paid Service</option>
                  <option value="AMC">AMC</option>
                  <option value="Warranty">Warranty</option>
                </select>
              </div>

              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  System Down?
                </label>
                <select
                  value={systemDown}
                  onChange={(e) => setSystemDown(e.target.value)}
                  className="w-full h-[38px] px-2 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-semibold text-[10px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
          </div>

          {/* --- 04. EQUIPMENT SPECIFICATIONS --- */}
          <div className="pt-4 space-y-3">
            <span className="text-[9px] font-black uppercase tracking-[0.11em] text-[#475569] block">
              04. Equipment Specifications
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  Equipment Type
                </label>
                <input
                  type="text"
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value)}
                  placeholder="e.g. Diesel Generator"
                  className="w-full h-[38px] px-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-semibold text-[11px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                />
              </div>
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  Equipment Location
                </label>
                <input
                  type="text"
                  value={equipmentLocation}
                  onChange={(e) => setEquipmentLocation(e.target.value)}
                  placeholder="e.g. Bay 2"
                  className="w-full h-[38px] px-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-semibold text-[11px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  Make
                </label>
                <input
                  type="text"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="Manufacturer"
                  className="w-full h-[38px] px-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-semibold text-[11px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                />
              </div>
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  Capacity
                </label>
                <input
                  type="text"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g. 500 kVA"
                  className="w-full h-[38px] px-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-semibold text-[11px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Model ID"
                  className="w-full h-[38px] px-2 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-semibold text-[10px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                />
              </div>
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  Serial No.
                </label>
                <input
                  type="text"
                  value={serialNo}
                  onChange={(e) => setSerialNo(e.target.value)}
                  placeholder="Serial #"
                  className="w-full h-[38px] px-2 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-mono font-medium text-[10px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                  style={{ fontFamily: '"DM Mono", monospace' }}
                />
              </div>
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  Engine No
                </label>
                <input
                  type="text"
                  value={engineNo}
                  onChange={(e) => setEngineNo(e.target.value)}
                  placeholder="Engine #"
                  className="w-full h-[38px] px-2 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-mono font-medium text-[10px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                  style={{ fontFamily: '"DM Mono", monospace' }}
                />
              </div>
            </div>
          </div>

          {/* --- 05. PROBLEM & SERVICE --- */}
          <div className="pt-4 space-y-3">
            <span className="text-[9px] font-black uppercase tracking-[0.11em] text-[#475569] block">
              05. Problem & Service Details
            </span>

            <div>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                Problem Reported
              </label>
              <textarea
                rows={3}
                value={problemReported}
                onChange={(e) => setProblemReported(e.target.value)}
                placeholder="Client complaint or initial defect description..."
                className="w-full min-h-[80px] p-2 text-[10px] font-semibold text-[#0f172a] rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] resize-none shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                Service Rendered
              </label>
              <textarea
                rows={3}
                value={serviceRendered}
                onChange={(e) => setServiceRendered(e.target.value)}
                placeholder="Corrective actions taken by engineer..."
                className="w-full min-h-[88px] p-2 text-[10px] font-semibold text-[#0f172a] rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] resize-none shadow-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  Defects Found
                </label>
                <textarea
                  rows={2}
                  value={defectsFound}
                  onChange={(e) => setDefectsFound(e.target.value)}
                  placeholder="Root causes..."
                  className="w-full p-2 text-[10px] font-medium rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] focus:outline-none resize-none shadow-xs"
                />
              </div>
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  Engineer Remarks
                </label>
                <textarea
                  rows={2}
                  value={engineerRemarks}
                  onChange={(e) => setEngineerRemarks(e.target.value)}
                  placeholder="Recommendations..."
                  className="w-full p-2 text-[10px] font-medium rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] focus:outline-none resize-none shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* --- 06. EXECUTION TIMELINE --- */}
          <div className="pt-4 space-y-3">
            <span className="text-[9px] font-black uppercase tracking-[0.11em] text-[#475569] block">
              06. Execution Timeline & Status
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  START DATE & TIME
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-3/5 h-[38px] px-1.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] text-[10px] font-medium text-[#0f172a] focus:outline-none shadow-xs"
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-2/5 h-[38px] px-1 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] text-[10px] font-medium text-[#0f172a] focus:outline-none shadow-xs"
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                  END DATE & TIME
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-3/5 h-[38px] px-1.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] text-[10px] font-medium text-[#0f172a] focus:outline-none shadow-xs"
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-2/5 h-[38px] px-1 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] text-[10px] font-medium text-[#0f172a] focus:outline-none shadow-xs"
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                STATUS AFTER SERVICE
              </label>
              <select
                value={statusAfterService}
                onChange={(e) => setStatusAfterService(e.target.value)}
                className="w-full h-[38px] px-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-semibold text-[11px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
              >
                <option value="Complete">Complete</option>
                <option value="Incomplete">Incomplete</option>
                <option value="Pending for spares">Pending for spares</option>
                <option value="Under observation">Under observation</option>
                <option value="Working solution provided">Working solution provided</option>
                <option value="Field Entry Pending">Field Entry Pending</option>
              </select>
            </div>
          </div>

          {/* --- 07. OPERATIONAL READINGS --- */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.11em] text-[#475569]">
                07. Operational Readings
              </span>
              <button
                type="button"
                onClick={() => setShowOperationalReadings(!showOperationalReadings)}
                className="px-2 py-0.5 rounded-[6px] text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition active:scale-95 bg-white border border-[rgba(15,23,42,0.08)] text-[#1e3a5f]"
              >
                {showOperationalReadings ? (
                  <>
                    <Icons.ToggleIncluded /> Included
                  </>
                ) : (
                  <>
                    <Icons.ToggleExcluded /> Excluded
                  </>
                )}
              </button>
            </div>

            {showOperationalReadings && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                    Voltage
                  </label>
                  <input
                    type="text"
                    value={voltage}
                    onChange={(e) => setVoltage(e.target.value)}
                    placeholder="415 V"
                    className="w-full h-[38px] px-2 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-mono font-medium text-[10px] text-[#0f172a] focus:outline-none shadow-xs"
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                    Frequency
                  </label>
                  <input
                    type="text"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    placeholder="50 Hz"
                    className="w-full h-[38px] px-2 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-mono font-medium text-[10px] text-[#0f172a] focus:outline-none shadow-xs"
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                    Battery
                  </label>
                  <input
                    type="text"
                    value={battery}
                    onChange={(e) => setBattery(e.target.value)}
                    placeholder="24 VDC"
                    className="w-full h-[38px] px-2 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-mono font-medium text-[10px] text-[#0f172a] focus:outline-none shadow-xs"
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                    Temperature
                  </label>
                  <input
                    type="text"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="85 °C"
                    className="w-full h-[38px] px-2 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-mono font-medium text-[10px] text-[#0f172a] focus:outline-none shadow-xs"
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                    Pressure
                  </label>
                  <input
                    type="text"
                    value={pressure}
                    onChange={(e) => setPressure(e.target.value)}
                    placeholder="4.5 Bar"
                    className="w-full h-[38px] px-2 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-mono font-medium text-[10px] text-[#0f172a] focus:outline-none shadow-xs"
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                    Hours
                  </label>
                  <input
                    type="text"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="Running Hrs"
                    className="w-full h-[38px] px-2 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-mono font-medium text-[10px] text-[#0f172a] focus:outline-none shadow-xs"
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* --- 08. MATERIALS USED --- */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={materialsTitle}
                onChange={(e) => setMaterialsTitle(e.target.value)}
                className="text-[9px] font-black uppercase tracking-[0.11em] text-[#475569] bg-transparent focus:outline-none focus:text-[#0f172a]"
              />
              <span
                className="font-mono text-[8px] font-medium text-[#64748b]"
                style={{ fontFamily: '"DM Mono", monospace' }}
              >
                {materials.filter(m => m.item.trim() !== '').length} items
              </span>
            </div>

            <div className="divide-y divide-[rgba(15,23,42,0.08)]">
              {materials.map((mat, idx) => (
                <div key={mat.id} className="py-2 flex items-center gap-2 first:pt-0 last:pb-0">
                  <span
                    className="w-5 h-5 rounded-[4px] bg-[#e2e8f0] text-[#0f172a] font-mono font-bold text-[9px] flex items-center justify-center flex-shrink-0"
                    style={{ fontFamily: '"DM Mono", monospace' }}
                  >
                    {idx + 1}
                  </span>

                  <div className="flex-1 grid grid-cols-12 gap-1.5">
                    <div className="col-span-6">
                      <input
                        type="text"
                        placeholder="Material specification"
                        value={mat.item}
                        onChange={(e) => handleUpdateMaterial(idx, 'item', e.target.value)}
                        className="w-full h-[36px] px-2 text-[10px] font-bold text-[#0f172a] rounded-[8px] bg-white border border-[rgba(15,23,42,0.08)] focus:outline-none shadow-xs"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={mat.quantity}
                        onChange={(e) => handleUpdateMaterial(idx, 'quantity', e.target.value)}
                        className="w-full h-[36px] px-1 text-center font-mono font-medium text-[10px] text-[#0f172a] rounded-[8px] bg-white border border-[rgba(15,23,42,0.08)] focus:outline-none shadow-xs"
                        style={{ fontFamily: '"DM Mono", monospace' }}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Unit"
                        value={mat.unit}
                        onChange={(e) => handleUpdateMaterial(idx, 'unit', e.target.value)}
                        className="w-full h-[36px] px-1 text-center font-semibold text-[10px] text-[#0f172a] rounded-[8px] bg-white border border-[rgba(15,23,42,0.08)] focus:outline-none shadow-xs"
                      />
                    </div>
                  </div>

                  {materials.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(idx)}
                      className="w-6 h-6 rounded-[50%] hover:bg-[#fee2e2] text-[#94a3b8] hover:text-[#ef4444] flex items-center justify-center active:scale-90 transition flex-shrink-0"
                      title="Remove"
                    >
                      <Icons.Close />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddMaterial}
              className="w-full h-[36px] rounded-[8px] bg-white hover:bg-[#f1f5f9] text-[#0f172a] font-extrabold text-[8px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition border border-[rgba(15,23,42,0.08)] shadow-xs"
            >
              <Icons.Add /> Add material row
            </button>
          </div>

          {/* --- 09. TECHNICIAN ENDORSEMENT --- */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.11em] text-[#475569]">
                09. Technician Endorsement
              </span>
              <button
                type="button"
                onClick={() => setShowTechnicianSignLine(!showTechnicianSignLine)}
                className={`px-2 py-0.5 rounded-[6px] text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition active:scale-95 border ${
                  showTechnicianSignLine
                    ? 'bg-white border-[rgba(22,163,74,0.3)] text-[#16a34a]'
                    : 'bg-white border-[rgba(239,68,68,0.3)] text-[#dc2626]'
                }`}
              >
                {showTechnicianSignLine ? (
                  <>
                    <Icons.ToggleIncluded /> Included
                  </>
                ) : (
                  <>
                    <Icons.ToggleExcluded /> Excluded
                  </>
                )}
              </button>
            </div>

            {showTechnicianSignLine && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                    Technician Name
                  </label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    className="w-full h-[38px] px-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-semibold text-[11px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                  />
                </div>

                <div className="p-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[7px] font-mono uppercase text-[#64748b] block">Technician Signature</span>
                    <p className="text-[10px] font-bold text-[#0f172a] mt-0.5">
                      {selectedSignatory ? selectedSignatory.name : 'Leave blank for offline sign.'}
                    </p>
                    {selectedSignatory && (
                      <span className="text-[8px] text-[#64748b]">{selectedSignatory.role}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSignatorySheetOpen(true)}
                      className="h-[28px] px-2.5 rounded-[6px] text-white text-[8px] font-bold uppercase tracking-wider shadow-xs active:scale-95 transition"
                      style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)' }}
                    >
                      {selectedSignatory ? 'Change' : 'Choose'}
                    </button>
                    {selectedSignatory && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSignatory(null);
                          showToast('Signatory cleared');
                        }}
                        className="h-[28px] px-2 rounded-[6px] bg-white text-[#64748b] text-[8px] font-bold uppercase border border-[rgba(15,23,42,0.08)] active:scale-95"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* --- 10. CUSTOMER ACKNOWLEDGEMENT --- */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[0.11em] text-[#475569]">
                10. Customer Acknowledgement
              </span>
              <button
                type="button"
                onClick={() => setShowAcknowledgement(!showAcknowledgement)}
                className={`px-2 py-0.5 rounded-[6px] text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition active:scale-95 border ${
                  showAcknowledgement
                    ? 'bg-white border-[rgba(22,163,74,0.3)] text-[#16a34a]'
                    : 'bg-white border-[rgba(239,68,68,0.3)] text-[#dc2626]'
                }`}
              >
                {showAcknowledgement ? (
                  <>
                    <Icons.ToggleIncluded /> Included
                  </>
                ) : (
                  <>
                    <Icons.ToggleExcluded /> Excluded
                  </>
                )}
              </button>
            </div>

            {showAcknowledgement && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                    Recipient Name & Title
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. John Doe (Plant Manager)"
                    className="w-full h-[38px] px-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] font-semibold text-[11px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-extrabold uppercase tracking-[0.07em] text-[#64748b] mb-1">
                    Feedback / Endorsement Note
                  </label>
                  <textarea
                    rows={2}
                    value={customerFeedback}
                    onChange={(e) => setCustomerFeedback(e.target.value)}
                    placeholder="Client feedback notes..."
                    className="w-full p-2 text-[10px] font-medium rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] focus:outline-none resize-none shadow-xs"
                  />
                </div>

                <div className="p-2.5 rounded-[10px] bg-white border border-[rgba(15,23,42,0.08)] space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-extrabold uppercase text-[#64748b]">
                      Recipient Signature
                    </span>
                    <span className="text-[7px] font-mono text-[#64748b]">
                      {recipientSignatureUri ? 'Attached' : 'Offline Blank'}
                    </span>
                  </div>

                  {recipientSignatureUri ? (
                    <div className="h-16 rounded-[8px] bg-[#f8fafc] flex items-center justify-center p-1 relative border border-[rgba(15,23,42,0.08)]">
                      <img src={recipientSignatureUri} alt="Sign" className="max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => {
                          setRecipientSignatureUri(null);
                          showToast('Signature removed');
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-[50%] bg-white text-[#64748b] hover:text-[#ef4444] flex items-center justify-center shadow-xs"
                      >
                        <Icons.Close />
                      </button>
                    </div>
                  ) : (
                    <div className="h-10 rounded-[8px] bg-[#f8fafc] flex items-center justify-center text-[9px] text-[#64748b] font-medium border border-dashed border-[rgba(15,23,42,0.12)]">
                      No signature attached (leave blank for physical sign)
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => signatureFileInputRef.current?.click()}
                    className="w-full h-[32px] px-2.5 rounded-[8px] bg-white text-[#0f172a] font-bold text-[8px] uppercase tracking-wider hover:bg-[#f1f5f9] flex items-center justify-center gap-1.5 active:scale-95 transition border border-[rgba(15,23,42,0.08)] shadow-xs"
                  >
                    <Icons.Upload /> Upload Signature Image
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* --- LIVE FLOATING ACTION BUTTON (With Halo & Spring Bounce) --- */}
      <div className="fixed bottom-6 right-5 z-40">
        <div
          className="absolute inset-0 rounded-[20px] live-fab-halo -z-10"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.45) 0%, rgba(30, 58, 95, 0) 70%)',
            filter: 'blur(8px)'
          }}
        />

        <button
          type="button"
          onClick={handleSave}
          className="w-[50px] h-[50px] rounded-[18px] text-white flex items-center justify-center live-fab-float active:scale-90 transition transform cursor-pointer border border-white/20"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)'
          }}
          title="Save Customer Service Report"
        >
          <Icons.SaveFloppy />
        </button>
      </div>

      {/* --- OFFLINE BAR INDICATOR --- */}
      {!isOnline && (
        <div className="fixed bottom-0 inset-x-0 bg-[#f59e0b] text-[#0f172a] px-3 py-1 text-[8px] font-bold text-center z-50">
          Offline Mode Active: Draft saved locally for synchronization.
        </div>
      )}

      {/* --- BOTTOM SHEET: CLIENT SELECTOR --- */}
      {clientOverlay && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/60 backdrop-blur-xs flex items-end">
          <div className="w-full max-w-md mx-auto bg-white rounded-t-[24px] max-h-[78vh] flex flex-col p-4 space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-150">
            <div className="w-[34px] h-[3px] rounded-full bg-[#cbd5e1] mx-auto -mt-1 mb-1"></div>

            <div className="flex items-center justify-between pb-1 border-b border-[rgba(15,23,42,0.07)]">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.075em] text-[#0f172a]">
                Select Client Account
              </span>
              <button
                onClick={() => setClientOverlay(false)}
                className="w-6 h-6 rounded-[50%] bg-[#f1f5f9] flex items-center justify-center text-[#475569]"
              >
                <Icons.Close />
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search registered clients..."
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                className="w-full h-[38px] pl-8 pr-3 rounded-[10px] bg-[#f1f5f9] border-none text-[10px] font-semibold focus:ring-2 focus:ring-[#1e3a5f] outline-none"
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
                    setSelectedClient(c);
                    setClientAddress(c.address);
                    setCustomerName(c.name);
                    setClientOverlay(false);
                    showToast(`Selected ${c.name}`);
                  }}
                  className="p-2.5 rounded-[10px] hover:bg-[#f8fafc] cursor-pointer active:scale-95 transition flex items-center justify-between"
                >
                  <div>
                    <p className="font-extrabold text-[11px] text-[#0f172a]">{c.name}</p>
                    <p className="text-[8px] text-[#64748b] mt-0.5">{c.address}</p>
                  </div>
                  <Icons.ChevronRight />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- BOTTOM SHEET: SIGNATORY PICKER --- */}
      {signatorySheetOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/60 backdrop-blur-xs flex items-end">
          <div className="w-full max-w-md mx-auto bg-white rounded-t-[24px] max-h-[78vh] flex flex-col p-4 space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-150">
            <div className="w-[34px] h-[3px] rounded-full bg-[#cbd5e1] mx-auto -mt-1 mb-1"></div>

            <div className="flex items-center justify-between pb-1 border-b border-[rgba(15,23,42,0.07)]">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.075em] text-[#0f172a] block">
                  Choose Signatory
                </span>
                <span className="text-[8px] text-[#64748b]">Select authorized engineer</span>
              </div>
              <button
                onClick={() => setSignatorySheetOpen(false)}
                className="w-6 h-6 rounded-[50%] bg-[#f1f5f9] flex items-center justify-center text-[#475569]"
              >
                <Icons.Close />
              </button>
            </div>

            <div className="space-y-1.5 overflow-y-auto flex-1">
              {SIGNATORIES_DB.map(person => (
                <div
                  key={person.id}
                  onClick={() => {
                    setSelectedSignatory(person);
                    setTechnicianName(person.name);
                    setSignatorySheetOpen(false);
                    showToast(`Assigned ${person.name}`);
                  }}
                  className={`p-2.5 rounded-[10px] border cursor-pointer flex items-center justify-between active:scale-95 transition ${
                    selectedSignatory?.id === person.id
                      ? 'bg-[rgba(30,58,95,0.06)] border-[#1e3a5f]'
                      : 'border-[rgba(15,23,42,0.07)] hover:bg-[#f8fafc]'
                  }`}
                >
                  <div>
                    <p className="font-extrabold text-[11px] text-[#0f172a]">{person.name}</p>
                    <p className="text-[8px] text-[#64748b]">{person.role}</p>
                  </div>
                  {selectedSignatory?.id === person.id ? (
                    <Icons.Check />
                  ) : (
                    <span className="text-[8px] font-extrabold uppercase text-[#1e3a5f]">Select</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- BOTTOM SHEET: IMPORT JSON --- */}
      {importSheetOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/60 backdrop-blur-xs flex items-end">
          <div className="w-full max-w-md mx-auto bg-white rounded-t-[24px] max-h-[82vh] flex flex-col p-4 space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-150">
            <div className="w-[34px] h-[3px] rounded-full bg-[#cbd5e1] mx-auto -mt-1 mb-1"></div>

            <div className="flex items-center justify-between pb-1 border-b border-[rgba(15,23,42,0.07)]">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.075em] text-[#0f172a] block">
                  Import CSR
                </span>
                <span className="text-[8px] text-[#64748b]">Update fields from a JSON extraction</span>
              </div>
              <button
                onClick={() => setImportSheetOpen(false)}
                className="w-6 h-6 rounded-[50%] bg-[#f1f5f9] flex items-center justify-center text-[#475569]"
              >
                <Icons.Close />
              </button>
            </div>

            <textarea
              rows={6}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste raw CSR JSON object here..."
              className="w-full p-2.5 text-[9px] font-mono rounded-[8px] bg-[#f8fafc] focus:bg-white outline-none resize-none border border-[rgba(15,23,42,0.08)]"
              style={{ fontFamily: '"DM Mono", monospace' }}
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleApplyImport}
                className="flex-1 h-[36px] rounded-[8px] bg-[#f1f5f9] hover:bg-[#e2e8f0] font-bold text-[8px] uppercase tracking-wider text-[#0f172a] active:scale-95"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={handleApplyImport}
                className="flex-1 h-[36px] rounded-[8px] text-white font-bold text-[8px] uppercase tracking-wider active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DIALOG: IDENTITY LOCK ALERT --- */}
      {identityLockOpen && (
        <div className="fixed inset-0 z-60 bg-[#0f172a]/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-xs bg-white rounded-[16px] p-4 space-y-3 shadow-2xl border border-[rgba(15,23,42,0.08)] animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-[12px] font-extrabold text-[#0f172a]">
                Identity Fields Locked
              </h3>
              <p className="text-[9px] text-[#64748b] mt-1 leading-snug">
                Client and CSR number are locked in edit mode to preserve audit history. Duplicate to create a new draft.
              </p>
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIdentityLockOpen(false)}
                className="px-3 py-1.5 text-[9px] font-bold text-[#64748b]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDuplicateDraft}
                className="px-3.5 py-1.5 rounded-[8px] text-white text-[8px] font-bold uppercase tracking-wider active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f172a)' }}
              >
                Duplicate Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TOAST NOTIFICATION WITH ERROR BADGE --- */}
      {toastMessage && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 text-[9px] font-bold px-3.5 py-2 rounded-[12px] shadow-2xl max-w-[88vw] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-150 ${
            toastMessage.isError
              ? 'bg-[#0f172a] text-[#fef2f2] border border-[#ef4444]/40'
              : 'bg-[#0f172a] text-[#f0f4f8]'
          }`}
        >
          {toastMessage.isError && <Icons.AlertTriangle />}
          <span className="truncate">{toastMessage.text}</span>
        </div>
      )}

    </div>
  );
}
```