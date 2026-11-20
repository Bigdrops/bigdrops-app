# Context.dev Capability and Integration Audit

This report was written by Buffy on 2026-11-19 via Freebuff (Codebuff).

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Executive summary and recommendation

Context.dev is a hosted web data API. It returns page content, typed JSON, screenshots, crawled site text, web search results, company brand data, people and company records, and news. It also runs asynchronous batches, scheduled page monitors, and multi-source research answers. One credit balance covers all of these operations.

Context.dev is **not** an AI model provider. It supplies web data to an application that already has a model. This distinction matters for BOURXE, because the repository already has a working model routing layer (`api/bolu-chat.ts`, `src/lib/ai-assistant/provider-adapters.ts`) and no web data layer at all.

The audit finds three things.

1. **The capability gap is real.** Searching `src/lib/ai-assistant` for web search, URL fetch, crawl, or browse tooling returns no matches. Searching `api/` for tool-calling or function-calling constructs returns no matches. Bolu today reads only application-owned records through a closed capability set (`src/lib/ai-assistant/bolu-capabilities.ts`). It cannot look at a supplier website, a price list PDF, or a public company record.
2. **The commercial entry point is cheap but narrow.** The Free plan is 1,000 credits per month with 2 concurrent requests and no overage. At 5 credits for a scraped and JSON-extracted page, that is about 200 pages per month. Any real supplier-catalogue workload moves to the Developer plan at USD 20 per month, which the vendor's own pages describe as either 5,000 or 10,000 credits depending on the page and subscription date. This report records that conflict as an open item, not as a settled number.
3. **Integration is safe to test and unsafe to assume.** The provider account is organization-level. It has no tenant concept. BOURXE is multi-tenant. Any Context.dev use must therefore be metered and authorized per tenant inside BOURXE, and it must never be called from the browser.

**Recommendation: run an isolated, non-production experiment before any integration decision.**

Do not add Context.dev to the Bolu runtime in this cycle. Instead, run a bounded evaluation with a dedicated API key, a small sample of real supplier URLs, and the credit ledger checked after every batch. Choose the transport (REST/SDK versus MCP) after that experiment, not before.

The direct REST API or the official TypeScript SDK is the correct production path. The hosted MCP server is a good fit for internal engineering tools and agent-assisted development. It is not the correct path for the BOURXE runtime, because MCP moves tool selection into the model client, while BOURXE deliberately keeps authorization, validation, and financial calculation in application code.

| Question | Answer | Confidence |
|---|---|---|
| Does BOURXE currently have web data capability? | No. Verified by repository search. | High |
| Does Context.dev replace any current BOURXE dependency? | No. It adds a capability. | High |
| Can it be integrated without violating the Bolu approval gates? | Yes, if it is a read-only evidence tool that feeds proposals and never writes business data. | Medium |
| Is the free tier sufficient for evaluation? | Yes, for roughly 200 extracted pages. | High |
| Is Nigerian SME supplier coverage proven? | No. This is the largest unverified risk. | Low |
| Should BOURXE integrate now? | No. Run the isolated experiment first. | High |

---

## 2. Objective, scope and constraints

### 2.1 Objective

Establish whether Context.dev adds useful capability to BOURXE, what it costs, what it requires architecturally, and whether it is safe to integrate under the repository's tenant, authorization, and financial-integrity rules.

### 2.2 Scope

In scope:

- Context.dev public capability, pricing, credit, access-path, limit, and compliance documentation.
- Public promotional offers for free credits.
- BOURXE repository evidence for the AI assistant, provider routing, credential storage, tenant model, and candidate domain modules.

Out of scope and not performed:

- No source, configuration, database, dependency, or migration change.
- No API key creation.
- No call to any Context.dev endpoint.
- No upload of customer, supplier, or tenant data.
- No account or dashboard access.

This is a zero-code audit. The only task-attributable repository change is this report.

### 2.3 Constraints applied

- Bun only. No npm, yarn, or pnpm.
- No `bun run build` on the constrained host.
- Documentation-only change, so no typecheck and no load audit were required or run.
- Pre-existing working-tree changes were preserved and not staged.

---

## 3. Method and evidence grading

Evidence sources, in descending authority:

1. Vendor documentation on `docs.context.dev` and `www.context.dev`, accessed 2026-11-19.
2. Vendor machine-readable indexes (`llms.txt`, `llms-full.txt`), accessed 2026-11-19.
3. Vendor promotional post by the vendor's own Reddit account, dated 2026-10-29.
4. BOURXE repository files, inspected 2026-11-19.

Confidence labels used in this report:

| Label | Meaning |
|---|---|
| High | Stated identically on two or more vendor pages, or directly read from repository code. |
| Medium | Stated once by the vendor, or inferred from a consistent pattern. |
| Low | Third-party, conflicting, or absent. Requires the dashboard or a live test. |

Where two vendor pages disagree, this report states both readings and does not pick one silently.

---

## 4. Provider identity, provenance and status

