# Toast Mobile Rendering Investigation

**Date:** 2026-06-20
**Scope:** Codebase inspection only — no code modified

---

## 1. Toast Architecture

### Layer diagram

```
goey-toast@0.4.1 (npm, wraps sonner internally with unstyled:true)
├── GoeyToaster (renderer/portal)  →  src/components/ui/toaster.tsx  →  App.tsx
├── goeyToast singleton            →  src/lib/feedback.ts  →  feedback.{error,success,warning,info,loading,promise,dismiss}
│                                     └── ~78 consumer files
└── dist/index.css                 →  imported via main.tsx: import 'goey-toast/styles.css'
```

### Key files

| File | Role |
|---|---|
| `src/lib/feedback.ts` | Core adapter — wraps `goeyToast` into `feedback` API; defines CSS class names passed as GoeyToastOptions.classNames |
| `src/components/ui/toaster.tsx` | Mounts `<GoeyToaster>` with position, theme, offset, gap, queue config |
| `src/styles/formTheme.css` (lines 303–449) | All `.bd-goey-toast-*` CSS rules |
| `node_modules/goey-toast/dist/index.js` | Libraries' rendering logic (1903 lines) |
| `node_modules/goey-toast/dist/index.css` | Libraries' CSS (403 lines) |
| `node_modules/sonner/dist/styles.css` | Underlying Sonner toast CSS (goey-toast renders with Sonner's `<Toaster>` with `unstyled: true`) |
| `src/pages/NewWaybill.tsx` (line 120) | Calls `feedback.error(err.message)` with the long diagnostic message |
| `src/domain/waybill/contracts/waybillContract.ts` (lines 123–135) | Source of the error message |

---

## 2. Render Path

### 2.1 Call site (NewWaybill.tsx:108–122)

```typescript
const handleSave = async (data: WaybillFormData) => {
  try {
    const result = await saveWaybill({ ... })
    feedback.success('Waybill created')
    navigate(`/waybills/${result.waybillId}`)
  } catch (err) {
    feedback.error(err instanceof Error ? err.message : 'Save failed')
    //     ^--- long diagnostic message passed as TITLE (first arg)
  }
}
```

### 2.2 feedback.error() (feedback.ts:125–138)

```typescript
error(message: string | Error, options?: FeedbackOptions) {
  const errorMessage = toMessageString(message, 'Something went wrong')
  return goeyToast.error(
    errorMessage,                                    // → Sonner "message" → title
    createOptions('error', {
      duration: 5600,
      id: toToastId('error', errorMessage),
      preset: 'smooth',
      bounce: 0.14,
      ...options,
    }),
  )
}
```

**No `options` are passed** from the caller, so `description` is absent. The message renders as the **title** only — the toast stays in compact/pill state (no expandable body).

### 2.3 createOptions() (feedback.ts:71–92)

Merges the base CSS classes with tone-specific classes:

```typescript
classNames: {
  ...baseClassNames,               // wrapper, content, header, title, icon, description, action*, etc.
  ...classNames,
  wrapper: [baseClassNames.wrapper, toneClassNames[tone], classNames?.wrapper]
    .filter(Boolean).join(' '),
}
```

### 2.4 CSS class names passed to goey-toast (feedback.ts:11–20)

```typescript
const baseClassNames = {
  wrapper:   'bd-goey-toast max-w-[85vw]',
  content:   'bd-goey-toast__content break-words',
  header:    'bd-goey-toast__header',
  title:     'bd-goey-toast__title break-words',
  icon:      'bd-goey-toast__icon',
  description: 'bd-goey-toast__description break-words',
  actionWrapper:  'bd-goey-toast__action-wrapper',
  actionButton:   'bd-goey-toast__action-button',
}
```

### 2.5 DOM structure produced by goey-toast (index.js ~line 528)

```
[data-sonner-toaster] (fixed, Sonner container)
  [data-sonner-toast] (Sonner list item)
    div.gooey-wrapper.bd-goey-toast.max-w-\[85vw\]
      ├── svg.gooey-blobSvg (morphing background blob)
      └── div.gooey-content.bd-goey-toast__content.break-words.gooey-contentCompact
          └── div.gooey-header.bd-goey-toast__header
              ├── div.gooey-iconWrapper
              │   └── [error icon]
              └── span.gooey-title.bd-goey-toast__title.break-words
                  └── "[saveWaybill:pre-persist] Extension field..."
```

No `gooey-description` is rendered — the toast is in compact (pill) state.

---

## 3. CSS / Tailwind Constraint Analysis

### 3.1 Title element — full CSS cascade

| Source | Selector | Specificity | Key Declarations |
|---|---|---|---|
| Library CSS | `.gooey-title` | 0,1,0 | `white-space: nowrap; font-size: 12px; font-weight: 700; line-height: 1;` |
| Library CSS | `.gooey-header > .gooey-title` | **0,2,1** | `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;` |
| App CSS | `.bd-goey-toast__title` | 0,1,0 | `overflow-wrap: break-word; word-break: break-word;` |
| App CSS | `.bd-goey-toast .gooey-title` | 0,2,0 | `overflow-wrap: break-word; word-break: break-word;` |

**Critical finding:** The app does NOT set `white-space` on the title. The library's `white-space: nowrap` wins via `.gooey-header > .gooey-title` (specificity 0,2,1 > 0,2,0). The app's `overflow-wrap: break-word` and `word-break: break-word` are **inert** when `white-space: nowrap` prevents wrapping.

### 3.2 Container width constraints

| Element | CSS Source | Constraints |
|---|---|---|
| `.gooey-wrapper` (outermost) | Library CSS | `width: fit-content` |
| `.gooey-wrapper` | App CSS `.bd-goey-toast` | `max-width: 85vw` |
| `.gooey-wrapper` | App Tailwind `max-w-[85vw]` | `max-width: 85vw` (duplicate of above) |
| `.gooey-content` | App CSS `.bd-goey-toast__content` | `max-width: 85vw` |
| `.gooey-contentCompact` (pill state) | Library CSS | `padding: 7px 10px` (no width constraint) |
| `.gooey-contentExpanded` (body state) | Library CSS | `min-width: 300px; max-width: 380px` (NOT used in pill state) |

### 3.3 Dynamic (injected) styles during pill state

From `flush()` in index.js (line 649–668), when `t <= 0` (compact/pill state):

```javascript
wrapperRef.current.style.width = centerBw + "px";  // forced explicit width
contentRef.current.style.overflow = "hidden";       // overflow hidden
contentRef.current.style.maxHeight = PH + "px";     // max-height = 34px
```

### 3.4 All relevant CSS properties per layer

| Element | display | width | max-width | overflow | white-space | word-break | overflow-wrap | text-overflow |
|---|---|---|---|---|---|---|---|---|
| `.gooey-wrapper` | block | `fit-content` → `inline px` | `85vw` | visible (default) | — | — | — | — |
| `.gooey-content` | block (default) | — | `85vw` | `hidden` (injected) | — | `break-word` | `break-word` | — |
| `.gooey-header` | `inline-flex` | max-content | — | — | — | — | — | — |
| `.gooey-title` | inline (default) | min-content (0 with min-width:0) | — | `hidden` | `nowrap` | `break-word` (inert) | `break-word` (inert) | `ellipsis` |

---

## 4. Mobile Viewport Analysis

### 4.1 Width calculations

| Viewport | `85vw` | Sonner toast width (calc(100% - offset*2)) | Title available width (approx) |
|---|---|---|---|
| 375px (iPhone SE) | 318.75px | ~327px (with default 24px offset) | ~280px (after icon + gap + padding) |
| 430px (iPhone 14 Pro Max) | 365.5px | ~382px | ~334px |
| 768px (tablet) | 652.8px | ~720px | ~672px |
| 1024px (desktop) | 870.4px | but `.gooey-contentExpanded` caps at 380px* | ~332px (same as tablet) |

*\*The pill state does NOT use `.gooey-contentExpanded`, so the 380px cap doesn't apply in pill state. Only `max-width: 85vw` applies. On desktop, `85vw > 380px` so the wrapper width is set by the inline `width: centerBw` from flush().*

### 4.2 Title overflow calculation

The diagnostic message is ~130 characters. At `font-size: 12px` (library) / `0.8rem ≈ 12.8px` (app override), with average char width ~7px:

- Natural width (nowrap): ~910px
- On 375px mobile: fits in ~280px → shows ~40 chars + `...`
- On 430px mobile: fits in ~334px → shows ~48 chars + `...`

### 4.3 Mobile-specific CSS interactions

**Sonner mobile rule** (`@media (max-width: 600px)`):
```css
[data-sonner-toaster] { width: 100%; }
[data-sonner-toaster] [data-sonner-toast] { width: calc(100% - var(--mobile-offset-left) * 2); }
```

**goey-toast center override** (`@media only screen and (max-width: 600px)`):
```css
[data-sonner-toaster][data-x-position=center] {
  left: 50% !important;
  right: auto !important;
  transform: translateX(-50%) !important;
}
```

This overrides Sonner's own mobile center rule (which sets `transform: none`). The `!important` may cause subtle positioning issues but is not the primary rendering problem.

---

## 5. Long-Message Stress Analysis

### 5.1 Message: 
> `[saveWaybill:pre-persist] Extension field "item_id" found outside custom_data. All non-standard fields must live inside custom_data.`

- **Length:** 130 characters
- **Contains long unbroken tokens:** `[saveWaybill:pre-persist]` (24 chars), `custom_data.` (12 chars), `custom_data.` (11 chars). None are pathologically long but combined they form a continuous string because `white-space: nowrap` prevents any break opportunity from being used.

### 5.2 Failure mechanism — step by step

1. `feedback.error(message)` passes the message as the **title** (no description)
2. The toast enters compact/pill state (no expandable body)
3. `flush()` sets inline `width` on wrapper, `overflow: hidden` on content, `max-height: 34px` on content
4. The title span has `white-space: nowrap` (from library CSS, not overridden by app)
5. The title span has `overflow: hidden; text-overflow: ellipsis; min-width: 0`
6. The parent `.gooey-header` is `inline-flex`, its width constrained by `.gooey-content` which is constrained by `.gooey-wrapper`'s `max-width: 85vw`
7. The title text (~910px wide at nowrap) exceeds the container width (~318px on 375px mobile)
8. `overflow: hidden` clips the excess; `text-overflow: ellipsis` appends "..."
9. The user sees only ~40 characters followed by "..."

### 5.3 Why "text appeared missing or largely invisible"

The crucial diagnostic information is at the end of the message — "All non-standard fields must live inside custom_data." This is the actionable instruction. Since the text is truncated at ~40 chars, the user sees only:

> `[saveWaybill:pre-persist] Extension field "item_id" f...`

The first 40 characters contain the context and field name but not the resolution. The user interprets this as "largely invisible" because the important part is cut off.

### 5.4 Why desktop mode helps

"Switching the phone to desktop mode" widens the viewport (e.g., > 447px where 85vw > 380px). However, the pill state isn't constrained by `max-width: 380px` (that's only on `.gooey-contentExpanded`). In pill state, `max-width: 85vw` is the only cap. At a tablet-width viewport (~768px), 85vw = 652.8px, showing ~90 characters — enough to see the full message.

