export type WorldStage = 'arrival' | 'workspaces' | 'commercial' | 'finance' | 'logistics' | 'field' | 'conversion' | 'auth'

function ElectricalEnvironment() {
  return (
    <svg viewBox="0 0 320 290" aria-hidden="true">
      <defs>
        <linearGradient id="ob5-electrical-metal" x2="1" y2="1">
          <stop stopColor="var(--ob5-raised)" />
          <stop offset="1" stopColor="var(--ob5-deep)" />
        </linearGradient>
      </defs>
      <path className="ob5-environment-floor" d="M0 246h320v44H0z" />
      <path className="ob5-electrical-shadow" d="M26 55h196v182H26z" />
      <path className="ob5-electrical-cabinet" d="M35 45h178v190H35z" />
      <path className="ob5-electrical-seam" d="M125 45v190M40 119h169M40 168h169" />
      <path className="ob5-electrical-panel" d="M52 61h56v42H52zM140 61h56v42h-56zM52 130h56v26H52zM140 130h56v26h-56z" />
      <path className="ob5-electrical-cable" d="M79 104v65c0 25 24 20 24 42M165 104v40c0 43 44 31 44 66" />
      <circle className="ob5-electrical-live" cx="79" cy="82" r="6" />
      <circle className="ob5-electrical-live ob5-electrical-live--two" cx="166" cy="82" r="6" />
      <path className="ob5-technician-body" d="M235 152q10-26 31-26t30 26l-8 57h-45z" />
      <circle className="ob5-technician-face" cx="265" cy="111" r="20" />
      <path className="ob5-technician-hardhat" d="M242 107q1-28 23-28t24 28z" />
      <path className="ob5-technician-limb" d="M245 172l-27 29M287 168l15 24M253 206l-9 47M281 206l8 47" />
      <path className="ob5-technician-tool" d="m212 194 19-16 7 9-19 16z" />
    </svg>
  )
}

function FleetEnvironment() {
  return (
    <svg viewBox="0 0 320 290" aria-hidden="true">
      <path className="ob5-fleet-horizon" d="M0 69h320v127H0z" />
      <path className="ob5-fleet-depot" d="M18 77h146v121H18zM37 110h106v88H37z" />
      <path className="ob5-fleet-depot-lines" d="M20 94h143M48 126h86M48 148h86" />
      <path className="ob5-fleet-road" d="M0 204h320v86H0z" />
      <path className="ob5-fleet-roadline" d="M0 253h320" />
      <g className="ob5-fleet-vehicle">
        <path className="ob5-fleet-trailer" d="M75 145h141v77H75z" />
        <path className="ob5-fleet-cab" d="M216 165h47l30 28v29h-77z" />
        <path className="ob5-fleet-window" d="M232 173h27l19 18h-46z" />
        <path className="ob5-fleet-door" d="M89 157h54v50H89z" />
        <circle className="ob5-fleet-wheel" cx="111" cy="222" r="17" />
        <circle className="ob5-fleet-wheel" cx="251" cy="222" r="17" />
        <path className="ob5-fleet-lamp" d="M289 204h8" />
      </g>
      <path className="ob5-fleet-route" d="M33 270h70m21 0h53m23 0h52" />
    </svg>
  )
}

function RetailEnvironment() {
  return (
    <svg viewBox="0 0 320 290" aria-hidden="true">
      <path className="ob5-retail-wall" d="M0 42h320v206H0z" />
      <path className="ob5-retail-floor" d="M0 245h320v45H0z" />
      <path className="ob5-retail-shelf" d="M22 79h188v164H22z" />
      <path className="ob5-retail-shelf-line" d="M22 130h188M22 184h188M22 238h188" />
      <g className="ob5-retail-stock">
        <path d="M36 96h30v31H36zM76 88h23v39H76zM111 99h29v28h-29zM151 92h39v35h-39z" />
        <path d="M38 144h24v36H38zM73 153h34v27H73zM119 143h24v37h-24zM155 151h31v29h-31z" />
        <path d="M40 199h40v35H40zM89 194h29v40H89zM132 200h23v34h-23zM166 194h25v40h-25z" />
      </g>
      <path className="ob5-retail-counter" d="M221 193h84v49h-84z" />
      <path className="ob5-retail-register" d="M239 158h49v35h-49zM244 169h39" />
      <circle className="ob5-retail-person" cx="265" cy="122" r="18" />
      <path className="ob5-retail-person" d="M238 157q7-19 27-19t27 19v32h-54z" />
      <path className="ob5-retail-scan" d="m218 176 21 15" />
    </svg>
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
      <div className="ob5-scene-cap"><strong>BOURXE</strong><span>Illustrative businesses · independent workspaces</span></div>
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
      <svg className="ob5-field-worker" viewBox="0 0 230 370" aria-hidden="true">
        <path className="ob5-field-shadow" d="M16 344h200" />
        <circle cx="119" cy="72" r="29" className="ob5-field-face" />
        <path d="M89 69q2-40 30-40t31 40z" className="ob5-field-helmet" />
        <path d="M91 104h57l22 130H70z" className="ob5-field-uniform" />
        <path d="m88 139-57 71m118-70 47 54M92 231l-18 110m74-110 22 110" className="ob5-field-limbs" />
        <path d="m25 203 33-24 11 13-33 24z" className="ob5-field-tool" />
      </svg>
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
      <div className="ob5-conversion-brand"><span>BOURXE</span><strong>Work has a place.</strong></div>
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
