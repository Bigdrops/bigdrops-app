# Waterfall Roadmap

- **Status:** DRAFT FOR REVIEW
- **Product:** Conversational Document Assistant
- **Written:** 2026-11-13
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Source documents:** `Readme.md`, `functional-req.md`, `architecture.md`, `decision-log.md`, `risk-register.md`, `test-plan.md`

---

## 1. Scope Change From The PRD

The PRD was written as the Conversational Invoice Assistant and renamed to the Conversational Document Assistant on 2026-11-13. The invoice is the first document, not the only one.

The assistant is a document assistant. It writes into any document form that the app already has. FR-17 and DEC-14 already require the chat sheet, the provider client, the tool list and the failover rules to live outside the invoice module. This roadmap takes that rule to its end.

The invoice stays the reference pack. It is the hardest pack, because it holds the money rules. A pack that works for the invoice is a template for the other seven.

---

## 2. Every Document Type In Scope

These are the authorable document forms in the app today.

| # | Document | Form page | Pack | Weight |
|---|---|---|---|---|
| 1 | Invoice | `InvoiceFormPage.tsx` | money | heavy, reference pack |
| 2 | Quotation | `QuotationFormPage.tsx` | money | heavy, proves the engine is generic |
| 3 | Purchase Order | `PurchaseOrderFormPage.tsx` | commitment | medium, supplier not client, lines are free text plus a cost |
| 4 | Waybill | `WaybillFormPage.tsx` | logistics | medium, consignee, dispatch, lines |
| 5 | CSR | `CsrFormPage.tsx` | service | medium, service report and sign-off |
| 6 | RFQ | `NewRfq.tsx` / `EditRfq.tsx` | sourcing | medium, vendor pricing for procurement items |
| 7 | Cost and Pricing Sheet | `CpsFormPage.tsx` | costing | medium, pre-sales cost and pricing lines |
| 8 | Letter | `LetterFormPage.tsx` | correspondence | light, recipient, reference and body |

Two further surfaces read rather than author: Receipts, which come from payments, and the Compliance Hub and Tax screens, which compute. They get the same chat sheet in stage E as read-only assistants. They do not get a write pack.

The exact setters per document must be read from each form page in stage A. This roadmap does not assume that a shared setter contract exists today. If the forms differ, the tool pack is where the difference lives, and the engine stays unchanged.

---

## 3. How To Read This Roadmap

The plan has three time boxes. Build the engine in one week. Add one document pack per day after that. Trial the whole set for four weeks.

The plan is a waterfall. Each stage has a gate. A stage does not start until the gate of the stage before it passes. A failed gate returns to the stage that owns it. A gate is a test result. A gate is not a date.

Every item names its source: a functional requirement (FR), a decision (DEC), a risk (RISK) or a test (U, I, C, M, D).

The day slots are a plan. They are not measured. The trial is measured.

---

## 4. The Shape

| Stage | Time | Goal | Gate |
|---|---|---|---|
| G-0 Readiness | 2 days, parallel | Keys, gateway, network proof, open decisions | Four keys answer. The gateway answers. Three decisions are closed. |
| A Engine | Day 1 and day 2 | One client, many provider rows, one chat sheet, one card | U-20 to U-34, C-01 to C-07 |
| B Invoice pack | Day 3 | The reference pack, with the money guard | U-01 to U-13, M-04, I-01 to I-03 |
| C Quotation pack | Day 4 | A second money document on the same engine | Conformance suite passes for 2 documents |
| D Operations packs | Day 5 to day 7 | Purchase Order, Waybill, CSR | Conformance suite passes for 5 documents |
| E Text and read packs | Day 8 to day 9 | RFQ, Cost and Pricing Sheet, Letter, plus the read-only surfaces | Conformance suite passes for 8 documents |
| F Breadth gate | Day 10 | One suite, every pack | `test-plan.md` section 9, widened |
| G Trial | 4 weeks | Daily use across the document set | Two measures reported each Friday |
| H Decision | 1 day | Keep, change or remove | A written decision with the two measures |

The build is ten working days, not five. The PRD gate of one week was written for one document. Eight packs add five days. See section 13 for the two ways to shorten this.

The critical path is G-0, then A, then B, then F. C, D and E can run in any order after B, and they can share the same days when a pack is light.

---

## 5. G-0 Readiness

**Time:** two days. It runs in parallel with stage A.

