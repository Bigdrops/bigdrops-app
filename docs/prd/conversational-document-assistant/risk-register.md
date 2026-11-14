# Risk Register

- **Status:** Existing risks retained; operations-direction risks added for review
- **Product:** Conversational Document Assistant
- **Writing Standard:** ASD-STE100 Simplified Technical English

Severity: high, medium, low. Likelihood: likely, possible, unlikely.

---

## RISK-01 - Client Invoice Content Leaves The Device

**Severity:** high
**Likelihood:** certain

Every conversation is sent to a third party. The Gemini free tier states that content is used to improve Google products and may be seen by human reviewers. The other free tiers carry their own terms.

**Mitigation.** The feature is off by default. A disclosure names the provider and states the training term before the first request. The user accepts. The Settings screen keeps the disclosure reachable. The app sends nothing when the feature is off.

**Residual.** A user who accepts the disclosure still sends client names, amounts and addresses to a provider that may train on them. The mitigation makes the choice explicit. It does not remove the exposure.

## RISK-02 - The Free Allowance Runs Out Mid Conversation

**Severity:** medium
**Likelihood:** likely

One provider gives 20 requests a day. A ten turn conversation uses ten. A busy day of invoicing uses more.

**Mitigation.** The chain. A quota error advances to the next provider. The Settings screen shows the allowance of each provider. The app reads the allowance from the provider instead of a stored table.

**Residual.** A user with one provider key and a busy day will stop. The message must say which provider failed and what to do.

## RISK-03 - The Model Writes A Wrong Money Value

**Severity:** high
**Likelihood:** possible

A free model can misread a price. A misread price becomes a wrong invoice that reaches a client.

**Mitigation.** Every change is a card. The money value is the most visible element of the card. The app computes the amount and the assistant reads it. The contradiction check compares a stated total with the computed total before the model sees the message.

**Residual.** A wrong price that the user does not look at. The card reduces the rate. It does not remove it.

## RISK-04 - The Model Invents A Value For A Missing Field

**Severity:** medium
**Likelihood:** possible

A model asked for a client name may produce one.

**Mitigation.** FR-08. The rule is in the system prompt. A missing required field raises a question instead of a value. The change card shows an empty to filled transition for every field.

## RISK-05 - The Provider Key Is Exposed

**Severity:** high
**Likelihood:** unlikely

A key in `localStorage` is readable by any script in the page. A key in a log line leaves the device.

**Mitigation.** The key lives in an app private file with owner only mode. One masking helper formats a key for display. The key never reaches a log, an error message, an analytics event or a crash report. The browser build keeps the feature off, so no key exists in a browser context.

## RISK-06 - The Model Output Is Not A Valid Tool Call

**Severity:** medium
**Likelihood:** possible

A free model may answer in prose when the tool list asked for a call.

**Mitigation.** The reply text is still shown to the user. A reply that carries an invalid call is rejected with a tool result that tells the model to try again. After two failures the loop stops and the draft is kept.

## RISK-07 - The Trial Runs Past The Month And Nobody Decides

**Severity:** low
**Likelihood:** likely

A trial with no end date becomes a permanent feature that was never designed.

**Mitigation.** The gate in the PRD. The toggle is a visible, reversible control. The product owner reports the two measures each Friday.

## RISK-08 - The Assistant Becomes The Only Way To Create An Invoice

**Severity:** medium
**Likelihood:** possible

Users learn the assistant and stop using the form. A later change to the assistant breaks invoice creation.

**Mitigation.** FR-14. The normal form must always work. The assistant is an addition. FR-08 keeps the required fields in the domain layer so that both paths use one rule set.

## RISK-09 - A Provider Changes Its Interface

**Severity:** medium
**Likelihood:** likely

A free provider can change its model list or its tool calling behaviour without notice.

**Mitigation.** The model name is a Setting, not a constant. A model that fails to answer is reported and the chain advances. A provider that no longer works is removed from the chain by the user.

## RISK-10 - The Prompt Grows And The Quota Shrinks

**Severity:** medium
**Likelihood:** possible

A long system prompt on every turn burns a small allowance fast.

**Mitigation.** The prompt is about 800 tokens for the first turn. The loop sends only the new turns after the first. The form state carries only the fields the tools can change.

## RISK-11 - The Work Touches Money Code

**Severity:** high
**Likelihood:** unlikely

A change near the invoice calculation can break every invoice in the app.

