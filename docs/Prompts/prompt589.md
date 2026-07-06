You are working on the BIGDROPS business platform.

Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access. Read AGENTS.md immediately.
Follow AGENTS.md completely, including audit-first workflow, project standards, and skills loading.
====================================================================

# Objective

Standardize image attachment selection across all document forms.

Currently, the "Photo" picker incorrectly allows users to select non-image files such as PDFs. This results in invalid uploads and inconsistent behavior across Invoice, Quotation, and other document modules.

The goal is to create a single reusable image upload validation policy that every document form uses.

---

# Scope

Locate every image/photo picker used by:

- Invoice
- Quotation
- Waybill
- CSR
- BOQ
- RFQ
- Any shared attachment/image upload component

If multiple implementations exist, consolidate them onto one shared validation helper instead of duplicating MIME checks.

Do not change unrelated attachment systems that intentionally support arbitrary files.

---

# Create

Create a shared utility similar to:

```
src/lib/documentImageUploadPolicy.ts
```

(or another appropriate shared location following existing project conventions).

The helper should expose:

- supported MIME types
- validation helper(s)
- reusable error message(s)

so all document forms behave identically.

---

# Allowed image formats

Accept only these MIME types:

- image/jpeg
- image/png
- image/webp
- image/heic
- image/heif
- image/avif
- image/gif
- image/bmp
- image/tiff

Reject every other MIME type.

Examples that MUST be rejected include:

- application/pdf
- application/msword
- application/vnd.*
- application/zip
- text/*
- audio/*
- video/*
- application/octet-stream

Do NOT support RAW camera formats such as:

- .dng
- .cr2
- .cr3
- .nef
- .arw
- .orf
- .rw2
- .raf

These are intentionally excluded because they are extremely large, inconsistently supported by browsers, and unnecessary for business document attachments.

---

# Picker behavior

Where the platform supports MIME filtering (accept attribute, native picker, Capacitor picker, etc.):

Configure the picker so users only see supported image types.

Do not rely solely on the picker.

Always perform validation after selection as well.

Validation must remain the source of truth.

---

# Error handling

If an unsupported file is selected:

- Reject only the invalid file(s)
- Keep valid image selections
- Show a consistent user-facing error explaining that only supported image formats are allowed.

Do not crash.

Do not silently ignore failures.

---

# Reuse

Every document module must use the same helper.

Do not duplicate MIME arrays across the codebase.

The upload policy should become the single source of truth.

---

# Documentation

Create or update:

docs/STANDARD/document-image-upload-policy.md

Document:

- supported formats
- rejected formats
- rationale
- requirement that every document image picker reuse the shared policy
- requirement that picker filtering is convenience only, while validation remains mandatory

---

# Constraints

- Preserve existing upload workflows.
- Do not modify PDF rendering.
- Do not modify Calculations.ts.
- Do not modify document save hooks.
- Do not introduce document-specific behavior.
- Keep changes minimal and backward compatible.

---

# Required Verification

For active code changes:

- Run `bun run typecheck`
- Run `bun run audit:load`
- Run `git status`

Do NOT run `bun run build` (4 GB RAM policy).

Confirm:

- PDFs can no longer be selected or uploaded through image pickers.
- HEIC/HEIF images remain selectable.
- JPEG, PNG, WebP, AVIF, GIF, BMP, and TIFF remain supported.
- The shared upload policy is reused by every document image picker touched.
- No unrelated application behavior changed.