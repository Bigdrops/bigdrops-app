# Bolu AI Infrastructure Screen Audit & Redesign Proposal

This report was written by Antigravity on 2026-11-21 via Antigravity Agent Harness.

---

## 1. Objective

To audit the current architecture, layout, data flows, card nesting, and touch ergonomics of the Bolu AI Infrastructure settings screen (`/settings?section=bolu-provider`), and to propose three structured redesign options that resolve mobile overcrowding, eliminate nested cards, and conform to the four-class Responsive UI Design Standard.

---

## 2. Scope

- **Inspected Files:**
  - `src/pages/Settings.tsx`
  - `src/pages/settings/settings-config.ts`
  - `src/pages/settings/BoluProviderSettingsSection.tsx`
  - `src/pages/settings/bolu-provider/ConnectionCard.tsx`
  - `src/pages/settings/bolu-provider/ModelsManagerSection.tsx`
  - `src/pages/settings/bolu-provider/BoluInteractionPreferencesCard.tsx`
  - `src/pages/settings/bolu-provider/AiUsagePanel.tsx`
  - `src/pages/settings/bolu-provider/CatalogueGrid.tsx`
  - `src/pages/settings/bolu-provider/ConnectionDialog.tsx`
  - `src/components/settings/SettingsShell.tsx`
  - `src/components/ui/tabs.tsx`
- **Provided Evidence:** Five mobile device screenshots (`media_1795249588431_4695e970.jpg`, `media_1795249588368_74f68290.jpg`, `media_1795249588368_c3c36e0d.jpg`, `media_1795249588373_1989c797.jpg`, `media_1795249588378_3eecd35e.jpg`).
- **Files Changed:** None (Audit and Proposal only).
- **Prohibited Actions:** No source code edited, no Git commits, no stash, no reset, no `bun run build`. Prohibited Claude `frontend-design` skill was NOT loaded.
- **Skills Used:**
  - `tailwind-capacitor` (`.agents/skills/tailwind-capacitor/SKILL.md`) from `docs/PROJECTSKILLINDEX.md` for mobile touch target rules (44px min), mobile safe areas, and layout ergonomics.
  - `modern-web-guidance` (`.agents/skills/modern-web-guidance/SKILL.md`) for DOM structure and accessibility.
  - Approved component libraries referenced: `bigdrops-free`, `kinetics`, `water-melon`.
- **Documentation Standard:** ASD-STE100 Simplified Technical English.

---

## 3. Executive Summary

The Bolu AI Infrastructure console currently renders nine disparate sections in a single continuous vertical stack. This design produces three major usability and architectural defects on mobile devices:
1. **Extreme Vertical Length & Scroll Clutter:** The combined page exceeds 4,000 vertical pixels on mobile screens, requiring extensive scrolling through heterogeneous domains (runtime metrics, credentials, model toggles, logs, chat haptics, usage charts, and provider directories).
2. **Deep Card Nesting (Up to 4 Levels):** Cards are placed inside cards, which are placed inside accordions, which contain scrollable sub-panels with individual badge chips. This wastes horizontal margin space and induces inner scroll-jacking on touch screens.
3. **Data Scope Pollution & Permission Misalignment:** The `BoluInteractionPreferencesCard` (haptics, speech rate, read aloud) is a client-side device preference stored in `localStorage`. However, it is embedded within an enterprise infrastructure page guarded by `adminOnly: true` (`settings-config.ts:122`). As a result, non-admin users cannot configure their personal device voice or haptics.

---

## 4. Section Audit Table

The table below catalogs every section rendered on the page, its file and line location, underlying data source, data scope, and maximum card nesting depth.