**Mitigation.** G1 and G2 in FR-16. The assistant reads `computeDocument` and never writes it. The change set is a new module, one Settings section and one sheet. A code review must show that `src/lib/Calculations.ts` and the PDF renderers are untouched.

## RISK-12 - A Tenant Turns The Feature On For A Client Contract

**Severity:** medium
**Likelihood:** possible

A tenant discovers the assistant and puts client data through a free provider under a contract that forbids it.

**Mitigation.** The disclosure names the provider. The feature is off by default. The product owner watches the trial for this. A later release can restrict the feature to the product owner account during the trial.

## RISK-13 - The Trial Measures The Wrong Thing

**Severity:** low
**Likelihood:** possible

A trial that counts invoices created measures adoption, not speed.

**Mitigation.** One measure: the time from opening a new invoice to a saved invoice, against the JSON import baseline measured in week 1.

## RISK-14 - The AMD Token Factory Terms Do Not Allow Production Use

**Severity:** high
**Likelihood:** certain

The AMD documentation states that Token Factory is a free trial and development service, not for production, and that reselling access is not allowed. The trial by the product owner is inside the terms. A release of the assistant to tenants is not.

**Mitigation.** The trial stays internal. The feature stays behind a toggle. Before any release to tenants, the product owner must choose a provider whose terms allow it, which means a paid provider or a self hosted model. RISK-14 is the reason the chain holds more than one provider.

**Residual.** A release built on the AMD endpoint would breach its terms. The gate is a product decision, not a code check.

## RISK-15 - The AMD Endpoint Lives On The China Site

**Severity:** medium
**Likelihood:** possible

The console and the endpoint are `developer.amd.com.cn`. A user in Nigeria may see high latency, an unstable route or a blocked route. The provider that carries the chain may be the one that a Nigerian user cannot reach.

**Mitigation.** A device test from the user's own network before the trial starts. The chain covers the failure. The Settings screen shows a reachability result per provider.

**Residual.** If the endpoint is slow from Nigeria, the trial depends on the second and third providers, which have a daily ceiling of 500 and 50 requests. See DEC-17 for the allowance comparison.

## RISK-16 - The AMD Endpoint Silently Drops Parameters

**Severity:** low
**Likelihood:** likely

The endpoint rebuilds the request body and drops the parameters outside its accepted set without an error. A parameter that a developer believes is active may have no effect.

**Mitigation.** The client sends only the parameters it needs. A contract test checks that a request holds the expected keys. The client never sends `thinking`, which the endpoint answers with a 400.

## RISK-17 - The Daily Reset Time Is Not The User's Midnight

**Severity:** low
**Likelihood:** certain

The AMD allowance resets at 00:00 Beijing time. In Lagos that is 17:00. A user who invoices in the morning sees an allowance that is already partly spent and then reset in the afternoon.

**Mitigation.** The allowance readout shows the reset time in the user timezone. The chain covers the gap.

## RISK-18 - The Cloudflare Free Plan Cannot Use The Strong Models

**Severity:** medium
**Likelihood:** certain

The Cloudflare free plan gives 10,000 neurons a day, but the allowance is measured in GPU work, not in requests. The plan also refuses the models a serious assistant would want: DeepSeek V4 Flash, GLM 5.2, GLM 5.3, Kimi K2.6 and Inkling 2 Small all need a paid billing method. The free plan serves Llama, Gemma 4 26B, Qwen 3 30B, Granite and GPT-OSS.

**Mitigation.** The chain. The AMD provider and the OpenRouter free models carry the frontier models. The Cloudflare provider carries the reachable volume with a second tier of models. The readout shows the turns left, not the neurons left, so the user can see the real limit.

**Residual.** In the worst case the assistant runs on Granite Micro while the strong models sit behind an exhausted allowance. The trial measures whether that is good enough. See the trial measure in the PRD.

## RISK-19 - The Free Compute Platforms Are Too Small To Be Useful

**Severity:** low
**Likelihood:** likely

A free compute platform that runs the model on a server gives an endpoint with no quota wall. Three of the four free platforms are too small for a useful model: Cloady offers 0.5 vCPU and 1 GB of memory, and the Google Cloud always free tier offers one e2-micro VM with 1 GB of memory. The Hugging Face ZeroGPU allowance is 5 GPU minutes a day.

