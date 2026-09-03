# Settings — Full Page Inventory

This report was written by Buffy (OpenCode) on 2026-07-27 via Local Runner.

**Source file:** `src/pages/Settings.tsx`
**Shell/Nav:** `src/components/settings/SettingsShell.tsx`, `SettingsNav.tsx`, `SettingsSectionFrame.tsx`, `SettingsActionFooter.tsx`, `SettingsSummaryCard.tsx`
**Settings sections:** `src/pages/settings/*.tsx` (14 files), indexed via `src/pages/settings/index.ts`
**Config:** `src/pages/settings/settings-config.ts`
**Types:** `src/pages/settings/settings-types.ts`
**DB migration:** `supabase/migrations/20260520090000_core_tables.sql` (settings table)

---

## 1. Page Structure Overview

The page uses a responsive layout via `SettingsShell`: sidebar + content on desktop (`>1200px`), collapsible sidebar on tablet (`768-1200px`), and drill-down mobile list on `<768px`. The page renders inside `<Layout>` with `hidePageHeader` and `bg-bd-surface` content background.

**Route:** `/settings` (inferred from `Settings.tsx` filename — registered in AppShell)

**Shell behavior:**
- Mobile (<768px): Full-screen list view → tapping an item navigates into a `SettingsSectionFrame` with a back button
- Tablet (768-1200px): 2-column grid `grid-cols-[200px,1fr]` sidebar + content
- Desktop (>1200px): 2-column grid `grid-cols-[260px,1fr]` sidebar + content
- On desktop/tablet, auto-selects the first section on mount if none is active

**Active section tracking:** `active: ActiveSectionId | null` state — null means no section selected (shows "Select a setting to manage" on desktop).

**Admin detection:** Hardcoded email check: `ADMIN_EMAILS = ['jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com']`. If the user's email is in this list, `AdminSettingsSection` and any `adminOnly` items are visible.

---

## 2. Settings Config (settings-config.ts)

### Groups and Items:

| Group | Group Label | Items |
|-------|-------------|-------|
| `account` | Account | `user` — User Profile |
| `workspace` | Workspace | `company` — Company Info, `branding` — Logo & Branding, `banking` — Banking, `signatories` — Signatories |
| `preferences` | Preferences | `theme` — Theme & Appearance, `notifications` — Notifications, `dashboard` — Dashboard Layout, `documents` — Document Controls, `prefixes` — Document Prefixes |
| `system` | System | `archives` — Archives, `admin` — Admin Panel (adminOnly) |

**`buildGroups(isAdmin)`** filters SYSTEM_GROUP items by the `adminOnly` flag and removes empty groups.

### ActiveSectionId options:
`'user' | 'theme' | 'notifications' | 'company' | 'branding' | 'banking' | 'signatories' | 'documents' | 'prefixes' | 'dashboard' | 'archives' | 'admin'`

---

## 3. Responsive Layouts

### Mobile view (SettingsShell, activeSection === null):
```
<header> [SidebarToggleIcon + "Settings" title] [Search icon] </header>
<SettingsNav variant="list" />
<Footer />
```

### Mobile view (activeSection set):
```
<SettingsSectionFrame section={currentSection} showBackButton={true}>
  {renderContent()}
</SettingsSectionFrame>
<Footer />
```

### Tablet/Desktop view:
```
<aside class="sticky top-6">
  <SettingsNav variant="sidebar" />
</aside>
<main>
  {currentSection ? <SettingsSectionFrame>{renderContent()}</SettingsSectionFrame> : <EmptyState />}
  <Footer />
</main>
```

---

## 4. SettingsNav Component

**File:** `src/components/settings/SettingsNav.tsx`

**Props:** `groups, activeSection, onSelect, variant: 'sidebar' | 'list', isTablet`

**Sidebar variant:** Vertical stack with active indicator line on left, icon + label + description truncated. Active item has `bg-bd-surface-muted text-bd-text`.

**List variant:** Full-width items with dividers, chevron arrow on right. Active style uses `bg-bd-button-primary-bg` for icon.

Each item renders:
- Active indicator line (sidebar only)
- Icon in rounded container (active = primary colored, inactive = muted)
- Label + description
- ChevronRight (list variant only)

---

## 5. SettingsSectionFrame Component

**File:** `src/components/settings/SettingsSectionFrame.tsx`

Wraps each section's content with:
- Section header: icon + label + description (with optional back button for mobile)
- Content surface: rounded border on desktop, edge-to-edge on mobile

**Animation:** `animate-in fade-in slide-in-from-right-2 duration-300`

---

## 6. Section-by-Section Inventory

