import { useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  FileText,
  Filter,
  Home,
  Menu,
  Plus,
  Receipt,
  Search,
  Users,
} from 'lucide-react'

import { ClerkLauncher, type ClerkState } from './assistant-chat-clerk'

/**
 * Visual study: the global assistant launcher next to page-specific FABs and
 * bottom navigation. Nothing here is wired to production pages; the assistant
 * hands off to the shared chat above, never to a second instance.
 */
export function LauncherCoexistence({
  state,
  onOpenAssistant,
}: {
  state: ClerkState
  onOpenAssistant: () => void
}) {
  const [keyboard, setKeyboard] = useState(false)
  const [handoff, setHandoff] = useState(false)

  const openAssistant = () => {
    setHandoff(true)
    onOpenAssistant()
  }

  return (
    <section className="ac-lab" aria-labelledby="ac-lab-title">
      <header className="ac-lab-head">
        <div>
          <p className="ac-lab-eyebrow">Launcher coexistence</p>
          <h2 className="ac-lab-title" id="ac-lab-title">
            One assistant launcher, page actions keep their FAB
          </h2>
          <p className="ac-lab-lede">
            The assistant floats as a freestanding character; page actions use an ordinary FAB.
            The launcher never enters the chat sheet or the chat content.
          </p>
        </div>
        <div className="ac-lab-switch" role="group" aria-label="Form keyboard state">
          <button type="button" aria-pressed={!keyboard} onClick={() => setKeyboard(false)}>
            FABs
          </button>
          <button type="button" aria-pressed={keyboard} onClick={() => setKeyboard(true)}>
            Keyboard
          </button>
        </div>
      </header>

      <div className="ac-lab-phones">
        <PhoneMock
          label="Dashboard"
          note="Page FAB keeps its 16px inset; the assistant sits 14px above it. Both clear a 56px nav and an 8px safe area."
          assistantState={state}
          onAssistant={openAssistant}
          pageFab={{ label: 'New invoice' }}
        >
          <DashboardContent />
        </PhoneMock>

        <PhoneMock
          label="Form page"
          note={
            keyboard
              ? 'Keyboard open: the page FAB tucks away and the assistant lifts above the keyboard with a 14px gap.'
              : 'Add-item FAB stays bottom-right; the assistant floats above it. Save lives in the header, away from both.'
          }
          assistantState={state}
          onAssistant={openAssistant}
          pageFab={{ label: 'Add line item' }}
          keyboard={keyboard}
        >
          <FormContent />
        </PhoneMock>

        <PhoneMock
          label="List page"
          note="Rows scroll under a fade; both controls float above the last row and never overlap the nav."
          assistantState={state}
          onAssistant={openAssistant}
          pageFab={{ label: 'New invoice' }}
        >
          <ListContent />
        </PhoneMock>
      </div>

      <ul className="ac-lab-legend" aria-label="Layout measurements">
        <li>Nav 56px + safe area 8px</li>
        <li>Assistant above page FAB 14px</li>
        <li>Keyboard 190px, controls reflow</li>
        <li>Scroll fade 28px above nav</li>
      </ul>

      <div className="ac-lab-desk-row">
        <div className="ac-lab-desk" aria-label="Desktop launcher treatment">
          <div className="ac-lab-desk-bar">
            <span className="ac-lab-desk-dots" aria-hidden="true">
              <i /> <i /> <i />
            </span>
            <p>BOURXE — Dashboard</p>
          </div>
          <div className="ac-lab-desk-body">
            <aside className="ac-lab-desk-rail" aria-hidden="true">
              <span className="on">
                <Home className="size-4" />
              </span>
              <span>
                <Receipt className="size-4" />
              </span>
              <span>
                <Users className="size-4" />
              </span>
              <span>
                <FileText className="size-4" />
              </span>
            </aside>
            <div className="ac-lab-desk-main">
              <header className="ac-lab-desk-head">
                <div>
                  <p className="ac-lab-hi">Dashboard</p>
                  <p className="ac-lab-sub">Ada Obi · Acme Stores</p>
                </div>
                <div className="ac-lab-desk-actions">
                  <span className="ac-lab-desk-ghost">
                    <Search className="size-3" /> Search
                  </span>
                  <span className="ac-lab-desk-primary">
                    <Plus className="size-3" /> New invoice
                  </span>
                </div>
              </header>
              <div className="ac-lab-desk-kpis">
                <DeskKpi label="Outstanding" value="₦1.24m" />
                <DeskKpi label="Paid this week" value="₦860k" />
                <DeskKpi label="Draft invoices" value="3" />
              </div>
              <div className="ac-lab-desk-table">
                {[
                  ['INV-000131', 'ABC Ltd', '₦480,000', 'Paid'],
                  ['INV-000129', 'Delta Foods', '₦212,500', 'Sent'],
                  ['INV-000128', 'Kano Textiles', '₦96,000', 'Draft'],
                ].map((row) => (
                  <div className="ac-lab-desk-row-item" key={row[0]}>
                    <span>{row[0]}</span>
                    <span>{row[1]}</span>
                    <span>{row[2]}</span>
                    <em data-status={row[3].toLowerCase()}>{row[3]}</em>
                  </div>
                ))}
              </div>
              <div className="ac-lab-desk-assist">
                <ClerkLauncher
                  state={state}
                  open={false}
                  variant="restrained"
                  controls={null}
                  label="Open the shared assistant"
                  onToggle={openAssistant}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="ac-lab-desk-note">
          <p className="ac-lab-eyebrow">Desktop</p>
          <h3>Restrained, still discoverable</h3>
          <p>
            A 32px character sits in the canvas corner with a slow breathing glow. No bob, no
            gesture, no ground shadow and no dot ping.
          </p>
          <p>
            There is no page FAB here: toolbar actions and navigation keep priority, and the
            launcher never competes with desktop chrome.
          </p>
        </div>
      </div>

      {handoff ? (
        <p className="ac-lab-handoff" role="status">
          Focused the shared assistant composer above — one instance, no second chat.
        </p>
      ) : null}
    </section>
  )
}

