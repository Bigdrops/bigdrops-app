# Priority Matrix

> **Part of:** BIGDROPS UI/UX Consolidation PRD  
> **Scope:** 16 issues + 7 roadmap initiatives, ranked by business impact ÷ engineering effort

---

## Executive Summary

The matrix prioritizes work by balancing **user impact** (safety, consistency, productivity) against **engineering effort**.
Top priorities are: sign-out confirmation (high impact, low effort), column locking (high impact, medium effort), and dead code removal (low impact, minimal effort unlocks future work).

---

## Scoring

| Impact | Definition |
|--------|-----------|
| Critical | Data loss, security, or accessibility barrier |
| High | Major workflow friction, 50%+ of users affected |
| Medium | Moderate friction, ~25% of users |
| Low | Minor polish, cosmetic, or edge case |

| Effort | Range |
|--------|-------|
| Minimal | < 1 hour |
| Small | 1-4 hours |
| Medium | 1-3 days |
| Large | 1-2 weeks |
| X-Large | 2+ weeks |

---

## Priority Matrix

### Quadrant 1: Quick Wins (High Impact, Low Effort)

| Rank | Item | Impact | Effort | Phase |
|------|------|--------|--------|-------|
| 1 | K4 — Sign-out confirmation (AlertDialog) | High (safety) | Small | P1 |
| 2 | K5 — Sticky first column in DataGrid | High (usability) | Medium | P1 |
| 3 | D2 — Reduced motion support | Medium (accessibility) | Small | P1 |
| 4 | K9 — Mobile drag handle touch targets | Medium | Small | P1 |
| 5 | K8 — Sidebar scroll position | Medium | Medium | P1 |

### Quadrant 2: Major Projects (High Impact, High Effort)

| Rank | Item | Impact | Effort | Phase |
|------|------|--------|--------|-------|
| 6 | D1 — CSR → SharedDocumentForm migration | High (consistency) | Large | P3 |
| 7 | Mobile BOQ/RFQ support | High (mobile parity) | Large | P3 |
| 8 | Input-group + button-group primitives | Medium | Medium | P2 |

### Quadrant 3: Fill-Ins (Medium Impact, Low Effort)

| Rank | Item | Impact | Effort | Phase |
|------|------|--------|--------|-------|
| 9 | K6 — Sortable column UI in settings | Medium | Medium | P2 |
| 10 | D4 — Dead code removal | Low | Minimal | P1 |
| 11 | D5 — Route transition animations | Low | Medium | P1 |
| 12 | K11 — Split oversized view pages | Low | Medium | P2 |
| 13 | K7 — CSR universal toggle | Low | Small | P3 |

### Quadrant 4: Strategic (Low Impact, High Effort)

| Rank | Item | Impact | Effort | Phase |
|------|------|--------|--------|-------|
| 14 | D3 — Split all 25 oversized files | Low | X-Large | P3 |
| 15 | Design token npm package | Low | Large | Future |
| 16 | Storybook documentation | Low | Medium | Future |

---

## Phase Allocation

| Phase | Quick Wins | Major Projects | Fill-Ins | Strategic | Total Items |
|-------|-----------|---------------|---------|-----------|-------------|
| Phase 1 (Month 1) | 5 | 0 | 1 | 0 | 6 |
| Phase 2 (Months 2-3) | 0 | 0 | 3 | 0 | 3 |
| Phase 3 (Months 4-6) | 0 | 2 | 1 | 1 | 4 |
| Future | 0 | 0 | 0 | 2 | 2 |

---

## Risk-Adjusted Priority

Three items have risk multipliers that increase their priority:

| Item | Risk Multiplier | Adjusted Priority |
|------|----------------|-------------------|
| K4 — Sign-out | **Safety** (shared devices) | Move to #1 |
| D2 — Reduced motion | **Accessibility** (legal risk WCAG non-compliance) | Move to #3 |
| D1 — CSR migration | **Maintenance** (861 lines, tech debt grows) | Move to #6 |

---

## Effort Estimate Summary

| Phase | Estimated Developer-Days |
|-------|------------------------|
| Phase 1 | 12 days |
| Phase 2 | 14 days |
| Phase 3 | 28 days |
| **Total** | **~54 developer-days** |

---

## Key

- **Quick Wins**: Do first — highest return per hour invested
- **Major Projects**: Plan carefully — 80% of the value may take 20% of the time
- **Fill-Ins**: Do when blocked or between major projects
- **Strategic**: Defer until resources are freed

---

## Who Should Do What

| Role | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| Frontend engineer | Dead code, sign-out dialog, sticky columns, touch targets | Token merge, sortable UI, CSR split | CSR migration, primitives, BOQ/RFQ mobile |
| CSS specialist | formTheme audit, animation dedup | Token conversion, component audit | — |
| QA | Sign-out, column lock, mobile drag, reduced motion | Token visual verification, sortable UI | CSR form regression, mobile BOQ/RFQ |
| Designer | — | Token naming, visual audit | Component library review |
