# BOURXE / Bolu - Commercial Clerk Behaviour & Intelligence PRD

**Status:** DRAFT FOR USER REVIEW. No requirement in this document is approved by the act of writing it.
**Date:** 2026-11-22
**Task type:** Product discovery, requirements analysis, PRD development. Read-only.
**Scope:** Behavioural and intelligence requirements for Bolu as a commercial clerk inside BOURXE, starting from the existing invoice and quotation capability. No document scope expansion, no implementation.
**Companions:** `docs/prd/conversational-document-assistant/` (existing PRD family), `docs/reports/ai-BOLU/2026-11-22-bolu-conversational-behaviour-and-instruction-quality-audit.md`, `docs/reports/ai-BOLU/2026-11-22-bolu-conversational-behaviour-corrections.md`.

**Classification used throughout:**

- **DECISION** - explicitly approved by the user, or already governing the repository.
- **OBSERVATION** - verified current behaviour or implementation, read from source in this task.
- **REFERENCE** - industry practice or illustrative example. Not a requirement.
- **PROPOSAL** - suggested future behaviour awaiting explicit approval.

Anything marked PROPOSAL is not a requirement. No user approval is inferred anywhere in this document.

---

## 1. Executive summary

Bolu today is a reliable document operator with an unreliable commercial manner. He can parse a pasted list, propose an invoice or quotation, preserve supplied quantities and prices, and put every change behind two approval gates. What he does not have is a defined notion of whether an item description is commercially usable, what to do when it is not, or how to tell the boss that he changed something.

This PRD defines that missing layer. It separates four things that the current prompt and code partially conflate:

1. **Language** - spelling, grammar, capitalisation, unit notation. Deterministic, safe, must be disclosed.
2. **Commercial description** - turning trade shorthand into a professional line while preserving every supplied fact. Partly deterministic, must be disclosed.
3. **Product identity** - whether the description is sufficient to identify one product family. This is a judgement about missing information, not about wording.
4. **Authority** - who decides. The boss decides; Bolu recommends.

The central product principle (Section 3) is not "be helpful". It is "be a competent clerk with limited authority". A clerk who rewrites a description without saying so is worse than a clerk who copies it, because the boss signs a document he did not read correctly.

Three recommendations carry most of the value and most of the risk:

- **Assess before proposing.** Every line item gets an adequacy state (READY / NEEDS NORMALISATION / INADEQUATE) before a proposal is built. This is cheap, deterministic and category-independent. (PROPOSAL)
- **Disclose, do not decorate.** A description change is shown as supplied -> recommended -> applied, at Gate 1, not buried in the payload. This closes a real transparency gap that exists today. (PROPOSAL)
- **Use the evidence the tenant already owns.** BOURXE already has an item library with aliases and usage-ranked suggestions, and an RFQ module with an RFQ-to-quotation conversion. Bolu uses neither. Category intelligence should grow from tenant data, not from an assumed industry taxonomy. (PROPOSAL)

The recommended product-category strategy is **Option A (category-independent foundation) with thin, data-driven attribute profiles**, not Option B (an electrical and mechanical vertical). The reasons are in Section 12.

Nothing here is implemented except the D-2 approval flow recorded in Section 2.3 (marked IMPLEMENTED, Phase 2). Section 16 lists what must be decided before any of the rest is built.

---

## 2. Problem statement

### 2.1 The observable problem

The shipped implementation has one normalisation rule that changed product identity (the cable shorthand, since corrected to preserve the supplied words) and one general instruction ("standardize shorthand"). Between them sits everything a Nigerian SME actually types: `2 inch elbo`, `change over switch`, `big water pump`, `armoured cable 50m`, `4 core 16mm cable`, `1.5mm green cable`.

The current rules handle the first four characters of that problem and then hand the rest to a language model whose only guard is "never invent a specification". That guard is necessary and insufficient. It stops fabrication. It does not produce judgement: it does not notice that `armoured cable 50m` identifies nothing buyable, and it does not notice that `4 core 16mm cable` is already sufficient.

**OBSERVATION.** The document contract in `src/lib/ai-assistant/bolu-prompt.ts` states: standardize shorthand; never invent a specification; a sufficient description stays as it is ("Salt" stays "Salt"); ask one focused question only when readings would materially change the product, amount, classification or operation; otherwise prepare the document and offer improvement as optional prose. This is a good boundary. It is not an adequacy model: it has no state, no recorded reason, and no deterministic check.

### 2.2 Why "just improve the prompt" is not the answer

**OBSERVATION.** The document instruction block is 17,925 characters and is supplied only on document turns; the always-on conversational core is 2,437 characters (`bolu-prompt.ts`, measured in the corrections report). Adding another instruction paragraph buys compliance on the easy cases and adds cost, latency and contradiction risk to every turn.

**OBSERVATION (updated after Phase 2).** Description normalisation runs deterministically when a proposal is built: `buildInvoiceCreateProposal` and `buildInvoiceModifyProposal` attach `commercialRecommendations` from `bolu-commercial-language.ts`, and `buildCommercialSuggestions` produces optional prose. The deterministic layer exists and is narrow (whitespace, `mm²`, capitalisation, spelling and compound words). It no longer writes the payload and it adds no product class, core count or other attribute.

The gap is therefore architectural placement, not prompt wording. Adequacy and disclosure belong in code and structured data. Interpretation and phrasing belong in the model. Section 13 sets that boundary.

### 2.3 The transparency gap (most important finding)

**IMPLEMENTED (Phase 2, decision D-2 = A).** The proposal no longer carries a rewritten description into Gate 1. `standardizeCommercialItems` is not applied to the payload. Each line whose wording would change is offered as a `BoluCommercialRecommendation` (`original`, `recommendation`, `reason`, `decision`, `applied`, `invalidated`), and the payload keeps the supplied wording until the user accepts that exact recommendation and approves Gate 1. `approveBoluProposal` applies only an accepted recommendation whose `original` is still the line's wording and whose accepted text is still exactly the derived recommendation; pending and kept recommendations leave the supplied wording untouched. `1.5mm green` produces no recommendation at all, because a colour alone does not establish a conductor measurement.

**OBSERVATION.** `BoluProposal.suggestions` remains a `string[]` of optional prose. It is not a change record and grants no permission. The recommendation record is the separate, per-line structure above; each entry is decided independently and only the exact approved wording can reach the draft.

**Status.** The transparency gap this section described is closed for invoices and quotations. Gate 2 remains a separate, mandatory confirmation, and calculations are untouched: a wording change never alters a quantity, unit price, unit or computed total.

### 2.4 What is not the problem

- Bolu does not fabricate records, clients, prices or totals. Those guards are present and tested.
- The approval gates work. This PRD does not propose changing them.
- Description quality is not a document-scope problem. Invoices and quotations only; no new document types.
- The problem is not model quality. A better model would still need a definition of "adequate" and a rule to disclose.

---

## 3. Product principles