| Item | Finding | Confidence |
|---|---|---|
| Product | Hosted web data API for AI agents: scrape, map, crawl, search, extract, screenshot, batch, monitor, brand, people, company, news, answers, parse. | High |
| Former identity | The product was formerly Brand.dev. The vendor instructs developers to avoid the `brand.dev` domain and `@brand-dev/*` packages in new code. | High |
| Primary API host | `api.context.dev` | High |
| Documentation host | `docs.context.dev` | High |
| Hosted MCP endpoint | `https://mcp.context.dev/mcp`, OAuth-based | High |
| Account model | Organization-level. One credit balance covers all APIs. | High |
| Data processing agreement | Published at `https://www.context.dev/dpa`, with a subprocessor list at `/dpa/subprocessors`. | High |
| Feedback channel | `POST /v1/feedback`, 0 credits, accepts any API key. | High |

The provider publishes a machine-readable OpenAPI 3.1 description at `https://www.context.dev/openapi.json`. This is the correct source of truth for request and response shapes, and it removes the need to reverse-engineer the API from prose.

---

## 5. Capability inventory

All prices below are in credits and are stated per operation by the vendor.

### 5.1 Core retrieval

| Capability | Endpoint | Output | Cost | Confidence |
|---|---|---|---|---|
| Scrape a page | `POST /v1/web/scrape` | Markdown, HTML, screenshot, images, bytes, CSS-parsed fields, highlights, JSON | 1 credit, 2 with browser actions | High |
| Typed JSON extraction | same call, `formats: { json: true }` plus `jsonParams.schema` | JSON matching a JSON Schema | +4 credits, 5 total | High |
| CSS field parsing | `formats.parse` with `parseParams.rules` | Selected fields | +0 credits | High |
| Screenshot | `formats.screenshot` | Viewport, full page, element, or rectangle | Included in the 1-credit scrape | High |
| Highlights | request option | Relevant excerpts | +1 credit | High |
| Product data | request option | Structured product fields | +1 credit | High |
| PDF OCR | request option | Recovered text per page | +1 credit per recovered page | High |

A detail that matters for BOURXE: `jsonParams.schema` must be a JSON Schema, not an example object. The `Answers` endpoint is the opposite and takes an example object in `json_format`. These two contracts are easy to confuse, and a mistake produces silent shape drift rather than a clean error.

### 5.2 Site structure and ingestion

| Capability | Endpoint | Notes | Cost | Confidence |
|---|---|---|---|---|
| Map URLs | `GET /v1/web/urls` | Returns URL objects with optional title, description, keywords, language | 1 credit, 2 with search | High |
| Crawl site | `POST /v1/web/crawl` | One Markdown document per successful page, maximum 500 pages per call | 1 credit per successful page | High |
| Batch | `POST /v1/batch/submit` | Up to 100,000 URLs from a list, a start page, or a sitemap; poll `GET /v1/batch/{batch_id}`, webhook, or file download | 1 credit per successful URL only | High |
| Parse file | `POST /v1/parse` | Raw document bytes, PDF, Office formats, optional OCR | 1 credit, plus 1 per OCR page | High |

Only successful pages are charged for crawl and batch. This is a meaningful commercial difference from providers that charge failed requests, and it lowers the cost of experimenting on messy supplier sites.

### 5.3 Search and research

| Capability | Endpoint | Notes | Cost | Confidence |
|---|---|---|---|---|
| Web search | `POST /v1/web/search` | Results, with optional per-result Markdown or highlights at extra cost | 1 credit per 10 results | High |
| Answers | `POST /v1/web/answers` | Task plus mode, returns `json_content` and `sources` | 10 credits fast, 100 ultra | High |
| News search | `POST /v1/news/search` | Query, or company news by name, domain, ticker, ISIN | 1 credit per 10 results | High |

The vendor documentation states that Ultra is the 100-credit default mode for Answers. This is a cost trap. A single research call can consume 10% of the free monthly balance, or a full tenth of a 1,000-credit allowance, without any warning in the request.

### 5.4 Entity and brand data

| Capability | Endpoint | Notes | Cost | Confidence |
|---|---|---|---|---|
| Brand profile | `POST /v1/brand/retrieve` | By domain, email, company name, stock ticker, transaction descriptor, or URL | 10 credits | High |
| Brand autocomplete | `GET /v1/brand/search` | Company and brand selection | 1 credit, free on Pro and above | High |
| Styleguide | `GET /v1/web/styleguide` | Typography, font links, colours, spacing, shadows, component styles | 10 credits | High |
| People search | `POST /v1/people/search` | Role, employer, location, skills, experience; up to 10 results per page | 10 credits per non-empty page, empty results free | High |
| People enrichment | `POST /v1/people/enrich` | Identity clues such as email, profile URL, or name plus company | 20 credits per returned match | High |
| Company search | `POST /v1/company/search` | Natural-language query; identity, headquarters, headcount, funding, pagination | 2 credits per page in fast mode, 10 in ultra | High |

Brand and company data are oriented to established, indexed companies. The vendor publishes no coverage statement for small Nigerian businesses. Section 13 treats this as the primary commercial risk.

### 5.5 Monitoring

