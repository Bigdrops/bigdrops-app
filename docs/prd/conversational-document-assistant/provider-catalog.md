# Provider And Model Catalog

- **Status:** Provider catalog proposal; capability and deployment decisions under review
- **Product:** Conversational Document Assistant
- **Written:** 2026-11-13
- **Writing Standard:** ASD-STE100 Simplified Technical English

The provider catalog below is a proposal, not an approved production provider policy. DEC-28 approves Bolu's business-operations direction, not the provider chain, user-key model, or one-paste setup. The implementation uses one server-held AMD secret, while this catalog describes user-held keys. Reconcile that conflict before provider requirements are accepted.

DEC-29 makes this catalog the declared floor of a dynamic pool, not a hand-ordered chain. The engine selects automatically from eligible rows. Free-tier status, pricing, quotas, availability and terms are dynamic conditions. Each row carries an eligibility state and a verification date, not a permanent claim. AMD Token Factory is not eligible for tenant-facing use under its current terms. Gemini 4 Hydrogen and NumeS remain ineligible until the AI Studio and operator verification recorded in the reconciliation reports is completed. Paid inference is not permitted by default.

The catalog gives the user one job: paste a key. The provider row already holds the base URL, the model list and the key rules. The user does not type a base URL and does not search for a model name.

The shape follows the Hermes agent provider entry. A provider is a name, a base URL, a key rule, a declared model list and an optional live model list. A custom endpoint is the same entry with a user supplied base URL.

The code source of truth is `src/lib/ai-assistant/providerRegistry.ts`.

---

## 1. Rules

| # | Rule |
|---|---|
| C1 | A tier 1 provider is preconfigured. The user pastes one key. |
| C2 | The default model is set before the user acts. |
| C3 | The model dropdown holds the declared models before any network call. |
| C4 | A `/v1/models` refresh adds live models. A failed refresh keeps the declared models. |
| C5 | A model list is deduplicated. The current model is always present. |
| C6 | A provider accepts one key field. The key is masked after entry. |
| C7 | The active provider and model show in the chat top bar at all times. |
| C8 | A custom endpoint uses the same chat client. No provider adapter is added. |
| C9 | The catalog does not change the provider chain order for failover. It supplies the rows. |
| C10 | The catalog holds no secret. Keys live in the key store, not in a catalog file. |

---

## 2. Tier 1 Providers

| Provider | ID | Base URL | Key prefix | Default model |
|---|---|---|---|---|
| OpenRouter | `openrouter` | `https://openrouter.ai/api/v1` | `sk-or-` | `openrouter/free` |
| Anthropic | `anthropic` | `https://api.anthropic.com/v1` | `sk-ant-` | `claude-sonnet-4-5` |
| OpenAI | `openai` | `https://api.openai.com/v1` | `sk-` | `gpt-5.2-mini` |
| Google Gemini | `gemini` | `https://generativelanguage.googleapis.com/v1beta/openai` | `AIza` | `gemini-3.5-flash-lite` |
| Groq | `groq` | `https://api.groq.com/openai/v1` | `gsk_` | `llama-4.1-70b-versatile` |
| DeepSeek | `deepseek` | `https://api.deepseek.com/v1` | `sk-` | `deepseek-v4-chat` |
| Mistral | `mistral` | `https://api.mistral.ai/v1` | Read at signup | `mistral-small-4` |
| Together AI | `together` | `https://api.together.xyz/v1` | `tgp_v1_` | `meta-llama/Llama-4.1-70B-Instruct-Turbo` |
| Fireworks AI | `fireworks` | `https://api.fireworks.ai/inference/v1` | Read at signup | `accounts/fireworks/models/llama-v4-70b-instruct` |
| Cerebras | `cerebras` | `https://api.cerebras.ai/v1` | `csk-` | `llama-4.1-70b` |
| xAI Grok | `xai` | `https://api.x.ai/v1` | `xai-` | `grok-4.1-fast` |
| Cohere | `cohere` | `https://api.cohere.ai/compatibility/v1` | Read at signup | `command-a` |
| NVIDIA NIM | `nvidia` | `https://integrate.api.nvidia.com/v1` | `nvapi-` | `nvidia/nemotron-3.5-lightning-30b-a3b` |
| AMD Token Factory | `amd` | `https://developer.amd.com.cn/radeon/api/v1` | `rc-` | `DeepSeek-V4-Flash` |
| Zro (MoonMath) | `zro` | `https://zro.moonmath.ai/v1` | `sk-` | `deepseek-v4.1-flash` |

