# Stage 1 Audit: BOUXRE What's New and Changelog Surface

This report was written by Saffron on 2026-11-19 via Perch Desktop.

## Objective

Map the current What's New and changelog surface. Record the data contract, the
acknowledgement and dismissal behavior, and the four-viewport state. Identify the
gaps that Stage 2 must close.

## Scope

Read-only audit. This report is the only file created. No application code, style,
test, workflow, or database file was modified. No package was installed. No
destructive Git command was run. No build, lint, or typecheck was run.

Skills used: workspace, github, documents
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Verified Implementation Map

### 1.1 Route and navigation entry points

| Surface | File | Line | Behavior |
| --- | --- | --- | --- |
| Route registration | `src/components/app/AppShell.tsx` | 346 | `<Route path="/whats-new" element={withBoundary(<WhatsNew />)} />` |
| Lazy import | `src/components/app/AppShell.tsx` | 54 | `const WhatsNew = lazy(() => import('@/pages/WhatsNew'))` |
| Settings entry (web) | `src/pages/settings/AppUpdateSettingsSection.tsx` | 20 | `<Link to="/whats-new">` card, "Review the current release notes." |
| Settings entry (Android) | `src/pages/settings/AppUpdateSettingsSection.tsx` | 163 | Same `<Link to="/whats-new">` card. |
| Notification drawer item | `src/hooks/useNotifications.ts` | 125-136 | Synthetic item `app:release:whats-new`, `route: '/whats-new'`. Shown only while the release is neither acknowledged nor dismissed. |
| Primary navigation | `src/components/layout/navData.ts` | — | No What's New entry. The page is reachable only from Settings and the notification drawer. |

The page has no dedicated navigation item. It is a secondary destination.

### 1.2 Provider and context

`src/App.tsx` line 553 mounts `<ReleaseNotificationsProvider>` and line 621 closes it.
The provider is defined in `src/hooks/useReleaseNotifications.ts` line 47.

`src/hooks/useReleaseNotifications.ts` line 45 creates the context. Line 52 exposes
`useReleaseNotificationContext()`.

### 1.3 The page

`src/pages/WhatsNew.tsx` (60 lines) is the whole page.

| Line | Element |
| --- | --- |
| 12 | Reads `currentBanner`, `acknowledgeCurrent`, `dismissCurrent` from context. |
| 13-17 | Keeps `displayedRelease` in local state so the notes survive a context clear. |
| 20 | `<Layout title="What's New" hidePageHeader contentClassName="!px-4 !pt-4 md:!px-6">` |
| 21 | `<main className="mx-auto w-full max-w-3xl pb-8">` |
| 27 | Single card: `rounded-xl border border-border bg-card p-5 md:p-7` |
| 37-41 | Renders `<ChangelogTimeline>` with `entries`, `versionLabel`, `releasedLabel`. |
| 43-48 | Two actions: "Got it" (acknowledge) and "Dismiss notice" (dismiss). |
| 52-54 | Empty state: "There are no current release notes to show." |

### 1.4 The shared presentation component

`src/components/app/update/ChangelogTimeline.tsx` (58 lines) is the single renderer
for all three surfaces: What's New page, notification drawer, and Android update
dialog.

| Line | Element |
| --- | --- |
| 20 | `<section aria-label="What's new" className="w-full max-w-4xl">` |
| 21 | Two-column grid from `sm`: `sm:grid-cols-[minmax(8.5rem,0.65fr)_minmax(0,1.35fr)]`, `md:grid-cols-[minmax(11rem,0.65fr)_minmax(0,1.35fr)]` |
| 22 | Left rail: version badge and optional date. |
| 34-37 | Empty state: "No release notes are available for this build." |
| 39-52 | Ordered list of entries. Each entry is a `title` heading plus optional `detail` paragraph. |

### 1.5 Data flow, end to end

```
Supabase RPC get_active_android_release_policy()
        |
        +-- Web:   src/hooks/useReleaseNotifications.ts:107  (direct supabase.rpc)
        +-- Android: src/contexts/AppUpdateContext (via useAppUpdate) -> state.policy
        |
        v
validateReleasePolicy()  src/domain/appUpdate/updateStateMachine.ts:140
        |
        v
ReleasePolicyInput { versionCode, versionName, mandatory, effectiveAtMs,
                     apkAssetPrefix, webReleaseUrl, releaseNotes }
        |
        v
parseReleaseNotes(releaseNotes)  src/domain/appUpdate/changelog.ts:48
        |
        v
ChangelogEntry[] { title, detail }
        |
        v
ReleaseNotificationBannerContent { key, versionLabel, versionCode,
                                   entries, releasedLabel, isMandatory }
        |
        +--> ChangelogTimeline  (What's New page, drawer, UpdateModal)
        +--> acknowledgeCurrent / dismissCurrent
```