| Capability | Endpoint | Notes | Cost | Confidence |
|---|---|---|---|---|
| Page monitor | `POST /v1/monitors` | Watch a page for changes | 1 credit per run | High |
| Sitemap monitor | `POST /v1/monitors` | Watch a sitemap for changes | 1 credit per run | High |
| Browser-action monitor | `POST /v1/monitors` | Monitor with browser actions | 2 credits per run | High |
| Extract monitor | `POST /v1/monitors` | Watch an extracted value | 10 credits per run | High |

Failed and skipped runs are free. Changes arrive as signed webhooks or through the runs and changes endpoints. The difference between a 1-credit page monitor and a 10-credit extract monitor is the single largest cost decision in a supplier price-watching design.

---

## 6. Pricing, credits and commercial terms

### 6.1 Plan table

| Plan | Monthly price (USD) | Credits per month | Overage per 1,000 credits | Confidence |
|---|---|---|---|---|
| Free | 0 | 1,000 | None. Requests fail when depleted. | High |
| Developer | 20 | 10,000 stated on the pricing page and `llms.txt`; 5,000 stated in `llms-full.txt` for new subscriptions | 3.00 | Low. Conflict. See 6.3. |
| Pro | 90 | 100,000 | 2.00 | High |
| Growth | 300 | 500,000 | 1.50 | High |
| Scale | 500 | 1,000,000 | 1.00 | High |
| Scale 2.5M | 950 | 2,500,000 | 0.75 | High |
| Enterprise | Custom | Custom | Custom | High |

Annual billing includes two months free. The vendor states that existing subscriptions keep their current rates and allowances.

### 6.2 Free plan limits

| Limit | Value | Confidence |
|---|---|---|
| Credits | 1,000 per month, no credit card | High |
| Concurrency | 2 concurrent requests | High |
| Request rate for new Free organizations | 10 requests per minute, organization-wide | High |
| Legacy Free organizations | Per-key per-minute limits: 30 with a work email, 10 with a personal email | High |
| Monitors | 10 | High |
| Concurrent batches | 1 | High |
| API keys | 2 | High |
| Overage | None. Calls return 401 when credits are depleted. | High |
| Logo Link quota | 10,000 one-time requests, separate from credits | Medium |

The absence of overage on the Free plan is a safety property, not only a limit. A misconfigured crawl on a Free organization fails closed. The same misconfiguration on a paid plan produces a bill.

### 6.3 Recorded pricing conflicts

These two conflicts were observed on 2026-11-19 and are not resolved by this audit.

**Conflict 1, Developer credits.**

- `https://www.context.dev/pricing`, `https://www.context.dev/llms.txt`, and the marketing landing page state 10,000 credits per month at USD 20.
- `https://docs.context.dev/llms-full.txt` shows a Developer row of 5,000 credits per month, with the note that Developer subscriptions started before 2026-11-07 keep 10,000 credits per month.
- One third-party page shows a USD 25 Developer plan with 10,000 credits, which matches neither figure.

Reading: the pricing page and `llms.txt` appear to describe the legacy allowance, while `llms-full.txt` describes the current new-subscription allowance. This is an inference, not a vendor statement.

**Conflict 2, free credits by email type.**

- `https://docs.context.dev/guides/free-credits` states 1,000 credits monthly for a work email and 250 credits one-time for a personal email, effective 2026-09-11.
- `https://docs.context.dev/account/credits` states 1,000 credits monthly regardless of email type.
- `https://www.context.dev/pricing` states 1,000 credits per month with no email-type condition.

Reading: the newer generic statement may have superseded the email-type policy, or the email-type policy may still apply to older organizations. BOURXE must confirm the actual allowance in its own dashboard before it plans against a number.

Neither conflict changes the qualitative conclusion. The free tier is an evaluation budget, not an operating budget.

### 6.4 Promotional credits

| Item | Finding | Confidence |
|---|---|---|
| Code | `SPOOKY10K` | High. Posted by the vendor's own account. |
| Value | 10,000 credits | High |
| Redemption path | Sign up, complete onboarding, open `context.dev/dashboard/redeem-credits`, enter the code, click Redeem code | High |
| Limit | One redemption per organization | High |
| Expiry | Not stated. A commenter asked; the vendor did not answer publicly. | Low |
| Interaction with the monthly allowance | Not stated | Low |
| Applicability to MCP usage | Not stated, but a single organization balance is documented, so it should apply | Low |

A separate, unrelated finding: the vendor announced a 50,000-credit bonus for existing accounts after its funding round. That is not a public signup offer and is out of scope here.

The code was published 2026-10-29. Promotional codes normally expire. BOURXE must attempt redemption early if the experiment depends on it, and must not treat the credits as a durable budget.

### 6.5 Commercial terms that affect the decision

- The vendor states it does not currently support one-time lookups. Buyers who need occasional volume must contact sales.
- A startup program offers up to 30% off for one year, subject to eligibility.
- Auto-Topup exists on paid plans and is the mechanism by which a runaway job becomes an invoice. BOURXE should leave Auto-Topup disabled during evaluation.

---

## 7. Access paths: REST, SDKs, MCP, CLI

