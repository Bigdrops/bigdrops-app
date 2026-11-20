# Read-Only Diagnostic: What's New Content Origin and Notification Lifecycle Audit

**Date:** 2026-11-20  
**Repository:** `bigdrops-app` · **Branch:** `main` · **HEAD:** `2e556315d0fa83c8466b048cb15195155f41aa69`  
**Task Type:** Read-Only Diagnostic Audit  
**Status:** Completed  

---

## 1. Executive Summary

This read-only diagnostic investigates:
1. **The origin of the sentence:** `"BOURXE v1.0.29 (build 1029) maintenance and performance update."` displayed on the Web "What's New" page.
2. **Why a fresh "What's New" notification appeared on web launch** even though build 1029 is not a newly published release.
3. **The current wiring of `src/pages/WhatsNew.tsx`** to verify whether it genuinely renders published policy data or retains legacy hardcoded/fallback release templates.

### Core Discoveries:
- **Exact Origin Established:** The sentence is **not** a frontend fallback, constant, or template. It is stored verbatim in the live production Supabase table `public.app_release_policy` (`id = 1`) in the `release_notes` column.
- **Workflow Publication Linked:** On **2026-11-18 at 17:16:16 UTC**, GitHub Actions workflow run 29 executed `.github/workflows/build-android-test-release.yml` on branch `main`. Prior to the introduction of the commit-history changelog generator on 2026-11-19, line 360 of the workflow evaluated:
  ```bash
  RELEASE_NOTES="BOURXE v${VERSION_NAME} (build ${VERSION_CODE}) maintenance and performance update."
  ```
  With `VERSION_NAME="1.0.29"` and `VERSION_CODE=1029`, this shell expression evaluated to `"BOURXE v1.0.29 (build 1029) maintenance and performance update."` and was patched directly into Supabase. Because no release workflow has updated `app_release_policy` since run 29, this row remains the active production policy.
- **Web Notification Trigger Cause:** On Android, release announcements are gated by `observeInstalledVersion(versionCode)` (evaluating `androidTransition?.kind === 'upgrade-pending'`), which fires **only once** immediately following an APK package upgrade. On Web, there is no installed app binary or version baseline; Web re-evaluates the active policy row on every launch/focus against local/remote acknowledgments. If a user has not explicitly clicked "Got it" (database acknowledgement) or "Dismiss notice" (device local storage), or if `localStorage` was cleared, a new session/domain was accessed, or the user is unauthenticated, `!isAcknowledged && !isDismissed` evaluates to `true`, causing `useNotifications` to synthesize an unread notification banner (`id: 'synthetic-release-notice'`) on launch.
- **`WhatsNew.tsx` Wiring Verified Clean:** [src/pages/WhatsNew.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/WhatsNew.tsx) contains zero legacy fallback text, mock data, or hardcoded version strings. It dynamically renders `policy.release_notes` through `parseReleaseNotes` and `ChangelogTimeline` (`variant="editorial"`). Because the stored release note lacked bullet markers (`-`, `*`), `parseReleaseNotes` faithfully bundled the single sentence into one timeline item (`entry 01`).

---

## 2. Git Status & Audit Boundaries

- **Initial Git Status:** `clean` (`git status --porcelain=v1` returned empty).
- **Execution Constraints Respected:**
  - Zero git mutations (`add`, `commit`, `push`, `stash`, `reset`, `checkout`, `clean`).
  - Zero database mutations (all queries were strictly read-only HTTP GET requests to public REST endpoints).
  - Zero executions of `bun run build` or `bun run lint`.
  - Zero credentials, tokens, or environment variable values printed or exposed.
- **Attributable Artifact:** This report document is the sole file created.

---

## 3. Question 1: Origin of the Displayed Release-Note Sentence

### 3.1 Repository Codebase Inspection
A full repository search for `"maintenance and performance update"` and `"BOURXE v1.0.29"` confirms:
1. The string does **not** exist in any frontend source file (`src/pages/WhatsNew.tsx`, `src/domain/appUpdate/changelog.ts`, `src/lib/appUpdate/releasePolicyClient.ts`, `src/hooks/useReleaseNotifications.ts`, or `src/components/`).
2. The string appears in historical documentation only as an example of what early release runs produced (e.g. `docs/reports/android/BOURXE_WEB_ANDROID_CHANGELOG_IMPLEMENTATION_AUDIT.md:144`).

### 3.2 Live Database State (Verified via Read-Only Public RPC & REST)
A read-only fetch against the production Supabase endpoint (`/rest/v1/app_release_policy?id=eq.1`) retrieved the exact active row:

```json
{
  "version_code": 1029,
  "version_name": "1.0.29",
  "release_notes": "BOURXE v1.0.29 (build 1029) maintenance and performance update.",
  "web_release_url": "https://xqlpekpkbszpdgtuwybh.supabase.co/storage/v1/object/public/app-releases/bigdrops-latest.apk?v=1029",
  "apk_asset_prefix": "BIGDROPS-test-release-",
  "updated_at": "2026-11-18T17:16:16+00:00",
  "effective_at": "2026-11-18T17:16:16+00:00"
}
```

**Finding:** The sentence displayed on the web page matches `app_release_policy.release_notes` byte-for-byte, character-for-character.

### 3.3 Historical Git Workflow Evidence (Run 29 / 2026-11-18)
Inspection of `.github/workflows/build-android-test-release.yml` in git history reveals:
1. **Commit `e269742d` (2026-11-02):** Added Step 23 (`Upload to Supabase Storage & Update Release Policy`). Lines 359–361 defined the exact policy update payload:
   ```bash
   echo "Updating public.app_release_policy (id = 1) via PostgREST..."
   RELEASE_NOTES="BOURXE v${VERSION_NAME} (build ${VERSION_CODE}) maintenance and performance update."
   PATCH_PAYLOAD="{\"version_code\":$VERSION_CODE,\"version_name\":\"$VERSION_NAME\",\"web_release_url\":\"$PUBLIC_APK_URL\",\"effective_at\":\"$ISO_NOW\",\"release_notes\":\"$RELEASE_NOTES\",\"updated_at\":\"$ISO_NOW\"}"
   ```
2. **Version Code Calculation:** Line 72 calculated version metadata directly from GitHub Actions run number:
   ```bash
   VERSION_CODE=$((1000 + GITHUB_RUN_NUMBER))
   VERSION_NAME="1.0.${GITHUB_RUN_NUMBER}"
   ```
3. **Execution at Run 29:** When GitHub Actions run 29 ran on 2026-11-18:
   - `GITHUB_RUN_NUMBER` = `29`
   - `VERSION_CODE` = `1029`
   - `VERSION_NAME` = `"1.0.29"`
   - `RELEASE_NOTES` evaluated to: `"BOURXE v1.0.29 (build 1029) maintenance and performance update."`
4. **Timestamp Correlation:** The stored `updated_at` timestamp in the database (`2026-11-18T17:16:16+00:00`) matches the exact time of commit `1d7d6d75` on 2026-11-18.
5. **Absence of `CHANGELOG.md`:** `CHANGELOG.md` was not created in the repository until commit `b8d70edd` on 2026-11-19. Run 29 executed on 2026-11-18 when no changelog file or commit-history extractor existed.
6. **No Subsequent Release Run:** No release workflow has advanced `app_release_policy` since run 29.

---

## 4. Question 2: Why Web Showed a Fresh What's New Notification on Launch

