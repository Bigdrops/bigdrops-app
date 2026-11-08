import * as React from 'react'

export type WorldStage = 'arrival' | 'workspaces' | 'commercial' | 'finance' | 'logistics' | 'field' | 'conversion' | 'auth'

/**
 * Polyfork 3D Character models from the Polyfork parametric asset library.
 * Each character is real-world scaled (meters), flat-shaded, low-poly (under 5k tris),
 * and authored to represent key operational roles across SME business functions.
 */
export interface PolyforkCharacterSpec {
  id: string
  title: string
  kit: string
  triangles: number
  heroRender: string
  pageUrl: string
  role: string
}

export const POLYFORK_CHARACTERS = {
  fieldTechnician: {
    id: 'construction-worker-c1ad8c',
    title: 'Site Technician',
    kit: 'nyc-city-kit-fbca88',
    triangles: 3861,
    heroRender: 'https://polyfork.dev/files/construction-worker-c1ad8c/renders/hero.png',
    pageUrl: 'https://polyfork.dev/asset/construction-worker-c1ad8c',
    role: 'Electrical & Equipment Maintenance',
  },
  deliveryCourier: {
    id: 'delivery-courier-327e30',
    title: 'Fleet Courier',
    kit: 'nyc-city-kit-fbca88',
    triangles: 3523,
    heroRender: 'https://polyfork.dev/files/delivery-courier-327e30/renders/hero.png',
    pageUrl: 'https://polyfork.dev/asset/delivery-courier-327e30',
    role: 'Dispatch & Waybill Delivery',
  },
  retailMerchant: {
    id: 'shopkeeper-be5547',
    title: 'Store Merchant',
    kit: 'japanese-suburban-city-street-baa482',
    triangles: 4347,
    heroRender: 'https://polyfork.dev/files/shopkeeper-be5547/renders/hero.png',
    pageUrl: 'https://polyfork.dev/asset/shopkeeper-be5547',
    role: 'Stock & Point of Sale',
  },
  commercialAdvisor: {
    id: 'standing-worker-on-a-8a0f9a',
    title: 'Commercial Lead',
    kit: 'office-794453',
    triangles: 2969,
    heroRender: 'https://polyfork.dev/files/standing-worker-on-a-8a0f9a/renders/hero.png',
    pageUrl: 'https://polyfork.dev/asset/standing-worker-on-a-8a0f9a',
    role: 'Quotation & Client Handoff',
  },
  financeAccountant: {
    id: 'seated-office-worker-854671',
    title: 'Finance Controller',
    kit: 'office-794453',
    triangles: 3027,
    heroRender: 'https://polyfork.dev/files/seated-office-worker-854671/renders/hero.png',
    pageUrl: 'https://polyfork.dev/asset/seated-office-worker-854671',
    role: 'Reconciliation & Tax Review',
  },
} as const

function PolyforkFigure({
  character,
  className = '',
  badgeLabel,
}: {
  character: PolyforkCharacterSpec
  className?: string
  badgeLabel?: string
}) {
  return (
    <div className={`ob5-poly-figure ${className}`} title={`${character.title} (${character.triangles} tris)`}>
      <div className="ob5-poly-wrap">
        <div className="ob5-poly-shadow" />
        <img
          src={character.heroRender}
          alt={character.title}
          loading="eager"
          className="ob5-poly-img"
        />
      </div>
      <div className="ob5-poly-badge">
        <span>3D</span> {badgeLabel || character.title}
      </div>
    </div>
  )
}

