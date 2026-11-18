# Diagnostic Audit: Bolu Production UI Artifacts, Catalog Spam & Silent AI Drop

**Date:** 2026-11-15  
**Auditor:** BOURXE AI Agent / Lead Systems Architect  
**Scope:** `src/components/ai-assistant/chat/`, `src/lib/ai-assistant/hooks/useBoluThread.ts`, `src/components/ai-assistant/chat/BoluChatWorkspace.tsx`, `src/components/ai-assistant/chat/assistant-chat-model-pill.tsx`  
**Target Deliverable:** Zero-code diagnostic report identifying the root causes, component paths, and exact line numbers for surviving Design Lab debugging artifacts, provider catalog spam, and silent inference API failures.  
**Standard:** ASD-STE100 (Simplified Technical English) & BOURXE Architecture Standards  

---

## 1. Executive Summary

Following Phase B promotion, three critical architectural defects survived in the production Bolu conversational interface:

1. **Design Lab Debugger Harness in Production:** A debugging toolbar (`Viewport Mode (DEC-26)`) continues to render on desktop and tablet screens, exposing prototype buttons (`Phone`, `Foldable`, `Tablet`, `Desktop`, `Reset to Auto`) that bypass the production `AppShell` responsive system.
2. **Model Picker Catalog Spam:** The top-bar `ModelPill` renders the entire 14-provider unconfigured catalog from `AI_PROVIDER_REGISTRY` with `"Needs key"` error tags, instead of filtering strictly for configured, healthy connections returned by `boluProviderApi.getStatus().connections`.
3. **Silent AI Failure After User Message Persistence:** When a user message is sent, it successfully appends to `public.bolu_messages`. However, when the backend call (`/api/bolu-chat` via `sendBoluProviderRequest`) fails (e.g., HTTP 503 connection pool exhausted, HTTP 502 upstream network error, or missing credentials), the catch block deletes the temporary assistant bubble, resets the Thinking Orb to dormant `idle`, and sets an `error` state that is completely ignored by `BoluChatWorkspace.tsx` and `AssistantThread.tsx`. The user experiences total silence with zero visual feedback.

This report isolates the exact line numbers and component relationships responsible for each failure.

---

## 2. Area 1: The Design Lab Debugger Artifact

### 2.1 The Injecting Component & Exact Line Numbers

The debugging bar is injected directly inside [BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L345-L368):

```tsx
// File: src/components/ai-assistant/chat/BoluChatWorkspace.tsx
// Lines 345–368:

{/* Viewport Control Bar */}
<div className="hidden sm:flex items-center justify-between px-4 py-1.5 border-b border-[var(--ac-line)] bg-[var(--ac-muted-surface)] text-xs text-[var(--ac-muted)]">
  <div className="flex items-center gap-2">
    <span className="font-semibold text-[var(--ac-ink)]">Viewport Mode (DEC-26):</span>
    <ViewportPicker
      viewport={viewport}
      onChange={(v) => {
        setUserPickedViewport(true)
        setViewport(v)
      }}
    />
  </div>
  <div className="flex items-center gap-2">
    <span>Model: <strong className="text-[var(--ac-ink)]">{activeProvider.label}</strong></span>
    <span>·</span>
    <button
      type="button"
      className="hover:text-[var(--ac-ink)] underline"
      onClick={() => setUserPickedViewport(false)}
    >
      Reset to Auto
    </button>
  </div>
</div>
```

