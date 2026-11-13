# Architecture

- **Status:** DRAFT FOR REVIEW
- **Product:** Conversational Document Assistant
- **Writing Standard:** ASD-STE100 Simplified Technical English

---

## 1. Shape Of The System

The app already holds three of the four parts this feature needs.

| Part | Exists today | Location |
|---|---|---|
| The invoice form and its setters | Yes | `src/pages/InvoiceFormPage.tsx` |
| The money rules | Yes | `src/domain/invoice/calculations.ts` through `computeDocument` |
| A chat surface pattern | Yes | `src/modules/item-library/components/ItemLibraryLocalAIJobPanel.tsx` |
| A provider client with failover | No | New |

The new part is small. The agent loop, the tool set, the provider client and the failover rules are about 400 lines. The bulk of the work is the user interface and the tests.

## 2. Module Layout

```
src/lib/ai-assistant/
  providerClient.ts      one OpenAI compatible client, many base URLs
  providerCatalog.ts     the chain, the base URLs, the model names
  failover.ts            classify a failure, advance the chain
  keys.ts                read and write provider keys in app private storage
  quota.ts               read the allowance from an error body
  tools.ts               the tool schemas, shared by all document types
  loop.ts                the agent loop: message in, tool calls out
src/components/ai-assistant/
  AssistantSheet.tsx     the chat sheet, generic over the tool list
  ChangeCard.tsx         one pending change, with accept and reject
  ProviderSettings.tsx   the keys, the chain order, the quota readout
src/domain/invoice/assistant/
  invoiceTools.ts        the invoice tool list and its validation
```

`src/lib/ai-assistant/` must not import from `src/domain/invoice/`. The invoice tool list is the only invoice specific part. This is FR-17.

## 3. The Agent Loop

The loop runs on the app side. The model never owns the form.

```
user text
  -> loop.ts builds the request
       system prompt: role, rules, the tool list, the current form state
       messages: the conversation so far
  -> providerClient posts to the active provider
  -> the provider streams
       text tokens        -> chat sheet
       tool call tokens   -> collected
  -> if the model asked for tools:
       validate each tool call against the tool schema
       reject a call that names a field the app does not own
       apply nothing yet
       produce a pending change card per call
       send the tool result back to the model
       the model continues
  -> if the model asked to file:
       prepare the filing, show the confirmation view, wait for the user
```

The loop stops when the model stops asking for tools. The user sees the reply and the cards.

### 3.1 The System Prompt

The system prompt carries four blocks.

1. **Role.** The assistant helps an SME owner write an invoice by conversation.
2. **Rules.** The rules from the PRD, plus the rules the domain already holds: never invent a value, never set a computed field, never save, ask when a value is missing.
3. **Tools.** The JSON schema of the tool list.
4. **Form state.** A compact snapshot of the current invoice: client, dates, the rows, the charges, and the computed totals.

The form state must be compact. It is sent on every turn. A full invoice with many rows is large. Send only the fields the tools can change, plus the computed totals as read only values.

### 3.2 Prompt Size

The import prompt is long because the JSON contract is long. The assistant prompt is short because the tool list is short.

| Part | Approximate tokens |
|---|---|
| Role and rules | 250 |
| Tool schemas | 400 |
| Form state | 150 for a 3 row invoice |
| Total for turn 1 | 800 |

A 10 turn conversation costs 8000 tokens if the whole form state is resent on every turn. The loop must send only the new turns after the first, plus the current form state. A provider that charges nothing still charges quota, and quota is the scarce resource here.

## 4. The Tool Set

The tool set is small and fixed. Every tool maps to a setter that already exists on the invoice form.

| Tool | Arguments | Maps to |
|---|---|---|
| `set_client` | `name`, optional `client_id` | `updateInvoice('client_name')` and `updateInvoice('client_id')` |
| `set_document_field` | `field`, `value` | `updateInvoice` for `issue_date`, `due_date`, `po_number` |
| `add_line_item` | `description`, `quantity`, `unit_price`, optional `unit`, optional `sub_description` | `addItem` then `updateItem` |
| `update_line_item` | `row_index`, `description`, `quantity`, `unit_price`, optional `unit`, optional `sub_description` | `updateItem` |
| `remove_line_item` | `row_index` | `removeItem` |
| `add_extra_charge` | `label`, `value` | `setExtraCharges` |
| `set_title` | `value` | `setInvoiceTitle` |
| `set_notes` | `blocks` | the notes setter |
| `set_terms` | `blocks` | the terms setter |
| `file_invoice` | none | prepares the confirmation view |