### User Profile Section
**Component:** `UserSettingsSection` — `src/pages/settings/UserSettingsSection.tsx`

**Props:** `session: SettingsSession, onToast: (msg: string) => void`

- Rendered from `src/pages/settings/index.ts`
- **Not inspected** in detail (loaded via barrel export, likely contains user profile editing forms)

### Company Info Section
**Component:** `CompanySettingsSection` — `src/pages/settings/CompanySettingsSection.tsx`

**States:** `form` (CompanyForm), `saving`, `isEditing`, `customInfo` (CustomInfoItem[])

**View mode** displays `SettingsSummaryCard` rows:

| Row | Data Source |
|-----|-------------|
| Legal Business Name | `form.company_name` |
| Tagline / Description | `form.company_tagline` |
| Physical Address | `form.company_address + ', ' + form.company_city` |
| Business Phone | `form.company_phone` |
| Official Email | `form.company_email` |
| Website URL | `form.company_website` |
| Custom Fields | `customInfo` filtered by non-empty label/value |

**Edit mode** shows 3 form groups:

#### Company Details Form:
| Field | Key | Placeholder |
|-------|-----|-------------|
| Legal Business Name | `company_name` | "Sun & Shield Power Solutions" |
| Tagline / Motto | `company_tagline` | "Reliable Energy Solutions" |
| Physical Address | `company_address` | "Street address" |
| City / State | `company_city` | "Lagos, Nigeria" |

#### Contact & Web Form:
| Field | Key | Placeholder |
|-------|-----|-------------|
| Phone Number | `company_phone` | "+234..." |
| Official Email | `company_email` | "info@business.com" |
| Website URL | `company_website` | "https://..." |

#### Custom Fields:
- List of `{label, value}` pairs
- Add Field button, Remove (trash) per row
- Empty state: "No custom registration fields added."

**Buttons:**
- Edit Identity (view mode) → `setIsEditing(true)`
- Cancel (edit mode) → resets form from settings, `setIsEditing(false)`
- Save Changes (edit mode) → `save()`:
  1. Calls `saveSettings({...form, custom_info: JSON.stringify(customInfo)})`
  2. Shows feedback.success or error

**Loading state:** `SettingsLoadingState` shown while `useSettings()` loads

### Branding Section
**Component:** `BrandingSettingsSection` — `src/pages/settings/BrandingSettingsSection.tsx`

- **Not inspected** in detail (logo upload, branding configuration)

### Banking Section
**Component:** `BankingSettingsSection` — `src/pages/settings/BankingSettingsSection.tsx`

- **Not inspected** in detail (bank account management)

### Signatories Section
**Component:** `SignatoriesSettingsSection` — `src/pages/settings/SignatoriesSettingsSection.tsx`

- **Not inspected** in detail (signatory management)

### Theme & Appearance Section
**Component:** `AppThemeSettingsSection` — `src/pages/settings/AppThemeSettingsSection.tsx`

- **Not inspected** in detail (theme/color configuration)

### Notifications Section
**Component:** `NotificationSettingsPage` — `src/pages/settings/NotificationSettingsPage.tsx`

- **Not inspected** in detail (notification preferences)

### Dashboard Layout Section
**Component:** `DashboardSettingsSection` — `src/pages/settings/DashboardSettingsSection.tsx`

- **Not inspected** in detail (dashboard tile configuration)

### Document Controls Section
**Component:** `DocumentsSettingsSection` — `src/pages/settings/DocumentsSettingsSection.tsx`

- **Not inspected** in detail (document defaults)

### Document Prefixes Section
**Component:** `DocumentPrefixesSettingsSection` — `src/pages/settings/DocumentPrefixesSettingsSection.tsx`

- **Not inspected** in detail (prefix configuration)

### Archives Section
**Component:** `ArchivesSettingsSection` — `src/pages/settings/ArchivesSettingsSection.tsx`

- **Not inspected** in detail (archived records management)

### Admin Panel Section
**Component:** `AdminSettingsSection` — `src/pages/settings/AdminSettingsSection.tsx`

**Props:** `session: SettingsSession`

**Data loaded on mount:**
1. `profiles` table: `select id, email, created_at, assigned_device_code, is_approved order by created_at desc`
2. `device_installations` table: `select ..., profiles(email) order by assigned_at desc`

**States:** `users` (AdminUser[]), `devices` (DeviceRow[]), `deviceCodeDrafts`, `fetching`, `actionId`, `modal`

