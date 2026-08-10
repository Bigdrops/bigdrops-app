Read the existing tenant-settings investigation reports in docs/Reports/multi-tenancy/, especially:
 * tenant-settings-live-db-investigation.md
 * tenant-settings-final-provisioning-verification.md
 * provisioning-settings-seed.md
 * any other tenant-settings/provisioning reports relevant to this issue
Also read AGENTS.md and the relevant skills index before making any recommendation.
Do NOT repeat the investigation from scratch.
Use the existing reports as the evidence base and reconcile them. Treat the existing reports as evidence, but independently verify any conclusion that is critical to the architectural recommendation against the repository/live read-only database where possible. If a report claims something that cannot be verified, label it as unverified rather than repeating it as fact.
Current confirmed production state:
 * public.entities.display_name = "Sun & Shield Power Solutions"
 * tenant schema = "entity_bigdrops-main_main"
 * tenant.settings.id = 1
 * tenant.settings.company_name = "Sun & Shield Power Solutions"
 * public.settings contains the complete company information: address, phone, email, bank details, TIN/custom_info, logo, etc.
 * tenant.settings contains only the seeded company_name plus defaults/nulls.
 * Documents read from tenant.settings.
 * Settings UI writes to public.settings.
 * The provisioning seed currently seeds only company_name from public.entities.display_name.
 * All migrations through 20260809070000 are confirmed applied in production.
 * The previous company_name-only SQL correction has already been performed.
The new problem is therefore:
Quotation/invoice documents now show the correct company name, but they do NOT show the rest of the company's identity information that exists in public.settings, such as:
 * address
 * city/state
 * phone
 * email
 * TIN/custom_info
 * bank details
 * logo
 * other document-relevant settings
Determine the safest permanent architecture for this.
IMPORTANT:
Do not immediately assume that public.settings should simply be copied wholesale into tenant.settings.
We need to determine:
 * Which settings are workspace-level versus entity-level.
 * Which fields documents actually require from tenant.settings.
 * Whether the existing data model provides an entity-specific source for those fields.
 * Whether tenant settings should be fully provisioned from public.settings, selectively synchronized, or whether the document read path should instead use the appropriate workspace/entity settings source.
 * How this should behave when a workspace eventually has multiple entities.
 * How existing tenant settings and intentional overrides should be preserved.
 * Whether document_prefixes and theme settings should remain tenant-specific.
 * Whether the current architecture has another authoritative source for address/contact/bank/TIN information that we have not yet identified.
This is an ARCHITECTURAL INVESTIGATION first.
 * Do not modify code or migrations yet.
 * Do not execute production SQL.
 * Do not run bun run build.
 * Do not blindly recommend copying public.settings into tenant.settings.
> NOTE: The following section is the detailed investigation specification for this same task. Treat everything above and below as ONE unified instruction set. Do not treat the second section as a separate task.
> 
Tenant Settings — Document Identity Architecture Decision Investigation
This is a READ-ONLY ARCHITECTURAL INVESTIGATION.
 * Do NOT modify application code.
 * Do NOT modify SQL migrations.
 * Do NOT execute UPDATE, INSERT, DELETE, UPSERT, ALTER, or any other write SQL against production.
 * Do NOT apply migrations.
 * Do NOT run "bun run build".
 * Do NOT run "bun run typecheck".
 * Do NOT run lint.
 * Do NOT run Docker.
The purpose of this investigation is to determine the intended source of truth for company/document identity in the BIGDROPS multi-tenant architecture before any permanent fix is implemented.
1. CURRENT PRODUCTION FACTS
The confirmed production entity is:
 * Entity ID: "eca34515-0b30-482c-b12e-3963df164322"
 * Workspace ID: "eb30b64b-7f95-464f-be1a-805cf2c0fedc"
 * Workspace slug: "bigdrops-main"
 * Entity slug: "main"
 * Entity display name: "Sun & Shield Power Solutions"
 * Tenant schema: "entity_bigdrops-main_main"
Current production state:
public.settings
 * company_name = "Sun & Shield Power Solutions " (trailing space)
 * company_address = "43 oshola street , Ifako-ijaiye"
 * company_city = "Lagos State"
 * company_phone = "+2348066190685"
 * company_email = "Sunshieldpowersolutions@gmail.com"
 * bank_name = "U.B.A"
 * bank_account_name = "Sun and shield power solutions"
 * bank_account_number = "1024829598"
 * custom_info contains TIN "1063045858"
 * company_logo_url is populated
 * app_theme_preset_id = "glassline"
 * document prefixes are populated