function PhoneMock({
  label,
  note,
  assistantState,
  onAssistant,
  pageFab,
  keyboard = false,
  children,
}: {
  label: string
  note: string
  assistantState: ClerkState
  onAssistant: () => void
  pageFab: { label: string }
  keyboard?: boolean
  children: ReactNode
}) {
  return (
    <figure className="ac-lab-phone-card">
      <div className="ac-lab-phone" data-keyboard={keyboard}>
        <span className="ac-lab-notch" aria-hidden="true" />
        <div className="ac-lab-status" aria-hidden="true">
          <span>9:41</span>
          <span className="ac-lab-status-dots">
            <i /> <i /> <i />
          </span>
        </div>

        <div className="ac-lab-scroll">{children}</div>
        <span className="ac-lab-fade" aria-hidden="true" />

        {keyboard ? (
          <Keyboard />
        ) : (
          <>
            <nav className="ac-lab-nav" aria-label={`${label} navigation`}>
              <span className="on">
                <Home className="size-4" /> Home
              </span>
              <span>
                <Receipt className="size-4" /> Invoices
              </span>
              <span>
                <Users className="size-4" /> Clients
              </span>
              <span>
                <Menu className="size-4" /> More
              </span>
            </nav>
            <button type="button" className="ac-lab-pagefab" aria-label={pageFab.label}>
              <Plus className="size-5" aria-hidden="true" />
            </button>
          </>
        )}

        <div className="ac-lab-assist">
          <ClerkLauncher
            state={assistantState}
            open={false}
            controls={null}
            label="Open the shared assistant"
            onToggle={onAssistant}
          />
        </div>
        <span className="ac-lab-home-indicator" aria-hidden="true" />
      </div>
      <figcaption>
        <p className="ac-lab-phone-label">{label}</p>
        <p className="ac-lab-phone-note">{note}</p>
      </figcaption>
    </figure>
  )
}

