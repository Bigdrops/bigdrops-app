# Stage 2 — What's New Editorial Redesign: Implementation Report

Date: 2026-11-19
Scope: Authorized implementation, based on the completed Stage 1 audit.
Status: Implemented and verified. No commits, pushes, builds, deployments or migrations.

---

## 1. What changed

Three existing files were modified and two files were added. No new database tables,
migrations, release-history storage, publishing workflow, or fetch system.

| File | Change |
| --- | --- |
| `src/pages/WhatsNew.tsx` | Rewritten as the editorial page: identity block, metadata rail, entry list, state-aware actions, honest loading/empty/error states. |
| `src/components/app/update/ChangelogTimeline.tsx` | Rewritten with an explicit `variant` prop (`'editorial' \| 'compact'`). Compact output is preserved for the notification drawer and Android update modal. |
| `src/hooks/useReleaseNotifications.ts` | Extended with a `discovery` state plus `acknowledged` / `dismissed` flags, so the page can distinguish unresolved from absent. |
| `src/domain/appUpdate/releaseDiscovery.ts` | **New.** Pure resolver for the discovery decision table. |
| `src/tests/critical/releaseDiscoveryState.test.js` | **New.** 9 tests over the resolver and parser edge cases. |

Diffstat for the three modified files: 445 insertions, 37 deletions.

## 2. Required structure (A–E)

**(A) Page identity.** `RELEASE NOTES` eyebrow, `What's New` heading, and one neutral
sentence: "The changes included in the release currently available to this app." No
promotional copy.

**(B) Release metadata, visually distinct.** A bordered rail rendered as `aside
aria-label="Release metadata"`, separate from the content region. It carries the version
label (monospace, tabular), the release date when `effectiveAtMs` exists, the entry count,
and a `Required` badge only when `mandatory` is true. Labels are uppercase micro-type; values
are body type, so metadata never reads as content.

**(C) Parsed entries.** An ordered list with two-digit ordinals. Each entry renders `title`
as a heading and `detail` only when the parser produced one. `whitespace-pre-line` and
`break-words` preserve authored line breaks and prevent overflow. No categories, tags,
severity, authors, avatars, screenshots or per-entry dates are invented.

**(D) State-aware actions.** The acknowledgement action appears only while the release is
neither acknowledged nor dismissed. Dismissal is rendered as a secondary action with
explicit copy that it hides the notice on this device only and does not acknowledge the
release. After either action the page states the resulting condition and keeps the Settings
link available. Persistence semantics, storage keys and scope are unchanged.

**(E) Deep-link loading.** Five states are distinguished and only one of them claims absence:

| State | Presentation |
| --- | --- |
| `loading` | "Checking for release notes…" — never claims absence |
| `available` | Metadata rail + entries + actions |
| `no-notes` | "This release has no published notes." |
| `none` | "There is no release currently published for this app." |
| `error` | "Release notes could not be loaded." + retry guidance |

The decision table lives in a pure function, `resolveReleaseDiscovery({ pending, failed,
applicable, entryCount })`, so the "never assert absence before discovery settles" rule is
testable without a renderer. `useReleaseNotifications` routes every transition through it and
never overwrites a resolved `available` with a transport error.

## 3. Shared component handling

`ChangelogTimeline` is consumed by the What's New page, the notification drawer and the
Android `UpdateModal`. Rather than forcing one layout on all three, it takes a `variant`
prop that defaults to `'compact'`. The compact branch keeps the original grid, dividers,
type scale and empty-state copy; the only change there is a merged `className` passthrough.
Neither existing consumer passes `variant`, so both keep their exact prior layout.

`releaseNotificationBanner.tsx` was left untouched as instructed.

## 4. Four-viewport verification

Verified against a running Vite dev server (`vite v7.3.5`, port 5000) using a temporary
preview entry that mounted the real `WhatsNew` page with real design tokens and a fixed
release fixture. `/whats-new` itself sits behind the app's auth and tenant gates, so a
preview entry was the only way to inspect the page visually. The preview files were deleted
after verification and are not part of the change.

| Viewport | Size | Result |
| --- | --- | --- |
| Mobile / Fold Closed | 390×844 | Single column, no horizontal overflow (`scrollWidth 390` = `clientWidth 390`), comfortable measure, actions reachable. |
| Fold Open | 717×884 | Metadata becomes a horizontal strip with `RELEASE / RELEASED / CHANGES` sharing one row; content uses the extra width instead of stretching the closed layout. |
| Tablet | 820×1180 | Balanced composition; metadata strip and content column with deliberate proportions, not a narrow mobile column. |
| Desktop | 1280×800 | Two-area editorial layout: 272px metadata rail plus 633px reading column, rail sticky at `lg`. |

States inspected at desktop width: multiple entries, long title and long detail (wrapping
without clipping), mandatory badge, `no-notes`, `loading`, `error`, acknowledged, dismissed.

Two defects were found during this verification and fixed:

1. **Fold Open wasted width.** The metadata card stretched full width as a tall stack. It now
   lays out as a deliberate horizontal strip between `sm` and `lg`.
2. **Desktop rail did not stack.** A `sm:flex` wrapper outranked `lg:block` on the `dl`, so the
   version label and metadata sat side by side inside the narrow rail. The wrapper now resets
   to `block` at `lg`.

One finding worth recording: `src/styles/formTheme.css:411` sets `h1` font size from
`--bd-font-h1-size` with `!important`. Tailwind `text-*` classes on an `h1` are therefore
inert. The page heading now relies on the design-system token instead of fighting it with
another `!important`.

Responsive CSS alone was not treated as proof; each class was inspected in the browser at the
sizes above.

## 5. Verification run

- `bun run audit:load` — passed. Only pre-existing findings (waybill mutation limit, oversized
  Bolu / audit / Calculations / themePresets / item-library files). None of the changed files
  were flagged.
- `bun run typecheck` (`tsc --noEmit`) — clean, exit 0, run after the final edits.
- Targeted tests — **14/14 pass** across `releaseDiscoveryState.test.js`,
  `releaseNotificationStorage.test.js` and `releaseDiscovery.test.js`.
- `bun run test` could not be used: it crashes the host with `Internal CLR error
  (0x80131506)`, exit `3221225477`. This is a host runtime failure, not a test failure, so the
  same suites were run directly through `node --test` with the project's alias loader.
- `bun run build` was not run, per repository governance.

## 6. Scope compliance

Not touched: database schema or migrations, release-history storage, GitHub Actions
release-note generation, APK build or signing, the native Android updater, download progress /
completion / cancellation, Bolu infrastructure, global branding, the orphaned
`releaseNotificationBanner.tsx`, acknowledgement semantics or persistence.

Brand spelling in all new user-facing copy is `BOUXRE`. Legacy `BIGDROPS` / `bigdrops`
identifiers were left alone.

Pre-existing work in the tree was preserved. `git status` shows the same 14 modified and 7
untracked paths as before this task, plus this report. Nothing was staged, committed, pushed,
stashed, reset or cleaned.

## 7. Known limitations

- The page cannot show a release date when the policy has no `effectiveAtMs`; the field is
  omitted rather than substituted.
- The entry count is derived from parsed entries, not from any stored total.
- Visual verification used a fixture-driven preview entry because the live route requires an
  authenticated tenant session. The page's own data path was exercised through the existing
  context and was not re-fetched by a second system.
