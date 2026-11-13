# Provider And Model Catalog

- **Status:** DRAFT FOR REVIEW
- **Product:** Conversational Document Assistant
- **Written:** 2026-11-13
- **Writing Standard:** ASD-STE100 Simplified Technical English

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
| AMD Token Factory | `amd` | `https://developer.amd.com.cn/radeon/api/v1` | Read at signup | `DeepSeek-V4-Flash` |

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
| AMD Token Factory | `DeepSeek-V4-Flash` |

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