**P-1 (governing).** Act like a competent, commercially aware clerk. Think before executing, identify problems, communicate recommendations, correct obvious language errors transparently, and ask when important information is missing. Never invent product information, make undisclosed material changes or exceed the authority granted by the user. (DECISION: user brief, Section 2.)

**P-2.** The boss holds authority. Bolu advises, prepares, recommends and executes approved instructions. A recommendation is never an approval, and a disclosure is never a permission. (DECISION: user brief; consistent with the existing Gate 1 / Gate 2 architecture.)

**P-3.** Silence is a defect. Every material change is stated before it is applied. The definition of "material" is in Section 10, not left to the model. (PROPOSAL derived from P-1 and from the transparency gap in 2.3.)

**P-4.** Commercial, not technical. A description must be enough to buy or sell the thing and short enough to read on a quotation. A datasheet is a failure mode, not a quality target. (DECISION: user brief.)

**P-5.** Evidence over confidence. A catalogue record or the tenant's own prior wording outranks model belief. Model belief is never product identity. (PROPOSAL, consistent with existing "never invent a specification".)

**P-6.** Do not block what works. One bad line in a ten-line RFQ must not stop the other nine. Clarification is targeted, grouped and optional where it can be. (DECISION: user brief; consistent with the existing "one focused question" rule.)

**P-7.** Preserve supplied facts absolutely. Quantity, unit, size, colour, price, model and brand as written are not Bolu's to change. Improving wording never improves a number. (OBSERVATION: already enforced in the prompt and in validation.)

**P-8.** Proportionality. If a description is already professional, the correct behaviour is to leave it alone. Unnecessary improvement is a defect of the same family as unnecessary questioning. (PROPOSAL.)

**P-9.** One owner per rule. A rule lives in exactly one place: prompt, deterministic code or structured data. Duplicated rules drift; the repository has already been repaired once for duplicated instruction text. (OBSERVATION: corrections report, single-owner prompt module.)

---

## 4. Clerk responsibilities and boundaries

### 4.1 Responsibilities (PROPOSAL unless tagged)

| # | Responsibility | Boundary |
|---|---|---|
| R-1 | Read the instruction as a commercial instruction, not a string to copy | May not reinterpret the requested document type or client |
| R-2 | Correct spelling, grammar, capitalisation, unit notation | Language only. Never changes product identity. Always disclosed |
| R-3 | Normalise trade shorthand into a professional description | Only where the mapping is evidenced (Section 9). Never adds a specification |
| R-4 | Assess whether a description is commercially adequate | States a reason. Never invents the missing fact to make it adequate |
| R-5 | Identify likely terminology mistakes and internal conflicts | May recommend, may ask. Never silently "fixes" by substitution |
| R-6 | Recommend improvements and alternatives | Clearly marked as recommendation. Never applied without approval |
| R-7 | Ask focused, grouped clarifications | Never interrogates an item that does not need it |
| R-8 | Prepare the document with unaffected items | Never blocks the whole document for one line |
| R-9 | Disclose every material change | Never claims approval, never claims a save |

### 4.2 Hard boundaries (DECISION, existing architecture plus user brief)

- No invented brand, model, grade, material, dimension, core count, voltage, packaging or unit.
- No silent substitution of product, brand, size or specification.
- No silent change to quantity, price, discount, VAT, WHT or charge.
- No model-calculated totals; calculations stay application-owned.
- No save without Gate 2; no applied change without Gate 1.
- No new document families. Invoices and quotations only.
- No claim of a capability that does not exist (for example item photo upload, file attachment, RFQ reading).

### 4.3 Explicit non-goals

- Building an industry taxonomy.
- Building a product database or external catalogue integration.
- Replacing the document form, the proposal card or the gates.
- Making Bolu a procurement agent, a pricing engine or a stock system.
- Turning every description into a specification.

---

## 5. Description quality classification

### 5.1 The three required states

| State | Meaning | Permitted action | Disclosure |
|---|---|---|---|
| **READY** | One product family is identifiable from the supplied words. Wording may be professional already or mildly informal. | Proceed. Optional language touch-ups only. | None required if nothing changed |
| **NEEDS_NORMALISATION** | Product is identifiable. Wording is informal, inconsistent, abbreviated or poorly structured. | Recommend a professional description. Apply only through the disclosed path (Section 10). | Required: supplied -> recommended |
| **INADEQUATE** | Important identifying information is missing, or two materially different products could match. | Do not finalise the item with an invented value. Ask a focused clarification, or prepare the item flagged and unpriced. | Required: state the gap and what is missing |

**OBSERVATION (current behaviour mapped):**
- READY is effectively "whatever the model does not choose to question". There is no explicit state.
- NEEDS_NORMALISATION is applied deterministically for presentation-level cleanup only: whitespace, casing, spelling, compound words, and unit notation where the supplied words name the conductor. It never adds a product class or core count.
- INADEQUATE has no state. The prompt tells the model to ask one question when readings materially differ, and validation only requires a non-empty description, `quantity > 0` and `unit_price >= 0` (`validateInvoiceItems`, `bolu-operations.ts`). `armoured cable 50m` passes validation today.

### 5.2 Is a fourth state required?

**Recommendation: no fourth workflow state. Use two orthogonal dimensions instead.** (PROPOSAL)

Reasoning:

- A fourth state (`UNCERTAIN`, `UNVERIFIED`, `CONFLICTING`) duplicates information and creates transition bugs. Every additional state multiplies the combinations the proposal card, the gate logic and the tests must handle.
- The genuine need behind "uncertain" is not a workflow stage. It is (a) *why* the item is inadequate and (b) *how strong the evidence is* for a recommendation. Both are attributes, not states.

**Dimension A - adequacy:** `READY` | `NEEDS_NORMALISATION` | `INADEQUATE`.

**Dimension B - evidence strength for any recommendation:**

| Level | Source | May change description? | May claim product identity? |
|---|---|---|---|
| E1 verified tenant record | `item_catalog` row or `item_aliases` row matched exactly | Yes, as a recommendation | Yes, only to the extent the record's fields support it |
| E2 tenant precedent | same or near-identical description already used in the tenant's invoices/quotations | Yes, as a recommendation | No; it is precedent, not proof |
| E3 deterministic language rule | spelling, unit, casing | Yes, language and wording only | No |
| E4 model general knowledge | the model "knows" what an item usually is | Recommend only, labelled unverified | Never |
| E5 external reference | none available in this product | n/a | n/a |

**Conflict rule:** when E1 and E4 disagree, E1 wins and E4 is not shown. When two E1 records disagree (two active catalogue rows match the same phrase), the item is INADEQUATE with reason `ambiguous_catalogue_match`, and Bolu asks which one. (PROPOSAL)

**Reason codes for INADEQUATE** (data, not states): `missing_essential_attribute`, `ambiguous_product_family`, `ambiguous_catalogue_match`, `conflicting_lines`, `missing_unit`, `unquantified_scope`. A reason code makes the clarification message and the acceptance tests deterministic. (PROPOSAL)

### 5.3 Classification must not be model-optional

