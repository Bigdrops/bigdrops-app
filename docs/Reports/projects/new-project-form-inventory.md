# NewProject — Full Form Inventory

This report was written by Buffy (OpenCode) on 2026-07-27 via Local Runner.

**Source file:** `src/pages/NewProject.tsx`
**Domain types:** `src/domain/projects.ts`
**DB migration:** `supabase/migrations/20260520090001_projects.sql`

---

## 1. Form Structure Overview

The form is a single-column centered layout inside a `max-w-[600px]` container. A `<Card>` wraps all fields with a `CardHeader` (title + description) and `CardContent`. Two action buttons sit below the card. There is no `beforeunload` dirty tracking. The form always creates a new project — there is no edit mode on this page.

**No props.** The page is a route-level component called from `AppShell.tsx` (line 189): `<Route path="/projects/new" element={withBoundary(<NewProject />)} />`.

**Prefill from location state:**
```ts
const prefill = (location.state as { clientId?: string; clientName?: string }) || {}
```
Used by `ClientSelector` — when navigating from a client workspace, the client is pre-selected.

---

## 2. Section-by-Section Inventory

### SECTION: Form Header

| Element | Content | Location |
|---------|---------|----------|
| CardTitle | "New Project" (text-xl, font-extrabold) | Line ~68 |
| CardDescription | "Create a project tree for a job or contract" (text-[13px]) | Lines ~69–71 |

---

### SECTION: Project Name

| Property | Value |
|----------|-------|
| **Label** | "Project Name *" |
| **Control** | `<Input>` with `pageFormFieldClassName` |
| **State** | `form.name` |
| **Placeholder** | "e.g. Transformer Maintenance – Dangote Cement" |
| **autoFocus** | Yes |
| **Validation** | Required — `if (!form.name.trim())` shows `feedback.error('Project name required', ...)` (line ~97) |
| **Write-back** | `set('name', e.target.value)` |

---

### SECTION: Client

| Property | Value |
|----------|-------|
| **Label** | "Client" |
| **Control** | `<ClientSelector>` component |
| **State** | `form.client_id`, `form.client_name` |
| **Prefill** | From `prefill.clientId` / `prefill.clientName` (from location state) |
| **Change handler** | `onClientChange={(id, name) => { set('client_id', id); set('client_name', name || '') }}` |
| **Required** | No — client is optional on creation |

---

### SECTION: Start Date

| Property | Value |
|----------|-------|
| **Label** | "Start Date" |
| **Control** | `<Input type="date">` with `pageFormFieldClassName` |
| **State** | `form.start_date` |
| **Hint** | "Auto-set to today. Edit if the job started earlier." |
| **Default** | `new Date().toISOString().split('T')[0]` |
| **Required** | No (default provided) |

---

### SECTION: Project Value (₦)

| Property | Value |
|----------|-------|
| **Label** | "Project Value (₦)" |
| **Control** | Naira-prefix wrapper + `<NumericInput>` with `min={0}` |
| **State** | `form.project_value` |
| **Placeholder** | "Optional" |
| **Default** | `null` |
| **Required** | No |

---

### SECTION: Site / Location

| Property | Value |
|----------|-------|
| **Label** | "Site / Location" |
| **Control** | `<Input>` with `pageFormFieldClassName` |
| **State** | `form.location` |
| **Placeholder** | "e.g. Block B, Dangote Cement Plant, Ibese" |
| **Required** | No |

---

### SECTION: P.O. Number

| Property | Value |
|----------|-------|
| **Label** | "P.O. Number" |
| **Control** | `<Input>` with `pageFormFieldClassName` |
| **State** | `form.po_number` |
| **Placeholder** | "Optional — can be added later" |
| **Required** | No |

---

### SECTION: Status

| Property | Value |
|----------|-------|
| **Label** | "Status" |
| **Control** | `<Select>` via shadcn Select component |
| **State** | `form.status` |
| **Default** | `'active'` |
| **Options** | `active` → "Active", `completed` → "Completed", `on_hold` → "On Hold", `cancelled` → "Cancelled" |
| **Required** | No (default provided) |

---

### SECTION: Notes

| Property | Value |
|----------|-------|
| **Label** | "Notes" |
| **Control** | `<Textarea>` with custom className |
| **State** | `form.notes` |
| **Placeholder** | "Optional internal notes about this project" |
| **Required** | No |
| **Min height** | `min-h-20` |

---

## 3. Buttons

| Button | Type | Action | Style | Location |
|--------|------|--------|-------|----------|
| **Cancel** | `variant="outline"` | `navigate('/projects')` | `h-10 flex-1 rounded-lg ... text-slate-600` | Line ~149 |
| **Create Project** | Primary action | `handleSave()` | `pageFormPrimaryActionClassName flex-[2] hover:opacity-90` | Lines ~153–160 |
| | | | | |
| **Create Project (loading)** | Disabled with spinner | `loading={saving}` | Same as above | Shows "Creating..." text |

---

## 4. State Summary

| State Variable | Type | Initial Value | Purpose |
|---------------|------|---------------|---------|
| `saving` | `boolean` | `false` | Save in progress — disables button and shows spinner |
| `form` | `ProjectFormState` | Default object | All form field values |

