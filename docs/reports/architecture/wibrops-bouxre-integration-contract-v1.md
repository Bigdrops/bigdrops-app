# Wibrops × BOUXRE Integration Architecture Contract v1

**Document ID:** INT-001  
**Status:** DRAFT FOR JOINT ARCHITECTURAL REVIEW  
**Date:** 2026-10-22  
**Author:** Antigravity / OpenCode / Codex  
**Governance:** ASD-STE100 Simplified Technical English  

This document was written by Antigravity on 2026-10-22 via Local Runner.

---

## 1. Repository Baseline

### 1.1 Repository Paths
- **BOUXRE (Primary):** `C:\Users\DELL\Desktop\bigdrops-app`
- **Wibrops (Read-Only):** `C:\Users\DELL\Desktop\bgd-soft\Superstore`

### 1.2 Baseline Status
- Both repository paths are confirmed accessible.
- Git status is recorded independently for both repositories.
- No uncommitted or untracked changes exist in the target documentation paths.
- Concurrent-agent work is preserved.
- Repository governance documents (`AGENTS.md`) are reviewed.
- Feasibility audit is reviewed.

---

## 2. Governance and Decision Register

### 2.1 APPROVED (Founder Decisions)
1. Formal invoicing is required for all eligible Wibrops sales.
2. Full authorized bidirectional business management is the long-term goal.
3. Implementation must be incremental.
4. Both platforms must operate independently.
5. Databases and authentication boundaries must remain separate.
6. Wibrops retains commerce, payment, and physical inventory authority.
7. BOUXRE is the preferred financial-operations integration candidate.

### 2.2 VERIFIED (Repository Evidence)
1. Wibrops uses integer kobo for money (`bigint` minor units, float calculations prohibited).
2. Wibrops uses Next.js 16, Go 1.26 REST backend, and Supabase PostgreSQL.
3. BOUXRE uses React 19, Vite 7, TypeScript 5.9, Bun runtime, and Supabase PostgreSQL.
4. Both platforms use Supabase for database and authentication independently.

### 2.3 PROPOSED (Architectural Designs)
1. Transactional outbox in Wibrops for event publication.
2. Durable inbox in BOUXRE for event consumption.
3. Machine-to-machine authentication using signed requests (HMAC-SHA256).
4. BOUXRE acting as the formal document issuance service.

### 2.4 UNRESOLVED (Requires Authority/Evidence)
1. Exact statutory triggers for formal invoice issuance.
2. Specific tax and withholding tax (WHT) policies.
3. Legal entity mapping between Wibrops and BOUXRE workspaces.

### 2.5 Approval Responsibilities
- **Founder:** Business rules, legal entity mapping, phased go-live.
- **Wibrops Architect:** Commerce domain, checkout reliability, event publication.
- **BOUXRE Architect:** Financial domain, document lifecycle, event consumption.
- **Accounting/Tax Reviewer:** Journal entries, tax policies, revenue recognition.

---

## 3. Domain Authority Contract

### 3.1 Commerce and Payments
- **Orders & Checkout:** Wibrops is the authoritative owner and system of record. Wibrops initiates and executes.
- **Payments:** Wibrops owns payment capture (Paystack/Monnify). Wibrops executes.
- **Refunds:** Wibrops initiates and executes refund commands to payment gateways. BOUXRE records the financial event.

### 3.2 Inventory and Procurement
- **Physical Inventory & Stock Reservations:** Wibrops is the authoritative owner. Wibrops executes.
- **Supplier Inventory & Procurement:** Wibrops owns supplier RFQs. BOUXRE may propose procurement requests, but Wibrops executes.

### 3.3 Financial Documents and Accounting
- **Invoices & Receipts:** BOUXRE is the authoritative issuer of formal PDF documents. Wibrops provides the source transaction data.
- **Accounting Entries & Tax Records:** BOUXRE is the system of record for the general ledger.
- **Financial Reporting:** BOUXRE generates consolidated financial reports.

### 3.4 Identity
- **Customer & Company Identity:** Wibrops owns customer checkout identity. BOUXRE owns internal workspace identity.
- **Guest Checkout:** Handled entirely by Wibrops. BOUXRE receives a pseudonymous or mapped identifier.

### 3.5 General Rules
- Record ownership is separate from the permission to initiate commands.
- Wibrops maintains its single-merchant-of-record model.
- BOUXRE integration must not remove any Wibrops Release 1 requirements.

---

## 4. Company and Identity Contract