**PROPOSAL.** The state for each line item is computed deterministically where possible and only *refined* by the model:

- Deterministic floor: language signals (misspelling beyond the dictionary, missing unit on a counted item, duplicate/conflicting descriptions, catalogue ambiguity) raise the state.
- Model refinement: may raise NEEDS_NORMALISATION to INADEQUATE with a reason, or lower INADEQUATE to READY only by naming the attribute that resolves it from supplied text.
- The model may never lower a deterministically flagged `ambiguous_catalogue_match`.

This keeps the cheap cases free of provider cost and makes the difficult cases reviewable.

---

## 6. Terminology normalisation requirements

### 6.1 What may be normalised (E3, language and wording)

- Obvious spelling errors (`elbo` -> `elbow`), only where the correction is unambiguous.
- Grammar and article cleanup.
- Consistent capitalisation of product names and units.
- Unit notation (`mm2`, `mm^2` -> `mm²`; `pcs`, `pkgs`, `kg`).
- Structural cleanup of a run-on line into a product phrase.
- Documented, tested language rules only (today: spelling, compound words, casing, and unit notation where the conductor is named). No rule may add a product class, core count or other attribute. The earlier cable shorthand that appended `Single-Core Cable` has been removed.

### 6.2 What must never be normalised by rule alone

- Brand names and model numbers. `Siemens 3VA` is not a spelling mistake.
- Local trade names whose referent is unknown to the evidence set. A mapping exists only if the tenant catalogue/alias table or a curated mapping says so.
- Ambiguous abbreviations (`PVC`, `GI`, `SS`, `HP`) where two expansions are possible in the tenant's trade.
- Anything where normalisation would choose between two buyable products.

**REFERENCE (illustrative, not approved mappings):** `Change over switch` -> `Changeover Switch`; `2 inch elbow` -> `2-Inch Elbow`; `1.5mm green cable` -> `1.5mm² green cable`; `water pump` -> `Water Pump`. These illustrate the *shape* of a normalisation. They are not a mapping table and must not be shipped as one. A colour without a conductor word is not a mapping: `1.5mm green` stays `1.5mm green`.

### 6.3 Where mappings live

**PROPOSAL.** Three tiers, in precedence order:

1. **Tenant evidence (E1/E2):** `item_catalog.name`, `item_aliases.alias_text`, and prior line-item descriptions in the tenant's own documents. This is the only tier that may assert product identity.
2. **Curated global mappings (E3):** a small, reviewed, versioned table shipped with the application, scoped to language and widely understood trade spelling. Reviewed like code, with tests, never auto-expanded from model output.
3. **Model suggestion (E4):** allowed as prose, labelled as a suggestion, never applied as a mapping.

**OBSERVATION.** The item library already implements deterministic normalisation and alias lookup: `normalizeItemText` in `src/modules/item-library/domain/suggestionRanking.ts` (mm² -> `sqmm`, `&` -> `and`, lowercase, whitespace), alias reads in `src/modules/item-library/repositories/itemLibraryRepository.ts`, and usage-ranked suggestions (`usage_count`, `last_used_at`). Bolu does not use any of it: `searchBoluCatalog` performs a name-only `ILIKE` on `item_catalog`, limited to 5 rows, and only when the user typed a quoted phrase (`"..."` or `'...'`).

**PROPOSAL.** Reuse the item library's normalisation and alias lookup for Bolu's evidence instead of a second, divergent implementation. This is the single highest-leverage architectural change in this PRD.

### 6.4 Description length and shape

**PROPOSAL.** A description is a line, not a paragraph: one product phrase plus the supplied attributes. Target ceiling of roughly 80 characters for the product phrase, with a hard refusal to append unsupplied attributes to reach a "complete" look. Nigerian SME quotation lines are read on a phone; a two-line description is a defect unless the product genuinely needs it (P-4).

---

## 7. Product identity and specification requirements

### 7.1 The distinction the current system lacks

**OBSERVATION.** `validateInvoiceItems` requires a non-empty description. It does not and cannot check whether the description identifies a product. The prompt carries the correct principle ("never invent a specification") but no definition of essential versus optional attributes.

### 7.2 Attribute classes

| Class | Definition | Handling |
|---|---|---|
| **Essential** | Without it, the line cannot be bought or sold as one product family (for example cable conductor size, or pipe diameter for a fitting) | INADEQUATE if absent, unless the tenant catalogue record supplies it |
| **Commercially useful, optional** | Improves clarity or comparability but does not change what is being bought (colour where colour is not a specification, packaging where the unit covers it) | Recommend as optional; never block |
| **Application-specific technical** | Needed only for a particular use (voltage rating for a specific installation, temperature class) | Never requested unless the user's own context implies it |
| **May remain unspecified** | Everything else | Leave alone |

**PROPOSAL.** Essential attributes are defined per attribute *profile*, not per industry. An attribute profile is a short list attached to a catalogue family or a curated phrase class, for example `cable`: conductor size, core count, construction. `pump`: type, power, head or flow, outlet size. `fitting`: type, diameter, material or thread. A profile is data, editable, and testable.

### 7.3 Category-specific completeness without a taxonomy project

**PROPOSAL.** Do not build a category tree. Attach profiles to what the tenant already has: catalogue rows and alias families. Where no profile applies, the general test is used ("could a supplier quote this line without asking a question?"). This gives category awareness where evidence exists and honest generality everywhere else.

### 7.4 What Bolu must not do

- Must not convert an incomplete description into a complete-looking one by adding a plausible size, core count, material or rating.
- Must not treat the model's confidence as specification evidence.
- Must not demand a full specification for ordinary goods (`Salt`, `Charcoal`, `Cement`). The existing prompt rule is correct and must be kept.
- Must not block a document because an item is unpriced. Unpriced and unidentifiable are different conditions.

---

## 8. Recommendation and clarification behaviour

### 8.1 Recommendation types

| Type | Example trigger | Presentation | Applied? |
|---|---|---|---|
| Language correction | `2 inch elbo` | "Spelling corrected: elbow" | Only through the disclosed path |
| Description normalisation | `1.5mm green cable` | supplied -> recommended | Only after approval or as a stated auto-correction |
| Missing information | `armoured cable 50m` | "Which cable size and core count?" | No; blocks only that item |
| Likely terminology mistake | `change over switch` | "Usually written Changeover Switch" | No |
| Internal conflict | two lines describing the same item differently | "Do these two lines refer to the same item?" | No |
| Alternative description | catalogue match | "Your catalogue has X; use it?" | No |

**PROPOSAL.** Recommendations become structured records, not prose strings: `{ itemIndex, type, from, to, reason, evidenceLevel, status: recommended | applied | rejected, requiresApproval }`. The proposal card renders them from data. This replaces the current `suggestions: string[]`.

### 8.2 Clarification policy

**PROPOSAL.** A clarification is raised only when an answer would change the product, the price, the classification or the operation. Otherwise prepare and mention.

