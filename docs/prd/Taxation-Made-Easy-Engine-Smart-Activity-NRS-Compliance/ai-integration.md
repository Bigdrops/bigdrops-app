# AI Integration — BIGDROPS

> Status: Specification
> Last updated: 2026-09-05
> PRD set: Taxation Made Easy Engine Smart Activity & NRS Compliance (this folder)
> Statutory authority: NRS-docs/ — canonical Nigeria Tax Act 2025
> UI/UX authority: docs/prd/Adaptive Mobile-First UIUX Facelift PRD (chapter 13 canonical; this file is the tax-context variant)
> Tenancy authority: docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md

---

**Scope within this PRD set:** This specification defines the app-wide AI
layer. It lives in the Taxation folder because every AI feature that
touches tax, VAT, WHT, deadlines, or compliance output must obey the hard
rules of this PRD set. UI and interaction conventions come from the
Adaptive Mobile-First UIUX Facelift PRD (see adaptive-uiux-alignment.md).
All AI access to tenant data respects the multi-tenancy permission
model and entity lifecycle (see multi-tenancy-alignment.md). The AI
layer is advisory and
additive — it never computes financial values and never supplies
statutory rules from model memory (section 10). If this document
conflicts with the Act text or the PRD guardrails, the Act text and
guardrails win.

---

## 0. Evaluation — Which Gateway?

Two open-source options were evaluated for the AI backend:

