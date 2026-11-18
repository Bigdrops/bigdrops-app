# Bolu Assistant Phase B: Design Lab Component Reconciliation & Production Promotion Blueprint

This report was written by Antigravity on 2026-11-14 via Local Runner.

## Metadata & Control Block

- **Objective:** Reconcile and map existing Design Lab chat prototypes to live production architecture, integrating with the new `bolu_conversations` and `bolu_messages` Supabase persistence schema, the streaming SSE API (`/api/bolu-chat`), and the Two-Gate operation approval workflow.
- **Scope:** `src/components/design-lab/assistant-chat-*`, `src/components/design-lab/bolu-thinking-orb.tsx`, `supabase/migrations/20261114180000_bolu_conversation_persistence.sql`, `src/lib/ai-assistant/*`.
- **Files Changed:** `docs/reports/bolu-design-lab-reconciliation-2026-11-14.md` (report created).
- **Skills Used:** `modern-web-guidance`, `mobile-app-ui-design`, `typescript-advanced-types`.
- **Documentation Standard:** ASD-STE100 Simplified Technical English.
- **Hardware Policy:** Strict adherence. `bun run build` permanently excluded (host 4GB RAM policy). Zero React `.tsx` files modified during this planning step.

---

## 1. Executive Summary & Strategy

The legacy production chat interface (`src/components/ai-assistant/AssistantSheet.tsx`) is officially designated as **deprecated**. It is an unpersisted, single-column bottom sheet lacking drawer navigation, conversation threading, and responsive artifact split-screening.

Concurrently, the Design Lab contains an advanced, high-fidelity conversational workspace prototype (`assistant-chat-*`) featuring:
1. Dynamic clerk state transitions and `ThinkingOrb` animations (`listening`, `thinking`, `responding`, `success`).
2. Structured approval diff cards (`ChangeCardView`) with focus trapping.
3. Multi-viewport responsive shells (Mobile, Foldable, Tablet, Desktop 3-column layout).
4. Auto-resizing composer with context pills and quick-action tokens.
5. Conversation thread history rail (`AssistantRail`).
6. A living document preview panel (`InvoicePanel`).

This blueprint provides the exact component-by-component reconciliation plan to promote these visual components to production, decoupling them from mock scripts and wiring them to the new Supabase persistence layer and live streaming runtime.

---

## 2. Database Integration Model

The SQL migration generated in this phase (`supabase/migrations/20261114180000_bolu_conversation_persistence.sql`) provides the authoritative persistence foundation:

```
┌────────────────────────────────────────────────────────┐
│ public.bolu_conversations                              │
├────────────────────────────────────────────────────────┤
│ id: uuid (PK)                                          │
│ tenant_id: uuid (FK -> public.entities.id)             │
│ user_id: uuid (FK -> auth.users.id)                    │
│ title: text                                            │
│ module: text ('dashboard' | 'invoice' | 'quotation'..) │
│ origin_record_id: uuid (nullable target document ID)   │
│ status: text ('active' | 'archived' | 'deleted')       │
│ last_message_at: timestamptz                           │
│ metadata: jsonb                                        │
│ created_at, updated_at: timestamptz                    │
└────────────────────────────────────────────────────────┘
                           │ 1
                           │
                           │ N (ON DELETE CASCADE)
                           ▼
┌────────────────────────────────────────────────────────┐
│ public.bolu_messages                                   │
├────────────────────────────────────────────────────────┤
│ id: uuid (PK)                                          │
│ conversation_id: uuid (FK -> bolu_conversations.id)    │
│ tenant_id: uuid (FK -> public.entities.id)             │
│ sender_id: uuid (FK -> auth.users.id, null for AI)     │
│ role: text ('user' | 'assistant' | 'system')           │
│ content: text                                          │
│ status: text ('streaming' | 'completed' | 'failed')    │
│ proposal_payload: jsonb (Gate 1/Gate 2 envelope)       │
│ records_payload: jsonb (Retrieved business facts)      │
│ metadata: jsonb (model, tokens, latency, error codes)  │
│ created_at, updated_at: timestamptz                    │
└────────────────────────────────────────────────────────┘
```

