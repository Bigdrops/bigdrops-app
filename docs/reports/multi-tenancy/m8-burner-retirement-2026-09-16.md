# M8 Burner Retirement Report

This report was written by OpenCode on 2026-09-16.

## Objective

Close and retire the M8 disposable Supabase testing environment.
Confirm that BIGDROPS has no remaining dependency on the burner project and that it is safe for the human to delete it.

## Disposable Project

- Ref: `jfijijipdlppyoqyocmi`
- Region: eu-west-1
- Org: `mojqidqaorclmmotvmla`

## What Was Verified (M8 E2E)

The disposable environment successfully validated:

| Item | Result |
|------|--------|
| Migration guards (33) | Committed `bb67a156` |
| `_prov_get_template_tables()` returns 45 | Confirmed |
| `tenant_master_template` contains 45 tables | Confirmed |
| `provision_entity()` reaches status `ready` | Confirmed |
| Tenant schema has 45 tables | Confirmed |
| RLS enabled on 45/45 tables | Confirmed |
| Provisioning triggers present (63) | Confirmed |
| Idempotency (second call = already-provisioned) | Confirmed |
| Orphaned schemas | 0 |
| Manual DB repairs required for final test | 0 |

## What Was NOT Verified (Deferred)

| Item | Reason |
|------|--------|
| Full authenticated PostgREST E2E | Disposable PostgREST returned PGRST002/503 throughout session |

This deferred check must become a **production post-deployment smoke-test item**.

## Credential & Dependency Audit

### Searched

```
jfijijipdlppyoqyocmi
SupaStr0ng
sbp_fc4a5623
XfuovxgsdWAq1MFv3hEH40gWzcmaWrEH1iAEOg1Hi5k
bC1odIW6vXML84JqFVs1-xxZ5P1OyCoc6OPykl1qmTQ
TestPass123
bigdrops.test (disposable context)
3f8d3472-3a76-4508-8f8b-68cb412cd0f9
```

### Results

| Finding | Location | Action Taken |
|---------|----------|--------------|
| Project ref + anon key + service role key + test password | `test-provision-e2e.ts` (untracked) | **Deleted** |
| Test password in E2E report | `m8-e2e-provisioning-verification-2026-09-16.md` line 25 | **Redacted** |
| Test user ID in E2E report | `m8-e2e-provisioning-verification-2026-09-16.md` line 26 | **Redacted** |
| Truncated entity/workspace IDs in report SQL snippets | Same report, lines 33-68 | **Preserved** (truncated, non-functional, historical evidence) |
| Production ref `xqlpekpkbszpdgtuwybh` | 44 locations across repo | **Preserved** (all legitimate production references) |
| `.env` | Production credentials only | **No action** (gitignored) |
| `config.toml` | `project_id = "bigdrops-app"` (name, not ref) | **No action** |

### Remaining References to Disposable Project

| File | Context | Classification |
|------|---------|----------------|
| `docs/reports/multi-tenancy/m8-e2e-provisioning-verification-2026-09-16.md` | Historical verification provenance | Legitimate — preserved |
| `docs/prd/multi-tenancy/Waterfall-roadmap.md` line 76 | M8 milestone status note | Legitimate — preserved |

No remaining references in:
- Source code
- Runtime configuration
- Deployment configuration
- Environment templates
- Scripts
- Active Supabase configuration

## Production Configuration Check

| Config | Points to | Status |
|--------|-----------|--------|
| `.env` | `xqlpekpkbszpdgtuwybh` | Correct |
| `.env.example` | Template placeholder | Correct |
| `config.toml` | `bigdrops-app` (name) | Correct |
| `database-workflow.md` | `xqlpekpkbszpdgtuwybh` | Correct |

Production project `xqlpekpkbszpdgtuwybh` was NOT modified during this session.

## Git Status After Cleanup

```
M  docs/PROJECTSKILLINDEX.md                          (pre-existing, not this session)
D  docs/prd/.../settings-redesign-candidate-v4...     (pre-existing, not this session)
M  docs/prd/multi-tenancy/Waterfall-roadmap.md        (pre-existing, not this session)
M  skills-lock.json                                   (pre-existing, not this session)
M  src/hooks/useQuotationSave.ts                      (pre-existing, not this session)
M  src/pages/ViewQuotation.tsx                        (pre-existing, not this session)
M  src/pages/view-boq-actions.ts                      (pre-existing, not this session)
?? (various untracked reports, skills, templates)     (not this session)
```

No files modified or deleted by this retirement session appear in the tracked changes.
`test-provision-e2e.ts` was untracked and has been removed.

## Evidence Preservation

The following M8 verification reports are preserved in the repository:

- `docs/reports/multi-tenancy/m8-e2e-provisioning-verification-2026-09-16.md` — E2E provisioning evidence
- `docs/reports/m8-migration-repair-completion-2026-09-16.md` — Migration repair completion
- `docs/reports/m8-migration-repair-production-readiness-audit-2026-09-15.md` — Production readiness audit
- `docs/reports/multi-tenancy/m8-forensic-audit-2026-09-10.md` — Original forensic audit

## Conclusion

- All migration fixes are committed and preserved.
- All M8 verification evidence is preserved.
- No active application or deployment configuration depends on the disposable project.
- Disposable credentials have been removed or redacted from committed artifacts.
- Production project was not modified.
- PostgREST limitation is documented as deferred.

---

**BURNER RETIREMENT: SAFE**

The human may delete Supabase project `jfijijipdlppyoqyocmi`.
OpenCode will NOT perform the deletion.
