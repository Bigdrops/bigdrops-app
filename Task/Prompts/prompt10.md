
```
You are rebuilding the Waybill gateway overlay to match an approved design reference. This is a visual-only rebuild — props and behavior remain unchanged.

---

## MANDATORY PREREAD

1. `.claude/skills/Karpathy/SKILL.md` — apply throughout.
2. `.agents/skills/frontend-design/SKILL.md` — production-grade aesthetics.
3. `docs/htmltemps/waybilloverlay.jpg` — the visual target. Match it exactly.
4. `docs/htmltemps/waybilloverlay.html` — find the companion HTML file. Read it for exact spacing, typography, and structure.
5. `src/components/invoice/mobile/mobileFormPrimitives.tsx` — to reference how design tokens are used in this project (pattern reference only).
6. `src/components/waybill/WaybillGatewayOverlay.tsx` — the current component you are replacing.

---

## ABSOLUTE RULES

- **No hardcoded colors.** Every background, text, border, and accent must use a `var(--bd-*)` design token. Study how `mobileFormPrimitives.tsx` applies tokens and follow that pattern.
- **No hardcoded fonts.** Use the project's font stack. If the design uses monospace for tags/labels, use the project's existing monospace class or token.
- **No hardcoded spacing.** Use Tailwind spacing utilities that align with the project's scale. Do not invent new spacing values.
- **White background.** The overlay uses the app's surface/bg token, which resolves to white/light in the current theme.
- **Match the visual hierarchy exactly.** The design has a specific rhythm: label → title → subtitle → cards → divider → download buttons. Reproduce it precisely.

---

## COMPONENT STRUCTURE

### Props (keep existing interface — do not change)

```typescript
interface WaybillGatewayOverlayProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: 'external' | 'internal') => void;
  onDownloadBlank: (type: 'external' | 'internal') => void;
}
```

Overlay Shell

· Full-screen fixed overlay: fixed inset-0 z-50.
· Semi-transparent backdrop using the project's overlay token.
· Centered panel: white background (bg-[var(--bd-bg)] or equivalent surface token), max-width around 420px, rounded corners using the project's radius token, subtle shadow.
· Close button in the top-right corner (X icon from lucide-react).

Header Block

1. Label: "Create Document" — small, uppercase, monospace-style, in the project's primary token color (text-[var(--bd-primary)]). Tight letter-spacing.
2. Title: "New Waybill" — large, bold, sans-serif. The word "Waybill" is in the project's warning/amber token color. The rest is in primary text color.
3. Subtitle: "Select document type" — smaller, muted, monospace-style.

Selection Cards (2 cards, stacked with gap)

Each card is a horizontal flex row:

Card 1 — External:

· Left accent bar: 3px wide, ~48px tall, rounded, primary color (bg-[var(--bd-primary)]).
· Body: tag ("Type 01 / Outbound") in muted monospace, title ("External Delivery Note") in bold, description text in muted color.
· Right arrow ("→" or chevron icon) in subtle color. On card hover: arrow shifts right slightly and changes to primary color.

Card 2 — Internal:

· Left accent bar: warning color (bg-[var(--bd-warning)]).
· Body: tag ("Type 02 / Internal"), title ("Internal Transfer Note"), description.
· Same arrow behavior.

Card hover state: Border color shifts to primary, background lightens slightly, subtle shadow lift. Use Tailwind transition-all.

Divider

· Horizontal rule with "or download blank" text centered.
· Line on each side, text in muted monospace uppercase.
· Color: border token.

Blank Template Download Buttons

· Two buttons side by side in a flex row with gap.
· Each button: outlined style (border only, transparent background), rounded.
· Label: "Blank Template" — small, uppercase, monospace, muted.
· Text: "External (PDF)" / "Internal (PDF)" — bolder, slightly larger.
· Hover: border darkens, background fills with subtle surface color.
· First button calls onDownloadBlank('external'), second calls onDownloadBlank('internal').

---

DESIGN TOKEN MAPPING

Use the project's existing tokens. Reference mobileFormPrimitives.tsx to find the exact token names. Expected mapping:

Element Token
Page/panel background var(--bd-bg) or var(--bd-bg-card)
Primary accent (External bar, arrow hover, top label) var(--bd-primary)
Warning accent (Internal bar, "Waybill" highlight) var(--bd-warning)
Text (titles, card titles) var(--bd-text)
Muted text (descriptions) var(--bd-text-muted)
Subtle text (tags, labels, subtitle) var(--bd-text-subtle) or var(--bd-text-muted)
Card background var(--bd-bg-card) or var(--bd-bg-elevated)
Card hover background var(--bd-bg-hover) or slightly lighter
Border var(--bd-border)
Border hover var(--bd-border-hover) or primary at reduced opacity
Overlay backdrop var(--bd-overlay) or bg-black/50
Radius var(--bd-radius-md) or var(--bd-radius-lg)
Shadow var(--bd-shadow-lg)

If a token doesn't exist in the project, fall back to Tailwind's slate scale with var(--bd-) prefix equivalents. Never hardcode a hex value.

---

TYPOGRAPHY

· Labels and tags: Use the project's monospace font class (check mobileFormPrimitives.tsx or tailwind config). Uppercase, tight letter-spacing, small size.
· Titles and headings: Use the project's sans-serif font. Bold, normal letter-spacing.
· Descriptions: Sans-serif, regular weight, muted color.

---

INTERACTIONS

· Card click: Calls onSelect('external') or onSelect('internal').
· Blank template click: Calls onDownloadBlank('external') or onDownloadBlank('internal').
· Close button: Calls onClose().
· Backdrop click: Calls onClose().
· Animation: The overlay should animate in (fade + slight scale up). Use Tailwind's animate-in if available, or a simple CSS transition class toggle.
· Scroll indicator: Not needed. The design is compact enough to fit on screen without scrolling.

---

FILES TO MODIFY

· src/components/waybill/WaybillGatewayOverlay.tsx — full rebuild.

FILES TO REFERENCE (READ ONLY)

· docs/htmltemps/waybilloverlay.jpg — visual target.
· docs/htmltemps/ — companion HTML file.
· src/components/invoice/mobile/mobileFormPrimitives.tsx — token usage patterns.

---

VERIFICATION

```
bun run typecheck
bun run lint
bun run audit:load
```

All must pass with zero errors.

---

SUCCESS CRITERIA

Open the app, tap "+" on the waybill list. The gateway overlay must:

1. Have a white/light background matching the app's surface token.
2. Show "Create Document" in blue/primary at the top.
3. Show "New Waybill" with "Waybill" in amber/warning.
4. Show "Select document type" as muted subtitle.
5. Show External card first (blue bar), Internal card second (amber bar).
6. Cards have tags, titles, descriptions, and arrows that animate on hover.
7. Show a divider with "or download blank".
8. Show two blank template buttons side by side.
9. Close button works. Backdrop tap closes. Card taps select the type.
10. All colors come from tokens — inspect the DOM and confirm zero hardcoded hex values in the overlay's rendered elements.

---

NO QUESTIONS. NO STATUS UPDATES.

Build the component. Verify. Push with message: fix: rebuild gateway overlay to match approved design with token-only styling

```

Target: Claude Code / Codex | Strategy: Visual rebuild of WaybillGatewayOverlay to match the approved white-background design using design tokens exclusively. Token mapping table provided so the agent can find equivalents in the project's `var(--bd-*)` system. No behavioral changes — props unchanged.