Field mapping to the UI:

| UI element | Source field | Transform |
| --- | --- | --- |
| Version badge | `versionName`, fallback `versionCode` | `formatVersionLabel()` at `updateStateMachine.ts:404`; prefixes `v`. |
| Release date | `effectiveAtMs` | `new Date(effectiveAtMs).toLocaleDateString('en-GB')` at `useReleaseNotifications.ts:193`. |
| Note entries | `releaseNotes` | `parseReleaseNotes()` at `changelog.ts:48`. |
| Mandatory marker | `mandatory` | Carried as `isMandatory`; not rendered by `ChangelogTimeline`. |

The Android update dialog (`src/components/app/UpdateModal.tsx` line 207) renders the
same `ChangelogTimeline` with `formatVersionLabel` (line 66) and `formatReleaseDate`
(line 69). It parses notes independently at line 70.

### 1.6 Dead code found

`src/components/app/releaseNotificationBanner.tsx` defines `ReleaseNotificationBanner`,
but no file imports or mounts it. A repository-wide search for the identifier returns
only its own definition and the unrelated `ReleaseNotificationBannerContent` type.

The existing report `docs/reports/android/2026-11-17-unified-release-notifications.md`
states this removal was intentional: "Removed the global mount of
`ReleaseNotificationBanner`". The file is therefore orphaned but not a defect. It is
a cleanup candidate, not a Stage 2 requirement.

---

## 2. Working Tree and Local Reference Inventory

### 2.1 Git state at audit start

Branch `main`, HEAD `0ed64a70 feat(assistant): stage 3a1 core contract integrity and
stage 3 blueprint`.

Modified, not staged:

```
 M .github/workflows/build-android-test-release.yml
 M .perch/PERCH.md
 M api/bolu-chat.ts
 M src/components/ai-assistant/chat/assistant-chat-parts.tsx
 M src/lib/ai-assistant/bolu-data.ts
 M src/lib/ai-assistant/bolu-document-service.ts
 M src/lib/ai-assistant/bolu-generation.ts
 M src/lib/ai-assistant/bolu-operations.ts
 M src/lib/ai-assistant/bolu-runtime.ts
 M src/tests/ai-assistant/bolu-operations.test.js
 M src/tests/ai-assistant/bolu-save-diagnostic-edit-remediation.test.ts
```

Untracked:

```
?? docs/reports/bolu-document-capability-parity/stage-2-final-verification.md
?? docs/reports/bolu-document-capability-parity/stage-3-full-field-parity-audit.md
?? docs/reports/bolu-document-capability-parity/stage-3a2-modify-parity.md
?? src/tests/ai-assistant/bolu-stage-3a2-modify-parity.test.js
```

### 2.2 Pre-existing work related to What's New

None. No modified or untracked file touches `src/pages/WhatsNew.tsx`,
`src/hooks/useReleaseNotifications.ts`, `src/components/app/update/ChangelogTimeline.tsx`,
`src/domain/appUpdate/`, `src/lib/appUpdate/`, or
`supabase/migrations/20261117000000_release_acknowledgements.sql`.

All pre-existing changes belong to the Bolu assistant work and the Android release
workflow. They are unrelated to this audit and were not modified.

### 2.3 `Changelog1` local reference

`Changelog1` does not exist in this repository.

- `git ls-files` search for `Changelog1`, `changelog1`, `Changelog_1`: no match.
- Filesystem search for `*Changelog1*` outside `node_modules`: no match.
- `docs/` search for filenames matching `Changelog1` or `whats`: no match.

The only changelog-named assets are `src/domain/appUpdate/changelog.ts`,
`src/components/app/update/ChangelogTimeline.tsx`, and third-party skill
`CHANGELOG.md` files under `.agents/`, `.claude/`, `.hermes/`, and `.kiro/`.

**Conclusion:** no local `Changelog1` design reference or template exists. Stage 2
must not claim to follow one.

