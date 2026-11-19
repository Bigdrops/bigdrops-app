# Design Lab — Android Update Experience Prototype

Date: 2026-11-19
Scope: Design Lab prototype only. No production updater, native downloader, or update-dialog change.
Status: **Completed** — accessible in Design Lab, interactions work, all four viewport classes inspected.

---

## 1. Reference image

`C:\Users\DELL\Downloads\Polished Update Available Dialog.png` — present (1,399,209 bytes) and
inspected. It sits outside the workspace, so a copy was placed at the repository root to read it
and deleted after inspection. Nothing from it was shipped.

Composition taken from it: rounded card with a warm amber wash in the top-right, a dark navy
square brand badge with an amber underline, a title plus version subtitle, an amber countdown pill
with the seconds picked out in a stronger amber, an orange progress bar, a tinted release-notes
row, a filled navy pill primary action, and a bordered secondary action.

Adapted, not copied: the badge reads `BX`; surfaces, borders, type and the primary action use the
existing BOURXE tokens (`--bd-surface`, `--bd-border`, `--bd-text`, `--bd-button-primary-bg`)
rather than the reference's literal colours, so the dialog follows the active theme.

### Visual art (added after first review)

The first pass was flat and missed the reference's actual art. Added:

- **Brand badge** — navy tile with a gloss sweep, an amber `X` against the white `B`, and the amber
  underline at the base.
- **Corner wave** — an inline SVG (`aup-wave`) with a crisp organic edge and an amber gradient,
  replacing the original soft radial blur. Height-capped so a wide card gets a thin sweep rather
  than a solid mass.
- **Countdown** — the clock sits in its own tinted disc with a hairline divider before the readout,
  as in the reference. The readout uses tabular numerals, does not wrap, and the seconds stay in
  stronger amber.
- **Progress bar** — orange gradient with an inset top gloss and a soft glow; the track has an
  inset shadow.
- **Release-notes row** — the document icon sits in its own bordered tile.

All art is CSS or inline SVG. No image asset from the reference was shipped.

## 2. Files changed

Added:

| File | Purpose |
| --- | --- |
| `src/components/design-lab/android-update/android-update-preview.tsx` | The prototype: dialog, states, reviewer console, scoped CSS. |
| `src/components/design-lab/android-update/preview-domain.ts` | Pure preview helpers and sample data. |
| `src/pages/AndroidUpdateExperiment.tsx` | Design Lab route wrapper, matching the other experiments. |
| `src/tests/critical/androidUpdatePreview.test.js` | 15 tests over the domain, registration, and isolation. |

Modified:

| File | Change |
| --- | --- |
| `src/lib/designLabPreviews.ts` | Registered the `android-update` entry (name, eyebrow, description, route, icon, capabilities). |
| `src/components/app/AppShell.tsx` | Added the lazy import and `/design-lab/android-update` route. |

No other file was touched by this task. Production updater and native files were not edited here;
see §7 for the shared-workspace caveat.

## 3. Where it appears

Design Lab (`/design-lab`) → **Available experiences** → **Android Update Experience**
(eyebrow `Android`), route `/design-lab/android-update`. It uses the existing registry, card
grid, route boundary and viewport switcher; no competing route or viewport standard was created.

## 4. Visual structure

One dialog, five regions:

- **Header** — `BX` badge, "Update available", "BOURXE release v1.0.29", and a dismiss control that
  exists only while the grace period is running.
- **Countdown** — amber pill with a clock icon, `{d}d {h}h {m}m {s}s` with the seconds in stronger
  amber, captioned "Time left before the update pauses". Ticks every second. When expired it reads
  "Grace period ended" / "Update required to keep using BOURXE" and the dismiss control disappears.
- **Transfer** — idle shows the asset size; downloading shows "Downloading update…", percentage,
  a progress bar, `11.6 MB of 30.2 MB`, and a measured transfer speed; complete shows
  "Download complete", 100%, and "Ready to install BOURXE v1.0.29"; installing shows the install
  progress and states plainly that nothing is launched.
- **Release notes** — collapsible row showing "BOURXE v1.0.29" and a one-line summary; expanding
  renders the production `ChangelogTimeline` with `variant="compact"` over parsed sample entries.
- **Actions** — primary `Download & install v1.0.29` → `Cancel download` → `Open & Install Update`
  → `Installing…` (disabled), plus a secondary `Download on Web`.

A reviewer console sits above the dialog, outside the design under review: state, grace-period,
notes and viewport controls, plus a live status line. Every control resolves to local preview state
or a "Preview only" notice.