### Key Schema Contracts for UI Consumption:
- **Tenant Isolation:** Enforced at the RLS level via `public.is_workspace_member(e.workspace_id, auth.uid())`. UI queries must filter by active `tenant_id` (`entity.id`).
- **Two-Gate Persistence:** `proposal_payload` in `bolu_messages` stores the exact `BoluProposal` JSON structure (type, payload, computed totals, status, expiration). Reloading a conversation restores pending proposals in their exact approval state (`pending_approval` or `approved_pending_save`).
- **Live Activity Tracking:** Database trigger `trg_bolu_messages_touch_conversation` automatically advances `bolu_conversations.last_message_at` on every message append or update.

---

## 3. Design Lab Component Audit & Reconciliation Matrix

| Component | Design Lab Prototype Location | Current Mock/Static State | Target Production Role | Required Reconciliation & Refactoring |
| :--- | :--- | :--- | :--- | :--- |
| **`AssistantThread`** | `assistant-chat-thread.tsx` | Uses hardcoded `TurnPlan`, mocked `ChangeCard[]`, static delays (`ms: 420`), in-memory array. | Primary conversation scroll view. | Replace hardcoded turns with streaming SSE token consumption, map `bolu_messages` rows to speech bubbles, and embed live Gate 1 diff cards. |
| **`BoluThinkingOrb`** | `bolu-thinking-orb.tsx` | Maps `ClerkState` (`listening`, `thinking`, `responding`) to `ThinkingOrb`. | Canonical live AI state indicator. | Map production `BoluRuntimeStatus` to `ClerkState`. Retain size 20 inline and size 64 identity hero. |
| **`ChangeCardView`** | `assistant-chat-parts.tsx` | Renders scripted fields (`line`, `delivery`, `unitPrice`). | Gate 1 & Gate 2 Decision Card. | Adapt to accept `BoluProposal` payload (`create-document` / `modify-document`). Render authoritative totals with `formatNaira()`. |
| **`AssistantComposer`** | `assistant-chat-composer.tsx` | Auto-expanding textarea with hardcoded pills (`INV-000131`, 'Sample', 'Fix price'). | Message input & intent trigger. | Dynamically bind context pill to active page/record. Populate action pills from `getBoluSuggestions()`. Add keyboard avoidance. |
| **`InvoicePanel`** | `assistant-chat-panel.tsx` | Read-only preview driven by mock `InvoiceState`. | Living Document Artifact Panel. | Bind to live document draft state from active route/context. Update live when Gate 1 proposals are approved. |
| **`AssistantRail`** | `assistant-chat-rail.tsx` | Static list (`SAMPLE_THREADS`) grouped by 'Today'/'Yesterday'. | Multi-conversation history drawer. | Query live `bolu_conversations` table. Add thread creation, switching, renaming, and archiving. |
| **`AssistantWorkspace`** | `assistant-chat-layouts.tsx` | Fixed-scale CSS stage switcher with zoom slider. | Responsive layout container. | Replace stage transforms with fluid CSS Container Queries and Flex/Grid rules across 4 responsive breakpoints. |

---

## 4. Deep-Dive Reconciliation Specifications

### 4.1 Live SSE Streaming Integration

#### Problem in Prototype:
`AssistantThread` simulates AI streaming using artificial timeouts (`ms: 520`) and pushes pre-authored strings from `assistant-chat-script.ts`.

#### Production Solution:
1. When user dispatches `submit(text)`:
   - Append user message to database (`bolu_messages`, `role: 'user'`).
   - Create placeholder assistant message (`status: 'streaming'`, `content: ''`).
   - Call `/api/bolu-chat` via `sendBoluProviderRequest`.
2. Connect `onDelta(delta)` callback to local React state:
   - Append delta to active message `content`.
   - Update `ClerkState` to `'responding'`.
   - The thread displays the live streaming caret (`<span className="ac-caret" aria-hidden="true" />`) while streaming.
