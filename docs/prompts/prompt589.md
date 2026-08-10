Read the existing tenant-settings investigation reports in docs/Reports/multi-tenancy/, especially:

- tenant-settings-live-db-investigation.md
- tenant-settings-final-provisioning-verification.md
- provisioning-settings-seed.md
- any other tenant-settings/provisioning reports relevant to this issue

Also read AGENTS.md and the relevant skills index before making any recommendation.

Do NOT repeat the investigation from scratch.

Use the existing reports as the evidence base and reconcile them.

Current confirmed production state:
- public.entities.display_name = "Sun & Shield Power Solutions"
- tenant schema = "entity_bigdrops-main_main"
- tenant.settings.id = 1
- tenant.settings.company_name = "Sun & Shield Power Solutions"
- public.settings contains the complete company information:
  address, phone, email, bank details, TIN/custom_info, logo, etc.
- tenant.settings contains only the seeded company_name plus defaults/nulls.
- Documents read from tenant.settings.
- Settings UI writes to public.settings.
- The provisioning seed currently seeds only company_name from public.entities.display_name.
- All migrations through 20260809070000 are confirmed applied in production.
- The previous company_name-only SQL correction has already been performed.

The new problem is therefore:

Quotation/invoice documents now show the correct company name, but they do NOT show the rest of the company's identity information that exists in public.settings, such as:

- address
- city/state
- phone
- email
- TIN/custom_info
- bank details
- logo
- other document-relevant settings

Determine the safest permanent architecture for this.

IMPORTANT:
Do not immediately assume that public.settings should simply be copied wholesale into tenant.settings.

We need to determine:
1. Which settings are workspace-level versus entity-level.
2. Which fields documents actually require from tenant.settings.
3. Whether the existing data model provides an entity-specific source for those fields.
4. Whether tenant settings should be fully provisioned from public.settings, selectively synchronized, or whether the document read path should instead use the appropriate workspace/entity settings source.
5. How this should behave when a workspace eventually has multiple entities.
6. How existing tenant settings and intentional overrides should be preserved.
7. Whether document_prefixes and theme settings should remain tenant-specific.
8. Whether the current architecture has another authoritative source for address/contact/bank/TIN information that we have not yet identified.

This is an ARCHITECTURAL INVESTIGATION first.

Do not modify code or migrations yet.

Do not execute production SQL.

Do not run bun run build.

Do not blindly recommend copying public.settings into tenant.settings.

Return a concise evidence-based report containing:

1. CURRENT ARCHITECTURE
2. FIELD OWNERSHIP / AUTHORITATIVE SOURCE MATRIX
3. MULTI-TENANT RISK ANALYSIS
4. OPTIONS CONSIDERED
5. RECOMMENDED ARCHITECTURE
6. EXISTING-DATA REMEDIATION STRATEGY
7. FUTURE PROVISIONING STRATEGY
8. REQUIRED CODE/MIGRATION CHANGES
9. OPEN QUESTIONS / RISKS
10. FINAL RECOMMENDATION

Clearly distinguish PROVEN facts from INFERENCES and DESIGN RECOMMENDATIONS.

The goal is not merely to make the current quotation look correct. The goal is to establish the correct entity-aware document identity architecture for BIGDROPS before implementation.


Tenant Settings — Document Identity Architecture Decision Investigation

This is a READ-ONLY ARCHITECTURAL INVESTIGATION.

Do NOT modify application code.
Do NOT modify SQL migrations.
Do NOT execute UPDATE, INSERT, DELETE, UPSERT, ALTER, or any other write SQL against production.
Do NOT apply migrations.
Do NOT run "bun run build".
Do NOT run "bun run typecheck".
Do NOT run lint.
Do NOT run Docker.

The purpose of this investigation is to determine the intended source of truth for company/document identity in the BIGDROPS multi-tenant architecture before any permanent fix is implemented.

---

1. CURRENT PRODUCTION FACTS

The confirmed production entity is:

- Entity ID: "eca34515-0b30-482c-b12e-3963df164322"
- Workspace ID: "eb30b64b-7f95-464f-be1a-805cf2c0fedc"
- Workspace slug: "bigdrops-main"
- Entity slug: "main"
- Entity display name: "Sun & Shield Power Solutions"
- Tenant schema: "entity_bigdrops-main_main"

