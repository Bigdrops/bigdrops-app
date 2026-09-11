# pdfcn Installation & Integration Discovery Report

This report was written by Muse Spark on 2026-09-07 via Opencode.

## Objective

Determine the correct, current, official way to integrate pdfcn into BIGDROPS. Explain why `bunx --bun shadcn@latest registry add @pdfcn` opened a generic registry picker. Assess pdfcn as a replacement for `@react-pdf/renderer`.

## Scope

Read-only upstream investigation. No packages were installed. No source, config, or lockfile was modified. The only change in this task is this report.

## Files Changed

See section 10.

## Skills Used

Skills used: react-pdf, pdf-rendering-correctness, shadcn
Documentation standard: ASD-STE100 Simplified Technical English

## 1. Executive Verdict

- The correct integration path is: register the `@pdfcn` namespace in `components.json`, then run `shadc add @pdfcn/<base>/<item>`.
- The attempted command was incorrect. `registry add @pdfcn` does not install pdfcn. It invokes a registry-alias flow. The CLI did not recognize `@pdfcn`, so it showed the generic registry picker.
- `@pdfcn` is a valid namespace, but only after local configuration. It is not built in. Proof: `bunx --bun shadcn@latest view @pdfcn/takumi/text` fails with `Unknown registry "@pdfcn"` on this project.
- BIGDROPS must add this entry to `components.json` before any install:
  `"@pdfcn": "https://pdfcn.dev/r/{name}.json"`
- Next step: keep the current React-PDF layer. Run one isolated Takumi proof-of-concept in a scratch scope only after explicit approval. Do not migrate.

## 2. Official Upstream Evidence

| Fact | Source |
|---|---|
| Official repository is `github.com/shadcn-labs/pdfcn` | Repo README header and file tree (`registry/`, `registry.json`, `components.json`, Next.js docs app) |
| Official docs are `pdfcn.dev/docs`, installation page is `pdfcn.dev/docs/installation` | Fetched live during this task |
| Correct component command is `npx shadcn@latest add @pdfcn/takumi/text` and Forme variant `add @pdfcn/forme/text` | `pdfcn.dev/docs/installation`, sections Installation, Install a Block, Install a Theme |
| Registry URL pattern is `https://pdfcn.dev/r/{name}.json` | Fetched `https://pdfcn.dev/r/takumi/text.json` live; it returns valid `registry-item.json` with full component source |
| `@pdfcn` does not resolve without local config | Ran `bunx --bun shadcn@latest view @pdfcn/takumi/text`; CLI returned `Unknown registry "@pdfcn"` with a fix suggestion |
| Unknown namespaces must be declared in `components.json` under `registries` | `ui.shadcn.com/docs/registry/namespace`, section Error Handling |
| The shadcn CLI has no documented `registry add` command | `ui.shadcn.com/docs/cli` lists init, add, apply, preset, view, search, build, docs, info, migrate, eject; `registry add` is absent |
| Takumi peer range is React 18 or 19, engine needs Node 20.19+, ships bun/vite/browser entries | `registry.npmjs.org/takumi-pdf/latest` (v0.14.3), fields `peerDependencies`, `engines`, `exports` |
| Forme peer range is React 18 or 19; package is a JSX-to-JSON serializer | `registry.npmjs.org/@formepdf/react/latest` (v0.20.1), fields `peerDependencies`, `description` |
| pdfcn items declare runtime deps per base: Takumi items need `takumi-pdf` plus `@takumi-rs/helpers`; Forme items need `@formepdf/react` plus `@formepdf/core` | Upstream `registry.json`, `dependencies` field of every item |
| pdfcn components copy source into the project (`components/pdf/...`, `lib/...`, `types/...`) | Upstream `registry.json`, `files[].target` fields |
| Takumi renders JSX, HTML, or node trees to PDF through WebAssembly; no browser process is needed | `takumi.kane.tw/docs/pdf`, sections Render a document and Runtimes |
| BIGDROPS `components.json` registers `@componentry` and `@unlumen-ui` only; `@pdfcn` is absent | Local `components.json`, lines 24-27 |
| BIGDROPS uses React 19, Vite 7, TypeScript 5.9, Tailwind 3.4, Bun | Local `package.json` |

## 3. Why the shadcn Registry Picker Appeared

