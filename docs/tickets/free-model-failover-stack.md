# Free Model Failover Stack

This ticket was written by MiniMax M3.1 Flash on 2026-11-13 via OpenCode.

---

## Status: OPEN

Area: Developer Tooling
Priority: High
Type: Reliability / Cost Control

## Objective

Build a local failover stack that keeps an agent working on free model capacity. When one provider, account, or model runs out, the next candidate answers without the user seeing the failure.

The request was for a system that reloads automatically after one source is used up.

## Scope

In scope:

- The OpenRouter free model tier and its limits.
- The failover layers that already exist in Free Claude Code and in Our Free Model.
- The configuration that produces the required behaviour.

Out of scope:

- Any purchase of provider credits. This ticket only records what a purchase would buy.
- Any use of these tools for proprietary client code.

## Part 1 - OpenRouter Free Tier

Verified on 2026-11-13 against the OpenRouter limits documentation and the live model API.

### Limits

| Rule | Value |
|---|---|
| Free models per minute | 20 |
| Free models per day, less than 10 US dollars of lifetime credits | 50 |
| Free models per day, at least 10 US dollars of lifetime credits | 1000 |
| Extra accounts or API keys | No effect. OpenRouter governs capacity globally. |
| Account balance | Must not be negative. A negative balance returns a payment error, including for free models. |

The remaining daily quota is readable at `GET /api/v1/key`:

```
data.free_model_daily_requests.used
data.free_model_daily_requests.limit
data.free_model_daily_requests.remaining
```

This is the only reliable counter for the daily cap.

### Free models available on 2026-11-13

The live model API returned 475 models. 15 of them are free variants. Three more entries cost zero but carry no `:free` suffix: the `openrouter/free` router and two Google Lyria audio models.

| Model | Context |
|---|---|
| `openrouter/free` | Router that selects any free model |
| `liquid/lfm-2.5-2.6b:free` | 2.6B LFM2.5 |
| `liquid/lfm-3-1.7b:free` | 1.7B LFM3 |
| `google/gemma-4-31b-it:free` | Gemma 4 |
| `google/gemma-4-26b-a4b-it:free` | Gemma 4 mixture |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | Nemotron 3 Ultra mixture |
| `nvidia/nemotron-3.5-lightning:free` | Nemotron 3.5 |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | Nemotron 3 Nano Omni |
| `thinkingmachines/inkling-2-small:free` | 1M context |
| `particle-ai/particle-1:free` | 1M context |
| `cohere/north-mini-code:free` | Code model |
| `baidu/ernie-5.5-flash-preview:free` | Ernie 5.5 Flash |
| `apodex/apodex-1.1-mini:free` | Apodex mini |
| `dots-studio/dots-3-note-preview:free` | Dots 3 Note |
| `recursive/flint-v1.0:free` | Flint 1.0 |

The list changes. Read it at run time instead of storing it.

### Tool Calling On The Free Tier

All 15 free variants accept the `tools` and `tool_choice` parameters. The `openrouter/free` router accepts them too and filters the free models for the features that the request needs. A tool calling assistant therefore works on the whole OpenRouter free tier, not only on a part of it.

The NVIDIA free models and their limits:

| Model | Context | Maximum output | Tools | Structured output | Note |
|---|---|---|---|---|---|
| `nvidia/nemotron-3.5-lightning:free` | 1,048,576 | 65,536 | Yes | No | 30B mixture of experts, 3B active. Built for high throughput agentic work. |
| `nvidia/nemotron-3.5-super-vl:free` | 1,048,576 | 131,072 | Yes | Yes | Text, images, documents, GUI screenshots and video. |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | 262,144 | 65,536 | Yes | No | Text, image, video and audio. Built as a perception sub-agent. |
| `nvidia/nemotron-3-ultra-550b-a55b:free` | 1,048,576 | 65,536 | Yes | No | Frontier reasoning and orchestration. |

The Nemotron 3.5 Lightning entry is the best profile for a tool calling assistant on the free tier: 3B active parameters, 1M context, tool support and no cost.

### Cloudflare Workers AI

| Property | Value |
|---|---|
| Base URL | `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1` |
| Interface | OpenAI chat completions. The Responses API exists only for the GPT-OSS models. |
| Key | Cloudflare API token |
| Free allowance | 10,000 neurons per day, reset at 00:00 UTC |
| Rate limit | 300 text generation requests per minute on the free plan |
| Free plan limit | 20 requests per minute for the models that need a paid billing method |