| # | Section Name | File & Lines | Data Source | Data Scope | Max Nesting Depth | Relocation Feasibility |
|---|---|---|---|---|:---:|---|
| 1 | **Header & Top Actions** | `BoluProviderSettingsSection.tsx:285–322` | Local UI state (`refreshing`, `dialogOpen`) | Admin / Session | 0 | Stays with infrastructure page header |
| 2 | **Vault Migration Pending Banner** | `BoluProviderSettingsSection.tsx:324–334` | `status.schemaReady` via `/api/bolu-provider-config` | Organization / Database | 0 | Stays with infrastructure page |
| 3 | **Live Runtime & Pool Status** | `BoluProviderSettingsSection.tsx:336–416` | `status.runtime` & `status.poolSummary` | Organization / Server | **2** | Can move to an "Overview" or "Status" view |
| 4 | **Saved Connections** | `BoluProviderSettingsSection.tsx:418–460`, `ConnectionCard.tsx:1–392` | `status.connections` from `app_ai_provider_connections` | Organization / Server | **3** | Can move to a dedicated "Connections" view |
| 5 | **Models Visibility Manager** | `BoluProviderSettingsSection.tsx:463–469`, `ModelsManagerSection.tsx:1–406` | `connections[].discoveredModels` & `allowedModels` | Organization / Server | **4** | Can move to a dedicated "Models" view |
| 6 | **Recent Routing Activity** | `BoluProviderSettingsSection.tsx:472–510` | `status.routingEvents` from `app_ai_routing_events` | Organization / Server | **2** | Can move to an "Activity & Logs" view |
| 7 | **Chat Interaction Preferences** | `BoluInteractionPreferencesCard.tsx:1–160` | `localStorage('bolu_interaction_preferences')` | **Device-Only** | **3** | **Can move immediately** to `Preferences` (`SETTINGS_GROUPS.preferences`) without backend dependencies |
| 8 | **AI Usage & Leaderboard** | `AiUsagePanel.tsx:1–286` | Supabase API `/api/ai-usage` | Organization / Server | **2** | Can move to an "Activity & Usage" view |
| 9 | **Curated Provider Catalogue** | `CatalogueGrid.tsx:1–66` | Static `PROVIDER_CATALOGUE` list | Organization / Directory | **1** | Can move to "Add Connection" modal or Connections tab |
| 10 | **Connection Dialog** | `ConnectionDialog.tsx:1–600` | Local modal form state -> `/api/bolu-provider-config` | Organization / Server | Modal | Retained as modal dialog for creation/editing |

*Note: Nesting Depth 0 = flat element; 1 = outer card container; 2 = card inside card; 3 = card inside card inside card; 4 = card inside card inside card inside card.*

---

## 5. Detailed Card Nesting Analysis

### Level 1 Containers (Outer Cards)
- `Live Runtime & Pool`: `rounded-xl border border-bd-border bg-bd-surface p-4 shadow-sm` (`BoluProviderSettingsSection.tsx:337`).
- `ConnectionCard`: `rounded-xl border bg-bd-surface p-3.5 sm:p-4 shadow-sm` (`ConnectionCard.tsx:149`).
- `ModelsManagerSection`: `rounded-xl border border-bd-border bg-bd-surface p-4 shadow-sm` (`ModelsManagerSection.tsx:205`).
- `Recent Routing Activity`: `Collapsible` with `rounded-xl border border-bd-border bg-bd-surface p-4` (`BoluProviderSettingsSection.tsx:473`).
- `Chat Interaction`: `rounded-2xl border border-bd-border bg-card p-4 sm:p-5` (`BoluInteractionPreferencesCard.tsx:58`).
- `AiUsagePanel`: `Collapsible` with `rounded-xl border border-bd-border bg-bd-surface p-4` (`AiUsagePanel.tsx:123`).

### Level 2 Containers (Cards Inside Cards)
- Inside `Live Runtime & Pool`:
  - "Active Provider" tile: `rounded-lg border border-bd-border bg-bd-surface-muted px-3.5 py-2.5` (`BoluProviderSettingsSection.tsx:344`).
  - "Routing Pool Status" tile: `rounded-lg border border-bd-border bg-bd-surface-muted px-3.5 py-2.5` (`BoluProviderSettingsSection.tsx:364`).
