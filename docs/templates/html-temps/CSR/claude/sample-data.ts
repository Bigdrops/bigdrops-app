import { LOGO_PLACEHOLDER, SIGNATURE_PLACEHOLDER } from "@/lib/csr-assets";
import type { CsrReportData } from "@/components/command-csr-report";

export const sampleCsr: CsrReportData = {
  reportNo: "SASCSR-000004",
  reportDate: "2026-10-26",
  status: "Complete",
  note: "Prototype layout · logo and signature artwork are placeholders, to be replaced with the original assets",
  company: {
    name: "Sun & Shield Power Solutions",
    addressLine: "43 Oshola Street, Ifako-Ijaiye, Lagos State",
    contactLine: "Tel: +2348066190685  |  Sunshieldpowersolutions@gmail.com",
  },
  client: {
    name: "TATA International, Nigeria",
    corporateAddress: "Plot C89, Amuwo Odofin Industrial Layout, Along Oshodi – Apapa Express Way, Lagos, Nigeria",
    callType: "Preventive Maintenance",
    serviceBasis: "Paid Service",
    serviceDate: "2026-10-26",
    systemState: "Operational",
  },
  equipment: {
    make: "Cummins",
    model: "NT-855-G6",
    type: "Generator",
    ratedCapacity: "350 kVA",
    serialNo: "-",
    engineNo: "25598493",
    location: "Plot C89, Amuwo Odofin Industrial Layout, Along Oshodi-Mile 2 Expressway, Lagos",
  },
  readings: [
    { label: "Gen. voltage (V)", value: "392", unit: "V" },
    { label: "Frequency (Hz)", value: "50", unit: "Hz" },
    { label: "Battery / Alt. (Vdc)", value: "27.3", unit: "V" },
    { label: "Temperature (°C)", value: "74", unit: "°C" },
    { label: "Pressure", value: "704", unit: "kPa" },
    { label: "Engine hours", value: "9329.4" },
  ],
  problemReported:
    "Generator recommended for routine service because it had exceeded 250 operating hours since the service interval.",
  serviceRendered:
    "Replaced fuel filter FS1212, oil filter LF9009, water filter WF2074, and 50 litres of engine oil. Tested the generator after servicing.",
  defectsFound:
    "The diesel tank has no air valve. Staff fold the fuel hose to stop fuel flow when required. This gradually damages and deforms the hose, restricting free fuel flow.",
  engineerRemarks:
    "The generator ran smoothly during testing at 1500 RPM. No oil leaks, fuel leaks, unusual smoke, or other issues were observed. Install an air valve on the diesel tank.",
  materials: [
    { description: "Fuel Filter FS1212", quantity: "2" },
    { description: "Oil Filter LF9009", quantity: "1" },
    { description: "Water Filter WF2074", quantity: "1" },
    { description: "Engine Oil", quantity: "50", unit: "Litres" },
  ],
  serviceEngineer: { name: "JAIYEOLA MONDAY", designation: "Technical director", signature: SIGNATURE_PLACEHOLDER },
  clientRepresentative: {},
  logo: LOGO_PLACEHOLDER,
};
