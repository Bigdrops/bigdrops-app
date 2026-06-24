# CSR Signature Section Redesign

## Summary

Removed all role/designation labels from the technician signature section across all 4 CSR PDF templates. Replaced the old vertical layout (signature image → label → "role - name" text) with a two-column row layout: signature + label on the left, technician name only on the right, vertically centered.

## Files Changed

| File | Change |
|---|---|
| `src/components/csr/preview-templates/components.tsx` | **PdfSignatureCard**: Two-column layout, removed role rendering. **AcknowledgementBlock/PulseAcknowledgementBlock**: Removed `technicianRole` variables and `role` props. Removed `getTechnicianRole` import. |
| `src/components/csr/preview-templates/Crimson.tsx` | Inline technician signature → two-column `flexDirection: 'row'` + `alignItems: 'center'`. Removed `technicianRole` variable and `getTechnicianRole` import. |
| `src/components/csr/preview-templates/Zinc.tsx` | Same as Crimson. |
| `src/components/csr/preview-templates/PulseFrame.tsx` | Inline technician signature → two-column layout, removed standalone role text line. Removed `getTechnicianRole` import. |
| `src/components/csr/preview-templates/SignalBands.tsx` | Removed `role` prop from `PdfSignatureCard` call and `getTechnicianRole` import. |

## Verification

- `bun run typecheck` — ✅ passes
- `bun run lint` — ✅ only pre-existing `no-explicit-any` violations remain (unrelated to this change)
- No new lint errors introduced

## Design

**Before:**
```
┌───────────────────┐
│    [signature]    │
│  Technician Sig.  │
│  Engineer - John  │
└───────────────────┘
```

**After:**
```
┌────────────────────────┐
│ ┌──────────┐ ┌───────┐ │
│ │ [sig]    │ │ John  │ │
│ │ Tech.Sig.│ │       │ │
│ └──────────┘ └───────┘ │
└────────────────────────┘
```
