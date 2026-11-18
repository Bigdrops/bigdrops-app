# BOURXE Architecture Specification: Identity, Multi-Tenancy & Session Model

- **Document Version:** 1.0.0
- **Status:** Architecture Specification (`[PROPOSAL]` / Under Review)
- **Scope:** User Identity Lifecycles, Multi-Tenant Entity Context, Shared Terminal Resilience, and Group Attribution

---

## 1. Identity Architecture Overview

In BOURXE, identity operates across three distinct architectural layers:
1. **Authoritative Authentication Layer:** Supabase Auth (`@supabase/supabase-js` v2.112.3) managing secure credentials, JWT token lifecycles, and hardware-backed native biometrics.
2. **Multi-Tenant Authorization Layer:** PostgreSQL Row-Level Security (RLS) enforcing tenant schema boundaries via `TenantClient` (`client.schema(schemaName)`).
3. **Analytics Telemetry Layer (Proposed):** Pseudonymous identity mapping using opaque UUIDs to measure user and business activity without collecting personal identifiers.

```mermaid
flowchart TD
    subgraph Authoritative Auth [Supabase Auth]
        SupaUser[Supabase Auth User] -->|UUID: 4f8a...| OpaqueID[Opaque User ID]
        SupaUser -->|Email: user@example.com| PII[User PII - Stored in Supabase Auth Only]
    end

    subgraph Multi-Tenant Database [PostgreSQL Schemas]
        OpaqueID -->|auth.uid()| RLS[Row Level Security]
        RLS --> TenantA[Tenant Schema: Dangote Logistics]
        RLS --> TenantB[Tenant Schema: Aliko Supplies]
    end

    subgraph Analytics Identity [PostHog Ingestion]
        OpaqueID -->|posthog.identify()| DistinctID[Distinct ID: 4f8a...]
        TenantA -->|posthog.group('tenant')| GroupA[Group ID: Entity UUID A]
        TenantB -->|posthog.group('tenant')| GroupB[Group ID: Entity UUID B]
    end
```

---

## 2. Authentication Lifecycle & Analytics Synchronization

### 2.1 First-Time / Anonymous Visitors
- Before authentication, visitors to BOURXE receive a randomly generated UUID distinct ID managed by `posthog-js`.
- Anonymous events (`session_started`, `marketing_page_viewed`) are associated with this temporary ID.

### 2.2 User Login & Identification
When a user logs in via email/password, OAuth, or hardware biometric (`@capgo/capacitor-native-biometric`):
1. Supabase Auth emits `SIGNED_IN` via `supabase.auth.onAuthStateChange`.
2. The client wrapper invokes:
   ```typescript
   posthog.identify(session.user.id) // Opaque UUIDv4
   ```
3. PostHog automatically aliases the anonymous distinct ID with the authenticated Supabase UUID.
4. **Strict PII Prohibition:** The user's plain-text email address (`session.user.email`) and full name are **never passed as person properties**.

### 2.3 User Logout & Shared Device Flushes (Critical)
In Nigerian commercial environments, office computers and retail POS terminals are frequently shared among multiple staff members.
- **The Risk:** If User A logs out and User B logs in without a complete cache flush, PostHog merges User B's actions into User A's profile.
- **The Mitigation:** Calling `posthog.reset()` upon logout is **mandatory**:
  ```typescript
  // Inside auth state change listener
  if (event === 'SIGNED_OUT') {
    posthog.reset() // Flushes local storage, clears cached profile, generates fresh anonymous ID
  }
  ```

---

## 3. Multi-Tenant Entity Context & Group Analytics

BOURXE supports multi-tenancy where a single user account can access or manage multiple business entities.

### 3.1 Entity Context Tracking (`EntityContext.tsx`)
When a user selects or switches their active business entity in `src/lib/tenant/entityContext.tsx`:
```typescript
useEffect(() => {
  if (activeEntity?.id) {
    // Sync active tenant group with PostHog
    setTenantGroup(activeEntity.id)
  }
}, [activeEntity?.id])
```

Inside the analytics wrapper:
```typescript
export function setTenantGroup(entityId: string): void {
  if (!isInitialized) return
  posthog.group('tenant', entityId, {
    industry: activeEntity?.industry || 'unspecified',
    created_at: activeEntity?.created_at
  })
}
```

### 3.2 Tenant Isolation Governance
1. **Opaque Group Keys:** The tenant group key must always be the internal Supabase `entity_id` (a UUID string), never the commercial business name.
2. **No Cross-Tenant Attribute Bleed:** When switching from Entity A to Entity B, any session-scoped properties belonging to Entity A are immediately cleared.
3. **Security Non-Equivalence:** PostHog Groups are for **aggregate reporting only** (calculating Daily Active Businesses). They are **NOT a security or access control boundary**. Database access remains strictly enforced by PostgreSQL RLS.
