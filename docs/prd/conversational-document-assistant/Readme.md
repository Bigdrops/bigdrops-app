# Conversational Document Assistant - PRD

- **Status:** Core product direction approved; detailed requirements and delivery scope under review
- **Owner:** Project Lead
- **Written:** 2026-11-13
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Scope:** Conversational Business Operations with read and write capabilities. The detailed requirements below remain candidate scope until reconciled and approved.

---

## Product Direction Status — Reconciled 2026-11-14

**Approved direction:** Bolu is a conversational business operations assistant (DEC-28). It must understand authorized existing records and support controlled creation and modification of business documents. Read-only Business Intelligence is one capability, not the complete product.

**Application-Side Operations Implemented (DEC-30):** The conversational create and modify pipeline for the reference Invoice document family is implemented and tested against a deterministic mock provider boundary (49 automated unit and integration tests passing). The architecture enforces two explicit user review gates, locks all calculations to `src/lib/Calculations.ts`, reuses PostgreSQL transactional RPC `save_invoice_with_items_transaction` with fallback rollback cleanup, and protects sequence number allocation with `withUniqueRetry`.

**Live Provider Integration & Invoice Pipeline Activation (DEC-34):** The invoice operation pipeline is connected to a configurable server-side OpenAI-compatible live provider adapter (`api/bolu-chat.ts`, `bolu-provider.ts`). The model outputs structured operation proposals; the application parses, validates, locks calculations via `calculateDocument`, and executes through the two-gate user approval workflow and PostgreSQL persistence. Total test suite expanded to 62 automated tests (0 failures). Production live third-party network calls remain deferred pending owner key custody and terms approval.

The application owns authorization, tenant scope, validation, calculations, persistence, and business execution. A user must explicitly approve each proposed change before the application applies it. The user must separately confirm before the application saves or files a document. Existing document rules and system-owned computed values remain authoritative. Bolu must not invent missing facts or perform unapproved payments or money movement.

**Outstanding / Deferred:** Live AI provider credential provisioning in production environments, dynamic multi-model failover pool (DEC-29), remaining 7 document families (Quotation, PO, Waybill, CSR, RFQ, CPS, Letter), and production multi-tenant E2E verification.

**Bolu Document-Integrity & Advance Invoice Milestones (DEC-40/DEC-41, 2026-11-18):** Stage 0-0.3 completed the document modification integrity track on a disposable database: 23/23 reported live checks and 34/34 Stage 0.2 harness tests, with residual **Finding F1** documented (tenant `invoice_items`/`quotation_items` lack `item_id` FKs; application-layer catalog verification is the effective guard; production parity not verified; FK restoration remains PROPOSED work requiring separate authorization). **Stage 1** implemented Advance Invoice configuration as parent-invoice `custom_fields.advance_invoice` metadata only (commit `1d7d6d75`; never creates/mutates/deletes child invoice rows; reuses the established domain helpers; five-field `oldValue` optimistic guard; no new calculation engine), with 40/40 reported unit-level tests and typecheck exit 0 - **live database verification outstanding**. **Stage 2** wired conversational Advance Invoice configure/update/remove through Bolu's two gates and surfaced executor `warnings[]` as a visible, verbatim banner on the assistant execution message (commit `e099eab2`, **accepted with explicit qualifications**: full application-shell visual inspection remains open; hook-level `useBoluThread` rendering untested in-repo; the new Stage 2 surfaces were verified at 375/680/768/1280/1440 px with no horizontal overflow; 534/535 tests passing, typecheck exit 0). **Stage 3 is now formally blueprint'd in DEC-41 (see `Waterfall-roadmap.md` §37):** 3A.1 core contract integrity & natural-language calculation communication; 3A.2 existing-document field modifications; 3B custom document rows, group sections and direct preview-card item image management; 3C PDF presentation & contextual recommendations. Stage 3+ beyond this blueprint is PROPOSAL, not approved scope.

**Governance Mandate (DEC-31):** Engineering roadmap maintenance is mandatory for every BOURXE task. Canonical progress is tracked in `Waterfall-roadmap.md` with visual presentation in `roadmap.html`.