**User Directory sub-section:**
- Summary row: "X Users" with "X Active" badge + "X Pending" badge
- All Users list: each user card shows:
  - Email (with "You" badge if current user), join date, device code
  - Active/Pending badge
  - Action buttons (non-self users only):
    - Approve (pending users): `profiles.update({is_approved: true})`
    - Deactivate (active users): `profiles.update({is_approved: false})`
    - Remove (all): `profiles.delete().eq('id', user.id)`
    - Revoke device (if has code): `profiles.update({assigned_device_code: null})` + `device_installations.update({user_id: null})`

**Device Ecosystem sub-section:**
- Summary row: "X Handsets" with "X Online" badge
- Device Assignments list: each device card shows:
  - Device name, assigned user email, Active/Inactive badge
  - Current code, platform, installation ID
  - Editable device code input (max 2 chars, uppercase, alpha only)
  - "Update Code" button → `adminUpdateDeviceAssignment()`

**ConfirmModal:** Handles 4 action types:
- `approve`: Simple confirmation, "Yes, Grant Access"
- `deactivate`: Simple confirmation, "Yes, Deactivate"
- `remove`: Requires email confirmation (type email to proceed), "Permanently Remove"
- `revoke`: Simple confirmation, "Yes, Revoke"

**Loading state:** `SettingsLoadingState` shown during initial fetch

---

## 7. Shared Components

### SettingsActionFooter
**File:** `src/components/settings/SettingsActionFooter.tsx`

**Props:** `onSave, onCancel, saving?, disabled?, saveLabel?, cancelLabel?, className?`

Sticky bottom bar with Cancel + Save buttons. Includes safe-area padding (`env(safe-area-inset-bottom)`). Shows spinner during save.

### SettingsSummaryCard
**File:** `src/components/settings/SettingsSummaryCard.tsx`

Wraps content in a rounded card with optional title/description/action header.

### SettingsSummaryRow
**File:** `src/components/settings/SettingsSummaryCard.tsx` (same file)

Renders `[icon] label: value` row within a `SettingsSummaryCard`. Value falls back to `"Not set"` (italic) when falsy.

### SettingsLoadingState
**File:** `src/pages/settings/SettingsLoadingState.tsx`

- **Not inspected** in detail (skeleton/spinner for loading sections)

### SettingsFormPrimitives (SettingsField, SettingsInput)
**File:** `src/pages/settings/SettingsFormPrimitives.tsx`

- **Not inspected** in detail (form field wrappers)

---

## 8. State Summary

| State Variable | Type | Initial | Purpose |
|---------------|------|---------|---------|
| `active` | `ActiveSectionId \| null` | `null` | Currently active section |
| `session` | `SettingsSession` | `null` | Supabase auth session |

**Derived:** `isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')`

---

## 9. Side Effects

| Effect | Trigger | Behavior |
|--------|---------|----------|
| Load session | mount | `supabase.auth.getSession()` → `setSession(session)` |
| Auto-select first section | `isMobile, active, groups` | Desktop/tablet only: sets `active` to first item in first group |

---

## 10. DB Schema (settings table)

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `integer` | Yes | `1` | Singleton row (always id=1) |
| `company_name` | `text` | No | — | Business name |
| `company_tagline` | `text` | No | — | Tagline/motto |
| `company_address` | `text` | No | — | Physical address |
| `company_city` | `text` | No | — | City/state |
| `company_phone` | `text` | No | — | Phone |
| `company_email` | `text` | No | — | Email |
| `company_website` | `text` | No | — | Website URL |
| `bank_name` | `text` | No | — | Bank name |
| `bank_account_name` | `text` | No | — | Account name |
| `bank_account_number` | `text` | No | — | Account number |
| `bank_sort_code` | `text` | No | — | Sort code |
| `footer_text` | `text` | No | — | Document footer |
| `company_logo_url` | `text` | No | — | Logo URL |
| `signature_url` | `text` | No | — | Signature URL |
| `custom_info` | `text` | No | `'[]'` | JSON array of custom fields |
| `app_background_color` | `text` | No | — | Theme background |
| `app_card_color` | `text` | No | — | Theme card color |
| `app_theme_preset_id` | `text` | No | — | Theme preset |
| `app_theme_tokens` | `jsonb` | No | — | Theme tokens |

---

## 11. Known Issues

| Issue | Description | File:Line |
|-------|-------------|-----------|
| Hardcoded admin emails | Admin access controlled by hardcoded email strings instead of a role-based system | `Settings.tsx` line ~12 |
| No validation on company save | Company form fields are saved as-is with no required field validation | `CompanySettingsSection.tsx` (inferred) |
| Settings ActionFooter not used by CompanySection | Company section implements its own inline Edit/Save/Cancel buttons instead of using `SettingsActionFooter` | `CompanySettingsSection.tsx` |
| Route not confirmed | The `/settings` route was not found in the AppShell scan | `AppShell.tsx` |