---

## 3. Data Contract, Acknowledgement, and Empty-State Analysis

### 3.1 Fields that exist

`ReleasePolicyInput` (`src/domain/appUpdate/updateStateMachine.ts:47-62`):

| Field | Type | Display role |
| --- | --- | --- |
| `versionCode` | `number` | Version fallback, acknowledgement key. |
| `versionName` | `string \| null` | Version badge. |
| `mandatory` | `boolean` | Carried as `isMandatory`; not rendered in the timeline. |
| `effectiveAtMs` | `number \| null` | Release date label. |
| `apkAssetPrefix` | `string` | Download discovery only. |
| `webReleaseUrl` | `string \| null` | Download destination only. |
| `releaseNotes` | `string \| null` | The only note source. |

`ChangelogEntry` (`src/domain/appUpdate/changelog.ts:12-15`) has exactly two fields:
`title: string` and `detail: string | null`.

`AcknowledgedRelease` (`src/domain/appUpdate/releaseAcknowledgement.ts:18-30`) has
`id`, `versionCode`, `platform`, `acknowledgedAt`, and optional `userId`.

### 3.2 Fields that do not exist and must not be invented

The data contract cannot support any of the following. Stage 2 must not render them.

- Author, avatar, job title, or team attribution.
- Screenshots, images, or media per entry.
- Commit type prefix (`feat`, `fix`, `perf`, `revert`). The workflow strips it before
  publication, and `parseReleaseNotes` never sees it.
- Category, tag, or severity per entry.
- A multi-release archive or history. The policy row holds one current release only.
- Per-entry dates. Only one release-level `effectiveAtMs` exists.
- Change counts, diff statistics, or linked issues.

`docs/reports/android/2026-11-17-unified-release-notifications.md` records the same
limitation: "The release policy provides only the current release row; historical
release lookup requires a maintained release-history source."

### 3.3 Parsing rules that constrain the design

`parseReleaseNotes` (`changelog.ts:48-64`):

1. Splits on `\r?\n`, trims each line, drops empty lines.
2. Keeps only lines matching `/^\s*[-*•]\s+/`. If no line matches, the entire note
   collapses into one entry.
3. `splitEntry` (`changelog.ts:24-46`) splits each entry on the first `—` or ` - `.
   A colon also splits, but only when it appears at index 1-60.

Consequence: a note with no bullets renders as a single entry. A note with bullets
renders one entry per bullet. The header and footer lines of the generated note must
stay non-bullet, or they become entries.

### 3.4 Empty-state behavior

Three distinct empty states exist:

| State | Location | Text |
| --- | --- | --- |
| No parsed entries | `ChangelogTimeline.tsx:34-37` | "No release notes are available for this build." |
| No current release | `WhatsNew.tsx:52-54` | "There are no current release notes to show." |
| No user-facing commits | `.github/workflows/build-android-test-release.yml` | "- No user-facing changes were recorded for this build." |

The third state is a published bullet, so the parser yields exactly one honest entry.
No generic "performance and maintenance" claim is produced. This is correct and must
be preserved.

### 3.5 Dismissal versus acknowledgement

These are two separate mechanisms with different scope and lifetime.

| Aspect | Acknowledge ("Got it") | Dismiss ("Dismiss notice") |
| --- | --- | --- |
| Intent | Permanent. The user has read the notes. | Temporary. The user hides the notice. |
| Authenticated storage | Supabase `release_acknowledgements` table. | `localStorage` only. |
| Anonymous storage | `localStorage` key `bigdrops.app_release_acknowledgements.anonymous`. | `localStorage` key `bigdrops.app_release_notifications.dismissed`. |
| Cross-device | Yes, for authenticated users. | No. Device-local. |
| Scope key | `user_id, version_code, platform` (unique index). | `${versionCode}:${platform}:${userId ?? 'anonymous'}`. |
| Effect on banner | Clears `currentBanner` and `bannerOpen`. | Clears `bannerOpen` only. `currentBanner` stays. |
| Effect on What's New page | Page keeps the notes in `displayedRelease`. | Page keeps the notes in `displayedRelease`. |

Implementation references:

- Acknowledge: `useReleaseNotifications.ts:211-238`. Authenticated path calls
  `markReleaseAcknowledgedByUser` (`releaseAcknowledgementClient.ts:108`), which
  upserts into `release_acknowledgements` with `onConflict: 'user_id,version_code,platform'`.