entity_bigdrops-main_main.settings (After the previous targeted company-name remediation)
 * company_name = "Sun & Shield Power Solutions"
 * company_tagline = NULL
 * company_address = NULL
 * company_city = NULL
 * company_phone = NULL
 * company_email = NULL
 * company_website = NULL
 * bank_name = NULL
 * bank_account_name = NULL
 * bank_account_number = NULL
 * company_logo_url = NULL
 * custom_info = "[]"
 * document prefixes remain tenant-specific values
Therefore the company name is now correct, but document issuer information remains incomplete.
2. CORE QUESTION
Determine which data store is SUPPOSED to be authoritative for document issuer/company identity in the final BIGDROPS multi-tenant architecture.
Specifically determine whether the intended architecture is:
 * Model A — Tenant Settings Authority
   public.entities.display_name \rightarrow tenant.settings \rightarrow Invoices / Quotations / PDFs (with settings UI writing to active tenant settings).
 * Model B — Public Settings Authority
   public.settings \rightarrow Invoices / Quotations / PDFs (with tenant settings being unnecessary/derived for document identity).
 * Model C — Hybrid Architecture
   For example: public.entities.display_name \rightarrow tenant.settings.company_name, while public.settings \rightarrow tenant.settings operational fields \rightarrow documents.
If Model C is intended, identify exactly which fields belong to which authority and why.
Do NOT choose an architecture merely because it is convenient. Establish the answer from repository design, existing code, migrations, database structure, documentation, and historical implementation intent.
3. INVESTIGATE ENTITY VS WORKSPACE OWNERSHIP
Trace the data model for workspaces, entities, entity provisioning, tenant schemas, public settings, and tenant settings.
Inspect: public.workspaces, public.entities, public.settings, entity_provisioning_status, tenant schema creation, settings table creation/cloning, entity creation code, workspace settings code, entity settings code, tenant context/provider code.
Determine:
 * Is "settings" conceptually workspace-level or entity-level?
 * Why does every tenant schema contain a "settings" table?
 * Why does "public.settings" also exist?
 * Was the tenant "settings" table intended to be a copy, cache, snapshot, override layer, or authoritative store?
 * Is there any explicit documentation defining this ownership?
 * Is there any entity-specific settings mechanism outside the tenant schema?
Do not infer ownership merely from table names.
4. TRACE SETTINGS WRITE PATHS
Search the entire repository for every write to settings (.from('settings'), .from("settings"), INSERT INTO settings, UPDATE settings, UPSERT, etc.).
For every write path, record: file, function, client used, schema targeted, fields written, entity context availability, workspace context availability.
Pay particular attention to src/hooks/useSettings.js, persistSettings(), saveSettings(), and fetchSettings(). Determine whether the public-settings write path is intentionally workspace-scoped or merely historical/legacy behavior.
5. TRACE DOCUMENT READ PATHS
Trace settings reads for quotations, invoices, receipts, waybills, BOQs, RFQs, document previews, PDFs, and exports.
Determine:
 * Which documents read tenant settings vs. public settings?
 * Does tenantClient get consistently used?
 * Does normalizeSettings() change or merge data?
 * Is there a fallback mechanism from tenant settings to public settings?
 * Is issuer identity intentionally entity-specific?
Inspect at minimum: src/hooks/useSettings.js, src/lib/tenantClient.ts, src/lib/tenant/contexts.tsx, quotation/invoice document settings loading, PDF projection/build functions, document preview models.
Do NOT modify any of these files.
6. TRACE THE PROVISIONING CONTRACT
Inspect the final production/repository definitions of provision_entity(), _prov_seed_settings(), _prov_clone_table(), any entity creation triggers, provisioning helpers, and settings-related migrations.
Determine exactly what provisioning promises. Determine whether historical migrations or documentation indicate that tenant settings were supposed to contain address, phone, email, bank details, TIN, logo, theme, or document prefixes. If these were intentionally excluded, explain why.
7. INVESTIGATE DOCUMENT PREFIX OWNERSHIP
The production comparison shows public.settings.document_prefixes and tenant.settings.document_prefixes are different.
Determine:
 * Which one is used when creating vs. displaying documents?
 * Which one is written by the settings UI?
 * Why are the values different?
 * Is document_prefixes intentionally entity-specific?
 * Does this provide evidence that tenant settings are intended to be the entity-level document configuration?
