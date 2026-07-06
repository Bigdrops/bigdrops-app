You are working on the BIGDROPS business platform.

Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access.
Read AGENTS.md immediately.
Load all relevant skills from docs/PROJECTSKILLINDEX.md before making changes.
====================================================================

# Objective
reference commit: 4460dc00dc78e675c5993ecad0fa29dc35341f33

Perform a targeted regression audit and correction of the recent document image upload policy.

The goal is to ensure the new image validation policy does not unintentionally change existing business behaviour.

There are two areas that require verification:

1. Signature upload pipeline
2. Payment attachment uploads

The objective is behavior preservation first, then architectural correctness.

---

# Part 1 — Signature Pipeline Audit

Audit every signature upload flow including (but not limited to):

- Waybill signatures
- CSR signatures
- Signatory Settings
- Any reusable signature upload component

Verify that the new image upload policy only validates file types.

It must NOT:

- modify image contents
- redraw images
- recompress images
- convert formats
- flatten transparency
- strip alpha channels
- recreate File objects unless absolutely required

Specifically verify that transparent PNG signatures exported from tools such as Adobe Acrobat/Adobe Scan continue to render naturally inside generated PDFs exactly as before.

If the audit finds any regression introduced by the image upload policy, restore the previous behaviour while keeping MIME validation.

Validation and image processing must remain separate responsibilities.

---

# Part 2 — Payment Attachment Audit

Audit PaymentAttachmentUploader.

Determine its intended business contract by inspecting:

- every caller
- existing workflow
- historical behaviour

Do NOT assume it is an image uploader simply because it uses a file picker.

If the component is intended for payment/supporting attachments, it must NOT be restricted by the document image upload policy.

Verify support for legitimate financial attachments including:

- PDF receipts
- bank confirmations
- image receipts
- scanned documents

Determine whether Office documents (Word, Excel, CSV) are intentionally supported today.

If they are part of the existing workflow, preserve that behaviour.

If the recent image policy removed valid attachment support, restore the previous attachment capability.

If necessary, introduce a separate shared attachment validation policy instead of reusing the image policy.

Image upload policy and attachment upload policy are different standards and must remain independent.

---

# Architectural Rules

Image Upload Policy
Purpose:
- Logos
- Signatures
- Item Photos
- Branding Images
- Other image-only assets

Attachment Policy
Purpose:
- Payment evidence
- Financial documents
- Supporting files

Do not mix these responsibilities.

---

# Documentation

Update documentation as required.

If a separate attachment policy is introduced, document it under:

docs/STANDARD/

Explain the distinction between:

- Image Upload Policy
- Attachment Upload Policy

so future implementations cannot accidentally reuse the wrong validation helper.

---

# Constraints

Do NOT modify:

- Calculations.ts
- PDF renderer
- Save orchestration
- Financial logic

Keep changes minimal and backward compatible.

Preserve all existing business workflows unless a genuine bug is identified.

---

# Required Verification

Run:

- bun run typecheck
- bun run audit:load
- git status

Do NOT run bun run build.

Acceptance Criteria

✓ Signature uploads still preserve transparency and render naturally in generated PDFs.

✓ Image validation only validates file types and does not alter image data.

✓ PaymentAttachmentUploader supports the business attachment types it was originally designed for.

✓ Image-only uploaders remain image-only.

✓ Attachment uploaders remain attachment uploaders.

✓ No regressions introduced by the shared upload policy.

✓ Documentation updated if separate attachment standards are required.