---

## 6. Root Cause Classification

**Primary: Issue A (Missing Wrapping) — THE ROOT CAUSE**

`white-space: nowrap` on `.gooey-title` / `.gooey-header > .gooey-title` (from goey-toast library CSS) prevents the title text from breaking across lines. The app's `overflow-wrap: break-word; word-break: break-word` on `.bd-goey-toast__title` and `.bd-goey-toast .gooey-title` **cannot override** `white-space: nowrap` because:

1. `white-space` controls whether wrapping is permitted at all
2. `overflow-wrap`/`word-break` only control HOW the text breaks when wrapping IS permitted
3. With `white-space: nowrap`, no wrapping occurs at any point
4. The app does not set `white-space: normal` anywhere on the title
5. The library's `.gooey-header > .gooey-title` selector (specificity 0,2,1) beats the app's `.bd-goey-toast .gooey-title` (specificity 0,2,0) — even if the app added `white-space: normal`, it would lose

**Contributing: Issue C (Overflow Clipping) — SECONDARY**

With `overflow: hidden` and `text-overflow: ellipsis` on the title, the overflowing single-line text is clipped and truncated. This is the visible manifestation of the root cause.

**Contributing: Issue F (Text Visibility Issue) — SYMPTOM**

The text is not truly invisible — it's truncated with "..." The end user perceives the text as "missing" because the actionable part of the message is cut off.