**Grouping.** Ask at most one clarification message per turn, containing at most three questions, ordered by commercial impact (identity before optional detail). Group questions about the same attribute across items ("Three items are missing cable size: A, B, C"). Never ask the same question twice in a conversation; if the boss declines, record the decline and proceed with supplied wording. (PROPOSAL)

**Non-blocking default.** An INADEQUATE item does not stop the proposal. It is prepared in a flagged state with wording that says what is missing, and the document can reach Gate 1 with that flag visible. The boss may approve a flagged line; that is his authority, not Bolu's failure. (PROPOSAL, and the key trade-off in Section 18.)

### 8.3 The ten-item rule

**PROPOSAL.** For a document with N items, of which K are inadequate: prepare all N, flag K, and ask about K in one grouped message. The proposal is not withheld. Only a document with zero identifiable items would justify pausing the whole thing.

### 8.4 When the boss rejects a recommendation

Respect it silently and permanently for that document. Do not re-raise the same recommendation in the same thread. Keep the supplied wording. If the same pattern recurs in a later document, a recommendation may be offered again, once. (PROPOSAL)

---

## 9. Transparency and approval rules

### 9.1 The materiality ladder

**DEFINITION (PROPOSAL).** A change is *material* if it changes what is being bought, sold, or for how much. Wording is material when it changes the product family, an identifying attribute, or would lead a supplier to quote a different item.

| Level | Change | Material? | Requirement |
|---|---|---|---|
| L0 | Whitespace, punctuation, capitalisation, unit glyph | No | State it in the change record; no approval needed beyond Gate 1 |
| L1 | Spelling and grammar correction that preserves the word's referent | No | State it. Applied in the proposal; shown as supplied -> applied |
| L2 | Description normalisation using an evidenced mapping (E1/E2/E3) | Borderline | Must be shown explicitly. Approval is the Gate 1 review of a proposal that displays it |
| L3 | Added or removed identifying attribute | Yes | Never automatic. Recommendation plus explicit boss approval, displayed |
| L4 | Product substitution, brand/model/size change | Yes | Forbidden as an automatic act. Requires explicit boss instruction naming the substitute |
| L5 | Quantity, price, discount, VAT, WHT, charge change | Yes | Only when the boss supplied it. Never inferred |

### 9.2 The change record

**PROPOSAL.** For every proposed document, Bolu supplies a per-item record:

- `supplied` - exactly what the boss wrote, preserved verbatim.
- `recommended` - the professional description, or null.
- `reason` - short, business-language reason ("standard spelling", "unit notation tidied", "catalogue match").
- `evidence` - E1..E4.
- `applied` - what the proposal actually contains.
- `approval` - `gate1_review` | `explicit_user_approval` | `not_required_language_only`.
- `missing` - attribute names still absent, when INADEQUATE.

**OBSERVATION.** Nothing in the current `BoluProposal` carries `supplied` for a create proposal. The Gate 1 card shows the resulting document. `interpretBoluProposal` may attach `suggestions`, and the commercial evidence block in the prompt carries the boss's own words, but the proposal object itself does not retain them for display.

### 9.3 Rules that must not soften

**DECISION (existing, unchanged).**

- Gate 1: explicit approval of the exact proposal before the draft is updated.
- Gate 2: separate confirmation before persistence.
- No save claim without confirmation.
- Application-owned calculations; the model never states a computed total it did not read.
- Rejection leaves state unchanged.

**PROPOSAL additions.**

- A disclosure is not an approval. Showing a recommendation never authorises its application.
- A silent L2 or higher change is a defect, not a style choice. It must fail a test.
- When the boss says "keep the RFQ wording exactly", Bolu preserves supplied wording, still may flag inadequacy, and applies no L2+ change.

### 9.4 Where disclosure appears

- **In conversation:** one short sentence naming what changed, before the proposal card.
- **In the proposal card:** the per-item supplied/recommended/applied record, visible without expanding a disclosure triangle for L2 and above.
- **In the document:** the applied description only. A quotation does not carry Bolu's reasoning. (PROPOSAL)

---

## 10. RFQ-to-quotation workflow

**OBSERVATION.** BOURXE has an RFQ module (`rfqs`, `rfq_items` with `description`, `quantity`, `unit`, `specification`, `notes`) and an application-level RFQ-to-quotation conversion (`convertRFQToQuotation`, called from `src/pages/ViewRfq.tsx`). Bolu cannot read RFQs: `BOLU_READ_CAPABILITIES` is `search-invoices`, `read-receivables`, `search-quotations`, and `matchBoluIntent` returns null for write verbs. There is no conversational RFQ path today.

**PROPOSAL.** The workflow below is the target. It is written to work for both an RFQ held in BOURXE and an RFQ pasted into chat, because the boss does both.

| Step | Bolu behaviour | Gate / disclosure |
|---|---|---|
| 1 | RFQ received (pasted text, pasted list, or an RFQ record once reading exists) | None |
| 2 | Interpret content: customer, items, quantities, units, prices if any, document type requested | State the interpretation in one line if ambiguous |
| 3 | Identify individual items, preserving order | None |
| 4 | Assess each item: READY / NEEDS_NORMALISATION / INADEQUATE with reason | Internal state; summarised |
| 5 | Correct language and normalise descriptions where evidenced | Disclosed per item (L1/L2) |
| 6 | Flag inadequate items; do not invent | Disclosed as missing attributes |
| 7 | Present recommendations (alternative description, catalogue match, conflicts) | Recommendations only; nothing applied |
| 8 | Obtain clarifications, grouped, maximum three questions | Conversation |
| 9 | Prepare commercial information (items, quantities, prices, charges) | Application computes totals |
| 10 | Present the quotation for review | Gate 1, with the change record visible |
| 11 | Obtain approval | Gate 1 |
| 12 | Save through the existing workflow | Gate 2 |

### 10.1 Scenario coverage

| Situation | Required behaviour |
|---|---|
| Clean, professional RFQ | No rewriting, no questions. Prepare. (P-8) |
| RFQ full of spelling errors | Correct, disclose compactly ("spelling corrected on 6 items"), prepare |
| Informal trade terminology | Normalise only where evidenced; otherwise recommend and proceed |
| Missing specifications | Flag, group the questions, prepare the rest |
| Duplicate or conflicting items | Identify the conflict; ask whether they are one item or two; never merge silently |
| Mixed complete and incomplete | Prepare all; flag the incomplete; do not block |
| Quantities without units | Preserve the quantity; ask for the unit once, grouped, or leave unit blank rather than guessing |
| Ambiguous brands or model numbers | Preserve exactly; never normalise a model number; ask only if two products differ materially |
| Correction after a draft exists | Update the same operation; return to Gate 1; never create a second document (existing rule) |
| Boss rejects a recommendation | Keep supplied wording; do not re-raise |
| Boss wants original RFQ wording preserved | Suppress L2+ normalisation; still flag inadequacy; no silent change |

---

## 11. Product-category scope: comparison

The user has not approved category-independent or industry-focused intelligence. This section compares them and recommends; it does not select.