Every base URL ends in `/v1` or the provider equivalent. Every row uses the OpenAI chat completions request. The app does not add a provider specific adapter.

### 2.1 Declared Model Lists

| Provider | Models |
|---|---|
| OpenRouter | `openrouter/free`, `anthropic/claude-sonnet-4.5`, `google/gemini-3.5-flash`, `deepseek/deepseek-v4`, `meta-llama/llama-4.1-70b` |
| Anthropic | `claude-sonnet-4-5`, `claude-haiku-4-5`, `claude-opus-4-1` |
| OpenAI | `gpt-5.2-mini`, `gpt-5.2`, `o4-mini` |
| Google Gemini | `gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.5-pro` |
| Groq | `llama-4.1-70b-versatile`, `gpt-oss-120b`, `qwen-3-32b` |
| DeepSeek | `deepseek-v4-chat`, `deepseek-v4-reasoner` |
| Mistral | `mistral-small-4`, `mistral-large-3`, `devstral-2` |
| Together AI | `meta-llama/Llama-4.1-70B-Instruct-Turbo`, `Qwen/Qwen3-32B-Turbo`, `deepseek-ai/DeepSeek-V4` |
| Fireworks AI | `accounts/fireworks/models/llama-v4-70b-instruct`, `accounts/fireworks/models/deepseek-v4`, `accounts/fireworks/models/qwen3-32b` |
| Cerebras | `llama-4.1-70b`, `gpt-oss-120b`, `qwen-3-32b` |
| xAI Grok | `grok-4.1-fast`, `grok-4.1`, `grok-3-mini` |
| Cohere | `command-a`, `command-r-plus`, `command-r7b` |
| NVIDIA NIM | `nvidia/nemotron-3.5-lightning-30b-a3b` |
| AMD Token Factory | `DeepSeek-V4-Flash`, `DeepSeek-V4.1-Flash`, `GLM-5.3-Flash`, `Qwen3.8-Flash-Next` |
| Zro (MoonMath) | `deepseek-v4.1-flash`, `glm-5.3` |

A model label is shown in the dropdown. The model id is sent in the request. The two values differ when the id carries a vendor path.

---

## 3. The One-Paste Flow

1. The user opens **Provider settings** from the top bar gear or the model pill.
2. The catalog shows every provider with one status badge: `Active`, `Configured`, or `Needs key`.
3. The user opens a provider card and pastes the key. The paste button reads the clipboard.
4. The key field checks the provider prefix. A wrong prefix shows a short message. The message never repeats the key.
5. The user selects **Test**. The app sends the smallest request the provider accepts. The result is `Connected`, `No key`, or a sanitized error.
6. The user selects **Use**. The provider becomes active.
7. The chat top bar shows the provider name and the model. The user sends the next message.

A paste with no other action must be enough. The first configured provider becomes active. The default model is already selected.

---

## 4. Model Discovery

| Step | Behaviour |
|---|---|
| Load | The dropdown shows the declared models at once. No network call blocks the sheet. |
| Fetch models | The app calls `{baseUrl}/models` with the active key. |
| Merge | Live ids append to the declared ids. Duplicate ids collapse. |
| Failure | The declared ids stay. The card shows the sanitized error. |
| Cap | A provider shows at most 200 models in the dropdown. |
| Current | The current model is always in the list, even above the cap. |
| Custom | A declared model id survives a failed discovery. |

The model pill groups by provider. The active provider expands first. A provider with no key opens settings instead of a model list.

---

## 5. Custom Provider ("Any AI")

The custom form accepts any OpenAI compatible endpoint.

| Field | Required | Rule |
|---|---|---|
| Display name | Yes | 1 to 32 characters. The slug becomes `custom:<slug>`. |
| Base URL | Yes | `https://` and a path that ends in `/v1`. |
| API key | Yes | Used in memory. Never written to a log or a message. |
| Model IDs | Yes | Comma or new line. The first id becomes the default. |
| Extra headers | No | A JSON object. Every value is a string. |
| Context window | No | A whole number of at least 1000 tokens. |