**Document-Intelligence Direction (DEC-32 / DEC-33, 2026-11-14):** Bolu must process source documents and attachments through one universal pipeline: application-owned intake and preservation → faithful extraction of source observations → normalization into typed records → cross-document reconciliation with match candidates → deterministic calculations → human review → approved business action. Evidence classification (`extracted` / `calculated` / `inferred` / `matched` / `unverified` / `conflicting`) is separate from workflow status (`not_found` → `information_found` → `possible_match` → `awaiting_confirmation` → `confirmed` → `priced_verified`). Source fidelity, traceability, deterministic arithmetic and human approval are requirements, not options. The solar-pump BOQ scenario is the first acceptance case, not the basis of a BOQ-only architecture. No pipeline stage is implemented. Attachment formats, limits, retention, extraction providers and privacy are open decisions (DEC-33).

The Markdown requirements and roadmap are the maintained source documents. `roadmap.html` is the presentation mirror of `Waterfall-roadmap.md`.

## 1. Objective

An SME owner must be able to understand and operate BOURXE business records through natural conversation. Bolu must answer supported questions about existing records and support approved creation and modification workflows.

The invoice conversation in this draft is one proposed workflow. Its exact scope, provider cost model, first-release documents, trial, and success measures remain under review. The approved product direction is operations across read and write capabilities, with user approval before proposed changes are applied and separate confirmation before persistence.

## 2. Why The JSON Import Path Is The Wrong Shape

The import path asks a model to produce the app's own JSON contract. That contract carries structure the model should not own:

- `temp_ref`, `group_id`, `itemIds` and stable ids are bookkeeping.
- `notes` and `terms` use a rich-text block array.
- The prompt is long, because the contract is long.

A model that misses one identifier, or copies one block wrongly, produces a rejected import. The user sees an error instead of an invoice.

A conversation avoids this. The model interprets intent and proposes typed capability calls. The application owns the structure, validation, authorization, calculations, and persistence.

**Rule 1. The model never produces a document JSON blob. It proposes typed capability calls.**
**Rule 2. The application validates and authorizes every proposed operation. The application computes.**
**Rule 3. User approval applies a proposal to a draft. A separate confirmation is required to save or file it.**

## 3. The User Experience

### 3.1 The Flow

1. The user opens a new invoice and taps the assistant.
2. A chat sheet opens above the form. The form stays visible.
3. The user types plain text, for example:
   - `invoice for ABC Ltd, 5 pcs cable lug 10mm at 9500, delivery 5000, 50 percent advance`
4. The assistant replies in text and presents proposed form changes.
5. The user reviews and approves or rejects each proposal. Only approved proposals are applied to the draft.
6. The user corrects the assistant in plain text, for example:
   - `no, price is 95000 not 9500`
7. The assistant proposes a correction. The user approves or rejects it before it changes the draft.
8. The assistant may propose a title, notes and terms. Each proposal requires user approval.
9. The assistant asks for required information that is missing, for example the due date.
10. The user says `file it`.
11. The app shows the final invoice for separate confirmation, then saves it through the normal save path.

### 3.2 What The Assistant Does

| Action | Example user text | Assistant behaviour |
|---|---|---|
| Creates a line item | `5 pcs cable lug 10mm at 9500` | Adds the row and shows the computed amount. |
| Corrects a value | `price is 95000 not 9500` | Fixes the row. States the new amount. |
| Detects a contradiction | `total 475000` with lines that sum to 47500 | States the mismatch. Asks which value is right. |
| Proposes a title | any invoice | Proposes `Invoice for ABC Ltd - June 2026`. |
| Proposes notes | any invoice | Proposes a Nigerian SME note set. |
| Proposes terms | any invoice | Proposes payment and delivery terms. |
| Asks for a missing field | no client named | Asks who the invoice is for. |
| Adds a charge | `delivery 5000` | Adds the extra charge row. |
| Removes a row | `remove the gasket` | Removes it, with the change shown. |

### 3.3 What The Assistant Does Not Do

- It does not save the invoice without an explicit instruction.
- It does not set an amount, a total, a VAT rate, a discount or a withholding tax rate. Those fields are not writable.
- It does not change history.
- It does not send anything to a client.

## 4. Free AI, And What Free Costs

The user requires a zero cost solution. The assistant uses free cloud tiers. Three costs apply and the product must state them.

### 4.1 Provider Pool

