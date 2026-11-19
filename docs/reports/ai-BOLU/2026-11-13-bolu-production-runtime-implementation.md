# Bolu Production Runtime Implementation Report

This report was written by GPT-6 Luna on 2026-11-13 via DeepAI Code (Pi).

Skills used: typescript-advanced-types, react-dev, react-useeffect, vercel-composition-patterns, vercel-react-best-practices, supabase, supabase-postgres-best-practices, capacitor-security
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Establish one shared Bolu assistant runtime and connect the production assistant surface to it. The first implemented capability set is read-only invoice search, invoice detail/settlement status, receivables, and quotation search/status.

## Scope

- Add a typed route and record context contract.
- Add typed capability and context-aware greeting/suggestion selection.
- Add a shared in-memory conversation owner under the authenticated AppShell routes.
- Connect the dashboard assistant entry point to the shared interface.
- Retrieve invoices and quotations through existing tenant-aware query paths.
- Use `invoice_financials_v` for settlement status and balances.
- Add an authenticated Vercel API route for the existing AMD endpoint, using a server environment variable for the provider key.
- Keep the Design Lab and document-mutation paths out of scope.

## Architecture established

- `BoluAssistantProvider` sits inside the authenticated `AuthorizationProvider` and tenant-gated `AppShell` tree. The assistant is therefore not mounted on login or public-document routes.
- One runtime instance owns conversation state while the authenticated shell remains mounted. `DashboardAssistant` is a launcher only. It does not mount a second chat surface.
- Route changes while the sheet is open produce pending context. The user must apply the context change. The prior transcript and prior context remain in place until then.
- Session state is in memory only. There is no conversation persistence or database schema change.
- A future FAB or contextual launcher can call the shared `open()` function. No production FAB was added.

## Context and suggestion strategy

- `BoluPageContext` uses an extensible module union and carries route/page metadata, launcher source, filters, and an optional typed record reference.
- Invoice and quotation record references are marked persisted and require UUID-shaped ids. Draft routes do not create persisted references.
- Record references do not grant access. Data retrieval checks the existing `hasAuthorization` state and uses `tenantClient`.
- Greetings and suggestions are separate from UI code and vary by dashboard, invoice, quotation, report, and fallback context. Record-detail context gets record-specific suggestions.
- Suggestions call the same `runtime.submit()` path as free-text input.
- Unmatched or mutating requests have no mapped capability. The assistant states that it cannot change records.

## Business intelligence implemented

- Invoice discovery calls the existing `search_documents` RPC wrapper with `document_types: ['invoice']`. This provides document number, client, title, and route matches through the current tenant client.
- Quotation discovery uses the same RPC with `document_types: ['quotation']`.
- A searchable record picker is embedded in the same assistant conversation. Search results are not considered selected until the user selects one.
- Invoice detail reads a minimal invoice projection and `invoice_financials_v` status/balance through `tenantClient`. Receivables use `invoice_financials_v` values and query filters. The UI formats supplied monetary values with `formatNaira`; it does not calculate totals or balances.
- Record routes are supplied by the existing document-search RPC or are built from the returned authorized id for the existing invoice/quotation detail routes.
- Read authorization is checked before table or RPC queries. No tenant id, schema, or authorization scope is accepted from model output.
- No write, edit, create, payment, delete, conversion, or money-movement capability is registered or exposed.

## Provider assessment and behavior

### Verified from repository code

- Existing AMD configuration uses `https://developer.amd.com.cn/radeon/api/v1`, model id `DeepSeek-V4-Flash`, Bearer authentication, chat completions, and `stream: true`.
- The prior runtime sends client-side provider calls with user-entered keys. The new Bolu path does not reuse the client key store.
- New provider transport sends an authenticated request to `/api/bolu-chat`. The API route validates the user token with Supabase Auth using the public anon key, reads the AMD key only from `BOLU_AMD_API_KEY`, limits message count/size and context facts, applies a 45-second timeout, and never returns the provider key to the client.
- The provider route sends app-retrieved context facts as bounded, explicitly untrusted data. The model does not query Supabase and cannot select tenant/schema scope.
- Streaming bytes are passed through the Vercel route and parsed client-side using the existing OpenAI-style SSE parser.
- When the provider is not configured or fails after data retrieval, the runtime returns the verified application facts and identifies the AI service as unavailable.

### Unverified

- No live AMD request was made. The audit did not verify AMD authentication acceptance, CORS, actual streaming response shape, model quality, context limits, latency, quota, availability, terms, or production reliability.
- The local environment did not contain a `BOLU_AMD_API_KEY` variable name. No credential value was read or reported. Deployment must add this secret before model-generated responses can work.
- The provider route uses OpenAI-compatible chat completions only. It does not use tool/function calling. Application-side intent matching and data retrieval handle business access.
- No account-wide rate limit, spend cap, or durable request quota was added. The route requires a valid BOUXRE session and bounds each request, but production traffic controls remain a deployment concern.

## Files created