function ElectricalEnvironment() {
  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 320 290" aria-hidden="true" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="ob5-electrical-metal" x2="1" y2="1">
            <stop stopColor="var(--ob5-raised)" />
            <stop offset="1" stopColor="var(--ob5-deep)" />
          </linearGradient>
        </defs>
        <path className="ob5-environment-floor" d="M0 246h320v44H0z" />
        <path className="ob5-electrical-shadow" d="M26 55h160v182H26z" />
        <path className="ob5-electrical-cabinet" d="M35 45h150v190H35z" />
        <path className="ob5-electrical-seam" d="M110 45v190M40 119h140M40 168h140" />
        <path className="ob5-electrical-panel" d="M48 61h50v42H48zM122 61h50v42h-50zM48 130h50v26H48zM122 130h50v26h-50z" />
        <path className="ob5-electrical-cable" d="M72 104v65c0 25 22 20 22 42M145 104v40c0 43 36 31 36 66" />
        <circle className="ob5-electrical-live" cx="72" cy="82" r="6" />
        <circle className="ob5-electrical-live ob5-electrical-live--two" cx="146" cy="82" r="6" />
      </svg>
      <PolyforkFigure
        character={POLYFORK_CHARACTERS.fieldTechnician}
        className="right-[6%] bottom-[8%] w-[42%] h-[78%]"
        badgeLabel="Site tech"
      />
    </div>
  )
}

function FleetEnvironment() {
  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 320 290" aria-hidden="true" className="absolute inset-0 w-full h-full">
        <path className="ob5-fleet-horizon" d="M0 69h320v127H0z" />
        <path className="ob5-fleet-depot" d="M18 77h146v121H18zM37 110h106v88H37z" />
        <path className="ob5-fleet-depot-lines" d="M20 94h143M48 126h86M48 148h86" />
        <path className="ob5-fleet-road" d="M0 204h320v86H0z" />
        <path className="ob5-fleet-roadline" d="M0 253h320" />
        <g className="ob5-fleet-vehicle">
          <path className="ob5-fleet-trailer" d="M110 145h120v77H110z" />
          <path className="ob5-fleet-cab" d="M230 165h42l26 28v29h-68z" />
          <path className="ob5-fleet-window" d="M244 173h24l16 18h-40z" />
          <path className="ob5-fleet-door" d="M122 157h48v50h-48z" />
          <circle className="ob5-fleet-wheel" cx="142" cy="222" r="17" />
          <circle className="ob5-fleet-wheel" cx="260" cy="222" r="17" />
          <path className="ob5-fleet-lamp" d="M294 204h8" />
        </g>
        <path className="ob5-fleet-route" d="M33 270h70m21 0h53m23 0h52" />
      </svg>
      <PolyforkFigure
        character={POLYFORK_CHARACTERS.deliveryCourier}
        className="left-[6%] bottom-[8%] w-[38%] h-[74%]"
        badgeLabel="Courier"
      />
    </div>
  )
}

function RetailEnvironment() {
  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 320 290" aria-hidden="true" className="absolute inset-0 w-full h-full">
        <path className="ob5-retail-wall" d="M0 42h320v206H0z" />
        <path className="ob5-retail-floor" d="M0 245h320v45H0z" />
        <path className="ob5-retail-shelf" d="M22 79h160v164H22z" />
        <path className="ob5-retail-shelf-line" d="M22 130h160M22 184h160M22 238h160" />
        <g className="ob5-retail-stock">
          <path d="M36 96h26v31H36zM70 88h20v39H70zM100 99h25v28h-25zM135 92h34v35h-34z" />
          <path d="M38 144h22v36H38zM68 153h30v27H68zM108 143h22v37h-22zM140 151h28v29h-28z" />
          <path d="M40 199h35v35H40zM84 194h26v40H84zM120 200h20v34h-20zM150 194h22v40h-22z" />
        </g>
        <path className="ob5-retail-counter" d="M195 193h110v49h-110z" />
        <path className="ob5-retail-register" d="M205 158h44v35h-44zM210 169h34" />
        <path className="ob5-retail-scan" d="m190 176 21 15" />
      </svg>
      <PolyforkFigure
        character={POLYFORK_CHARACTERS.retailMerchant}
        className="right-[6%] bottom-[8%] w-[40%] h-[76%]"
        badgeLabel="Merchant"
      />
    </div>
  )
}