The product direction is DEC-29: one application-owned engine, multiple interchangeable providers and models, automatic selection, automatic bounded failover, free-first among eligible models, paid inference denied by default. The declared catalog below is the current proposal, not a manually ordered shipping chain. Free-tier limits, availability, pricing and terms are dynamic. They are not guarantees. A provider with no key or failing eligibility is skipped automatically. Paid models are not selected without an owner-authorised policy.

| Order | Provider | Model | Free allowance | Verified |
|---|---|---|---|---|
| 1 | NVIDIA NIM | `nvidia/nemotron-3.5-lightning-30b-a3b` | 40 requests per minute, no per token billing, no card | Documented 2026-11-13 |
| 2 | Cloudflare Workers AI | `@cf/ibm-granite/granite-4.0-h-micro` | 10,000 neurons per day, about 3,700 conversation turns | Documented 2026-11-13 |
| 3 | AMD Radeon Cloud Token Factory | `DeepSeek-V4-Flash` | 30 requests per minute per key, 20 per minute per account, about 10 US dollars of usage per day | Documented 2026-11-13 |
| 4 | OpenRouter | `openrouter/free` | 20 requests per minute, 50 per day under 10 US dollars of lifetime credits | Documented 2026-11-13 |
| 5 | OpenRouter | `nvidia/nemotron-3.5-lightning:free` | Shares the OpenRouter daily counter of the entry above | Documented 2026-11-13 |
| 6 | Google AI Studio | Gemini 3.5 Flash-Lite | 15 requests per minute, 500 requests per day | Measured 2026-09-02 |
| 7 | OpenRouter | `baidu/ernie-5.5-flash-preview:free` | Shares the OpenRouter daily counter of the entry above | Documented 2026-11-13 |
| 8 | Groq | Free tier | Read at signup | Not verified |
| 9 | Cerebras | One time 5 US dollar signup credit that needs a payment method | Not a recurring free tier | Documented 2026-11-13 |
| 10 | Vercel AI Gateway | Small free allowance | Read at signup | Not verified |

The engine selects from the eligible pool automatically. The user may exclude providers or models, prefer a model, or pin a model for a session. The user does not maintain the failover order by hand; DEC-09's ordering part is superseded by DEC-29. A model that fails eligibility (terms, capabilities, health, quota) is bypassed without user action.

### 4.0 NVIDIA NIM

The NVIDIA NIM free developer tier is the strongest entry in the chain for a trial, because it has no daily token cap.

| Property | Value |
|---|---|
| Base URL | `https://integrate.api.nvidia.com/v1` |
| Interface | OpenAI chat completions |
| Key | One account scoped key from build.nvidia.com, no card needed |
| Rate limit | Up to 40 requests per minute for most models |
| Billing | No per token billing on the free tier. The limit is the rate limit. |
| Models | `deepseek-ai/deepseek-v4.1-flash` with 1M context, `nvidia/nemotron-3.5-lightning-30b-a3b`, `nvidia/nemotron-3.5-super-vl-120b-a12b`, `nvidia/nemotron-3-ultra-550b-a55b`, `nvidia/nemotron-3-nano-30b-a3b`, `openai/gpt-oss-120b`, `google/gemma-4-31b-it`, plus GLM 5.3 Flash, Step 5 Preview and Mistral Large 4 |

A rate limit with no daily cap is worth more than a large daily allowance for a user who files a handful of invoices a day and never touches the cap.

One source describes the allowance as 1,000 trial credits, which is about 40 hours of inference inside a 90 day window. Another says the free tier is rate limited with no per token billing. Read the personal rate limit in the dashboard rather than a stored number.

### 4.1 Cloudflare Workers AI

The Cloudflare free plan gives 10,000 neurons a day, reset at 00:00 UTC, with a limit of 300 text generation requests a minute. The endpoint is OpenAI compatible at `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1`. The account id goes in the base URL and the Cloudflare API token is the key.

The allowance is not 10,000 requests. A neuron is the unit of GPU work, so the request count depends on the model.

| Model | Neurons per conversation turn | Turns a day |
|---|---|---|
| `@cf/ibm-granite/granite-4.0-h-micro` | 2.7 | 3,700 |
| `@cf/meta/llama-3.2-1b-instruct` | 4.7 | 2,100 |
| `@cf/qwen/qwen3-30b-a3b-fp8` | 8.3 | 1,200 |
| `@cf/google/gemma-4-26b-a4b-it` | 11.4 | 877 |
| `@cf/nvidia/nemotron-3-120b-a12b` | 57 | 175 |

