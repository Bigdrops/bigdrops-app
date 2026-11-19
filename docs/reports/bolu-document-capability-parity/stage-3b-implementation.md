# Stage 3B — Conversational Custom Document Fields, Grouped Items & Item Images

**Date:** 2026-11-19 · **Status: Partially completed** · **Type:** Authorized implementation for the invoice and quotation families, built on the Stage 3A integrity foundation. Not Stage 3C.

## What was delivered

### Custom document fields (`custom_fields.header`, `custom_fields.additionalFields`)
- New modify-envelope block `customFieldsChange` on `modify-document` operations in `bolu-operations.ts` (contract + structural validation) and `bolu-document-ops.ts` (pure engine):
  - `{ "op": "add", "label": ..., "value": ... }` — creates an entry; label and value both required (trimmed); labels must be unique per family (validated within batch, at apply time, and at Gate 2).
  - `{ "op": "update", "match": { "id" } | { "label" }, "set": { "label"?, "value"? } }` — edits an entry; matched by id if present (preferred), else by trimmed, case-insensitive label (unique-match required); empty set values refused.
  - `{ "op": "remove", "match": ... }` — removes an entry.
  - Chips and details rows stay distinct (separate families, separate operations). Sibling `custom_fields` keys (`payment_terms`, `extraCharges`, `chargeLabels`, `groupMeta`, `calculationInputs`, `created_via`, `operation_id`, columnConfig, …) are preserved verbatim.
  - Fingerprint per family (order-significant `id|label|value` triples); Gate 2 re-verifies before any write and fails closed on drift.
  - Legacy free-shape entries (no id, extra keys) round-trip untouched; `bottom` legacy families were not rewritten (additive only).
- Preview: `ModifyFieldsPanel` on the card shows added / changed / removed rows with business labels ("Details row" / "Chip") and explicit before → after values; `proposalPlainText` mirrors the same rows (`Document details:`).

### Grouped line items
- New `groupsChange` block on `modify-document`, with a pure deterministic engine in `src/lib/ai-assistant/bolu-document-ops.ts` (`applyGroupOperations`), called identically by the Gate 1 builder (for the preview) and the Gate 2 executor (for persistence).
- Operations: `create-group`, `add-items` (assign/move/ungroup, `group: null` unassigns), `rename-group`, `set-subtotal`, `remove-group` (`ungroup-items` | `delete-items` — explicit disposition, required), `reorder-groups` (all groups listed exactly once).
- Contract: groups are matched by **name** (case-insensitive) and never nested. Member items are matched by **description** and must match exactly one standard row; ambiguity refuses the plan with guidance. Group headers are `row_type:'group_header'` rows with quantity 0, price 0, no VAT/discount rates, and never enter commercial calculations. `groupMeta` is merged verbatim on the parent `custom_fields` document (name + showSubtotal per group id; entry removed when the group is removed). New group ids are application-minted (`grp_<ts>_<rand>`) — the model never supplies group identity. Rows are re-sequenced deterministically: ungrouped rows in original order, then group blocks in the resolved order; `sort_order` is rewritten 0..n−1.
- Stale protection: an order-significant fingerprint of the items + `groupMeta` snapshot is carried on the proposal (`itemsFingerprint`) and re-verified at Gate 2; any drift refuses the save before a write. Concurrent membership/order changes therefore cannot be silently overwritten.
- Group/charge interplay: VAT, discount, WHT, install rates, fixed charges, named extra charges and totals flow through the same `computeDocument` used on the form; group headers contribute exactly zero to those computations (verified in the suite with `computeDocument` on the grouped set).
- Groups and `itemsChange` may not be combined in one proposal (validator refuses) — one item-set concern per proposal.
- Preview: `ModifyGroupsPanel` shows the planned heading order, member list, group markers (`Subtotal shown` / `No subtotal`), and a `Document groups:` artifact section (`proposalPlainText`) — headings are visually distinct tokens and items are rows under them.
- `itemsChange` not combined with groupsChange; existing item edits (which preserve group assignment on matched rows) are unchanged.

