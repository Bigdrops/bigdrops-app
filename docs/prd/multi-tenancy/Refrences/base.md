# BIGDROPS Multi-Tenancy PRD — External Reference Map

> **Status:** REFERENCE ONLY
> 
> This document maps external best practices, patterns, and starter kits to the **BIGDROPS multi-tenancy PRD v2.1** (workspace/entity model, §3 action permissions, §6 RLS, §8A entity lifecycle, onboarding/invites). It is for context only—**`multi-tenancy-prd-v2.1.md` remains the sole authority.**
>
> Individual reference files are in `docs/prd/multi-tenancy/Refrences/`.

---

## 1. PostgreSQL RLS & Tenant Isolation (Maps to §5–§6)

| Resource | Why it helps | Ref File | Link |
|---|---|---|---|
| Supabase Tenant Isolation with RLS | Intro walkthrough of Supabase RLS + Auth integration | [1.1](1.1-supabase-tenant-isolation-rls.md) | [Link](https://webflow.com/blog/supabase-rls) |
| Supabase PostgreSQL Multi-Tenant Security | Official Supabase docs — auth-context RLS, USING/WITH CHECK, FORCE RLS | [1.2](1.2-supabase-postgres-multi-tenant-security.md) | [Link](https://supabase.com/docs/guides/database/postgres/multi-tenant-security) |
| AWS SaaS Factory – Supabase RLS | Canonical shared-schema + session variable + FORCE RLS pattern | [1.3](1.3-aws-saas-factory-supabase-rls.md) | [Link](https://github.com/aws-samples/aws-saas-factory-postgresql-rls) |
| AWS Prescriptive Guidance – RLS | Pool vs silo vs bridge; policy shape; isolation ≠ authorization | [1.4](1.4-aws-prescriptive-guidance-row-level-security.md) | [Link](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/rls.md) |
| Nile – Multi-Tenant RLS in Postgres | Request → set context → fails-closed; policies on tables > filters on queries | [1.5](1.5-nile-multi-tenant-rls-postgres.md) | [Link](https://www.thenile.dev/blog/multi-tenant-rls) |
| GastonLopezL/Supabase-RLS-Multi-Tenant | Membership-based isolation; USING vs WITH CHECK; cross-tenant test proofs | [1.6](1.6-gastonlopezl-supabase-rls-multi-tenant.md) | [Link](https://github.com/gastonlopezl/supabase-rls-multi-tenant) |
| Cinderblock | 74 pgTAP RLS tests against hostile multi-workspace fixtures | [1.7](1.7-cinderblock-rls-tenant-id.md) | [Link](https://github.com/philiprehberger/cinderblock) |
| Supabase RLS Explained (Medium) | Cross-schema RLS edge cases; policy complexity warnings | [1.8](1.8-supabase-rls-explained.md) | [Link](https://medium.com/@saschamajer/supabase-rls-explained-accessing-other-schemas-in-multi-tenant-applications-7100f2310e51) |
| Prisma RLS Client Extension | Client-level tenant context propagation via ORM extension | [1.9](1.9-prisma-rls-client-extension.md) | [Link](https://github.com/prisma/prisma-client-extensions/blob/main/row-level-security/README.md) |

**Lessons to carry into BIGDROPS §6**

- Shared schema + tenant key on every row is the default (pool model).
- Always **FORCE RLS**; never run app traffic as table owner / `BYPASSRLS`.
- Separate **USING** (read/touch existing rows) from **WITH CHECK** (insert/update validity).
- Index every column used in policy predicates (`tenant_id` / `workspace_id` / `entity_id` leading composites).
- Reset tenant context carefully under connection pooling.

---

## 2. Workspace / Org / Membership Model (Maps to §5, §7–§9)

| Resource | Why it helps | Ref File | Link |
|---|---|---|---|
| Clerk – Multi-Tenant Architecture | B2B org model: shared user pool, memberships, roles per org, personal vs org resources | [2.1](2.1-clerk-multi-tenant-workspaces.md) | [Link](https://clerk.com/docs/guides/how-clerk-works/multi-tenant-architecture) |
| Astuto – Multi-Tenant Workspace | Working workspace + membership + RLS on Supabase | [2.2](2.2-astuto-multi-tenant-workspace.md) | [Link](https://github.com/astuto/astuto) |
| TurboStarter – Multi-Tenant SaaS | Org + Member + Invitation triad; unique `(org, user)`; global ≠ org roles | [2.3](2.3-turbostarter-multi-tenant.md) | [Link](https://www.turbostarter.dev/blog/how-to-build-multi-tenant-saas) |
| arc42 – Multi-Tenancy for Small Business | Pool vs silo vs bridge taxonomy; isolation as a spectrum | [2.4](2.4-arc42-multi-tenancy.md) | [Link](https://quality.arc42.org/approaches/multi-tenancy) |
| Anteon – 9 Multi-Tenant Patterns | 9 patterns with pros/cons; decision framework | [2.5](2.5-anteon-multi-tenant-patterns.md) | [Link](https://blog.anteon.com/multi-tenant-patterns) |
| melisasvr/Multi-Tenant-SaaS-Starter | Org switcher, invites, role matrix, RLS on Supabase | [2.6](2.6-melisasvr-multi-tenant-saas-starter.md) | [Link](https://github.com/melisasvr/Multi-Tenant-SaaS-Starter) |
| vvalchev/supabase-multitenancy-rbac | Permission enum scoped to tenant; roles → permissions → groups | [2.7](2.7-vvalchev-supabase-multitenancy-rbac.md) | [Link](https://github.com/vvalchev/supabase-multitenancy-rbac) |

**Map to BIGDROPS**

- Your **workspace** ≈ org/account; **entity/company** is a second level inside the workspace (your §8A / entity switcher).
- Prefer **membership join table** over user-owned `tenant_id` only.
- Invitation lifecycle (token, expiry, accept with/without account) is standard in these starters — good cross-check for frontend PRD §4 / §12.5.

---

## 3. Permissions & Roles (Maps to §3, §3.11)

| Resource | Why it helps | Ref File | Link |
|---|---|---|---|
| Agnite – RBAC Design to Prevent BOLA | Auth → Tenant → Isolation → Action sequence; BOLA threat model | [3.1](3.1-agnite-rbac-bola.md) | [Link](https://agnitestudio.com/blog/rbac-design-saas) |
| Prisma – Multi-Tenant RBAC | Roles → permissions → resources hierarchy; tenant-scoped roles | [3.2](3.2-prisma-multi-tenant-rbac.md) | [Link](https://www.prisma.io/blog/multi-tenant-rbac-with-prisma-postgres) |
| AWS Labs – Fine-Grained Permission Mgmt | PDP/PEP separation; RBAC vs ABAC; isolation ≠ authorization | [3.3](3.3-awslabs-permission-mgmt-rbac.md) | [Link](https://github.com/awslabs/authorization-on-aws-using-amazon-verified-permissions) |
| arc42 – Fine-Grained Authorization | RBAC/ABAC/ReBAC taxonomy; roles as stable bundles | [3.4](3.4-arc42-fine-grained-authorization.md) | [Link](https://quality.arc42.org/approaches/fine-grained-authorization) |
| Amazon Verified Permissions | Per-tenant policy store; action-based permit policies | [3.5](3.5-amazon-verified-permissions.md) | [Link](https://aws.amazon.com/blogs/security/saas-access-control-using-amazon-verified-permissions-with-a-per-tenant-policy-store/) |

**Aligns with v2.1 §3**

- Action-based abilities (not CRUD) match policy/action models in AWS AVP and fine-grained auth literature.
- Editable ability bundles (your §3.11 decision) are closer to **roles as permission sets** than fixed system roles only.
- Always evaluate **tenant context first**, then **action permission** — isolation and authorization are two layers.

---

## 4. Entity / Account Lifecycle: Archive → Retention → Purge (Maps to §8A)

| Resource | Why it helps | Ref File | Link |
|---|---|---|---|
| Agnite – Data Retention Automation | Lifecycle metadata on entities (`IsArchived`, `DeleteAfter`); tenant-scoped purge jobs | [4.1](4.1-agnite-data-retention.md) | [Link](https://agnitestudio.com/blog/data-retention-automation-strategies-multi-tenant-saas-systems/) |
| SSOJet – Multi-Tenant Identity | Pool vs silo identity; many-to-many membership from day one | [4.2](4.2-ssojet-multi-tenant-identity.md) | [Link](https://ssojet.com/blog/multi-tenant-identity-management) |
| AWS – Account Per Tenant Lifecycle | Suspended vs workload states; deprovision then delete; do not reuse | [4.3](4.3-aws-account-per-tenant-lifecycle.md) | [Link](https://aws.amazon.com/blogs/mt/managing-the-account-lifecycle-in-account-per-tenant-saas-environments-on-aws/) |
| SociiLabs – Organization Primitive | Four-table core: organizations, users, memberships, roles | [4.4](4.4-sociilabs-multi-tenant-org.md) | [Link](https://sociilabs.com/blog/saas-multi-tenancy-architecture) |
| Makerkit – Roles & Permissions | Capability-style permissions; roles as permission sets | [4.5](4.5-makerkit-permissions.md) | [Link](https://makerkit.dev/blog/tutorials/multi-tenant-saas-architecture) |

**§8A Cross-check**

- Explicit states (`active → archived → purging → purged`) match retention-metadata designs better than a boolean `deleted`.
- Purge jobs **must** always carry workspace/entity filters (same isolation rule as RLS).
- 30-day retention + restore is a product choice; the pattern is soft-archive + scheduled hard-delete + audit log.

---

## 5. Full-Stack Starters (Structural Reference Only)

| Resource | Stack | Use carefully for | Ref File |
|---|---|---|---|
| Makerkit – Multi-Tenant Architecture | Next + Supabase | Accounts + membership + RLS | [5.1](5.1-makerkit-multi-tenant-architecture.md) |
| point-source/supabase-tenant-rbac | Supabase | Groups, members, roles, permission helpers | [5.2](5.2-point-source-supabase-tenant-rbac.md) |
| steve-piece/subdomain-isolated-turborepo | Next + Supabase | Subdomain routing, capability RBAC, JWT claims | [5.3](5.3-steve-piece-subdomain-isolated-turborepo.md) |
| moofoo/nestjs-prisma-postgres-tenancy | Nest + Prisma + RLS | Request-scoped tenant context strategies | [5.4](5.4-moofoo-nestjs-prisma-postgres-tenancy.md) |
| Priyanshupandita07/RBAC-APP | Vite + Supabase | Minimal org RBAC + 24h invites | [5.5](5.5-priyanshupandita07-rbac-app.md) |

Treat these as **pattern libraries**, not specs. BIGDROPS authority remains `multi-tenancy-prd-v2.1.md`.

---

## 6. Conceptual Mapping to Your PRD

| Your v2.1 Topic | Strongest External References |
|---|---|
| Workspace + entity tables (§5) | Clerk org model; TurboStarter org/member/invite; SociiLabs four-table core |
| Permission model (§3) | AWS SaaS API auth; AVP action policies; arc42 fine-grained auth |
| Roles as editable bundles (§3.11) | supabase-tenant-rbac; capability matrices in Makerkit-style kits |
| RLS (§6) | AWS SaaS Factory RLS; Nile blog; gastonlopezl USING/WITH CHECK; cinderblock pgTAP |
| Onboarding / invites (§7–§9) | Clerk; TurboStarter; Multi-Tenant-SaaS-Starter |
| Entity lifecycle §8A | Agnite retention automation; AWS account lifecycle (state machine ideas) |
| Migration / grandfathering (§10) | AWS multi-tenant Postgres guidance (pool model constraints) |

---

## 7. What *Not* to Copy Blindly

- **Schema-per-tenant / DB-per-tenant** starters — only if you later need enterprise silos; v2.1 is pool-model oriented.
- **CRUD-only RBAC** — conflicts with your action-based §3.
- **Service-role / BYPASSRLS as the default app path** — common in demos, unsafe in production.
- **Single-level tenant only** — BIGDROPS has workspace **and** entity; most open starters stop at one level. Your §8A and entity switcher are product-specific and need explicit two-level policies.

---

## 8. Practical Next Use

1. Use **AWS RLS sample + gastonlopezl + cinderblock tests** as the isolation checklist for §6.
2. Use **Clerk / TurboStarter** for membership + invite flows against erp-frontend PRD.
3. Use **Agnite retention** language when refining §8A purge jobs and audit.
4. Keep **v2.1 as sole authority**; external sources are pattern references only (same discipline as the TaxBridge CIT note).

> If you want a follow-up, I can produce a short "external reference map" file structured like the TaxBridge note (STATUS: REFERENCE ONLY, mapped to §3 / §6 / §8A), without treating any external project as normative.