import type { ReactNode } from "react";
import { Document, Fixed, Page, Svg, Text, View } from "@formepdf/react";
import type { Style } from "@formepdf/react";
import type { SvgAsset } from "@/lib/csr-assets";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface CsrMaterial {
  description: string;
  quantity: string;
  unit?: string;
}

export interface CsrReportData {
  reportNo: string;
  reportDate: string;
  status: string;
  company: { name: string; addressLine: string; contactLine: string };
  client: {
    name: string;
    corporateAddress: string;
    callType: string;
    serviceBasis: string;
    serviceDate: string;
    systemState: string;
  };
  equipment: {
    make: string;
    model: string;
    type: string;
    ratedCapacity: string;
    serialNo: string;
    engineNo: string;
    location: string;
  };
  readings: { label: string; value: string; unit?: string }[]; // 6 items
  problemReported: string;
  serviceRendered: string;
  defectsFound: string;
  engineerRemarks: string;
  materials: CsrMaterial[];
  serviceEngineer: { name: string; designation: string; signature?: SvgAsset };
  clientRepresentative?: { name?: string; designation?: string; signature?: SvgAsset };
  logo?: SvgAsset;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Tokens (Command · industrial control)                               */
/* ------------------------------------------------------------------ */

const C = { k: "#111111", g: "#E6E6E6", m: "#555555", y: "#F2B705", w: "#FFFFFF", z: "#EFEFEF" };
const PAGE_W = 595.28 - 2 * 28; // A4 minus margins
const BOLD = { fontWeight: "bold" } as const;
const MONO = { fontFamily: "Courier", fontWeight: "bold" } as const;

const label: Style = {
  fontSize: 5.6,
  fontWeight: "bold",
  color: C.m,
  textTransform: "uppercase",
  letterSpacing: 0.6,
};

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

type Pt = [number, number];

/** Clip a polygon to the vertical band x ∈ [0, max] (Sutherland–Hodgman). */
function clipX(poly: Pt[], max: number): Pt[] {
  const clip = (pts: Pt[], inside: (p: Pt) => boolean, cut: (a: Pt, b: Pt) => Pt) => {
    const out: Pt[] = [];
    pts.forEach((cur, i) => {
      const prev = pts[(i + pts.length - 1) % pts.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cut(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(cut(prev, cur));
    });
    return out;
  };
  const at = (x: number) => (a: Pt, b: Pt): Pt => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
  let r = clip(poly, (p) => p[0] >= 0, at(0));
  if (r.length) r = clip(r, (p) => p[0] <= max, at(max));
  return r;
}

function HazardStripe({ width = PAGE_W, height = 7, step = 12 }: { width?: number; height?: number; step?: number }) {
  // Diagonal black/yellow bars drawn as vector polygons (no gradients, so the
  // stripe survives every viewer and grayscale printing).
  const shapes: string[] = [`<rect x="0" y="0" width="${width}" height="${height}" fill="${C.y}"/>`];
  for (let x = -height; x < width; x += step) {
    const w = step / 2;
    const poly = clipX(
      [[x, height], [x + w, height], [x + w + height, 0], [x + height, 0]],
      width,
    );
    if (poly.length > 2) {
      shapes.push(`<polygon points="${poly.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ")}" fill="${C.k}"/>`);
    }
  }
  return <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} content={shapes.join("")} alt="" />;
}

function SectionHead({ no, title, aside }: { no: string; title: string; aside?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        borderTopWidth: 3.4,
        borderTopColor: C.k,
        paddingTop: 1,
        marginTop: 7.5,
        marginBottom: 4,
      }}
    >
      <Text style={{ ...BOLD, fontSize: 14, width: 26, color: C.k }}>{no}</Text>
      <Text style={{ ...BOLD, fontSize: 8.6, textTransform: "uppercase", flex: 1, paddingBottom: 1.5 }}>{title}</Text>
      {aside ? <Text style={{ ...label, paddingBottom: 2 }}>{aside}</Text> : null}
    </View>
  );
}

function Field({ k, v, mono, last }: { k: string; v: string; mono?: boolean; last?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderBottomWidth: last ? 0 : 0.8,
        borderBottomColor: C.k,
      }}
    >
      <View style={{ width: 70, backgroundColor: C.g, padding: "4 6", justifyContent: "center" }}>
        <Text style={label}>{k}</Text>
      </View>
      <View style={{ flex: 1, padding: "4 6", justifyContent: "center" }}>
        <Text style={{ fontSize: 7.4, lineHeight: 1.25, ...BOLD, ...(mono ? MONO : {}) }}>{v}</Text>
      </View>
    </View>
  );
}

function Panel({ children, style }: { children: ReactNode; style?: Style }) {
  return <View style={{ borderWidth: 2.2, borderColor: C.k, ...style }}>{children}</View>;
}

