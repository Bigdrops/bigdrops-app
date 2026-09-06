# Accounting Learn HTML Redesign Report

This report was written by Buffy on 2026-09-06 via Freebuff.

## Objective

Rebuild the HTML version of the accounting explainer so it reads like an interactive visual guide, while keeping the markdown and plain text versions unchanged.

## Scope

- docs/learn/accounting/what-is-accounting.html

## Files changed

- docs/learn/accounting/what-is-accounting.html

## Skills used

high-end-visual-design

Documentation standard: ASD-STE100 Simplified Technical English

## Visual design choice

The current task is a plain explainer page for beginners. That does not fit the agency-style design skill loaded above. That skill is built for premium commercial sites with cinematic motion, double-bezel panels, and marketing-grade visual density.

The Hey Low style reference under docs/templates/design-docs/Designs/Hey-low.md fits much better. It is:

- restrained
- warm
- paper-like
- mostly quiet with one calm accent
- readable first and decorative second

That matches the audience and the purpose better than an agency showcase style. The Hey Low palette and layout ideas were used as the reference basis, adapted to a self-contained explainer page. The result is not Hey Low branding. It uses the same design temperament: cream paper feel, forest ink type, low elevation, one soft accent, generous spacing, and illustration used only where it explains something.

## What was added and why

### 1. Jar motif

A small CSS jar block appears wherever the jar analogy is discussed.

It is a rounded rectangle with a label and a light top band. It is intentionally minimal. Its job is to make the "labeled jars" analogy visible without becoming illustration art. It appears once beside the opening analogy so the reader does not have to keep translating the metaphor in their head.

### 2. Seed accounts as a card grid

The 11 seed accounts are rendered as a two-column card grid.

Each card shows:

- the account code
- the account name
- a plain-language description
- a small type chip

The cards are color-banded by type using calm, distinct colors:

- asset
- liability
- equity
- revenue
- expense

This is not decoration. It turns the list into something a beginner can scan by kind, which matches how the app itself already groups accounts by type.

### 3. Journal movement diagram

The Accounts Receivable to Cash example is shown as a two-jar diagram with a vertical arrow between them above the prose.

The diagram is inline SVG only. No external image, no JS. The arrow points from Accounts Receivable to Cash and matches the example wording exactly. It exists so the reader can see the "money moves from one jar to another" idea visually before reading the explanation of debit and credit.

### 4. Typographic hierarchy

The page uses a clear heading scale, generous spacing, and a limited content width.

- one large title
- small eyebrow label
- generous lead paragraph
- distinct but restrained h2 headings
- controlled paragraph width so the body is not a full-bleed wall of text

This matters because the reader is not an accounting-inclined audience. Line length and spacing affect comprehension more here than they would on a dense technical page.

### 5. Callout for "what is not built yet"

The "what is not built yet" section is visually distinct.

It uses a soft background strip, a small label badge, and a different container treatment so it reads as a deliberate honesty callout, not a random bordered div. That matches the document's intent: tell the reader plainly what the app cannot do yet.

### 6. Step walkthrough styling

The today-usable walkthrough is rendered as numbered step cards.

Each step has a circled number. This makes the sequence easier to follow than a plain numbered list, without adding information.

### 7. Closing band

The final summary paragraph is placed in a soft accent band.

It visually separates the "that is the whole idea" wrap-up from the rest of the page. The band is calm, not loud. It signals completion, not promotion.

## Constraints honored

- No external dependencies.
- No CDN links.
- No JavaScript required for readability.
- The page opens as a plain local file.
- Inline SVG and embedded CSS only.

## Step 2 — Markdown and text files unchanged

Before touching the HTML file, the previously committed Markdown and text versions were extracted to temporary copies from HEAD.

After the HTML change, the markdown and text files were compared against those copies.

Result:

- docs/learn/accounting/what-is-accounting.md — no content diff from the previously committed version
- docs/learn/accounting/what-is-accounting.txt — no content diff from the previously committed version when whitespace-only differences are ignored

The only differences between those two files are formatting differences. The markdown version uses heading markers and list markers. The text version uses plain headings and list markers. The wording is equivalent.

The HTML file was changed. That was intended.

## Proof

Files involved:

- docs/learn/accounting/what-is-accounting.md
- docs/learn/accounting/what-is-accounting.txt
- docs/learn/accounting/what-is-accounting.html

Verification done:

- git status: only docs/learn/accounting/what-is-accounting.html shows as modified among the three learn files
- The .md and .txt files were compared to their previous committed content and found unchanged in wording
- The .html file was compared to its previous version and found to be a substantial visual rewrite, as intended

## Risks and limitations

- The HTML page uses a calm paper-like palette inspired by the Hey Low style reference, not the app's production theme. That is intentional for a standalone explainer, but it should not be mistaken for app UI.
- The jar motif is simple on purpose. It explains, it does not decorate.
- No screenshot or visual rendering was verified in this environment. The project lead checks visuals manually.

## Deferred work

None required by this task. The HTML version is now visually distinct while remaining factually equivalent to the other two formats.