- The command mixed two concepts. `add` installs items. `registry add` manages registry aliases.
- `registry add` is not a documented shadcn CLI command. The CLI could not resolve bare `@pdfcn` to a configured registry.
- BIGDROPS `components.json` has no `@pdfcn` entry. The CLI therefore treated `@pdfcn` as unknown.
- The displayed names (`@systaliko-ui`, `@tailark`, `@tailgrids`, `@taki`, `@termcn`, and others) are public third-party registries from the shadcn registry directory. The CLI offered them as selectable alternatives.
- Their appearance proves the lookup path, not pdfcn support. None of those entries is pdfcn.
- Takumi-dominated names in that list (for example `@taki`) add confusion. Takumi is the PDF engine under pdfcn. It is not the pdfcn registry.

## 4. Correct Installation / Bootstrap Workflow

No command below was executed. This sequence is assembled from evidence only.

### 4.1 Registry setup (required, one time)

Add the namespace to `components.json`:

```json
{
  "registries": {
    "@pdfcn": "https://pdfcn.dev/r/{name}.json"
  }
}
```

Basis: the shadcn namespace URL-pattern system plus the live proof that `pdfcn.dev/r/takumi/text.json` serves valid registry items. The official pdfcn installation page omits this step. That omission is a docs gap. The CLI error message prescribes the same fix.

### 4.2 Dependency installation

No separate manual install is strictly required. The `add` command installs each item's `dependencies` field automatically:

- Takumi base: `takumi-pdf`, `@takumi-rs/helpers` (plus `qrcode` for the QR component only).
- Forme base: `@formepdf/react`, `@formepdf/core` (plus `qrcode` for the QR component only).

Pick one base per project. Do not install both renderers at the same time.

### 4.3 Component addition

```bash
bunx --bun shadcn@latest add @pdfcn/takumi/text
```

Forme equivalent:

```bash
bunx --bun shadcn@latest add @pdfcn/forme/text
```

Blocks (full templates) and themes follow the same pattern:

```bash
bunx --bun shadcn@latest add @pdfcn/takumi/invoice-minimal
bunx --bun shadcn@latest add @pdfcn/takumi/theme-minimal
```

### 4.4 Takumi setup

Takumi needs no extra setup step beyond its npm packages. It runs on Bun and Vite through dedicated bundle entries. Browser use needs explicit WASM init (`takumi-pdf/no-init` plus `takumi-pdf/wasm-url`). BIGDROPS generates PDFs at runtime in-app, so the browser path needs a separate check during any proof-of-concept.

### 4.5 Forme setup

Forme needs `@formepdf/react` and `@formepdf/core`. pdfcn usage imports `Document` and `Page` from `@formepdf/react`. The component API stays the same across bases.

### 4.6 Configuration changes

- `components.json`: add the `@pdfcn` entry. This is the only required config change.
- Installed files land in `components/pdf/...`, `lib/...`, and `types/...`. Aliases resolve through the existing `@` mapping.
- Fresh versus existing project: the workflow is identical. `init` is not needed for BIGDROPS. Only the `registries` entry plus `add` apply.

## 5. pdfcn Architecture

- pdfcn is a shadcn-style source registry. It is not an npm package. No `pdfcn` package exists to install.
- It is a collection of copyable source components, blocks, and themes. The CLI copies code into the consuming project. The project owns the code after that.
- pdfcn itself contains no renderer. It ships two bases:
  - Takumi base: components target `takumi-pdf` (Rust/WebAssembly renderer).
  - Forme base: components target `@formepdf/react` plus `@formepdf/core` (JSX-to-JSON pipeline plus Forme engine).
- The shadcn CLI is only the delivery tool. It resolves `@pdfcn/<base>/<item>` to `pdfcn.dev/r/<base>/<item>.json` and writes files plus npm deps.
- Takumi and Forme are independent upstream projects. pdfcn does not replace them. Each component's `dependencies` field pulls the correct engine in.
- Shared theming (`PdfcnThemeProvider`, theme tokens) is also copied source, not a runtime library.

## 6. BIGDROPS Compatibility

| Stack item | Result |
|---|---|
| React 19 | Compatible by contract. Both `takumi-pdf` and `@formepdf/react` declare `react ^18 \|\| ^19` peers. |
| Vite 7 | Compatible by contract. `takumi-pdf` ships a `vite.mjs` bundler entry. |
| TypeScript 5.9 | No conflict found. Registry items ship `.tsx` plus `.types.ts` source. |
| Tailwind 3.4 | No direct coupling. Takumi applies its own CSS/Tailwind-like layout inside the PDF renderer. Project Tailwind version does not drive PDF layout. Visual parity with app styling needs explicit theme mapping. |
| Bun | Compatible by contract. `takumi-pdf` ships a `bun.mjs` entry. |
| Supabase, Vercel, Capacitor | No interaction. PDF generation stays in the app layer. |