- Dismiss: `useReleaseNotifications.ts:240-254`. Calls `dismissReleaseNotification`
  (`releaseAcknowledgementLocalStorage.ts:55`).
- Gate: `useReleaseNotifications.ts:198` sets `bannerOpen` to
  `!isAcknowledged && !isDismissed`.
- Schema: `supabase/migrations/20261117000000_release_acknowledgements.sql`. RLS
  policies restrict all operations to `auth.uid() = user_id`.

### 3.6 How a user revisits What's New after dismissing

The dismissal suppresses the notification-drawer item only. The route stays
registered, and the Settings card at `AppUpdateSettingsSection.tsx:20` and `:163`
links to `/whats-new` unconditionally. A dismissed user reaches the page through
Settings.

Two behavioral notes:

1. `WhatsNew.tsx:13-17` seeds `displayedRelease` from `currentBanner` and updates it
   only when `currentBanner` becomes truthy. A dismissed release still has
   `currentBanner` set, so the notes render. A deep link on a fresh load where
   evaluation has not completed shows the "no current release notes" state.
2. `WhatsNew.tsx:43-48` shows "Got it" and "Dismiss notice" even when the release is
   already acknowledged or dismissed. The page does not reflect current state.

### 3.7 Android-specific gating

On Android, the banner and the page only populate after an upgrade transition is
detected. `useReleaseNotifications.ts:147-149` requires
`androidTransition?.kind === 'upgrade-pending'` and
`policy.versionCode === version.versionCode`. A first install or an unchanged
version produces no banner. This is deliberate: notes appear after the user updates,
not before.

---

## 4. Four-Viewport Gap Matrix

`AGENTS.md` requires intentional treatment of four viewport classes. The current
surface is a single narrow column with one `sm`/`md` breakpoint pair.

| Viewport | Current behavior | Assessment | Gap |
| --- | --- | --- | --- |
| **Mobile / Fold Closed** | `max-w-3xl` column, `p-5` card, `!px-4` layout padding. `ChangelogTimeline` stacks to one column below `sm`. | Functional. No horizontal overflow: `min-w-0` and `break-words` are present at `ChangelogTimeline.tsx:21,46`. | No editorial hierarchy. Title, subtitle, and timeline share one flat card. No compact metadata treatment. |
| **Fold Open** | Same as mobile. The `sm` breakpoint fires at 640px, so a fold-open device gets the two-column timeline. | Partially addressed by the `sm` grid. | The outer card does not use the extra width. `max-w-3xl` caps content while the viewport is much wider. No deliberate expanded composition. |
| **Tablet** | Two-column timeline grid from `sm`, wider rail from `md`. Outer column still capped at `max-w-3xl`. | Adequate but unbalanced. | `ChangelogTimeline` allows `max-w-4xl` (line 20) but the parent caps at `max-w-3xl`, so the 4xl allowance is unreachable. No tablet-specific density or landscape treatment. |
| **Desktop** | Same capped column centered on the page. | Weak. | No metadata rail beside a main content area. No editorial layout. Large empty margins on wide screens. The standard asks for a workstation layout, and this is a phone layout centered on a desktop. |

### 4.1 Concrete gaps for Stage 2

1. **Desktop editorial layout.** Introduce a metadata rail (version, release date,
   mandatory status) beside a wider main content column at `lg` and above. Raise or
   remove the `max-w-3xl` cap so `ChangelogTimeline`'s `max-w-4xl` becomes reachable.
2. **Fold Open.** Define a deliberate expanded composition. Do not rely on the `sm`
   grid alone. The outer card must use the additional width.
3. **Tablet.** Reconcile the `max-w-3xl` parent cap with the `max-w-4xl` child cap.
   Add landscape consideration.
4. **Mobile.** Add compact hierarchy. The page currently has no visual separation
   between the page title, the release metadata, and the entries.
5. **State-aware actions.** Hide or relabel "Got it" and "Dismiss notice" when the
   release is already acknowledged or dismissed.
6. **Deep-link empty state.** A fresh load of `/whats-new` before evaluation completes
   shows "no current release notes". Add a loading state so the page does not assert
   absence before the policy resolves.
7. **`isMandatory` is unused.** The field is carried through the banner content but
   never rendered. Either render it or remove it from the content type.