3. Stream Completion:
   - Scan complete text using `parseStructuredOperationEnvelope()`.
   - If an operation is found, validate with `validateInvoiceCreateInput` / `validateInvoiceModifyInput` and compute authoritative totals via `calculateDocument()`.
   - Update `bolu_messages` in Supabase with finalized `content`, `status: 'completed'`, and `proposal_payload`.

```typescript
// Proposed production message mapping
export interface ProductionBoluMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  status: 'streaming' | 'completed' | 'failed' | 'stopped'
  proposal?: BoluProposal
  records?: BoluFactResult
  createdAt: string
}
```

---

### 4.2 Gate 1 & Gate 2 Diff Card Wiring (`ChangeCardView`)

#### Mapping `bolu_operation` to `ChangeCardView`:

```
┌────────────────────────────────────────────────────────┐
│ BoluProposal (bolu-operations.ts)                      │
├────────────────────────────────────────────────────────┤
│ opId: "bolu-op-1773528-1-x9a2b"                        │
│ operationType: "create-document"                       │
│ payload: {                                             │
│   client_name: "ABC Ltd",                              │
│   items: [{ description: "Cable lug", qty: 5, .. }]    │
│ }                                                      │
│ computedTotals: { total: 47500, vat: 3313.95, .. }     │
│ status: "pending_approval"                             │
└────────────────────────────────────────────────────────┘
                           │
                           ▼ mapped by UI adapter
┌────────────────────────────────────────────────────────┐
│ ChangeCardView (assistant-chat-parts.tsx)              │
├────────────────────────────────────────────────────────┤
│ Kind: "Line item" / "Invoice Creation"                 │
│ Status Flag: "Waiting for your decision" (Gate 1)      │
│ Title: "Invoice for ABC Ltd"                           │
│ Items Summary: "5 pcs × ₦9,500"                        │
│ Authoritative Total: "₦47,500 (incl. VAT)"             │
│ Actions:                                               │
│   [ Reject ] -> onDecide(false) -> GATE1_REJECT        │
│   [ Approve Changes ] -> onDecide(true) -> GATE1_APP.  │
└────────────────────────────────────────────────────────┘
```

#### Gate 2 Transition:
When Gate 1 is approved:
- Status changes to `approved_pending_save`.
- The card updates its status flag to: `Approved · Ready to Save`.
- Action buttons transition to:
  - **Primary CTA:** `Confirm & Save Document (Gate 2)` -> triggers `persistInvoiceCreation` via `bolu-document-service.ts`.
  - **Secondary CTA:** `Cancel Save` -> reverts to draft.
- On persistence success:
  - Card status displays: `✓ Filed as INV-000105`.
  - Buttons are dismissed.
  - Live document panel updates status pill from `Draft` to `Filed`.

---

### 4.3 Mobile Safe Areas, Keyboard Awareness & Ergonomics

Following the project's mobile design guidelines (`mobile-app-ui-design`):

1. **Thumb-Zone Optimization:**
   - On mobile viewports (`< 768px`), all critical action buttons (Send, Stop, Gate 1 Approve, Gate 2 Confirm) are anchored in the bottom 33% of the viewport.
2. **Safe-Area Insets (Capacitor / iOS Notch & Dynamic Island):**
   ```css
   .ac-stage[data-viewport='fold-closed'],
   .ac-composer {
     padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));
     padding-left: max(16px, env(safe-area-inset-left, 16px));
     padding-right: max(16px, env(safe-area-inset-right, 16px));
   }
   ```
3. **Virtual Keyboard Avoidance:**
   - On mobile devices, virtual keyboard appearance must not hide the composer or push conversation history off-screen.
   - Use `window.visualViewport` resize listeners to dynamically adjust `.ac-composer` bottom positioning or container height without layout jank.
4. **Touch Target Sizing:**
   - All interactive touch targets (`.ac-send`, `.ac-pill-btn`, `.ac-card-actions button`) maintain a minimum hit area of **44 × 44px**.