**Contributing: Issue I (Multiple Interacting Causes)**

The `max-width: 85vw` constraint (from app CSS) reduces available width on mobile, making the truncation worse than on desktop. Without this constraint, more of the nowrap title would be visible.

### Classification summary

| Category | Status | Evidence |
|---|---|---|
| **A. Missing wrapping** | **ROOT CAUSE** | `white-space: nowrap` on `.gooey-title` prevents all line breaking |
| **B. Insufficient word breaking** | Not applicable | Wrapping is not enabled; word-break rules are inert |
| **C. Overflow clipping** | Contributing | `overflow: hidden` + `text-overflow: ellipsis` clips the nowrap text |
| **D. Width collapse** | Not a factor | Width is stable at `85vw` or `max(300px, ...)`, no collapse scenario detected |
| **E. Flexbox sizing bug** | Not a factor | `inline-flex` on header is correct; `min-width: 0` on title allows expected shrinking |
| **F. Text visibility issue** | Symptom | Text visible but truncated; user perceives as missing |
| **G. Animation/rendering issue** | Not a factor | `overflow: hidden` during morph is expected; cleared on completion `t >= 1` in expanded state; pill state intentionally keeps `overflow: hidden` |
| **H. Library bug** | Not a bug per se | `white-space: nowrap` on title is intentional library behavior (designed for short notification titles) |
| **I. Multiple interacting causes** | **Yes** | Library `nowrap` + app `max-width: 85vw` + `overflow: hidden` + `text-overflow: ellipsis` combine to produce the observed truncation |