The allowance is measured in neurons, which are GPU work, not requests. One conversation turn is 800 input tokens and 150 output tokens.

| Model | Neurons per turn | Turns a day |
|---|---|---|
| `@cf/ibm-granite/granite-4.0-h-micro` | 2.7 | 3,700 |
| `@cf/meta/llama-3.2-1b-instruct` | 4.7 | 2,100 |
| `@cf/qwen/qwen3-30b-a3b-fp8` | 8.3 | 1,200 |
| `@cf/google/gemma-4-26b-a4b-it` | 11.4 | 877 |
| `@cf/nvidia/nemotron-3-120b-a12b` | 57 | 175 |

The models that need a paid billing method, and that the free plan cannot serve: DeepSeek V4 Flash, DeepSeek V4.1 Flash, DeepSeek V4 Pro, GLM 5.2, GLM 5.3, GLM 5.3 Flash, Kimi K2.6, Kimi K2.7 Code and Inkling 2 Small.

The endpoint accepts `options.rejectIfBusy` in the request body. That makes a busy model fail at once instead of waiting in a capacity queue, which lets a client fail over fast.

Cloudflare runs on an edge network that is close to the user. For a user outside Asia this makes it the most reachable free provider, ahead of the AMD endpoint on the China site.

### Free Compute Platforms That Serve A Self Hosted Model

A server that runs the model gives an endpoint with no quota wall. Four platforms are free at some level.

| Platform | Free resource | Usefulness for a model server |
|---|---|---|
| Lightning AI | 24/7 CPU Studio, 30 credits at signup, about 50 GPU hours on interruptible machines, restart every 4 hours | The only one with enough GPU to hold a real model. A weekend project. |
| Hugging Face ZeroGPU | 5 GPU minutes per day, RTX Pro 6000 Blackwell | Too little for a service. Enough for a batch job. |
| Cloady | 0.5 vCPU, 1 GB memory, 5 GB disk, 10 GB traffic per month | Too small for a useful model. A workspace that goes over a limit is billed in full. |
| Google Cloud always free | One e2-micro VM, 30 GB disk, 1 GB outbound | Too small for a useful model. A billing account is needed. |

Verdict: the self hosted route is deferred. The provider chain covers the trial without it. See RISK-19 in the PRD.

### Providers That Are Not In The Chain

| Provider | Finding |
|---|---|
| DeepAI | The free tier of the website is a browser product, not an API. An API key requires a DeepAI Pro subscription at 9.99 US dollars a month. The three models that the promotion names, Claude Fable 5.1, GPT-6 Astra and Claude Opus 5.5, are in the Pro column of the price table, not the free column. The free daily allowance of 200 Theos applies to the DeepAI Code desktop application. There is no free API path. |
| OpenCode Zen | The free models work inside the OpenCode application. They are not reachable through the raw API. The OmniRoute gateway carries an OpenCode Zen lane, so the models are reachable through that lane and not directly. |
| Miaowu | A personal assistant system with a virtual machine of 2 vCPUs and 4 GB of memory, an outbound address in Hangzhou, and a points allowance for the daily login. It is a chat product with no published API for a third party application. |
| Vercel AI Gateway | The Ampersand free window ends on 2026-11-14. The general free allowance of the gateway is small. Read it at signup. |
| Ampersand v0.1 | Free only until 2026-11-14. A model that ends its free window is not a chain member. |

### NVIDIA NIM

| Property | Value |
|---|---|
| Base URL | `https://integrate.api.nvidia.com/v1` |
| Interface | OpenAI chat completions |
| Key | One account scoped key from build.nvidia.com. No card needed. |
| Rate limit | Up to 40 requests per minute for most models |
| Billing | No per token billing on the free tier |
| Models | `deepseek-ai/deepseek-v4.1-flash` with 1M context, `nvidia/nemotron-3.5-lightning-30b-a3b`, `nvidia/nemotron-3.5-super-vl-120b-a12b`, `nvidia/nemotron-3-ultra-550b-a55b`, `nvidia/nemotron-3-nano-30b-a3b`, `openai/gpt-oss-120b`, `google/gemma-4-31b-it`, GLM 5.3 Flash, Step 5 Preview, Mistral Large 4 |

A rate limit with no daily cap is worth more than a large daily allowance for a user who files a few invoices a day. This is the strongest direct provider in the chain.