- Inside `ConnectionCard`:
  - Telemetry & Priority bar: `rounded-lg border border-bd-border/70 bg-bd-surface-muted/60 px-3 py-2` (`ConnectionCard.tsx:207`).
  - Diagnostics error box: `rounded-lg border border-bd-status-danger-border bg-bd-status-danger-bg px-3 py-2` (`ConnectionCard.tsx:286`).
- Inside `ModelsManagerSection`:
  - Connections accordion wrapper: `rounded-lg border border-bd-border overflow-hidden bg-bd-surface` (`ModelsManagerSection.tsx:235`).
- Inside `BoluInteractionPreferencesCard`:
  - Each `PreferenceRow`: `rounded-xl border border-bd-border/70 px-3 py-2.5` (`BoluInteractionPreferencesCard.tsx:25, 114`).
- Inside `AiUsagePanel`:
  - Daily consumption container: `rounded-lg border border-bd-border/60 bg-bd-surface-muted p-2.5` (`AiUsagePanel.tsx:167`).
  - User leaderboard rows: `rounded-md border border-bd-border/50 bg-bd-surface-muted px-2.5 py-1.5` (`AiUsagePanel.tsx:196`).

### Level 3 Containers (Cards Inside Cards Inside Cards)
- Inside `ConnectionCard`:
  - When diagnostics run, `DiagnosticsNote` renders an inner callout box (`DiagnosticsNote.tsx:18–80`).
- Inside `ModelsManagerSection`:
  - Expanded connection body: `border-t border-bd-border/50 bg-bd-surface-muted/20 px-3.5 py-2.5` (`ModelsManagerSection.tsx:305`).
- Inside `BoluInteractionPreferencesCard`:
  - Segmented control button group: `inline-flex rounded-lg border border-bd-border bg-muted p-0.5` (`BoluInteractionPreferencesCard.tsx:125`).

### Level 4 Containers
- Inside `ModelsManagerSection`:
  - The inner scrollable models container: `max-h-[320px] overflow-y-auto rounded-md border border-bd-border/50 bg-bd-surface` (`ModelsManagerSection.tsx:352`), hosting individual model items with nested badge chips (`lines 371, 376`).

---

## 6. Touch Targets and Non-Token Styles Audit

### Touch Target Deficiencies (Violations of 44px Minimum Standard)
- **Priority Stepper Buttons (`ConnectionCard.tsx:227, 237`):** Class `h-5 w-5 p-0` (20×20px). Extremely small on mobile screens and difficult to tap accurately.
- **Balance Sync Button (`ConnectionCard.tsx:260`):** Class `h-5 px-1.5 text-[10px]` (20px height).
- **Connection Action Buttons (`ConnectionCard.tsx:297, 308, 320, 331, 356`):** Class `h-7` (28px height). Below the 44px minimum target requirement defined in `tailwind-capacitor`.
- **Catalogue Connect Buttons (`CatalogueGrid.tsx:37`):** Class `h-7` (28px height).

### Hardcoded Non-Token Colors
- `BoluProviderSettingsSection.tsx:368`: `text-purple-500` (Routing Pool icon).
- `BoluProviderSettingsSection.tsx:385`: `text-emerald-500` (Shield check icon).
- `ConnectionCard.tsx:182`: `border-purple-500/20 bg-purple-500/10 text-purple-600` (Pool badge).
- `ConnectionCard.tsx:251`: `text-amber-500` (Coin balance icon).
- `ModelsManagerSection.tsx:314, 371`: `text-emerald-600 dark:text-emerald-400`, `bg-emerald-500/10` (Auto-enable Free button and Free badge).

---

## 7. Router and Navigation Architecture Analysis

### Current Settings Structure
1. **Routing Mechanism:**
   - Declared in `src/pages/Settings.tsx` using `useSearchParams()` with key `?section=<section-id>`.
   - Sections are configured in `src/pages/settings/settings-config.ts` (`ActiveSectionId`).
   - `BoluProviderSettingsSection` is loaded when `active === 'bolu-provider'`.
