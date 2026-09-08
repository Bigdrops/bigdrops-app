/**
 * POC FIXTURE (INDUSTRY) — BIGDROPS Industry-granularity prepared model.
 *
 * Data ownership rule: this file performs NO financial math.
 * - Row and document totals come from production computeDocument().
 * - Money strings come from production formatPdfCurrencyString()
 *   (spaced ₦ variant used by the Industry template, not formatNaira).
 * - Group subtotals SUM PREPARED line amounts only, mirroring production
 *   resolvePreviewGroupSubtotal() semantics (adapter-level aggregation,
 *   never a recalculation).
 * - amountInWords, bank details, attachments, signature, custom fields are
 *   stored-field passthroughs (identity data), exactly as production reads
 *   them from the invoice record. Advance data is absent on purpose: the
 *   pdf-rendering-correctness skill forbids advance UI on main invoices.
 */
import { computeDocument } from "../../../../src/lib/Calculations.ts";
import { formatPdfCurrencyString } from "../../../../src/lib/formatters/pdfCurrency.ts";

export type IndustryRowModel =
  | { kind: "line"; sn: number; description: string; sub: string; qty: string; unit: string; unitPrice: string; amount: string }
  | { kind: "group_header"; label: string }
  | { kind: "group_footer"; subtotal: string };

export interface IndustryPocModel {
  title: string;
  customTitle: string | null;
  number: string;
  numberLabel: string;
  issueDate: string;
  dueDate: string;
  poNumber: string;
  customHeaderFields: Array<{ label: string; value: string }>;
  companyName: string;
  companyLines: string[];
  companyPhone: string;
  companyEmail: string;
  companyTaxId: string;
  companyTagline: string;
  recipientName: string;
  recipientAttention: string;
  recipientLines: string[];
  recipientPhone: string;
  recipientEmail: string;
  rows: IndustryRowModel[];
  totalLines: Array<{ label: string; display: string }>;
  mainTotal: { label: string; display: string };
  amountInWords: string;
  balanceDue: { label: string; display: string };
  bank: { bankName: string; accountName: string; accountNumber: string; sortCode: string };
  notesTitle: string;
  notes: string;
  termsTitle: string;
  terms: string;
  attachments: Array<{ label: string; url: string }>;
  additionalFields: Array<{ label: string; value: string }>;
  signatureName: string;
  signatureRole: string;
  footerExtra: string;
  tagline: string;
}

export interface IndustryFixture {
  model: IndustryPocModel;
  moneyStrings: string[];
}

const money = (v: number | string): string => formatPdfCurrencyString(v);

interface RawItem {
  description: string;
  sub: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number | null;
  discount_rate: number | null;
  group: string;
}

const GROUP_A = "General Goods";
const GROUP_B = "Services & Logistics";

const BASE_ITEMS: RawItem[] = [
  { description: "Dangote Cement 50kg Bag", sub: "Grade 42.5R, factory sealed", quantity: 200, unit: "bags", unit_price: 8500, vat_rate: null, discount_rate: null, group: GROUP_A },
  { description: "Berger Paint Emulsion 20L - Brilliant White", sub: "Low VOC interior finish", quantity: 45, unit: "pails", unit_price: 62500, vat_rate: null, discount_rate: null, group: GROUP_A },
  { description: "Interlocking Floor Tiles 40x40 - Terracotta", sub: "Frost resistant, 12 pcs per carton", quantity: 1200, unit: "pcs", unit_price: 2750, vat_rate: null, discount_rate: 10, group: GROUP_A },
  { description: "Iron Rod 12mm - Local Mill", sub: "High tensile, full length", quantity: 180, unit: "lengths", unit_price: 9200, vat_rate: null, discount_rate: null, group: GROUP_A },
  { description: "Agricultural Produce Transport (VAT exempt service)", sub: "Onitsha to Lagos, insured haulage", quantity: 12, unit: "trips", unit_price: 150000, vat_rate: 0, discount_rate: null, group: GROUP_B },
  { description: "Roofing Sheets 0.55mm Aluminium - Red", sub: "Long span, baked enamel coating", quantity: 320, unit: "m", unit_price: 14800, vat_rate: null, discount_rate: null, group: GROUP_B },
  { description: "PVC Water Tank 2000L - Black", sub: "Food grade, 5 year warranty", quantity: 18, unit: "units", unit_price: 185000, vat_rate: null, discount_rate: null, group: GROUP_B },
  { description: "Electrical Wiring Set - 2.5mm Copper Coil", sub: "Pure copper, flame retardant", quantity: 60, unit: "coils", unit_price: 32500, vat_rate: null, discount_rate: null, group: GROUP_B },
];

const COLUMNS = [
  { key: "num", visible: true, visibilityMode: "show" },
  { key: "description", visible: true, visibilityMode: "show" },
  { key: "quantity", visible: true, visibilityMode: "show" },
  { key: "unit", visible: true, visibilityMode: "show" },
  { key: "unit_price", visible: true, visibilityMode: "show" },
  { key: "amount", visible: true, visibilityMode: "show" },
  { key: "vat_rate", visible: true, visibilityMode: "show" },
  { key: "discount_rate", visible: true, visibilityMode: "show" },
  { key: "install_rate", visible: false, visibilityMode: "hide_display" },
] as Array<{ key: string; visible: boolean; visibilityMode: "show" | "hide_display" }>;