Current production state:

"public.settings"

- "company_name" = "Sun & Shield Power Solutions " (trailing space)
- "company_address" = "43 oshola street , Ifako-ijaiye"
- "company_city" = "Lagos State"
- "company_phone" = "+2348066190685"
- "company_email" = "Sunshieldpowersolutions@gmail.com"
- "bank_name" = "U.B.A"
- "bank_account_name" = "Sun and shield power solutions"
- "bank_account_number" = "1024829598"
- "custom_info" contains TIN "1063045858"
- "company_logo_url" is populated
- "app_theme_preset_id" = "glassline"
- document prefixes are populated

"entity_bigdrops-main_main.settings"

After the previous targeted company-name remediation:

- "company_name" = "Sun & Shield Power Solutions"
- "company_tagline" = NULL
- "company_address" = NULL
- "company_city" = NULL
- "company_phone" = NULL
- "company_email" = NULL
- "company_website" = NULL
- "bank_name" = NULL
- "bank_account_name" = NULL
- "bank_account_number" = NULL
- "company_logo_url" = NULL
- "custom_info" = "[]"
- document prefixes remain tenant-specific values

Therefore the company name is now correct, but document issuer information remains incomplete.

---

2. CORE QUESTION

Determine which data store is SUPPOSED to be authoritative for document issuer/company identity in the final BIGDROPS multi-tenant architecture.

Specifically determine whether the intended architecture is:

Model A — Tenant Settings Authority

public.entities.display_name
        ↓
tenant.settings
        ↓
Invoices / Quotations / PDFs

with settings UI writing to the active tenant's settings.

OR:

Model B — Public Settings Authority

public.settings
        ↓
Invoices / Quotations / PDFs

with tenant settings being unnecessary/derived for document identity.

OR:

Model C — Hybrid Architecture

For example:

public.entities.display_name
        ↓
tenant.settings.company_name

public.settings
        ↓
tenant.settings operational fields
        ↓
documents

If Model C is intended, identify exactly which fields belong to which authority and why.

Do NOT choose an architecture merely because it is convenient.

Establish the answer from repository design, existing code, migrations, database structure, documentation, and historical implementation intent.

---

3. INVESTIGATE ENTITY VS WORKSPACE OWNERSHIP

Trace the data model for:

- workspaces
- entities
- entity provisioning
- tenant schemas
- public settings
- tenant settings

Inspect:

- "public.workspaces"
- "public.entities"
- "public.settings"
- "entity_provisioning_status"
- tenant schema creation
- settings table creation/cloning
- entity creation code
- workspace settings code
- entity settings code
- tenant context/provider code

Determine:

1. Is "settings" conceptually workspace-level or entity-level?
2. Why does every tenant schema contain a "settings" table?
3. Why does "public.settings" also exist?
4. Was the tenant "settings" table intended to be a copy, cache, snapshot, override layer, or authoritative store?
5. Is there any explicit documentation defining this ownership?
6. Is there any entity-specific settings mechanism outside the tenant schema?

Do not infer ownership merely from table names.

---

4. TRACE SETTINGS WRITE PATHS

Search the entire repository for every write to settings.

Search for:

- ".from('settings')"
- ".from("settings")"
- "INSERT INTO settings"
- "INSERT INTO public.settings"
- "UPDATE settings"
- "UPDATE public.settings"
- "UPSERT"
- "upsert("
- "company_name"
- "company_address"
- "company_phone"
- "company_email"
- "bank_name"
- "custom_info"
- "document_prefixes"

For every write path, record:

- file
- function
- client used
- schema targeted
- fields written
- whether entity context is available
- whether workspace context is available

Pay particular attention to:

"src/hooks/useSettings.js"

and:

"persistSettings()"
"saveSettings()"
"fetchSettings()"

Determine whether the public-settings write path is intentionally workspace-scoped or merely historical/legacy behavior.

---

5. TRACE DOCUMENT READ PATHS

Trace settings reads for:

- quotations
- invoices
- receipts
- waybills
- BOQs
- RFQs
- document previews
- document PDFs
- exports where applicable

Determine:

1. Which documents read tenant settings?
2. Which documents read public settings?
3. Whether any documents use different sources.
4. Whether "tenantClient" is consistently used.
5. Whether "normalizeSettings()" changes or merges data.
6. Whether any fallback from tenant settings to public settings exists.
7. Whether issuer identity is intentionally entity-specific.

Inspect at minimum:

- "src/hooks/useSettings.js"
- "src/lib/tenantClient.ts"
- "src/lib/tenant/contexts.tsx"
- quotation document settings loading
- invoice document settings loading
- PDF projection/build functions
- document preview models

Do NOT modify any of these files.

---

6. TRACE THE PROVISIONING CONTRACT

Inspect the final production/repository definitions of:

- "provision_entity()"
- "_prov_seed_settings()"
- "_prov_clone_table()"
- any entity creation trigger
- any provisioning helper
- settings-related migrations

Determine exactly what provisioning promises.

Current known behavior:

INSERT INTO {tenant_schema}.settings
    (id, company_name)
VALUES
    (1, public.entities.display_name)
ON CONFLICT (id) DO NOTHING;

Do not assume this is the complete intended contract.

Determine whether historical migrations or documentation indicate that tenant settings were supposed to contain:

- address
- phone
- email
- bank details
- TIN
- logo
- theme
- document prefixes
- other issuer metadata

If these were intentionally excluded, explain why.

---

7. INVESTIGATE DOCUMENT PREFIX OWNERSHIP

The production comparison shows:

"public.settings.document_prefixes"

and

"tenant.settings.document_prefixes"

are different.

Determine:

1. Which one is actually used when creating quotations/invoices?
2. Which one is used when displaying documents?
3. Which one is written by the settings UI?
4. Why are the values different?
5. Is "document_prefixes" intentionally entity-specific?
6. Does this provide evidence that tenant settings are intended to be the entity-level document configuration?

This is important evidence for determining the correct architecture.

Do not modify prefixes.

---

8. INVESTIGATE ENTITY-SPECIFIC BUSINESS DATA

Search for other examples where workspace-level and entity-level data coexist.

Look for:

- customers
- suppliers
- warehouses
- payment accounts
- tax information
- numbering
- branding
- business identity
- company profile
- document configuration

Determine whether BIGDROPS generally follows:

workspace = container
entity = business/tenant

and whether business-specific configuration is expected to live at entity level.

Use actual repository evidence.

---

9. INVESTIGATE "public.settings" SEMANTICS

Determine what "public.settings" actually represents.

Specifically investigate:

- creation migration
- schema
- RLS/policies
- ownership
- workspace relationships
- settings UI
- comments/documentation
- historical usage

Answer:

«Is "public.settings" a workspace/application settings table, or was it originally intended to represent the active business entity?»

Do not assume that because the current UI edits "public.settings", that this is architecturally correct.

---

10. INVESTIGATE "company_state" AND "company_vat"

The previous investigation found that document code references:

- "settings.company_state"
- "settings.company_vat"

but the current settings table does not contain those columns.

Determine:

1. Where these fields originated.
2. Whether they existed historically.
3. Whether they were renamed.
4. Whether the document code is stale.
5. Whether TIN is now represented through "custom_info".
6. Whether this is a separate bug or part of the settings architecture problem.

Do NOT fix these fields during this investigation.

---

11. INVESTIGATE HISTORICAL INTENT

Search git history and migration history if available.

Look for commits/messages/docs containing:

- settings
- tenant settings
- workspace settings
- entity settings
- company profile
- business profile
- provisioning
- multi-tenancy
- document identity
- document issuer
- branding

Determine whether there was an earlier intended architecture that was later partially migrated.

If historical evidence is unavailable, explicitly say so.

Do not invent historical intent.

---

12. LIVE DATABASE — READ ONLY

Use the existing Supabase production connection available to Command Code.

Do NOT require Docker.

Do NOT modify the database.

Only perform read operations.

Inspect, where possible:

- "public.entities"
- "public.workspaces"
- "public.settings"
- "public.entity_provisioning_status"
- tenant settings
- relevant metadata/views available through the existing Supabase connection

If direct PostgreSQL catalog access is unavailable, use the existing Supabase REST/API mechanism and repository migrations as evidence.