| | [free-llm-gateway](https://github.com/MrFadiAi/free-llm-gateway) | [LLM-Hub](https://github.com/timmyy123/LLM-Hub) |
|--|----------------------------------------------|---------------------------------------|
| **Type** | OpenAI-compatible API server | Native mobile app (Android/iOS) |
| **Protocol** | HTTP REST (`/v1/chat/completions`) | On-device inference via GenieX/RunAnywhere SDK |
| **Deploy** | Python server or Docker | App Store / Google Play download |
| **License** | MIT (commercial use allowed) | PolyForm Noncommercial (commercial use forbidden) |
| **Providers** | 24+ cloud providers, 260+ free models | Local device only — no cloud providers |
| **API for web apps** | ✅ Standard OpenAI-compatible endpoint | ❌ No API — standalone app only |
| **Streaming** | ✅ Full SSE streaming | ❌ N/A |
| **Fallback routing** | ✅ Auto-fallback across providers | ❌ N/A |
| **Rate limit handling** | ✅ Built-in per-key tracking | ❌ N/A |
| **Dashboard** | ✅ 18-tab web dashboard for monitoring | ❌ N/A |
| **Offline** | ❌ Requires network to reach providers | ✅ 100% on-device, no internet needed |
| **Image/video/music gen** | ❌ Text only | ✅ Stable Diffusion, video, music |

### Decision: `free-llm-gateway`

**Why:** BIGDROPS is a React/Capacitor web app. It needs an HTTP API to call from the browser. LLM-Hub is a standalone mobile app with no API surface — it cannot be called from a web frontend. Additionally, LLM-Hub's noncommercial license conflicts with BIGDROPS as a B2B product.

**Where LLM-Hub could fit (future):** If BIGDROPS ever needs fully offline AI on the device (e.g., field workers with no connectivity), LLM-Hub's on-device inference model could be studied as a reference — but it cannot be integrated directly due to the license restriction.

### Gateway Details

| Property | Value |
|----------|-------|
| **Backend** | [MrFadiAi/free-llm-gateway](https://github.com/MrFadiAi/free-llm-gateway) |
| **Protocol** | OpenAI-compatible (`/v1/chat/completions`) |
| **Port** | 8080 |
| **Language** | Python |
| **License** | MIT |
| **Docker** | `docker-compose up -d` |
| **Dashboard** | `http://localhost:8080/` |
| **Tests** | 130 tests (rate tracking, auth, streaming, analytics) |
| **Providers** | OpenRouter, Groq, Cerebras, Google Gemini, Mistral, NVIDIA, DeepSeek, Together AI, SambaNova, Cloudflare, HuggingFace, Cohere, SiliconFlow, Fireworks, Chutes, Anthropic, OpenAI, Perplexity, xAI, Novita, Z AI, ModelScope |
| **Models** | 260+ free models, auto-discovered |
| **Auth** | Master key + gateway API keys (`fgk-...`) |
| **Analytics** | SQLite request log, 5 analytics endpoints, time-range filtering |
| **Key features** | Automatic fallback, round-robin load balancing, sticky sessions, dynamic penalty routing, retry with backoff, tool/function calling translation, batch requests, encrypted key storage |

### Quick Start

```bash
# Clone
git clone https://github.com/MrFadiAi/free-llm-gateway.git
cd free-llm-gateway

# Install
pip install -r requirements.txt

# Configure
 cp .env.example .env
# Edit .env — add at least one provider key (e.g. GROQ_KEY)

# Start
python main.py

# Dashboard
open http://127.0.0.1:8080/
```

### Architecture

```
BIGDROPS App (React / Capacitor)
        │
        ▼
┌───────────────────────────┐
│  AI Service Layer          │  src/services/ai/
│  (TypeScript client)       │
│                            │
│  • chat()                  │
│  • summarize()             │
│  • generate()              │
│  • search()                │
│  • classify()              │
└───────────┬───────────────┘
            │  POST /v1/chat/completions
            ▼
┌───────────────────────────┐
│  free-llm-gateway          │  Self-hosted or cloud
│  (OpenAI-compatible API)   │  Port 8080
│                            │
│  • 24+ free providers      │
│  • Auto-fallback routing   │
│  • Rate limit tracking     │
│  • Streaming SSE           │
└───────────────────────────┘
```

## 1. Client Configuration

### Environment Variables

```env
VITE_AI_GATEWAY_URL=http://localhost:8080/v1
VITE_AI_GATEWAY_KEY=fgk-your-gateway-key
VITE_AI_DEFAULT_MODEL=llama-3.3-70b
VITE_AI_FAST_MODEL=llama-3.1-8b
```

### Client Setup

```typescript
// src/services/ai/client.ts

interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AIRequest {
  model?: string
  messages: AIMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

const GATEWAY_URL = import.meta.env.VITE_AI_GATEWAY_URL
const GATEWAY_KEY = import.meta.env.VITE_AI_GATEWAY_KEY
const DEFAULT_MODEL = import.meta.env.VITE_AI_DEFAULT_MODEL || 'llama-3.3-70b'
const FAST_MODEL = import.meta.env.VITE_AI_FAST_MODEL || 'llama-3.1-8b'

export async function aiChat(request: AIRequest): Promise<string> {
  const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_KEY}`,
    },
    body: JSON.stringify({
      model: request.model || DEFAULT_MODEL,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 1024,
    }),
  })

  if (!res.ok) throw new Error(`AI request failed: ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content
}

export async function* aiChatStream(request: AIRequest): AsyncGenerator<string> {
  const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_KEY}`,
    },
    body: JSON.stringify({ ...request, stream: true }),
  })

  if (!res.ok) throw new Error(`AI request failed: ${res.status}`)

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()!
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6)
      if (payload === '[DONE]') return
      try {
        const chunk = JSON.parse(payload)
        yield chunk.choices[0]?.delta?.content || ''
      } catch {}
    }
  }
}
```

---

## 2. Use Cases

### 2.1 Dashboard Assistant (Chat)

**Trigger:** AI button in top bar → bottom sheet with quick prompts + free text input.

**Quick Prompts:**
| Prompt | System Context |
|--------|---------------|
| "What's overdue?" | Inject invoice list + overdue status |
| "Draft a payment reminder for {client}" | Inject client name + overdue invoice details |
| "How did collections trend this month?" | Inject monthly collection data |
| "Summarize this week's activity" | Inject audit trail + recent documents |

**System Prompt:**
```
You are the BIGDROPS assistant for a Nigerian SME finance workspace.
You help with invoices, quotations, waybills, CSR, BOQ, RFQ, and letters.
Currency is Nigerian Naira (₦). Be concise, professional, and actionable.
Never fabricate document numbers or amounts. If data is not provided, say so.
```

**Implementation:**
```typescript
// src/services/ai/dashboardAssistant.ts