### 4.2 Spelling regressions

The correct brand is `BOUXRE`. Evidence: `src/components/layout/navData.ts:6` sets
`export const APP_NAME = 'BOUXRE'`, and `src/` contains 171 occurrences of `BOUXRE`
against 88 of `BOUXRE`.

`BOUXRE` is a spelling regression. It appears in 88 places across `src/`, `.github/`,
and `supabase/`. User-facing instances in scope for a What's New surface:

| File | Line | Text |
| --- | --- | --- |
| `.github/workflows/build-android-test-release.yml` | 164 | `echo "BOUXRE v${VERSION_NAME} (build ${VERSION_CODE})"` |
| `src/components/app/update/DownloadProgress.tsx` | 36 | "Connecting to BOUXRE release server..." |
| `src/components/ai-assistant/chat/assistant-chat-thread.tsx` | 138 | "I'm Bolu, your BOUXRE business operations assistant" |
| `src/components/ai-assistant/chat/assistant-chat-parts.tsx` | 1329 | "BOUXRE calculates the authoritative totals..." |
| `src/components/ai-assistant/chat/assistant-chat-rail.tsx` | 119 | Rendered brand text `BOUXRE` |
| `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx` | 147, 150, 419 | Logo alt text and brand wordmark |
| `src/components/document-view/csr/CsrDocumentPreview.tsx` | 35 | Default company name fallback |

The workflow line is the most consequential for this task: it is the first line of
every generated release note, so every What's New page and every GitHub Release body
starts with the misspelling.

`BigDrops` appears 229 times, but almost all instances are technical identifiers
(`com.bigdrops.app`, `bigdrops_units`, `bigdrops:open-mobile-drawer`, import paths,
CSS tokens). These are legacy identifiers protected by `AGENTS.md` and must not be
renamed. Only a small number are user-facing prose, and none are on the What's New
surface.

---

## 5. Verification and Completion Status

### 5.1 Verification performed

| Check | Result |
| --- | --- |
| `git status` before audit | Captured. 11 modified, 4 untracked. |
| `git status` after audit | One new untracked directory and report: `docs/reports/whats-new-changelog/`. Nothing else changed. |
| Route registration confirmed | `AppShell.tsx:346`, `path="/whats-new"`. |
| Provider mount confirmed | `App.tsx:553` and `:621`. |
| `Changelog1` absence confirmed | `git ls-files`, filesystem search, and `docs/` search all return no match. |
| Orphaned banner confirmed | Repository-wide identifier search returns only the definition. |
| Policy field list confirmed | `updateStateMachine.ts:47-62`. |
| Parser rules confirmed | `changelog.ts:21-64`. |
| Acknowledgement schema confirmed | `20261117000000_release_acknowledgements.sql`, unique index on `(user_id, version_code, platform)`. |
| Brand spelling counted | 171 `BOUXRE` and 88 `BOUXRE` occurrences in `src/`. |
| Typecheck | Not run. Prohibited by task scope. |
| Build | Not run. Prohibited by task scope and repository policy. |
| Tests | Not run. Prohibited by task scope. |

### 5.2 Viewport verification limitation

No viewport was inspected in a running application. This audit read responsive class
names only. `AGENTS.md` states that "responsive CSS alone is not evidence of
four-class verification." The four-viewport matrix in section 4 is therefore a
static class-level analysis, not a rendered verification. Stage 2 must verify each
viewport in a running application before claiming conformance.

### 5.3 Completion status

**Completed.**

The audit is complete for a read-only scope. All five objectives were addressed with
file-and-line evidence. One report file was created. No non-report file was modified.

### 5.4 Risks and limitations

- The hosted database state is unknown. This audit read the migration file only. It
  cannot confirm that `release_acknowledgements` is deployed.
- The live `app_release_policy` row content is unknown. The rendered notes depend on
  whatever text that row currently holds.
- The four-viewport analysis is static. No rendered verification was performed.
- `BOUXRE` appears in 88 places. Correcting all of them is a separate branding task.
  This audit only records the finding.

### 5.5 Deferred work

- Stage 2 implementation of the seven gaps in section 4.1.
- Brand spelling correction for `BOUXRE`, to be authorized separately.
- Removal of the orphaned `releaseNotificationBanner.tsx`, to be authorized
  separately.
- Verification of the four viewport classes in a running application.