2. **Desktop vs. Mobile Shell (`SettingsShell.tsx`):**
   - On Desktop (≥1024px): A two-pane layout with navigation on the left (`su-pane-nav`) and section content on the right (`su-pane-detail`).
   - On Mobile (<1024px): Stack navigation. Selecting a section transitions from the navigation menu to the detail view (`data-subpage={true}`).
   - Header provides a back button (`su-backbtn` calling `onBack` or `setActiveSection(null)`).
3. **Sub-Page Navigation Precedent (`TeamSettingsSection`):**
   - In `AdminSettingsSection.tsx:228`, tapping "Roles & Permissions" toggles `showRoles = true`.
   - `SettingsShell` receives `detailTitle="Roles & Access"` and `onBack={() => setShowRoles(false)}`.
   - This proves the application already possesses a native drill-down sub-page mechanism.
4. **Tabs Precedent:**
   - Radix UI / shadcn `Tabs` (`@/components/ui/tabs`) with `TabsList`, `TabsTrigger`, and `TabsContent` is available in the project and provides standard, accessible tabbed switching.

---

## 8. Redesign Proposals

### Option A: Top Tabs Hub (Recommended)

#### Concept
Partition the Bolu AI Infrastructure console into four focused tabs located beneath the section header:
1. **Overview:** Runtime status, active provider, routing pool health, and quick provider catalogue.
2. **Connections:** Saved connections list, connection controls, priority ranking, and test diagnostics.
3. **Models:** Searchable model picker manager, provider discovery, and model visibility toggles.
4. **Activity & Usage:** Real-time routing events, token totals, daily chart, and user leaderboard.

**Chat Interaction Relocation:** Move `BoluInteractionPreferencesCard` to `SETTINGS_GROUPS.preferences` under a new section (`bolu-interaction` / "Bolu Voice & Feedback") or inside `SoundSettingsSection`. This removes client preferences from admin infrastructure and allows all users to configure their speech rate.

#### Mobile Text Wireframe (Mobile / Fold Closed)
```
+------------------------------------------+
| [<] Bolu AI Infrastructure        (Moon) |
+------------------------------------------+
| Multi-account priority routing           |
| [ Refresh ] [ + Add Connection ]         |
+------------------------------------------+
| [Overview] [Connections] [Models] [Logs] | <- Horizontal scrollable tablist
+------------------------------------------+
| TAB: OVERVIEW                            |
|                                          |
| [ RUNTIME & ROUTING POOL ]               |
| Active: Bouxre (P1) · cohere/north-mini  |
| Pool: 8 in pool · 5 healthy · 1 cooldown |
| Failover: Atomic claim with bounded fail |
|                                          |
| [ CURATED PROVIDER DIRECTORY ]           |
| + OpenRouter (Connected)   [ Connect ]   |
| + OpenAI     (Connected)   [ Connect ]   |
| + Anthropic  (Connected)   [ Connect ]   |
| + Google     (Connected)   [ Connect ]   |
+------------------------------------------+
```

#### Evaluation across Four Viewport Classes
- **Mobile / Fold Closed (320px–412px):**
  - *Pros:* Drastically reduces page height; zero scroll-jacking; users focus on one task at a time; clean horizontal tab bar.
  - *Cons:* Requires tapping tabs to view disparate sections.
  - *Status:* **Inferred** (responsive CSS logic evaluated).
- **Fold Open (540px–720px):**
  - *Pros:* Tab bar fits without scrolling; 2-column layout inside tabs provides balanced density.
  - *Cons:* None identified.
  - *Status:* **Inferred**.
- **Tablets (768px–1024px):**
  - *Pros:* Excellent information density; connections display in 2 columns; usage charts render with full horizontal fidelity.
  - *Cons:* None identified.
  - *Status:* **Inferred**.
- **Desktop (1024px+):**
  - *Pros:* Fits naturally inside `SettingsShell`'s right detail pane; tabs eliminate infinite page scrolling on workstation monitors.
  - *Cons:* None identified.
  - *Status:* **Inferred**.