One turn is 800 input tokens and 150 output tokens. The figures come from the published neuron rates.

The catch is that the strongest models are not free. DeepSeek V4 Flash, GLM 5.2, GLM 5.3, GLM 5.3 Flash, Kimi K2.6, Kimi K2.7 Code and Inkling 2 Small all need a paid billing method. The free plan serves Llama, Gemma 4 26B, Qwen 3 30B, Granite and GPT-OSS.

Cloudflare leads the chain for one reason: it runs on an edge network that is close to the user. The AMD endpoint is on the China site. A user in Nigeria reaches Cloudflare faster and more reliably.

### 4.2 The AMD Token Factory

The AMD AI Developer Program is free to join. Its Token Factory benefit gives an API key with no credit request. The console lists these free models today: DeepSeek V4 Flash, DeepSeek V4.1 Flash, GLM 5.3 Flash, Qwen3.8 Flash Next, Qwen3.8-27B, Gemma 4 31B, MiMo V2.6 Flash and MiniCPM 5.

The endpoint is `https://developer.amd.com.cn/radeon/api/v1`. It speaks the OpenAI chat completions interface and the Anthropic Messages interface. The phase 1 build uses the OpenAI interface only, so that the app keeps one request parser.

Three facts must be recorded in the product, not only in this document.

1. **The daily allowance is the largest in the chain.** About 10 US dollars of usage a day, reset at 00:00 Beijing time. One invoice conversation uses a small part of it.
2. **The terms call it a free trial and development service, not a production service.** Reselling access is not allowed. A trial by the product owner is inside the terms. A release to tenants is not. See RISK-14.
3. **The console and the endpoint live on the China site.** A user in Nigeria must confirm that the endpoint is reachable and fast enough from their network. See RISK-15.

Google states that free tier limits are not published and must be read in AI Studio. The app must therefore read the limit from the error body, not from a stored table. The Gemini 429 body names the quota and its value.

### 4.3 The Free Tier Ceiling

One conversation turn is one request. A ten turn invoice conversation is ten requests.

| Provider | Conversation turns a day |
|---|---|
| AMD Token Factory | Tens of thousands, bounded by the daily usage cap |
| Cloudflare Workers AI | 175 to 3,700, depending on the model |
| Gemini 3.5 Flash-Lite | 500 requests |
| OpenRouter free | 50 requests, or 1000 after a purchase |
| Gemini 3.8 Flash | 20 requests |

A user who runs the assistant against one provider with 20 requests a day will hit the wall during the first two invoices. The chain exists for this reason. It is not a nice to have.

The Cloudflare provider carries the chain in the trial because it is the one provider that is close to the user and that needs no purchase. The chain matters when a provider is missing, expired or unreachable from the user's network.

### 4.4 The Privacy Cost

The Gemini free tier states that content is used to improve Google products and may be seen by human reviewers. OpenRouter and the other free tiers carry their own terms.

The consequence for this product is that client invoice content leaves the tenant device and reaches a third party that may train on it.

The app must:

- Show a disclosure before the first send. The user accepts it.
- Keep the feature off by default.
- Name the provider in the disclosure.
- Never send anything when the feature is off.

### 4.5 The Preconfigured Provider And Model Catalog

The declared pool answers the failover question. The catalog answers the setup question. The user must not hunt for a base URL or a model name. Free-tier status, pricing, quotas and terms change without notice. Each catalog entry is a proposal with a verification date, not a commitment. Admission to the pool is an evidence check, not a signup.

The catalog holds fourteen tier 1 providers: OpenRouter, Anthropic, OpenAI, Google Gemini, Groq, DeepSeek, Mistral, Together AI, Fireworks AI, Cerebras, xAI Grok, Cohere, NVIDIA NIM and AMD Token Factory. Each row carries a base URL, a key prefix, a default model and a declared model list.

The user does one action per provider: paste a key. The default model is already set. The model dropdown is already full. A `/v1/models` refresh adds live models, and a failed refresh keeps the declared list.

The model pill in the chat top bar shows the active provider and model. It switches the active model without a page change. A provider with no key opens settings instead of a model list.

