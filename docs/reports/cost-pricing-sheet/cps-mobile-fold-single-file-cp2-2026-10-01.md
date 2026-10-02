# CPS Mobile Fold Single-File TSX Report

This report was written by Buffy on 2026-10-01 via Freebuff.

Skills used: react-dev
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Create one self-contained TSX file from the 5-file CPS mobile-fold template.
Save the file as `docs/templates/react-temps/form/cp2.tsx`.

The user wants to copy the prototype in one step. The 5-file template stays
available for the modular transplant path.

## Scope

In scope:

- Merge types, formatters, sample model, icons, overlays, and form into one file.
- Embed the prototype CSS inside the file.
- Keep the prototype fidelity and the typed callback contract.
- Verify the merged file with the type checker.

Out of scope:

- Supabase, persistence, routing, CPS calculations, JSON import logic.
- Client Picker backend, Cloudinary, save logic.
- Redesign, field changes, or behavior changes.

## Files changed

| File | Action |
| --- | --- |
| `docs/templates/react-temps/form/cp2.tsx` | Created. 2898 lines, 120388 bytes. |
| `docs/templates/react-temps/form/build-cp2.mjs` | Created, used, then removed. |

No other file changed. `cps-j2.jsx` in the same folder was not touched.

## Structure of cp2.tsx

| Lines | Section |
| --- | --- |
| 1-33 | Header comment and React imports. |
| 34-421 | `CPS2_CSS`. The prototype CSS as a template string. |
| 423-781 | Column contract, types, formatters, row helpers, sample model, props interface. |
| 783-1002 | SVG icon set. |
| 1004-1704 | Overlay sheets: client, import, columns, markup, confirm, toast. |
| 1706-2898 | `CostPricingSheetForm` and its sub-components. |

The only import in the file is `react`. The component renders
`<style data-cps2="true">{CPS2_CSS}</style>` as the first child of its root
fragment. The CSS loads with the component. No external CSS file is needed.

## Changes made

1. Read the 5 verified template files.
2. Strip the cross-file `import` statements. Keep one `react` import.
3. Wrap the CSS in a `CPS2_CSS` template literal. The CSS has no backtick,
   backslash, or `${` sequence, so the literal is safe.
4. Update one CSS header comment sentence. The old sentence told the reader to
   import a CSS file that does not exist in the single-file build.
5. Insert the `<style>` element at the single top-level `return` of the form.
6. Keep every other line byte-identical to the source files.

Assembly used a short merge script so no code was retyped. The script was
removed after the merge.

## Verification result

Verification:

- Targeted `tsc` on `cp2.tsx` with project flags: passed, exit 0.
- Targeted `tsc` on `cp2.tsx` with `--strict`: passed, exit 0.
- Embedded CSS diff vs `cost-pricing-sheet-form.css`: identical except the one
  updated header comment sentence.
- Section diff: shared, icons, overlays, and form sections are exact matches of
  the source files. The form section matches as two halves around the inserted
  `<style>` line.
- Local import check: no `from './...'` or `import './cost-pricing-sheet-form.css'`
  reference remains.
- `bun run audit:load`: passed. All warnings are pre-existing and located in `src/`.
- `bun run typecheck`: passed, exit 0.
- `git status`: only `docs/templates/react-temps/form/cp2.tsx` is new. No
  pre-existing change was modified or reverted.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

not applicable. No SQL changed.

## Risks or limitations

- Row and total displays use float math rounded to 2dp, like the prototype.
  Production must use the authoritative Decimal path before ship.
- The CSS uses global class names such as `.item`, `.sec`, and `.fld`. Isolate
  it if the host app has colliding class names.
- `cp2.tsx` is 2898 lines. If it moves under `src/`, `bun run audit:load` will
  flag it as oversized. The limit is 600 lines.
- The logic now lives in two places: the 5-file template and `cp2.tsx`. A fix in
  one must be applied to the other.

## Deferred work

- Wire the template into the live CPS editor.
- Replace float math with the Decimal path.
- Split `cp2.tsx` if the project requires files under 600 lines.