The save action validates every field. A field error shows below the field. A valid save does four things:

1. Adds the provider to the list with the `Custom` chip.
2. Selects the first model id.
3. Makes the provider active.
4. Closes the form.

The user can remove a custom provider. A removed provider loses its key with the row.

---

## 6. Status Badges

| Badge | Meaning | Colour token |
|---|---|---|
| `Active` | The provider holds a key and answers the next request. | Accent fill |
| `Configured` | The provider holds a key but is not active. | Sage |
| `Needs key` | The provider has no key. The model pill routes to settings. | Attention |

The badge reads state, not history. A failed test keeps the `Configured` badge and adds a test message.

---

## 7. Key Rules

- A browser build keeps keys in component memory for the session. It writes no `localStorage` entry.
- A native build writes keys to the app private directory, as FR-12 states.
- A key is shown as `••••` plus the last four characters.
- A key never appears in a test message, an error body, a log line or an analytics event.
- A failed prefix check names the prefix, not the key.
- Removing a key removes the provider from the chain.

---

## 8. Interface Across Viewports

The same assistant renders in four layouts. The layout is a property of the available width, not a second product.

| Viewport | Width | Layout | Cards and settings |
|---|---|---|---|
| Fold closed / phone | 360 to 390 | One column: top bar, stream, composer | Bottom sheet for context and settings |
| Fold open | 720 to 840 | Chat left, live invoice right | Active change card and provider stay visible |
| Tablet | About 1024 | Collapsible thread rail, chat, context drawer | Drawer holds the invoice and settings |
| Desktop | 1280 and above | Workspace rail, centered chat canvas, artifact column | Artifact column holds the invoice or settings |

### 8.1 Top Bar

Every layout shows the same top bar items:

1. The BOUXRE mark. A geometric B, not an image asset.
2. The assistant name and the current document.
3. The model pill: provider and model, one control.
4. The context control, when the layout has a drawer or sheet.
5. The provider settings control.

### 8.2 Stream And Composer

- The stream sticks to the bottom while the user is at the bottom.
- A floating **Latest** control appears when the user scrolls up.
- The composer is one rounded card. Action pills sit on the lower left. Send or Stop sits on the lower right.
- Enter sends. Shift and Enter adds a line. An input method editor composition does not send.
- The app shows Stop while a reply streams or a card waits for a decision.

### 8.3 Money And Cards

The layout does not change the money rule. The invoice panel reads `invoiceTotal`. A change card carries inputs only. The app applies an accepted card once. A rejected card changes nothing.

---

## 9. Design Lab Preview

The interactive preview is at `/design-lab/assistant-chat`. The preview mounts no network client and sends no request.

| File | Role |
|---|---|
| `src/lib/ai-assistant/providerRegistry.ts` | Catalog, custom provider validation, model parsing. |
| `assistant-chat-providers.ts` | Preview state, status badges, simulated test and discovery. |
| `assistant-chat-settings.tsx` | Provider drawer, key fields, custom form. |
| `assistant-chat-model-pill.tsx` | Top bar model selector. |
| `assistant-chat-layouts.tsx` | Four viewport shells and the scale stage. |
| `assistant-chat-panel.tsx` | Live invoice and pending cards. |
| `assistant-chat-rail.tsx` | Thread and workspace rail. |

The preview starts with two demo keys so the top bar and the badges are visible. The demo keys are not credentials. The settings copy says that a pasted key replaces them.

---

## 10. Free Model & API Opportunity Register

**Status:** Tracking register. Not an integration plan, not a production admission, and not evidence that any entry works for BOURXE.
**Written:** 2026-11-14. **Governing decision:** DEC-29 — one application-owned engine, multiple interchangeable providers and models, automatic selection and failover, free-first among *verified-eligible* models, paid inference denied by default, dynamic add/deprioritise/retire of models. This register changes nothing about that decision and admits nothing into production.
**Use:** review before architecture discussions. Delete stale entries. Never cite this register as a quota guarantee.

### 10.0 How To Read This Register

