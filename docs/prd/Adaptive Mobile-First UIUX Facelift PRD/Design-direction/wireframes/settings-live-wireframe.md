# Settings - Forensic Wireframe Specification

This report was written by Muse Spark on 2026-09-06 via OpenCode.

---

## 1. Page Identity

| Property | Value |
|---|---|
| Page name | Settings |
| Route entry | `/settings` → `Settings.tsx` |
| Shell | `SettingsShell` (`src/components/settings/SettingsShell.tsx`) |
| Nav config | `settings-config.ts` (4 groups, 17 sections) |
| Nav component | `SettingsNav` (sidebar variant + list variant) |
| State | `activeSection: ActiveSectionId \| null`, section-level local state |
| Toasts | `feedback` + per-section `onToast`, inline error blocks |
| Loading | `SettingsLoadingState`, per-section skeletons/spinners |

---

## 2. Navigation Model

### Mobile (< 768px)

Grouped iOS-style list. Four group headings (Account, Workspace, Preferences, System). Each row shows an icon tile, label, and chevron. Tapping a row drills into the section view. No section preselected on entry.

### Tablet (768–1200px) and Desktop (1200px+)

Sidebar plus content. Sidebar shows grouped nav with icon tiles, labels, and an active indicator line. First section auto-selects on desktop when none is active. Tablet uses a narrower 200px sidebar, desktop 260px.

---

## 3. Complete Section Inventory (in config order)

### Group: Account

| # | Section | Controls and behavior |
|---|---|---|
| 1 | User Profile | Password set/change form (current, new, confirm), device register/hydrate action, navigation links. Writes `profiles`. Toasts on outcome. Inline errors. |
| 2 | Switch Workspace | Current workspace row with name. Tap-to-switch when multiple exist. Single-workspace state is display-only. |

### Group: Workspace

| # | Section | Controls and behavior |
|---|---|---|
| 3 | Company Management | Company list rows with drill-in. Archive company flow with confirm dialog. Archived group with restore actions. |
| 4 | Company Info | Text fields: Legal Business Name, Tagline/Motto, Physical Address, City/State, Phone Number, Official Email. Save persists to settings row. |
| 5 | Logo & Branding | Logo file picker with type and 5MB validation. States: idle, uploading, uploaded-unsaved, saved, error. Upload error line. Save persists URL. |
| 6 | Banking | Bank account list rows. Add/Edit sheet: Bank Name, Account Name, Account Number, Sort Code. Detail rows per account. |
| 7 | Signatories | Signatory list rows. Add/Edit sheet: Full Name, Role/Designation, Signature Image upload with error line. |

### Group: Preferences

| # | Section | Controls and behavior |
|---|---|---|
| 8 | Theme & Appearance | Preset cards with 4-color previews from `SELECTABLE_THEME_PRESETS`. Light/Dark/System mode control. Reset-to-default action writing slate-navy light. Persists preset ID plus mode. |
| 9 | Notifications | Notification preference controls (custom toggles surface, no native inputs). |
| 10 | Dashboard Layout | KPI card manager in a bottom sheet. Toggle cards on/off. |
| 11 | Document Controls | Fillable-writing toggles per document family in a bottom sheet. |
| 12 | Document Prefixes | Per-document prefix text inputs (invoice, quotation, waybill, CSR, letter, others). Save persists. |
| 13 | App Lock | PIN/biometric lock setup. Explainer block (How It Works: Trigger, Verification). Enable/disable flow. |

### Group: System

| # | Section | Controls and behavior |
|---|---|---|
| 14 | Team | Member list with roles. Invite flow (email input, role select, invite dialog, success banner). Remove-member confirm dialog. Ownership transfer dialog. Inline error block. |
| 15 | Devices | Device installation rows (code, name, platform, status, last seen). Per-row code edit inputs with save. Assignment actions. |
| 16 | Archives | Archive Management browser. Archived document rows (number, entity, date). Restore actions. Type filtering across Invoice, Quotation, CSR, Waybill. |
| 17 | Tenant Debug | Read-only diagnostics surface (tenant, schema, readiness flags). No editing controls. |

---

## 4. Shared Patterns (observed, not proposed)

- `SettingsField` labeled field wrapper with label, input, hint, and error slots.
- `SettingsFormPrimitives` shared buttons and layout helpers.
- Section header: title plus description paragraph. No global save bar; each section saves itself.
- Nested surfaces: bottom sheets (Banking, Signatories, Documents, Dashboard), centered dialogs (Team invite/remove/transfer), confirm dialogs (Company archive, Archives restore).
- Feedback: toast on success, inline red error blocks on failure, per-action spinners and disabled states.
- Persistence targets: `settings` row (company, branding, prefixes), `profiles` (password), bank/signatory/device/member tables, theme preference store. No routing changes on save.

---

## 5. Responsive and Mobile Notes

- Single breakpoint system at 768px and 1200px via viewport width state.
- Mobile list rows are 44px-class touch targets with chevrons. Bottom sheets use safe-area padding and swipe/backdrop dismiss.
- Sheets and dialogs reuse the global overlay system. No Settings-specific overlay code.
- Long lists (team, devices, archives) scroll inside the content area. Single scroll owner per view.

---

## 6. Explicit Non-Goals of This Document

- No regrouping, no reordering, no control changes proposed here.
- The redesign candidate is a separate artifact and must preserve every capability listed above.
