# BOURXE Brand Identity (Phase 1)

BOURXE is the official public-facing product name of the platform formerly known as BIGDROPS. This document defines the brand. It changes no code, no routes, and no data.

## 1. Official identity

- **Product name:** BOURXE
- **Capitalization:** always all capitals. Never `Bourxe`, `bourxe`, or `BourXe`.
- **What it is:** an integrated business operations platform for Nigerian SMEs (invoicing, logistics, project tracking, accounting, compliance, reporting).
- **Official acronym:** Business Operations, Unified Resources & eXecution Engine.

## 2. Approved BX logo

- The existing **BX** artwork is the only approved logo. Do not replace, regenerate, redraw, or recolour it.
- **Authoritative directory:** `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/` — original artwork and all approved exports share one identity here:
  - `source/proposed-icon.png` — original artwork (moved from `Design-direction/wireframes/`; history preserved via rename).
  - `android/mipmap-*/` + `android/adaptive-foreground.png` — Android launcher exports. The wired runtime copies under `android/app/src/main/res/mipmap-*/` stay in place; never relocate runtime resources into documentation.
  - `appstore.png` / `playstore.png` — store artwork.
  - `AppIcon.icon/` — iOS 26 export.
  - Pack README: `icons/README.md`.
- Application components may use whichever existing approved export best suits their rendering need (for example `android/mipmap-xxxhdpi/ic_launcher.png` for small UI surfaces, `appstore.png` for large display). Do not duplicate source artwork.
- Historical reports that cite the old `wireframes/proposed-icon.png` path describe work done before the consolidation and are left unchanged as audit trail.
- No alternative logo or name is approved. Do not generate alternative names.

## 3. Unofficial engineering acronym (internal only)

- **Engineering expansion:** Bunch Of Unreasonably Restless eXperimental Engineers.
- Use it only in engineering culture contexts (internal chat, internal engineering notes, team humour).
- It must never replace the official product description in customer-facing UI, documentation, or in legal, financial, or business documents.

## 4. Brand voice

BOURXE is enterprise-grade business software: modern, capable, and technically ambitious.

| Context | Voice |
|---|---|
| Product UI | Clear, professional, direct. No jokes in labels, errors, or financial text. |
| Documentation | Plain, specific, active voice. Say what the software does. |
| Customer communication | Professional and calm. No internal slang, no unofficial acronym. |
| Engineering communication | Professional first; playful, unconventional, and self-aware humour is permitted where it does not reduce clarity. |

## 5. Humour rules

Appropriate: self-aware engineering jokes in internal channels, release nicknames for internal use, tasteful references to the unofficial acronym among engineers.

Inappropriate: humour in invoices, receipts, quotations, waybills, legal text, financial figures, error messages that block work, customer-facing pages, or anywhere it can reduce trust or usability. Never sacrifice usability or credibility for humour.

## 6. Legacy BIGDROPS references

- Use **BOURXE** for the current public identity: README title, new documentation, customer-facing copy.
- Retain **BIGDROPS** / **bigdrops** wherever it is technically or historically required: repository name and clone URL, environment variables, database objects and migrations, routes, API contracts, storage identifiers and paths, historical reports and PRD filenames.
- Do not do a global search-and-replace of BIGDROPS. Change a legacy reference only when its owning system is formally migrated.

## 7. Migration boundaries (Phase 1)

In scope: `README.md` identity, this document. Nothing else.

Out of scope (do not change): application source files, runtime configuration, repository name, environment variables, database objects, routes, API contracts, storage identifiers, the BX logo artwork.

## 8. Deferred work

- Product UI copy still shows legacy naming in places; UI rebrand is a later phase.
- `AGENTS.md` title still reads BIGDROPS; update it when the agent-system migration is scheduled.
- Historical PRD and report filenames keep BIGDROPS per §6.