- **Model identity is not provider identity.** ModelScope, UnoRouter and Sarvam are access routes to DeepSeek V4.1 Flash, not three separate models. Counting them as three free models is an error.
- **Votes of confidence required.** Admission to the DEC-29 eligible pool requires the same checks for every entry: official documentation, terms-of-use review (especially training on submitted content), reachability from the user network, capability verification (tools, structured output, streaming, context window), and a BOURXE account with key custody decided (FR-12). None of these is complete today.
- **Free-tier status is dynamic.** Every free claim carries a discovery date. Expiry, quotas, models and plans change without notice. No figure in this register is permanent. Verify before every architecture discussion; purge or re-mark stale entries.
- **Unknown capabilities are unconfirmed capabilities.** Tool calling and structured output are recorded only when this audit verified them against official pages on 2026-11-14, or the model specification states them. Otherwise UNVERIFIED.
- **Verification grades:** `VERIFIED 2026-11-14` = official page fetched and confirmed by this audit. `PARTIALLY VERIFIED 2026-11-14` = official source exists and confirms the offer or model id, but entitlement, quotas, availability for BOURXE, or the promotion window is not confirmed. `UNVERIFIED` = not confirmed by this audit; treat as absent.
- **Specialist notes.** Perplexity Decider is a specialist reasoning/classification model; HeyGen is a speech service, not an LLM; Numes is a routing marketplace, not a model. None of the three substitutes for the general conversational pool.
- **Time-sensitivity is the default.** Any entry not re-verified within 30 days must be treated as unproven.

### 10.1 DeepSeek V4.1 Flash — ModelScope

| Field | Value |
|---|---|
| Candidate | DeepSeek V4.1 Flash |
| Underlying model | DeepSeek V4.1 Flash (open-weight, DeepSeek) — access route, not a distinct model |
| Access route | ModelScope (魔搭社区) model hub |
| Category | General inference |
| Advertised free offer | ~500 requests/day per model; ~2,000 requests/day account total (claimed) |
| Advertised quota/rate limits | Not independently confirmed |
| Context / modalities | Not confirmed by this audit |
| Tool calling / structured output | UNVERIFIED |
| Promotional expiry | None claimed; quotas dynamic |
| Verification status | UNVERIFIED (site reachable 2026-11-14; limits not confirmed) |
| Source | https://modelscope.cn |
| Last verified | 2026-11-14 (existence of site only) |
| Admission | NOT ADMITTED |
| Blockers | Official quota and ToS check; terms for submitted tenant content unknown; key custody undecided; reachability from Nigeria untested |

### 10.2 DeepSeek V4.1 Flash — UnoRouter

| Field | Value |
|---|---|
| Candidate | DeepSeek V4.1 Flash |
| Underlying model | `deepseek-v4.1-flash-1017:free` (free tier; list also carries `deepseek-v4.1-flash` with a free tier suffix `:free`) |
| Access route | UnoRouter gateway, base URL `https://api.unorouter.com/v1` (OpenAI-compatible) |
| Category | General inference |
| Advertised free offer | Free tier via `:free` suffix; about 1 request/minute per model per user on free tier; HTTP 429 with `Retry-After` at cap (site-stated) |
| Advertised quota/rate limits | ~1 req/min per model per user on free tier; upstream provider caps apply in addition |
| Context / modalities | Not confirmed by this audit |
| Tool calling / structured output | UNVERIFIED |
| Promotional expiry | None claimed; free tiers dynamic |
| Verification status | PARTIALLY VERIFIED 2026-11-14 (official site fetched; model id and free suffix listed; BOURXE entitlement and live behaviour unverified) |
| Source | https://unorouter.com (models list; platform docs) |
| Last verified | 2026-11-14 |
| Admission | NOT ADMITTED |
| Blockers | Terms and data-handling review (free lanes may route inputs upstream); consent decision; key custody; route is an aggregator — upstream operator serves the free lane; model id re-check at integration time |

### 10.3 DeepSeek V4.1 Flash — Sarvam AI