### Item images — partial
- **Delivered:** conversational **removal** of an existing item photo: `{ "op": … }`-style removal via the existing itemsChange contract with `image_url: null` on the target item; the executor clears only that reference after the rest of the item set round-trips; sibling item data (make, part number, condition, sub-description, lineage) is preserved; and `showItemImages` is flipped only when the document already carries the flag (no silent sibling additions).
- **Blocked (not delivered):** adding, replacing, or uploading item photos through the assistant. The only item-image upload in the application is an **unsigned Cloudinary preset** (`itemPhotoUpload.ts`; `MobileItemCard.tsx:27`), which provides no tenant, user, document, or item scoping and no authorization before upload. That cannot satisfy the Stage 3B integrity requirements, and this stage may not introduce a new upload service, new storage provider, or new storage migration/bucket. **No tenant-scoped item-images bucket exists in the repository.** A compliant implementation requires one of: a tenant-scoped storage workflow (bucket + policies analogous to the `signatures` bucket), an authorization-aware upload path, and per-item scoping of the stored object — all outside this stage's authorization. Per the task's escalation rule, that sub-capability was stopped rather than approximated, and non-null `image_url` values are now **rejected** at the modify contract with honest user-facing guidance ("use the document form to upload one").
- There is therefore no pending-image preview to show yet; the existing image, when present, is preserved across unrelated item edits (suite-verified, m1).
- Preview-card image handling: the item list rows render a "Photo removed" marker when a photo is cleared in the proposal (`assistant-chat-parts.tsx`), and the plain-text artifact lists the removed photos.

## Gate 1 / Gate 2 integrity
- Gate 1 builds the proposal exclusively from the persisted snapshot (`readBoluModifySnapshot`), extended with the groups fingerprint and per-family field fingerprints; Gate 1 also re-applies the planned operations so the preview shows the true resulting state (group headings, chips and details in order, with errors or refusals surfaced instead of a half-consistent card).
- Gate 2 re-reads the persisted rows and `groupMeta`/families; mismatch on any fingerprint refuses the write before anything is persisted (headers, rows, items, custom_fields). The pending `custom_fields` document is assembled once from persisted + approved state and written once per family convention (invoice → JSON text, quotation → jsonb object).
- The audit trail records name-only markers for the new blocks (`custom_fields`, `groups`); rich-text/confirmation rules unchanged.
- Authorization, tenancy (same-tenant project verification retained), archival confinement, confirmation gates, expiry and replay guards are unchanged by this stage.

## Verification (exact commands & exact outcomes)