Uncertainties (unproven, need a proof-of-concept):

- Browser-side WASM init cost and bundle size on low-end Android devices.
- Font embedding path for Nigerian-receipt fonts versus the current local-font React-PDF setup.
- Single-page A4 waybill discipline under Takumi pagination behavior.
- Bun dev versus Vercel production parity for the WASM renderer.

## 7. Template Definition / Preview Architecture

Target: one template definition feeds production PDF and an HTML/DOM miniature.

Directly provided by pdfcn:

- Composable React PDF components and full document blocks (invoices, reports).
- Shared theme tokens through `PdfcnThemeProvider`.
- Live previews inside the pdfcn documentation site only.

BIGDROPS must architect:

- The canonical document model adapter. pdfcn blocks define their own props and types (for example `invoice-minimal.types.ts`). BIGDROPS must map its canonical invoice/waybill model onto those props. pdfcn does not know the BIGDROPS model.
- The renderer adapter boundary. Financial rules stay in `src/lib/Calculations.ts`. pdfcn components must receive prepared data only, same as the current PDF layer.
- The HTML/DOM miniature path. No registry item provides a DOM miniature renderer. Takumi components target Takumi primitives, not DOM elements. Forme components target the Forme engine, not the browser DOM.

Unproven:

- Whether one template definition can serve both outputs without a parallel DOM implementation. Evidence indicates it cannot. A shared definition would need a BIGDROPS-owned abstraction with two render passes (pdfcn pass plus DOM pass).
- Whether Takumi's HTML-input mode could bridge the gap. Takumi renders HTML strings to PDF, but pdfcn components do not emit HTML. This path needs a prototype, not an assumption.

## 8. React-PDF Replacement Relevance

- pdfcn is ready for a proof-of-concept. It is not ready for direct migration.
- Reasons: registry workflow is now understood; engine peer ranges cover React 19; Takumi documents a `from-react-pdf` migration guide upstream.
- Blockers for migration: no proof of single-page waybill compliance; no font parity check; no miniature story; no performance data on target devices; pdfcn is a 2026 early-stage project and rendering quality depends on third-party engines.
- Do not replace React-PDF because pdfcn installs cleanly. Installation ease is not rendering equivalence.

## 9. Exact Next Step

After this report, take one safe step:

1. Add `"@pdfcn": "https://pdfcn.dev/r/{name}.json"` to `components.json` `registries` (config-only change, needs approval).
2. Run read-only `bunx --bun shadcn@latest view @pdfcn/takumi/invoice-minimal` to confirm item resolution.
3. Then propose an isolated Takumi proof-of-concept: render one existing canonical invoice through `invoice-minimal` in a scratch scope, compare output with the React-PDF version, and report.

Do not install components into production paths until the proof-of-concept passes.

## Verification

- `git status` BEFORE investigation: staged `docs/prd/.../settings-redesign-candidate-v4-android.html` (new file) and `src/tests/critical/record-capture.test.js` (new file); unstaged modification to the same HTML file. Both belong to another agent. They were left untouched.
- `git status` AFTER investigation: same pre-existing entries, plus one unrelated untracked file from a concurrent agent (`docs/reports/settings/settings-v4-candidate-correction-report.md`, not created by this task), plus this report. No deletions. No modifications to tracked files.
- Probing command `bunx --bun shadcn@latest view @pdfcn/takumi/text` performed network resolution only. It wrote no project files. `components.json` and `package.json` are byte-identical to the before state.
- Not run per task constraints: `bun run audit:load`, `bun run typecheck`, lint, tests, build.

## Risks and Limitations

- The `@pdfcn` components.json snippet is derived from live URL evidence plus CLI behavior. The official installation page does not state it. Reconfirm with `view` after the config change.
- pdfcn is young. Component coverage grows but remains narrower than React-PDF.
- Takumi and Forme are separate dependencies with separate failure modes. A pdfcn evaluation must evaluate the engine, not just the components.
- This report used web sources dated 2026. Registry contents can change. Pin versions before any proof-of-concept.

## Deferred Work

- No proof-of-concept build.
- No font parity test.
- No waybill single-page compliance test.
- No bundle-size or device performance measurement.
- No decision on Takumi versus Forme.

## 10. Files Changed

- Files created: `docs/reports/pdfcn-installation-integration-discovery.md` (this report).
- Files modified: none.
- Files deleted: none.
- Note: this task used `docs/reports/` per explicit user instruction. AGENTS.md section 9 specifies lowercase `docs/reports/<domain>/`. The explicit instruction takes precedence per AGENTS.md rule precedence item 1. Future reports should confirm which path is canonical.
