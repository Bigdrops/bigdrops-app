# BOUXRE: Event Taxonomy & Data Dictionary Specification

- **Document Version:** 1.0.0
- **Status:** Data Governance Specification (`[PROPOSAL]` / Under Review)
- **Standard:** Object-Action Naming Grammar (`[entity]_[action]`)
- **Scope:** Proposed Event Dictionary, Metadata Envelopes, and Redaction Standards

---

## 1. Event Governance Principles

To maintain data cleanliness, avoid duplicate tracking, and guarantee privacy, all future analytics events instrumented in BOUXRE must conform to this taxonomy.

### 1.1 Strict Naming Rules
1. **Object-Action Format:** Every event name must be formatted as `[object]_[action]` in lowercase snake_case (e.g., `document_created`, not `created_document` or `DocumentCreated`).
2. **Grammatical Tense:** Actions must use past tense for completed operations (`created`, `exported`, `updated`, `approved`) or present participle for multi-step workflow states (`started`, `viewed`).
3. **No Dynamic Key Names:** Event names must never contain dynamic values such as document IDs or user IDs (e.g., `invoice_QTN-001_created` is strictly prohibited; use `document_created` with property `document_type: "quotation"`).

---

## 2. Standard Context Envelope (Global Properties)

Every event dispatched by the client wrapper must automatically include the following standard envelope:

```typescript
export interface StandardEventEnvelope {
  // Application Metadata
  app_version: string          // e.g. "2.4.0"
  environment: 'production' | 'staging' | 'development'
  platform: 'web' | 'android' | 'ios'

  // Temporal Metadata
  timestamp: string            // ISO 8601 UTC string

  // Session & Identity Context
  is_authenticated: boolean
  distinct_id: string          // Pseudonymous Supabase Auth UUID
  tenant_id: string | null     // Opaque business entity UUID

  // Routing Context (Sanitized)
  current_route: string        // e.g. "/invoices/new" (Query parameters strictly stripped)
}
```

---

## 3. Strict Redaction Rules & Excluded Properties

The following data fields are **strictly blacklisted** from all event properties. The client wrapper must reject or scrub any event containing them:

| Prohibited Category | Blacklisted Keys / Values | Reason for Prohibition |
| :--- | :--- | :--- |
| **Financial Figures** | `amount`, `total`, `subtotal`, `unit_price`, `vat_rate`, `discount`, `balance` | Confidential SME financial data |
| **Document Content** | `line_items`, `description`, `item_name`, `notes`, `terms` | Proprietary trade secrets |
| **Customer / Supplier PII** | `customer_name`, `client_name`, `supplier_name`, `email`, `phone`, `address` | NDPA / PII compliance |
| **Banking Information** | `bank_name`, `account_number`, `sort_code`, `bvn`, `nin` | High-risk financial security |
| **AI Prompt & Chat Text** | `prompt`, `message_text`, `bolu_draft`, `assistant_reply` | Sensitive commercial communications |
| **Document Identifiers** | `invoice_number`, `quote_number`, `po_number` | Commercial confidentiality |

---

## 4. Proposed Event Catalog (`[PROPOSAL]`)

The following events are recommended for Phase 4 core instrumentation. They are proposals and **do not yet exist in code**.

### 4.1 Lifecycle & Session Events

#### `session_started`
- **Trigger:** Application initial load or resume from background.
- **Properties:**
  ```json
  {
    "referrer": "direct | search | external",
    "viewport_category": "desktop | tablet | mobile"
  }
  ```

#### `user_signed_up`
- **Trigger:** Successful completion of registration via Supabase Auth.
- **Properties:**
  ```json
  {
    "signup_method": "email | oauth",
    "has_business_name": true
  }
  ```

#### `user_logged_in`
- **Trigger:** Successful authentication session established.
- **Properties:**
  ```json
  {
    "login_method": "email | oauth | session_refresh | biometric"
  }
  ```

#### `user_logged_out`
- **Trigger:** User explicitly clicks logout or session expires.
- **Properties:**
  ```json
  {
    "session_duration_seconds": 450
  }
  ```

---

### 4.2 Onboarding Funnel Events

#### `onboarding_started`
- **Trigger:** User enters the initial setup wizard after first signup.
- **Properties:**
  ```json
  {
    "initial_step": "profile_creation"
  }
  ```

#### `onboarding_step_completed`
- **Trigger:** User completes an onboarding checklist milestone.
- **Properties:**
  ```json
  {
    "step_name": "business_profile | tax_defaults | first_client | first_item",
    "step_number": 2,
    "total_steps": 4
  }
  ```