| # | Work | Source |
|---|---|---|
| 1 | Create one key each for NVIDIA NIM, Cloudflare Workers AI, AMD Token Factory and OpenRouter. No card. | Readme §4 |
| 2 | Install the gateway. Set its bearer token. Bind it to loopback unless the phone needs the LAN address. | DEC-20, RISK-20, RISK-21 |
| 3 | Send one tool call from the phone on the mobile network. Record the time. | Readme §11, FR-10 |
| 4 | Send the same request to the AMD endpoint from the Nigerian network. Record the time or the failure. | RISK-15 |
| 5 | Measure the JSON import path with three real invoices. Keep the numbers. | PRD §6 |
| 6 | Write the disclosure text and the note and term defaults. | FR-13, FR-07 |
| 7 | List the setters of all eight form pages. Record which ones share a shape. | section 2 |
| 8 | Choose one provider order. See section 6. | DEC-17, DEC-18 |

**Gate G-0**

- Four provider keys answer one request each.
- The gateway answers through the phone, not only through the developer computer.
- The AMD reachability result is recorded, pass or fail.
- The JSON import baseline has three timings.
- The setter list exists for all eight forms.
- The disclosure text and the defaults are approved.

---

## 6. The Provider Constraint, Stated Correctly

This section replaces a loose claim in the first draft of this roadmap.

**No provider supports tenancy. That is not a property that exists.** Every provider is one API key with one quota. The app can call any OpenAI compatible endpoint from any document form. The technical work is the same for all of them.

The real constraint is legal and economic. It has two shapes.

| Shape | Who holds the key | Whose terms apply | Usable for | Source |
|---|---|---|---|---|
| **Each tenant brings their own key** | The tenant, in the app's private storage | The tenant accepted those terms at signup | The shipping path. Any document, any tenant. | DEC-21, DEC-12 |
| **The vendor pools one key for everyone** | The vendor | The vendor accepted the terms, and every tenant's traffic is the vendor's traffic | A demo, an internal trial, or a paid plan | RISK-14 |

The second shape fails for two reasons. First, one free quota then serves every tenant, so the first busy day exhausts it for all of them. Second, several free tiers call themselves a trial or development service and forbid resale. The AMD Token Factory states this directly. That is RISK-14, and it is about the vendor's key, not about a missing feature in a provider.

The consequence for this roadmap:

- The trial can use the vendor's keys, because the vendor is the only user. That is inside those terms.
- A release to tenants uses the first shape. Each tenant pastes their own key, or the product pays for a production provider.
- No stage is blocked by a tenancy feature. No such feature is needed.

The one point to close is the order of the chain, not its legality.

---

## 7. Stage A Engine

**Time:** day 1 and day 2.
**Goal:** everything that is not a document.

| # | Work | File | Source |
|---|---|---|---|
| 1 | The provider catalog. A row is a base URL, a key id and a model. A gateway is one row. | `src/lib/ai-assistant/providerCatalog.ts` | DEC-08, DEC-20 |
| 2 | The request builder. Send only `model`, `messages`, `tools`, `tool_choice`, `stream`, `max_tokens` and `reasoning_effort`. | `providerClient.ts` | FR-10, RISK-16 |
| 3 | The stream parser. Separate text tokens from tool call tokens. | `providerClient.ts` | FR-02, C-01 to C-07 |
| 4 | The failure classifier. 429, 5xx, 401, 403 and 404 advance. A 400 stops. A timeout advances once. | `failover.ts` | DEC-10, U-20 to U-24 |
| 5 | The key store. `Directory.Private`, `ai-assistant/keys.json`, mode `0600`, one masking helper. | `keys.ts` | DEC-12, U-30 to U-34 |
| 6 | The quota reader. Read the allowance from the provider, never from a stored table. | `quota.ts` | DEC-11, FR-11 |
| 7 | The chat sheet. It takes a tool list and a form adapter. It does not know which document it serves. | `src/components/ai-assistant/AssistantSheet.tsx` | FR-17, DEC-14 |
| 8 | The change card. Field, old value, new value. Accept applies once. | `ChangeCard.tsx` | FR-04, DEC-05 |
| 9 | The form adapter contract. One interface: read the state, resolve a row, apply a validated change. | `src/lib/ai-assistant/formAdapter.ts` | section 8.1 |

**Gate A**

