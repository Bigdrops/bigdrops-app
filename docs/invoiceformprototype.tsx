import React, { useMemo, useState } from "react"; import { X, Search, SlidersHorizontal, Download, Settings2, Eye, EyeOff, ChevronDown, Plus, ArrowUp, ArrowDown, Camera, Copy, HelpCircle, Percent, Trash2 } from "lucide-react";

const initialColumns = [ { key: "make", label: "Make", type: "text", visible: true }, { key: "unit", label: "Unit", type: "text", visible: true }, { key: "install_rate", label: "Install Rate", type: "rate", visible: true }, { key: "vat_rate", label: "VAT Rate", type: "VAT%", visible: false }, { key: "discount_rate", label: "Discount Rate", type: "Disc%", visible: false }, ];

type Client = { name: string; subtext: string }; type Item = { id: string; description: string; subDescription?: string; make?: string; qty: number; unit?: string; unitPrice: number; photo?: boolean }; type Group = { id: string; title: string; showSubtotal: boolean; items: Item[] }; type Charge = { id: string; label: string; value: number; taxApplies: boolean };

const clients: Client[] = [ { name: "Sun & Shield Power Solutions", subtext: "Lagos · Commercial" }, { name: "Abisco Allied Ventures", subtext: "Lagos · Industrial" }, { name: "Pineridge Construction Ltd", subtext: "Lagos · Construction" }, ];

function makeItem(id: string): Item { return { id, description: "", qty: 1, unit: "", unitPrice: 0 }; }

function flattenItems(rows: Array<Item | Group>) { const flat: Item[] = []; rows.forEach((row) => { if ("items" in row) flat.push(...row.items); else flat.push(row); }); return flat; }

