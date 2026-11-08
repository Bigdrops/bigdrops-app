/**
 * CommercialTemplateMiniature — representative miniature per commercial
 * Forme template (Section 10.2 Option C of functional-req.md).
 *
 * Pure presentational component: fixed sample content ("INVOICE /
 * INV-001"), no live invoice data, no PDF generation, no network.
 * Each case mirrors its Forme renderer zones and tokens
 * (header, parties, table, totals, notes/footer) at the shared
 * 80px picker footprint. Extensible: new templates add one case.
 */

export type CommercialTemplateId =
  | 'industrial'
  | 'industry'
  | 'minimal'
  | 'landscape'
  | 'evergreen'
  | 'architectural'
  | 'executive'
  | 'heritage'

const SHELL = 'flex h-[80px] flex-col overflow-hidden rounded-[12px]'

function Bar(props: {
  w: string
  h?: number
  bg: string
  opacity?: number
  radius?: number
}) {
  return (
    <div
      style={{
        width: props.w,
        height: props.h ?? 3,
        backgroundColor: props.bg,
        opacity: props.opacity ?? 1,
        borderRadius: props.radius ?? 2,
      }}
    />
  )
}

function MiniTable(props: {
  headerBg: string
  headerFg: string
  rowBg: string[]
  border: string
  lastBottom?: number
}) {
  const cols = ['46%', '16%', '16%', '22%']
  return (
    <div style={{ border: `0.5px solid ${props.border}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', backgroundColor: props.headerBg }}>
        {cols.map((w, i) => (
          <div
            key={`h-${i}`}
            style={{
              width: w,
              height: 7,
              backgroundColor: props.headerBg,
              borderRight: i < cols.length - 1 ? `0.5px solid ${props.border}` : 'none',
              color: props.headerFg,
              fontSize: 4.2,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.3,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 3,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {i === 0 ? 'Item' : i === 3 ? 'Amt' : '·'}
          </div>
        ))}
      </div>
      {props.rowBg.map((bg, r) => (
        <div
          key={`r-${r}`}
          style={{
            display: 'flex',
            backgroundColor: bg,
            borderTop: `0.5px solid ${props.border}`,
            borderBottom: r === props.rowBg.length - 1 ? 'none' : `0.5px solid ${props.border}`,
          }}
        >
          {cols.map((w, i) => (
            <div
              key={`c-${r}-${i}`}
              style={{
                width: w,
                height: props.lastBottom && r === props.rowBg.length - 1 ? props.lastBottom : 6,
                borderRight: i < cols.length - 1 ? `0.5px solid ${props.border}` : 'none',
                padding: '1.5px 3px',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  height: 2,
                  width: i === 0 ? '92%' : '70%',
                  marginLeft: i === 3 ? 'auto' : 0,
                  backgroundColor: props.border,
                  opacity: i === 0 ? 0.7 : 0.5,
                  borderRadius: 1,
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function FooterBand(props: { border: string; bg?: string; left: string; center: string; right: string; color?: string }) {
  return (
    <div
      style={{
        marginTop: 'auto',
        borderTop: `0.5px solid ${props.border}`,
        backgroundColor: props.bg,
        display: 'flex',
        alignItems: 'center',
        padding: '2.5px 6px',
        gap: 4,
      }}
    >
      <span style={{ flex: 1, fontSize: 4, color: props.color ?? '#64748b', fontFamily: 'Inter, sans-serif' }}>
        {props.left}
      </span>
      <span style={{ flex: 1, textAlign: 'center', fontSize: 4, fontWeight: 600, color: props.color ?? '#64748b', fontFamily: 'Inter, sans-serif' }}>
        {props.center}
      </span>
      <span style={{ flex: 1, textAlign: 'right', fontSize: 4, color: props.color ?? '#64748b', fontFamily: 'Inter, sans-serif' }}>
        {props.right}
      </span>
    </div>
  )
}

function IndustrialMini() {
  return (
    <div className={SHELL} style={{ backgroundColor: '#F6F6F2', border: '1.5px solid #1D2528', padding: 3, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: 3 }}>
        <div style={{ flex: 1.35, backgroundColor: '#1D2528', padding: '3px 5px' }}>
          <div style={{ fontSize: 6.5, fontWeight: 800, color: '#fff', letterSpacing: 0.8, fontFamily: 'Archivo Black, sans-serif' }}>INVOICE</div>
          <div style={{ height: 2, backgroundColor: '#DC5A21', marginTop: 2 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ backgroundColor: '#fff', border: '0.5px solid #1D2528', padding: '1.5px 3px', fontSize: 4, fontWeight: 700, color: '#1D2528', fontFamily: 'Inter, sans-serif' }}>INV-001</div>
          <div style={{ backgroundColor: '#ECEEEA', padding: '1.5px 3px', fontSize: 4, color: '#5D6B70', fontFamily: 'Inter, sans-serif' }}>08 Nov 2026</div>
        </div>
      </div>
      <div style={{ height: 2, backgroundColor: '#1D2528', marginTop: 3 }} />
      <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
        <div style={{ flex: 1, border: '0.5px solid #AEB6B4', padding: 2.5, backgroundColor: '#fff' }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#DC5A21', fontFamily: 'Inter, sans-serif' }}>FROM</div>
          <Bar w="70%" h={3} bg="#1D2528" opacity={0.7} />
          <Bar w="90%" h={2} bg="#5D6B70" opacity={0.5} />
        </div>
        <div style={{ flex: 1, border: '0.5px solid #AEB6B4', padding: 2.5, backgroundColor: '#fff' }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#DC5A21', fontFamily: 'Inter, sans-serif' }}>BILL TO</div>
          <Bar w="65%" h={3} bg="#1D2528" opacity={0.7} />
          <Bar w="85%" h={2} bg="#5D6B70" opacity={0.5} />
        </div>
      </div>
      <div style={{ marginTop: 3 }}>
        <MiniTable headerBg="#1D2528" headerFg="#fff" rowBg={['#fff', '#ECEEEA']} border="#1D2528" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
        <div style={{ backgroundColor: '#DC5A21', color: '#fff', fontSize: 5, fontWeight: 800, padding: '2.5px 8px', fontFamily: 'Inter, sans-serif' }}>
          TOTAL ₦125,000
        </div>
      </div>
      <FooterBand border="#1D2528" bg="#ECEEEA" left="Company Ltd" center="Page 1 of 1" right="INV-001" />
    </div>
  )
}

function IndustryMini() {
  return (
    <div className={SHELL} style={{ backgroundColor: '#fff', border: '0.5px solid #E2E8F0', padding: '4px 5px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#1E293B', letterSpacing: 0.4, fontFamily: 'Inter, sans-serif' }}>INVOICE</div>
          <div style={{ fontSize: 4, color: '#64748B', fontFamily: 'Inter, sans-serif', marginTop: 1.5 }}>No. INV-001 · 08 Nov 2026</div>
          <div style={{ fontSize: 4, color: '#64748B', fontFamily: 'Inter, sans-serif' }}>Due 22 Nov 2026</div>
        </div>
        <div style={{ width: 16, height: 16, backgroundColor: '#F1F5F9', border: '0.5px solid #E2E8F0', borderRadius: 2 }} />
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
        <div style={{ flex: 1, backgroundColor: '#F8FAFC', border: '0.5px solid #E2E8F0', borderRadius: 3, padding: 2.5 }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#7D8A88', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>From</div>
          <Bar w="70%" h={3} bg="#1E293B" opacity={0.7} />
          <Bar w="85%" h={2} bg="#64748B" opacity={0.5} />
        </div>
        <div style={{ flex: 1, backgroundColor: '#F8FAFC', border: '0.5px solid #E2E8F0', borderRadius: 3, padding: 2.5 }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#7D8A88', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>To</div>
          <Bar w="65%" h={3} bg="#1E293B" opacity={0.7} />
          <Bar w="80%" h={2} bg="#64748B" opacity={0.5} />
        </div>
      </div>
      <div style={{ marginTop: 3 }}>
        <MiniTable headerBg="#7D8A88" headerFg="#fff" rowBg={['#fff', '#F8FAFC']} border="#E2E8F0" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
        <div style={{ backgroundColor: '#7D8A88', color: '#fff', fontSize: 5, fontWeight: 700, padding: '2.5px 8px', borderRadius: 2, fontFamily: 'Inter, sans-serif' }}>TOTAL ₦125,000</div>
      </div>
      <FooterBand border="#E2E8F0" left="Company Ltd" center="Page 1 of 1" right="INV-001" />
    </div>
  )
}

function MinimalMini() {
  return (
    <div className={SHELL} style={{ backgroundColor: '#fff', border: '0.5px solid #E8E8E8', padding: '4px 5px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #D4D4D4', paddingBottom: 3 }}>
        <div>
          <div style={{ fontSize: 7.5, fontWeight: 700, color: '#1A1A1A', letterSpacing: 1, fontFamily: 'Inter, sans-serif' }}>INVOICE</div>
          <div style={{ fontSize: 4, color: '#6B6B6B', fontFamily: 'Inter, sans-serif', marginTop: 1 }}>Company Ltd</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 4.2, fontWeight: 700, color: '#1A1A1A', fontFamily: 'Inter, sans-serif' }}>INV-001</div>
          <div style={{ fontSize: 4, color: '#6B6B6B', fontFamily: 'Inter, sans-serif' }}>08 Nov 2026</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#8A8A8A', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>From</div>
          <Bar w="70%" h={3} bg="#1A1A1A" opacity={0.65} />
          <Bar w="90%" h={2} bg="#6B6B6B" opacity={0.45} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#8A8A8A', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Bill To</div>
          <Bar w="65%" h={3} bg="#1A1A1A" opacity={0.65} />
          <Bar w="85%" h={2} bg="#6B6B6B" opacity={0.45} />
        </div>
      </div>
      <div style={{ marginTop: 3, borderTop: '1px solid #D4D4D4' }}>
        <div style={{ display: 'flex', padding: '2px 0', borderBottom: '0.5px solid #E8E8E8' }}>
          <span style={{ flex: 2, fontSize: 4, fontWeight: 700, color: '#1A1A1A', fontFamily: 'Inter, sans-serif' }}>Item</span>
          <span style={{ flex: 1, fontSize: 4, color: '#6B6B6B', textAlign: 'right', fontFamily: 'Inter, sans-serif' }}>Amount</span>
        </div>
        <Bar w="96%" h={2} bg="#6B6B6B" opacity={0.4} />
        <Bar w="78%" h={2} bg="#6B6B6B" opacity={0.35} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
        <div style={{ fontSize: 5.5, fontWeight: 800, color: '#1A1A1A', fontFamily: 'Inter, sans-serif' }}>TOTAL ₦125,000</div>
      </div>
      <FooterBand border="#D4D4D4" left="Company Ltd" center="Page 1 of 1" right="INV-001" color="#8A8A8A" />
    </div>
  )
}

function LandscapeMini() {
  return (
    <div className={SHELL} style={{ backgroundColor: '#fff', border: '0.5px solid #9CB4C9', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', borderBottom: '0.5px solid #9CB4C9', height: 7 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              borderRight: i < 11 ? '0.5px solid #DCE6EF' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 3.5,
              fontWeight: 700,
              color: '#4F667A',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div style={{ padding: '3px 5px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', border: '0.8px solid #07192B', overflow: 'hidden' }}>
          <div style={{ flex: 1.45, padding: 3, backgroundColor: '#fff' }}>
            <div style={{ fontSize: 3.8, fontWeight: 700, color: '#4F667A', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>From</div>
            <Bar w="62%" h={3.5} bg="#07192B" opacity={0.85} />
            <Bar w="88%" h={2} bg="#4F667A" opacity={0.5} />
          </div>
          <div style={{ flex: 1, backgroundColor: '#07192B', padding: 3, borderLeft: '0.8px solid #07192B' }}>
            <div style={{ fontSize: 6, fontWeight: 800, color: '#fff', letterSpacing: 0.4, fontFamily: 'Inter, sans-serif' }}>INVOICE</div>
            <div style={{ height: 2, width: 22, backgroundColor: '#B84A14', marginTop: 1.5 }} />
            <div style={{ fontSize: 5, fontWeight: 700, color: '#fff', fontFamily: 'Inter, sans-serif', marginTop: 1.5 }}>INV-001</div>
          </div>
        </div>
        <div
          style={{
            marginTop: 3,
            backgroundColor: '#0F3156',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 5px',
          }}
        >
          <span style={{ fontSize: 4, fontWeight: 700, color: '#fff', letterSpacing: 0.8, fontFamily: 'Inter, sans-serif' }}>
            SUMMARY · 3 ITEMS
          </span>
          <span style={{ fontSize: 4, color: '#9CB4C9', fontFamily: 'Inter, sans-serif' }}>Items</span>
        </div>
        <div style={{ marginTop: 2.5 }}>
          <MiniTable headerBg="#07192B" headerFg="#DBE8F2" rowBg={['#fff', '#F7FAFC']} border="#9CB4C9" />
        </div>
        <div style={{ display: 'flex', gap: 3, marginTop: 2.5 }}>
          <div style={{ flex: 1.4, border: '0.5px solid #9CB4C9', padding: 2 }}>
            <Bar w="80%" h={2} bg="#4F667A" opacity={0.5} />
            <Bar w="60%" h={2} bg="#4F667A" opacity={0.4} />
          </div>
          <div style={{ flex: 1, backgroundColor: '#07192B', color: '#fff', fontSize: 5, fontWeight: 800, padding: '2.5px 6px', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center' }}>
            ₦125,000
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: 'auto',
          backgroundColor: '#07192B',
          borderTop: '0.8px solid #B84A14',
          display: 'flex',
          alignItems: 'center',
          padding: '2.5px 6px',
          gap: 4,
        }}
      >
        <span style={{ flex: 1, fontSize: 4, color: '#DBE8F2', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Company Ltd</span>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 4, color: '#fff', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>Sheet 1 of 1</span>
        <span style={{ flex: 1, textAlign: 'right', fontSize: 4, color: '#9CB4C9', fontFamily: 'Inter, sans-serif' }}>INV-001</span>
      </div>
    </div>
  )
}

function EvergreenMini() {
  return (
    <div className={SHELL} style={{ backgroundColor: '#fff', border: '0.5px solid #D4DFD8', padding: '4px 5px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 7.5, fontWeight: 800, color: '#1A3A32', fontFamily: 'Inter, sans-serif', letterSpacing: 0.3 }}>INVOICE</div>
          <div style={{ height: 2, backgroundColor: '#1F6E5C', marginTop: 1.5 }} />
        </div>
        <div style={{ backgroundColor: '#F0F6F2', borderRadius: 4, padding: '1.5px 5px', fontSize: 4.5, fontWeight: 700, color: '#1F6E5C', fontFamily: 'Inter, sans-serif' }}>INV-001</div>
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
        <div style={{ flex: 1, backgroundColor: '#F0F6F2', borderRadius: 6, padding: 2.5 }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#2A8A73', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>From</div>
          <Bar w="68%" h={3} bg="#1A3A32" opacity={0.75} />
          <Bar w="86%" h={2} bg="#5A7268" opacity={0.5} />
        </div>
        <div style={{ flex: 1, backgroundColor: '#F0F6F2', borderRadius: 6, padding: 2.5 }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#2A8A73', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Bill To</div>
          <Bar w="62%" h={3} bg="#1A3A32" opacity={0.75} />
          <Bar w="82%" h={2} bg="#5A7268" opacity={0.5} />
        </div>
      </div>
      <div style={{ marginTop: 3 }}>
        <MiniTable headerBg="#1F6E5C" headerFg="#fff" rowBg={['#fff', '#F7FAF8']} border="#D4DFD8" />
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
        <div style={{ flex: 1, backgroundColor: '#F0F6F2', borderRadius: 6, padding: 2.5 }}>
          <Bar w="55%" h={2} bg="#5A7268" opacity={0.5} />
          <Bar w="40%" h={2} bg="#5A7268" opacity={0.4} />
        </div>
        <div style={{ backgroundColor: '#1F6E5C', color: '#fff', fontSize: 5, fontWeight: 800, padding: '3px 8px', borderRadius: 4, fontFamily: 'Inter, sans-serif' }}>₦125,000</div>
      </div>
      <FooterBand border="#D4DFD8" bg="#F7FAF8" left="Company Ltd" center="Page 1 of 1" right="INV-001" color="#7F9A8E" />
    </div>
  )
}

function ArchitecturalMini() {
  return (
    <div className={SHELL} style={{ backgroundColor: '#F6F0E4', border: '0.5px solid #C08A5F', padding: '3px 5px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #C08A5F', paddingBottom: 2 }}>
        <span style={{ fontSize: 4, fontWeight: 700, color: '#A4663F', letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Invoice · INV-001</span>
        <span style={{ fontSize: 4, color: '#8C8275', letterSpacing: 0.5, fontFamily: 'Inter, sans-serif' }}>SPEC SHEET</span>
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
        <div style={{ width: '56%', backgroundColor: '#1E2427', padding: 3, borderRadius: 3 }}>
          <div style={{ fontSize: 5.5, fontWeight: 700, color: '#fff', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Company Ltd</div>
          <Bar w="80%" h={2} bg="#D5CEC2" opacity={0.6} />
          <Bar w="60%" h={2} bg="#D5CEC2" opacity={0.45} />
        </div>
        <div style={{ width: '42%', paddingLeft: 3 }}>
          <div style={{ fontSize: 6.5, fontWeight: 800, color: '#1E2427', letterSpacing: 0.8, textAlign: 'right', fontFamily: 'Inter, sans-serif' }}>INVOICE</div>
          <div style={{ fontSize: 4.5, fontWeight: 700, color: '#A4663F', textAlign: 'right', fontFamily: 'Inter, sans-serif' }}>No. INV-001</div>
          <div style={{ backgroundColor: '#EDE4D3', border: '0.5px solid #D9CDBB', borderRadius: 3, padding: 2, marginTop: 2 }}>
            <Bar w="90%" h={2} bg="#60584F" opacity={0.5} />
            <Bar w="70%" h={2} bg="#A4663F" opacity={0.6} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', backgroundColor: '#fff', border: '0.5px solid #C08A5F', borderRadius: 3, marginTop: 3, padding: 2.5 }}>
        <div style={{ flex: 1, paddingRight: 4 }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#A4663F', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Bill To · Client</div>
          <Bar w="72%" h={3} bg="#1E2427" opacity={0.75} />
          <Bar w="88%" h={2} bg="#60584F" opacity={0.5} />
        </div>
        <div style={{ flex: 1, borderLeft: '0.5px solid #E8DED0', paddingLeft: 4 }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#A4663F', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Project Spec</div>
          <Bar w="70%" h={2} bg="#8C8275" opacity={0.55} />
          <Bar w="55%" h={2} bg="#8C8275" opacity={0.45} />
        </div>
      </div>
      <div style={{ marginTop: 3 }}>
        <MiniTable headerBg="#1E2427" headerFg="#fff" rowBg={['#fff', '#F6F0E4']} border="#D9CDBB" />
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
        <div style={{ flex: 1, backgroundColor: '#fff', border: '0.5px solid #D9CDBB', borderRadius: 3, padding: 2 }}>
          <Bar w="65%" h={2} bg="#60584F" opacity={0.5} />
          <Bar w="50%" h={2} bg="#60584F" opacity={0.4} />
        </div>
        <div style={{ width: '46%', backgroundColor: '#1E2427', padding: '2.5px 6px', borderRadius: 3 }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#C08A5F', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Total Due</div>
          <div style={{ fontSize: 5.5, fontWeight: 800, color: '#fff', fontFamily: 'Inter, sans-serif' }}>₦125,000</div>
        </div>
      </div>
    </div>
  )
}

function ExecutiveMini() {
  return (
    <div className={SHELL} style={{ backgroundColor: '#FCF9F2', border: '0.5px solid #D8C39C', padding: '3px 5px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '0.5px solid #D8C39C', paddingBottom: 2 }}>
        <span style={{ fontSize: 4, fontWeight: 700, color: '#A9854F', letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Invoice · INV-001</span>
        <span style={{ fontSize: 4, color: '#7E8881', letterSpacing: 0.5, fontFamily: 'Inter, sans-serif' }}>FOLIO</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 2 }}>
        <div style={{ fontSize: 5.5, fontWeight: 700, color: '#173A2C', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Company Ltd</div>
        <div style={{ fontSize: 3.8, color: '#A9854F', fontWeight: 700, letterSpacing: 0.8, fontFamily: 'Inter, sans-serif' }}>TIN · RC</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 1 }}>
          <span style={{ width: '30%', height: 0.5, backgroundColor: '#D8C39C' }} />
          <span style={{ fontSize: 5, color: '#A9854F' }}>◆</span>
          <span style={{ width: '30%', height: 0.5, backgroundColor: '#D8C39C' }} />
        </div>
        <div style={{ fontSize: 6.5, fontWeight: 800, color: '#173A2C', letterSpacing: 2, fontFamily: 'Inter, sans-serif' }}>INVOICE</div>
      </div>
      <div style={{ display: 'flex', backgroundColor: '#F6F0E2', border: '0.5px solid #D8C39C', borderRadius: 3, marginTop: 2, overflow: 'hidden' }}>
        {['Doc No', 'Date', 'Due', 'PO'].map((l, i) => (
          <div
            key={l}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '2px 0',
              borderRight: i < 3 ? '0.5px solid #D8C39C' : 'none',
              fontSize: 3.8,
              fontWeight: 600,
              color: '#7E8881',
              textTransform: 'uppercase',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {l}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 2.5 }}>
        <div style={{ flex: 1, backgroundColor: '#fff', border: '0.5px solid #D8C39C', borderRadius: 3, padding: 2 }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#A9854F', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Bill To</div>
          <Bar w="70%" h={3} bg="#173A2C" opacity={0.7} />
          <Bar w="85%" h={2} bg="#555E58" opacity={0.5} />
        </div>
        <div style={{ flex: 1, backgroundColor: '#F6F0E2', border: '0.5px solid #D8C39C', borderRadius: 3, padding: 2 }}>
          <div style={{ fontSize: 4, fontWeight: 700, color: '#A9854F', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Engagement</div>
          <Bar w="65%" h={2} bg="#7E8881" opacity={0.55} />
          <Bar w="52%" h={2} bg="#7E8881" opacity={0.45} />
        </div>
      </div>
      <div style={{ marginTop: 2.5 }}>
        <MiniTable headerBg="#173A2C" headerFg="#fff" rowBg={['#fff', '#FCF9F2']} border="#DFD5C2" />
      </div>
      <div
        style={{
          backgroundColor: '#173A2C',
          borderRadius: 3,
          marginTop: 3,
          padding: '2.5px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 4.5, fontWeight: 700, color: '#D8C39C', letterSpacing: 0.8, fontFamily: 'Inter, sans-serif' }}>TOTAL DUE</span>
        <span style={{ fontSize: 6, fontWeight: 800, color: '#fff', fontFamily: 'Inter, sans-serif' }}>₦125,000</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: 3.8, fontStyle: 'italic', color: '#555E58', padding: '1.5px 0', fontFamily: 'Inter, sans-serif' }}>
        One hundred twenty-five thousand naira only
      </div>
    </div>
  )
}

function HeritageMini() {
  return (
    <div className={SHELL} style={{ backgroundColor: '#F8F2E3', padding: 5, border: '0.5px solid #9A7B45' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '0.5px solid #D9CBAC', paddingBottom: 2 }}>
        <span style={{ fontSize: 4, fontWeight: 700, color: '#5C1A26', letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Invoice · INV-001</span>
        <span style={{ fontSize: 4, color: '#7B6E5C', letterSpacing: 0.5, fontFamily: 'Inter, sans-serif' }}>HERITAGE</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div style={{ width: 10, height: 10, border: '0.5px solid #5C1A26', backgroundColor: '#FFFDF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 6, fontWeight: 700, color: '#5C1A26' }}>K</div>
          <div>
            <div style={{ fontSize: 5, fontWeight: 700, color: '#5C1A26', letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Kestrel Supply</div>
            <div style={{ fontSize: 3.5, color: '#9A7B45', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>RC · TIN</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 4, color: '#9A7B45', letterSpacing: 1, textTransform: 'uppercase' }}>BOUXRE</div>
          <div style={{ fontSize: 6, fontWeight: 700, color: '#5C1A26', letterSpacing: 1 }}>INVOICE</div>
        </div>
      </div>
      <div style={{ marginTop: 2.5 }}>
        <MiniTable headerBg="#FFFDF7" headerFg="#5C1A26" rowBg={['#FFFDF7', '#F8F2E3']} border="#D9CBAC" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '0.5px solid #5C1A26', marginTop: 3, paddingTop: 2 }}>
        <span style={{ fontSize: 4.5, fontWeight: 700, color: '#9A7B45', letterSpacing: 0.8, fontFamily: 'Inter, sans-serif' }}>TOTAL DUE</span>
        <span style={{ fontSize: 6, fontWeight: 800, color: '#5C1A26', fontFamily: 'Inter, sans-serif' }}>₦280,500</span>
      </div>
    </div>
  )
}

export default function CommercialTemplateMiniature({ templateId }: { templateId: string }) {
  switch (templateId) {
    case 'industrial':
      return <IndustrialMini />
    case 'industry':
      return <IndustryMini />
    case 'minimal':
      return <MinimalMini />
    case 'landscape':
      return <LandscapeMini />
    case 'evergreen':
      return <EvergreenMini />
    case 'architectural':
      return <ArchitecturalMini />
    case 'executive':
      return <ExecutiveMini />
    case 'heritage':
      return <HeritageMini />
    default:
      return <IndustryMini />
  }
}
