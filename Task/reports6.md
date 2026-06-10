## Prompt 6 Execution: JSON Import Group Membership Stripped

### Status
Already fixed in commit `48ff2e1` (previous session, prompt5 execution).

### Bug
Same as prompt5 — `group_id` and `temp_ref` were silently dropped in two places during JSON import:
1. `normalize.ts` — no handler to capture them into `baseFields`
2. `resolve.ts` — hardcoded 6-field whitelist excluded them

### Repairs Already Applied
- **`src/domain/import/normalize.ts:121-125`** — Added `if (key === 'temp_ref' || key === 'group_id')` handler
- **`src/domain/import/resolve.ts:47-48`** — Added `temp_ref` and `group_id` to resolved base fields propagation