### 4.1 The Row Index Problem

`update_line_item` and `remove_line_item` need a row index. A model that counts rows is unreliable.

The fix is a name instead of an index. The tool takes a description fragment and the app resolves it against the rows. The app returns the resolved row index in the tool result, or a clear failure when the fragment matches more than one row. The model then knows which row it changed.

This is the same lesson as the Item Library work: the model must not carry identifiers that the app owns.

### 4.2 The Notes And Terms Contract

The invoice form stores notes and terms as rich text blocks. The model must not invent that structure.

The tool takes plain text. The app converts the text into a single paragraph block. The user can edit the result in the form. A proposal card shows the plain text.

The rich text block array stays a human feature. The assistant writes plain text into it.

## 5. Money

The app computes. The model reads.

`computeDocument` in `src/lib/Calculations.ts` is the source of truth and is not modified. The assistant reads the computed totals and shows them.

The tool list has no money fields other than `unit_price`, `quantity` and the extra charge `value`. These are inputs to the calculation. They are not results.

A tool call that names `amount`, `subtotal`, `total`, `vat_rate`, `discount_rate`, `wht_rate` or `install_rate` is rejected before it reaches the form. The rejection is a tool result, not a crash. The model then tries another route.

### 5.1 Contradiction Detection

The app compares the user text with the form before the model sees it. This is a string and number check, not a model call.

| Check | Example | Action |
|---|---|---|
| Stated total against the computed total | `total 475000` against lines that sum to 47500 | Ask which value is right. |
| Stated price against the price in the row | `price is 95000 not 9500` | The correction is explicit, so apply it. |
| Stated quantity against the quantity in the row | `make it 10 not 5` | The correction is explicit, so apply it. |
| Currency ambiguity | `9500` against a form in dollars | Ask once. The answer is remembered for the session. |

A contradiction where the user states a replacement value is a correction. A contradiction where the user states a total is a question.

## 6. The Provider Client

One client, one interface, many base URLs. The interface is OpenAI chat completions with tool calling.

### 6.1 Two Modes

The app holds a provider table. Every row is a base URL, a key and a model name. A row can point at a provider or at a gateway.

| Mode | The row points at | The app owns |
|---|---|---|
| Gateway mode, the default for the trial | A local gateway that is one OpenAI compatible endpoint | The base URL, the key, the model name, the tool loop and the change cards |
| Direct mode | One provider, for example Cloudflare or OpenRouter | The same, plus the failover and the quota readout |

In gateway mode the app makes one call. The gateway picks the provider, fails over when one is exhausted, tracks the quota and refuses the providers that its own terms catalog marks as avoid. The app does not know that a chain exists.

Gateway mode removes from the app build the work of 150 provider signups, the per provider allowance math, the failover table and the terms triage.

### 6.2 The Gateway Choice

OmniRoute is the gateway for the trial. It is MIT, it is an npm package, and it is an OpenAI compatible endpoint at `http://localhost:20128/v1` by default.

| Property | Value |
|---|---|
| Base URL | `http://{host}:20128/v1` |
| Key | One bearer token, `Authorization: Bearer` |
| Bind address | `0.0.0.0` by default, so a phone on the same network reaches it |
| Deployment on the phone | Termux, `pkg install nodejs && npx -y omniroute`, no root |
| Deployment on a computer | npm, Docker or the Electron desktop app |
| Free providers | 150 or more, across 34 documented free tier pools |
| Routing | 20 strategies. The default sticks to the last provider that worked. |
| Provider readout | The `X-OmniRoute-Decision` header names the strategy, the provider and the latency that served the request |
| Cost and quota readout | The `X-OmniRoute-*` headers carry the cost and the usage of every response |
| Model discovery | `GET /v1/models` and `POST /v1/models/query` |
| Terms handling | Providers that its terms catalog marks as avoid are excluded from the automatic routing |