A user with an unlisted endpoint adds a **custom provider**: display name, base URL that ends in `/v1`, key, model ids, optional headers and context window. The custom row uses the same client and the same cards.

The full catalog, the custom form rules, the status badges and the viewport layouts are in [provider-catalog.md](provider-catalog.md).

## 5. The Trial

| Phase | Length | Gate |
|---|---|---|
| Build | 1 week | The assistant files a real invoice end to end on a real phone. |
| Trial | 4 weeks | Daily use by the product owner. |
| Decision | End of week 4 | Keep, change, or remove. |

The draft trial proposes a Settings toggle that is off by default. Its audience, duration, consent model, provider custody, and data-retention details remain unapproved. No trial starts until the owner approves those controls.

## 6. Success Measure

One measure only.

**Time from opening a new invoice to a saved invoice**, compared with the JSON import path.

| Path | Target |
|---|---|
| Conversational assistant | Median 90 seconds or less |
| JSON import | Baseline, measured during week 1 |

A second measure is a count of assistant errors that the user had to correct by hand. Target: fewer than 1 per 20 invoices by week 4.

## 7. Scope

In scope:

- Invoice creation by conversation, in the invoice form.
- Live form updates through tool calls.
- Pending change cards with accept and reject.
- Notes, terms and title proposals.
- Provider chain with failover, on free tiers only.
- Provider key storage and a quota readout.

Out of scope for the trial:

- Photo, image or scan input. *(Direction superseded by DEC-32/DEC-33: attachment intake is part of the agreed document-intelligence direction. Supported types, limits, retention, providers and privacy are unresolved. Nothing here is implemented.)*
- Voice input.
- Quotation, purchase order, waybill, receipt and CSR. The design must not block them.
- Automatic sending to a client.
- A database table for assistant history.
- Any paid provider.
- Any change to `src/lib/Calculations.ts`.
- Any change to a PDF renderer.

## 8. Open Questions

| # | Question | Owner |
|---|---|---|
| Q1 | Does the app send the provider key in the request header only, or does a future browser build need a server side proxy? | Engineering |
| Q2 | Should the assistant be able to create the client record when the client is new? | Product |
| Q3 | Should the assistant be able to change the invoice number, or leave the auto number alone? | Product |
| Q4 | Which note and term defaults does the business want? Nigerian SME practice varies. | Product |
| Q5 | Is the trial limited to the product owner, or to the whole test tenant? | Product |

## 9. Related Documents

| Document | Purpose |
|---|---|
| `functional-req.md` | The numbered requirements and the acceptance criteria. |
| `provider-catalog.md` | The preconfigured provider and model catalog, the custom endpoint rules and the viewport layouts. |
| `architecture.md` | The agent loop, the tool set, the provider chain, the storage and the failure handling. |
| `decision-log.md` | The decisions taken and the alternatives. |
| `risk-register.md` | The risks, the severity and the mitigation. |
| `test-plan.md` | The tests that must pass before the trial. |
| `Waterfall-roadmap.md` | The phases, the gates and the four week trial. |
| `roadmap.html` | The same roadmap as a phone-first page. |
| `docs/tickets/free-model-failover-stack.md` | The failover research this feature depends on. |
| `docs/tickets/local-ai-model-swap-and-speedup.md` | The on-device model work. This feature does not need it, but it shares the guardrails. |
| `docs/reports/ai/2026-11-14-hermes-provider-architecture-audit.md` | Hermes provenance and current provider-architecture status. |
| `docs/reports/ai/2026-11-14-dynamic-model-routing-reconciliation.md` | Dynamic multi-model engine reconciliation and the unresolved decision list. |
| `docs/reports/ai/2026-11-14-bolu-prd-roadmap-reconciliation.md` | Dated DEC-28/DEC-29 roadmap reconciliation. |
| `docs/reports/ai/2026-11-14-bolu-milestone-closeout-reconciliation.md` | Application-side invoice pipeline close-out evidence. |
| `docs/reports/ai/2026-11-14-bolu-live-provider-activation-report.md` | Live inference activation, stream handling, and two-gate integration. |
| `docs/reports/ai/2026-11-14-bolu-amd-provider-security-audit.md` | AMD Token Factory compatibility, auto-detection, and server key security. |
| `docs/reports/ai/2026-11-14-bolu-guided-provider-setup-report.md` | Guided PowerShell setup CLI and Vercel deployment synchronization. |
| `docs/reports/ai/2026-11-14-bolu-in-app-provider-config-report.md` | In-app administrator provider configuration with AES-256-GCM envelope encryption. |