#### Migration Effort & Files Affected
- **Effort:** Medium.
- **Files Affected:**
  - `src/pages/settings/BoluProviderSettingsSection.tsx` (wrap sections in `Tabs` / `TabsContent`).
  - `src/pages/settings/settings-config.ts` (add `bolu-interaction` to `preferences` group).
  - `src/pages/Settings.tsx` (render `BoluInteractionPreferencesCard` for `active === 'bolu-interaction'`).
  - `src/pages/settings/bolu-provider/ConnectionCard.tsx` (expand touch targets to 44px min).

---

### Option B: Streamlined Single Scroll with Flat Sections & Memory Collapsibles

#### Concept
Keep the single-page URL and vertical sequence, but completely eliminate nested cards. Replace outer card containers with flat section headers, subtle full-bleed dividers (`border-t border-bd-border`), and borderless rows. Convert Models, Activity, and Usage into top-level accordions that remember their open/closed state in `localStorage`. Expand containers into standard document flow rather than using `max-h` scroll-traps.

#### Mobile Text Wireframe (Mobile / Fold Closed)
```
+------------------------------------------+
| [<] Bolu AI Infrastructure        (Moon) |
+------------------------------------------+
| RUNTIME & POOL                           |
| Active Provider: Bouxre (P1)             |
| Pool Health: 8 in pool · 5 healthy       |
|------------------------------------------|
| SAVED CONNECTIONS (8)                    |
| Bouxre (OpenRouter)              P1 [v]  |
| sk-...8a95 · 45s timeout                 |
| [ Test (44px) ] [ Models ] [ Edit ]      |
|------------------------------------------|
| AMD Token Factory                P2 [v]  |
| sk-...1104 · 30s timeout                 |
| [ Test (44px) ] [ Models ] [ Edit ]      |
|------------------------------------------|
| [>] MODELS VISIBILITY (24 active)        |
|------------------------------------------|
| [>] ROUTING ACTIVITY LOGS (20)           |
|------------------------------------------|
| [>] AI CONSUMPTION & LEADERBOARD         |
|------------------------------------------|
| [>] PROVIDER CATALOGUE (10 providers)    |
+------------------------------------------+
```

#### Evaluation across Four Viewport Classes
- **Mobile / Fold Closed:**
  - *Pros:* Familiar single scroll; removing card nesting reclaims ~32px of horizontal screen width.
  - *Cons:* When multiple sections are opened simultaneously, the page remains very long.
  - *Status:* **Inferred**.
- **Fold Open:**
  - *Pros:* Clean list presentation with good contrast.
  - *Cons:* Single column feels narrow on square-aspect foldables.
  - *Status:* **Inferred**.
- **Tablets:**
  - *Pros:* Wide tables render comfortably.
  - *Cons:* Lacks layout modularity.
  - *Status:* **Inferred**.
- **Desktop:**
  - *Pros:* Fast vertical scanning if accordions are open.
  - *Cons:* High vertical scroll fatigue.
  - *Status:* **Inferred**.

#### Migration Effort & Files Affected
- **Effort:** Low to Medium.
- **Files Affected:**
  - `src/pages/settings/BoluProviderSettingsSection.tsx`
  - `src/pages/settings/bolu-provider/ConnectionCard.tsx`
  - `src/pages/settings/bolu-provider/ModelsManagerSection.tsx`

---

### Option C: Master-Detail Drill-Down Sub-Page Navigation

#### Concept
Emulate mobile-native iOS/Android Settings patterns. The main `/settings?section=bolu-provider` becomes a concise **Menu Directory** displaying high-level status summaries. Tapping any item pushes a full-screen sub-page with a top bar back arrow, utilizing `SettingsShell`'s existing `detailTitle` and `onBack` pattern.

Menu Directory Items:
1. **Runtime & Pool:** Overview metrics, active LLM, failover policies.
2. **Connections:** Full management screen for connections, API keys, and priority ranks.
3. **Models Manager:** Dedicated model picker search, toggles, and discovery.
4. **Logs & Telemetry:** Dedicated full-screen usage charts, user leaderboard, and routing events.

