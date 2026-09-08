/**
 * POC FIXTURE — deterministic representative commercial invoice.
 *
 * Data ownership rule: this file performs NO financial math.
 * All money values come from the production source of truth:
 *   computeDocument() in src/lib/Calculations.ts
 * All money strings come from the production formatter:
 *   formatNaira() in src/lib/formatters/money.ts
 * The POC only maps prepared values into a prepared presentation model
 * (subset of the production InvoicePdfModel shape).
 */
import { computeDocument } from "../../../../src/lib/Calculations.ts";
import { formatNaira } from "../../../../src/lib/formatters/money.ts";

export interface PocPreparedRow {
  key: string;
  description: string;
  qty: string;
  unit: string;
  unitPrice: string;
  amount: string;
}

export interface PocPreparedModel {
  number: string;
  title: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  issuerName: string;
  issuerLines: string[];
  issuerPhone: string;
  issuerEmail: string;
  issuerTaxId: string;
  recipientName: string;
  recipientAttention: string;
  recipientLines: string[];
  recipientPhone: string;
  recipientEmail: string;
  rows: PocPreparedRow[];
  totals: Array<{ label: string; display: string; raw: number; emphasis?: boolean }>;
  notesTitle: string;
  notes: string;
  termsTitle: string;
  terms: string;
  footerText: string;
  tagline: string;
  companyName: string;
}

export interface PocFixture {
  model: PocPreparedModel;
  /** Every displayed money string, for exact-match assertions. */
  moneyStrings: string[];
  computed: {
    subtotal: number;
    discount: number;
    vat: number;
    wht: number;
    grandTotal: number;
    totalPayable: number;
  };
}

const money = (v: number | string): string =>
  formatNaira(v, { preserveFraction: true });

const BASE_ITEMS = [
  { description: "Dangote Cement 50kg Bag", quantity: 200, unit: "bags", unit_price: 8500, vat_rate: null as number | null, discount_rate: null as number | null },
  { description: "Berger Paint Emulsion 20L - Brilliant White", quantity: 45, unit: "pails", unit_price: 62500, vat_rate: null, discount_rate: null },
  { description: "Interlocking Floor Tiles 40x40 - Terracotta", quantity: 1200, unit: "pcs", unit_price: 2750, vat_rate: null, discount_rate: 10 },
  { description: "Iron Rod 12mm - Local Mill", quantity: 180, unit: "lengths", unit_price: 9200, vat_rate: null, discount_rate: null },
  { description: "Agricultural Produce Transport (VAT exempt service)", quantity: 12, unit: "trips", unit_price: 150000, vat_rate: 0, discount_rate: null },
  { description: "Roofing Sheets 0.55mm Aluminium - Red", quantity: 320, unit: "m", unit_price: 14800, vat_rate: null, discount_rate: null },
  { description: "PVC Water Tank 2000L - Black", quantity: 18, unit: "units", unit_price: 185000, vat_rate: null, discount_rate: null },
  { description: "Electrical Wiring Set - 2.5mm Copper Coil", quantity: 60, unit: "coils", unit_price: 32500, vat_rate: null, discount_rate: null },
];

const VISIBLE_COLUMNS = [
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

export function buildPocFixture(longTable = false): PocFixture {
  const rawItems = longTable
    ? Array.from({ length: 8 }, (_, batch) =>
        BASE_ITEMS.map((item) => ({
          ...item,
          description: batch === 0 ? item.description : `${item.description} (Batch ${batch + 1})`,
        })),
      ).flat()
    : BASE_ITEMS.map((item) => ({ ...item }));

  // ponytail: production math only — the POC never computes its own totals.
  const result = computeDocument({
    items: rawItems,
    document: {},
    cf: CF,
    columns: VISIBLE_COLUMNS,
  });

  const moneyStrings: string[] = [];
  const track = (s: string): string => {
    moneyStrings.push(s);
    return s;
  };

  const rows: PocPreparedRow[] = result.items.map((computed, index) => {
    const source = rawItems[index];
    return {
      key: `row-${index}`,
      description: String(source.description),
      qty: String(computed.quantity),
      unit: String(source.unit),
      unitPrice: track(money(computed.unit_price)),
      amount: track(money(computed.visible_line_total)),
    };
  });

  const totals = [
    { label: "Subtotal", display: track(money(result.subtotal)), raw: result.subtotal },
    { label: "Discount", display: track(money(result.discount)), raw: result.discount },
    { label: "VAT (7.5%)", display: track(money(result.vat)), raw: result.vat },
    { label: "WHT (5%)", display: track(money(result.wht)), raw: result.wht },
    { label: "Total Payable", display: track(money(result.totalPayable)), raw: result.totalPayable, emphasis: true },
  ];

  const model: PocPreparedModel = {
    number: "INV-2026-0042",
    title: "Invoice",
    issueDate: "2026-09-01",
    dueDate: "2026-09-15",
    currency: "NGN",
    issuerName: "Adaba Trading Enterprises",
    issuerLines: ["14 Allen Avenue, Ikeja", "Lagos, Nigeria"],
    issuerPhone: "+234 803 123 4567",
    issuerEmail: "sales@adaba-trading.ng",
    issuerTaxId: "TIN 12345678-0001",
    recipientName: "Chukwuemeka Retail Stores",
    recipientAttention: "Attn: Mr. Obi Chukwuemeka",
    recipientLines: ["7 Main Market Road, Onitsha", "Anambra, Nigeria"],
    recipientPhone: "+234 805 987 6543",
    recipientEmail: "orders@chukwuemeka-retail.ng",
    rows,
    totals,
    notesTitle: "Notes",
    notes: "Goods sold are not returnable after 7 days. Please confirm receipt of all items on delivery.",
    termsTitle: "Terms and Conditions",
    terms: "Payment is due within 14 days of the issue date. A 2% monthly charge applies to overdue balances.",
    footerText: "Thank you for your business.",
    tagline: "Quality goods, honest prices.",
    companyName: "Adaba Trading Enterprises",
  };

  return {
    model,
    moneyStrings,
    computed: {
      subtotal: result.subtotal,
      discount: result.discount,
      vat: result.vat,
      wht: result.wht,
      grandTotal: result.grandTotal,
      totalPayable: result.totalPayable,
    },
  };
}