- U-20 to U-26 pass. U-30 to U-34 pass. C-01 to C-07 pass.
- The sheet mounts with a fake adapter and a fake tool list, with no invoice import anywhere in its tree.
- The adapter contract has no field that names a document type.

---

## 8. The Form Adapter

The engine talks to a document through one interface. This is the whole reason eight documents cost five days and not eight weeks.

```ts
type DocumentAdapter = {
  documentType: string
  readState(): CompactState
  readComputedTotals(): Record<string, number>
  resolveRow(fragment: string): RowResolution
  applyChange(tool: ValidToolCall): ApplyResult
  prepareFiling(): FilingPreview
}
```

### 8.1 The Rules Of The Contract

- `readState` returns only the fields that a tool can change, plus the computed totals as read-only values.
- `resolveRow` owns row identity. A fragment that matches no row or two rows returns a clear failure. No model ever carries a row index.
- `applyChange` is the only writer. It revalidates. It refuses a computed field.
- `prepareFiling` never saves. The form's own save path runs after the user confirms.

### 8.2 One Pack Per Document

A pack is three things and nothing more:

1. The tool schemas for that document.
2. The adapter that maps each tool to that form's setters.
3. A fixture for the conformance suite.

---

## 9. Stage B — The Invoice Pack

**Time:** day 3. This is the reference pack and the hardest one.

| # | Work | Source |
|---|---|---|
| 1 | Nine invoice tools. No computed field in the list. | FR-03, FR-05, U-01 |
| 2 | The computed field guard. A call that names `amount`, `subtotal`, `total`, `vat_rate`, `discount_rate`, `wht_rate` or `install_rate` is rejected as a tool result. | U-02 |
| 3 | The row resolver by description fragment. | DEC-04, U-10 to U-13 |
| 4 | The argument guard. | U-03 to U-06 |
| 5 | The agent loop, with two invalid calls stopping the loop. | RISK-06, I-07 |
| 6 | The contradiction check before the model sees the text. | FR-06 |
| 7 | The money proof: `computeDocument` is read, never written. | M-04, RISK-11 |

**Gate B**

- U-01 to U-13 and M-04 pass.
- I-01 to I-03 pass: one apply, a rejection changes nothing.
- 5 at 95000 shows 475000, and the number comes from the app.

---

## 10. Stage C To E — The Other Packs

### 10.1 Stage C — Quotation, day 4

The quotation is the second money document. It is the honest test of the engine, because it repeats the invoice shape on a different form and a different save path.

- The same money guard. The same row resolver. A different adapter.
- A quotation converts to an invoice. The assistant must not perform that conversion. It prepares the fields and the existing flow runs.

**Gate C:** the conformance suite passes for two documents. No line of the engine changed to add the second one.

### 10.2 Stage D — Operations packs, day 5 to day 7

| Document | What the pack adds | Watch |
|---|---|---|
| Purchase Order | Supplier instead of client. Lines are free text plus a cost, so the money guard is lighter than the invoice. | A PO line has no Item Library link by design. Do not add one. |
| Waybill | Consignee, dispatch details, lines. | It is a logistics document, so a wrong quantity is a delivery dispute, not a wrong total. |
| CSR | Service report and sign-off fields. | Sign-off is a human act. The assistant must not set it. |

**Gate D:** the conformance suite passes for five documents.

### 10.3 Stage E — Text and read packs, day 8 to day 9

| Document | What the pack adds | Watch |
|---|---|---|
| RFQ | Vendor pricing requests. | Output is a request, so it must never read as a commitment. |
| Cost and Pricing Sheet | Pre-sales cost and pricing lines. | Cost is the vendor's own number. The assistant must not guess a margin. |
| Letter | Recipient, reference and body. | Plain text only. One paragraph block, as DEC-15 already sets for notes. |
| Receipts, Compliance Hub, Tax | Read-only. The sheet answers questions about what is on screen. | No write tools. No exceptions. |

**Gate E:** the conformance suite passes for eight documents. The read-only surfaces expose zero write tools, and a test asserts it.

---

## 11. Stage F — The Breadth Gate

**Time:** day 10.

One suite, every pack. This is the gate that makes eight documents a system and not eight features.