| Path | Detail | Fit for BOURXE runtime | Fit for BOURXE engineering |
|---|---|---|---|
| REST | `https://api.context.dev/v1/...`, bearer API key | Good. Explicit, testable, controllable. | Good |
| TypeScript SDK | `context.dev` on npm, official Node and TypeScript client | Good. Matches the repository's TypeScript stack. | Good |
| Python, Ruby, Go, PHP SDKs | Official clients published per ecosystem | Not applicable | Not applicable |
| Hosted MCP | `https://mcp.context.dev/mcp`, OAuth, no API key in the URL | Poor. Moves tool choice into a client the application does not control. | Good |
| CLI | Documented at `https://www.context.dev/cli` | Not applicable | Good |
| ChatGPT plugin | Browser OAuth install | Not applicable | Not applicable |
| Zapier, Make | No-code connectors | Not applicable | Not applicable |

### 7.1 Why REST or the SDK wins for the runtime

BOURXE does not use model-driven tool calling today. `api/bolu-chat.ts` sends messages to an OpenAI-compatible or Anthropic-compatible endpoint and streams text back. There is no tool loop, no function-call handling, and no tool-result message type anywhere in `api/`.

Adding MCP to that runtime would mean adding an MCP client, a tool-selection policy, and a trust boundary for tool arguments, in exchange for access to an API that a 30-line fetch wrapper can call directly. The application would then depend on the model to choose the right tool, which conflicts with the existing design principle in `src/lib/ai-assistant/bolu-operations.ts`: the model interprets intent, and the application owns validation, authorization, and persistence.

A direct adapter also keeps the credit decision in code. The application can refuse an expensive operation, cache a result, or downgrade a request. Tool-selected MCP calls make that control indirect.

### 7.2 Where MCP does fit

MCP is a reasonable addition to an engineer's own toolchain: inspecting a supplier site while writing an adapter, checking what a schema extraction returns, or drafting a fixture. It should use a separate key or a separate organization from any production key, so that exploratory usage does not consume the runtime budget or appear in runtime ledger reconciliation.

### 7.3 MCP unknowns

The exact tool count and tool names exposed by `mcp.context.dev` were not re-verified in this pass. The vendor's MCP documentation is the source of truth. This report does not rely on a tool count for any conclusion.

---

## 8. Operational limits and reliability

| Property | Finding | Confidence |
|---|---|---|
| Concurrency on Free | 2 requests | High |
| Concurrency on Developer | 10 requests | High |
| Concurrency on Pro | 100 requests | High |
| Per-minute limits | Plan-dependent; new Free organizations are capped at 10 requests per minute organization-wide | High |
| Failed page billing | Crawl and batch charge only successful pages. Monitors do not charge failed or skipped runs. | High |
| Cache freshness | Brand retrieval and Styleguide honour `maxAgeMs`. Default three months, maximum one year. `0` forces fresh data. | High |
| Retries | Proxy rotation and retry behaviour are described in vendor glossary pages, not in a formal SLA document that this audit located. | Medium |
| Published uptime SLA | Not located in the sources reviewed | Low |
| Webhook integrity | Monitors deliver signed webhooks | High |

The practical consequence is that a supplier-catalogue refresh is throughput-bound on the Free and Developer plans. At 10 concurrent requests and a few seconds per page, a 500-page crawl is a background job, not a request-path operation. This matches the batch and webhook design the vendor already provides.

No uptime SLA was located. BOURXE should not build a user-visible feature that fails when Context.dev is unavailable. Every call needs a timeout, a bounded retry, and a defined degraded state.

---

## 9. Security, privacy and compliance posture

| Topic | Finding | Confidence |
|---|---|---|
| Credential model | Bearer API key for REST and SDK. OAuth for MCP, so no key is pasted into the client. | High |
| Key scoping | API keys are organization-level, with a plan-dependent maximum count. | High |
| Data processing addendum | Published at `https://www.context.dev/dpa` | High |
| Subprocessors | Published list at `https://www.context.dev/dpa/subprocessors` | High |
| Zero data retention | The vendor's documentation references retention and cache controls, including `maxAgeMs`. A specific contractual zero-retention term was not confirmed in the sources reviewed. | Low |
| Terms of service | `https://www.context.dev/term` | High |
| Privacy policy | `https://www.context.dev/privacy` | High |

### 9.1 What BOURXE would be sending

Three data classes differ materially in sensitivity.

1. **Public supplier pages.** Low sensitivity. A supplier catalogue page is already public.
2. **Tenant business data embedded in a prompt or query.** Medium to high sensitivity. A search query that contains a tenant's supplier name and price expectation discloses commercial information to a third party.
3. **Personal data for people search or enrichment.** High sensitivity. Names, emails, and employment details are personal data. Nigerian data protection obligations apply to processing, and a subprocessor relationship must be documented before that processing starts.

### 9.2 What this audit does not establish

This audit does not certify compliance with the Nigeria Data Protection Act or any other regime. It records that people enrichment would introduce personal-data processing through a new subprocessor, and that the DPA and subprocessor list must be reviewed by the party responsible for compliance before that feature is enabled.

Also unverified: whether the vendor offers a contractual zero-retention or no-training guarantee suitable for tenant-confidential content. Until that is confirmed in writing, BOURXE should send only public page URLs and non-confidential queries.

