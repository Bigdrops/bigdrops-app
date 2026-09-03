# Business Switcher — Entity Name Source Fix

This report was written by Buffy on 2026-08-09 via Freebuff.

## A. Objective & Scope

Fix the Business Switcher showing "Unnamed business" while
`public.entities.display_name` is correctly set to "Sun & Shield Power
Solutions". The task required investigation before any change, a confirmed
diagnosis, and the minimal correct fix.

## B. Evidence — Root Cause

Facts:

- The string "Unnamed business" appears in exactly one file:
  `src/components/layout/BusinessSwitcher.tsx` (line 8).
- BusinessSwitcher read only `useSettings() → settings.company_name`. It never
  used `useEntity()` / EntityProvider.
- `src/lib/tenant/contexts.tsx` (line 187) maps the real column into the domain
  model: `setEntity({ id, slug, name: rows[0].display_name ?? rows[0].slug })`.
  So `useEntity().entity.name` equals `public.entities.display_name`.
- `settings.company_name` comes from the tenant-schema settings table, a
  different data source. When it was empty or not yet loaded, the fallback
  "Unnamed business" rendered.

Conclusion: this was a legacy consumer reading an unmigrated data source
(`settings.company_name`), not a naming mismatch in EntityProvider. The
consumer was wrong; EntityProvider's `entity.name` field is correct.

## C. Changes

One file modified: `src/components/layout/BusinessSwitcher.tsx`.

- Added `const { entity } = useEntity()`.
- `activeName` now resolves as `entity?.name || settings?.company_name ||
  'Unnamed business'`. The tenant entity is the primary source.
  `settings.company_name` remains only as a graceful fallback while the entity
  resolves. No alias was introduced.
- The sheet's avatar letter now derives from the resolved `activeName` instead
  of reading `settings` directly.

Render context: BusinessSwitcher renders inside `DesktopSidebar` /
`MobileSidebar` → `Layout` → all routes → within `EntityProvider`, and it
already depended on `useSettings()` (which requires the provider), so the
provider is guaranteed present.

## D. Fact vs. Conclusion

Facts:

- Only `src/components/layout/BusinessSwitcher.tsx` changed (git diff).
- `useEntity()` is available at the render site.

Conclusion: the switcher now displays the tenant entity display name once the
entity resolves, with the legacy settings name as a temporary fallback.

## E. Risks & Limitations

- Manual browser verification was not performed. No production browser session
  was available to the execution environment.
- The change is uncommitted as of this report.

## F. Verification

- `bun run typecheck`: PASS (exit 0, zero errors)
- `bun run audit:load`: PASS (exit 0, zero new warnings)
- `bun run build`: NOT run (prohibited)

## G. Deferred Work

- Commit and push the fix (will be a green check with a compliant message).
- Manual verification on the deployed app.
