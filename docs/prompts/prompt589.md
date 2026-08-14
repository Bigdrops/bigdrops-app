 Prompt — Reprise Dashboard Templates (HTML + TSX)**

**Context**

Read the full design spec before writing any code: `docs/TEMPLATES/Designsdotmds/reprise.md`

This is a standalone visual template, not an app feature. Do not import BIGDROPS types, Supabase clients, routing, or any app state. No wiring to the real invoice/CSR/waybill data model. Treat this exactly like a static showcase page a designer would hand off — self-contained, mock data only, demonstrating the Reprise design language end to end.

A previous attempt at this (`docs/TEMPLATES/React-temps/Golden-dashboard.tsx`) drifted badly from the spec. Do not reference its structure, typography, or theme choices — it is a cautionary example, not a starting point. Specific mistakes to avoid, called out explicitly because they will be tempting defaults:

1. **No floating frame + wallpaper.** Reprise is a rounded white app frame floating over a full-bleed golden-hour photographic/painterly wallpaper, with the wallpaper visible on all sides of the frame. Do not flatten this into a single-background mobile shell with no ambient canvas.
2. **No monospace typography = wrong.** The spec's signature move is a dual typeface system: monospace (JetBrains Mono or equivalent) for brand-voice and data — hero titles, breadcrumbs, tag pills, section micro-headers, large dollar figures, tab labels, axis labels — and sans-serif (Inter or equivalent) for everything conversational — nav, body copy, card titles, buttons. Do not substitute a serif display face for the mono role. Do not set nav/body copy in mono either — the split matters both ways.
3. **Light theme by default.** Reprise is explicitly a light, warm-paper design. Do not default to dark mode. A dark mode toggle is fine as an optional addition if it doesn't compromise the primary light experience, but the light version must be the one that actually matches the spec — don't ship dark as the default and light as an afterthought.
4. **No hero banner = wrong.** The hero banner (right-anchored amber-washed photo, left-to-right gold gradient overlay, mono white title, glass tag pills) is a required, load-bearing component — not optional decoration.
5. **Solid dividers instead of dashed = wrong.** Coupon/data list rows use 1px dashed separators specifically (confirmed against screenshots in the spec) — don't default to solid hairlines there.
6. **Heavier shadows/saturated golds than spec.** Keep golds restrained and gradient-based per the token table; keep elevation to hairline borders + very soft shadows, not heavy drop shadows.

Match the spec's tokens (colors, type scale, spacing, radius) precisely — they're specified as CSS custom properties in the "Quick Start" section of reprise.md. Use those values directly rather than approximating from memory.

**Task**

Build two versions of the same Reprise-style financial dashboard template, both representing the full desktop layout described in the spec (floating frame, sidebar, top bar, hero banner, KPI strip, royalty/coupons cards, performance/allocation cards, right insight rail with tab bar, bond details, risk overview, AI credit signal, est. income CTA) — responsive down to mobile per usual best practice, but the desktop layout in the spec is the one to build to first, not a mobile-first rebuild of it.

*Version 1 — HTML*
- Single self-contained `.html` file: inline `<style>`, no build step, no external framework.
- Real Google Fonts links (or system-font fallback stack from the spec) for the JetBrains Mono + Inter pairing.
- Placeholder/stock photo URL (or CSS gradient stand-in) for the wallpaper and hero portrait — clearly commented as a placeholder a designer would swap.
- Static mock data matching the spec's own example content (Aurora Lane / Catalog Royalty Bond / ₦172.50 coupons / etc.) is fine to reuse. If in doubt, keep the spec's original example data so it's directly checkable against reprise.md.
- Minimal vanilla JS only where needed (tab switching, sidebar collapse), inline.

*Version 2 — TSX*
- Single self-contained `.tsx` file, React functional component, default export, Tailwind utility classes (project uses Tailwind v4 — check `.agents/skills/tailwind-v4-shadcn/SKILL.md` for the `@theme` token pattern and mirror reprise.md's tokens into it rather than hardcoding raw hex everywhere).
- No app-specific imports. No Supabase, no BIGDROPS types, no react-router. Mock data defined inline at the top of the file.
- lucide-react icons only (pinned at 0.383.0 — verify icon names exist in that version before using them).
- Same interactive bits via local `useState`, no external state management.

**Skills to use** (read and apply, in this order):

1. `.agents/skills/frontend-design/SKILL.md` — the spec already defines the distinctive direction; the skill's job here is disciplined execution of a given system, not inventing a new one. Don't let it push toward a different palette or typography than specified.
2. `.agents/skills/tailwind-v4-shadcn/SKILL.md` — `@theme` token setup for the TSX version.
3. `.agents/skills/tailwind-css-patterns/SKILL.md` — responsive patterns, dark-mode-optional handling, component extraction for both versions.
4. `.agents/skills/accessibility/SKILL.md` — keyboard focus states, color contrast (check gold-on-white and white-on-gold specifically), ARIA labeling for icon-only buttons (bell, search, collapse).
5. `.claude/skills/ui-ux-pro-max/SKILL.md` — cross-check the final type pairing, spacing rhythm, and palette usage against the design system generator's quality bar before finishing.
6. `.claude/skills/webapp-testing/SKILL.md` — after building the TSX version, do a Playwright screenshot pass at desktop and mobile widths to self-verify against reprise.md before calling it done. Note any deviation you couldn't resolve rather than silently shipping it.

**Output locations** — save exactly these two files, nothing else:
- `docs/TEMPLATES/htmltemps/reprise-dashboard.html`
- `docs/TEMPLATES/React-temps/reprise-dashboard.tsx`

**Before finishing** — self-review against reprise.md's "Do's and Don'ts" section bullet by bullet. If anything couldn't be matched exactly (e.g. the exact wallpaper photo), say so explicitly rather than silently substituting and moving on.