const body: Style = { fontSize: 7.9, lineHeight: 1.38 };

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function Masthead({ d }: { d: CsrReportData }) {
  return (
    <View>
      <View style={{ flexDirection: "row", backgroundColor: C.k }}>
        <View
          style={{
            width: 54,
            height: 54,
            margin: 8,
            backgroundColor: C.w,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {d.logo ? (
            <Svg width={40} height={40} viewBox={d.logo.viewBox} content={d.logo.content} alt={`${d.company.name} logo`} />
          ) : null}
        </View>
        <View style={{ flex: 1, paddingTop: 9, paddingRight: 8 }}>
          <Text style={{ ...BOLD, fontSize: 14, color: C.w }}>{d.company.name}</Text>
          <Text style={{ fontSize: 7.2, color: "#D8D8D8", marginTop: 3 }}>{d.company.addressLine}</Text>
          <Text style={{ fontSize: 7.2, color: "#D8D8D8", marginTop: 1 }}>{d.company.contactLine}</Text>
        </View>
        <View style={{ width: 186, backgroundColor: C.y, padding: "9 11", justifyContent: "space-between" }}>
          <Text style={{ ...BOLD, fontSize: 9.4, textTransform: "uppercase" }}>Customer Service Report</Text>
          <Text style={{ ...MONO, fontSize: 14 }}>{d.reportNo}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ ...BOLD, fontSize: 7.6, textTransform: "uppercase" }}>{d.reportDate}</Text>
            <Text style={{ ...BOLD, fontSize: 7.6, textTransform: "uppercase" }}>{d.status}</Text>
          </View>
        </View>
      </View>
      <HazardStripe />
      {d.note ? (
        <Text style={{ ...label, fontSize: 5.4, marginTop: 4 }}>{d.note}</Text>
      ) : null}
    </View>
  );
}

function ClientPanel({ d }: { d: CsrReportData }) {
  const c = d.client;
  return (
    <View style={{ flex: 1.1 }}>
      <SectionHead no="01" title="Client Information" />
      <Panel>
        <View style={{ padding: "6 7", borderBottomWidth: 2.2, borderBottomColor: C.k }}>
          <Text style={{ ...BOLD, fontSize: 10 }}>{c.name}</Text>
        </View>
        <Field k="Corporate address" v={c.corporateAddress} />
        <Field k="Call type" v={c.callType} />
        <Field k="Service basis" v={c.serviceBasis} />
        <Field k="Service date" v={c.serviceDate} mono />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: C.k,
            padding: "5 7",
          }}
        >
          <Text style={{ ...label, color: "#CCCCCC" }}>System state</Text>
          <Text style={{ ...BOLD, fontSize: 10, color: C.y, textTransform: "uppercase" }}>{c.systemState}</Text>
        </View>
      </Panel>
    </View>
  );
}

function EquipmentPanel({ d }: { d: CsrReportData }) {
  const e = d.equipment;
  return (
    <View style={{ flex: 1 }}>
      <SectionHead no="02" title="Equipment Information" />
      <Panel>
        <View style={{ flexDirection: "row", borderBottomWidth: 2.2, borderBottomColor: C.k }}>
          <View style={{ flex: 1, padding: "5 7", borderRightWidth: 2.2, borderRightColor: C.k }}>
            <Text style={label}>Make &amp; model</Text>
            <Text style={{ ...BOLD, fontSize: 7.6, marginTop: 1 }}>{e.make}</Text>
            <Text style={{ ...BOLD, fontSize: 19, marginTop: 1 }}>{e.model}</Text>
          </View>
          <View style={{ flex: 1, padding: "5 7" }}>
            <Text style={label}>Rated capacity</Text>
            <Text style={{ ...BOLD, fontSize: 13, marginTop: 1 }}>{e.ratedCapacity}</Text>
            <Text style={{ ...label, marginTop: 5 }}>Equipment type</Text>
            <Text style={{ ...BOLD, fontSize: 7.6, marginTop: 1 }}>{e.type}</Text>
          </View>
        </View>
        <Field k="Serial no." v={e.serialNo} mono />
        <Field k="Engine no." v={e.engineNo} mono />
        <Field k="Site / equipment location" v={e.location} last />
      </Panel>
    </View>
  );
}