const CF = {
  calculationInputs: {
    vatPercent: 7.5,
    discountType: "percent",
    discountValue: 5,
    discountTiming: "before_tax",
    whtType: "percent",
    whtValue: 5,
  },
};

function toTitleCase(value: string): string {
  return value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function buildIndustryFixture(longTable = false): IndustryFixture {
  const groups = longTable
    ? Array.from({ length: 8 }, (_, batch) => ({
        label: batch % 2 === 0 ? `${GROUP_A} Batch ${batch + 1}` : `${GROUP_B} Batch ${batch + 1}`,
        items: BASE_ITEMS.map((item) => ({
          ...item,
          description: `${item.description} (B${batch + 1})`,
        })),
      }))
    : [
        { label: GROUP_A, items: BASE_ITEMS.filter((item) => item.group === GROUP_A) },
        { label: GROUP_B, items: BASE_ITEMS.filter((item) => item.group === GROUP_B) },
      ];

  const calcItems: any[] = [];
  for (const group of groups) {
    calcItems.push({ row_type: "group_header", group_id: group.label, group_name: group.label });
    for (const item of group.items) {
      calcItems.push({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate,
        discount_rate: item.discount_rate,
      });
    }
  }

  // ponytail: production math only.
  const result = computeDocument({ items: calcItems, document: {}, cf: CF, columns: COLUMNS });

  const moneyStrings: string[] = [];
  const track = (s: string): string => {
    moneyStrings.push(s);
    return s;
  };

  const computedLines = result.items.filter((entry) => entry.row_type === "standard");
  let lineIndex = 0;
  let sn = 0;
  const rows: IndustryRowModel[] = [];
  for (const group of groups) {
    rows.push({ kind: "group_header", label: toTitleCase(group.label) });
    // Group subtotal mirrors resolvePreviewGroupSubtotal: sum of PREPARED
    // visible line totals for the group, formatted by production formatter.
    let groupSum = 0;
    const groupStart = lineIndex;
    for (const item of group.items) {
      const computed = computedLines[lineIndex];
      groupSum += computed.visible_line_total;
      sn += 1;
      rows.push({
        kind: "line",
        sn,
        description: item.description,
        sub: item.sub,
        qty: String(computed.quantity),
        unit: item.unit,
        unitPrice: track(money(computed.unit_price)),
        amount: track(money(computed.visible_line_total)),
      });
      lineIndex += 1;
    }
    void groupStart;
    rows.push({ kind: "group_footer", subtotal: track(money(groupSum)) });
  }

  const totalLines = [
    { label: "Subtotal", display: track(money(result.subtotal)) },
    { label: "Discount", display: track(money(result.discount)) },
    { label: "VAT (7.5%)", display: track(money(result.vat)) },
    { label: "WHT (5%)", display: track(money(result.wht)) },
  ];
  const mainTotal = { label: "Total Payable", display: track(money(result.totalPayable)) };
  // Stored-field passthroughs (identity data, same as production reads them).
  const amountInWords = longTable
    ? "As computed per attached schedule"
    : "Twenty Million Four Hundred and Twenty-Eight Thousand Four Hundred and Six Naira Eighty-Eight Kobo Only";
  const balanceDue = { label: "Balance Due", display: track(money(result.totalPayable)) };

  const model: IndustryPocModel = {
    title: "INVOICE",
    customTitle: null,
    number: "INV-2026-0042",
    numberLabel: "Invoice Number",
    issueDate: "2026-09-01",
    dueDate: "2026-09-15",
    poNumber: "PO-2026-118",
    customHeaderFields: [{ label: "Sales Rep", value: "A. Bello" }],
    companyName: "Adaba Trading Enterprises",
    companyLines: ["14 Allen Avenue, Ikeja", "Lagos, Nigeria"],
    companyPhone: "+234 803 123 4567",
    companyEmail: "sales@adaba-trading.ng",
    companyTaxId: "TIN 12345678-0001",
    companyTagline: "Quality goods, honest prices.",
    recipientName: "Chukwuemeka Retail Stores",
    recipientAttention: "Attn: Mr. Obi Chukwuemeka",
    recipientLines: ["7 Main Market Road, Onitsha", "Anambra, Nigeria"],
    recipientPhone: "+234 805 987 6543",
    recipientEmail: "orders@chukwuemeka-retail.ng",
    rows,
    totalLines,
    mainTotal,
    amountInWords,
    balanceDue,
    bank: {
      bankName: "First Bank of Nigeria",
      accountName: "Adaba Trading Enterprises",
      accountNumber: "2034567890",
      sortCode: "011151122",
    },
    notesTitle: "Notes",
    notes: "Goods sold are not returnable after 7 days. Please confirm receipt of all items on delivery.",
    termsTitle: "Terms and Conditions",
    terms: "Payment is due within 14 days of the issue date. A 2% monthly charge applies to overdue balances.",
    attachments: [
      { label: "Delivery Note DN-2026-118", url: "https://files.example.ng/dn-2026-118" },
      { label: "Proforma Q-2026-091", url: "https://files.example.ng/q-2026-091" },
    ],
    additionalFields: [{ label: "Project", value: "Victoria Island Fit-Out" }],
    signatureName: "Engr. S. Adeyemi",
    signatureRole: "Sales Manager",
    footerExtra: "Thank you for your business.",
    tagline: "Quality goods, honest prices.",
  };

  return { model, moneyStrings };
}