The underlying interactive buttons are defined in [assistant-chat-chrome.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-chrome.tsx#L93-L134):

```tsx
// File: src/components/ai-assistant/chat/assistant-chat-chrome.tsx
// Lines 93–106:

export function ViewportPicker({
  viewport,
  onChange,
}: {
  viewport: ViewportId
  onChange: (v: ViewportId) => void
}) {
  const options: { id: ViewportId; label: string; icon: typeof Smartphone }[] = [
    { id: 'fold-closed', label: 'Phone', icon: Smartphone },
    { id: 'fold-open', label: 'Foldable', icon: BookOpen },
    { id: 'tablet', label: 'Tablet', icon: Tablet },
    { id: 'desktop', label: 'Desktop', icon: Monitor },
  ]
```

### 2.2 How It Circumvents the Production AppShell

1. **Origin:** This control bar was built in `src/components/design-lab/assistant-chat-workspace.tsx` so developers could preview four different mobile, foldable, tablet, and desktop form factors within a standard desktop browser window without opening Chrome DevTools.
2. **Promotion Carryover:** When the Design Lab component was relocated to `src/components/ai-assistant/chat/BoluChatWorkspace.tsx`, this entire testing fixture was copied verbatim.
3. **Responsive Breakpoint Trigger:** The wrapper contains `className="hidden sm:flex ..."`. Consequently:
   - On mobile phones (`width < 640px`), the bar is hidden by Tailwind's `hidden` class.
   - On any tablet, laptop, or desktop screen (`sm:flex`), the debugging bar unhides itself across the top of the modal, immediately above the chat canvas.
4. **State Hijacking:** [BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L46) declares `const [userPickedViewport, setUserPickedViewport] = useState(Boolean(initialViewport))`. Clicking any button in `ViewportPicker` sets `userPickedViewport(true)` and overrides natural CSS responsive layouts, forcing the production chat to lock into artificial widths.

---

## 3. Area 2: The Model Picker Catalog Spam

### 3.1 Failure Mechanics: Unconfigured Catalog Dumping

The chat header's `ModelPill` is intended as an operational switcher between active, verified provider connections. Instead, it dumps all 14 providers from `AI_PROVIDER_REGISTRY`, rendering unconfigured rows with missing key tags.

### 3.2 Exact Code Locations Causing the Defect

#### Location A: Initializing State with Full Static Registry
In [BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L53):
```typescript
const [providers, setProviders] = useState<ProviderEntry[]>(initialProviderEntries)
```
In [assistant-chat-providers.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-providers.ts#L45-L60):
```typescript
export function initialProviderEntries(): ProviderEntry[] {
  return AI_PROVIDER_REGISTRY.map((row) => ({
    id: row.id,
    label: row.label,
    short: row.short,
    ...
```
`initialProviderEntries()` maps every single provider defined in `AI_PROVIDER_REGISTRY` (`openrouter`, `anthropic`, `openai`, `gemini`, `groq`, `deepseek`, `mistral`, `together`, `fireworks`, `cohere`, `perplexity`, `cerebras`, `amd`, `cloudflare`). All 14 entries are loaded into state on mount.

#### Location B: Synchronization Preserves Missing Connections
In [assistant-chat-providers.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-providers.ts#L101-L120):
```typescript
const updatedEntries = entries.map((entry) => {
  const conn = connections.find((c) => c.providerId === entry.id)
  if (!conn) return entry  // <── DEFECT: Keeps unconfigured catalog entry in memory!
  ...
```
When `syncEntriesWithBackend()` runs against `boluProviderApi.getStatus().connections`, any provider *not* found in the active database connections is preserved rather than dropped.

#### Location C: ModelPill Renders All Entries Without Filtering
In [assistant-chat-model-pill.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-model-pill.tsx#L44-L53):
```typescript
const visibleEntries = useMemo(() => {
  const term = query.trim().toLowerCase()
  return [...entries]
    .sort((a, b) => Number(Boolean(b.key)) - Number(Boolean(a.key)))
    .filter((entry) =>
      !term || `${entry.label} ${entry.model} ${entry.baseUrl} ${entry.models.map((m) => m.label).join(' ')}`
        .toLowerCase()
        .includes(term),
    )
}, [entries, query])
```
`visibleEntries` sorts entries so configured ones appear first, but **it never filters out entries where `!entry.key`**.
Then, in lines 96–126:
```tsx
{visibleEntries.map((entry) => {
  const status = providerStatus(entry, activeId)
  ...
  <span className={`ac-tag ${status === 'needs-key' ? 'ac-tag--missing' : ''}`}>
    {status === 'active' ? 'Active' : status === 'configured' ? 'Configured' : 'Needs key'}
  </span>
```
Every unconfigured provider is rendered as a clickable row displaying a red `"Needs key"` badge and `"0 of 14 providers ready"`.

### 3.3 Production UX Standard Violation
In a production assistant interface:
* The header `ModelPill` is a **fast runtime selector**. It must strictly list the tenant's *configured and active connections* (e.g., OpenRouter, AMD Token Factory).
* Providers requiring setup belong exclusively in `ProviderSettings` (`/settings` or the gear icon modal). They must never clutter the conversation top bar.

---

## 4. Area 3: The Silent AI Drop & Swallowed Errors

### 4.1 Trace of the Execution Failure

When the user types a prompt and submits, the execution sequence proceeds as follows:

```
[1] User enters prompt and submits
       │
       ▼
[2] useBoluThread.ts:201-221
    Inserts user message into `public.bolu_messages`
    ──> SUCCESS: Appends user message to state. User sees bubble.
       │
       ▼
[3] useBoluThread.ts:223-235
    Creates temporary assistant bubble (tempAssistantId)
    ──> Displays Thinking Orb in thread.
       │
       ▼
[4] useBoluThread.ts:251-271
    Calls `sendBoluProviderRequest()`
       │
       ▼
[5] bolu-transport.ts:15-27
    `fetch('/api/bolu-chat', { ... })`
    Server returns HTTP 503 (e.g. pool exhausted / unconfigured)
    or HTTP 502 (upstream failure).
    ──> `throw new Error(result?.error || 'Bolu is not available right now.')`
       │
       ▼
[6] useBoluThread.ts:352-367 (THE CATCH BLOCK)
    ──> Catches the Error thrown by `sendBoluProviderRequest`.
```

### 4.2 The Five Layers of Error Swallowing

#### Layer 1: Temporary Assistant Message Deletion ([Line 364](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/hooks/useBoluThread.ts#L364))
```typescript
// File: src/lib/ai-assistant/hooks/useBoluThread.ts
// Lines 362–366:

} catch (err) {
  setError(err instanceof Error ? err.message : 'Inference request failed.')
  setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId)) // <── DELETES BUBBLE
  setClerkState('idle')                                              // <── SILENCES ORB
  return false
}
```
When the API rejects, line 364 filters out and destroys `tempAssistantId`. The pending assistant turn vanishes from the chat window.

#### Layer 2: Thinking Orb Silenced to Dormant ([Line 365](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/hooks/useBoluThread.ts#L365))
`setClerkState('idle')` resets the state machine to `'idle'`. In [bolu-thinking-orb.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/bolu-thinking-orb.tsx#L31), `idle` returns `null`. The Thinking Orb stops animating and disappears.

#### Layer 3: Hook State `error` is Ignored by `BoluChatWorkspace.tsx`
In [useBoluThread.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/ai-assistant/hooks/useBoluThread.ts#L363), `setError(err.message)` stores the error in hook state.  
However, in [BoluChatWorkspace.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/BoluChatWorkspace.tsx#L113-L125):
```typescript
const {
  messages,
  clerkState,
  isStreaming,
  streamingContent,
  activeProposal,
  submitMessage,
  stopStreaming,
  approveGate1,
  rejectGate1,
  confirmGate2Save,
  cancelGate2Save,
  // error is NOT EVEN DESTRUCTURED HERE!
} = useBoluThread({ ... })
```
`BoluChatWorkspace` does not destructure `error` from `useBoluThread`. The error string is completely ignored.

#### Layer 4: `AssistantThread.tsx` Has No Error Prop or Error Banner
In [assistant-chat-thread.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/components/ai-assistant/chat/assistant-chat-thread.tsx#L15-L45), the component props interface contains:
```typescript
export function AssistantThread({
  messages,
  busy,
  isStreaming = false,
  clerkState,
  tone = 'light',
  showJump,
  logRef,
  onScroll,
  onJump,
  onSend,
  onApproveGate1,
  onRejectGate1,
  onConfirmGate2,
  onCancelGate2,
  suggestions = [],
}: { ... })
```
`AssistantThread` has no prop for error messages, no banner component, and no failed message card.

#### Layer 5: Message `status: 'failed'` is Never Persisted
While `ProductionBoluMessage` defines `status: 'streaming' | 'completed' | 'failed' | 'stopped'`, line 364 deletes the message instead of marking it `status: 'failed'` and displaying the failure explanation to the user.

---

## 5. Architectural Remediation Plan (Blueprint for Next Step)

### Remediation 1: Purge the Viewport Debugging Bar
1. Delete lines 345–368 in `BoluChatWorkspace.tsx` (`Viewport Control Bar` and `ViewportPicker`).
2. Delete `userPickedViewport` state and the manual resize override listener. Let the four DEC-26 viewports adapt automatically based solely on `window.innerWidth`.
3. Deprecate and remove `ViewportPicker` from `assistant-chat-chrome.tsx`.

### Remediation 2: Filter `ModelPill` for Configured Connections Only
1. In `assistant-chat-model-pill.tsx`, filter `visibleEntries` so only entries with `Boolean(entry.key)` are rendered:
   ```typescript
   const configuredEntries = visibleEntries.filter((entry) => Boolean(entry.key))
   ```
2. If `configuredEntries.length === 0`, render a single clear action: `"No AI provider configured. Open Settings to connect an API key."`
3. Reserve the full catalog of unconfigured providers exclusively for `assistant-chat-settings.tsx`.

### Remediation 3: Surface Live Inference Errors in the Chat UI
1. In `useBoluThread.ts` (catch block):
   - Do not delete `tempAssistantId`. Update its status to `'failed'` and set its content to a clean, user-facing error message (e.g., `"Bolu could not reach the AI provider: [error details]. Please check provider settings."`).
   - Keep the failed assistant bubble in the message list so the user understands why no response was generated.
2. In `BoluChatWorkspace.tsx`:
   - Destructure `error` from `useBoluThread`.
   - Pass `error` to `AssistantThread` and render an inline error banner or toast above the composer.

---

## 6. Hardware Verification Notice

- **Hardware Safety:** Complied strictly with zero-code audit rules. Zero application `.ts`, `.tsx`, or `.css` files were modified during this turn.
- **Commands Banned:** `bun run build` and `bun run typecheck` were strictly excluded.
- **Next Action:** Await user authorization before executing the remediation plan.
