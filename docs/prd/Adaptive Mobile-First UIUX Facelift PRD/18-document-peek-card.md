# Document Peek Card

> Status: Draft
> Last updated: 2026-08-29
> Depends on: `06-component-patterns.md`, `15-interaction-model.md`, `12-capacitor-native.md`

---

## 1. Purpose

Define a long-press document preview card for Android. The peek card shows a lightweight summary of a document without navigating away from the current list. The feature is Android-native only.

---

## 2. Why Native-Only

### JavaScript Long-Press Was Tried and Abandoned

A JavaScript-level long-press implementation was built and shipped in the BIGDROPS codebase. It exists in:

- `src/hooks/useLongPress.ts` — a reusable hook with configurable delay, move-cancellation, and haptic feedback
- `src/components/batch/SelectableRowCard.tsx` — a production component using 400ms pointer-hold for batch selection

This JavaScript approach was **disconnected in production due to unreliability in real-world use.** The JS-level gesture did not hold up under real device conditions — timing drift, scroll conflicts, and inconsistent haptic firing made it unsuitable for a user-facing feature.

The PRD records this here so that no future author reaches for the JS hook for this feature. A native Android gesture bridge is required.

### Why Native Works

A native Capacitor plugin can register a real Android `OnLongClickListener` (or equivalent gesture detector) at the native layer. This gives:

- Precise gesture timing controlled by the OS, not JavaScript timers
- Native haptic feedback via the Android vibrator service
- No conflict with scroll, pull-to-refresh, or other touch gestures
- Consistent behavior across all Android devices and WebView versions

### Plugin Approach

No well-maintained, dedicated Capacitor "long-press gesture" plugin exists in the ecosystem as of August 2026. Research confirmed:

- `capacitor-context-menu` (Yukaru-san) — handles PROCESS_TEXT context menu events from Android intents, not a general long-press gesture bridge
- No `@capacitor/gesture` or similar official plugin exists
- The Capacitor community forums show repeated requests for long-press with no standard solution

**The correct approach is a small custom Capacitor plugin.** This is a single Kotlin file that:

1. Extends `Plugin` from `@capacitor/core`
2. Registers a JavaScript interface via `@JavascriptInterface`
3. Attaches an `OnLongClickListener` (or `GestureDetector.OnLongGestureListener`) to the WebView
4. Sends long-press coordinates and element identifiers back to JavaScript via `notifyListeners()`

This is approximately 60–80 lines of Kotlin. It does not require third-party dependencies. The plugin follows the same pattern as the existing `@capacitor/app` back-button handler already in this project.

---

## 3. Feature Scope

| Aspect | Scope |
|--------|-------|
| Platform | Android only. No iOS, no web. |
| Trigger | Native long-press on a document list row |
| Content | Document title, status badge, total amount, thumbnail (if available), and line items |
| Dismissal | Tap outside, scroll, or back button |
| Navigation | Tap the peek card to open the full document view |
| Normal tap behavior | Unchanged — single tap still navigates to document |

---

## 4. Peek Card Content

The peek card shows a compact preview of the document. It MUST include:

| Element | Source | Required? |
|---------|--------|-----------|
| Document number | `invoice_number`, `quotation_number`, etc. | Yes |
| Document title | `invoice_title`, `quotation_title`, etc. | Yes (if present) |
| Status badge | Document status with color coding | Yes |
| Total amount | Formatted currency value | Yes |
| Client or vendor name | `client_name` or `vendor_name` | Yes |
| Thumbnail | Item image or document-type icon | If available |
| Line items | First 3–5 line items with description and amount | Yes |

### Line Items Requirement

The peek card MUST show line items. A peek card without line items was identified as a real weakness during review — the primary reason a user long-presses a document is to quickly check what's in it without navigating away. The line item list is the most valuable content in the peek.

Display the first 3–5 items. If more items exist, show a "+N more items" indicator.

---

## 5. Visual Specification

### Card Anatomy

```
┌─────────────────────────────────────────┐
│  DOCUMENT-0001          [status pill]   │
│  Invoice Title                          │
│  Client Name                            │
│                                         │
│  ┌─────┐  Item description    ₦12,000  │
│  │thumb│  Item description     ₦8,500  │
│  └─────┘  Item description     ₦3,200  │
│          +2 more items                  │
│                                         │
│  ─────────────────────────────────────  │
│  Grand Total                    ₦23,700 │
└─────────────────────────────────────────┘
```

### Card Properties

