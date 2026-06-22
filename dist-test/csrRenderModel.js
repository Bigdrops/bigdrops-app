// src/domain/csr/csrRenderModel.ts
function normalizeSignatory(input) {
  if (!input || typeof input !== "object")
    return null;
  const s = input;
  return {
    name: String(s.name ?? s.Name ?? ""),
    role: String(s.role ?? s.Role ?? ""),
    signatureUrl: String(s.signatureUrl ?? s.signature_url ?? s.SignatureUrl ?? "")
  };
}
function safeString(value) {
  if (value === null || value === undefined)
    return "";
  return String(value).trim();
}
function resolveCallTypeDisplay(raw) {
  const upper = raw.toUpperCase();
  if (upper === "BREAKDOWN" || upper === "BD")
    return "BREAKDOWN";
  if (upper === "MAINTENANCE" || upper === "MNT")
    return "MAINTENANCE";
  if (upper === "INSTALLATION" || upper === "INST")
    return "INSTALLATION";
  if (upper === "OTHER")
    return "OTHER";
  return "NOT SPECIFIED";
}
function resolveSystemDownDisplay(raw) {
  const normalized = raw.toLowerCase().trim();
  if (normalized === "true" || normalized === "yes" || normalized === "1" || normalized === "down")
    return "DOWN";
  if (normalized === "false" || normalized === "no" || normalized === "0" || normalized === "operational")
    return "OPERATIONAL";
  return "NOT SPECIFIED";
}
function computeLayoutDensity(csr) {
  const narrativeTotal = [
    csr.problem_reported,
    csr.service_rendered,
    csr.defects_found,
    csr.engineer_remarks,
    csr.customer_feedback,
    csr.materials_used,
    csr.address
  ].map((v) => safeString(v).length).reduce((sum, len) => sum + len, 0);
  const materialCount = (Array.isArray(csr.materialsRows) ? csr.materialsRows : []).length;
  if (narrativeTotal > 900 || materialCount > 4)
    return "tight";
  if (narrativeTotal > 520 || materialCount > 2)
    return "compact";
  return "comfortable";
}
function buildCsrRenderModel(csr) {
  const address = safeString(csr.address);
  const rawCallType = safeString(csr.call_type);
  const rawSystemDown = safeString(csr.system_down);
  const rawBattery = safeString(csr.battery);
  const rawEngineNo = safeString(csr.engine_no);
  const rawDefects = safeString(csr.defects_found);
  const rawRemarks = safeString(csr.engineer_remarks);
  return {
    csr_number: safeString(csr.csr_number),
    date: safeString(csr.date),
    status: safeString(csr.status) || "Complete",
    client_name: safeString(csr.client_name),
    address,
    po_number: safeString(csr.po_number),
    show_po: Boolean(csr.show_po),
    call_type: rawCallType,
    callTypeDisplay: resolveCallTypeDisplay(rawCallType),
    system_down: rawSystemDown,
    systemDownDisplay: resolveSystemDownDisplay(rawSystemDown),
    equipment_type: safeString(csr.equipment_type),
    equipment_location: safeString(csr.equipment_location),
    make: safeString(csr.make),
    model: safeString(csr.model),
    modelLabel: "Model",
    serial_no: safeString(csr.serial_no),
    serialLabel: "Serial No.",
    capacity: safeString(csr.capacity),
    engine_no: rawEngineNo,
    engineNo: rawEngineNo,
    problem_reported: safeString(csr.problem_reported),
    service_rendered: safeString(csr.service_rendered),
    defects_found: rawDefects,
    defectsFound: rawDefects || "None reported",
    engineer_remarks: rawRemarks,
    technicianRemarks: rawRemarks,
    customer_feedback: safeString(csr.customer_feedback),
    voltage: safeString(csr.voltage),
    frequency: safeString(csr.frequency),
    battery: rawBattery,
    temperature: safeString(csr.temperature),
    pressure: safeString(csr.pressure),
    hours: safeString(csr.hours),
    start_date: safeString(csr.start_date),
    start_time: safeString(csr.start_time),
    end_date: safeString(csr.end_date),
    end_time: safeString(csr.end_time),
    acknowledgement_name: safeString(csr.acknowledgement_name),
    recipientTitle: "Received By / Witness",
    recipientRole: safeString(csr.recipientRole ?? ""),
    showAcknowledgement: true,
    technicianName: safeString(csr.technicianName || normalizeSignatory(csr.technician_signatory_id)?.name || ""),
    technicianRole: normalizeSignatory(csr.technicianSignatory)?.role ?? "",
    technicianSignatureUrl: normalizeSignatory(csr.technicianSignatory)?.signatureUrl ?? "",
    showTechnicianSignLine: false,
    technicianSignatory: normalizeSignatory(csr.technicianSignatory),
    materialsRows: Array.isArray(csr.materialsRows) ? csr.materialsRows : [],
    materialsText: safeString(csr.materialsText || csr.materials_used),
    materialsOutputStyle: "list",
    meta: {},
    showOperationalReadings: true,
    layoutDensity: computeLayoutDensity(csr)
  };
}
export {
  buildCsrRenderModel
};
