I have ingested all the new details, mapped out the timeline against your screenshots, and isolated exactly why these distinct bugs are happening simultaneously.
## 🔍 The Root Cause Ingestion
### Bug 1: The Group/Member Breakdown (Manual & JSON Import)
 * **The Symptom:** Globally broke manual group adding (highlights the key but fails to render a group container), and JSON imports create an empty shell of a group block that drops its child items completely.
 * **The Cause:** This is a downstream side effect of our previous duplication bug fix. When we switched to strict structural serialization (JSON.parse(JSON.stringify())) to save standard items, we accidentally broke the schema references for **Groups**. In your architecture, groups likely use a distinct nested item model (e.g., is_group: true, group_id, or an internal items array block).
   * **Manual:** Clicking "Add Group" tries to initialize a row shape that the form component no longer parses correctly because the state modifier expects flat arrays.
   * **JSON Import:** The import parsing schema maps nested line items under one format, but it drops the item relational pointers or IDs that tie individual child rows inside the parent group container. The group header renders, but its children array initializes as [] or null.
### Bug 2: The 2-Second Keyboard Flash / Background Glitch
 * **The Symptom:** When you tap a form input to focus, or retract the soft keyboard, the visual background panel flashes or shifts colors dynamically, sticking for roughly 2 seconds before reverting.
 * **The Cause:** This is a classic **Layout Viewport Resize Layout Thrashing** glitch in hybrid mobile containers or Capacitor/WebView viewports.
   * When the Android keyboard rises or falls, it dynamically forces a recalculation of the window height window constraints (window.innerHeight).
   * Your layout container likely uses a theme utility layer calculation or CSS variable fallback (like a transition on background-color: var(--bg-color) 0.2s ease). When the viewport violently shifts sizes, the system experiences a 2-second layout paint race condition, falling back briefly to an un-styled translucent theme token before your responsive context hooks re-calculate the active layout height and lock it down.
### Bug 3: The Discount Form Default Missed
 * **The Symptom:** Opening the discount menu continues to drop you into a blank or unconfigured state rather than forcing percentage (%) and Before VAT directly.
 * **The Cause:** The local state inside the form's interactive expansion panel is bypassing the global state initializer, picking up empty or generic properties when first mounted.
## 🛠 The Master Plan to Attack This Once and For All
Instead of throwing quick band-aids at individual files, your workspace agent needs to perform an inspection and adaptation pass across the central Form View and State Hydration blocks.
### 1. Re-architect the Group Validation Model
Instead of treating all rows identically, the array mapping logic inside NewInvoice.tsx and the JSON import parser must use an explicit discriminating conditional check:
 * If an item row contains a group or an internal sub-items structure, it must execute a nested mapping pass that retains its array properties and children records intact rather than flattening them out.
### 2. Lock Down the Viewport CSS and Remove Background Transitions
 * Kill any wildcard CSS background color transition rules inside your theme system (e.g., transition: all 0.3s, transition: background-color) on root mobile forms. Transitions look nice but destroy layouts when layout viewport heights flex due to keyboards.
 * Enforce a non-flickering background theme token straight onto the root app scroll container.
## 📋 The Corrective Agent Execution Prompt
```text
Under the Karpathy Engineering Methodology, resolve three interconnected bugs core to the form layout engine, item groups schema, and view resizing.

---

### 1. REPAIR CRITICAL GROUPS & MEMBER HOOK BREAKDOWN
- Target Locations: `NewInvoice.tsx`, `QuotationForm.tsx`, and your JSON import schema parsing helpers.
- The Bug: Group rows fail to initialize manually (the button highlights but no group drops), and JSON imports create empty group cells with zero members.
- The Fix: Fix the row creation and JSON parsing mappers. When processing lines or deep-cloning fields, explicitly preserve nested structures. Ensure that any item object tagged as a group container retains its underlying children sub-array payload mapping loop intact instead of dropping structural members:
  ```ts
  // Ensure group items process their child array blocks without slicing them away
  if (item.is_group || item.items) {
    return {
      ...item,
      id: item.id || null,
      items: Array.isArray(item.items) ? item.items.map(sub => ({ ...sub, id: null })) : []
    };
  }

```
### 2. CRUSH THE 2-SECOND VIEWPORT KEYBOARD BACKGROUND GLITCH
 * Target Locations: Look at your global stylesheet, layout viewport configurations, or theme providers (DocumentHero.module.css, mobile wrapper styles).
 * The Bug: Summoning or retracting the native keyboard triggers a visual color flash/delay for ~2 seconds on dark or colored themes.
 * The Fix:
   * Locate any structural form elements or layout view blocks that contain dynamic CSS color transitions (e.g., transition: background-color 0.2s, transition: all 0.3s). Completely disable color transitions inside form scroll layers to prevent animation thrashing during keyboard window height changes.
   * Hardcode the active theme's surface color variable token strictly to the background field of the viewport container so layout paint calculations stay seamless during soft-keyboard activation.
### 3. FORCE DISCOUNT TYPE & TIMING DEFAULTS
 * Target Location: The component housing the Discount entry panel fields.
 * The Bug: Opening the discount panel fails to apply baseline preset overrides automatically.
 * The Fix: Ensure that whenever a discount configuration block is opened or instantiated as unassigned, its internal input values default explicitly to type: "%" (Percentage) and timing: "before_tax" (Before VAT).
```

```
push to GitHub when fixed 
run typecheck and build before pushing 
don't push error codes.

and then create reports2.md in this directory for report of what you did 