export async function askDashboardAssistant(
  prompt: string,
  context: DashboardContext
): Promise<string> {
  const systemMessage = buildSystemPrompt(context)
  return aiChat({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: prompt },
    ],
  })
}

interface DashboardContext {
  invoices: Array<{ number: string; client: string; amount: number; status: string; due: string }>
  quotations: Array<{ number: string; client: string; amount: number; status: string }>
  waybills: Array<{ number: string; client: string; status: string }>
  collections: { thisMonth: number; lastMonth: number; overdue: number; awaiting: number }
  recentActivity: Array<{ type: string; description: string; date: string }>
}

function buildSystemPrompt(ctx: DashboardContext): string {
  return `You are the BIGDROPS assistant for a Nigerian SME finance workspace.

CURRENT DATA:
- Collected this month: ₦${ctx.collections.thisMonth.toLocaleString()}
- Overdue: ₦${ctx.collections.overdue.toLocaleString()}
- Awaiting payment: ${ctx.collections.awaiting} invoices
- Invoices: ${ctx.invoices.map(i => `${i.number} (${i.client}, ₦${i.amount.toLocaleString()}, ${i.status})`).join(', ')}
- Quotations: ${ctx.quotations.map(q => `${q.number} (${q.client}, ${q.status})`).join(', ')}

RULES:
- Currency is Nigerian Naira (₦).
- Be concise and actionable.
- Never fabricate document numbers or amounts.
- If data is not provided, say so.
- Use bullet points for lists.`
}
```

---

### 2.2 Global Search (AI-Enhanced)

**Trigger:** Search button in top bar → search overlay with AI-enhanced results.

**How it works:**
1. User types a query (e.g., "Lagos Steel Works invoices over 100k")
2. App first searches local Supabase data (client, documents, items)
3. If results are sparse or query is complex, send to AI for interpretation
4. AI returns structured filter instructions or natural-language answer

**Implementation:**
```typescript
// src/services/ai/searchAssistant.ts

