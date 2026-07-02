# CSR Template Candidate Analysis

## Top.html — Data-Centric Dashboard Style

**Source:** `docs/TEMPLATES/htmltemps/CSR/Top.html`
**Format:** ~430 lines, 24000 chars, dashboard hybrid (UI nav + print report)
**Grade:** C (not suitable as-is)

### Strengths
- Strong bento-grid equipment metrics layout (6-column responsive)
- Good problem/defects side-by-side treatment
- Service time + status check pattern is clean

### Weaknesses (blockers for React-PDF)
1. **Material icons throughout** (`<span class="material-symbols-outlined">`) — React-PDF has no icon font support; every icon must be replaced.
2. **Full dashboard navigation bar** (`<header>` with nav links, notifications, settings) — irrelevant for PDF; would need stripping.
3. **Background image fill** on site location map (line 203) — React-PDF cannot render CSS `background-image`.
4. **Heavy custom font stack** (Hanken Grotesk, Source Serif 4, JetBrains Mono via Google Fonts) — React-PDF supports only standard 14 fonts + `.ttf` registration. This adds build complexity.
5. **Two-column sign-off** layout uses `border-b-2 h-16` placeholder divs for signatures — would require significant restructuring.
6. **Price columns** in materials table — CSR data model does not carry unit prices.
7. **No template-specific colour identity** — uses generic `--primary` / `--surface` CSS variables; no distinctive banded accent pattern.

### Verdict
**Not recommended as a React-PDF port.** The dashboard chrome, icon dependency, and font overhead make it high-effort with low pay-off. If converted, would need a full redesign targeting only the report body.

---

## minimal.html — Print-First Table Layout

**Source:** `docs/TEMPLATES/htmltemps/CSR/minimal.html`
**Format:** ~230 lines, 10000 chars, print-optimised one-pager
**Grade:** B (feasible with moderate effort)

### Strengths
- **No icons, no dashboard chrome** — pure print layout
- **True one-page layout** — everything stays on one A4; good for React-PDF paging
- **Simple table-based structure** — maps directly to React-PDF `<View>` rows
- **Monochromatic palette** (black/white/gray) — no colour variable complexity
- Uses `table-cell-label` / `table-cell-value` pattern — easy to translate to `PdfField`-style components
- Already uses `border-2 border-black` (React-PDF friendly)
- Clean monospace (`font-mono`) typography

### Weaknesses
1. **Tables for layout** — React-PDF does not support `<table>`; would use `<View>` with `flexDirection: 'row'` equivalents.
2. **`shadow-[8px_8px_0px_rgba(0,0,0,1)]`** — React-PDF does not support box-shadow; requires a manual `View` stack.
3. **`border-collapse` / `border-spacing`** — HTML table CSS that has no React-PDF equivalent; would use explicit `borderWidth` + `borderColor`.
4. **Checkbox visual (line 161–164)** — uses `w-4 h-4 border-2` empty `<div>`; React-PDF can reproduce with bordered `<View>`.
5. **`grayscale` filter** on signature image (line 208) — React-PDF's `<Image>` does not support CSS filters.

### Verdict
**Feasible candidate** — the pure-print, one-page structure maps well to React-PDF constraints. The main effort would be converting `<table>` markup to flexbox `<View>` layouts and stripping box-shadow. Estimated port effort: **medium** (~150–200 lines of new component code).

### Candidate Ranking

| Criterion | Top.html | minimal.html |
|-----------|----------|-------------|
| React-PDF compatibility | Low | Moderate |
| Print focus | No (dashboard hybrid) | Yes |
| One-page viability | Moderate | Strong |
| Icon dependency | High (Material icons) | None |
| Font complexity | High (3 custom families) | Low (Helvetica) |
| Template identity | Generic (variable-based) | Strong (monochrome) |
| Effort to port | High | Medium |

**Final recommendation:** `minimal.html` over `Top.html` for any future React-PDF implementation. Even so, it is a lower priority than the current active templates (SignalBands, Crimson, Zinc) and should only be considered after the outstanding CSR feature backlog is cleared.