const BUSINESSES = [
  { name: 'Activa Electrical', kind: 'Electrical services', record: 'Service orders', team: 'Technicians at work', className: 'electrical', Environment: ElectricalEnvironment },
  { name: 'Northline Fleet', kind: 'Logistics', record: 'Dispatch records', team: 'Drivers on route', className: 'fleet', Environment: FleetEnvironment },
  { name: 'Marketline Supply', kind: 'Retail and distribution', record: 'Sales and stock', team: 'Store team active', className: 'retail', Environment: RetailEnvironment },
] as const

function WorkspacesLayer() {
  return (
    <div className="ob5-tenant-scene">
      <div className="ob5-scene-cap"><strong>BOUXRE</strong><span>Illustrative businesses · independent workspaces</span></div>
      <div className="ob5-tenant-grid">
        {BUSINESSES.map(({ name, kind, record, team, className, Environment }) => (
          <section className={'ob5-tenant ob5-tenant--' + className} key={name}>
            <div className="ob5-tenant-heading">
              <span className="ob5-tenant-scope">Separate workspace</span>
              <h3>{name}</h3>
              <p>{kind}</p>
            </div>
            <div className="ob5-tenant-art"><Environment /></div>
            <div className="ob5-tenant-footer">
              <span>{record}</span>
              <span className="ob5-tenant-team">{team}</span>
            </div>
          </section>
        ))}
      </div>
      <p className="ob5-tenant-baseline">One platform. Distinct teams. Records stay with their business.</p>
    </div>
  )
}

function CommercialLayer() {
  return (
    <div className="ob5-commercial-scene">
      <div className="ob5-commercial-backdrop"><span>SALES WORKROOM</span><span>Documents in motion</span></div>
      <div className="ob5-commercial-desk">
        <div className="ob5-commercial-ruler" aria-hidden="true" />
        <div className="ob5-commercial-sheet ob5-commercial-request">
          <span>01 / REQUEST</span><strong>Client brief</strong><i /><i /><i className="short" />
        </div>
        <div className="ob5-commercial-sheet ob5-commercial-quote">
          <span>02 / QUOTATION</span><strong>Priced work</strong><i /><i /><i className="short" />
          <b>Reviewed</b>
        </div>
        <div className="ob5-commercial-sheet ob5-commercial-invoice">
          <span>03 / INVOICE</span><strong>Approved work</strong><i /><i /><i className="short" />
          <b>Ready to issue</b>
        </div>
        <div className="ob5-commercial-handoff">Request <span /> Quotation <span /> Approval</div>
      </div>
      <PolyforkFigure
        character={POLYFORK_CHARACTERS.commercialAdvisor}
        className="ob5-commercial-advisor"
        badgeLabel="Lead"
      />
    </div>
  )
}

function FinanceLayer() {
  return (
    <div className="ob5-tax-scene">
      <div className="ob5-tax-header">
        <span>FINANCE / TAXATION</span><strong>Tax command centre</strong>
        <small>Illustrative workflow. No rates or filing dates shown.</small>
      </div>
      <div className="ob5-tax-system">
        <div className="ob5-tax-intake">
          <span className="ob5-tax-unit">01 / TRANSACTION</span>
          <div className="ob5-tax-document"><strong>Commercial record</strong><i /><i /><i /><span>Invoice · payment</span></div>
          <p>Taxable transaction enters review</p>
        </div>
        <div className="ob5-tax-processing">
          <div className="ob5-tax-lane ob5-tax-lane--vat">
            <span>VAT</span><div className="ob5-tax-track"><i /></div><strong>VAT amount reviewed</strong>
          </div>
          <div className="ob5-tax-lane ob5-tax-lane--wht">
            <span>WHT</span><div className="ob5-tax-track"><i /></div><strong>WHT amount reviewed</strong>
          </div>
          <div className="ob5-tax-ledger">
            <span>02 / RECONCILIATION</span>
            <div className="ob5-tax-ledger-lines"><i /><i /><i /><i /></div>
            <strong>Records matched</strong>
          </div>
        </div>
        <div className="ob5-tax-filing">
          <span className="ob5-tax-unit">03 / OBLIGATIONS</span>
          <div className="ob5-tax-period"><span>Filing period</span><strong>Review window</strong></div>
          <div className="ob5-tax-timeline"><i /><i /><i /></div>
          <div className="ob5-tax-files"><span>Tax documents</span><strong>Organised for review</strong><b>Filing confirmation retained</b></div>
        </div>
      </div>
      <div className="ob5-tax-base"><span>Transaction</span><span>VAT / WHT</span><span>Reconcile</span><span>Obligation review</span></div>
    </div>
  )
}