### 4.1 Company Representation
- Wibrops must be represented inside the BOUXRE BIGDROPS workspace.
- A stable external company correlation identifier must link the two systems.
- Merchant identity ownership remains with Wibrops.

### 4.2 Mapping and Isolation
- Workspace and legal entity mapping must be explicitly configured.
- Tenant isolation must be strictly enforced in BOUXRE.
- A dedicated service identity must handle machine-to-machine communication.

### 4.3 Customer and Staff Access
- Staff access requires explicit authorization delegation.
- Customer mapping must link Wibrops customer IDs to BOUXRE contact records.
- Guest checkout identity must not create unauthorized BOUXRE user accounts.
- Verified customer account linking requires explicit user consent.

### 4.4 Failure and Recovery
- BOUXRE availability must not block Wibrops checkout.
- Integration synchronization may fail closed independently.
- Mapping recovery procedures must exist for integration outages.
- Supabase Auth user databases must not merge.

---

## 5. Financial Event Contract

### 5.1 Event Envelope
All events must use a versioned envelope containing:
1. Event name (e.g., `order.accepted`).
2. Schema version.
3. Producer and Consumer identifiers.
4. Stable event identifier (UUID).
5. Source transaction identifier.
6. Correlation identifier.
7. Company/tenant correlation.
8. UTC occurrence timestamp (ISO 8601).
9. Exact monetary representation (Integer kobo).
10. Event ordering sequence number.

### 5.2 Supported Events
- `order.accepted`, `payment.captured`, `payment.refunded`
- `order.cancelled`, `stock.received`, `stock.adjusted`
- `goods.dispatched`, `goods.fulfilled`
- `invoice.issued`, `receipt.issued`
- `reconciliation.completed`

### 5.3 Money and Precision
- Wibrops uses integer kobo.
- BOUXRE must accept and store money as integer kobo or exact PostgreSQL `NUMERIC` types.
- Floating-point arithmetic is strictly prohibited for financial calculations.
- JavaScript `Number` operations that lose integer precision are prohibited.

### 5.4 Delivery and Semantics
- Event occurrence, publication, delivery, acceptance, and processing completion are distinct states.
- The system does not promise exactly-once network delivery.
- Consumers must implement idempotency.
- Duplicate deliveries must be ignored safely.
- Corrections and reversals must use new events, not mutations.

---

## 6. Accounting Policy Contract

### 6.1 Verified BOUXRE Implementation
- BOUXRE contains a browser-side posting kernel for accounting logic.
- This kernel is not an unattended server-side service.

### 6.2 Proposed Integration Mapping
- Payment gateway clearing and bank settlement require mapping to BOUXRE clearing accounts.
- Revenue recognition must trigger only on fulfilled goods or issued invoices, not on payment capture.
- Inventory receipt must trigger accounts payable only after supplier invoice verification.

### 6.3 Policies Requiring Approval
- VAT and WHT calculation rules.
- Delivery revenue and carrier expense allocation.
- Inventory valuation methods (e.g., FIFO, Weighted Average).
- Financial period closing procedures.

### 6.4 Unresolved Questions
- Specific statutory tax treatments require qualified legal and accounting review.
- Illustrative journal entries in this document are not approved accounting rules.

---

## 7. Formal Invoice and Receipt Contract

### 7.1 Eligibility and Issuance
- Formal invoices are required for all eligible Wibrops sales.
- Eligibility determination occurs in Wibrops.
- Wibrops sends an `invoice.requested` event to BOUXRE.
- BOUXRE acts as the legal issuing entity for the document.

### 7.2 Document Lifecycle
- BOUXRE generates the authoritative invoice number.
- Wibrops must not fabricate formal invoices or issue competing numbers.
- BOUXRE generates the PDF using server-side tools.
- PDFs are stored in BOUXRE and linked to the transaction.
- Delivery policy dictates when the customer receives the PDF.

### 7.3 Financial Snapshots and Corrections
- Invoices must contain frozen financial snapshots at the time of issuance.
- Partial payments, refunds, voids, and corrections require credit notes.
- Credit notes must follow the same strict numbering and lifecycle controls.

### 7.4 Reliability and Outages
- If BOUXRE is unavailable, Wibrops marks the invoice as "Pending Issuance".
- Wibrops must not block checkout during BOUXRE outages.
- The customer must receive accurate information about document availability.
- Duplicate prevention and outage recovery mechanisms are mandatory.

---

## 8. Security and Tenant Isolation Contract