One source describes the allowance as 1,000 trial credits, which is about 40 hours of inference inside a 90 day window. Another says the free tier is rate limited with no per token billing. The personal rate limit in the dashboard is the number that counts. Read it there.

### Evaluation Of Three Repositories

| Repository | License | What it does | Verdict for this product |
|---|---|---|---|
| `openlit/openlit` | Apache 2.0 | Tracing, evaluations, guardrails and cost control for AI applications | Fit for the local proxy on the developer machine, where it can trace every harness. Not fit for the mobile app in the trial, because the tracing collector is a server component. |
| `QWED-AI/qwed-verification` | Apache 2.0 | Deterministic verification of model outputs, tool calls, code and schemas before execution | A pattern source. The PRD already verifies every tool call against a schema and refuses a call that names a computed field. The general library is not needed. |
| `Egonex-AI/Understand-Anything` | MIT | Turns a codebase into an interactive knowledge graph. Works with Claude Code, Codex, Cursor, Copilot and OpenCode | Developer tooling for this repository. Not a product dependency. |
| `luobinger/PerkRadar` | MIT | A self hosted aggregator for freebies, limited time offers and discounts, stored in SQLite, refreshed every two hours | Not fit for the product. It is a personal deals scraper for the LINUX DO feed with a Jina Reader key. It might surface a free tier promotion. It changes nothing in the provider set. |

## Part 5 - OmniRoute, The Gateway That Holds The Whole Chain

Verified on 2026-11-13 from the source and the documentation.

| Property | Value |
|---|---|
| Repository | `cheaper-inference/OmniRoute`, the same project as `diegosouzapw/OmniRoute` |
| License | MIT |
| Package | `omniroute` on npm, version 3.8.53 |
| Stars | 86,979 |
| Endpoint | `http://{host}:20128/v1`, OpenAI compatible |
| Bind address | `0.0.0.0` by default, so a phone on the same network reaches it |
| Authentication | One bearer token |
| Deployment | npm, Docker, the Electron desktop app, a PWA, or Termux on Android with no root |
| Providers | 380, of which 150 or more carry a free tier |
| Free tier accounting | 34 documented pools, about 1.62 billion tokens a month, with the shared pools counted once |
| Routing | 20 strategies. The default sticks to the last provider that worked. |
| Readout | The `X-OmniRoute-Decision` header names the strategy, the provider and the latency. The `X-OmniRoute-*` headers carry the cost and the usage. |
| Model discovery | `GET /v1/models` and `POST /v1/models/query` |
| Terms handling | Providers that its terms catalogue marks as avoid are excluded from the automatic routing |

### What It Removes From The App

| Work in the app | Work in the gateway |
|---|---|
| One hundred and fifty provider signups | One signup |
| The failover table | Quota aware auto fallback |
| The allowance math | Live quota telemetry |
| The terms triage | A terms catalogue that excludes the risky providers |
| The provider readout | The decision header |

### The Failure That Was Measured On This Machine

OmniRoute is installed on the developer machine at version 3.8.51. A first attempt to send `hi` returned nothing. The cause was found in the log and the call record.

| Fact | Value |
|---|---|
| The gateway was not running | It is installed but it is not a service. |
| The model that was requested | `duckduckgo-web/gpt-5.4-mini`, a keyless web scrape of a consumer chat site |
| The response | Status 418, empty body, `DuckDuckGo AI Chat anti-abuse challenge failed` |
| The second attempt | An empty model name, so the gateway answered `Missing model` |
| The connections that were already set up | OpenRouter with free models only, an agent router key, an OpenCode account, and one inactive lane |

Two lessons.

1. A keyless web scrape lane can fail with no body. A failure with no body is invisible to a client. The app must show the status and the message, and must never render an empty answer.
2. The setup that was already in place was correct. The request was wrong.

### The Setup That Works

| Item | Value |
|---|---|
| Gateway | OmniRoute 3.8.51 |
| Base URL | `http://127.0.0.1:20128/v1` |
| Provider | The OpenRouter connection with free models only |
| Model | `openrouter/nvidia/nemotron-3.5-lightning:free` |

Measured on 2026-11-13 with the input `Invoice for ABC Ltd: 5 pcs cable lug 10mm at 9500` and one tool named `add_line_item`.

