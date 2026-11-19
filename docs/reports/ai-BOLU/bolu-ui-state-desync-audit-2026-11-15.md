# Diagnostic Audit: Bolu UI State Desynchronization & Template Remediation

**Date:** 2026-11-15  
**Auditor:** BOUXRE AI Agent / System Architect  
**Scope:** `src/components/ai-assistant/chat/`, `src/lib/ai-assistant/hooks/`, `src/pages/settings/bolu-provider/`, `api/bolu-chat.ts`, `api/bolu-provider-config.ts`  
**Target Deliverable:** Root-cause mapping of message drop, provider state desync, and mobile viewport clipping  
**Standard:** ASD-STE100 (Simplified Technical English) & BOUXRE Architecture Standards  

---

## 1. Executive Summary

During Step 3 of the Bolu conversational frontend integration, UI components from the Design Lab prototype (`assistant-chat-*`) were promoted to production under `src/components/ai-assistant/chat/`. Testing on mobile devices (documented in artifacts `media_1794699327085_d9d16994.jpg` through `media_1794699327104_2b52e957.jpg`) revealed severe defects:

1. **Total Message Submission Failure:** User messages and quick-operation chip selections fail to submit. Messages vanish from the composer without reaching Supabase or the `/api/bolu-chat` SSE runtime.
2. **Provider Configuration Desynchronization:** The Model Pill and Provider Settings dialog operate on isolated, in-memory mock fixtures (`assistant-chat-providers.ts`), disconnected from the production backend pool (`app_ai_provider_connections` / `boluProviderApi`). This creates conflicting states where the header pill displays `OpenRouter`, the dropdown marks `AMD Token Factory` as active, and the settings modal marks `OpenRouter` as active.
3. **Mobile Viewport & CSS Stacking Collisions:** The chat interface renders using fixed desktop-centric heights (`max-h-[96vh]`), causing the bottom composer and footer hints to collide with mobile navigation bars and dynamic browser chrome. Horizontal chip rows display unstyled, heavy OS scrollbars.
4. **Lingering Prototype Code:** Mock timers (`sleep(400)`), mock API keys (`rc-token-configured`), mock test harnesses, and hardcoded document numbers (`INV-000101`) remain active in production components.

This audit establishes the line-by-line cause for each failure and defines an execution-safe blueprint for Phase B remediation.

---

## 2. Message Submission Call Stack & Failure Mechanics

### 2.1 The Submission Call Chain

The execution sequence from user input to failure proceeds through three layers:

```
[1] User enters prompt or clicks suggestion chip
       │
       ▼
[2] AssistantComposer (assistant-chat-composer.tsx:39-44)
    handleSubmit() ──> onSend(clean)
       │
       ▼
[3] BoluChatWorkspace (BoluChatWorkspace.tsx:148-154)
    handleSend(text) ──> setInputDraft('') ──> submitMessage(text)
       │
       ▼
[4] useBoluThread (useBoluThread.ts:142-146)
    submitMessage(text)
       │
       ▼
[CRITICAL ABORT: Line 145]
    if (!clean || !conversationId || !resolvedTenantId || isStreaming) return
    ──> conversationId is NULL ──> SILENT EXIT (No insert, no API call, no error)
```

### 2.2 Root Cause Analysis of Silent Drop