| # | Check | Applies to |
|---|---|---|
| 1 | The tool list holds no field that a calculation writes | every pack |
| 2 | A call that names a computed field is rejected | every pack |
| 3 | A fragment that matches one, none or two rows behaves as the contract says | every pack with rows |
| 4 | A change card applies once and a rejection changes nothing | every pack |
| 5 | `file it` prepares a confirmation and does not save | every authorable pack |
| 6 | The assistant is off by default and sends nothing when off | the whole app |
| 7 | Every form still works with the assistant off, broken or unreachable | every pack |
| 8 | No diff to `src/lib/Calculations.ts` and none to a PDF renderer | the trial branch |
| 9 | The read-only surfaces expose no write tool | Receipts, Compliance, Tax |
| 10 | The critical suite holds its prior result | the repository |

**Gate F** is `test-plan.md` section 9, widened from one document to eight:

- Every test in sections 2 to 5 passes, for every pack.
- D-01, D-03, D-06 and D-07 pass on a real phone, for the invoice and at least one other document.
- M-01, M-02 and M-03 pass.
- The disclosure text and the defaults are approved.
- The three open decisions in section 15 are closed.

Commands, in this order:

```bash
bun run audit:load
bun run typecheck
bun run test
bun run lint
```

`audit:load` runs before `typecheck`, as `AGENTS.md` requires.

---

## 12. Stage G — Trial

**Time:** four weeks.

The trial now covers the document set, not one document.

| Week | Action | Output |
|---|---|---|
| 1 | Five invoices, three quotations, two waybills by conversation. | The first error list, per document. |
| 2 | Fix the top three errors. Measure both paths again. | The first comparison. |
| 3 | Daily use across the set. Add the PO and CSR packs to daily use. | Errors per twenty documents. |
| 4 | Measure again. Write the decision. | The trial result. |

**The two measures**

| Measure | Target |
|---|---|
| Time from opening a document to saving it | Median 90 seconds or less, against the JSON import baseline |
| Assistant errors the user corrects by hand | Fewer than 1 per 20 documents by week 4 |

Report both measures per document type. One number for the whole set hides a pack that is failing.

---

## 13. Two Ways To Shorten The Build

The build is ten days. If ten days is too long, pick one. Do not do both silently.

| Option | Effect | Cost |
|---|---|---|
| **Ship invoice and quotation first** | Five days. Two money documents, one engine. | The contract has no pack for the other six. The trial measures two documents. |
| **Ship the engine plus one pack per day as it lands** | The gate moves later. The trial starts when the first pack passes. | The trial measures a moving target. RISK-13 gets worse. |

The roadmap keeps ten days as the plan, because a half-covered contract is what the first draft of this document was.

---

## 14. Dependency Chain

```
G-0 keys + gateway + reachability + setter list + 3 decisions
  |
  v
A engine: client, failover, keys, quota, sheet, card, adapter contract
  |
  v
B invoice pack (reference, money guard)
  |
  +--> C quotation
  +--> D PO, waybill, CSR
  +--> E RFQ, cost sheet, letter, read-only surfaces
  |
  v
F breadth gate (one suite, eight packs)
  |
  v
G trial (4 weeks)
  |
  v
H decision
```

---

## 15. Open Points

| # | Point | Stage | Owner |
|---|---|---|---|
| D-1 | One provider order. The PRD lists NVIDIA first. DEC-17 and DEC-18 put Cloudflare first and AMD second. | G-0 | Product |
| D-2 | Where the new tests run. `bun run test` runs the critical folder only. | G-0 | Engineering |
| D-3 | The trial audience. Product owner, or the whole test tenant. | G-0 | Product |
| D-4 | The order of the document packs. This roadmap puts money first. | G-0 | Product |
| Q1 | Key in the header only, or a proxy for a future browser build | A | Engineering |
| Q2 | May the assistant create a client or supplier record | B, D | Product |
| Q3 | May the assistant change a document number | B | Product |
| Q4 | The note and term defaults | G-0 | Product |
| Q5 | Whether a converted quotation keeps assistant notes | C | Product |

A point is not a blocker until its stage starts. It is a blocker at its gate.

---

## 16. What This Roadmap Does Not Include

- Photo, image or scan input.
- Voice input.
- Automatic sending to a client, a supplier or a consignee.
- A database table for assistant history. DEC-13.
- Any paid provider, unless the product chooses to pay. Section 6.
- Any change to `src/lib/Calculations.ts`. G1.
- Any change to a PDF renderer. G2.
- The on-device Local AI work. It is a separate ticket.
- An Item Library link on a purchase order line. That link is deliberately absent.
