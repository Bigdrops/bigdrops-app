# Production Build WASM Fix Report

This report was written by Muse Spark on 2026-10-04 via Opencode.

## Objective

- Fix the production build failure caused by `@formepdf/core` WASM bundling.
- Keep the change minimal and scoped to build config plus one dev dependency.

## Scope

- Build config only. No source, calculation, template, or schema changes.
- Follows the CPS PDF customization completion pass, which introduced the Forme runtime dependency.

## Files Changed

- Updated `vite.config.js`: added `vite-plugin-wasm` to the plugin list.
- Updated `package.json` and `bun.lock`: added `vite-plugin-wasm` dev dependency.

## Skills Used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- Root cause: `@formepdf/core` ships wasm-pack ESM output (`import * as wasm from "./forme_bg.wasm"`). Vite 7 has no loader for this pattern, so the build failed at transform time.
- Fix: `bun add -d vite-plugin-wasm`, registered as `wasm()` ahead of the React plugin.
- Rejected: `vite-plugin-top-level-await`. Version 1.6.0 crashes the build (`missing field 'type'` from `@swc/core` during bundle render). Vite handles the emitted async init without it. The package was added, then removed again.
- No lazy-load refactor. The Forme chunk splits on its own (`CpsFormeDocument` chunk plus `forme_bg` WASM asset).

## Verification Result

Verification:

- `bun run build`: passed in 3m 57s, `forme_bg` WASM emitted, all chunks built
- `bun run typecheck`: passed
- `bun run audit:load`: not re-run (config-only change, no source touched)
- `supabase db push`: not applicable
- Chunk-size warnings remain. They predate this change and are warnings only.

## Supabase Push Status

- Not applicable. No migration written. No schema changed.

## Risks Or Limitations

- The WASM asset is 6.8 MB raw, 3.1 MB gzipped. It loads only with the Forme chunk, not the entry bundle.
- If the Forme dependency is ever removed, `vite-plugin-wasm` becomes dead config. A `ponytail:` comment in `vite.config.js` marks it for removal.

## Deferred Work

- None. Build is green.