| Field | Value |
|---|---|
| Candidate | DeepSeek V4.1 Flash 1017 |
| Underlying model | `deepseekv4.1-flash-1017` (Token Factory, pay-as-you-go; `-interactive` variant exists) |
| Access route | Sarvam Token Factory API |
| Category | General inference |
| Advertised free offer | ₹100 free signup credits for verified users; credits never expire |
| Advertised quota/rate limits | LLM default limits: 50 req/min pay-as-you-go, 200 req/min Pro, 1,000 req/min Growth; per-account pool |
| Context / modalities | Not confirmed by this audit |
| Tool calling / structured output | UNVERIFIED |
| Promotional expiry | Credits do not expire; model availability dynamic |
| Verification status | VERIFIED 2026-11-14 (official pricing page fetched; model id, ₹ prices and rate limits confirmed) |
| Source | https://docs.sarvam.ai/api/getting-started/pricing ; https://docs.sarvam.ai/api/getting-started |
| Last verified | 2026-11-14 |
| Admission | NOT ADMITTED |
| Blockers | Signup credits, **not unlimited free inference** — DeepSeek V4.1 Flash is billed per token (₹14 input / ₹55 output per 1M); ToS and data-handling review; value vs existing lanes unproven |

### 10.4 Perplexity Decider v1.3 — OpenRouter

| Field | Value |
|---|---|
| Candidate | Perplexity Decider v1.3 |
| Underlying model | `perplexity/pplx-decider-v1.3:free` (specialist: choice, scoring, classification, extraction) |
| Access route | OpenRouter |
| Category | Specialist reasoning/classification — not general conversational inference |
| Advertised free offer | Free promotion through **2026-11-19** (claimed) |
| Advertised quota/rate limits | Not confirmed |
| Context / modalities | Claimed 262K context (not independently confirmed) |
| Tool calling / structured output | UNVERIFIED |
| Promotional expiry | 2026-11-19 (claimed) — expires before this register is a month old |
| Verification status | UNVERIFIED — **source 404s as of 2026-11-14**. Both `https://openrouter.ai/perplexity/pplx-decider-v1.3:free` and the bare id returned not-found to this audit; model id, expiry claim and partner claim cannot be confirmed |
| Source | https://openrouter.ai/perplexity/pplx-decider-v1.3:free |
| Last verified | 2026-11-14 (404) |
| Admission | NOT ADMITTED — delete this entry if re-checking on 2026-11-19 still fails |
| Blockers | Existence unconfirmed; specialist model, not for general chat; promotion expiry; would need a separate capability lane, not the default conversational select |

### 10.5 HeyGen Voice Turbo

| Field | Value |
|---|---|
| Candidate | HeyGen Voice Turbo Free |
| Underlying capability | Text-to-speech; model `heygen-voice-1-turbo-free` |
| Access route | HeyGen API (`https://api.heygen.com/v3/models/audio/tts`; streaming and WebSocket variants) |
| Category | Speech generation / TTS — separate service, not part of the LLM pool |
| Advertised free offer | Free until **2026-11-30**; free requests require no credit balance |
| Advertised quota/rate limits | 30 requests/minute per workspace member by default; all Turbo Free users share limited capacity (HTTP 429/500 possible below the request limit); `Retry-After` honoured |
| Context / modalities | Text input 1–10,000 chars; audio output |
| Tool calling / structured output | Not applicable (non-LLM) |
| Promotional expiry | 2026-11-30 |
| Verification status | VERIFIED 2026-11-14 (official doc fetched; model id, free window, limits, shared-capacity caveat and 429/500 handling confirmed on the official page) |
| Source | https://developers.heygen.com/docs/voices/heygen-voice-speech |
| Last verified | 2026-11-14 |
| Admission | NOT ADMITTED |
| Blockers | Out of scope for the LLM engine pool by design; separate evaluation required if BOURXE wants voice output; offer expires 2026-11-30 |

### 10.6 Cloudflare Workers AI — DeepSeek V4.1 Flash

