# Offline Sync Tenant-Awareness Deferral Ticket

This report was written by deepseek-v4-pro on 2026-08-25 via opencode.

## Objective

Record the deferred work to make offline quotation and CSR sync tenant-aware before the public business schema is purged.

## Scope

`src/**/quotationSync.ts` and `src/**/csrSync.ts` (or their current locations). No change was made in this pass.

## Background

The offline sync path still reads and writes public business tables. The pre-purge hardening pass deferred this work because it needs a dedicated tenant-aware queue design, not a minimal fallback removal.

## Required work

- Route sync reads and writes through the tenant client and tenant schema.
- Carry entity context through the offline queue so each record resolves to the correct tenant schema.
- Add conflict resolution for records synced while offline against changed server data.
- Scope sync queries to the tenant schema (no public fallback).
- Add rollback on partial sync failure.
- Reuse native constraints (unique keys, foreign keys) for idempotency.
- Define reactivation criteria: only re-enable offline sync after the tenant path is verified end to end.

## Verification

Not started. This ticket is a future task.

## Status

Deferred.