function Readings({ d }: { d: CsrReportData }) {
  return (
    <View>
      <SectionHead no="03" title="Operational Readings" />
      <View
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
          borderWidth: 2.2,
          borderColor: C.k,
        }}
      >
        {d.readings.map((r, i) => (
          <View
            key={r.label}
            style={{
              padding: "4 6 5 6",
              borderLeftWidth: i === 0 ? 0 : 0.8,
              borderLeftColor: C.k,
            }}
          >
            <Text style={label}>{r.label}</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 2 }}>
              <Text style={{ ...BOLD, fontSize: 12.5 }}>{r.value}</Text>
              {r.unit ? <Text style={{ ...BOLD, fontSize: 6.8, marginLeft: 2, paddingBottom: 1.5 }}>{r.unit}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function Narratives({ d }: { d: CsrReportData }) {
  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      <View style={{ flex: 1 }}>
        <SectionHead no="04" title="Problem reported" />
        <Text style={body}>{d.problemReported}</Text>
        <SectionHead no="05" title="Service rendered" />
        <Text style={body}>{d.serviceRendered}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <SectionHead no="06" title="Observations & defects found" />
        <View style={{ borderWidth: 1, borderColor: C.k, borderLeftWidth: 5, padding: "5 7" }}>
          <Text style={body}>{d.defectsFound}</Text>
        </View>
        <SectionHead no="07" title="Engineer's remarks" />
        <View style={{ borderWidth: 2, borderColor: C.k, backgroundColor: C.g, padding: "5 7" }}>
          <Text style={body}>{d.engineerRemarks}</Text>
        </View>
      </View>
    </View>
  );
}

function Materials({ items }: { items: CsrMaterial[] }) {
  const cols = 4;
  return (
    <View wrap={false}>
      <SectionHead no="08" title="Parts & Materials Schedule" aside={`${items.length} items`} />
      <View
        style={{
          display: "grid",
          gridTemplateColumns: Array(cols).fill("1fr").join(" "),
          borderWidth: 2.2,
          borderColor: C.k,
        }}
      >
        {items.map((m, i) => (
          <View
            key={m.description}
            style={{
              flexDirection: "row",
              minHeight: 34,
              backgroundColor: i % 2 === 1 ? C.z : C.w,
              borderLeftWidth: i % cols === 0 ? 0 : 1.4,
              borderLeftColor: C.k,
              borderTopWidth: i >= cols ? 0.8 : 0,
              borderTopColor: C.k,
            }}
          >
            <View style={{ width: 21, backgroundColor: C.k, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ ...MONO, fontSize: 7.2, color: C.w }}>{String(i + 1).padStart(2, "0")}</Text>
            </View>
            <View style={{ flex: 1, padding: "5 6", justifyContent: "space-between" }}>
              <Text style={{ ...BOLD, fontSize: 7.8, lineHeight: 1.25 }}>{m.description}</Text>
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={label}>Quantity</Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                  <Text style={{ ...MONO, fontSize: 12 }}>{m.quantity}</Text>
                  {m.unit ? (
                    <Text style={{ ...BOLD, fontSize: 6.6, textTransform: "uppercase", marginLeft: 3, paddingBottom: 1.5 }}>
                      {m.unit}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function SignLine({ k, v }: { k: string; v?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", marginHorizontal: 8, height: 17 }}>
      <Text style={{ ...label, width: 62, paddingBottom: 2 }}>{k}</Text>
      <View style={{ flex: 1, borderBottomWidth: 0.8, borderBottomColor: C.k, paddingBottom: 2 }}>
        <Text style={{ ...BOLD, fontSize: 7.8 }}>{v ?? " "}</Text>
      </View>
    </View>
  );
}

function SignPanel({
  title,
  person,
}: {
  title: string;
  person: { name?: string; designation?: string; signature?: SvgAsset };
}) {
  return (
    <View wrap={false} style={{ flex: 1, borderWidth: 2.2, borderColor: C.k, paddingBottom: 6 }}>
      <View style={{ backgroundColor: C.k, padding: "3 8" }}>
        <Text style={{ ...BOLD, fontSize: 7, color: C.w, textTransform: "uppercase", letterSpacing: 0.7 }}>{title}</Text>
      </View>
      <Text style={{ ...label, margin: "5 8 0 8" }}>Signature</Text>
      <View
        style={{
          height: 50,
          marginHorizontal: 8,
          borderBottomWidth: 1.1,
          borderBottomColor: C.k,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {person.signature ? (
          <Svg
            width={96}
            height={48}
            viewBox={person.signature.viewBox}
            content={person.signature.content}
            alt={`Signature of ${person.name ?? title}`}
          />
        ) : null}
      </View>
      <SignLine k="Full name" v={person.name} />
      <SignLine k="Designation" v={person.designation} />
      <SignLine k="Date" />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Document                                                            */
/* ------------------------------------------------------------------ */

export function CommandCsrReport({ data: d }: { data: CsrReportData }) {
  return (
    <Document title={`${d.reportNo} — Customer Service Report`} author={d.company.name} lang="en-NG">
      <Page size="A4" margin={{ top: 26, right: 28, bottom: 34, left: 28 }} style={{ fontFamily: "Helvetica", color: C.k }}>
        <Masthead d={d} />

        <View style={{ flexDirection: "row", gap: 14 }}>
          <ClientPanel d={d} />
          <EquipmentPanel d={d} />
        </View>

        <Readings d={d} />
        <Narratives d={d} />
        <Materials items={d.materials} />

        <View wrap={false}>
          <SectionHead no="09" title="Sign-off" />
          <View style={{ flexDirection: "row", gap: 14 }}>
            <SignPanel title="Service Engineer" person={d.serviceEngineer} />
            <SignPanel title="Client Representative" person={d.clientRepresentative ?? {}} />
          </View>
        </View>

        <Fixed position="footer">
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ ...BOLD, fontSize: 6.2, textTransform: "uppercase" }}>{d.company.name}</Text>
            <Text style={{ ...BOLD, fontSize: 6.2, textTransform: "uppercase" }}>REF: {d.reportNo}</Text>
          </View>
        </Fixed>
      </Page>
    </Document>
  );
}