| Model | Time for one turn | Tool arguments |
|---|---|---|
| `nvidia/nemotron-3.5-lightning:free` | 1.8 s | `{"description":"cable lug 10mm","quantity":5,"unit_price":9500}` |
| `openrouter/free` | 2.5 s | `{"description": "Cable lug 10mm", "quantity": 5, "unit_price": 9500}` |
| `baidu/ernie-5.5-flash-preview:free` | 3.3 s | `{"description": "Cable lug 10mm (ABC Ltd)", "quantity": 5, "unit_price": 9500}` |

All three called the tool with the right quantity and the right price. The Baidu model put the client name inside the item description. The other two did not.

Two settings must be changed before the gateway is used by the app.

| Setting | Default | Action |
|---|---|---|
| `REQUIRE_API_KEY` | `false` | Set it to `true`. The proxy endpoint accepts requests without a key by default. |
| `API_HOST` | `0.0.0.0` | Set it to `127.0.0.1` while the gateway runs on the computer, or keep the key requirement and the firewall. |

### What It Confirms And Corrects In This Ticket

The free tier document of OmniRoute independently confirms three findings in this ticket and corrects one.

| Finding | OmniRoute |
|---|---|
| Cloudflare is 10,000 neurons a day | Confirmed. It corrects its own earlier 122 million token a month figure down to 30 million, which is the real 10,000 neurons a day. |
| Google no longer publishes the free tier numbers | Confirmed. It pools the Gemini Flash family and drops the published figure for it. |
| The OpenRouter deposit raises the free tier | Confirmed. It counts the deposit unlock separately so it never inflates the headline. |
| Cerebras carries a free tier | **Corrected.** Cerebras is a one time 5 US dollar signup credit that needs a payment method. It is not a recurring free tier. |

It also records a catalogue of providers that ended their free tiers, which is the argument for reading the live list and never storing it.

### Baidu ERNIE 5.5 Flash Preview

| Property | Value |
|---|---|
| Id | `baidu/ernie-5.5-flash-preview:free` |
| Context | 1,024,000 |
| Maximum output | 921,600 |
| Price | 0 for input and 0 for output |
| Accepted parameters | `tools`, `tool_choice`, `structured_outputs`, `response_format`, `reasoning`, `reasoning_effort`, `include_reasoning`, `temperature`, `top_p`, `max_tokens` |
| Created | 2026-11-10 |
| EU in-region routing | Not available |

The paid sibling `baidu/ernie-light-dt-1.0-intl` costs 1.13 US dollars per million input tokens and 3.94 per million output tokens. The free variant is a promotion of that family, not a different family.

Two cautions. The model is three days old and it is a preview, so a change in its tool behaviour is possible. RISK-09 covers it. Its quality at an invoice extraction task is not measured.

### OpenRouter native fallback

The OpenRouter compatible endpoint accepts a `models` array in priority order. OpenRouter tries each entry in turn when the previous one fails with a rate limit, a moderation refusal, downtime, or a context error. The response reports the model that answered.

The Anthropic Messages endpoint accepts a `fallbacks` array instead. It accepts at most three entries. It cannot be combined with the `models` array.

Pricing rule: the model that answers sets the price. A free model followed by a paid model in the chain means the paid model bills. A chain that must stay free must contain only free variants.

## Part 2 - OpenRouter Free Tier Limits On The Failover Idea

Rotating across the 15 free models of one OpenRouter account does not multiply the capacity.

- The 20 requests per minute limit is per account.
- The daily cap is per account.
- OpenRouter states that extra accounts and extra API keys do not raise the limits.

The capacity that a chain can multiply is the capacity of the *different providers* in the chain, because Groq, Cerebras, NVIDIA NIM, Gemini, Chutes, Hugging Face, and Cloudflare each apply their own free tier rules. A chain that spans providers multiplies daily capacity. A chain that stays inside one account does not.

The single highest value action is 10 US dollars of OpenRouter credits. That moves the free tier from 50 requests per day to 1000 requests per day.

### The AMD Token Factory Carries The Chain Instead

The AMD AI Developer Program gives a free key with no credit request. The AMD Radeon Cloud Token Factory serves these models on a shared free tier.

| Model | Context |
|---|---|
| DeepSeek-V4-Flash | 1,048,576 |
| DeepSeek-V4.1-Flash | 1,048,576 |
| GLM-5.3-Flash | 262,144 |
| Qwen3.8-Flash-Next | 262,144 |
| Qwen3.8-27B | 262,144 |
| Gemma-4-31B-IT | 262,144 |
| MiMo-V2.6-Flash | 1,048,576 |
| MiniCPM5-1B | 131,072 |

