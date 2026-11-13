# Conversational Document Assistant - PRD

- **Status:** DRAFT FOR REVIEW
- **Owner:** Project Lead
- **Written:** 2026-11-13
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Scope:** One assistant. Document creation by conversation across every authorable document type, powered by free cloud AI. Trial period of one month.

---

## 1. Objective

An SME owner must be able to create an invoice by typing what they want, in their own words, without leaving the app and without paying an AI provider.

Today the fast path for a machine-generated invoice is the JSON import sheet. That path requires the user to copy a prompt out of the app, paste it into another AI app, copy the JSON back, paste it in, then review a preview. The user leaves the app twice and copies twice.

This feature replaces that path with a conversation inside the invoice form. The user types. The assistant writes into the live form. The assistant corrects what is wrong, proposes notes, terms and a title, asks for what is missing, and files the invoice only when the user tells it to.

## 2. Why The JSON Import Path Is The Wrong Shape

The import path asks a model to produce the app's own JSON contract. That contract carries structure the model should not own:

- `temp_ref`, `group_id`, `itemIds` and stable ids are bookkeeping.
- `notes` and `terms` use a rich-text block array.
- The prompt is long, because the contract is long.

A model that misses one identifier, or copies one block wrongly, produces a rejected import. The user sees an error instead of an invoice.

A conversation avoids this. The model does one narrow job: it understands intent and calls small tools. The app owns the structure, the validation and the money.

**Rule 1. The model never produces a document JSON blob. It produces tool calls.**
**Rule 2. The assistant never computes. The app computes.**

## 3. The User Experience

### 3.1 The Flow

1. The user opens a new invoice and taps the assistant.
2. A chat sheet opens above the form. The form stays visible.
3. The user types plain text, for example:
   - `invoice for ABC Ltd, 5 pcs cable lug 10mm at 9500, delivery 5000, 50 percent advance`
4. The assistant replies in text and updates the form at the same time.
5. The user corrects the assistant in plain text, for example:
   - `no, price is 95000 not 9500`
6. The assistant corrects the form and shows what changed.
7. The assistant proposes a title, notes and terms. The user accepts or rejects each.
8. The assistant asks for what is missing, for example the due date.
9. The user says `file it`.
10. The app shows the final invoice for confirmation and saves it through the normal save path.

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

### 4.1 Provider Chain

All providers use an OpenAI compatible endpoint. The app holds one client and many base URLs.

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

The user can reorder the chain and remove providers in Settings. A provider with no key is skipped.

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

The chain above answers the failover question. The catalog answers the setup question. The user must not hunt for a base URL or a model name.

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

The trial runs behind a Settings toggle. The toggle is off by default. The trial period writes no tenant data, no telemetry and no new database table.

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

- Photo, image or scan input.
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
