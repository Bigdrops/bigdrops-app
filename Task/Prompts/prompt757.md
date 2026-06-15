: Prefix Engine Audit — Read Only**

**Read AGENTS.md and `docs/PROJECTSKIILINDEX.md` before anything else.**

Read these files completely and report:

1. **Organization context** — is there a hook, context provider, or utility that gives components access to the current organization's data? Search for: `useOrganization`, `useOrg`, `useWorkspace`, `currentOrg`, `organization_id`, `org_id` across `src/`. Report the file path and what it exposes.

2. **Existing sequence generators** — find every function that generates a document number. For each one report:
   - File path
   - Function name
   - What document type it serves
   - Whether the prefix is hardcoded inside it or passed as a parameter
   - What the current hardcoded prefix is (e.g. "SASINV", "AWB")

3. **Project documents numbering** — does `src/domain/projectDocuments.ts` or any project-related file have a sequence number generator or a `project_number` / `document_number` field? Report what exists or confirm it doesn't exist.

4. **Blank template download** — does any file currently implement blank waybill or blank CSR download? Search for: `blank`, `blankWaybill`, `blankCsr`, `downloadBlank`. Report what exists.

5. **`blank_waybill_logs` and `blank_csr_logs` tables** — do these exist in the DB? Check any migration files or Supabase schema files in the repo.

6. **`organizations` table** — does it currently have a `document_prefixes` column? Check migration files or schema.

**Save report to `Task/reports/prefix-engine-audit.md` and push to main.**

**Read only. Zero code changes.**