### ProjectFormState interface

| Field | Type | Initial Value | Source |
|-------|------|---------------|--------|
| `name` | `string` | `''` | User input |
| `client_id` | `string \| null` | `prefill.clientId \|\| null` | ClientSelector or location state |
| `client_name` | `string` | `prefill.clientName \|\| ''` | ClientSelector or location state |
| `status` | `string` | `'active'` | Select field |
| `project_value` | `number \| null` | `null` | NumericInput |
| `po_number` | `string` | `''` | Text input |
| `notes` | `string` | `''` | Textarea |
| `location` | `string` | `''` | Text input |
| `start_date` | `string` | `new Date().toISOString().split('T')[0]` | Date input (defaults today) |

---

## 5. Effects

| Effect | Trigger | Behavior |
|--------|---------|----------|
| None | — | No useEffect calls in the component |

---

## 6. Validation Rules (in handleSave, lines ~97–101)

| Condition | Error Message |
|-----------|---------------|
| `!form.name.trim()` | `feedback.error('Project name required', { description: 'Project name is required' })` |

**No other validation.** Client, date, status all pass without validation.

---

## 7. Save Behavior (handleSave, lines ~96–135)

On save:
1. **Validate:** Checks `form.name.trim()` is non-empty
2. **Generate code:** Calls `createProjectWithGeneratedCode(supabase, payload, maxRetries=2, prefix)` from `src/domain/projects.ts`
3. **Code generation logic** (in `projects.ts`):
   - `generateNextProjectCode()` queries `projects` table with `ILKE 'PRJ-YYYY-%'`, finds max sequence number, returns `PRJ-YYYY-NNN`
   - `createProjectWithGeneratedCode()` loops up to `maxRetries` (3 attempts):
     - Generates a project code
     - Attempts INSERT
     - If error code `23505` (unique violation) mentioning `project_code`, retries
     - Otherwise returns the error immediately
4. **On success:**
   - Constructs payload: `{ name, client_id, client_name, status, start_date, project_value, po_number, notes, location }` — trims all strings, nullifies empty strings
   - **Audit trail** (fire-and-forget via dynamic import):
     ```ts
     const { recordAuditLog, PROJECT_TRACKED_FIELDS } = await import('@/lib/audit')
     await recordAuditLog({
       entityType: 'project',
       recordId: data.id,
       entityLabel: data.name,
       action: 'CREATE',
       oldData: null,
       newData: data,
       trackedFields: PROJECT_TRACKED_FIELDS,
     })
     ```
   - **Navigation:** `navigate(`/projects/${data.id}`)` — redirects to the detail page
5. **On error:** Shows `feedback.error('Create failed', { description: getUserFacingMutationMessage(error, ...) })`

**No cache invalidation** is called in the form itself (contrast with WaybillForm which invalidates list cache).

---

## 8. DB Schema vs Form Mapping

| DB Column | Type | Required DB | Form Field | Notes |
|-----------|------|-------------|------------|-------|
| `id` | `uuid` | Yes (auto) | — | Auto-generated |
| `name` | `character varying` | Yes | `form.name` | Mapped, validated |
| `client_id` | `uuid` (FK → clients) | No | `form.client_id` | Optional in form |
| `client_name` | `character varying` | No | `form.client_name` | Optional in form |
| `status` | `character varying` | No (default `'active'`) | `form.status` | Defaults to 'active' |
| `start_date` | `date` | Yes (default `CURRENT_DATE`) | `form.start_date` | Always has value |
| `project_value` | `numeric` | No | `form.project_value` | Optional |
| `po_number` | `character varying` | No | `form.po_number` | Optional |
| `notes` | `text` | No | `form.notes` | Optional |
| `location` | `character varying` | No | `form.location` | Optional |
| `project_code` | `text` | Yes (UNIQUE) | — | Auto-generated |
| `created_at` | `timestamptz` | No (default `now()`) | — | Auto |
| `archived_at` | `timestamptz` | No | — | Not set on create |
| `created_by` | `uuid` | No | — | Auto via trigger? |
| `updated_by` | `uuid` | No | — | Auto via trigger? |
| `updated_at` | `timestamptz` | Yes (default `now()`) | — | Auto |
| `scope_type` | `text` | No (default `'app'`) | — | DB default only |

**Notable:** The DB has `scope_type` and `archived_at` columns that are never set from the form UI.

---

## 9. Known Issues / Inconsistencies

| Issue | Description | File:Line |
|-------|-------------|-----------|
| No dirty tracking | No `beforeunload` warning if user navigates away with unsaved data | `NewProject.tsx` |
| No cache invalidation | `invalidateListCache` is not called after creating a project. The list page (`Projects.tsx`) does cache invalidation only via its own `invalidateListCache('bd:list:projects:v1:all')` call on delete/archive | `NewProject.tsx` lines ~122–128 |
| `supabase as any` type cast | `createProjectWithGeneratedCode` receives `supabase as any` — type mismatch between generated client and the hand-typed `supabaseClient` parameter shape | `NewProject.tsx` line ~101 |