- `api/bolu-chat.ts`
- `src/components/ai-assistant/BoluAssistantProvider.tsx`
- `src/lib/ai-assistant/bolu-capabilities.ts`
- `src/lib/ai-assistant/bolu-context.ts`
- `src/lib/ai-assistant/bolu-data.ts`
- `src/lib/ai-assistant/bolu-provider.ts`
- `src/lib/ai-assistant/bolu-runtime.ts`
- `src/lib/ai-assistant/bolu-transport.ts`
- `src/tests/ai-assistant/bolu-capabilities.test.js`
- `src/tests/ai-assistant/bolu-context.test.js`
- `src/tests/ai-assistant/bolu-data.test.js`
- `src/tests/ai-assistant/bolu-lifecycle.test.js`
- `src/tests/ai-assistant/bolu-provider.test.js`
- `docs/reports/ai/2026-11-13-bolu-production-runtime-implementation.md`

## Files modified

- `src/components/ai-assistant/AssistantSheet.tsx`
- `src/components/ai-assistant/DashboardAssistant.tsx`
- `src/components/app/AppShell.tsx`

No Design Lab file, assistant experiment, route, style, or asset was modified by this task. Existing Design Lab edits and assets were present before implementation and remain untouched.

## Security and integrity boundaries

- Business reads use existing tenant-scoped `tenantClient` and authorization context. No service-role key is used by the Bolu route.
- The API route validates the signed Supabase user token with `auth.getUser()` before forwarding a request.
- The AMD secret is server-only by design. The repository’s existing `.env` was not read for values.
- Invoice settlement facts come from the authorized `invoice_financials_v` view. No balance, payment state, or total is calculated in a prompt or generated by JavaScript.
- Search results are capped and selected records are re-read through the authorized tenant client.
- Record fields are length-limited and identified as untrusted data in the provider instruction.
- Capability matching blocks common mutation verbs and no mutation service is imported by the Bolu runtime. This is a read-only capability boundary, not a general model safety guarantee.

## Verification

- `bun test src/tests/ai-assistant/bolu-context.test.js src/tests/ai-assistant/bolu-capabilities.test.js src/tests/ai-assistant/bolu-provider.test.js src/tests/ai-assistant/bolu-lifecycle.test.js src/tests/ai-assistant/bolu-data.test.js`: passed, 18 tests before the final addition of the explicit form-state field to `BoluPageContext`. The tests were not rerun after that last change.
- `bun run audit:load`: completed with existing warnings: 53 oversized files, 8 broad selects, and 4 high query limits. No Bolu data query was flagged.
- `bun run typecheck`: failed on 8 errors in pre-existing project code:
  - `src/components/dashboard/DashboardOverview.tsx`: missing `isHalfOpened` and `isTabletop` properties.
  - `src/lib/ai-assistant/keys.ts`: `Directory.Private` is absent from the installed Capacitor filesystem type.
  - `src/lib/uiSoundEvent.ts`: incomplete `Record<SoundCategory, boolean>` value.
  - `src/tests/pdf/formeArchitecturalTemplate.test.ts`, `formeExecutiveTemplate.test.ts`, and `formeHeritageHouseTemplate.test.ts`: spread type errors.
  - No new Bolu file or API route error remained in this typecheck result.
- `bunx tsc --noEmit --project api/tsconfig.json`: passed after adding the `contextFacts` request-body type.
- `bun run test`: failed in existing unrelated critical tests, including `remediationContract`, `settingsThemeTokens`, `sourceTransactionContract`, `themeToggleExposure`, and `webAndroidApkAndZeroThemeFlash`. The new Bolu tests passed independently.
- `git diff --check`: passed for task files.
- `bun run build`: not run, per the hardware gate.
- Final context edit verification: not run after the form-state field was added because the user asked for the report at that point.
- Supabase schema changed: no. Migration and push: not applicable.
- No AMD network request was made.

## Baseline and worktree notes

The initial `git status` contained pre-existing changes to conversational-document-assistant decision documentation, multiple Design Lab files, Design Lab assets/tests, reports, and many scratch files. These files were not edited, reset, staged, or discarded by this task. The final status also shows pre-existing scratch deletions and other files changed by concurrent work. They were not edited by this task.

The typecheck and full-suite errors are outside the files changed by this task. This worktree did not provide a clean baseline run from before the implementation, so the report does not claim independent confirmation that every error predates all concurrent work.

## Risks and limitations

- AMD suitability is not confirmed without a live request and owner review of provider terms and data handling.
- Production model answers remain generated text. The UI displays application-returned record rows separately, but prompt instructions cannot guarantee that model prose never contains an incorrect claim.
- No persistent conversation store, spend limit, or server-side usage quota exists in this task.
- Intent matching is intentionally bounded and rule-based. Ambiguous questions need clearer wording or record selection.
- Receivables results are limited to the first 20 displayed records, with a refinement message when more records exist.
- `AppShell` contains its pre-existing Design Lab route. This task did not alter it.

## Deferred work

- Configure the AMD key as a Vercel secret and validate AMD behavior in an approved test account.
- Review provider data-handling and retention terms before sending production business facts.
- Define and implement a durable rate-limit/spend-control service.
- Add deterministic, representative tenant integration tests for search and receivables results.
- Decide conversation persistence and history retention.
- Add launchers beyond the existing dashboard entry point only after approval.
- Consider citations/source affordances and response validation for model-generated explanatory text.