export default function InvoiceFormReferencePrototype() { const [selectedClient, setSelectedClient] = useState<Client | null>(clients[0]); const [clientPickerOpen, setClientPickerOpen] = useState(false); const [tableSettingsOpen, setTableSettingsOpen] = useState(false); const [importOpen, setImportOpen] = useState(false); const [helpOpen, setHelpOpen] = useState(false); const [importMode, setImportMode] = useState<"add" | "update">("add"); const [helpStep, setHelpStep] = useState(0); const [columns, setColumns] = useState(initialColumns); const [rows, setRows] = useState<Array<Item | Group>>([ makeItem("1"), makeItem("2"), { id: "g1", title: "Group 1", showSubtotal: true, items: [makeItem("3"), makeItem("4")] }, ]); const [customFields, setCustomFields] = useState<Array<{ id: string; label: string; value: string }>>([]); const [charges, setCharges] = useState<Charge[]>([]); const [pendingChargeChoice, setPendingChargeChoice] = useState<null | boolean>(null); const [showTableResetConfirm, setShowTableResetConfirm] = useState(false);

const allItems = useMemo(() => flattenItems(rows), [rows]);

const renumberedRows = useMemo(() => { let n = 0; return rows.map((row) => { if ("items" in row) { return { ...row, items: row.items.map((item) => ({ ...item, number: ++n })), }; } return { ...row, number: ++n }; }); }, [rows]);

const updateColumn = (key: string, patch: Partial<(typeof columns)[number]>) => { setColumns((prev) => prev.map((col) => (col.key === key ? { ...col, ...patch } : col))); };

const rowOverrideCounts = { vat: 0, discount: 0, install: 0 };

return ( <div className="min-h-screen bg-slate-100 text-slate-950"> <div className="mx-auto max-w-md px-3 pb-32 pt-4"> <header className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm pb-3"> <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">New Invoice</div> <div className="mt-1 flex items-start justify-between gap-3"> <h1 className="text-5xl font-black tracking-tight">Create Invoice</h1> <button className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600"> <Settings2 className="h-5 w-5" /> </button> </div> <div className="mt-3 flex gap-1"> <div className="h-1 flex-1 rounded-full bg-blue-600" /> <div className="h-1 flex-1 rounded-full bg-blue-300" /> <div className="h-1 flex-1 rounded-full bg-slate-200" /> <div className="h-1 flex-1 rounded-full bg-slate-200" /> </div> </header>

<Section title="Document Details" dot="bg-slate-900">
      <Card>
        <Label>Client</Label>
        <button onClick={() => setClientPickerOpen(true)} className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-left">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <Download className="h-4 w-4 rotate-180" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Client</div>
              <div className="truncate text-[15px] font-bold text-slate-950">{selectedClient?.name ?? "Select a client"}</div>
              <div className="truncate text-sm text-slate-400">{selectedClient?.subtext ?? "Tap to choose"}</div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </button>
      </Card>
    </Section>

    <Section title="Custom Fields" dot="bg-violet-600" right={<SmallPill icon={<Plus className="h-3 w-3" />} text="Add Field" onClick={() => setCustomFields((p) => [...p, { id: crypto.randomUUID(), label: "", value: "" }])} />}>
      <Card className="space-y-2 p-3">
        {customFields.length === 0 ? <div className="text-sm text-slate-400">No custom fields yet.</div> : null}
        {customFields.map((field) => (
          <div key={field.id} className="grid grid-cols-[1fr_1fr_36px] gap-2">
            <input className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3" placeholder="Label" value={field.label} onChange={(e) => setCustomFields((p) => p.map((f) => (f.id === field.id ? { ...f, label: e.target.value } : f)))} />
            <input className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3" placeholder="Value" value={field.value} onChange={(e) => setCustomFields((p) => p.map((f) => (f.id === field.id ? { ...f, value: e.target.value } : f)))} />
            <button onClick={() => setCustomFields((p) => p.filter((f) => f.id !== field.id))} className="rounded-xl border border-red-200 bg-red-50 text-red-500"><X className="mx-auto h-4 w-4" /></button>
          </div>
        ))}
      </Card>
    </Section>

    <Section title="Line Items" dot="bg-emerald-600" right={<span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">{allItems.length} items</span>}>
      <Card className="grid grid-cols-2 gap-2 p-3">
        <PrimaryGhostButton icon={<Download className="h-4 w-4 rotate-180" />} text="Import" onClick={() => setImportOpen(true)} />
        <PrimaryGhostButton icon={<SlidersHorizontal className="h-4 w-4" />} text="Table Settings" onClick={() => setTableSettingsOpen(true)} />
      </Card>

      <div className="mt-4 space-y-4">
        {renumberedRows.map((row) =>
          "items" in row ? (
            <div key={row.id} className="rounded-2xl border border-amber-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-3">
                <input value={row.title} onChange={() => {}} className="min-w-0 flex-1 bg-transparent text-sm font-extrabold text-slate-950 outline-none" />
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Show subtotal</span>
                  <input type="checkbox" checked={row.showSubtotal} readOnly />
                </div>
                <button className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-500"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3 px-3 py-3">
                {row.items.map((item: any) => (
                  <ItemRow key={item.id} item={item} />
                ))}
                {row.showSubtotal ? <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">Group subtotal: NGN 0.00</div> : null}
                <button className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-sm font-bold text-amber-700"><Plus className="h-4 w-4" />Add item to group</button>
              </div>
            </div>
          ) : (
            <ItemRow key={row.id} item={row as any} />
          ),
        )}
      </div>

      <div className="mt-3 grid grid-cols-[1.3fr_1fr] gap-2">
        <button className="flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 text-sm font-bold text-emerald-700"><Plus className="h-4 w-4" />Add item</button>
        <button className="flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-sm font-bold text-amber-700"><Plus className="h-4 w-4" />Add group</button>
      </div>
    </Section>

    <Section title="Commercial Terms" dot="bg-amber-500">
      <Card className="space-y-4 p-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Payment Terms" placeholder="Custom" />
          <Field label="Due / Validity" placeholder="e.g. Due in 14 days" />
        </div>
        <Accordion title="Additional Charges" subtitle={charges.length ? `${charges.length} charge${charges.length > 1 ? "s" : ""}` : "None"} defaultOpen>
          {pendingChargeChoice === null ? (
            <button onClick={() => setPendingChargeChoice(true)} className="mt-1 flex h-9 items-center justify-center gap-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 text-sm font-bold text-amber-700"><Plus className="h-4 w-4" />Add charge</button>
          ) : (
            <div className="space-y-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Tax for new charge</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setCharges((p) => [...p, { id: crypto.randomUUID(), label: "", value: 0, taxApplies: true }]); setPendingChargeChoice(null); }} className="h-10 rounded-xl border border-slate-200 bg-white text-sm font-bold">Tax applies</button>
                  <button onClick={() => { setCharges((p) => [...p, { id: crypto.randomUUID(), label: "", value: 0, taxApplies: false }]); setPendingChargeChoice(null); }} className="h-10 rounded-xl border border-slate-200 bg-white text-sm font-bold">No tax</button>
                </div>
              </div>
            </div>
          )}
          <div className="mt-3 space-y-2">
            {charges.map((charge) => (
              <div key={charge.id} className="grid grid-cols-[1fr_90px_28px] gap-2">
                <div className="relative">
                  <input className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8" placeholder="Label" value={charge.label} onChange={(e) => setCharges((p) => p.map((c) => (c.id === charge.id ? { ...c, label: e.target.value } : c)))} />
                  {charge.taxApplies ? <Percent className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /> : null}
                </div>
                <input className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-right" value={charge.value} onChange={(e) => setCharges((p) => p.map((c) => (c.id === charge.id ? { ...c, value: Number(e.target.value || 0) } : c)))} />
                <button className="rounded-xl border border-red-200 bg-red-50 text-red-500"><X className="mx-auto h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </Accordion>
      </Card>
    </Section>

    <Section title="Advanced Options" dot="bg-emerald-600">
      <Card className="divide-y divide-slate-100">
        <Subsection title="Document Visibility">
          <ToggleRow label="Show bank details" defaultChecked />
          <ToggleRow label="Show balance due" defaultChecked />
          <ToggleRow label="Show VAT % in brackets" defaultChecked />
          <ToggleRow label="Show WHT % in brackets" defaultChecked />
          <ToggleRow label="Show discount % in brackets" defaultChecked />
        </Subsection>
        <Subsection title="Branding">
          <ToggleRow label="Show tagline" />
          <ToggleRow label="Show footer" />
        </Subsection>
      </Card>
    </Section>
  </div>

  {clientPickerOpen ? (
    <Sheet title="Select Client" onClose={() => setClientPickerOpen(false)}>
      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400">Search clients</div>
      <div className="space-y-1">
        {clients.map((client) => (
          <button key={client.name} onClick={() => { setSelectedClient(client); setClientPickerOpen(false); }} className="block w-full rounded-xl px-3 py-3 text-left hover:bg-slate-50">
            <div className="truncate font-bold">{client.name}</div>
            <div className="truncate text-sm text-slate-400">{client.subtext}</div>
          </button>
        ))}
      </div>
    </Sheet>
  ) : null}

  {tableSettingsOpen ? (
    <Sheet title="Table Settings" subtitle="Manage columns and row behavior" onClose={() => setTableSettingsOpen(false)}>
      <Subsection title="Columns" compact>
        <div className="space-y-2">
          {columns.map((col) => (
            <div key={col.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="text-slate-400">⋮⋮</div>
                <button onClick={() => updateColumn(col.key, { visible: !col.visible })} className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500">
                  {col.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <input value={col.label} onChange={(e) => updateColumn(col.key, { label: e.target.value })} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3" />
                <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-400">{col.type}</span>
              </div>
            </div>
          ))}
        </div>
      </Subsection>
      <Subsection title="Custom Columns" compact>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm text-slate-400">No custom columns</div>
          <SmallPill icon={<Plus className="h-3 w-3" />} text="Add column" />
        </div>
      </Subsection>
      <Subsection title="Row Overrides" compact subtitle="Clear per-row VAT, discount, and install overrides">
        <OverrideRow label="VAT overrides" count={rowOverrideCounts.vat} />
        <OverrideRow label="Discount overrides" count={rowOverrideCounts.discount} />
        <OverrideRow label="Install rate" count={rowOverrideCounts.install} />
        <button className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white text-sm font-bold">Reset all row overrides</button>
      </Subsection>
      <Subsection title="Table" compact>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div>
            <div className="font-bold">Reset table to default</div>
            <div className="text-sm text-slate-400">Restores columns, labels, and layout. Does not remove items.</div>
          </div>
          <button onClick={() => setShowTableResetConfirm(true)} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600">Reset</button>
        </div>
      </Subsection>
    </Sheet>
  ) : null}

  {importOpen ? (
    <Sheet title="Import JSON" onClose={() => setImportOpen(false)}>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        <button onClick={() => setImportMode("add")} className={`h-9 rounded-lg text-sm font-bold ${importMode === "add" ? "bg-white shadow-sm" : "text-slate-500"}`}>Add</button>
        <button onClick={() => setImportMode("update")} className={`h-9 rounded-lg text-sm font-bold ${importMode === "update" ? "bg-white shadow-sm" : "text-slate-500"}`}>Update</button>
      </div>
      <div className="mb-2 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400"><span>AI Prompt</span><button className="flex items-center gap-1 text-xs font-bold normal-case tracking-normal text-blue-600"><Copy className="h-3.5 w-3.5" />Copy</button></div>
      <div className="mb-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{importMode === "add" ? "Create and append new line items from extracted JSON." : "Patch existing visible rows using row_number."}</div>
      <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">JSON Input</div>
      <textarea className="h-32 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm" defaultValue={importMode === "add" ? '{\n  "items": [{ "description": "...", "quantity": 1, "unit_price": 0 }]\n}' : '{\n  "items": [{ "row_number": 3, "unit_price": 50000 }]\n}'} />
      <button onClick={() => setHelpOpen(true)} className="mt-3 flex items-center gap-2 text-sm font-semibold text-blue-600"><HelpCircle className="h-4 w-4" />How to use Import</button>
      <button className="mt-4 h-11 w-full rounded-2xl bg-slate-950 text-sm font-bold text-white">{importMode === "add" ? "Add rows" : "Update rows"}</button>
    </Sheet>
  ) : null}

  {helpOpen ? (
    <Sheet title="How to use Import" onClose={() => setHelpOpen(false)}>
      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="mb-2 text-lg font-extrabold">{["Add vs Update", "Copy → extract → paste → apply", "Common mistakes"][helpStep]}</div>
        <div className="mb-4 text-sm text-slate-600">
          {helpStep === 0 ? "Use Add for new rows. Use Update to patch existing rows with row_number." : helpStep === 1 ? "Copy the prompt, run it in your AI tool, paste JSON back here, then apply." : "Avoid missing items arrays, invalid JSON, or updates without row_number."}
        </div>
        <div className="mb-4 aspect-video rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center text-sm text-slate-400">Tutorial video placeholder</div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">{[0,1,2].map((i)=><div key={i} className={`h-2 w-2 rounded-full ${helpStep===i?"bg-blue-600":"bg-slate-200"}`} />)}</div>
          <div className="flex gap-2">
            <button onClick={() => setHelpStep((s) => Math.max(0, s - 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Back</button>
            <button onClick={() => setHelpStep((s) => Math.min(2, s + 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Next</button>
          </div>
        </div>
      </div>
    </Sheet>
  ) : null}

  {showTableResetConfirm ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-xl">
        <div className="p-5">
          <div className="text-2xl font-extrabold">Reset table to default?</div>
          <div className="mt-2 text-slate-500">Restores columns, labels, and layout. Does not remove items.</div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 p-4">
          <button onClick={() => setShowTableResetConfirm(false)} className="h-11 rounded-2xl border border-slate-200 bg-white text-base font-bold">Cancel</button>
          <button onClick={() => setShowTableResetConfirm(false)} className="h-11 rounded-2xl bg-red-600 text-base font-bold text-white">Reset</button>
        </div>
      </div>
    </div>
  ) : null}
</div>

); }

function ItemRow({ item }: { item: any }) { return ( <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"> <div className="flex items-center justify-between px-3 pt-3"> <div className="text-xs font-extrabold text-slate-500">{item.number}</div> <div className="flex items-center gap-1"> <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"><ArrowUp className="h-4 w-4" /></button> <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"><ArrowDown className="h-4 w-4" /></button> <button className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-500"><X className="h-4 w-4" /></button> </div> </div> <div className="space-y-2 p-3"> <textarea className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-semibold" placeholder="Item description" defaultValue={item.description} /> <button className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500"><ChevronDown className="h-3.5 w-3.5" />Sub-desc</button> <div className="grid grid-cols-2 gap-2"> <Field label="Make / Brand" placeholder="e.g. Siemens" /> <Field label="Unit Price (NGN)" placeholder="0" align="right" /> <Field label="Qty" placeholder="1" align="center" /> <Field label="Unit" placeholder="pcs" /> </div> <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"> <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Amount</span> <span className="text-2xl font-black tracking-tight">NGN 0.00</span> </div> <div className="flex flex-wrap gap-2"> <button className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-extrabold uppercase tracking-[0.06em] text-slate-500"><Camera className="h-3.5 w-3.5" />Photo</button> </div> </div> </div> ); }

function Section({ title, dot, right, children }: any) { return ( <section className="mt-5"> <div className="mb-2 flex items-center justify-between px-1"> <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500"><span className={h-2 w-2 rounded-full ${dot}} />{title}</div> {right} </div> {children} </section> ); }

function Card({ children, className = "p-3" }: { children: React.ReactNode; className?: string }) { return <div className={rounded-3xl border border-slate-200 bg-white shadow-sm ${className}}>{children}</div>; }

function Label({ children }: { children: React.ReactNode }) { return <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{children}</div>; }

function Field({ label, placeholder, align = "left" }: { label: string; placeholder: string; align?: "left" | "right" | "center" }) { return ( <div> <Label>{label}</Label> <input className={h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"}} placeholder={placeholder} /> </div> ); }

function PrimaryGhostButton({ icon, text, onClick }: any) { return <button onClick={onClick} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700">{icon}{text}</button>; }

function SmallPill({ icon, text, onClick }: any) { return <button onClick={onClick} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-700">{icon}{text}</button>; }

function Sheet({ title, subtitle, onClose, children }: any) { return ( <div className="fixed inset-0 z-40 flex items-end bg-black/30 p-0 sm:items-center sm:justify-center sm:p-4"> <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-t-3xl bg-white sm:rounded-3xl"> <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" /> <div className="flex items-start justify-between p-4"> <div> <div className="text-2xl font-extrabold">{title}</div> {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null} </div> <button onClick={onClose} className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500"><X className="h-4 w-4" /></button> </div> <div className="border-t border-slate-100 p-4">{children}</div> </div> </div> ); }

function Accordion({ title, subtitle, defaultOpen = false, children }: any) { const [open, setOpen] = useState(defaultOpen); return ( <div className="overflow-hidden rounded-2xl border border-slate-200"> <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-slate-50"> <div> <div className="font-bold">{title}</div> <div className="text-sm text-slate-400">{subtitle}</div> </div> <ChevronDown className={h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}} /> </button> {open ? <div className="border-t border-slate-100 p-3">{children}</div> : null} </div> ); }

function Subsection({ title, subtitle, compact = false, children }: any) { return ( <div className={compact ? "pt-0" : "pt-3"}> <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{title}</div> {subtitle ? <div className="mb-2 text-sm text-slate-400">{subtitle}</div> : null} {children} </div> ); }

function ToggleRow({ label, defaultChecked = false }: { label: string; defaultChecked?: boolean }) { const [checked, setChecked] = useState(defaultChecked); return ( <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-700"> <span>{label}</span> <button onClick={() => setChecked((c) => !c)} className={relative h-6 w-11 rounded-full ${checked ? "bg-emerald-500" : "bg-slate-200"}}> <span className={absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}} /> </button> </div> ); }

function OverrideRow({ label, count }: { label: string; count: number }) { return ( <div className="flex items-center justify-between py-2"> <div className="flex items-center gap-2 text-sm text-slate-700"><span>{label}</span><span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-400">{count}</span></div> <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">Reset</button> </div> ); }