Two deployments serve the trial.

1. The gateway runs on the developer computer. The phone reaches it at `http://{computer-lan-ip}:20128/v1`. The computer must be on and on the same network.
2. The gateway runs on the phone in Termux. The app reaches it at `http://127.0.0.1:20128/v1`. Nothing leaves the phone network except the provider calls. Android may stop the Termux process, and the app must show that state.

### 6.3 The Provider Rows

| Provider | Base URL | Key header |
|---|---|---|
| OmniRoute gateway | `http://{host}:20128/v1` | `Authorization: Bearer` |
| Cloudflare Workers AI | `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1` | `Authorization: Bearer` |
| AMD Radeon Cloud Token Factory | `https://developer.amd.com.cn/radeon/api/v1` | `Authorization: Bearer` |
| Google AI Studio | `https://generativelanguage.googleapis.com/v1beta/openai` | `Authorization: Bearer` |
| OpenRouter | `https://openrouter.ai/api/v1` | `Authorization: Bearer` |
| Groq | `https://api.groq.com/openai/v1` | `Authorization: Bearer` |
| Cerebras | `https://api.cerebras.ai/v1` | `Authorization: Bearer` |
| NVIDIA NIM | `https://integrate.api.nvidia.com/v1` | `Authorization: Bearer` |

Every provider is OpenAI compatible. One request builder and one stream parser cover all of them. A provider that does not support tool calling is removed from the chain.

The whole OpenRouter free tier accepts the tool list, so the OpenRouter lane keeps every free model as a candidate and the filter does not reduce it. The chain narrows on the provider, not on the model. The tool support of a Cloudflare model must be checked on its model page before it enters the chain.

The Cloudflare base URL carries the account id. The key is the Cloudflare API token. The account id is not a secret and can sit in the provider row next to the base URL.

The request carries the tool list on every turn. Some providers cache the tool list between turns. The client keeps the tool list stable so that the cache holds.

### 6.4 The Readout Headers

The app reads the response headers when they are present. When they are absent, because the row points at a provider and not at a gateway, the app shows the row name instead.

| Header | Use |
|---|---|
| `X-OmniRoute-Decision` | The provider that answered, the strategy and the latency. This answers FR-10. |
| `X-OmniRoute-*` cost and usage headers | The cost and the usage of the turn. This answers FR-11. |

The app must never fail because a header is missing. The headers are a bonus, not a contract.

### 6.5 Cloudflare Workers AI Notes

| Behaviour | Consequence for the app |
|---|---|
| The endpoint accepts `options.rejectIfBusy` in the request body. | The client sets it. A busy model fails at once and the chain advances, instead of the request waiting in a capacity queue. |
| The allowance is measured in neurons, not in requests. | The readout converts neurons into turns with the published rate of the active model. |
| The strongest models need a paid billing method. | The chain uses the free models on the free plan. RISK-18. |
| The daily reset is 00:00 UTC, which is 01:00 in Lagos time. | The readout shows the reset time in the user timezone. |
| The Responses API exists only for the GPT-OSS models. | The app uses the chat completions path. |

### 6.6 AMD Token Factory Notes

The AMD endpoint is first party and the largest allowance in the chain. Four behaviours change the client.

| Behaviour | Consequence for the app |
|---|---|
| The endpoint is on the China site. | The reachability and the latency from the user's network must be tested before the trial. RISK-15. |
| The daily cap resets at 00:00 Beijing time, which is 17:00 in Lagos time. | The allowance readout must show the reset time in the user's own timezone. |
| A 429 carries a `Retry-After` header. | The failover must honour the header before it advances, and must not hammer the endpoint. |
| Every response carries the remaining allowance in its headers. | The quota readout reads the headers. It does not need a second call. |

The endpoint also rebuilds the request body. Parameters outside its accepted set are dropped without an error, and a `thinking` parameter returns a 400. The client therefore sends only the parameters it needs: `model`, `messages`, `tools`, `tool_choice`, `stream`, `max_tokens` and `reasoning_effort`.

