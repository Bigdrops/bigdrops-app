# CSR Industry Template

## Summary

Added a brand-new CSR PDF template called **IndustryCSR** (template key `'5'`), borrowing the Invoice Industry template's design language. The template is fully integrated into the CSR preview system and passes typecheck + build.

## Files Changed

| File | Change |
|---|---|
| `src/components/csr/preview-templates/IndustryCSR.tsx` | **NEW** — Industry CSR template (405 lines). Header with logo 86×86, title "CERTIFICATE OF SERVICE", company subtitle, meta rows (CSR number, date, PO, call type, system status). Summary cards row overlapping header. Shared sections: Problem, Defects, Equipment, Readings, Service & Materials, Status, Service Time, Customer Feedback, Acknowledgement with dual signatures, Client Notes, Footer. |
| `src/components/csr/CSRPreviewContent.js` | Added `'industry'` variant with `accent: '#7d8a88'`, `headerBg: '#ffffff'`, `sectionTitleBg: '#0f172a'`. Added key `'5'` to `CSR_TEMPLATE_OPTIONS`. Updated `getCsrTemplateVariant` to map `'5'` → `'industry'`. |
| `src/components/csr/preview-templates/index.tsx` | Imported `IndustryCSRTemplate`. Added `Template5` named export. Added `'industry'` case in `getCsrPdfDocument` switch. |

## Verification

- `bun run typecheck` — ✅ passes
- `bun run build` — ✅ Vite production build succeeded
- No new lint errors introduced

## Design

**Header (Invoice Industry proportions):**
```
┌──────────────────────────────────────────┐
│ CERTIFICATE OF SERVICE           [LOGO]  │
│ Company Name                     86×86   │
│                                          │
│ CSR Number    CS-2024-001                │
│ Date          2024-12-15                 │
│ P.O. Number   PO-12345                   │
│ Call Type     Preventive Maintenance     │
│ System Status Operational               │
└──────────────────────────────────────────┘
```

**Summary cards (overlap header via negative margin):**
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Client    │ │Address   │ │Start Date│ │End Date  │
│Name      │ │          │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**Body sections:**
- Problem Description (shared)
- Defects Found (shared)
- Equipment (shared)
- Readings (card grid)
- Service & Materials (two-column: service rendered + technician remarks, then materials)
- Status (dot indicators)
- Service Time (shared)
- Customer Feedback (shared)
- Acknowledgement (dual signature cards: recipient + technician)
- Client Notes (compact)
- Footer (dark accent background)

## Key Decisions

| Decision | Rationale |
|---|---|
| Template key `'5'` | Next available slot after existing 1–4 |
| `headerMode: 'industry'` | Distinguishes from existing `dark`/`standard` modes |
| Accent `#7d8a88` | Muted green-grey matching Invoice Industry palette |
| `sectionTitleBg: '#0f172a'` | Dark navy for section headers (Invoice Industry convention) |
| Logo size 86×86 | Matches Invoice Industry template proportions |
| Reused all shared components | No business logic changes; pure presentation layer |

## Usage

Select template **"Industry"** (key `5`) from the CSR template dropdown in the preview panel. The template renders using the `CsrRenderModel` pipeline — no additional configuration needed.