#### Cause A: Null Guard with Zero UI Feedback (`useBoluThread.ts`, Line 145)
In [useBoluThread.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/hooks/useBoluThread.ts#L145):
```typescript
const submitMessage = useCallback(
  async (text: string) => {
    const clean = text.trim()
    if (!clean || !conversationId || !resolvedTenantId || isStreaming) return
```
If `conversationId` is `null` or `resolvedTenantId` is `null`, `submitMessage` executes a silent `return`. It throws no error, sets no warning state, and leaves the caller unaware of failure.

#### Cause B: Premature Composer Input Clearing (`BoluChatWorkspace.tsx`, Lines 148–154)
In [BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L148-L154):
```typescript
const handleSend = (text: string) => {
  if (!text.trim()) return
  setInputDraft('')
  void submitMessage(text)
}
```
`setInputDraft('')` executes synchronously *before* `submitMessage` validates prerequisites. When `submitMessage` aborts at line 145, the user draft is erased from the textarea. To the user, the text disappeared into a void.

#### Cause C: `activeConversationId` Initializes to Null (`useBoluConversations.ts`, Lines 145–153)
In [useBoluConversations.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/hooks/useBoluConversations.ts#L145-L153):
```typescript
setActiveConversationId((prev) => {
  if (prev && mapped.some((c) => c.id === prev)) {
    return prev
  }
  if (autoSelectLatest && mapped.length > 0) {
    return mapped[0].id
  }
  return null
})
```
When a tenant has zero previous conversation records in `bolu_conversations`, `mapped.length` is `0`. Consequently, `activeConversationId` initializes to `null` and remains `null`.

#### Cause D: Missing Lazy Conversation Creation
Neither `useBoluThread` nor `BoluChatWorkspace` contains lazy initialization logic. If a user sends a message when `activeConversationId === null`, the system does not call `createConversation()`. The system assumes a thread already exists before the first message can be typed.

#### Cause E: Phone Viewport (`fold-closed`) Completely Omits the Thread Rail
In [BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L332-L338):
```typescript
{/* 1. Phone Viewport ('fold-closed'): Single column + sheets */}
{viewport === 'fold-closed' ? (
  <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
    {headerNode}
    {threadNode}
    {composerNode}
```
In `fold-closed` mode (all mobile viewports `< 768px`), `railNode` is not mounted. The user has no access to the "New Conversation" button. Because there is no UI element to trigger `createConversation()`, and because lazy creation does not exist, a mobile user on a fresh account is locked in a permanent dead-end state.

#### Cause F: Tenant Context Mismatch (`BoluAssistantProvider.tsx`, Lines 55–59)
In [BoluAssistantProvider.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/BoluAssistantProvider.tsx#L55-L59):
```typescript
<BoluChatWorkspace
  open={open}
  onClose={() => setOpen(false)}
  pageContext={buildBoluPageContext(location.pathname, 'contextual')}
/>
```
`BoluAssistantProvider` does not pass `tenantId` to `BoluChatWorkspace`. `BoluChatWorkspace` instantiates `useBoluConversations` and `useBoluThread` without an explicit `tenantId`, relying on `useContext(EntityContext)`. If `EntityContext` is uninitialized or null during bootstrap, `resolvedTenantId` evaluates to `null`, triggering another immediate abort in line 145 of `useBoluThread.ts`.

---

## 3. Provider Configuration Desynchronization & Mock Architecture Audit

### 3.1 Architectural Schism: Mock Fixtures vs. Production Backend

The audit reveals two completely disconnected provider architectures coexisting in the codebase:

| Subsystem | Production Backend (Phase 2 Reality) | Promoted Chat UI (`src/components/ai-assistant/chat/`) |
| :--- | :--- | :--- |
| **Persistence** | PostgreSQL `public.app_ai_provider_connections` | Local in-memory React state (`useState<ProviderEntry[]>`) |
| **API Client** | `boluProviderApi` (`/api/bolu-provider-config`) | Local helpers in `assistant-chat-providers.ts` |
| **Credentials** | AES-GCM Encrypted Vault (`bolu_provider_secrets`) | Hardcoded mock strings (`rc-token-configured`, `sk-or-active`) |
| **Connection Testing** | Real upstream Ping via serverless route | `simulateConnection()` with `setTimeout(resolve, 400)` |
| **Model Discovery** | Remote API query via serverless proxy | `simulateModelDiscovery()` with static array slice |
| **Chat Execution** | `api/bolu-chat.ts` (Dynamic pool routing via priority) | Independent serverless pool ignoring frontend UI selections |

### 3.2 Visual & State Collision Breakdown (Artifact Evidence)

The four user-provided screenshots illustrate the consequences of this schism:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Screenshot 1 (media_1794699327085_d9d16994.jpg)                         │
│ Header displays: [● OpenRouter | openrouter/free]                      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ User clicks ModelPill
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Screenshot 2 & 3 (media_1794699327089_19c8291e.jpg, ...fc6609e2.jpg)   │
│ Dropdown displays:                                                     │
│   • OpenRouter:          [Configured]                                  │
│   • AMD Token Factory:   [Active ✓] (DeepSeek-V4-Flash)                │
│ Collision: Header displays OpenRouter, but Dropdown marks AMD as Active │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ User clicks "Manage providers & API keys"
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Screenshot 4 (media_1794699327104_2b52e957.jpg)                         │
│ Settings Sheet displays:                                               │
│   • OpenRouter:          [Active]                                      │
│   • Default Model:       "Free router" (openrouter/free)               │
│   • Connected status:    "Connected to OpenRouter." (from mock string) │
│ Collision: Settings marks OpenRouter as Active, directly contradicting │
│ the Dropdown menu where AMD Token Factory was marked Active.           │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Root Cause of Provider State Collisions

1. **Dual Default Conflict (`BoluChatWorkspace.tsx` vs `assistant-chat-providers.ts`):**
   - In [BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L51-L52):
     ```typescript
     const [providers, setProviders] = useState<ProviderEntry[]>(seedProviderEntries)
     const [activeProviderId, setActiveProviderId] = useState('amd')
     ```
     `BoluChatWorkspace` hardcodes `activeProviderId` to `'amd'`.
   - In [assistant-chat-providers.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-providers.ts#L56-L74):
     `seedProviderEntries()` seeds dummy keys for both `'amd'` and `'openrouter'`.
   - In `assistant-chat-model-pill.tsx`, line 41 reads `entries.find(e => e.id === activeId)`. If `activeId` is updated in one component, it does not propagate to the settings sheet, which calculates its own active status using local parameters.
2. **Transport Ignores Frontend Model Selection (`bolu-transport.ts` & `api/bolu-chat.ts`):**
   - In [bolu-transport.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/bolu-transport.ts#L21):
     ```typescript
     body: JSON.stringify({ messages: params.messages, contextFacts: params.contextFacts ?? '' })
     ```
     The frontend transport payload sends **only** `messages` and `contextFacts`. It does **not** transmit `providerId` or `modelId`.
   - In [api/bolu-chat.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/api/bolu-chat.ts#L32-L37):
     The serverless handler selects connections using backend database priority (`claimEligibleConnection` from `app_ai_provider_routing`).
   - **Conclusion:** The entire ModelPill and Provider Settings interface in the chat workspace is an orphaned simulation. Selecting a model in the UI has zero effect on the model executing in `/api/bolu-chat`.

---

## 4. Visual Clipping, Mobile Viewport Layout & CSS Stacking Contexts

### 4.1 Mobile Viewport Height Failure (`max-h-[96vh]` vs `100dvh`)

In [BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L297-L304):
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 ac-device">
  <div className="relative flex flex-col w-full h-full max-w-7xl max-h-[96vh] rounded-none md:rounded-3xl ...">
```
1. **Vertical Centering Gap:** On mobile phones (`width < 768px`), `items-center justify-center` combined with `max-h-[96vh]` leaves 2% empty margin at top and bottom.
2. **Dynamic Browser Toolbar Collision:** Mobile Chromium browsers (demonstrated on Android in the screenshots: `192.168.100.8:5000`) dynamically adjust toolbars on scroll. Using `vh` units calculates height based on the maximum screen dimension rather than the visible viewport. Consequently, the bottom of the modal extends behind the browser's bottom navigation bar.
3. **Missing `100dvh` Implementation:** The container must use `h-[100dvh] max-h-[100dvh] rounded-none` on mobile viewports, applying `max-h-[96vh]` and rounded corners only on `md:` breakpoints.

### 4.2 Browser Bottom Toolbar & App Layout Collision

In Screenshot 1 (`media_1794699327085_d9d16994.jpg`):
- At the bottom of the viewport, the device/browser toolbar (chevron, tabs, new tab button) overlaps the modal footer.
- The footer notice:
  `Enter to send · Shift + Enter for a new line · Two-Gate human verification enforced`
  is directly occluded by floating controls.
- **Root Cause:** In [assistant-chat.css](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat.css#L207-L212), `.ac-composer` specifies:
  ```css
  .ac-composer {
    padding: 8px 16px 12px;
    padding-bottom: max(12px, env(safe-area-inset-bottom, 12px));
    background: var(--ac-surface);
    border-top: 1px solid var(--ac-line);
  }
  ```
  While `safe-area-inset-bottom` handles hardware home bars on iOS, standard mobile browser navigation chrome does not trigger CSS `env(safe-area-inset-bottom)`. The root modal requires explicit safe margin handling or container-level flex positioning.

### 4.3 Unstyled Scrollbars on Prompt Suggestion Chips

In Screenshots 2 and 3:
- A prominent gray horizontal scrollbar bisects the suggestion buttons:
  `[ 🗎 Invoice ] [ ✨ Show outstanding invoic... ] [ 🪄 Find a quotation ]`
- **Root Cause:** In [assistant-chat.css](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat.css#L246-L252):
  ```css
  .ac-compose-pills {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    max-width: calc(100% - 44px);
  }
  ```
  On Android/Chromium, `overflow-x: auto` renders the default operating system scrollbar unless suppressed.
- **Remediation Required:**
  ```css
  .ac-compose-pills {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
  }
  .ac-compose-pills::-webkit-scrollbar {
    display: none; /* WebKit/Chrome/Safari */
  }
  ```

---

## 5. Comprehensive Inventory of Lingering Template Code

The following table catalogs every mock fixture, simulation timer, and prototype placeholder that survived promotion into `src/components/ai-assistant/chat/`:

| File Path | Line Numbers | Component / Function | Nature of Lingering Template Code | Required Production Replacement |
| :--- | :--- | :--- | :--- | :--- |
| `src/components/ai-assistant/chat/assistant-chat-providers.ts` | 56–74 | `seedProviderEntries()` | Hardcodes mock keys `rc-token-configured` and `sk-or-active` for AMD and OpenRouter. | Replace with query to `boluProviderApi.getStatus()` mapping real `PublicConnection` objects. |
| `src/components/ai-assistant/chat/assistant-chat-providers.ts` | 121–130 | `simulateConnection()` | Uses `setTimeout(resolve, 400)` and arbitrary string length checks (`length < 12`) to simulate API verification. | Replace with `boluProviderApi.testConnection(id, credentials)`. |
| `src/components/ai-assistant/chat/assistant-chat-providers.ts` | 132–144 | `simulateModelDiscovery()` | Uses `setTimeout(resolve, 600)` to return a hardcoded slice of model names (`gpt-5.2-mini`, `claude-sonnet-4-5`). | Replace with `boluProviderApi.discoverModels(id)`. |
| `src/components/ai-assistant/chat/assistant-chat-settings.tsx` | 58–75 | `handleTest()` | Calls `simulateConnection` instead of testing credentials against real backend vault. | Connect to `boluProviderApi.testConnection`. |
| `src/components/ai-assistant/chat/assistant-chat-settings.tsx` | 80–92 | `handleDiscover()` | Calls `simulateModelDiscovery` to generate mock models. | Connect to `boluProviderApi.discoverModels`. |
| `src/components/ai-assistant/chat/assistant-chat-composer.tsx` | 14–22 | `DEFAULT_SUGGESTIONS` | Hardcoded fallback chips: `"Create invoice for ABC Ltd · 3 items"`, `"List overdue receivables"`, `"Calculate VAT for ₦250,000"`. | Replace with context-driven suggestions from `getBoluSuggestions(pageContext)`. |
| `src/components/ai-assistant/chat/assistant-chat-clerk.tsx` | 253–268 | `ClerkDock` Quick Ops | Hardcoded quick actions: `"Draft invoice for ABC Ltd"`, `"Check overdue invoices for this month"`. | Derive quick actions from current entity permissions and active document context. |
| `src/components/ai-assistant/chat/assistant-chat-panel.tsx` | 38–46 | `InvoicePanel` Fallback | Hardcoded fallback data: `"INV-000101"`, `"Acme Global Logistics Ltd"`, `"5,450,000"`. | Bind strictly to `activeProposal` or selected record in `pageContext.record`. If null, display empty state artifact. |
| `src/components/ai-assistant/chat/BoluChatWorkspace.tsx` | 51–52 | State initialization | Initializes `providers` from `seedProviderEntries` and defaults `activeProviderId` to `'amd'`. | Fetch live status via `boluProviderApi.getStatus()` and set active provider from backend routing policy. |

---

## 6. Phase B Remediation Blueprint (Step 4 Implementation Plan)

### Step 4.1: Message Flow & Lazy Thread Creation
1. **Auto-Provisioning in `useBoluThread.ts`:**
   - Modify `submitMessage` so that when `conversationId` is `null`, it calls `createConversation()` first, awaits the generated UUID, and appends the user message to the new conversation.
2. **Graceful Handling in `BoluChatWorkspace.tsx`:**
   - In `handleSend`, ensure `inputDraft` is not wiped if `submitMessage` rejects.
   - Retain draft on failure and present an inline error banner.
3. **Mobile Phone Thread Access:**
   - Add a "History" / "Conversations" button in `AssistantHeader` on mobile (`viewport === 'fold-closed'`).
   - When tapped, slide out an overlay drawer containing `railNode` with thread history and the "New Conversation" button.

### Step 4.2: Real Provider Pool Integration
1. **Deprecate `assistant-chat-providers.ts` Mock Engine:**
   - Replace `seedProviderEntries`, `simulateConnection`, and `simulateModelDiscovery` with direct invocations of `boluProviderApi` (`src/pages/settings/bolu-provider/api.ts`).
2. **Propagate Selected Connection to Transport:**
   - Update `sendBoluProviderRequest` in `bolu-transport.ts` to accept optional `connectionId` and `modelId`.
   - Update `api/bolu-chat.ts` to allow an authenticated admin/user to direct requests to an explicit connection ID if permitted by policy, falling back to account pool ranking.

### Step 4.3: Viewport & Layout Stabilization
1. **Dynamic Viewport Height (`100dvh`):**
   - Update the root modal in `BoluChatWorkspace.tsx` to use `h-full md:h-[96vh] max-h-none md:max-h-[96vh]`.
   - Ensure the modal fills 100% of the mobile screen without vertical centering gaps.
2. **Scrollbar Elimination on Chips:**
   - Add utility classes or CSS rules `.ac-compose-pills::-webkit-scrollbar { display: none; }` and `scrollbar-width: none;` to eliminate scrollbars on chip containers.
3. **Bottom Inset Protection:**
   - Add bottom padding to `.ac-composer` to prevent occlusion by mobile browser navigation bars.

---

## 7. Hardware & Verification Notice

- **Hardware Safety:** This diagnostic audit complied strictly with the zero-code inspection rule. Zero `.ts`, `.tsx`, `.js`, or `.css` files were modified.
- **Commands Banned:** `bun run build` remains permanently banned on this host.
- **Next Action:** Await user authorization before executing the Phase B remediation blueprint in Step 4.