### 8.1 Authentication and Transport
- Machine-to-machine authentication must use signed requests.
- Requests must include replay prevention (timestamps and nonces).
- Transport must use TLS 1.2 or higher.

### 8.2 Credentials and Access
- Key rotation and credential revocation procedures must exist.
- Service accounts must use least-privilege authorization.
- Privileged credentials must not be exposed to browser clients.
- Unrestricted Supabase service-role access is not acceptable.

### 8.3 Tenant Isolation and Validation
- All processing must be strictly tenant-scoped.
- Input validation and request size limits are mandatory.
- Cross-tenant isolation tests must pass before deployment.
- Audit logging must capture all cross-platform requests.

---

## 9. Reliability Contract

### 9.1 Event Delivery
- Wibrops must use a transactional outbox for event publication.
- BOUXRE must use a durable inbox for event consumption.
- Delivery must be at-least-once.
- Consumers must enforce idempotency.

### 9.2 Ordering and Compatibility
- Events must include sequence numbers for ordering.
- Schema versions must be strictly managed.
- Backward compatibility is required for minor version changes.

### 9.3 Failure Handling
- Bounded retries with exponential backoff are required.
- Failed events must route to a dead-letter queue.
- Reconciliation jobs must compare outbox and inbox states.
- Prolonged outages must trigger alerts and manual recovery procedures.

### 9.4 Operational Independence
- Wibrops checkout must not wait for BOUXRE services.
- BOUXRE core operations must not require Wibrops availability.
- Eventual consistency is the standard. User-visible states must reflect this.

---

## 10. Bidirectional Command Contract

### 10.1 BOUXRE-Originated Commands
- BOUXRE may request inventory adjustments, refunds, and procurement actions.
- BOUXRE may request financial administration and business reporting.

### 10.2 Command Execution Rules
1. Initiating platform: BOUXRE.
2. Executing platform: Wibrops (for commerce/inventory) or BOUXRE (for finance).
3. The executing platform validates rules and executes business logic.
4. Direct cross-platform database mutations are strictly prohibited.
5. Commands must be idempotent.
6. Acceptance of a command does not mean successful completion.
7. Rejection reasons and audit records are mandatory.

---

## 11. Phased Delivery Contract

### Phase 1: Contract Approval
- **Dependencies:** Joint architectural review, founder approval.
- **Acceptance Criteria:** Sign-off on this document.

### Phase 2: Secure Integration Foundation
- **Dependencies:** Phase 1.
- **Capabilities:** Authenticated boundary, outbox/inbox, tenant isolation.
- **Acceptance Criteria:** Secure ping-pong event test in staging.

### Phase 3: Controlled Accounting Synchronization
- **Dependencies:** Phase 2.
- **Capabilities:** Non-production fixtures, payment fact verification.
- **Acceptance Criteria:** Accounting posting validation and reconciliation checks pass.

### Phase 4: Formal Invoice and Receipt Federation
- **Dependencies:** Phase 3.
- **Capabilities:** Server-side PDF issuance, authoritative numbering.
- **Acceptance Criteria:** Customer can retrieve formal PDF invoices.

### Phase 5: Authorized Bidirectional Management
- **Dependencies:** Phase 4.
- **Capabilities:** Inventory commands, procurement workflows.
- **Acceptance Criteria:** BOUXRE can successfully request and track Wibrops inventory adjustments.

---

## 12. Risk Register

| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| Duplicate financial records | High | Idempotency keys, strict event envelope. |
| Cross-tenant data leakage | Critical | Strict tenant scoping, isolation tests. |
| Incorrect money conversion | High | Integer kobo only, no floating-point math. |
| Missing invoices | Medium | Pending issuance state, reconciliation jobs. |
| Service outages | Medium | Transactional outbox, dead-letter queues. |
| Credential compromise | Critical | Least privilege, key rotation, no browser exposure. |

---

## 13. Open Decisions

### 13.1 Statutory Invoice Triggers
- **Owner:** Accounting/Tax Reviewer.
- **Evidence Required:** Legal counsel opinion on exact trigger events.
- **Impact if deferred:** Inability to automate Phase 4 fully.

### 13.2 Legal Entity Mapping
- **Owner:** Founder.
- **Evidence Required:** Corporate structure documentation.
- **Impact if deferred:** BOUXRE workspace configuration blocked.

### 13.3 Withholding Tax (WHT) Rules
- **Owner:** Accounting/Tax Reviewer.
- **Evidence Required:** Current tax authority guidelines.
- **Impact if deferred:** Incomplete accounting policy in Phase 3.