| Field | Value |
|---|---|
| Candidate | DeepSeek V4.1 Flash via Cloudflare Workers AI |
| Underlying model | DeepSeek V4.1 Flash (Workers AI model naming, for example `@cf/deepseek-ai/…`) |
| Access route | Cloudflare Workers AI |
| Category | General inference |
| Advertised free offer | None for this model class — Workers AI free-plan restrictions exclude some models; record as **paid alternative, not a free candidate** |
| Advertised quota/rate limits | Not confirmed by this audit |
| Context / modalities | Not confirmed by this audit |
| Tool calling / structured output | UNVERIFIED (Workers AI chat API exists; per-model capability unverified) |
| Promotional expiry | Not applicable |
| Verification status | UNVERIFIED 2026-11-14 (official docs not re-fetched; classification from ticket evidence; current plan requirements must be checked before any use) |
| Source | https://developers.cloudflare.com/workers-ai/ |
| Last verified | 2026-11-14 (not independently re-verified) |
| Admission | NOT ADMITTED — paid alternative only |
| Blockers | Plan/pricing eligibility; terms; this entry is catalogued to prevent it being misread as free |

### 10.7 InclusionAI Ling 3.2 Flash — OpenRouter

| Field | Value |
|---|---|
| Candidate | InclusionAI Ling 3.2 Flash |
| Underlying model | `inclusionai/ling-3.2-flash:free` |
| Access route | OpenRouter (`https://openrouter.ai/api/v1`) |
| Category | General inference with hybrid reasoning; vision input |
| Advertised free offer | Free (`:free` suffix); free for approximately two weeks from discovery — **no exact expiry date is published on the official page; do not invent one** |
| Advertised quota/rate limits | Not confirmed |
| Context / modalities | Claimed 1M context, text/image input, up to 200 images per request, 30 MB request body — **not confirmed by this audit**; context and limits are not shown on the fetched model page |
| Tool calling / structured output | Page fetched 2026-11-14 lists `tools`, `tool_choice` and `response_format` as accepted for this model (advertised capability list) — PARTIAL evidence only; tool behaviour quality unverified |
| Promotional expiry | Unknown; "~two weeks from discovery" claimed, no date published |
| Verification status | PARTIALLY VERIFIED 2026-11-14 (official page fetched: model id exists and is served; free suffix present; tools/`response_format` advertised for the model; context, image limits, promotion length and tool behaviour unverified) |
| Source | https://openrouter.ai/inclusionai/ling-3.2-flash:free |
| Last verified | 2026-11-14 |
| Admission | NOT ADMITTED |
| Blockers | Short promotion with no published expiry; OpenRouter free-tier shared daily counter; vision for SME invoice data unproven; tool behaviour on free lane unverified; terms review |

### 10.8 Gemini 4 Hydrogen — Google AI Studio

| Field | Value |
|---|---|
| Candidate | Gemini 4 Hydrogen |
| Underlying model | `gemini-4-hydrogen` (successor to Gemini 3.8 Flash; adapted from Gemini 4 Carbon) |
| Access route | Google AI Studio / Gemini API (`generativelanguage.googleapis.com/v1beta/openai` for OpenAI-compatible calls) |
| Category | General inference; agentic tool-heavy work |
| Advertised free offer | Zero-price/free-tier candidate (claimed); rolling out across Google AI Studio |
| Advertised quota/rate limits | No stable published figures; Google requires reading the limit in AI Studio per account — no BOURXE thresholds may be stored |
| Context / modalities | 1M unified context window; text/image/audio/video input (per model card); up to 64K default synchronous output (up to 1M via background long decode) |
| Tool calling / structured output | Positioned for agentic tool loops; OpenAI-compat layer coverage remains **partial** — tools and structured output must be verified for this model before eligibility |
| Promotional expiry | Not applicable (model launch); pricing and free tier subject to change |
| Verification status | PARTIALLY VERIFIED 2026-11-14 (existence, id, context and AI Studio distribution verified via DeepMind model card, blog.google and Cursor list; free-tier naming for the BOURXE project, pricing and account quota are UNVERIFIED; free-tier content may be used to improve Google products — data-handling decision required) |
| Source | https://ai.google.dev/ ; https://deepmind.google/models/model-cards/gemini-4-hydrogen |
| Last verified | 2026-11-14 |
| Admission | NOT ADMITTED |
| Blockers | AI Studio account/project entitlement check; pricing and limits verification for this account; ToS review (free-tier training); consent/disclosure (FR-13); tool-behaviour verification; key custody (FR-12) |

### 10.9 Numes Model Catalogue ("NumeS" as listed by requester)