**Mitigation.** The self hosted option is deferred. Lightning AI is the only platform in the list with a free GPU allowance large enough to hold a real model, and it is a weekend project, not a trial week project. The provider chain covers the trial without it.

**Residual.** The chain always has a ceiling. A tenant that files many invoices a day needs a paid provider or a self hosted model.

## RISK-20 - The Trial Needs A Gateway Process

**Severity:** medium
**Likelihood:** likely

In gateway mode the app needs the gateway to be running. On a computer that means the computer is on and the phone is on the same network. In Termux that means Android has not stopped the process. A closed laptop ends the trial for the day.

**Mitigation.** The app shows the gateway state in the chat. An unreachable gateway is a clear message, not a spinner. The draft is kept and the manual form keeps working. The Settings screen holds a test button that names the gateway state.

## RISK-21 - The Gateway Holds The Provider Keys On A Computer

**Severity:** medium
**Likelihood:** possible

The gateway stores the provider keys and sees every prompt that passes through it. A computer that is shared, or a gateway that is exposed to the network without a key, leaks the keys and the client content.

**Mitigation.** The gateway must require its bearer token. The app never sends a provider key to a gateway row, only the gateway key. The Settings screen warns that a gateway on a shared network needs a key and a firewall. The trial runs on the developer network only.

**Residual.** The gateway process is a second holder of the client content. That is less exposure than a cloud provider, and more exposure than a direct call.

## RISK-22 - The Trial Depends On A Third Party Project

**Severity:** medium
**Likelihood:** possible

The gateway is OmniRoute. The trial depends on it behaving, on its free tier catalogue being honest, and on its terms catalogue staying correct.

**Mitigation.** The gateway is MIT, it has 87,000 stars, it is actively maintained, and its free tier document is checked against a computed total by a build gate. The direct mode in the app is the path that has no dependency on it. The app never requires the gateway to work, only to be one option.


## RISK-23 - Selection Picks An Unsuitable Or Unverified Model (Proposed - 2026-11-14)

**Severity:** high
**Likelihood:** possible

The DEC-29 engine selects automatically. If eligibility uses stale free-tier claims, unverified capabilities, or health data that lags reality, the engine may route a tool-calling request to a model without tool support, or a tenant turn to a provider that forbids tenant data.

**Mitigation.** Unknown capabilities are ineligible, never assumed. Free-tier claims carry a verification date and decay. AMD stays ineligible under its current terms. An owner policy names which providers may see tenant content. A visible trace shows which model answered and why.

**Residual.** A mis-selection that produces a bad answer is recoverable. A mis-selection that leaks tenant PII to a training-permissive free tier is not.

## RISK-24 - Free-Tier Metadata Rots Silently (Proposed - 2026-11-14)

**Severity:** medium
**Likelihood:** likely

Free lists, quotas and promotion windows change without notice. Stored numbers become wrong within weeks (documented in `docs/tickets/free-model-failover-stack.md`). A pool built on stored numbers degrades into wrong selections while appearing healthy.

**Mitigation.** No quota number is stored in the repository. Eligibility reads Retry-After and 429 bodies at runtime. Each declared entry carries a verification date; entries past a review window are marked unverified and bypassed until re-checked.

**Residual.** Between verification windows, a model can change terms or disappear. The chain advances on failure, so the failure is contained, but the user may see degraded quality until the next sweep.

## RISK-25 - A Pinned Override Disables Safe Failover (Proposed - 2026-11-14)

**Severity:** medium
**Likelihood:** possible

A manual pin that quietly suspends automatic failover turns one flaky model into a hard failure for a whole session.

**Mitigation.** Pinning is a session preference, clearly labelled. Auto-failover stays enabled unless the user explicitly disables it for the session. The Settings screen shows the pin state and the override toggle in one place.

**Residual.** A user who deliberately disables failover accepts that a dead model yields an error instead of an answer.

## RISK-26 - Concurrency Collisions In Document Sequence Number Allocation

**Severity:** medium
**Likelihood:** possible
**Status:** MITIGATED (2026-11-14)

Concurrent invoice creations by the assistant or other users can attempt to allocate the same next document number, leading to database uniqueness constraint violations.

**Mitigation.** In `src/lib/ai-assistant/bolu-document-service.ts`, document numbering wraps `generateDocumentNumber` inside `withUniqueRetry` from `@/lib/withUniqueRetry`. In the event of a unique key violation, the generator retries with an incremented sequence cursor up to the retry limit before failing cleanly.