#### `onboarding_completed`
- **Trigger:** User finishes all required onboarding checklist items.
- **Properties:**
  ```json
  {
    "duration_seconds": 180,
    "skipped_steps_count": 0
  }
  ```

---

### 4.3 Navigation & Module Usage

#### `module_viewed`
- **Trigger:** User navigates to a distinct top-level business module.
- **Properties:**
  ```json
  {
    "module_name": "dashboard | invoices | quotations | purchase_orders | inventory | correspondence | settings",
    "source_navigation": "sidebar | mobile_nav | quick_action"
  }
  ```

---

### 4.4 Commercial Document Workflows

#### `document_draft_started`
- **Trigger:** User clicks "New Invoice", "New Quotation", or "New Purchase Order".
- **Properties:**
  ```json
  {
    "document_type": "invoice | quotation | purchase_order",
    "entry_point": "module_header | dashboard_cta | duplication"
  }
  ```

#### `document_line_item_added`
- **Trigger:** User appends an item row to the active document draft.
- **Properties:**
  ```json
  {
    "document_type": "invoice | quotation",
    "item_index": 2,
    "source": "manual_entry | inventory_picker"
  }
  ```

#### `document_created`
- **Trigger:** Document successfully persisted to the database.
- **Properties:**
  ```json
  {
    "document_type": "invoice | quotation | purchase_order",
    "line_item_count": 3,
    "has_due_date": true,
    "creation_mode": "manual_form | bolu_assistant"
  }
  ```

#### `document_exported`
- **Trigger:** User generates a PDF document or initiates export.
- **Properties:**
  ```json
  {
    "document_type": "invoice | quotation",
    "export_format": "pdf_download | pdf_print | share_link"
  }
  ```

---

### 4.5 Bolu Conversational Assistant Events

#### `bolu_session_started`
- **Trigger:** User opens the Bolu assistant sheet or workspace.
- **Properties:**
  ```json
  {
    "origin_page": "dashboard | invoices | settings",
    "selected_provider": "plamo | openrouter | runcrate"
  }
  ```

#### `bolu_proposal_generated`
- **Trigger:** Assistant stream successfully constructs a document proposal card.
- **Properties:**
  ```json
  {
    "proposal_type": "quotation | invoice",
    "line_item_count": 2,
    "token_count_approx": 350
  }
  ```

#### `bolu_gate1_approved`
- **Trigger:** User clicks "Approve Changes (Gate 1)".
- **Properties:**
  ```json
  {
    "proposal_type": "quotation | invoice",
    "had_manual_edits": false
  }
  ```

#### `bolu_gate2_confirmed`
- **Trigger:** User clicks "Confirm & Save (Gate 2)" and persistence completes.
- **Properties:**
  ```json
  {
    "proposal_type": "quotation | invoice",
    "execution_duration_ms": 420
  }
  ```

---

## 5. Summary Table: Master Event Dictionary

| Event Name | Category | Primary Trigger | Key Properties |
| :--- | :--- | :--- | :--- |
| `session_started` | Lifecycle | App launch / mount | `viewport_category` |
| `user_signed_up` | Lifecycle | Supabase registration | `signup_method` |
| `user_logged_in` | Lifecycle | Supabase authentication | `login_method` |
| `user_logged_out` | Lifecycle | Explicit logout | `session_duration_seconds` |
| `onboarding_started` | Onboarding | Wizard entry | `initial_step` |
| `onboarding_step_completed` | Onboarding | Step save | `step_name`, `step_number` |
| `onboarding_completed` | Onboarding | Wizard completion | `duration_seconds` |
| `module_viewed` | Navigation | Route transition | `module_name`, `source` |
| `document_draft_started` | Workflow | New document click | `document_type`, `entry_point` |
| `document_line_item_added` | Workflow | Line item insert | `document_type`, `source` |
| `document_created` | Workflow | Successful save | `document_type`, `creation_mode` |
| `document_exported` | Workflow | PDF generation | `document_type`, `export_format` |
| `bolu_session_started` | AI Assistant | Sheet/Workspace open | `origin_page`, `selected_provider` |
| `bolu_proposal_generated` | AI Assistant | Proposal card render | `proposal_type`, `line_item_count` |
| `bolu_gate1_approved` | AI Assistant | Gate 1 click | `proposal_type`, `had_manual_edits` |
| `bolu_gate2_confirmed` | AI Assistant | Gate 2 click & save | `proposal_type`, `execution_duration_ms` |