| Field | Value |
|---|---|
| Candidate | Numes (listed by requester as "NumeS") — open inference marketplace, not a single model |
| Underlying models | Advertised multi-model catalogue including GLM, Kimi, DeepSeek and Nemotron families; every listed model must be evaluated individually |
| Access route | Numes (`numes.ai`) — OpenAI-compatible marketplace routing each request across competing providers with live price/speed/reliability; Stripe and Bitcoin top-up; agent integrations |
| Category | Multi-model inference access service (routing marketplace) |
| Advertised free offer | Free and open-source models advertised; free quotas unverified |
| Advertised quota/rate limits | Not confirmed |
| Context / modalities | Varies per model; UNVERIFIED |
| Tool calling / structured output | Varies per model; UNVERIFIED |
| Promotional expiry | Unknown |
| Verification status | PARTIALLY VERIFIED 2026-11-14 (site fetched and operational; marketplace by Floating Point Systems, Inc.; the catalogue, every model id, every free quota and every term remains UNVERIFIED until checked individually) |
| Source | https://numes.ai/ |
| Last verified | 2026-11-14 (site-level only) |
| Admission | NOT ADMITTED |
| Blockers | Model-by-model verification (id, context, tools, structured output, ToS, data retention); architectural overlap — Numes is itself a routing layer and must not sit on top of the DEC-29 engine; evaluation only as a custom provider via the FR-21 path, never as an engine replacement; key custody; Nigeria reachability untested; legal review of marketplace ToS |

### 10.10 DeepSeek V4.1 Flash — Zro (MoonMath)

| Field | Value |
|---|---|
| Candidate | DeepSeek V4.1 Flash |
| Underlying model | `deepseek-v4.1-flash` (open-weight, DeepSeek) — access route, not a distinct model |
| Access route | Zro by MoonMath, base URL `https://zro.moonmath.ai/v1` (OpenAI-compatible). Bearer `sk-` keys. `GET /v1/models` discovery is documented |
| Category | General inference |
| Advertised free offer | A free plan with daily usage on DeepSeek V4.1 Flash. The allowance resets every day. No subscription. Usage packs from $5 |
| Advertised quota/rate limits | The daily free allowance is not published as a number. The paid rate is $0.30 input, $1.10 output and $0.01 cache read per 1M tokens |
| Context / modalities | 1M context, 64K max output, text and image input, 220 tokens/second output, 516 ms first token |
| Tool calling / structured output | Documented: tools, tool_choice, reasoning_effort, JSON mode and logprobs. The model catalogue page lists Tools, Reasoning, JSON mode and Logprobs |
| Promotional expiry | None claimed. The free plan is a standing offer, not a promotion |
| Verification status | VERIFIED 2026-11-16 (pricing page, model catalogue, API reference and privacy page fetched. Base URL, bearer scheme, discovery endpoint, model ids, per-token prices, free-plan terms, zero retention and no-training terms confirmed) |
| Source | https://zro.moonmath.ai/pricing ; https://zro.moonmath.ai/model-catalog ; https://zro.moonmath.ai/docs/api ; https://zro.moonmath.ai/docs/privacy |
| Last verified | 2026-11-16 |
| Admission | ADMITTED to the catalogue as a one-paste provider. NOT admitted to the DEC-29 automatic eligible pool |
| Blockers | FR-13 consent decision is still unresolved, and it applies to every external provider. Nigeria reachability is untested. The daily free allowance has no published size. GLM-5.3 needs a paid plan. The Data Processing Agreement applies to Teams and Enterprise only and needs a countersigned copy |

### 10.11 Classification Notes (binding reading)