---

## 10. BOURXE current state: verified repository evidence

This section records what the repository actually contains, inspected 2026-11-19. It replaces earlier assumptions.

### 10.1 Bolu runtime

`api/bolu-chat.ts` (768 lines) is a server-only handler. Its documented configuration precedence is:

1. Administrator-activated primary connection in `app_ai_provider_routing`, with explicitly approved fallbacks.
2. Legacy singleton credential in `app_ai_provider_config`.
3. Server environment variables `BOLU_PROVIDER_*`.
4. Deterministic mock mode, only when `BOLU_PROVIDER_MODE=mock` is explicit.

Failover is pre-first-token only. Once content reaches the client, the generation is locked and never replayed. Credentials are decrypted only in serverless memory.

Authentication is a Supabase bearer token resolved through `client.auth.getUser(token)`. Administrative data access uses a service-role client. The system prompt explicitly forbids inventing records or figures and forbids model-generated financial calculation.

### 10.2 Provider abstraction

| File | Role |
|---|---|
| `src/lib/ai-assistant/provider-catalog.ts` | Client-safe catalogue: OpenRouter, OpenAI, Anthropic, Gemini, Groq, DeepSeek, plus custom. Records protocol, auth scheme, base URL, discovery support, docs URL, curated models, region note. |
| `src/lib/ai-assistant/provider-adapters.ts` | Node-only protocol adapters for OpenAI-compatible chat completions and Anthropic messages, including `x-api-key` plus `anthropic-version` handling, diagnostics categories, and model discovery. |
| `src/lib/ai-assistant/provider-security.ts` | SSRF-safe fetch and endpoint validation. |
| `src/lib/ai-assistant/routing/` | Account pool, policy router, error classifier, balance sync, provider catalogue. |
| `src/lib/ai-assistant/bolu-usage-ledger.ts` | Token, cost, and usage accounting. |

This is a mature, deliberate boundary. Any new outbound dependency should follow the same shape: a catalogue entry, an adapter with classified errors, a security wrapper, and usage accounting.

### 10.3 Credential storage

`supabase/migrations/20261114170000_bolu_provider_connections.sql` creates `app_ai_provider_connections` with:

- AES-256-GCM envelope fields: `encrypted_key`, `key_nonce`, `key_tag`, `key_version`, `masked_key`.
- Health and pool state: `health_status`, `priority`, cooldowns, consecutive failures, last error code.
- Accounting: `total_requests_started`, `total_successful_requests`, `total_tokens`, known balance fields.
- Row-level security that denies `anon` and `authenticated`, with access only through the service role.

`20261114160000_bolu_provider_credentials.sql` creates the legacy singleton `app_ai_provider_config` with the same deny-all policy.

Critically for this audit: **neither table has a `company_id` or any tenant column.** Provider credentials and routing are platform-wide. That is a correct design for platform-owned inference capacity, and it is the wrong design for anything that must be billed or authorized per tenant.

### 10.4 Bolu capability surface

`src/lib/ai-assistant/bolu-capabilities.ts` defines a closed read set: `search-invoices`, `read-receivables`, `search-quotations`. Capabilities are gated by page module. Intent matching explicitly refuses write verbs.

`src/lib/ai-assistant/bolu-operations.ts` (2,582 lines) defines exactly three operation types: `create-document`, `modify-document`, `advance-invoice-config`. It enforces two approval gates. Gate 1 approves a structured proposal. Gate 2 separately confirms persistence. Financial values come from `src/lib/Calculations.ts`, not from the model.

### 10.5 Absent capability, confirmed by search

| Search | Scope | Result |
|---|---|---|
| `web_search`, `webSearch`, `fetch_url`, `browse_url`, `crawl` | `src/lib/ai-assistant` | 0 matches |
| `tool_call`, `tool_call_id`, `function_call`, `tools: [` | `api/` | 0 matches |

Bolu has no web access and no tool-calling loop. Context.dev would be the first external data capability, which means it is also the first time tenant data would leave the application boundary on the assistant's behalf.

### 10.6 Candidate domain modules

| Module | Location | Relevance |
|---|---|---|
| Supplier | `src/modules/supplier/supplierService.ts` | Supplier records are first-party tenant data. |
| Party linking | `src/modules/party/partyLinkService.ts` | Existing entity resolution between clients and suppliers. |
| Item library | `src/modules/item-library/` with domain, repositories, services, local AI job panels | Product and item catalogue. Currently populated through application workflows, not web ingestion. |
| Purchase order, quotations, invoices, tax, compliance | `src/modules/` | Consume supplier and item data downstream. |

`src/lib/ai-assistant/bolu-data.ts` already reads from `suppliers` inside the assistant data layer, which confirms supplier context is already an assistant concern and would be the natural join point for enrichment.

---

## 11. Architecture compatibility and integration fit

### 11.1 Where it fits