## 10. Sources Considered For The Agent User Interface

| Source | Finding |
|---|---|
| affectUI by flohoeller | MIT, React 19, one file per component, no Tailwind and no animation library. It installs into `src/components/ui/` with the shadcn CLI, which this project already uses. The Decision Inbox component is an approval list with two answers, a live region and keyboard support. The Tool Call Card shows a tool call in one line. Both fit the chat surface. The components carry their own styles, not the `bd-*` tokens of this app, so they would need restyling. DEC-22 records the decision. |

## 11. Validated Trial Setup

Measured on 2026-11-13 on the developer machine. This replaces the estimate in section 6.

### 11.1 The Setup

| Item | Value |
|---|---|
| Gateway | OmniRoute 3.8.51, installed with npm |
| Base URL | `http://127.0.0.1:20128/v1` |
| Provider | The OpenRouter connection, already set up, with free models only |
| Model | `openrouter/nvidia/nemotron-3.5-lightning:free` |

### 11.2 The Measured Result

| Model | Time for one turn | Tool call |
|---|---|---|
| `openrouter/nvidia/nemotron-3.5-lightning:free` | 1.8 seconds | `{"description":"cable lug 10mm","quantity":5,"unit_price":9500}` |
| `openrouter/openrouter/free` | 2.5 seconds | `{"description": "Cable lug 10mm", "quantity": 5, "unit_price": 9500}` |
| `openrouter/baidu/ernie-5.5-flash-preview:free` | 3.3 seconds | `{"description": "Cable lug 10mm (ABC Ltd)", "quantity": 5, "unit_price": 9500}` |

The input was `Invoice for ABC Ltd: 5 pcs cable lug 10mm at 9500`. All three models called the tool with the right quantity and the right price.

One difference shows up in the data. The Baidu model put the client name inside the item description. The other two did not. The choice of model matters for the quality of the first draft.

The `X-OmniRoute-Decision` header was present on every response and named the strategy, the provider and the latency. That answers the provider readout in FR-10 without any extra call.

### 11.3 The Settings That Matter

| Setting | Value | Reason |
|---|---|---|
| `REQUIRE_API_KEY` | `true` | The proxy endpoint accepts requests without a key by default. Anyone who can reach the port spends the provider keys. |
| `API_HOST` | `127.0.0.1` while the gateway runs on the computer | The default bind address is `0.0.0.0`, which exposes the gateway to the local network. |

### 11.4 What Went Wrong The First Time

The first attempt returned nothing. The cause was three things, and none of them was the model.

1. The gateway was not running. It is installed but it is not a service.
2. The request used `duckduckgo-web/gpt-5.4-mini`. That lane is a keyless web scrape of a consumer chat site. The log shows an anti abuse refusal with an empty body, which the client sees as no answer at all.
3. The second request carried an empty model name, so the gateway answered `Missing model`.

The lesson for this product is in section 4.1. A keyless web scrape lane can fail without a body, and a failure with no body is the worst kind of failure for a user. The app must show the status and the message of a failed call, and it must never render an empty answer.

## 12. The Interface Across Four Viewports

The assistant is one surface with four layouts. The layout follows the available width.

| Viewport | Width | Layout | Context and settings |
|---|---|---|---|
| Fold closed / phone | 360 to 390 | One column | Bottom sheet |
| Fold open | 720 to 840 | Chat left, live invoice right | Right pane |
| Tablet | About 1024 | Thread rail, chat, context drawer | Drawer |
| Desktop | 1280 and above | Workspace rail, centered chat canvas, artifact column | Artifact column |

The top bar holds the BOUXRE mark, the assistant name, the model pill, the context control and the settings control. The stream sticks to the bottom. A **Latest** control appears when the user scrolls up. The composer is one rounded card with action pills and one send or stop control.

The layout never changes the money rule. An accepted card applies once. A rejected card changes nothing. The invoice panel reads the computed total from the invoice state.

The interactive preview is at `/design-lab/assistant-chat`. It mounts no network client.