### Option A - Category-independent foundation

General language correction, terminology normalisation, adequacy assessment, disclosure and clarification, with category-specific intelligence added later from tenant evidence.

**Complexity:** Low to moderate. Deterministic rules plus one evidence lookup.
**Accuracy:** High on language; honest ("insufficient information") on identity.
**Maintenance:** Low. Rules are small, testable and versioned.
**Knowledge required:** Spelling, units, and the tenant's own catalogue.
**Risk of wrong assumptions:** Low, because it does not assert category facts.
**Extensibility:** High. Profiles attach later without rework.
**Weakness:** It will not know that a particular cable grade is standard for a Nigerian installation. It will ask instead. For some users that is correct; for an experienced wholesaler it may feel naive.

### Option B - Initial industry focus (electrical, mechanical, general industrial)

Deeper terminology and specification completeness for a chosen vertical.

**Complexity:** High. Requires a reviewed terminology corpus, specification schemas per family, and ongoing curation.
**Accuracy:** Potentially high inside the vertical, poor outside it. A tenant selling food or building materials gets nothing or gets wrong assumptions.
**Maintenance:** Continuous. Trade terminology drifts by region and supplier.
**Knowledge required:** Domain expertise the team does not currently document anywhere in the repository.
**Risk of wrong assumptions:** High. A confident "essential attribute" list becomes a silent requirement, and a wrong "standard" mapping is a wrong quotation.
**Extensibility:** Bounded by the taxonomy chosen first. Retrofitting a second vertical is expensive.
**Strength:** Better first impressions for an electrical wholesaler, which is a plausible early user.

### Comparison

| Criterion | Option A | Option B |
|---|---|---|
| Implementation complexity | Low/medium | High |
| Accuracy inside a vertical | Medium (asks instead of guessing) | High |
| Accuracy outside a vertical | Medium and honest | Poor |
| Maintenance | Low | Continuous |
| Knowledge requirement | Low | High, undocumented |
| Risk of incorrect assumptions | Low | High |
| Long-term extensibility | High | Medium |
| Time to first useful release | Short | Long |
| Fit with existing evidence (item library, tenant history) | Strong | Weak (external corpus) |

### Recommendation (PROPOSAL, not a selection)

**Option A, with a thin data-driven layer that produces most of Option B's benefit without its risk.** Concretely:

1. Ship the category-independent foundation first (assessment, normalisation, disclosure, clarification).
2. Add attribute profiles attached to *tenant* catalogue families, populated from the tenant's own item library, not from an assumed industry taxonomy.
3. Where a vertical is clearly dominant in the tenant's data, profiles become effectively industry-specific without anyone shipping an industry model.
4. Revisit an explicit vertical only if real usage shows the general test asking the same question repeatedly.

This keeps the "do not assume a capability exists" rule: the item library is real, an electrical taxonomy is not.

---

## 12. Knowledge and evidence requirements

### 12.1 Sources that exist (OBSERVATION)

| Source | Contents | Reachable by Bolu today? |
|---|---|---|
| `item_catalog` | `name`, `normalized_name`, `standard_price`, `is_active`, `notes`, `metadata` (free-form JSON), no structured spec columns | Yes, name-only ILIKE, 5 rows, quoted phrase only |
| `item_aliases` | `alias_text`, `normalized_alias_text`, active/retired, source | No |
| `item_merge_log`, `item_import_batches` | provenance of catalogue identity decisions | No |
| Tenant invoices/quotations and their items | prior wording, prices, clients | Partly (documents), line items via modify snapshot only |
| `clients`, `suppliers` | party records | Yes (search) |
| `rfqs`, `rfq_items` | description, quantity, unit, specification, notes | No |
| Curated terminology | none in repository | n/a |
| External product references | none integrated | n/a |

### 12.2 Evidence hierarchy (PROPOSAL)

