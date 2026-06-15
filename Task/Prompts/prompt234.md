You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

Read AGENTS.md and docs/PROJECTSKIILINDEX.md before anything else.

==================================================
TASK: Settings Table Audit — Read Only
==================================================

READ FIRST:
- Every migration file in `supabase/migrations/` — read all of them
- `src/lib/database.types.ts` — read fully
- Any file that queries or mutates the `settings` table — find them all

==================================================
REPORT THESE QUESTIONS
==================================================

1. **`settings` table structure**
   - What columns does it have?
   - Is there a `user_id` or `profile_id` column? (per-user)
   - Is there an `org_id` or similar? (workspace-wide)
   - What data does it currently store? List every column and its type.
   - Is there a UNIQUE constraint — if so, on what column(s)?

2. **What uses the `settings` table**
   - List every file that reads from or writes to `settings`
   - What data does each file read/write?
   - Is it used for user preferences, workspace config, or both?

3. **RLS policies on `settings`**
   - What RLS policies exist on the `settings` table?
   - Who can read? Who can write?

4. **Can `document_prefixes` live in `settings`?**
   - Based on what you find — is `settings` scoped to a workspace (one row per workspace) or per user (one row per user)?
   - If workspace-scoped: `document_prefixes` JSONB could be added as a column here instead of creating a new `organizations` table
   - If user-scoped: a new `organizations` table is required

**Save report to `Task/reports/settings-table-audit.md` and push to main.**

**Read only. Zero code changes. No assumptions — report only what exists.**