# Unified BOURXE Release Notifications Report

## Objective
Replace the intrusive release-note overlay with an integrated notification and an independently accessible What’s New page for Web and Android. Keep dismissal separate from acknowledgement and preserve mandatory-update behavior.

## Implementation
- Removed the global mount of `ReleaseNotificationBanner`; release notes now use the existing notification infrastructure.
- Added a shared `ReleaseNotificationsProvider` around the existing app-update provider. It reuses the existing release-policy source and keeps one evaluation state for the notification drawer and changelog page.
- The existing notification drawer gets a synthetic What’s New item only while the active release is neither acknowledged nor dismissed. Opening the item navigates to `/whats-new` without marking the release read or acknowledged.
- Added `/whats-new`, which renders the current policy’s release notes and exposes separate “Got it” (permanent acknowledgement) and “Dismiss notice” actions. It remains accessible from the App Update settings section after dismissal.
- Dismissal is persisted locally by version, platform, and current account. It is not stored as a release acknowledgement. If local storage cannot confirm the dismissal, the notice stays open.
- Kept the current policy as the only release-note source. No historical notes are invented.
- Preserved the existing Android installed-version transition detection, acknowledgement ownership checks, and update enforcement/grace calculation behavior.

## Files
- `src/App.tsx`
- `src/components/app/AppShell.tsx`
- `src/components/app/releaseNotificationBanner.tsx` (no longer mounted globally)
- `src/hooks/useNotifications.ts`
- `src/hooks/useReleaseNotifications.ts`
- `src/lib/appUpdate/releaseAcknowledgementLocalStorage.ts`
- `src/pages/WhatsNew.tsx`
- `src/pages/settings/AppUpdateSettingsSection.tsx`
- `src/tests/critical/releaseNotificationStorage.test.js`
- `src/domain/appUpdate/releaseAcknowledgement.ts`
- `src/lib/appUpdate/releaseAcknowledgementClient.ts`
- `supabase/migrations/20261117000000_release_acknowledgements.sql`

## Verification
- `bun run audit:load`: completed; reports existing load-risk findings, including existing broad-query and file-size warnings.
- `bun run typecheck`: passed.
- `bun run test`: 1,580 passed and 4 unrelated failures remain in dashboard-theme, document-share, invoice-theme, and photo-hero tests.
- Release-notice dismissal test passed. It verifies persistence by version/platform/account and verifies dismissal does not create an acknowledgement.
- `git diff --check`: passed for the working tree at review time.
- No build, migration execution, deployment, commit, or push was performed.

## Deployment note and limitation
Authenticated acknowledgement persistence requires the existing additive migration `supabase/migrations/20261117000000_release_acknowledgements.sql` to be applied through the separate authorized database workflow. No migration was run here. The release policy provides only the current release row; historical release lookup requires a maintained release-history source.