### 4.1 Comparison of Android vs. Web Notification Triggers
The notification lifecycle in [src/hooks/useReleaseNotifications.ts](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useReleaseNotifications.ts#L168-L281) behaves fundamentally differently between platforms:

| Feature | Android Platform | Web Platform |
| :--- | :--- | :--- |
| **Upgrade Detection** | Gated by `observeInstalledVersion(versionCode)` ([L197](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useReleaseNotifications.ts#L197)) | **No installed binary baseline** |
| **Notification Trigger** | Fires **only** when `androidTransition.kind === 'upgrade-pending'` | Fires whenever `!isAcknowledged && !isDismissed` ([L280](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useReleaseNotifications.ts#L280)) |
| **Subsequent Launches** | `observeInstalledVersion` returns `'unchanged'` → suppressed ([L198-L205](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useReleaseNotifications.ts#L198-L205)) | Re-evaluated on every launch and window focus event ([L151-L155](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useReleaseNotifications.ts#L151-L155)) |
| **Cross-Platform Isolation** | Scoped to `platform = 'android'` | Scoped to `platform = 'web'` (Android updates never acknowledge Web) |

### 4.2 The Exact Web Notification Evaluation Chain
On Web application startup:
1. `useReleaseNotifications` queries `supabase.rpc('get_active_android_release_policy')` ([L130](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useReleaseNotifications.ts#L130)).
2. The database returns policy row `version_code = 1029`.
3. `parseReleaseNotes` parses the text into 1 entry ([L227](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useReleaseNotifications.ts#L227)).
4. The hook checks acknowledgment status ([L251-L259](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useReleaseNotifications.ts#L251-L259)):
   - **Authenticated User (`userId` present):** Queries `release_acknowledgements` table:
     ```sql
     SELECT id FROM release_acknowledgements WHERE user_id = $userId AND platform = 'web' AND version_code = 1029;
     ```
   - **Anonymous User (`userId` null):** Queries browser `localStorage` key `bigdrops.app_release_acknowledgements.anonymous`.
5. The hook checks dismissal status:
   - Queries `localStorage` key `bigdrops.app_release_notifications.dismissed` for entry `"1029:web:<userId>"`.
6. **The Notification Condition:**
   ```typescript
   setBannerOpen(!isAcknowledged && !isDismissed)
   ```
7. **Downstream Injection in `useNotifications.ts` ([L123-L136](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useNotifications.ts#L123-L136)):**
   ```typescript
   if (releaseNotice.bannerOpen && releaseNotice.currentBanner) {
     synthetics.push({
       id: 'synthetic-release-notice',
       domain: 'system',
       source: 'release-policy',
       generator_key: 'app:release:whats-new',
       title: `What’s new in ${releaseNotice.currentBanner.versionLabel}`,
       message: `${releaseNotice.currentBanner.entries.length} release note · Open to review.`,
       route: '/whats-new',
       severity: 'info',
       state: 'active',
       created_at: now,
     })
   }
   ```
   This injects an active notification into `useNotifications`, lighting up the `NotificationBell` icon and placing `"What’s new in 1.0.29"` at the top of the user's notification drawer and alerts carousel.

### 4.3 Why the Notification Fired on This Launch
Because Web has no concept of an installed build, the notification fires on web launch whenever **any** of the following ordinary browser/session conditions occur:
1. **The user never explicitly acknowledged build 1029 on Web:** If the user never previously navigated to `/whats-new` and clicked "Got it" (`acknowledgeCurrent()`), no record exists in `release_acknowledgements` for `platform = 'web'`.
2. **Local Storage / Session Reset:** If the user visited via a new browser profile, incognito/private browsing window, cleared browser cookies/storage, or opened a different local or preview origin (e.g. `localhost:5000` vs `localhost:3000`), local dismissals (`bigdrops.app_release_notifications.dismissed`) are absent.
3. **Session Authentication Transition:** When a user logs in, logs out, or refreshes an expired session, `supabase.auth.onAuthStateChange` triggers ([L93-L102](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useReleaseNotifications.ts#L93-L102)), resetting `bannerAccountId.current` and re-evaluating the acknowledgment state against the database.
4. **No Timestamp Age Threshold on Web:** The web client lacks any cutoff logic (e.g. ignoring releases older than 7 or 14 days). As long as `app_release_policy` serves build 1029, any web visitor who has not recorded an acknowledgment for build 1029 on `platform = 'web'` will receive the notification.

---

## 5. Question 3: Verification of `WhatsNew.tsx` Wiring

### 5.1 End-to-End Data Path Trace
The complete data flow from database to DOM was traced:

```
[public.app_release_policy.release_notes]
  "BOURXE v1.0.29 (build 1029) maintenance and performance update."
                         ↓
[supabase.rpc('get_active_android_release_policy')]
                         ↓
[useReleaseNotifications() in src/hooks/useReleaseNotifications.ts]
  * Reads row.release_notes
  * Calls parseReleaseNotes(releaseNotes)
                         ↓
[parseReleaseNotes() in src/domain/appUpdate/changelog.ts]
  * Detects 0 bullet lines (no lines matching /^\s*[-*•]\s+/)
  * Fallback to full text: sourceLines = [lines.join(' ')]
  * splitEntry() finds no separator ('—', ' - ', ':')
  * Returns: { entries: [{ title: "BOURXE v1.0.29 (build 1029) maintenance and performance update.", detail: null }] }
                         ↓
[currentBanner in src/pages/WhatsNew.tsx]
  * Passes entries to <ChangelogTimeline variant="editorial" />
                         ↓
[EditorialChangelog in src/components/app/update/ChangelogTimeline.tsx]
  * Rail: versionLabel="1.0.29", releasedLabel="18/11/2026", entryCount=1
  * List Item 01: <h3>BOURXE v1.0.29 (build 1029) maintenance and performance update.</h3>
```

### 5.2 Verification of Fallback & Template Code
- **No Mock or Hardcoded Content:** `src/pages/WhatsNew.tsx`, `src/components/app/update/ChangelogTimeline.tsx`, and `src/hooks/useReleaseNotifications.ts` contain zero hardcoded release notes, fake version names, or fallback templates.
- **Empty State Behavior:**
  - If `policy.release_notes` is empty or null, `parseReleaseNotes` returns `{ entries: [] }`.
  - `useReleaseNotifications` sets `discovery = 'no-notes'`.
  - `WhatsNew.tsx` displays the honest empty state: `"This release has no published notes."` ([L176-L184](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/WhatsNew.tsx#L176-L184)).
- **Why the Sentence Appears:** The sentence appears because it is the actual string currently stored in Supabase `app_release_policy.release_notes`. The system is operating exactly as designed by rendering the live database record.

---

## 6. Classified Findings and Evidence Matrix

| Category | Finding | Exact Source Location | Evidence Type | Status |
| :--- | :--- | :--- | :--- | :--- |
| **OBSERVATION** | Stored policy row contains the exact sentence in `release_notes` | Supabase `public.app_release_policy` (`id = 1`) | Live REST / RPC Query | **Verified** |
| **REFERENCE** | Workflow Step 23 evaluated the exact sentence template | `.github/workflows/build-android-test-release.yml` at `e269742d:360` | Git History | **Verified** |
| **OBSERVATION** | Version metadata for run 29 was `1.0.29` / `1029` | `.github/workflows/build-android-test-release.yml` at `e269742d:72` | Git History | **Verified** |
| **REFERENCE** | Database timestamp `2026-11-18T17:16:16+00:00` matches run 29 | Supabase `app_release_policy.updated_at` & git commit `1d7d6d75` | Database & Git Log | **Verified** |
| **OBSERVATION** | `CHANGELOG.md` did not exist on 2026-11-18 | Repository root (added in commit `b8d70edd` on 2026-11-19) | Git History (`diff-filter=A`) | **Verified** |
| **OBSERVATION** | Android requires `upgrade-pending` transition before announcing | `src/hooks/useReleaseNotifications.ts:197-205` | Current Source Code | **Verified** |
| **OBSERVATION** | Web announces whenever `!isAcknowledged && !isDismissed` | `src/hooks/useReleaseNotifications.ts:280` | Current Source Code | **Verified** |
| **OBSERVATION** | Web acknowledges per user in DB or per device in `localStorage` | `src/lib/appUpdate/releaseAcknowledgementClient.ts:60-72`, `localStorage.ts:55-71` | Current Source Code | **Verified** |
| **OBSERVATION** | Synthetic notification injected into notification center | `src/hooks/useNotifications.ts:123-136` | Current Source Code | **Verified** |
| **OBSERVATION** | `parseReleaseNotes` bundles non-bullet text into single entry | `src/domain/appUpdate/changelog.ts:48-64` | Current Source Code | **Verified** |
| **OBSERVATION** | `WhatsNew.tsx` contains zero hardcoded fallback notes | `src/pages/WhatsNew.tsx:1-196` | Current Source Code | **Verified** |

---

## 7. Explicit Diagnostic Answers

1. **Where does the displayed generic sentence originate?**  
   It originates directly from the live `app_release_policy.release_notes` column in Supabase.
2. **Does the live Supabase row contain that sentence?**  
   Yes. A live read of `app_release_policy` (`id = 1`) returned `"release_notes": "BOURXE v1.0.29 (build 1029) maintenance and performance update."` with `updated_at = "2026-11-18T17:16:16+00:00"`.
3. **Can the historical run 29 publication be established?**  
   Yes. In `.github/workflows/build-android-test-release.yml` at commit `e269742d`, Step 23 had the exact template `RELEASE_NOTES="BOURXE v${VERSION_NAME} (build ${VERSION_CODE}) maintenance and performance update."`. For run 29, `VERSION_NAME` was `"1.0.29"` and `VERSION_CODE` was `1029`. The publication timestamp in Supabase matches the commit timestamp of run 29.
4. **What exact condition caused the fresh notification?**  
   The condition in `src/hooks/useReleaseNotifications.ts:280`: `setBannerOpen(!isAcknowledged && !isDismissed)`.
5. **Why did that condition evaluate as true on this launch?**  
   Unlike Android (which requires an active app version upgrade via `observeInstalledVersion`), Web re-checks the latest policy on every launch and window focus. If the current browser session has not recorded an acknowledgment (in `release_acknowledgements` for logged-in users, or `localStorage` for anonymous users) or a local dismissal, `isAcknowledged` and `isDismissed` are `false`. Any storage clear, incognito session, login transition, or unacknowledged session re-triggers the notification.
6. **Does the web page still contain hardcoded or generic fallback content?**  
   No. [src/pages/WhatsNew.tsx](file:///c:/Users/DELL/Desktop/bigdrops-app/src/pages/WhatsNew.tsx) contains no fallback or placeholder release content.
7. **Does the current implementation genuinely render the published changelog?**  
   Yes. It renders whatever plain-text notes are stored in `app_release_policy.release_notes`. Once a new release workflow publishes structured changelog bullets (from the newly introduced `CHANGELOG.md` pipeline), `parseReleaseNotes` will render discrete bullet entries.

---

## 8. Final Git Status Comparison

- **Initial Status:** `clean` (`git status --porcelain=v1` was empty).
- **Final Status:** Only the report file was created under `docs/reports/whats-new-changelog/`.
- **Zero regressions or mutations occurred.**