| Proposed use | Fit | Reasoning |
|---|---|---|
| Supplier website to item catalogue | Strong | Scrape plus JSON Schema extraction maps directly to item-library fields. 5 credits per page is predictable. |
| Supplier price and stock monitoring | Strong, with a design choice | Page monitors at 1 credit per run are affordable. Extract monitors at 10 credits per run are not, at supplier-list scale. |
| Public company check on a new supplier | Moderate | Company search at 2 credits per page is cheap, but coverage of small Nigerian businesses is unproven. |
| Supplier document parsing, PDF price lists | Strong | `POST /v1/parse` handles PDFs and Office files, with OCR at 1 credit per page. |
| Brand and style assets for documents | Weak | Styleguide and Brand cost 10 credits each and serve marketing, not operations. |
| People search and enrichment | Weak for now | 10 to 20 credits per record, plus personal-data obligations, plus no clear BOURXE workflow. |

### 11.2 Where it does not fit

- **Financial values.** Context.dev must never supply a price that feeds `src/lib/Calculations.ts` without explicit user confirmation. A scraped price is evidence, not a quotation.
- **Request path.** Crawl, batch, and monitor operations are asynchronous by design. Blocking the chat stream on a crawl would violate the existing latency behaviour and the pre-first-token failover contract.
- **Browser code.** The API key must never reach the client. The repository convention is already correct: server-only variables, and no secrets behind `VITE_*`.

### 11.3 Required integration shape

If the experiment succeeds, the integration belongs in a new server-side adapter, not inside `bolu-chat.ts` directly:

1. A catalogue-style module describing operations, cost per operation, and endpoint.
2. An adapter that reuses `safeProviderFetch` patterns for outbound safety, with classified errors and timeouts.
3. A credit ledger writer that mirrors `bolu-usage-ledger.ts`, keyed by tenant and operation, so cost is attributable.
4. A capability entry that extends the closed read set, subject to the same module gating.
5. A proposal-only path for anything that would change business data, so Gate 1 and Gate 2 still apply.

The existing approval architecture makes this a natural fit, provided the new capability returns evidence with sources and never returns a value that the application treats as authoritative.

---

## 12. Multi-tenant isolation and data-boundary assessment

| Question | Finding |
|---|---|
| Does Context.dev have a tenant concept? | No. Billing, credits, keys, and rate limits are organization-level. |
| Does BOURXE have a tenant concept? | Yes. Tenant-scoped data access exists across modules, including suppliers and the assistant data layer. |
| Can one key serve all tenants? | Technically yes. Commercially and legally it requires internal metering. |
| Is per-tenant key isolation practical? | Not on the Free plan, which allows 2 keys. Developer allows 50. |
| Does the vendor see tenant identifiers in requests? | Yes, in the URL, query, or schema payload. |

### 12.1 Required controls

1. **Tenant-derived authorization.** The tenant must come from the authenticated session, never from a request body field. The existing pattern in `bolu-chat.ts` resolves the user from the bearer token, and that pattern must carry over.
2. **Usage attribution.** Every call writes a ledger row with tenant, operation, credits, and the source URL or query. Without this, one tenant can exhaust the platform allowance and another cannot be billed.
3. **Budget enforcement.** A per-tenant monthly credit ceiling must be enforced before the call, not discovered after it.
4. **Rate-limit fairness.** The organization-wide concurrency and per-minute caps are shared. A single tenant running a large crawl can starve every other tenant. A queue with per-tenant fairness is required before production.
5. **No cross-tenant caching.** A scraped supplier page may be cached only if the cached record carries the same tenant scope as the requester, or if the page is genuinely public and the cache is explicitly global by design.

### 12.2 Assessment

The provider's organization-level model does not block integration, but it converts a simple API call into a metering and fairness problem. That problem is solvable with the repository's existing ledger pattern. It is not solvable by configuration on the Context.dev side.

---

## 13. Cost model, risks and unknowns

### 13.1 Illustrative cost scenarios

These are arithmetic on vendor-published credit prices. They are not measured workloads.

| Scenario | Volume | Calculation | Credits |
|---|---|---|---|
| Evaluate one supplier catalogue | 40 product pages, JSON extraction | 40 x 5 | 200 |
| Monthly refresh, 25 suppliers | 1,000 pages, JSON extraction | 1,000 x 5 | 5,000 |
| Daily price watch, 100 pages | 100 x 30 page-monitor runs | 3,000 x 1 | 3,000 |
| Daily price watch with extraction | 100 x 30 extract runs | 3,000 x 10 | 30,000 |
| Supplier document ingestion | 50 PDFs, 10 OCR pages each | 50 x (1 + 10) | 550 |
| Research answers, fast mode | 20 calls | 20 x 10 | 200 |
| Research answers, ultra default | 20 calls | 20 x 100 | 2,000 |
| People enrichment | 100 contacts | 100 x 20 | 2,000 |

Reading:

- The evaluation scenario fits inside the Free 1,000-credit month with room to spare.
- A modest production refresh lands on Developer, at USD 20 per month, subject to the 5,000 versus 10,000 conflict.
- The extract-monitor design at 30,000 credits per month sits in Pro territory at USD 90 per month, for a feature that a 1-credit page monitor plus local diffing may satisfy.
- A single tenant doing people enrichment can consume more credits than the entire supplier refresh.

The dominant cost lever is not the plan price. It is the choice between a 1-credit page monitor and a 10-credit extract monitor, and the choice between fast and default-ultra Answers.