---

## 5. React Architecture & State Layer Blueprint

To prevent tightly coupling visual presentation to network/database operations, the production architecture establishes a three-tier design:

```
┌──────────────────────────────────────────────────────────────────┐
│ UI PRESENTATION TIER (Promoted Design Lab Components)           │
│ AssistantWorkspace · AssistantRail · AssistantThread · Composer  │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼ React Context & Hooks
┌──────────────────────────────────────────────────────────────────┐
│ APPLICATION STATE TIER                                           │
│ BoluAssistantProvider                                            │
│   ├── useBoluConversations()  (Supabase thread queries & CRUD)   │
│   └── useBoluThread()         (Active chat, SSE, Two-Gate state) │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼ Authoritative Business Logic
┌──────────────────────────────────────────────────────────────────┐
│ CORE LOGIC & PERSISTENCE TIER                                    │
│ Calculations.ts · bolu-document-service.ts · api/bolu-chat.ts    │
└──────────────────────────────────────────────────────────────────┘
```

### 5.1 Hook: `useBoluConversations`
Manages the conversation history rail:
```typescript
interface UseBoluConversationsReturn {
  conversations: BoluConversationSummary[]
  activeConversationId: string | null
  isLoading: boolean
  createConversation: (module?: string, recordId?: string) => Promise<string>
  selectConversation: (id: string) => void
  archiveConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
}
```

### 5.2 Hook: `useBoluThread`
Manages the active conversation stream, message list, and Two-Gate approvals:
```typescript
interface UseBoluThreadReturn {
  messages: ProductionBoluMessage[]
  clerkState: ClerkState
  isStreaming: boolean
  activeProposal: BoluProposal | null
  submitMessage: (text: string) => Promise<void>
  stopStreaming: () => void
  approveGate1: (opId: string) => Promise<void>
  rejectGate1: (opId: string) => Promise<void>
  confirmGate2Save: (opId: string) => Promise<void>
  cancelGate2Save: (opId: string) => void
}
```

---

## 6. Promotion Roadmap (Phase B Step-by-Step)

1. **Step 1 (Completed in this turn):**
   - Supabase SQL migration for `bolu_conversations` and `bolu_messages` created.
   - Architectural reconciliation audit and blueprint established.
2. **Step 2 (Hook & Context Implementation):**
   - Create `src/lib/ai-assistant/hooks/useBoluConversations.ts`.
   - Create `src/lib/ai-assistant/hooks/useBoluThread.ts`.
   - Wire Supabase database client to fetch/insert messages and handle real-time streaming updates.
3. **Step 3 (Visual Scaffolding Refactoring):**
   - Copy Design Lab components into `src/components/ai-assistant/chat/`.
   - Convert mocked `TurnPlan` and `ChangeCard` to live `ProductionBoluMessage` and `BoluProposal`.
   - Connect `BoluThinkingOrb` to `useBoluThread`'s `clerkState`.
4. **Step 4 (AppShell & Route Integration):**
   - Deprecate and remove `AssistantSheet.tsx`.
   - Wire `AppShell.tsx` and `DashboardAssistant.tsx` to summon the new responsive `AssistantWorkspace`.
   - Verify desktop 3-column, tablet drawer, and mobile sheet viewports.
5. **Step 5 (End-to-End Verification Gate):**
   - Run typecheck, linting, and critical test suite. Verify collision-safe invoice creation through Bolu.

---

## 7. Verification & Hardware Gate Results

```text
Verification:
- Supabase SQL migration generated: supabase/migrations/20261114180000_bolu_conversation_persistence.sql
- Reconciliation report generated: docs/reports/bolu-design-lab-reconciliation-2026-11-14.md
- React source code (.tsx / .ts) modified: 0 files (Strict Zero-Code Edit rule obeyed)
- bun run build: EXCLUDED (Host 4GB RAM policy)
- Git status: Verified. Only new migration and report files added.
```