Do NOT claim catalog/function definitions were queried if they were not.

Do NOT execute any write SQL.

---

13. CRITICAL: DO NOT "FIX" THE DATA

Do NOT:

- UPDATE tenant settings
- INSERT tenant settings
- copy public settings into tenant settings
- synchronize fields
- alter provisioning
- alter settings schema
- change document code
- change "persistSettings()"
- change "fetchSettings()"
- change PDF rendering

This investigation exists specifically to decide what should eventually be changed.

---

14. REQUIRED ARCHITECTURAL CONCLUSION

The final report MUST answer these questions explicitly:

Question 1

What is the authoritative source for:

- business/company name
- address
- phone
- email
- TIN/tax identity
- bank details
- logo
- document prefixes
- document branding/theme

For each field, identify:

"public.entities"
OR
"public.settings"
OR
"tenant.settings"
OR
"other"

Do not group fields together unless evidence supports it.

Question 2

Why does the system currently write to "public.settings" but read from tenant settings?

Classify this as:

- intentional architecture
- incomplete migration
- legacy architecture
- accidental divergence
- unknown

Provide evidence.

Question 3

Should the settings UI write to tenant settings?

Answer YES/NO/UNKNOWN and explain.

Question 4

Should documents read tenant settings?

Answer YES/NO/UNKNOWN and explain.

Question 5

Should provisioning populate the complete tenant settings row?

Answer YES/NO/UNKNOWN.

If YES, specify exactly which fields.

Question 6

Should tenant settings synchronize from "public.settings"?

Answer:

- YES
- NO
- FIELD-BY-FIELD
- UNKNOWN

Explain the multi-tenant consequences.

Question 7

What is the smallest safe permanent fix?

Do NOT provide implementation code unless the architecture is sufficiently proven.

---

15. REQUIRED REPORT FORMAT

Return exactly these sections:

1. EXECUTIVE CONCLUSION

One concise paragraph stating the proven architectural conclusion.

2. SOURCE-OF-TRUTH MATRIX

Field| Authoritative Source| Evidence| Confidence
company_name| | | 
company_address| | | 
company_city/state| | | 
company_phone| | | 
company_email| | | 
TIN/tax identity| | | 
bank_name| | | 
bank_account_name| | | 
bank_account_number| | | 
company_logo_url| | | 
document_prefixes| | | 
document branding/theme| | | 

3. WORKSPACE VS ENTITY MODEL

Explain what workspace represents and what entity represents.

4. SETTINGS WRITE PATH

Document every relevant settings write path.

5. SETTINGS READ PATH

Document every relevant document read path.

6. PROVISIONING CONTRACT

Explain exactly what provisioning creates and what it does not create.

7. HISTORICAL INTENT

State what historical evidence proves.

Separate:

- PROVEN
- INFERRED
- UNKNOWN

8. ROOT CAUSE OF CURRENT DOCUMENT IDENTITY GAP

Explain why the expected company information exists in "public.settings" but not in tenant settings.

9. RECOMMENDED ARCHITECTURE

Choose the safest evidence-backed model:

- Tenant authority
- Public authority
- Hybrid

Explain why.

10. SMALLEST SAFE PERMANENT FIX

Describe the minimum change required.

Do not implement it.

Separate:

- immediate data remediation
- application fix
- provisioning fix
- future architectural debt

11. RISKS

List multi-tenant risks of the proposed architecture.

12. VERIFICATION

Confirm:

- read-only investigation
- no production writes
- no migrations applied
- no application files modified
- no migration files modified
- no Docker used
- no build executed
- no typecheck executed
- no lint executed

13. GIT STATUS

Show git status before and after investigation and confirm that this investigation introduced no unintended changes.

---

FINAL RULE

Do not recommend copying "public.settings" into tenant settings merely because the public row currently contains the desired company information.

Do not recommend changing "persistSettings()" merely because it writes to "public.settings".

Do not recommend changing document reads merely because they currently use tenant settings.

First establish the intended ownership model from evidence.

The goal is NOT to make today's quotation look correct.

The goal is to determine the architecture that will remain correct when BIGDROPS has multiple workspaces and multiple business entities.

Return evidence first, recommendation second.