- **DeepSeek V4.1 Flash × 3 routes (ModelScope, UnoRouter, Sarvam)** are one underlying model class with three access routes and three different offers (500/2,000 req/day claimed; ~1 req/min plus upstream caps; metered ₹100 signup credit). They are not three independent models and must not be counted as diversity.
- **Perplexity Decider v1.3** is a specialist decision/classification model whose claimed promotion expires 2026-11-19; its source is 404 today. Not a conversational replacement; not verified.
- **HeyGen Voice Turbo** is a speech service with a documented free window to 2026-11-30 and a shared-capacity caveat. It does not belong in the LLM pool.
- **Cloudflare Workers AI — DeepSeek V4.1 Flash** is a paid alternative under current plan requirements; it is not free under the free plan.
- **Ling 3.2 Flash** is a separate candidate; its promotion expiry date is unpublished (do not invent one).
- **Gemini 4 Hydrogen** is the most structurally compatible candidate but stays unadmitted pending account, pricing, ToS and availability verification.
- **Numes** is a marketplace; each listed model is a separate candidate and the marketplace itself is not a provider for BOURXE's engine.
- **Zro is a fourth access route to DeepSeek V4.1 Flash**, not a fifth free model. It must not be counted as model diversity on its own. It is the first registered route whose data-handling terms are verified safe for tenant content: the privacy page states zero request retention and no training on customer requests.
- **Zro adds one distinct model family** under the same key: GLM-5.3. That is the only new model class this register adds.
- **Zro publishes no balance endpoint.** The balance inquiry stays unsupported, so the connection reports an unknown balance rather than a false zero.
- **PLaMo retention depends on the plan, not on the provider.** On the Standard and Provider plans, input and output are not retained and are not used for training. On the Free plan they are stored and used for training, and personal information must not be entered. The plan must be checked before any tenant content is sent, because the provider id and base URL do not reveal it.
- **PLaMo offers `json_schema` structured output only.** `json_object` mode is not offered, so the routing catalogue must not claim `json-mode` for it.

### 10.12 PLaMo — Preferred Networks

| Field | Value |
|---|---|
| Candidate | PLaMo Prime (`plamo-3.1-prime`, `plamo-3.0-prime`) and `plamo-3.0-fin-beta` |
| Underlying model | PLaMo, an open-weight model family developed by Preferred Networks (PFN) |
| Access route | PLaMo API, base URL `https://api.platform.preferredai.jp/v1` (OpenAI-compatible). Bearer keys. `GET /v1/models` discovery is documented |
| Category | General inference, strong in Japanese and Japanese-to-English translation |
| Advertised free offer | No token charge on any plan for `plamo-3.0-fin-beta`. That model is limited to 50 requests per user per 24 hours, shared with PLaMo Chat |
| Advertised quota/rate limits | 100 requests per minute per API key for the `plamo-3.0-prime` family. Tenant spend ceiling is 1 million yen per month. Ten API keys per tenant |
| Context / modalities | 262,144 tokens for the Prime models, 20,480 maximum output. `plamo-3.0-fin-beta` has 256,000 tokens |
| Tool calling / structured output | Tools and tool_choice are documented. `response_format` supports `json_schema` only, so `json_object` mode is not offered |
| Promotional expiry | None claimed. `plamo-3.0-prime` is discontinued on 2027-01-31, after which requests switch to `plamo-3.1-prime` |
| Verification status | VERIFIED 2026-11-16 (pricing, API reference, console manual, limitations and data-handling pages fetched. Base URL, bearer scheme, discovery endpoint, model ids, quotas, retirement date and the plan-dependent retention terms confirmed) |
| Source | https://docs.plamo.preferredai.jp/en/api ; https://docs.plamo.preferredai.jp/en/pricing ; https://docs.plamo.preferredai.jp/en/limit ; https://docs.plamo.preferredai.jp/en/console |
| Last verified | 2026-11-16 |
| Admission | ADMITTED to the catalogue as a one-paste provider. NOT admitted to the DEC-29 automatic eligible pool |
| Blockers | The Free plan stores input and output and uses them for training, and forbids personal information. Tenant content therefore requires the Standard or Provider plan, where input and output are not retained and are not used for training. FR-13 consent is still unresolved. Nigeria reachability is untested. The Data Processing Agreement is a plan question and was not checked |

### 10.13 Standing Rules For This Register

1. No entry is admitted to the DEC-29 eligible pool without: official source fetched within 30 days, ToS and data-handling review, key custody decided, consent decision, and eligibility verification (capability states set from evidence, never from marketing).
2. Expiry dates claimed by operators are recorded as claims (with the claim date), never as commitments.
3. "Free" entries whose upstream operator permits training on inputs are ineligible for tenant content until FR-13 consent names the provider explicitly.
4. AMD Token Factory remains ineligible for tenant-facing use under its trial/development terms.
5. Deleting an entry is free; resurrecting one requires re-verification.
6. This register is documentation only. No code, migration or dependency references it.