**Residual.** If network connectivity drops mid-transaction, standard database idempotency protects against duplicates.

## RISK-27 - Partial Or Orphaned Writes During Invoice Persistence

**Severity:** high
**Likelihood:** possible
**Status:** MITIGATED (2026-11-14)

Writing an invoice header and multiple line items as disconnected operations can leave orphaned parent headers if line-item insertion fails, corrupting business financial records.

**Mitigation.** In `src/lib/ai-assistant/bolu-document-service.ts`, the persistence service integrates directly with BOURXE's existing PostgreSQL transaction RPC `save_invoice_with_items_transaction` when `entityId` is present, guaranteeing all-or-nothing atomicity. In fallback sequential execution, if line-item insertion fails, a compensating delete operation cleans up the newly inserted header record.

**Residual.** Multi-tenant database RLS independently verifies tenant isolation and prevents unauthorized writes.

## RISK-28 - Model Direct Mutation Of Financial Or Calculated Fields

**Severity:** critical
**Likelihood:** likely
**Status:** MITIGATED (2026-11-14)

LLM models frequently hallucinate or miscalculate financial totals, tax percentages, or discounts, threatening SME financial integrity.

**Mitigation.** The model is strictly prohibited from setting or updating calculated fields. In `src/lib/ai-assistant/bolu-document-service.ts` and `bolu-reducer.ts`, all financial totals (subtotal, total, VAT, WHT, discount) are strictly computed by application-owned `calculateDocument` from `src/lib/Calculations.ts`. Any model-supplied calculated values are discarded.

**Residual.** Application-owned calculation engine remains the single source of truth across both UI and persistence layers.

## RISK-29 - Conflation Of Mock-Boundary Verification With Live Production Readiness

**Severity:** high
**Likelihood:** likely
**Status:** MITIGATED BY POLICY (2026-11-14)

Passing tests written against a deterministic mock provider can create the false impression that Bolu is ready for live production use, obscuring unresolved provider credentials, network routing, and terms compliance risks.

**Mitigation.** DEC-30 and DEC-31 strictly establish that mock-boundary verification confirms application-side pipeline architecture only. Live provider inference, external credentials, and production rollout remain explicit, outstanding gates on the roadmap.

**Residual.** No release to production tenants is permitted until live provider terms (RISK-14), reachability (RISK-15), and E2E browser tests pass.

## RISK-30 - Unsupported Attachment Formats (Proposed - 2026-11-14)

**Severity:** medium
**Likelihood:** likely

Attachments (PDF, images, scans, spreadsheets, photographs of handwritten notes, WhatsApp-forwarded photos) arrive in formats the extraction lane does not support. Silent partial extraction or dropped sections destroys source fidelity and misleads review.

**Mitigation.** DEC-33: attachment intake is application-owned; unsupported types fail loudly with the source preserved untouched; no partial parse is used for business decisions without an explicit reviewer acknowledgement.

**Residual.** Users may send formats BOURXE cannot read; the lane must always say so, never approximate. Supported format list stays an unresolved owner decision (FR-40).

## RISK-31 - Extraction Errors Presented As Source Fact (Proposed - 2026-11-14)

**Severity:** high
**Likelihood:** likely

An extractor (external AI or otherwise) misreads a digit, drops a row, or invents a value. Downstream steps then normalize and match against a false observation, and the error compounds silently.

**Mitigation.** Extracted values carry confidence/uncertainty where supported and always retain the source location and original wording (FR-37). Extraction is interchange input, never canonical. Ambiguity is preserved, never silently repaired. No extraction reaches `confirmed` without human review of the evidence.

**Residual.** A confident but wrong extraction that a reviewer approves without reading is still wrong. The system can make that visible; it cannot make it impossible.

## RISK-32 - False Matches Overstated As Confirmed (Proposed - 2026-11-14)

**Severity:** high
**Likelihood:** possible

Reconciliation proposes a match (e.g. 10mm² cable candidate with uncertain handwritten digits, or a mounting-structure offer that may relate to a BOQ lot) with weak evidence. Confidence inflation or a serial number acting as the only key promotes a candidate that is wrong, driving a wrong document.

**Mitigation.** FR-38: matching considers description, specification, unit, quantity and identifiers; a shared serial number alone never `confirmed`; candidates carry evidence, differences, confidence and review state; low-confidence matches are questions to the user, never silent resolutions.