export async function aiSearch(
  query: string,
  localResults: SearchResult[]
): Promise<AI SearchResponse> {
  const context = localResults.length > 0
    ? `Found ${localResults.length} local results:\n${formatResults(localResults)}`
    : 'No local results found.'

  const response = await aiChat({
    model: FAST_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You are a search assistant for BIGDROPS. Interpret the user's search query and:
1. If local results exist, summarize them clearly.
2. If the query implies filters (date range, amount threshold, status), extract them.
3. Return a JSON object with: { "summary": string, "filters": object, "suggestions": string[] }

Available filters: status, dateRange, amountMin, amountMax, client, documentType.`
      },
      {
        role: 'user',
        content: `Query: "${query}"\n\n${context}`
      }
    ]
  })

  return JSON.parse(response)
}
```

---

### 2.3 Document Summaries

**Trigger:** "Summarize" button on any document view page, or auto-generated on document open.

**Supported Documents:**
| Document | Summary Type |
|----------|-------------|
| Invoice | Payment status, line items overview, total, due date |
| Quotation | Items, total, acceptance status, conversion readiness |
| CSR | Service report summary, materials used, engineer remarks |
| Waybill | Delivery status, items dispatched, destination |
| BOQ | Bill of quantities overview, total cost breakdown |
| RFQ | Request details, items requested, deadline |
| Letter | Content summary, recipient, key points |

**Implementation:**
```typescript
// src/services/ai/summarize.ts

export async function summarizeDocument(
  type: DocumentType,
  data: Record<string, unknown>
): Promise<string> {
  const template = SUMMARY_TEMPLATES[type]

  return aiChat({
    model: FAST_MODEL,
    temperature: 0.3,
    messages: [
      { role: 'system', content: template.system },
      { role: 'user', content: template.format(data) }
    ]
  })
}

const SUMMARY_TEMPLATES: Record<DocumentType, Template> = {
  invoice: {
    system: `Summarize this invoice in 2-3 sentences. Include: client name, total amount (₦), payment status, and due date. Be factual and concise.`,
    format: (d) => `Invoice ${d.number}\nClient: ${d.client_name}\nTotal: ₦${d.grand_total}\nStatus: ${d.status}\nDue: ${d.due_date}\nItems: ${d.items?.length || 0} line items`
  },
  quotation: {
    system: `Summarize this quotation. Include: client, total, item count, and whether it's been accepted.`,
    format: (d) => `Quotation ${d.number}\nClient: ${d.client_name}\nTotal: ₦${d.grand_total}\nStatus: ${d.status}\nItems: ${d.items?.length || 0}`
  },
  csr: {
    system: `Summarize this customer service report. Include: client, issue, resolution, and materials used.`,
    format: (d) => `CSR ${d.csr_number}\nClient: ${d.client_name}\nProblem: ${d.problem_reported}\nService: ${d.service_rendered}\nMaterials: ${d.materials_used}`
  },
  // ... waybill, boq, rfq, letter
}
```

---

### 2.4 Document Generation

**Trigger:** "AI Draft" button on new document forms, or "Generate from description" in create flows.

**Supported Generations:**
| From | To | What AI Does |
|------|----|-------------|
| Client name + project description | Invoice line items | Suggests items, quantities, unit prices |
| Project scope text | Quotation items | Breaks scope into priced line items |
| Problem description | CSR fields | Fills problem_reported, service_rendered, engineer_remarks |
| Delivery requirements | Waybill items | Lists items to dispatch with quantities |
| Project scope | BOQ rows | Creates bill of quantities with descriptions and units |
| Letter intent | Letter body | Drafts professional correspondence |

**Implementation:**
```typescript
// src/services/ai/generate.ts

export async function generateInvoiceItems(
  clientName: string,
  projectDescription: string,
  itemLibrary?: Item[]
): Promise<GeneratedLineItem[]> {
  const libraryContext = itemLibrary?.length
    ? `\nAvailable items from library:\n${itemLibrary.map(i => `- ${i.description} (₦${i.unit_price}, ${i.unit})`).join('\n')}`
    : ''

  const response = await aiChat({
    model: DEFAULT_MODEL,
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content: `You are a document drafting assistant for BIGDROPS, a Nigerian SME finance tool.
Generate invoice line items from a project description.
Return a JSON array of objects: { "description": string, "qty": number, "unit": string, "price": number }
Currency is Nigerian Naira (₦). Use realistic Nigerian market prices.
Generated items and prices are DRAFT PROPOSALS for user review. Never return totals, taxes, or VAT — the application recalculates all financial values through its authoritative calculation engine (Calculations.ts).
If an item library is provided, prefer matching items.${libraryContext}`
      },
      {
        role: 'user',
        content: `Client: ${clientName}\nProject: ${projectDescription}`
      }
    ]
  })

  return JSON.parse(response)
}

export async function generateLetterDraft(
  intent: string,
  recipient: string,
  context: string
): Promise<string> {
  return aiChat({
    model: DEFAULT_MODEL,
    temperature: 0.6,
    messages: [
      {
        role: 'system',
        content: `You are a professional correspondence writer for a Nigerian SME.
Draft a formal letter based on the user's intent.
Use professional but accessible language.
Format: greeting, body (2-3 paragraphs), closing.
Do not include letterhead or signature block — those are added by the app.`
      },
      {
        role: 'user',
        content: `Intent: ${intent}\nRecipient: ${recipient}\nContext: ${context}`
      }
    ]
  })
}
```

---

### 2.5 Smart Suggestions (Inline AI)

**Trigger:** Contextual suggestions that appear as the user fills forms.

**Examples:**
| Context | Suggestion |
|---------|-----------|
| User types client name → | "This client has 3 unpaid invoices totaling ₦340,000" |
| User selects items → | "Total with VAT: ₦425,000. Last similar invoice was ₦380,000" |
| User sets due date → | "This client typically pays within 14 days" |
| User opens CSR → | "Last CSR for this client was on Aug 3 — same issue?" |

**Implementation:**
```typescript
// src/services/ai/suggestions.ts