| Property | Value |
|---|---|
| Base URL | `https://developer.amd.com.cn/radeon/api/v1` |
| Interfaces | OpenAI chat completions and Anthropic Messages |
| Key prefix | `rc-` |
| Requests per minute | 30 per key, 20 per account gateway |
| Concurrency | 8 per key |
| Daily cap | About 10 US dollars of usage, reset at 00:00 Beijing time |
| Error | 429 with a `Retry-After` header, and the remaining allowance in every response header |
| Terms | Free trial and development service. Not for production. Reselling access is not allowed. |
| Site | The China site |

The daily cap is about 10 million to 111 million tokens a day depending on the model. That is two orders of magnitude above Gemini Flash-Lite and three above OpenRouter free.

Two limits on the use of this provider:

1. The terms do not allow production use. A trial inside the team is inside the terms. A release to tenants is not.
2. The endpoint is on the China site. Reachability and latency from Nigeria must be tested before the provider carries a product.

## Part 3 - The Two Existing Tools

Both tools already implement the required behaviour. Neither needs to be built.

### Free Claude Code

Verified on 2026-11-13 from the source.

| Property | Value |
|---|---|
| License | AGPL-3.0-only |
| Runtime | Python 3.14 with uv |
| Providers | 61 |
| Harnesses | 12 |

The failover setting is `MODEL_FALLBACKS`. It is an ordered list of entries. Each entry holds a provider prefixed model reference, a reasoning preference, and an API key number. The list is walked in order. A candidate equal to the primary model is removed from the list.

The failure policy maps HTTP 429, the text `rate limit`, and the text `too many requests` to a retryable rate limit failure. Admission control adds a per provider rate limit and a concurrency limit.

The OpenRouter provider uses the environment variable `OPENROUTER_API_KEY` and the base URL `https://openrouter.ai/api/v1`.

### Our Free Model

Verified on 2026-11-13 from the source.

| Property | Value |
|---|---|
| License | MIT |
| Version | 2.8.3 |
| Runtime | Node 22.19 or later |
| Providers | 76 |
| Standalone mode | `npm run start:standalone` |

The failover feature is a combo. A combo is a virtual catalog entry that holds an ordered list of real model ids. Five strategies exist.

| Strategy | Behaviour |
|---|---|
| `fallback` | Always start at the head of the list. |
| `round-robin` | Start at the next candidate each turn. Sticky for a set number of turns. |
| `smart` | Reserved. |
| `usage` | Reserved. |
| `pace` | Reserved. |

A candidate advances when the failure is retryable or carries a cooldown. The rules are in `src/route/classify.js`.

| Failure | Action |
|---|---|
| 429, or the text `rate limit`, `too many requests`, `quota exceeded` | Advance. Bench the account with exponential backoff from 2 seconds to 5 minutes. |
| 401, 402, 403, 404 | Advance. Bench the account for 2 minutes. |
| Unmatched 4xx, such as a plain 400 | Do not advance. The same body would fail everywhere. |
| 408, 425, 5xx | Advance. Bench for 30 seconds. |
| Context window overflow | Do not advance. The fix is a smaller request. |
| Region block, lane lock, missing authorisation | Do not advance. The gate clears on a login. |

A combo holds the output of a candidate until the candidate commits an answer. A partial answer from a failing candidate is not sent to the caller. When every candidate fails, the error lists each candidate and its reason.

The OpenRouter record in `src/providers/registry.json` uses these values.

| Field | Value |
|---|---|
| id | `open_router` |
| category | `free-tier` |
| auth | `apiKey` from `OPENROUTER_API_KEY` |
| baseUrl | `https://openrouter.ai/api/v1` |
| format | `openai-chat` |
| models | `openrouter/free` |
| modelsUrl | `https://openrouter.ai/api/v1/models` |

The registry note states 27 or more free models and about 200 requests per day. Both numbers are wrong on 2026-11-13. The live API returned 15 free variants. The daily limit comes from OpenRouter and is 50 or 1000. The note is inherited from a third party catalog and must not be trusted.

## Part 4 - The Stack

Three layers. Each one fails over inside itself.

```
Harness, for example OpenCode
  -> Layer 1: the local proxy
       -> Layer 2: the proxy chain
            -> Layer 3: the provider's own routing
```