8. INVESTIGATE ENTITY-SPECIFIC BUSINESS DATA
Search for other examples where workspace-level and entity-level data coexist (customers, suppliers, warehouses, payment accounts, tax info, numbering, branding, company profile).
Determine whether BIGDROPS generally follows workspace = container and entity = business/tenant, and whether business-specific configuration is expected to live at the entity level using repository evidence.
9. INVESTIGATE public.settings SEMANTICS
Determine what public.settings actually represents by investigating creation migration, schema, RLS/policies, ownership, workspace relationships, settings UI, comments/documentation, and historical usage.
Answer: Is public.settings a workspace/application settings table, or was it originally intended to represent the active business entity?
10. INVESTIGATE company_state AND company_vat
The previous investigation found that document code references settings.company_state and settings.company_vat, but the current settings table does not contain those columns.
Determine:
 * Where these fields originated.
 * Whether they existed historically or were renamed.
 * Whether the document code is stale or TIN is now represented through custom_info.
 * Whether this is a separate bug or part of the settings architecture problem.
11. INVESTIGATE HISTORICAL INTENT
Search git history and migration history for terms related to settings, provisioning, multi-tenancy, and document identity. Determine if an earlier intended architecture was later partially migrated. Explicitly state if historical evidence is unavailable.
12. LIVE DATABASE — READ ONLY
Use whatever existing read-only Supabase production connection/API mechanism is available to you. Do NOT require Docker or a local database.
Do NOT modify the database. Only perform read operations on public.entities, public.workspaces, public.settings, public.entity_provisioning_status, tenant settings, and relevant metadata/views.
If direct PostgreSQL catalog access is unavailable, use the existing Supabase REST/API mechanism and repository migrations as evidence.
13. CRITICAL: DO NOT "FIX" THE DATA
Do NOT update or insert tenant settings, copy public settings into tenant settings, alter provisioning, alter settings schemas, or modify document/PDF rendering code. This investigation exists specifically to decide what should eventually be changed.
14. REQUIRED ARCHITECTURAL CONCLUSION
The final report MUST answer these questions explicitly:
 * Question 1: What is the authoritative source for each field (company_name, address, phone, email, TIN, bank details, logo, document_prefixes, branding/theme)? Classify as public.entities, public.settings, tenant.settings, or other.
 * Question 2: Why does the system currently write to public.settings but read from tenant.settings? (Classify as: intentional architecture, incomplete migration, legacy architecture, accidental divergence, or unknown).
 * Question 3: Should the settings UI write to tenant settings? (YES/NO/UNKNOWN)
 * Question 4: Should documents read tenant settings? (YES/NO/UNKNOWN)
 * Question 5: Should provisioning populate the complete tenant settings row? (YES/NO/UNKNOWN — if YES, specify fields)
 * Question 6: Should tenant settings synchronize from public.settings? (YES / NO / FIELD-BY-FIELD / UNKNOWN)
 * Question 7: What is the smallest safe permanent fix?
15. REQUIRED REPORT FORMAT
Return exactly these sections:
 * EXECUTIVE CONCLUSION (One concise paragraph stating the proven architectural conclusion)
 * SOURCE-OF-TRUTH MATRIX (Table mapping fields to Authoritative Source, Evidence, and Confidence level)
 * WORKSPACE VS ENTITY MODEL
 * SETTINGS WRITE PATH
 * SETTINGS READ PATH
 * PROVISIONING CONTRACT
 * HISTORICAL INTENT (Separated into: PROVEN, INFERRED, UNKNOWN)
 * ROOT CAUSE OF CURRENT DOCUMENT IDENTITY GAP
 * RECOMMENDED ARCHITECTURE
 * SMALLEST SAFE PERMANENT FIX (Separated into: immediate data remediation, application fix, provisioning fix, future architectural debt)
 * RISKS
 * VERIFICATION (Confirm read-only execution, no production writes, no builds/lints executed)
 * GIT STATUS (Show before/after verification proving zero introduced changes)
FINAL RULE
Do not recommend copying public.settings into tenant settings merely because the public row currently contains the desired company information.
Do not recommend changing persistSettings() merely because it writes to public.settings.
Do not recommend changing document reads merely because they currently use tenant settings.
First establish the intended ownership model from evidence. The goal is NOT to make today's quotation look correct—the goal is to determine the architecture that will remain correct when BIGDROPS has multiple workspaces and multiple business entities. Return evidence first, recommendation second.