| Command | Result |
|---|---|
| `bun test src/tests/ai-assistant/bolu-stage-3b-capabilities.test.js` | **28 pass / 0 fail / 28 tests** — p1-p6 (custom fields incl. stale rejection), g1-g11b (groups round-trip / stale / reorder / remove-both-dispositions / ambiguity / zero-contribution headers / atomic-RPC branch), m1-m5 (image preservation, conversational removal, upload rejection, blob: rejection, null-only removal), n1-n2 (metadata/orphans), o1-o2 (SSR + artifact) |
| `bun test src/tests/ai-assistant/` (full directory) | **620 pass / 1 fail / 621 tests** — the single failure is the documented pre-existing `bolu-commercial-and-gate-lifecycle` "An authorized create/edit role can save an invoice through Gate 2" (`createPersistenceMock()` lacks `.limit(1)`); unchanged by this stage, verified untouched |
| `bun run audit:load` | **1132 files; 0 new ❌/🚨 in Stage 3B files** (8 broad selects, 1 component fetch, 4 heavy limits — same known set, none in this stage's files). Oversized files: 59 — identical class to before this stage; this stage's files (e.g. `bolu-operations.ts`, `bolu-document-service.ts`, `assistant-chat-parts.tsx`) remain on the known oversized list, as before |
| `bun run typecheck` (`tsc --noEmit`) | **exit 0** |
| `bun run build` | Not run (prohibited) |
| Database contact | **None** — no production or disposable project access; executor behaviour verified in-memory only |

`bun run audit:load` was run before `bun run typecheck`.

## Four-viewport inspection — UNAVAILABLE

Not inspected; nothing is claimed. The application cannot be launched here (Vite `504 Outdated Optimize Dep`; paired Chrome reports `paired-offline` with no connected browsers; no viewport/resize emulation in the available desktop browser; repairing the dev server would require deleting caches or changing the Vite configuration, which is out of bounds). SSR markup tests for the new surfaces exist but are not viewport verification. Pending: Mobile / Fold Closed, Fold Open, Tablets (portrait/landscape), Desktop.

## Documentation updated

- `docs/prd/conversational-document-assistant/Readme.md` — Stage 3B status sentence (delivered; image add/replace blocked).
- `docs/prd/conversational-document-assistant/Waterfall-roadmap.md` §37.4 — status updated to "Implemented 2026-11-19" with the capability boundary (see also DEC-42).
- `docs/prd/conversational-document-assistant/decision-log.md` — new `DEC-42` recording the shipped contract (fingerprint staleness, shared engine for preview/save, item-vs-groups mutual exclusion, image authorization decision, opaqueness of group identity) and the blocked image-upload decision.
No other requirements were promoted or revised.

## Git state

Initial: HEAD `f211f430` on `main` (ahead of origin by prior authorized commits). The tree contained concurrent unrelated work ("What's New"/release-discovery surface committed earlier; a large untracked/modified **BOUXRE rebrand session**), plus `.perch/PERCH.md`, `android-update-verify.html`, `src/__verify/` (all untracked or modified by sessions other than this task).

Final (nothing staged, committed, pushed, stashed, reset or cleaned by this task):

Task-attributable changes (untracked/uncommitted working-tree edits only):
- Modified: `api/bolu-chat.ts`, `src/components/ai-assistant/chat/assistant-chat-parts.tsx`, `src/components/ai-assistant/chat/assistant-chat.css`, `src/lib/ai-assistant/bolu-document-service.ts`, `src/lib/ai-assistant/bolu-generation.ts`, `src/lib/ai-assistant/bolu-operations.ts` (note: `api/bolu-chat.ts` and `bolu-runtime.ts` also carry concurrent BOUXRE-rebrand edits to prompt wording not attributable to this task), `src/lib/ai-assistant/bolu-runtime.ts`.
- New: `src/lib/ai-assistant/bolu-document-ops.ts`, `src/tests/ai-assistant/bolu-stage-3b-capabilities.test.js`, and this report.
- Docs updated by this task: `Readme.md`, `Waterfall-roadmap.md`, `decision-log.md` (three files).
- Untracked/unrelated concurrent work preserved untouched: the Android update dialog surface (`UpdateGate.tsx`, `UpdateModal.tsx`, `useAppUpdate.ts`, `apkUpdate.ts`, `UpdateDialogCard.tsx`, `update-dialog-card.css`, `updateDialogModel.ts`, `productionUpdateDialog.test.js`), `.perch/PERCH.md`, and the two preserved Stage 2/3 audit reports.
- Stage 3A.2 commit `97341863` and the remediation commit `653f63a6` remain at HEAD's ancestry; no commits were made by this task.

## Known limitations (explicit)

1. **Live disposable-tenant verification not performed** (no database access; executor verified in-memory only).
2. **Image authoring blocked** — no tenant-scoped item-images storage path exists; unsigned Cloudinary preset rejected for this purpose; resolves only with a separately authorized storage decision.
3. **No four-viewport inspection** (§above).
4. **No group nesting** (by design); no item-reorder within a group (deferred; group-level reordering and member assignment/move only); new group ids minted per operation that recreates a header (header identity is persisted for document lifetime).
5. **Groups and items may not coexist in one proposal** (validated refusal).
6. The stale fingerprint is order-significant (`row_type|description|qty|unit_price|unit|item_id|rates|group_id|group_name|image_url`): any concurrent item edit to the document invalidates a pending group plan (fail closed). Custom-field families have per-family fingerprints.
7. `bolu-runtime.ts` and `bolu-generation.ts` pass the new blocks through to the same builder; both refuse to build a proposal when the snapshot is unreadable or when the planned operations fail against the persisted rows.
8. The single pre-existing failing test (`bolu-commercial-and-gate-lifecycle` Gate 2 case; `createPersistenceMock()` lacks `.limit(1)` while `fetchDocumentPrefixesSafe` invokes it at `src/domain/documentNumbering.ts:133`) remains failing and was not addressed: its repair requires separate authorization. It is untouched by this stage and was not misclassified.