function LogisticsLayer() {
  return (
    <div className="ob5-logistics-scene">
      <div className="ob5-logistics-sky"><span>DISPATCH YARD</span><i /><i /><i /></div>
      <div className="ob5-logistics-warehouse"><i /><i /><i /></div>
      <div className="ob5-logistics-road"><span /></div>
      <div className="ob5-logistics-truck">
        <div className="ob5-logistics-trailer"><span>Northline Fleet</span><i /></div>
        <div className="ob5-logistics-cab"><i /></div>
        <b className="ob5-logistics-wheel ob5-logistics-wheel--rear" />
        <b className="ob5-logistics-wheel ob5-logistics-wheel--front" />
      </div>
      <PolyforkFigure
        character={POLYFORK_CHARACTERS.deliveryCourier}
        className="left-[8%] bottom-[12%] w-[22%] h-[68%]"
        badgeLabel="Driver"
      />
      <div className="ob5-logistics-waybill"><span>WAYBILL</span><strong>Delivery handoff</strong><i /><i /></div>
      <div className="ob5-logistics-route"><span>Dispatch</span><i /><span>On route</span><i /><span>Handoff</span></div>
    </div>
  )
}

function FieldLayer() {
  return (
    <div className="ob5-field-scene">
      <div className="ob5-field-wall"><span>CLIENT SITE / SERVICE BAY</span><i /><i /></div>
      <div className="ob5-field-equipment">
        <div className="ob5-field-screen"><i /><i /><i /></div>
        <div className="ob5-field-vents"><i /><i /><i /><i /></div>
        <div className="ob5-field-access"><i /></div>
      </div>
      <div className="ob5-field-worker">
        <PolyforkFigure
          character={POLYFORK_CHARACTERS.fieldTechnician}
          className="relative w-full h-full"
          badgeLabel="Technician"
        />
      </div>
      <div className="ob5-field-inspection"><span>INSPECTION</span><i /></div>
      <div className="ob5-field-report"><span>SERVICE REPORT</span><strong>Work completed</strong><i /><i /><b>Reviewed</b></div>
    </div>
  )
}

function ConversionLayer() {
  return (
    <div className="ob5-conversion-scene">
      <div className="ob5-conversion-strata">
        <span>Companies</span><span>Commercial</span><span>Finance</span><span>Dispatch</span><span>Service</span>
      </div>
      <div className="ob5-conversion-brand"><span>BOUXRE</span><strong>Work has a place.</strong></div>
      <div className="ob5-conversion-footer">A clear operating context for every business.</div>
    </div>
  )
}

export function BusinessWorld({ stage }: { stage: WorldStage }) {
  const visual = stage === 'arrival' || stage === 'workspaces'
    ? <WorkspacesLayer />
    : stage === 'commercial'
      ? <CommercialLayer />
      : stage === 'finance'
        ? <FinanceLayer />
        : stage === 'logistics'
          ? <LogisticsLayer />
          : stage === 'field'
            ? <FieldLayer />
            : <ConversionLayer />

  return <div className="ob5-world" data-ob5-world-stage={stage} aria-hidden="true"><div className="ob5-scene" key={stage}>{visual}</div></div>
}