The endpoint also serves the Anthropic Messages interface at the same base, including a `count_tokens` path. Phase 1 does not use it. One parser for one interface is cheaper than two parsers for two interfaces. The Anthropic path is the fallback if the OpenAI path of a provider proves broken.

### 6.7 The Preconfigured Catalog

`src/lib/ai-assistant/providerRegistry.ts` holds the catalog. Each entry is a name, a base URL, a key prefix, a default model and a declared model list. The runtime chain in `providerCatalog.ts` reads the same rows that it already uses, so the catalog does not change the request parser.

The settings panel reads the catalog. It adds no network dependency to the first paint:

- The declared model list fills the dropdown.
- A **Fetch models** action merges `{baseUrl}/models` into the declared list.
- A failed fetch keeps the declared list, because some endpoints have no model route.
- A custom endpoint is stored as `custom:<slug>` with a base URL, a key, model ids, optional headers and an optional context window.
- The active provider and model live in component state for the session. A catalog file holds no key.

The model pill and the settings panel read the same active pair, so the top bar cannot disagree with the panel.

The interface has four shells on the same state: a phone frame with bottom sheets, a fold-open split, a tablet rail plus drawer, and a desktop window with an artifact column. The document panel reads computed values from the invoice state, not from model text.

## 7. Failover

The failover table applies to direct mode, where the app calls the providers itself. In gateway mode the gateway owns the failover and the app holds one row.

| Failure | Action |
|---|---|
| 429, quota error, rate limit text | Advance to the next provider. Read the allowance from the error body or the response headers. Honour a `Retry-After` header before the next attempt on the same provider. |
| 500, 502, 503, 504, 529 | Advance to the next provider. |
| 401, 403 | Advance. The key is wrong. Mark the key in Settings. |
| 404, model not found | Advance. The model name is wrong for this provider. |
| 400, other 4xx | Stop. The request is wrong. Retrying it on another provider fails the same way. |
| Timeout or network error | Advance to the next provider, at most once. |

In gateway mode the app still needs one rule of its own. A gateway that cannot be reached is a network error, not a provider error. The app shows that the gateway is down and keeps the draft. It does not walk a chain that does not exist.

A provider that answered is remembered for the session. The next turn goes to the same provider. The chain is walked again only when that provider fails.

## 8. Key Storage

The project has `@capacitor/filesystem` and no secure storage plugin. The keys go in the app private file directory.

| Property | Value |
|---|---|
| Location | `Directory.Private` |
| Path | `ai-assistant/keys.json` |
| File mode | Owner read and write only |
| Format | JSON, one entry per provider id, the key masked for display |
| Read at | Start of a chat session |
| Written at | The moment the user saves a key |

The keys never reach a log, an error message, an analytics event or a crash report. The masking helper is the only place that formats a key.

A browser build has no app private directory. In the browser, the feature is off and the Settings screen says so. The browser build is not in the trial scope.

## 9. Settings

The Settings screen gets one section, next to the Local AI section.

| Control | Behaviour |
|---|---|
| Enable the assistant | Off by default. Controls the UI and the network calls. |
| Provider rows | Add, remove and test one row. A row is a base URL, a key and a model. A gateway row is one row. |
| The gateway row | The trial uses one gateway row. The base URL is the computer address or `127.0.0.1` for Termux. |
| Model picker | The model names come from the row. In gateway mode they come from the gateway model list endpoint. |
| Allowance readout | The last known allowance per row. In gateway mode the readout comes from the response headers. |
| Privacy disclosure | The full text. Shown before the first use and reachable later. |

## 10. What This Design Deliberately Does Not Do

- It does not send a document JSON blob to a model. The model sends tool calls.
- It does not let a model write a computed field.
- It does not let a model save.
- It does not keep assistant history in the tenant database during the trial.
- It does not modify `src/lib/Calculations.ts`.
- It does not modify a PDF renderer.
- It does not use a paid provider.
- It does not need the on-device model work in `docs/tickets/local-ai-model-swap-and-speedup.md`.