function DashboardContent() {
  return (
    <div className="ac-lab-pagebody">
      <header className="ac-lab-pagehead">
        <div>
          <p className="ac-lab-hi">Good morning, Ada</p>
          <p className="ac-lab-sub">3 invoices need attention</p>
        </div>
        <span className="ac-lab-bell">
          <Bell className="size-3.5" />
        </span>
      </header>
      <div className="ac-lab-kpis">
        <div>
          <span>Outstanding</span>
          <strong>₦1.24m</strong>
        </div>
        <div>
          <span>Paid this week</span>
          <strong>₦860k</strong>
        </div>
      </div>
      <div className="ac-lab-block">
        <div className="ac-lab-block-head">
          <p>Recent invoices</p>
          <span>
            View all <ChevronRight className="size-3" />
          </span>
        </div>
        <Row number="INV-000131" client="ABC Ltd" amount="₦480,000" status="Paid" />
        <Row number="INV-000129" client="Delta Foods" amount="₦212,500" status="Sent" />
        <Row number="INV-000128" client="Kano Textiles" amount="₦96,000" status="Draft" />
      </div>
    </div>
  )
}

function Row({
  number,
  client,
  amount,
  status,
}: {
  number: string
  client: string
  amount: string
  status: string
}) {
  return (
    <div className="ac-lab-row">
      <span className="ac-lab-row-icon">
        <FileText className="size-3.5" />
      </span>
      <span className="ac-lab-row-id">
        <em>{number}</em>
        <i>{client}</i>
      </span>
      <span className="ac-lab-row-amount">
        <em>{amount}</em>
        <i data-status={status.toLowerCase()}>{status}</i>
      </span>
    </div>
  )
}

function FormContent() {
  return (
    <div className="ac-lab-pagebody">
      <header className="ac-lab-pagehead">
        <span className="ac-lab-back">
          <ArrowLeft className="size-3.5" /> Back
        </span>
        <span className="ac-lab-save">Save</span>
      </header>
      <p className="ac-lab-form-title">New invoice</p>
      <div className="ac-lab-field">
        <label>Client</label>
        <span>ABC Ltd</span>
      </div>
      <div className="ac-lab-field">
        <label>Item</label>
        <span>5 pcs cable lug 10mm</span>
      </div>
      <div className="ac-lab-field-row">
        <div className="ac-lab-field">
          <label>Quantity</label>
          <span>5</span>
        </div>
        <div className="ac-lab-field">
          <label>Unit price</label>
          <span>₦9,500</span>
        </div>
      </div>
      <div className="ac-lab-field">
        <label>Delivery</label>
        <span>₦5,000</span>
      </div>
      <div className="ac-lab-total">
        <span>Total, app-computed</span>
        <strong>₦52,500</strong>
      </div>
      <p className="ac-lab-form-hint">The assistant reads the form; you approve each card.</p>
    </div>
  )
}

function ListContent() {
  return (
    <div className="ac-lab-pagebody">
      <header className="ac-lab-pagehead">
        <p className="ac-lab-form-title">Invoices</p>
        <span className="ac-lab-bell">
          <Filter className="size-3.5" />
        </span>
      </header>
      <div className="ac-lab-search">
        <Search className="size-3.5" />
        <span>Search invoices</span>
      </div>
      <div className="ac-lab-chips">
        <span className="on">All</span>
        <span>Draft</span>
        <span>Sent</span>
        <span>Paid</span>
      </div>
      <div className="ac-lab-block">
        <Row number="INV-000131" client="ABC Ltd" amount="₦480,000" status="Paid" />
        <Row number="INV-000129" client="Delta Foods" amount="₦212,500" status="Sent" />
        <Row number="INV-000128" client="Kano Textiles" amount="₦96,000" status="Draft" />
        <Row number="INV-000120" client="Zaria Mart" amount="₦54,000" status="Overdue" />
        <Row number="INV-000117" client="Lagos Prints" amount="₦38,500" status="Overdue" />
      </div>
    </div>
  )
}

function Keyboard() {
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
  return (
    <div className="ac-lab-keyboard" aria-hidden="true">
      {rows.map((row) => (
        <div className="ac-lab-keyrow" key={row}>
          {row.split('').map((key) => (
            <span key={key}>{key}</span>
          ))}
        </div>
      ))}
      <div className="ac-lab-keyrow">
        <span className="wide">space</span>
      </div>
    </div>
  )
}

function DeskKpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
