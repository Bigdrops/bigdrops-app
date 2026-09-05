# BIGDROPS Multi-Tenancy PRD — External Reference Map

> **Status:** REFERENCE ONLY
> 
> This document maps external best practices, patterns, and starter kits to the **BIGDROPS multi-tenancy PRD v2.1** (workspace/entity model, §3 action permissions, §6 RLS, §8A entity lifecycle, onboarding/invites). It is for context only—**`multi-tenancy-prd-v2.1.md` remains the sole authority.**

---

## 1. PostgreSQL RLS & Tenant Isolation (Maps to §5–§6)

| Resource | Why it helps | Link |
|---|---|---|
| AWS SaaS Factory – Postgres RLS sample | Canonical shared-schema + `tenant_id` + session variable pattern; production-oriented isolation notes | [Link](https://github.com/aws-samples/aws-saas-factory-postgresql-rls) |
| AWS: Multi-tenant data isolation with RLS | Pool vs silo vs bridge; `SET app.current_tenant`; `FORCE ROW LEVEL SECURITY`; owner-bypass pitfalls | [Link](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) |
| AWS Prescriptive Guidance – RLS recommendations | Policy shape, runtime context, enable RLS on all tenant tables | [Link](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/rls.md) |
| Nile: Shipping multi-tenant SaaS with Postgres RLS | Request → set context → RLS fails closed; why policies on tables beat filters on every query | [Link](https://www.thenile.dev/blog/multi-tenant-rls) |
| gastonlopezl/supabase-rls-multi-tenant | Membership-based isolation; **USING vs WITH CHECK**; all four ops; tests that prove cross-tenant writes fail | [Link](https://github.com/gastonlopezl/supabase-rls-multi-tenant) |
| philiprehberger/cinderblock | Supabase + Next.js starter with **74 pgTAP RLS tests** against hostile multi-workspace fixtures | [Link](https://github.com/philiprehberger/cinderblock) |
| Prisma RLS client extension example | How to set tenant context with Prisma (if/when you use Prisma-style clients) | [Link](https://github.com/prisma/prisma-client-extensions/blob/main/row-level-security/README.md) |
| Neon: Adopt Postgres RLS without slowing the team | Least-privilege DB role, sharp edges (owner/BYPASSRLS), when RLS fits | [Link](https://neon.com/guides/rls-multi-tenant-apps) |
| Makerkit: Multi-tenant SaaS architecture | Working `accounts` + membership + RLS patterns (Next/Supabase-style) | [Link](https://makerkit.dev/blog/tutorials/multi-tenant-saas-architecture) |

**Lessons to carry into BIGDROPS §6**

- Shared schema + tenant key on every row is the default (pool model).
- Always **FORCE RLS**; never run app traffic as table owner / `BYPASSRLS`.
- Separate **USING** (read/touch existing rows) from **WITH CHECK** (insert/update validity).
- Index every column used in policy predicates (`tenant_id` / `workspace_id` / `entity_id` leading composites).
- Reset tenant context carefully under connection pooling.

---

## 2. Workspace / Org / Membership Model (Maps to §5, §7–§9)

| Resource | Why it helps | Link |
|---|---|---|
| Clerk multi-tenant architecture | B2B org model: shared user pool, memberships, roles per org, personal vs org resources | [Link](https://clerk.com/docs/guides/how-clerk-works/multi-tenant-architecture) |
| TurboStarter: How to build multi-tenant SaaS | Org + Member + Invitation triad; unique `(org, user)`; global user roles ≠ org roles | [Link](https://www.turbostarter.dev/blog/how-to-build-multi-tenant-saas) |
| SociiLabs: Start with the organization primitive | Four-table core: organizations, users, memberships, roles — name the tenant once | [Link](https://sociilabs.com/blog/saas-multi-tenancy-architecture) |
| SSOJet: Multi-tenant identity | Pool vs silo identity; many-to-many membership from day one | [Link](https://ssojet.com/blog/multi-tenant-identity-management) |
| melisasvr/Multi-Tenant-SaaS-Starter | Orgs, memberships, invites, owner/admin/member matrix, RLS | [Link](https://github.com/melisasvr/Multi-Tenant-SaaS-Starter) |
| point-source/supabase-tenant-rbac | Multi-tenant RBAC extension: groups, members, roles, permission helpers for RLS | [Link](https://github.com/point-source/supabase-tenant-rbac) |
| vvalchev/supabase-multitenancy-rbac | Permission enum scoped to tenant; roles → permissions → groups | [Link](https://github.com/vvalchev/supabase-multitenancy-rbac) |

**Map to BIGDROPS**

- Your **workspace** ≈ org/account; **entity/company** is a second level inside the workspace (your §8A / entity switcher).
- Prefer **membership join table** over user-owned `tenant_id` only.
- Invitation lifecycle (token, expiry, accept with/without account) is standard in these starters — good cross-check for frontend PRD §4 / §12.5.

---

## 3. Permissions & Roles (Maps to §3, §3.11)

| Resource | Why it helps | Link |
|---|---|---|
| AWS Prescriptive Guidance – SaaS API authorization | PDP/PEP separation; RBAC vs ABAC; tenant isolation ≠ authorization | [Link](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/introduction.html) |
| Amazon Verified Permissions + per-tenant policy store | Action-based permit policies; tenant boundary + role within tenant | [Link](https://aws.amazon.com/blogs/security/saas-access-control-using-amazon-verified-permissions-with-a-per-tenant-policy-store/) |
| Agnite: RBAC design to prevent BOLA / tenant failures | Sequence: auth → tenant resolve → isolation → action policy | [Link](https://agnitestudio.com/blog/rbac-design-saas) |
| arc42: Fine-grained authorization | Action-resource policies; roles for stable bundles; attributes for context | [Link](https://quality.arc42.org/approaches/fine-grained-authorization) |
| Makerkit / capability-style examples | Permission keys like `billing:update` rather than CRUD verbs | [Link](https://makerkit.dev/blog/tutorials/multi-tenant-saas-architecture) |

**Aligns with v2.1 §3**

- Action-based abilities (not CRUD) match policy/action models in AWS AVP and fine-grained auth literature.
- Editable ability bundles (your §3.11 decision) are closer to **roles as permission sets** than fixed system roles only.
- Always evaluate **tenant context first**, then **action permission** — isolation and authorization are two layers.

---

## 4. Entity / Account Lifecycle: Archive → Retention → Purge (Maps to §8A)

| Resource | Why it helps | Link |
|---|---|---|
| Agnite: Data retention automation in multi-tenant SaaS | Lifecycle metadata on entities (`IsArchived`, `DeleteAfter`); tenant-scoped purge jobs | [Link](https://agnitestudio.com/blog/data-retention-automation-strategies-multi-tenant-saas-systems/) |
| AWS: Managing account lifecycle (account-per-tenant) | Suspended vs workload states; deprovision then delete; do not reuse suspended accounts | [Link](https://aws.amazon.com/blogs/mt/managing-the-account-lifecycle-in-account-per-tenant-saas-environments-on-aws/) |
| Clerk / TurboStarter org delete patterns | Cascade memberships/invites; soft-delete vs hard-delete tradeoffs in product flows | [Link](https://clerk.com/docs/guides/how-clerk-works/multi-tenant-architecture) |

**§8A Cross-check**

- Explicit states (`active → archived → purging → purged`) match retention-metadata designs better than a boolean `deleted`.
- Purge jobs **must** always carry workspace/entity filters (same isolation rule as RLS).
- 30-day retention + restore is a product choice; the pattern is soft-archive + scheduled hard-delete + audit log.

---

## 5. Full-Stack Starters (Structural Reference Only)

| Resource | Stack | Use carefully for |
|---|---|---|
| [cinderblock](https://github.com/philiprehberger/cinderblock) | Supabase + Next | RLS test suite, workspace/member/invite/audit |
| [Multi-Tenant-SaaS-Starter](https://github.com/melisasvr/Multi-Tenant-SaaS-Starter) | Next + Supabase + Stripe | Org switcher, invites, role matrix |
| [steve-piece/subdomain-isolated-turborepo](https://github.com/steve-piece/subdomain-isolated-turborepo) | Next + Supabase | Subdomain routing, capability RBAC, JWT claims |
| [moofoo/nestjs-prisma-postgres-tenancy](https://github.com/moofoo/nestjs-prisma-postgres-tenancy) | Nest + Prisma + RLS | Request-scoped tenant context strategies |
| [Priyanshupandita07/RBAC-APP](https://github.com/Priyanshupandita07/RBAC-APP) | Vite + Supabase | Minimal org RBAC + 24h invites |

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