#### Mobile Text Wireframe (Mobile / Fold Closed)
```
MAIN DIRECTORY:
+------------------------------------------+
| [<] Bolu AI Infrastructure        (Moon) |
+------------------------------------------+
| Enterprise inference routing & telemetry |
|                                          |
| [ Runtime & Pool Status             > ]  |
|   Active: Bouxre (P1) · 8 in pool        |
|                                          |
| [ Connections (8)                   > ]  |
|   Manage keys, priority & balances       |
|                                          |
| [ Model Picker Manager              > ]  |
|   24 models enabled across 8 accounts    |
|                                          |
| [ Usage, Leaderboard & Logs         > ]  |
|   46 requests · 113.5K tokens            |
|                                          |
| [ Curated Provider Catalogue        > ]  |
|   Connect new upstream AI accounts       |
+------------------------------------------+

SUB-PAGE (WHEN TAPPING "CONNECTIONS"):
+------------------------------------------+
| [<- Back] Connections (8)         (Moon) |
+------------------------------------------+
| [ + Add Connection (44px) ]              |
|                                          |
| [ Bouxre ]                       Primary |
| OpenRouter · P1 · Pool Enabled           |
| [ Test ] [ Models ] [ Edit ] [ Trash ]   |
|                                          |
| [ AMD Token Factory ]             Pool 2 |
| Custom · P10 · Pool Enabled              |
| [ Test ] [ Models ] [ Edit ] [ Trash ]   |
+------------------------------------------+
```

#### Evaluation across Four Viewport Classes
- **Mobile / Fold Closed:**
  - *Pros:* Superior mobile-native experience; zero cognitive overload; zero nested cards; maximum vertical and horizontal space for complex tables.
  - *Cons:* Requires navigation transitions to view data across categories.
  - *Status:* **Inferred**.
- **Fold Open:**
  - *Pros:* Dedicated sub-screens utilize the square foldable aspect cleanly.
  - *Cons:* Extra navigation steps compared to side-by-side tabs.
  - *Status:* **Inferred**.
- **Tablets:**
  - *Pros:* Sub-pages look like clean tablet settings panes.
  - *Cons:* Underutilizes tablet canvas unless combined with a split-view.
  - *Status:* **Inferred**.
- **Desktop:**
  - *Pros:* Works via `SettingsShell`.
  - *Cons:* Feels overly fragmented on large monitors where users expect to see status and controls together.
  - *Status:* **Inferred**.

#### Migration Effort & Files Affected
- **Effort:** High.
- **Files Affected:**
  - `src/pages/Settings.tsx`
  - `src/pages/settings/BoluProviderSettingsSection.tsx`
  - Component decoupling into standalone sub-page views.

---

## 9. Final Recommendation

### Selected Option: **Option A (Top Tabs Hub)**

### Justification
1. **Best Balance Across All Viewports:** Option A provides clean, scroll-free mobile ergonomics while remaining dense and productive on desktop workstations. It avoids the fragmentation of Option C on wide monitors and eliminates the scroll fatigue of Option B on mobile devices.
2. **Reuses Approved App Primitives:** It leverages the existing `@/components/ui/tabs` primitive already present in the codebase, requiring no changes to the outer router or `SettingsShell` architecture.
3. **Resolves Architectural Scope Leak:** Relocating `BoluInteractionPreferencesCard` to `SETTINGS_GROUPS.preferences` restores proper multi-user access for non-admin team members and immediately removes 4 nested rows from the infrastructure console.
4. **Enforces Maximum 1-Level Card Nesting:** By separating Models, Connections, and Activity into distinct tabs, each view can be flattened into a single-level card container with clean borderless list rows.
5. **Touch Target Compliance:** All interactive buttons (`Test`, `Models`, `Edit`, `Pool toggle`, and `Priority steppers`) can be upgraded to standard 44px min touch targets without crowding adjacent controls.

---

## 10. Status & Next Steps

- **Status:** **Completed** (Step 1 audit and proposals complete; no source files edited).
- **Next Steps:** Await user selection and approval of Option A, B, or C before beginning Step 2 implementation.