---

## 7. Recommended Fix

**DO NOT IMPLEMENT — for reference only.**

### Fix: Allow title text to wrap

Override `white-space` on the title element with a selector that beats the library's `white-space: nowrap` from `.gooey-header > .gooey-title` (specificity 0,2,1):

**Option A — CSS override (add to formTheme.css):**
```css
.bd-goey-toast .gooey-header > .gooey-title {
  white-space: normal;
  /* overflow-wrap: break-word and word-break: break-word already present */
}
```
This selector has specificity 0,3,1 which beats `.gooey-header > .gooey-title` (0,2,1).

**Option B — Or use a simpler selector with `!important`:**
```css
.bd-goey-toast .gooey-title {
  white-space: normal !important;
}
```

### Other considerations

- The description element does NOT have `white-space: nowrap` and wraps naturally. For future use, long messages could be placed in the description rather than the title.
- The `max-width: 85vw` constraint should be reviewed for mobile — consider a larger value or min-width floor.
- If wrapping is enabled, the `line-height: 1` on `.gooey-title` may need adjustment for multi-line titles.
- The `max-height: 34px` injected during pill state (from `flush()`) may clip multi-line titles if `line-height` isn't considered. Pill state height `PH = 34` would need to accommodate wrapped text.

### Verification test

With the fix, on a 375px viewport, the full message should render as:
```
[saveWaybill:pre-persist]
Extension field "item_id" found
outside custom_data. All
non-standard fields must live
inside custom_data.
```
(Approximately 4-5 lines at 12px font within 318px width)