### 13.2 Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Unproven coverage of small Nigerian suppliers | High | Test against a sample of real tenant supplier domains before any commitment. |
| Organization-level credits shared across tenants | High | Per-tenant ledger, budget ceiling, and fair queue before production. |
| Runaway crawl or batch consuming the balance | High | Free plan fails closed. On paid plans, disable Auto-Topup during evaluation and cap batch size in code. |
| Answers default folds cost into ultra | Medium | Always set mode explicitly. |
| Scraped price treated as authoritative | High | Evidence-only capability. Gate 1 and Gate 2 unchanged. The model must not write to `Calculations.ts` inputs. |
| Personal data sent to a new subprocessor | High | Defer people search and enrichment until compliance review is complete. |
| Provider outage breaking a user flow | Medium | Timeouts, bounded retries, and a defined degraded state. No user-visible hard dependency. |
| Promotional credits expiring | Medium | Redeem early, and do not plan against them. |
| Vendor pricing change | Medium | The vendor has already changed plans in 2026. Keep the adapter cost table in one place. |
| Terms or DPA unsuitable for tenant-confidential content | Medium | Send public URLs only until confirmed in writing. |

### 13.3 Explicit unknowns

1. Developer plan allowance: 5,000 or 10,000 credits per month for a new subscription.
2. Free allowance for a personal-email organization: 250 one-time or 1,000 monthly.
3. `SPOOKY10K` expiry date and whether it stacks with the monthly allowance.
4. Whether promotional credits apply to every endpoint, including MCP-driven calls.
5. Whether MCP usage draws from the same organization balance. Documented as one balance, not explicitly tested.
6. Exact MCP tool count and tool names.
7. Coverage and accuracy for Nigerian SME supplier domains, product pages, and price lists.
8. Contractual zero-retention or no-training terms for tenant content.
9. Published uptime SLA.
10. Whether `jsonParams.schema` accepts the JSON Schema draft that BOURXE would generate.

Items 1, 2, 3, 5, and 9 require dashboard or account access. Item 7 requires the isolated experiment. Item 8 requires a commercial conversation.

---

## 14. Recommendation, staged plan and open questions

### 14.1 Recommendation

Run an isolated experiment. Do not integrate into the runtime in this cycle.

The reasoning is narrow and specific. The capability gap is real and the cost of entry is USD 0 to USD 20 per month. That combination justifies an experiment. But the three decisive facts, Nigerian SME coverage, tenant metering, and personal-data processing, cannot be settled from documentation. They can be settled in a few hours of measured testing, and they would be expensive to discover after an integration is live.

### 14.2 Staged plan

**Stage 0, isolated experiment. No repository change beyond this report.**

1. Create one organization with a work email. Confirm the actual allowance in the dashboard and record it.
2. Attempt `SPOOKY10K` redemption immediately. Record the result, the resulting balance, and whether the balance is dated.
3. Create one API key, stored outside the repository. Never in `.env` under a `VITE_` name, never in client code.
4. Select 20 real supplier URLs from the current supplier list, with tenant consent, covering a catalogue page, a PDF price list, and a JavaScript-rendered page.
5. Measure four things per URL: scrape success, Markdown quality, JSON Schema extraction accuracy against item-library fields, and credits consumed.
6. Run one company search and one brand retrieve against a known Nigerian supplier. Score coverage honestly. Expect failure and record it.
7. Write the results into a follow-up report under `docs/reports/context-dev/`.

**Stage 1, adapter and ledger, only if Stage 0 passes.**

Add a server-only adapter, a per-tenant credit ledger, and a read-only capability entry. No writes to business data. No people enrichment.

**Stage 2, monitored ingestion, only if Stage 1 is stable.**

Add batch and monitor ingestion behind a queue, with per-tenant fairness and a hard credit ceiling.

### 14.3 Decision criteria for Stage 0

Proceed to Stage 1 only if all of these hold:

- JSON extraction meets the item-library field requirements on at least 14 of 20 pages without manual repair.
- Measured credits per supplier stay within the modelled 5 credits per page.
- Company or brand lookup produces a correct result for at least half of the sampled Nigerian suppliers, or the use case is dropped as unsupported.
- The confirmed allowance matches a plan that keeps monthly operating cost under a stated ceiling.

Stop if extraction accuracy is below 50%, or if the confirmed allowance is lower than the modelled workload at a price BOURXE is unwilling to pay.

### 14.4 Open questions for the account owner

1. Which email type will the organization use, and what allowance does the dashboard show?
2. Is `SPOOKY10K` still redeemable, and what is the resulting balance?
3. Is any tenant supplier data permitted to leave the application boundary for a web data API?
4. Should Context.dev usage be billed to tenants, absorbed as platform cost, or limited to a platform-only workflow?
5. Who owns the data protection review for people enrichment?

---

## References

All sources accessed 2026-11-19.

