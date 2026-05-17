# Editor State Rules

> **Status:** Discovered through stabilization pain. Enforced by architecture, not by code.
>
> **Applies to:** Invoice editing, quotation editing, and any future document line-item flows.

---

## 1. Ref Authority Rule

**Refs are authoritative inside synchronous mutation chains.**

During a synchronous sequence of mutations — `insertItem`, `updateItem`, `moveItem`, `commitGrouping` — the React ref (`itemsRef`, `groupsRef`) holds the ground truth. Render state (`items`, `groups`) is a snapshot that may lag behind.

**Why:** Batched updates and stale closures can cause render state to restore old values if read during a mutation chain.

**Violation:** Calling `updateRefs()` inside `commitGrouping()` caused the critical row reset bug. The ref overwrote fresh render state with stale closure state.

**Enforcement:**
- `updateRefs()` runs only in `useLayoutEffect` after render completes.
- Never call `updateRefs()` inside a mutation function.

---

## 2. Render State Non-Authority Rule

**Render state is NOT authoritative during chained updates.**

If a mutation function reads `items` or `groups` from React state to compute the next state, it may receive stale values. Always read from refs or use functional state updates.

**Why:** React state updates are asynchronous. Reading `items` inside `insertItemAfter` that was just called by `commitGrouping` yields the pre-mutation array.

**Violation:** Stale `insertItemAfter` closures reading old `items` state caused duplicate rows and index corruption.

**Enforcement:**
- Mutation functions use functional updates: `setItems(prev => ...)`
- Or read from `itemsRef.current` for immediate consistency.

---

## 3. Normalization Layer Rule

**Grouping normalization occurs only in one layer.**

The `normalizeQuotationGrouping()` function is the single source of truth for reconciling `groups[]` and `group_header` rows inside `items[]`. It runs at specific boundaries:

- After loading a document from the database
- Inside `commitGrouping()` before persisting
- Never inside render loops or on every keystroke

**Why:** Running normalization frequently causes churn, performance degradation, and race conditions between group state and item state.

**Violation:** Normalization running on every render caused excessive recomputation and subtle desync bugs.

**Enforcement:**
- Memoize normalized output where possible.
- Only denormalize at persistence boundaries.

---

## 4. Functional Mutation Rule

**Line-item mutations must be functional / state-derived.**

Every mutation to line items must produce a new array/object derived from the previous state. No in-place mutations. No pushing to existing arrays.

**Why:** In-place mutations bypass React's change detection, break memoization, and cause silent rendering failures.

**Violation:** Direct `items.push(newItem)` caused React to skip re-renders, making new items invisible until unrelated state changed.

**Enforcement:**
- Use `map`, `filter`, `concat`, spread syntax.
- Never `Array.prototype.push`, `splice`, or direct property assignment on state objects.

---

## 5. Single Authority Rule

**Grouped and flat representations cannot both be authoritative.**

The quotation system maintains two representations:
- `groups[]` — the group structure
- `items[]` with `group_header` rows — the flat item list

Only one representation is authoritative at any time. The other is derived.

**Current authority:** `items[]` is authoritative. `groups[]` is derived via normalization.

**Why:** Dual authority causes synchronization loops where updating one triggers updates to the other, which triggers updates back.

**Violation:** Early attempts to keep both in sync via bidirectional updates caused infinite loops and state corruption.

**Enforcement:**
- Mutations target `items[]` only.
- `groups[]` is computed, never directly mutated.
- If group structure changes, rebuild `items[]` with new headers.

---

## 6. Persistence Boundary Rule

**Save orchestration owns the persistence boundary.**

The page component (e.g., `EditInvoice.tsx`, `QuotationForm.tsx`) is responsible for:
- Collecting editor state into a save payload
- Calling the persistence function
- Handling save success/failure UI

The service/repository is responsible for:
- Transactional integrity
- Database constraint enforcement
- Audit logging

**Why:** Blurring this boundary leads to UI components performing direct database mutations, which breaks testability and creates hidden dependencies.

**Current state:** Write operations still live in pages. This is acceptable until stable row identity is implemented.

**Target state:**

```

Page → Service.saveDocument(payload) → Repository.upsert(items)

```

---

## 7. Row Identity Rule (Future)

**Every line item must have a stable, immutable identity.**

Current state: Items use `_uiKey` (timestamp + random) for React keys, but database IDs are stripped on save and recreated via delete-all-reinsert.

**Target:** Each item row carries a stable UUID from creation through all edits. The UUID survives save, reload, conversion, and duplication.

**Why:** Without stable identity, differential persistence is impossible. The system cannot distinguish "updated row" from "deleted + new row."

**Blocked by:** Delete-all-reinsert persistence strategy.

**Unblocks:** Differential persistence, optimistic updates, undo safety, stable audit diffs.

---

## Violation Log

| Bug | Rule Violated | Fix | Date |
|-----|---------------|-----|------|
| Row resets during grouping | #1 Ref Authority | Removed `updateRefs()` from `commitGrouping()` | 2026-05-11 |
| Duplicate rows on insert | #2 Render State Non-Authority | Used functional updates + ref reads | 2026-05-11 |
| Stale batched updates | #1 + #2 | Isolated ref sync to `useLayoutEffect` | 2026-05-11 |
| Group/item desync | #5 Single Authority | Enforced items[] as sole authority | 2026-05-15 |
| Silent render skips | #4 Functional Mutation | Banned in-place mutations | 2026-05-15 |

---

## Checklist for New Document Types

Before adding a new document type with line items, verify:

- [ ] One authoritative state representation (not dual)
- [ ] Refs updated only after render, never during mutation chains
- [ ] Mutations use functional updates or ref reads
- [ ] Normalization runs at boundaries, not per-render
- [ ] No in-place array/object mutations
- [ ] Save boundary clearly defined (page orchestrates, service persists)
- [ ] Stable row identity planned (even if not yet implemented)

---

*Documented after stabilization phase. These rules were discovered through production bug fixes, not theoretical design. Treat as architectural law until differential persistence renders some obsolete.*