| Layer | Owner | Behaviour |
|---|---|---|
| 1. Local proxy | Our Free Model standalone, or Free Claude Code | Serves the OpenAI compatible API on loopback. |
| 2. Proxy chain | A combo, or `MODEL_FALLBACKS` | Walks the next candidate when a candidate fails. |
| 3. Provider routing | The OpenRouter `models` array | OpenRouter walks the next provider for the same model. |

### Recommended order for the chain

1. `cloudflare_ai/@cf/ibm-granite/granite-4.0-h-micro` — the most reachable free provider. It has the largest turn count with the cheapest model.
2. `amd_radeon/DeepSeek-V4-Flash` — the largest daily allowance, and the frontier models. It is on the China site.
3. `open_router/openrouter/free` — the OpenRouter free router. It covers all 15 free variants. It accepts the tool list and it filters the free models for the features that the request needs.
4. `open_router/nvidia/nemotron-3.5-lightning:free` — 3B active parameters, 1M context and tool support at no cost.
5. `open_router/baidu/ernie-5.5-flash-preview:free` — 1M context and tool support at no cost. It is a preview model three days old.
6. `google_ai/gemini-3.5-flash-lite` — 500 requests per day.
7. Other providers that carry a free tier: Groq, Cerebras, NVIDIA NIM, Chutes, Hugging Face, Cloudflare.
8. A paid model, only if the operator accepts billing.

Rule: if the chain must stay free, it must contain only free entries. A paid entry at the end of a free chain makes the whole chain billable.

The AMD terms forbid production use. A chain that carries a shipped product must not include the AMD provider.

### Strategy

- `fallback` when the list is a quality ladder.
- `round-robin` when the list holds equivalent models and the goal is to spread load.

### Monitoring

Read `GET /api/v1/key` before a long task. The field `data.free_model_daily_requests.remaining` reports the daily free quota left. The per minute limit is not reported.

## Part 5 - Limits And Risks

### The free tier is for private and low value work

The project that provides the no key lane states in its own documentation that prompts sent through it may be logged by the upstream provider and used to improve the upstream service, and that the lane is not suitable for production or sensitive data.

The anonymous lane uses a pooled public credential. The keyed OpenRouter lane uses the operator's own key and is the lane to use.

### Proprietary code

Every prompt and diff sent through the stack reaches a third party. BIGDROPS client code must not use these providers. The local llama.cpp provider is the correct lane for that work.

### Terms of use

The failover must be used for resilience against outages and rate limits. It must not be used to multiply a quota that the provider intends to limit. OpenRouter states that capacity is governed globally and that extra accounts do not raise the limits. A chain that spans different providers is a legitimate use. A set of accounts created to work around one provider's daily cap is not.

### Upstream changes

The free model list changes. The provider registry in Our Free Model is a snapshot. Read the live model list instead of relying on the note in the registry.

## Acceptance Criteria

- The proxy answers on loopback only.
- The chain contains at least three candidates from at least two different providers.
- Every candidate in a free chain is a free variant.
- A 429 from one candidate advances to the next candidate without a visible error.
- A plain 400 does not advance the chain.
- A partial answer from a failing candidate is not sent to the harness.
- The daily free quota is readable before a long task.
- No proprietary client code is sent to any hosted provider.

## Verification Status

Verified on 2026-11-13:

- The OpenRouter limits, the pricing rule for fallback, and the quota field names, from the OpenRouter limits and model fallback documentation.
- The count of 15 free variants and their identifiers, from the live model API.
- That all 15 free variants accept the tool list and the tool choice parameter.
- That the `openrouter/free` router accepts the tool list.
- The OpenRouter record, the combo strategies, and the failover rules, from the Our Free Model source.
- The `MODEL_FALLBACKS` setting and the rate limit classification, from the Free Claude Code source.

Not verified:

- Any install or run of either tool.
- Any real rate limit, quota exhaustion, or chain advance.
- The free tier of any provider other than OpenRouter.

## References

- `docs/tickets/free-claude-code-evaluation.md`
- `docs/tickets/local-ai-model-swap-and-speedup.md`
- `https://openrouter.ai/docs/api-reference/limits`
- `https://openrouter.ai/docs/guides/routing/model-fallbacks`
- `https://github.com/Ebony-Vinyl/dsh-our-free-model`
- `https://github.com/Alishahryar1/free-claude-code`