| Source | URL |
|---|---|
| Documentation index | https://docs.context.dev |
| Agent index (marketing) | https://www.context.dev/llms.txt |
| Agent index (documentation) | https://docs.context.dev/llms-full.txt |
| Pricing | https://www.context.dev/pricing |
| Plans and billing | https://docs.context.dev/account/billing |
| Credits and pricing reference | https://docs.context.dev/account/credits |
| Free credits and refills | https://docs.context.dev/guides/free-credits |
| Changelog | https://docs.context.dev/changelog |
| Scrape endpoint | https://docs.context.dev/api-reference/web-scraping/scrape |
| Map endpoint | https://docs.context.dev/api-reference/web-scraping/map |
| Crawl endpoint | https://docs.context.dev/api-reference/web-scraping/crawl |
| Search endpoint | https://docs.context.dev/api-reference/web-scraping/search |
| Answers endpoint | https://docs.context.dev/api-reference/web-extraction/answers |
| Batch submit | https://docs.context.dev/api-reference/batches/submit |
| Monitors create | https://docs.context.dev/api-reference/monitors/create |
| Brand retrieve | https://docs.context.dev/api-reference/brand-intelligence/brand |
| Brand search | https://docs.context.dev/api-reference/brand-intelligence/search |
| Styleguide | https://docs.context.dev/api-reference/brand-intelligence/styleguide |
| People search | https://docs.context.dev/api-reference/people/search |
| People enrich | https://docs.context.dev/api-reference/people/enrich |
| Parse file | https://docs.context.dev/api-reference/utility/parse |
| MCP setup | https://docs.context.dev/install-mcp |
| MCP product page | https://www.context.dev/mcp |
| OpenAPI specification | https://www.context.dev/openapi.json |
| TypeScript SDK | https://www.npmjs.com/package/context.dev |
| Python SDK | https://pypi.org/project/context.dev/ |
| Go SDK | https://pkg.go.dev/github.com/context-dot-dev/context-go-sdk/v2 |
| CLI | https://www.context.dev/cli |
| Startup program | https://www.context.dev/startups |
| Terms of service | https://www.context.dev/term |
| Privacy policy | https://www.context.dev/privacy |
| Data processing addendum | https://www.context.dev/dpa |
| Subprocessors | https://www.context.dev/dpa/subprocessors |
| Promo code announcement | https://www.reddit.com/r/toolsdeals/comments/1xixbc8/contextdev_get_10000_free_credits_with_code/ |

Repository evidence, inspected 2026-11-19:

| File | Purpose |
|---|---|
| `api/bolu-chat.ts` | Server-only chat runtime, configuration precedence, failover, auth |
| `src/lib/ai-assistant/provider-catalog.ts` | Client-safe provider catalogue |
| `src/lib/ai-assistant/provider-adapters.ts` | OpenAI-compatible and Anthropic protocol adapters |
| `src/lib/ai-assistant/bolu-capabilities.ts` | Closed read capability set |
| `src/lib/ai-assistant/bolu-operations.ts` | Typed operation contract and approval gates |
| `src/lib/ai-assistant/bolu-data.ts` | Assistant data access, including supplier reads |
| `src/lib/ai-assistant/bolu-usage-ledger.ts` | Usage and cost accounting |
| `supabase/migrations/20261114160000_bolu_provider_credentials.sql` | Legacy singleton credential vault, deny-all RLS |
| `supabase/migrations/20261114170000_bolu_provider_connections.sql` | Multi-connection encrypted vault, deny-all RLS |
| `src/modules/supplier/supplierService.ts` | Supplier records |
| `src/modules/party/partyLinkService.ts` | Party linking |
| `src/modules/item-library/` | Item catalogue module |

---

## Task report

**Objective.** Determine Context.dev capability, cost, architecture fit, and integration safety for BOURXE.

**Scope.** Documentation research, reputation-free public evidence, and repository inspection. Zero-code audit.

**Files changed.** `docs/reports/context-dev/context-dev-capability-and-integration-audit.md` (this file, added). No other file was created, modified, or deleted.

**Skills used.** NONE

**Documentation standard.** ASD-STE100 Simplified Technical English

**Changes made.** Added this audit report. No source, configuration, dependency, migration, or database change.

**Verification result.** Documentation-only change. No typecheck, load audit, lint, or test was required or run, consistent with the repository risk-based verification policy. No API call was made to Context.dev, so no vendor claim in this report is runtime-verified. Repository-derived claims were checked by direct file inspection and by repository search on 2026-11-19.

**Supabase push status.** Not applicable. No migration was created or pushed.

**Risks or limitations.**

- Vendor pricing pages disagree with each other. Section 6.3 records both readings.
- Nigerian supplier coverage is untested. Section 13 treats it as the primary commercial risk.
- MCP tool inventory was not re-verified.
- No zero-retention contractual term was confirmed.
- Repository findings reflect the working tree as inspected on 2026-11-19. HEAD advanced from `184ad258` to `102fd481` through concurrent work during the audit. The inspected files were read in their current form and were not altered by this task. Pre-existing modifications and untracked files were preserved, including `.perch/PERCH.md` and the stage 3c reports.

**Deferred work.** Stage 0 experiment, including `SPOOKY10K` redemption, allowance confirmation, supplier sample testing, extraction accuracy scoring, and Nigerian coverage scoring. See Section 14.2.