## 5. Interactive states

All required states are reachable without editing code:

| Requirement | Where |
| --- | --- |
| Update available / idle | `Available` |
| Downloading | `Downloading` (simulation starts) |
| Download complete | `Complete` |
| Installing | `Installing` |
| Release notes expanded / collapsed | `Notes open` / `Notes closed`, or the row itself |
| Countdown approaching expiry | `Expiring` (45s deadline) |
| Dismissal unavailable after grace period | `Expired` — dismiss control is removed |

Transitions verified in the browser: starting a download advances progress and resolves the speed
readout; cancelling returns to idle with progress reset; the complete state exposes the install CTA
without launching anything; notes expand and collapse.

Transfer speed is measured, not invented: `computeTransferBytesPerSecond` returns `null` until two
valid samples exist, which is what produces "Calculating…" on the first tick.

## 6. Four viewport classes

Inspected in a running application at the required sizes. The dialog responds to the *simulated*
viewport through a named size container (`aup`), so the Design Lab switcher genuinely changes the
composition instead of scaling it.

| Class | Size | Result |
| --- | --- | --- |
| Mobile / Fold Closed | 390×844 | Single-column Android card, 358px wide with 16px margins, no horizontal overflow (`scrollWidth 390` = `clientWidth 390`), 50px action buttons, 44px dismiss target. |
| Fold Open | 717×884 | Wider card; the idle state pairs the countdown with the asset size on one row instead of stretching a single column. |
| Tablet | 820×1180 | Deliberate card width with comfortable reading measure; not a phone card adrift in a large viewport. |
| Desktop | 1280×800 | Two areas: status and actions in the left column, release notes in the right. The notes column scrolls, so the primary action never drifts below the fold with the notes expanded. |

Both appearances were checked. Dark mode exposed a real contrast failure: the expired pill used
`--bd-status-warning-bg`, which is light in both themes, leaving near-white text on a pale amber
background. It now uses the theme-aware accent tokens, giving amber text on a translucent amber wash.

Three other defects were found during verification and fixed: the idle asset line read
"30.2 MB of 30.2 MB"; the primary button wrapped to two lines at desktop width; and the desktop
notes expansion pushed the actions out of view.

## 7. Verification

- `bun run audit:load` — ran; only pre-existing findings (waybill limit, oversized test file). No
  prototype file was flagged.
- `bun run typecheck` (`tsc --noEmit`) — clean, exit 0.
- Tests — **36/36 pass**: `androidUpdatePreview.test.js` 15, `designLab.test.js` 15,
  `designLabViewports.test.js` 6. `bun run test` crashes the host with `Internal CLR error
  (0x80131506)`, so suites were run directly through `node --test` with the project alias loader.
- `bun run build` and `bun run lint` were not run, per governance.

**Production updater and native downloader: not modified by this task.** This task's edits are
limited to the files in §2. Other work in this shared workspace changed `ApkUpdatePlugin.java`,
`DownloadProgress.tsx`, `strings.xml`, Supabase files and the workflow while this task was in
progress; those changes are not mine and were left untouched. The workspace HEAD also moved from
`0ed64a70` to `97341863` during the session.

**Pre-existing work preserved.** Nothing was staged, committed, pushed, stashed, reset or cleaned.

Temporary verification files (`android-update-verify.html`, `src/__verify/`) and the reference
image copy were deleted; `git status` shows no leftover preview route or experimental file.

## 8. Limitations

- The countdown deadline is a fixed preview window anchored at mount, labelled as preview data. It
  is not a production release deadline.
- All figures (30.2 MB, version 1.0.29, the sample notes) are preview data and are never written to
  a policy row, fixture or backend record.
- The prototype does not exercise real Android DownloadManager telemetry and says so.
- The route sits behind the app's auth and tenant gates, so visual verification used a temporary
  entry that mounted the real component with a stub theme preference. That entry has been removed.

## 9. Scope confirmation

Not done, as instructed: production `UpdateGate` / `UpdateModal` / `DownloadProgress` changes,
`ApkUpdatePlugin.java` or native DownloadManager changes, `src/lib/native/apkUpdate.ts` changes,
`useAppUpdate` behaviour changes, real downloads or installer launches, release-policy or Supabase
changes, workflow changes, acknowledgement or dismissal persistence changes, release-history
implementation, unrelated Design Lab redesign, global branding changes, and any reference to
Claude's `frontend-design` skill.

No production implementation was started. That requires separate authorisation.