| Property | Value |
|----------|-------|
| Width | 280px (max), or `calc(100vw - 32px)` on narrow screens |
| Border radius | 16px |
| Background | `var(--surface)` |
| Border | `1px solid var(--line)` |
| Shadow | `0 8px 32px rgba(15,23,42,0.12)` |
| Padding | 14px |
| Position | Anchored to the long-pressed row, offset below by 8px |
| z-index | Above list content but below overlays |
| Max height | 320px (scrollable if content exceeds) |

### Entrance Animation

| Property | Value |
|----------|-------|
| Duration | 0.2s |
| Easing | `cubic-bezier(0.2, 0.9, 0.24, 1)` |
| Initial state | `opacity: 0; transform: scale(0.95)` |
| Final state | `opacity: 1; transform: scale(1)` |
| Reduced motion | Instant appearance, no animation |

### Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Document number | 13px | 700 | `var(--ink)` |
| Title | 12px | 600 | `var(--ink)` |
| Client name | 11px | 500 | `var(--ink-2)` |
| Line item description | 11px | 500 | `var(--ink)` |
| Line item amount | 11px | 600 | `var(--ink)` |
| Total label | 11px | 800 | `var(--ink)` |
| Total amount | 13px | 800 | `var(--primary)` |
| "+N more" indicator | 10px | 600 | `var(--ink-3)` |

### Status Badge

Reuse the existing status pill from `06-component-patterns.md` Status Indicator section. Colors match document status (Draft, Pending, Delivered, etc.).

---

## 6. Interaction Rules

| Action | Behavior |
|--------|----------|
| Long-press on document row | Show peek card below the row |
| Tap on peek card | Navigate to full document view |
| Tap outside peek card | Dismiss peek card |
| Scroll while peek card is open | Dismiss peek card |
| Back button while peek card is open | Dismiss peek card (do not navigate back) |
| Long-press another row while peek card is open | Dismiss current, show new peek card |
| Keyboard opens while peek card is open | Dismiss peek card |

### Gesture Parameters

| Parameter | Value |
|-----------|-------|
| Long-press duration | 500ms |
| Move threshold | 10px (cancel gesture if finger moves more) |
| Haptic feedback | Single pulse on peek card appearance (native vibrator, 25ms) |

---

## 7. Data Flow

```
Native long-press event (coordinates + element ID)
  → Capacitor plugin bridge
  → JavaScript listener receives event
  → Identify document from row element or data attribute
  → Fetch document summary (title, status, amount, items)
  → Render peek card at position near touch point
  → Show card with entrance animation
```

The document summary data SHOULD be pre-loaded in the list view (already available for list rendering). The peek card does NOT require a new data fetch — it reuses the data already in memory for the list.

---

## 8. Implementation Notes

### Custom Capacitor Plugin Structure

```
android/app/src/main/java/com/bigdrops/app/plugins/
  LongPressPlugin.kt
```

The plugin registers itself in `MainActivity.java` and exposes a single event: `longPress` with payload `{ x: number, y: number, elementId: string }`.

### JavaScript Bridge

```typescript
import { registerPlugin } from '@capacitor/core';

interface LongPressPlugin {
  addListener(event: 'longPress', handler: (info: { x: number; y: number; elementId: string }) => void): Promise<PluginListenerHandle>;
}

const LongPress = registerPlugin<LongPressPlugin>('LongPress');
```

### Element Identification

Each document list row MUST carry a `data-document-id` attribute. The native bridge sends this identifier with the long-press event so the JavaScript layer can look up the document without querying the DOM for content.

---

## 9. Anti-Patterns

| # | Prohibition | Reason |
|---|-------------|--------|
| 1 | Do not use the JavaScript `useLongPress` hook | Disconnected in production due to unreliability |
| 2 | Do not use `onContextMenu` browser event | Triggers on right-click on desktop, not on long-press on Android |
| 3 | Do not fetch document data on long-press | Data is already in memory from the list render |
| 4 | Do not show a full-page preview | The peek card is a lightweight summary, not a document view |
| 5 | Do not show the peek card on web or iOS | Android-only feature; normal tap-to-open on other platforms |
| 6 | Do not use framer-motion for the entrance animation | Per AGENTS.md UI constraint |

---

## 10. Future Considerations

- **iOS equivalent:** iOS has native Haptic Touch (long-press context menus). A future pass could bridge this via a similar Capacitor plugin on iOS.
- **Peek card for waybills/CSR/BOQ/RFQ:** The initial implementation targets Invoice and Quotation list pages. Other document types can follow the same pattern.
- **Swipe actions:** The peek card is a preview mechanism. Swipe-to-delete or swipe-to-archive are separate interaction patterns not covered by this spec.