export async function getContextualSuggestion(
  context: FormContext
): Promise<string | null> {
  if (!context.hasEnoughData) return null

  return aiChat({
    model: FAST_MODEL,
    temperature: 0.3,
    max_tokens: 150,
    messages: [
      {
        role: 'system',
        content: `You are an inline assistant. Given the form context, provide ONE brief, actionable suggestion.
Be specific with numbers and dates. Max 1 sentence. If nothing useful to say, return empty string.`
      },
      {
        role: 'user',
        content: JSON.stringify(context)
      }
    ]
  })
}
```

---

### 2.6 Compliance & WHT Analysis

**Trigger:** Compliance Hub page, or "Analyze WHT" button.

**What AI does:**
- Summarizes WHT reconciliation status
- Flags invoices missing WHT documentation
- Suggests actions for non-compliant records
- Explains WHT rules in plain language — using only rule text injected from NRS-docs, never from model memory

```typescript
// src/services/ai/compliance.ts

export async function analyzeWhtStatus(
  invoices: Invoice[],
  payments: Payment[]
): Promise<string> {
  return aiChat({
    model: DEFAULT_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You are a compliance assistant for Nigerian WHT (Withholding Tax).
Analyze only the invoice and payment data provided. Flag any:
1. Invoices with WHT configured but no matching payment
2. Payments received without WHT deduction
Keep 'WHT received by the company' separate from 'WHT deducted by the company'.
Do not invent statutory rules, rates, or deadlines. Use only rule text injected
into this prompt; if a deadline is not provided, state it is not tracked yet.
This analysis is advisory, not a filing engine. Be concise. Use bullet points.`
      },
      {
        role: 'user',
        content: formatWhtData(invoices, payments)
      }
    ]
  })
}
```

---

### 2.7 Email & Notification Drafts

**Trigger:** "Draft email" button on document pages, or notification actions.

**What AI generates:**
| Trigger | Output |
|---------|--------|
| Invoice overdue → | Payment reminder email draft |
| Quotation accepted → | Thank you + next steps email |
| Waybill delivered → | Delivery confirmation email |
| New CSR → | Service report summary for client |
| Payment received → | Receipt acknowledgment |

```typescript
// src/services/ai/emails.ts

export async function draftEmail(
  type: EmailType,
  context: EmailContext
): Promise<{ subject: string; body: string }> {
  const response = await aiChat({
    model: DEFAULT_MODEL,
    temperature: 0.5,
    messages: [
      {
        role: 'system',
        content: `You are an email drafting assistant for BIGDROPS.
Generate a professional email. Return JSON: { "subject": string, "body": string }
Tone: professional but warm. Nigerian business English.
Include document numbers and amounts where relevant.
Do not include signature — the app adds it.`
      },
      {
        role: 'user',
        content: `Email type: ${type}\n${formatEmailContext(context)}`
      }
    ]
  })

  return JSON.parse(response)
}
```

---

### 2.8 PDF Content Enhancement

**Trigger:** Before PDF generation, AI can enrich content.

**What AI does:**
- Generate executive summaries for invoice cover pages
- Create item descriptions from shorthand notes
- Suggest terms & conditions based on document type
- Generate "amount in words" with proper formatting

> **Note:** AI must NOT calculate prices, taxes, totals, or VAT. Per AGENTS.md guardrails, PDFs are renderers only. AI enriches text content, not financial data.
>
> **Note:** "Amount in words" must be generated deterministically in code from the computed amount, never by the AI. LLM-generated number words are unreliable for financial documents.
>
> **Note:** AI-generated text must never assert filing deadlines, statutory rates, thresholds, or evidence requirements. Those values come only from NRS-docs/.

---

### 2.9 Analytics Narration

**Trigger:** Reports page → "AI Summary" button.

**What AI does:**
- Converts raw financial data into natural-language insights
- Identifies trends (collections up/down, overdue patterns)
- Compares periods (this month vs last, this quarter vs last)
- Flags anomalies (unusual invoice amounts, missing payments)

```typescript
// src/services/ai/analytics.ts

export async function narrateAnalytics(
  data: AnalyticsData
): Promise<string> {
  return aiChat({
    model: DEFAULT_MODEL,
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content: `You are a financial analyst for a Nigerian SME.
Narrate the analytics data in plain language. Include:
1. Key highlights (top numbers)
2. Trends (up/down, comparison to previous period)
3. Actionable recommendations (what to focus on)
Keep it under 200 words. Use ₦ for currency.`
      },
      {
        role: 'user',
        content: JSON.stringify(data)
      }
    ]
  })
}
```

---

## 3. Model Selection Strategy

| Use Case | Model | Why |
|----------|-------|-----|
| Dashboard chat | `llama-3.3-70b` | Best quality for open-ended conversation |
| Document summarization | `llama-3.1-8b` | Fast, cheap, sufficient for summaries |
| Search interpretation | `llama-3.1-8b` | Quick structured extraction |
| Document generation | `llama-3.3-70b` | Needs quality for drafting |
| Inline suggestions | `llama-3.1-8b` | Must be fast (<1s) |
| Email drafting | `llama-3.3-70b` | Professional quality matters |
| Analytics narration | `llama-3.3-70b` | Needs analytical reasoning |
| Compliance analysis | `llama-3.3-70b` | Needs domain accuracy |

---

## 4. Error Handling & Fallbacks

```typescript
// src/services/ai/errorHandler.ts

export class AIServiceError extends Error {
  constructor(
    public code: 'NETWORK' | 'RATE_LIMIT' | 'TIMEOUT' | 'INVALID_RESPONSE',
    message: string
  ) {
    super(message)
  }
}

export async function safeAICall<T>(
  fn: () => Promise<T>,
  fallback: T,
  label: string
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.warn(`[AI] ${label} failed, using fallback:`, err)

    if (err instanceof AIServiceError && err.code === 'RATE_LIMIT') {
      toast('AI is busy. Try again in a moment.')
    }

    return fallback
  }
}
```

**Graceful degradation:**
- If AI is down, all features still work — AI is additive, not required
- Dashboard shows cached data without AI narration
- Document forms work without AI suggestions
- Search falls back to local Supabase full-text search
- Emails can be written manually if AI draft fails

---

## 5. Cost & Rate Limits

Since free-llm-gateway uses free providers:

| Provider | Free Tier | Rate Limit |
|----------|-----------|------------|
| Groq | Unlimited | 30 RPM |
| Cerebras | Unlimited | 30 RPM |
| Google Gemini | 1500 RPM | 1500 RPM |
| OpenRouter | Varies | Per-model |
| NVIDIA | 1000 RPM | 1000 RPM |

**Gateway handles:** Provider rotation, automatic fallback on 429, per-key cooldown.

**Estimated usage per user per day:**
- Dashboard assistant: ~10 chats = ~10 requests
- Search: ~5 queries = ~5 requests
- Document summaries: ~5 views = ~5 requests
- Suggestions: ~20 triggers = ~20 requests
- **Total: ~40 requests/day** — well within free tiers.

---

## 6. Privacy & Security

| Rule | Implementation |
|------|---------------|
| No financial data sent to AI unless user triggers it | AI calls are opt-in, never automatic on page load |
| No statutory values from model memory | AI never supplies rates, thresholds, or deadlines unless the current feature injects them from NRS-docs/ with a citation |
| Advisory label | Compliance and tax analyses are labeled "advisory — review before acting"; they are not filing or payment actions |
| API key never in client bundle | Gateway key stored in env, proxied through Supabase Edge Function if needed |
| Sensitive data filtering | Strip bank details, tax IDs before sending to AI |
| User consent | First AI use shows "AI powered by open-source models" notice |
| Data retention | Gateway logs requests locally (SQLite) — no cloud storage |
| Offline fallback | All AI features degrade gracefully when offline |

---

## 7. File Structure

```
src/services/ai/
├── client.ts              # Core fetch wrapper + streaming
├── dashboardAssistant.ts  # Dashboard chat with context
├── searchAssistant.ts     # AI-enhanced search
├── summarize.ts           # Document summarization
├── generate.ts            # Document generation (items, letters, emails)
├── suggestions.ts         # Inline contextual suggestions
├── compliance.ts          # WHT/compliance analysis
├── emails.ts              # Email/notification drafts
├── analytics.ts           # Analytics narration
├── errorHandler.ts        # Error handling + fallbacks
├── prompts.ts             # System prompt templates
└── types.ts               # Shared AI types
```

---

## 8. Integration Points in the App

| App Location | AI Feature | File |
|-------------|-----------|------|
| Dashboard top bar | AI button → assistant sheet | `src/components/dashboard/DashboardOverview.tsx` |
| Dashboard KPI cards | Tap → AI narrates the metric | `src/components/dashboard/KpiGrid.tsx` |
| Document view pages | "Summarize" button | `src/components/document-view/shared/DocumentTopNav.tsx` |
| New invoice/quotation form | "AI Draft" suggests line items | `src/pages/NewInvoice.tsx`, `src/pages/NewQuotation.tsx` |
| CSR form | Auto-fill from problem description | `src/pages/NewCSR.tsx` |
| Letter editor | "Draft from intent" | `src/pages/NewLetter.tsx` |
| Global search | AI interprets complex queries | `src/components/layout/GlobalSearch.tsx` |
| Compliance Hub | WHT analysis | `src/pages/ComplianceHub.tsx` |
| Reports page | "AI Summary" narrates data | `src/pages/Reports.tsx` |
| Document actions menu | "Draft email" for any document | `src/components/document-view/shared/DocumentActionButtons.tsx` |
| Notification actions | "Remind" → AI drafts reminder | `src/components/notifications/NotificationBell.tsx`, `NotificationDrawer.tsx` |

---

## 9. Testing Checklist

- [ ] Gateway health check on app load (`/api/ping`)
- [ ] AI button shows loading state while gateway responds
- [ ] Streaming responses render word-by-word in the chat panel
- [ ] Rate limit shows "AI is busy" toast, not a crash
- [ ] Offline mode disables AI button with tooltip
- [ ] Document summary works for all 7 document types
- [ ] Invoice item generation returns valid JSON
- [ ] Email drafts have correct subject lines
- [ ] Search interpretation extracts filters correctly
- [ ] All AI calls are wrapped in `safeAICall` with fallbacks
- [ ] No bank details or tax IDs sent to AI
- [ ] System prompts don't leak internal data

---

## 10. Tax Correctness Guardrails

These rules bind every AI feature in this PRD set. They extend the hard
rules already established in `Files-tax-monthly-v1.md` and
`Technical-plan-v1.1.md`.

1. **AI is advisory only.** No AI output is an authoritative tax value,
   filing, or payment action.
2. **No AI-computed financial values.** Totals, VAT, WHT, tax payable,
   and rates are produced only by the authoritative calculation engine
   (`src/lib/Calculations.ts`, `computeDocument()`). The AI never
   recomputes them, and no presentation layer substitutes AI output for
   them.
3. **No invented statutory content.** Rates, thresholds, deadlines, and
   evidence requirements come only from `NRS-docs/`. When a feature
   needs a rule, it injects the rule text with its citation. Otherwise
   the AI must state the value is not available.
4. **Unresolved items stay unresolved.** The WHT remittance deadline and
   the WHT rate table are not yet sourced (the subsidiary regulation is
   not located; NTAA 2025 is absent from NRS-docs/). No prompt may
   instruct the AI to fill them from memory.
5. **WHT received and WHT deducted stay separate.** The two positions
   are legally distinct and must never be merged by AI analysis.
6. **Never fabricate.** No fabricated document numbers, amounts,
   payments, or missing evidence. Missing evidence is surfaced as an
   exception, never silently treated as valid.
7. **Traceable explanations.** Any AI explanation of a VAT or tax figure
   references the computed value and its contributing records. The AI
   never re-derives the figure.
8. **Drafts require review.** AI-generated items, prices, emails, and
   letters are proposals. They become documents only after user review
   and authoritative recalculation.
9. **Advisory labeling.** Compliance analyses state "advisory — review
   before acting". They are not a filing or payment mechanism.

---

## 11. Deployment Notes

1. **Self-hosted gateway:** Run `free-llm-gateway` on a VPS or Docker host
2. **Cloud option:** Deploy gateway on Railway/Render/Fly.io
3. **Capacitor:** Gateway URL must be accessible from mobile — use public URL or VPN
4. **API key rotation:** Use gateway keys (`fgk-...`) per workspace, not the master key
5. **Monitoring:** Gateway dashboard at `:8080` shows usage, errors, and provider health