**Residual.** A determined wrong review still passes a false candidate. Second review for high-impact families is an open decision.

## RISK-33 - Ambiguous Units And Price Bases (Proposed - 2026-11-14)

**Severity:** high
**Likelihood:** likely

Supplier prices arrive without units, with per-item vs per-pair pricing (MC4 case: BOQ quantity in pairs vs price per individual item), mixed currencies, or ambiguous quantity bases (per metre/length/bundle). Naive extension multiplies a wrong basis.

**Mitigation.** FR-39: no verified extension is calculated or claimed while unit, quantity basis or price basis is ambiguous. Ambiguous calculations are labelled provisional, reproducible from inputs, and distinct from confirmed commercial totals; `priced_verified` is unreachable until the basis is confirmed by a person.

**Residual.** A reviewer may accept a provisional amount as final. The UI and the review record must keep the distinction visible through persistence, not only at proposal time.

## RISK-34 - Incorrect Arithmetic From Extracted Inputs (Proposed - 2026-11-14)

**Severity:** high
**Likelihood:** possible

Even with a perfect extraction, a downstream mis-multiplication (unit conversion, quantity in pairs, discount or advance arithmetic) produces a wrong figure that approval then launders into the persisted document.

**Mitigation.** FR-39/FR-05: the application owns arithmetic. Calculation records preserve inputs, formula, result and currency/unit basis and are reproducible. Model-supplied totals are discarded. Money tests extend to every calculation class the engine records.

**Residual.** A formula that omits a legitimate commercial term (handling fee, partial delivery) still yields a confident wrong answer. Review remains the gate of last resort.

## RISK-35 - Conflicting Source Observations Silently Discarded (Proposed - 2026-11-14)

**Severity:** medium
**Likelihood:** likely

Two sources disagree (two price messages, overwritten New price, handwritten spec vs catalogue). A pipeline that overwrites keeps only the last write and destroys the record of the disagreement, including for audit.

**Mitigation.** FR-35/FR-37: conflicting observations are retained side by side with source references; resolution is a recorded ReviewDecision by a person; nothing is silently overwritten; conflicts stay visible through `conflicting` classification until closed.

**Residual.** Reviewers may resolve conflicts under time pressure without reading both sides; the record at least shows that they did.

## RISK-36 - Provider Capability Differences Across The Interchange Lane (Proposed - 2026-11-14)

**Severity:** medium
**Likelihood:** likely

Different providers differ on file upload, image understanding, document parsing, tool calling and structured outputs. A lane tuned to one provider fails silently on another, or an extraction that works on one model returns unusable output on another.

**Mitigation.** DEC-33/FR-40: attachment intake and validation are application-owned; providers are interchangeable inference resources subject to DEC-29 eligibility gates (capabilities declared as true/false/unverified per model); no workflow depends on one provider's modality.

**Residual.** An ineligible substitution degrades extraction to "cannot process" rather than "wrong answer" — acceptable, but it must surface as a clear user-facing state, never as a partial document.

## RISK-37 - Tenant Business Content Sent To External Extraction Providers (Proposed - 2026-11-14)

**Severity:** high
**Likelihood:** possible

Supplier documents contain pricing, terms, client identities and sometimes banking details. Sending attachments to an external AI for Markdown conversion moves tenant-confidential content to a third party, potentially training its models on it.

**Mitigation.** External-AI consent names the provider explicitly (FR-13/DEC-29). Free-tier providers that permit training remain ineligible for tenant content. Local or on-premise extraction remains the fallback decision point. Retention/deletion after approval is an open owner decision (FR-40; DEC-33).

**Residual.** Until consent, retention and deletion are approved, Bolu must not apply external extraction to tenant material in production.

## RISK-38 - Provider Error Masking or Credential Leakage in Client Logs (Mitigated - 2026-11-14)

**Severity:** high
**Likelihood:** low

**Description.** When third-party AI inference providers fail (e.g. 401 Unauthorized, 403 Forbidden, 429 Rate Limited, 5xx Server Error), raw provider error bodies or request headers might inadvertently leak API keys, authorization tokens, or sensitive account identifiers to browser clients or user-facing logs. Conversely, over-sanitizing errors could mask critical operational failures from engineering diagnostics.