1. **Explicit user instruction** in this turn.
2. **Verified tenant record** (item catalogue exact name or active alias; existing document line the boss references).
3. **Tenant precedent** (the same wording used before in this tenant's documents).
4. **Deterministic language rule** (spelling, unit, approved shorthand).
5. **Model general knowledge**, advisory and labelled.
6. **External reference**, currently unavailable; if ever added, it ranks below tenant records and above model knowledge, and must show its source.

### 12.3 Conflict handling (PROPOSAL)

- Tenant record versus model: tenant wins, model is silent.
- Two active catalogue records: do not choose. Ask, name both.
- Catalogue name versus alias pointing elsewhere: treat as conflict, ask.
- Tenant precedent versus current tenant catalogue: catalogue wins; mention the precedent only if the difference is material.
- User instruction versus any evidence: user wins for wording; Bolu states the consequence once ("that wording may not match your catalogue item X") and proceeds.

### 12.4 What Bolu must never treat as evidence

- Its own earlier output in the thread (that is a proposal, not a fact).
- A confident model assertion.
- A price seen in another tenant's data (tenant scoping already prevents this; it must remain absolute).
- An alias marked retired.
- A guessed unit derived from a number's magnitude.

---

## 13. Architectural recommendations

### 13.1 Placement of each responsibility

| Responsibility | Where | Why |
|---|---|---|
| Parse the boss's words into ordered entries | Deterministic (`bolu-commercial-language.ts`, already exists) | Testable, free, no model variance |
| Language normalisation (spelling, units, casing) | Deterministic, plus a small curated mapping table | Reproducible and reviewable |
| Adequacy assessment | Deterministic floor + model refinement, recorded as structured state | Cheap cases must not cost a provider call |
| Attribute profiles | Structured data keyed to catalogue families | Data, not prompt text; editable without a prompt change |
| Ambiguity detection, conflict explanation | Model reasoning | Genuine language judgement |
| Recommendation wording | Model, constrained by structured recommendation records | Natural language, bounded content |
| Evidence lookup | Data layer (`item_catalog` + `item_aliases` + tenant precedent) | Existing, authorised, tenant-scoped |
| Disclosure and change record | Structured proposal data, rendered by the card | Must be visible and testable, not prose the model may omit |
| Approval and persistence | Existing gates and `bolu-document-service` | Unchanged |

### 13.2 What must not go in the system prompt

**PROPOSAL.** The following belong in code or data, not instructions: the adequacy state machine, the essential-attribute lists, the terminology mapping table, the materiality ladder, and the change-record shape. The prompt should carry only: the clerk stance, the disclosure obligation, and the instruction to use the supplied assessment rather than invent one.

**Rationale (OBSERVATION).** The document instruction block is already 17,925 characters. A fourth instruction layer on top of a scoped contract is how the earlier instruction-quality problem returns.

### 13.3 Proposed data shapes (design intent, not schema)

```
ItemAssessment = {
  index, supplied, standardised, state: READY | NEEDS_NORMALISATION | INADEQUATE,
  reason?: code, missing?: string[], evidence: E1..E4,
  profile?: string, catalogueMatches?: [{ id, name, standardPrice }]
}

Recommendation = {
  itemIndex, type, from, to, reason, evidence,
  status: recommended | applied | rejected, requiresApproval: boolean
}

ChangeRecord = {
  documentFamily, items: [{ supplied, recommended, applied, reason, evidence, approval }],
  languageCorrections: number, materialChanges: number
}
```

**OBSERVATION.** `BoluProposal.suggestions` is currently `string[]`. Replacing it with structured recommendations is a proposal-object change, which touches Gate 1 rendering and tests. It is the main architectural cost in this PRD.

### 13.4 Avoid

- A multi-agent "clerk framework". One deterministic assessor plus one model turn is sufficient; nothing in the evidence suggests orchestration is needed.
- A vector store or embedding search over descriptions. Tenant catalogues are small; exact normalised match plus alias lookup is more predictable and cheaper.
- Model-side state machines.
- A second prompt path for descriptions. There is one prompt owner; additions belong to it or to code.

### 13.5 Where this touches existing behaviour

| Existing area | Effect |
|---|---|
| `bolu-commercial-language.ts` | Gains assessment and profile hooks; parsing must remain behaviour-compatible |
| `bolu-proposal-engine.ts` | Builds assessments and change records; still the single interpretation path |
| `bolu-prompt.ts` | Document contract gains a short disclosure obligation; no new bulk |
| `BoluProposal` type and Gate 1 card | New structured fields and rendering |
| `bolu-document-service.ts`, gates, calculations | No change |
| `bolu-data.ts` | Catalogue lookup upgraded to normalised name + alias; still read-only |
| RFQ reading | New capability, requires its own approval and permission check |

---

## 14. Behavioural acceptance matrix

Every row states the judgement, what may be corrected, what must not be assumed, whether clarification is required, what is communicated, and whether approval is needed beyond Gate 1.

| # | Input | Recognise | May correct | Must not assume | Clarify? | Communicate | Approval |
|---|---|---|---|---|---|---|---|
| A-01 | `2 inch elbo` | Misspelling of elbow; diameter supplied | `2-Inch Elbow`, disclosed as spelling | A material, thread or pressure class | No | "Spelling corrected: elbow" | Gate 1 |
| A-02 | `change over switch` | Informal compound | `Changeover Switch` | Rating, poles, brand | No | Recommend professional wording | Gate 1 |
| A-03 | `armoured cable 50m` | Length only; no conductor size, core count or construction | Nothing beyond casing | Size, cores, armour type, voltage | Yes, one grouped question | "Which cable size and core count?" Flag line | Gate 1 for the rest |
| A-04 | `1.5mm green cable` | Cable class, size and colour supplied in shorthand | `1.5mm² green cable` | Core count, construction, brand, voltage | Only if core count would materially differ; otherwise no | Supplied -> recommended, with reason | Gate 1 |
| A-05 | `big water pump` | Pump, no usable specification | Nothing | Power, head, flow, outlet size, brand | Yes, focused | "What size or capacity is the pump?" Do not price it | Gate 1 for the rest |
| A-06 | `4 core 16mm cable` | Size and core count supplied | Presentation only (`16mm²`) | Construction, voltage, brand | No | Nothing material changed | Gate 1 |
| A-07 | `10 pieces of 2 inch elbow` | Quantity 10, unit pieces, diameter | Wording only | Material, thread | No | Quantity and unit preserved explicitly | Gate 1 |
| A-08 | Two lines describing the same item differently | Conflict | Nothing automatic | Which line is correct | Yes | "Do these two lines refer to the same item?" | Gate 1 after answer |
| A-09 | Already professional RFQ | Nothing to improve | Nothing | Nothing | No | No rewriting, no praise, no summary | Gate 1 |
| A-10 | Boss rejects a recommended description | A decision has been made | Keep original | That a "better" version should win | No | Acknowledge once, apply original | Gate 1 |
| A-11 | Boss requests a silent substitution | A material change requested secretly | Nothing silently | That a substitute is commercially equivalent | No (state the rule) | "A substitution changes what you are selling; I can propose it for your approval" | Explicit approval required |
| A-12 | Ten-item RFQ, one inadequate | One flagged, nine fine | Language on all ten | The missing attribute | One grouped question | Prepare all ten, flag one | Gate 1 |

### 14.1 Negative tests

| # | Anti-pattern | Expected |
|---|---|---|
| N-01 | Hallucinated specification: `armoured cable 50m` proposed as `4 Core 16mm² Armoured Cable` | Fail. No unsupplied attribute in payload |
| N-02 | Silent substitution: catalogue suggests `X` when boss wrote `Y` and payload contains `X` | Fail. Catalogue may only recommend |
| N-03 | Undisclosed normalisation: payload contains `1.5mm² green cable` where the boss wrote `1.5mm green cable`, with no supplied/recommended record | Fail |
| N-04 | Excessive description: turning `Salt` into `Salt - 50kg Industrial Grade, Food Safe` | Fail. Unsupplied attributes and unnecessary length |
| N-05 | Unnecessary questioning: asking for a package size for `Salt`, or a make where the boss asked for none | Fail |
| N-06 | Blocking: whole document withheld because one item is inadequate | Fail |
| N-07 | Repeated recommendation after explicit rejection | Fail |
| N-08 | Model-stated total or balance | Fail |
| N-09 | Claim that a document was saved before Gate 2 | Fail |
| N-10 | Normalising a model number (`Siemens 3VA2` -> `3VA 2`) | Fail |
| N-11 | Guessing a unit from a quantity (`10 cable` -> `10 m`) | Fail |
| N-12 | Treating a prior assistant message as evidence of product identity | Fail |

### 14.2 How these should be verified (PROPOSAL)

Deterministic rows (N-01..N-12, A-06, A-07) are unit-testable against the assessor and the proposal builder without a provider. Model-dependent rows (A-01..A-03, A-05, A-08) need a recorded provider transcript or a mock provider fixture; they cannot be proven by prompt inspection. This PRD does not claim any of them pass today.

---

## 15. Risks and unresolved decisions

### 15.1 Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| RK-01 | Over-normalisation: Bolu rewrites a description the boss wanted verbatim | Medium | High (wrong quotation wording) | Explicit preserve-original instruction; L2 disclosure; rejection is binding |
| RK-02 | Under-normalisation: nothing improves, PRD delivers no value | Medium | Medium | Start with deterministic, evidenced mappings only; measure |
| RK-03 | Excessive questioning annoys users and slows the flow | High if unmanaged | High | Grouped, capped at three, never repeats, never blocks |
| RK-04 | False adequacy: a vague line sails through as READY | Medium | High | Conservative floor; catalogue ambiguity always blocks |
| RK-05 | Catalogue drift: aliases point at merged or retired items | Medium | Medium | Honour `is_active` and `is_retired`; conflict rule |
| RK-06 | Profile maintenance cost grows silently | Medium | Medium | Profiles only from tenant data; review with usage |
| RK-07 | Disclosure becomes noise on a ten-item correction | Medium | Medium | Aggregate language corrections; itemise only L2+ |
| RK-08 | Structured recommendations break Gate 1 rendering and tests | Medium | Medium | Deliberate migration with compatibility shape; tests updated with assertions preserved |
| RK-09 | Prompt grows again as a fourth instruction layer | High if unowned | High | Single-owner prompt module; adequacy lives in data (13.2) |
| RK-10 | RFQ reading widens scope and permissions without approval | Certain if done early | High | RFQ is a separate, later phase requiring explicit authorisation |
| RK-11 | Regional trade terminology differs within Nigeria | High | Medium | Tenant evidence beats curated global list; curated list kept small |
| RK-12 | Users read a recommendation as an approval | Low | High | Distinct wording and distinct card state; never "applied" until approved |

### 15.2 Unresolved decisions

- Whether L2 normalisation may be applied inside a proposal (visible at Gate 1) or must be a separate per-item approval before the proposal is built.
- Whether an INADEQUATE line may be saved at Gate 2 with the flag acknowledged, or must be resolved first.
- Whether Bolu may read RFQs in the next phase, and whether RFQ reading is a prerequisite for the RFQ workflow.
- Whether curated global mappings ship at all, or only tenant-derived evidence.
- Whether the change record is persisted with the document or retained only in the conversation.
- Whether the item library's suggestion ranking becomes Bolu's catalogue ranking (shared code) or a separate read path.
- Whether description quality is a blocker for quotations but advisory for invoices (a quotation is an offer; an invoice is a record of something already agreed).

---

## 16. Phased implementation roadmap

Each phase is separately authorisable. No phase is approved by this document.

**Phase 0 - Decisions (no code).**
Resolve Section 15.2 items 1, 2 and 5. Output: an approved decision list appended to the existing decision log. Exit criterion: explicit boss sign-off.

**Phase 1 - Deterministic assessment and disclosure.**
Add an item assessor (state, reason code, missing attributes) with a deterministic floor; add supplied/recommended/applied to the proposal for create; show it at Gate 1. No model change, no gate change, no calculation change. Exit criterion: N-01..N-12 pass; existing proposal and gate tests keep their assertions.

**Phase 2 - Evidence-backed normalisation.**
Reuse `normalizeItemText` and `item_aliases` for catalogue evidence; upgrade the quoted-phrase-only catalogue lookup to normalised name plus alias matching, still tenant-scoped and read-only; add the small curated language mapping table with tests; attach attribute profiles to catalogue families. Exit criterion: A-01..A-07 behave as specified with recorded transcripts; catalogue ambiguity asks.

**Phase 3 - Structured recommendations and grouped clarification.**
Replace `suggestions: string[]` with recommendation records; render them; implement the grouped, capped clarification policy and the "do not re-raise after rejection" rule. Exit criterion: A-08..A-12 and RK-03/RK-07 measures.

**Phase 4 - RFQ reading (separate authorisation).**
Add a read capability for RFQs plus the pasted-RFQ path; route into the same assessment and proposal pipeline. Conversion remains the existing application conversion. Exit criterion: an RFQ record and a pasted RFQ produce the same proposal shape.

**Phase 5 - Category depth, only if evidence demands it.**
Extend profiles where the general test repeats the same question. Revisit Option B only with usage data.

**Sequencing note.** Phase 1 delivers the largest correctness gain per unit of risk, because it fixes disclosure and prevents hallucinated completeness without touching the model contract. Phase 3 is the most invasive to the UI and the tests.

---

## 17. Traceability

| Requirement | Source / evidence | Classification |
|---|---|---|
| P-1 governing principle | User brief §2 | DECISION |
| P-2 boss authority | User brief §2; existing gates | DECISION |
| P-3 disclose every material change | Section 2.3; `commercialRecommendations` in `bolu-operations.ts`, applied by `approveBoluProposal` | IMPLEMENTED (Phase 2) |
| P-4 commercial not technical | User brief §2 | DECISION |
| P-7 preserve supplied facts | `bolu-prompt.ts` document contract; `validateInvoiceItems` | OBSERVATION |
| P-9 one owner per rule | Corrections report §2.1 | OBSERVATION |
| Three adequacy states | User brief §5.3; absence of any state in `bolu-prompt.ts` / `bolu-operations.ts` | PROPOSAL |
| No fourth state; evidence dimension instead | Design analysis, Section 5.2 | PROPOSAL |
| Reason codes | Design analysis | PROPOSAL |
| Language vs normalisation vs identity separation | User brief §5.1-5.4; current single-rule normalisation | PROPOSAL |
| Cable shorthand once appended a product class (`Single-Core Cable`); corrected to preserve the supplied words | `standardizeDescription` in `bolu-commercial-language.ts` | CORRECTED SINCE PREVIOUS AUDIT |
| Never normalise brand/model | User brief §5.2; current prompt "no brand/model" | DECISION |
| Tenant evidence outranks model | Existing "never invent a specification"; item library exists | PROPOSAL |
| Reuse item library normalisation/aliases | `itemLibraryRepository.ts`, `suggestionRanking.ts`; `searchBoluCatalog` name-only ILIKE | OBSERVATION + PROPOSAL |
| Item catalogue has no structured spec fields | `item_catalog` DDL (`name`, `normalized_name`, `standard_price`, `notes`, `metadata`) | OBSERVATION |
| Attribute profiles, no taxonomy | Design analysis; absence of taxonomy in repository | PROPOSAL |
| Grouped clarification, max three, never repeats | User brief §5.6; current "one focused question" rule | PROPOSAL |
| Non-blocking inadequate item | User brief §5.6 ten-item example | DECISION (intent) + PROPOSAL (mechanism) |
| Materiality ladder L0-L5 | User brief §5.7; current gates | PROPOSAL |
| Change record fields | Transparency gap; `BoluProposal.suggestions` is `string[]` | PROPOSAL |
| Gates unchanged | `bolu-document-service.ts` Gate 1/Gate 2 checks; `bolu-operations.ts` gate states | DECISION |
| RFQ tables and RFQ-to-quotation conversion exist | `rfqs`, `rfq_items` DDL; `convertRFQToQuotation` in `src/pages/ViewRfq.tsx` | OBSERVATION |
| Bolu cannot read RFQs | `BOLU_READ_CAPABILITIES` in `bolu-capabilities.ts` | OBSERVATION |
| Option A recommended, not selected | User brief §7; item library evidence | PROPOSAL |
| Evidence hierarchy E1-E5 | Design analysis; no external reference integration exists | PROPOSAL |
| Architectural placement | `bolu-prompt.ts` size (2,437 / 17,925 chars); existing deterministic layer | PROPOSAL |
| Acceptance matrix | User brief §9 | REFERENCE (scenarios) + PROPOSAL (expected behaviour) |
| Illustrative normalisations (`change over switch` etc.) | User brief §5.2 | REFERENCE |

---

## 18. Decisions requiring explicit user approval

| # | Decision | Why it needs approval | Default if declined |
|---|---|---|---|
| D-1 | Adopt the four-part model (language / description / identity / authority) as the governing frame | It defines the product's behaviour, not just wording | Current behaviour continues: single normalisation rule plus prompt |
| D-2 | Permit L2 normalisation inside a proposal, disclosed at Gate 1, without a separate per-item approval | It decides whether the boss reviews wording before or after it is applied | Every L2 change becomes a separate approval step |
| D-3 | Allow an INADEQUATE line to reach Gate 2 flagged and acknowledged | It decides whether uncertainty is tolerable on a quotation | Inadequate lines must be resolved before save |
| D-4 | Replace `suggestions: string[]` with structured recommendations and a change record | Visible product and card change; touches Gate 1 rendering | Prose suggestions continue, with the disclosure gap |
| D-5 | Reuse the item library's normalisation and aliases as Bolu's evidence | Couples Bolu to another module's contract | A second, smaller lookup path with duplicated rules |
| D-6 | Ship a curated global language mapping table | It is shipped product knowledge with a maintenance cost | Tenant-derived evidence only |
| D-7 | Adopt Option A first, with tenant-derived attribute profiles | Category strategy is explicitly unapproved | Option B vertical, with the risks in Section 11 |
| D-8 | Persist the change record with the document | Data and audit implications | Conversation-only record |
| D-9 | Add RFQ reading as a Bolu capability | Capability and permission expansion | Pasted RFQ text only |
| D-10 | Treat quotations and invoices differently for description strictness | A quotation is an offer; an invoice is a record | One rule for both |

No decision above is taken. Each is a question for the boss.

---

## 19. Existing capabilities vs proposed additions

### 19.1 Verified existing (OBSERVATION)

- One instruction owner (`bolu-prompt.ts`), always-on core, document contract scoped to document turns.
- Invoices and quotations only; proposal payload contract; create, modify, advance-invoice configuration.
- Deterministic parse of pasted lists, WhatsApp stamps, `15k` amounts, citation artifacts, positional amount pairing with mismatch reporting.
- Deterministic normalisation: whitespace, `mm²`, capitalisation, spelling and compound words; applied after validation. No product class, core count or other attribute is added.
- Optional prose suggestions: shorthand, unpriced item, missing unit, missing payment terms, missing title.
- Commercial evidence injected only on authoring turns.
- Clients, invoices, quotations, receivables, suppliers, signatories, bank accounts, and name-only catalogue lookup (quoted phrases only).
- Gate 1 and Gate 2 enforced in `bolu-document-service.ts`; lifecycle states `pending_approval`, `approved_pending_save`, `rejected`.
- Application-owned calculations; no model totals.
- Structured fact failures with one canonical sentence and no provider call.
- No item photo add/replace, no file upload, no invoice paid/unpaid marking through Bolu.

### 19.2 Proposed additions (PROPOSAL)

- Item adequacy state with reason codes, computed before proposal build.
- Supplied / recommended / applied change record, rendered at Gate 1.
- Evidence hierarchy with catalogue alias matching and tenant precedent.
- Attribute profiles attached to catalogue families.
- Structured recommendations replacing prose strings.
- Grouped, capped, non-repeating clarification policy.
- Materiality ladder and the "preserve original wording" instruction.
- Curated language mapping table (if approved).
- A short disclosure obligation in the document contract (prompt), with the rest in code and data.
- RFQ reading (separate approval, later phase).

### 19.3 Explicitly not proposed

- New document types, new gates, calculation changes, schema changes, permission changes.
- A product database, an external catalogue integration, an embeddings store, or a multi-agent framework.
- Category taxonomy or industry vertical selection (recommended against for now, not selected).

---

## 20. Files inspected

Read-only inspection for this PRD:

- `AGENTS.md`, `CLAUDE.md` (presence only)
- `src/lib/ai-assistant/bolu-prompt.ts`
- `src/lib/ai-assistant/bolu-commercial-language.ts`
- `src/lib/ai-assistant/bolu-capabilities.ts`
- `src/lib/ai-assistant/bolu-generation.ts`
- `src/lib/ai-assistant/bolu-formatting.ts`
- `src/lib/ai-assistant/bolu-data.ts` (supplier, catalogue, operation-facts sections)
- `src/lib/ai-assistant/bolu-operations.ts` (validation and gate sections)
- `src/lib/ai-assistant/bolu-proposal-engine.ts` (interpretation and suggestion attachment)
- `src/lib/ai-assistant/bolu-intelligence.ts` (partial)
- `src/lib/ai-assistant/bolu-document-ops.ts` (partial)
- `src/modules/item-library/domain/suggestionRanking.ts`
- `src/modules/item-library/repositories/itemLibraryRepository.ts` (search results)
- `src/pages/ViewRfq.tsx` (conversion call site)
- `src/domain/rfq/` (directory listing, `rfqService.ts`, `normalize.ts` names)
- `live-public-schema.sql` (`item_catalog`, `item_aliases`, `item_import_batches`, `item_merge_log`, `rfqs`, `rfq_items`)
- `supabase/migrations/20260520090005_items_catalog.sql`, `20260520090002_quotations.sql`, `20260915194332_tenant_template_seed.sql`
- `docs/reports/ai-BOLU/2026-11-22-bolu-conversational-behaviour-corrections.md`
- `docs/prd/conversational-document-assistant/Readme.md`, `decision-log.md` (partial), `functional-req.md` (headings)
- `docs/standard/` (document transformation, save orchestration, prefix, receipt standards: headings and RFQ references)

Not inspected: live database state, provider output, the item library UI, RFQ forms in detail, or any runtime behaviour. No provider call was made.

---

## 21. Discrepancies with earlier reports

| Earlier statement | Current evidence | Note |
|---|---|---|
| Earlier PRD readme lists "remaining 6 document families (PO, Waybill, CSR, RFQ, CPS, Letter)" as deferred | Bolu's capability list contains only invoice/quotation reads; the document contract authorises invoices and quotations only | Consistent with the current restriction; the PRD does not reopen it |
| Reports describe Bolu suggestions as a feature | `suggestions` is `string[]` with no approval or applied state | Section 2.3 treats this as a transparency gap, not a feature |
| An earlier audit-period prompt contained a cable worked example | The example was removed from the prompt; the normalisation remains in code | Behaviour retained, instruction cost removed |
| RFQ is described as part of the document transformation chain | The app has RFQ and RFQ-to-quotation conversion; Bolu has neither | App capability, not a Bolu capability |
| Item catalogue is sometimes described as a product knowledge source | `item_catalog` has no structured specification fields | Identity evidence only where a record exists; no spec claims |

---

## 22. Definition of success

The PRD succeeds if the resulting clerk:

- improves the commercial quality of the boss's wording,
- notices when a description cannot identify a product and says so without inventing the answer,
- tells the boss what he changed and why, before it lands,
- prepares the rest of the document while one line is waiting for an answer,
- leaves a good description alone,
- and never confuses a recommendation with a decision.

Nothing in this document is implemented. No code, test, prompt, schema, environment file or existing documentation was modified.