**Mitigation.** `api/bolu-chat.ts` implements strict error classification:
1. 401/403 errors are mapped to HTTP 502 with sanitized messages stating provider authentication failed, without echoing authorization headers or request bodies.
2. 429 rate limit errors are mapped to HTTP 429 with clear retry advisories.
3. Network timeouts trigger HTTP 504 Gateway Timeout via AbortController.
4. Provider secrets are accessed strictly on the server via `process.env` and are never serialized into response envelopes.

**Residual.** Serverless hosting runtime logs (e.g., Vercel console) must maintain standard log hygiene to avoid dumping raw environment variables in exception stack traces.

## RISK-39 - Silent Drift into Paid Provider Inference (Mitigated - 2026-11-14)

**Severity:** critical
**Likelihood:** low

**Description.** Defaulting to commercial inference endpoints or unvetted provider configurations could incur unbudgeted API billing or commit BOURXE to recurring operational costs without explicit business owner sign-off.

**Mitigation.** `src/lib/ai-assistant/bolu-provider.ts` and `api/bolu-chat.ts` enforce safe defaults:
1. Default model is pinned to free-tier open routing (`meta-llama/llama-3.3-70b-instruct:free`).
2. When no API key is provisioned, `BOLU_PROVIDER_MODE` defaults fail-safe to `'mock'`, executing zero billable network calls.
3. Request timeouts are bounded by `BOLU_PROVIDER_TIMEOUT_MS` (max 120,000ms, default 30,000ms), preventing runaway hanging requests.
4. Paid inference remains denied by default per DEC-29.

**Residual.** Transitioning to paid production models requires explicit owner authorization and API key configuration in deployment environment settings.

## RISK-40 - AMD Token Factory Regional Latency and Non-Production Terms (Mitigated - 2026-11-14)

**Severity:** medium
**Likelihood:** high

**Description.** The AMD Radeon Cloud Token Factory endpoint is hosted on AMD's China Developer infrastructure (`developer.amd.com.cn`). Requests from Nigerian or European clients traverse global routes with increased latency (200-500ms baseline RTT). Furthermore, AMD developer program terms designate this service as a "free trial and development service", explicitly forbidding commercial production reselling.

**Mitigation.**
1. Bolu's client-server architecture decouples client response time through server-sent streaming; the server-side timeout `BOLU_PROVIDER_TIMEOUT_MS` defaults to 45,000ms (clamped up to 120,000ms), preventing premature aborts.
2. The AMD provider is approved for development, internal testing, and owner verification (DEC-35). It is strictly excluded from general tenant production rollout until commercial terms or global edge hosting are confirmed.
3. Architecture remains provider-agnostic; switching to OpenRouter, Cloudflare, or local edge inference requires zero code modification.

**Residual.** Users testing from regions with heavy international transit filters may experience periodic packet jitter or rate limiting (~30 RPM).

## RISK-41 - In-App Secret Exposure & Database Credential Compromise (Mitigated - 2026-11-14)

**Severity:** critical
**Likelihood:** low

**Description.** Storing third-party AI provider credentials (such as AMD Token Factory keys) in application database tables risks credential leakage through client-side database queries (PostgREST), XSS attacks, unauthorized employee access, or database backups.

**Mitigation.**
1. **Database Row-Level Security (RLS):** `public.app_ai_provider_config` enforces a strict client-deny policy (`USING (false)` for `authenticated` and `anon`). PostgREST queries from browser clients return HTTP 403 or empty sets.
2. **AES-256-GCM Envelope Encryption:** Secrets are encrypted at rest using an unpredictable 12-byte nonce and 16-byte authentication tag per encryption. The master key is derived strictly from server environment secrets (`BOLU_ENCRYPTION_KEY` or `SUPABASE_SERVICE_ROLE_KEY`) outside the database.
3. **Server-Side Memory Only:** Decryption occurs exclusively inside serverless function memory (`api/bolu-chat.ts` and `api/bolu-provider-config.ts`).
4. **Sanitized Public Responses:** API responses return masked strings only (e.g. `rc-••••••••••••7766`); ciphertexts, nonces, tags, and plaintext keys are never returned.
5. **Strict Admin RBAC:** Server management routes verify `profiles.role === 'admin'` or `workspace_members.role in ('owner', 'admin')` before processing any configuration request.

**Residual.** A full compromise of server deployment environment secrets (`SUPABASE_SERVICE_ROLE_KEY`) would allow key decryption; this represents the standard server-trust boundary.

